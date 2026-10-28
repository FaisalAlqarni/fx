# 20: Proof run (a): Shamel.Backend and estimate calibration

**Status:** ready-for-agent (step 3 is controller only)
**Blocked by:** 18, 19
**Phase:** Polish

**What to build:** proof that the command produces system-flow depth on a real repo, and the measured constants the estimate needs. The task has three parts. Prep (agent): a fresh scratch copy of Shamel.Backend as a one-commit git repo, and the comparison script. Run (controller only): the controller session runs `/fx:fx-system-flow` in that copy as a headless `claude -p --plugin-dir <worktree>` session, which is a real session and not a subagent, so ADR 0055 holds; the plan is approved as proposed and the interview is answered "take the recommended answer for every question". Results (agent): the numbers in `results.md`, the depth against the hand-built bar, the comparison with system-flow's 141 Shamel.Backend evidence entries, `mkdocs build --strict` with the nav entries, and the estimate's constants replaced by measured values. Never touch `/mnt/c/Users/Faisal/Downloads/Shamel.Backend` beyond reading it, and never write under `/mnt`.

**Design:** Proof before merge; Open Questions; Error handling; Output location

**Files:**
- Modify: `docs/plans/2026-10-28-system-flow/results.md` (part `## (a) Shamel.Backend`)
- Create: `docs/plans/2026-10-28-system-flow/proof/compare-evidence.py` (run as `python3 -I`; reads system-flow's `model/system-model.json` and the new `system-model.json`, both paths as arguments; prints the overlap report as JSON)
- Create: `docs/plans/2026-10-28-system-flow/proof/run-a.md` (the exact three controller commands of step 3 with the scratch paths filled in, written by the agent in step 2)
- Modify: `src/lib/sf-estimate.ts` (measured constants, `calibrated: true`, the run date in `note`), `src/scripts/system-flow-estimate.test.ts` (expected values recomputed from the new constants)

**Interfaces:**
- Consumes: `proof/prepare-scratch` (task 18); the lane (task 15) and every CLI subcommand; `BuildResult.depth` (task 14); `scripts/build-cost` on the run's transcript; the `ESTIMATE` table (task 14).
- Produces: `results.md` part (a) with the fields below; the calibrated `ESTIMATE`, which task 21 estimates with.

**Seam:** the controller's headless run of `/fx:fx-system-flow` on the scratch copy, the CLI's own outputs, and the runtime's browser for the visual check.

**Tests:** pass conditions, each recorded in `results.md` with its evidence:
- `detect` stdout has `theme.source` `"docs/assets/docs.css"`, `docsConfig.path` `"mkdocs.yml"`, `output.site` `"docs/system-flow"` and `archify` non-null.
- `system-flow check` on the final model exits 0 (every evidence entry verified on path, range and symbol).
- Depth against the hand-built bar: a table of `BuildResult.depth.total` beside system-flow's numbers (23 diagrams, 4 levels, 301 nodes, 344 edges, 13 sequences, 132 messages, 130 store rows, 8 flows, 19 chapters, 1,785 evidence entries, 219 files), nodes counted as primary plus context; and a second table of planned against built per area from `depth.areas`, each shortfall with its cause.
- The comparison: `compare-evidence.py` prints `{ "systemFlowItems": <n>, "matched": <n>, "share": <matched / n, two decimals>, "missed": [{ "item", "reason" }], "added": [handles] }` over the system-flow items (nodes, edges, participants, messages, store rows, flow steps, facts) whose evidence cites a Shamel.Backend file, an item matched when the new model states an item with an overlapping range of the same file. Every missed item carries a reason written by the agent. There is no pass number: the owner reads the comparison and decides.
- MkDocs: with the nav entries and `exclude_docs` lines the run applied (the approval said yes), `python3 -I -m mkdocs build --strict -f mkdocs.yml -d <SCRATCH>/proof-a-<date>-<n>/mkdocs-site` in the scratch copy exits 0. When mkdocs is not installed, create a venv in the scratchpad with `python3 -I -m venv <SCRATCH>/proof-a-<date>-<n>/venv`, install `mkdocs-material` and the copy's `requirements` file if it has one, and run that venv's `python -I -m mkdocs`. A strict failure on the `system-flow/index.html` nav entry is a finding for ADR 0066's location rule and is recorded with the exact warning.
- The visual check passes for `index.html` and every deep diagram at 1440 and 390, light and dark, archify outputs included, or each failure is listed with the retry and fallback it took. Record whether archify sequence pages pass at 390 (design Open Question 1).
- Rules in force lists the current decisions of `docs/adr/` (count of rules versus count of numbered decisions in non-superseded ADRs).
- Numbers: estimate and actual tokens and wall-clock (actual tokens from `scripts/build-cost` on a copy of the run's transcript placed in the scratchpad; wall-clock as the sum of `duration_ms` over the three `claude -p` results), subagent dispatches, files cited, evidence entries, items by kind, diagrams by renderer, layout report totals, archify failures.
- Calibration: the new constants in `sf-estimate.ts` reproduce run (a)'s actual tokens and minutes from its `plan.json` within 10%; `node scripts/system-flow-estimate.test.js` passes with the recomputed expected values; `note` reads `constants measured on <date>`.

**Risks:** the headless session runs with a scratch HOME under the session scratchpad: CLAUDE_CONFIG_DIR=<scratch>/home/.claude holding a 0600 copy of the owner's .credentials.json, and a copy of /home/faisal/.claude/skills/archify at <scratch>/home/.claude/skills/archify, made with `cp -rL` because that path is a symlink and `cp -r` copies the link, so the lane finds archify; the transcript lands in the scratch config, nothing is written under /home/faisal, and the credential copy is deleted with find -delete when the results step ends.

**Idempotency:** each preparation writes a new scratch folder `<SCRATCH>/proof-a-<date>-<n>`; nothing is reused or deleted. `results.md` part (a) is rewritten whole on a rerun.

**Testing:** E2E proof; `node scripts/system-flow-estimate.test.js` and `scripts/check-all` for the calibration change.

## Acceptance criteria
- [ ] `results.md` part (a) holds every number and pass condition above, each with its source, the depth tables included.
- [ ] The original Shamel.Backend folder is byte-unchanged (compare `find -newer` against a stamp file made in the scratchpad before the run).
- [ ] `mkdocs build --strict` result is recorded with the nav entries in place.
- [ ] The estimate's constants are measured, and its tests pass.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Agent (prep): write `compare-evidence.py`; make the scratch copy**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env docs/plans/2026-10-28-system-flow/proof/prepare-scratch /mnt/c/Users/Faisal/Downloads/Shamel.Backend <SCRATCH>/proof-a-<date>-<n>/Shamel.Backend`, after `touch <SCRATCH>/proof-a-<date>-<n>.stamp`.

- [ ] **2. Agent (prep): write `proof/run-a.md` with the three commands below, paths filled in, then stop and report to the controller that step 3 is ready**

The three commands, run in order from the controller session, each in the background with its JSON result saved in the scratchpad:
1. `env -C <scratch copy> HOME=<scratch>/home CLAUDE_CONFIG_DIR=<scratch>/home/.claude TMPDIR=<scratch>/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json "/fx:fx-system-flow"` (detect, the planning pass and the estimate; the lane stops for approval; keep `session_id`)
2. `env -C <scratch copy> HOME=<scratch>/home CLAUDE_CONFIG_DIR=<scratch>/home/.claude TMPDIR=<scratch>/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json --resume <session_id> "Approve the plan as proposed, and yes to the MkDocs nav and exclude_docs changes."`
3. `env -C <scratch copy> HOME=<scratch>/home CLAUDE_CONFIG_DIR=<scratch>/home/.claude TMPDIR=<scratch>/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json --resume <session_id> "Take the recommended answer for every question."`

- [ ] **3. Controller only (run): run the three commands of `proof/run-a.md`; copy the session transcript into `<SCRATCH>/proof-a-<date>-<n>/transcript.jsonl`; hand the folder to the agent for step 4**

No subagent runs this step: a subagent may not invoke a user-invoked lane (ADR 0055).

- [ ] **4. Agent (results): run `system-flow check`, `stale`, the comparison, `mkdocs build --strict` and the visual check; collect the numbers; write `results.md` part (a)**

- [ ] **5. Agent (results): invoke `fx-tdd`; update `system-flow-estimate.test.ts` to the new expected values; verify RED; set the measured constants; verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-estimate.test.js`

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit by path**

```
git add docs/plans/2026-10-28-system-flow/results.md docs/plans/2026-10-28-system-flow/proof/compare-evidence.py docs/plans/2026-10-28-system-flow/proof/run-a.md src/lib/sf-estimate.ts lib/sf-estimate.js src/scripts/system-flow-estimate.test.ts scripts/system-flow-estimate.test.js
git commit -m "docs(plan): proof run (a) on Shamel.Backend; calibrate the estimate"
```

No attribution trailers.
