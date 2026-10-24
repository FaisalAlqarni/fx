// Run: node tests/gates/plan-template.test.js
// ADR 0043: plan tasks state behaviour and specify tests in prose; the
// implementer writes test code through fx-tdd against real code.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
const plan = fs.readFileSync(path.join(root, 'skills', 'fx-plan', 'SKILL.md'), 'utf8');
const templates = fs.readFileSync(path.join(root, 'skills', 'fx-plan', 'templates.md'), 'utf8');
const flat = plan.replace(/\s+/g, ' ');
const template = templates.slice(templates.indexOf('## tasks/NN-<slug>.md template'));
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
