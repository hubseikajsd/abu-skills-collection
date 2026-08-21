const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const fixture = require('./helpers/docx-fixture')
const ex = require('../scripts/extract-docx')

const SCRIPT = path.join(__dirname, '..', 'scripts', 'extract-docx.js')

function tmpdir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-docx-')) }

function writeDocx(dir, name, buf) {
  const p = path.join(dir, name)
  fs.writeFileSync(p, buf)
  return p
}

function runCli(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
  let json = null
  try { json = JSON.parse(r.stdout) } catch (e) { /* leave null */ }
  return { status: r.status, json, stdout: r.stdout, stderr: r.stderr }
}

function extractBuf(buf) {
  const dir = tmpdir()
  try {
    const docx = writeDocx(dir, 'paper.docx', buf)
    return ex.extract(docx)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// a docx from raw body XML (for walker edge cases the feature flags do not cover)
function rawDocx(bodyXml, opts = {}) {
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${fixture.W_NS}" xmlns:m="${fixture.M_NS}" xmlns:mc="${fixture.MC_NS}" xmlns:r="${fixture.R_NS}">` +
    `<w:body>${bodyXml}</w:body></w:document>`
  const rootRels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  const footnotesXml = `<?xml version="1.0"?><w:footnotes xmlns:w="${fixture.W_NS}">` +
    `<w:footnote w:type="separator" w:id="-1"><w:p/></w:footnote>` +
    `<w:footnote w:id="2"><w:p><w:r><w:t>the footnote body text</w:t></w:r></w:p></w:footnote></w:footnotes>`
  const entries = [
    { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: doc },
  ]
  if (opts.footnotes) entries.push({ name: 'word/footnotes.xml', data: footnotesXml })
  if (opts.docRels) entries.push({ name: 'word/_rels/document.xml.rels', data: opts.docRels })
  return fixture.writeZip(entries)
}

test('zh-CN headings resolve through styles.xml tiers, never styleId patterns', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ zhHeadings: true, basedOnStyle: true, directOutline: true }))
  assert.ok(md.includes('# 引言'))
  assert.ok(md.includes('## 相关工作'))          // tier c: name-only style '2'
  assert.ok(md.includes('## 自定义小节'))        // basedOn walk to style '2'
  assert.ok(md.includes('### 直接大纲级标题'))   // tier a: direct outlineLvl 2
  assert.equal(report.headings.count, 4)
  assert.equal(report.headings.tier_histogram.direct, 1)
  assert.equal(report.headings.tier_histogram.styles, 1)
  assert.equal(report.headings.tier_histogram.name, 2)
})

test('a no-headings docx warns loudly', () => {
  const { report } = extractBuf(fixture.buildDocx({ splitRuns: true }))
  assert.equal(report.headings.count, 0)
  assert.ok(report.warnings.some((w) => /no headings/.test(w)))
})

test('Zotero complex field keeps only the cached display text', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ zoteroField: true }))
  assert.ok(md.includes('As shown (Smith et al., 2020) the result holds.'))
  assert.ok(!md.includes('CSL_CITATION'))
  assert.ok(!md.includes('json-payload'))
  assert.equal(report.counters.fields_resolved, 1)
  assert.equal(report.char_audit.unaccounted_chars, 0)
})

test('dirty field (no cached result) emits nothing and is counted', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ dirtyField: true, plainBody: true }))
  assert.ok(!md.includes('CITATION'))
  assert.equal(report.counters.fields_unresolved, 1)
})

test('nested field emits the outer cached result exactly once', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ nestedField: true }))
  assert.ok(md.includes('outer result'))
  assert.ok(!md.includes(' IF '))
  assert.equal((md.match(/outer result/g) || []).length, 1)
  assert.ok(report.counters.fields_resolved >= 1)
})

test('fldSimple keeps cached display; TOC field content is dropped', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ fldSimple: true, tocField: true }))
  assert.ok(md.includes('cached display'))
  assert.ok(!md.includes('Introduction ... 1'))
  assert.equal(report.counters.toc_dropped, 1)
  assert.equal(report.char_audit.unaccounted_chars, 0)
})

test('sdt-wrapped content does not vanish', () => {
  const { md } = extractBuf(fixture.buildDocx({ sdtAbstract: true }))
  assert.ok(md.includes('# Abstract'))
  assert.ok(md.includes('This paper proposes a thing.'))
})

test('mc:AlternateContent emits exactly one branch, as a [textbox] paragraph', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ mcTextbox: true }))
  assert.equal((md.match(/caption text in box/g) || []).length, 1)
  assert.ok(md.includes('[textbox] caption text in box'))
  assert.equal(report.counters.textboxes, 1)
  assert.equal(report.char_audit.unaccounted_chars, 0)
})

test('OMML flattens inside an [equation: ...] marker; OLE object gets a placeholder', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ omml: true, oleObject: true }))
  assert.ok(md.includes('Loss is [equation: xi+1] here.'))
  assert.ok(md.includes('[equation: OLE object]'))
  assert.equal(report.counters.equations_flattened, 1)
  assert.equal(report.counters.ole_equations_placeholder, 1)
})

test('tracked changes: accept-all, with counts; deleted text can never leak', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ revisions: true }))
  assert.ok(md.includes('kept inserted tail.'))
  assert.ok(!md.includes('deleted'))
  assert.equal(report.counters.ins_accepted, 1)
  assert.equal(report.counters.del_dropped, 1)
  assert.equal(report.tracked_changes_present, true)
  assert.equal(report.char_audit.unaccounted_chars, 0)
})

test('adjacent runs are never trimmed (split-run word fusion)', () => {
  const { md } = extractBuf(fixture.buildDocx({ splitRuns: true }))
  assert.ok(md.includes('model is trained'))
  assert.ok(!md.includes('modelis'))
})

test('tables render as pipe tables; merged cells degrade with a note, no double-emit', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ table: true, mergedTable: true }))
  assert.ok(md.includes('| H1 | H2 |'))
  assert.ok(md.includes('| a\\|b | c |'))           // pipe escaping
  assert.ok(md.includes('| Wide |'))
  assert.equal(report.counters.tables, 2)
  assert.equal(report.counters.merged_cell_tables, 1)
  assert.ok(report.notes.some((n) => /merged cells/.test(n)))
  // cell paragraphs are consumed by the table, never re-emitted as body prose
  assert.equal((md.match(/Wide/g) || []).length, 1)
})

test('footnotes inline as [^fnN] with definitions appended; separators skipped', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ footnote: true }))
  assert.ok(md.includes('A claim[^fn2].'))
  assert.ok(md.includes('[^fn2]: the footnote body text'))
  assert.equal(report.counters.footnotes_inlined, 1)
})

test('hyperlinks resolve through rels; unresolvable ids keep bare text', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ hyperlink: true, badHyperlink: true }))
  assert.ok(md.includes('[project page](https://example.org/page)'))
  assert.ok(md.includes('bare text'))
  assert.ok(!md.includes('[bare text]('))
  assert.equal(report.counters.hyperlinks_resolved, 1)
  assert.equal(report.counters.hyperlinks_unresolved, 1)
})

test('lists: bullet and decimal with ilvl indentation', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ lists: true }))
  assert.ok(md.includes('- first bullet'))
  assert.ok(md.includes('  - nested bullet'))
  assert.ok(md.includes('1. step one'))
  assert.equal(report.counters.list_items, 3)
  assert.equal(report.counters.list_numbering_degraded, 0)
})

test('comments are dropped from the body and counted from comments.xml', () => {
  const { md, report } = extractBuf(fixture.buildDocx({ comments: true }))
  assert.ok(md.includes('commented text'))
  assert.ok(!md.includes('reviewer note'))
  assert.equal(report.counters.comments_dropped, 1)
})

test('w:br becomes a single newline, w:tab a space; entities decode', () => {
  const { md } = extractBuf(fixture.buildDocx({ brTab: true, entities: true }))
  assert.ok(md.includes('line one\nline two after tab'))
  assert.ok(md.includes('a & b < c — d — e'))
})

test('line-leading # in body prose is escaped (no phantom ATX headings)', () => {
  const { md } = extractBuf(fixture.buildDocx({ leadingHash: true }))
  assert.ok(md.includes('\\# not a heading, just prose'))
})

test('zip robustness: GP-bit-3 data descriptors, stored entries, extra-field mismatch', () => {
  for (const features of [{ gpBit3: true }, { storedDocument: true }, { extraMismatch: true }]) {
    const { md } = extractBuf(fixture.buildDocx({ ...features, plainBody: true }))
    assert.ok(md.includes('Plain paragraph one.'), JSON.stringify(features))
  }
})

test('fail-loud matrix: exact reason codes, exit 1', () => {
  const dir = tmpdir()
  try {
    const cases = []
    cases.push(['doc-ole2', writeDocx(dir, 'legacy.docx', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]))])
    cases.push(['not-a-zip', writeDocx(dir, 'junk.docx', Buffer.from('this is not a zip file at all'))])
    cases.push(['zip64-unsupported', writeDocx(dir, 'z64.docx', fixture.buildDocx({ plainBody: true, zipOpts: { eocdTotalOverride: 0xffff } }))])
    cases.push(['compression-method-unsupported', writeDocx(dir, 'm9.docx', fixture.writeZip([
      { name: 'word/document.xml', data: '<w:document xmlns:w="' + fixture.W_NS + '"><w:body></w:body></w:document>', method: 9 },
    ]))])
    cases.push(['encrypted-zip', writeDocx(dir, 'enc.docx', fixture.writeZip([
      { name: 'word/document.xml', data: '<w:document xmlns:w="' + fixture.W_NS + '"><w:body></w:body></w:document>', gpBit0: true },
    ]))])
    cases.push(['utf16-document-xml', writeDocx(dir, 'u16.docx', fixture.writeZip([
      { name: 'word/document.xml', data: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('<w:document/>', 'utf16le')]) },
    ]))])
    cases.push(['main-part-missing', writeDocx(dir, 'nomain.docx', fixture.writeZip([
      { name: '[Content_Types].xml', data: '<Types/>' },
    ]))])
    for (const [code, file] of cases) {
      const r = runCli(['extract', file, '--out', path.join(dir, 'out-' + code + '.md')])
      assert.equal(r.status, 1, code + ': ' + r.stdout + r.stderr)
      assert.equal(r.json && r.json.ok, false, code)
      assert.equal(r.json && r.json.reason_code, code)
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('char-mass backstop: clean on a full-feature doc, loud on an unknown wrapper', () => {
  const full = extractBuf(fixture.buildDocx({
    zhHeadings: true, basedOnStyle: true, zoteroField: true, sdtAbstract: true,
    omml: true, mcTextbox: true, revisions: true, mergedTable: true,
    footnote: true, lists: true, hyperlink: true, splitRuns: true,
  }))
  assert.equal(full.report.char_audit.unaccounted_chars, 0)
  assert.ok(!full.report.warnings.some((w) => /backstop/.test(w)))

  const leaky = extractBuf(fixture.buildDocx({ plainBody: true, unknownWrapper: true }))
  assert.ok(leaky.report.char_audit.unaccounted_chars > 0)
  assert.ok(leaky.report.warnings.some((w) => /backstop/.test(w)))
  assert.ok(!leaky.md.includes('mystery prose'))
})

test('the working md never contains report content', () => {
  const { md } = extractBuf(fixture.buildDocx({ plainBody: true, revisions: true }))
  assert.ok(!md.includes('char_audit'))
  assert.ok(!md.includes('unaccounted'))
  assert.ok(!md.includes('extracted_at'))
  assert.ok(!/\{\s*"/.test(md))
})

test('determinism: extracting the same docx twice is byte-identical', () => {
  const buf = fixture.buildDocx({ zhHeadings: true, omml: true, footnote: true, lists: true })
  const a = extractBuf(buf)
  const b = extractBuf(buf)
  assert.equal(a.md, b.md)
  assert.equal(a.report.working_sha256, b.report.working_sha256)
})

test('CLI: refuses an existing working copy without --force; --force overwrites', () => {
  const dir = tmpdir()
  try {
    const docx = writeDocx(dir, 'paper.docx', fixture.buildDocx({ plainBody: true }))
    const first = runCli(['extract', docx])
    assert.equal(first.status, 0, first.stdout + first.stderr)
    assert.equal(first.json.ok, true)
    const out = first.json.out
    assert.ok(fs.existsSync(out))
    const before = fs.readFileSync(out, 'utf8')

    const refused = runCli(['extract', docx])
    assert.equal(refused.status, 1)
    assert.equal(refused.json.reason_code, 'working-copy-exists')
    assert.equal(fs.readFileSync(out, 'utf8'), before)   // untouched

    const forced = runCli(['extract', docx, '--force'])
    assert.equal(forced.status, 0)
    assert.equal(forced.json.ok, true)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('suppressed subtrees leak nothing: no markers, links, or note definitions from w:del', () => {
  const img = '<w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"/></w:drawing>'
  const body = '<w:p><w:r><w:t>kept</w:t></w:r>' +
    '<w:del w:id="1" w:author="a"><w:r><w:delText>gone</w:delText></w:r>' +
    '<w:r><w:footnoteReference w:id="2"/></w:r><w:r>' + img + '</w:r></w:del></w:p>'
  const { md, report } = extractBuf(rawDocx(body, { footnotes: true }))
  assert.ok(md.includes('kept'))
  assert.ok(!md.includes('[^fn2]'))
  assert.ok(!md.includes('the footnote body text'))   // deleted ref must not pull its definition
  assert.ok(!md.includes('[image]'))
  assert.equal(report.counters.images, 0)
  assert.equal(report.counters.footnotes_inlined, 0)
  assert.equal(report.char_audit.unaccounted_chars, 0)
})

test('mc fallback branch emits no duplicate [image]', () => {
  const img = '<w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"/></w:drawing>'
  const body = '<w:p><w:r><mc:AlternateContent>' +
    '<mc:Choice Requires="wps"><w:r>' + img + '</w:r></mc:Choice>' +
    '<mc:Fallback><w:r>' + img + '</w:r></mc:Fallback>' +
    '</mc:AlternateContent></w:r></w:p>'
  const { md, report } = extractBuf(rawDocx(body))
  assert.equal((md.match(/\[image\]/g) || []).length, 1)
  assert.equal(report.counters.images, 1)
})

test('nested-table cell text flattens into the outer cell, fully accounted', () => {
  const p = (t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`
  const inner = `<w:tbl><w:tr><w:tc><w:tcPr/>${p('inner cell text')}</w:tc></w:tr></w:tbl>`
  const body = `<w:tbl><w:tr><w:tc><w:tcPr/>${p('outer cell')}${inner}</w:tc></w:tr></w:tbl>${p('after table')}`
  const { md, report } = extractBuf(rawDocx(body))
  assert.ok(md.includes('| outer cell inner cell text |'))
  assert.equal(report.char_audit.unaccounted_chars, 0)
  assert.ok(report.notes.some((n) => /nested table/.test(n)))
})

test('block-level math outside any w:p still lands in the md, in document order', () => {
  const p = (t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`
  const body = `${p('before math')}<m:oMathPara><m:oMath><m:r><m:t>E=mc2</m:t></m:r></m:oMath></m:oMathPara>${p('after math')}`
  const { md, report } = extractBuf(rawDocx(body))
  const i = md.indexOf('before math')
  const j = md.indexOf('[equation: E=mc2]')
  const k = md.indexOf('after math')
  assert.ok(i >= 0 && j > i && k > j, md)
  assert.equal(report.char_audit.unaccounted_chars, 0)
})

test('w:sym becomes a loud [symbol] placeholder, never silence', () => {
  const body = '<w:p><w:r><w:t>alpha is </w:t><w:sym w:font="Symbol" w:char="F061"/><w:t> here</w:t></w:r></w:p>'
  const { md, report } = extractBuf(rawDocx(body))
  assert.ok(md.includes('alpha is [symbol] here'))
  assert.equal(report.counters.symbols, 1)
})

test('hyperlink targets decode XML entities', () => {
  const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId9" Type="${fixture.R_NS}/hyperlink" Target="https://example.org/?a=1&amp;b=2" TargetMode="External"/></Relationships>`
  const body = '<w:p><w:hyperlink r:id="rId9"><w:r><w:t>link</w:t></w:r></w:hyperlink></w:p>'
  const { md } = extractBuf(rawDocx(body, { docRels: rels }))
  assert.ok(md.includes('[link](https://example.org/?a=1&b=2)'))
})

test('a corrupt deflate stream fails loud with the JSON contract, not a stack trace', () => {
  const dir = tmpdir()
  try {
    const good = fixture.buildDocx({ plainBody: true })
    // corrupt the first deflated entry's data region (right after the first local header)
    const bad = Buffer.from(good)
    for (let off = 200; off < 260 && off < bad.length; off++) bad[off] = bad[off] ^ 0xff
    const file = writeDocx(dir, 'corrupt.docx', bad)
    const r = runCli(['extract', file])
    assert.equal(r.status, 1)
    assert.ok(r.json, 'expected JSON output, got: ' + r.stdout + r.stderr)
    assert.equal(r.json.ok, false)
    assert.ok(['zip-data-corrupt', 'extract-failed', 'not-a-zip'].includes(r.json.reason_code), r.json.reason_code)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI stats is a dry run: full report on stdout, nothing written', () => {
  const dir = tmpdir()
  try {
    const docx = writeDocx(dir, 'paper.docx', fixture.buildDocx({ plainBody: true }))
    const r = runCli(['stats', docx])
    assert.equal(r.status, 0)
    const report = JSON.parse(r.stdout)
    assert.equal(report.schema, 1)
    assert.equal(report.crc, 'unchecked')
    assert.ok(report.counters.paragraphs >= 2)
    assert.ok(!fs.existsSync(path.join(dir, '.paper-review')))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
