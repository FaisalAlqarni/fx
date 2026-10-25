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

const gl = parseFxJson({ glossary_rename: 'yes' });
assert.ok(gl.ok);
assert.strictEqual('glossary_rename' in gl.value, false);
assert.deepStrictEqual(gl.problems, [{ key: 'glossary_rename', reason: 'glossary_rename must be "declined"' }]);
const glOk = parseFxJson({ glossary_rename: 'declined' });
assert.ok(glOk.ok);
assert.strictEqual(glOk.value.glossary_rename, 'declined');

const sm = parseFxJson({ scratch_migrate: 'yes' });
assert.ok(sm.ok);
assert.strictEqual('scratch_migrate' in sm.value, false);
assert.deepStrictEqual(sm.problems, [{ key: 'scratch_migrate', reason: 'scratch_migrate must be "declined"' }]);
const smOk = parseFxJson({ scratch_migrate: 'declined' });
assert.ok(smOk.ok);
assert.strictEqual(smOk.value.scratch_migrate, 'declined');
assert.deepStrictEqual(smOk.problems, []);

const df = parseFxJson({ docs_first_run: 'yes' });
assert.ok(df.ok);
assert.strictEqual('docs_first_run' in df.value, false);
assert.deepStrictEqual(df.problems, [{ key: 'docs_first_run', reason: 'docs_first_run must be "declined"' }]);
const dfOk = parseFxJson({ docs_first_run: 'declined' });
assert.ok(dfOk.ok);
assert.strictEqual(dfOk.value.docs_first_run, 'declined');
assert.deepStrictEqual(dfOk.problems, []);

console.log('fx-json.test.js: ok');
