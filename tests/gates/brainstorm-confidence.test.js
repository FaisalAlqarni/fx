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
