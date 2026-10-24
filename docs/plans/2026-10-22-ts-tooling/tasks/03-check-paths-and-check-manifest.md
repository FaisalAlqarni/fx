# 03: check-paths and check-manifest on Node

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** Core

**What to build:** `node scripts/check-paths` and `node scripts/check-manifest [path]` report exactly what the Python versions report, with the same exit codes, and `check-all` runs them with `node`. Their equivalence is recorded and checked in `check-all` from now on.

**Design:** Implementation Decisions > 1; Implementation Decisions > 2; Implementation Decisions > 5; Testing Decisions

**Files:**
- Create: `src/scripts/check-paths.ts`, `src/scripts/check-manifest.ts` (built over the Python files at the same paths)
- Create: `tests/equivalence/check-paths.json`, `tests/equivalence/check-manifest.json` and their goldens
- Modify: `src/scripts/check-all.ts` (rows `check-manifest` and `check-paths` run `node scripts/<name>`; names unchanged)
- Modify: `tests/conformance/rows/10-reference-paths-resolve.sh` (its `python3 scripts/check-paths` becomes `node scripts/check-paths`; the row itself moves to TypeScript in task 12)

**Interfaces:**
- Consumes: `toPosixRel` (task 01), `parseJson` (sub-project 1) for `plugin.json`; the manifest enters as `unknown`.

**Seam:** `node scripts/equiv check tests/equivalence` and `node scripts/check-all`.

**Tests:**
- check-paths cases, each recorded from the Python script: `clean` (one skill citing `../../references/x.md` that exists: `OK: 1 reference citations, all anchored and resolvable`, exit 0); `unanchored` (a skill with `` `references/x.md` ``: `FAIL: 1 problem(s)` then `  skills/a/SKILL.md: unanchored `references/x.md``, exit 1); `missing-target` (`  ... cites ../../references/nope.md -> no such file`); `both-in-one-file`; `four-areas` (one citation each under skills, agents, commands, references); `sorted-order` (files `B.md` and `a.md`, which `sorted` orders by code point).
- check-manifest cases: `valid` (a written minimal `plugin.json` declaring one skill directory that holds a written `SKILL.md`); `unknown-key` (`unknown key `x`: not seen in any working manifest`); `missing-skill-path`; `skill-without-SKILL.md`; `missing-hooks-file`; `convention-line` (an undeclared `agents/` holding files: the `convention: ./agents/ holds 1 file(s), ...` line); `commands-empty-allowed`; `path-argument` (manifest under a directory given as argument); `malformed-json` (output and exit code as recorded).
- Live compare for both on the whole repo, including `check-manifest` on the repo's own manifest: identical, in the ledger.
- Free conformance row 10 on all four harnesses passes after its `node` edit.

**Risks:** Python's `rglob` includes dot-directories and follows the filesystem order before `sorted`; the port must glob the same set (a case with a file under a dot-directory pins it). `json.load` error text differs from `JSON.parse`'s: if the Python script prints the exception message, the `malformed-json` case will fail, and the port must print the Python wording for that case's input.

**Testing:** recorded equivalence; `check-all`.

## Acceptance criteria
- [ ] Both cases files check identical; live compares identical.
- [ ] `check-all` rows for both gates start with `node`; `ALL GREEN`.
- [ ] `git grep -nE "(python3?|bash|sh) [^ ]*scripts/check-(paths|manifest)"` outside `docs/plans/` prints nothing.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; write both cases files; record goldens**

Run: `node scripts/equiv record tests/equivalence/check-paths.json && node scripts/equiv record tests/equivalence/check-manifest.json`

- [ ] **3. Verify RED**

Run: `node scripts/equiv check tests/equivalence/check-paths.json`
Expected: fails, because the new argv `node scripts/check-paths` runs a Python file.

- [ ] **4. Port both gates**
- [ ] **5. Verify GREEN**: `scripts/build && node scripts/equiv check tests/equivalence`, then the live compare
- [ ] **6. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **7. Commit by path**

```
git add src/scripts/check-paths.ts src/scripts/check-manifest.ts scripts/check-paths scripts/check-manifest tests/equivalence/check-paths.json tests/equivalence/check-paths.golden.json tests/equivalence/check-manifest.json tests/equivalence/check-manifest.golden.json src/scripts/check-all.ts scripts/check-all tests/conformance/rows/10-reference-paths-resolve.sh
git commit -m "build: check-paths and check-manifest on Node"
```
