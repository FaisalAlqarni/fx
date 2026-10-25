// Run: node tests/gates/lane-rules.test.js
// Rules the final review of the upstream update found present in text with no
// gate holding them (findings/final-review.md I5, gaps 2, 3, 4 and 7). Each
// assertion names the rule it keeps.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');
const has = (file: string, text: string, rule: string) => assert.ok(read(file).includes(text), `${file}: ${rule}`);

// Gap 2: fx-tdd and fx-debug.
const tdd = 'skills/fx-tdd/SKILL.md';
has(tdd, 'Give each proposed seam one line: what it catches, what it misses.', 'each proposed seam names what it catches and misses');
has(tdd, 'never drive RED from a browser or system test', 'no RED from a browser or system test');
has(tdd, 'Name every failure it shows in the report', 'every failure the wider run shows is named');
has(tdd, 'Never `git checkout`, `git restore` or `git stash` for this.', 'a regression undo is done by diff, never by git');
const debug = 'skills/fx-debug/SKILL.md';
has(debug, 'Forced the red by changing code or a fixture? `diff` against a clean copy', 'a forced red is undone and proved by diff');
has(debug, '(`../../references/vocab/verification.md`)', 'verification points at verification.md');
has(debug, 'A missing seam goes to `fx-architecture`, a process or lane gap to `/fx:fx-retro`.', 'the prevention question routes to fx-architecture or fx-retro');

// Gap 3: finishing and parallel builds.
const refs = 'skills/fx-implement/references';
has(`${refs}/finishing.md`, 'Run no `git pull`', 'finishing fetches nothing the owner did not ask for');
has(`${refs}/finishing.md`, 'Never add `--force`', 'finishing never forces a worktree removal');
has(`${refs}/parallel.md`, 'Only the controller writes the ledger.', 'parallel builds keep one ledger writer');
has(`${refs}/parallel.md`, 'Never `git stash`.', 'parallel builds never stash across worktrees');

// Gap 4: the glossary halves.
const dm = 'references/vocab/domain-modeling.md';
has(dm, '## Relationships', 'the map format keeps its Relationships section');
has(dm, 'If unclear,', 'an unclear context is asked about, not guessed');
has(dm, 'Only `/fx:fx-setup` migrates. Any other lane that would write the glossary reads the old name, writes to the old-named file,',
  'a lane other than fx-setup writes the old-named file and runs no migration');

// Gap 7: fx-humanize keeps its working sections.
has('skills/fx-humanize/SKILL.md', '## How to work', 'humanize keeps How to work');
has('skills/fx-humanize/SKILL.md', '## When not to act', 'humanize keeps When not to act');

console.log('lane-rules: OK');
