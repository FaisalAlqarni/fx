# 21: Live matrix on Claude Code and opencode

**Status:** ready-for-agent
**Blocked by:** 14, 15, 16, 17, 18, 19
**Phase:** Amendment

**What to build:** Evidence, not code. Run the full conformance matrix, free
and live, on Claude Code and on opencode against the amended tree. Record
every row's result, and fix nothing in product code. A failing row becomes a
finding for the controller. Part of design amendment A9.

Every FAIL in task 12's matrix belongs to a fix in this amendment:
- Claude Code rows 01, 02 and 16: preamble split, task 15.
- opencode row 15: task 18.

This task shows whether those fixes hold in real sessions. It also runs the
one check task 12 still owes: Claude Code row 06 under the round 2 jail. That
run hit Claude's session limit.

**Files:**
- Modify: `tests/conformance/README.md`  (only the "Last run" section, if it has one)
- No product files.

**Interfaces:**
- Consumes: `bash tests/conformance/run.sh <harness>` and
  `tests/conformance/lib/live.sh` (task 12)
- Produces: a matrix block in the report, one line per row per runtime, in
  the same format as task 12's block in `state.md`. The controller copies it
  into the ledger.

**Seam:** the conformance runner, live.

**Risks:**
- MEDIUM: quota. Claude Code has a session limit, and it was hit twice in
  this build. `live.sh` reports quota exhaustion as `GAP: not run`, never a
  pass. If quota runs out mid-matrix, report which rows did not run. The
  controller re-dispatches after the reset.
- MEDIUM: opencode runs on the user's local llama-server (Qwen 3.8 27B, one
  slot, at `127.0.0.1:8899`). Rows 04 and 12 need a capable model. Re-run a
  suspected capability failure once, and record both results.
- The same safety rules as task 12 apply:
  - `HOME` is a fresh `mktemp -d` on every command line, and `FX_REAL_HOME`
    is set explicitly.
  - Credentials are copied in, never out.
  - Nothing is written under the real homes.
  - `rm` only on exact paths, never a glob.

**Idempotency:** the runner isolates every row in a scratch home, removed on
exit.

**Testing:** this task is the test.

## Acceptance criteria
- [ ] Rows 01, 02 and 16 PASS on Claude Code, or each FAIL is reported with the log evidence showing why
- [ ] Row 15 PASSes on opencode, or its FAIL is reported with evidence
- [ ] Row 12 on both runtimes is reported with its evidence. It now covers shell writes, because read-only agents have no shell after task 17
- [ ] Claude Code row 06 has run under the round 2 jail
- [ ] Every row on both runtimes has exactly one result, PASS, FAIL or GAP, with a reason for each GAP
- [ ] No product file changed in this task

## Steps

- [ ] **1. Confirm the free gate**

Run: `HOME="$(mktemp -d)" scripts/check-all`. Expected: `ALL GREEN`. If it is
not green, stop and report BLOCKED: the amendment tasks left the tree red.

- [ ] **2. Run the Claude Code matrix**

Run: `HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" bash tests/conformance/run.sh claude-code`,
where `HOME_REAL` is the user's real home, set explicitly by you. Launch it as
a tracked background command and end your turn. It wakes you when it exits.

- [ ] **3. Run the opencode matrix**

Run the same command for `opencode`, only after the Claude Code run has
exited. The llama-server has one slot.

- [ ] **4. Re-run suspected flakes once**

For any FAIL that looks like model capability rather than fx, re-run that row
alone once, and record both results.

- [ ] **5. Report**

Write the matrix block and the evidence for every FAIL into the report file.

- [ ] **6. Commit**

Only if `tests/conformance/README.md` changed:
```
git add tests/conformance/README.md
git commit -m "docs(conformance): record the amended matrix on Claude Code and opencode"
```

No attribution trailers. Then continue to the next task: never stop and wait.
