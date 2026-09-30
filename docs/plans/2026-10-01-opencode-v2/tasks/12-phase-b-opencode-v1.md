# 12: Phase B: OpenCode v1

**Status:** ready-for-agent
**Blocked by:** 10, 11
**Phase:** Fix

**What to build:** every FAIL and GAP that `baseline.md` records for OpenCode v1 (OpenCode 1.18.25) is either fixed, so the row passes live, or proven unclosable on that runtime and stated. Fixes touch only this harness's files: its plugin or hook, its install route, its rows' cases, its reference file. A fix that needs a shared `lib/` change is made only if the other harnesses' gates and free rows stay green, and says so in the report.

**Files:**
- Modify: decided per failure; each listed in the report with the row it fixes.
- Modify: `docs/plans/2026-10-01-opencode-v2/baseline.md` (append a "Resolved" column per row: the commit that fixed it, or the ruling that it cannot be closed)

**Interfaces:**
- Consumes: `baseline.md`'s OpenCode v1 tables; `FX_LIVE_PROVIDER=openrouter` and `OPENROUTER_API_KEY` from the controller.
- Produces: fixes, and for any unclosable gap an entry in `tests/conformance/expected-gaps` plus its reason for `INSTALL.md` (task 14 writes the table).

**Seam:** per failure, the row that failed, re-run alone through `FX_CONFORMANCE_ROWS`.

**Risks:** each failure is a bug report: diagnose with `fx-debug` (a red-capable loop first, the row alone), then fix through `fx-tdd`. A capability failure of the free model that passes on re-run is flaky, not a bug: record both runs. Do not weaken a row to make it pass: a changed assertion needs a stated reason in the report, and the reviewer checks it.

**Idempotency:** each fix is a normal commit; re-running a row is safe.

**Testing:** each fixed row passes live on its own; the harness's free rows and gates stay green.

## Acceptance criteria
- [ ] Every OpenCode v1 non-PASS row in `baseline.md` has a Resolved entry: a commit, or a ruling with evidence that it cannot be closed.
- [ ] Each fixed row passes live when re-run alone, with the model named.
- [ ] Every gate test and free row of every harness still passes.

## Steps

- [ ] **1.** List the OpenCode v1 non-PASS rows from `baseline.md`.
- [ ] **2.** For each, in order: invoke `fx-debug`, build the loop (the row alone), find the cause, invoke `fx-tdd`, write the failing check at the right seam, fix, re-run the row live, commit with the cause stated in the message.
- [ ] **3.** For each gap proven unclosable: add it to `tests/conformance/expected-gaps` with a comment naming the evidence, and write its one-line reason into `baseline.md`.
- [ ] **4.** Run every gate test and free row: `node tests/gates/*.test.js` one by one as `scripts/check-all` lists them, and `bash tests/conformance/run.sh <each harness> --free`.
- [ ] **5.** Commit `baseline.md` and `expected-gaps` changes by path.
