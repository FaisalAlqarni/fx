# 08: Node scripts in TypeScript

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** Hardening

**What to build:** the three extensionless node scripts (build cost, test scope, compile brief) are written in TypeScript and generated to the same extensionless, executable paths. Compile brief keeps its own `.fx.json` read, so its error messages on a malformed file stay exactly as today.

**Design:** Implementation Decisions; Global Constraints

**Files:**
- Create: `src/scripts/build-cost.ts`, `src/scripts/test-scope.ts`, `src/skills/fx-implement/scripts/compile-brief.ts`
- Modify: `scripts/build-cost`, `scripts/test-scope`, `skills/fx-implement/scripts/compile-brief` (now generated; shebang and executable bit kept)

**Interfaces:**
- Produces: the same command-line behaviour as today: `scripts/test-scope [--dry-run] <path>...` including the `src/` mapping added in task 01; `scripts/build-cost` and `compile-brief` with today's arguments and output.

**Seam:** the existing tests of these scripts, unchanged.

**Tests:** no new test. These must pass unchanged:
- `node scripts/build-cost.test.js`: exit 0.
- `node scripts/test-scope.test.js`: exit 0 (includes the `src/` mapping cases from task 01).
- `node skills/fx-implement/scripts/compile-brief.test.js`: exit 0.
- `node tests/gates/brief-size.test.js`: exit 0.
- `test -x scripts/build-cost && test -x scripts/test-scope && test -x skills/fx-implement/scripts/compile-brief`: exit 0.

**Risks:** `scripts/test-scope` runs every later task's scope; port it last within this task and run its own test before committing. `git` must record the executable mode on the generated files (check `git ls-files -s` shows `100755`).

**Testing:** existing tests, `scripts/check-all`.

## Acceptance criteria
- [ ] The three files are generated, executable (`100755` in the index) and start with the shebang then the generated header.
- [ ] Every Tests command passes with no test file changed.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Port build cost and compile brief, build, run their tests**

Run: `scripts/build && node scripts/build-cost.test.js && node skills/fx-implement/scripts/compile-brief.test.js && node tests/gates/brief-size.test.js`
Expected: PASS.

- [ ] **3. Port test scope, build, run its test**

Run: `scripts/build && node scripts/test-scope.test.js`
Expected: PASS.

- [ ] **4. Run the scope**

Run: `scripts/test-scope src/scripts/build-cost.ts src/scripts/test-scope.ts src/skills/fx-implement/scripts/compile-brief.ts`

- [ ] **5. Commit by path**

```
git add src/scripts/build-cost.ts src/scripts/test-scope.ts src/skills/fx-implement/scripts/compile-brief.ts scripts/build-cost scripts/test-scope skills/fx-implement/scripts/compile-brief
git commit -m "refactor(scripts): node scripts in TypeScript"
```
