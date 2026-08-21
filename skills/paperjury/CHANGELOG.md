**English** · [中文](CHANGELOG.zh-CN.md)

# Changelog

All notable changes to PaperJury are documented in this file.

## [1.2.1] - 2026-06-12

A promise-vs-implementation audit of every doc against the code (the same gap
class the 1.1.0 significance floor closed). Fixes, in order of weight:

### Fixed

- **`ledger.js set` now persists `--tally`** (JSON-parsed). The protocol says
  "store tally and escalated on the row" and recall Mode B's consensus filter
  reads `tally.valid`, but the CLI's field whitelist silently dropped the flag --
  so the pre-edit consensus spot-check could silently select zero rows. Other
  unknown flags keep today's ignore semantics.
- **meaning-audit seam corrected** in `review-engine-v3.md`: the workflow
  returns `{verdicts, arc}` (the doc said `anchor_verdicts`), and a new SEAM 13
  spells out how the orchestrator enriches `need_audit` anchor ids into the full
  objects the workflow consumes (frozen_text from spine.json, support texts from
  anchor-diff). Following the old wording skipped the frozen-anchor revert gate.
- **Auto compliance guard wired**: `submission-compliance.md` promised that an
  edit pushing past the page limit or breaking anonymization is blocked in auto;
  the loop never invoked the checker. `auto-mode.md` and the EDIT-SAFETY chain
  now run `compliance-check.js --pages <count>` after compile-guard when a
  constraints file exists; a new blocker reverts + queues. No constraints file,
  no guard.
- **Oscillation detection honestly retired**: described across
  `AUTO_MODE_DESIGN.md` as a built deterministic guard, it was never
  implemented. Now annotated as superseded by the clerk re-raise merge + the
  rounds-touched cap + applied-quiescence; the phantom reference in
  `decompose.js`'s header is gone.
- Doc/protocol drift swept: config-template no longer calls auto "DESIGNED, not
  built" (it shipped) and documents `mode: auto` + `intensity`; the v3 persona
  default (runtime assign-reviewers, lenses as fallback) replaces the legacy
  default; `writing-toolkit.md` keys on `valid-fixable` (v3) instead of the v2
  `agreed-to-fix`; `spine.md` documents the bare-array stdin shape spine.js
  actually reads; `ledger-schema.md` re-documents `rounds_touched` (derived from
  the journal, row field reserved) and `drafted_patch` (optional, module API)
  honestly; the clerk header no longer claims `re-trial` rows are carried;
  machine-specific environment facts removed from `submission-compliance.md`;
  "reference style" moved off the deterministic-checks list it never shipped on;
  `AUTO_MODE_DESIGN.md`'s status header records the 2026-06-05 end-to-end run
  and strikes two long-done build tasks; the legacy review-panel workflow's
  reviewer/verifier prompts gain the ISOLATION line hard rule 2 promises.
- Public copy caught up: READMEs document the significance floor + collapsed
  digest view, the full `ledger.js` CLI (incl. `mode`/`floor`), the 1.2.0
  scripts (`extract-docx`, `rekey`), and the `npm run doctor` health check
  (previously documented nowhere); overview.html stops listing the shipped
  plugin marketplace as a TODO and de-LaTeXes the direct-edit card.

## [1.2.0] - 2026-06-12

Word (.docx) and Markdown support, from real user feedback. The LaTeX path is
byte-identical to 1.1.0: default flags and absent options behave exactly as before.

### Added

- **Word (.docx) support via one-time extraction.** New dependency-free
  `scripts/extract-docx.js` converts a `.docx` ONCE into a Markdown working copy
  at `.paper-review/<basename>.md` plus a SEPARATE machine-readable
  `extraction-report.json` (per-feature counters and a char-mass audit, so
  anything dropped or degraded surfaces as a number, never as silent loss; the
  report is never embedded in the working copy). The original Word file is never
  modified; from extraction on, the working copy IS the manuscript for every
  rule and gate. Fail-loud matrix with named reason codes (legacy `.doc` OLE2,
  encrypted / zip64 / unsupported-method zips, UTF-16 `document.xml`, missing
  main part, not-a-zip). Refuses to overwrite an existing working copy without
  `--force`; a changed original (sha256 mismatch vs ledger meta) stops and asks
  instead of silently re-extracting.
- **Markdown as a first-class multi-round format.** `decompose.js` markdown mode
  (counter-based section paths from ATX headings, fence-aware, no `%`-comment
  stripping, so "12% over baseline" stays intact); `compile-guard.js` routes
  non-`.tex` working copies in-script to `compiled:null` plus a markdown lint
  (an honest UNKNOWN, never latexmk on a `.md`); `compliance-check.js` runs only
  its format-neutral subset on Markdown with an explicit `skipped_checks` list
  (no false section-missing majors).
- **Round-end rekey + passage-alias map (both formats).** New `scripts/rekey.js`
  re-links open ledger rows whose `passage_id` no longer resolves after edits
  (via the journaled after-text, else the row's `evidence_anchor`) and maintains
  `.paper-review/passage-aliases.json`, consulted by the `journal.js` cap
  functions. This restores the clerk merge key and the rounds-touched cap after
  edits move first-words anchors; unresolved rekeys are recall-safe and listed.
- **`apply-patch.js --guard-paragraphs` (opt-in).** Rejects a patch whose
  before/after blank-line paragraph counts differ (a paragraph split/merge
  cascades passage ordinals). Mandated by protocol on Markdown working copies;
  default OFF on `.tex` (LaTeX behavior unchanged).
- **Intake format gate.** `SKILL.md`, `docs/AGENT-GUIDE.md`,
  `references/review-engine-v3.md` (new step 0), and the auto-mode pre-loop now
  route every manuscript by format: `.tex` native, `.md`/`.markdown`/`.txt`
  native text path, `.docx` one-time extraction, anything else explicitly
  unsupported with export suggestions. No more silent degradation.

### Fixed

- **Drift-bound doc correction.** `docs/AUTO_MODE_DESIGN.md` and the engine docs
  no longer imply a passage's anchor survives edits: a first-stable-words anchor
  mutates when a paragraph's opening words are edited (and Markdown has no
  `\label`-immune subset). The documented mechanism is now the real one:
  rounds-touched cap + round-end rekey + alias map, failure direction
  recall-safe.
- **`configs/config-template.md` ledger default** corrected from `LEDGER.md` to
  `LEDGER.json` (the JSON is the machine source of truth; the `.md` is a
  rendered view).

### Notes

- Rejected on record (rationale in the `docs/AUTO_MODE_DESIGN.md` changelog):
  extraction-time injected HTML-comment anchors, a hash-window change to the
  anchor scheme, and a pandoc extraction fork (pandoc cannot emit the honesty
  report and yields machine-dependent working copies). Converting your own
  document to `.md` and handing that in directly remains fully supported.

## [1.1.0] - 2026-06-12

The trivia-flood fix (F3), from real user feedback: "阻断 AI 去关注非常细微没有价值的
问题" (stop the AI from chasing tiny, worthless issues). Backward-compatible; no
schema bump, existing ledgers render identically until a mode is set.

### Added

- **The significance floor, now in code.** `node scripts/ledger.js floor
  <ledger.json>` returns `{fixable, excluded}`: the drafter's input is exactly the
  valid-fixable MAJOR rows, and any valid-fixable non-major is excluded with its id
  reported (read-only, never silent). This is the floor `references/auto-mode.md`
  had promised; it is now the normative builder of the drafter's fixable set
  (review-engine-v3.md step 13 / SEAM 4). A polish item escalated to trial is
  promoted to `significance: major` as part of the escalation contract, so a
  later valid-fixable verdict on it passes the floor.
- **Collapsed ledger view.** `LEDGER.json` meta gains an optional `display_mode`
  (`show`|`collapse`; absent = `show`, the previous behavior byte-for-byte). In
  `collapse`, `LEDGER.md` keeps majors as itemized table rows and folds minors
  into a "Minor digest": open/queued minors one compact line each (a pending
  decision is never hidden), terminal minors as per-status count lines, plus a
  never-drop footer. Render-only -- counts, the completion gate, statuses, and
  routing are untouched, and full detail stays in `LEDGER.json`. New commands:
  `node scripts/ledger.js mode <ledger.json> <show|collapse>` and
  `node scripts/ledger.js init ... --display <show|collapse>`. Auto mode
  initializes collapsed; review mode keeps the flat table by default.

### Notes

- The minor/mechanical fixes themselves still happen (the polish track is
  unchanged); the flood is treated at the presentation layer, never by dropping
  work. Issues are never silently dropped.
- `reason_code: batched-nit` remains in the schema as RESERVED: the composite-
  packing design it anticipated was evaluated against real run data and rejected
  (see `docs/AUTO_MODE_DESIGN.md` changelog, 2026-06-12, which also records the
  formal override of the 2026-06-10 design-debate archive's ship recommendation).

## [1.0.0] - 2026-06-10

First stable release, aligned with the Codex port's v1.0.

### Added

- **Soft update reminders.** `scripts/check-update.js` soft-checks stable GitHub
  release tags at PaperJury startup and prints a non-blocking update notice
  (plugin and clone routes). Silent when GitHub is unreachable; disable with
  `PAPERJURY_DISABLE_UPDATE_CHECK=1`.

### Changed

- **Dogfood sample PDFs restored to the repo.** `original_draft.pdf` and
  `revised_draft.pdf` live in `samples/dogfood/` again, so the public repo is
  self-contained; they are no longer distributed as release assets.
- **Version promoted to 1.0.0** across the plugin manifest, marketplace listing,
  package manifest, and `SKILL.md` frontmatter. The `v0.5.0` release and tag are
  superseded by `v1.0.0`.

## [0.5.0] - 2026-06-05

### Added

- **Claude Code plugin packaging.** PaperJury can now be installed as a Claude Code
  plugin from a self-hosted marketplace, alongside the existing clone-as-skill install.
  - `.claude-plugin/plugin.json` — plugin manifest. Declares the skill at the repo
    root (`"skills": ["./"]`, root-as-skill) so `SKILL.md` does not move and the
    plain-skill install keeps working.
  - `.claude-plugin/marketplace.json` — self-hosted marketplace listing this one
    plugin (`source: "./"`).
  - Install: `/plugin marketplace add u7079256/paperjury` then
    `/plugin install paperjury@u7079256`.

### Notes

- This change is additive and non-breaking: `SKILL.md` stays at the repo root and is
  still auto-discovered as a plain skill, so the existing `~/.claude/skills/paperjury`
  install (clone-as-skill) is unaffected.
- The plugin manifest version tracks the skill engine version in `SKILL.md` frontmatter.
- This is the first tracked changelog entry; it documents the packaging change shipped
  on top of the existing 0.5.0 engine, not the full engine history.
