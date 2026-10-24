// Run: node lib/evidence.test.js
// The one matching rule for a repo's .fx.json commands (red team I10).
import * as assert from 'assert';
import { checkHint, countsAsVerification, hasPassSummary, isCheckCommand, isRepoCommand } from './evidence.js';

assert.strictEqual(isRepoCommand('make test', 'make test'), true);
assert.strictEqual(isRepoCommand('make test VERBOSE=1', 'make test'), true);
assert.strictEqual(isRepoCommand('make testing', 'make test'), false);
assert.strictEqual(isRepoCommand('node lib/x.test.js', 'node {file}'), false, 'a one-word prefix matches nothing');
assert.strictEqual(isRepoCommand('scripts/test-scope lib/a.js', 'scripts/test-scope {paths}'), true, 'a first word with / counts');
assert.strictEqual(isRepoCommand('bundle exec rspec spec/a_spec.rb:3', 'bundle exec rspec {file}:{line}'), true);
assert.strictEqual(isRepoCommand('x', null), false);
// lens I7: a placeholder prefix ends at a word boundary.
assert.strictEqual(isRepoCommand('scripts/test-scope-evil x', 'scripts/test-scope {paths}'), false, 'the prefix is a whole word');
assert.strictEqual(isRepoCommand('scripts/test-scope/../../tmp/x.sh', 'scripts/test-scope {paths}'), false, 'the prefix is a whole word');
assert.strictEqual(isRepoCommand('scripts/test-scope', 'scripts/test-scope {paths}'), true, 'the placeholder may be empty');
assert.strictEqual(isRepoCommand('node lib/a.test.js', 'node lib/{file}'), true, 'a placeholder glued to its prefix');
assert.strictEqual(isRepoCommand('  make   test  ', 'make test'), true, 'the command is normalized first');

const checks = { test_one: null, test_scope: null, test_all: 'make test', lint: 'make lint', setup: 'make setup' };
assert.strictEqual(isCheckCommand('make test', checks), true);
assert.strictEqual(isCheckCommand('make lint', checks), true);
assert.strictEqual(isCheckCommand('make setup', checks), false, 'setup is never a check');

// hasPassSummary
for (const t of ['Tests: 12 passed, 12 total', '12 examples, 0 failures', 'OK (3 tests)', 'ok  \tgithub.com/x/y\t0.01s',
  'test result: ok. 3 passed; 0 failed', 'Passed!  - Failed:     0, Passed:    10', 'ALL GREEN', '=== 5 passed in 0.12s ===']) {
  assert.strictEqual(hasPassSummary(t), true, t);
}
for (const t of ['5 passed, 1 failed', 'ok  \tgithub.com/x\nFAIL\tgithub.com/y', 'Tests: 3 failed, 3 passed', '0 passed', 'error: build failed', '']) {
  assert.strictEqual(hasPassSummary(t), false, JSON.stringify(t));
}
assert.strictEqual(hasPassSummary(`${'ALL GREEN\n'}${'x'.repeat(5000)}`), false, 'only the last 4 KB counts');

// countsAsVerification
const c2 = { test_one: 'node {file}', test_scope: 'scripts/test-scope {paths}', test_all: 'make test', lint: null, setup: null };
const cases: [Parameters<typeof countsAsVerification>[0], string, 'ok' | 'fail' | 'unknown', string, boolean][] = [
  ['shell', 'make test', 'ok', '', true],
  ['shell', 'make test', 'fail', '', false],
  ['shell', 'make test | tail -5', 'ok', 'error', false],
  ['shell', 'make test | tail -5', 'ok', 'Tests: 3 passed', true],
  ['shell', 'npm test || true', 'ok', '', false],
  ['shell', 'echo "Tests: 1 passed"', 'ok', 'Tests: 1 passed', false],
  ['shell', 'grep "ALL GREEN" log.txt', 'ok', 'ALL GREEN', false],
  ['read', 'cat out.txt', 'ok', 'Tests: 3 passed', false],
  ['shell', 'npx vitest run', 'unknown', 'Tests: 4 passed', true],
  ['shell', 'node lib/x.test.js', 'ok', '', false],
  ['shell', 'make test; echo done', 'ok', '', false],
  ['shell', 'npx vitest run', 'fail', 'Tests: 4 passed', false],
  ['shell', 'make test', 'fail', 'ALL GREEN', false],
  ['shell', 'scripts/test-scope lib/a.js --verbose', 'ok', '', true],
];
for (const [kind, cmd, outcome, output, want] of cases) assert.strictEqual(countsAsVerification(kind, cmd, outcome, output, c2), want, `${kind} ${cmd} ${outcome}`);

// checkHint
assert.strictEqual(checkHint(c2), '`scripts/test-scope {paths}`');
assert.strictEqual(checkHint({ ...c2, test_scope: null }), '`make test`');
assert.strictEqual(checkHint({ test_one: null, test_scope: null, test_all: null, lint: null, setup: null }), "the project's tests");
console.log('evidence.test.js: ok');
