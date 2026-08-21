#!/usr/bin/env node
// decompose.js -- a pragmatic, format-aware sectioner for the paperjury (LaTeX +
// Markdown). Produces (a) section-level UNITS for the reading-check fan-out (one
// agent reads one coherent unit) and (b) paragraph-level PASSAGES each with a
// cross-round passage_id, which the auto per-passage rounds-touched counter
// (AUTO_MODE_DESIGN §8) and the clerk's re-raise merge (review-engine-v3.md
// SEAM 14) key on. Dependency-free Node.
//
// passage_id = `<section-path>#p<ordinal>#<anchor-hash>` where anchor-hash is a
// sha1/8 of the nearest \label{...} in the paragraph (LaTeX only; Markdown has no
// labels), else of its first stable words. Section path is computed from
// sectioning-command / heading-level COUNTERS -- never title text -- so it need
// not match the printed numbering, only be CONSISTENT across rounds; retitling a
// heading moves no passage_id. Anchor stability is bounded, not absolute: a
// first-words anchor MUTATES when an edit rewrites the paragraph's opening words
// (either format); rekey.js re-links such rows at round end, and the residual
// failure is recall-safe (a duplicate genuinely_new row, bounded by max_rounds).
//
// LaTeX mode is a heuristic splitter, not a TeX parser: it strips line comments,
// finds sectioning commands + the abstract env, and splits regions on blank
// lines; it does not expand macros or resolve \input (the orchestrator passes one
// flattened file). Markdown mode does NO comment stripping (a bare % is prose:
// "12% over baseline" stays intact), takes regions from ATX headings OUTSIDE
// ``` fences with the heading line excluded from passage text (parity with the
// LaTeX braceArg exclusion), and sets in_abstract by region title /^abstract$/i;
// CRLF is normalized to LF (parity: the LaTeX comment stripper rejoins on '\n').
//
// decompose(text[, {format}]): when called WITHOUT an explicit format (spine.js
// and the other in-repo callers), the format is sniffed from content -- a
// \documentclass or \begin{document} or >= 2 sectioning commands means latex,
// else markdown -- so existing callers keep working unchanged. The CLI never
// sniffs: extname routes .tex to latex and .md/.markdown/.txt/unknown to
// markdown; --format overrides the routing.
//
// CLI:
//   node decompose.js passages <file> [--format latex|markdown]
//   node decompose.js units    <file> [--format latex|markdown]
//   node decompose.js stats    <file> [--format latex|markdown]

'use strict'
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function stripComments(tex) {
  return tex.split(/\r?\n/).map((line) => {
    let out = ''
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '%' && (i === 0 || line[i - 1] !== '\\')) break
      out += line[i]
    }
    return out
  }).join('\n')
}

// From an index pointing AT a '{', return {content, end} with end just past the '}'.
function braceArg(str, at) {
  if (str[at] !== '{') return { content: '', end: at }
  let depth = 0
  for (let i = at; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') { depth--; if (depth === 0) return { content: str.slice(at + 1, i), end: i + 1 } }
  }
  return { content: str.slice(at + 1), end: str.length }
}

function hash8(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 8) }

function firstStableWords(text, n = 8) {
  const words = text.replace(/\\[a-zA-Z]+[a-zA-Z0-9_]*\*?/g, ' ').replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/).filter(Boolean).slice(0, n)
  return words.join(' ').toLowerCase()
}

const LEVELS = { part: 0, section: 1, subsection: 2, subsubsection: 3, paragraph: 4 }

const SECTION_CMD_RE = /\\(part|section|subsection|subsubsection|paragraph)\*?\s*(?:\[[^\]]*\])?\s*\{/g

// Content sniff for decompose() calls that pass no format. Deliberately latex-
// biased: every pre-existing caller fed it LaTeX, and a false-markdown read would
// silently change their passage ids.
function sniffFormat(text) {
  if (/\\documentclass/.test(text) || /\\begin\{document\}/.test(text)) return 'latex'
  const cmds = text.match(SECTION_CMD_RE)
  return cmds && cmds.length >= 2 ? 'latex' : 'markdown'
}

// Walk the body, return regions [{section_path, title, level, start, end}].
function regions(body) {
  const re = new RegExp(SECTION_CMD_RE.source, 'g')
  const marks = []
  let m
  while ((m = re.exec(body))) {
    const braceOpen = re.lastIndex - 1
    const { content, end } = braceArg(body, braceOpen)
    marks.push({ index: m.index, contentEnd: end, level: LEVELS[m[1]], title: content.trim() })
    re.lastIndex = end
  }
  const out = []
  // frontmatter before the first section command
  const firstStart = marks.length ? marks[0].index : body.length
  out.push({ section_path: 'frontmatter', title: 'Front matter', level: 0, start: 0, end: firstStart })
  const counters = [0, 0, 0, 0, 0]
  for (let i = 0; i < marks.length; i++) {
    const mk = marks[i]
    counters[mk.level]++
    for (let l = mk.level + 1; l < counters.length; l++) counters[l] = 0
    const path = counters.slice(1, mk.level + 1).join('.') || String(counters[0])
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length
    out.push({ section_path: path, title: mk.title, level: mk.level, start: mk.contentEnd, end })
  }
  return out
}

// Markdown regions from ATX headings. A line matching /^(#{1,6})\s+(.+)$/ OUTSIDE
// ``` fences is a mark; level = min(hashes, 5); section paths come from the same
// per-level counter scheme as the LaTeX walker. The region starts just past the
// heading line, so the heading text never enters any passage.
function markdownRegions(body) {
  const lines = body.split('\n')
  const marks = []
  let inFence = false
  let at = 0
  for (const line of lines) {
    const lineStart = at
    at += line.length + 1
    if (/^```/.test(line)) { inFence = !inFence; continue }
    if (inFence) continue
    const m = /^(#{1,6})\s+(.+)$/.exec(line)
    if (!m) continue
    marks.push({
      index: lineStart,
      contentEnd: Math.min(at, body.length),
      level: Math.min(m[1].length, 5),
      title: m[2].trim(),
    })
  }
  const out = []
  // frontmatter before the first heading; a structureless file is all frontmatter
  const firstStart = marks.length ? marks[0].index : body.length
  out.push({ section_path: 'frontmatter', title: 'Front matter', level: 0, start: 0, end: firstStart })
  const counters = [0, 0, 0, 0, 0, 0]
  for (let i = 0; i < marks.length; i++) {
    const mk = marks[i]
    counters[mk.level]++
    for (let l = mk.level + 1; l < counters.length; l++) counters[l] = 0
    const path = counters.slice(1, mk.level + 1).join('.')
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length
    out.push({ section_path: path, title: mk.title, level: mk.level, start: mk.contentEnd, end })
  }
  return out
}

function abstractSpan(body) {
  const m = /\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/.exec(body)
  if (!m) return null
  return { start: m.index, end: m.index + m[0].length }
}

function splitParagraphs(text) {
  return text.split(/\n[ \t]*\n/).map((p) => p.trim()).filter((p) => p.length > 0)
}

function decomposeMarkdown(text) {
  const body = text.replace(/\r\n/g, '\n')
  const regs = markdownRegions(body)
  const passages = []
  for (const reg of regs) {
    const regText = body.slice(reg.start, reg.end)
    const paras = splitParagraphs(regText)
    let ord = 0
    let cursor = reg.start
    for (const para of paras) {
      ord++
      const pStart = body.indexOf(para, cursor)
      passages.push({
        passage_id: `${reg.section_path}#p${ord}#${hash8(firstStableWords(para))}`,
        section_path: reg.section_path,
        section_title: reg.title,
        ordinal: ord,
        label: null,
        in_abstract: /^abstract$/i.test(reg.title || ''),
        char_start: pStart >= 0 ? pStart : null,
        text: para,
      })
      // always advance the cursor, even if this paragraph was not located verbatim,
      // so a single failed lookup cannot make later paragraphs re-match earlier text.
      cursor = pStart >= 0 ? pStart + para.length : cursor + para.length
    }
  }
  return passages
}

function decompose(tex, opts = {}) {
  const format = opts.format || sniffFormat(tex)
  if (format === 'markdown') return decomposeMarkdown(tex)
  const clean = stripComments(tex)
  const docStart = clean.indexOf('\\begin{document}')
  const bodyOffset = docStart >= 0 ? docStart + '\\begin{document}'.length : 0
  const body = clean.slice(bodyOffset)
  const abs = abstractSpan(body)
  const regs = regions(body)

  const passages = []
  for (const reg of regs) {
    const regText = body.slice(reg.start, reg.end)
    const paras = splitParagraphs(regText)
    let ord = 0
    let cursor = reg.start
    for (const para of paras) {
      ord++
      const labelM = /\\label\{([^}]*)\}/.exec(para)
      const anchorSrc = labelM ? labelM[1] : firstStableWords(para)
      const pStart = body.indexOf(para, cursor)
      const center = pStart >= 0 ? pStart + Math.floor(para.length / 2) : -1
      const in_abstract = abs && center >= abs.start && center < abs.end
      passages.push({
        passage_id: `${reg.section_path}#p${ord}#${hash8(anchorSrc)}`,
        section_path: reg.section_path,
        section_title: reg.title,
        ordinal: ord,
        label: labelM ? labelM[1] : null,
        in_abstract: !!in_abstract,
        char_start: pStart >= 0 ? bodyOffset + pStart : null,
        text: para,
      })
      // always advance the cursor, even if this paragraph was not located verbatim,
      // so a single failed lookup cannot make later paragraphs re-match earlier text.
      cursor = pStart >= 0 ? pStart + para.length : cursor + para.length
    }
  }
  return passages
}

// Group passages into section-level reading units (concatenated text).
function units(passages) {
  const bySection = new Map()
  for (const p of passages) {
    if (!bySection.has(p.section_path)) {
      bySection.set(p.section_path, { section_path: p.section_path, section_title: p.section_title, passage_ids: [], text: '' })
    }
    const u = bySection.get(p.section_path)
    u.passage_ids.push(p.passage_id)
    u.text += (u.text ? '\n\n' : '') + p.text
  }
  return [...bySection.values()]
}

// ---- CLI ------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const pos = []
  let format = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format') { format = args[i + 1]; i++ }
    else pos.push(args[i])
  }
  const [cmd, file] = pos
  if (!cmd || !file) {
    console.error('usage: node decompose.js <passages|units|stats> <file> [--format latex|markdown]')
    process.exit(2)
  }
  if (format && format !== 'latex' && format !== 'markdown') {
    console.error('bad --format: ' + format + ' (use latex|markdown)')
    process.exit(2)
  }
  if (!format) format = path.extname(file).toLowerCase() === '.tex' ? 'latex' : 'markdown'
  const tex = fs.readFileSync(file, 'utf8')
  const ps = decompose(tex, { format })
  if (cmd === 'passages') {
    console.log(JSON.stringify(ps, null, 2))
  } else if (cmd === 'units') {
    console.log(JSON.stringify(units(ps), null, 2))
  } else if (cmd === 'stats') {
    const secs = new Set(ps.map((p) => p.section_path))
    console.log(JSON.stringify({ passages: ps.length, sections: secs.size, abstract_passages: ps.filter((p) => p.in_abstract).length }))
  } else {
    console.error('unknown command: ' + cmd)
    process.exit(2)
  }
}

if (require.main === module) main()

module.exports = { stripComments, braceArg, regions, markdownRegions, sniffFormat, decompose, units, hash8, firstStableWords }
