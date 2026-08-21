const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { decompose, units, stripComments } = require('../scripts/decompose')

test('decomposes abstract and sections into stable passages', () => {
  const tex = String.raw`
\documentclass{article}
\begin{document}
\begin{abstract}
We study a compact setting.
\end{abstract}

\section{Introduction}
\label{sec:intro}
This paragraph defines the motivation.

\subsection{Details}
The second paragraph carries supporting context.
\end{document}
`
  const passages = decompose(tex)
  assert.ok(passages.length >= 3)
  assert.ok(passages.some((p) => p.in_abstract))
  assert.ok(passages.some((p) => p.label === 'sec:intro'))
  assert.ok(passages.every((p) => /^(frontmatter|\d+(?:\.\d+)*)#p\d+#[0-9a-f]{8}$/.test(p.passage_id)))

  const grouped = units(passages)
  assert.ok(grouped.some((u) => u.section_title === 'Introduction'))
  assert.ok(grouped.every((u) => u.passage_ids.length > 0))
})

test('strips escaped and full-line comments conservatively', () => {
  const input = 'Text before % remove this\nEscaped \\% keeps percent\n'
  const clean = stripComments(input)
  assert.match(clean, /Text before/)
  assert.doesNotMatch(clean, /remove this/)
  assert.match(clean, /Escaped \\% keeps percent/)
})

// ---- markdown mode ----------------------------------------------------------

const FENCE = '```'
const md = [
  'A frontmatter line before any heading.',
  '',
  '# Introduction',
  '',
  'First paragraph reporting 12% over baseline in prose.',
  '',
  'Second paragraph of the introduction.',
  '',
  '## Details',
  '',
  'Nested paragraph under the subsection.',
  '',
  FENCE,
  '# x',
  FENCE,
  '',
  '# Method',
  '',
  'Method paragraph.',
  '',
].join('\n')

test('md mode derives counter section paths, never heading titles', () => {
  const ps = decompose(md, { format: 'markdown' })
  const paths = [...new Set(ps.map((p) => p.section_path))]
  assert.deepEqual(paths, ['frontmatter', '1', '1.1', '2'])
  assert.ok(ps.every((p) => !p.section_path.includes('Introduction')))
  assert.equal(ps.find((p) => p.section_path === '1').section_title, 'Introduction')
  assert.equal(ps.find((p) => p.section_path === '1.1').section_title, 'Details')
  assert.equal(ps.find((p) => p.section_path === '2').section_title, 'Method')
})

test('md mode excludes the heading line from passage text', () => {
  const ps = decompose(md, { format: 'markdown' })
  assert.ok(ps.every((p) => !/^#{1,6}\s/.test(p.text)))
  assert.ok(ps.every((p) => !p.text.includes('# Introduction')))
})

test('md mode preserves bare % (no comment stripping)', () => {
  const ps = decompose(md, { format: 'markdown' })
  const p = ps.find((x) => x.text.includes('12%'))
  assert.ok(p)
  assert.match(p.text, /12% over baseline in prose\./)
})

test('md mode ignores heading-like lines inside code fences', () => {
  const ps = decompose(md, { format: 'markdown' })
  assert.ok(ps.every((p) => p.section_title !== 'x'))
  // the fenced block stays inside section 1.1 as passage text
  const fenced = ps.find((p) => p.text.includes('# x'))
  assert.equal(fenced.section_path, '1.1')
})

test('md mode flags in_abstract by region title match', () => {
  const ps = decompose('# Abstract\n\nWe study things.\n\n# Introduction\n\nIntro para.\n', { format: 'markdown' })
  assert.equal(ps.find((p) => p.text === 'We study things.').in_abstract, true)
  assert.equal(ps.find((p) => p.text === 'Intro para.').in_abstract, false)
})

test('structureless text degrades to frontmatter#pN', () => {
  const ps = decompose('Just one paragraph.\n\nAnd another one.\n', { format: 'markdown' })
  assert.equal(ps.length, 2)
  assert.ok(ps.every((p) => p.section_path === 'frontmatter'))
  assert.ok(ps.every((p) => /^frontmatter#p\d+#[0-9a-f]{8}$/.test(p.passage_id)))
  assert.deepEqual(ps.map((p) => p.ordinal), [1, 2])
})

test('md passage_id shape matches the LaTeX scheme, labels stay null', () => {
  const ps = decompose(md, { format: 'markdown' })
  assert.ok(ps.length > 0)
  assert.ok(ps.every((p) => /^(frontmatter|\d+(?:\.\d+)*)#p\d+#[0-9a-f]{8}$/.test(p.passage_id)))
  assert.ok(ps.every((p) => p.label === null))
})

test('CLI routes by extname and honors --format override', (t) => {
  const os = require('node:os')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-decompose-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'paper.md')
  fs.writeFileSync(file, md, 'utf8')
  const script = path.join(__dirname, '..', 'scripts', 'decompose.js')

  const asMd = JSON.parse(execFileSync(process.execPath, [script, 'passages', file], { encoding: 'utf8' }))
  assert.ok(asMd.some((p) => p.section_path === '1.1'))
  assert.match(asMd.find((p) => p.text.includes('12%')).text, /12% over baseline/)

  const asLatex = JSON.parse(execFileSync(process.execPath, [script, 'passages', file, '--format', 'latex'], { encoding: 'utf8' }))
  // forced latex mode: no \section commands, so everything is frontmatter and % comments strip
  assert.ok(asLatex.every((p) => p.section_path === 'frontmatter'))
  assert.ok(!asLatex.some((p) => p.text.includes('12% over baseline')))
})

// ---- LaTeX byte-identical regression (decompose part) -----------------------
// The snapshot was generated by the PRE-change decompose.js (git show HEAD) on
// tests/fixtures/minimal-paper/main.tex; the new code, called the OLD way (no
// format arg, so the content sniff must pick latex), must deep-equal it.

test('LaTeX path is byte-identical to the pre-change snapshot', () => {
  const snap = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'decompose-latex-snapshot.json'), 'utf8'))
  const tex = fs.readFileSync(path.join(__dirname, 'fixtures', 'minimal-paper', 'main.tex'), 'utf8')
  const passages = decompose(tex)
  assert.deepEqual(passages, snap.passages)
  assert.deepEqual(units(passages), snap.units)
})
