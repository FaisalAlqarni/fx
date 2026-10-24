# 07: Waiting reference and good-tests call counts

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** 1: Room and fixes

**What to build:** an agent fixing a flaky test gets one answer about waiting. Today `references/vocab/condition-based-waiting.md` (reached from fx-debug) says "poll for the condition" with TypeScript examples, `references/vocab/condition-based-waiting-example.ts` imports modules from another project, and `references/vocab/good-tests.md` (reached from fx-tdd) says "Polling with a deadline is not the fix... Inject the collaborator." Rewrite the waiting reference without stack-specific code, opening with one rule: when the test drives the system from outside and cannot inject the timing collaborator (a browser or system test, a CLI, an external process), wait on a condition with a timeout and a description; when the code under test is yours at a unit or request seam, inject the collaborator, as `good-tests.md` says. Delete the `.ts` file and the line that points at it. In `good-tests.md`, reconcile the call-count contradiction (`compare-4` T5): the red-flag line limits "asserting call counts or ordering" to internal collaborators, because at a boundary where count or order is the contract (for example "SMS sent exactly once"), "Make doubles specific" says to assert it.

**Design:** Phase 1: Fixes

**Files:**
- Modify: `references/vocab/condition-based-waiting.md` (rewrite: the "Which one" rule first, then the pattern in language-neutral pseudocode with a timeout and a description argument, then common mistakes)
- Delete: `references/vocab/condition-based-waiting-example.ts` (with `git rm`, a tracked file inside the worktree)
- Modify: `SURFACE.md` (the `vocab/` line near 236 drops `condition-based-waiting-example.ts`)
- Modify: `references/vocab/good-tests.md` (the red-flag line that lists "asserting call counts or ordering", near line 178 at dd99986; and the "Polling with a deadline is not the fix" passage gains the clause "unless the test drives the system from outside, where waiting on a condition is the tool")

**Seam:** the text gates: `scripts/check-reference-leaves`, `scripts/check-paths`, `scripts/check-prose`.

**Tests:**
- `bash scripts/check-reference-leaves`: prints `OK: no reference links to another reference` (neither file names the other in backticks).
- `python3 -I scripts/check-paths`: exit 0.
- `python3 -I scripts/check-prose references/vocab/condition-based-waiting.md references/vocab/good-tests.md`: prints `OK: no dashes, no stock vocabulary, parentheses balanced`.
- `grep -rn "condition-based-waiting-example" skills references commands agents SURFACE.md README.md INSTALL.md`: no output except the fx-debug COVERAGE row task 08 rewrites.

**Risks:** `scripts/check-reference-leaves` fails if `good-tests.md` names `condition-based-waiting.md` in backticks (references are leaves); describe the other case in words, never by file name. The existing file uses emoji markers and a dash in `setTimeout(check, 1) - wastes CPU`; the rewrite carries neither.

**Testing:** text gates, offline.

## Acceptance criteria
- [ ] A reader of either reference gets the same rule: inject the collaborator at your own seam; wait on a condition only from outside.
- [ ] The TypeScript example file is gone and nothing points at it.
- [ ] `good-tests.md` no longer flags a call-count assertion at a boundary where the count is the contract.

## Steps

- [ ] **1. Rewrite `condition-based-waiting.md`; delete the `.ts` file with `git rm references/vocab/condition-based-waiting-example.ts`**

- [ ] **2. Edit the two passages in `good-tests.md` and the `SURFACE.md` line**

- [ ] **3. Run the gates the Tests field names**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env bash scripts/check-reference-leaves`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-paths`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-prose references/vocab/condition-based-waiting.md references/vocab/good-tests.md`
Expected: each prints its OK line.

- [ ] **4. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope references/vocab/condition-based-waiting.md references/vocab/good-tests.md`

- [ ] **5. Commit by path**

```
git add references/vocab/condition-based-waiting.md references/vocab/good-tests.md references/vocab/condition-based-waiting-example.ts SURFACE.md
git commit -m "fix(references): one rule for waiting versus injecting; call counts at a boundary are the contract"
```
