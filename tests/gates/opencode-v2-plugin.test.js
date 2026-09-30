'use strict';
// The OpenCode v2 plugin driven with a stub ctx that records registrations.
// The agent editor copies core/src/agent.ts:59-85 and schema/src/agent.ts:39-53.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', '..');
const { render } = require(path.join(root, 'lib', 'preamble'));
const { opencodeCommands } = require(path.join(root, 'lib', 'opencode-commands'));

const HIDDEN = ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup'];

function defaults(id) {
  return {
    id, name: id, request: { settings: {}, headers: {}, body: {} }, mode: 'primary', hidden: false,
    permissions: [
      { action: '*', resource: '*', effect: 'allow' },
      { action: 'external_directory', resource: '*', effect: 'ask' },
      { action: 'read', resource: '*.env', effect: 'ask' },
      { action: 'read', resource: '*.env.*', effect: 'ask' },
      { action: 'read', resource: '*.env.example', effect: 'allow' },
      { action: 'external_directory', resource: '/data/tool-output/*', effect: 'allow' },
    ],
  };
}

function effect(rules, action, resource) {
  const glob = (p, s) => new RegExp('^' + p.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(s);
  let out = 'ask';
  for (const r of rules) if (glob(r.action, action) && glob(r.resource, resource)) out = r.effect;
  return out;
}

function stub(directory, existingAgents = {}, existingCommands = []) {
  const rec = { hooks: {}, agents: new Map(), commands: [], prompts: [] };
  for (const id of ['build', 'plan', 'general']) rec.agents.set(id, defaults(id));
  for (const [id, a] of Object.entries(existingAgents)) rec.agents.set(id, { ...defaults(id), ...JSON.parse(JSON.stringify(a)) });
  const reg = { dispose() {} };
  const hook = (domain) => async (name, cb) => { (rec.hooks[`${domain}.${name}`] ||= []).push(cb); return reg; };
  const editor = {
    get: (id) => rec.agents.get(id),
    list: () => [...rec.agents.values()],
    update(id, fn) { const a = rec.agents.get(id) || defaults(id); rec.agents.set(id, a); fn(a); a.id = id; },
  };
  const deliver = async (req) => { rec.prompts.push(req); };
  const ctx = {
    location: { directory }, options: {},
    session: { hook: hook('session'), prompt: deliver, command: deliver },
    tool: { hook: hook('tool') }, permission: { hook: hook('permission') },
    agent: { transform: async (cb) => { await cb(editor); return reg; } },
    skill: { transform: async () => reg },
    command: {
      list: async () => existingCommands.map((name) => ({ name })),
      transform: async (cb) => { await cb({ add: (d) => rec.commands.push(d) }); return reg; },
    },
  };
  return { rec, ctx };
}

async function evaluate(rec, ev) {
  for (const cb of rec.hooks['permission.evaluate'] || []) await cb(ev);
  return ev;
}

(async () => {
  const mod = await import(pathToFileURL(path.join(root, 'plugins', 'fx-opencode-v2.js')).href);
  assert.strictEqual(mod.default.id, 'fx', 'default export carries the id');
  assert.strictEqual(typeof mod.default.setup, 'function', 'default export carries setup');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-plugin-'));
  const { rec, ctx } = stub(dir, { 'my-agent': { system: 'mine' } });
  await mod.default.setup(ctx);

  const ctxHooks = rec.hooks['session.context'] || [];
  assert.strictEqual(ctxHooks.length, 1, 'one context hook');
  const ev = { system: [] };
  await ctxHooks[0](ev);
  assert.deepStrictEqual(ev.system, [{ type: 'text', text: render({ harness: 'opencode-v2', cwd: dir }) }],
    'the context hook pushes the rendered v2 preamble as a text part');

  for (const name of ['fx-devils-advocate', 'fx-lens-a11y', 'fx-lens-database', 'fx-lens-pipeline', 'fx-lens-security', 'fx-lens-silent-failure']) {
    const a = rec.agents.get(name);
    assert.ok(a, `${name} is registered`);
    assert.strictEqual(a.mode, 'subagent', `${name} is a subagent`);
    assert.strictEqual(effect(a.permissions, 'edit', 'src/x.js'), 'deny', `${name} cannot edit, over the default allow`);
  }

  for (const a of rec.agents.values()) {
    for (const lane of HIDDEN) {
      assert.strictEqual(effect(a.permissions, 'skill', lane), 'deny', `${a.id}: ${lane} is hidden from its skill list`);
    }
  }
  assert.strictEqual(effect(rec.agents.get('build').permissions, 'skill', 'fx-tdd'), 'allow', 'a model-facing lane stays listed');

  const expected = Object.keys(opencodeCommands(root, root)).sort();
  assert.deepStrictEqual(rec.commands.map((c) => c.name).sort(), expected, 'every fx command is registered once');
  for (const c of rec.commands) {
    assert.ok(c.description, `${c.name} has a description`);
    assert.strictEqual(typeof c.execute, 'function', `${c.name} has execute`);
  }
  const audit = rec.commands.find((c) => c.name === 'fx-audit');
  await audit.execute({ sessionID: 'ses_1', prompt: { text: 'src/' }, delivery: 'steer' });
  assert.strictEqual(rec.prompts.length, 1, 'execute prompts the session once');
  const sent = JSON.stringify(rec.prompts[0]);
  assert.ok(sent.includes('ses_1'), 'the prompt goes to the invoking session');
  assert.ok(sent.includes('src/') && !sent.includes('$ARGUMENTS'), 'the arguments replace $ARGUMENTS');

  for (const lane of HIDDEN) {
    const e = await evaluate(rec, { action: 'skill', resources: [lane], effect: 'allow' });
    assert.strictEqual(e.effect, 'deny', `${lane} is refused by the backstop`);
    assert.ok(e.message && e.message.includes(lane), `${lane}'s refusal names it`);
  }
  const open = await evaluate(rec, { action: 'skill', resources: ['fx-tdd'], effect: 'allow' });
  assert.strictEqual(open.effect, 'allow', 'a model-facing lane stays allowed');
  const other = await evaluate(rec, { action: 'read', resources: ['fx-audit'], effect: 'allow' });
  assert.strictEqual(other.effect, 'allow', 'only the skill action is touched');

  const mine = stub(dir, {
    'fx-lens-security': { system: 'user owned' },
    'keeps-audit': { permissions: [{ action: 'skill', resource: 'fx-audit', effect: 'allow' }] },
  }, ['fx-audit']);
  await mod.default.setup(mine.ctx);
  assert.strictEqual(mine.rec.agents.get('fx-lens-security').system, 'user owned', "a user's own agent definition wins");
  assert.strictEqual(effect(mine.rec.agents.get('keeps-audit').permissions, 'skill', 'fx-audit'), 'allow', "a user's explicit skill rule wins");
  assert.ok(!mine.rec.commands.some((c) => c.name === 'fx-audit'), 'a command already listed is not added again');

  // --- guard: the full command, looked up by call id ------------------------
  const g = stub(dir);
  await mod.default.setup(g.ctx);
  let n = 0;
  async function shell(command, pieces) {
    const id = `call_${++n}`;
    for (const cb of g.rec.hooks['tool.execute.before'] || []) await cb({ tool: 'shell', sessionID: 's', agent: 'build', messageID: 'm', id, input: { command } });
    const e = await evaluate(g.rec, { action: 'shell', resources: pieces || [command], source: { type: 'tool', messageID: 'm', id }, effect: 'allow' });
    for (const cb of g.rec.hooks['tool.execute.after'] || []) await cb({ tool: 'shell', id, status: 'completed' });
    return e;
  }
  for (const [cmd, pieces] of [
    ['git push --force origin main'],
    ['bash -c "git reset --hard"'],
    ['git commit --no-verify -m x'],
    ["bash <<'EOF'\ngit reset --hard\nEOF", ["bash <<'EOF'"]],
    // Known gap, for task 09: `echo "git reset --hard" | sh` is allowed by lib/git-guard.js
    // (a quoted echo body feeding a shell is not scanned), so it is not asserted here.
  ]) {
    const e = await shell(cmd, pieces);
    assert.strictEqual(e.effect, 'deny', `the guard refuses the full command: ${cmd}`);
    assert.ok(e.message, `the refusal carries the guard's reason: ${cmd}`);
  }
  for (const cmd of ['git status', 'ls']) assert.strictEqual((await shell(cmd)).effect, 'allow', `${cmd} is untouched`);

  const miss = await evaluate(g.rec, { action: 'shell', resources: ['ls'], source: { type: 'tool', messageID: 'm', id: 'never_recorded' }, effect: 'allow' });
  assert.strictEqual(miss.effect, 'deny', 'a call id with no recorded command is denied');
  const nosrc = await evaluate(g.rec, { action: 'shell', resources: ['ls'], effect: 'allow' });
  assert.strictEqual(nosrc.effect, 'deny', 'a shell evaluation with no source is denied');

  // --- fail closed: a guard that cannot load, and a guard that throws -------
  async function withGuard(guardSource) {
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-broken-'));
    for (const d of ['plugins', 'lib', 'agents', 'codex', 'commands', 'skills', 'references']) fs.cpSync(path.join(root, d), path.join(copy, d), { recursive: true });
    for (const f of ['PREAMBLE.md', 'package.json']) if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(copy, f));
    fs.writeFileSync(path.join(copy, 'lib', 'git-guard.js'), guardSource);
    const m = await import(pathToFileURL(path.join(copy, 'plugins', 'fx-opencode-v2.js')).href);
    const b = stub(dir);
    await m.default.setup(b.ctx);
    for (const cb of b.rec.hooks['tool.execute.before'] || []) await cb({ tool: 'shell', id: 'c1', input: { command: 'ls' } });
    const e = await evaluate(b.rec, { action: 'shell', resources: ['ls'], source: { type: 'tool', messageID: 'm', id: 'c1' }, effect: 'allow' });
    fs.rmSync(copy, { recursive: true, force: true });
    return e;
  }
  assert.strictEqual((await withGuard("throw new Error('load');\n")).effect, 'deny', 'a guard that cannot load denies every shell call');
  const threw = await withGuard("module.exports = { inspect() { throw new Error('inspect broke'); } };\n");
  assert.strictEqual(threw.effect, 'deny', 'a throwing inspect denies, and the hook does not reject');
  assert.ok(/inspect broke/.test(threw.message), 'the denial names the error');

  // --- lane check: absolute and project-relative resources ------------------
  const lc = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-lane-'));
  const l = stub(lc);
  await mod.default.setup(l.ctx);
  const edit = (r) => evaluate(l.rec, { action: 'edit', resources: [r], effect: 'allow' });
  assert.strictEqual((await edit(path.join(lc, 'app.js'))).effect, 'deny', 'the lane check refuses a first write (absolute)');
  const lc2 = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-lane-'));
  const l2 = stub(lc2);
  await mod.default.setup(l2.ctx);
  const here = process.cwd();
  process.chdir(os.tmpdir());
  const rel = await evaluate(l2.rec, { action: 'edit', resources: ['app.js'], effect: 'allow' });
  process.chdir(here);
  assert.strictEqual(rel.effect, 'deny', 'a project-relative resource is resolved against the project, not process.cwd()');
  assert.strictEqual((await edit(path.join(lc, 'README.md'))).effect, 'allow', 'prose is not nudged');
  assert.strictEqual((await evaluate(l.rec, { action: 'edit', resources: [42], effect: 'allow' })).effect, 'allow', 'a lane-check crash leaves the edit alone');
  fs.rmSync(lc, { recursive: true, force: true });
  fs.rmSync(lc2, { recursive: true, force: true });

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('opencode-v2-plugin.test.js: OK');
})().catch((e) => { console.error(e); process.exit(1); });
