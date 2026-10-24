// Run: node tests/gates/shell-guard-claude.test.js
// The shell guard on Claude Code, at the process seam: hooks/fx-pretooluse.js
// under scratch homes. No command here is ever run: the guard only decides on
// the command string.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { readDecisionLog, runHook, scratchHookEnv, type HookDirs } from '../helpers/hook-env.js';
import { parseJson } from '../../lib/json.js';

const ROOT = path.join(__dirname, '..', '..');
const HOOK = path.join(ROOT, 'hooks', 'fx-pretooluse.js');
const TURN = path.join(ROOT, 'hooks', 'fx-turn.js');
const RM_ROOT = '[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.\n';
const FORCE_PUSH = '[fx] force push rewrites history that has already left the machine.\n';

// Reads a nested field of a parsed JSON value.
function get(v: unknown, ...keys: string[]): unknown {
  let cur = v;
  for (const k of keys) cur = typeof cur === 'object' && cur !== null ? Reflect.get(cur, k) : undefined;
  return cur;
}

function gitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-shell-guard-repo-'));
  spawnSync('git', ['init', '-q', dir]);
  return dir;
}

async function main(): Promise<void> {
  const cleanups: (() => void)[] = [];
  const env = () => {
    const e = scratchHookEnv();
    cleanups.push(e.cleanup);
    return e;
  };
  const repo = gitRepo();
  cleanups.push(() => fs.rmSync(repo, { recursive: true, force: true }));
  const payload = (command: string, extra: Record<string, unknown> = {}, cwd = repo) =>
    ({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Bash', tool_input: { command }, cwd, ...extra });
  const prompt = (e: NodeJS.ProcessEnv, text: string) =>
    runHook(TURN, { hook_event_name: 'UserPromptSubmit', session_id: 's1', cwd: repo, prompt: text }, e);
  const fxJson = (text: string) => fs.writeFileSync(path.join(repo, '.fx.json'), text);
  const noFxJson = () => fs.rmSync(path.join(repo, '.fx.json'), { force: true });
  // The source of the last decision-log line, or null when the call logged nothing.
  const lastSource = (dirs: HookDirs, before: number) => {
    const log = readDecisionLog(dirs);
    return log.length > before ? get(log.at(-1), 'source') : null;
  };

  try {
    // 1. A hard rule.
    {
      const { env: e, dirs } = env();
      const r = await runHook(HOOK, payload('rm -rf ~'), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, RM_ROOT);
      const log = readDecisionLog(dirs);
      assert.strictEqual(log.length, 1);
      assert.strictEqual(get(log[0], 'source'), 'hard-rule');
      assert.strictEqual(get(log[0], 'action'), 'deny');
    }
    // A command that is present but not a string is refused, as on Codex (final review I4).
    {
      const { env: e } = env();
      const r = await runHook(HOOK, { ...payload(''), tool_input: { command: ['npm', 'publish'] } }, e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, '[fx] the shell command is not a string (object), so the guards cannot read it. Denying rather than assuming it is safe.\n');
    }
    // 2. A stamp after a user prompt does not touch a hard rule.
    {
      const { env: e } = env();
      await prompt(e, 'wipe my home directory');
      const r = await runHook(HOOK, payload('rm -rf ~ # fx-ok: user asked'), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, RM_ROOT);
    }
    // 4. Read-only: no log line.
    {
      const { env: e, dirs } = env();
      const r = await runHook(HOOK, payload('ls -la'), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
      assert.deepStrictEqual(readDecisionLog(dirs), []);
    }
    // 5. The repo's own check command runs silently; chained, it is grey.
    {
      const { env: e, dirs } = env();
      fxJson('{"test_all":"make test"}');
      let r = await runHook(HOOK, payload('make test'), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
      // Silent to the user, but logged: .fx.json is writable by the agent (final review, lens I1).
      assert.deepStrictEqual(readDecisionLog(dirs).map((l) => [get(l, 'source'), get(l, 'action')]), [['repo-command', 'allow']]);
      r = await runHook(HOOK, payload('make test; npm publish'), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(lastSource(dirs, 1), 'grey');
      noFxJson();
    }
    // 11. A grey command: allowed, silent, logged.
    {
      const { env: e, dirs } = env();
      const r = await runHook(HOOK, payload('npm publish'), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
      assert.deepStrictEqual(readDecisionLog(dirs).map((l) => [get(l, 'source'), get(l, 'action')]), [['grey', 'allow']]);
    }
    // Fix round 1, lens C1 and I7: the repo's own command runs silently only
    // as written: no second line, no option or path that changes what runs.
    {
      const { env: e, dirs } = env();
      fxJson('{"test_all":"make test","test_scope":"scripts/test-scope {paths}","setup":"npm ci"}');
      for (const cmd of ['make test\nnpm publish', 'make test\r\nnpm publish', 'scripts/test-scope lib/a.js\nnpm publish', 'make test -f /tmp/evil.mk', 'make test --eval=x', 'make test SHELL=/tmp/x',
        'scripts/test-scope-evil a', 'scripts/test-scope/../../tmp/x.sh', 'scripts/test-scope ../../tmp/x.sh', 'npm ci evil-package']) {
        const before = readDecisionLog(dirs).length;
        await runHook(HOOK, payload(cmd), e);
        assert.strictEqual(lastSource(dirs, before), 'grey', JSON.stringify(cmd));
      }
      for (const cmd of ['make test', 'scripts/test-scope lib/a.js src/b.ts', 'npm ci']) {
        const before = readDecisionLog(dirs).length;
        await runHook(HOOK, payload(cmd), e);
        assert.strictEqual(lastSource(dirs, before), 'repo-command', JSON.stringify(cmd));
      }
      noFxJson();
    }
    // Fix round 1, lens I8: the agent cannot write fx's own state, where the session journals are kept.
    {
      const { env: e, dirs } = env();
      const file = path.join(dirs.state, 'sessions', 's1.jsonl');
      for (const tool of ['Write', 'Edit', 'MultiEdit']) {
        const r = await runHook(HOOK, { hook_event_name: 'PreToolUse', session_id: 's1', tool_name: tool, tool_input: { file_path: file, content: 'x' }, cwd: repo }, e);
        assert.strictEqual(r.code, 2, `${tool}: ${r.err}`);
        assert.strictEqual(r.err, '[fx] refused: the fx state and config directories hold the decision log, session journals and fx config, which only fx writes. This rule has no override.\n');
      }
      const r = await runHook(HOOK, payload(`printf x >> ${file}`), e);
      assert.strictEqual(r.code, 2, r.err);
      const ok = await runHook(HOOK, { hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Write', tool_input: { file_path: path.join(repo, 'a.txt'), content: 'x' }, cwd: repo }, e);
      assert.strictEqual(ok.code, 0, ok.err);
    }
    // Final review, lens I2: nor fx's config directory.
    {
      const { env: e, dirs } = env();
      const r = await runHook(HOOK, { hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Write', tool_input: { file_path: path.join(dirs.config, 'x.json'), content: '{}' }, cwd: repo }, e);
      assert.strictEqual(r.code, 2, r.err);
    }
    // Fix round 1, lens I9: a read-only git command is grey when the repo's config can make git run a program.
    {
      const { env: e, dirs } = env();
      let before = readDecisionLog(dirs).length;
      await runHook(HOOK, payload('git status'), e);
      assert.strictEqual(lastSource(dirs, before), null, 'plain git status is read-only');
      for (const [key, value] of [['core.fsmonitor', './x'], ['diff.external', './x'], ['diff.x.textconv', './x'], ['core.pager', './x']]) {
        spawnSync('git', ['-C', repo, 'config', key!, value!]);
        before = readDecisionLog(dirs).length;
        await runHook(HOOK, payload('git status'), e);
        await runHook(HOOK, payload('git log --oneline -5'), e);
        spawnSync('git', ['-C', repo, 'config', '--unset', key!]);
        assert.deepStrictEqual(readDecisionLog(dirs).slice(before).map((l) => get(l, 'source')), ['grey', 'grey'], `${key} set: git status and git log are grey`);
      }
    }

    // 20 to 22 run in the git fixture's worktree.
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-shell-guard-fixture-'));
    cleanups.push(() => fs.rmSync(scratch, { recursive: true, force: true }));
    const fix = spawnSync(path.join(ROOT, 'scripts', 'make-git-fixture'), [path.join(scratch, 'repo')], { encoding: 'utf8' });
    const worktree = fix.stdout.trim().split(' ')[1];
    assert.ok(fix.status === 0 && worktree, fix.stderr);
    // 20. The git guard still refuses first.
    {
      const { env: e } = env();
      const r = await runHook(HOOK, payload('git push --force origin main', {}, worktree), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, FORCE_PUSH);
    }
    // 21, 22. A broken shell guard lets the call through and says so (red team I8).
    const broken = (name: string, stub: string, file = 'shell-guard.js') => {
      const base = path.join(scratch, name);
      for (const dir of ['hooks', 'lib']) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.writeFileSync(path.join(base, 'lib', file), stub);
      return path.join(base, 'hooks', 'fx-pretooluse.js');
    };
    const guardOff = (out: string) => get(parseJson(out), 'systemMessage');
    const cases: [string, string, string][] = [
      ['hostile', "exports.guardShell = () => Promise.reject({ get message() { throw new Error('m'); }, toString() { throw new Error('s'); } });\n", '[fx] shell guard off: an error that could not be printed'],
      ['load', "throw new Error('load')\n", '[fx] shell guard off: load'],
      ['async', "exports.guardShell = () => Promise.reject(new Error('async'));\n", '[fx] shell guard off: async'],
      ['timer', "exports.guardShell = () => { setTimeout(() => { throw new Error('timer'); }, 10); return new Promise(() => {}); };\n", '[fx] shell guard off: timer'],
    ];
    for (const [name, stub, want] of cases) {
      const hook = broken(name, stub);
      const { env: e, dirs } = env();
      let r = await runHook(hook, payload('npm publish', {}, worktree), e);
      assert.strictEqual(r.code, 0, `${name}: ${r.err}`);
      assert.strictEqual(guardOff(r.out), want, name);
      // Task 05 fix round 1 (lens SF 3 mirror): the fail-open allow is in the decision log.
      const log = readDecisionLog(dirs);
      assert.deepStrictEqual(log.map((l) => [get(l, 'source'), get(l, 'action'), get(l, 'harness')]), [['guard-error', 'allow', 'claude-code']], name);
      assert.ok(r.ms < 5000, `${name}: took ${r.ms} ms`);
      r = await runHook(hook, payload('git push --force origin main', {}, worktree), e);
      assert.strictEqual(r.code, 2, name);
      assert.strictEqual(r.err, FORCE_PUSH, name);
    }
    // Fix round 1, lens I10: the hard rules do not depend on the rest of the guard.
    // A broken shell guard still refuses them; broken hard rules refuse every shell call.
    for (const [name, stub] of [['guard', "throw new Error('load')\n"], ['guard-dep', "throw new Error('load')\n"]]) {
      const hook = name === 'guard' ? broken(name!, stub!) : broken(name!, stub!, 'evidence.js');
      const { env: e } = env();
      const r = await runHook(hook, payload('rm -rf ~', {}, worktree), e);
      assert.strictEqual(r.code, 2, `${name}: ${r.err}`);
      assert.strictEqual(r.err, RM_ROOT, name);
    }
    {
      const hook = broken('rules', "throw new Error('load')\n", 'shell-rules.js');
      const { env: e } = env();
      for (const cmd of ['npm publish', 'ls']) {
        const r = await runHook(hook, payload(cmd, {}, worktree), e);
        assert.strictEqual(r.code, 2, cmd);
        assert.strictEqual(r.err, '[fx] shell rules failed to load (load). Denying every shell command until the plugin is repaired.\n');
      }
    }
  } finally {
    for (const c of cleanups) c();
  }
  console.log('shell-guard-claude.test.js: ok');
}

main().catch((e) => { console.error(e); process.exit(1); });
