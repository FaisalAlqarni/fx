'use strict';
// Run: node scripts/test-scope.test.js
const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const dry = (...paths) => execFileSync(path.join(__dirname, 'test-scope'), ['--dry-run', ...paths], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
const LAST = 'node tests/gates/release-version.test.js';

assert.deepStrictEqual(dry('lib/plan-state.test.js'), ['node lib/plan-state.test.js', LAST]);
assert.deepStrictEqual(dry('lib/plan-state.js'), ['node lib/plan-state.test.js', LAST]);
assert.deepStrictEqual(dry('lib/plan-state.js', 'lib/plan-state.test.js'), ['node lib/plan-state.test.js', LAST], 'deduplicated');
const GATES = require('fs').readdirSync(path.join(ROOT, 'tests', 'gates')).filter((f) => f.endsWith('.test.js')).sort()
  .map((f) => `node tests/gates/${f}`).filter((c) => c !== LAST);
assert.deepStrictEqual(dry('skills/fx-plan/SKILL.md'),
  ['scripts/check-prose', 'scripts/check-paths', 'scripts/check-generated', 'scripts/check-manifest', ...GATES, LAST]);
assert.deepStrictEqual(dry('hooks/fx-context.js'),
  ['node lib/preamble.test.js', 'node tests/gates/codex-hook-output.test.js', 'node tests/gates/opencode-plugin.test.js', LAST]);
assert.deepStrictEqual(dry('no/such/file.js'), [LAST], 'a deleted path is skipped');
assert.deepStrictEqual(dry('tests/conformance/lib/live.sh'), ['scripts/check-all', LAST], 'unmapped path falls back to check-all');
assert.deepStrictEqual(dry('.codex-plugin/plugin.json'), ['node tests/gates/codex-manifest.test.js', LAST], 'codex manifest routes to the gate that reads it');
assert.deepStrictEqual(dry('.agents/plugins/marketplace.json'), ['node tests/gates/codex-manifest.test.js', LAST], 'marketplace.json routes to the gate that reads it');
console.log('test-scope: ok');
