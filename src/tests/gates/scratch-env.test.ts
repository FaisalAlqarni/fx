// scripts/scratch-env as a process, and the TMPDIR that scratchHookEnv and
// applyScratchEnv now set: every test run keeps HOME, the XDG and Windows
// directories and TMPDIR out of the owner's home.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { applyScratchEnv, scratchHookEnv } from '../helpers/hook-env.js';

const root = path.join(__dirname, '..', '..');
const KEYS = ['HOME', 'XDG_CONFIG_HOME', 'XDG_STATE_HOME', 'APPDATA', 'LOCALAPPDATA', 'TMPDIR'];

const r = spawnSync(path.join(root, 'scripts', 'scratch-env'),
  ['node', '-e', `console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(KEYS)}.map((k) => [k, process.env[k]]))))`],
  { encoding: 'utf8' });
assert.strictEqual(r.status, 0, r.stderr);
const named = /^scratch-env: (\S+)$/m.exec(r.stderr);
assert.ok(named, `stderr names the scratch directory: ${r.stderr}`);
const dir = named[1] ?? '';
const seen: Record<string, unknown> = JSON.parse(r.stdout); // ts-gate-ok: the test parses output its own child printed
for (const k of KEYS) {
  const v = seen[k];
  assert.ok(typeof v === 'string' && v.startsWith(`${dir}/`), `${k} is inside ${dir}: ${String(v)}`);
  assert.notStrictEqual(v, os.homedir(), `${k} is not the caller's HOME`);
  assert.ok(fs.statSync(v).isDirectory(), `${k} exists`);
}

const s = scratchHookEnv();
try {
  assert.strictEqual(s.env.TMPDIR, path.join(s.dirs.root, 'tmp'));
  assert.ok(fs.statSync(path.join(s.dirs.root, 'tmp')).isDirectory(), 'the scratch TMPDIR exists');
} finally {
  s.cleanup();
}

const before = process.env.TMPDIR;
const applied = applyScratchEnv();
assert.strictEqual(process.env.TMPDIR, path.join(applied.dirs.root, 'tmp'));
applied.restore();
assert.strictEqual(process.env.TMPDIR, before, 'restore puts the old TMPDIR back');

console.log('scratch-env: ok');
