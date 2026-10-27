// Run: node tests/gates/docs-lanes.test.js
// Rules of the docs and ADR lanes that the final review of the docs-and-adr build
// found in no gate (findings/final-review.md I2, I4 to I8, I1's record step, and the
// unprimed review's 5 and 6). Each assertion names the rule it keeps.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
const raw = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const read = (p: string) => raw(p).replace(/\s+/g, ' ');
const has = (file: string, text: string, rule: string) => assert.ok(read(file).includes(text), `${file}: ${rule}`);
// The text of one Markdown section, from its heading to the next heading of any level.
const section = (file: string, heading: string): string => {
  const text = raw(file);
  const at = text.indexOf(`${heading}\n`);
  assert.ok(at >= 0, `${file}: has ${heading}`);
  const rest = text.slice(at + heading.length + 1);
  const end = rest.search(/^#{1,6} /m);
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, ' ');
};

const docs = 'skills/fx-docs/SKILL.md';
const finalReview = 'skills/fx-implement/references/final-review.md';
const completion = 'skills/fx-implement/references/completion.md';

// G1: the bug reports fx-debug writes are read back.
for (const f of ['commands/fx-retro.md', 'skills/fx-retro/SKILL.md']) {
  assert.ok(section(f, '## Read').includes('`docs/issues/`'), `${f}: the retro reads the bug reports in docs/issues/`);
}
assert.ok(section('skills/fx-debug/SKILL.md', '### Inputs that shape the loop').includes('`docs/issues/`'),
  'fx-debug reads past bug reports in docs/issues/');

// G3: the index's ADR folders are stated where the ADR folder is chosen.
has('skills/fx-adr/SKILL.md', 'The docs index reads an ADR only under a folder named `adr` or `decisions`',
  'fx-adr says which ADR folders the docs index recognises');

// G4: a wrong claim reaches the owner when the docs step did not run.
has(completion, 'When the docs step did not run, list every `Docs claim wrong:` ledger line',
  'the completion Docs bullet lists Docs claim wrong lines when the step did not run');

// G5: the first full run is offered once; the skip wording matches the pre-flight ruling.
has(finalReview, 'Docs: not run: no evidence-bearing docs', 'the ledger skip wording names evidence-bearing docs');
assert.ok(!read(finalReview).includes('Docs: not run: no docs/'), `${finalReview}: the old "no docs/" wording is gone`);
has(finalReview, '"docs_first_run": "declined"', 'a declined first run is recorded in .fx.json');
has(docs, "says yes to fx-implement's first-run offer", 'fx-docs names the first-run offer as a full-run trigger');

// E2E bug 1: the docs offer is never skipped on a guess that the owner is away.
assert.ok(!/owner away/i.test(read(finalReview)), `${finalReview}: no "owner away" skip`);
has(finalReview, 'Docs: offer pending', 'an offer the controller cannot put now is ledgered as pending');
has(finalReview, 'Never ledger `Docs: not run` without the owner\'s answer or the declined key', 'not run needs an answer or the declined key');
has(completion, 'Run `fx-docs` on the branch', 'a pending docs offer is a completion menu option');
// The ADR offer is a required section, visible even when empty.
has(completion, '**ADR candidates**', 'the completion report has an ADR candidates section');
has(completion, 'ADR candidates: none', 'zero candidates are stated, not omitted');
has(completion, 'Write ADRs for the candidates with `fx-adr`', 'the ADR offer is a completion menu option');

// E2E bug 8: every interview question carries a recommended answer, and the owner can take them all.
has('skills/fx-docs/full-run.md', 'Every question carries a recommended answer', 'full-run interview questions carry a recommended answer');
has('skills/fx-docs/full-run.md', 'or take the recommended answer for every question', 'the interview offer includes taking every recommended answer');
has(docs, 'each with a recommended answer', 'branch-mode questions carry a recommended answer');

// G6: branch mode finds stale docs outside the touched set and counts stale HTML pages.
has(docs, 'docs-index --root <worktree> stale', 'branch mode step 3 runs the stale check');
has(docs, 'every `recheck` claim in a doc outside the step 2 set', 'step 3 lists recheck claims outside the touched docs');
for (const f of [docs, finalReview]) has(f, '<n> listed stale, <n> HTML pages out of date', 'the Docs line counts out-of-date HTML pages');

// I1 (G2): fx-docs records an ADR's verified commit with the command, never in the ADR.
has(docs, 'docs-index --root <repo> verify <adr path>', 'fx-docs records a verified ADR with docs-index verify');

// Unprimed 5: a renamed file's old path is queried too.
for (const f of [docs, finalReview]) {
  has(f, 'git diff --no-renames <merge-base>...HEAD --name-only', 'the changed-path list keeps both sides of a rename');
  assert.ok(!read(f).includes('git diff <merge-base>...HEAD --name-only'), `${f}: no changed-path list with rename detection`);
}

// Unprimed 6: a plain "update the docs" in an evidence-free repo is scoped to the change.
has(docs, 'annotate only the docs this change touches', 'update the docs without evidence lines stays scoped');

// S5 on the first real supersession: 0015's status and 0061's Supersedes line quote the same
// replaced clause, the clause is in 0015's body, and 0061 keeps no copy of it as a decision.
{
  const old = raw('docs/adr/0015-artifacts-live-in-the-repository.md');
  const neu = raw('docs/adr/0061-the-visual-kit-replaces-the-tailwind-and-mermaid-reports.md');
  const replaced = /^Status: Superseded by 0061 \(replaced: "(.+)"; the rest carried forward\)\.$/m.exec(old)?.[1];
  const supersedes = /^Supersedes: 0015 \(decision: "(.+)"\)$/m.exec(neu)?.[1];
  assert.ok(replaced && replaced === supersedes, `0015 and 0061 quote one replaced clause: ${replaced} | ${supersedes}`);
  assert.ok(old.replace(/\s+/g, ' ').includes(replaced), '0015 holds the quoted clause');
  const decisions = neu.slice(neu.indexOf('## Decision'));
  assert.ok(!decisions.replace(/\s+/g, ' ').includes(replaced), '0061 keeps no live copy of the replaced clause');
}

// Carried minor: ADR 0060 decision 3 names fx-setup's migration step as the other place .scratch/ appears.
has('docs/adr/0060-templates-live-in-one-folder-and-scratch-is-retired.md', "and in fx-setup's one-time migration step",
  "decision 3 names fx-setup's migration step");

// Carried minor: the branch pass has its own heading, after the docs step.
assert.ok(/^## Branch pass$/m.test(raw(finalReview)), `${finalReview}: the branch pass sits under its own heading`);

console.log('docs-lanes: OK');
