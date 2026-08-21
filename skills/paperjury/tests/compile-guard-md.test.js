const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const cp = require('node:child_process')
const { compile, structuralLint, mdLint } = require('../scripts/compile-guard')

const root = path.resolve(__dirname, '..')
const guardScript = path.join(root, 'scripts', 'compile-guard.js')
const fixtureTex = path.join(root, 'tests', 'fixtures', 'minimal-paper', 'main.tex')

function withTmpFile(name, content, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-cg-'))
  try {
    const file = path.join(dir, name)
    fs.writeFileSync(file, content, 'utf8')
    return fn(file)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test('check on a .md routes to text mode and never spawns a toolchain', () => {
  // spy on cp.spawnSync: resolveBin and the real compile both go through it, so a
  // zero count proves the routing fired BEFORE any toolchain lookup -- this holds
  // whether or not latexmk/pdflatex is on PATH (mode would otherwise be
  // 'compiled' or 'degraded', never 'text')
  const original = cp.spawnSync
  let spawns = 0
  cp.spawnSync = function (...args) { spawns += 1; return original.apply(cp, args) }
  let res
  try {
    res = withTmpFile('paper.md', '# Title\n\nProse with 12% numbers.\n\n```\ncode\n```\n', (file) => compile(file))
  } finally {
    cp.spawnSync = original
  }
  assert.equal(spawns, 0)
  assert.equal(res.mode, 'text')
  assert.equal(res.format, 'markdown')
  assert.equal(res.compiled, null)
  assert.equal(res.toolchain, null)
  assert.equal(res.ok, true)
  assert.deepEqual(res.lint, { nonempty: true, fence_balanced: true, clean: true })
  // no toolchain residue of any kind in the text-mode result
  assert.ok(!('engine_path' in res))
  assert.ok(!('exit_status' in res))
  assert.ok(!('pdf' in res))
})

test('odd number of fence lines fails the markdown lint', () => {
  const res = withTmpFile('paper.md', '# Title\n\n```\nunclosed fence\n', (file) => compile(file))
  assert.equal(res.mode, 'text')
  assert.equal(res.compiled, null)
  assert.equal(res.lint.fence_balanced, false)
  assert.equal(res.ok, false)
})

test('mdLint flags empty input', () => {
  assert.deepEqual(mdLint(''), { nonempty: false, fence_balanced: true, clean: false })
  assert.deepEqual(mdLint('   \n  \n'), { nonempty: false, fence_balanced: true, clean: false })
})

test('lint cmd routes by extension: md lint shape on .md, structural shape on .tex', () => {
  withTmpFile('paper.md', 'text\n```\n```\n', (file) => {
    const r = cp.spawnSync(process.execPath, [guardScript, 'lint', file], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    const parsed = JSON.parse(r.stdout)
    assert.deepEqual(Object.keys(parsed).sort(), ['clean', 'fence_balanced', 'nonempty'])
  })
  const r = cp.spawnSync(process.execPath, [guardScript, 'lint', fixtureTex], { encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  const parsed = JSON.parse(r.stdout)
  assert.ok('brace_balanced' in parsed)
  assert.ok('env_errors' in parsed)
  assert.ok(!('fence_balanced' in parsed))
})

test('check CLI on a .md exits by lint verdict, mode text either way', () => {
  withTmpFile('paper.md', 'clean body\n', (file) => {
    const r = cp.spawnSync(process.execPath, [guardScript, 'check', file], { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stderr)
    assert.equal(JSON.parse(r.stdout).mode, 'text')
  })
  withTmpFile('paper.md', '```\nunclosed\n', (file) => {
    const r = cp.spawnSync(process.execPath, [guardScript, 'check', file], { encoding: 'utf8' })
    assert.equal(r.status, 1)
    assert.equal(JSON.parse(r.stdout).mode, 'text')
  })
})

test('LaTeX path regression: structuralLint output on the fixture matches HEAD', () => {
  // snapshot generated from `git show d220a89:scripts/compile-guard.js` (pre-change
  // HEAD) run on tests/fixtures/minimal-paper/main.tex -- the .tex path is byte-identical
  const expected = {
    brace_balanced: true,
    brace_open: 8,
    brace_close: 8,
    env_errors: [],
    refs_without_label: [],
    clean: true,
  }
  assert.deepEqual(structuralLint(fs.readFileSync(fixtureTex, 'utf8')), expected)
})
