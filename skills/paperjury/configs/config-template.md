# Config template (optional, project-owned)

This skill ships NO config of its own and NO hardcoded paths. It resolves every
input at runtime (discovery, then ask) per the "Resolving inputs at runtime"
section of `SKILL.md`.

A project that wants to pin its inputs (so it does not get asked every session)
MAY drop a config like the one below in ITS OWN repo, for example at
`<project>/.paper-review/config.yaml`. The skill reads it if present and falls
back to discovery/ask for anything missing. This file is owned by the project,
not by the skill.

All values below are PLACEHOLDERS. Do not commit real paths into the skill.

```yaml
# <project>/.paper-review/config.yaml  -- example shape, fill in per project

target:
  manuscript: <path to the main .tex, .md, or .docx>  # .docx is extracted once to .paper-review/<name>.md; the working copy becomes the manuscript
  mode: full                                # full | passage | auto  (auto = the unattended loop, see references/auto-mode.md; needs /goal as the driver)
  intensity: standard                       # light | standard | thorough  (auto dials, see references/review-engine-v3.md "Intensity -> args")
  passage_anchor: <section/paragraph/claim> # only when mode = passage

venue_family: <vision | nlp | ml>           # else: infer from the class/template / ask

author: <who signs off on edits>            # every edit needs explicit authorization

personas:                                   # else: assign-reviewers names N domain reviewers at runtime (v3 default); the 3 generic lenses below are only the per-slot DEGRADE fallback
  - { id: R1, lensName: Theory / Foundations, agentType: <optional named subagent> }   # pinning a slot here skips the runtime assignment for it
  - { id: R2, lensName: Empirical / Benchmark, agentType: <optional> }
  - { id: R3, lensName: Applied / Systems,     agentType: <optional> }

style_profile: |                            # else: the venue-family default, refined from memory
  <house rules: plain prose, em-dash policy, caption convention, tense, etc.>

ledger: <path to LEDGER.json>               # else: <manuscript-dir>/.paper-review/LEDGER.json

writing_toolkit:                            # which drafting prompts to enable (see references/writing-toolkit.md)
  enabled: [translate-to-english, polish-english, de-ai, compress, expand, caption, experiment-analysis, logic-check]
```

## Discovery defaults (when no config is present)

- manuscript: routed by extension (the intake format gate, per `SKILL.md`
  "Resolving inputs"). `.tex`: the file containing `\documentclass` /
  `\begin{document}`; if several, ask. `.md` / `.markdown` / `.txt`: the native
  text path (compile checks not applicable; LaTeX-only compliance checks skipped).
  `.docx`: extracted ONCE by `scripts/extract-docx.js` to
  `.paper-review/<name>.md`; the working copy becomes the manuscript and the
  original Word file is never modified (an existing working copy + ledger are
  reused, never re-extracted). Anything else: explicitly unsupported; ask for a
  `.docx` / `.md` / `.tex` export.
- venue_family: infer from the style/class file or content; if unclear, ask.
- ledger: `<manuscript-dir>/.paper-review/LEDGER.json` (create if absent).
- author: the current user (confirm before the first edit).
- personas: assigned at runtime by `assign-reviewers` (N domain reviewers from the
  manuscript's subfields); the three generic lenses are only the per-slot degrade
  fallback when a slot cannot be confirmed. A config entry pins a slot; `agentType`
  pins a named reviewer subagent.
- style_profile: the venue-family default from `references/reviewer-personas.md`,
  refined by any conventions recalled from memory.
