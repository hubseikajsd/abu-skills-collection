#!/usr/bin/env node
// rekey.js -- round-end passage_id re-link for the paperjury. A first-words
// anchor mutates when an edit rewrites a paragraph's opening words (either
// format), and an authorized paragraph add/remove shifts later ordinals; both
// break the clerk merge key and the journal rounds-touched cap. After a round's
// edits land, this re-runs decompose on the post-edit working file and re-locates
// every open (non-terminal) ledger row whose passage_id no longer resolves, by
// normalized containment (the same whitespace-collapse as spine.js) of either the
// journaled after-text of the row's most recent edit (the row WAS edited) or the
// row's evidence_anchor (the row was cascaded by a neighboring edit). Exactly ONE
// match -> the row's passage_id is updated in place and old->new recorded in the
// alias map that journal.js cap functions consult (chains flattened on write: any
// alias already pointing at the old id is re-pointed to the new one). 0 or >1
// matches -> the row is left untouched and listed as unresolved; that residual is
// recall-safe (worst case a duplicate genuinely_new row, bounded by max_rounds).
// journal.jsonl is NEVER rewritten -- it is the append-only audit trail.
//
// CLI:
//   node rekey.js <working-file> <ledger.json> <journal.jsonl>
//                 [--aliases <path>] [--round N] [--dry-run]
// --aliases defaults to passage-aliases.json next to the ledger. --round N
// restricts the journal after-text lookup to entries with round <= N (absent =
// whole journal). --dry-run computes and prints but writes nothing. Ledger +
// alias map are written only when at least one row was rekeyed.
// stdout: { ok, rekeyed: [{issue_id, old_id, new_id}],
//           unresolved: [{issue_id, old_id, matches}], aliases_file }

'use strict'
const fs = require('fs')
const path = require('path')
const { decompose } = require('./decompose')
const ledgerLib = require('./ledger')
const journal = require('./journal')

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// After-text of the most recent journal entry for this issue (reverts included:
// the latest entry's `after` is what the file holds now). Empty after-text counts
// as no entry so the caller falls back to the row's evidence_anchor.
function latestAfterText(entries, issueId, roundMax) {
  let found = null
  for (const e of entries) {
    if (e.issue_id !== issueId) continue
    // under --round N, a round-less entry (apply-patch reverts carry no round)
    // is OUTSIDE the replay window and must not become the anchor
    if (roundMax != null && (e.round == null || e.round > roundMax)) continue
    found = e
  }
  return found && norm(found.after) ? found.after : null
}

function rekey(workingFile, ledgerFile, journalFile, opts = {}) {
  if (!fs.existsSync(workingFile)) throw new Error('working file not found: ' + workingFile)
  if (!fs.existsSync(ledgerFile)) throw new Error('ledger not found: ' + ledgerFile)
  // extname-driven, like the rest of the pipeline: the content sniff could
  // mis-read a markdown working copy that QUOTES LaTeX (>= 2 \section strings)
  const format = path.extname(workingFile).toLowerCase() === '.tex' ? 'latex' : 'markdown'
  const fresh = decompose(fs.readFileSync(workingFile, 'utf8'), { format })
  const freshIds = new Set(fresh.map((p) => p.passage_id))
  const led = ledgerLib.load(ledgerFile)
  const entries = journal.readEntries(journalFile)
  const aliasesFile = opts.aliases || path.join(path.dirname(path.resolve(ledgerFile)), 'passage-aliases.json')
  const aliases = fs.existsSync(aliasesFile) ? JSON.parse(fs.readFileSync(aliasesFile, 'utf8')) : {}

  const rekeyed = []
  const unresolved = []
  for (const row of led.issues) {
    if (ledgerLib.TERMINAL.has(row.status)) continue
    if (!row.passage_id || freshIds.has(row.passage_id)) continue
    const anchorText = latestAfterText(entries, row.id, opts.round) || row.evidence_anchor
    const na = norm(anchorText)
    const candidates = na ? fresh.filter((p) => norm(p.text).includes(na)) : []
    if (candidates.length === 1) {
      const oldId = row.passage_id
      const newId = candidates[0].passage_id
      row.passage_id = newId
      for (const k of Object.keys(aliases)) if (aliases[k] === oldId) aliases[k] = newId
      aliases[oldId] = newId
      rekeyed.push({ issue_id: row.id, old_id: oldId, new_id: newId })
    } else {
      unresolved.push({ issue_id: row.id, old_id: row.passage_id, matches: candidates.length })
    }
  }
  if (!opts.dryRun && rekeyed.length) {
    ledgerLib.save(ledgerFile, led)
    fs.writeFileSync(aliasesFile, JSON.stringify(aliases, null, 2) + '\n', 'utf8')
  }
  return { rekeyed, unresolved, aliases_file: aliasesFile }
}

// ---- CLI ------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const pos = []
  const opts = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--aliases') { opts.aliases = args[i + 1]; i++ }
    else if (args[i] === '--round') { opts.round = parseInt(args[i + 1], 10); i++ }
    else if (args[i] === '--dry-run') opts.dryRun = true
    else pos.push(args[i])
  }
  const [workingFile, ledgerFile, journalFile] = pos
  if (!workingFile || !ledgerFile || !journalFile) {
    console.error('usage: node rekey.js <working-file> <ledger.json> <journal.jsonl> [--aliases <path>] [--round N] [--dry-run]')
    process.exit(2)
  }
  if ('round' in opts && !Number.isInteger(opts.round)) {
    console.error('--round expects an integer; got: ' + opts.round)
    console.error('usage: node rekey.js <working-file> <ledger.json> <journal.jsonl> [--aliases <path>] [--round N] [--dry-run]')
    process.exit(2)
  }
  try {
    const res = rekey(workingFile, ledgerFile, journalFile, opts)
    console.log(JSON.stringify({ ok: true, ...res }))
  } catch (e) {
    console.log(JSON.stringify({ ok: false, reason: e.message }))
    process.exit(1)
  }
}

if (require.main === module) main()

module.exports = { rekey, latestAfterText, norm }
