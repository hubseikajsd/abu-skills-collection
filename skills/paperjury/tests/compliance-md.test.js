const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const cp = require('node:child_process')
const { check } = require('../scripts/compliance-check')

const root = path.resolve(__dirname, '..')
const checkScript = path.join(root, 'scripts', 'compliance-check.js')

const FULL_CONSTRAINTS = {
  anonymous: true,
  page_limit: 9,
  required_sections: ['Limitations'],
  documentclass: 'neurips_2026',
  allowed_documentclass_options: ['final'],
}

test('markdown gate: LaTeX-only checks are skipped, never half-applied', () => {
  const md = '# Introduction\n\nWe describe a method.\n'
  const res = check(md, FULL_CONSTRAINTS, null, 'markdown')
  // a Markdown file has no \section{Limitations}; that must NOT be a false major
  assert.equal(res.findings.filter((f) => f.check === 'required-section').length, 0)
  assert.equal(res.findings.length, 0)
  assert.equal(res.passed, true)
  assert.equal(res.page_check_ran, false)
  assert.equal(res.note, 'LaTeX-only checks skipped: Markdown working copy')
  for (const skipped of ['required_sections', 'author-block', '\\vspace', 'documentclass', 'baselinestretch', 'page-limit']) {
    assert.ok(res.skipped_checks.includes(skipped), `skipped_checks missing ${skipped}`)
  }
})

test('markdown gate: the three neutral checks still fire', () => {
  const md = [
    'In our prior work we proved this.',
    'Code: https://github.com/secret/repo',
    'Contact first.last@example.edu for data.',
  ].join('\n\n')
  const res = check(md, { anonymous: true }, null, 'markdown')
  const details = res.findings.map((f) => f.detail)
  assert.equal(res.findings.length, 3)
  assert.ok(details.some((d) => /self-referential/.test(d)))
  assert.ok(details.some((d) => /code\/data URL/.test(d)))
  assert.ok(details.some((d) => /email address/.test(d)))
  assert.equal(res.summary.major, 3)
  assert.equal(res.passed, false)
})

test('markdown gate: a % line is raw prose, not a comment to strip', () => {
  const md = 'Our method improves accuracy by 50% (code at github.com/secret/repo).'
  const res = check(md, { anonymous: true }, null, 'markdown')
  const url = res.findings.find((f) => /URL/.test(f.detail))
  assert.ok(url, 'URL after the % must be seen in markdown mode')
  assert.ok(url.locations[0].text.includes('50%'))
  // the same line under the .tex path is truncated at the % (comment stripping),
  // which is exactly why the markdown gate must bypass it
  const texRes = check(md, { anonymous: true }, null)
  assert.equal(texRes.findings.length, 0)
})

test('.tex path unchanged: required-section major still fires, no skipped_checks key', () => {
  const tex = '\\documentclass{article}\n\\begin{document}\n\\section{Introduction}\nHi.\n\\end{document}\n'
  const res = check(tex, { required_sections: ['Limitations'] }, null)
  assert.ok(res.findings.some((f) => f.check === 'required-section' && f.severity === 'major'))
  assert.equal(res.passed, false)
  assert.ok(!('skipped_checks' in res))
  assert.ok(!('note' in res))
})

test('CLI routes by extension and exits by the neutral verdict', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-cc-'))
  try {
    const constraints = path.join(dir, 'constraints.json')
    fs.writeFileSync(constraints, JSON.stringify(FULL_CONSTRAINTS), 'utf8')

    const dirty = path.join(dir, 'dirty.md')
    fs.writeFileSync(dirty, 'See github.com/secret/repo for code.\n', 'utf8')
    const r1 = cp.spawnSync(process.execPath, [checkScript, dirty, constraints], { encoding: 'utf8' })
    assert.equal(r1.status, 1)
    const out1 = JSON.parse(r1.stdout)
    assert.ok(Array.isArray(out1.skipped_checks))
    assert.equal(out1.passed, false)

    const clean = path.join(dir, 'clean.md')
    fs.writeFileSync(clean, '# Intro\n\nNothing identifying here.\n', 'utf8')
    const r2 = cp.spawnSync(process.execPath, [checkScript, clean, constraints], { encoding: 'utf8' })
    assert.equal(r2.status, 0, r2.stdout)
    assert.equal(JSON.parse(r2.stdout).passed, true)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
