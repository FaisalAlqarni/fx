'use strict';
// Run: node tests/review-bench/build-case.test.js
//
// Review finding I2: a case's base must carry the good reference of every
// fixture module except the case's own task file(s), so the diff a reviewer
// reads touches only that file. This proves the property two ways: the base
// tree buildBase() produces contains exactly the non-owned files (from
// good/), and the base-plus-case tree still shows the right trap at head.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { MODULE_FILES, ownedFiles, buildBase } = require('./build-case.js');

const FX = path.join(__dirname, '..', '..');
const GOOD_DIR = path.join(__dirname, 'good');
const CASES_DIR = path.join(__dirname, 'cases');
const TRAPS = path.join(FX, 'tests/fixture-build/hidden/traps.test.js');
const SEED = path.join(FX, 'tests/fixture-build/repo');

const ALL_TRUE = { 'path-escape': true, 'missing-note-error': true, 'readme-example': true, 'export-order': true, 'search-case': true, 'cli-wiring': true };
const EXPECTED = {
  'path-no-check': { ...ALL_TRUE, 'path-escape': false },
  'path-dotdot-only': { ...ALL_TRUE, 'path-escape': false },
  'missing-returns-empty': { ...ALL_TRUE, 'missing-note-error': false },
  'empty-throws': { ...ALL_TRUE, 'missing-note-error': false },
  'search-case-sensitive': { ...ALL_TRUE, 'search-case': false },
  'search-query-only': { ...ALL_TRUE, 'search-case': false },
  'readme-binary': { ...ALL_TRUE, 'readme-example': false },
  'cli-inline-search': { ...ALL_TRUE, 'cli-wiring': false },
  control: { ...ALL_TRUE },
};

// --- a tiny inline runner: no test framework is a dependency here ----------
let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    failures++;
    console.error(`not ok - ${name}\n  ${e.message}`);
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-build-case-'));

for (const caseName of fs.readdirSync(CASES_DIR)) {
  const caseDir = path.join(CASES_DIR, caseName);
  const dest = path.join(root, caseName);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(SEED, dest, { recursive: true });

  const owned = ownedFiles(path.join(caseDir, 'files'));

  test(`${caseName}: owned files match the case's own files/`, () => {
    const expectedOwned = [];
    (function walk(dir, rel) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const childRel = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(path.join(dir, entry.name), childRel);
        else expectedOwned.push(childRel);
      }
    })(path.join(caseDir, 'files'), '');
    assert.deepStrictEqual(owned.slice().sort(), expectedOwned.sort());
    assert.strictEqual(owned.length, 1, `each of this bench's cases owns exactly one file, got ${JSON.stringify(owned)}`);
  });

  const actualOwned = buildBase(caseDir, GOOD_DIR, dest);

  test(`${caseName}: base carries every module except the owned file(s)`, () => {
    for (const f of MODULE_FILES) {
      const p = path.join(dest, f);
      if (actualOwned.includes(f)) {
        assert.ok(!fs.existsSync(p), `${f} is this case's own file: must not exist at base`);
      } else {
        assert.ok(fs.existsSync(p), `${f} is not owned by this case: must exist at base`);
        assert.strictEqual(fs.readFileSync(p, 'utf8'), fs.readFileSync(path.join(GOOD_DIR, f), 'utf8'), `${f} at base must be the good reference verbatim`);
      }
    }
  });

  // Overlay the case's own files/, mimicking the row's head commit.
  fs.cpSync(path.join(caseDir, 'files'), dest, { recursive: true });

  test(`${caseName}: head scores the expected trap, and only that one`, () => {
    const out = JSON.parse(execFileSync('node', [TRAPS, dest], { encoding: 'utf8' }));
    assert.deepStrictEqual(out, EXPECTED[caseName]);
  });
}

fs.rmSync(root, { recursive: true, force: true });

if (failures) {
  console.error(`build-case.test.js: ${failures} failure(s)`);
  process.exit(1);
}
console.log('build-case.test.js: ok');
