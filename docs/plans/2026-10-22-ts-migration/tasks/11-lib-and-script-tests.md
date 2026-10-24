# 11: lib and script tests in TypeScript

**Status:** ready-for-agent
**Blocked by:** 06, 08
**Phase:** Polish

**What to build:** with all the code they cover migrated and green, the unit tests beside `lib/` and the three scripts move to TypeScript, asserting exactly what they assert today.

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Create: `src/lib/git-guard.test.ts`, `src/lib/base-branch.test.ts`, `src/lib/heredoc.test.ts`, `src/lib/plan-state.test.ts`, `src/lib/plant-roles.test.ts`, `src/lib/preamble.test.ts`
- Create: `src/scripts/build-cost.test.ts`, `src/scripts/test-scope.test.ts`, `src/skills/fx-implement/scripts/compile-brief.test.ts`
- Modify: the nine matching `.test.js` files (now generated)

**Interfaces:**
- Consumes: the migrated modules' typed exports (tasks 02 to 05, 08) and the migrated hooks (task 06; `lib/preamble.test.js` spawns `hooks/fx-context.js`). The tests import them through the same `.js` paths they use today, so they test the generated output, not the sources.

**Seam:** each test file is its own runner (`node <file>`), as `scripts/check-all` calls it.

**Tests:** each migrated test keeps every case and every expected value it has today. Proof per file:
- Before porting, record `node <file> [fixture args]` stdout and exit code from the JavaScript version.
- After porting: same exit code `0`, and the same number of passing cases (count the assertions each file prints or runs; where a file prints nothing, compare with an added temporary counter removed before commit).
- Mutation check per file: break one asserted value in the migrated module's generated output (in a scratch copy, never committed) and see the ported test fail, then discard the copy.

**Risks:** a port that drops a case passes silently; the case count and the mutation check exist for that. The fixture-dependent tests (git guard, base branch, heredoc) keep their `<main> <worktree>` arguments.

**Testing:** the ported tests themselves, `scripts/check-all`.

## Acceptance criteria
- [ ] Nine generated test files with the generated header.
- [ ] Case counts match the JavaScript versions file by file (listed in the ledger).
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record each JavaScript test's exit code and case count**
- [ ] **3. Port the nine tests**
- [ ] **4. Build, run each, compare counts, run the mutation check**

Run: `scripts/build && B=$(mktemp -d) && trap 'rm -rf "$B"' EXIT && F=$(scripts/make-git-fixture "$B/fx") && node lib/git-guard.test.js $F && node lib/base-branch.test.js $F && node lib/heredoc.test.js $F && node lib/plan-state.test.js && node lib/plant-roles.test.js && node lib/preamble.test.js && node scripts/build-cost.test.js && node scripts/test-scope.test.js && node skills/fx-implement/scripts/compile-brief.test.js`
Expected: PASS, counts equal.

- [ ] **5. Run the scope**

Run: `scripts/check-all` (tracked background command)

- [ ] **6. Commit by path**

```
git add src/lib/git-guard.test.ts src/lib/base-branch.test.ts src/lib/heredoc.test.ts src/lib/plan-state.test.ts src/lib/plant-roles.test.ts src/lib/preamble.test.ts src/scripts/build-cost.test.ts src/scripts/test-scope.test.ts src/skills/fx-implement/scripts/compile-brief.test.ts lib/git-guard.test.js lib/base-branch.test.js lib/heredoc.test.js lib/plan-state.test.js lib/plant-roles.test.js lib/preamble.test.js scripts/build-cost.test.js scripts/test-scope.test.js skills/fx-implement/scripts/compile-brief.test.js
git commit -m "test: lib and script tests in TypeScript"
```
