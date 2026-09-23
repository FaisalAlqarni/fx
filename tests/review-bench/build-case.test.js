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
    assert.strictEqual(owned.length, 2, `each of this bench's cases owns its implementation file and its test file, got ${JSON.stringify(owned)}`);
    assert.ok(owned.some((f) => f.startsWith('test/')), `case ${caseName} must own a test/*.test.js file (review Ruling S)`);
  });

  const ownedTestFile = owned.find((f) => f.startsWith('test/'));

  test(`${caseName}: the owned test file does not exist before the case's own files are overlaid`, () => {
    assert.ok(!fs.existsSync(path.join(dest, ownedTestFile)), `${ownedTestFile} must not exist at base: it is this case's own deliverable`);
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

  test(`${caseName}: head contains the owned test file with the case's content`, () => {
    assert.ok(fs.existsSync(path.join(dest, ownedTestFile)), `${ownedTestFile} must exist at head`);
    assert.strictEqual(
      fs.readFileSync(path.join(dest, ownedTestFile), 'utf8'),
      fs.readFileSync(path.join(caseDir, 'files', ownedTestFile), 'utf8'),
    );
  });

  test(`${caseName}: head scores the expected trap, and only that one`, () => {
    const out = JSON.parse(execFileSync('node', [TRAPS, dest], { encoding: 'utf8' }));
    assert.deepStrictEqual(out, EXPECTED[caseName]);
  });

  // Review's own instruction: confirm the given (visible) test passes on the
  // good version and on each defective version, since the planted defects are
  // not what those example tests check (readme-binary's given test checks
  // structure only - a "## Usage" heading, the words "add"/"show", NOTES_DIR
  // named - never that the example actually runs, which is what the hidden
  // readme-example trap is for; the wrong-binary defect never touches any of
  // that structure, so this given test passes regardless, same as every
  // other case's).
  test(`${caseName}: the task's own given test at head`, () => {
    let passed = true;
    try {
      execFileSync('node', ['--test', ownedTestFile], { cwd: dest, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      passed = false;
    }
    assert.strictEqual(passed, true, `${caseName}'s given test (${ownedTestFile}) must pass at head: the planted defect is not what it checks`);
  });
}

// The coordinator's own named example: a task-01 case's head must contain
// test/store.test.js (review Ruling S).
test('path-no-check (a task-01 case): head contains test/store.test.js', () => {
  const dest = path.join(root, 'path-no-check');
  assert.ok(fs.existsSync(path.join(dest, 'test/store.test.js')));
});

fs.rmSync(root, { recursive: true, force: true });

if (failures) {
  console.error(`build-case.test.js: ${failures} failure(s)`);
  process.exit(1);
}
console.log('build-case.test.js: ok');
