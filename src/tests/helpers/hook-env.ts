// Runs hooks and fx processes under scratch home, config and state
// directories, so a developer's own fx state or decision log never changes
// a result and is never written.
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
import { parseFxEnv } from '../../lib/env.js';
import { fxConfigDir, fxStateDir } from '../../lib/fx-paths.js';
import { parseJson } from '../../lib/json.js';

export interface HookDirs { root: string; home: string; config: string; state: string }

export function scratchHookEnv(): { env: NodeJS.ProcessEnv; dirs: HookDirs; cleanup: () => void } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-hook-env-'));
  const home = path.join(root, 'home');
  fs.mkdirSync(home);
  fs.mkdirSync(path.join(root, 'tmp'));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(root, 'config'),
    XDG_STATE_HOME: path.join(root, 'state'),
    APPDATA: path.join(root, 'appdata'),
    LOCALAPPDATA: path.join(root, 'localappdata'),
    TMPDIR: path.join(root, 'tmp'),
  };
  const fx = parseFxEnv(env);
  const dirs = { root, home, config: fxConfigDir(process.platform, fx, home), state: fxStateDir(process.platform, fx, home) };
  return { env, dirs, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

// For a test that imports a plugin in-process: the scratch directories go
// into process.env itself, and restore() puts back what was there.
export function applyScratchEnv(): { dirs: HookDirs; restore: () => void } {
  const { env, dirs, cleanup } = scratchHookEnv();
  const keys = ['HOME', 'USERPROFILE', 'XDG_CONFIG_HOME', 'XDG_STATE_HOME', 'APPDATA', 'LOCALAPPDATA', 'TMPDIR'];
  const saved = keys.map((k) => [k, process.env[k]] as const);
  for (const k of keys) process.env[k] = env[k];
  return {
    dirs,
    restore: () => {
      for (const [k, v] of saved) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      cleanup();
    },
  };
}

export function readDecisionLog(dirs: HookDirs): unknown[] {
  const file = path.join(dirs.state, 'decisions.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => parseJson(line));
}

// Asynchronous on purpose: a synchronous spawn blocks the event loop, and a
// fake server in the same process would never answer.
export function runHook(
  file: string,
  payload: unknown,
  env: NodeJS.ProcessEnv,
  opts: { cwd?: string; args?: string[] } = {},
): Promise<{ code: number | null; out: string; err: string; ms: number }> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn('node', [file, ...(opts.args ?? [])], { env, cwd: opts.cwd });
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8').on('data', (d: string) => { out += d; });
    child.stderr.setEncoding('utf8').on('data', (d: string) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, err, ms: Date.now() - start }));
    if (payload !== undefined) child.stdin.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    child.stdin.end();
  });
}
