# 13: Proof run (b): the four Advantage repos

**Status:** ready-for-agent (step 3 is controller only)
**Blocked by:** 12
**Phase:** Proof

**What to build:** the same proof on four roots: host `advantage-backend` plus `advantage-guide`, the Android SDK and the store app, cloned into the scratchpad and never touched in place. Prep (agent): the clones and the controller's commands. Run (controller only): headless `/fx:fx-system-flow` with three `--repo` flags. Results (agent): the checks, the comparison table with the owner's page and site (a), the visual check, and the estimate (calibrated by task 12) against actual cost.

**Design:** Proof

**Files:**
- Create: `docs/plans/2026-10-29-system-flow-site/proof/run-b.md`
- Modify: `docs/plans/2026-10-29-system-flow-site/results.md` (part `## (b) Advantage, four roots`)

**Interfaces:**
- Consumes: everything task 12 consumes; the calibrated `ESTIMATE` (task 12); site (a)'s measure JSON for the three-column table.

**Seam:** the controller's headless run, the CLI's outputs, Chromium through `<PW>`.

**Tests:** pass conditions, each recorded in `results.md` with its evidence. A pass line that fails is recorded in `results.md` as failed, with its measured value and evidence, and reported to the owner when the task ends. Nobody tunes the run to pass: no fragment edited by hand, no rerun with a changed prompt, no pass line or measure changed after the fact.
- The final `check` and `build` exit 0 with every evidence entry verified in all four roots; `prose` recorded.
- `compare.js <owner.json> <a.json> <b.json>`: site (b) meets every pass line of the design's Proof table, the Reset and Play/Pause player checks included.
- The full visual check on `index.html` and every deep diagram at 1440 and 390, light and dark.
- Numbers: estimate against actual tokens and wall-clock, with the difference in percent; subagent dispatches; chapters, words, glossary size, lifelines; layout report totals.
- The real repos are unchanged: `git -C <real repo> status --porcelain` after the run equals the snapshot taken in step 1, for each of the four.

**Risks:** the run may stop on a layout decision as run (b) of the first iteration did; the controller answers with the lane's recommended option and records the prompt in `run-b.md`.

**Idempotency:** a new `<SCRATCH>/proof-b2-<date>-<n>` folder per preparation; `results.md` part (b) is rewritten whole.

**Testing:** E2E proof.

## Acceptance criteria
- [ ] `results.md` part (b) holds every pass condition above with its source; every failed pass line is marked failed and named in the report to the owner.
- [ ] The four real repos' status equals the step-1 snapshots; the credential copy is gone.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Agent (prep): snapshot `git -C <repo> status --porcelain` into `<run>/status-before-<name>.txt` for each real repo; `git clone -q --no-hardlinks` each of `/development/advantage-backend`, `/development/advantage-guide`, `/development/sdks/android`, `/development/test-apps/android/advantage-store` into `<SCRATCH>/proof-b2-<date>-<n>/` side by side; make `<run>/home/.claude` and `<run>/tmp`**

- [ ] **2. Agent (prep): write `proof/run-b.md` as `run-a.md`, with step 1's prompt `"/fx:fx-system-flow --repo ../advantage-guide --repo ../android --repo ../advantage-store"` run from the `advantage-backend` clone; report to the controller that step 3 is ready, then stop**

- [ ] **3. Controller only (run): setup, run `proof/run-b.md` in order, teardown (the credential copy deleted with `find -delete`); hand the folder to the agent**

No subagent runs this step (ADR 0055).

- [ ] **4. Agent (results): run `check`, `build`, `page-check.js --measure fx`, `compare.js` with three columns, and the visual check; compare the status snapshots; write `results.md` part (b)**

- [ ] **5. Agent (results): mark each failed pass line failed in `results.md` and list the failed lines in the report to the owner; change nothing to make a line pass**

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- docs/plans/2026-10-29-system-flow-site/proof/run-b.md docs/plans/2026-10-29-system-flow-site/results.md
git commit -m "test(system-flow): proof run (b) on the four Advantage repos"
```

Never push, merge or open a PR.
