const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {
  runDoctor,
  findMainTexCandidates,
  detectManuscript,
  checkWorkflowSyntax,
  checkLocalLinks,
} = require('../scripts/doctor')

const root = path.resolve(__dirname, '..')
const fixtureProject = path.join(root, 'tests', 'fixtures', 'minimal-paper')

function withTmpDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-doc-'))
  try {
    return fn(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('finds a main TeX file in a project directory', () => {
  const candidates = findMainTexCandidates(fixtureProject)
  assert.equal(candidates.length, 1)
  assert.equal(path.basename(candidates[0]), 'main.tex')
})

test('repository-local documentation links resolve', () => {
  assert.deepEqual(checkLocalLinks(root), [])
})

test('workflow snippets parse as workflow bodies', () => {
  const sample = path.join(root, 'workflows', 'drafter.workflow.js')
  const result = checkWorkflowSyntax(sample)
  assert.equal(result.ok, true, result.output)
})

test('doctor passes on the repository and minimal paper fixture', () => {
  const report = runDoctor({ project: fixtureProject })
  assert.equal(report.ok, true, JSON.stringify(report, null, 2))
  assert.equal(report.summary.errors, 0)
  assert.ok(report.checks.some((c) => c.id === 'manuscript-detect' && c.level === 'ok'))
})

test('a dir with only a .md detects as a Markdown manuscript, not a missing .tex', () => {
  withTmpDir((dir) => {
    fs.writeFileSync(path.join(dir, 'paper.md'), '# Title\n\nBody.\n', 'utf8')
    const report = runDoctor({ project: dir })
    const det = report.checks.find((c) => c.id === 'manuscript-detect')
    assert.equal(det.level, 'ok')
    assert.ok(det.message.includes('Markdown manuscript'))
    assert.ok(det.message.includes('compiled:null'))
    assert.ok(!det.message.includes('.tex'))
  })
})

test('explicit .md file arg classifies by extension (no \\documentclass filter)', () => {
  withTmpDir((dir) => {
    const file = path.join(dir, 'paper.md')
    fs.writeFileSync(file, '# Title\n\nBody.\n', 'utf8')
    const found = detectManuscript(file)
    assert.equal(found.level, 'ok')
    assert.ok(found.message.includes('Markdown manuscript'))
  })
})

test('explicit .docx file arg without a working copy warns extraction-required', () => {
  withTmpDir((dir) => {
    const docx = path.join(dir, 'paper.docx')
    fs.writeFileSync(docx, 'placeholder bytes; doctor classifies by extension only', 'utf8')
    const found = detectManuscript(docx)
    assert.equal(found.level, 'warn')
    assert.ok(found.message.includes('one-time extraction required'))
    assert.ok(found.message.includes('node scripts/extract-docx.js extract'))
  })
})

test('a .docx with an existing .paper-review working copy reports reuse', () => {
  withTmpDir((dir) => {
    const docx = path.join(dir, 'paper.docx')
    fs.writeFileSync(docx, 'placeholder bytes', 'utf8')
    fs.mkdirSync(path.join(dir, '.paper-review'))
    fs.writeFileSync(path.join(dir, '.paper-review', 'paper.md'), '# Extracted\n', 'utf8')
    const found = detectManuscript(docx)
    assert.equal(found.level, 'ok')
    assert.ok(found.message.includes(path.join('.paper-review', 'paper.md')))
    assert.ok(found.message.includes('reuse it; never re-extract'))
  })
})

test('the no-manuscript warn only fires when no .tex/.md/.docx exists at all', () => {
  withTmpDir((dir) => {
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'not a manuscript class doctor scans for', 'utf8')
    const found = detectManuscript(dir)
    assert.equal(found.level, 'warn')
    assert.ok(found.message.includes('no manuscript (.tex/.md/.docx) detected'))
  })
})
