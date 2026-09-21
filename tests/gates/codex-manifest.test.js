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
  ['SessionStart', 'SubagentStart'],
  'this task registers exactly the two context events'
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

console.log('codex-manifest.test.js: OK');
