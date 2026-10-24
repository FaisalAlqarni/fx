// Run: node tests/gates/opencode-turn.test.js
// Stuck-loop nudges and the Stop reminder on opencode, at the plugin seam: both
// plugins imported in-process under scratch homes and driven through whole
// turns. Neither major can block a turn, so queued lines reach the next
// request's system text (1.x transform, 2.x context hook). No command is run.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { applyScratchEnv, readDecisionLog, type HookDirs } from '../helpers/hook-env.js';
import { createQueue } from '../../lib/opencode-queue.js';

const ROOT = path.join(__dirname, '..', '..');
const REPEAT = '[fx] `npm test` has failed 3 times this turn. Stop retrying and invoke fx-debug to find the cause.';
const STALL = '[fx] 12 reads in a row with no edit. If you are going in circles, invoke fx-debug; otherwise say what you are looking for.';
const REMINDER_MAKE = "[fx] The previous turn edited files and no check passed after the last edit. Run `make test` before you report that work as done.";
const REMINDER = "[fx] The previous turn edited files and no check passed after the last edit. Run the project's tests before you report that work as done.";

type Ev = { [k: string]: unknown };
type Hook1 = (input: unknown, output: unknown) => Promise<void>;
interface Hooks1 { 'chat.message': Hook1; 'tool.execute.after': Hook1; 'experimental.chat.system.transform': Hook1 }
type Hook2 = (ev: Ev) => unknown;
interface Stub { hooks: Record<string, Hook2[]>; ctx: unknown }

const stderr: string[] = [];
console.error = (m: unknown) => { stderr.push(String(m)); };

const cleanups: (() => void)[] = [];
let dirs: HookDirs | undefined;
const scratch = () => { const s = applyScratchEnv(); dirs = s.dirs; cleanups.push(s.restore); };
const log = () => (dirs ? readDecisionLog(dirs) : []).map((e) => (typeof e === 'object' && e !== null ? Reflect.get(e, 'source') : null));

// A git repo, so .fx.json is read from its top level.
function repo(fxJson?: unknown): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-oc-turn-'));
  cleanups.push(() => fs.rmSync(d, { recursive: true, force: true }));
  spawnSync('git', ['init', '-q', d]);
  if (fxJson !== undefined) fs.writeFileSync(path.join(d, '.fx.json'), JSON.stringify(fxJson));
  return d;
}

// ---- opencode 1.x ----
async function plugin1(directory: string, seed?: (d: HookDirs) => void): Promise<Hooks1> {
  scratch();
  if (seed && dirs) seed(dirs);
  const mod: { fx: (o: { directory: string }) => Promise<Hooks1> } = await import(pathToFileURL(path.join(ROOT, 'plugins', 'fx-opencode-v1.js')).href);
  return mod.fx({ directory });
}
const message1 = (h: Hooks1, sessionID: string, agent = 'build') => h['chat.message']({ sessionID, agent, messageID: 'm1' }, { message: {}, parts: [] });
const after1 = (h: Hooks1, tool: string, args: Ev, sessionID: string | undefined, result: Ev = { title: '', output: '', metadata: {} }) =>
  h['tool.execute.after']({ tool, sessionID, callID: 'c1', args }, result);
const bashAfter1 = (h: Hooks1, command: string, exit: number, sessionID = 's1') => after1(h, 'bash', { command }, sessionID, { title: command, output: '', metadata: { exit } });
async function transform1(h: Hooks1, input: unknown): Promise<string[]> {
  const output = { system: [] as string[] };
  await h['experimental.chat.system.transform'](input, output);
  return output.system;
}

// ---- opencode 2.x ----
function stub(directory: string): Stub {
  const hooks: Record<string, Hook2[]> = {};
  const reg = { dispose() {} };
  const hook = (domain: string) => async (name: string, cb: Hook2) => { (hooks[`${domain}.${name}`] ||= []).push(cb); return reg; };
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
async function plugin2(directory: string, seed?: (d: HookDirs) => void): Promise<Stub> {
  scratch();
  if (seed && dirs) seed(dirs);
  const mod: { default: { setup(ctx: unknown): Promise<void> } } = await import(pathToFileURL(path.join(ROOT, 'plugins', 'fx-opencode-v2.js')).href);
  const s = stub(directory);
  await mod.default.setup(s.ctx);
  return s;
}
const fire = async (s: Stub, name: string, ev: Ev) => { for (const cb of s.hooks[name] || []) await cb(ev); };
const prompt2 = (s: Stub, sessionID = 's1') => fire(s, 'session.prompt', { sessionID });
const after2 = (s: Stub, tool: string, input: Ev, sessionID: string | null = 's1') =>
  fire(s, 'tool.execute.after', { tool, ...(sessionID === null ? {} : { sessionID }), messageID: 'm', id: `c${Math.random()}`, input, status: 'completed' });
async function context2(s: Stub, sessionID?: string): Promise<string[]> {
  const ev: { system: { text: string }[]; sessionID?: string } = { system: [], ...(sessionID === undefined ? {} : { sessionID }) };
  await fire(s, 'session.context', ev);
  return ev.system.map((p) => p.text);
}

const count = (lines: string[], line: string) => lines.filter((l) => l === line).length;

// Two journals, 8 and 1 days old, written before the plugin is constructed (design decision 3).
const DAY = 24 * 60 * 60 * 1000;
function seedJournals(d: HookDirs): void {
  const dir = path.join(d.state, 'sessions');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, days] of [['old', 8], ['new', 1]] as const) {
    const file = path.join(dir, `${name}.jsonl`);
    fs.writeFileSync(file, '{}\n');
    const t = new Date(Date.now() - days * DAY);
    fs.utimesSync(file, t, t);
  }
}
const journals = (): string[] => (dirs ? fs.readdirSync(path.join(dirs.state, 'sessions')).sort() : []);

async function main(): Promise<void> {
  try {
    // Task 13. Each major prunes journals older than seven days once, at plugin construction.
    {
      await plugin1(repo(), seedJournals);
      assert.deepStrictEqual(journals(), ['new.jsonl'], 'opencode 1.x');
      await plugin2(repo(), seedJournals);
      assert.deepStrictEqual(journals(), ['new.jsonl'], 'opencode 2.x');
    }
    // 1.x: three failing `npm test` calls queue the repeat-failure line, pushed once after the preamble.
    {
      const h = await plugin1(repo());
      await message1(h, 's1');
      for (let i = 0; i < 3; i++) await bashAfter1(h, 'npm test', 1);
      const first = await transform1(h, { sessionID: 's1', model: {} });
      assert.strictEqual(count(first, REPEAT), 1, 'pushed once');
      assert.ok(first.indexOf(REPEAT) > 0, 'after the preamble');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REPEAT), 0, 'not pushed again');
    }
    // 1.x: an edit with no passing check is reminded at the next user message, once.
    {
      const cwd = repo();
      const h = await plugin1(cwd);
      await message1(h, 's1');
      await after1(h, 'edit', { filePath: path.join(cwd, 'a.ts') }, 's1');
      await message1(h, 's1');
      const first = await transform1(h, { sessionID: 's1', model: {} });
      assert.strictEqual(count(first, REMINDER), 1);
      assert.ok(first.indexOf(REMINDER) > 0, 'after the preamble');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REMINDER), 0);
    }
    // 1.x: a passing check after the edit leaves no reminder.
    {
      const cwd = repo({ test_all: 'make test' });
      const h = await plugin1(cwd);
      await message1(h, 's1');
      await after1(h, 'edit', { filePath: path.join(cwd, 'a.ts') }, 's1');
      await bashAfter1(h, 'make test', 0);
      await message1(h, 's1');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REMINDER), 0);
    }
    // 1.x: stop_check off leaves no reminder.
    {
      const cwd = repo({ hooks: { stop_check: false } });
      const h = await plugin1(cwd);
      await message1(h, 's1');
      await after1(h, 'edit', { filePath: path.join(cwd, 'a.ts') }, 's1');
      await message1(h, 's1');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REMINDER), 0);
    }
    // 1.x: a transform call with no session id (Agent.generate) pushes nothing queued and keeps the queue.
    {
      const h = await plugin1(repo());
      await message1(h, 's1');
      for (let i = 0; i < 3; i++) await bashAfter1(h, 'npm test', 1);
      assert.strictEqual(count(await transform1(h, { model: {} }), REPEAT), 0, 'no session id: nothing pushed');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REPEAT), 1, 'the queue was kept');
    }
    // 1.x: queued lines are per session.
    {
      const h = await plugin1(repo());
      await message1(h, 's1');
      for (let i = 0; i < 3; i++) await bashAfter1(h, 'npm test', 1);
      assert.strictEqual(count(await transform1(h, { sessionID: 's2', model: {} }), REPEAT), 0, 'another session gets nothing');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REPEAT), 1);
    }
    // 1.x: an event with no session id records nothing and pushes nothing.
    {
      const h = await plugin1(repo());
      for (let i = 0; i < 3; i++) await after1(h, 'bash', { command: 'npm test' }, undefined, { output: '', metadata: { exit: 1 } });
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REPEAT), 0);
      assert.strictEqual(count(await transform1(h, { model: {} }), REPEAT), 0);
    }

    // Fix round 1. 1.x: a killed bash call (null exit) never verifies, even with a pass summary in its output.
    {
      const cwd = repo({ test_all: 'make test' });
      const h = await plugin1(cwd);
      await message1(h, 's1');
      await after1(h, 'edit', { filePath: path.join(cwd, 'a.ts') }, 's1');
      await after1(h, 'bash', { command: 'make test' }, 's1', { output: 'Tests: 3 passed', metadata: { exit: null } });
      await message1(h, 's1');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REMINDER_MAKE), 1, 'a killed check is no evidence');
    }
    // 1.x: a read-only agent's child session is never nudged.
    {
      const h = await plugin1(repo());
      await message1(h, 's1', 'fx-lens-security');
      for (let i = 0; i < 12; i++) await after1(h, 'read', { filePath: '/x' }, 's1');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), STALL), 0);
      const g = await plugin1(repo());
      await message1(g, 's1', 'build');
      for (let i = 0; i < 12; i++) await after1(g, 'read', { filePath: '/x' }, 's1');
      assert.strictEqual(count(await transform1(g, { sessionID: 's1', model: {} }), STALL), 1, 'an ordinary agent still is');
    }
    // 1.x: a push leaves a decision-log line.
    {
      const h = await plugin1(repo());
      await message1(h, 's1');
      for (let i = 0; i < 3; i++) await bashAfter1(h, 'npm test', 1);
      await transform1(h, { sessionID: 's1', model: {} });
      assert.ok(log().includes('queue-pushed'), 'push is logged');
      // Under its own event name, not nudge (final review, broad triage task 10).
      const events = (dirs ? readDecisionLog(dirs) : []).filter((e) => String(Reflect.get(Object(e), 'source')).startsWith('queue-')).map((e) => Reflect.get(Object(e), 'event'));
      assert.ok(events.length > 0 && events.every((e) => e === 'queue'), JSON.stringify(events));
    }
    // 1.x: a line left unpushed when the next prompt arrives is stale: dropped, and the drop is logged.
    {
      const h = await plugin1(repo());
      await message1(h, 's1');
      for (let i = 0; i < 3; i++) await bashAfter1(h, 'npm test', 1);
      await message1(h, 's1');
      assert.strictEqual(count(await transform1(h, { sessionID: 's1', model: {} }), REPEAT), 0, 'an earlier turn line is dropped');
      assert.ok(log().includes('queue-dropped'), 'the drop is logged');
    }
    // 1.x: an event with no tool or session id leaves one stderr line.
    {
      stderr.length = 0;
      const h = await plugin1(repo());
      await after1(h, 'bash', { command: 'ls' }, undefined);
      await after1(h, 'bash', { command: 'ls' }, undefined);
      assert.strictEqual(stderr.filter((l) => l.includes('carried no session id or tool name')).length, 1);
    }

    // 2.x: twelve reads queue the passive-stall line, pushed once by the context hook.
    {
      const s = await plugin2(repo());
      await prompt2(s);
      for (let i = 0; i < 12; i++) await after2(s, 'read', { filePath: '/x' });
      const first = await context2(s, 's1');
      assert.strictEqual(count(first, STALL), 1);
      assert.ok(first.indexOf(STALL) > 0, 'after the preamble');
      assert.strictEqual(count(await context2(s, 's1'), STALL), 0);
    }
    // 2.x: an edit with no passing check is reminded at the next prompt, once.
    {
      const cwd = repo();
      const s = await plugin2(cwd);
      await prompt2(s);
      await after2(s, 'edit', { filePath: path.join(cwd, 'a.ts') });
      await prompt2(s);
      assert.strictEqual(count(await context2(s, 's1'), REMINDER), 1);
      assert.strictEqual(count(await context2(s, 's1'), REMINDER), 0);
    }
    // 2.x: a refused shell call arrives with status error and counts as a failure.
    {
      const s = await plugin2(repo());
      await prompt2(s);
      for (let i = 0; i < 3; i++) {
        const id = `call_${i}`;
        await fire(s, 'tool.execute.before', { tool: 'shell', sessionID: 's1', messageID: 'm', id, input: { command: 'npm test' } });
        await fire(s, 'tool.execute.after', { tool: 'shell', sessionID: 's1', messageID: 'm', id, status: 'error' });
      }
      assert.strictEqual(count(await context2(s, 's1'), REPEAT), 1);
    }
    // 2.x: stop_check off leaves no reminder.
    {
      const cwd = repo({ hooks: { stop_check: false } });
      const s = await plugin2(cwd);
      await prompt2(s);
      await after2(s, 'edit', { filePath: path.join(cwd, 'a.ts') });
      await prompt2(s);
      assert.strictEqual(count(await context2(s, 's1'), REMINDER), 0);
    }
    // 2.x: a context call with no session id keeps the queue; an event with none records nothing.
    {
      const s = await plugin2(repo());
      await prompt2(s);
      for (let i = 0; i < 12; i++) await after2(s, 'read', { filePath: '/x' });
      assert.strictEqual(count(await context2(s), STALL), 0, 'no session id: nothing pushed');
      assert.strictEqual(count(await context2(s, 's1'), STALL), 1, 'the queue was kept');
      const t = await plugin2(repo());
      for (let i = 0; i < 12; i++) await after2(t, 'read', { filePath: '/x' }, null);
      assert.strictEqual(count(await context2(t, 's1'), STALL), 0);
    }

    // Fix round 1. 2.x: a completed shell call with no exit and no output leaves one stderr line and no false reminder.
    {
      stderr.length = 0;
      const cwd = repo({ test_all: 'make test' });
      const s = await plugin2(cwd);
      await prompt2(s);
      await after2(s, 'edit', { filePath: path.join(cwd, 'a.ts') });
      for (let i = 0; i < 2; i++) {
        const id = `blind_${i}`;
        await fire(s, 'tool.execute.before', { tool: 'shell', sessionID: 's1', messageID: 'm', id, input: { command: 'make test' } });
        await fire(s, 'tool.execute.after', { tool: 'shell', sessionID: 's1', messageID: 'm', id, status: 'completed' });
      }
      await prompt2(s);
      assert.strictEqual(count(await context2(s, 's1'), REMINDER_MAKE), 0, 'fx could not see the check, so it does not claim there was none');
      assert.strictEqual(stderr.filter((l) => l.includes('no exit status and no output')).length, 1, 'said once');
    }
    // 2.x: an event with no session id or tool name leaves one stderr line.
    {
      stderr.length = 0;
      const s = await plugin2(repo());
      await after2(s, 'read', {}, null);
      await after2(s, 'read', {}, null);
      assert.strictEqual(stderr.filter((l) => l.includes('carried no session id or tool name')).length, 1);
    }
    // 2.x: a read-only agent named on the prompt event is never nudged.
    {
      const s = await plugin2(repo());
      await fire(s, 'session.prompt', { sessionID: 's1', agent: 'fx-lens-security' });
      for (let i = 0; i < 12; i++) await after2(s, 'read', { filePath: '/x' });
      assert.strictEqual(count(await context2(s, 's1'), STALL), 0);
    }
    // The queue caps lines per session and sessions, and logs a drop.
    {
      scratch();
      const q = createQueue('opencode', '/x');
      for (let i = 0; i < 7; i++) q.enqueue('s1', `line ${i}`);
      assert.deepStrictEqual(q.drain('s1'), ['line 0', 'line 1', 'line 2', 'line 3', 'line 4'], 'five lines per session');
      for (let i = 0; i < 60; i++) q.enqueue(`t${i}`, 'x');
      assert.deepStrictEqual(q.drain('t0'), [], 'the oldest session was evicted');
      assert.deepStrictEqual(q.drain('t59'), ['x']);
      assert.ok(log().includes('queue-dropped'));
    }
  } finally {
    for (const c of cleanups.reverse()) c();
  }
  console.log('opencode-turn tests passed');
}

main().catch((e) => { console.error = () => undefined; process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`); process.exit(1); });
