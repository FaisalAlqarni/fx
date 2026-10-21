# 02: Rules in the lane, stories in COVERAGE.md

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** The five lane files every build loads carry rules, each with at most one line of why, and no incident stories. Every "Measured:" story that sits in them today moves, word for word, to an `## Incident record` section at the end of that lane's `COVERAGE.md`, which no session loads. A maintainer who wants the evidence finds it there; an agent loading the lane no longer pays for it.

**Files:**
- Modify: `skills/fx-implement/SKILL.md`
- Modify: `skills/fx-implement/implementer-prompt.md`
- Modify: `skills/fx-implement/task-reviewer-prompt.md`
- Modify: `skills/fx-implement/COVERAGE.md`
- Modify: `skills/fx-plan/SKILL.md`
- Modify: `skills/fx-plan/COVERAGE.md`
- Modify: `skills/fx-tdd/SKILL.md`
- Modify: `skills/fx-tdd/COVERAGE.md`
- Create: `tests/gates/no-stories-in-loaded-lanes.test.js`
- Modify: `scripts/check-all` (add the new gate)
- Create: `docs/adr/0041-rules-load-stories-do-not.md`
- Modify: any `tests/gates/*.test.js` that pins a sentence inside a moved story (find them by running the scope)

**Interfaces:**
- Consumes: nothing from earlier tasks. Task 01's new ledger rules in `skills/fx-implement/SKILL.md` are rules and stay.
- Produces: the convention that a loaded lane file holds no line matching `/\bMeasured\b/`, and that each moved story sits under `## Incident record` in the same lane's `COVERAGE.md`, headed by the rule it supports.

**Seam:** the lane files' text, asserted by a gate test.

**Risks:** a rule that only makes sense with its story loses its reason. Keep one line of why beside each rule (for example "a resumed controller re-dispatched completed tasks"), never the story itself. The implementer template's own stories are also removed by task 03's rewrite; move them here anyway so task 03 starts from rule-only text.

**Idempotency:** a text move; re-running finds no story left and changes nothing.

**Testing:** gate test plus the full gate sweep that `test_scope` runs on `.md` paths.

## Acceptance criteria
- [ ] None of the five loaded files contains the word `Measured`.
- [ ] Each story removed from a loaded file appears verbatim under `## Incident record` in that lane's `COVERAGE.md`, preceded by one line naming the rule it supports.
- [ ] Every rule that had a story still states the rule, with at most one line of why.
- [ ] Byte size of `skills/fx-implement/implementer-prompt.md`, `skills/fx-plan/SKILL.md` and `skills/fx-tdd/SKILL.md` each drops (record before and after in the report).
- [ ] ADR 0041 records the decision; `scripts/check-all` runs the new gate.
- [ ] Every gate test passes; a gate assertion that pinned story text is pointed at the rule or at the COVERAGE.md copy, keeping what it protected.

## Steps

- [ ] **1. Write the failing gate test**

Create `tests/gates/no-stories-in-loaded-lanes.test.js`:

```js
'use strict';
// Run: node tests/gates/no-stories-in-loaded-lanes.test.js
// ADR 0041: the lane files every build loads carry rules; incident stories
// live in the lane's COVERAGE.md, which no session loads.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const loaded = {
  'skills/fx-implement/SKILL.md': 'skills/fx-implement/COVERAGE.md',
  'skills/fx-implement/implementer-prompt.md': 'skills/fx-implement/COVERAGE.md',
  'skills/fx-implement/task-reviewer-prompt.md': 'skills/fx-implement/COVERAGE.md',
  'skills/fx-plan/SKILL.md': 'skills/fx-plan/COVERAGE.md',
  'skills/fx-tdd/SKILL.md': 'skills/fx-tdd/COVERAGE.md',
};
for (const [file, coverage] of Object.entries(loaded)) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const hits = text.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /\bMeasured\b/.test(l));
  assert.deepStrictEqual(hits, [], `${file} still carries a story: line ${hits.map(([n]) => n).join(', ')}`);
  assert.ok(fs.readFileSync(path.join(root, coverage), 'utf8').includes('## Incident record'), `${coverage} has an Incident record section`);
}
assert.ok(fs.existsSync(path.join(root, 'docs', 'adr', '0041-rules-load-stories-do-not.md')), 'ADR 0041 exists');

console.log('no-stories-in-loaded-lanes: OK');
```

- [ ] **2. Run it: verify RED**

Run `test_one` from `.fx.json` with `{file}` = `tests/gates/no-stories-in-loaded-lanes.test.js`.
Expected: FAIL, naming `skills/fx-implement/SKILL.md` and its story lines.

- [ ] **3. Move the stories**

For each loaded file, top to bottom: cut each story (the sentence starting "Measured" through the end of that account), paste it under `## Incident record` in the lane's COVERAGE.md after one line naming its rule, and leave the rule in place with at most one line of why. `fx-tdd` drives nothing here: this task is a text move pinned by the gate.

- [ ] **4. Write ADR 0041 and list the gate in `scripts/check-all`**

Shape of `docs/adr/0039-codex-addressing-and-shell-run-apply-patch.md`. Reason: the stories were about 30% of the most-loaded files and every load paid for them (`docs/plans/2026-10-21-audit-fx/01-current.md`).

- [ ] **5. Run it: verify GREEN**

Same command. Expected: PASS.

- [ ] **6. Run the scope**

Run `test_scope` with `{paths}` = every path in Files. Fix any gate that pinned moved text in the same commit, keeping what it protected.

- [ ] **7. Commit**

```
git add skills/fx-implement/SKILL.md skills/fx-implement/implementer-prompt.md skills/fx-implement/task-reviewer-prompt.md skills/fx-implement/COVERAGE.md skills/fx-plan/SKILL.md skills/fx-plan/COVERAGE.md skills/fx-tdd/SKILL.md skills/fx-tdd/COVERAGE.md tests/gates/no-stories-in-loaded-lanes.test.js scripts/check-all docs/adr/0041-rules-load-stories-do-not.md
git commit -m "refactor(lanes): keep rules in loaded lane files, move incident stories to COVERAGE.md"
```

Add any gate test you changed by its path. No attribution trailers. Then continue to the next task: never stop and wait.
