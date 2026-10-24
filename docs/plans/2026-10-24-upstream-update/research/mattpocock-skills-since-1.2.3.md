# mattpocock-skills: releases after 1.2.3

Source: https://github.com/mattpocock/skills (confirmed by `repository` in `.claude-plugin/plugin.json`; plugin name `mattpocock-skills`, marketplace name `mattpocock`, `.claude-plugin/marketplace.json`). Cloned to /tmp/claude-1000/-development-advantage-backend/41c30690-f980-4e40-a682-fd0bcbf989cf/scratchpad/upstream/mattpocock-skills (HEAD 5beb35b, 2026-10-19). Nothing was executed from the clone.

How versions are marked: Changesets. `package.json` and `.claude-plugin/plugin.json` carry the same `version` (synced by `scripts/sync-plugin-version.mjs`), `CHANGELOG.md` has one section per version, and a "chore: version skills" commit makes each release. The only git tags are `v1.0.0` and `mattpocock-skills@1.0.0`, so later versions are identified by those commits.

Base (1.2.3): commit 30204e6, 2026-08-06, "chore: version skills"; plugin.json and package.json both read 1.2.3 there. Not in the local plugin cache (cache holds only fx, humanizer, oh-my-mermaid, ponytail), so 1.2.3 was read from git, not from the local install.

Releases after 1.2.3: 1.3.0 and 1.3.1 only. No 2.0.0. There is also unreleased work on master after 1.3.1 (section at the end).

## 1.3.0 (minor), 2026-09-29, commit 984a2c0 ("chore: version skills")
Changes come from CHANGELOG.md `## 1.3.0`; verified against `git diff 30204e6 984a2c0`. Two changeset-bearing sweeps (em-dash removal, Skill-tool wording) touch many files; per-file diff was normalised for punctuation to separate real wording changes.

New or promoted skills
- `implement-spec` graduated into engineering (commit 2aecca1; new `skills/engineering/implement-spec/SKILL.md`, `agents/openai.yaml`, `docs/engineering/implement-spec.md`). Implements a whole spec in one run: tickets read as a task graph, implementer subagents in their own worktrees across the ready frontier, one integration branch, closes with `code-review`. Goal is the integration branch, not a PR; draft PR only if the tracker closes work via PRs or the user asks. Each implementer builds with `tdd` and merges the integration tip before reporting done. `ask-matt` routes to it as the parallel alternative to `implement`.
- `pr` graduated into engineering (2aecca1; `skills/engineering/pr/SKILL.md`, `CREDITS.md`, `docs/engineering/pr.md`). Model-invoked PR body shape: summary visual, before/after evidence, merge-danger call (one-way or two-way door, blast radius). Credits Dex Horthy's `show-me`.
- `retro` graduated into engineering (2aecca1; `skills/engineering/retro/SKILL.md`). Looks back at a session and proposes changes to the agent environment, not the code (navigation pointers, automated checks, coding standards, steering, tool economy, information access). A mechanical standards violation gets a deterministic check (lint rule, hook, CI job); `CODING_STANDARDS.md` is for judgement calls. Placed after `code-review` in the `ask-matt` flow.

Removed
- `resolving-merge-conflicts` deleted (daa01d8; `skills/engineering/resolving-merge-conflicts/` gone). No replacement.

Renamed (breaking for anyone with the old convention)
- `CONTEXT.md` / `CONTEXT-MAP.md` became `GLOSSARY.md` / `GLOSSARY-MAP.md` in every skill that reads or writes them (006a52b). `domain-modeling/CONTEXT-FORMAT.md` renamed to `GLOSSARY-FORMAT.md` (git R070); root `CONTEXT.md` became `GLOSSARY.md`. Affected: domain-modeling, grill-with-docs, improve-codebase-architecture, setup-matt-pocock-skills (`domain.md`), triage, tdd, diagnosing-bugs, ask-matt, codebase-design (`DESIGN-IT-TWICE.md`), wait-what, pr. Upstream tells users to `git mv` their file; skills now look only for GLOSSARY.md.

Behaviour or wording changes to existing skills
- Skill-tool invocation convention (e3e547b, PR 878, `.agents/invocation.md`): skills now say "Call the Skill tool with \"name\"" instead of "run the /name skill", in code-review, diagnosing-bugs, grill-with-docs, grill-me, improve-codebase-architecture, tdd, to-spec, to-tickets, triage, wayfinder. Examples seen in diff: `grill-me/SKILL.md` "Run a /grilling session" became `Call the Skill tool with "grilling"`; `grill-with-docs/SKILL.md` now says call the Skill tool twice, for grilling and domain-modeling; `tdd/SKILL.md` calls the Skill tool with "codebase-design"; `improve-codebase-architecture/SKILL.md` same for codebase-design, and the "run grilling" / "run domain-modeling" steps were reworded the same way.
- User-invoked skills no longer called via Skill tool (1dab982, PR 880, fixes issue 453): `to-spec`, `wayfinder`, `to-tickets`, `triage`, `code-review` now say "tell the user to run /setup-matt-pocock-skills" instead of calling it. `diagnosing-bugs` Phase 6 hand-off to improve-codebase-architecture removed; Phase 6 is "Cleanup" only. Why stated: the target is user-invoked and the bug-fix flow is often unattended.
- `grilling/SKILL.md`: round template now separates questions with a horizontal rule `---` (85f83d3, PR 917); em-dashes removed (d419977). The diff shows the template header changed from "Each question should be formatted like so" to "Format a round like so" and a second example question block (Q2) with recommendation line was added.
- `domain-modeling/SKILL.md`: description now triggers on "discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or editing an ADR"; dropped the "another skill needs to maintain the domain model" clause (f02e2ed, PR 848).
- Front matter `description` quoted in `to-spec`, `code-review`, `setup-matt-pocock-skills`, `writing-fragments`, `writing-shape`, `wait-what` because an unquoted colon made the YAML invalid and `npx skills` skipped them (4f28947, PR 911).
- Em-dashes removed from the whole repo's prose (e6e9577, PR 905). Wording-only in every skill file; `CLAUDE.md`/`AGENTS.md` now forbid them.
- `wait-what`: follows GLOSSARY-MAP.md to the right GLOSSARY.md in multi-context repos (594f0f8, PR 904).
- `ask-matt/SKILL.md`: routes `implement-spec`, `pr`, `retro`; flow now splits "work the tickets" into per-ticket `implement` or whole-spec `implement-spec`.

Harness support
- Each new skill ships `agents/openai.yaml` (Codex metadata), same as existing skills. No hooks directory exists in the repo at any point; no new hook support. (`skills/misc/git-guardrails-claude-code` exists but is not new.)

## 1.3.1 (patch), 2026-10-04, commit 2629ffc ("chore: version skills")
Diff 984a2c0..2629ffc touches 5 files only (plugin.json, package.json, CHANGELOG.md, `skills/engineering/ask-matt/SKILL.md`, `docs/engineering/diagnosing-bugs.md`).
- `ask-matt` no longer says `diagnosing-bugs` hands off to `improve-codebase-architecture` from a post-mortem (that step was removed in 1.3.0). It now points to `/retro` after the fix ("what would have prevented the bug") and to `/improve-codebase-architecture` when the finding is a missing seam. The `docs/engineering/diagnosing-bugs.md` page drops the same stale hand-off. Source: c5b9869, PR 1121, issue 1117.
- No change to any SKILL.md of a flagged skill.

## Unreleased on master after 1.3.1 (not a version; HEAD 5beb35b, 2026-10-19)
Pending changesets in `.changeset/` (48 commits since 2629ffc). Next release will be 1.3.2 or 1.4.0; not decided upstream.
- grilling: question wording so "yes" accepts the recommended answer. `grilling/SKILL.md` adds "Word each question so \"yes\" accepts your recommended answer." (95249b0, issue 706)
- tdd: each proposed seam gets a one-line note on what it catches and misses. `tdd/SKILL.md` Seams step (3f59913, issue 607)
- diagnosing-bugs: when a red was forced by mutating code or a fixture, `diff` against a pristine copy to prove the mutation landed. Phase 5 step 2 (f3fc563, issue 955)
- code-review: searches repo for every standards file and always passes `CODING_STANDARDS.md` / `CONTRIBUTING.md` to the Standards sub-agent; both sub-agents run together in the foreground and their returned reports are aggregated; tracker resolved through "the provided tracker doc", no hard-coded path (3da8c01, issues 1065, 1073, 937)
- implement: fetches a passed ticket reference and states its title first (6d6a5b9); calls Skill tool for tdd and code-review (04320ee)
- to-tickets: each ticket becomes a sub-issue of its source issue; `## Blocked by` omitted when blockers are native edges (9e2abf8)
- ask-matt: reads a skill's SKILL.md before stating what it does or skipping a step (954ee7f)
- wayfinder: no `ready-for-agent` labels, real issue ids only in cross-references, no PRs from research branches, resolves each ticket as the type its label names (8295b8e)
- setup-matt-pocock-skills: creates missing triage labels, GitLab `glab` and GitHub `--json` fixes (5b7cade); GitHub external-PR listing fix (8e67db2)
- handoff: names the OS temp dir (0f5e033); claude-handoff quoting fix (07b7105)
- teach: workspace in the run directory, varied quiz answer position (ad5400b)
- wizard template fixes (868c4cf, 49dd158)
- chief-of-staff (in-progress bucket) keeps memory in a dated, commit-cited wiki (5beb35b); new experimental skill, e47c149
- Repo only: SCOPE.md, issue forms and triage workflows (f0588cd, 423ed08); not skill behaviour.
- No new hooks; no new top-level skills graduated since 1.3.0.

## Changes to the flagged skills (1.2.3 to 1.3.1, plus unreleased)
Skill name is current upstream name. Names unchanged since 1.2.3 for all flagged skills (codebase-design, improve-codebase-architecture, and DEEPENING.md / DESIGN-IT-TWICE.md keep their names).

| Skill / file | Change | Where |
|---|---|---|
| grilling | 1.3.0: questions separated by `---`, template header reworded, em-dashes removed. Unreleased: wording so "yes" accepts the recommendation. | 85f83d3, d419977, 95249b0; `skills/productivity/grilling/SKILL.md` |
| grill-me / grill-with-docs | 1.3.0: now "Call the Skill tool" (twice, grilling and domain-modeling) instead of "run /grilling"; CONTEXT.md became GLOSSARY.md | e3e547b, 006a52b |
| to-spec | 1.3.0: setup precondition now tells the user to run /setup-matt-pocock-skills; description quoted; dashes removed. No change to spec content or template. | 1dab982, 4f28947; `skills/engineering/to-spec/SKILL.md` |
| to-tickets | 1.3.0: same precondition reword, dashes removed, ticket title format `# <NN>: <title>`, "None (can start immediately)". Unreleased: tickets become sub-issues of the source issue, `Blocked by` omitted for native edges. | 1dab982, 9e2abf8; `skills/engineering/to-tickets/SKILL.md` |
| domain-modeling | 1.3.0: CONTEXT.md/CONTEXT-MAP.md became GLOSSARY.md/GLOSSARY-MAP.md; CONTEXT-FORMAT.md renamed GLOSSARY-FORMAT.md; description re-triggered on terminology, GLOSSARY.md and ADR edits. Rules unchanged. | 006a52b, f02e2ed |
| ADR-FORMAT.md | 1.3.0: punctuation only (em-dash sweep). No rule change. | e6e9577 |
| code-review | 1.3.0: Skill-tool/precondition wording, description quoted, dashes. No behaviour change to the two-axis review or the Fowler smell baseline. Unreleased: standards search, foreground sub-agents, tracker doc. | 1dab982, 4f28947, 3da8c01; `skills/engineering/code-review/SKILL.md` |
| tdd | 1.3.0: reads GLOSSARY.md; calls Skill tool "codebase-design"; dashes. Unreleased: one-line catches/misses note per proposed seam. `tests.md` and `mocking.md` unchanged. | 006a52b, e3e547b, 3f59913 |
| diagnosing-bugs | 1.3.0: Phase 6 post-mortem hand-off to improve-codebase-architecture removed; reads GLOSSARY.md; user-invoked skills not called. 1.2.3 redaction change is already in the base. Unreleased: prove forced mutation with `diff` against a pristine copy. `scripts/hitl-loop.template.sh` only gets a comment (capture prints back to terminal) which was already 1.2.3 content. | 1dab982, 006a52b, f3fc563 |
| research | 1.3.0: one dash replaced by a comma. No behaviour change. | e6e9577; `skills/engineering/research/SKILL.md` |
| prototype (SKILL.md, LOGIC.md, UI.md) | Punctuation and minor phrasing only ("this is the wrong branch", "so cap there"). No behaviour change. | e6e9577 |
| codebase-design (SKILL.md, DEEPENING.md, DESIGN-IT-TWICE.md) | Punctuation; DESIGN-IT-TWICE.md says GLOSSARY.md vocabulary instead of CONTEXT.md. Vocabulary (module, interface, seam, adapter, depth, leverage, locality) unchanged. | e6e9577, 006a52b |
| improve-codebase-architecture (SKILL.md, HTML-REPORT.md) | 1.3.0: GLOSSARY.md; Skill-tool wording for codebase-design, grilling and domain-modeling steps; HTML report title "Architecture review for {{repo name}}". | e3e547b, 006a52b |
| New / removed | New in engineering: implement-spec, pr, retro. Removed: resolving-merge-conflicts. Renamed convention: CONTEXT to GLOSSARY. No hooks. Unreleased new: chief-of-staff (in-progress). | CHANGELOG.md 1.3.0 |

## Not verified
- No local copy of 1.2.3 to compare against; base was reconstructed from commit 30204e6.
- Per-file diffs were checked for the flagged skills; the remaining files (pr, retro, implement-spec bodies, docs pages, wizard template, teach, handoff) were read only through the changelog/changeset text, not line by line.
- Commit hashes in the changelog (e.g. 2aecca1, 006a52b) are the source commits cited by Changesets; I did not confirm each is an ancestor of 984a2c0.
