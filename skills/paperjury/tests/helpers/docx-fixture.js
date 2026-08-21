// docx-fixture.js -- in-test zip/docx builder for extract-docx tests.
// The READER under test never checks CRCs, but a zip WRITER must emit real ones
// and zlib.crc32 only exists on Node >= 22.2 (engines is >=18, CI pins 20), so
// this helper carries its own table-based crc32.

'use strict'
const zlib = require('zlib')

// ---- crc32 (IEEE 802.3 polynomial, table-based) ----------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ---- zip writer -------------------------------------------------------------
// entries: [{ name, data (string|Buffer), method (0|8, default 8), gpBit3,
//             gpBit0, localExtra (Buffer), centralExtra (Buffer) }]
// opts: { eocdTotalOverride, cdSizeOverride, cdOffsetOverride } -- for zip64
// sentinel fixtures. gpBit3 zeroes the LOCAL sizes/crc and appends a trailing
// data descriptor (real sizes only in the CD) -- proves central-directory-driven
// reads. localExtra vs centralExtra of different lengths proves the reader takes
// the data offset from the LOCAL header lengths, not the CD's.

function writeZip(entries, opts = {}) {
  const chunks = []
  const central = []
  let offset = 0

  for (const e of entries) {
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(String(e.data), 'utf8')
    const method = e.method == null ? 8 : e.method
    const compressed = method === 8 ? zlib.deflateRawSync(data) : data
    const crc = crc32(data)
    const name = Buffer.from(e.name, 'utf8')
    const localExtra = e.localExtra || Buffer.alloc(0)
    const centralExtra = e.centralExtra || Buffer.alloc(0)
    let gp = 0
    if (e.gpBit3) gp |= 0x8
    if (e.gpBit0) gp |= 0x1

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)                 // version needed
    local.writeUInt16LE(gp, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt16LE(0, 10)                 // mtime
    local.writeUInt16LE(0x21, 12)              // mdate (some fixed valid date)
    local.writeUInt32LE(e.gpBit3 ? 0 : crc, 14)
    local.writeUInt32LE(e.gpBit3 ? 0 : compressed.length, 18)
    local.writeUInt32LE(e.gpBit3 ? 0 : data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(localExtra.length, 28)

    chunks.push(local, name, localExtra, compressed)
    let entryLen = 30 + name.length + localExtra.length + compressed.length
    if (e.gpBit3) {
      const dd = Buffer.alloc(16)
      dd.writeUInt32LE(0x08074b50, 0)
      dd.writeUInt32LE(crc, 4)
      dd.writeUInt32LE(compressed.length, 8)
      dd.writeUInt32LE(data.length, 12)
      chunks.push(dd)
      entryLen += 16
    }

    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(20, 4)                    // version made by
    cd.writeUInt16LE(20, 6)                    // version needed
    cd.writeUInt16LE(gp, 8)
    cd.writeUInt16LE(method, 10)
    cd.writeUInt16LE(0, 12)
    cd.writeUInt16LE(0x21, 14)
    cd.writeUInt32LE(crc, 16)
    cd.writeUInt32LE(compressed.length, 20)
    cd.writeUInt32LE(data.length, 24)
    cd.writeUInt16LE(name.length, 28)
    cd.writeUInt16LE(centralExtra.length, 30)
    cd.writeUInt16LE(0, 32)                    // comment len
    cd.writeUInt16LE(0, 34)                    // disk start
    cd.writeUInt16LE(0, 36)                    // internal attrs
    cd.writeUInt32LE(0, 38)                    // external attrs
    cd.writeUInt32LE(offset, 42)
    central.push(cd, name, centralExtra)

    offset += entryLen
  }

  const cdStart = offset
  const cdBuf = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(opts.eocdTotalOverride != null ? opts.eocdTotalOverride : entries.length, 8)
  eocd.writeUInt16LE(opts.eocdTotalOverride != null ? opts.eocdTotalOverride : entries.length, 10)
  eocd.writeUInt32LE(opts.cdSizeOverride != null ? opts.cdSizeOverride : cdBuf.length, 12)
  eocd.writeUInt32LE(opts.cdOffsetOverride != null ? opts.cdOffsetOverride : cdStart, 16)
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([...chunks, cdBuf, eocd])
}

// ---- docx assembly ----------------------------------------------------------

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const M_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
const MC_NS = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function p(text, opts = {}) {
  const pPr = []
  if (opts.styleId) pPr.push(`<w:pStyle w:val="${opts.styleId}"/>`)
  if (opts.outlineLvl != null) pPr.push(`<w:outlineLvl w:val="${opts.outlineLvl}"/>`)
  if (opts.numId != null) pPr.push(`<w:numPr><w:ilvl w:val="${opts.ilvl || 0}"/><w:numId w:val="${opts.numId}"/></w:numPr>`)
  if (opts.markDeleted) pPr.push('<w:rPr><w:del w:id="9" w:author="x"/></w:rPr>')
  const pr = pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''
  const runs = opts.rawRuns || (text == null ? '' : run(text))
  return `<w:p>${pr}${runs}</w:p>`
}

function run(text, opts = {}) {
  return `<w:r><w:t${opts.preserve ? ' xml:space="preserve"' : ''}>${text}</w:t></w:r>`
}

// Standard parts. featureDoc = the document.xml BODY content (inside w:body).
function buildDocx(features = {}) {
  const body = []

  if (features.zhHeadings) {
    // zh-CN Word writes bare numeric styleIds; resolution must go through
    // styles.xml (tier b outlineLvl, tier c name, basedOn walk)
    body.push(p('引言', { styleId: '1' }))
    body.push(p('正文第一段。', {}))
    body.push(p('相关工作', { styleId: '2' }))
    body.push(p('正文第二段。', {}))
    if (features.basedOnStyle) body.push(p('自定义小节', { styleId: 'MyCustom' }))
    if (features.directOutline) body.push(p('直接大纲级标题', { outlineLvl: 2 }))
  }
  if (features.plainBody) {
    body.push(p('Heading One', { styleId: 'H1' }))
    body.push(p('Plain paragraph one.'))
    body.push(p('Plain paragraph two.'))
  }
  if (features.splitRuns) {
    body.push(`<w:p><w:r><w:t>model</w:t></w:r><w:r><w:t xml:space="preserve"> is trained</w:t></w:r></w:p>`)
  }
  if (features.zoteroField) {
    body.push(`<w:p><w:r><w:t xml:space="preserve">As shown </w:t></w:r>` +
      `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
      `<w:r><w:instrText xml:space="preserve"> ADDIN ZOTERO_ITEM CSL_CITATION {"cite":"json-payload"} </w:instrText></w:r>` +
      `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
      `<w:r><w:t>(Smith et al., 2020)</w:t></w:r>` +
      `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
      `<w:r><w:t xml:space="preserve"> the result holds.</w:t></w:r></w:p>`)
  }
  if (features.dirtyField) {
    body.push(`<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
      `<w:r><w:instrText> CITATION xyz </w:instrText></w:r>` +
      `<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`)
  }
  if (features.nestedField) {
    body.push(`<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
      `<w:r><w:instrText> IF 1 = 1 </w:instrText></w:r>` +
      `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
      `<w:r><w:instrText> PAGE </w:instrText></w:r>` +
      `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
      `<w:r><w:t>7</w:t></w:r>` +
      `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
      `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
      `<w:r><w:t>outer result</w:t></w:r>` +
      `<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`)
  }
  if (features.fldSimple) {
    body.push(`<w:p><w:fldSimple w:instr=" REF intro "><w:r><w:t>cached display</w:t></w:r></w:fldSimple></w:p>`)
  }
  if (features.tocField) {
    body.push(`<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
      `<w:r><w:instrText> TOC \\o "1-3" </w:instrText></w:r>` +
      `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
      `<w:r><w:t>Introduction ... 1</w:t></w:r>` +
      `<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`)
  }
  if (features.sdtAbstract) {
    body.push(`<w:sdt><w:sdtPr><w:alias w:val="Abstract"/></w:sdtPr><w:sdtContent>` +
      p('Abstract', { styleId: 'H1' }) + p('This paper proposes a thing.') +
      `</w:sdtContent></w:sdt>`)
  }
  if (features.omml) {
    body.push(`<w:p><w:r><w:t xml:space="preserve">Loss is </w:t></w:r>` +
      `<m:oMath><m:sSub><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sub><m:r><m:t>i</m:t></m:r></m:sub></m:sSub>` +
      `<m:r><m:t>+1</m:t></m:r></m:oMath>` +
      `<w:r><w:t xml:space="preserve"> here.</w:t></w:r></w:p>`)
  }
  if (features.oleObject) {
    body.push(`<w:p><w:r><w:object><v:shape xmlns:v="urn:schemas-microsoft-com:vml"/></w:object></w:r></w:p>`)
  }
  if (features.mcTextbox) {
    const tbx = (tag) => `<mc:${tag}${tag === 'Choice' ? ' Requires="wps"' : ''}><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
      `<w:txbxContent>${p('caption text in box')}</w:txbxContent></wp:inline></w:drawing></mc:${tag}>`
    body.push(`<w:p><w:r><mc:AlternateContent>${tbx('Choice')}${tbx('Fallback')}</mc:AlternateContent></w:r></w:p>`)
  }
  if (features.image) {
    body.push(`<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/></wp:inline></w:drawing></w:r></w:p>`)
  }
  if (features.revisions) {
    body.push(`<w:p><w:r><w:t xml:space="preserve">kept </w:t></w:r>` +
      `<w:ins w:id="1" w:author="a"><w:r><w:t xml:space="preserve">inserted </w:t></w:r></w:ins>` +
      `<w:del w:id="2" w:author="a"><w:r><w:delText xml:space="preserve">deleted </w:delText></w:r></w:del>` +
      `<w:r><w:t>tail.</w:t></w:r></w:p>`)
  }
  if (features.paraMarkDel) {
    body.push(p('first half,', { markDeleted: true }))
    body.push(p('second half.'))
  }
  if (features.table) {
    const cell = (t) => `<w:tc><w:tcPr/>${p(t)}</w:tc>`
    body.push(`<w:tbl><w:tr>${cell('H1')}${cell('H2')}</w:tr><w:tr>${cell('a|b')}${cell('c')}</w:tr></w:tbl>`)
  }
  if (features.mergedTable) {
    body.push(`<w:tbl><w:tr><w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr>${p('Wide')}</w:tc></w:tr>` +
      `<w:tr><w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr>${p('Tall')}</w:tc><w:tc><w:tcPr/>${p('B')}</w:tc></w:tr>` +
      `<w:tr><w:tc><w:tcPr><w:vMerge/></w:tcPr>${p('')}</w:tc><w:tc><w:tcPr/>${p('C')}</w:tc></w:tr></w:tbl>`)
  }
  if (features.lists) {
    body.push(p('first bullet', { numId: 1, ilvl: 0 }))
    body.push(p('nested bullet', { numId: 1, ilvl: 1 }))
    body.push(p('step one', { numId: 2, ilvl: 0 }))
  }
  if (features.hyperlink) {
    body.push(`<w:p><w:hyperlink r:id="rId9"><w:r><w:t>project page</w:t></w:r></w:hyperlink></w:p>`)
  }
  if (features.badHyperlink) {
    body.push(`<w:p><w:hyperlink r:id="rIdMissing"><w:r><w:t>bare text</w:t></w:r></w:hyperlink></w:p>`)
  }
  if (features.footnote) {
    body.push(`<w:p><w:r><w:t xml:space="preserve">A claim</w:t></w:r>` +
      `<w:r><w:footnoteReference w:id="2"/></w:r><w:r><w:t>.</w:t></w:r></w:p>`)
  }
  if (features.comments) {
    body.push(`<w:p><w:commentRangeStart w:id="0"/><w:r><w:t>commented text</w:t></w:r>` +
      `<w:commentRangeEnd w:id="0"/><w:r><w:commentReference w:id="0"/></w:r></w:p>`)
  }
  if (features.brTab) {
    body.push(`<w:p><w:r><w:t>line one</w:t><w:br/><w:t>line two</w:t><w:tab/><w:t>after tab</w:t></w:r></w:p>`)
  }
  if (features.leadingHash) {
    body.push(p('# not a heading, just prose'))
  }
  if (features.entities) {
    body.push(p('a &amp; b &lt; c &#8212; d &#x2014; e'))
  }
  if (features.unknownWrapper) {
    // an element class the walker does not know; its text must surface in the
    // char-mass backstop, never silently vanish
    body.push(`<w:p><w:customXmlMystery><w:r><w:t>mystery prose</w:t></w:r></w:customXmlMystery></w:p>`)
  }
  if (features.extraParagraphs) {
    for (let i = 0; i < features.extraParagraphs; i++) body.push(p(`Filler paragraph number ${i + 1} with enough words.`))
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${W_NS}" xmlns:m="${M_NS}" xmlns:mc="${MC_NS}" xmlns:r="${R_NS}">` +
    `<w:body>${body.join('')}</w:body></w:document>`

  const styles = []
  styles.push(`<w:style w:type="paragraph" w:styleId="H1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style>`)
  // zh-CN pattern: numeric styleIds; '1' carries outlineLvl (tier b); '2' has
  // ONLY the name (tier c -- Word omits outlineLvl on built-in heading styles)
  styles.push(`<w:style w:type="paragraph" w:styleId="1"><w:name w:val="heading 1"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style>`)
  styles.push(`<w:style w:type="paragraph" w:styleId="2"><w:name w:val="heading 2"/></w:style>`)
  if (features.basedOnStyle) {
    styles.push(`<w:style w:type="paragraph" w:styleId="MyCustom"><w:name w:val="My Custom"/><w:basedOn w:val="2"/></w:style>`)
  }
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="${W_NS}">${styles.join('')}</w:styles>`

  const footnotesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:footnotes xmlns:w="${W_NS}">` +
    `<w:footnote w:type="separator" w:id="-1">${p('')}</w:footnote>` +
    `<w:footnote w:type="continuationSeparator" w:id="0">${p('')}</w:footnote>` +
    `<w:footnote w:id="2">${p('the footnote body text')}</w:footnote>` +
    `</w:footnotes>`

  const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering xmlns:w="${W_NS}">` +
    `<w:abstractNum w:abstractNumId="10"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="20"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>` +
    `<w:num w:numId="1"><w:abstractNumId w:val="10"/></w:num>` +
    `<w:num w:numId="2"><w:abstractNumId w:val="20"/></w:num>` +
    `</w:numbering>`

  const commentsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:comments xmlns:w="${W_NS}"><w:comment w:id="0" w:author="rev">${p('reviewer note')}</w:comment></w:comments>`

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId9" Type="${R_NS}/hyperlink" Target="https://example.org/page" TargetMode="External"/>` +
    `</Relationships>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `</Types>`

  const entries = [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: documentXml, method: features.storedDocument ? 0 : 8, gpBit3: !!features.gpBit3, localExtra: features.extraMismatch ? Buffer.alloc(8) : undefined, centralExtra: features.extraMismatch ? Buffer.alloc(2) : undefined },
    { name: 'word/styles.xml', data: stylesXml },
    { name: 'word/_rels/document.xml.rels', data: docRels },
  ]
  if (features.footnote) entries.push({ name: 'word/footnotes.xml', data: footnotesXml })
  if (features.lists) entries.push({ name: 'word/numbering.xml', data: numberingXml })
  if (features.comments) entries.push({ name: 'word/comments.xml', data: commentsXml })

  return writeZip(entries, features.zipOpts || {})
}

module.exports = { crc32, writeZip, buildDocx, W_NS, M_NS, MC_NS, R_NS }
