# 02: Skill size gate and pointer gates

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** 1: Room and fixes

**What to build:** `scripts/check-all` fails when any `skills/*/SKILL.md` is 20,000 bytes or more, naming the file and its size, because Claude Code re-attaches a skill cut at 20,000 characters after compaction. Three skills are over today (fx-implement 49,175, fx-humanize 31,745, fx-authoring 20,774), so the gate carries a pending list naming each with the task that fixes it, and it also fails when a listed skill is already under the limit, so no entry outlives its fix. In the same change `scripts/check-paths` learns two checks the splits need. Links: every relative markdown link `[text](target)` in any `.md` file under `skills/<lane>/`, subdirectories included, resolves to an existing file. Reachability: every `.md` file under `skills/<lane>/`, subdirectories included, other than SKILL.md and COVERAGE.md, is the resolved target of at least one markdown link in another `.md` file of the same lane that is not COVERAGE.md; text mentions and backticked names do not count, and COVERAGE.md is never a namer. Under that rule two files are unreachable today: `skills/fx-authoring/anthropic-best-practices.md` (task 04 links it) and `skills/fx-implement/re-review-prompt.md` (task 16 links it), so both go on a pending list.

**Design:** Phase 1: Size gate; Testing Decisions

**Files:**
- Create: `src/tests/gates/skill-size.test.ts`, built to `tests/gates/skill-size.test.js`
- Modify: `scripts/check-all` (one `run skill-size.test.js node tests/gates/skill-size.test.js` line beside the other gate tests)
- Modify: `scripts/check-paths` (Python, hand-written: links and reachability)
- Test: `src/tests/gates/skill-size.test.ts` writes scratch fixture trees under `os.tmpdir()` for both the size check and the check-paths runs.

**Interfaces:**
- Produces: in `src/tests/gates/skill-size.test.ts`, `const LIMIT = 20000` and `const PENDING: Record<string, string> = { 'fx-implement': '03', 'fx-authoring': '04', 'fx-humanize': '11' }`, and a function in the same file, `oversize(root: string, pending: Record<string, string>): string[]`, returning one message per failure. Tasks 03, 04 and 11 each delete their own key.
- Produces: in `scripts/check-paths`, `PENDING_ORPHANS = {'skills/fx-authoring/anthropic-best-practices.md': '04', 'skills/fx-implement/re-review-prompt.md': '16'}` and a `--root <dir>` option (default: the repository) so a fixture tree can be checked. Tasks 04 and 16 each delete their entry. `skills/fx-authoring/anthropic-best-practices.md` is skipped as a link source (its links are examples, carried verbatim).
- Produces: failure message formats, used verbatim by later tasks:
  - `skill-size: skills/<name>/SKILL.md is <n> bytes, at or over the 20000-byte limit. Move what only some steps need into a file beside it.`
  - `skill-size: skills/<name>/SKILL.md is <n> bytes, under the limit: delete '<name>' from PENDING.`
  - `skills/<lane>/<file>.md: link <target> -> no such file`
  - `skills/<lane>/<path>.md: no link from another file in skills/<lane>/ reaches it`

**Seam:** the gate test process (exit code and stdout) for size; the `scripts/check-paths` process for links and reachability.

**Tests:**
- Fixture over the limit: a scratch tree with `skills/a/SKILL.md` of exactly 20,000 bytes and `skills/b/SKILL.md` of 19,999 bytes, `oversize(tree, {})` returns exactly `['skill-size: skills/a/SKILL.md is 20000 bytes, at or over the 20000-byte limit. Move what only some steps need into a file beside it.']`.
- Stale pending entry: `oversize(tree, { b: 'NN' })` includes `skill-size: skills/b/SKILL.md is 19999 bytes, under the limit: delete 'b' from PENDING.`
- The repository: `oversize(<repo root>, PENDING)` returns `[]`, and the test prints `skill-size: OK`.
- check-paths broken link: fixture tree `skills/x/SKILL.md` containing `[a](./references/a.md)` with no such file; `python3 -I scripts/check-paths --root <tree>` exits 1 and prints `skills/x/SKILL.md: link ./references/a.md -> no such file`.
- check-paths orphan: fixture `skills/x/SKILL.md` that mentions `extra.md` only as backticked text, plus `skills/x/extra.md`; exits 1 and prints `skills/x/extra.md: no link from another file in skills/x/ reaches it`.
- check-paths nested orphan: fixture `skills/x/SKILL.md` linking nothing and `skills/x/references/deep.md`; exits 1 and prints `skills/x/references/deep.md: no link from another file in skills/x/ reaches it`.
- check-paths COVERAGE is not a namer: fixture `skills/x/COVERAGE.md` containing `[e](./extra.md)` and `skills/x/extra.md`; exits 1 with the orphan line for `skills/x/extra.md`.
- check-paths nested link resolves: fixture `skills/x/SKILL.md` containing `[d](./references/deep.md)` and `skills/x/references/deep.md`; exits 0.
- check-paths on the repository: exits 0, with both pending orphans listed in `PENDING_ORPHANS`.

**Risks:** the check-paths fixture runs must sit in `src/tests/gates/skill-size.test.ts` (one gate test owns both new checks) and spawn `python3 -I scripts/check-paths --root <tree>`; do not add a Python test runner.

**Testing:** gate tests, offline, part of `check-all`.

## Acceptance criteria
- [ ] `check-all` runs the new gate and stays green with the three pending entries.
- [ ] Deleting `'fx-implement'` from `PENDING` makes `node tests/gates/skill-size.test.js` exit 1 with the over-limit message naming `skills/fx-implement/SKILL.md` and its byte count.
- [ ] `scripts/check-paths` on the repository prints its OK line and exits 0.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/tests/gates/skill-size.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/skill-size.test.js`
Expected: fails because `oversize` and the check-paths options do not exist yet.

- [ ] **4. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing tests.

- [ ] **5. Run them: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/skill-size.test.js`. Expected: `skill-size: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/tests/gates/skill-size.test.ts scripts/check-paths scripts/check-all`

- [ ] **7. Commit by path**

```
git add src/tests/gates/skill-size.test.ts tests/gates/skill-size.test.js scripts/check-paths scripts/check-all
git commit -m "test(gates): fail any SKILL.md at 20000 bytes and any split pointer that resolves to nothing"
```
