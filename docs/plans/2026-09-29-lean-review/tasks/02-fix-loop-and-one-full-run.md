# 02: Fix-loop controller re-review and one full test run

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** three changes to how `fx-implement` spends agents and suite time. (a) A small fix round is re-reviewed by the controller reading the fix diff, not by a dispatched re-reviewer. (b) `test_all` runs once per build, at the exit gate; the baseline run before task 01 is gone. (c) At the exit gate every failing test is classified as pre-existing, introduced or order-dependent, which replaces what the baseline was for. An implementer who runs `test_all` per task is ledgered and reminded.

**Files:**
- Modify: `skills/fx-implement/SKILL.md`
- Modify: `skills/fx-implement/fix-loop.md`
- Create: `docs/adr/0030-small-fixes-are-re-reviewed-by-the-controller.md`
- Create: `tests/gates/fix-loop-shape.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: the `**Lens dispatch.**` wording from task 01 (the tripwire lenses named there are the ones whose findings exclude a fix from controller re-review).
- Produces: ledger line shapes `Task <NN>: fix round <R>/5: controller re-review (<L> lines): <X> addressed, <Y> open` and `Exit gate: <test>: pre-existing|introduced|order-dependent` and `Task <NN>: ran test_all (rule)`.

**Seam:** the prose of `fx-implement/SKILL.md` §2, §"Handle the report", §"The fix loop", the exit gate, and `fix-loop.md`, pinned by a gate test.

**Risks:** `fix-loop.md` is over 100 lines and must keep opening with `## Contents` (return-contract gate); keep `findings file(s) as a whole`, `## Ledger lines` and "Never fix findings yourself in the controller session." Update the Contents list if you add a heading.

**Idempotency:** text replacements; re-running finds the new text in place. The `check-all` line is added only if absent.

**Testing:** gate test on the new sentences; `return-contract.test.js`; `check-prose`.

## Acceptance criteria
- [ ] §2 says `test_all` runs once, at the exit gate, and no longer runs a baseline before task 01; the heading, the "Run the baseline suite" paragraph, the `Baseline:` report line and the red-flag row about baseline tests are updated to match.
- [ ] "Handle the report" says what to do when an implementer ran `test_all` although `.fx.json` has `test_scope`.
- [ ] `fix-loop.md` has a "Small fixes: controller re-review" rule with all four conditions, the `git diff --numstat` count that excludes test and doc files, the verdict per finding, and the ledger line.
- [ ] `SKILL.md` §"The fix loop" names the controller re-review as the alternative to a dispatched one.
- [ ] The final review allows splitting a multi-lens fix wave into serial fixers grouped by file, one re-review each, no second wave.
- [ ] The exit gate has a "Classify every failing test" subsection: `test_one` on the branch, then on the merge base in a throwaway detached worktree, three outcomes, one ledger line each, "introduced" blocks completion.
- [ ] ADR-0030 records all three with the evidence from `design.md` §3 and §4 (543 fix commits, median 16 production lines, 55% at or under 20; full suite 35 to 45 minutes).
- [ ] `tests/gates/fix-loop-shape.test.js` passes and is in `scripts/check-all`.

## Steps

- [ ] **1. Invoke the `fx-authoring` lane.**

- [ ] **2. Write the failing test** at `tests/gates/fix-loop-shape.test.js`:

```js
'use strict';
// Pins the lean-review fix loop and the one-full-run rule.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
// Prose wraps at any word, so compare with whitespace collapsed.
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');
const impl = read('skills/fx-implement/SKILL.md');
const loop = read('skills/fx-implement/fix-loop.md');

assert.ok(!impl.includes('once here for the baseline'), 'the baseline test_all run is gone');
assert.ok(impl.includes('`test_all` runs once in a run, at the exit gate.'), 'test_all runs once');
assert.ok(!impl.includes('Run the baseline suite **before task 01**'), 'no baseline paragraph');
assert.ok(impl.includes('ran test_all (rule)'), 'a per-task test_all run is ledgered');

assert.ok(loop.includes('**Small fixes: controller re-review.**'), 'the controller re-review rule exists');
assert.ok(loop.includes('20 production lines or fewer'), 'the cap counts production lines');
assert.ok(loop.includes('git diff --numstat'), 'the count is a command, not a guess');
assert.ok(loop.includes('controller re-review (<L> lines)'), 'the ledger line shape is given');
assert.ok(loop.includes('Never fix findings yourself in the controller session.'), 'the controller still never fixes');
assert.ok(impl.includes('or you reading the fix diff when it qualifies as small'), 'SKILL.md points at the rule');

const gateAt = impl.indexOf('### Classify every failing test');
assert.ok(gateAt > 0, 'the exit gate classifies failures');
const gate = impl.slice(gateAt, gateAt + 1500);
for (const word of ['test_one', 'merge base', 'pre-existing', 'introduced', 'order-dependent']) {
  assert.ok(gate.includes(word), `the classification names ${word}`);
}

console.log('fix-loop-shape.test.js: OK');
```

- [ ] **3. Run it: verify RED**

Run: `node tests/gates/fix-loop-shape.test.js`
Expected: FAIL, `the baseline test_all run is gone`.

- [ ] **4. Edit §2 of `skills/fx-implement/SKILL.md`.**

Heading: `### 2. Project setup and clean baseline` becomes `### 2. Project setup`.

`Run the \`setup\` and \`test_all\` commands from **\`.fx.json\`**: never guess them.` becomes `Run the \`setup\` command from **\`.fx.json\`**: never guess it, or any command named there.`

Replace the paragraph starting `**\`test_all\` runs exactly twice in a run:` with:

```markdown
**`test_all` runs once in a run, at the exit gate.** There is no baseline run
before task 01: on a suite measured in tens of minutes it cost a build as much
again before any work began, and the exit gate's classification (below)
answers the question it was for. Per-task gates use `test_scope` with the paths
that task touched, named by `repo.md`. A full suite per task multiplies one slow
command by the task count. No `test_scope` in `.fx.json` means the repo has no
safe partition, and every gate uses `test_all`.
```

Replace the paragraph starting `Run the baseline suite **before task 01**` and the report block after it with:

````markdown
Report:

```
Worktree ready at <full-path> on <branch>
Ready to implement <feature>
```
````

In the red-flags table, replace the row starting `| "The workspace is fresh: baseline tests can wait" |` with:

```markdown
| "I'll run the full suite now to be safe" | `test_all` runs once, at the exit gate. A failure there is classified against the merge base, which is what a baseline would have told you. |
```

Leave the greenfield paragraph (`No \`.fx.json\`, or the command is \`null\`?`) as it is.

- [ ] **5. Add to §"Handle the report"**, after the `**DONE_WITH_CONCERNS**` paragraph:

```markdown
**A report whose test command is `test_all`**, where `.fx.json` has a
`test_scope`, broke the one-full-run rule. The work stands; ledger
`Task <NN>: ran test_all (rule)` and repeat the rule in that implementer's next
dispatch or resume.
```

- [ ] **6. Edit §"The fix loop" in `SKILL.md`.** Replace `Every round ends with a **scoped**\nre-review.` with:

```markdown
Every round ends with a **scoped**
re-review: a dispatched re-reviewer, or you reading the fix diff when it
qualifies as small ([fix-loop.md](./fix-loop.md)).
```

- [ ] **7. Add the rule to `skills/fx-implement/fix-loop.md`**, as a new paragraph directly before `**Never fix findings yourself in the controller session.**`:

```markdown
**Small fixes: controller re-review.** Skip the dispatch and read the fix diff
yourself when all four hold:

1. The fix changes 20 production lines or fewer. Count them with
   `git diff --numstat <FIX_BASE> <HEAD> -- . ':!spec' ':!test' ':!tests' ':!*.md'`
   and add both columns.
2. It touches only files already in the task's diff.
3. Every open finding came from the task reviewer, none from a tripwire lens.
4. No open finding is Critical.

Verdict each finding ADDRESSED or NOT ADDRESSED, as a re-reviewer would, and
append `Task <NN>: fix round <R>/5: controller re-review (<L> lines): <X> addressed, <Y> open`.
A NOT ADDRESSED finding continues the loop as usual. This is the one time you
read a diff, and the 20-line cap is what keeps it one. The covering-tests check
above still applies first.
```

If `fix-loop.md`'s `## Contents` list names paragraphs, add this one.

- [ ] **8. Add the exit-gate subsection** to `SKILL.md`, directly after the `### Run what the repository's own gate runs` section and before the next `###` heading:

```markdown
### Classify every failing test

When `test_all` fails, run each failing test alone with `test_one`, first on
the branch, then on the merge base in a throwaway detached worktree
(`git worktree add --detach <scratch> <MERGE_BASE>`, removed afterwards with
`git worktree remove <scratch>`).

- Fails on both: **pre-existing**. Report it; it does not block this branch.
- Fails only on the branch: **introduced**. It blocks the completion claim
  like any other failure.
- Passes alone on the branch: **order-dependent**. Report it with the order
  that failed.

Append one line each: `Exit gate: <test>: pre-existing|introduced|order-dependent`.
```

- [ ] **8b. Allow the end-pass fix wave to split.** In `SKILL.md`'s final review, after `Then exactly **one** scoped re-review.`, add:

```markdown
The branch pass now carries every lens, so its wave can be larger than a
task's. When the findings span more than one lens, you may split them into
serial fixers grouped by file, each followed by one scoped re-review; still
no second wave.
```

Add to the step 2 test, before its final `console.log`:

```js
assert.ok(impl.includes('serial fixers grouped by file'), 'the end-pass wave may split by file');
```

- [ ] **9. Run it: verify GREEN**

Run: `node tests/gates/fix-loop-shape.test.js`
Expected: `fix-loop-shape.test.js: OK`

- [ ] **10. Write ADR-0030** at `docs/adr/0030-small-fixes-are-re-reviewed-by-the-controller.md`. H1: `# Small fixes are re-reviewed by the controller, and test_all runs once`. Prose: the four conditions and why the cap counts production lines (543 fix commits on advantage-backend since 2026-09-21: median 16 production lines, 52 with tests and docs; 55% at or under 20); why the controller's context is the constraint; the dropped baseline (35 to 45 minutes per full run there) and the exit-gate classification that replaces it; the per-task `test_all` rule.

- [ ] **11. Add the gate to `scripts/check-all`** after the `tripwire-table.test.js` line:

```
run fix-loop-shape.test.js node tests/gates/fix-loop-shape.test.js
```

- [ ] **12. Run the touched gates**

Run: `node tests/gates/return-contract.test.js && node tests/gates/tripwire-table.test.js && node tests/gates/no-runtime-addressing.test.js && scripts/check-prose skills/fx-implement/SKILL.md skills/fx-implement/fix-loop.md docs/adr/0030-small-fixes-are-re-reviewed-by-the-controller.md`
Expected: all pass.

- [ ] **13. Commit**

```
git add skills/fx-implement/SKILL.md skills/fx-implement/fix-loop.md docs/adr/0030-small-fixes-are-re-reviewed-by-the-controller.md tests/gates/fix-loop-shape.test.js scripts/check-all
git commit -m "feat(implement): controller re-review for small fixes, one full test run"
```
