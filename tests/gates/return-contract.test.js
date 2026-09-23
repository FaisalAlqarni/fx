'use strict';
// Run: node tests/gates/return-contract.test.js
// Every subagent that reports to the fx-implement controller ends with the
// same short reply, carrying what the fix loop branches on, so the controller
// grows by a few lines per dispatch and not by a report.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const MARK = 'Reply with at most five lines:';

function contract(file, fields, from = 0) {
  const text = read(file);
  const at = text.indexOf(MARK, from);
  assert.ok(at >= 0, `${file}: states the five-line reply`);
  const tail = text.slice(at, at + 1200);
  for (const f of fields) assert.ok(tail.includes(f), `${file}: five-line reply names ${f}`);
  return text;
}
const REVIEWER = ['Spec', 'Quality', 'C/I/M', 'Findings', 'Ready'];
contract('skills/fx-implement/implementer-prompt.md', ['Status', 'Commits', 'Tests', 'Report', 'Concerns']);
contract('skills/fx-implement/task-reviewer-prompt.md', REVIEWER);
contract('skills/fx-review/reviewer-prompt.md', REVIEWER);
const rr = contract('skills/fx-implement/re-review-prompt.md', ['Verdict', 'Open', 'Fixed', 'Findings', 'New breakage']);
const review = read('skills/fx-review/SKILL.md');
contract('skills/fx-review/SKILL.md', ['Lens', 'C/I/M', 'Findings', 'Scope', 'Blocked'], review.indexOf('Lens briefs'));
const skill = read('skills/fx-implement/SKILL.md');
contract('skills/fx-implement/SKILL.md', ['Gaps', 'Findings', 'Tasks affected', 'Verdict', 'Next'], skill.indexOf('one coverage audit'));

assert.ok(!/under 15 lines/.test(read('skills/fx-implement/implementer-prompt.md')), 'implementer: the old 15-line contract is gone');
assert.ok(!/final message \*\*is\*\* the report/i.test(rr), 're-review: the final message is no longer the report');
assert.ok(/\[FINDINGS_FILE\]/.test(rr), 're-review: writes to its findings file');
for (const f of ['skills/fx-implement/task-reviewer-prompt.md', 'skills/fx-review/reviewer-prompt.md', 'skills/fx-implement/re-review-prompt.md']) {
  assert.ok(read(f).includes('## Ledger lines'), `${f}: writes ready-to-copy ledger lines`);
}
const loop = read('skills/fx-implement/fix-loop.md');
assert.ok(!/open findings\s+verbatim/i.test(loop), 'fix loop: findings go as a path, not pasted verbatim');
assert.ok(loop.includes('## Ledger lines'), 'fix loop: ledgers one-liners from the findings file');

const i = skill.indexOf('### Controller reading rules');
assert.ok(i >= 0, 'fx-implement has a Controller reading rules section');
assert.ok(i < skill.indexOf('### 1. Dispatch the implementer'), 'the rules come before the first dispatch step');
const rules = skill.slice(i, i + 3000);
for (const needle of ['>>', 'tail', 'git log --oneline', 'review-package', 'five lines', 'report contract breached']) {
  assert.ok(rules.includes(needle), `reading rules mention ${needle}`);
}
console.log('return-contract: ok');
