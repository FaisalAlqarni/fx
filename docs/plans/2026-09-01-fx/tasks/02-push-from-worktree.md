# 02: `push` allowed from a worktree

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** design decision D-A. `git push` succeeds from a feature
branch inside a worktree and is still refused on the main checkout. Today it is
refused everywhere, which means an agent working in an isolated worktree cannot
open a PR or share a branch.

The main-checkout block already prevents pushing the base branch: you cannot
commit to it there in the first place, so this does not weaken that rule.

**Files:**
- Modify: `lib/git-guard.js`
- Modify: `lib/git-guard.test.js`

**Interfaces:**
- Consumes: `inspect(command, cwd) -> {allow} | {allow:false, reason}` (existing)
- Produces: unchanged signature. `push` moves out of `alwaysBlocked()` and becomes ordinary mutating work, which the main-checkout rule already covers.

**Seam:** `inspect()`. Same seam the existing 69 assertions use.

**Risks:** `push` currently returns early from `alwaysBlocked()`. Removing that
without confirming the main-checkout path catches it would allow push
everywhere: the exact inversion of the rule. Task 03's mutation discipline
applies: break it deliberately and watch the test fail.

**Idempotency:** pure code change, no state.

**Testing:** unit, via the existing suite. Both sides asserted, not just the new one.

## Acceptance criteria
- [ ] `git push origin feature` from a worktree → allowed
- [ ] `git push origin main` from the main checkout → blocked
- [ ] `git push --force` → still blocked **everywhere**, worktree included
- [ ] `git push --no-verify` → still blocked everywhere
- [ ] Every other always-blocked rule unchanged
- [ ] Suite total rises from 69; no existing assertion is deleted to make room

## Steps

- [ ] **1. Write the failing tests**

```js
allowed('git push origin feature', WT,   'push from a worktree');
blocked('git push origin main',    MAIN, 'push from the main checkout');
blocked('git push --force',        WT,   'force push is still absolute');
```

- [ ] **2. Run it: verify RED**

Run: `node lib/git-guard.test.js <main> <worktree>`
Expected: FAIL, the first assertion, because `push` is unconditionally blocked.

- [ ] **3. Implement the minimum that passes**

- [ ] **4. Run it: verify GREEN**

- [ ] **5. Mutation check**

Force `locate()` to report `worktree: true` always. Expected: the
`push from the main checkout` assertion fails. If it does not, the test is not
actually reaching the main-checkout path.

- [ ] **6. Update `PREAMBLE.md` and `SURFACE.md`** so the stated rule matches
      the enforced one.
