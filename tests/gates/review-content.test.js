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
