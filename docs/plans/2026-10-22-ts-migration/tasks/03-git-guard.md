# 03: git guard in TypeScript

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** Core

**What to build:** the git guard, which every hook and plugin uses to refuse unsafe git operations, is written in TypeScript and generated, deciding exactly as today.

**Design:** Implementation Decisions; Global Constraints

**Files:**
- Create: `src/lib/git-guard.ts`
- Modify: `lib/git-guard.js` (now generated)
- Modify: `src/lib/types.ts` (add the guard verdict type), `lib/types.js` (generated)

**Interfaces:**
- Produces (named exports, same runtime shapes as today): `inspect`, `splitSegments`, `stripHeredocs`, `parseGit`, `expandShellC`.
- Produces in `src/lib/types.ts`: the return type of `inspect`, consumed by tasks 06 and 07.

**Seam:** the existing git-fixture tests, unchanged.

**Tests:** no new test. These must pass unchanged, each run against a fresh fixture that is removed afterwards (`B=$(mktemp -d); trap 'rm -rf "$B"' EXIT; F=$(scripts/make-git-fixture "$B/fx")`):
- `node lib/git-guard.test.js $F`: exit 0.
- `node lib/base-branch.test.js $F`: exit 0.
- `node lib/heredoc.test.js $F`: exit 0.

**Risks:** `splitSegments` is documented in `lib/plant-roles.js` as "quote-blind and frozen"; port it literally, including that limitation. Typing must not change any regular expression or string handling.

**Testing:** the three fixture tests, then `scripts/check-all` (test-scope routes this file to it).

## Acceptance criteria
- [ ] `lib/git-guard.js` carries the generated header and is reproduced by `scripts/build`.
- [ ] The three fixture tests pass without any test file changed.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`** (oracle: the fixture tests; RED by a deliberately broken branch in the source, seen failing, then reverted)
- [ ] **2. Write `src/lib/git-guard.ts` and the verdict type**
- [ ] **3. Build and run the fixture tests**

Run: `scripts/build && B=$(mktemp -d) && trap 'rm -rf "$B"' EXIT && F=$(scripts/make-git-fixture "$B/fx") && node lib/git-guard.test.js $F && node lib/base-branch.test.js $F && node lib/heredoc.test.js $F`
Expected: PASS.

- [ ] **4. Run the scope**

Run: `scripts/test-scope src/lib/git-guard.ts` (routes to `scripts/check-all`; tracked background command)

- [ ] **5. Commit by path**

```
git add src/lib/git-guard.ts src/lib/types.ts lib/types.js lib/git-guard.js
git commit -m "refactor(lib): git guard in TypeScript"
```
