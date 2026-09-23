# 05: A finished plan is not listed

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** the "Unfinished plans in this repository" block stops naming
plans whose build is finished. Today `lib/plan-state.js` lists every plan that
has task files, and in this repo it tells every session that three builds are
underway when two are merged and done.

One rule, no inference from task counts: **a plan is finished when its
`state.md` has a line starting `Plan complete:`.** `fx-implement` writes that
line when it finishes a plan. The three existing ledgers get it by hand.

**Files:**
- Modify: `lib/plan-state.js`
- Modify: `lib/plan-state.test.js`
- Modify: `skills/fx-implement/SKILL.md` (the completion report section: write the line)
- Modify: `docs/plans/2026-09-01-fx/state.md` (append the line)
- Modify: `docs/plans/2026-09-11-fx-audit/state.md` (append the line)
- Modify: `docs/plans/2026-09-12-fx-audit-followups/state.md` (append the line)

**Interfaces:**
- Consumes: `describePlans(cwd, { lane })` returns a string or `null`; `scan(cwd)` builds `{ slug, tasks, taskDir, hasState }`.
- Produces: `scan` also reads `state.md` when present and skips the plan when
  any line matches `/^Plan complete:/m`. `describePlans`' signature and output
  format are unchanged. An unreadable `state.md` keeps the plan listed.

**Seam:** unit, `lib/plan-state.test.js` over real temp directory trees (its existing approach).

**Idempotency:** the backfill appends the line only if `grep -q '^Plan complete:'` finds none.

**Testing:** `node lib/plan-state.test.js`, `node lib/preamble.test.js`, `scripts/check-all`.

**Skill edit:** use the `fx-authoring` lane for the `fx-implement` wording. The
instruction goes where the controller finishes the plan (after the exit gate
passes and before the completion report), and gives the exact form:

```
Plan complete: tasks <first> to <last> complete, <K> parked, final review <clean|fixed>
```

Backfill lines, exact:
- `2026-09-01-fx`: `Plan complete: tasks 01 to 08 complete; task 08's live install is the owner's, not a build step (backfilled 2026-09-23)`
- `2026-09-11-fx-audit`: `Plan complete: exit gate passed, fix wave re-reviewed (backfilled 2026-09-23)`
- `2026-09-12-fx-audit-followups`: already has a `Plan complete:` line at the start of a line; confirm with grep and leave it.

## Acceptance criteria
- [ ] A plan whose ledger has a `Plan complete:` line is not named.
- [ ] A plan whose ledger mentions "plan complete" mid-sentence or in lower case is still named (the match is the line prefix, exact case).
- [ ] When every plan is finished, `describePlans` returns `null`, so the block disappears.
- [ ] A `state.md` that cannot be read (a directory named `state.md`) keeps the plan named and does not throw.
- [ ] `fx-implement/SKILL.md` instructs writing the line, in the exact form above.
- [ ] Rendered in this repo after the backfill, the preamble names no plan from 2026-09-01, 2026-09-11 or 2026-09-12.

## Steps

- [ ] **1. Write the failing tests** (add before the "never throws" block in `lib/plan-state.test.js`)

```js
// ---- a finished plan is not named ----
{
  const out = describePlans(repo({
    'shipped': { tasks: ['01-a.md'], state: '# ledger\nTask 01: complete\nPlan complete: tasks 01 to 01 complete\n' },
    'open': { tasks: ['01-a.md'], state: '# ledger\n' },
  }));
  check(!/shipped/.test(out || ''), 'a plan with a Plan complete: line is not named', out);
  check(/open/.test(out || ''), 'an unfinished plan beside it is still named', out);
}
{
  const out = describePlans(repo({ 'only': { tasks: ['01-a.md'], state: 'Plan complete: all done\n' } }));
  check(out === null, 'when every plan is finished the block is silent', out);
}
{
  const out = describePlans(repo({ 'p': { tasks: ['01-a.md'], state: 'we said the plan complete: not yet\nplan complete: lower case\n' } }));
  check(/\bp\b/.test(out || ''), 'only a line starting with exactly "Plan complete:" counts', out);
}
{
  const cwd = repo({ 'odd': { tasks: ['01-a.md'] } });
  fs.mkdirSync(path.join(cwd, 'docs', 'plans', 'odd', 'state.md'));
  let out, threw = false;
  try { out = describePlans(cwd); } catch { threw = true; }
  check(!threw && /odd/.test(out || ''), 'an unreadable state.md keeps the plan named', out);
}
```

- [ ] **2. Run it: verify RED**

Run: `node lib/plan-state.test.js`
Expected: FAIL on "a plan with a Plan complete: line is not named" and "when every plan is finished the block is silent".

- [ ] **3. Implement the minimum that passes** in `scan()` (`fx-tdd` drives it).

- [ ] **4. Run it: verify GREEN**

Run: `node lib/plan-state.test.js`. Expected: `0 failed`.

- [ ] **5. Edit `fx-implement/SKILL.md`** through `fx-authoring`, then backfill the three ledgers per the exact lines above.

- [ ] **6. Check the render in this repo**

Run: `node -e "process.stdout.write(require('./lib/preamble').render({harness:'claude-code'}))" | grep -c '2026-09-0\|2026-09-1'`
Expected: `0`.

- [ ] **7. Run the suite**: `scripts/check-all`. If `release-version.test.js` fires, bump the version as it asks.

- [ ] **8. Commit**

```
git add lib/plan-state.js lib/plan-state.test.js skills/fx-implement/SKILL.md docs/plans/2026-09-01-fx/state.md docs/plans/2026-09-11-fx-audit/state.md docs/plans/2026-09-12-fx-audit-followups/state.md
git commit -m "fix(plan-state): a plan whose ledger says Plan complete is not listed"
```

Add the version files to `git add` if step 7 bumped them.
