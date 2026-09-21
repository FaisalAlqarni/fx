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
// laneCheck (README.md is prose, so laneCheck already permits it, AND the
// payload above uses a `file_path` key the real Codex CLI never sends — see
// below). It cannot prove the wiring.
//
// Measured live against Codex CLI 0.155.1 (fix round 1): a real apply_patch
// PreToolUse payload has no `file_path`/`path` key at all. The whole patch
// arrives as raw text under `command` — the SAME key Bash uses:
//
//   tool_name='apply_patch'  tool_input keys=['command']
//     command = '*** Begin Patch\n*** Update File: target.js\n@@\n' +
//                '-const b = 2;\n+const b = 3;\n*** End Patch'
//
// The lane check must parse the affected path(s) out of that text. These
// cases prove the parser, not just the routing.
const os = require('os');

function withScratch(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-lane-'));
  try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// Single-file patch: the one path named is source code with no design doc.
withScratch((scratch) => {
  const command = '*** Begin Patch\n*** Update File: lib/widget.js\n@@\n'
    + '-const b = 2;\n+const b = 3;\n*** End Patch';
  const result = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { command },
  });
  assert.strictEqual(result.status, 2,
    'apply_patch on source code with no docs/plans/*/design.md must be refused');
  assert.ok(result.stderr.includes('lib/widget.js'),
    'the reason must name the refused path');
});

// Multi-file patch: only the SECOND path is refused. Proves every path is
// checked, not just the first, and that the reason names the specific
// offender rather than the whole patch.
withScratch((scratch) => {
  const command = '*** Begin Patch\n'
    + '*** Update File: README.md\n@@\n-old\n+new\n'
    + '*** Update File: lib/widget.js\n@@\n-const b = 2;\n+const b = 3;\n'
    + '*** End Patch';
  const result = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { command },
  });
  assert.strictEqual(result.status, 2,
    'a multi-file patch is refused when ANY of its paths is refused');
  assert.ok(result.stderr.includes('lib/widget.js'),
    'the reason names the specific offending path');
  assert.ok(!result.stderr.includes('README.md'),
    'the reason names the offender, not every path in the patch');
});

// A rename carries two paths: the Update line and the Move-to target. Both
// must be checked.
withScratch((scratch) => {
  const command = '*** Begin Patch\n*** Update File: README.md\n'
    + '*** Move to: lib/renamed.js\n@@\n-old\n+new\n*** End Patch';
  const result = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { command },
  });
  assert.strictEqual(result.status, 2,
    'the Move-to target is source code with no design doc and must be checked too');
  assert.ok(result.stderr.includes('lib/renamed.js'),
    'the reason names the Move-to path');
});

// Unparseable patch text: fail open, exactly as a laneCheck throw already
// does. A parsing bug must never wedge a Codex session.
withScratch((scratch) => {
  const result = fire({
    hook_event_name: 'PreToolUse', cwd: scratch,
    tool_name: 'apply_patch', tool_input: { command: 'this is not a patch at all' },
  });
  assert.strictEqual(result.status, 0,
    'a patch with no recognisable file header must be allowed, not wedge the session');
  assert.strictEqual(result.stderr.trim(), '', 'a pass must be silent');
});

console.log('codex guard: OK');
