# 06: Confidence check in fx-brainstorm

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Core

**What to build:** `fx-brainstorm` keeps interviewing until the agent is 95% confident it understands exactly what the user asks for. It then sends one message saying what made it confident and, in two lines, what it will do, and stops until the user gives an explicit go. Only then are approaches or a design presented. This applies to the bounded and architectural paths; the spike path keeps its own nod gate.

**Files:**
- Modify: `skills/fx-brainstorm/SKILL.md`
- Create: `docs/adr/0033-fx-brainstorm-ends-its-interview-with-a-confidence-check.md`
- Create: `tests/gates/brainstorm-confidence.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the §3 subsection `### Close the interview with a confidence check`, which task 11's README pipeline diagram names.

**Seam:** the skill text, pinned by a gate test.

**Risks:** renumbering the checklists must keep every `(§N)` cross-reference right. The skill instructs agents to "create a task for each item on your path", so the new step must be its own numbered item, not a sentence inside another.

**Idempotency:** text replacements; the `check-all` line is added only if absent.

**Testing:** gate test on the text and the step order.

## Acceptance criteria
- [ ] §3's closing paragraph starting `**Done when the ledger is empty**` is replaced by the subsection below, verbatim.
- [ ] Bounded checklist: step 3 is the confidence check, before the short design.
- [ ] Architectural checklist: step 4 is the confidence check, before "Propose 2 to 3 approaches"; later steps renumbered 5 to 10.
- [ ] A red-flags row covers showing approaches in the same message as the check.
- [ ] ADR-0033 records it.
- [ ] `tests/gates/brainstorm-confidence.test.js` passes and is in `scripts/check-all`.

## Steps

- [ ] **1. Invoke the `fx-authoring` lane.**

- [ ] **2. Write the failing test** at `tests/gates/brainstorm-confidence.test.js`:

```js
'use strict';
// fx-brainstorm stops after the interview with a confidence check, before
// any approach or design is shown.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const skill = fs.readFileSync(path.join(__dirname, '..', '..', 'skills', 'fx-brainstorm', 'SKILL.md'), 'utf8');

assert.ok(skill.includes('### Close the interview with a confidence check'), 'the subsection exists');
assert.ok(skill.includes('95% confident'), 'the bar is stated');
assert.ok(skill.includes('**What made you confident**'), 'the evidence part is required');
assert.ok(skill.includes('**What you will do**, in two lines.'), 'the two-line plan is required');
assert.ok(skill.includes('Nothing happens until the user gives an explicit go'), 'the stop is explicit');
assert.ok(!skill.includes('**Done when the ledger is empty**'), 'the old closing paragraph is gone');

const bounded = skill.slice(skill.indexOf('### Bounded checklist'), skill.indexOf('### Architectural checklist'));
assert.ok(/\n3\. \*\*Confidence check/.test(bounded), 'bounded step 3 is the confidence check');
assert.ok(bounded.indexOf('Confidence check') < bounded.indexOf('short design'), 'the check comes before the design');

const arch = skill.slice(skill.indexOf('### Architectural checklist'), skill.indexOf('**Terminal states are path-bound.**'));
assert.ok(/\n4\. \*\*Confidence check/.test(arch), 'architectural step 4 is the confidence check');
assert.ok(arch.indexOf('Confidence check') < arch.indexOf('Propose 2 to 3 approaches'), 'the check comes before approaches');
assert.ok(/\n10\. Hand off to `fx-plan`/.test(arch), 'the later steps are renumbered');

assert.ok(/\| "I'm confident, I'll show approaches in the same message" \|/.test(skill), 'the red flag row exists');

console.log('brainstorm-confidence.test.js: OK');
```

- [ ] **3. Run it: verify RED**

Run: `node tests/gates/brainstorm-confidence.test.js`
Expected: FAIL, `the subsection exists`.

- [ ] **4. Replace §3's closing paragraph** in `skills/fx-brainstorm/SKILL.md` (the three lines starting `**Done when the ledger is empty**`) with:

```markdown
### Close the interview with a confidence check

Keep asking rounds until you are 95% confident you understand exactly what
the user is asking for: the ledger is empty and no decision rests on a guess.
Then, in one message:

1. **What made you confident**: the answers and looked-up facts that settled
   it, each tied to the decision it settled. Name any assumption still standing.
2. **What you will do**, in two lines.

Then stop. Nothing happens until the user gives an explicit go: no file
written, no approach proposed, no lane invoked.
```

- [ ] **5. Edit the checklists.** Bounded becomes:

```markdown
### Bounded checklist
1. Explore project context: files, docs, recent commits
2. Ask the clarifying questions that matter
3. **Confidence check, then stop until the user says go** (§3)
4. Present a short design in chat: approach, files touched, testing
5. **Get approval: STOP and wait for an explicit yes.** Presenting the design
   and starting in the same breath is skipping the gate
6. Implement through the normal workflow (`fx-tdd` applies). No plan document
```

Architectural: insert `4. **Confidence check, then stop until the user says go** (§3)` after step 3 and renumber the rest 5 to 10, keeping each step's text and its `(§N)` reference unchanged.

- [ ] **6. Add the red-flags row** after the row starting `| "It's bounded and the design is obvious`:

```markdown
| "I'm confident, I'll show approaches in the same message" | The check is its own message. Approaches wait for the user's go. |
```

- [ ] **7. Run it: verify GREEN**

Run: `node tests/gates/brainstorm-confidence.test.js`
Expected: `brainstorm-confidence.test.js: OK`

- [ ] **8. Write ADR-0033** at `docs/adr/0033-fx-brainstorm-ends-its-interview-with-a-confidence-check.md`. H1: `# fx-brainstorm ends its interview with a confidence check`. Prose: the owner's request (a 95% bar, a summary of what made the agent confident, a two-line plan, then wait), why it is a numbered step (the skill turns steps into tasks), why the 95% bar has a concrete test (empty ledger, no decision resting on a guess), and that the spike path keeps its nod gate.

- [ ] **9. Add the gate to `scripts/check-all`** after the `dispatch-route.test.js` line if present, else after `fix-loop-shape.test.js`:

```
run brainstorm-confidence.test.js node tests/gates/brainstorm-confidence.test.js
```

- [ ] **10. Run the touched gates**

Run: `node tests/gates/no-runtime-addressing.test.js && node tests/gates/description-overlap.test.js && scripts/check-prose skills/fx-brainstorm/SKILL.md docs/adr/0033-fx-brainstorm-ends-its-interview-with-a-confidence-check.md`
Expected: all pass.

- [ ] **11. Commit**

```
git add skills/fx-brainstorm/SKILL.md docs/adr/0033-fx-brainstorm-ends-its-interview-with-a-confidence-check.md tests/gates/brainstorm-confidence.test.js scripts/check-all
git commit -m "feat(brainstorm): confidence check before approaches"
```
