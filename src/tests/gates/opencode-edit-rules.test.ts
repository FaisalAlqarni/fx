// Run: node tests/gates/opencode-edit-rules.test.js
// Edit rules on opencode 1.x and 2.x, at the plugin seam: both plugins
// imported in-process under scratch homes, their hooks called with
// recorded-shape inputs.
// Every edit's content is data: nothing here writes the file it names.
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { spawnSync } from 'child_process';
import { applyScratchEnv, readDecisionLog, type HookDirs } from '../helpers/hook-env.js';
import { FX_JSON_NOTICE } from '../../lib/fx-json-watch.js';
import { hardReason } from '../../lib/shell-rules.js';
import { render } from '../../lib/preamble.js';
import type { fx as FxPlugin } from '../../plugins/fx-opencode-v1.js';

const ROOT = path.join(__dirname, '..', '..');
const EM = String.fromCodePoint(0x2014);
const DASH = '[fx] rule no-dashes: Prose uses no em dash (U+2014) or en dash (U+2013) characters. (docs/a.md)';
const TODO = { id: 'no-todo', glob: '**/*.rb', rule: 'No TODO comments.' };
const V2_GAP = 'GAP: opencode 2.x shows no notice when the .fx.json hook switches change during a session.';

type Hooks = Awaited<ReturnType<typeof FxPlugin>>;
type Ev = { [k: string]: unknown };
type Hook = (ev: Ev) => unknown;
interface V2Plugin { default: { setup(ctx: unknown): Promise<void> } }

function get(v: unknown, ...keys: string[]): unknown {
  let cur = v;
  for (const k of keys) cur = typeof cur === 'object' && cur !== null ? Reflect.get(cur, k) : undefined;
  return cur;
}
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
const count = (lines: string[], line: string) => lines.filter((l) => l === line).length;

const stderr: string[] = [];
console.error = (m: unknown) => { stderr.push(String(m)); };

// Fresh scratch homes in process.env per case; the finally block undoes them newest first.
const cleanups: (() => void)[] = [];
function scratch(): HookDirs {
  const s = applyScratchEnv();
  cleanups.push(s.restore);
  return s.dirs;
}

// The ctx slice the 2.x plugin registers through. `during` is a tool call
// made the moment execute.before registers, while setup is still running.
function stub(directory: string, during?: Ev): { hooks: Record<string, Hook[]>; ctx: unknown; duringErrors: unknown[] } {
  const hooks: Record<string, Hook[]> = {};
  const duringErrors: unknown[] = [];
  const reg = { dispose() {} };
  const hook = (domain: string) => async (name: string, cb: Hook) => {
    (hooks[`${domain}.${name}`] ||= []).push(cb);
    if (during && domain === 'tool' && name === 'execute.before') {
      try { await cb(during); } catch (e) { duringErrors.push(e); }
    }
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
  return { hooks, ctx, duringErrors };
}

async function main(): Promise<void> {
  const fx: typeof FxPlugin = (await import(path.join(ROOT, 'plugins', 'fx-opencode-v1.js'))).fx;
  const v2: V2Plugin = await import(pathToFileURL(path.join(ROOT, 'plugins', 'fx-opencode-v2.js')).href);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-oc-edit-rules-'));
  cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
  let repos = 0;
  const repo = (files: Record<string, string> = {}): string => {
    const dir = path.join(tmp, `r${repos++}`);
    fs.mkdirSync(dir);
    assert.strictEqual(spawnSync('git', ['init', '-q', dir]).status, 0);
    fs.writeFileSync(path.join(dir, '.fx.json'), JSON.stringify({ rules: [TODO] }));
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    }
    return dir;
  };
  // A scratch copy of the plugins with one lib module replaced.
  const copyWith = (lib: string, source: string): string => {
    const copy = path.join(tmp, `copy${repos++}`);
    for (const d of ['plugins', 'lib', 'agents', 'codex', 'commands', 'skills', 'references']) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
    for (const f of ['PREAMBLE.md', 'package.json']) if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(copy, f));
    fs.copyFileSync(path.join(ROOT, 'lib', lib), path.join(copy, 'lib', `real-${lib}`));
    fs.writeFileSync(path.join(copy, 'lib', lib), source);
    return copy;
  };
  const ruleErrors = (dirs: HookDirs) => readDecisionLog(dirs).filter((e) => get(e, 'event') === 'edit-rule' && get(e, 'source') === 'error');

  // opencode 1.x.
  const v1 = async (opts: { files?: Record<string, string>; root?: string } = {}): Promise<{ h: Hooks; dir: string; dirs: HookDirs }> => {
    const dirs = scratch();
    const dir = repo(opts.files);
    const plugin: typeof FxPlugin = opts.root === undefined ? fx : (await import(path.join(opts.root, 'plugins', 'fx-opencode-v1.js'))).fx;
    return { h: await plugin({ directory: dir }), dir, dirs };
  };
  const call = (h: Hooks, tool: string, args: unknown) => h['tool.execute.before']({ tool, sessionID: 's' }, { args });
  const RB = { filePath: 'app/a.rb', content: '# TODO later\n' };
  const transform = async (h: Hooks): Promise<string[]> => {
    const out = { system: [] as string[] };
    await h['experimental.chat.system.transform']({ sessionID: 's' }, out);
    return out.system;
  };
  const userMessage = (h: Hooks) =>
    h['chat.message']({ sessionID: 's', agent: 'build', model: { providerID: 'p', modelID: 'm' }, messageID: 'msg1', variant: undefined });

  // opencode 2.x.
  const v2Setup = async (opts: { root?: string; during?: Ev } = {}) => {
    const dirs = scratch();
    const dir = repo();
    const s = stub(dir, opts.during);
    const plugin: V2Plugin = opts.root === undefined ? v2 : await import(pathToFileURL(path.join(opts.root, 'plugins', 'fx-opencode-v2.js')).href);
    await plugin.default.setup(s.ctx);
    const before = (s.hooks['tool.execute.before'] ?? [])[0];
    assert.ok(before, 'execute.before is registered');
    const context = async (): Promise<string[]> => {
      const ev: { system: { text: string }[]; sessionID: string } = { system: [], sessionID: 's' };
      for (const cb of s.hooks['session.context'] ?? []) await cb(ev);
      return ev.system.map((t) => t.text);
    };
    return { before, context, dir, dirs, duringErrors: s.duringErrors };
  };
  let n = 0;
  const v2Event = (tool: string, input: unknown): Ev => ({ tool, sessionID: 's', messageID: 'm', id: `call_${n++}`, input });
  const V2_RB = { path: 'app/a.rb', oldString: 'x', newString: 'x\n# TODO later' };

  try {
    // 1.x: a built-in breach refuses on each write tool.
    for (const [tool, args] of [
      ['write', { filePath: 'docs/a.md', content: `# T\nan ${EM} b\n` }],
      ['edit', { filePath: 'docs/a.md', oldString: 'a', newString: `an ${EM} b` }],
      ['apply_patch', { patchText: `*** Begin Patch\n*** Add File: docs/a.md\n+an ${EM} b\n*** End Patch` }],
    ] as const) {
      const { h } = await v1();
      await assert.rejects(call(h, tool, args), { message: DASH }, tool);
    }
    // 1.x: an old em dash on disk never blocks a clean addition.
    {
      const old = `old ${EM} line\n`;
      const { h } = await v1({ files: { 'docs/a.md': old } });
      await call(h, 'write', { filePath: 'docs/a.md', content: `${old}new clean line\n` });
    }
    // 1.x: a repository rule in .fx.json is ignored silently (ADR 0049).
    {
      const { h, dir, dirs } = await v1();
      await call(h, 'write', RB);
      assert.deepStrictEqual(readDecisionLog(dirs), []);
      assert.deepStrictEqual(await transform(h), [render({ harness: 'opencode', cwd: dir })]);
    }
    // 1.x: fx's own state still refuses first, as today.
    {
      const { h, dirs } = await v1();
      await assert.rejects(call(h, 'write', { filePath: path.join(dirs.state, 'x.rb'), content: '# TODO later\n' }), { message: hardReason('fx-state') });
    }
    // 1.x Stop: a .fx.json change after the session's first Stop is noticed once at the next.
    {
      const { h, dir, dirs } = await v1();
      await userMessage(h);
      assert.strictEqual(count(await transform(h), FX_JSON_NOTICE), 0);
      fs.writeFileSync(path.join(dir, '.fx.json'), JSON.stringify({ rules: [TODO], hooks: { stop_check: false } }));
      stderr.length = 0;
      await userMessage(h);
      // The user sees it on stderr too: the queue reaches only the model (final review U5).
      assert.strictEqual(stderr.filter((l) => l.includes(FX_JSON_NOTICE)).length, 1, stderr.join('\n'));
      assert.strictEqual(count(await transform(h), FX_JSON_NOTICE), 1);
      await userMessage(h);
      assert.strictEqual(count(await transform(h), FX_JSON_NOTICE), 0, 'told once');
      // The same decision-log line as Claude Code and Codex (review minor 6).
      const notices = readDecisionLog(dirs).filter((e) => get(e, 'source') === 'fx-json');
      assert.deepStrictEqual(notices.map((e) => [get(e, 'event'), get(e, 'action'), get(e, 'harness'), get(e, 'session')]), [['health', 'notice', 'opencode', 's']]);
    }
    assert.deepStrictEqual(stderr.filter((l) => l.startsWith('[fx] edit rules off')), []);
    // 1.x: a failed fx-json-watch load is said once (review minor 4).
    {
      const { h } = await v1({ root: copyWith('fx-json-watch.js', "throw new Error('watch load');\n") });
      stderr.length = 0;
      await userMessage(h);
      await userMessage(h);
      assert.strictEqual(stderr.filter((l) => l === '[fx] the .fx.json change notice is off: watch load').length, 1, stderr.join('\n'));
    }
    // 1.x: a failed edit-rules load allows each edit and logs one error line per edit (silent-failure 1).
    {
      const { h, dirs } = await v1({ root: copyWith('edit-rules.js', "throw new Error('rules load');\n") });
      await call(h, 'write', { filePath: 'docs/a.md', content: `an ${EM} b\n` });
      await call(h, 'edit', { filePath: 'docs/a.md', oldString: 'a', newString: `an ${EM} b` });
      const lines = ruleErrors(dirs);
      assert.strictEqual(lines.length, 2, JSON.stringify(lines));
      for (const l of lines) assert.deepStrictEqual([get(l, 'action'), get(l, 'harness'), get(l, 'session'), get(l, 'unavailable')], ['allow', 'opencode', 's', 'rules load']);
    }

    stderr.length = 0;
    // 2.x: a built-in breach throws synchronously.
    for (const [tool, input] of [
      ['edit', { path: 'docs/a.md', oldString: 'a', newString: `an ${EM} b` }],
      ['write', { path: 'docs/a.md', content: `an ${EM} b\n` }],
      ['patch', { patchText: `*** Begin Patch\n*** Add File: docs/a.md\n+an ${EM} b\n*** End Patch` }],
    ] as const) {
      const { before } = await v2Setup();
      assert.throws(() => before(v2Event(tool, input)), { message: DASH }, tool);
    }
    assert.deepStrictEqual(stderr.filter((l) => l.startsWith('[fx] edit rules off')), []);
    // 2.x: a failed load, or a missing export, allows each edit and logs one error line per edit (silent-failure 1).
    for (const [source, unavailable] of [
      ["throw new Error('rules load');\n", 'rules load'],
      ["const r = require('./real-edit-rules.js');\nmodule.exports = { checkEdit: r.checkEdit, logEditRuleError: r.logEditRuleError };\n", 'checkBuiltins is not a function'],
    ] as const) {
      const { before, dirs } = await v2Setup({ root: copyWith('edit-rules.js', source) });
      assert.strictEqual(before(v2Event('edit', { path: 'docs/a.md', oldString: 'a', newString: `an ${EM} b` })), undefined);
      assert.strictEqual(before(v2Event('write', { path: 'docs/a.md', content: `an ${EM} b\n` })), undefined);
      const lines = ruleErrors(dirs);
      assert.strictEqual(lines.length, 2, JSON.stringify(lines));
      for (const l of lines) assert.deepStrictEqual([get(l, 'action'), get(l, 'harness'), get(l, 'session'), get(l, 'unavailable')], ['allow', 'opencode-v2', 's', unavailable]);
    }
    // 2.x: one built-in step per edit, so a crash in it is logged once (review minor 2).
    {
      const { before, dirs } = await v2Setup();
      const input = { oldString: 'a', newString: 'b', get path(): string { throw new Error('path broke'); } };
      await before(v2Event('edit', input));
      await wait(50);
      const lines = ruleErrors(dirs);
      assert.strictEqual(lines.length, 1, JSON.stringify(lines));
      assert.strictEqual(get(lines[0], 'unavailable'), 'path broke');
    }
    // 2.x: a tool call while setup is still running fails open, never a ReferenceError (review minor 3).
    {
      const { duringErrors } = await v2Setup({ root: copyWith('edit-rules.js', "throw new Error('rules load');\n"), during: v2Event('edit', { path: 'docs/a.md', oldString: 'a', newString: 'b' }) });
      assert.deepStrictEqual(duringErrors.map(String), []);
    }
    // The 2.x reference records the notice gap.
    {
      const ref = fs.readFileSync(path.join(ROOT, 'references', 'harnesses', 'opencode-v2.md'), 'utf8');
      assert.ok(ref.includes(V2_GAP));
    }
  } finally {
    for (const c of cleanups.reverse()) c();
  }
  console.log('opencode-edit-rules.test.js: ok');
}

main().catch((e) => { process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`); process.exit(1); });
