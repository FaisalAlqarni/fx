'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const codex = JSON.parse(fs.readFileSync(path.join(root, '.codex-plugin/plugin.json'), 'utf8'));
const claude = JSON.parse(fs.readFileSync(path.join(root, '.claude-plugin/plugin.json'), 'utf8'));

assert.ok(!('hooks' in codex), 'the Codex validator rejects a hooks key');
assert.ok(!('agents' in codex), 'no agents key exists in the Codex manifest');
assert.strictEqual(typeof codex.skills, 'string', 'skills is a single path string');
assert.strictEqual(codex.skills, './skills/');
assert.strictEqual(codex.version, claude.version, 'manifest versions must match');

// The design requires manifest and marketplace versions to stay identical, and
// says a gate checks it. This is that gate.
const cxMarket = JSON.parse(fs.readFileSync(path.join(root, '.agents/plugins/marketplace.json'), 'utf8'));
const entry = cxMarket.plugins.find((p) => p.name === 'fx');
assert.ok(entry, 'fx must be listed in the Codex marketplace');
assert.strictEqual(entry.version, codex.version, 'marketplace entry must match the manifest');

const hooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks.json'), 'utf8'));
assert.ok(hooks.hooks, 'events nest under a top-level hooks key');
assert.deepStrictEqual(
  Object.keys(hooks.hooks).sort(),
  ['PreToolUse', 'SessionStart', 'SubagentStart'],
  'this task adds PreToolUse alongside the two context events'
);
assert.strictEqual(
  hooks.hooks.PreToolUse[0].matcher, '*',
  'PreToolUse matches every tool; fx-codex.js routes internally on tool_name'
);

// No symlinks anywhere Codex would copy: it drops them silently.
// Ask git, not the filesystem: `find` also walks .worktrees/ and other
// gitignored build state, which would fail this gate on something never shipped.
const links = execFileSync('bash', ['-c',
  "git ls-files -s | awk '$1==\"120000\" {print $4}'"],
  { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(links, '', `symlinks are dropped by the Codex installer: ${links}`);

// The injector renders, and renders for Codex.
const out = execFileSync('node', [path.join(root, 'hooks/fx-codex.js')], {
  input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: root }),
  encoding: 'utf8',
});
const parsed = JSON.parse(out);
const ctx = parsed.hookSpecificOutput.additionalContext;
assert.ok(ctx.includes('$fx-tdd'), 'Codex addressing must be rendered');
assert.ok(!ctx.includes('{{'), 'no placeholder may survive');
assert.ok(!ctx.includes('fx:fx-tdd'), 'the plugin prefix is Claude Code only');

const { spawnSync } = require('child_process');

const hook = path.join(root, 'hooks/fx-codex.js');
const fire = (payload) => spawnSync('node', [hook], {
  input: JSON.stringify(payload), encoding: 'utf8',
});

const refused = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'Bash', tool_input: { command: 'git branch -D some-branch' },
});
assert.strictEqual(refused.status, 2, 'an absolute must be refused');
assert.ok(refused.stderr.trim().length > 0, 'a refusal must state its reason');

const allowed = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'Bash', tool_input: { command: 'git status' },
});
assert.strictEqual(allowed.status, 0, 'a benign command must pass');
assert.strictEqual(allowed.stderr.trim(), '', 'a pass must be silent');

const garbage = spawnSync('node', [hook], { input: 'not json', encoding: 'utf8' });
assert.strictEqual(garbage.status, 0, 'malformed input must not wedge a session');

// PreToolUse for a non-shell tool is not this hook's business.
const other = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'view_image', tool_input: {},
});
assert.strictEqual(other.status, 0);

// The lane check follows the runtime's editing tool. Codex edits with a patch
// tool, so routing only the shell would leave the check absent here.
const patch = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'apply_patch', tool_input: { file_path: path.join(root, 'README.md') },
});
assert.ok(patch.status === 0 || patch.status === 2,
  'apply_patch must reach the lane check, not fall through unexamined');

// The assertion above is satisfied even by a hook that never calls
// laneCheck (README.md is prose, so laneCheck already permits it). Prove the
// wiring for real: a scratch dir with a source file and no design doc must
// be refused, and the SAME dir must then be silently permitted, because the
// design-lane check fires once per .fx state dir.
const os = require('os');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-lane-'));
try {
  const target = path.join(scratch, 'lib', 'widget.js');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, '// placeholder\n');

  const refusedPatch = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { file_path: target },
  });
  assert.strictEqual(refusedPatch.status, 2,
    'apply_patch on source code with no docs/plans/*/design.md must be refused');
  assert.ok(refusedPatch.stderr.trim().length > 0, 'a refusal must state its reason');

  const secondPatch = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { file_path: target },
  });
  assert.strictEqual(secondPatch.status, 0,
    'the lane check fires once; the second call in the same dir must pass');
  assert.strictEqual(secondPatch.stderr.trim(), '', 'a pass must be silent');
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}

console.log('codex guard: OK');
