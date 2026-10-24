// Run: node tests/gates/opencode-v2-shell-guard.test.js
// The shell guard on opencode 2.x, at the plugin seam: plugins/fx-opencode-v2.js
// set up in-process with a recording ctx under scratch homes, each shell call
// driven as execute.before, evaluate, execute.after with the same ids. No
// command here is ever run.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { applyScratchEnv, readDecisionLog, type HookDirs } from '../helpers/hook-env.js';
import { parseJson } from '../../lib/json.js';

const ROOT = path.join(__dirname, '..', '..');
const RM_ROOT = '[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.';
const FX_STATE = '[fx] refused: the fx state and config directories hold the decision log, session journals and fx config, which only fx writes. This rule has no override.';
const PROMPT_GAP = '[fx] the prompt hook is unavailable: no prompt hook here; the Stop reminder cannot work on this opencode.';

type Ev = { [k: string]: unknown };
type Hook = (ev: Ev) => unknown;
interface Plugin { default: { setup(ctx: unknown): Promise<void> } }
interface Stub { hooks: Record<string, Hook[]>; ctx: unknown }

function get(v: unknown, ...keys: string[]): unknown {
  let cur = v;
  for (const k of keys) cur = typeof cur === 'object' && cur !== null ? Reflect.get(cur, k) : undefined;
  return cur;
}

// The ctx slice the plugin registers through; `failPrompt` makes session.hook('prompt') throw.
function stub(directory: string, failPrompt = false): Stub {
  const hooks: Record<string, Hook[]> = {};
  const reg = { dispose() {} };
  const hook = (domain: string) => async (name: string, cb: Hook) => {
    if (failPrompt && domain === 'session' && name === 'prompt') throw new Error('no prompt hook here');
    (hooks[`${domain}.${name}`] ||= []).push(cb);
    return reg;
  };
  const ctx = {
    location: { directory },
    session: { hook: hook('session'), prompt: async () => undefined },
    tool: { hook: hook('tool') },
    permission: { hook: hook('permission') },
    agent: { transform: async (cb: (ed: unknown) => unknown) => { await cb({ list: () => [], update: () => undefined }); return reg; } },
    command: { transform: async (cb: (ed: unknown) => unknown) => { await cb({ add: () => undefined }); return reg; } },
  };
  return { hooks, ctx };
}

const fire = async (s: Stub, name: string, ev: Ev) => { for (const cb of s.hooks[name] || []) await cb(ev); };

let n = 0;
async function shell(s: Stub, command: string, sessionID = 's1'): Promise<Ev> {
  const id = `call_${n++}`;
  await fire(s, 'tool.execute.before', { tool: 'shell', sessionID, messageID: 'm', id, input: { command } });
  const ev: Ev = { sessionID, action: 'shell', resources: [command], source: { type: 'tool', messageID: 'm', id }, effect: 'allow' };
  await fire(s, 'permission.evaluate', ev);
  await fire(s, 'tool.execute.after', { tool: 'shell', sessionID, messageID: 'm', id, status: 'completed' });
  return ev;
}

async function context(s: Stub, sessionID?: string): Promise<string[]> {
  const ev: { system: { text: string }[]; sessionID?: string } = { system: [], ...(sessionID === undefined ? {} : { sessionID }) };
  await fire(s, 'session.context', ev);
  return ev.system.map((p) => p.text);
}

const stderr: string[] = [];
console.error = (m: unknown) => { stderr.push(String(m)); };


const cleanups: (() => void)[] = [];
function scratch(): HookDirs {
  const s = applyScratchEnv();
  cleanups.push(s.restore);
  return s.dirs;
}

async function main(): Promise<void> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-oc2-guard-'));
  cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fix = spawnSync(path.join(ROOT, 'scripts', 'make-git-fixture'), [path.join(tmp, 'repo')], { encoding: 'utf8' });
  const worktree = fix.stdout.trim().split(' ')[1];
  assert.ok(fix.status === 0 && worktree, fix.stderr);

  const load = async (root = ROOT): Promise<Plugin> => import(pathToFileURL(path.join(root, 'plugins', 'fx-opencode-v2.js')).href);
  const mod = await load();
  const plugin = async (): Promise<{ s: Stub; dirs: HookDirs }> => {
    const dirs = scratch();
    const s = stub(worktree);
    await mod.default.setup(s.ctx);
    return { s, dirs };
  };

  try {
    // The git guard answers first, as today.
    {
      const { s } = await plugin();
      const e = await shell(s, 'git -C . push --force origin main');
      assert.strictEqual(e.effect, 'deny');
      assert.ok(String(e.message).startsWith('[fx] force push'), String(e.message));
    }
    // The edit permission never reaches fx's state or config directories (final review I3, lens I2).
    {
      const { s, dirs } = await plugin();
      for (const file of [path.join(dirs.state, 'sessions', 's1.jsonl'), path.join(dirs.config, 'x.json')]) {
        const ev: Ev = { sessionID: 's1', action: 'edit', resources: [file], effect: 'allow' };
        await fire(s, 'permission.evaluate', ev);
        assert.deepStrictEqual([ev.effect, ev.message], ['deny', FX_STATE], file);
      }
      const ok: Ev = { sessionID: 's1', action: 'edit', resources: [path.join(worktree, 'a.txt')], effect: 'allow' };
      await fire(s, 'permission.evaluate', ok);
      assert.strictEqual(ok.effect, 'allow');
    }
    // A hard rule denies with its own text.
    {
      const { s } = await plugin();
      const e = await shell(s, 'rm -rf ~');
      assert.deepStrictEqual([e.effect, e.message], ['deny', RM_ROOT]);
    }
    // Read-only: unchanged, no log line.
    {
      const { s, dirs } = await plugin();
      const e = await shell(s, 'ls -la');
      assert.strictEqual(e.effect, 'allow');
      assert.strictEqual(e.message, undefined);
      assert.deepStrictEqual(readDecisionLog(dirs), []);
    }
    // The shell guard fails open past the git guard; the hard rules fail closed.
    const broken = async (name: string, file: string, body: string): Promise<{ s: Stub; dirs: HookDirs }> => {
      const dirs = scratch();
      const base = path.join(tmp, name);
      for (const dir of ['plugins', 'lib', 'agents', 'references']) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, 'PREAMBLE.md'), path.join(base, 'PREAMBLE.md'));
      fs.writeFileSync(path.join(base, 'lib', file), body);
      const s = stub(worktree);
      await (await load(base)).default.setup(s.ctx);
      return { s, dirs };
    };
    const guardLog = (dirs: HookDirs) => readDecisionLog(dirs).filter((e) => get(e, 'event') === 'guard');
    // The same ids drive before and evaluate, as the runtime does.
    const callEvents = (command: string, id = `call_${n++}`): { before: Ev; ev: Ev } => ({
      before: { tool: 'shell', sessionID: 's', messageID: 'm', id, input: { command } },
      ev: { action: 'shell', sessionID: 's', source: { messageID: 'm', id }, resources: [command], effect: 'allow' },
    });
    // A hard rule is refused in evaluate.
    {
      const { s } = await plugin();
      const { before, ev } = callEvents('rm -rf ~');
      await fire(s, 'tool.execute.before', before);
      await fire(s, 'permission.evaluate', ev);
      assert.deepStrictEqual([ev.effect, ev.message], ['deny', RM_ROOT]);
    }
    // The git guard runs on the recorded text.
    {
      const { s } = await plugin();
      const { before, ev } = callEvents('git push --force origin main');
      await fire(s, 'tool.execute.before', before);
      await fire(s, 'permission.evaluate', ev);
      assert.strictEqual(ev.effect, 'deny');
      assert.ok(String(ev.message).startsWith('[fx] force push'), String(ev.message));
    }
    // A grey command is allowed and logged once.
    {
      const { s, dirs } = await plugin();
      const { before, ev } = callEvents('npm publish');
      await fire(s, 'tool.execute.before', before);
      await fire(s, 'permission.evaluate', ev);
      assert.deepStrictEqual([ev.effect, ev.message], ['allow', undefined]);
      assert.deepStrictEqual(guardLog(dirs).map((e) => [get(e, 'source'), get(e, 'action'), get(e, 'harness')]), [['grey', 'allow', 'opencode-v2']]);
    }
    // A guard that throws: evaluate allows, and the log names the failure class.
    {
      const { s, dirs } = await broken('guard-throws', 'shell-guard.js', "exports.guardShellCodeOnly = () => { throw new TypeError('sync'); };\n");
      stderr.length = 0;
      const { before, ev } = callEvents('npm publish');
      await fire(s, 'tool.execute.before', before);
      await fire(s, 'permission.evaluate', ev);
      assert.strictEqual(ev.effect, 'allow');
      assert.ok(stderr.includes('[fx] shell guard off: sync'), stderr.join('\n'));
      const off = guardLog(dirs).filter((e) => get(e, 'source') === 'guard-error');
      assert.strictEqual(get(off.at(-1), 'error'), 'TypeError', 'the entry names the failure class');
      assert.strictEqual(get(off.at(-1), 'text'), '');
    }
    // No stamp is honoured on opencode (controller ruling, design 6): a stamp
    // after a prompt boundary is still refused.
    {
      const { s } = await plugin();
      assert.strictEqual((await shell(s, 'rm -rf ~')).effect, 'deny');
      await fire(s, 'session.prompt', { sessionID: 's1' });
      const e = await shell(s, 'rm -rf ~ # fx-ok: user agreed');
      assert.deepStrictEqual([e.effect, e.message], ['deny', RM_ROOT]);
    }
    // The prompt hook marks a turn boundary in the session journal, text null.
    {
      const { s, dirs } = await plugin();
      await fire(s, 'session.prompt', { sessionID: 's1' });
      await fire(s, 'session.prompt', {});
      const lines = fs.readFileSync(path.join(dirs.state, 'sessions', 's1.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => parseJson(l));
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(get(lines[0], 'kind'), 'prompt');
      assert.strictEqual(get(lines[0], 'text'), null);
      assert.deepStrictEqual(fs.readdirSync(path.join(dirs.state, 'sessions')), ['s1.jsonl'], 'no session id, no journal');
    }
    // A turn that cannot be marked says so once per plugin instance (lens SF I1).
    {
      const { s, dirs } = await plugin();
      stderr.length = 0;
      await fire(s, 'session.prompt', {});
      await fire(s, 'session.prompt', { sessionID: 7 });
      assert.deepStrictEqual(stderr, ['[fx] the prompt hook carried no session id, so fx did not mark this turn in the session journal.']);
      fs.mkdirSync(dirs.state, { recursive: true });
      fs.writeFileSync(path.join(dirs.state, 'sessions'), 'not a directory');
      stderr.length = 0;
      await fire(s, 'session.prompt', { sessionID: 's1' });
      await fire(s, 'session.prompt', { sessionID: 's1' });
      assert.deepStrictEqual(stderr, ['[fx] the session journal could not be written, so fx did not mark this turn.']);
    }
    // A prompt hook that cannot register: stderr only, never the misinstalled list.
    {
      scratch();
      const s = stub(worktree, true);
      stderr.length = 0;
      await mod.default.setup(s.ctx);
      assert.deepStrictEqual(stderr, [PROMPT_GAP]);
      const text = (await context(s, 's1')).join('\n');
      assert.ok(!text.includes('misinstalled'), text);
      assert.strictEqual((await shell(s, 'rm -rf ~')).message, RM_ROOT, 'the guard still runs');
    }
    {
      const { s, dirs } = await broken('guard-load', 'shell-guard.js', "throw new Error('load')\n");
      assert.strictEqual((await shell(s, 'npm publish')).effect, 'allow');
      assert.strictEqual(get(readDecisionLog(dirs).at(-1), 'source'), 'guard-error');
      assert.ok(String((await shell(s, 'git push --force origin main')).message).startsWith('[fx] force push'));
      assert.strictEqual((await shell(s, 'rm -rf ~')).message, RM_ROOT);
    }
    for (const [name, body, message] of [
      ['rules-load', "throw new Error('rules')\n", '[fx] shell rules failed to load (rules). Denying every shell command until the plugin is repaired.'],
      ['rules-throw', "exports.classifyShell = () => { throw new Error('rules'); };\n", '[fx] shell rules failed to evaluate this command (rules). Denying rather than assuming it is safe.'],
    ] as const) {
      const { s } = await broken(name, 'shell-rules.js', body);
      const e = await shell(s, 'npm publish');
      assert.deepStrictEqual([e.effect, e.message], ['deny', message], name);
      // The fx-state refusal fails closed too: no edit without the rules.
      if (name === 'rules-load') {
        const ev: Ev = { sessionID: 's1', action: 'edit', resources: [path.join(worktree, 'a.txt')], effect: 'allow' };
        await fire(s, 'permission.evaluate', ev);
        assert.deepStrictEqual([ev.effect, ev.message], ['deny', '[fx] shell rules failed to load (rules). Denying every file write until the plugin is repaired.'], name);
      }
    }  } finally {
    for (const c of cleanups.reverse()) c();
  }
  console.log('opencode-v2-shell-guard tests passed');
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`);
  process.exit(1);
});
