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

// ---- Amendment A3: parts under Claude Code's 10,000-char per-hook limit ----
{
  const { render, renderParts, HARNESSES } = require('./preamble');
  const fsx = require('fs'), osx = require('os'), px = require('path');
  const LABEL = /\n?\[fx preamble: part \d+ of \d+\]\n?$/;
  const dirs = [process.cwd()];
  const rich = fsx.mkdtempSync(px.join(osx.tmpdir(), 'fx-parts-'));
  fsx.writeFileSync(px.join(rich, 'repo.md'), '# repo\n');
  fsx.mkdirSync(px.join(rich, 'docs', 'plans', '2026-01-01-demo', 'tasks'), { recursive: true });
  fsx.writeFileSync(px.join(rich, 'docs', 'plans', '2026-01-01-demo', 'plan.md'), '# demo\n');
  // describePlans skips a plan whose tasks/ is empty, so give it one task.
  fsx.writeFileSync(px.join(rich, 'docs', 'plans', '2026-01-01-demo', 'tasks', '01-x.md'), '# 01: x\n');
  dirs.push(rich);
  assert.ok(render({ harness: 'claude-code', cwd: rich }).includes('2026-01-01-demo'),
    'the rich fixture must render a plan block');
  for (const harness of HARNESSES) for (const cwd of dirs) {
    const full = render({ harness, cwd });
    const parts = renderParts({ harness, cwd });
    assert.ok(parts.length >= 1, 'at least one part');
    assert.ok(parts.length <= 3, `${harness} in ${cwd} needs ${parts.length} parts; three handlers ship per event`);
    parts.forEach((p, i) => {
      assert.ok(p.length < 9000, `${harness} part ${i + 1} is ${p.length} chars`);
      assert.ok(p.endsWith(`[fx preamble: part ${i + 1} of ${parts.length}]`) ||
                p.endsWith(`[fx preamble: part ${i + 1} of ${parts.length}]\n`), 'labelled at the end');
      assert.ok(!p.startsWith('[fx preamble'), 'nothing above the opening imperative');
    });
    assert.strictEqual(parts.map((p) => p.replace(LABEL, '')).join(''), full, 'parts reassemble the render');
    assert.ok(parts[0].startsWith(full.split('\n')[0]), 'part 1 opens with the opening imperative');
  }
  // Handler 3 carries every remaining part when there are more than three.
  // A plan-state fixture cannot force this (describePlans names at most three
  // plans), so a small max does.
  {
    const { partForHandler } = require('./preamble');
    const full = render({ harness: 'claude-code', cwd: rich });
    const many = renderParts({ harness: 'claude-code', cwd: rich, max: 3000 });
    assert.ok(many.length >= 4, `max 3000 forces 4+ parts, got ${many.length}`);
    assert.strictEqual(partForHandler(many, 1), many[0], 'handler 1 is part 1');
    assert.strictEqual(partForHandler(many, 2), many[1], 'handler 2 is part 2');
    assert.strictEqual(partForHandler(many, 3), many.slice(2).join(''), 'handler 3 carries every remaining part');
    assert.strictEqual(partForHandler(many, 4), '', 'no fourth handler output');
    assert.strictEqual([1, 2, 3].map((n) => partForHandler(many, n)).join('').replace(/\n?\[fx preamble: part \d+ of \d+\]\n?/g, ''),
      full, 'the three handlers together still carry the whole render');
    const few = renderParts({ harness: 'claude-code', cwd: rich });
    assert.strictEqual(partForHandler(few, few.length + 1), '', 'past the count is empty');
  }
  fsx.rmSync(rich, { recursive: true, force: true });
  // The hook's process seam: each handler prints its own part.
  {
    const { execFileSync } = require('child_process');
    const hook = px.join(__dirname, '..', 'hooks', 'fx-context.js');
    const cwd = process.cwd();
    const payload = JSON.stringify({ hook_event_name: 'SessionStart', cwd });
    const run = (n) => JSON.parse(execFileSync('node', [hook, '--part', String(n)], { input: payload, encoding: 'utf8' }));
    const expected = renderParts({ harness: 'claude-code', cwd });
    const p1 = run(1).hookSpecificOutput;
    assert.strictEqual(p1.hookEventName, 'SessionStart');
    assert.strictEqual(p1.additionalContext, expected[0], 'hook part 1 is renderParts part 1');
    assert.ok(p1.additionalContext.startsWith(render({ harness: 'claude-code', cwd }).split('\n')[0]), 'part 1 opens with the opening line');
    assert.strictEqual(run(4).hookSpecificOutput.additionalContext, '', 'hook part 4 is empty');

    // An unreadable preamble is reported once, by part 1 only. A copy of the
    // hook and lib/ with no PREAMBLE.md beside them makes the read fail.
    const bare = fsx.mkdtempSync(px.join(osx.tmpdir(), 'fx-bare-'));
    fsx.cpSync(px.join(__dirname), px.join(bare, 'lib'), { recursive: true });
    fsx.cpSync(px.dirname(hook), px.join(bare, 'hooks'), { recursive: true });
    const bareRun = (n) => JSON.parse(execFileSync('node', [px.join(bare, 'hooks', 'fx-context.js'), '--part', String(n)],
      { input: payload, encoding: 'utf8' })).hookSpecificOutput.additionalContext;
    try {
      assert.match(bareRun(1), /PREAMBLE\.md could not be read/, 'part 1 reports the unreadable preamble');
      assert.strictEqual(bareRun(2), '', 'part 2 stays quiet');
      assert.strictEqual(bareRun(3), '', 'part 3 stays quiet');
    } finally {
      fsx.rmSync(bare, { recursive: true, force: true });
    }
  }
  const hooks = JSON.parse(fsx.readFileSync(px.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8')).hooks;
  for (const ev of ['SessionStart', 'SubagentStart']) {
    const cmds = hooks[ev].flatMap((g) => g.hooks.map((h) => h.command));
    for (const n of [1, 2, 3]) assert.ok(cmds.some((c) => c.includes(`fx-context.js`) && c.includes(`--part ${n}`)), `${ev} part ${n}`);
  }
  console.log('renderParts: passed');
}

// ---- Ledger ruling (task 16): a replacement text containing `$` must be taken literally ----
// String.replace reads `$` followed by a backtick as "the text before the
// match", which duplicated the opening line in the Codex render.
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'PREAMBLE.md'), 'utf8');
  // The first sentence under the title: `# fx` alone is too short to count.
  const openingLine = src.split('\n').find((l) => l.startsWith('The single canonical preamble'));
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
