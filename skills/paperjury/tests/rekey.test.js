const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { rekey } = require('../scripts/rekey')
const { decompose } = require('../scripts/decompose')
const { apply } = require('../scripts/apply-patch')
const journal = require('../scripts/journal')
const ledgerLib = require('../scripts/ledger')

const WORKING = [
  '# Introduction',
  '',
  'The model overclaims accuracy on the benchmark suite in every figure caption.',
  '',
  'A second steady paragraph that stays put across rounds and anchors the cascade case.',
  '',
  '# Method',
  '',
  'The method paragraph closes the file.',
  '',
].join('\n')

function fixture(t, rows, content = WORKING) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-rekey-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const working = path.join(dir, 'working.md')
  const ledgerFile = path.join(dir, 'LEDGER.json')
  const journalFile = path.join(dir, 'journal.jsonl')
  const aliasesFile = path.join(dir, 'passage-aliases.json')
  fs.writeFileSync(working, content, 'utf8')
  const led = ledgerLib.emptyLedger()
  ledgerLib.addIssues(led, rows, 1)
  ledgerLib.save(ledgerFile, led)
  return { dir, working, ledgerFile, journalFile, aliasesFile }
}

function passageByText(file, needle) {
  return decompose(fs.readFileSync(file, 'utf8')).find((p) => p.text.includes(needle))
}

const INTRO_ROW = (ps) => ({
  summary: 'Overclaims accuracy.', section: 'Introduction',
  passage_id: ps.find((p) => p.text.startsWith('The model overclaims')).passage_id,
  evidence_anchor: 'The model overclaims accuracy',
})

const REWRITE_OPENING = {
  issue_id: 'I-01', round: 1, close_criterion: 'Calibrate the claim.',
  before: 'The model overclaims accuracy on the benchmark suite',
  after: 'Our approach reports calibrated accuracy on the benchmark suite',
}

test('rekey re-links an edited paragraph; the alias map makes the cap count both rounds', (t) => {
  const ps = decompose(WORKING)
  const oldId = INTRO_ROW(ps).passage_id
  const fx = fixture(t, [INTRO_ROW(ps)])

  assert.equal(apply(fx.working, fx.journalFile, { ...REWRITE_OPENING, passage_id: oldId }).ok, true)

  // first-words hash mutates under an opening-words rewrite, but path#pN survives
  const freshId = passageByText(fx.working, 'calibrated accuracy').passage_id
  assert.equal(freshId.split('#').slice(0, 2).join('#'), oldId.split('#').slice(0, 2).join('#'))
  assert.notEqual(freshId.split('#')[2], oldId.split('#')[2])

  const journalBytes = fs.readFileSync(fx.journalFile, 'utf8')
  const out = rekey(fx.working, fx.ledgerFile, fx.journalFile)
  assert.deepEqual(out.rekeyed, [{ issue_id: 'I-01', old_id: oldId, new_id: freshId }])
  assert.deepEqual(out.unresolved, [])
  assert.equal(out.aliases_file, fx.aliasesFile)
  // append-only audit: rekey never rewrites the journal
  assert.equal(fs.readFileSync(fx.journalFile, 'utf8'), journalBytes)

  assert.equal(ledgerLib.load(fx.ledgerFile).issues[0].passage_id, freshId)
  assert.deepEqual(JSON.parse(fs.readFileSync(fx.aliasesFile, 'utf8')), { [oldId]: freshId })

  // the cap sees the pre- and post-edit rounds as the SAME passage again
  journal.append(fx.journalFile, { issue_id: 'I-01', passage_id: freshId, round: 2, before: 'x', after: 'y', applied: true })
  const aliases = journal.loadAliases(fx.journalFile) // default: passage-aliases.json next to the journal
  assert.deepEqual(journal.roundsTouchedForPassage(fx.journalFile, freshId, aliases), [1, 2])
  assert.equal(journal.withinPassageCap(fx.journalFile, freshId, 2, aliases), false)
  // without the alias map the round-1 edit is invisible (the gap rekey closes)
  assert.deepEqual(journal.roundsTouchedForPassage(fx.journalFile, freshId), [2])
  assert.equal(journal.withinPassageCap(fx.journalFile, freshId, 2), true)
})

test('cascade: an authorized paragraph add re-links the shifted row via evidence_anchor', (t) => {
  const ps = decompose(WORKING)
  const steady = ps.find((p) => p.text.startsWith('A second steady paragraph'))
  const fx = fixture(t, [{
    summary: 'Steady paragraph issue.', section: 'Introduction',
    passage_id: steady.passage_id, evidence_anchor: 'A second steady paragraph that stays put',
  }])

  // a journaled edit under a DIFFERENT issue (applied without the guard) inserts
  // a paragraph above the steady one, shifting its ordinal
  assert.equal(apply(fx.working, fx.journalFile, {
    issue_id: 'I-77', round: 1,
    before: 'in every figure caption.',
    after: 'in every figure caption.\n\nA brand new inserted paragraph appears here.',
  }).ok, true)

  const out = rekey(fx.working, fx.ledgerFile, fx.journalFile)
  const fresh = passageByText(fx.working, 'A second steady paragraph')
  assert.deepEqual(out.rekeyed, [{ issue_id: 'I-01', old_id: steady.passage_id, new_id: fresh.passage_id }])
  // untouched text keeps its hash; only the ordinal moved
  assert.equal(steady.passage_id.split('#')[1], 'p2')
  assert.equal(fresh.passage_id.split('#')[1], 'p3')
  assert.equal(fresh.passage_id.split('#')[2], steady.passage_id.split('#')[2])
  assert.equal(ledgerLib.load(fx.ledgerFile).issues[0].passage_id, fresh.passage_id)
})

test('deleted anchor text leaves the row untouched and listed unresolved (recall-safe)', (t) => {
  const ps = decompose(WORKING)
  const row = INTRO_ROW(ps)
  const fx = fixture(t, [
    row,
    // terminal rows are never rekeyed even with a stale id
    { summary: 'Queued nit.', section: 'Method', passage_id: '2#p1#deadbeef', status: 'queued', reason_code: 'batched-nit' },
  ])
  assert.equal(apply(fx.working, fx.journalFile, {
    issue_id: 'I-77', round: 1,
    before: 'The model overclaims accuracy on the benchmark suite in every figure caption.',
    after: 'Entirely different first paragraph now.',
  }).ok, true)

  const ledgerBytes = fs.readFileSync(fx.ledgerFile, 'utf8')
  const out = rekey(fx.working, fx.ledgerFile, fx.journalFile)
  assert.deepEqual(out.rekeyed, [])
  assert.deepEqual(out.unresolved, [{ issue_id: 'I-01', old_id: row.passage_id, matches: 0 }])
  assert.equal(fs.readFileSync(fx.ledgerFile, 'utf8'), ledgerBytes)
  assert.equal(fs.existsSync(fx.aliasesFile), false)
})

test('an anchor matching more than one fresh passage stays unresolved', (t) => {
  const dup = [
    '# Introduction',
    '',
    'A duplicated sentence appears here first.',
    '',
    'A duplicated sentence appears here too.',
    '',
  ].join('\n')
  const fx = fixture(t, [{
    summary: 'Ambiguous anchor.', section: 'Introduction',
    passage_id: '1#p1#deadbeef', evidence_anchor: 'A duplicated sentence appears here',
  }], dup)

  const out = rekey(fx.working, fx.ledgerFile, fx.journalFile) // journal may not exist yet: no edits
  assert.deepEqual(out.rekeyed, [])
  assert.deepEqual(out.unresolved, [{ issue_id: 'I-01', old_id: '1#p1#deadbeef', matches: 2 }])
  assert.equal(ledgerLib.load(fx.ledgerFile).issues[0].passage_id, '1#p1#deadbeef')
})

test('--dry-run computes the rekey but writes nothing', (t) => {
  const ps = decompose(WORKING)
  const fx = fixture(t, [INTRO_ROW(ps)])
  assert.equal(apply(fx.working, fx.journalFile, { ...REWRITE_OPENING, passage_id: INTRO_ROW(ps).passage_id }).ok, true)

  const ledgerBytes = fs.readFileSync(fx.ledgerFile, 'utf8')
  const journalBytes = fs.readFileSync(fx.journalFile, 'utf8')
  const out = rekey(fx.working, fx.ledgerFile, fx.journalFile, { dryRun: true })
  assert.equal(out.rekeyed.length, 1)
  assert.equal(fs.readFileSync(fx.ledgerFile, 'utf8'), ledgerBytes)
  assert.equal(fs.readFileSync(fx.journalFile, 'utf8'), journalBytes)
  assert.equal(fs.existsSync(fx.aliasesFile), false)
})

test('a second rekey flattens the alias chain to the newest id', (t) => {
  const ps = decompose(WORKING)
  const idA = INTRO_ROW(ps).passage_id
  const fx = fixture(t, [INTRO_ROW(ps)])

  assert.equal(apply(fx.working, fx.journalFile, { ...REWRITE_OPENING, passage_id: idA }).ok, true)
  rekey(fx.working, fx.ledgerFile, fx.journalFile)
  const idB = ledgerLib.load(fx.ledgerFile).issues[0].passage_id

  assert.equal(apply(fx.working, fx.journalFile, {
    issue_id: 'I-01', passage_id: idB, round: 2,
    before: 'Our approach reports calibrated accuracy on the benchmark suite',
    after: 'Careful measurement shows calibrated accuracy on the benchmark suite',
  }).ok, true)
  rekey(fx.working, fx.ledgerFile, fx.journalFile)
  const idC = ledgerLib.load(fx.ledgerFile).issues[0].passage_id

  assert.notEqual(idB, idA)
  assert.notEqual(idC, idB)
  // chains flattened on write: BOTH stale ids point straight at the newest one
  assert.deepEqual(JSON.parse(fs.readFileSync(fx.aliasesFile, 'utf8')), { [idA]: idC, [idB]: idC })
  const aliases = journal.loadAliases(fx.journalFile)
  assert.deepEqual(journal.roundsTouchedForPassage(fx.journalFile, idC, aliases), [1, 2])
})

test('resolveAlias follows chains and survives a hand-edited cycle', () => {
  assert.equal(journal.resolveAlias({ a: 'b', b: 'c' }, 'a'), 'c')
  assert.equal(journal.resolveAlias({}, 'x'), 'x')
  assert.equal(journal.resolveAlias(undefined, 'x'), 'x')
  const r = journal.resolveAlias({ a: 'b', b: 'a' }, 'a')
  assert.ok(r === 'a' || r === 'b')
})

// LaTeX byte-identical regression (journal part): with no aliases file present the
// cap functions behave exactly as the pre-change code (plain id equality).
test('cap functions without an aliases file are byte-identical to before', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-rekey-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const log = path.join(dir, 'journal.jsonl')
  journal.append(log, { issue_id: 'I-01', passage_id: '1#p1#aaaaaaaa', round: 1, before: 'a', after: 'b', applied: true })
  journal.append(log, { issue_id: 'I-01', passage_id: '1#p1#aaaaaaaa', round: 2, before: 'b', after: 'c', applied: true })
  journal.append(log, { issue_id: 'I-02', passage_id: '1#p2#bbbbbbbb', round: 2, before: 'd', after: 'e', applied: true })

  assert.deepEqual(journal.loadAliases(log), {})
  assert.deepEqual(journal.roundsTouchedForPassage(log, '1#p1#aaaaaaaa'), [1, 2])
  assert.deepEqual(journal.roundsTouchedForPassage(log, '1#p1#aaaaaaaa', {}), [1, 2])
  assert.equal(journal.withinPassageCap(log, '1#p1#aaaaaaaa', 2), false)
  assert.equal(journal.withinPassageCap(log, '1#p2#bbbbbbbb', 2), true)
  assert.deepEqual(journal.roundsTouchedForPassage(log, 'absent#p9#00000000'), [])
})

test('CLI: usage exits 2; a real run prints ok JSON; --dry-run flag is parsed', (t) => {
  const script = path.join(__dirname, '..', 'scripts', 'rekey.js')
  const usage = spawnSync(process.execPath, [script, 'only-one-arg'], { encoding: 'utf8' })
  assert.equal(usage.status, 2)

  const ps = decompose(WORKING)
  const fx = fixture(t, [INTRO_ROW(ps)])
  assert.equal(apply(fx.working, fx.journalFile, { ...REWRITE_OPENING, passage_id: INTRO_ROW(ps).passage_id }).ok, true)
  const run = spawnSync(process.execPath, [script, fx.working, fx.ledgerFile, fx.journalFile, '--dry-run'], { encoding: 'utf8' })
  assert.equal(run.status, 0)
  const out = JSON.parse(run.stdout)
  assert.equal(out.ok, true)
  assert.equal(out.rekeyed.length, 1)
  assert.equal(fs.existsSync(fx.aliasesFile), false)

  const missing = spawnSync(process.execPath, [script, path.join(fx.dir, 'nope.md'), fx.ledgerFile, fx.journalFile], { encoding: 'utf8' })
  assert.equal(missing.status, 1)
  assert.equal(JSON.parse(missing.stdout).ok, false)
})
