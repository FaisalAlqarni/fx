'use strict';
// Run: node lib/preamble.test.js
//
// Task-supplied test (docs/plans/2026-09-21-multi-harness/tasks/01-render-the-preamble.md),
// with one fix: the original had `cx` referenced (line ~100) before its
// `const cx = render(...)` declaration (line ~103), which throws
// "Cannot access 'cx' before initialization" (TDZ) the moment it runs. Fixed
// by moving the codex assertions to after `cx` is defined, grouped with the
// rest of the codex checks. No assertion content changed.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { render, HARNESSES } = require('./preamble');

assert.deepStrictEqual(HARNESSES, ['claude-code', 'opencode', 'codex']);

const cc = render({ harness: 'claude-code' });
assert.ok(cc.includes('fx:fx-tdd'), 'claude-code must address lanes as fx:fx-tdd');

const oc = render({ harness: 'opencode' });
assert.ok(oc.includes('fx-tdd'), 'opencode must name the lane');
assert.ok(!oc.includes('fx:fx-tdd'), 'opencode must NOT carry the plugin prefix');

// The resolution clause is the sentence that has been backwards all along.
// Assert on the clause, not on a substring it never contained.
assert.ok(!/a plugin skill resolves as/i.test(oc),
  'opencode must not be told that a plugin prefix is required');
assert.ok(/will not resolve|no plugin prefix/i.test(oc),
  'opencode must be told which form fails');

const cx = render({ harness: 'codex' });
assert.ok(/leading .\$|addressed with a leading/i.test(cx),
  'codex must be told lanes carry a leading $');
assert.ok(cx.includes('$fx-tdd'), 'codex must address lanes as $fx-tdd');
assert.ok(!cx.includes('fx:fx-tdd'), 'codex must NOT carry the plugin prefix');

for (const harness of HARNESSES) {
  const text = render({ harness });
  assert.ok(!text.includes('{{'), `${harness}: unrendered placeholder survived`);
  assert.ok(text.length > 500, `${harness}: preamble looks truncated`);
}

// The imperative must still lead. ADR 0002.
const source = fs.readFileSync(path.join(__dirname, '..', 'PREAMBLE.md'), 'utf8');
const firstHeading = (s) => (s.match(/^## .*$/m) || [''])[0];
assert.strictEqual(
  firstHeading(render({ harness: 'claude-code' })),
  firstHeading(source),
  'the first section must not move'
);

assert.throws(() => render({ harness: 'nope' }), /unknown harness/i);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-preamble-'));
fs.writeFileSync(path.join(dir, 'repo.md'), '# repo\n');
assert.ok(
  render({ harness: 'codex', cwd: dir }).includes('repo.md'),
  'a repo.md in cwd must be announced'
);
fs.rmSync(dir, { recursive: true, force: true });

// ---- Task 24: the preamble fits one hook ----
// Claude Code runs a hook's handlers in unstable order, so a split preamble
// could land with part 2 above the opening imperative. One render, one
// handler, under 9,000 characters (its per-hook limit is 10,000) even with
// plan state at its worst: a repo.md and three plans with ledgers and long
// slugs (describePlans names at most three).
{
  const { execFileSync } = require('child_process');
  const worst = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-worst-'));
  fs.writeFileSync(path.join(worst, 'repo.md'), '# repo\n');
  const slugs = [
    '2026-09-21-a-rather-long-plan-slug',         // 34
    '2026-09-21-another-quite-long-plan-slug-x',  // 41 > the measured 38
    '2026-09-21-third-plan-slug-here',            // 32
  ];
  for (const slug of slugs) {
    const dir = path.join(worst, 'docs', 'plans', slug);
    fs.mkdirSync(path.join(dir, 'tasks'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'state.md'), '# ledger\n');
    for (let i = 1; i <= 12; i++) fs.writeFileSync(path.join(dir, 'tasks', `${String(i).padStart(2, '0')}-t.md`), '# t\n');
  }
  try {
    for (const harness of HARNESSES) {
      const text = render({ harness, cwd: worst });
      for (const slug of slugs) assert.ok(text.includes(slug), `${harness}: worst fixture names ${slug}`);
      assert.ok(text.includes('repo.md'), `${harness}: worst fixture carries the repo.md note`);
      assert.ok(text.length < 9000, `${harness}: worst-case render is ${text.length} chars, must be under 9,000`);
      assert.strictEqual((text.match(/^## .*$/m) || [''])[0], '## Invoking a lane is not optional',
        `${harness}: the opening imperative is the first section`);
      assert.ok(text.startsWith('# fx\n\n## Invoking a lane is not optional\n'),
        `${harness}: nothing sits between the title and the opening imperative`);
      assert.ok(!text.includes('The single canonical preamble'), `${harness}: the old intro sentence is gone`);
      if (harness !== 'claude-code') assert.ok(!text.includes('fx:'), `${harness}: no Claude Code addressing (fx:) leaks through`);
    }

    // The hook's process seam: one handler prints the whole render.
    const hook = path.join(__dirname, '..', 'hooks', 'fx-context.js');
    const payload = JSON.stringify({ hook_event_name: 'SubagentStart', cwd: worst });
    const out = JSON.parse(execFileSync('node', [hook], { input: payload, encoding: 'utf8' })).hookSpecificOutput;
    assert.strictEqual(out.hookEventName, 'SubagentStart');
    assert.strictEqual(out.additionalContext, render({ harness: 'claude-code', cwd: worst }), 'the hook prints the whole render');

    // An unreadable preamble is reported, not silently skipped. A copy of the
    // hook and lib/ with no PREAMBLE.md beside them makes the read fail.
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-bare-'));
    try {
      fs.cpSync(__dirname, path.join(bare, 'lib'), { recursive: true });
      fs.cpSync(path.dirname(hook), path.join(bare, 'hooks'), { recursive: true });
      const said = JSON.parse(execFileSync('node', [path.join(bare, 'hooks', 'fx-context.js')],
        { input: payload, encoding: 'utf8' })).hookSpecificOutput.additionalContext;
      assert.match(said, /PREAMBLE\.md could not be read/, 'the unreadable preamble is reported');
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(worst, { recursive: true, force: true });
  }

  const hooks = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8')).hooks;
  for (const ev of ['SessionStart', 'SubagentStart']) {
    const cmds = hooks[ev].flatMap((g) => g.hooks.map((h) => h.command)).filter((c) => c.includes('fx-context.js'));
    assert.strictEqual(cmds.length, 1, `${ev}: exactly one fx-context.js handler, found ${cmds.length}`);
    assert.ok(!cmds[0].includes('--part'), `${ev}: the handler prints the whole render`);
  }
  const lib = require('./preamble');
  assert.strictEqual(lib.renderParts, undefined, 'the split machinery is gone');
  assert.strictEqual(lib.partForHandler, undefined, 'the split machinery is gone');
  console.log('one hook: passed');
}

// ---- Ledger ruling (task 16): a replacement text containing `$` must be taken literally ----
// String.replace reads `$` followed by a backtick as "the text before the
// match", which duplicated the opening line in the Codex render.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'PREAMBLE.md'), 'utf8');
  // The first sentence under the title: `# fx` alone is too short to count.
  const openingLine = src.split('\n').find((l) => l.startsWith('## Invoking a lane is not optional'));
  assert.ok(openingLine, 'PREAMBLE.md still opens with its canonical sentence');
  for (const harness of HARNESSES) {
    const count = render({ harness }).split(openingLine).length - 1;
    assert.strictEqual(count, 1, `${harness}: the opening line appears exactly once, found ${count}`);
  }
  console.log('literal replacement: passed');
}

// ---- Task 16 (amendment A4): dispatch wording reaches the model, per harness ----
{
  const { render } = require('./preamble');
  const cx = render({ harness: 'codex' });
  const cc = render({ harness: 'claude-code' });
  const oc = render({ harness: 'opencode' });
  for (const [h, t] of [['codex', cx], ['claude-code', cc], ['opencode', oc]]) {
    assert.ok(!t.includes('{{DISPATCH}}'), `${h}: the dispatch placeholder is filled`);
  }
  assert.ok(cx.includes('spawn_agent'), 'Codex names its dispatch tool');
  assert.ok(/\bagent_type\b/.test(cx), 'Codex is told to pass agent_type');
  assert.ok(cx.includes('fx-lens-security'), 'Codex names a role the way agent_type takes it');
  for (const [h, t] of [['claude-code', cc], ['opencode', oc]]) {
    assert.ok(!/\bagent_type\b/.test(t) && !t.includes('spawn_agent'), `${h} gets its own wording, not Codex's`);
  }
  assert.ok(cc.includes('fx:fx-lens-security'), 'Claude Code names the agent with the plugin prefix');
  assert.ok(oc.includes('fx-lens-security') && !oc.includes('fx:fx-lens-security'), 'opencode names it bare');
  const opening = (t) => t.split('\n')[0];
  assert.strictEqual(opening(cx), opening(cc), 'nothing is added above the opening imperative');
  console.log('dispatch wording: passed');
}

console.log('preamble.test.js: OK');
