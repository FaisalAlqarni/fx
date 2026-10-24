// Run: node tests/gates/no-stories-in-loaded-lanes.test.js
// ADR 0041: the lane files every build loads carry rules; incident stories
// live in the lane's COVERAGE.md, which no session loads.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
const loaded = {
  'skills/fx-implement/SKILL.md': 'skills/fx-implement/COVERAGE.md',
  'skills/fx-implement/implementer-prompt.md': 'skills/fx-implement/COVERAGE.md',
  'skills/fx-implement/task-reviewer-prompt.md': 'skills/fx-implement/COVERAGE.md',
  'skills/fx-implement/re-review-prompt.md': 'skills/fx-implement/COVERAGE.md',
  'skills/fx-plan/SKILL.md': 'skills/fx-plan/COVERAGE.md',
  'skills/fx-tdd/SKILL.md': 'skills/fx-tdd/COVERAGE.md',
};
for (const [file, coverage] of Object.entries(loaded)) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const hits = text.split('\n').map((l, i): [number, string] => [i + 1, l]).filter(([, l]) => /\bMeasured\b/.test(l));
  assert.deepStrictEqual(hits, [], `${file} still carries a story: line ${hits.map(([n]) => n).join(', ')}`);
  assert.ok(fs.readFileSync(path.join(root, coverage), 'utf8').includes('## Incident record'), `${coverage} has an Incident record section`);
}
assert.ok(fs.existsSync(path.join(root, 'docs', 'adr', '0041-rules-load-stories-do-not.md')), 'ADR 0041 exists');

console.log('no-stories-in-loaded-lanes: OK');
