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

// ---- Tasks 24 and 25: one hook, and a bootstrap rather than a router ----
// Claude Code runs a hook's handlers in unstable order, so a split preamble
// could land with part 2 above the opening imperative: one render, one
// handler. Task 25 (ADR 0021) makes that render a bootstrap: it makes the
// model invoke the lane that carries the rules, and routing lives in the
// skill descriptions. Two budgets: the bootstrap alone stays under 3,000
// characters (the design target, which keeps it a bootstrap), and the worst
// case, a repo.md and three plans with ledgers and long slugs (describePlans
// names at most three), stays under 9,000, Claude Code's per-hook limit of
// 10,000 with margin.
const INTRO = 'The single canonical preamble. Injected into every session **and every\n'
  + 'dispatched subagent**, on every runtime, from this one file.\n\n'
  + 'Subagents read neither `CLAUDE.md` nor memory. Anything that must hold for a\n'
  + 'subagent has to be here: that is the whole reason this file exists, and the\n'
  + 'reason it stays short.';
{
  const { execFileSync } = require('child_process');
  const worst = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-worst-'));
  // No repo.md, no plans: the bootstrap and nothing appended to it.
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-alone-'));
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
      const alone = render({ harness, cwd: empty });
      assert.ok(alone.length < 3000, `${harness}: the bootstrap alone is ${alone.length} chars, must be under 3,000`);
      assert.strictEqual((text.match(/^## .*$/m) || [''])[0], '## Invoking a lane is not optional',
        `${harness}: the opening imperative is the first section`);
      assert.ok(text.startsWith(`# fx\n\n${INTRO}\n\n---\n\n## Invoking a lane is not optional\n`),
        `${harness}: the fixed intro is the only text above the opening imperative`);
      // The markers rows 01, 02 and 16 ask the model for (tests/conformance/lib/live.sh).
      assert.match(text, /across 111 subagents/, `${harness}: the 111-subagents marker is present`);
      assert.match(text, /35 patterns with examples/, `${harness}: the 35-patterns marker is present`);
      assert.match(text, /Each lane's description says when it applies/, `${harness}: the bootstrap points at the descriptions`);
      assert.ok(!/^## (Routing|The ladder|Prose|Non-negotiables)$/m.test(text),
        `${harness}: a bootstrap, not a router: rules live in the lanes`);
      if (harness !== 'claude-code') assert.ok(!text.includes('fx:'), `${harness}: no Claude Code addressing (fx:) leaks through`);
    }

    // The hook's process seam: one handler prints the whole render.
    const hook = path.join(__dirname, '..', 'hooks', 'fx-context.js');
    const payload = JSON.stringify({ hook_event_name: 'SubagentStart', cwd: worst });
    const out = JSON.parse(execFileSync('node', [hook], { input: payload, encoding: 'utf8' })).hookSpecificOutput;
    assert.strictEqual(out.hookEventName, 'SubagentStart');
    assert.strictEqual(out.additionalContext, render({ harness: 'claude-code', cwd: worst, subagent: true }), 'the hook prints the whole render, without the plans block');

    const sessionPayload = JSON.stringify({ hook_event_name: 'SessionStart', cwd: worst });
    const sessionOut = JSON.parse(execFileSync('node', [hook], { input: sessionPayload, encoding: 'utf8' })).hookSpecificOutput;
    assert.strictEqual(sessionOut.hookEventName, 'SessionStart');
    assert.strictEqual(sessionOut.additionalContext, render({ harness: 'claude-code', cwd: worst }), 'the hook prints the whole render, with the plans block');

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
    fs.rmSync(empty, { recursive: true, force: true });
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

// ---- Final review I1: Codex has no Skill tool; it loads a lane by reading SKILL.md ----
// Codex's catalog prompt tells the model to read a skill's SKILL.md in full
// (research/codex.md, section 4), and `$name` is the user's syntax. A render
// that forbids reading SKILL.md forbids the only way Codex loads a lane.
{
  const cx = render({ harness: 'codex' });
  assert.ok(!/Never\s+`?Read`?\s+a\s+`?SKILL\.md/i.test(cx), 'codex must not forbid reading SKILL.md');
  assert.match(cx, /read the lane's `SKILL\.md` in full/i, 'codex is told to read the lane\'s SKILL.md in full');
  assert.ok(!/the `\$name` form/.test(cx), 'codex is not told to invoke with the user-only $name syntax');
  for (const harness of ['claude-code', 'opencode']) {
    assert.match(render({ harness }), /Never `Read` a `SKILL\.md`/, `${harness}: the never-read rule stays where a Skill tool exists`);
  }
  // Grammar: no doubled punctuation, no sentence starting in lower case after a full stop.
  for (const harness of HARNESSES) {
    const t = render({ harness });
    assert.ok(!/[.,]\s*[.,]/.test(t.replace(/\.\.\./g, '')), `${harness}: doubled punctuation`);
    assert.ok(!/\*\*Invoke[^*]*\*\* [a-z]/.test(t), `${harness}: the sentence after the bold lead starts in lower case`);
  }
  console.log('codex lane loading: passed');
}

// Final review Minor 12: the plan-state block names fx-implement the way this
// harness addresses a lane, like the rest of the render.
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-planlane-'));
  fs.mkdirSync(path.join(d, 'docs', 'plans', '2026-01-01-x', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(d, 'docs', 'plans', '2026-01-01-x', 'tasks', '01-a.md'), '# a\n');
  try {
    assert.match(render({ harness: 'claude-code', cwd: d }), /`fx:fx-implement` owns this/);
    assert.match(render({ harness: 'codex', cwd: d }), /`\$fx-implement` owns this/);
    assert.match(render({ harness: 'opencode', cwd: d }), /`fx-implement` owns this/);
    assert.match(render({ harness: 'claude-code', cwd: d }), /re-enter `fx:fx-implement`/);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
  console.log('plan-state lane name: passed');
}

// ---- a subagent gets the bootstrap, not the plan list ----
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-preamble-sub-'));
  fs.mkdirSync(path.join(dir, 'docs', 'plans', 'p1', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'plans', 'p1', 'tasks', '01-a.md'), '# a\n');
  try {
    for (const harness of HARNESSES) {
      const session = render({ harness, cwd: dir });
      const sub = render({ harness, cwd: dir, subagent: true });
      assert.match(session, /Unfinished plans in this repository/, `${harness}: a session still gets the plans block`);
      assert.doesNotMatch(sub, /Unfinished plans in this repository/, `${harness}: a subagent does not`);
      assert.ok(sub.startsWith(`# fx\n\n${INTRO}\n\n---\n\n## Invoking a lane is not optional\n`), `${harness}: subagent bootstrap intact`);
      assert.match(sub, /across 111 subagents/, `${harness}: subagent keeps the 111 marker`);
      assert.strictEqual(sub, render({ harness, cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'fx-empty-')) }),
        `${harness}: a subagent render equals the no-plans render`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  console.log('subagent skips plans block: passed');
}

console.log('preamble.test.js: OK');
