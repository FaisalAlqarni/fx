# 09: Eval and conformance tooling in TypeScript

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** Hardening

**What to build:** the scripts that run fx's evals and conformance rows (not the fixtures they examine) are written in TypeScript and generated to today's paths: the conformance helpers (events, openrouter, MCP probe server, opencode provider merge), review-bench tooling (build case, fill template, score), the lane-triggering verdict, and fixture-build's implementer heads.

**Design:** Implementation Decisions; Global Constraints

**Files:**
- Create: `src/tests/conformance/lib/events.ts`, `src/tests/conformance/lib/openrouter.ts`, `src/tests/conformance/lib/mcp-probe-server.ts`, `src/tests/conformance/lib/merge-opencode-provider.ts`
- Create: `src/tests/review-bench/build-case.ts`, `src/tests/review-bench/fill-template.ts`, `src/tests/review-bench/score.ts`
- Create: `src/tests/lane-triggering/verdict.ts`
- Create: `src/tests/fixture-build/hidden/implementer-heads.ts`
- Modify: the nine matching `.js` files (now generated; shebangs kept)

**Interfaces:**
- Produces: identical command-line behaviour and module exports for each script (read each file's `module.exports` and its callers in the `.sh` runners named in its header).
- Not touched: `tests/fixture-build/hidden/traps.test.js`, `tests/fixture-build/hidden/traps.self-test.js`, `tests/review-bench/good/**`, `tests/review-bench/cases/**`, `tests/lens-pipeline/fixture/worker.js` (fixtures, per Global Constraints).

**Seam:** the existing tests of these scripts and the shell suites `check-all` runs, unchanged.

**Tests:** no new test. These must pass unchanged:
- `node tests/conformance/events.test.js`, `node tests/conformance/openrouter.test.js`: exit 0.
- `node tests/review-bench/score.test.js`, `node tests/review-bench/build-case.test.js`: exit 0.
- `node tests/lane-triggering/verdict.test.js`: exit 0.
- `node tests/fixture-build/hidden/implementer-heads.test.js`, `node tests/fixture-build/hidden/traps.self-test.js`: exit 0.
- `bash tests/conformance/merge-opencode-provider.test.sh`, `bash tests/conformance/live-openrouter.test.sh`, `bash tests/conformance/jail-probe.test.sh`, `bash tests/review-bench/row-safety.test.sh`: exit 0.
- `node -p "require('./tests/conformance/lib/openrouter.js').MODELS.fallback"` prints the same value as before.

**Risks:** these scripts run inside the conformance jail and the review-bench rows, which `check-all` exercises only partly (free rows). Paid rows are not run in this task; their callers are the same `.sh` files, and the exports and arguments must match exactly. `openrouter.js` handles an API key: no logging of it may be added.

**Testing:** existing tests and shell suites, `scripts/check-all`.

## Acceptance criteria
- [ ] Nine generated files with the generated header; fixtures untouched (`git diff --stat` shows no fixture path).
- [ ] Every Tests command passes with no test file changed.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Port the nine scripts**
- [ ] **3. Build and run the Tests field commands**

Run: `scripts/build && node tests/conformance/events.test.js && node tests/conformance/openrouter.test.js && node tests/review-bench/score.test.js && node tests/review-bench/build-case.test.js && node tests/lane-triggering/verdict.test.js && node tests/fixture-build/hidden/implementer-heads.test.js && node tests/fixture-build/hidden/traps.self-test.js`
Expected: PASS.

- [ ] **4. Run the scope**

Run: `scripts/check-all` (tracked background command)

- [ ] **5. Commit by path**

```
git add src/tests/conformance/lib src/tests/review-bench/build-case.ts src/tests/review-bench/fill-template.ts src/tests/review-bench/score.ts src/tests/lane-triggering/verdict.ts src/tests/fixture-build/hidden/implementer-heads.ts tests/conformance/lib/events.js tests/conformance/lib/openrouter.js tests/conformance/lib/mcp-probe-server.js tests/conformance/lib/merge-opencode-provider.js tests/review-bench/build-case.js tests/review-bench/fill-template.js tests/review-bench/score.js tests/lane-triggering/verdict.js tests/fixture-build/hidden/implementer-heads.js
git commit -m "refactor(evals): conformance and bench tooling in TypeScript"
```
