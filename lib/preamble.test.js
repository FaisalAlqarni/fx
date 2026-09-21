'use strict';
// Run: node lib/preamble.test.js
//
// Task-supplied test (docs/plans/2026-09-21-multi-harness/tasks/01-render-the-preamble.md),
// with one fix: the original had `cx` referenced (line ~100) before its
// `const cx = render(...)` declaration (line ~103), which throws
// "Cannot access 'cx' before initialization" (TDZ) the moment it runs. Fixed
// by moving the codex assertions to after `cx` is defined, grouped with the
// rest of the codex checks. No assertion content changed.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { render, HARNESSES } = require('./preamble');

assert.deepStrictEqual(HARNESSES, ['claude-code', 'opencode', 'codex']);

const cc = render({ harness: 'claude-code' });
assert.ok(cc.includes('fx:fx-tdd'), 'claude-code must address lanes as fx:fx-tdd');

const oc = render({ harness: 'opencode' });
assert.ok(oc.includes('fx-tdd'), 'opencode must name the lane');
assert.ok(!oc.includes('fx:fx-tdd'), 'opencode must NOT carry the plugin prefix');

// The resolution clause is the sentence that has been backwards all along.
// Assert on the clause, not on a substring it never contained.
assert.ok(!/a plugin skill resolves as/i.test(oc),
  'opencode must not be told that a plugin prefix is required');
assert.ok(/will not resolve|no plugin prefix/i.test(oc),
  'opencode must be told which form fails');

const cx = render({ harness: 'codex' });
assert.ok(/leading .\$|addressed with a leading/i.test(cx),
  'codex must be told lanes carry a leading $');
assert.ok(cx.includes('$fx-tdd'), 'codex must address lanes as $fx-tdd');
assert.ok(!cx.includes('fx:fx-tdd'), 'codex must NOT carry the plugin prefix');

for (const harness of HARNESSES) {
  const text = render({ harness });
  assert.ok(!text.includes('{{'), `${harness}: unrendered placeholder survived`);
  assert.ok(text.length > 500, `${harness}: preamble looks truncated`);
}

// The imperative must still lead. ADR 0002.
const source = fs.readFileSync(path.join(__dirname, '..', 'PREAMBLE.md'), 'utf8');
const firstHeading = (s) => (s.match(/^## .*$/m) || [''])[0];
assert.strictEqual(
  firstHeading(render({ harness: 'claude-code' })),
  firstHeading(source),
  'the first section must not move'
);

assert.throws(() => render({ harness: 'nope' }), /unknown harness/i);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-preamble-'));
fs.writeFileSync(path.join(dir, 'repo.md'), '# repo\n');
assert.ok(
  render({ harness: 'codex', cwd: dir }).includes('repo.md'),
  'a repo.md in cwd must be announced'
);
fs.rmSync(dir, { recursive: true, force: true });

console.log('preamble.test.js: OK');
