# 14: Re-run and final gate

**Status:** ready-for-agent
**Blocked by:** 09, 11, 12, 13
**Phase:** Fix

**What to build:** proof that fx now works fully on all four harnesses: the full live matrix re-run on every harness that Phase B changed, `INSTALL.md`'s "What is verified" table written from these runs, and `scripts/check-all` green once.

**Files:**
- Modify: `INSTALL.md`
- Modify: `docs/plans/2026-10-01-opencode-v2/baseline.md` (a "Final" table per re-run harness)

**Interfaces:**
- Consumes: tasks 11 to 13's commits and rulings; `FX_LIVE_PROVIDER=openrouter` and the key from the controller.
- Produces: the verified table: per harness, version, date, pass, fail and GAP counts, model(s), log path, and every remaining GAP with its reason.

**Seam:** the runner and `scripts/check-all`.

**Risks:** `scripts/check-all` stops at its first failure; the two failures that predate this plan on `main` (`check-prose` on `AGENTS.md`, `check-prose-explicit-path.sh` under a nested worktree) are classified as the lean-review exit gate taught: run on the merge base, and if pre-existing, run the rest past them from a checkout outside `.worktrees`, naming both in the report. Run `check-all` with the 1.18.25 binary first on `PATH` for the `opencode` free rows.

**Idempotency:** scratch homes; the table replaced whole.

**Testing:** the matrix and `check-all`.

## Acceptance criteria
- [ ] Every harness Phase B changed has a Final table with 0 FAIL and only GAPs listed in `tests/conformance/expected-gaps` with reasons.
- [ ] `INSTALL.md`'s table has Claude Code, Codex, OpenCode 1.18.25 and OpenCode 2.0.18 rows written from these runs and the baseline.
- [ ] `scripts/check-all` passes apart from failures proven to predate this plan on `main`.
- [ ] No kept file contains `sk-or-`.

## Steps

- [ ] **1.** Re-run the live matrix on each changed harness, as in task 10.
- [ ] **2.** Write the Final tables and the `INSTALL.md` table.
- [ ] **3.** Run `scripts/check-all` from a checkout outside `.worktrees`, 1.18.25 first on `PATH`; classify any failure against the merge base.
- [ ] **4.** `git grep -n 'sk-or-'` over the branch returns nothing.
- [ ] **5. Commit**

```
git add INSTALL.md docs/plans/2026-10-01-opencode-v2/baseline.md
git commit -m "docs(opencode-v2): verified on four harnesses"
```
