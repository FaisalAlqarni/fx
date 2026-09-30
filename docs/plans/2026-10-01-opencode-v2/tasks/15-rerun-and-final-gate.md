# 15: Re-run and final gate

**Status:** ready-for-agent
**Blocked by:** 09, 11, 12, 13, 14
**Phase:** Fix

**What to build:** proof that fx now works fully on all four harnesses: the full live matrix re-run on every harness that Phase B changed (any file that harness loads changed since the baseline commit), `INSTALL.md`'s "What is verified" table written from these runs, and `scripts/check-all` green once.

**Files:**
- Modify: `INSTALL.md`
- Modify: `docs/plans/2026-10-01-opencode-v2/baseline.md` (a "Final" table per re-run harness)

**Interfaces:**
- Consumes: tasks 11 to 14's commits and rulings; the baseline commit recorded in `baseline.md`; `FX_LIVE_PROVIDER=openrouter` and the key from the controller.
- Produces: the verified table: per harness, version, date, pass, fail and GAP counts, model(s) as the sessions reported them, rows that passed on the fallback model, log path, and every remaining GAP with its reason.

**Seam:** the runner and `scripts/check-all`.

**Risks:**
- **Precondition, checked first:** the OpenRouter account has purchased credits, checked exactly as task 10's **Risks** states (`https://openrouter.ai/api/v1/credits`, `total_credits > 0`, only the exit status printed). On failure, stop and report; run nothing.
- **Which harnesses re-run:** for each harness, list the files it loads (its plugin or hook, the `lib/` modules those import, its install route, its rows and their `lib/` helpers, its reference file, `PREAMBLE.md`, and the skills, agents and commands it installs) and intersect them with `git diff --name-only <baseline commit>..HEAD`. A non-empty intersection means the harness changed and its full matrix re-runs (Claude Code: D7's six rows). Record each intersection in the report.
- **Request budget and pacing:** as in task 10: budget per harness, one row at a time with 60 seconds between rows, harnesses spread over UTC days when the day's free-model limit is below their sum.
- The runner output each run tees to a file is scanned for `sk-or-` before it is kept or quoted, as in task 10.
- A row ruled model capability in Phase B may pass on the fallback in the Final table and is marked so; a row ruled fixed must pass on its first model.
- `scripts/check-all` stops at its first failure; the two failures that predate this plan on `main` (`check-prose` on `AGENTS.md`, `check-prose-explicit-path.sh` under a nested worktree) are classified as the lean-review exit gate taught: run on the merge base, and if pre-existing, run the rest past them from a checkout outside `.worktrees`, naming both in the report. Run `check-all` with the 1.18.25 binary first on `PATH` for the `opencode` free rows.

**Idempotency:** scratch homes; the table replaced whole.

**Testing:** the matrix and `check-all`.

## Acceptance criteria
- [ ] The report lists, per harness, the changed files found against the baseline commit, and every harness with a non-empty list has a Final table with 0 FAIL and only GAPs listed in `tests/conformance/expected-gaps` with reasons.
- [ ] `INSTALL.md`'s table has Claude Code, Codex, OpenCode 1.18.25 and OpenCode 2.0.18 rows written from these runs and the baseline.
- [ ] `scripts/check-all` passes apart from failures proven to predate this plan on `main`.
- [ ] No kept file contains `sk-or-`: the branch, every kept log and every teed runner output.

## Steps

- [ ] **1.** Run the credits precondition; stop on failure. Compute the changed harnesses against the baseline commit.
- [ ] **2.** Re-run the live matrix on each changed harness, as in task 10, output teed to a file and scanned for `sk-or-`.
- [ ] **3.** Write the Final tables and the `INSTALL.md` table.
- [ ] **4.** Run `scripts/check-all` from a checkout outside `.worktrees`, 1.18.25 first on `PATH`; classify any failure against the merge base.
- [ ] **5.** `git grep -n 'sk-or-'` over the branch returns nothing, and `grep -rl 'sk-or-'` over the kept logs and teed outputs returns nothing.
- [ ] **6. Commit**

```
git add INSTALL.md docs/plans/2026-10-01-opencode-v2/baseline.md
git commit -m "docs(opencode-v2): verified on four harnesses"
```
