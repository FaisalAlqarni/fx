import * as assert from 'assert';
import { parseFxJson } from './fx-json.js';

const good = parseFxJson({ stacks: ['rails'], test_one: 'x {file}', test_all: 'make test' });
assert.ok(good.ok);
assert.deepStrictEqual(good.value.stacks, ['rails']);
assert.strictEqual(good.value.test_all, 'make test');
assert.deepStrictEqual(good.problems, []);

const bad = parseFxJson({ stacks: 'rails', companions: 'X' });
assert.ok(bad.ok);
assert.strictEqual(bad.value.companions, 'X');
assert.strictEqual(bad.value.stacks, undefined);
assert.deepStrictEqual(bad.problems, [{ key: 'stacks', reason: 'stacks must be an array of strings' }]);

for (const notObject of [null, 'x', 5]) {
  assert.deepStrictEqual(parseFxJson(notObject), { ok: false, reason: '.fx.json is not an object' });
}

const nulled = parseFxJson({ lint: null });
assert.ok(nulled.ok);
assert.strictEqual(nulled.value.lint, null);
assert.deepStrictEqual(nulled.problems, []);

const mixed = parseFxJson({ coverage_floor: 80, setup: 3, test_scope: null });
assert.ok(mixed.ok);
assert.strictEqual(mixed.value.coverage_floor, 80);
assert.strictEqual(mixed.value.test_scope, null);
assert.strictEqual('setup' in mixed.value, false);
assert.deepStrictEqual(mixed.problems.map((p) => p.key), ['setup']);

// A switch that is not a boolean is named; an unknown switch, a retired one included, is ignored.
const hooks = parseFxJson({ hooks: { stop_check: 'no', loop_nudge: false, shell_guard: false, lane_hint: false } });
assert.ok(hooks.ok);
assert.deepStrictEqual(hooks.value.hooks, { loop_nudge: false });
assert.deepStrictEqual(hooks.problems, [{ key: 'hooks.stop_check', reason: 'hooks.stop_check must be a boolean' }]);
const hooksBad = parseFxJson({ hooks: [] });
assert.ok(hooksBad.ok);
assert.strictEqual(hooksBad.value.hooks, undefined);
assert.deepStrictEqual(hooksBad.problems, [{ key: 'hooks', reason: 'hooks must be an object' }]);
const hooksOk = parseFxJson({ hooks: { stop_check: false, edit_rules: false } });
assert.ok(hooksOk.ok);
assert.deepStrictEqual(hooksOk.value.hooks, { stop_check: false, edit_rules: false });

// A repository's own rules are ignored silently (ADR 0049): no value, no problem.
const rules = parseFxJson({ rules: [{ id: 'fk-index', glob: 'db/migrate/*.rb', rule: 'Every foreign key gets an index.' }] });
assert.ok(rules.ok);
assert.strictEqual('rules' in rules.value, false);
assert.deepStrictEqual(rules.problems, []);
const notArray = parseFxJson({ rules: 'x' });
assert.ok(notArray.ok);
assert.deepStrictEqual(notArray.problems, []);

console.log('fx-json.test.js: ok');
