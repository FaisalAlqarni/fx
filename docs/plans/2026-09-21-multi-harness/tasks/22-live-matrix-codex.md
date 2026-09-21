# 22: Live matrix on Codex, the merge gate

**Status:** blocked-until 2026-10-21 (Codex quota reset)
**Blocked by:** 21
**Phase:** Amendment

**What to build:** Evidence that fx works on Codex in real sessions. Codex
parity is the point of this whole plan, so the branch does not merge until
this matrix passes. Design amendment A9.

Codex quota ran out during task 12 ("You've hit your usage limit", resets
2026-10-21). Rows 04 to 08, 12 and 15 to 17 were recorded as `GAP: not run`.
Everything else in the amendment is proven before this date.

**Files:**
- No product files.

**Interfaces:**
- Consumes: `bash tests/conformance/run.sh codex`, `tests/conformance/lib/live.sh`
- Consumes: task 14 (Codex runs `fx-codex.js`), task 16 (roles, the restart
  notice, and `agent_type` dispatch), task 17 (roles have no shell)
- Produces: a matrix block in the report, for the controller to copy into the
  ledger

**Seam:** the conformance runner, live.

**Risks:**
- HIGH: plugin hooks run on Codex only after the user trusts them in
  `/hooks`. A scratch `CODEX_HOME` starts untrusted. Find how the task 12 rows
  handled this, in `tests/conformance/lib/live.sh`, and confirm the hooks
  actually ran. The evidence is a `$fx-tdd` addressing line in the session,
  not `fx:fx-tdd`. If a run shows Claude Code addressing, the hooks did not
  load: report that as a FAIL, not a GAP.
- HIGH: roles become visible only from the second session. Row 12 must run a
  first session that plants the roles, then its assertions in a second
  session. If the row as written uses one session, report it as a finding for
  the controller. Do not edit the row inside this task.
- The safety rules from task 21 apply unchanged.

**Idempotency:** as task 21.

**Testing:** this task is the test.

## Acceptance criteria
- [ ] The run is dated 2026-10-21 or later, and the quota is available
- [ ] The session evidence shows Codex addressing (`$fx-tdd`), proving `fx-codex.js` loaded
- [ ] Rows 01, 02 and 16 PASS: the preamble arrives whole, with `additionalContextLimit: 0`
- [ ] Rows 06 to 08 PASS: the guard refuses through `fx-codex.js`
- [ ] Row 12 PASSes: a read-only role dispatched with `agent_type` cannot patch or run a shell
- [ ] Row 15 PASSes: two-level dispatch completes
- [ ] Row 17 PASSes: the lane check reaches `apply_patch`
- [ ] Every row has exactly one result, with a reason for each GAP

## Steps

- [ ] **1. Confirm the quota**

Run one Codex row alone, such as row 01. If it reports `GAP: not run` for
quota, stop and report BLOCKED with the reset time.

- [ ] **2. Run the Codex matrix**

Run: `HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" bash tests/conformance/run.sh codex`,
as a tracked background command, then end your turn.

- [ ] **3. Re-run suspected flakes once, record both**

- [ ] **4. Report**

Write the matrix block and the evidence for every FAIL into the report file.
No commit is needed unless a documentation file changed.

Then continue to the next task: never stop and wait.
