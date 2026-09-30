'use strict';
// Content absorbed into the lenses. Task 09 adds the a11y and design checks.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
// Prose wraps at any word, so compare with whitespace collapsed.
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');

const sec = read('agents/fx-lens-security.md');
for (const phrase of [
  'search, filter, sort or export path',
  'export or import path with no authorization of its own',
  'soft delete or revoke that a cache, search index or background job still honours',
  'webhook or callback URL a user saves',
  'log, analytics or ClickHouse reader that ignores the tenant',
  'differs between "missing" and "forbidden"',
  'not bound to its audience or issuer',
  'session fixation',
  '**Branch review only**',
  'mode: branch',
  'second-order',
  'restore, rollback or undelete',
]) {
  assert.ok(sec.includes(phrase), `security lens hunts: ${phrase}`);
}

const review = read('skills/fx-review/SKILL.md');
assert.ok(review.includes('`mode: branch`'), 'fx-review tells each lens its mode');

console.log('lens-content.test.js: OK');
