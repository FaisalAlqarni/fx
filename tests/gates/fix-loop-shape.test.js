'use strict';
// Pins the lean-review fix loop and the one-full-run rule.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
// Prose wraps at any word, so compare with whitespace collapsed.
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');
const impl = read('skills/fx-implement/SKILL.md');
const loop = read('skills/fx-implement/fix-loop.md');

assert.ok(!impl.includes('once here for the baseline'), 'the baseline test_all run is gone');
assert.ok(impl.includes('`test_all` runs once in a run, at the exit gate.'), 'test_all runs once');
assert.ok(!impl.includes('Run the baseline suite **before task 01**'), 'no baseline paragraph');
assert.ok(impl.includes('ran test_all (rule)'), 'a per-task test_all run is ledgered');
assert.ok(read('skills/fx-implement/implementer-prompt.md').includes('naming the command it ran'), 'the Tests field names the command');
assert.ok(impl.includes('**Never read a diff yourself**, except'), 'the reading rule names its one exception');
assert.ok(!impl.includes('| "The fix was small, skip the re-review" | Unreviewed fixes'), 'the old rationalization row is replaced');

assert.ok(loop.includes('**Small fixes: controller re-review.**'), 'the controller re-review rule exists');
assert.ok(loop.includes('20 production lines or fewer'), 'the cap counts production lines');
assert.ok(loop.includes('git diff --numstat'), 'the count is a command, not a guess');
assert.ok(loop.includes("':(glob,exclude)**/spec/**'"), 'test paths are excluded at any depth');
assert.ok(loop.includes('binary file'), 'a binary file counts as over the cap');
assert.ok(loop.includes('### New breakage in the fix diff'), 'the controller checks for new breakage and writes it down');
assert.ok(loop.includes('controller re-review (<L> lines)'), 'the ledger line shape is given');
assert.ok(loop.includes('Never fix findings yourself in the controller session.'), 'the controller still never fixes');
assert.ok(loop.includes('when all five hold'), 'the controller re-review has five conditions');
assert.ok(!loop.includes("':(glob,exclude)**/*.md'"), 'Markdown is not excluded from the production count');
for (const x of ["':(glob,exclude)docs/**'", "':(glob,exclude)README*'", "':(glob,exclude)CHANGELOG*'"]) {
  assert.ok(loop.includes(x), `the count excludes ${x}`);
}
assert.ok(loop.includes('does not edit or delete an existing test assertion'), 'a weakened test always gets a dispatched re-review');
assert.ok(impl.includes('**A `test_all` that stops at its first failure**'), 'the exit gate handles a fail-fast runner');
assert.ok(impl.includes('Order-dependent blocks the completion claim like introduced'), 'order-dependent failures block');
assert.ok(!impl.includes('the baseline is 0 tests'), 'no vestigial baseline wording');
assert.ok(impl.includes('then a `## Log` heading'), 'a created ledger gets a Log heading after the rulings');
assert.ok(impl.includes('or you reading the fix diff when it qualifies as small'), 'SKILL.md points at the rule');

const gateAt = impl.indexOf('### Classify every failing test');
assert.ok(gateAt > 0, 'the exit gate classifies failures');
assert.ok(gateAt > impl.indexOf("### Run what the repository's own gate runs"), 'classification follows the CI step');
assert.ok(gateAt < impl.indexOf('## Write the plan-complete line'), 'classification precedes the plan-complete line');
const gate = impl.slice(gateAt, gateAt + 1800);
for (const word of ['test_one', 'merge base', 'setup', 'does not exist on the merge base', 'same assertion', 'pre-existing', 'introduced', 'order-dependent']) {
  assert.ok(gate.includes(word), `the classification names ${word}`);
}
assert.ok(impl.includes('serial fixers grouped by file'), 'the end-pass wave may split by file');

console.log('fix-loop-shape.test.js: OK');
