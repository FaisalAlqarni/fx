# 01: Per-task tripwires in the lens table

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** during `fx-implement`, each task gets the task reviewer plus a lens only when its narrow tripwire matches: security, database and silent-failure have one; a11y and pipeline never run per task. Every lens still runs at the branch-end review on its broad trigger. The rule lives in one place, the lens table in `skills/fx-review/SKILL.md`, and `fx-implement` points at it.

**Files:**
- Modify: `skills/fx-review/SKILL.md`
- Modify: `skills/fx-implement/SKILL.md`
- Create: `docs/adr/0029-per-task-review-is-the-reviewer-plus-tripwires.md`
- Create: `tests/gates/tripwire-table.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the lens table with a `Per task (tripwire)` column, which task 11's README mirrors.

**Seam:** the text of the lens table and the `**Lens dispatch.**` paragraph, pinned by a gate test.

**Risks:** the `**Lens dispatch.**` span is pinned by `tests/gates/return-contract.test.js`: keep `**Lens dispatch.**`, `your Write tool` and `The reviewer gets three paths` exactly. Table cells must not contain `|`.

**Idempotency:** edits are text replacements; re-running finds the new text already in place. The test file is overwritten whole. The `check-all` line is added only if absent.

**Testing:** gate test on the table and paragraph; `return-contract.test.js`; `check-prose`.

## Acceptance criteria
- [ ] The lens table header is `| Lens | Per task (tripwire) | Branch pass: fires when the diff touches |`.
- [ ] Security, database and silent-failure rows carry the tripwire text below, each starting `tripwire:`; a11y and pipeline carry `no`.
- [ ] The task-mode blurb no longer says "Lenses off unless the task touches auth, payment, or a migration" and instead points at the table's per-task column.
- [ ] `**Lens dispatch.**` in `fx-implement` dispatches a lens per task only when its tripwire matches, and no longer lists `-a11y`.
- [ ] ADR-0029 records the decision and that it supersedes the "per-task review stays exactly as it is" clause of `docs/plans/2026-09-23-lean-build/design.md`, with the P1 evidence from `design.md` §1 "Trade-off, stated".
- [ ] `tests/gates/tripwire-table.test.js` passes and is listed in `scripts/check-all`.

## Steps

- [ ] **1. Invoke the `fx-authoring` lane** before editing any skill text.

- [ ] **2. Write the failing test** at `tests/gates/tripwire-table.test.js`:

```js
'use strict';
// The per-task lens rule lives in one table. This pins its shape so the rule
// cannot drift back to "every triggered lens on every task".
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const review = read('skills/fx-review/SKILL.md');
const lines = review.split('\n');
const header = lines.find((l) => l.startsWith('| Lens |'));
assert.ok(header, 'the lens table header is present');
assert.ok(header.includes('| Per task (tripwire) |'), `the header has a per-task column: ${header}`);

function cells(lens) {
  const line = lines.find((l) => l.startsWith(`| \`${lens}\``));
  assert.ok(line, `a row for ${lens}`);
  return line.split('|').map((c) => c.trim()).filter(Boolean);
}
for (const lens of ['fx-lens-security', 'fx-lens-database', 'fx-lens-silent-failure']) {
  assert.ok(cells(lens)[1].startsWith('tripwire:'), `${lens} fires per task only on its tripwire`);
}
for (const lens of ['fx-lens-a11y', 'fx-lens-pipeline']) {
  assert.strictEqual(cells(lens)[1], 'no', `${lens} never fires per task`);
}
assert.ok(!review.includes('auth, payment, or a migration'), 'the old task-mode blurb is gone');

const impl = read('skills/fx-implement/SKILL.md');
const start = impl.indexOf('**Lens dispatch.**');
const end = impl.indexOf('The reviewer gets three paths');
assert.ok(start >= 0 && end > start, 'the lens dispatch span is intact');
const span = impl.slice(start, end);
assert.ok(span.includes('tripwire'), 'lens dispatch uses the tripwire column');
assert.ok(!span.includes('-a11y'), 'lens dispatch no longer sends a11y per task');

console.log('tripwire-table.test.js: OK');
```

- [ ] **3. Run it: verify RED**

Run: `node tests/gates/tripwire-table.test.js`
Expected: FAIL, `the header has a per-task column`.

- [ ] **4. Replace the lens table** in `skills/fx-review/SKILL.md` (§2, the table starting `| Lens | Fires when the diff touches | Mode |`) with:

```markdown
| Lens | Per task (tripwire) | Branch pass: fires when the diff touches |
|---|---|---|
| `fx-lens-database` | tripwire: a migration, a schema file change, a new or changed index, uniqueness or null constraint, a backfill or table rewrite | `db/migrate/`, `*.sql`, `structure.sql`, any model, ClickHouse queries, EF migrations |
| `fx-lens-security` | tripwire: authentication or authorization code (login, session, token issue or verify, policies, `authenticate` filters and their skips, `[Authorize]`, `[AllowAnonymous]`); credentials, secrets or key material; a new route or endpoint; code that fetches, redirects to or stores a user-supplied URL or host; string-built SQL or shell | Devise / Pundit / JWT / session / auth paths, params handling, credentials, any new endpoint or route, `[Authorize]` |
| `fx-lens-a11y` | no | `.erb`, `.css`, view partials, Compose `.kt`, SwiftUI `.swift`, anything with user-facing strings |
| `fx-lens-silent-failure` | tripwire: an error handler that swallows (`rescue nil`, or a `rescue`, `catch` or `except` whose body is empty or only logs); `retry_on` or `discard_on`; a background job, queue consumer or webhook receiver; a transaction or bulk loop that continues past a failed record | `rescue`, `catch`, `except`, Sidekiq workers, broker consumers, attribution code |
| `fx-lens-pipeline` | no | code that enqueues, publishes, schedules or fans out work; code that governs queue depth, admission or producer flow control |

Per task, a lens fires only when the task's diff matches its tripwire; the
broad triggers in the last column apply at the branch pass, where every lens
runs. Devil's advocate never runs per task.
```

- [ ] **5. Replace the task-mode blurb** in `skills/fx-review/SKILL.md` §"Two modes":

Old:
```
- **task**: called by `fx-implement` after each task. Correctness + Spec,
  scoped to that task. Mid-tier model. Lenses off unless the task touches
  auth, payment, or a migration.
```
New:
```
- **task**: called by `fx-implement` after each task. Correctness + Spec,
  scoped to that task. Mid-tier model. A lens fires only on its tripwire in
  §2's "Per task" column.
```

- [ ] **6. Replace the first paragraph of `**Lens dispatch.**`** in `skills/fx-implement/SKILL.md` (from `**Lens dispatch.**` to `below like any other; its \`[Minor]\` findings never do (see below).`) with:

```markdown
**Lens dispatch.** After packaging the diff, check the task's diff against the
"Per task (tripwire)" column of the lens table in `../fx-review/SKILL.md` (§2)
and dispatch each lens whose tripwire matches (`fx-lens-security`,
`-database`, `-silent-failure`) alongside the task reviewer, same diff file.
A lens whose column says `no`, and any lens whose tripwire does not match,
waits for the branch pass, where every lens runs on its broad trigger.
Reference the table, don't copy it. A lens's `[Critical]` and `[Important]`
findings enter the fix loop below like any other; its `[Minor]` findings
never do (see below).
```

Leave the rest of the span (`**A lens has no Write tool...` through `The reviewer gets three paths`) unchanged.

- [ ] **7. Run it: verify GREEN**

Run: `node tests/gates/tripwire-table.test.js`
Expected: `tripwire-table.test.js: OK`

- [ ] **8. Write ADR-0029** at `docs/adr/0029-per-task-review-is-the-reviewer-plus-tripwires.md`. H1: `# Per-task review is the reviewer plus tripwires; every lens and devil's advocate run at the branch pass`. Prose: the measured problem (lenses 3.3% of agent-minutes but they trigger fix rounds; the owner asked for the same cut about seven times), the rule (the three tripwires, a11y and pipeline branch-only), the trade-off with the P1 evidence from `design.md` §1, and one line: supersedes the "Per-task review ... stay exactly as they are" clause of `docs/plans/2026-09-23-lean-build/design.md`.

- [ ] **9. Add the gate to `scripts/check-all`**, after the `return-contract.test.js` line:

```
run tripwire-table.test.js node tests/gates/tripwire-table.test.js
```

- [ ] **10. Run the touched gates**

Run: `node tests/gates/return-contract.test.js && node tests/gates/no-runtime-addressing.test.js && scripts/check-prose skills/fx-review/SKILL.md skills/fx-implement/SKILL.md docs/adr/0029-per-task-review-is-the-reviewer-plus-tripwires.md`
Expected: all pass.

- [ ] **11. Commit**

```
git add skills/fx-review/SKILL.md skills/fx-implement/SKILL.md docs/adr/0029-per-task-review-is-the-reviewer-plus-tripwires.md tests/gates/tripwire-table.test.js scripts/check-all
git commit -m "feat(review): per-task lenses fire only on tripwires"
```
