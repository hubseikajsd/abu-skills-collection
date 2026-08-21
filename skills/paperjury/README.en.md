<p align="center">
  <img src="docs/paperjury-mark.png" width="170" alt="PaperJury logo">
</p>

<h1 align="center">PaperJury</h1>

<h2 align="center"><b>Before a reviewer tears it apart, let a jury do it first.</b></h2>

<p align="center">
  <b><i><font size="5">Just tell Claude Code: "review this, especially experiments and claims."</font></i></b>
</p>

<p align="center">
  📄 <b>The paper is on arXiv — read and cite it here.</b> <a href="https://arxiv.org/abs/2606.16322"><i>PaperJury: Due-Process Review for Bounded LaTeX Revision</i></a>
</p>

<p align="center">
  <a href="https://u7079256.github.io/paperjury/overview.html?lang=en">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/overview-card-dark.png">
      <source media="(prefers-color-scheme: light)" srcset="docs/overview-card-light.png">
      <img src="docs/overview-card.png" alt="PaperJury interactive overview" width="100%">
    </picture>
  </a>
</p>

<p align="center">
  <a href="https://arxiv.org/abs/2606.16322"><img alt="arXiv" src="https://img.shields.io/badge/arXiv-2606.16322-b31b1b?logo=arxiv&logoColor=white"></a>
  <a href="https://u7079256.github.io/paperjury/overview.html?lang=en"><img alt="Interactive overview" src="https://img.shields.io/badge/Interactive_Overview-online-d6a14b?logo=githubpages&logoColor=white"></a>
  <a href="samples/dogfood/"><img alt="Dogfood sample" src="https://img.shields.io/badge/Sample-Dogfood-2f7d55"></a>
  <a href="https://github.com/u7079256/paperjury/releases"><img alt="Releases" src="https://img.shields.io/badge/Releases-stable-3b3d47"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
  <a href="https://github.com/u7079256/paperjury"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-paperjury-181717?logo=github"></a>
</p>

<p align="center">
  <a href="README.md">中文</a> · <b>English</b>
</p>

<p align="center">
  <a href="https://u7079256.github.io/paperjury/overview.html?lang=en">🧭 Interactive overview</a> ·
  <a href="docs/showcase/SHOWCASE.md">🏆 Dogfood showcase</a> ·
  <a href="docs/AGENT-GUIDE.md">🧑‍✈️ Agent Guide</a> ·
  <a href="CITATION.bib">📌 BibTeX</a> ·
  <a href="https://github.com/u7079256/paperjury-codex">💻 Codex port</a>
</p>

---

<table>
<tr>
<td width="18%">
<a href="docs/showcase/SHOWCASE.md"><img src="docs/paperjury-mark.png" width="120" alt="PaperJury dogfood showcase"></a>
</td>
<td valign="middle">
<b>🏆 Real dogfood sample</b><br><br>
A full multi-round review on a real draft: the repo ships <b>before/after PDFs</b> plus a <b>human-verified run report</b>. Inspect the sample before handing it your own manuscript.<br><br>
<a href="docs/showcase/SHOWCASE.md"><img src="https://img.shields.io/badge/View_Full_Sample_→-Before_After_Report-d73a49?style=for-the-badge" alt="View full sample"></a>
</td>
</tr>
</table>

---

> [!IMPORTANT]
> PaperJury is a pre-submission self-check workflow. It **does not replace your scientific judgment, and it does not replace peer review.** It should never be used to invent experiments, fabricate results, add unsupported claims, or hide a paper's limitations. When an issue needs a new experiment, missing evidence, private knowledge, or a research-level decision, it routes that issue to the author instead of patching it automatically.

---

## 🔥 News

- 🎉 **RedNote community milestone:** the PaperJury post has reached **30k views** and **1.8k saves**. Thanks for sharing and saving it, and for recommending PaperJury to more friends who are writing and revising papers.
- 📄 **2026-06-15: The PaperJury paper is on arXiv.** Read it here: [*PaperJury: Due-Process Review for Bounded LaTeX Revision*](https://arxiv.org/abs/2606.16322) (arXiv:2606.16322) — the full review → verdict → revise → verify engine written up as a paper: the deterministic-vs-semantic split, contestability routing, the due-process trial, and risk-proportional edit guards.
- 🔔 **2026-06-10: v1.0.0 released.** First stable release, aligned with the Codex port's v1.0. Adds a non-blocking update reminder that points to the latest stable release when a newer tag exists.
- 🚀 **2026-06-05: PaperJury's Codex-first port has shipped.** Open it here: [paperjury-codex](https://github.com/u7079256/paperjury-codex).
- 🧪 **Dogfood sample added:** this repo now includes a compact [dogfood sample](samples/dogfood/) with before/after PDFs and a human-verified run report.

## 📌 Citation

If PaperJury helps your research or writing workflow, cite the arXiv paper:

```bibtex
@misc{wang2026paperjurydueprocessreviewbounded,
  title={PaperJury: Due-Process Review for Bounded LaTeX Revision},
  author={Yiran Wang and Ruixuan An and Biao Wu and Wenhao Wang},
  year={2026},
  eprint={2606.16322},
  archivePrefix={arXiv},
  primaryClass={cs.CL},
  url={https://arxiv.org/abs/2606.16322},
}
```

The same entry is available in [`CITATION.bib`](CITATION.bib).

---

## ⚡ Quick Start

Install inside Claude Code:

```text
/plugin marketplace add u7079256/paperjury
/plugin install paperjury@u7079256
```

Then say what you need inside your paper project:

```text
review this, especially experiments and claims.
```

Or keep it casual:

```text
tighten this introduction paragraph without changing the claim.
```

You do not need to remember modes. PaperJury routes your request to direct-edit, review, or auto, and patches wait for your confirmation before they land.

---

## 🤔 What Is This?

Most writing tools only push your paper forward: they draft and they polish. None of them argues the other side of your claims the way a reviewer will. PaperJury is built around that gap.

Concrete outputs:

| Output | What it contains |
|---|---|
| **📋 Issue ledger** | Evidence, location, verdict, and status for every reviewer-style issue. |
| **🧩 Reviewable patches** | Minimal edits for safe fixes only; risky edits are queued for author judgment. |
| **🛠️ Verification report** | Real LaTeX and formatting checks when the toolchain exists; explicit degradation when it does not. |
| **🧪 Dogfood sample** | [`samples/dogfood/`](samples/dogfood/) includes before/after PDFs and a human-verified run report. |

What makes it different:

| | What it does |
|---|---|
| **⚖️ Adversarial by construction** | N domain reviewers read the whole paper → a contestability router sends the real disputes to a two-sided trial → a jury of 5 deliberates under isolation (escalating to 12 only without a clear majority) → a judge returns one of three verdicts. A verdict can land "no fix" — which a yes-and rewriter structurally cannot return. |
| **🔁 Closed-loop, not forward-only** | Each round is a clean re-review of the edited paper (the panel never sees the prior ledger, so a re-raised issue is corroboration, not anchoring), and a deterministic clerk reconciles every round into one ledger until a clean round surfaces nothing new. Before any edit, fresh skeptics try to revive whatever got wrongly dropped. |
| **🛡️ Guardrails, not autopilot** | Safe fixes land under risk-proportional safety (frozen anchors, a per-passage edit cap, an anchor and cross-section meaning audit), always behind your sign-off. Risky edits are not applied silently; they queue for one human pass. |
| **🛠️ Real compile, not just critique** | It runs an actual LaTeX build on your machine and reports true errors, undefined refs, overfull boxes, and the page count, or degrades honestly to a structural lint when no toolchain is present. Deterministic desk-reject checks catch the classics: anonymization leaks, margin/spacing hacks, documentclass drift, missing required sections, page-limit overflow. |

---

## 🧭 Three Modes

You don't run commands; you say what you want and the skill picks the mode.

| Mode | Trigger | Behavior | Human gate |
|---|---|---|---|
| **✍️ direct-edit** (common) | Describe a change in English or Chinese, edit the manuscript (LaTeX or Markdown) directly. E.g. "polish this paragraph", "tighten this", "turn my note into LaTeX" | No review panel; go straight to drafting the patch through the writing toolkit | Applied after author sign-off |
| **🔎 review** (occasional) | Ask for critique: review / critique / 审稿 / mock-review; scope `full` (whole paper) or `passage` (one section/paragraph/claim) | Runs the courtroom engine (`references/review-engine-v3.md`), surfacing real weaknesses and separating fatal flaws from nits | Sign-off per edit |
| **🔁 auto** (unattended) | **Explicit only:** `/goal` or config `mode: auto` | Establish the `spine` and reviewer assignment up front (human steps), then run multiple rounds under the bounded-aggressive + edit-safety policy until convergence | Up-front sign-off + return queue |

Rule of thumb: **one change → just say it; want it picked apart → say "review"; want it run unattended → `/goal`.**

> [!WARNING]
> **auto is never self-detected; it is explicit only.** There is no runtime signal for it, so it is entered only via a `/goal` context or a project config `mode: auto`. Turning on the "auto" tool-permission and sending a normal prompt runs one round and stops — it does not loop (see [`docs/AGENT-GUIDE.md`](docs/AGENT-GUIDE.md) §3).

---

## 🧪 Sample Run

To see real output, the repo ships a dogfood sample: a full multi-round review on a real draft, with **before/after PDFs** and a **human-verified run report**.

➡️ [`samples/dogfood/`](samples/dogfood/) ([`original_draft.pdf`](samples/dogfood/original_draft.pdf) · [`revised_draft.pdf`](samples/dogfood/revised_draft.pdf) · [run report](samples/dogfood/RUN_REPORT.md))

Make sure it won't get desk-rejected: say "run the submission-readiness / compliance check" and it does deterministic format screening + a compile-driven layout check.

---

## 🚀 Install

It is a Claude Code skill, installable two ways. For the Codex-first port, use [paperjury-codex](https://github.com/u7079256/paperjury-codex).

**Option A: Claude Code plugin (marketplace route).** From inside Claude Code:

```text
/plugin marketplace add u7079256/paperjury
/plugin install paperjury@u7079256
```

**Option B: clone as a skill.** Clone the repo into the folder Claude Code reads skills from:

```bash
# macOS / Linux
git clone https://github.com/u7079256/paperjury ~/.claude/skills/paperjury
```

```powershell
# Windows (PowerShell)
git clone https://github.com/u7079256/paperjury "$env:USERPROFILE\.claude\skills\paperjury"
```

You can also put it under `<project>/.claude/skills/` to scope it to one project. After installing:

- Claude Code auto-discovers it through `SKILL.md` and it shows up as the `paperjury` skill.
- `node` is required (the deterministic checks run on it); a LaTeX toolchain is optional (the real-compile and layout checks use it, and degrade honestly when it is absent).
- Run `npm run doctor` from the skill folder to verify the install: it checks repo integrity, required tools, and that your manuscript can be detected.
- At startup the skill does a soft update check against stable GitHub release tags. If a newer tag exists, it prints how to update (re-run the plugin install, or `git pull` for clone installs); if GitHub is unreachable, it stays silent and continues. Set `PAPERJURY_DISABLE_UPDATE_CHECK=1` to disable it; start a new session after updating.

**For Claude / coding agents:** the deep "how to drive this" reference is [`docs/AGENT-GUIDE.md`](docs/AGENT-GUIDE.md): install, the three modes and their triggers, the engine pipeline, the `auto` vs `/goal` distinction, and how the fan-out launches, written for an agent to read. Curious about the internals? Just point Claude at that file and ask.

---

## FAQ

> **Can PaperJury review a Word (.docx) file?**

Yes. PaperJury converts your .docx to Markdown once, tells you exactly what the conversion kept and what it could not carry over (complex tables, equations), and runs the full multi-round review on that Markdown. Your original Word file is never modified. You get back the edited Markdown plus a list of every change; merging changes back into Word is up to you (e.g. via pandoc). You can also export to .md or .tex yourself and hand that in directly.

---

## Technical details

If you only want to use PaperJury, you can skip this section. If you want the mechanism, source layout, or agent-driving details, start here:

| What you want to inspect | Entry point |
|---|---|
| Real run output | [`samples/dogfood/RUN_REPORT.md`](samples/dogfood/RUN_REPORT.md) |
| How to drive Claude / coding agents | [`docs/AGENT-GUIDE.md`](docs/AGENT-GUIDE.md) |
| Engine design rationale | [`docs/REVIEW_ENGINE_V3_DESIGN.md`](docs/REVIEW_ENGINE_V3_DESIGN.md) |
| Full protocol and ledger state machine | [`references/review-engine-v3.md`](references/review-engine-v3.md) · [`references/ledger-schema.md`](references/ledger-schema.md) |
| Visual overview | [live interactive overview](https://u7079256.github.io/paperjury/overview.html?lang=en) |

<details>
<summary><b>Expand engine, architecture, and repository details</b></summary>

### How the engine works

The engine organizes these stages as a "courtroom": generation is bounded (N holistic domain reviewers, not a per-(unit × lens) flood), adjudication is routed by contestability, edits are guarded by risk, and the multi-round loop converges via a deterministic clerk.

```text
assign-reviewers → reading-check → coverage-auditor → merge
  → { trial ‖ polish } → recall-audit → drafter
  → { edit-audit | meaning-audit } → clerk
```

The deterministic guards in `scripts/` run orchestrator-side via Bash between workflow calls (the Workflow sandbox has no filesystem and no subprocess).

<details>
<summary><b>Deterministic stages (full list)</b></summary>

1. `decompose`: split the manuscript (LaTeX or Markdown) into reading units, the canonical section list, and stable `passage-id`s (which prevent text drift and give jurors local context).
2. `extract-docx.js`: one-time Word (.docx) → Markdown extraction with an honesty report of everything kept or dropped; the original Word file is never modified.
3. `spine` (auto only): extract anchors, author confirm, freeze → `spine.json`.
4. `ledger.js`: JSON ledger plus MD view; gate = `/goal` completion fact (0 gate-blocking active major; author-required is gate-OK and accumulates to the human queue). `floor` is the significance floor (only major, fix-worthy findings reach the auto editor); `mode <ledger> collapse` folds minor findings into a digest (full detail always kept in the JSON).
5. `journal.js`: append-only per-edit revert log (JSONL).
6. `apply-patch.js`: atomic apply plus journal of a drafted patch, and revert (exact-once guard on `before` text).
7. `anchor-diff.js`: locate frozen anchors; flag which `need_audit` when the support region changed.
8. `cross-ref.js`: edit-safety risk pre-filter: does a changed salient token in a patch appear in other passages?
9. `rekey.js`: round-end re-link of open findings whose passage moved after edits.
10. `compile-guard.js`: real LaTeX compile (latexmk/pdflatex) or a degraded structural-lint path with `compiled:null`.
11. `compliance-check.js`: submission-readiness A: deterministic desk-reject screening.
12. `doctor.js`: install/repo health check (`npm run doctor`).

</details>

<details>
<summary><b>Semantic stages (full list)</b></summary>

1. `assign-reviewers`: name N subfields, instantiate N domain reviewers from the project gatekeeper core + a generated domain overlay.
2. `reading-check`: N holistic reviewers each read the WHOLE paper once → weaknesses (significance + kind + verbatim quote; a reviewer that cannot quote the source did not read it) + one overall_confidence + a per-section coverage report; targeted re-invoke mode for anti-skim.
3. `coverage-auditor`: anti-skim L2: flag skimmed (reviewer, section) pairs across the coverage reports.
4. `merge`: semantic dedup across reviewers; the workflow derives significance (MAX) / kind (substantive-dominates) / corroboration deterministically.
5. `trial`: a 5-juror trial tier: whole-paper defense → independent local-context jury (with on-demand context expansion) → a deterministic majority verdict + a judge that routes a decided-valid charge (valid-fixable vs author-required); escalate to a 12-juror tier only on no clear majority.
6. `polish`: the track that skips the jury: batch copy-edit (mechanical) + batch light-check (minor-substantive); can escalate a misrouted major back to trial.
7. `recall-audit`: Mode A revives wrongly-dropped charges (bias to revive); Mode B spot-checks strong-consensus majors before the edit.
8. `drafter`: minimal-edit patch for valid-fixable charges.
9. `edit-audit` / `meaning-audit`: `edit-audit` checks a risky non-anchor edit (make-sense + cross-section alignment); `meaning-audit` is the four-state frozen-anchor + arc audit.
10. `clerk`: the round boundary: reconcile carried open-questions against this round's edits, dedup re-raises, and emit the deterministic convergence counts.

Also present: `review-panel.workflow.js`, a quick 3-lens panel (fast path).

</details>

<details>
<summary><b>The three primitives: Skill + Workflow + Memory</b></summary>

1. **Skill (entry point + methodology):** the protocol, reviewer assignment, the consensus gate, the writing toolkit, the human gates. Detail in `references/review-engine-v3.md`, `references/reviewer-personas.md`, `references/writing-toolkit.md`.
2. **Workflow (fan-out engine):** the semantic, no-human-in-the-middle steps run as Workflows (parallelism plus schema-validated output). The deterministic guards run orchestrator-side via Bash because the Workflow sandbox has no fs.
3. **Memory (durable state + learned conventions):**
   - **Ledger**: `LEDGER.json` resolved at runtime = the machine source of truth, plus a rendered `LEDGER.md` view; managed by `scripts/ledger.js`. The live, mutable issue state across rounds and sessions.
   - **Claude memory**: the active project's memory — stable conventions worth recalling next session (this paper's house style, venue, persona tuning).

**Reviewers** are N domain-expert holistic reviewers (default 3, range 2-4), assigned at runtime to the paper's subfields, all sharing a senior-reviewer gatekeeper core (harsh, precise, constructive; separate fatal flaws from fixable nits; reason across sections). When a slot cannot be confirmed (headless) it degrades to a generic gatekeeper (one bad slot never degrades the whole panel); the generic fallback lenses are Theory / Foundations, Empirical / Benchmark, and Applied / Systems (an unordered tendency, not fixed slots).

</details>

<details>
<summary><b>The six hard rules</b></summary>

1. **Never edit the manuscript without explicit author sign-off.** Auto-mode carve-out: the rule HOLDS; auto satisfies it via up-front sign-off (the `spine` + reviewer-assignment confirmation plus the pre-authorized bounded-aggressive policy) plus the return queue, not per-edit sign-off.
2. **Reviewers / jurors are isolated.** Fresh eyes per round: no cross-talk, no prior-round leakage, no sight of the `ledger`. Enforced by what goes into each agent's prompt AND an explicit ISOLATION instruction in every reviewer-type prompt.
3. **Every valid-fixable issue carries a `close_criterion`** (one concrete sentence describing what an edit must satisfy), set by the judge.
4. **No leakage into the reviewed text.** Revision logs, back-translations, and self-check verdicts are author-side aids; they never enter the manuscript or any frozen snapshot.
5. **Disagreement resolves through discussion, then override (logged), never a silent dismissal.**
6. **No hardcoded paths or project files in the skill.** Resolve at runtime.

</details>

---

## Architecture & privacy

- The Workflow sandbox has no filesystem and no subprocess; that is why all deterministic guards run orchestrator-side via Bash between workflow calls.
- `compile-guard.js` is explicit about what it cannot verify: when it cannot truly compile, it degrades to structural lint and reports `compiled:null`.
- Submission-readiness is cross-mode, two parts: **A** = `compliance-check.js` plus a semantic agent; **B** = a compile-driven layout loop reusing `compile-guard.js` plus Read-on-PDF.

> [!NOTE]
> Your project files, ledger, journal, and patches stay inside your local paper project. PaperJury has no backend or server of its own, so nothing is sent to a PaperJury server. The review runs through your own Claude Code session, which means the model itself runs in the cloud: how your content is handled there follows the terms and settings of that Claude Code environment, not anything PaperJury adds on top.

## Project structure

| Path | Purpose |
|---|---|
| `.claude-plugin/` | Claude Code marketplace packaging metadata. |
| `workflows/` | Semantic stages: reviewer assignment, coverage, merge, trial, recall audit, drafting, and convergence. |
| `scripts/` | Deterministic guards: ledger, journal, apply-patch, anchor-diff, cross-ref, compile-guard, doctor, and related checks. |
| `references/` | Engine protocol, ledger schema, reviewer personas, writing toolkit, and methodology notes. |
| `docs/` | Design notes, interactive overview, arXiv paper PDF, and agent driving guide. |
| `samples/dogfood/` | Before/after PDFs and a human-verified run report from a real dogfood run. |
| `tests/` | Tests for deterministic scripts and core state-machine behavior. |

---

</details>

## Roadmap

Where this is going (planned unless checked):

- [x] 🔔 **Soft update reminders.** Check for newer stable release tags at startup and show a non-blocking update notice.
- [ ] **Fast mode / quick version.** A lower-latency, lower-token path for fast triage when you want useful triage more than full courtroom depth.
- [ ] **Reviewer personas tuned to each venue community's taste.** CVPR, ACL, and NeurIPS reviewers do not critique the same way; the goal is a reviewer that carries each community's expectations.
- [ ] **Vision-based layout verification**: compile, render, and check the visual layout (column overflow, figure placement), not just the compile log.
- [ ] **Automatic venue detection** from your `.cls` / template.
- [ ] **Validation of the engine on real papers at scale.**

<details>
<summary><b>More file and path references</b></summary>

- Engine protocol: `references/review-engine-v3.md`
- Auto protocol: `references/auto-mode.md`
- Personas / writing toolkit / methodology: `references/reviewer-personas.md`, `references/writing-toolkit.md`, `references/methodology.md`
- Ledger schema + status machine: `references/ledger-schema.md`
- Submission compliance: `references/submission-compliance.md`
- Design rationale: `docs/REVIEW_ENGINE_V3_DESIGN.md`
- Scripts dir: `scripts/` (decompose, extract-docx, ledger, journal, apply-patch, anchor-diff, cross-ref, spine, rekey, compile-guard, compliance-check, doctor)
- Workflows dir: `workflows/` (assign-reviewers, reading-check, coverage-auditor, merge, trial, polish, recall-audit, drafter, edit-audit, meaning-audit, clerk, review-panel)

</details>

**Learn more:** [`docs/AGENT-GUIDE.md`](docs/AGENT-GUIDE.md) (driving guide) · [`docs/REVIEW_ENGINE_V3_DESIGN.md`](docs/REVIEW_ENGINE_V3_DESIGN.md) (design rationale) · [live interactive overview](https://u7079256.github.io/paperjury/overview.html?lang=en)

---

## Credits

The spine and anti-drift design (the anchor logic-transfer audit, the claim register, and the minimal-edit, intent-preserving revision policy) is inspired by [PaperSpine](https://github.com/WUBING2023/PaperSpine), a motivation-driven paper drafting and rewriting skill. PaperSpine is a forward generate/rewrite tool with no adversarial loop; PaperJury borrows its anchoring idea and its "deterministic scripts for checkable steps, model agents for judgment" mechanism, then adds the adversarial courtroom review engine on top.

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=u7079256/paperjury&type=Date)](https://www.star-history.com/#u7079256/paperjury&Date)
