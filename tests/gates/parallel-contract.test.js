'use strict';
// Run: node tests/gates/parallel-contract.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const plan = read('skills/fx-plan/SKILL.md');
assert.match(plan, /\*\*Blocked by:\*\*[^\n]*\n\*\*Parallel with:\*\*/, 'task template: Parallel with sits under Blocked by');
assert.match(plan, /\| # \| Title \| Blocked by \| Parallel with \|/, 'plan.md Tasks table has a Parallel with column');
const i = plan.indexOf('**Parallel with.**');
assert.ok(i >= 0, 'fx-plan has the Parallel with rules paragraph');
const rules = plan.slice(i, i + 2000);
for (const needle of ['symmetric', 'package.json', 'check-all', 'version', 'changelog', 'registry', 'Files:']) {
  assert.ok(rules.toLowerCase().includes(needle.toLowerCase()), `rules mention ${needle}`);
}

const setup = read('skills/fx-setup/SKILL.md');
assert.match(setup, /"isolated_test_execution":\s*false/, 'fx-setup example carries the key');
assert.match(setup, /\|\s*`?isolated_test_execution`?\s*\|/, 'fx-setup keys table has the row');
assert.match(setup, /shared service/i, 'fx-setup asks about shared services');
console.log('parallel-contract: ok');
