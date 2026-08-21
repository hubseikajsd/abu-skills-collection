const test = require('node:test')
const assert = require('node:assert/strict')
const ledger = require('../scripts/ledger')

test('gate blocks active major charges and passes after author-required routing', () => {
  const led = ledger.emptyLedger()
  const [row] = ledger.addIssues(led, [{
    section: 'Introduction',
    evidence_anchor: 'The method is always better.',
    summary: 'Overclaims the result.',
    significance: 'major',
    kind: 'substantive',
    raised_by: ['R1'],
  }], 1)

  assert.equal(row.id, 'I-01')
  assert.equal(ledger.gatePass(led), false)
  assert.deepEqual(ledger.activeCounts(led), {
    major: 1,
    minor: 0,
    total: 1,
    gate_blocking_major: 1,
    author_required: 0,
  })

  ledger.setStatus(led, 'I-01', 'author-required', { verdict: 'author-required' })
  assert.equal(ledger.gatePass(led), true)
  assert.equal(ledger.activeCounts(led).author_required, 1)
})

test('valid-fixable requires a close criterion', () => {
  const led = ledger.emptyLedger()
  ledger.addIssues(led, [{ summary: 'Needs a clearer caveat.', section: 'Limitations' }], 1)

  assert.throws(
    () => ledger.setStatus(led, 'I-01', 'valid-fixable', { verdict: 'valid-fixable' }),
    /close_criterion/,
  )

  ledger.setStatus(led, 'I-01', 'valid-fixable', {
    verdict: 'valid-fixable',
    close_criterion: 'Add one sentence limiting the claim to the tested datasets.',
  })
  assert.equal(ledger.query(led, { status: 'valid-fixable' }).length, 1)
})

test('drops require a logged reason', () => {
  const led = ledger.emptyLedger()
  ledger.addIssues(led, [{ summary: 'Maybe unsupported.', section: 'Method' }], 1)

  assert.throws(
    () => ledger.setStatus(led, 'I-01', 'dropped', { verdict: 'invalid-drop' }),
    /reason/,
  )

  ledger.setStatus(led, 'I-01', 'dropped', {
    verdict: 'invalid-drop',
    notes: 'Reviewer quote refers to a different baseline table.',
  })
  assert.equal(ledger.isActive(led.issues[0]), false)
})

test('older severity values still map to current significance', () => {
  assert.equal(ledger.sigOf({ severity: 'blocker' }), 'major')
  assert.equal(ledger.sigOf({ severity: 'nit' }), 'minor')
  assert.equal(ledger.sigOf({ significance: 'minor', severity: 'blocker' }), 'minor')
})

function mixedLedger() {
  const led = ledger.emptyLedger()
  ledger.addIssues(led, [
    { summary: 'Unsupported claim.', section: 'Intro', significance: 'major', kind: 'substantive' },
    { summary: 'Awkward phrasing.', section: 'Method', significance: 'minor', kind: 'substantive' },
    { summary: 'Typo in caption.', section: 'Fig 2', significance: 'minor', kind: 'mechanical', passage_id: null },
    { summary: 'Stale notation.', section: 'Eq 3', significance: 'minor', kind: 'mechanical' },
  ], 1)
  ledger.setStatus(led, 'I-03', 'queued', { reason_code: 'polish-review' })
  ledger.setStatus(led, 'I-04', 'closed', { round_closed: 1 })
  return led
}

test('render without display_mode keeps the flat table (no digest)', () => {
  const md = ledger.renderMarkdown(mixedLedger())
  assert.ok(!md.includes('## Minor digest'))
  assert.ok(md.includes('| I-02 |'))
  assert.ok(md.includes('| I-03 |'))
  assert.ok(md.includes('| I-04 |'))
})

test('collapse folds minors into the digest and keeps the header identical', () => {
  const led = mixedLedger()
  const shown = ledger.renderMarkdown(led)
  led.meta.display_mode = 'collapse'
  const collapsed = ledger.renderMarkdown(led)

  // header (everything up to the table) is byte-identical across modes
  const headOf = (md) => md.split('\n| id |')[0]
  assert.equal(headOf(collapsed), headOf(shown))

  // majors stay table rows; minors leave the table
  assert.ok(collapsed.includes('| I-01 |'))
  assert.ok(!collapsed.includes('| I-02 |'))
  assert.ok(!collapsed.includes('| I-03 |'))

  // open/queued minors are enumerated one per line (queue stays visible);
  // terminal minors become a count line; the never-drop footer is present
  assert.ok(collapsed.includes('## Minor digest'))
  assert.ok(collapsed.includes('- I-02 [raised] Method: Awkward phrasing.'))
  assert.ok(collapsed.includes('- I-03 [queued (polish-review)] Fig 2: Typo in caption.'))
  assert.ok(collapsed.includes('- closed: 1 (I-04)'))
  assert.ok(collapsed.includes('never-drop'))

  // render-only: counts and the gate are unaffected by the mode flip
  const before = JSON.stringify(ledger.activeCounts(led))
  led.meta.display_mode = 'show'
  assert.equal(JSON.stringify(ledger.activeCounts(led)), before)
})

test('collapse maps legacy v2 severities through sigOf', () => {
  const led = ledger.emptyLedger()
  led.issues.push(
    { id: 'I-01', severity: 'blocker', status: 'raised', summary: 'Legacy blocker.', section: 'S1' },
    { id: 'I-02', severity: 'nit', status: 'raised', summary: 'Legacy nit.', section: 'S2' },
  )
  led.meta.display_mode = 'collapse'
  const md = ledger.renderMarkdown(led)
  assert.ok(md.includes('| I-01 |'))
  assert.ok(!md.includes('| I-02 |'))
  assert.ok(md.includes('- I-02 [raised] S2: Legacy nit.'))
})

test('rows with no resolvable significance are not trivia', () => {
  assert.equal(ledger.isTriviaRow({ significance: null, severity: null }), false)
  assert.equal(ledger.isTriviaRow({ significance: 'minor' }), true)
  assert.equal(ledger.isTriviaRow({ severity: 'nit' }), true)
})

test('collapse never hides a minor row with an out-of-universe status', () => {
  const led = ledger.emptyLedger()
  // simulate a legacy / hand-edited ledger: load() does not validate statuses
  led.issues.push({ id: 'I-01', significance: 'minor', status: 'fixed', summary: 'Ghost minor.', section: 'S1' })
  led.meta.display_mode = 'collapse'
  const md = ledger.renderMarkdown(led)
  assert.ok(md.includes('- I-01 [fixed] S1: Ghost minor.'))
})

test('add rejects an unknown status at intake', () => {
  const led = ledger.emptyLedger()
  assert.throws(
    () => ledger.addIssues(led, [{ summary: 'Bad status.', section: 'S1', status: 'fixed' }], 1),
    /unknown status/,
  )
})

test('floor keeps valid-fixable majors and excludes minors, without mutating', () => {
  const led = ledger.emptyLedger()
  ledger.addIssues(led, [
    { summary: 'Major flaw.', section: 'S1', significance: 'major', kind: 'substantive' },
    { summary: 'Minor slip.', section: 'S2', significance: 'minor', kind: 'substantive' },
  ], 1)
  ledger.setStatus(led, 'I-01', 'valid-fixable', { verdict: 'valid-fixable', close_criterion: 'Scope the claim.' })
  ledger.setStatus(led, 'I-02', 'valid-fixable', { verdict: 'valid-fixable', close_criterion: 'Reword the sentence.' })

  const snapshot = JSON.stringify(led)
  const { fixable, excluded } = ledger.floorFixable(led)
  assert.deepEqual(fixable.map((r) => r.id), ['I-01'])
  assert.deepEqual(excluded, ['I-02'])
  assert.equal(JSON.stringify(led), snapshot)
})

test('CLI set persists --tally as parsed JSON (recall Mode B reads it)', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const { spawnSync } = require('node:child_process')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-tally-'))
  const file = path.join(dir, 'LEDGER.json')
  try {
    const led = ledger.emptyLedger()
    ledger.addIssues(led, [{ summary: 'Major flaw.', section: 'S1', significance: 'major', kind: 'substantive' }], 1)
    ledger.save(file, led)
    const script = path.join(__dirname, '..', 'scripts', 'ledger.js')
    const r = spawnSync(process.execPath, [script, 'set', file, 'I-01', 'valid-fixable',
      '--verdict', 'valid-fixable', '--close_criterion', 'Scope the claim.',
      '--tally', '{"valid":4,"invalid":1,"context_limited":0}', '--escalated', 'false'],
      { encoding: 'utf8' })
    assert.equal(r.status, 0, r.stdout + r.stderr)
    const row = ledger.load(file).issues[0]
    assert.deepEqual(row.tally, { valid: 4, invalid: 1, context_limited: 0 })
    assert.equal(row.escalated, false)

    // a malformed tally shape must fail loud, not store junk the consensus
    // filter would silently read as zero consensus
    const bad = spawnSync(process.execPath, [script, 'set', file, 'I-01', 'valid-fixable',
      '--tally', '"not-an-object"'], { encoding: 'utf8' })
    assert.notEqual(bad.status, 0)
    assert.match(bad.stderr + bad.stdout, /bad tally/)
    assert.deepEqual(ledger.load(file).issues[0].tally, { valid: 4, invalid: 1, context_limited: 0 })
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('display_mode survives save() re-renders across mutations', () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-ledger-'))
  const file = path.join(dir, 'LEDGER.json')
  try {
    const led = mixedLedger()
    led.meta.display_mode = 'collapse'
    ledger.save(file, led)

    const reloaded = ledger.load(file)
    ledger.setStatus(reloaded, 'I-02', 'queued', { reason_code: 'needs-human-input' })
    ledger.save(file, reloaded)

    assert.equal(ledger.load(file).meta.display_mode, 'collapse')
    const md = fs.readFileSync(path.join(dir, 'LEDGER.md'), 'utf8')
    assert.ok(md.includes('## Minor digest'))
    assert.ok(md.includes('- I-02 [queued (needs-human-input)] Method: Awkward phrasing.'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
