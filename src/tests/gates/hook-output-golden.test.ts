// What each hook prints, pinned at the process seam: stdin in, stdout, stderr
// and exit code out. Every case under fixtures/hook-golden is three files:
//
//   <case>.input.json     the stdin bytes, verbatim (some cases are not JSON on
//                         purpose); {{CWD}} becomes the fixture directory
//   <case>.meta.json      the hook, the fixture it runs in (`main` checkout or
//                         linked `worktree`, from scripts/make-git-fixture), an
//                         optional `broken` library replaced by `stub` (default:
//                         a file that throws on load), and the recorded exit
//                         code and stderr
//   <case>.expected.txt   the recorded stdout
//
//     node tests/gates/hook-output-golden.test.js            compare
//     node tests/gates/hook-output-golden.test.js --record   rewrite the recorded side
//
// --record is for an intended change, such as a PREAMBLE.md edit, and the
// commit that uses it says so. It never makes a port pass.
//
// Every hook run gets a scratch HOME, CODEX_HOME and TMPDIR, so nothing is
// planted into a real Codex home and identity records stay in the scratch tree.
import * as assert from 'assert';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseJson } from '../../lib/json.js';

const ROOT = path.join(__dirname, '..', '..');
const CASES = path.join(__dirname, 'fixtures', 'hook-golden');
const RECORD = process.argv.includes('--record');

interface Meta {
  hook: string;
  cwd: 'main' | 'worktree';
  broken?: string;
  stub?: string;
  exit?: number | null;
  stderr?: string;
}

function readMeta(file: string): Meta {
  const m = parseJson(fs.readFileSync(file, 'utf8'));
  if (typeof m !== 'object' || m === null || !('hook' in m) || typeof m.hook !== 'string'
      || !('cwd' in m) || (m.cwd !== 'main' && m.cwd !== 'worktree')) {
    throw new Error(`${file}: needs a string "hook" and a "cwd" of "main" or "worktree"`);
  }
  const meta: Meta = { hook: m.hook, cwd: m.cwd };
  if ('broken' in m && typeof m.broken === 'string') meta.broken = m.broken;
  if ('stub' in m && typeof m.stub === 'string') meta.stub = m.stub;
  if ('exit' in m && (typeof m.exit === 'number' || m.exit === null)) meta.exit = m.exit;
  if ('stderr' in m && typeof m.stderr === 'string') meta.stderr = m.stderr;
  return meta;
}

// The one place machine-specific values are normalised: the scratch tree a
// case runs in becomes <scratch> and this checkout becomes <root>, each under
// its given and its real path.
function normalise(text: string, scratch: string): string {
  const pairs: [string, string][] = [
    [fs.realpathSync(scratch), '<scratch>'], [scratch, '<scratch>'],
    [fs.realpathSync(ROOT), '<root>'], [ROOT, '<root>'],
  ];
  return pairs.reduce((out, [from, to]) => out.split(from).join(to), text);
}

function run(name: string, meta: Meta): { stdout: string; stderr: string; exit: number | null } {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-hook-golden-'));
  try {
    const home = path.join(scratch, 'home');
    fs.mkdirSync(home);
    const env = {
      PATH: process.env.PATH ?? '', HOME: home, CODEX_HOME: home, TMPDIR: home,
      XDG_CONFIG_HOME: path.join(scratch, 'config'), XDG_STATE_HOME: path.join(scratch, 'state'),
      APPDATA: path.join(scratch, 'appdata'), LOCALAPPDATA: path.join(scratch, 'localappdata'),
    };
    const fix = spawnSync(path.join(ROOT, 'scripts', 'make-git-fixture'), [path.join(scratch, 'repo')], { env, encoding: 'utf8' });
    const [main, worktree] = fix.stdout.trim().split(' ');
    if (fix.status !== 0 || !main || !worktree) throw new Error(`${name}: make-git-fixture failed: ${fix.stderr}`);
    const cwd = meta.cwd === 'worktree' ? worktree : main;

    // A failed load runs the hook from a copy whose one library throws.
    let base = ROOT;
    if (meta.broken) {
      base = path.join(scratch, 'copy');
      for (const dir of ['hooks', 'lib', path.join('codex', 'agents')]) {
        fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      }
      fs.writeFileSync(path.join(base, meta.broken), meta.stub ?? "throw new Error('load')\n");
    }

    const input = fs.readFileSync(path.join(CASES, `${name}.input.json`), 'utf8')
      .split('{{CWD}}').join(JSON.stringify(cwd).slice(1, -1));
    // A hook that hangs fails its case instead of hanging the gate: status is null.
    const r = spawnSync(process.execPath, [path.join(base, 'hooks', meta.hook)], { input, cwd, env, encoding: 'utf8', timeout: 10000 });
    return { stdout: normalise(r.stdout, scratch), stderr: normalise(r.stderr, scratch), exit: r.status };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

const names = fs.readdirSync(CASES).filter((f) => f.endsWith('.meta.json')).map((f) => f.slice(0, -'.meta.json'.length)).sort();
assert.ok(names.length > 0, `no cases under ${CASES}`);

const failures: string[] = [];
for (const name of names) {
  const metaFile = path.join(CASES, `${name}.meta.json`);
  const meta = readMeta(metaFile);
  const got = run(name, meta);
  if (RECORD) {
    fs.writeFileSync(path.join(CASES, `${name}.expected.txt`), got.stdout);
    fs.writeFileSync(metaFile, `${JSON.stringify({ hook: meta.hook, cwd: meta.cwd, broken: meta.broken, stub: meta.stub, exit: got.exit, stderr: got.stderr }, null, 2)}\n`);
    continue;
  }
  const want = fs.readFileSync(path.join(CASES, `${name}.expected.txt`), 'utf8');
  if (got.stdout !== want) failures.push(`${name}: stdout\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got.stdout)}`);
  if (got.exit !== meta.exit) failures.push(`${name}: exit want ${meta.exit} got ${got.exit}`);
  if (got.stderr !== meta.stderr) failures.push(`${name}: stderr\n  want ${JSON.stringify(meta.stderr)}\n  got  ${JSON.stringify(got.stderr)}`);
}

if (failures.length) {
  console.error(`hook-output-golden: ${failures.length} difference(s)\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`hook-output-golden.test.js: ${RECORD ? 'recorded' : 'ok'} (${names.length} cases)`);
