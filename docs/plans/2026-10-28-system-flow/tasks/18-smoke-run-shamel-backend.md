# 18: Smoke run: CLI and archify on a Shamel.Backend scratch copy

**Status:** ready-for-agent
**Blocked by:** 17
**Phase:** Hardening

**What to build:** evidence, before any expensive proof run, that the CLI and the real archify work on a real repository. An agent copies Shamel.Backend into the scratchpad as a one-commit git repo, writes a small fragment set by hand from that repo's code, and runs `detect`, `check`, `build --archify` and a second flagless `build`, then the visual check of the page and every deep diagram. No lane is invoked: this is the CLI alone, so an agent may run it. Results go in `results.md` under `## Smoke`. Never touch `/mnt/c/Users/Faisal/Downloads/Shamel.Backend` beyond reading it, and never write under `/home/faisal` or `/mnt`.

**Design:** Proof before merge; Renderers; Error handling; Theme detector; Output location

**Files:**
- Create: `docs/plans/2026-10-28-system-flow/proof/prepare-scratch` (bash, no `rm`, no `trap`, no `bash -c`: copies a source folder given as the first argument into a new folder given as the second, refuses an existing target with exit 1, runs `git init -q`, `git add -A` and one commit with `-c user.name=proof -c user.email=proof@local`, prints the HEAD; tasks 20 and 21 reuse it)
- Create: `docs/plans/2026-10-28-system-flow/proof/smoke-fragments/meta.json`, `level0.json`, `api.json`, `chapters.json` (the hand-written fragment set: `meta.roots` `[{ id: "shamel-backend" }]`; one level-0 diagram of 5 to 8 primary nodes with their edges; one level-1 diagram `api` opened from one of them, of 5 to 8 primary nodes plus at least one context node; one sequence of 9 to 12 messages, so a continuation page is built; one store flow of 3 steps; one section per figure, each with a question and two bullets. Every item cites a Shamel.Backend file, line range and symbol the agent has read; node ids start with their area id)
- Create: `docs/plans/2026-10-28-system-flow/results.md` (section `## Smoke`)

**Interfaces:**
- Consumes: `detect` and its `archify`, `theme`, `docsConfig`, `output` fields (06, 07, 12); `check`, `build` and `BuildResult` (01 to 17); `visual-check.md`.
- Produces: `proof/prepare-scratch` (`prepare-scratch <source> <target>`, prints the new HEAD); `results.md` with `## Smoke`, which task 20 extends.

**Seam:** the CLI run as a process on a real repository copy, the real archify 3.2.0 from a scratch copy, and the runtime's browser.

**Tests:** pass conditions, each recorded in `results.md` with the command and its output:
- `prepare-scratch`: run twice with the same target, the second exits 1 and leaves the first copy unchanged; the copy's `git log --oneline` has one line.
- `detect`, with `CLAUDE_CONFIG_DIR=<SCRATCH>/smoke/claude-config` (holding the archify copy under `skills/archify`): `archify.via` is `"CLAUDE_CONFIG_DIR"` and `archify.version` `"3.2.0"`; `theme.source` is `"docs/assets/docs.css"`; `docsConfig.path` is `"mkdocs.yml"`; `output.site` is `"docs/system-flow"`; `output.markdown` is `"docs/system"`, or `"docs/system-generated"` with the reason recorded.
- `check` on the committed smoke fragments exits 0 with `warnings` recorded.
- `build --archify <SCRATCH>/smoke/claude-config/skills/archify` exits 0. For each deep diagram, `diagrams[].renderer` and `reason` are recorded; each archify output holds one `fx-theme:begin` block; each fallback names its receipt, and the receipt's failure is quoted.
- No write outside the scratch copy: the archify copy's file list and bytes (`find <archify copy> -type f -newer <stamp>` with a stamp file touched before the build) show no change, and `git -C <scratch copy> status --porcelain` lists only paths under `docs/`.
- Flagless rebuild: `build` with the same `CLAUDE_CONFIG_DIR` and no flags exits 0 and its `diagrams` deep-equals the first build's.
- Layout: `layout-report.json` has every figure at `crossings <= 1` and `width <= 860`; the lines are copied into `results.md`.
- Visual check per `references/visual/visual-check.md`: `index.html` and every deep diagram at 1440 and 390, light and dark, archify outputs included, each pass or failure listed. Without a browser in this session, record `Visual check: not run: no browser`, name every page, and say the controller runs it before task 20 starts.

**Risks:** archify's `finalize --quality showcase` may need a browser or packages that the scratch HOME lacks; record the exact error, fall back to SVG for that diagram through the CLI's own fallback, and report it as a finding for task 20 rather than working around it. A symbol in Shamel.Backend's C# that the verifier's last-segment rule cannot find (generic types, `partial` classes) is a finding: record it and cite a line that holds the name.

**Idempotency:** each run writes a new scratch folder named `<SCRATCH>/smoke-<date>-<n>`; nothing is reused or deleted. `results.md` `## Smoke` is rewritten whole on a rerun.

**Testing:** E2E smoke on a real repository; `scripts/check-prose` on the committed text.

## Acceptance criteria
- [ ] `check` and `build --archify` pass on a real repository with real archify, and every diagram's renderer and reason are recorded.
- [ ] A second build with no flags renders every diagram the same way.
- [ ] Nothing is written outside the scratchpad, the archify copy included.
- [ ] The visual check is recorded, or recorded as not run with every page named.

## Steps

- [ ] **1. Write `prepare-scratch` and run it**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env docs/plans/2026-10-28-system-flow/proof/prepare-scratch /mnt/c/Users/Faisal/Downloads/Shamel.Backend <SCRATCH>/smoke-<date>-1/Shamel.Backend`

- [ ] **2. Copy archify**

Run: `mkdir -p <SCRATCH>/smoke-<date>-1/claude-config/skills`, then `cp -r /home/faisal/.claude/skills/archify <SCRATCH>/smoke-<date>-1/claude-config/skills/archify` (read only from the install path).

- [ ] **3. Write the smoke fragments from the code**

Read the Shamel.Backend copy with semble first, write the four fragments under `proof/smoke-fragments/`, copy them into the scratch copy's `docs/system-flow/model/fragments/`, and commit them there with the same `-c user.name=proof -c user.email=proof@local`.

- [ ] **4. Run detect, check and both builds**

Run each under `TMPDIR=<SCRATCH>/fx-tests/tmp CLAUDE_CONFIG_DIR=<SCRATCH>/smoke-<date>-1/claude-config scripts/scratch-env node scripts/system-flow --root <scratch copy> <subcommand>`.

- [ ] **5. Run the visual check**

- [ ] **6. Write `results.md` `## Smoke`**

- [ ] **7. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-prose`

- [ ] **8. Commit by path**

```
git add docs/plans/2026-10-28-system-flow/proof/prepare-scratch docs/plans/2026-10-28-system-flow/proof/smoke-fragments/meta.json docs/plans/2026-10-28-system-flow/proof/smoke-fragments/level0.json docs/plans/2026-10-28-system-flow/proof/smoke-fragments/api.json docs/plans/2026-10-28-system-flow/proof/smoke-fragments/chapters.json docs/plans/2026-10-28-system-flow/results.md
git commit -m "docs(plan): smoke run of the system-flow CLI and archify on Shamel.Backend"
```

No attribution trailers. Then continue to the next task: never stop and wait.
