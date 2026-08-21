#!/usr/bin/env node
// Interactive release helper. The "one button" path for cutting new releases.
//
//   node scripts/release/cut-release.mjs               # interactive
//   node scripts/release/cut-release.mjs --dry-run     # show plan, do nothing
//   node scripts/release/cut-release.mjs \             # non-interactive
//     --skill web-design-engineer --bump minor \
//     --skill gpt-image-2 --bump patch
//
// What it does, in order:
//   1. Sanity-checks: on default branch, clean tree, in sync with origin.
//   2. For each skill, finds its last release tag and lists commits since.
//      Skills with no new commits (and that already have a tag) are filtered
//      out — initial releases are always offered.
//   3. Prompts for a bump kind (patch / minor / major / skip) per candidate.
//   4. Shows a summary, asks one final confirmation.
//   5. Bumps every chosen manifest, runs update-readme.mjs, commits the
//      bump + README sync as one commit, creates all tags, pushes the commit
//      and tags atomically (single `git push`), so CI sees a consistent state.
//   6. Prints the Actions URL so you can watch the rest happen.
//
// The release-skill workflow takes over from here: it builds zips, creates
// GitHub Releases, and re-syncs README links.

import { writeFile, readFile } from "node:fs/promises";
import readline from "node:readline/promises";
import { stdin, stdout, exit, env, argv } from "node:process";
import {
  REPO_ROOT,
  loadAllManifests,
  validateManifest,
  validateSkillStructure,
  buildTag,
  parseTag,
  bumpVersion,
  compareSemver,
  lastTagFor,
  commitsSince,
  git,
  gitOk,
} from "./lib/skills.mjs";

const KIND_LABEL = { patch: "patch", minor: "minor", major: "major" };
const DEFAULT_BRANCH = env.RELEASE_BRANCH || "main";

// ----- args ---------------------------------------------------------------

function parseArgs(av) {
  const out = { dryRun: false, yes: false, perSkill: {}, branch: DEFAULT_BRANCH };
  for (let i = 2; i < av.length; i++) {
    const a = av[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--branch") out.branch = av[++i];
    else if (a === "--skill") {
      const name = av[++i];
      const next = av[i + 1];
      let kind;
      if (next === "--bump") {
        i += 2;
        kind = av[i];
      } else {
        throw new Error(`--skill ${name} must be followed by --bump <kind>`);
      }
      if (!KIND_LABEL[kind]) {
        throw new Error(`--bump must be patch / minor / major (got "${kind}")`);
      }
      out.perSkill[name] = kind;
    } else if (a === "--bump") {
      // --bump without a preceding --skill is an error.
      throw new Error(`--bump must follow --skill <name>`);
    } else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return out;
}

function help() {
  console.log(`Cut a new release.

  node scripts/release/cut-release.mjs               # interactive
  node scripts/release/cut-release.mjs --dry-run     # plan only, no writes
  node scripts/release/cut-release.mjs --yes         # skip the final confirm

Non-interactive (CI / scripted):
  node scripts/release/cut-release.mjs \\
    --skill web-design-engineer --bump minor \\
    --skill gpt-image-2 --bump patch \\
    --yes

Options:
  --skill <name> --bump <patch|minor|major>    Pre-pick a bump for one skill.
  --branch <name>                              Default: main (env RELEASE_BRANCH).
  --dry-run                                    Show plan, do not write or push.
  --yes / -y                                   Skip the final "proceed?" prompt.
`);
}

// ----- pretty printing ----------------------------------------------------

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m",
  cyan: "\x1b[36m", gray: "\x1b[90m",
};
const c = (color, s) => (stdout.isTTY ? `${C[color]}${s}${C.reset}` : s);

// ----- sanity checks ------------------------------------------------------

// Files that MUST exist at HEAD for the tag-triggered Release workflow to
// succeed. GitHub uses the workflow file from the *tag's commit*, not from
// main HEAD. So if HEAD is missing any of these, the tag we're about to
// create will point at a commit that "can't release itself".
const REQUIRED_AT_HEAD = [
  ".github/workflows/release-skill.yml",
  "package.json",
  "scripts/release/pack-skill.mjs",
  "scripts/release/update-readme.mjs",
];

function preflight(branch, { strict }) {
  const issue = (msg) => (strict ? fail(msg) : console.warn(c("yellow", `warn: ${msg}`)));

  if (!gitOk(["rev-parse", "--is-inside-work-tree"])) {
    fail("Not inside a git repository.");
  }
  const current = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  if (current !== branch) {
    issue(`You're on branch "${current}", not "${branch}". Switch first, or pass --branch ${current}.`);
  }
  const dirty = git(["status", "--porcelain"]);
  if (dirty) {
    if (strict) {
      console.error(c("red", "Working tree is not clean:"));
      console.error(dirty);
      fail("Commit or stash your changes before releasing.");
    } else {
      console.warn(c("yellow", `warn: working tree is not clean (${dirty.split("\n").length} file(s)) — would block a real release.`));
    }
  }
  // Refresh remote refs (no-fail in offline scenarios — warn instead).
  try {
    git(["fetch", "origin", branch, "--tags", "--quiet"]);
  } catch {
    console.warn(c("yellow", "warn: git fetch failed — proceeding with local refs only."));
  }
  const behind = gitOk(["rev-list", "--count", `HEAD..origin/${branch}`])
    ? Number(git(["rev-list", "--count", `HEAD..origin/${branch}`]))
    : 0;
  if (behind > 0) {
    issue(`Local "${branch}" is ${behind} commit(s) behind origin/${branch}. Run \`git pull\` first.`);
  }

  // Verify HEAD carries the full release toolchain. Without these, any tag
  // we create here would trigger a workflow run that fails immediately.
  const missing = REQUIRED_AT_HEAD.filter((p) => !gitOk(["cat-file", "-e", `HEAD:${p}`]));
  if (missing.length) {
    issue(
      `HEAD is missing release infrastructure required for tags to build:\n  - ${missing.join(
        "\n  - ",
      )}\nCommit and push these (or rebase the tag onto a commit that has them) before tagging.`,
    );
  }
}

function fail(msg) {
  console.error(c("red", `error: ${msg}`));
  exit(1);
}

// ----- candidate detection ------------------------------------------------

async function buildPlan(args) {
  const all = await loadAllManifests();
  const candidates = [];
  for (const s of all) {
    const errs = [
      ...validateManifest(s.manifest, s.name),
      ...(await validateSkillStructure(s.dir, s.name)),
    ];
    if (errs.length) {
      fail(`${s.name}: manifest / structure invalid:\n  - ${errs.join("\n  - ")}`);
    }
    const lastTag = lastTagFor(s.name);
    const commits = commitsSince(lastTag, s.name);
    const publishedVersion = lastTag ? parseTag(lastTag)?.version ?? null : null;
    const manifestVersion = s.manifest.version;

    // The manifest can legitimately sit ahead of the last published tag:
    // a contributor may have bumped manifest.version by hand and committed
    // it before running release. In that case we must NOT bump again — we
    // ship exactly the version they wrote into the manifest.
    let manifestState = "synced";
    if (publishedVersion) {
      const cmp = compareSemver(manifestVersion, publishedVersion);
      if (cmp > 0) manifestState = "ahead";
      else if (cmp < 0) manifestState = "behind";
    }

    candidates.push({
      name: s.name,
      manifestPath: s.manifestPath,
      manifest: s.manifest,
      currentVersion: manifestVersion,
      publishedVersion,
      manifestState, // "synced" | "ahead" | "behind"
      lastTag,
      commits,
      isInitial: lastTag === null,
    });
  }
  return candidates;
}

// ----- prompting ----------------------------------------------------------

async function decideBumps(candidates, args) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const decisions = [];

  console.log(c("bold", "\nScanning for releasable skills...\n"));
  let printedAny = false;

  for (const cand of candidates) {
    const v = cand.currentVersion;
    const presetKind = args.perSkill[cand.name];
    const hasNew = cand.commits.length > 0;
    const isAhead = cand.manifestState === "ahead";
    const eligible = cand.isInitial || hasNew || presetKind || isAhead;

    if (cand.manifestState === "behind") {
      fail(
        `${cand.name}: manifest.version (v${v}) is BEHIND the latest tag (${cand.lastTag}). ` +
          `Refusing to release a downgrade. Bump manifest to >= v${cand.publishedVersion}.`,
      );
    }

    if (!eligible) {
      console.log(
        `  ${c("gray", "─")} ${cand.name.padEnd(24)} ${c("gray", `v${v}  no changes since ${cand.lastTag}`)}`,
      );
      continue;
    }
    printedAny = true;
    const tag = cand.isInitial
      ? c("yellow", "INITIAL")
      : isAhead
        ? c("cyan", `MANIFEST AHEAD: v${cand.publishedVersion} → v${v}`)
        : `since ${cand.lastTag}`;
    console.log(
      `  ${c("green", "●")} ${c("bold", cand.name.padEnd(24))} ${c("dim", `v${v}`)}  ${c("dim", `(${tag}${hasNew ? `, ${cand.commits.length} commit${cand.commits.length === 1 ? "" : "s"}` : ""})`)}`,
    );
    for (const cm of cand.commits.slice(0, 8)) {
      console.log(`      ${c("gray", cm.hash)} ${cm.subject}`);
    }
    if (cand.commits.length > 8) {
      console.log(c("gray", `      … and ${cand.commits.length - 8} more`));
    }

    let kind;
    if (cand.isInitial) {
      // For first release, the manifest version IS the release version.
      // Preset --bump is intentionally ignored here — if you want a different
      // initial version, edit manifest.json directly before running.
      kind = "initial";
      const note = presetKind
        ? `initial release at v${v} (--bump ${presetKind} ignored — edit manifest.json to change)`
        : `initial release at v${v}`;
      console.log(`      → ${c("cyan", note)}`);
    } else if (isAhead) {
      // Manifest was hand-bumped past the last tag. Honour exactly what the
      // contributor wrote — bumping again would skip over their version.
      kind = "keep";
      const note = presetKind
        ? `using manifest v${v} as-is (--bump ${presetKind} ignored — manifest already ahead of ${cand.lastTag})`
        : `using manifest v${v} as-is (already bumped past ${cand.lastTag})`;
      console.log(`      → ${c("cyan", note)}`);
    } else if (presetKind) {
      kind = presetKind;
      console.log(`      → ${c("cyan", `bump preset: ${kind} (v${bumpVersion(v, kind)})`)}`);
    } else {
      kind = await promptBump(rl, cand);
    }

    if (kind === "skip") {
      console.log(c("dim", `      skipped`));
      continue;
    }
    const nextVersion =
      kind === "initial" || kind === "keep" ? v : bumpVersion(v, kind);
    decisions.push({ ...cand, kind, nextVersion });
    console.log("");
  }

  if (!printedAny) {
    console.log(c("dim", "  (no skills have changes since their last release)"));
  }

  rl.close();
  return decisions;
}

async function promptBump(rl, cand) {
  const v = cand.currentVersion;
  const choices = ["patch", "minor", "major"]
    .map((k) => `${k} → v${bumpVersion(v, k)}`)
    .join(" / ");
  while (true) {
    const ans = (
      await rl.question(`      Bump? [${c("bold", "P")}atch / [${c("bold", "M")}]inor / Ma[${c("bold", "J")}]or / [${c("bold", "S")}]kip]  (${choices}) > `)
    ).trim().toLowerCase();
    if (["p", "patch"].includes(ans)) return "patch";
    if (["m", "minor"].includes(ans)) return "minor";
    if (["j", "major"].includes(ans)) return "major";
    if (["s", "skip", ""].includes(ans)) return "skip";
    console.log(c("yellow", "      please answer p / m / j / s"));
  }
}

// ----- apply --------------------------------------------------------------

async function bumpManifest(decision) {
  const raw = await readFile(decision.manifestPath, "utf8");
  // Preserve formatting by surgically replacing the version line.
  const re = /("version"\s*:\s*")([^"]+)(")/;
  if (!re.test(raw)) {
    fail(`${decision.name}: cannot locate "version" line in manifest.json`);
  }
  const updated = raw.replace(re, `$1${decision.nextVersion}$3`);
  await writeFile(decision.manifestPath, updated, "utf8");
}

function buildCommitMessage(decisions) {
  if (decisions.length === 1) {
    const d = decisions[0];
    return `release(${d.name}): ${d.nextVersion}`;
  }
  const list = decisions.map((d) => `${d.name}@${d.nextVersion}`).join(", ");
  return `release: ${list}`;
}

async function syncReadme() {
  // Reuse the existing updater so behaviour stays in one place.
  const { spawnSync } = await import("node:child_process");
  const res = spawnSync(
    "node",
    ["scripts/release/update-readme.mjs"],
    { cwd: REPO_ROOT, stdio: "inherit" },
  );
  if (res.status !== 0) fail("update-readme.mjs failed.");
}

// ----- main ---------------------------------------------------------------

async function main() {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(c("red", err.message));
    help();
    exit(2);
  }
  if (args.help) return help();

  preflight(args.branch, { strict: !args.dryRun });

  const candidates = await buildPlan(args);
  const decisions = await decideBumps(candidates, args);

  if (decisions.length === 0) {
    console.log(c("dim", "\nNothing to release. Exiting."));
    return;
  }

  // ---- summary ----------------------------------------------------------
  console.log(c("bold", "\nRelease plan:"));
  for (const d of decisions) {
    let hop;
    if (d.kind === "initial") hop = `v${d.nextVersion} (initial)`;
    else if (d.kind === "keep")
      hop = `v${d.publishedVersion} → v${d.nextVersion} (manifest already bumped)`;
    else hop = `v${d.currentVersion} → v${d.nextVersion} (${d.kind})`;
    const tag = buildTag(d.name, d.nextVersion);
    console.log(`  • ${c("bold", d.name.padEnd(24))} ${hop}    ${c("dim", `→ tag ${tag}`)}`);
  }
  const commitMsg = buildCommitMessage(decisions);
  const tags = decisions.map((d) => buildTag(d.name, d.nextVersion));
  console.log("");
  console.log(`Commit: ${c("dim", commitMsg)}`);
  console.log(`Tags:   ${c("dim", tags.join(" "))}`);
  console.log(`Push:   ${c("dim", `git push origin ${args.branch}, then each tag individually`)}`);

  if (args.dryRun) {
    console.log(c("yellow", "\n--dry-run set, stopping before any writes."));
    return;
  }

  if (!args.yes) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const ans = (await rl.question(`\nProceed? [y/N] > `)).trim().toLowerCase();
    rl.close();
    if (ans !== "y" && ans !== "yes") {
      console.log(c("dim", "Aborted."));
      return;
    }
  }

  // ---- apply ------------------------------------------------------------
  console.log("");
  console.log(c("bold", "[1/4] Bumping manifests..."));
  for (const d of decisions) {
    if (d.kind === "initial") {
      console.log(`      ${d.name}: keeping v${d.nextVersion} (initial)`);
    } else if (d.kind === "keep") {
      console.log(`      ${d.name}: keeping v${d.nextVersion} (manifest already at target)`);
    } else {
      console.log(`      ${d.name}: ${d.currentVersion} → ${d.nextVersion}`);
      await bumpManifest(d);
    }
  }

  console.log(c("bold", "[2/4] Syncing README download links..."));
  await syncReadme();

  console.log(c("bold", "[3/4] Committing & tagging..."));
  // Stage and commit only if there's anything new (initial releases without
  // a manifest bump still need the README sync, but if README was already up
  // to date and no manifest changed, there's nothing to commit — just tag).
  const dirty = git(["status", "--porcelain"]);
  if (dirty) {
    git(["add", "-A"]);
    git(["commit", "-m", commitMsg]);
    console.log(`      committed: ${commitMsg}`);
  } else {
    console.log(c("dim", "      no manifest / README changes to commit"));
  }
  for (const tag of tags) {
    // Use annotated tags so they show up nicely in `git tag -n`.
    git(["tag", "-a", tag, "-m", `${tag}`]);
    console.log(`      tagged: ${tag}`);
  }

  console.log(c("bold", "[4/4] Pushing..."));
  // Push the branch first (carries the manifest bump + README sync commit, if
  // any), then push each tag in its own `git push`. We deliberately avoid
  // the all-in-one `git push origin main tag1 tag2 ...` form because in that
  // mode GitHub occasionally collapses the per-tag CreateEvents and the
  // tag-triggered Release workflow simply never fires. One push per tag
  // guarantees one webhook delivery → one workflow run.
  git(["push", "origin", args.branch]);
  console.log(`      pushed: ${args.branch}`);
  for (const tag of tags) {
    git(["push", "origin", `refs/tags/${tag}`]);
    console.log(`      pushed: ${tag}`);
  }
  console.log(c("green", "      all pushed."));

  // ---- done -------------------------------------------------------------
  let originUrl = "";
  try {
    originUrl = git(["remote", "get-url", "origin"])
      .replace(/\.git$/, "")
      .replace(/^git@github\.com:/, "https://github.com/");
  } catch {}
  console.log("");
  console.log(c("green", "Done!"));
  if (originUrl) {
    console.log(`Watch the release runs:  ${originUrl}/actions`);
    console.log(`See published releases:  ${originUrl}/releases`);
  }
}

main().catch((err) => {
  console.error(c("red", `\nerror: ${err.message}`));
  if (env.DEBUG) console.error(err.stack);
  exit(1);
});
