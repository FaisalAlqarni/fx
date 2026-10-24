// Run: node tests/gates/branch-pass.test.js
// ADR 0044: after per-task review, the branch pass covers what it missed, and
// the most capable tier is always a written decision.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');
const review = read('skills/fx-review/SKILL.md');

assert.ok(review.includes('never fired on any task'), 'lenses that already ran are skipped');
assert.ok(review.includes('outside the tasks where they fired'), 'a lens whose trigger reaches new files still runs');
assert.ok(review.includes('at most four lenses'), 'the lens count is capped');
assert.ok(review.includes('fold into the broad pass'), 'lenses past the cap are not dropped');
assert.ok(review.includes('cross-task seams'), 'the broad pass covers seams between tasks');
assert.ok(review.includes('no ledger'), 'a standalone branch run keeps the full pass');
assert.ok(read('skills/fx-implement/SKILL.md').includes('never fired on any task'), 'fx-implement final review matches');
for (const a of ['fx-lens-security', 'fx-devils-advocate']) {
  assert.ok(/^model:\s*sonnet\s*$/m.test(fs.readFileSync(path.join(root, 'agents', `${a}.md`), 'utf8')), `${a} pins sonnet`);
}
// Each phrase is the call site's own reason line, so deleting one site fails here.
const sites = {
  'skills/fx-plan/SKILL.md': 'Capable because: plan red-team',
  'commands/fx-critique.md': 'Capable because: critique of a design or plan',
  'skills/fx-review/SKILL.md': 'Capable because: standalone branch review',
  'skills/fx-implement/SKILL.md': 'Capable because: final branch review, auth change',
};
for (const [site, line] of Object.entries(sites)) {
  assert.ok(read(site).includes(line), `${site} writes its reason for the top tier`);
}
assert.ok(fs.existsSync(path.join(root, 'docs', 'adr', '0044-the-branch-pass-reviews-what-per-task-review-missed.md')), 'ADR 0044 exists');

// Coverage-audit G5: one sentence states the cap in both lanes, and no rule
// adds agents outside it.
const cap = 'The branch pass is limited, not full: the broad pass, the unprimed devil\'s advocate, and at most four lenses, with `fx-lens-security` on an auth change counted inside the four. Devil\'s advocate always runs; an auth change only moves it to the top tier.';
const implText = read('skills/fx-implement/SKILL.md');
assert.ok(review.includes(cap) && implText.includes(cap), 'both lanes state the branch-pass cap in the same sentence');
assert.ok(!implText.includes('dispatch `fx-lens-security` and `fx-devils-advocate`'), 'no rule dispatches security outside the four lenses');

console.log('branch-pass: OK');
