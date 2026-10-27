// Run: node tests/gates/shell-guard-codex.test.js
// The shell guard and the prompt record on Codex, at the process seam:
// hooks/fx-codex.js under scratch homes. No command here is ever run: the
// guard only decides on the command string.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { readDecisionLog, rootToToken, runHook, scratchHookEnv, type HookDirs } from '../helpers/hook-env.js';
import { parseJson } from '../../lib/json.js';
import { stopReason } from '../../lib/stop-check.js';

const ROOT = path.join(__dirname, '..', '..');
const HOOK = path.join(ROOT, 'hooks', 'fx-codex.js');
const RM_ROOT = '[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.\n';
const WIN_WIPE = '[fx] refused: recursive deletion of a drive root or home directory cannot be undone. This rule has no override.\n';
const FORCE_PUSH = '[fx] force push rewrites history that has already left the machine.\n';

function get(v: unknown, ...keys: string[]): unknown {
  let cur = v;
  for (const k of keys) cur = typeof cur === 'object' && cur !== null ? Reflect.get(cur, k) : undefined;
  return cur;
}
const keys = (v: unknown) => (typeof v === 'object' && v !== null ? Object.keys(v).sort() : []);
// The warn form: exactly systemMessage and hookSpecificOutput { hookEventName, additionalContext }, same text.
function warned(out: string): unknown {
  const o = parseJson(out);
  assert.deepStrictEqual(keys(o), ['hookSpecificOutput', 'systemMessage'], out);
  assert.deepStrictEqual(keys(get(o, 'hookSpecificOutput')), ['additionalContext', 'hookEventName'], out);
  assert.strictEqual(get(o, 'hookSpecificOutput', 'hookEventName'), 'PreToolUse');
  assert.strictEqual(get(o, 'hookSpecificOutput', 'additionalContext'), get(o, 'systemMessage'));
  return get(o, 'systemMessage');
}

async function main(): Promise<void> {
  const cleanups: (() => void)[] = [];
  // CODEX_HOME and TMPDIR in scratch too: roles and identity records land there.
  const env = () => {
    const e = scratchHookEnv();
    cleanups.push(e.cleanup);
    return { env: { ...e.env, CODEX_HOME: e.dirs.home, TMPDIR: e.dirs.root }, dirs: e.dirs };
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-shell-guard-codex-'));
  spawnSync('git', ['init', '-q', tmp]);
  cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const payload = (command: string, extra: Record<string, unknown> = {}, cwd = tmp) =>
    ({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Bash', tool_input: { command }, cwd, ...extra });
  const prompt = (e: NodeJS.ProcessEnv, text: string, extra: Record<string, unknown> = {}) =>
    runHook(HOOK, { hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: text, cwd: tmp, ...extra }, e);
  const journalText = (dirs: HookDirs, name: string) => {
    const file = path.join(dirs.state, 'sessions', `${name}.jsonl`);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  };
  const journal = (dirs: HookDirs, name: string) => journalText(dirs, name).split('\n').filter(Boolean).map((l) => parseJson(l));

  try {
    // A hard rule: exit 2 with the rule's text.
    {
      const { env: e } = env();
      const r = await runHook(HOOK, payload('rm -rf ~'), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, RM_ROOT);
    }
    // A grey command runs silently and is logged: Codex has no ask.
    {
      const { env: e, dirs } = env();
      const r = await runHook(HOOK, payload('npm publish'), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
      assert.deepStrictEqual(readDecisionLog(dirs).map((l) => [get(l, 'source'), get(l, 'action'), get(l, 'harness')]), [['grey', 'allow', 'codex']]);
    }
    // Read-only: silent, no log line.
    {
      const { env: e, dirs } = env();
      const r = await runHook(HOOK, payload('ls -la'), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
      assert.deepStrictEqual(readDecisionLog(dirs), []);
    }
    // UserPromptSubmit prints nothing and journals the prompt.
    {
      const { env: e, dirs } = env();
      const p = await prompt(e, 'publish it');
      assert.strictEqual(p.code, 0, p.err);
      assert.strictEqual(p.out, '');
      assert.strictEqual(get(journal(dirs, 's1').at(-1), 'text'), 'publish it');

      // Inside a subagent the prompt is the parent's dispatch (red team C3).
      const root = journalText(dirs, 's1');
      const sub = await prompt(e, 'implement task 3', { agent_id: 'a1', agent_type: 'default' });
      assert.strictEqual(sub.code, 0, sub.err);
      assert.strictEqual(sub.out, '');
      assert.strictEqual(journalText(dirs, 's1'), root, 'the root journal is unchanged');
      const lines = journal(dirs, 's1__a1');
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(get(lines[0], 'kind'), 'prompt');
      assert.strictEqual(get(lines[0], 'text'), null);

      // A numeric agent_id marks a subagent too (task 02 minor, ruled must-fix).
      const num = await prompt(e, 'implement task 4', { agent_id: 7 });
      assert.strictEqual(num.code, 0, num.err);
      assert.strictEqual(journalText(dirs, 's1'), root, 'the root journal is still unchanged');
      assert.strictEqual(get(journal(dirs, 's1__7')[0], 'text'), null);

      // fx's own Stop continuation is not a user prompt.
      await prompt(e, '[fx] This turn edited files and no check has passed since the last edit.');
      assert.strictEqual(journalText(dirs, 's1'), root, 'an [fx] prompt is ignored');
      // Wrapped by Codex, the continuation is still not a user prompt (final review I5).
      // Both texts come from lib/stop-check, so a reworded Stop reason fails here (final review, wave 2).
      for (const mode of ['block', 'reminder'] as const) {
        await prompt(e, `Stop hook: ${stopReason('`npm test`', mode)}`);
        assert.strictEqual(journalText(dirs, 's1'), root, `a wrapped ${mode} continuation is ignored`);
      }
    }
    // SubagentStart: the golden output, and the subagent's turn start.
    {
      const { env: e, dirs } = env();
      const r = await runHook(HOOK, { hook_event_name: 'SubagentStart', session_id: 's1', agent_id: 'a1', agent_type: 'fx-lens-security', cwd: tmp }, e);
      assert.strictEqual(r.code, 0, r.err);
      const golden = fs.readFileSync(path.join(ROOT, 'tests', 'gates', 'fixtures', 'hook-golden', 'codex-subagent-start.expected.txt'), 'utf8');
      assert.strictEqual(rootToToken(r.out, ROOT), golden);
      const lines = journal(dirs, 's1__a1');
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(get(lines[0], 'kind'), 'prompt');
      assert.strictEqual(get(lines[0], 'text'), null);
      assert.strictEqual(get(lines[0], 'agentType'), 'fx-lens-security');

      // A read-only subagent is refused before the shell guard, with today's text.
      const ro = await runHook(HOOK, payload('npm publish', { agent_id: 'a1' }), e);
      assert.strictEqual(ro.code, 2);
      assert.strictEqual(ro.err, '[fx] fx-lens-security is read-only and must not write (blocked: Bash).\n');
    }
    // An event fx does not route prints nothing (red team M23).
    {
      const { env: e } = env();
      const r = await runHook(HOOK, { hook_event_name: 'PostCompact', session_id: 's1' }, e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, '');
    }
    // apply_patch keeps today's lane check.
    {
      const { env: e } = env();
      const patch = '*** Begin Patch\n*** Update File: lib/widget.js\n@@\n-a\n+b\n*** End Patch';
      const r = await runHook(HOOK, { hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'apply_patch', tool_input: { command: patch }, cwd: tmp }, e);
      assert.strictEqual(r.code, 2);
      assert.ok(r.err.startsWith('[fx] about to write lib/widget.js, and this repo has no docs/plans/*/design.md.'), r.err);
    }
    // apply_patch cannot write fx's own state, where the session journals are kept (lens I8, Codex mirror).
    {
      const { env: e, dirs } = env();
      const FX_STATE = '[fx] refused: the fx state and config directories hold the decision log, session journals and fx config, which only fx writes. This rule has no override.\n';
      const journalFile = path.join(dirs.state, 'sessions', 's1.jsonl');
      const patches = [
        `*** Begin Patch\n*** Add File: ${journalFile}\n+{"t":1,"kind":"prompt","text":"yes"}\n*** End Patch`,
        `*** Begin Patch\n*** Update File: ${path.join(tmp, 'a.txt')}\n*** Move to: ${journalFile}\n@@\n-a\n+b\n*** End Patch`,
      ];
      for (const patch of patches) {
        const r = await runHook(HOOK, { hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'apply_patch', tool_input: { command: patch }, cwd: tmp }, e);
        assert.strictEqual(r.code, 2, `${patch}: ${r.err}`);
        assert.strictEqual(r.err, FX_STATE);
      }
      // A relative path resolves against cwd.
      const rel = path.relative(tmp, journalFile);
      const r = await runHook(HOOK, { hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'apply_patch', tool_input: { command: `*** Begin Patch\n*** Add File: ${rel}\n+x\n*** End Patch` }, cwd: tmp }, e);
      assert.strictEqual(r.code, 2, r.err);
      assert.strictEqual(r.err, FX_STATE);
    }
    // On Windows Codex runs the command in PowerShell, so the top level is read
    // that way: a backslash is a path separator, not an escape.
    {
      const { env: e } = env();
      const preload = path.join(tmp, 'win32.js');
      fs.writeFileSync(preload, "Object.defineProperty(process, 'platform', { value: 'win32' });\n");
      for (const cmd of ['Remove-Item C:\\ -Recurse -Force', 'Remove-Item -Recurse -Force C:\\*']) {
        // cwd in scratch: under a faked win32, fx joins its state path the Windows way, relative to cwd.
        const r = await runHook(HOOK, payload(cmd), { ...e, NODE_OPTIONS: `--require ${preload}` }, { cwd: tmp });
        assert.strictEqual(r.code, 2, `${cmd}: ${r.err}`);
        assert.strictEqual(r.err, WIN_WIPE, cmd);
      }
      // Elsewhere the shell is bash, where `C:\ ` escapes the space; since task 14 (benchmark finding 2)
      // a command naming a drive path is also read the PowerShell way, so it is refused there too.
      if (process.platform !== 'win32') {
        const r = await runHook(HOOK, payload('Remove-Item C:\\ -Recurse -Force'), e);
        assert.strictEqual(r.code, 2, r.err);
        assert.strictEqual(r.err, WIN_WIPE);
      }
    }
    // Fix round 1, review I1: under PowerShell, `echo (...)` runs its subexpression, so it is grey.
    {
      const { env: e } = env();
      const preload = path.join(tmp, 'win32.js');
      // Relative APPDATA and LOCALAPPDATA: the Windows-joined config and state paths land inside tmp.
      const winCwd = fs.mkdtempSync(path.join(tmp, 'win-'));
      const r = await runHook(HOOK, payload('echo (Remove-Item -Recurse -Force src)', {}, winCwd),
        { ...e, APPDATA: 'cfg', LOCALAPPDATA: 'st', NODE_OPTIONS: `--require ${preload}` }, { cwd: winCwd });
      assert.strictEqual(r.code, 0, r.err);
      const log = fs.readFileSync(path.join(winCwd, 'st\\fx', 'decisions.jsonl'), 'utf8');
      assert.ok(log.includes('"source":"grey"'), `grey, not read-only: ${log}`);
    }
    // Fix round 1, lens SEC 1 and SF 2: a Bash command that is not a string is refused, after the git guard.
    {
      const { env: e } = env();
      let r = await runHook(HOOK, payload('', {}, tmp), e);
      assert.strictEqual(r.code, 0, 'an empty command is no command');
      r = await runHook(HOOK, { ...payload(''), tool_input: { command: 42 } }, e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, '[fx] the shell command is not a string (number), so the guards cannot read it. Denying rather than assuming it is safe.\n');
    }

    // The git fixture's worktree, for the git guard.
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-shell-guard-codex-fixture-'));
    cleanups.push(() => fs.rmSync(scratch, { recursive: true, force: true }));
    const fix = spawnSync(path.join(ROOT, 'scripts', 'make-git-fixture'), [path.join(scratch, 'repo')], { encoding: 'utf8' });
    const worktree = fix.stdout.trim().split(' ')[1];
    assert.ok(fix.status === 0 && worktree, fix.stderr);
    // The git guard answers first.
    {
      const { env: e } = env();
      const r = await runHook(HOOK, payload('git push --force origin main', {}, worktree), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, FORCE_PUSH);
    }
    // A shell guard that rejects lets the call through with a warning; the git guard still refuses (red team I8).
    {
      const base = path.join(scratch, 'async');
      for (const dir of ['hooks', 'lib', 'codex']) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'PREAMBLE.md'), path.join(base, 'PREAMBLE.md'));
      fs.writeFileSync(path.join(base, 'lib', 'shell-guard.js'), "exports.guardShell = () => Promise.reject(new Error('async'));\n");
      const hook = path.join(base, 'hooks', 'fx-codex.js');
      const { env: e } = env();
      let r = await runHook(hook, payload('npm publish', {}, worktree), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(warned(r.out), '[fx] shell guard off: async');
      r = await runHook(hook, payload('git push --force origin main', {}, worktree), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, FORCE_PUSH);
    }
    // Fix round 1, lens SEC 1: an array command is refused too. The git guard sees it
    // joined with commas (`bash,-lc,git push ...`), which it cannot read, so the refusal is the type check's.
    {
      const { env: e } = env();
      const r = await runHook(HOOK, { ...payload('', {}, worktree), tool_input: { command: ['bash', '-lc', 'git push --force origin main'] } }, e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, '[fx] the shell command is not a string (object), so the guards cannot read it. Denying rather than assuming it is safe.\n');
    }
    // A copy of the plugin with one library replaced.
    const copyWith = (name: string, file: string, stub: string) => {
      const base = path.join(scratch, name);
      for (const dir of ['hooks', 'lib', 'codex']) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'PREAMBLE.md'), path.join(base, 'PREAMBLE.md'));
      fs.writeFileSync(path.join(base, 'lib', file), stub);
      return path.join(base, 'hooks', 'fx-codex.js');
    };
    // Fix round 1, lens SF 3: every fail-open path leaves a decision-log line, and an
    // error that cannot be printed still gives the warning. Review minor 3: load and timer too.
    {
      const cases: [string, string, string][] = [
        ['async2', "exports.guardShell = () => Promise.reject(new Error('async'));\n", '[fx] shell guard off: async'],
        ['load', "throw new Error('load')\n", '[fx] shell guard off: load'],
        ['timer', "exports.guardShell = () => { setTimeout(() => { throw new Error('timer'); }, 10); return new Promise(() => {}); };\n", '[fx] shell guard off: timer'],
        ['hostile', "exports.guardShell = () => Promise.reject({ get message() { throw new Error('m'); }, toString() { throw new Error('s'); } });\n", '[fx] shell guard off: an error that could not be printed'],
      ];
      for (const [name, stub, want] of cases) {
        const hook = copyWith(name, 'shell-guard.js', stub);
        const { env: e, dirs } = env();
        const r = await runHook(hook, payload('npm publish', {}, worktree), e);
        assert.strictEqual(r.code, 0, `${name}: ${r.err}`);
        assert.strictEqual(warned(r.out), want, name);
        const log = readDecisionLog(dirs);
        assert.strictEqual(log.length, 1, `${name}: one decision-log line`);
        assert.strictEqual(get(log[0], 'source'), 'guard-error', name);
        assert.strictEqual(get(log[0], 'action'), 'allow', name);
        assert.strictEqual(get(log[0], 'harness'), 'codex', name);
      }
    }
    // Fix round 1, lens SF 1: a prompt that cannot be recorded still moves the turn boundary.
    {
      const { env: e, dirs } = env();
      assert.strictEqual((await prompt(e, 'publish it')).code, 0);
      const hook = copyWith('redact', 'redact.js', "exports.CAP_PROMPT = 2000; exports.CAP_COMMAND = 2000; exports.redact = () => { throw new Error('redact'); };\n");
      const p = await runHook(hook, { hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'something else', cwd: tmp }, e);
      assert.strictEqual(p.code, 0, p.err);
      assert.strictEqual(p.out, '');
      const last = journal(dirs, 's1').at(-1);
      assert.deepStrictEqual([get(last, 'kind'), get(last, 'text')], ['prompt', null]);
    }
    // Fix round 2, lens SF 1: when neither the prompt nor the null-text marker can be
    // written, the journal goes, so no older prompt is left in it.
    if (process.platform !== 'win32') {
      const { env: e, dirs } = env();
      assert.strictEqual((await prompt(e, 'publish it')).code, 0);
      const file = path.join(dirs.state, 'sessions', 's1.jsonl');
      fs.chmodSync(file, 0o400);
      const p = await prompt(e, 'something else');
      assert.strictEqual(p.code, 0, p.err);
      assert.strictEqual(p.out, '');
      assert.ok(!fs.existsSync(file) || fs.readFileSync(file, 'utf8') === '', 'no older prompt is left');
    }
    // The prompt is journaled even when lib/stop-check cannot load (final review U7).
    {
      const { env: e, dirs } = env();
      const copy = path.join(dirs.root, 'plugin-stop');
      fs.cpSync(path.join(ROOT, 'hooks'), path.join(copy, 'hooks'), { recursive: true });
      fs.cpSync(path.join(ROOT, 'lib'), path.join(copy, 'lib'), { recursive: true });
      fs.writeFileSync(path.join(copy, 'lib', 'stop-check.js'), "throw new Error('stop-check broken');\n");
      const p = await runHook(path.join(copy, 'hooks', 'fx-codex.js'), { hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'ship it', cwd: tmp }, e);
      assert.strictEqual(p.code, 0, p.err);
      assert.ok(journalText(dirs, 's1').includes('"text":"ship it"'), journalText(dirs, 's1'));
    }
    // A throw on the git guard path denies even when Node only warns about an unhandled rejection.
    {
      const { env: e, dirs } = env();
      const copy = path.join(dirs.root, 'plugin');
      fs.cpSync(path.join(ROOT, 'hooks'), path.join(copy, 'hooks'), { recursive: true });
      fs.cpSync(path.join(ROOT, 'lib'), path.join(copy, 'lib'), { recursive: true });
      fs.writeFileSync(path.join(copy, 'lib', 'git-guard.js'),
        "module.exports = { inspect: () => ({ get allow() { throw new Error('verdict unreadable'); } }) };\n");
      const r = await runHook(path.join(copy, 'hooks', 'fx-codex.js'), payload('git status'), { ...e, NODE_OPTIONS: '--unhandled-rejections=warn' });
      assert.strictEqual(r.code, 2, r.err);
      assert.ok(r.err.startsWith('[fx] hook crashed (verdict unreadable).'), r.err);
    }
  } finally {
    for (const c of cleanups) c();
  }
  console.log('shell-guard-codex.test.js: ok');
}

main().catch((e) => { console.error(e); process.exit(1); });
