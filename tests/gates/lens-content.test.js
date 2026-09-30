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

const a11y = read('agents/fx-lens-a11y.md');
assert.ok(a11y.includes('A state change signalled only by animation'), 'a11y: animation is never the only signal');
assert.ok(a11y.includes('| Mirror in RTL | Never mirror |'), 'a11y: the RTL icon table exists');

const polish = read('references/stacks/web-polish.md');
for (const phrase of ['scale(0.97)', 'Never `ease-in`', 'under 300 ms', 'transition: all',
  '(hover: hover) and (pointer: fine)', 'outer radius = inner radius + padding', 'transition: none !important']) {
  assert.ok(polish.includes(phrase), `web-polish: ${phrase}`);
}
assert.ok(polish.includes('heuristics'), 'web-polish says its rules are heuristics');

const design = read('skills/fx-design/SKILL.md');
const s5 = design.slice(design.indexOf('## 5. Structure, motion, background'), design.indexOf('## 6. Restraint'));
const s7 = design.slice(design.indexOf('## 7. The quality floor'), design.indexOf('## 8. Writing is design content'));
assert.ok(s5.includes('references/stacks/web-polish.md'), 'fx-design §5 loads web-polish for motion');
assert.ok(s7.includes('references/stacks/web-polish.md'), 'fx-design §7 loads web-polish');
assert.ok(design.includes('a layered shadow that separates one surface from another is not this tell'),
  'the card-kit tell is narrowed');

const adr12 = read('docs/adr/0012-what-fx-deliberately-does-not-cover.md');
assert.ok(adr12.includes('Superseded in part by ADR-0034'), 'ADR-0012 motion paragraph is marked');
assert.ok(adr12.includes('**No SEO or marketing audit.**') && adr12.includes('**No paid web search backend.**'),
  'ADR-0012 records the new no\'s');
assert.ok(fs.existsSync(path.join(root, 'docs/adr/0034-external-review-security-and-design-content-absorbed.md')),
  'ADR-0034 exists');

console.log('lens-content.test.js: OK');
