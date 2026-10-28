# 15: The fx-system-flow lane

**Status:** ready-for-agent
**Blocked by:** 06, 09, 10, 12, 13, 14
**Phase:** Core

**What to build:** the owner types `/fx:fx-system-flow` in a repo and gets a plan before any investigation runs. The lane is user-invoked (`disable-model-invocation: true`), the ninth, hand-written like `fx-audit`. It runs the six steps of the design: detect (passing each `--repo` on to `detect --repo <path> --write`); the planning pass (areas, chapters with their reader's question, levels per area, diagram count, estimate, and `meta.roots` copied from `detect`'s roots) and a stop until the owner approves or trims; investigation by one subagent per area, at most 4 at a time, each writing its fragment until `check --fragment` passes; the draft build; the interview (count and choice, then one question at a time, recommended answers); the rebuild, the visual check of every page and diagram at 1440 and 390 in light and dark, and the report, which shows the depth block planned against built per area. Every build passes `--archify <detect's archify.dir>` when `detect` found one, and `--prefer <cheap|fast|detailed>` when the owner gave one. A rerun in a repo with a model offers refresh stale, cover uncovered, or (only with `--rebuild` or on request) a full rebuild. It never commits.

**Design:** The lane; The pieces; Fragments and merge; Output location; Rules in force; Coverage report; Error handling; Proof before merge

**Files:**
- Create: `skills/fx-system-flow/SKILL.md` (frontmatter `name: fx-system-flow`, a description saying it investigates a whole system and builds an evidenced site, `disable-model-invocation: true`, `argument-hint: "[--repo <path>]... [--rebuild] [cheap|fast|detailed]"`; the steps, stop points and rules inline; under 20,000 bytes)
- Create, beside it, each cited from `SKILL.md` as a backticked `../../skills/fx-system-flow/<file>` path and as a Markdown link: `planning.md` (the planning pass; the plan file of task 14 with `files`, `filesToRead` and a proposed `levels` count per area; areas over 400 files split into sub-areas; `meta.roots` written from `detect`'s `roots` ids, host first; the MkDocs `nav` (both entries) and `exclude_docs` question asked once in the planning message using `detect`'s `mkdocs` lines, applied by the lane on a yes), `area-brief.md` (the subagent brief: its slice of the plan, semble first, evidence rules, the fragment it owns, `check --fragment` until it passes, at most 2 fix rounds, open questions each with a recommended answer; the depth rules: drill every level-1 node that stands for a real mechanism down to level 3, give each diagram 8 to 12 primary nodes, and draw the neighbours that live outside the diagram as context nodes with `primary: false`; meet the area's planned `levels` and `diagrams` or say why in the return), `fragment-guide.md` (the fragment authoring guide naming `system-model.schema.json`, the id pattern and the per-kind uniqueness rule, the rule that every node id starts with its area id and a dash (`engine-api`) so two areas never collide, handles `<kind>:<id>` in `questions[].items`, `corrections[].item` and every CLI argument, evidence or `unconfirmed` on every evidenced kind, owner evidence `{ owner, question }`, store row columns, `chapter` on sequences and flows), `interview.md` (the count-and-choice opening, one at a time, a taken recommendation becomes `owner, <date>` evidence and clears `unconfirmed`, a skip leaves items `unconfirmed` and questions listed; a changed existing fact gets a `corrections` entry), `check-and-report.md` (the visual check per `visual-check.md`, the archify 390 retry with `--page-limit <name>=5` then `--svg <name>` (both saved by `build` for later runs), the unfit-figure loop of at most 2 rounds, the report fields including the depth block from `BuildResult.depth` as a table of area, planned and built, `Visual check: not run: no browser` naming every page)
- Create: `skills/fx-system-flow/agents/openai.yaml` (generated)
- Modify: `scripts/gen-command-skills` (generate the sidecar for every hand-written user-invoked skill in a list holding `fx-audit` and `fx-system-flow`)
- Modify: `src/lib/user-invoked-lanes.ts` (add `fx-system-flow`, sorted)
- Modify: `src/lib/opencode-commands.ts` (`SKILL_PATH_RE` also rewrites `../../skills/` citations, so the opencode command reaches the sidecars by absolute path)
- Modify: `src/tests/gates/user-invoked.test.ts` (nine lanes), `src/tests/gates/opencode-plugin.test.ts` (the generated `fx-system-flow` command names its sidecars by existing absolute paths)
- Modify: `README.md` (eight to nine user-invoked skills, the skills count, one table row), `SURFACE.md` (the user-invoked list and count, one row), `INSTALL.md` (eight to nine, the lane in the list)

**Interfaces:**
- Consumes, by name in the lane text (the lane runs them as `node <skill base directory>/../../scripts/system-flow ...`): `detect [--repo <path>]... [--write]` and its `roots`, `mkdocs` and `archify` fields (06, 07, 12), `estimate <plan file>` (14), `check [--fragment <file>]` (01 to 03, 09), `build [--archify <dir>] [--prefer <p>] [--page-limit <name>=<n>] [--svg <name>]` (04 to 12), `stale`, `query`, `verify <handle>...` (13); the plan file format and `BuildResult.depth` (14); the `BuildResult` fields (04 to 12); `cheap` is passed as `--prefer cheap`.
- Produces: `USER_INVOKED_LANES` with nine entries; the lane name `fx-system-flow` that tasks 19 to 21 name.

**Seam:** gate tests on text, in the existing style (design seam 3), plus the opencode command generator.

**Tests:**
- `user-invoked.test`: `HIDDEN` deep-equals `['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-pr', 'fx-retro', 'fx-setup', 'fx-system-flow', 'fx-what']` and equals `USER_INVOKED_LANES` sorted; `skills/fx-system-flow/agents/openai.yaml` holds `allow_implicit_invocation: false`.
- `skill-size.test`: `skills/fx-system-flow/SKILL.md` is under 20,000 bytes with `PENDING` empty.
- `scripts/check-paths` exits 0: every sidecar is reachable from `SKILL.md` and every backticked `../../` path resolves.
- `scripts/check-reference-leaves`, `scripts/check-prose`, `scripts/check-manifest`, `scripts/check-generated` exit 0 (the sidecar matches `gen-command-skills` output).
- `opencode-plugin.test`: `opencodeCommands(root, dest)['fx-system-flow'].template` contains `<dest>/skills/fx-system-flow/planning.md` and no `../../skills/`.
- `description-overlap.test` passes with the new description.
- Lane text, asserted in `user-invoked.test`: `SKILL.md` contains `disable-model-invocation: true` in frontmatter, `system-flow estimate`, `system-flow check --fragment`, `detect --repo`, `--archify`, `at most 4`, the sentence `It never commits; the owner runs git.`, and the interview opening `questions. Answer one at a time, skip, or take the recommended answer for every question.`
- Sidecar text, asserted in `user-invoked.test`: `planning.md` contains `filesToRead`, `levels` and `meta.roots`; `area-brief.md` contains `level 3`, `8 to 12 primary nodes` and `context nodes`; `fragment-guide.md` contains `starts with its area id` and `<kind>:<id>`; `check-and-report.md` contains `depth` and `planned`.
- The README lane-count assertion in `user-invoked.test` still passes.

**Risks:** byte headroom: keep whole sections in the five sidecars; measure with `wc -c` before committing. The description must not claim "document the system", which stays fx-docs' trigger; fx-docs names this lane to the owner in task 19. Invoke `fx-authoring` before writing the lane text.

**Testing:** gates in `check-all`.

## Acceptance criteria
- [ ] `/fx:fx-system-flow` is listed as a user-invoked lane on all three runtimes, and the model can never auto-select it.
- [ ] The planning pass stops for the owner's approval before any subagent is dispatched.
- [ ] Every CLI subcommand the lane names exists with the flags it uses.
- [ ] The planning pass proposes levels per area, the area brief states the depth rules, and the report compares planned with built depth.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**, then `fx-authoring` for the lane text

- [ ] **2. Write each test the Tests field names** in `src/tests/gates/user-invoked.test.ts` and `src/tests/gates/opencode-plugin.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/user-invoked.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/opencode-plugin.test.js`
Expected: eight hidden lanes, no `fx-system-flow` command.

- [ ] **4. Write the lane, its sidecars and the list changes; run `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/gen-command-skills`**

- [ ] **5. Run them: verify GREEN**

Run: same two tests. Expected: both print OK.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit by path**

```
git add skills/fx-system-flow/SKILL.md skills/fx-system-flow/planning.md skills/fx-system-flow/area-brief.md skills/fx-system-flow/fragment-guide.md skills/fx-system-flow/interview.md skills/fx-system-flow/check-and-report.md skills/fx-system-flow/agents/openai.yaml scripts/gen-command-skills src/lib/user-invoked-lanes.ts lib/user-invoked-lanes.js src/lib/opencode-commands.ts lib/opencode-commands.js src/tests/gates/user-invoked.test.ts tests/gates/user-invoked.test.js src/tests/gates/opencode-plugin.test.ts tests/gates/opencode-plugin.test.js README.md SURFACE.md INSTALL.md
git commit -m "feat(fx-system-flow): the user-invoked lane that plans, investigates and builds the site"
```

No attribution trailers. Then continue to the next task: never stop and wait.
