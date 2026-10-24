import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { readRepoConfig, repoRoot } from './repo-config.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-repo-config-'));
process.on('exit', () => fs.rmSync(root, { recursive: true, force: true }));
const mk = (name: string) => { const d = path.join(root, name); fs.mkdirSync(d, { recursive: true }); return d; };

const none = mk('none');
assert.deepStrictEqual(readRepoConfig(none), {
  hooks: { stopCheck: true, loopNudge: true, editRules: true },
  checks: { test_one: null, test_scope: null, test_all: null, lint: null, setup: null },
});

const some = mk('some');
fs.writeFileSync(path.join(some, '.fx.json'), '{"hooks":{"stop_check":false},"test_all":"make test","setup":"make setup"}');
const c = readRepoConfig(some);
assert.deepStrictEqual(c.hooks, { stopCheck: false, loopNudge: true, editRules: true });
assert.strictEqual(c.checks.test_all, 'make test');
assert.strictEqual(c.checks.setup, 'make setup');
assert.strictEqual(c.checks.lint, null);

const bad = mk('bad');
fs.writeFileSync(path.join(bad, '.fx.json'), '{"hooks":{"edit_rules":"no"}}');
assert.strictEqual(readRepoConfig(bad).hooks.editRules, true);
const broken = mk('broken');
fs.writeFileSync(path.join(broken, '.fx.json'), 'not json');
assert.strictEqual(readRepoConfig(broken).hooks.stopCheck, true, 'unparseable file: defaults');
const old = mk('old');
fs.writeFileSync(path.join(old, '.fx.json'), '{"hooks":{"shell_guard":false}}');
assert.deepStrictEqual(readRepoConfig(old).hooks, { stopCheck: true, loopNudge: true, editRules: true }, 'an old key name is ignored');

// The git top level wins; a nested .fx.json is never read.
const repo = mk('repo');
assert.strictEqual(spawnSync('git', ['init', '-q'], { cwd: repo }).status, 0);
fs.writeFileSync(path.join(repo, '.fx.json'), '{"hooks":{"stop_check":false}}');
const sub = path.join(repo, 'sub');
fs.mkdirSync(sub);
fs.writeFileSync(path.join(sub, '.fx.json'), '{"hooks":{"stop_check":true,"edit_rules":false}}');
const nested = readRepoConfig(sub);
assert.strictEqual(nested.hooks.stopCheck, false);
assert.strictEqual(nested.hooks.editRules, true);
assert.strictEqual(fs.realpathSync(repoRoot(sub)), fs.realpathSync(repo));

// Outside any repository the directory's own file is read.
assert.strictEqual(repoRoot(some), some);
assert.strictEqual(readRepoConfig(some).hooks.stopCheck, false);
assert.strictEqual(repoRoot(path.join(root, 'does-not-exist')), path.join(root, 'does-not-exist'));
console.log('repo-config.test.js: ok');
