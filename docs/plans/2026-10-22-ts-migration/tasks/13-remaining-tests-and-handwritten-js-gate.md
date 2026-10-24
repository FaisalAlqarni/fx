# 13: Remaining tests and the hand-written JavaScript gate

**Status:** ready-for-agent
**Blocked by:** 09, 11, 12
**Phase:** Polish

**What to build:** the last hand-written JavaScript tests move to TypeScript, and a gate makes the migration permanent: every tracked `.js`, `.cjs` or extensionless node script must carry the generated header or be on an explicit allowlist. A clean clone reproduces every generated file byte for byte. ADR 0046 gets its final line: migration complete.

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Create: `src/tests/conformance/events.test.ts`, `src/tests/conformance/openrouter.test.ts`, `src/tests/lane-triggering/verdict.test.ts`, `src/tests/review-bench/score.test.ts`, `src/tests/review-bench/build-case.test.ts`, `src/tests/fixture-build/hidden/implementer-heads.test.ts`
- Modify: the six matching `.test.js` files (now generated)
- Create: `scripts/check-handwritten-js` (bash, executable)
- Create: `scripts/handwritten-js-allowlist.txt` (one path or glob per line, each with a reason comment)
- Create: `tests/gates/check-handwritten-js.test.sh`
- Modify: `scripts/check-all` (run the gate and its test)
- Modify: `docs/adr/0046-fx-sources-are-typescript.md` (status line: migration complete, with the date)

**Interfaces:**
- Produces: `scripts/check-handwritten-js`: scans `git ls-files` for `*.js`, `*.cjs`, `*.mjs` and for extensionless files whose first line is `#!/usr/bin/env node`; each must have the generated header on line 1 (or line 2 after a shebang) or match the allowlist. Exit 0 with `check-handwritten-js: OK (<n> files)`; exit 1 listing each offender as `FAIL: <path> is hand-written JavaScript`.
- Allowlist content: `tests/review-bench/good/**`, `tests/review-bench/cases/**`, `tests/fixture-build/hidden/traps.test.js`, `tests/fixture-build/hidden/traps.self-test.js`, `tests/lens-pipeline/fixture/**`, `references/vendor/mermaid-*.min.js`, `docs/plans/_assets/mermaid-*.min.js`, `references/vendor/tailwindcss-play-*.js`, `docs/plans/_assets/tailwindcss-play-*.js` (the Tailwind entries per plan.md ruling on red-team finding 11).

**Seam:** the gate's own test, the ported tests, a clean clone.

**Tests:**
- Gate test, in a scratch git repo: a tracked `a.js` without the header: exit 1 and `FAIL: a.js is hand-written JavaScript`; the same file with the header: exit 0; an extensionless file with `#!/usr/bin/env node` and no header: exit 1; a file matching an allowlist glob: exit 0; a repo with no JavaScript at all: exit 1 with `FAIL: no JavaScript file scanned`.
- On this repo: `scripts/check-handwritten-js` exits 0.
- Ported tests: same proof as task 11 (exit code, case count, one mutation check each).
- Reproducibility: `git clone` of the branch into a scratch directory, then `npm ci && scripts/build`, then `git status --porcelain` in the clone prints nothing.

**Risks:** the allowlist must not grow to make the gate pass; every entry is a fixture or vendored file named in the design's Global Constraints, and the gate test asserts a non-fixture file is caught.

**Testing:** gate test, ported tests, clean-clone check, `scripts/check-all`.

## Acceptance criteria
- [ ] `scripts/check-handwritten-js` passes on the repo and fails on each bad case in its test.
- [ ] The clean clone shows no change after `npm ci && scripts/build`.
- [ ] `scripts/check-all` prints `ALL GREEN`.
- [ ] ADR 0046 marks the migration complete.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write the gate test**
- [ ] **3. Run it: verify RED**

Run: `bash tests/gates/check-handwritten-js.test.sh`
Expected: fails because the gate does not exist.

- [ ] **4. Implement the gate and the allowlist**
- [ ] **5. Run it: verify GREEN on the test cases; expect it to list the six unported tests on the repo**

Run: `bash tests/gates/check-handwritten-js.test.sh && scripts/check-handwritten-js`
Expected: the test passes; the repo run fails naming exactly the six test files below.

- [ ] **6. Port the six remaining tests (same proof as task 11)**
- [ ] **7. Run the gate on the repo and the clean-clone check**

Run: `scripts/build && scripts/check-handwritten-js`
Expected: `check-handwritten-js: OK`.

- [ ] **8. Run the scope**

Run: `scripts/check-all` (tracked background command)

- [ ] **9. Commit by path**

```
git add src/tests/conformance/events.test.ts src/tests/conformance/openrouter.test.ts src/tests/lane-triggering/verdict.test.ts src/tests/review-bench/score.test.ts src/tests/review-bench/build-case.test.ts src/tests/fixture-build/hidden/implementer-heads.test.ts tests/conformance/events.test.js tests/conformance/openrouter.test.js tests/lane-triggering/verdict.test.js tests/review-bench/score.test.js tests/review-bench/build-case.test.js tests/fixture-build/hidden/implementer-heads.test.js scripts/check-handwritten-js scripts/handwritten-js-allowlist.txt tests/gates/check-handwritten-js.test.sh scripts/check-all docs/adr/0046-fx-sources-are-typescript.md
git commit -m "test: last tests in TypeScript, hand-written JavaScript gate"
```
