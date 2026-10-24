# 14: Live rows 12 to 23 on Node

**Status:** ready-for-agent
**Blocked by:** 13
**Phase:** Hardening

**What to build:** the remaining conformance live rows become TypeScript rows on task 13's live library: rows 12 to 20, and rows 21 to 23 that sub-project 2 added as bash rows sourcing `live.sh` (the plan's Global Constraints allow this edit of sub-project 2's files). After this no conformance row is bash. `live.sh`, `jail.sh` and the runner's `.sh` branch stay: the review-bench and fixture-build rows still source `live.sh` and run as `.sh` rows, and the lane-triggering runners source `jail.sh` (tasks 15 and 16 move them; task 16 deletes the bash libraries).

**Design:** Implementation Decisions > 11; Implementation Decisions > 14; Implementation Decisions > 15

**Files:**
- Create: `src/tests/conformance/rows/12-read-only-agent-cannot-edit.ts` through `src/tests/conformance/rows/20-v2-command-runs.ts` (nine rows), and `src/tests/conformance/rows/21-shell-guard-hard-rule.ts`, `22-stop-check-in-session.ts`, `23-stop-check-in-subagent.ts` (sub-project 2's rows; if sub-project 2 named them differently, use the names `git ls-files tests/conformance/rows` shows)
- Delete: `tests/conformance/rows/12-read-only-agent-cannot-edit.sh` through `tests/conformance/rows/23-stop-check-in-subagent.sh`
- Keep: `tests/conformance/lib/live.sh`, `jail.sh`, `opencode-v2.sh`, `scratch-home.sh` (sourced by bash files tasks 15 and 16 move; task 16 deletes them)

**Interfaces:**
- Consumes: `lib/live`, `lib/jail`, `lib/plant-codex-roles` (task 13); `lib/opencode-v2`, `lib/scratch-home` (task 12).
- Row 20 still execs the CLI through `tests/conformance/lib/with-key.sh` inside the jail, unchanged.

**Seam:** `--describe` comparison; stub-driven tests from task 13; free runs in `check-all`.

**Tests:**
- Rows 12 to 23, each harness: `node <row>.js --describe` equals `bash <row>.sh --describe` at `old.rev`.
- Stub-CLI comparison for rows 12 to 23 with task 13's `stub-rows.test`: same exit code and stderr, old against new; output to the ledger.
- Any row sub-project 2 or 3 added beyond 23: `git ls-files 'tests/conformance/rows/*.sh'` prints nothing after this task.
- `git ls-files tests/conformance/rows` lists no `.sh` file.
- `bash tests/review-bench/row-safety.test.sh` still passes (it reads `live.sh`, which keeps working).
- Free runs on all four harnesses pass.

**Risks:** row 20 passes the key through a file and `with-key.sh` so it never appears in a process argument; the TypeScript row must keep that path exactly and must not put the key in `env` of a spawned process outside the jail.

**Idempotency:** writes only scratch directories.

**Testing:** `--describe` comparison; free runs; `check-all`. Live runs with model calls are the owner's.

## Acceptance criteria
- [ ] Rows 12 to 23 `--describe` and stub-CLI runs identical; `.sh` rows gone.
- [ ] `git grep -nE "conformance/rows/[0-9]+-[a-z-]+\.sh"` outside `docs/plans/` prints nothing.
- [ ] `node scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; save each row's `--describe` to the ledger; read sub-project 2's task file for rows 21 to 23 (`docs/plans/2026-10-22-fx-judge-hooks/`)**
- [ ] **3. Port the first row and compare its `--describe`: verify RED before the port (the `.js` file is missing), GREEN after**

Run: `scripts/build && node tests/conformance/rows/12-read-only-agent-cannot-edit.js --describe`

- [ ] **4. Port rows 13 to 23**
- [ ] **5. Verify GREEN**: `--describe` and stub-CLI comparison for every row and harness
- [ ] **6. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **7. Commit by path**

```
git rm tests/conformance/rows/12-read-only-agent-cannot-edit.sh tests/conformance/rows/13-audit-lane-not-model-facing.sh tests/conformance/rows/14-audit-lane-user-invocable.sh tests/conformance/rows/15-subagent-dispatches-subagent.sh tests/conformance/rows/16-project-note-and-plan-state.sh tests/conformance/rows/17-lane-check-reaches-runtime.sh tests/conformance/rows/18-read-only-agent-cannot-delegate-a-write.sh tests/conformance/rows/19-v2-guard-policy-refuses.sh tests/conformance/rows/20-v2-command-runs.sh tests/conformance/rows/21-shell-guard-hard-rule.sh tests/conformance/rows/22-stop-check-in-session.sh tests/conformance/rows/23-stop-check-in-subagent.sh
git add src/tests/conformance/rows tests/conformance/rows
git commit -m "test: live rows 12 to 23 on Node"
```
