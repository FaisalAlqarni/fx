// What a repository's .fx.json says to the hooks. Read from the git top
// level, never from a directory the agent cd'd into below it, so a nested
// .fx.json cannot switch anything off.
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { parseFxJson } from './fx-json.js';
import { parseJson } from './json.js';

export type HookSwitches = { stopCheck: boolean; loopNudge: boolean; editRules: boolean };
export type CheckCommands = { test_one: string | null; test_scope: string | null; test_all: string | null; lint: string | null; setup: string | null };

export function repoRoot(cwd: string): string {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, timeout: 2000, encoding: 'utf8' });
  const top = r.status === 0 ? r.stdout.trim() : '';
  return top === '' ? cwd : top;
}

export function readRepoConfig(cwd: string): { hooks: HookSwitches; checks: CheckCommands } {
  const out = {
    hooks: { stopCheck: true, loopNudge: true, editRules: true },
    checks: { test_one: null, test_scope: null, test_all: null, lint: null, setup: null } as CheckCommands,
  };
  try {
    const parsed = parseFxJson(parseJson(fs.readFileSync(path.join(repoRoot(cwd), '.fx.json'), 'utf8')));
    if (!parsed.ok) return out;
    const h = parsed.value.hooks;
    out.hooks = { stopCheck: h?.stop_check ?? true, loopNudge: h?.loop_nudge ?? true, editRules: h?.edit_rules ?? true };
    for (const k of Object.keys(out.checks) as (keyof CheckCommands)[]) out.checks[k] = parsed.value[k] ?? null;
  } catch { /* missing or unreadable: defaults */ }
  return out;
}
