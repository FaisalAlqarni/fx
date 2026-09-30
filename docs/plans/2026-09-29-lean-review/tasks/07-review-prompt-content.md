# 07: Review prompt content

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** Polish

**What to build:** four checks from `akkie76/code-review-skills` (MIT), absorbed into the prompts fx already has, with no new agent. The task reviewer sweeps unchanged callers and variants when a shared contract changes, re-reads every fact it cites before reporting, and flags test constants copied from the implementation. Devil's advocate in code mode hunts the caller and variant break. The branch reviewer flags docs, runbooks and examples the diff made stale.

**Files:**
- Modify: `skills/fx-implement/task-reviewer-prompt.md`
- Modify: `agents/fx-devils-advocate.md`
- Modify: `skills/fx-review/reviewer-prompt.md`
- Modify: `codex/agents/fx-devils-advocate.toml` (regenerated)
- Create: `tests/gates/review-content.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: the `model:` placeholder in `task-reviewer-prompt.md` and `reviewer-prompt.md` as task 03 left it (do not revert it).
- Produces: nothing other tasks read. ADR-0034 (task 09) cites this task's four items.

**Seam:** prompt text, pinned by a gate test.

**Risks:** keep `Reply with at most five lines:` and `## Ledger lines` in both templates (return-contract gate). The per-task reviewer must stay scoped: the caller sweep fires only when the diff changes a shared contract, which the existing "a concrete risk you can name" rule already allows.

**Idempotency:** text insertions checked for presence first; `scripts/gen-codex-agents` is idempotent.

**Testing:** gate test; return-contract; check-generated.

## Acceptance criteria
- [ ] `task-reviewer-prompt.md` Part 2 has the callers-and-variants paragraph, the test-constant question, and the re-read rule, verbatim below.
- [ ] `fx-devils-advocate.md` code mode has the unchanged-callers bullet.
- [ ] `reviewer-prompt.md` Production readiness asks about docs made stale.
- [ ] `codex/agents/` is regenerated and `scripts/check-generated` passes.
- [ ] `tests/gates/review-content.test.js` passes and is in `scripts/check-all`.

## Steps

- [ ] **1. Invoke the `fx-authoring` lane.**

- [ ] **2. Write the failing test** at `tests/gates/review-content.test.js`:

```js
'use strict';
// Checks absorbed from akkie76/code-review-skills into existing prompts.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
// Prompt text wraps at any word, so compare with whitespace collapsed.
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');

const task = read('skills/fx-implement/task-reviewer-prompt.md');
assert.ok(task.includes('**Callers and variants.**'), 'task reviewer sweeps callers and variants');
assert.ok(task.includes('every variant the shared code touches'), 'variants are named');
assert.ok(task.includes('must agree on precedence, validation and error mapping'), 'parallel paths must agree');
assert.ok(task.includes('re-read every fact it cites at its source'), 'cited facts are re-read');
assert.ok(task.includes('copied from the implementation'), 'test-constant drift is asked about');

const da = read('agents/fx-devils-advocate.md');
const code = da.slice(da.indexOf('## Code mode'), da.indexOf('## Output'));
assert.ok(code.includes('**Unchanged callers and variants**'), 'devil\'s advocate hunts caller breaks');

const branch = read('skills/fx-review/reviewer-prompt.md');
assert.ok(branch.includes('Docs, runbooks or examples the diff has made stale?'), 'branch review checks doc drift');

console.log('review-content.test.js: OK');
```

- [ ] **3. Run it: verify RED**

Run: `node tests/gates/review-content.test.js`
Expected: FAIL, `task reviewer sweeps callers and variants`.

- [ ] **4. Edit `skills/fx-implement/task-reviewer-prompt.md` Part 2.** Insert a new paragraph between the reuse paragraph (ending `place for it to drift.`) and `**Code:**`, at the template's 4-space indent:

```
    **Callers and variants.** When the diff changes a shared contract (a
    function signature, a return shape, a shared handler, an enum or variant
    set), check the unchanged callers and every variant the shared code
    touches: an unconditional change in a shared handler applies to all of
    them. Two new paths that do the same job must agree on precedence,
    validation and error mapping. Name each caller or variant you checked.
```

In the `**Tests:**` paragraph, after `...so it passes\n    by construction?`, add ` Any constant copied from the implementation rather than taken from the spec, which will drift with the code?`

At the start of the `## Write your findings to a file, then summarise` section's body, add:

```
    **Before you report a finding**, re-read every fact it cites at its
    source: the line, the caller count, the precedent. Drop any detail that
    does not hold, and keep the finding only if it still stands without it.
```

- [ ] **5. Edit `agents/fx-devils-advocate.md` code mode**: after the `**Silent failure paths**` bullet, add:

```markdown
- **Unchanged callers and variants**: a changed shared contract whose
  untouched callers or sibling variants now break, and two equivalent new
  paths that disagree on validation or error mapping.
```

- [ ] **6. Edit `skills/fx-review/reviewer-prompt.md`** Production readiness: after `    - Documentation complete?` add `    - Docs, runbooks or examples the diff has made stale?`

- [ ] **7. Run it: verify GREEN**

Run: `node tests/gates/review-content.test.js`
Expected: `review-content.test.js: OK`

- [ ] **8. Regenerate the Codex agents**

Run: `scripts/gen-codex-agents && scripts/check-generated`
Expected: `check-generated: OK`; `git status` shows `codex/agents/fx-devils-advocate.toml` modified.

- [ ] **9. Add the gate to `scripts/check-all`** after the `brainstorm-confidence.test.js` line if present, else after `dispatch-route.test.js`:

```
run review-content.test.js node tests/gates/review-content.test.js
```

- [ ] **10. Run the touched gates**

Run: `node tests/gates/return-contract.test.js && node tests/gates/agent-model.test.js && node tests/gates/no-runtime-addressing.test.js && scripts/check-prose skills/fx-implement/task-reviewer-prompt.md agents/fx-devils-advocate.md skills/fx-review/reviewer-prompt.md`
Expected: all pass.

- [ ] **11. Commit**

```
git add skills/fx-implement/task-reviewer-prompt.md agents/fx-devils-advocate.md skills/fx-review/reviewer-prompt.md codex/agents/fx-devils-advocate.toml tests/gates/review-content.test.js scripts/check-all
git commit -m "feat(review): caller and variant sweep, fact re-read, doc drift"
```
