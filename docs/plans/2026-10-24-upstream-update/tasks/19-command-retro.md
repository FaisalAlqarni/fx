# 19: `/fx:fx-retro` command, offered at build end

**Status:** ready-for-agent
**Blocked by:** 18
**Phase:** 4: New commands

**What to build:** after a build, the owner types `/fx:fx-retro` and gets lessons, proposed checks and fbrain notes drawn from evidence, so each build improves the next. fx-implement's completion report ends with one line offering it. Following `research/compare-6-authoring-new.md` section (c) "fx-retro", with the design's inputs and outputs:
- **Inputs:** the ledger and the review findings; the session transcripts, read in bounded slices (measure first with `wc -lc`, never `cat` a transcript, find line numbers, then extract fields cut at 500 characters; hook output, system reminders and tool results are never the owner's words; in a subagent transcript "user" is the parent); build-cost numbers from `node <fx root>/scripts/build-cost`; and the owner's corrections.
- **Citation or drop:** every candidate cites `path:line` from a transcript or the ledger; a candidate without one is dropped.
- **Routing:** a mechanical mistake gets a proposed deterministic check in the cheapest place the repo already runs, written as text and never built; a judgement call goes to the reviewer (repo.md "Rules" or a lens), never to CLAUDE.md; a wording change to an agent document is drafted under fx-authoring.
- **Outputs:** lessons appended to `tasks/lessons.md`, one dated, commit-cited entry each (`- <YYYY-MM-DD>, at <short commit>: <what happened> (<path>:<line>). Rule: <rule>. Check: <proposed check, or "judgement, no check">.`), superseding rather than rewriting old ones; one `fbrain propose` per durable lesson or decision when the `fbrain` CLI or its MCP `propose` tool exists, never approving, rejecting or running `fbrain review`; `docs/plans/<slug>/retro.md` with the candidates, most severe first. Nothing else is edited or committed until the owner picks a candidate.

**Design:** Phase 4: New commands

**Files:**
- Create: `commands/fx-retro.md` (frontmatter `description`, `disable-model-invocation: true`, `argument-hint: "[session-id | transcript-path | complaint]"`)
- Modify: `scripts/gen-command-skills` (`COMMAND_DERIVED` gains `fx-retro`; "seven" becomes "eight")
- Create, generated: `skills/fx-retro/SKILL.md`, `skills/fx-retro/agents/openai.yaml`
- Modify: `src/lib/user-invoked-lanes.ts`, built `lib/user-invoked-lanes.js`
- Modify: `src/tests/gates/user-invoked.test.ts`, built `tests/gates/user-invoked.test.js`
- Modify: `tests/conformance/rows/09-every-skill-discovered.sh`, `tests/conformance/rows/13-audit-lane-not-model-facing.sh`, `tests/conformance/rows/14-audit-lane-user-invocable.sh`
- Modify: `skills/fx-implement/references/completion.md` (the completion report's last line: "`/fx:fx-retro` reviews this build.")

**Interfaces:**
- Consumes: `USER_INVOKED_LANES` as task 18 left it; the completion report in `references/completion.md` (tasks 03 and 17).
- Produces: `USER_INVOKED_LANES = ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-pr', 'fx-retro', 'fx-setup', 'fx-what']`.
- Produces: the lesson entry format above, verbatim; the `retro.md` path `docs/plans/<slug>/retro.md`.
- Upstream sources, read only: `<SCRATCH>/upstream/mattpocock-skills/skills/engineering/retro/SKILL.md` and `<SCRATCH>/upstream/superpowers/skills/diagnosing-superpowers/`; if gone, re-clone at mattpocock-skills `5beb35b` and superpowers `2ce8aa1` into `<SCRATCH>/upstream`.

**Seam:** `user-invoked.test.js` and `scripts/check-manifest`.

**Tests:**
- `user-invoked.test.js`: the hidden set equals the eight names above; fx-retro carries both hiding flags; body equals command body; OK.
- `python3 -I scripts/check-manifest`: OK line.
- `node tests/gates/skill-size.test.js`: OK; fx-retro SKILL.md under 8,000 bytes.
- `python3 -I scripts/check-prose commands/fx-retro.md`: OK line.

**Risks:** the command writes `tasks/lessons.md` and fbrain proposals because the owner asked for them; it builds no check, edits no lane, CLAUDE.md or hook, and commits nothing. A transcript line can be a megabyte; the bounded-read rule is what keeps the session alive.

**Testing:** gate suite; the command's behaviour is live and checked on request.

## Acceptance criteria
- [ ] Every candidate `/fx:fx-retro` reports cites a `path:line`; uncited candidates never appear.
- [ ] Lessons land in `tasks/lessons.md` in the dated format; checks appear only as proposals in `retro.md`.
- [ ] fx-implement's completion report ends with the offer line.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Change the expected lists** in `user-invoked.test.ts`

- [ ] **3. Run it: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/user-invoked.test.js`
Expected: fails on the missing `fx-retro`.

- [ ] **4. Write the command; update the generator list, the shared list, the rows and completion.md**

- [ ] **5. Generate the skill**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/gen-command-skills`

- [ ] **6. Run it: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/user-invoked.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-manifest`. Expected: both OK.

- [ ] **7. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope commands/fx-retro.md src/lib/user-invoked-lanes.ts skills/fx-implement/references/completion.md`

- [ ] **8. Commit by path**

```
git add commands/fx-retro.md scripts/gen-command-skills skills/fx-retro src/lib/user-invoked-lanes.ts lib/user-invoked-lanes.js src/tests/gates/user-invoked.test.ts tests/gates/user-invoked.test.js tests/conformance/rows/09-every-skill-discovered.sh tests/conformance/rows/13-audit-lane-not-model-facing.sh tests/conformance/rows/14-audit-lane-user-invocable.sh skills/fx-implement/references/completion.md
git commit -m "feat(commands): /fx:fx-retro proposes evidence-cited lessons and checks after a build"
```
