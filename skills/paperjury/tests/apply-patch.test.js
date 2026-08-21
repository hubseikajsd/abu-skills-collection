const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { apply, revert, countOccurrences, paraBreaks } = require('../scripts/apply-patch')
const journal = require('../scripts/journal')

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('applies an exact-once patch and reverts through the journal', (t) => {
  const dir = tempDir(t)
  const tex = path.join(dir, 'main.tex')
  const log = path.join(dir, 'journal.jsonl')
  fs.writeFileSync(tex, 'Before sentence.\nTarget sentence.\nAfter sentence.\n', 'utf8')

  const res = apply(tex, log, {
    issue_id: 'I-01',
    passage_id: '1#p1',
    round: 2,
    close_criterion: 'Tighten the sentence.',
    before: 'Target sentence.',
    after: 'Sharper target sentence.',
  })

  assert.deepEqual(res, { ok: true, jid: 'J-0001' })
  assert.match(fs.readFileSync(tex, 'utf8'), /Sharper target sentence/)
  assert.equal(journal.readEntries(log).length, 1)

  const reverted = revert(tex, log, res.jid)
  assert.deepEqual(reverted, { ok: true, reverted: 'J-0001' })
  assert.match(fs.readFileSync(tex, 'utf8'), /Target sentence/)
  assert.equal(journal.readEntries(log).length, 2)
})

test('refuses ambiguous before text', (t) => {
  const dir = tempDir(t)
  const tex = path.join(dir, 'main.tex')
  const log = path.join(dir, 'journal.jsonl')
  fs.writeFileSync(tex, 'same\nsame\n', 'utf8')

  assert.equal(countOccurrences('same same same', 'same'), 3)
  const res = apply(tex, log, { before: 'same', after: 'other' })
  assert.equal(res.ok, false)
  assert.match(res.reason, /ambiguous/)
  assert.equal(fs.existsSync(log), false)
})

// ---- --guard-paragraphs (opt-in; default off stays byte-identical) ----------

const SPLITTING_PATCH = {
  issue_id: 'I-02',
  passage_id: '1#p1',
  round: 1,
  close_criterion: 'Split for emphasis.',
  before: 'Target sentence. Trailing words.',
  after: 'Target sentence.\n\nTrailing words.',
}

function guardFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const tex = path.join(dir, 'working.md')
  const log = path.join(dir, 'journal.jsonl')
  fs.writeFileSync(tex, 'Lead sentence.\n\nTarget sentence. Trailing words.\n', 'utf8')
  return { tex, log }
}

test('guard rejects a paragraph-splitting patch: no write, no journal entry', (t) => {
  const { tex, log } = guardFixture(t)
  const original = fs.readFileSync(tex, 'utf8')

  const res = apply(tex, log, SPLITTING_PATCH, { guardParagraphs: true })
  assert.equal(res.ok, false)
  assert.match(res.reason, /paragraph-structure-change/)
  assert.equal(fs.readFileSync(tex, 'utf8'), original)
  assert.equal(fs.existsSync(log), false)
})

test('the same splitting patch without the flag applies as before (regression)', (t) => {
  const { tex, log } = guardFixture(t)
  const res = apply(tex, log, SPLITTING_PATCH)
  assert.equal(res.ok, true)
  assert.match(fs.readFileSync(tex, 'utf8'), /Target sentence\.\n\nTrailing words\./)
  assert.equal(journal.readEntries(log).length, 1)
})

test('guard lets an equal-paragraph patch through', (t) => {
  const { tex, log } = guardFixture(t)
  const res = apply(tex, log, {
    ...SPLITTING_PATCH,
    after: 'Sharper target sentence. Trailing words.',
  }, { guardParagraphs: true })
  assert.equal(res.ok, true)
  assert.match(fs.readFileSync(tex, 'utf8'), /Sharper target sentence/)
  assert.equal(journal.readEntries(log).length, 1)
})

test('paraBreaks counts blank-line boundaries like decompose splits them', () => {
  assert.equal(paraBreaks('one block'), 0)
  assert.equal(paraBreaks('a\n\nb'), 1)
  assert.equal(paraBreaks('a\n \t\nb\n\nc'), 2)
})

test('guard counts CRLF blank lines too (no bypass via \\r\\n patch text)', (t) => {
  const { tex, log } = guardFixture(t)
  const original = fs.readFileSync(tex, 'utf8')
  const res = apply(tex, log, {
    ...SPLITTING_PATCH,
    after: 'Target sentence.\r\n\r\nTrailing words.',
  }, { guardParagraphs: true })
  assert.equal(res.ok, false)
  assert.match(res.reason, /paragraph-structure-change/)
  assert.equal(fs.readFileSync(tex, 'utf8'), original)
  assert.equal(paraBreaks('a\r\n\r\nb'), 1)
})

test('a multi-line LF patch applies onto a CRLF working copy (route-2 .md files)', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const md = path.join(dir, 'working.md')
  const log = path.join(dir, 'journal.jsonl')
  // a CRLF file with a hard-wrapped paragraph, as pandoc on Windows emits
  fs.writeFileSync(md, 'Lead.\r\n\r\nTarget sentence\r\nwraps onto two lines.\r\n', 'utf8')

  // the drafter saw decompose's LF-normalized passage text
  const res = apply(md, log, {
    issue_id: 'I-03', passage_id: '1#p2', round: 1,
    close_criterion: 'Tighten.',
    before: 'Target sentence\nwraps onto two lines.',
    after: 'Tight sentence\nstill on two lines.',
  }, { guardParagraphs: true })
  assert.equal(res.ok, true, JSON.stringify(res))
  const after = fs.readFileSync(md, 'utf8')
  assert.ok(after.includes('Tight sentence\r\nstill on two lines.'))   // file stays CRLF-consistent
  // the journal records the CRLF texts actually used, so revert round-trips
  const reverted = revert(md, log, res.jid)
  assert.equal(reverted.ok, true)
  assert.ok(fs.readFileSync(md, 'utf8').includes('Target sentence\r\nwraps onto two lines.'))
})

test('CLI parses --guard-paragraphs after positionals and exits 1 on rejection', (t) => {
  const { tex, log } = guardFixture(t)
  const original = fs.readFileSync(tex, 'utf8')
  const script = path.join(__dirname, '..', 'scripts', 'apply-patch.js')

  const run = spawnSync(process.execPath, [script, 'apply', tex, log, '--guard-paragraphs'], {
    input: JSON.stringify(SPLITTING_PATCH), encoding: 'utf8',
  })
  assert.equal(run.status, 1)
  const out = JSON.parse(run.stdout)
  assert.equal(out.ok, false)
  assert.match(out.reason, /paragraph-structure-change/)
  assert.equal(fs.readFileSync(tex, 'utf8'), original)
  assert.equal(fs.existsSync(log), false)
})
