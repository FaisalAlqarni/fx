'use strict';
// Run: node tests/review-bench/score.test.js
// Drives tests/review-bench/score.js against four small findings files.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCORE = path.join(__dirname, 'score.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-review-bench-score-'));

function write(name, body) {
  const p = path.join(root, name);
  fs.writeFileSync(p, body);
  return p;
}

function run(findingsPath, matchArg) {
  const r = spawnSync('node', [SCORE, findingsPath, matchArg], { encoding: 'utf8' });
  return r;
}

// 1. A match under Important (Should Fix): caught true.
const important = write(
  'important.md',
  [
    '### Issues',
    '',
    '#### Critical (Must Fix)',
    'None.',
    '',
    '#### Important (Should Fix)',
    "- lib/store.js:10 - no containment check lets a name resolve outside NOTES_DIR",
    '',
    '#### Minor (Nice to Have)',
    'None.',
    '',
    '### Assessment',
    '**Task quality:** Needs fixes',
  ].join('\n'),
);
{
  const r = run(important, 'outside NOTES_DIR');
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.caught, true, 'a match under Important must be caught');
  assert.strictEqual(out.important, 1);
}

// 2. The same match, but only under Minor: not caught.
const minorOnly = write(
  'minor-only.md',
  [
    '### Issues',
    '',
    '#### Critical (Must Fix)',
    'None.',
    '',
    '#### Important (Should Fix)',
    'None.',
    '',
    '#### Minor (Nice to Have)',
    "- lib/store.js:10 - no containment check lets a name resolve outside NOTES_DIR",
    '',
    '### Assessment',
    '**Task quality:** Approved',
  ].join('\n'),
);
{
  const r = run(minorOnly, 'outside NOTES_DIR');
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.caught, false, 'a match only under Minor must not be caught');
  assert.strictEqual(out.important, 0);
}

// 3. Control: one Important finding, scored against NONE: false positive.
const control = write(
  'control.md',
  [
    '### Issues',
    '',
    '#### Critical (Must Fix)',
    'None.',
    '',
    '#### Important (Should Fix)',
    '- cli.js:4 - no error handling on a missing argument',
    '',
    '#### Minor (Nice to Have)',
    'None.',
    '',
    '### Assessment',
    '**Task quality:** Needs fixes',
  ].join('\n'),
);
{
  const r = run(control, 'NONE');
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.caught, false, 'NONE never counts as caught');
  assert.strictEqual(out.falsePositive, true, 'a control finding under Important is a false positive');
  assert.strictEqual(out.important, 1);
}

// 4. No Critical and no Important heading at all: a bench failure, exit 2.
const noHeadings = write(
  'no-headings.md',
  ['The reviewer wrote free-form prose instead of following the template.'].join('\n'),
);
{
  const r = run(noHeadings, 'outside NOTES_DIR');
  assert.strictEqual(r.status, 2, `expected exit 2, got ${r.status}: ${r.stdout}`);
}

// 5. A missing findings file: also exit 2.
{
  const r = run(path.join(root, 'does-not-exist.md'), 'outside NOTES_DIR');
  assert.strictEqual(r.status, 2, `expected exit 2, got ${r.status}: ${r.stdout}`);
}

// 6. fill-template.js must extract the task-reviewer-prompt.md template's
// `prompt: |` body and replace only the named placeholders: everything else,
// byte for byte, must round-trip back to the untouched extracted body.
const { extractPromptBody, fillPlaceholders } = require('./fill-template.js');
const TEMPLATE = path.join(__dirname, '..', '..', 'skills', 'fx-implement', 'task-reviewer-prompt.md');
{
  const raw = fs.readFileSync(TEMPLATE, 'utf8');
  const body = extractPromptBody(raw);
  assert.ok(body.includes('## Part 1: spec compliance'), 'extracted body must be the prompt, not the whole template');
  assert.ok(!body.includes('Subagent (general-purpose):'), 'extracted body must exclude the dispatch header');

  const KEYS = ['TASK_FILE', 'GLOBAL_CONSTRAINTS', 'LEDGER_FILE', 'REPORT_FILE', 'BASE_SHA', 'HEAD_SHA', 'DIFF_FILE', 'FINDINGS_FILE'];
  const values = {};
  for (const k of KEYS) values[k] = `SENTINEL_${k}_VALUE`;
  const filled = fillPlaceholders(body, values);

  let reconstructed = filled;
  for (const k of KEYS) reconstructed = reconstructed.split(values[k]).join(`[${k}]`);
  assert.strictEqual(reconstructed, body, 'fill-template must change only the placeholder tokens, byte-identical otherwise');
}

// 7. Review C1: the search-case cases' match must name the behavior, not
// fire on the ordinary English word "case" (a test case, an edge case).
const searchCaseMatch = fs.readFileSync(path.join(__dirname, 'cases', 'search-case-sensitive', 'match'), 'utf8').trim();
{
  const falseCatch = write(
    'search-case-false-catch.md',
    [
      '### Issues', '', '#### Critical (Must Fix)', 'None.', '',
      '#### Important (Should Fix)',
      "- test/search.test.js:12 - this test case only checks the happy path, add a failing lookup case too",
      '', '#### Minor (Nice to Have)', 'None.',
    ].join('\n'),
  );
  const r = run(falseCatch, searchCaseMatch);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.strictEqual(JSON.parse(r.stdout).caught, false, 'the word "case" alone must not score as catching the case-insensitivity defect');
}
{
  const realCatch = write(
    'search-case-real-catch.md',
    [
      '### Issues', '', '#### Critical (Must Fix)', 'None.', '',
      '#### Important (Should Fix)',
      "- lib/search.js:1 - search is case-sensitive: it never calls toLowerCase on the note text, only on the query",
      '', '#### Minor (Nice to Have)', 'None.',
    ].join('\n'),
  );
  const r = run(realCatch, searchCaseMatch);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.strictEqual(JSON.parse(r.stdout).caught, true, 'a genuine case-folding finding must still be caught');
}

// 8. Review M5: readme-binary's match must say the example fails, needs
// `node cli.js` instead, or that no binary is installed, not merely mention
// `node cli.js`.
const readmeMatch = fs.readFileSync(path.join(__dirname, 'cases', 'readme-binary', 'match'), 'utf8').trim();
{
  const benign = write(
    'readme-benign.md',
    [
      '### Issues', '', '#### Critical (Must Fix)', 'None.', '',
      '#### Important (Should Fix)',
      "- README.md:3 - the usage example correctly runs node cli.js add and node cli.js show",
      '', '#### Minor (Nice to Have)', 'None.',
    ].join('\n'),
  );
  const r = run(benign, readmeMatch);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.strictEqual(JSON.parse(r.stdout).caught, false, 'a benign mention of node cli.js must not be a false catch');
}
{
  const realCatch = write(
    'readme-real-catch.md',
    [
      '### Issues', '', '#### Critical (Must Fix)', 'None.', '',
      '#### Important (Should Fix)',
      "- README.md:3 - the example fails: it calls a `notes` binary that is never installed; it should use node cli.js instead",
      '', '#### Minor (Nice to Have)', 'None.',
    ].join('\n'),
  );
  const r = run(realCatch, readmeMatch);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.strictEqual(JSON.parse(r.stdout).caught, true, 'a genuine readme-binary finding must still be caught');
}

// 9. Lens 2: fill-template.js must fail, naming the token, when the filled
// prompt still contains a placeholder the caller never supplied a value for.
{
  const extraTemplate = write(
    'extra-placeholder-template.md',
    [
      '```markdown',
      'Subagent (general-purpose):',
      '  prompt: |',
      '    Read the task: [TASK_FILE]',
      '    A brand new field: [NEW_PLACEHOLDER]',
      '```',
    ].join('\n'),
  );
  const r = spawnSync('node', [path.join(__dirname, 'fill-template.js'), extraTemplate], {
    encoding: 'utf8',
    env: { ...process.env, TASK_FILE: '/tmp/x.md' },
  });
  assert.notStrictEqual(r.status, 0, 'a leftover placeholder must fail fill-template.js');
  assert.match(r.stderr, /NEW_PLACEHOLDER/, 'the failure must name the leftover token');
}

fs.rmSync(root, { recursive: true, force: true });
console.log('score.test.js: ok');
