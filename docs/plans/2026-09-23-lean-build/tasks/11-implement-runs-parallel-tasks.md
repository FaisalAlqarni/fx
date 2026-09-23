# 11: `fx-implement` runs declared-parallel tasks

**Status:** ready-for-agent
**Blocked by:** 10
**Phase:** Hardening

**What to build:** when a plan declares two tasks `Parallel with` each other,
`fx-implement` builds them at the same time, and every way that can go wrong
sends the task back to serial without skipping a check or damaging the build
branch. A wrong guess costs time, never a check.

The existing "Serial implementers" paragraph stays the default and keeps its
reason (a shared test environment gives false RED and false GREEN). This task
replaces its last sentence ("Relax only if ...") with a pointer to the new
subsection. With this task reverted, that sentence returns; task 13 therefore
sets `isolated_test_execution` only when parallel ships.

**Files:**
- Modify: `skills/fx-implement/SKILL.md` (the "Serial implementers" paragraph and a new `### Parallel tasks` subsection after it)
- Create: `tests/gates/parallel-implement.test.js`
- Modify: `scripts/check-all` (add the gate)

**Interfaces:**
- Consumes: `**Parallel with:**` lines and `**Files:**` lists in task files (task 10); `.fx.json` `isolated_test_execution`; `test_scope`.
- The procedure, content (wording through `fx-authoring`):
  1. **Gate, all required:** `isolated_test_execution` is `true`; both tasks
     are on the frontier (every blocker complete and review-clean); each
     names the other under `Parallel with`; their `Files:` lists share no
     path; neither lists a hot file (the list in `fx-plan`). **At most two
     tasks at once.**
  2. **Dispatch record, before dispatching:** one ledger line per task,
     `Task NN: parallel with MM, branch <b>, base <sha>, worktree <path>`.
     The fixture's merge-defect scorer (task 03) reads this exact form.
  3. **Isolation:** each gets its own task worktree and branch, created from
     the build branch head. Never two implementers in one checkout.
  4. **Review** runs on each task's own branch, exactly as for a serial task.
  5. **File check after the implementer returns:** every file in
     `git diff --name-only <base>..<head>` is in the task's own `Files:` list,
     and none is in the other task's list or changed files. Otherwise the task
     goes back to serial: record `Task NN: back to serial, <reason>`, keep its
     branch (never `git branch -D`: the fx git guard blocks it, and the branch
     is evidence), and re-dispatch it on the build branch after the other task
     merges.
  6. **Merge, one task at a time.** Record `Task NN: merging` first. Rebase the
     task branch onto the **current** build branch head; run `test_scope` on
     the **union** of both tasks' `Files:` lists, so an interaction between
     the two is tested, not only the task's own files; fast-forward the build
     branch. The completion line then names the rebased range.
     - A rebase conflict: `git rebase --abort`, then back to serial with a
       fresh review of the task redone on the build branch.
     - A red `test_scope` after the rebase: back to serial with a fresh
       review of the rebased diff.
     - A failed fast-forward (the build branch moved during the merge): not a
       failure; rebase again and repeat this step.
  7. **Resume.** A resumed controller reads the ledger: a task with
     `parallel with` and no `complete` line is inspected in its recorded
     worktree, not recreated; a task with `merging` and no `complete` line is
     checked with `git status` in that worktree for a rebase in progress
     (`git rebase --abort` it and redo step 6).
  8. Remove each task worktree after its task completes or goes back to
     serial, with `git worktree remove` (never `rm -rf`).

**Seam:** gate over skill text; behaviour measured live in task 13 by the fixture's two parallel declarations.

**Idempotency:** step 7 is the resume rule; the ledger lines in steps 2, 5 and 6 are what it reads.

**Testing:** `node tests/gates/parallel-implement.test.js`, `scripts/check-all`.

**Skill edit:** through the `fx-authoring` lane.

## Acceptance criteria
- [ ] The "Serial implementers" paragraph still states serial as the default and still gives the shared-test-environment reason.
- [ ] `### Parallel tasks` contains all eight rules, including "At most two", the exact dispatch ledger form, one-at-a-time merging, the union test scope, and every back-to-serial path.
- [ ] No instruction deletes a branch or removes a worktree with `rm`.

## Steps

- [ ] **1. Write the failing gate**

```js
'use strict';
// Run: node tests/gates/parallel-implement.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const skill = fs.readFileSync(path.join(__dirname, '..', '..', 'skills', 'fx-implement', 'SKILL.md'), 'utf8');

assert.match(skill, /\*\*Serial implementers\.\*\*[\s\S]{0,600}shared test environment/, 'serial stays the default, with its reason');
const i = skill.indexOf('### Parallel tasks');
assert.ok(i >= 0, 'fx-implement has a Parallel tasks section');
const next = skill.indexOf('\n### ', i + 1);
const s = skill.slice(i, next > 0 ? next : undefined);
for (const needle of [
  'isolated_test_execution', 'Parallel with', 'Files:', 'hot file', 'At most two',
  'Task NN: parallel with MM, branch <b>, base <sha>, worktree <path>',
  'worktree', 'git diff --name-only', 'Task NN: merging', 'one task at a time', 'union',
  'rebase --abort', 'test_scope', 'fast-forward', 'back to serial', 'git worktree remove', 'resume',
]) assert.ok(s.toLowerCase().includes(needle.toLowerCase()), `Parallel tasks mentions: ${needle}`);
assert.ok((s.match(/back to serial/g) || []).length >= 3, 'every failure path returns to serial');
assert.ok(!/branch -D|rm -rf/.test(s), 'never deletes a branch or rm -rf a worktree');
console.log('parallel-implement: ok');
```

- [ ] **2. Run it: verify RED.** Expected: FAIL, `fx-implement has a Parallel tasks section`.

- [ ] **3. Edit `SKILL.md`** through `fx-authoring`. The "never `git branch -D`" rule is stated in words ("keep the branch") so the gate's last assertion holds.

- [ ] **4. Run it: verify GREEN.**

- [ ] **5. Run the suite.** Add the gate to `scripts/check-all`, run it, bump the version if asked.

- [ ] **6. Commit**

```
git add skills/fx-implement/SKILL.md tests/gates/parallel-implement.test.js scripts/check-all
git commit -m "feat(fx-implement): build declared-parallel tasks, merge one at a time, every guard falls back to serial"
```
