// The full docx intake -> round -> rekey chain on one synthesized full-feature
// artifact: extract once, decompose the working md, land a guarded edit, run the
// guards, rekey, and prove the original docx bytes and the untouched passage_ids
// both survive. This is the F1 promise end to end.

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

const fixture = require('./helpers/docx-fixture')
const { decompose, units } = require('../scripts/decompose')
const { compile } = require('../scripts/compile-guard')
const ledgerLib = require('../scripts/ledger')

const SCRIPTS = path.join(__dirname, '..', 'scripts')
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

function run(script, args, stdin) {
  const r = spawnSync(process.execPath, [path.join(SCRIPTS, script), ...args],
    { encoding: 'utf8', input: stdin || undefined })
  let json = null
  try { json = JSON.parse(r.stdout) } catch (e) { /* leave null */ }
  return { status: r.status, json, stdout: r.stdout, stderr: r.stderr }
}

test('docx end-to-end: extract -> decompose -> guarded edit -> guards -> rekey', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'paperjury-e2e-'))
  try {
    const docxBuf = fixture.buildDocx({
      zhHeadings: true, basedOnStyle: true, zoteroField: true, sdtAbstract: true,
      omml: true, mcTextbox: true, revisions: true, mergedTable: true,
      footnote: true, lists: true, hyperlink: true, splitRuns: true, plainBody: true,
    })
    const docx = path.join(dir, 'paper.docx')
    fs.writeFileSync(docx, docxBuf)
    const originalSha = sha(fs.readFileSync(docx))

    // intake: one-time extraction to the working copy
    const ext = run('extract-docx.js', ['extract', docx])
    assert.equal(ext.status, 0, ext.stdout + ext.stderr)
    const working = ext.json.out
    assert.ok(fs.existsSync(working))
    assert.equal(ext.json.original_sha256, originalSha)

    // decompose the working md: heading-derived counter paths, multiple sections
    const before = decompose(fs.readFileSync(working, 'utf8'))
    const sections = new Set(before.map((p) => p.section_path))
    assert.ok(sections.size > 2, 'expected several sections, got ' + [...sections])
    assert.ok([...sections].every((s) => s === 'frontmatter' || /^[0-9.]+$/.test(s)),
      'section paths must be counters, never titles: ' + [...sections])
    const u = units(before)
    assert.ok(u.length > 2)

    // a ledger row on the passage we are about to edit
    const target = before.find((p) => p.text.includes('Plain paragraph one.'))
    assert.ok(target)
    const led = ledgerLib.emptyLedger({ manuscript: working })
    led.meta.working_format = 'markdown'
    led.meta.source_format = 'docx'
    ledgerLib.addIssues(led, [{
      passage_id: target.passage_id,
      section: 'Heading One',
      evidence_anchor: 'Plain paragraph one.',
      summary: 'Opening paragraph too vague.',
      significance: 'major', kind: 'substantive',
    }], 1)
    const ledgerFile = path.join(path.dirname(working), 'LEDGER.json')
    ledgerLib.save(ledgerFile, led)
    const journalFile = path.join(path.dirname(working), 'journal.jsonl')

    // land the edit under --guard-paragraphs (md protocol); it rewrites the
    // paragraph's opening words, so the first-words anchor hash WILL move
    const patch = JSON.stringify({
      issue_id: 'I-01', passage_id: target.passage_id,
      before: 'Plain paragraph one.', after: 'A sharper opening paragraph, edited.',
      close_criterion: 'Opening paragraph states the contribution.', round: 1,
    })
    const ap = run('apply-patch.js', ['apply', working, journalFile, '--guard-paragraphs'], patch)
    assert.equal(ap.status, 0, ap.stdout + ap.stderr)
    assert.equal(ap.json.ok, true)
    assert.ok(fs.readFileSync(working, 'utf8').includes('A sharper opening paragraph, edited.'))

    // guards on the md working copy: honest compiled:null, no false LaTeX majors
    const cg = compile(working)
    assert.equal(cg.mode, 'text')
    assert.equal(cg.compiled, null)
    assert.equal(cg.ok, true)
    const constraints = path.join(dir, 'constraints.json')
    fs.writeFileSync(constraints, JSON.stringify({ venue: 'test', anonymous: true, required_sections: ['Limitations'] }))
    const cc = run('compliance-check.js', [working, constraints])
    assert.ok(cc.json, cc.stdout + cc.stderr)
    assert.ok(Array.isArray(cc.json.skipped_checks) && cc.json.skipped_checks.includes('required_sections'))
    assert.ok(!(cc.json.findings || []).some((f) => f.check === 'required_sections'),
      'a missing \\section on a Markdown copy must not be a finding')

    // round-end rekey: the edited row re-links to its new passage_id
    const rk = run('rekey.js', [working, ledgerFile, journalFile])
    assert.equal(rk.status, 0, rk.stdout + rk.stderr)
    assert.equal(rk.json.ok, true)
    assert.equal(rk.json.unresolved.length, 0)
    assert.equal(rk.json.rekeyed.length, 1)
    assert.equal(rk.json.rekeyed[0].issue_id, 'I-01')
    assert.notEqual(rk.json.rekeyed[0].new_id, rk.json.rekeyed[0].old_id)
    const relinked = ledgerLib.load(ledgerFile).issues[0]
    assert.equal(relinked.passage_id, rk.json.rekeyed[0].new_id)

    // untouched passages keep their ids across the edit
    const after = decompose(fs.readFileSync(working, 'utf8'))
    const afterIds = new Set(after.map((p) => p.passage_id))
    for (const p of before) {
      if (p.passage_id === target.passage_id) continue
      assert.ok(afterIds.has(p.passage_id), 'lost passage_id: ' + p.passage_id)
    }
    assert.ok(afterIds.has(rk.json.rekeyed[0].new_id))

    // the original Word file was never modified by the entire run
    assert.equal(sha(fs.readFileSync(docx)), originalSha)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
