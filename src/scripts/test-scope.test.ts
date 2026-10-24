// Run: node scripts/test-scope.test.js
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
const ROOT = path.join(__dirname, '..');
const dry = (...paths: string[]) => execFileSync(path.join(__dirname, 'test-scope'), ['--dry-run', ...paths], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
const LAST = 'node tests/gates/release-version.test.js';

const HOOKS_RULE = ['node lib/preamble.test.js', 'node tests/gates/codex-hook-output.test.js', 'node tests/gates/opencode-plugin.test.js'];
const TURN = 'node tests/gates/turn-journal.test.js';
const SHELL_GUARD = 'node tests/gates/shell-guard-claude.test.js';
const SHELL_GUARD_CODEX = 'node tests/gates/shell-guard-codex.test.js';
const LOOP = 'node tests/gates/loop-nudge.test.js';
const STOP = 'node tests/gates/stop-check.test.js';
const EDIT_RULES = ['node tests/gates/edit-rules.test.js', 'node tests/gates/fx-json-notice.test.js'];
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
const GATES = fs.readdirSync(path.join(ROOT, 'tests', 'gates')).filter((f) => f.endsWith('.test.js')).sort()
  .map((f) => `node tests/gates/${f}`).filter((c) => c !== LAST);
assert.deepStrictEqual(dry('skills/fx-plan/SKILL.md'),
  ['scripts/check-prose', 'scripts/check-paths', 'scripts/check-generated', 'scripts/check-manifest', ...GATES, LAST]);
// A harness reference also runs the harness-facts gate by name, after the prose gates.
const FACTS = 'node tests/gates/harness-facts.test.js';
assert.deepStrictEqual(dry('references/harnesses/codex.md'),
  ['scripts/check-prose', 'scripts/check-paths', 'scripts/check-generated', 'scripts/check-manifest', ...GATES.filter((c) => c !== FACTS), FACTS, LAST]);
assert.deepStrictEqual(dry('hooks/fx-context.js'), [...HOOKS_RULE, TURN, SHELL_GUARD, SHELL_GUARD_CODEX, LOOP, STOP, ...EDIT_RULES, LAST]);
assert.deepStrictEqual(dry('plugins/fx-opencode-v1.js'), [...HOOKS_RULE, 'node tests/gates/opencode-v1-shell-guard.test.js', 'node tests/gates/opencode-turn.test.js', 'node tests/gates/opencode-edit-rules.test.js', LAST]);
assert.deepStrictEqual(dry('plugins/fx-opencode-v2.js'), [...HOOKS_RULE, 'node tests/gates/opencode-v1-shell-guard.test.js', 'node tests/gates/opencode-turn.test.js', 'node tests/gates/opencode-edit-rules.test.js',
  'node tests/gates/opencode-v2-plugin.test.js', 'node tests/gates/opencode-v2-shell-guard.test.js', LAST]);
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
// A src/ path runs the TypeScript gates, then whatever its built file runs.
const TS_GATES = ['scripts/check-types', 'scripts/check-ts-escapes', 'scripts/check-generated'];
assert.deepStrictEqual(dry('src/lib/dispatch-route.ts'), [...TS_GATES, ...dry('lib/dispatch-route.js')]);
assert.deepStrictEqual(dry('src/hooks/fx-context.ts'), [...TS_GATES, ...dry('hooks/fx-context.js')]);
assert.deepStrictEqual(dry('src/lib/git-guard.ts'), ['scripts/check-all', LAST], 'check-all already runs the TypeScript gates');
const built = (p: string) => execFileSync(path.join(__dirname, 'test-scope'), ['--built-path', p], { cwd: ROOT, encoding: 'utf8' }).trim();
assert.strictEqual(built('src/lib/x.test.ts'), 'lib/x.test.js');
assert.strictEqual(built('src/scripts/build-cost.ts'), 'scripts/build-cost');
assert.strictEqual(built('src/scripts/test-scope.ts'), 'scripts/test-scope');
assert.strictEqual(built('lib/plan-state.test.js'), 'lib/plan-state.test.js', 'a non-src path prints unchanged');
console.log('test-scope: ok');
