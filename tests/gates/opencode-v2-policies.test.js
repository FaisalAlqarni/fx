'use strict';
// The v2 policy layer and the guard agree in both directions: every pattern
// the installer writes matches commands the guard refuses, and matches none
// of the commands the guard allows. `match` copies OpenCode 2.0.18's
// Wildcard.match (packages/core/src/util/wildcard.ts), since a policy can
// never be overridden by the user.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const { GUARD_POLICIES } = require(path.join(root, 'lib', 'opencode-v2-policies'));
const { inspect } = require(path.join(root, 'lib', 'git-guard'));

function match(input, pattern) {
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  if (escaped.endsWith(' .*')) escaped = escaped.slice(0, -3) + '( .*)?';
  return new RegExp('^' + escaped + '$', 's').test(input);
}
const matchesAny = (cmd) => GUARD_POLICIES.some((p) => match(`shell:${cmd}`, p.resource));

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-pol-'));
execFileSync('git', ['init', '-q', '-b', 'main', repo]);

assert.ok(Array.isArray(GUARD_POLICIES) && GUARD_POLICIES.length >= 10, 'a policy list exists');
for (const p of GUARD_POLICIES) {
  assert.strictEqual(p.action, 'permission');
  assert.strictEqual(p.effect, 'deny');
  assert.ok(p.resource.startsWith('shell:'), `${p.resource} is a shell pattern`);
  assert.ok(!p.resource.includes('?'), `${p.resource} has no ? (v2 reads it as any character)`);
  assert.ok(typeof p.sample === 'string' && p.sample.length, `${p.resource} has a sample`);
  assert.strictEqual(inspect(p.sample, repo).allow, false, `the guard refuses ${p.resource}'s sample: ${p.sample}`);
  assert.ok(match(`shell:${p.sample}`, p.resource), `${p.resource} matches its own sample: ${p.sample}`);
  assert.ok(Array.isArray(p.allowed) && p.allowed.length, `${p.resource} has allowed samples`);
  for (const ok of p.allowed) {
    assert.strictEqual(inspect(ok, repo).allow, true, `the guard allows ${p.resource}'s allowed sample: ${ok}`);
    assert.ok(!match(`shell:${ok}`, p.resource), `${p.resource} does not block ${ok}`);
  }
}
for (const needle of ['--force', '--no-verify', 'reset --hard', 'clean -f', 'branch -D', 'stash drop', 'checkout .', 'tag -d', '--delete']) {
  assert.ok(GUARD_POLICIES.some((p) => p.resource.includes(needle)), `a policy covers ${needle}`);
}
for (const ok of ['git push origin main-fix', 'git checkout .github/x', 'git log --grep no-verify', 'git status', 'git push origin feature']) {
  assert.ok(!matchesAny(ok), `no policy blocks ${ok}`);
}
fs.rmSync(repo, { recursive: true, force: true });
console.log('opencode-v2-policies.test.js: OK');
