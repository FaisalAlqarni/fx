# 06: Branch pass limited to what per-task review missed

**Status:** ready-for-agent
**Blocked by:** 05
**Phase:** MVP

**What to build:** At the end of an fx-implement build, the branch review runs the broad pass over the seams between tasks, the unprimed devil's advocate, and at most four lenses: those whose branch trigger matches the branch diff and that either never fired on any task, or whose branch trigger matches files outside the tasks where they fired. Lenses past four fold into the broad pass's brief as named checks, in the lens table's order. Every model choice goes through `route()`: an `fx:` agent asked for the most capable tier with no `Capable because:` line runs on the standard tier, the two agents pinned to opus are pinned to sonnet, and every call site that needs the top tier for them says so with a `Capable because:` line. A standalone fx-review branch run, with no ledger behind it, keeps the full pass.

**Files:**
- Modify: `lib/dispatch-route.js`
- Modify: `tests/gates/dispatch-route.test.js`
- Modify: `agents/fx-lens-security.md`
- Modify: `agents/fx-devils-advocate.md`
- Modify: `codex/agents/*.toml` (regenerate with `scripts/gen-codex-agents`; never hand-edit)
- Modify: `skills/fx-review/SKILL.md`
- Modify: `skills/fx-implement/SKILL.md` (Final review section)
- Modify: `skills/fx-plan/SKILL.md` (§8 red-team dispatch only)
- Modify: `commands/fx-critique.md` and its generated `skills/fx-critique/SKILL.md` (regenerate with `scripts/gen-command-skills`)
- Create: `tests/gates/branch-pass.test.js`
- Modify: `scripts/check-all` (add the new gate)
- Create: `docs/adr/0044-the-branch-pass-reviews-what-per-task-review-missed.md`
- Modify: `docs/adr/0029-per-task-review-is-the-reviewer-plus-tripwires.md` (status line: superseded in part by 0044)

**Interfaces:**
- Consumes: the ledger's per-task lens lines and `findings/<NN>-lens-<name>.md` files, which name each lens that fired and its task.
- Produces: `route(toolInput) -> toolInput | null`; for `subagent_type` starting `fx:`, a `model` outside the cheap set with no `Capable because:` line is rewritten to the standard tier, and no `model` returns `null` (the frontmatter pin applies). Every other branch is unchanged.
- Produces: the call sites that dispatch `fx-devils-advocate` or `fx-lens-security` on the most capable tier, each with `model` set and a `Capable because:` first line: fx-plan §8 red-team (plan mode), `/fx:fx-critique`, fx-review standalone branch mode, and fx-implement's final review when the branch touches authentication or authorization.

**Seam:** `route()` through `tests/gates/dispatch-route.test.js`; the lane text through a gate test; generated files through `scripts/check-generated`.

**Risks:** `tests/gates/agent-model.test.js` requires a model pinned in every agent's frontmatter: pin `sonnet`, never remove the line. `tests/gates/tripwire-table.test.js` and `lens-content.test.js` pin the lens table and the `mode: branch` sentence: keep both and add the limited-pass rule beside them. A call site left without `Capable because:` silently moves to sonnet; the gate checks all four.

**Idempotency:** code and text edits; regeneration is deterministic.

**Testing:** unit assertions on `route()`; gate test on the lane text; `scripts/check-generated`.

## Acceptance criteria
- [ ] `route` gives `model: 'sonnet'` for `{ subagent_type: 'fx:fx-lens-security', model: 'opus', prompt: 'p' }`, `null` with a `Capable because:` first line, `null` with no model, `null` for `model: 'haiku'`.
- [ ] Every other existing assertion in `tests/gates/dispatch-route.test.js` still passes; the one asserting `fx:` agents are always left alone is replaced by the cases above.
- [ ] Both agents pin `model: sonnet`; Codex tomls and the fx-critique skill are regenerated.
- [ ] fx-review branch mode states the limited rule (with a ledger) and the full pass (without); the cap of four lenses and the fold-in order; the broad pass covers cross-task seams.
- [ ] fx-implement's Final review section matches that rule.
- [ ] The four call sites carry `Capable because:`.
- [ ] ADR 0044 records the decision; ADR 0029's status line names 0044; `scripts/check-all` runs the gate; every gate passes, including `scripts/check-generated`.

## Steps

- [ ] **1. Write the failing route test**

In `tests/gates/dispatch-route.test.js`, replace the assertion that `fx:` agents are left alone with:

```js
assert.strictEqual(route({ subagent_type: 'fx:fx-lens-security', model: 'opus', prompt: 'p' }).model, 'sonnet',
  'an fx agent asked for opus with no reason runs on the standard tier');
assert.strictEqual(route({ subagent_type: 'fx:fx-lens-security', model: 'opus', prompt: 'Capable because: auth rewrite\np' }), null,
  'an fx agent with a reason keeps opus');
assert.strictEqual(route({ subagent_type: 'fx:fx-lens-security', prompt: 'p' }), null,
  'an fx agent with no model keeps its frontmatter pin');
assert.strictEqual(route({ subagent_type: 'fx:fx-lens-database', model: 'haiku', prompt: 'p' }), null,
  'a cheap tier for an fx agent stands');
```

- [ ] **2. Run it: verify RED**

Run `test_one` from `.fx.json` with `{file}` = `tests/gates/dispatch-route.test.js`. Expected: FAIL on the first new assertion.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it.

- [ ] **4. Run it: verify GREEN**

Same command. Expected: PASS.

- [ ] **5. Write the failing gate test**

Create `tests/gates/branch-pass.test.js`:

```js
'use strict';
// Run: node tests/gates/branch-pass.test.js
// ADR 0044: after per-task review, the branch pass covers what it missed, and
// the most capable tier is always a written decision.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');
const review = read('skills/fx-review/SKILL.md');

assert.ok(review.includes('never fired on any task'), 'lenses that already ran are skipped');
assert.ok(review.includes('outside the tasks where they fired'), 'a lens whose trigger reaches new files still runs');
assert.ok(review.includes('at most four lenses'), 'the lens count is capped');
assert.ok(review.includes('fold into the broad pass'), 'lenses past the cap are not dropped');
assert.ok(review.includes('cross-task seams'), 'the broad pass covers seams between tasks');
assert.ok(review.includes('no ledger'), 'a standalone branch run keeps the full pass');
assert.ok(read('skills/fx-implement/SKILL.md').includes('never fired on any task'), 'fx-implement final review matches');
for (const a of ['fx-lens-security', 'fx-devils-advocate']) {
  assert.ok(/^model:\s*sonnet\s*$/m.test(fs.readFileSync(path.join(root, 'agents', `${a}.md`), 'utf8')), `${a} pins sonnet`);
}
for (const site of ['skills/fx-plan/SKILL.md', 'commands/fx-critique.md', 'skills/fx-review/SKILL.md', 'skills/fx-implement/SKILL.md']) {
  assert.ok(read(site).includes('Capable because:'), `${site} writes a reason for the top tier`);
}
assert.ok(fs.existsSync(path.join(root, 'docs', 'adr', '0044-the-branch-pass-reviews-what-per-task-review-missed.md')), 'ADR 0044 exists');

console.log('branch-pass: OK');
```

- [ ] **6. Run it: verify RED**

Run `test_one` with `{file}` = `tests/gates/branch-pass.test.js`. Expected: FAIL on the first assertion.

- [ ] **7. Edit the lanes, the agents and fx-critique; regenerate; write ADR 0044; list the gate**

Make every assertion and acceptance criterion hold. Regenerate with `scripts/gen-codex-agents` and `scripts/gen-command-skills`. Update ADR 0029's status line.

- [ ] **8. Run it: verify GREEN**

Same command. Expected: PASS.

- [ ] **9. Run the scope**

Run `test_scope` with `{paths}` = every path in Files. Expected: PASS, including `scripts/check-generated` and `tests/gates/agent-model.test.js`.

- [ ] **10. Commit**

```
git add lib/dispatch-route.js tests/gates/dispatch-route.test.js agents/fx-lens-security.md agents/fx-devils-advocate.md codex/agents skills/fx-review/SKILL.md skills/fx-implement/SKILL.md skills/fx-plan/SKILL.md commands/fx-critique.md skills/fx-critique/SKILL.md tests/gates/branch-pass.test.js scripts/check-all docs/adr/0044-the-branch-pass-reviews-what-per-task-review-missed.md docs/adr/0029-per-task-review-is-the-reviewer-plus-tripwires.md
git commit -m "feat(review): branch pass covers what per-task review missed, route decides every model"
```

No attribution trailers. Then continue to the next task: never stop and wait.
