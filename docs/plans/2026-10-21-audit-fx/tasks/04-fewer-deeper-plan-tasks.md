# 04: Fewer, deeper plan tasks

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** MVP

**What to build:** fx-plan writes fewer tasks, each sized to one seam, that state behaviour and specify their tests in prose instead of carrying test code. Docs, ADR, rename and config work fold into the task that needs them, and tasks that edit the same files merge. Each task carries the `**Design:**` and `**Stack:**` lines that task 03's `compile-brief` reads. The red-team is recommended on risk, not on task count. Every other part of fx-plan that demanded test code or fixed fields agrees with the new template.

**Files:**
- Modify: `skills/fx-plan/SKILL.md`
- Create: `tests/gates/plan-template.test.js`
- Modify: `scripts/check-all` (add the new gate)
- Create: `docs/adr/0043-plan-tasks-state-behaviour-and-name-tests.md`

**Interfaces:**
- Consumes: the `**Design:**` (`Heading` or `Heading > N`, separated by `;`) and `**Stack:**` (`stack/Heading`, separated by `;`) task-file lines from task 03.
- Produces: the fx-plan task template. Required fields: Status, Blocked by, Phase, What to build, Design, Files, Seam, Tests, Testing, Acceptance criteria, Steps. Optional fields: Stack (omit to give the implementer every stack file), Interfaces (required when a neighbour task consumes or produces a symbol), Risks, Idempotency (required when the task mutates state outside git: a database, a file outside the repository, an external service).
- Produces: the `**Tests:**` field: one entry per test, each with its name, its input, and the exact expected value or error contract (exact message, key or status). No test code.

**Seam:** the fx-plan lane text, asserted by a gate test.

**Risks:** prose test specs can be looser than code. The Tests field's exact-expected-value rule and the two existing red flags on error contracts and spec types are what keep them precise; keep both red flags.

**Idempotency:** a text edit.

**Testing:** gate test plus the full gate sweep.

## Acceptance criteria
- [ ] The task template has the required and optional fields above, a `**Tests:**` field with its rule, and no fenced test code; its Steps read: invoke fx-tdd, write each test the Tests field names, verify RED, implement, verify GREEN, run the scope, commit by path.
- [ ] The paragraphs "Test code is written out; implementation code is not" and "Test code in a task is code nobody has run" are replaced by one rule: tests are specified in the Tests field and written by the implementer through fx-tdd against real code; a decision-rich snippet (schema, state machine, type shape) may still be inlined, trimmed, noting its source.
- [ ] §4 right-sizing says a task is one seam; docs, ADR, rename and config work fold into the owning task; tasks that edit the same files merge.
- [ ] The No-placeholders list drops "Write tests for the above: without the actual test code", "Similar to task N: repeat it" and "A step describing what without showing how", and adds "A Tests entry without an exact expected value" and "A rule repeated in several tasks: state it once in plan.md's Global Constraints".
- [ ] The Quality red flags say Interfaces is present when a neighbour consumes or produces a symbol, and Idempotency when the task mutates state outside git; the error-contract and spec-type flags stay.
- [ ] §7's YES triggers no longer include a task count.
- [ ] "Who you are writing for" says the implementer has no context for this codebase and invokes fx-tdd for test design; it no longer says "questionable taste" or "does not know good test design well".
- [ ] ADR 0043 records the decision; `scripts/check-all` runs the gate; every gate passes.

## Steps

- [ ] **1. Write the failing gate test**

Create `tests/gates/plan-template.test.js`:

```js
'use strict';
// Run: node tests/gates/plan-template.test.js
// ADR 0043: plan tasks state behaviour and specify tests in prose; the
// implementer writes test code through fx-tdd against real code.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const plan = fs.readFileSync(path.join(root, 'skills', 'fx-plan', 'SKILL.md'), 'utf8');
const flat = plan.replace(/\s+/g, ' ');
const template = plan.slice(plan.indexOf('## tasks/NN-<slug>.md template'), plan.indexOf('## No placeholders'));
const placeholders = flat.slice(flat.indexOf('## No placeholders'), flat.indexOf('## Quality red flags'));
const flags = flat.slice(flat.indexOf('## Quality red flags'));
const sec7 = flat.slice(flat.indexOf('## 7. Red-team recommendation'), flat.indexOf('## 8. Handoff'));

assert.ok(template.includes('**Tests:**') && template.includes('**Design:**') && template.includes('**Stack:**'), 'template fields');
assert.ok(!/```(ruby|js|javascript|ts|python|csharp|kotlin|swift)\n/.test(template), 'no fenced test code in the template');
assert.ok(!flat.includes('Test code is written out') && !flat.includes('Test code in a task is code nobody has run'), 'old test-code rules gone');
assert.ok(!placeholders.includes('without the actual test code') && !placeholders.includes('repeat it'), 'placeholder list agrees');
assert.ok(placeholders.includes('without an exact expected value'), 'a vague Tests entry is a placeholder');
assert.ok(flags.includes('when a neighbour') && flags.includes('outside git'), 'red flags make Interfaces and Idempotency conditional');
assert.ok(flags.includes('error contract') && flags.includes('type: :request'), 'error-contract and spec-type flags stay');
assert.ok(!/\d+\+ tasks/.test(sec7), 'no task-count trigger for the red-team');
assert.ok(!flat.includes('questionable taste'), 'reader not assumed to have poor taste');
assert.ok(fs.existsSync(path.join(root, 'docs', 'adr', '0043-plan-tasks-state-behaviour-and-name-tests.md')), 'ADR 0043 exists');

console.log('plan-template: OK');
```

- [ ] **2. Run it: verify RED**

Run `test_one` from `.fx.json` with `{file}` = `tests/gates/plan-template.test.js`. Expected: FAIL, no `**Tests:**` field.

- [ ] **3. Edit fx-plan, write ADR 0043, list the gate in `scripts/check-all`**

Make every assertion and acceptance criterion hold. The template's example task shows a Tests field in prose.

- [ ] **4. Run it: verify GREEN**

Same command. Expected: PASS.

- [ ] **5. Run the scope**

Run `test_scope` with `{paths}` = every path in Files. Expected: PASS.

- [ ] **6. Commit**

```
git add skills/fx-plan/SKILL.md tests/gates/plan-template.test.js scripts/check-all docs/adr/0043-plan-tasks-state-behaviour-and-name-tests.md
git commit -m "feat(fx-plan): fewer deeper tasks that state behaviour and specify their tests"
```

No attribution trailers. Then continue to the next task: never stop and wait.
