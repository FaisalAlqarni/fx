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
has(docs, 'The full run is `/fx:fx-system-flow`, which the owner types; a lane cannot invoke it (ADR 0055).', 'fx-docs names the user-invoked full run and never runs it');
has(finalReview, '/fx:fx-system-flow', 'the first-run offer names the user-invoked full run');

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
has('skills/fx-system-flow/interview.md', 'Every question carries a recommended answer', 'full-run interview questions carry a recommended answer');
has('skills/fx-system-flow/interview.md', 'or take the recommended answer for every question', 'the interview offer includes taking every recommended answer');
has(docs, 'each with a recommended answer', 'branch-mode questions carry a recommended answer');

// G6: branch mode finds stale docs outside the touched set and counts stale HTML pages.
has(docs, 'docs-index --root <worktree> stale', 'branch mode step 3 runs the stale check');
has(docs, 'every `recheck` claim in a doc outside the step 2 set', 'step 3 lists recheck claims outside the touched docs');
for (const f of [docs, finalReview]) has(f, '<n> listed stale, <n> HTML pages out of date', 'the Docs line counts out-of-date HTML pages');

// Task 19: in a repo with a system model, fx-docs updates the model first, then the hand-written Markdown.
has(docs, 'system-flow --root <worktree> query --diff <merge-base>', 'the model path starts from the branch diff');
for (const t of ['build --only', '--archify', 'added', '/fx:fx-system-flow',
  'Docs: <n> model items updated, <n> listed stale, <n> uncovered, <n> inventory added, <n> diagrams rebuilt']) has(docs, t, `the model path names ${t}`);
has(docs, 'In a repo with a system model, the model path runs first and the Markdown path runs after it', 'the two paths run in order');
has(docs, 'The Markdown path skips every file that carries `<!-- fx-system-flow generated`', 'the Markdown path skips generated files, keyed on the marker alone');
has(docs, 'For each new engine, job or integration among the added paths, add an inventory entry', 'new engines, jobs and integrations get inventory entries');
has(docs, 'Write a new doc only in a repo without a system model; with one, the inventory entry from the model path is the one record', 'a model repo gets no second, hand-written record of a new engine');
assert.ok(!read(docs).includes('full-run.md'), `${docs}: no link to the removed full-run.md`);
assert.ok(!fs.existsSync(path.join(root, 'skills/fx-docs/full-run.md')), 'full-run.md is gone');
has(docs, '(./html-pages.md)', 'fx-docs still links html-pages.md');
has(docs, 'only in a repo without a system model', 'the HTML pages stay for a repo without a model');
has('skills/fx-docs/html-pages.md', 'only in a repo without a system model', 'html-pages.md says when it applies');
has(finalReview, 'Docs: <n> model items updated', 'the branch offer ledger follows the model-path line');
{
  const adr62 = raw('docs/adr/0062-fx-docs-keeps-docs-on-evidence-lines-and-the-docs-step-is-offered.md');
  assert.ok(/^Status: Superseded by 0066 \(replaced: decisions 2, 4; the rest carried forward\)/m.test(adr62), '0062 reads as superseded by 0066');
  const adr66 = raw('docs/adr/0066-a-system-model-is-the-record-for-the-system-flow-site.md');
  assert.ok(/^Supersedes: 0062/m.test(adr66), '0066 supersedes 0062');
  assert.ok(adr66.includes('`<docs_dir>/system/`'), '0066 records the Markdown location rule');
  assert.ok(raw('docs/adr/index.md').includes('](0066-a-system-model-is-the-record-for-the-system-flow-site.md)'), 'the index links 0066');
}

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

// Task 10 (system-flow site): the lane tells each writer what prose floor it must meet.
{
  const sf = 'skills/fx-system-flow';
  const all = (file: string, texts: string[]) => { for (const t of texts) has(`${sf}/${file}`, t, `holds ${t}`); };
  all('planning.md', ['start-what', 'start-parts', 'start-request', 'start-code', '"schemaVersion": 2', 'the main request',
    'one writer per chapter', '"name"', '"intro"', '120 to 200 words', 'at least 100 words']);
  all('area-brief.md', ['## Prose', '2 to 4 sentences', '4 to 8 bullets', 'at most 40 words', '120 to 200 words', 'at least 100 words',
    'one sentence of 6 to 30 words', '`look`', '`short`', '`reply`', '`codeMap`', 'Prose: <chapter ids written>', 'Glossary candidates', 'no "who uses it"']);
  all('fragment-guide.md', ['`look`', '`service`', '`store`', '`client`', '`external`', '`security`', '`term:<id>`', '`code:<id>`',
    'chapters.json declares every section', 'a scalar set in two fragments is an error']);
  all('check-and-report.md', ['Prose', 'words per chapter', 'glossary', 'lifelines', 'at most 2 rounds',
    'merge the chapter into a neighbour, or drop it', 'There is no flag that waives the floor',
    'a chapter with the 120 to 200 words warning goes back to its writer once', 'ask each area for more glossary candidates, one round']);
  all('interview.md', ['at least 100 words', 'goes back to its writer']);
  all('SKILL.md', ['system-flow migrate', 'Bring the prose up to date', 'glossary.json', 'only on a clean working tree', 'git restore -- <site>/model/fragments']);
  for (const f of ['area-brief.md', 'planning.md']) all(f, ['fx-humanize', 'before returning']);
  // C9: the sentences that carry the single words above, so a stray mention cannot satisfy the gate.
  all('planning.md', ['The agent that writes chapter prose, leads, bullets, captions, glossary definitions and code-map lines invokes `fx-humanize` on it before returning.',
    'The controller does the same for the Start here prose and the glossary it writes.']);
  all('area-brief.md', ['invoke it on the chapter prose, leads, bullets, captions, glossary candidates and code-map lines before returning.',
    'Every node and participant carries `look`; every message carries `label`',
    '`short` (the code-ish name on the arrow), and `reply` set to `true` on a reply.',
    'one `codeMap` entry for each folder of your area that a newcomer opens first: `root`, `path` (a folder ending in `/`), `owns` (one sentence) and evidence']);
  all('fragment-guide.md', ['`look` is required on every node and participant.',
    '| `service` | code of this system: a service, job, worker, controller |', '| `store` | a database, cache, queue or file store |',
    '| `client` | a browser, phone app or other caller of the system |', '| `external` | a system outside this one |',
    '| `security` | an identity or access check |']);
  all('check-and-report.md', ['words per chapter (id, words, lead sentences, bullets), the average words per chapter, the glossary size and the lifelines drawn inline.',
    '**Prose:** a block beside Depth, from `BuildResult.prose`']);
  has(docs, 'every node or participant it adds carries `look`', 'fx-docs sets look on what it adds');
  has(docs, 'Bring the prose up to date', 'fx-docs points a prose floor failure to the rerun choice');
  has(docs, 'system-flow migrate', 'fx-docs names the migrate hint it stops on');

  // Proof run (a): three of four area agents skipped fx-humanize. The return names what was humanized, and the controller
  // checks that line for every area and humanizes the prose itself where it is missing, before the draft build.
  all('area-brief.md', ['`Humanized: <chapter ids, captions, glossary candidates, code-map lines>`',
    'A return without this line is incomplete: the controller runs `fx-humanize` on your prose itself.']);
  all('check-and-report.md', ['## Humanized prose', 'Before the draft build, read the `Humanized:` line of every area\'s return.',
    'Where the line is missing, or leaves out a chapter its `Prose:` line names, invoke `fx-humanize` yourself on that area\'s leads, bullets, captions, glossary candidates and code-map lines',
    'Invoke it yourself on the Start here prose, the glossary and `meta.intro`', '`Humanized: <area id> by <area agent | controller>`']);
  all('SKILL.md', ['When an area returns, read its `Humanized:` line as check-and-report.md "Humanized prose" says']);

  // Proof run (b): the rules writer read 66 ADRs through clipped shell dumps (awk substr, cut -c) and got 4 of 25 decisions wrong.
  all('SKILL.md', ['Read each ADR whole with the Read tool, one ADR per call; never through `head`, `cut`, `awk` or one listing of many ADRs, whose output is capped and clipped.',
    'A subagent that writes the rules gets this rule in its brief and returns `ADRs read whole: <n> of <n>`.',
    '`check` fails a rule whose `decision` is a number the ADR has no numbered item for under its Decision heading, or a phrase where the ADR numbers its decisions.']);

  // The quoted sentence of task 03's table, never reworded.
  has(`${sf}/check-and-report.md`, 'section <id>: <n> words of lead, bullets and not owned; at least 100 required', 'the floor message is quoted');

  const adr66 = 'docs/adr/0066-a-system-model-is-the-record-for-the-system-flow-site.md';
  for (const t of ['site template', 'Start here', 'schema version 2', 'lifelines']) has(adr66, t, `ADR 0066 holds ${t}`);
  // Still in force continues the Decision numbering with no gap.
  const adr = raw(adr66);
  const nums = (body: string) => [...body.matchAll(/^(\d+)\. /gm)].map(m => Number(m[1]));
  const decision = nums(adr.slice(adr.indexOf('## Decision'), adr.indexOf('## Still in force')));
  const kept = nums(adr.slice(adr.indexOf('## Still in force'), adr.indexOf('## Consequences')));
  const wanted = (n: number, from: number) => Array.from({ length: n }, (_, i) => from + i);
  assert.deepStrictEqual(decision, wanted(decision.length, 1), 'ADR 0066 Decision is numbered from 1 with no gap');
  assert.deepStrictEqual(kept, wanted(kept.length, decision.length + 1), 'ADR 0066 Still in force continues the numbering with no gap');
  assert.ok(kept.length === 5, 'ADR 0066 still carries the five decisions of 0062');

  // No U+2013 or U+2014 in the lane files, fx-docs or the ADR.
  for (const f of ['SKILL.md', 'planning.md', 'area-brief.md', 'fragment-guide.md', 'check-and-report.md', 'interview.md'].map(n => `${sf}/${n}`).concat([docs, adr66])) {
    assert.ok(!/[\u2013\u2014]/.test(raw(f)), `${f}: no en or em dash`);
  }
}

console.log('docs-lanes: OK');
