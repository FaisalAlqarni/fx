# 21: Proof run (b): four Advantage roots

**Status:** ready-for-agent (step 3 is controller only)
**Blocked by:** 20
**Phase:** Polish

**What to build:** proof that one site covers a system spread over four repositories, and that the calibrated estimate holds. Prep (agent): scratch git clones of `/development/advantage-backend` (the host), `/development/advantage-guide`, `/development/sdks/android` and `/development/test-apps/android/advantage-store`, side by side in one scratch folder, and the controller's commands. Run (controller only): a headless `claude -p --plugin-dir <worktree>` session types `/fx:fx-system-flow --repo ../advantage-guide --repo ../android --repo ../advantage-store` in the host clone, so the lane's `detect --repo ... --write` records the roots; the plan is approved as proposed and the interview answered "take the recommended answer for every question". Results (agent): the numbers in `results.md` part (b). The real repos are only ever read by `git clone`.

**Design:** Proof before merge; The lane; Evidence verifier

**Files:**
- Modify: `docs/plans/2026-10-28-system-flow/results.md` (part `## (b) Advantage, four roots`)
- Create: `docs/plans/2026-10-28-system-flow/proof/run-b.md` (the exact three controller commands of step 3 with the scratch paths filled in)

**Interfaces:**
- Consumes: the lane (task 15), every CLI subcommand, `detect --repo` (task 06), `BuildResult.depth` (task 14), the calibrated `ESTIMATE` (task 20), `run-a.md`'s command shape (task 20); `git clone --no-hardlinks` replaces `prepare-scratch`'s copy, since the sources are git repos.
- Produces: `results.md` section `## (b) Advantage, four roots`.

**Seam:** the controller's headless run of `/fx:fx-system-flow` on the scratch clones, the CLI's outputs, and the runtime's browser.

**Tests:** pass conditions, each recorded in `results.md` with its evidence:
- `.fx.json` in the host clone holds `system_flow.roots` for `advantage-guide`, `android` and `advantage-store`, each a relative path starting `../`, and the final model's `meta.roots` lists the same ids after the host's.
- `system-flow check` exits 0 on the final model, and evidence in all four roots resolves (each root id appears in at least one verified evidence entry).
- The visual check passes for `index.html` and every deep diagram at 1440 and 390, light and dark.
- The coverage report lists every engine: `coverage.json` holds one `engine` entry per Rails engine under `engines/` in the host clone (count them with `ls engines`), each with a chapter or `null`.
- Depth: `BuildResult.depth.total` and the planned against built table per area, as in part (a); no bar applies.
- The estimate made at the planning pass with the calibrated constants and the actual (tokens from `scripts/build-cost` on a copy of the run's transcript in the scratchpad, wall-clock as the sum of `duration_ms` over the three results) each land within 50%: `|actual - estimate| / estimate <= 0.5` for tokens and for wall-clock.
- The same numbers as run (a): subagent dispatches, files cited, evidence entries, items by kind, diagrams by renderer, layout report totals, archify failures.

**Risks:** advantage-backend has about 13,038 tracked files: the planning pass must split areas over 400 files, and the approval takes the plan as proposed, so record the areas and their `filesToRead`. `git clone` of a local path reads the source's objects only. The real repos' working trees are never opened for writing; verify with `git -C <real repo> status --porcelain` before and after showing the same output. The headless session's HOME and permission mode are as in task 20's Risks, the archify copy included: `cp -rL`, never `cp -r`.

**Idempotency:** each run clones into a new scratch folder `<SCRATCH>/proof-b-<date>-<n>`; nothing is reused or deleted.

**Testing:** E2E proof.

## Acceptance criteria
- [ ] `results.md` part (b) holds every number and pass condition above.
- [ ] The estimate is within 50% on tokens and on wall-clock, or the miss is recorded with its cause and the owner decides.
- [ ] The four real repos show the same `git status --porcelain` before and after.

## Steps

- [ ] **1. Agent (prep): record `git status --porcelain` of the four real repos into the scratchpad**

- [ ] **2. Agent (prep): clone the four repos into `<SCRATCH>/proof-b-<date>-<n>/` as `advantage-backend`, `advantage-guide`, `android` and `advantage-store` with `git clone -q --no-hardlinks`, under `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env`; write `proof/run-b.md` (task 20's three commands, run in the host clone, the first prompt `/fx:fx-system-flow --repo ../advantage-guide --repo ../android --repo ../advantage-store`); then stop and report to the controller that step 3 is ready**

- [ ] **3. Controller only (run): run the three commands of `proof/run-b.md`; copy the session transcript into `<SCRATCH>/proof-b-<date>-<n>/transcript.jsonl`; hand the folder to the agent for step 4**

No subagent runs this step: a subagent may not invoke a user-invoked lane (ADR 0055).

- [ ] **4. Agent (results): run `system-flow check`, `stale`, read `coverage.json` and the depth block, compute the estimate error, write `results.md` part (b)**

- [ ] **5. Agent (results): compare the real repos' `git status --porcelain` with step 1**

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-prose`

- [ ] **7. Commit by path**

```
git add docs/plans/2026-10-28-system-flow/results.md docs/plans/2026-10-28-system-flow/proof/run-b.md
git commit -m "docs(plan): proof run (b) on four Advantage roots"
```

No attribution trailers.
