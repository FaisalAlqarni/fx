# 16: review-package range guard and the re-reviewer brief

**Status:** ready-for-agent
**Blocked by:** 03, 12
**Phase:** 3: Lane improvements

**What to build:** a reviewer never approves the wrong commits, and a fix round never slips past a ruling. `skills/fx-implement/scripts/review-package` today refuses only an empty range; a HEAD that moved off the branch gives a non-empty range of the wrong commits. Before the empty-range check it refuses any BASE that is not an ancestor of HEAD, with exit 3 (`compare-3` F3). The re-reviewer today reads the raw task file, so rulings and Global Constraints never reach a fix round; it reads the brief `compile-brief` recompiles before the re-review dispatch, as the task reviewer already does (F5, ADR 0042). The script's two em dashes go: the header comment (line 10) and the runtime warning on line 49, whose dash becomes a colon: `.fx/ is not git-ignored: add it to .gitignore`. `re-review-prompt.md` becomes reachable: `fix-loop.md` links it as [re-review-prompt.md](./re-review-prompt.md) where it dispatches the re-reviewer, and its `PENDING_ORPHANS` entry in `scripts/check-paths` is deleted (task 02).

**Design:** Phase 3: Implement; Testing Decisions

**Files:**
- Modify: `skills/fx-implement/scripts/review-package` (bash, hand-written; the guard goes after the two `rev-parse --verify` lines and before the empty-range check, lines 28 to 35 at dd99986)
- Create: `src/tests/gates/review-package.test.ts`, built `tests/gates/review-package.test.js`
- Modify: `scripts/check-all` (add `run review-package.test.js node tests/gates/review-package.test.js`)
- Modify: `skills/fx-implement/re-review-prompt.md` (`[TASK_FILE]` at lines 22, 152 and 176 becomes `[BRIEF_FILE]`; the task number comes from the brief's `## Task` heading)
- Modify: `skills/fx-implement/fix-loop.md` (the re-review dispatch recompiles the brief and passes its path; rounds 4 to 5 pass the brief path; the link to `re-review-prompt.md`)
- Modify: `scripts/check-paths` (delete the `skills/fx-implement/re-review-prompt.md` entry from `PENDING_ORPHANS`)
- Modify: `src/tests/gates/return-contract.test.ts`, `src/tests/gates/fix-loop-shape.test.ts`, built `tests/gates/return-contract.test.js`, `tests/gates/fix-loop-shape.test.js`

**Interfaces:**
- Produces: `review-package SLUG BASE HEAD [OUTFILE]` exits 3 and writes to stderr exactly `BASE <base> is not an ancestor of HEAD <head>: refusing a range not rooted at BASE` when `git merge-base --is-ancestor BASE HEAD` fails; usage, exit 2 cases and the empty-range exit 3 are unchanged.
- Produces: re-review placeholder `[BRIEF_FILE]`: "REQUIRED, the path `compile-brief` wrote just before this re-review dispatch".

**Seam:** the script run as a process against a scratch git repository; the format gates for the prompt.

**Tests:**
- Non-ancestor range: scratch repo with commit A on `main`, branch `x` adding B, branch `y` from A adding C; `bash skills/fx-implement/scripts/review-package s <B> <C>` run in the repo exits 3, stderr equals `BASE <B> is not an ancestor of HEAD <C>: refusing a range not rooted at BASE`, and no file is written under `.fx/s/review/`.
- Ancestor range: `review-package s <A> <B>` exits 0 and its stdout matches `^wrote (.+): 1 commit\(s\), \d+ bytes$`, where the captured path exists.
- Empty range: `review-package s <B> <B>` still exits 3 with `empty range <B>..<B>: no commits to review`.
- `return-contract.test.js`: `re-review-prompt.md` contains `[BRIEF_FILE]` and no `[TASK_FILE]`; OK.
- `fix-loop-shape.test.js`: `fix-loop.md` tells the controller to recompile the brief before the re-review dispatch; OK.
- `python3 -I scripts/check-paths` with the orphan entry deleted: exit 0.
- `grep -cP '[\x{2013}\x{2014}]' skills/fx-implement/scripts/review-package`: 0.

**Risks:** the scratch repository lives under `os.tmpdir()`, which scratch-env points at TMPDIR; the test leaves it in place rather than deleting it, matching `scripts/scratch-env`. Git in the fixture needs `-c user.name=fx -c user.email=fx@example.invalid`, as `release-version.test.ts` does.

**Testing:** integration against a real git repository, offline.

## Acceptance criteria
- [ ] A detached or wrong-branch HEAD produces no review package and a clear exit 3.
- [ ] A fix round's re-reviewer reads the same compiled brief, rulings included, that the task reviewer read.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/review-package.test.js`, `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/return-contract.test.js`
Expected: the non-ancestor case exits 0 instead of 3; the prompt still names `[TASK_FILE]`.

- [ ] **4. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing tests.

- [ ] **5. Run them: verify GREEN**

Run: same commands, plus `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/fix-loop-shape.test.js`. Expected: PASS.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-implement/scripts/review-package src/tests/gates/review-package.test.ts skills/fx-implement/re-review-prompt.md skills/fx-implement/fix-loop.md scripts/check-all`

- [ ] **7. Commit by path**

```
git add scripts/check-paths skills/fx-implement/scripts/review-package src/tests/gates/review-package.test.ts tests/gates/review-package.test.js scripts/check-all skills/fx-implement/re-review-prompt.md skills/fx-implement/fix-loop.md src/tests/gates/return-contract.test.ts src/tests/gates/fix-loop-shape.test.ts tests/gates/return-contract.test.js tests/gates/fix-loop-shape.test.js
git commit -m "fix(fx-implement): refuse a review range not rooted at BASE; re-reviewer reads the brief"
```
