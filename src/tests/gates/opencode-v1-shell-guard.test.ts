// Run: node tests/gates/opencode-v1-shell-guard.test.js
// The shell guard on opencode 1.x, at the plugin seam: plugins/fx-opencode-v1.js
// imported in-process under scratch homes, its hooks called with recorded-shape
// inputs. No command here is ever run: the guard only decides on the command
// string.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { applyScratchEnv, readDecisionLog, type HookDirs } from '../helpers/hook-env.js';
import { parseJson } from '../../lib/json.js';
import { render } from '../../lib/preamble.js';
import type { fx as FxPlugin } from '../../plugins/fx-opencode-v1.js';

const ROOT = path.join(__dirname, '..', '..');
const RM_ROOT = '[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.';
const NOT_STRING = '[fx] the shell command is not a string (object), so the guards cannot read it. Denying rather than assuming it is safe.';
const FORCE_PUSH = '[fx] force push rewrites history that has already left the machine.';
const FX_STATE = '[fx] refused: the fx state and config directories hold the decision log, session journals and fx config, which only fx writes. This rule has no override.';

type Hooks = Awaited<ReturnType<typeof FxPlugin>>;
const loadFx = async (file: string): Promise<typeof FxPlugin> => (await import(file)).fx;

function get(v: unknown, ...keys: string[]): unknown {
  let cur = v;
  for (const k of keys) cur = typeof cur === 'object' && cur !== null ? Reflect.get(cur, k) : undefined;
  return cur;
}
// Fresh scratch homes in process.env per case; the finally block undoes them newest first.
const cleanups: (() => void)[] = [];
function scratch(): HookDirs {
  const s = applyScratchEnv();
  cleanups.push(s.restore);
  return s.dirs;
}

const stderr: string[] = [];
console.error = (m: unknown) => { stderr.push(String(m)); };

const bash = (h: Hooks, command: string, sessionID = 's1') =>
  h['tool.execute.before']({ tool: 'bash', sessionID }, { args: { command } });
// The chat.message input fields read from the 1.18.25 binary (see the plugin's header).
const userMessage = (h: Hooks, sessionID: string) =>
  h['chat.message']({ sessionID, agent: 'build', model: { providerID: 'p', modelID: 'm' }, messageID: 'msg1', variant: undefined });
const transform = async (h: Hooks, input: unknown): Promise<string[]> => {
  const output = { system: [] as string[] };
  await h['experimental.chat.system.transform'](input, output);
  return output.system;
};
const lastLog = (dirs: HookDirs) => readDecisionLog(dirs).at(-1);

async function main(): Promise<void> {
  const fx = await loadFx(path.join(ROOT, 'plugins', 'fx-opencode-v1.js'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-oc1-guard-'));
  cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q', tmp]);
  // A fresh plugin under fresh scratch homes.
  const plugin = async (): Promise<{ h: Hooks; dirs: HookDirs }> => {
    const dirs = scratch();
    return { h: await fx({ directory: tmp }), dirs };
  };

  try {
    // A hard rule refuses with the rule's text.
    {
      const { h } = await plugin();
      await assert.rejects(bash(h, 'rm -rf ~'), { message: RM_ROOT });
    }
    // A grey command runs and is logged; a stamp after chat.message changes nothing.
    {
      const { h, dirs } = await plugin();
      await bash(h, 'npm publish');
      assert.deepStrictEqual([get(lastLog(dirs), 'source'), get(lastLog(dirs), 'action'), get(lastLog(dirs), 'harness')], ['grey', 'allow', 'opencode']);
      await userMessage(h, 's1');
      await bash(h, 'npm publish # fx-ok: user agreed');
      assert.strictEqual(get(lastLog(dirs), 'source'), 'grey');
    }
    // A command that is present but not a string is refused, as on Codex (lens SEC I2).
    {
      const { h } = await plugin();
      await assert.rejects(h['tool.execute.before']({ tool: 'bash', sessionID: 's1' }, { args: { command: ['npm', 'publish'] } }), { message: NOT_STRING });
    }
    // The file tools never write fx's state or config directories (final review I3, lens I2).
    {
      const { h, dirs } = await plugin();
      const before = (tool: string, args: Record<string, unknown>) => h['tool.execute.before']({ tool, sessionID: 's1' }, { args });
      const journalFile = path.join(dirs.state, 'sessions', 's1.jsonl');
      await assert.rejects(before('write', { filePath: journalFile, content: 'x' }), { message: FX_STATE });
      await assert.rejects(before('edit', { filePath: path.join(dirs.config, 'x.json'), oldString: 'a', newString: 'b' }), { message: FX_STATE });
      await assert.rejects(before('apply_patch', { patchText: `*** Begin Patch\n*** Add File: ${journalFile}\n+x\n*** End Patch` }), { message: FX_STATE });
      await before('write', { filePath: path.join(tmp, 'a.txt'), content: 'x' });
    }
    // A turn that cannot be marked says so once per plugin instance (lens SF I1).
    {
      const { h, dirs } = await plugin();
      stderr.length = 0;
      await h['chat.message']({});
      await h['chat.message']({ sessionID: 7 });
      assert.deepStrictEqual(stderr, ['[fx] chat.message carried no session id, so fx did not mark this turn in the session journal.']);
      fs.mkdirSync(dirs.state, { recursive: true });
      fs.writeFileSync(path.join(dirs.state, 'sessions'), 'not a directory');
      stderr.length = 0;
      await userMessage(h, 's1');
      await userMessage(h, 's1');
      assert.deepStrictEqual(stderr, ['[fx] the session journal could not be written, so fx did not mark this turn.']);
      stderr.length = 0;
      await transform(h, { model: {} });
      await transform(h, { model: {} });
      // Agent.generate passes {model} alone by design (measured): nothing to report (ruling, re-review r1 minor).
      assert.deepStrictEqual(stderr, []);
    }
    // Read-only: silent, no log line.
    {
      const { h, dirs } = await plugin();
      await bash(h, 'ls -la');
      assert.deepStrictEqual(readDecisionLog(dirs), []);
    }
    // chat.message marks a turn boundary in the session journal.
    {
      const { h, dirs } = await plugin();
      await userMessage(h, 's1');
      const lines = fs.readFileSync(path.join(dirs.state, 'sessions', 's1.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => parseJson(l));
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(get(lines[0], 'kind'), 'prompt');
      assert.strictEqual(get(lines[0], 'text'), null);
    }

    // The system text is the preamble alone.
    {
      scratch();
      const h = await fx({ directory: tmp });
      assert.deepStrictEqual(await transform(h, { sessionID: 's1' }), [render({ harness: 'opencode', cwd: tmp })]);
    }

    // The git fixture's worktree, for the git guard.
    const fixtures = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-oc1-guard-fixture-'));
    cleanups.push(() => fs.rmSync(fixtures, { recursive: true, force: true }));
    const fix = spawnSync(path.join(ROOT, 'scripts', 'make-git-fixture'), [path.join(fixtures, 'repo')], { encoding: 'utf8' });
    const worktree = fix.stdout.trim().split(' ')[1];
    assert.ok(fix.status === 0 && worktree, fix.stderr);
    // The git guard answers first.
    {
      scratch();
      const h = await fx({ directory: worktree });
      await assert.rejects(bash(h, 'git push --force origin main'), { message: FORCE_PUSH });
    }
    // A shell guard that fails to load leaves bash to the git guard and the hard rules, and says so once.
    {
      const dirs = scratch();
      const base = path.join(fixtures, 'broken');
      for (const dir of ['plugins', 'lib']) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'PREAMBLE.md'), path.join(base, 'PREAMBLE.md'));
      fs.writeFileSync(path.join(base, 'lib', 'shell-guard.js'), "throw new Error('load')\n");
      const h = await (await loadFx(path.join(base, 'plugins', 'fx-opencode-v1.js')))({ directory: worktree });
      await bash(h, 'npm publish');
      assert.strictEqual(get(lastLog(dirs), 'source'), 'guard-error');
      await assert.rejects(bash(h, 'git push --force origin main'), { message: FORCE_PUSH });
      await assert.rejects(bash(h, 'rm -rf ~'), { message: RM_ROOT });
      const first = await transform(h, { sessionID: 's1' });
      assert.ok(first.includes('[fx] shell guard off: load'), first.join('\n'));
      assert.ok(!(await transform(h, { sessionID: 's1' })).includes('[fx] shell guard off: load'), 'said once');
    }
    // The hard rules fail closed: a shell-rules module that does not load, or throws, refuses every bash call.
    for (const [name, stub, message] of [
      ['rules-load', "throw new Error('rules')\n", '[fx] shell rules failed to load (rules). Denying every shell command until the plugin is repaired.'],
      ['rules-throw', "exports.classifyShell = () => { throw new Error('rules'); };\n", '[fx] shell rules failed to evaluate this command (rules). Denying rather than assuming it is safe.'],
    ]) {
      scratch();
      const base = path.join(fixtures, name ?? '');
      for (const dir of ['plugins', 'lib']) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'PREAMBLE.md'), path.join(base, 'PREAMBLE.md'));
      fs.writeFileSync(path.join(base, 'lib', 'shell-rules.js'), stub ?? '');
      const h = await (await loadFx(path.join(base, 'plugins', 'fx-opencode-v1.js')))({ directory: worktree });
      await assert.rejects(bash(h, 'npm publish'), { message }, name);
      // The fx-state refusal fails closed too: no file write without the rules.
      if (name === 'rules-load') await assert.rejects(h['tool.execute.before']({ tool: 'write', sessionID: 's1' }, { args: { filePath: path.join(worktree, 'a.txt'), content: 'x' } }),
        { message: '[fx] shell rules failed to load (rules). Denying every file write until the plugin is repaired.' }, name);
    }
  } finally {
    for (const c of cleanups.reverse()) c();
  }
  console.log('opencode-v1-shell-guard tests passed');
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(1);
});
