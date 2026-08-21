#!/usr/bin/env node
// extract-docx.js -- one-time .docx -> Markdown working-copy extraction (F1,
// review-engine-v3.md step 0). Dependency-free Node: a minimal central-directory
// -driven ZIP reader (zlib.inflateRawSync) + a tolerant WordprocessingML walker.
//
// HONESTY CONTRACT: the extractor never silently loses body prose. Every handled
// element class keeps a counter; a char-mass backstop compares the total text-node
// characters in document.xml (w:t + w:delText + m:t + w:instrText) against
// chars emitted + per-class accounted drops, so an UNKNOWN element class that
// swallows text surfaces as `unaccounted_chars > 0` plus a warning -- never as
// silence. The report is a SEPARATE artifact (never embedded in the md, or the
// engine would review the report as manuscript prose).
//
// Policy notes (extraction_rules.md is the binding table):
// - unknown wml elements are SKIPPED, not descended: a review pipeline must not
//   leak unrecognized container content into the manuscript; the skip is loud
//   via the char-mass backstop. Known transparent wrappers (smartTag, customXml,
//   sdt, ins, moveTo, ...) are listed explicitly. Non-wml (drawing/vml) elements
//   are transparent so w:txbxContent is reachable.
// - tracked changes: accept-all (w:ins kept, w:del dropped BY ELEMENT NAME).
// - fields: fldChar state machine with nesting; instrText suppressed (Zotero /
//   EndNote payloads), cached results kept, TOC dropped, dirty fields counted.
// - determinism: the emitted md carries NO timestamp (extracted_at lives in the
//   report only); re-extracting the same docx is byte-identical.
//
// CLI:
//   node extract-docx.js extract <file.docx> [--out P] [--report P] [--force]
//        # defaults: out    = <docx-dir>/.paper-review/<basename>.md
//        #           report = <docx-dir>/.paper-review/extraction-report.json
//        # refuses an existing --out without --force (reason working-copy-exists)
//   node extract-docx.js stats   <file.docx>     # dry run: report JSON to stdout
// Exit: 0 ok | 1 fail-loud {ok:false, reason_code, message} | 2 usage.

'use strict'
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const crypto = require('crypto')

class ExtractError extends Error {
  constructor(reason_code, message) { super(message); this.reason_code = reason_code }
}
const fail = (code, msg) => { throw new ExtractError(code, msg) }

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

// ---- minimal ZIP reader (central-directory-driven) -------------------------

function readZip(buf) {
  if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
    fail('doc-ole2', 'legacy .doc (OLE2) is not a .docx -- open in Word and Save As .docx')
  }
  const scanFloor = Math.max(0, buf.length - (22 + 65535))
  let eocd = -1
  for (let i = buf.length - 22; i >= scanFloor; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) fail('not-a-zip', 'no ZIP end-of-central-directory record found')
  const total = buf.readUInt16LE(eocd + 10)
  const cdSize = buf.readUInt32LE(eocd + 12)
  const cdOffset = buf.readUInt32LE(eocd + 16)
  if (total === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    fail('zip64-unsupported', 'zip64 archive (never produced for a real docx)')
  }
  const entries = new Map()
  let p = cdOffset
  for (let i = 0; i < total; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) {
      fail('not-a-zip', 'central directory corrupt at entry ' + i)
    }
    const gpFlags = buf.readUInt16LE(p + 8)
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const uncompSize = buf.readUInt32LE(p + 24)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const lho = buf.readUInt32LE(p + 42)
    if (compSize === 0xffffffff || uncompSize === 0xffffffff || lho === 0xffffffff) {
      fail('zip64-unsupported', 'zip64 sizes in central directory')
    }
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8')
    entries.set(name, { gpFlags, method, compSize, lho })
    p += 46 + nameLen + extraLen + commentLen
  }
  // data offset is computed from the LOCAL header's own name/extra lengths (they
  // routinely differ from the CD's); sizes always come from the CD, which makes
  // GP-bit-3 data descriptors a non-event.
  function read(name) {
    const e = entries.get(name)
    if (!e) return null
    if (e.gpFlags & 0x1) fail('encrypted-zip', 'zip entry is encrypted: ' + name)
    const lnameLen = buf.readUInt16LE(e.lho + 26)
    const lextraLen = buf.readUInt16LE(e.lho + 28)
    const start = e.lho + 30 + lnameLen + lextraLen
    const raw = buf.slice(start, start + e.compSize)
    if (e.method === 0) return raw
    if (e.method === 8) {
      try { return zlib.inflateRawSync(raw) }
      catch (err) { fail('zip-data-corrupt', 'deflate stream corrupt for ' + name + ': ' + err.message) }
    }
    fail('compression-method-unsupported', 'zip compression method ' + e.method + ' on ' + name)
  }
  return { entries, read, has: (n) => entries.has(n) }
}

// ---- tolerant XML event scanner --------------------------------------------

function decodeEntities(s) {
  if (s.indexOf('&') < 0) return s
  return s.replace(/&(amp|lt|gt|quot|apos);|&#(\d+);|&#x([0-9a-fA-F]+);/g, (m, n, d, h) => {
    if (n) return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[n]
    try { return String.fromCodePoint(d ? parseInt(d, 10) : parseInt(h, 16)) } catch (e) { return m }
  })
}

function* scanXml(s) {
  let i = 0
  while (i < s.length) {
    const lt = s.indexOf('<', i)
    if (lt < 0) { break }
    if (lt > i) yield { type: 'text', text: s.slice(i, lt) }
    if (s.startsWith('<!--', lt)) { const e = s.indexOf('-->', lt); i = e < 0 ? s.length : e + 3; continue }
    if (s.startsWith('<![CDATA[', lt)) {
      const e = s.indexOf(']]>', lt)
      yield { type: 'text', text: s.slice(lt + 9, e < 0 ? s.length : e), cdata: true }
      i = e < 0 ? s.length : e + 3; continue
    }
    if (s.startsWith('<?', lt)) { const e = s.indexOf('?>', lt); i = e < 0 ? s.length : e + 2; continue }
    if (s.startsWith('<!', lt)) { const e = s.indexOf('>', lt); i = e < 0 ? s.length : e + 1; continue }
    const gt = s.indexOf('>', lt)
    if (gt < 0) break
    const inner = s.slice(lt + 1, gt)
    if (inner[0] === '/') {
      yield { type: 'close', name: inner.slice(1).trim() }
    } else {
      const self = inner.endsWith('/')
      const body = self ? inner.slice(0, -1) : inner
      const sp = body.search(/\s/)
      const name = sp < 0 ? body : body.slice(0, sp)
      let attrs = null
      if (sp >= 0) {
        attrs = {}
        const re = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
        const rest = body.slice(sp)
        let m
        while ((m = re.exec(rest))) attrs[m[1]] = m[2] != null ? m[2] : m[3]
      }
      yield { type: 'open', name, attrs: attrs || {}, selfClosing: self }
    }
    i = gt + 1
  }
}

// ---- namespace resolution ---------------------------------------------------

const NS_URIS = {
  w: ['http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main'],
  m: ['http://schemas.openxmlformats.org/officeDocument/2006/math', 'http://purl.oclc.org/ooxml/officeDocument/math'],
  mc: ['http://schemas.openxmlformats.org/markup-compatibility/2006'],
  r: ['http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'http://purl.oclc.org/ooxml/officeDocument/relationships'],
}

// Map the document's actual prefixes (from the root xmlns:* declarations) to the
// canonical w/m/mc/r, so a rebound prefix ("w0:p") still resolves.
function prefixMap(xml, { requireW = false } = {}) {
  for (const ev of scanXml(xml)) {
    if (ev.type !== 'open') continue
    const map = {}
    for (const [k, v] of Object.entries(ev.attrs)) {
      let prefix = null
      if (k === 'xmlns') prefix = ''
      else if (k.startsWith('xmlns:')) prefix = k.slice(6)
      if (prefix == null) continue
      for (const [canon, uris] of Object.entries(NS_URIS)) {
        if (uris.includes(v)) map[prefix] = canon
      }
    }
    if (requireW && !Object.values(map).includes('w')) {
      fail('namespace-missing', 'wordprocessingml namespace not declared on the root element')
    }
    return map
  }
  if (requireW) fail('namespace-missing', 'no root element found')
  return {}
}

// canonical name 'w:p' for an event name under a prefix map; unknown ns -> 'x:local'
function canon(map, name) {
  const idx = name.indexOf(':')
  const prefix = idx < 0 ? '' : name.slice(0, idx)
  const local = idx < 0 ? name : name.slice(idx + 1)
  const ns = map[prefix]
  return (ns || 'x') + ':' + local
}

function attrOf(map, attrs, canonName) {
  for (const [k, v] of Object.entries(attrs)) {
    if (canon(map, k) === canonName) return v
  }
  return null
}

// ---- styles.xml / numbering.xml / rels --------------------------------------

function parseStyles(xml) {
  if (!xml) return new Map()
  const map = prefixMap(xml)
  const styles = new Map()
  let cur = null
  for (const ev of scanXml(xml)) {
    if (ev.type === 'open') {
      const n = canon(map, ev.name)
      if (n === 'w:style') {
        cur = { outlineLvl: null, basedOn: null, name: null }
        const id = attrOf(map, ev.attrs, 'w:styleId')
        if (id != null) styles.set(id, cur)
        if (ev.selfClosing) cur = null
      } else if (cur) {
        if (n === 'w:outlineLvl') cur.outlineLvl = parseInt(attrOf(map, ev.attrs, 'w:val'), 10)
        else if (n === 'w:basedOn') cur.basedOn = attrOf(map, ev.attrs, 'w:val')
        else if (n === 'w:name') cur.name = attrOf(map, ev.attrs, 'w:val')
      }
    } else if (ev.type === 'close' && canon(map, ev.name) === 'w:style') {
      cur = null
    }
  }
  return styles
}

// 3-tier resolution; returns { level: 0..8, tier: 'direct'|'styles'|'name' } or null.
// NEVER styleId pattern-matching (zh-CN Word writes bare numeric styleIds).
function resolveHeadingLevel(direct, styleId, styles) {
  if (direct != null && !Number.isNaN(direct)) {
    return direct >= 0 && direct <= 8 ? { level: direct, tier: 'direct' } : null
  }
  if (styleId == null) return null
  let s = styles.get(styleId)
  let depth = 0
  while (s && depth < 16) {
    if (s.outlineLvl != null && !Number.isNaN(s.outlineLvl)) {
      return s.outlineLvl >= 0 && s.outlineLvl <= 8 ? { level: s.outlineLvl, tier: 'styles' } : null
    }
    const m = s.name && /^heading ([1-9])$/i.exec(s.name)
    if (m) return { level: parseInt(m[1], 10) - 1, tier: 'name' }
    s = s.basedOn != null ? styles.get(s.basedOn) : null
    depth++
  }
  return null
}

function parseNumbering(xml) {
  if (!xml) return null
  const map = prefixMap(xml)
  const abstract = new Map()
  const nums = new Map()
  let curAbs = null
  let curLvl = null
  let curNum = null
  for (const ev of scanXml(xml)) {
    if (ev.type === 'open') {
      const n = canon(map, ev.name)
      if (n === 'w:abstractNum') { curAbs = new Map(); abstract.set(attrOf(map, ev.attrs, 'w:abstractNumId'), curAbs) }
      else if (n === 'w:lvl' && curAbs) curLvl = attrOf(map, ev.attrs, 'w:ilvl')
      else if (n === 'w:numFmt' && curAbs && curLvl != null) curAbs.set(curLvl, attrOf(map, ev.attrs, 'w:val'))
      else if (n === 'w:num') curNum = attrOf(map, ev.attrs, 'w:numId')
      else if (n === 'w:abstractNumId' && curNum != null) nums.set(curNum, attrOf(map, ev.attrs, 'w:val'))
    } else if (ev.type === 'close') {
      const n = canon(map, ev.name)
      if (n === 'w:abstractNum') curAbs = null
      else if (n === 'w:lvl') curLvl = null
      else if (n === 'w:num') curNum = null
    }
  }
  return { abstract, nums }
}

function parseRels(xml) {
  const rels = new Map()
  if (!xml) return rels
  for (const ev of scanXml(xml)) {
    if (ev.type === 'open' && /(^|:)Relationship$/.test(ev.name)) {
      const id = ev.attrs.Id
      // Targets are XML-attribute-encoded (&amp; in query strings); decode them
      if (id) rels.set(id, { type: ev.attrs.Type || '', target: decodeEntities(ev.attrs.Target || '') })
    }
  }
  return rels
}

function findMainPart(zip) {
  const relsXml = zip.has('_rels/.rels') ? zip.read('_rels/.rels').toString('utf8') : null
  if (relsXml) {
    for (const [, rel] of parseRels(relsXml)) {
      if (/\/officeDocument$/.test(rel.type)) return rel.target.replace(/^\//, '')
    }
  }
  if (zip.has('word/document.xml')) return 'word/document.xml'
  fail('main-part-missing', 'no officeDocument relationship and no word/document.xml')
}

// ---- the WordprocessingML walker --------------------------------------------

// Known wml containers that are TRANSPARENT (descend; no own semantics here).
const TRANSPARENT_W = new Set([
  'body', 'document', 'smartTag', 'customXml', 'dir', 'bdo', 'sdt', 'sdtContent',
  'moveTo', 'footnote', 'endnote', 'object', 'pict',
])
// Known wml property/structure containers whose stray text is structural, never
// prose: text inside is suppressed into the accounted `structure` bucket.
const STRUCTURE_W = new Set([
  'pPr', 'rPr', 'tblPr', 'tblGrid', 'trPr', 'tcPr', 'sectPr', 'sdtPr', 'fldData',
  'numPr', 'sdtEndPr', 'tblPrEx',
])
// Known no-content markers to ignore outright.
const IGNORE_W = new Set([
  'bookmarkStart', 'bookmarkEnd', 'proofErr', 'lastRenderedPageBreak',
  'commentRangeStart', 'commentRangeEnd', 'commentReference',
])

class Walker {
  constructor({ styles, numbering, rels, counters, notes, audit = true }) {
    this.styles = styles
    this.numbering = numbering
    this.rels = rels
    this.c = counters
    this.notes = notes
    this.audit = audit
    this.blocks = []          // finished markdown blocks
    this.headings = []        // {level, tier}
    this.usedNotes = []       // {kind:'fn'|'en', id} in reference order
    this.paraStack = []
    this.fieldStack = []
    this.linkStack = []
    this.tableStack = []
    this.mcStack = []
    this.drawingStack = []
    this.elementStack = []    // {name, undo}
    this.suppress = []        // active text-drop buckets (innermost last)
    this.textEl = null        // canonical name of the open text-bearing element
    this.mathDepth = 0
    this.mathBuf = ''
    this.nestedTblDepth = 0
    this.inTxbx = 0
    this.carryText = ''       // paragraph-mark-deleted merge buffer
    this.total = 0
    this.emitted = 0
    this.dropped = { del: 0, instr: 0, toc: 0, mc: 0, structure: 0 }
  }

  emitText(s) {
    this.emitted += s.length
    if (this.mathDepth > 0) { this.mathBuf += s; return }
    if (this.linkStack.length) { this.linkStack[this.linkStack.length - 1].text += s; return }
    if (!this.paraStack.length) this.openPara(true)   // stray text: implicit paragraph
    this.paraStack[this.paraStack.length - 1].text += s
  }

  emitSyntax(s) {  // extractor-added markers; never counted as document chars
    if (this.suppress.length) return   // a marker must not leak out of a dropped subtree
    if (this.mathDepth > 0) { this.mathBuf += s; return }
    if (this.linkStack.length) { this.linkStack[this.linkStack.length - 1].text += s; return }
    if (!this.paraStack.length) this.openPara(true)
    this.paraStack[this.paraStack.length - 1].text += s
  }

  dropText(len) {
    const bucket = this.suppress.length ? this.suppress[this.suppress.length - 1] : null
    if (bucket && this.dropped[bucket] != null) this.dropped[bucket] += len
    // bucket null = unknown-element skip: intentionally unaccounted (backstop)
  }

  openPara(implicit) {
    this.paraStack.push({
      text: '', styleId: null, outlineLvl: null, numIlvl: null, numId: null,
      markDeleted: false, textbox: this.inTxbx > 0, implicit: !!implicit,
    })
  }

  closePara() {
    const ctx = this.paraStack.pop()
    if (!ctx) return
    let text = ctx.text
    const suppressed = this.suppress.length > 0
    if (suppressed) return                       // a paragraph inside a dropped subtree
    const table = this.tableStack[this.tableStack.length - 1]
    if (table && table.cell && !ctx.textbox) {   // cell paragraphs are consumed by the table
      if (text.trim()) table.cell.texts.push(text)
      return
    }
    if (ctx.markDeleted) {                       // paragraph mark deleted: merge with next
      if (text.trim()) {
        this.carryText += (this.carryText ? ' ' : '') + text.trim()
        if (!this.notes.includes('paragraph-mark deletions merged with the following paragraph')) {
          this.notes.push('paragraph-mark deletions merged with the following paragraph')
        }
      }
      return
    }
    if (this.carryText) { text = this.carryText + ' ' + text; this.carryText = '' }
    if (!text.trim()) return
    const h = resolveHeadingLevel(ctx.outlineLvl, ctx.styleId, this.styles)
    if (h && !ctx.textbox) {
      const line = text.replace(/\s*\n\s*/g, ' ').trim()
      this.blocks.push('#'.repeat(Math.min(h.level + 1, 6)) + ' ' + line)
      this.headings.push(h)
      return
    }
    if (ctx.numId != null) {
      const fmt = this.listFormat(ctx.numId, ctx.numIlvl || '0')
      const indent = '  '.repeat(parseInt(ctx.numIlvl || '0', 10) || 0)
      this.blocks.push(indent + (fmt === 'bullet' ? '- ' : '1. ') + mdSafe(text).replace(/\n/g, ' '))
      this.c.list_items++
      this.c.paragraphs++
      return
    }
    const safe = mdSafe(text)
    if (ctx.textbox) {
      this.blocks.push('[textbox] ' + safe.replace(/\n/g, ' '))
      this.c.textboxes++
      this.c.paragraphs++
      return
    }
    this.blocks.push(safe)
    this.c.paragraphs++
  }

  listFormat(numId, ilvl) {
    const n = this.numbering
    if (n) {
      const absId = n.nums.get(String(numId))
      const lvls = absId != null ? n.abstract.get(absId) : null
      const fmt = lvls ? lvls.get(String(ilvl)) : null
      if (fmt) return fmt === 'bullet' ? 'bullet' : 'number'
    }
    if (!this.c.list_numbering_degraded) this.notes.push('list numbering not preserved (numbering.xml missing or unresolvable)')
    this.c.list_numbering_degraded++
    return 'bullet'
  }

  // one XML event; map = the prefix map of the part being walked
  on(ev, map) {
    if (ev.type === 'text') {
      const t = decodeEntities(ev.text)
      if (this.textEl === 'w:t' || this.textEl === 'm:t' || this.textEl === 'w:delText' || this.textEl === 'w:instrText') {
        if (this.audit) this.total += t.length
        if (this.textEl === 'w:delText') { this.dropped.del += t.length; return }
        if (this.textEl === 'w:instrText') {
          this.dropped.instr += t.length
          const f = this.fieldStack[this.fieldStack.length - 1]
          if (f && f.phase === 'instr') f.instr += t
          return
        }
        // w:t / m:t
        if (this.suppress.length) { this.dropText(t.length); return }
        const f = this.fieldStack[this.fieldStack.length - 1]
        if (f) {
          if (f.phase === 'instr') { this.dropped.instr += t.length; f.instr += t; return }
          if (f.toc) { this.dropped.toc += t.length; return }
        }
        this.emitText(t)
      }
      return
    }

    const name = canon(map, ev.name)

    if (ev.type === 'open') {
      let undo = null
      const [ns, local] = [name.slice(0, name.indexOf(':')), name.slice(name.indexOf(':') + 1)]

      if (name === 'w:t' || name === 'm:t' || name === 'w:delText' || name === 'w:instrText') {
        if (!ev.selfClosing) { const prev = this.textEl; this.textEl = name; undo = () => { this.textEl = prev } }
      } else if (name === 'w:p') {
        // a real paragraph closes any implicit one first (stray/block-level
        // content must not trail silently behind it)
        const top = this.paraStack[this.paraStack.length - 1]
        if (top && top.implicit) this.closePara()
        this.openPara(false)
        undo = () => this.closePara()
      } else if (name === 'w:pStyle') {
        const p = this.paraStack[this.paraStack.length - 1]
        if (p) p.styleId = attrOf(map, ev.attrs, 'w:val')
      } else if (name === 'w:outlineLvl') {
        const p = this.paraStack[this.paraStack.length - 1]
        if (p) p.outlineLvl = parseInt(attrOf(map, ev.attrs, 'w:val'), 10)
      } else if (name === 'w:ilvl') {
        const p = this.paraStack[this.paraStack.length - 1]
        if (p) p.numIlvl = attrOf(map, ev.attrs, 'w:val')
      } else if (name === 'w:numId') {
        const p = this.paraStack[this.paraStack.length - 1]
        if (p) p.numId = attrOf(map, ev.attrs, 'w:val')
      } else if (name === 'w:del' && this.elementStack.some((e) => e.name === 'w:rPr')) {
        // paragraph-mark deletion lives at w:pPr/w:rPr/w:del
        const p = this.paraStack[this.paraStack.length - 1]
        if (p) p.markDeleted = true
      } else if (name === 'w:del' || name === 'w:moveFrom') {
        this.c.del_dropped++
        if (!ev.selfClosing) { this.suppress.push('del'); undo = () => this.suppress.pop() }
      } else if (name === 'w:ins') {
        this.c.ins_accepted++
      } else if (name === 'w:fldChar') {
        const t = attrOf(map, ev.attrs, 'w:fldCharType')
        if (t === 'begin') this.fieldStack.push({ phase: 'instr', instr: '', toc: false })
        else if (t === 'separate') {
          const f = this.fieldStack[this.fieldStack.length - 1]
          if (f) { f.phase = 'result'; f.toc = /^\s*TOC\b/i.test(f.instr) }
        } else if (t === 'end') {
          const f = this.fieldStack.pop()
          if (f && !this.suppress.length) {
            if (f.phase === 'instr') { this.c.fields_unresolved++; this.notes.push('dirty field (no cached result): nothing emitted') }
            else if (f.toc) this.c.toc_dropped++
            else this.c.fields_resolved++
          }
        }
      } else if (name === 'w:fldSimple') {
        const instr = attrOf(map, ev.attrs, 'w:instr') || ''
        if (/^\s*TOC\b/i.test(instr)) {
          this.c.toc_dropped++
          if (!ev.selfClosing) { this.suppress.push('toc'); undo = () => this.suppress.pop() }
        } else {
          this.c.fields_resolved++
        }
      } else if (name === 'w:hyperlink') {
        const rid = attrOf(map, ev.attrs, 'r:id')
        if (!ev.selfClosing) {
          this.linkStack.push({ rid, text: '' })
          undo = () => {
            const l = this.linkStack.pop()
            if (this.suppress.length) return   // dropped subtree: nothing reached the buffer
            const rel = l.rid != null ? this.rels.get(l.rid) : null
            if (rel && rel.target) { this.emitSyntax('[' + l.text + '](' + rel.target + ')'); this.c.hyperlinks_resolved++ }
            else {
              this.emitSyntax(l.text)
              if (l.rid != null) { this.c.hyperlinks_unresolved++; this.notes.push('hyperlink target unresolved: ' + l.rid) }
            }
            // link text length was already counted at emit-time into the buffer
          }
        }
      } else if (name === 'm:oMath' || name === 'm:oMathPara') {
        if (!ev.selfClosing) {
          this.mathDepth++
          if (this.mathDepth === 1) this.mathBuf = ''
          undo = () => {
            this.mathDepth--
            if (this.mathDepth === 0 && !this.suppress.length) {
              const flat = this.mathBuf.trim()
              this.emitSyntax('[equation: ' + (flat || 'empty') + ']')
              this.c.equations_flattened++
              if (!this.notes.includes('equations flattened: math structure lost')) this.notes.push('equations flattened: math structure lost')
            }
          }
        }
      } else if (name === 'w:object') {
        if (!ev.selfClosing) {
          const mark = this.emitted
          undo = () => {
            if (this.emitted === mark && !this.suppress.length) { this.emitSyntax('[equation: OLE object]'); this.c.ole_equations_placeholder++ }
          }
        }
      } else if (name === 'w:drawing' || name === 'w:pict') {
        if (!ev.selfClosing) {
          this.drawingStack.push({ sawTextbox: false })
          undo = () => {
            const d = this.drawingStack.pop()
            if (!d.sawTextbox && !this.suppress.length) { this.emitSyntax('[image]'); this.c.images++ }
          }
        }
      } else if (name === 'w:txbxContent') {
        const d = this.drawingStack[this.drawingStack.length - 1]
        if (d) d.sawTextbox = true
        if (!ev.selfClosing) { this.inTxbx++; undo = () => { this.inTxbx-- } }
      } else if (name === 'mc:AlternateContent') {
        if (!ev.selfClosing) { this.mcStack.push({ taken: false }); undo = () => this.mcStack.pop() }
      } else if (name === 'mc:Choice' || name === 'mc:Fallback') {
        const mc = this.mcStack[this.mcStack.length - 1]
        if (mc && !ev.selfClosing) {
          if (!mc.taken) { mc.taken = true }
          else { this.suppress.push('mc'); undo = () => this.suppress.pop() }
        }
      } else if (name === 'w:tbl') {
        if (this.tableStack.length) {
          this.nestedTblDepth++
          if (!this.notes.includes('nested table flattened inline')) this.notes.push('nested table flattened inline')
          undo = () => { this.nestedTblDepth-- }
        } else if (!ev.selfClosing) {
          this.tableStack.push({ rows: [], row: null, cell: null, merged: false })
          undo = () => this.closeTable()
        }
      } else if (name === 'w:tr') {
        // nested-table rows are structural no-ops: their paragraphs flatten into
        // the OUTER cell (falling through to the unknown-element skip would drop
        // them unaccounted)
        if (this.tableStack.length && !this.nestedTblDepth) {
          const t = this.tableStack[this.tableStack.length - 1]
          t.row = []
          undo = () => { if (t.row) { t.rows.push(t.row); t.row = null } }
        }
      } else if (name === 'w:tc') {
        if (this.tableStack.length && !this.nestedTblDepth) {
          const t = this.tableStack[this.tableStack.length - 1]
          t.cell = { texts: [], gridSpan: 1, vMerge: null }
          undo = () => { if (t.row && t.cell) t.row.push(t.cell); t.cell = null }
        }
      } else if (name === 'w:gridSpan') {
        const t = this.tableStack[this.tableStack.length - 1]
        if (t && t.cell) { t.cell.gridSpan = parseInt(attrOf(map, ev.attrs, 'w:val'), 10) || 1; t.merged = true }
      } else if (name === 'w:vMerge') {
        const t = this.tableStack[this.tableStack.length - 1]
        if (t && t.cell) { t.cell.vMerge = attrOf(map, ev.attrs, 'w:val') || 'continue'; t.merged = true }
      } else if (name === 'w:footnoteReference' || name === 'w:endnoteReference') {
        const id = attrOf(map, ev.attrs, 'w:id')
        const kind = name === 'w:footnoteReference' ? 'fn' : 'en'
        if (id != null && !this.suppress.length) {   // a deleted reference must not pull its definition in
          this.emitSyntax('[^' + kind + id + ']')
          this.usedNotes.push({ kind, id })
        }
      } else if (name === 'w:sym') {
        // symbol-font character (legacy Greek/math glyphs); the char never appears
        // as a text node so the backstop cannot see it -- emit a loud placeholder
        if (!this.suppress.length) {
          this.emitSyntax('[symbol]')
          this.c.symbols++
          if (!this.notes.includes('w:sym symbol-font characters replaced with [symbol] placeholders')) {
            this.notes.push('w:sym symbol-font characters replaced with [symbol] placeholders')
          }
        }
      } else if (name === 'w:tab') {
        this.emitSyntax(' ')
      } else if (name === 'w:br' || name === 'w:cr') {
        const type = attrOf(map, ev.attrs, 'w:type')
        if (type !== 'page') this.emitSyntax('\n')
      } else if (name === 'w:noBreakHyphen') {
        this.emitSyntax('-')
      } else if (name === 'w:softHyphen') {
        // dropped by design
      } else if (ns === 'w' && STRUCTURE_W.has(local)) {
        if (!ev.selfClosing) { this.suppress.push('structure'); undo = () => this.suppress.pop() }
      } else if (ns === 'w' && (TRANSPARENT_W.has(local) || IGNORE_W.has(local) || local === 'r')) {
        // descend (or no-op marker)
      } else if (ns === 'w') {
        // UNKNOWN wml element: skip its subtree; the char-mass backstop surfaces
        // any text it swallows as unaccounted_chars (loud, never silent).
        if (!ev.selfClosing) { this.suppress.push(null); undo = () => this.suppress.pop() }
      } else {
        // non-wml (drawingml/vml/mc handled above): transparent, so that
        // w:txbxContent stays reachable inside drawing containers
      }

      if (!ev.selfClosing) this.elementStack.push({ name, undo })
      else if (undo) undo()
      return
    }

    if (ev.type === 'close') {
      for (let i = this.elementStack.length - 1; i >= 0; i--) {
        const e = this.elementStack[i]
        if (e.name === name) {
          // unwind anything left open above (tolerant of malformed nesting)
          for (let j = this.elementStack.length - 1; j >= i; j--) {
            const u = this.elementStack[j].undo
            if (u) u()
          }
          this.elementStack.length = i
          return
        }
      }
    }
  }

  closeTable() {
    const t = this.tableStack.pop()
    if (!t || !t.rows.length) return
    const render = (cell) => cell.texts.join(' ').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim()
    const grid = t.rows.map((row) => {
      const cells = []
      for (const c of row) {
        if (c.vMerge === 'continue') { cells.push(''); continue }
        cells.push(render(c))
        for (let k = 1; k < c.gridSpan; k++) cells.push('')
      }
      return cells
    })
    const width = Math.max(...grid.map((r) => r.length))
    const pad = (r) => { while (r.length < width) r.push(''); return r }
    const lines = []
    lines.push('| ' + pad(grid[0]).join(' | ') + ' |')
    lines.push('|' + Array(width).fill('---').join('|') + '|')
    for (const r of grid.slice(1)) lines.push('| ' + pad(r).join(' | ') + ' |')
    this.blocks.push(lines.join('\n'))
    this.c.tables++
    if (t.merged) {
      this.c.merged_cell_tables++
      if (!this.notes.includes('merged cells (gridSpan/vMerge) degraded to padded pipe-table cells')) {
        this.notes.push('merged cells (gridSpan/vMerge) degraded to padded pipe-table cells')
      }
    }
  }

  finish() {
    while (this.elementStack.length) {
      const e = this.elementStack.pop()
      if (e.undo) e.undo()
    }
    while (this.paraStack.length) this.closePara()   // flush implicit/orphaned paragraphs
    if (this.carryText) { this.blocks.push(mdSafe(this.carryText)); this.c.paragraphs++; this.carryText = '' }
  }
}

// markdown safety for body prose: strip leading whitespace per line (no
// accidental 4-space code blocks) and escape line-leading '#' (no phantom ATX
// headings in decompose's md mode). No other character escaping.
function mdSafe(text) {
  return text.split('\n').map((l) => {
    l = l.replace(/^[ \t]+/, '')
    if (l.startsWith('#')) l = '\\' + l
    return l
  }).join('\n').trim()
}

function walkPart(xml, opts) {
  const map = prefixMap(xml, { requireW: opts.requireW })
  const w = new Walker(opts)
  for (const ev of scanXml(xml)) w.on(ev, map)
  w.finish()
  return w
}

// footnotes.xml / endnotes.xml -> Map(id -> text), skipping separator stubs
function parseNotes(xml, kind, shared) {
  const out = new Map()
  if (!xml) return out
  const map = prefixMap(xml)
  // split per note element so each definition renders independently
  const noteName = kind === 'fn' ? 'w:footnote' : 'w:endnote'
  let cur = null
  let depth = 0
  let buf = []
  const flush = (id, events) => {
    // detached counters: a note definition's paragraphs/markers must not inflate
    // the body counters (footnotes_inlined is counted by the caller instead)
    const scratch = {}
    for (const k of Object.keys(shared.counters)) scratch[k] = 0
    const w = new Walker({ ...shared, counters: scratch, audit: false })
    for (const e of events) w.on(e, map)
    w.finish()
    const text = w.blocks.join(' ').replace(/\s+/g, ' ').trim()
    if (text) out.set(id, text)
  }
  for (const ev of scanXml(xml)) {
    const n = ev.type === 'text' ? null : canon(map, ev.name)
    if (cur == null) {
      if (ev.type === 'open' && n === noteName && !ev.selfClosing) {
        const type = attrOf(map, ev.attrs, 'w:type')
        const id = attrOf(map, ev.attrs, 'w:id')
        if (type === 'separator' || type === 'continuationSeparator') { cur = { skip: true }; depth = 1; buf = [] }
        else { cur = { id }; depth = 1; buf = [] }
      }
    } else {
      if (ev.type === 'open' && !ev.selfClosing) depth++
      if (ev.type === 'close') {
        depth--
        if (depth === 0) {
          if (!cur.skip && cur.id != null) flush(cur.id, buf)
          cur = null
          continue
        }
      }
      buf.push(ev)
    }
  }
  return out
}

// ---- top-level extraction ----------------------------------------------------

function extract(docxPath) {
  const buf = fs.readFileSync(docxPath)
  const zip = readZip(buf)
  const mainPart = findMainPart(zip)
  const docBuf = zip.read(mainPart)
  if (!docBuf) fail('main-part-missing', 'main part listed but not present: ' + mainPart)
  if (docBuf.length >= 2 && ((docBuf[0] === 0xff && docBuf[1] === 0xfe) || (docBuf[0] === 0xfe && docBuf[1] === 0xff))) {
    fail('utf16-document-xml', 'document.xml is UTF-16 encoded; UTF-8 expected')
  }
  const docXml = docBuf.toString('utf8')

  const partDir = mainPart.replace(/\/[^/]*$/, '')
  const readPart = (n) => { const b = zip.read(n); return b ? b.toString('utf8') : null }
  const styles = parseStyles(readPart(partDir + '/styles.xml'))
  const numbering = parseNumbering(readPart(partDir + '/numbering.xml'))
  const relsName = partDir + '/_rels/' + mainPart.slice(partDir.length + 1) + '.rels'
  const rels = parseRels(readPart(relsName))

  const counters = {
    paragraphs: 0, tables: 0, merged_cell_tables: 0, list_items: 0,
    list_numbering_degraded: 0, fields_resolved: 0, fields_unresolved: 0,
    toc_dropped: 0, equations_flattened: 0, ole_equations_placeholder: 0,
    images: 0, textboxes: 0, footnotes_inlined: 0, endnotes_inlined: 0,
    comments_dropped: 0, ins_accepted: 0, del_dropped: 0,
    hyperlinks_resolved: 0, hyperlinks_unresolved: 0, symbols: 0,
  }
  const notes = []
  const shared = { styles, numbering, rels, counters, notes }

  const w = walkPart(docXml, { ...shared, requireW: true, audit: true })

  // footnote/endnote definitions for the ids actually referenced in the body
  const fnDefs = parseNotes(readPart(partDir + '/footnotes.xml'), 'fn', shared)
  const enDefs = parseNotes(readPart(partDir + '/endnotes.xml'), 'en', shared)
  const defBlocks = []
  const seen = new Set()
  for (const ref of w.usedNotes) {
    const key = ref.kind + ref.id
    if (seen.has(key)) continue
    seen.add(key)
    const defs = ref.kind === 'fn' ? fnDefs : enDefs
    const text = defs.get(ref.id)
    if (text) {
      defBlocks.push('[^' + ref.kind + ref.id + ']: ' + text)
      if (ref.kind === 'fn') counters.footnotes_inlined++
      else counters.endnotes_inlined++
    } else {
      notes.push('note definition missing for [^' + key + '] (counted, not inlined)')
    }
  }

  const commentsXml = readPart(partDir + '/comments.xml')
  if (commentsXml) {
    const cm = prefixMap(commentsXml)
    let n = 0
    for (const ev of scanXml(commentsXml)) {
      if (ev.type === 'open' && canon(cm, ev.name) === 'w:comment') n++
    }
    counters.comments_dropped = n
    if (n) notes.push('reviewer comments present in the docx: dropped from the manuscript, see comments.xml')
  }

  const md = w.blocks.concat(defBlocks).filter((b) => b.trim()).join('\n\n') + '\n'

  const accounted = w.dropped.del + w.dropped.instr + w.dropped.toc + w.dropped.mc + w.dropped.structure
  // signed on purpose: a NEGATIVE balance means chars were double-counted (an
  // accounting bug in the walker), which a clamp would silently hide
  const unaccounted = w.total - w.emitted - accounted
  const warnings = []
  if (unaccounted > 0) {
    warnings.push(`char-mass backstop: ${unaccounted} text characters in document.xml were neither emitted nor accounted (an unhandled element class swallowed prose -- inspect before trusting the working copy)`)
  } else if (unaccounted < 0) {
    warnings.push(`char-mass backstop: negative balance (${unaccounted}): characters were double-counted (extractor accounting bug -- report it)`)
  }
  const headingCount = w.headings.length
  if (headingCount === 0) {
    warnings.push('document yields no headings; review runs structureless (frontmatter#pN passages)')
  }
  const tier_histogram = { direct: 0, styles: 0, name: 0 }
  for (const h of w.headings) tier_histogram[h.tier]++
  if (counters.ins_accepted + counters.del_dropped > 0) {
    notes.push('tracked changes present: accepted-all (insertions kept, deletions dropped); seed an author-required ledger row')
  }

  const report = {
    schema: 1,
    original: path.resolve(docxPath),
    original_sha256: sha256(buf),
    out: null,
    working_sha256: sha256(Buffer.from(md, 'utf8')),
    extracted_at: new Date().toISOString(),
    headings: { count: headingCount, tier_histogram },
    counters,
    char_audit: {
      text_node_chars_total: w.total,
      chars_emitted: w.emitted,
      chars_accounted_dropped: accounted,
      unaccounted_chars: unaccounted,
    },
    tracked_changes_present: counters.ins_accepted + counters.del_dropped > 0,
    crc: 'unchecked',
    warnings,
    notes,
  }
  return { md, report }
}

// ---- CLI ----------------------------------------------------------------------

function parseFlags(argv) {
  const flags = {}
  const pos = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--force') flags.force = true
    else if (argv[i].startsWith('--')) { flags[argv[i].slice(2)] = argv[i + 1]; i++ }
    else pos.push(argv[i])
  }
  return { flags, pos }
}

function main() {
  const [cmd, file, ...rest] = process.argv.slice(2)
  if (!cmd || !file) {
    console.error('usage: node extract-docx.js <extract|stats> <file.docx> [--out P] [--report P] [--force]')
    process.exit(2)
  }
  const { flags } = parseFlags(rest)
  try {
    if (cmd === 'stats') {
      const { report } = extract(file)
      console.log(JSON.stringify(report, null, 2))
      return
    }
    if (cmd !== 'extract') {
      console.error('unknown command: ' + cmd)
      process.exit(2)
    }
    const dir = path.dirname(path.resolve(file))
    const base = path.basename(file).replace(/\.docx$/i, '')
    const out = path.resolve(flags.out || path.join(dir, '.paper-review', base + '.md'))
    const reportPath = path.resolve(flags.report || path.join(dir, '.paper-review', 'extraction-report.json'))
    const collision = fs.existsSync(out) ? out : (fs.existsSync(reportPath) ? reportPath : null)
    if (collision && !flags.force) {
      console.log(JSON.stringify({
        ok: false, reason_code: 'working-copy-exists',
        message: 'working copy / extraction report already exists: ' + collision + ' -- reuse it (re-extraction is forbidden mid-engagement); pass --force only as an explicit NEW intake that discards applied edits',
      }))
      process.exit(1)
    }
    const { md, report } = extract(file)
    report.out = out
    fs.mkdirSync(path.dirname(out), { recursive: true })
    fs.writeFileSync(out, md, 'utf8')
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
    console.log(JSON.stringify({
      ok: true, out, report: reportPath,
      original_sha256: report.original_sha256, working_sha256: report.working_sha256,
      headings: report.headings, warnings: report.warnings,
    }))
  } catch (err) {
    // the fail-loud JSON contract holds for EVERY failure, not just typed ones
    const code = err instanceof ExtractError ? err.reason_code : 'extract-failed'
    console.log(JSON.stringify({ ok: false, reason_code: code, message: err.message }))
    process.exit(1)
  }
}

if (require.main === module) main()

module.exports = {
  extract, readZip, findMainPart, scanXml, prefixMap, canon, decodeEntities,
  parseStyles, parseNumbering, parseRels, resolveHeadingLevel, mdSafe, ExtractError,
}
