'use strict';
// Task 16 fix round 1. fx-setup's Codex command loads lib/plant-roles.js
// from FX, a path the agent infers. A repo file could steer that inference,
// so the command vets FX before it requires anything from it. The vetting is
// inline in the command: a check loaded from FX could not vet FX, because a
// fake root would ship its own check.
//
// This runs the command exactly as commands/fx-setup.md ships it, with FX
// substituted, from a scratch repo as cwd, against a scratch CODEX_HOME.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const md = fs.readFileSync(path.join(root, 'commands', 'fx-setup.md'), 'utf8');
const blocks = [...md.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)].map((m) => m[1].trim())
  .filter((b) => b.includes('plant-roles'));
assert.strictEqual(blocks.length, 1, `one command loads plant-roles, found ${blocks.length}`);
const command = blocks[0];
assert.ok(command.endsWith('"FX"'), 'the command takes FX as its last argument');

const s = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-setup-root-'));
process.on('exit', () => fs.rmSync(s, { recursive: true, force: true }));
const repo = path.join(s, 'repo');
fs.mkdirSync(repo);

// A fake fx root: the manifest, PREAMBLE.md, and a plant-roles that leaves a
// marker when it is loaded.
const marker = path.join(s, 'fake-loaded');
function fakeRoot(dir, { manifest = true } = {}) {
  fs.mkdirSync(path.join(dir, 'lib'), { recursive: true });
  if (manifest) {
    fs.mkdirSync(path.join(dir, '.codex-plugin'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.codex-plugin', 'plugin.json'), '{"name":"fx"}');
  }
  fs.writeFileSync(path.join(dir, 'PREAMBLE.md'), '# fx\n');
  fs.writeFileSync(path.join(dir, 'lib', 'plant-roles.js'),
    `require('fs').writeFileSync(${JSON.stringify(marker)}, 'x'); module.exports = {};`);
  return dir;
}
function run(fx) {
  const cmd = command.slice(0, -'"FX"'.length) + JSON.stringify(fx);
  const env = { ...process.env, HOME: s, TMPDIR: s, CODEX_HOME: path.join(s, 'codex') };
  return spawnSync('bash', ['-c', cmd], { cwd: repo, env, encoding: 'utf8' });
}
function refused(fx, label) {
  const r = run(fx);
  assert.notStrictEqual(r.status, 0, `${label}: must be refused`);
  assert.match(r.stderr, /refusing/i, `${label}: says why (${r.stderr.trim()})`);
  assert.ok(!fs.existsSync(marker), `${label}: nothing was loaded from it`);
  assert.ok(!fs.existsSync(path.join(s, 'codex', 'agents')), `${label}: nothing was planted`);
}

refused(fakeRoot(path.join(repo, 'vendor', 'fx')), 'a fake root inside cwd');
refused(repo, 'cwd itself');
refused(fakeRoot(path.join(s, 'no-manifest'), { manifest: false }), 'a root without an fx manifest');
fs.mkdirSync(path.join(s, 'no-preamble', '.claude-plugin'), { recursive: true });
fs.writeFileSync(path.join(s, 'no-preamble', '.claude-plugin', 'plugin.json'), '{"name":"fx"}');
refused(path.join(s, 'no-preamble'), 'a root without PREAMBLE.md');
fs.symlinkSync(path.join(repo, 'vendor', 'fx'), path.join(s, 'link-into-repo'));
refused(path.join(s, 'link-into-repo'), 'a symlink outside cwd that resolves inside it');

const ok = run(root);
assert.strictEqual(ok.status, 0, `the real plugin root passes: ${ok.stderr}`);
const out = JSON.parse(ok.stdout);
assert.strictEqual(out.written.length, 6, 'all six roles planted on a fresh CODEX_HOME');
assert.strictEqual(out.audit.present.length, 6, 'and audited present');
assert.ok('hooksTrusted' in out, 'and hook trust reported');

console.log('fx-setup-root-check: passed');
