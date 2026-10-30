// Run: node tests/gates/check-all-coverage.test.js
//
// A gate test that scripts/check-all never runs is a test nobody runs.
// docs-lanes.test.js sat outside check-all from the day it was written, so a
// wording change broke it and every "ALL GREEN" after that was silent about it
// (found 2026-10-30). This gate fails when a test file under tests/gates/ is
// not named in scripts/check-all.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..', '..');
const checkAll = fs.readFileSync(path.join(root, 'scripts', 'check-all'), 'utf8');
const gates = fs.readdirSync(path.join(root, 'tests', 'gates'))
  .filter((f) => /\.test\.js$|\.test\.sh$|\.sh$/.test(f));

const missing = gates.filter((f) => !checkAll.includes(`tests/gates/${f}`));
assert.deepStrictEqual(missing, [], `scripts/check-all does not run: ${missing.join(', ')}`);

console.log(`check-all-coverage: OK (${gates.length} gate files)`);
