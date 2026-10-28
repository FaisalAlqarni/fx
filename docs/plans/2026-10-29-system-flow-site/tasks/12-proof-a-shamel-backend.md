# 12: Proof run (a): Shamel.Backend

**Status:** ready-for-agent (step 3 is controller only)
**Blocked by:** 10, 11
**Phase:** Proof

**What to build:** proof that the rerun lane produces a site that teaches, on a real repo, measured against the owner's page. Prep (agent): a fresh scratch copy of Shamel.Backend as a one-commit git repo, and the controller's commands. Run (controller only): `/fx:fx-system-flow` in that copy as headless `claude -p --plugin-dir /development/fx/.worktrees/system-flow` sessions, a real session and not a subagent, so ADR 0055 holds. Results (agent): the build and evidence checks, the comparison table against the owner's page, the full visual check, the estimate against actual cost, and the estimate's constants recalibrated from this run. Never write under `/mnt`; `/mnt/c/Users/Faisal/Downloads/Shamel.Backend` is only read.

**Design:** Proof; Build result and report; Further Notes

**Files:**
- Create: `docs/plans/2026-10-29-system-flow-site/proof/run-a.md` (the controller commands, paths filled in)
- Modify: `docs/plans/2026-10-29-system-flow-site/results.md` (part `## (a) Shamel.Backend`)
- Modify: `src/lib/sf-estimate.ts` (constants measured on this run, `measuredOn`), `src/scripts/system-flow-estimate.test.ts` (expected values recomputed)

**Interfaces:**
- Consumes: `docs/plans/2026-10-28-system-flow/proof/prepare-scratch`; the lane (task 10); `page-check.js --measure` and `compare.js` and the baseline (task 11); `BuildResult.prose` and `depth`; `scripts/build-cost`; `ESTIMATE` in `sf-estimate.ts`.
- Produces: `results.md` part (a); the recalibrated `ESTIMATE` task 13 estimates with.

**Seam:** the controller's headless run, the CLI's outputs, Chromium through `<PW>`.

**Tests:** pass conditions, each recorded in `results.md` with its evidence. A pass line that fails is recorded in `results.md` as failed, with its measured value and evidence, and reported to the owner when the task ends. Nobody tunes the run to pass: no fragment edited by hand, no rerun with a changed prompt, no pass line or measure changed after the fact.
- The final `system-flow check` exits 0 and the last `build` exits 0 (every evidence entry verified on path, range and symbol); `build` stdout `prose` recorded.
- The comparison table from `compare.js` (owner's page beside site (a)) meets every pass line of the design's Proof table: average prose at least 120 words per chapter; every chapter with a lead and 4 to 8 bullets; glossary 15 to 40; every model sequence drawn inline as lifelines; side menu sticky at 1440, 230 to 250 px wide, three groups, current chapter marked after three chapters, sticky top bar at 390 that opens and closes; filter narrows on a known term and clearing restores; every figure in a card whose box contains its bar, the bar in the viewport while the card is; every figure reaches step 1 within 3 s of its box reaching the middle, at both widths, and pauses when scrolled away; Reset returns to `0 / <n>` and stops, Play reads Pause while playing and stops at the current step; no figure text under 12 px; no page-level horizontal scroll at 390; 0 console errors on every page and width.
- The full visual check of `references/visual/visual-check.md` on `index.html` and every deep diagram (archify outputs included) at 1440 and 390, light and dark; each failure listed with the fallback it took.
- Numbers: estimate against actual tokens (`scripts/build-cost` on a copy of the run's transcript in the scratchpad) and wall-clock (sum of `duration_ms` over the `claude -p` results); subagent dispatches; chapters, words, glossary size, lifelines.
- Calibration: the new constants reproduce run (a)'s tokens and minutes from its `plan.json` within 10%; `node scripts/system-flow-estimate.test.js` passes with the recomputed values.
- The original folder is unchanged: `find /mnt/c/Users/Faisal/Downloads/Shamel.Backend -newer <SCRATCH>/proof-a2-<date>-<n>.stamp` lists 0 files.
- Screenshots for the owner's review saved under the run folder and listed in `results.md`. The owner reviews the result; the table is evidence for that review.

**Risks:** the run step needs the owner's login; only the controller handles the credential. A run that stops for a decision (a prose floor still failing after 2 rounds, a short glossary) is answered by the controller with the lane's recommended option and recorded in `run-a.md`.

**Idempotency:** each preparation writes a new `<SCRATCH>/proof-a2-<date>-<n>` folder; nothing is reused or deleted except the credential copy. `results.md` part (a) is rewritten whole on a rerun.

**Testing:** E2E proof; `node scripts/system-flow-estimate.test.js` and `scripts/check-all` for the calibration.

## Acceptance criteria
- [ ] `results.md` part (a) holds every pass condition above with its source, and the comparison table; every failed pass line is marked failed and named in the report to the owner.
- [ ] The credential copy is gone (`find <run>/home/.claude/.credentials.json` finds nothing).
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Agent (prep): `touch <SCRATCH>/proof-a2-<date>-<n>.stamp`; run `prepare-scratch /mnt/c/Users/Faisal/Downloads/Shamel.Backend <SCRATCH>/proof-a2-<date>-<n>/Shamel.Backend`; make `<run>/home/.claude` and `<run>/tmp`**

- [ ] **2. Agent (prep): write `proof/run-a.md` with the commands below, paths filled in; report to the controller that step 3 is ready, then stop**

Setup, controller: `install -m 600 /home/faisal/.claude/.credentials.json <run>/home/.claude/.credentials.json`; `cp -rL /home/faisal/.claude/skills/archify <run>/home/.claude/skills/archify`.
Then, each in the background with its JSON result saved as `<run>/step<n>.json`:
1. `env -C <run>/Shamel.Backend HOME=<run>/home CLAUDE_CONFIG_DIR=<run>/home/.claude TMPDIR=<run>/tmp claude -p --plugin-dir /development/fx/.worktrees/system-flow --permission-mode bypassPermissions --output-format json "/fx:fx-system-flow"` (keep `session_id`)
2. the same with `--resume <session_id> "Approve the plan as proposed, and yes to the MkDocs nav and exclude_docs changes."`
3. the same with `--resume <session_id> "Take the recommended answer for every question."`
Teardown, controller: copy the transcript to `<run>/transcript.jsonl`; `find <run>/home/.claude/.credentials.json -delete`.

- [ ] **3. Controller only (run): run `proof/run-a.md` in order; hand the folder to the agent**

No subagent runs this step: a subagent may not invoke a user-invoked lane (ADR 0055).

- [ ] **4. Agent (results): run `check`, `build`, `page-check.js --measure fx` and `compare.js` against the baseline, and the visual check; write `results.md` part (a), each failed pass line marked failed, and list the failed lines in the report to the owner**

- [ ] **5. Agent (results): invoke `fx-tdd`; update `system-flow-estimate.test.ts` to the new expected values; verify RED; set the measured constants; verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node scripts/system-flow-estimate.test.js`

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- docs/plans/2026-10-29-system-flow-site/proof/run-a.md docs/plans/2026-10-29-system-flow-site/results.md src/lib/sf-estimate.ts lib/sf-estimate.js src/scripts/system-flow-estimate.test.ts scripts/system-flow-estimate.test.js
git commit -m "test(system-flow): proof run (a) on Shamel.Backend; recalibrate the estimate"
```

Never push, merge or open a PR.
