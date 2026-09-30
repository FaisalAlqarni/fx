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

  fs.rmSync(dir, { recursive: true, force: true });
  console.log('opencode-v2-plugin.test.js: OK');
})().catch((e) => { console.error(e); process.exit(1); });
