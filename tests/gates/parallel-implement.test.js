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
