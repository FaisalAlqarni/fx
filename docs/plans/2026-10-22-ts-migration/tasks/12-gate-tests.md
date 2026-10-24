# 12: Gate tests in TypeScript

**Status:** ready-for-agent
**Blocked by:** 06, 07, 08, 10
**Phase:** Polish

**What to build:** the 26 hand-written gate tests in `tests/gates/` move to TypeScript, each asserting exactly what it asserts today. (The two gates added in tasks 06 and 10 are already TypeScript.)

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Create: `src/tests/gates/<name>.test.ts` for each of: agent-model, brainstorm-confidence, branch-pass, brief-size, ci-pins, codex-hook-output, codex-manifest, description-overlap, dispatch-route, fix-loop-shape, fx-setup-root-check, ledger-lines, lens-content, no-runtime-addressing, no-stories-in-loaded-lanes, opencode-plugin, opencode-v2-agent, opencode-v2-plugin, opencode-v2-policies, plan-template, release-version, return-contract, review-content, transcript-path, tripwire-table, user-invoked (26 files)
- Modify: the matching `tests/gates/*.test.js` files (now generated)

**Interfaces:**
- Consumes: the generated hooks, plugins and lib modules (tasks 02 to 07) through the same paths the gates use today.
- `scripts/test-scope` auto-globs `tests/gates/*.test.js`; generated names are unchanged, so no edit there.

**Seam:** each gate is its own runner, as `scripts/check-all` calls it.

**Tests:** same proof as task 11, per gate: record exit code and case count from the JavaScript version; after porting, exit `0` and equal counts; one mutation check per gate (break one thing the gate guards in a scratch copy and see it fail).

**Risks:** several gates read repository files (Markdown lanes, manifests, the CI workflow) by relative path from `__dirname`; the generated file lives at the same path, so keep the same path arithmetic. `ci-pins` reads `.github/workflows/conformance-nightly.yml`; unchanged.

**Testing:** the ported gates, `scripts/check-all`.

## Acceptance criteria
- [ ] 26 generated gate files with the generated header, listed in the ledger with their case counts.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record each gate's exit code and case count**
- [ ] **3. Port the gates in batches of about ten, building and running each batch**

Run (per batch): `scripts/build && for f in <batch>; do node tests/gates/$f.test.js || exit 1; done`
Expected: PASS, counts equal.

- [ ] **4. Run the mutation checks**
- [ ] **5. Run the scope**

Run: `scripts/check-all` (tracked background command)

- [ ] **6. Commit by path**

```
git add src/tests/gates tests/gates/*.test.js
git commit -m "test(gates): gate tests in TypeScript"
```
