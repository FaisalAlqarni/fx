'use strict';
// The per-task lens rule lives in one table. This pins its shape so the rule
// cannot drift back to "every triggered lens on every task".
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const review = read('skills/fx-review/SKILL.md');
const lines = review.split('\n');
const header = lines.find((l) => l.startsWith('| Lens |'));
assert.ok(header, 'the lens table header is present');
assert.ok(header.includes('| Per task (tripwire) |'), `the header has a per-task column: ${header}`);

function cells(lens) {
  const line = lines.find((l) => l.startsWith(`| \`${lens}\``));
  assert.ok(line, `a row for ${lens}`);
  return line.split('|').map((c) => c.trim()).filter(Boolean);
}
for (const lens of ['fx-lens-security', 'fx-lens-database', 'fx-lens-silent-failure']) {
  assert.ok(cells(lens)[1].startsWith('tripwire:'), `${lens} fires per task only on its tripwire`);
}
for (const lens of ['fx-lens-a11y', 'fx-lens-pipeline']) {
  assert.strictEqual(cells(lens)[1], 'no', `${lens} never fires per task`);
}
assert.ok(!review.includes('auth, payment, or a migration'), 'the old task-mode blurb is gone');

const impl = read('skills/fx-implement/SKILL.md');
const start = impl.indexOf('**Lens dispatch.**');
const end = impl.indexOf('The reviewer gets three paths');
assert.ok(start >= 0 && end > start, 'the lens dispatch span is intact');
const span = impl.slice(start, end);
assert.ok(span.includes('tripwire'), 'lens dispatch uses the tripwire column');
assert.ok(span.includes("grep -n '^Tripwires:'"), 'lens dispatch reads the report Tripwires line, not the diff');
assert.ok(span.includes('`mode: task`'), 'lens dispatch sends mode: task');
assert.ok(read('skills/fx-implement/implementer-prompt.md').includes('A line `Tripwires:`'), 'the implementer report carries a Tripwires line');
assert.ok(read('skills/fx-implement/task-reviewer-prompt.md').includes('`Tripwires:` line'), 'the task reviewer checks the Tripwires line');
assert.ok(!span.includes('-a11y'), 'lens dispatch no longer sends a11y per task');

console.log('tripwire-table.test.js: OK');
