# Auto mode -- the operational protocol (BUILT)

Auto = the review-engine v3 loop run UNATTENDED toward a verifiable goal, applying safe
fixes without per-edit sign-off and queueing the risky ones, across multiple rounds
(一审 -> ... -> n审 -> 终审) until a deterministic clerk convergence. Design rationale:
`docs/AUTO_MODE_DESIGN.md` + `docs/REVIEW_ENGINE_V3_DESIGN.md`. Engine round + all seam
contracts: `references/review-engine-v3.md` (auto variant). This file is the auto checklist.

## Entry (explicit only)
Auto never self-detects headless (no runtime signal). Opt in via `/goal` context or a
project config `mode: auto`. Permissions must be pre-approved out of band (settings /
`--permission-mode`). `/goal` is the real driver: a verifiable completion condition + an
independent Haiku evaluator + multi-turn auto-continue.

## The up-front human steps (pre-loop only)
The up-front steps, all BEFORE the unattended loop (AskUserQuestion is dead headless):
0. **Intake / format gate** (once, per SKILL.md "Resolving inputs"): route the manuscript
   by format. For a `.docx`, the one-time extraction (`scripts/extract-docx.js`) and the
   working-copy announcement (the original Word file is never modified; all rounds run on
   `.paper-review/<basename>.md`) are part of the up-front sign-off envelope: a headless
   run must never start on an unconfirmed docx intake. An existing working copy + ledger
   are REUSED, never re-extracted. Nonzero tracked-change counts in the extraction report
   seed a round-1 author-required ledger row ("manuscript contains unresolved tracked
   changes; accepted-all for review").
1. **Spine** (`references/spine.md`): extract draft anchors, the author confirms,
   `spine.js freeze`. Everything after runs against the frozen partial spine.
2. **Reviewer assignment** (assign-reviewers): the author confirms the N assigned domains,
   or pins them via config. Headless without confirmation, the verifier degrades an
   unconfirmable slot to a generic gatekeeper (never blocks).
There is NO live ask during the run; every later human gate becomes a queue entry.

## The bounded-aggressive apply rule + edit-safety
> Auto-apply a fix IFF: (a) it addresses a major (or a polish item), (b) it satisfies the
> issue's close_criterion, (c) the edit-safety guard passes, (d) the passage is within its
> rounds-touched cap, and (e) it does NOT edit a spine anchor sentence. Otherwise, QUEUE it.

EDIT-SAFETY (review-engine-v3.md §3.8) is the risk-proportional generalization of v2's
spine/meaning-audit. A deterministic pre-filter (`anchor-diff` + `cross-ref`) classifies
each drafted patch:
- **LOW** (no anchor flagged, no cross-ref hit, compiles) -> apply under
  `compile-guard` + journal; batchable.
- **RISKY anchor** -> `meaning-audit` (four-state + arc); any verdict != `holds` -> revert + queue.
- **RISKY non-anchor** -> `edit-audit` (make-sense + cross-section alignment); `drift` -> revert + queue.

Aggressive on LOW fixes so auto does real work; hard-bounded by the spine + edit-safety +
rounds-touched cap + the minimal-edit drafter so the core cannot drift. Always queued:
anchor-touching, drift, compile-failed, needs-data (author-required), passages at their cap,
and (review) the whole polish track as an author checklist.

**Deterministic envelope checks (script, not model).** Before drafting, the orchestrator
runs `node ledger.js floor <ledger.json>` and feeds ONLY `.fixable` (the valid-fixable
MAJORS) to the drafter -- the significance floor, deterministic and auditable; `.excluded`
ids are logged, never silently dropped. Before applying, it runs `node journal.js
within-cap <journal> <passage_id>` (rounds-touched cap). When the project has a
template-constraints file: one baseline `node scripts/compliance-check.js <working>
<constraints.json>` run at round start records the pre-existing blockers; after each
applied edit the checker re-runs (`--pages <page_count>` only when compile-guard
returned a real count) and a blocker NOT in the baseline -> revert + queue, same as a
failed compile; page limit and anonymization are HARD, never traded for a content fix
(submission-compliance.md). These make the safety envelope
auditable without trusting the model's bookkeeping (the D5 mitigation).

**Presentation floor (the trivia-flood fix, F3).** Auto initializes the ledger with
`--display collapse`: minors render as a single "Minor digest" section of `LEDGER.md`
(open/queued items enumerated one line each, terminal items counted); the majors table
stays itemized. Render-only -- counts, the gate, statuses, and routing are unaffected,
and full detail remains in `LEDGER.json` (never-drop). Flip the view anytime:
`node ledger.js mode <ledger.json> show`.

## The round loop (under /goal)
Each round runs the v3 sequence (`review-engine-v3.md`) in the AUTO variant:
assign `[WF]` -> reading-check `[WF]` -> anti-skim (L1 det + coverage-auditor `[WF]` + L3) ->
merge `[WF]` -> route `[det]` -> trial `[WF]` (+ escalate) || polish `[WF]` -> recall `[WF]` ->
drafter `[WF]` -> apply + edit-safety `[det+WF]` -> clerk `[WF]`. The orchestrator hosts a
SEQUENCE of invocations (1000-agent cap per invocation; batch each under ~600; phase-bounded).

## Termination (stop on the first)
- **Clerk CONVERGENCE (primary, deterministic):** `genuinely_new_count == 0 &&
  new_closures_count == 0 && new_author_required_count == 0`. A clean re-review that surfaces
  nothing new, closes nothing carried, and raises no new author-required question = goal reached.
- **Applied-quiescence backstop:** K consecutive rounds with 0 applied edits (K = dryStop by
  intensity). Catches an oscillation where edits dried up but the predicate will not both-zero.
- **Hard limits:** `max_rounds` (intensity) / optional wall-clock / AFK ceiling H hours. On a
  hard stop with majors still active, flip them to `queued` so the gate winds down clean.

`author-required` ACCUMULATES across rounds (the clerk carries it; it is gate-OK), handled by
the human in one pass at 终审. The queue may still grow; that is expected and is NOT a
termination requirement (an adversarial fresh panel can always queue one more thing).

## /goal completion condition (deterministic)
`node ledger.js gate <ledger.json>` -> PASS iff 0 GATE-BLOCKING active major (author-required /
queued / dropped / closed are gate-OK), with the ledger written THIS turn. `node ledger.js
unadjudicated` must also be empty (no active major lacking a verdict). The Haiku evaluator checks
these deterministic ledger facts; it does not re-run the semantic audits. The orchestrator only
lets the gate read true AFTER a full round's ledger update, never mid-flight.

## Queue lifecycle (managed, never silently dropped)
- **Dedup-at-enqueue / clerk merge**: a re-raise of a carried item is merged (corroboration++,
  raised_by union, keep the wiser framing); the re-raise row is `withdrawn` (merged into <id>).
- **Wind-down reconciliation (once, vs the FINAL text)**: for each open queue entry resolve its
  passage-id, check it is still live (mooted -> dropped with a logged reason), test the drafted
  patch still applies (re-draft if not), re-tag significance, final dedup. Bucket: live /
  dropped-with-reason / re-drafted. NEVER auto-applies; the human signs off survivors.
- **Iron rule**: never silently drop a queued item (`ledger.js set ... dropped` enforces a reason).

## What comes back (one human pass at 终审)
- **Applied**: the meaning-preserved fixes that landed (each revertable via the journal).
- **Queue (reconciled)**: live / dropped-with-reason / re-drafted, ready to approve/reject.
  In the collapsed view, queued MAJORS stay itemized table rows; queued minors return as the
  enumerated lines of the Minor digest (every pending decision visible, just compact).
- **author-required (accumulated)**: the charges needing new data / author judgment.
- **Drift report**: each anchor before vs after + the meaning/edit-audit verdicts, so the author
  confirms the core did not move.
- **On a Word intake (extracted working copy)**: the edited working `.md` (full path), a
  human-readable per-edit change list rendered from `journal.jsonl`, the extraction report
  (what the conversion kept and what it dropped or degraded), and the note that the
  original Word file was never touched. Unresolved tracked changes surface as the
  round-1 author-required row from intake.

## SKILL.md hard-rule-1 carve-out
Hard rule 1 ("never edit the manuscript without explicit author sign-off") HOLDS in auto: it is
satisfied by UP-FRONT sign-off (the spine + assignment confirmation + the pre-authorized
bounded-aggressive policy) plus the return queue, not per-edit sign-off. Nothing outside the
envelope is ever applied.
