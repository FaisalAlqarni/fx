'use strict';
// Run: node scripts/test-scope.test.js
const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const dry = (...paths) => execFileSync(path.join(__dirname, 'test-scope'), ['--dry-run', ...paths], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
const LAST = 'node tests/gates/release-version.test.js';

const HOOKS_RULE = ['node lib/preamble.test.js', 'node tests/gates/codex-hook-output.test.js', 'node tests/gates/opencode-plugin.test.js'];
assert.deepStrictEqual(dry('lib/plan-state.test.js'), ['node lib/plan-state.test.js', LAST]);
// lib/plan-state.js matches both the .js-with-sibling rule and the
// hooks/plugins/preamble/plan-state rule; both apply (task 12 fix round 2).
assert.deepStrictEqual(dry('lib/plan-state.js'), ['node lib/plan-state.test.js', ...HOOKS_RULE, LAST]);
assert.deepStrictEqual(dry('lib/plan-state.js', 'lib/plan-state.test.js'),
  [...HOOKS_RULE, 'node lib/plan-state.test.js', LAST], 'deduplicated');
// lib/preamble.js matches the same two rules; its own sibling test is also
// the hooks rule's first command, so dedup keeps one copy at the hooks
// rule's position.
assert.deepStrictEqual(dry('lib/preamble.js'), [...HOOKS_RULE, LAST]);
const GATES = require('fs').readdirSync(path.join(ROOT, 'tests', 'gates')).filter((f) => f.endsWith('.test.js')).sort()
  .map((f) => `node tests/gates/${f}`).filter((c) => c !== LAST);
assert.deepStrictEqual(dry('skills/fx-plan/SKILL.md'),
  ['scripts/check-prose', 'scripts/check-paths', 'scripts/check-generated', 'scripts/check-manifest', ...GATES, LAST]);
assert.deepStrictEqual(dry('hooks/fx-context.js'),
  ['node lib/preamble.test.js', 'node tests/gates/codex-hook-output.test.js', 'node tests/gates/opencode-plugin.test.js', LAST]);
// A deleted path cannot be checked by running it, and deleting a skill or a
// lib file must still reach check-paths and check-generated: check-all.
assert.deepStrictEqual(dry('no/such/file.js'), ['scripts/check-all', LAST], 'a deleted path falls back to check-all');
assert.deepStrictEqual(dry('skills/no-such-skill/SKILL.md'), ['scripts/check-all', LAST], 'a deleted skill file falls back to check-all');
assert.deepStrictEqual(dry('lib/no-such.test.js'), ['scripts/check-all', LAST], 'a deleted test is never run by name');
// These three need the <main> <worktree> fixture check-all builds; run bare
// they exit 2 before testing anything.
for (const p of ['lib/git-guard.js', 'lib/git-guard.test.js', 'lib/heredoc.test.js', 'lib/base-branch.test.js']) {
  assert.deepStrictEqual(dry(p), ['scripts/check-all', LAST], `${p} needs the git fixture`);
}
assert.deepStrictEqual(dry('tests/conformance/lib/live.sh'), ['scripts/check-all', LAST], 'unmapped path falls back to check-all');
assert.deepStrictEqual(dry('.codex-plugin/plugin.json'), ['node tests/gates/codex-manifest.test.js', LAST], 'codex manifest routes to the gate that reads it');
assert.deepStrictEqual(dry('.agents/plugins/marketplace.json'), ['node tests/gates/codex-manifest.test.js', LAST], 'marketplace.json routes to the gate that reads it');
console.log('test-scope: ok');
