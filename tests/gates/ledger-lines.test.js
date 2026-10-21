'use strict';
// Run: node tests/gates/ledger-lines.test.js
// ADR 0040: every task ledgers its dispatch and its cost; the controller caps
// outstanding reviews and re-dispatches.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const impl = fs.readFileSync(path.join(root, 'skills', 'fx-implement', 'SKILL.md'), 'utf8').replace(/\s+/g, ' ');

assert.ok(impl.includes('`Task <NN>: dispatched <BASE7> <ISO-8601>`'), 'the dispatch line is defined');
assert.ok(impl.includes('`Task <NN>: cost <tokens> tokens, <minutes> min, <dispatches> dispatches, fx-tdd <k>/<i>`'), 'the cost line is defined');
assert.ok(impl.includes('`Task <NN>: parked: <one-line reason>`'), 'the parked line is defined');
assert.ok(impl.includes('../../scripts/build-cost'), 'the cost step names the script by its path from the skill');
assert.ok(impl.includes('fx-tdd 0/'), 'a task whose implementer skipped fx-tdd is flagged to the reviewer');
assert.ok(impl.includes('git log <BASE>..HEAD'), 'resume checks the task commits before re-dispatching');
assert.ok(impl.includes('At most one task review is outstanding'), 'outstanding reviews are capped');
assert.ok(impl.includes('at most twice'), 'NEEDS_CONTEXT and BLOCKED re-dispatch is capped');
const sec = (from, to) => impl.slice(impl.indexOf(from), impl.indexOf(to));
const s3 = sec('### 3. Review the task', '### 4. The fix loop');
const s5 = sec('### 5. Complete the task', '## Commits');
assert.ok(s3.includes('build-cost --task'), 'section 3 runs the cost step');
assert.ok(s3.includes('before you dispatch the task reviewer'), 'section 3 orders the cost step before the reviewer dispatch');
assert.ok(s3.indexOf('fx-tdd 0/') > s3.indexOf('build-cost --task'), 'section 3 passes the fx-tdd line only after it exists');
assert.ok(s5.includes('build-cost --task') && s5.includes('`Task <NN>: cost'), 'section 5 runs the cost step again and ledgers the line');
assert.ok(fs.existsSync(path.join(root, 'docs', 'adr', '0040-every-task-ledgers-its-dispatch-and-cost.md')), 'ADR 0040 exists');

// Coverage-audit G1: the cost line must reach the task reviewer.
const rev = fs.readFileSync(path.join(root, 'skills', 'fx-implement', 'task-reviewer-prompt.md'), 'utf8').replace(/\s+/g, ' ');
assert.ok(rev.includes('[COST_LINE]'), 'the reviewer template has a slot for the cost line');
assert.ok(rev.includes('When the controller cost line reads `fx-tdd 0/<i>`, a report with no captured RED run is an Important finding.'),
  'the reviewer template states what fx-tdd 0/<i> means');
assert.ok(s3.includes('[COST_LINE]'), 'section 3 passes the cost line into the reviewer dispatch');
// Coverage-audit G2: resume and the re-dispatch cap meet.
assert.ok(impl.includes('A task with a `Task <NN>: parked:` line is never re-dispatched, and the tasks it blocks are skipped and named in the completion report.'),
  'resume never re-dispatches a parked task');
assert.ok(impl.includes('Each re-dispatch appends its own `dispatched` line, so the count is the number of those lines.'),
  'the re-dispatch count is the number of dispatched lines');

console.log('ledger-lines: OK');
