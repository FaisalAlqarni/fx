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
// Ruling R (task 08 fix round 1): lenses are read-only, cannot write a file,
// and keep returning their full findings as their reply, as before task 08.
// So 'plan-mandated' below is required of the two reviewer reply contracts
// only, and the lens contract check that used to sit here is gone.
const REVIEWER = ['Spec', 'Quality', 'C/I/M', 'Findings', 'Ready', 'plan-mandated'];
contract('skills/fx-implement/implementer-prompt.md', ['Status', 'Commits', 'Tests', 'Report', 'Concerns']);
contract('skills/fx-implement/task-reviewer-prompt.md', REVIEWER);
contract('skills/fx-review/reviewer-prompt.md', REVIEWER);
const rr = contract('skills/fx-implement/re-review-prompt.md', ['Verdict', 'Open', 'Fixed', 'Findings', 'New breakage']);
const skill = read('skills/fx-implement/SKILL.md');
contract('skills/fx-implement/SKILL.md', ['Gaps', 'Findings', 'Tasks affected', 'Verdict', 'Next'], skill.indexOf('one coverage audit'));

const reviewSkill = read('skills/fx-review/SKILL.md');
assert.ok(!reviewSkill.includes(MARK), 'Ruling R: lenses no longer carry the five-line contract');
assert.ok(/no Write tool/i.test(reviewSkill), 'Ruling R: fx-review/SKILL.md says lenses have no Write tool');

const lensDispatchAt = skill.indexOf('**Lens dispatch.**');
assert.ok(lensDispatchAt >= 0, 'fx-implement/SKILL.md still has a Lens dispatch paragraph');
assert.ok(skill.slice(lensDispatchAt, lensDispatchAt + 1500).includes('heredoc'), 'Lens dispatch: the controller records a lens reply with a heredoc, without reasoning over it');
assert.ok(skill.includes('confirmed ⚠️:'), "confirming a ⚠️ is ledgered with the finding's exact text, for the fixer and re-reviewer to read");

assert.ok(!/under 15 lines/.test(read('skills/fx-implement/implementer-prompt.md')), 'implementer: the old 15-line contract is gone');
assert.ok(!/final message \*\*is\*\* the report/i.test(rr), 're-review: the final message is no longer the report');
assert.ok(/\[FINDINGS_FILE\]/.test(rr), 're-review: writes to its findings file');
for (const f of ['skills/fx-implement/task-reviewer-prompt.md', 'skills/fx-review/reviewer-prompt.md', 'skills/fx-implement/re-review-prompt.md']) {
  assert.ok(read(f).includes('## Ledger lines'), `${f}: writes ready-to-copy ledger lines`);
}
const loop = read('skills/fx-implement/fix-loop.md');
assert.ok(!/open findings\s+verbatim/i.test(loop), 'fix loop: findings go as a path, not pasted verbatim');
assert.ok(loop.includes('## Ledger lines'), 'fix loop: ledgers one-liners from the findings file');

// Review item 2: the fixer and re-reviewer are pointed at the findings
// file(s) as a whole, with a rule for what counts as open, not at one
// heading that fails to hold spec gaps, confirmed warnings, lens findings,
// or a round-2+ re-review file's own sections.
assert.ok(loop.includes('findings file(s) as a whole'), 'fix loop: points the fixer at the findings file(s) as a whole');
assert.ok(rr.includes('findings file(s) as a whole'), 're-review: points at the findings file(s) as a whole');
assert.ok(rr.includes('Finding verdicts'), "re-review: names the prior re-review file's own section for round 2+");

// Review item 3: re-review ledgers out-of-scope and Minor breakage as
// deferred minors, and New breakage states the highest severity found.
assert.ok(rr.includes('out-of-scope'), 're-review: Ledger lines cover out-of-scope observations');
assert.ok(rr.includes('none | Minor | Important | Critical'), 're-review: New breakage states the highest severity');

const i = skill.indexOf('### Controller reading rules');
assert.ok(i >= 0, 'fx-implement has a Controller reading rules section');
assert.ok(i < skill.indexOf('### 1. Dispatch the implementer'), 'the rules come before the first dispatch step');
const rules = skill.slice(i, i + 3500);
for (const needle of ['>>', 'tail', 'git log --oneline', 'review-package', 'five lines', 'report contract breached', 'BLOCKED', 'Concerns', 'appended line count']) {
  assert.ok(rules.includes(needle), `reading rules mention ${needle}`);
}

// Review item 6: the ledger-copy shape is unambiguous (a plain line, no
// backticks, no bullet, and the `##` heading distinguished from the
// templates' own `###` subheading).
for (const f of ['skills/fx-implement/task-reviewer-prompt.md', 'skills/fx-review/reviewer-prompt.md', 'skills/fx-implement/re-review-prompt.md']) {
  const t = read(f);
  assert.ok(t.includes('no backticks'), `${f}: Ledger lines instructions rule out backticks`);
  assert.ok(t.includes('not three'), `${f}: Ledger lines instructions disambiguate ## from ###`);
}

// Fix round 2, item 1 (findings/08-rereview-1.md, item 6 half-open): the
// re-review's five-line reply carries the ledger count the controller's
// count check needs, instead of a count the reply never states.
assert.ok(rr.includes('ledger `<m>`'), 're-review: the Fixed field carries the ledger-line count the count check needs');
assert.ok(loop.includes("in its `Fixed` field"), 'fix loop: the re-review count check reads the count from the reply, not from a count the reply lacks');
assert.ok(rules.includes("Fixed` field"), 'reading rules: the re-reviewer count check cites the Fixed field, not counts absent from the reply');

// Fix round 2, item 2 (New breakage 1): a lens tags each finding's own
// severity, so its Minor findings are never open, and the false "no
// severity split" claim is gone.
assert.ok(!loop.toLowerCase().includes('no severity split'), 'fix loop: lenses do rate severity, so this false claim is gone');
assert.ok(!rr.toLowerCase().includes('no severity split'), 're-review: lenses do rate severity, so this false claim is gone');
assert.ok(loop.includes('[Critical]') && loop.includes('[Important]'), 'fix loop: routes lens findings by their own Critical/Important tags');
assert.ok(rr.includes('[Critical]') && rr.includes('[Important]'), 're-review: routes lens findings by their own Critical/Important tags');
assert.ok(skill.slice(lensDispatchAt, lensDispatchAt + 2000).includes('[Minor]'), 'Lens dispatch: the controller ledgers a lens\'s own Minor findings itself');

// G1: the plan-complete line is the last write of the build, after the last
// task commit, so nothing else carries state.md into git. The section must
// commit it itself, not just append the line.
{
  const at = skill.indexOf('## Write the plan-complete line');
  assert.ok(at >= 0, 'fx-implement has a Write the plan-complete line section');
  const nextAt = skill.indexOf('## Completion report');
  assert.ok(nextAt > at, 'the plan-complete section comes before the completion report');
  const section = skill.slice(at, nextAt);
  assert.ok(/git commit/.test(section), 'plan-complete section: commits the ledger itself');
  assert.ok(/git add .*state\.md/.test(section), 'plan-complete section: stages state.md before committing');
}

console.log('return-contract: ok');
