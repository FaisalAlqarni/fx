// Checks absorbed from akkie76/code-review-skills into existing prompts.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
// Prompt text wraps at any word, so compare with whitespace collapsed.
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\s+/g, ' ');

const task = read('skills/fx-implement/task-reviewer-prompt.md');
assert.ok(task.includes('**Callers and variants.**'), 'task reviewer sweeps callers and variants');
assert.ok(task.includes('every variant the shared code touches'), 'variants are named');
assert.ok(task.includes('must agree on precedence, validation and error mapping'), 'parallel paths must agree');
assert.ok(task.includes('re-read every fact it cites at its source'), 'cited facts are re-read');
assert.ok(task.includes('copied from the implementation'), 'test-constant drift is asked about');

const da = read('agents/fx-devils-advocate.md');
const code = da.slice(da.indexOf('## Code mode'), da.indexOf('## Output'));
assert.ok(code.includes('**Unchanged callers and variants**'), 'devil\'s advocate hunts caller breaks');

const branch = read('skills/fx-review/reviewer-prompt.md');
assert.ok(branch.includes('Docs, runbooks or examples the diff has made stale?'), 'branch review checks doc drift');

for (const f of ['skills/fx-implement/task-reviewer-prompt.md', 'skills/fx-review/reviewer-prompt.md']) {
  assert.ok(read(f).includes("Read the brief's Review focus section with its Global constraints"), `${f} points at Review focus`);
}

// Final review I5, gap 1: both reviewers read the brief or plan as a vision.
assert.ok(task.includes('Read the brief as a vision, not a checklist.'), 'the task reviewer reads the brief as a vision, not a checklist');
assert.ok(read('skills/fx-review/reviewer-prompt.md').includes('Read the plan or spec as a vision, not a checklist.'), 'the branch reviewer reads the plan as a vision, not a checklist');

console.log('review-content.test.js: OK');
