// Malformed input to the opencode plugins. Every expectation below was
// recorded from the JavaScript plugins at d7ce641 (before the TypeScript
// port) by running them on the same inputs: the port must reproduce them.
import * as assert from 'assert';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { applyScratchEnv } from '../tests/helpers/hook-env.js';

const plugins = path.join(__dirname, '..', 'plugins');

type Hook = (ev: unknown) => unknown;

async function main(): Promise<void> {
  // The v1 plugin writes the state directory: scratch homes only.
  const scratchEnv = applyScratchEnv();
  const errors: string[] = [];
  console.error = (m: unknown) => { errors.push(String(m)); };

  // v1: a config value of the wrong type is reported by the config step and
  // nothing is granted (no task allow, no depth raise, no commands).
  const v1: { fx: (a: { directory: string }) => Promise<{ config: (c: Record<string, unknown>) => Promise<void> }> } =
    await import(pathToFileURL(path.join(plugins, 'fx-opencode-v1.js')).href);
  const badConfigs: Record<string, Record<string, unknown>> = {
    'agent.general is true': { agent: { general: true } },
    'agent.general is a string': { agent: { general: 'x' } },
    'permission is a number': { permission: 5 },
    'permission is true': { permission: true },
    'permission.skill is a number': { permission: { skill: 5 } },
    'permission.skill is true': { permission: { skill: true } },
  };
  for (const [label, config] of Object.entries(badConfigs)) {
    const agent = config.agent;
    errors.length = 0;
    await (await v1.fx({ directory: '/tmp' })).config(config);
    assert.strictEqual(errors.length, 1, `v1 ${label}: the config step reports it`);
    assert.strictEqual(config.subagent_depth, undefined, `v1 ${label}: depth is not raised`);
    assert.strictEqual(config.command, undefined, `v1 ${label}: no command is registered`);
    if (agent !== undefined) assert.deepStrictEqual(config.agent, agent, `v1 ${label}: agent is left alone`);
  }
  const good: Record<string, unknown> = {};
  errors.length = 0;
  await (await v1.fx({ directory: '/tmp' })).config(good);
  assert.strictEqual(errors.length, 0, 'v1: a well-formed config is not reported');
  assert.strictEqual(good.subagent_depth, 2, 'v1: a well-formed config gets depth 2');

  // v2: drive setup with a recording context.
  const v2: { default: { setup: (ctx: unknown) => Promise<void> } } =
    await import(pathToFileURL(path.join(plugins, 'fx-opencode-v2.js')).href);
  const hooks: Record<string, Hook> = {};
  const record = async (n: string, f: Hook) => { hooks[n] = f; };
  await v2.default.setup({
    location: { directory: '/tmp' },
    permission: { hook: record },
    tool: { hook: record },
    session: { hook: record, prompt: async () => undefined },
    agent: {
      transform: (fn: (e: unknown) => void) => fn({
        list: () => [{ id: 'build' }],
        update: (id: string, f: (a: unknown) => void) => f({ id, permissions: [] }),
      }),
    },
    command: { transform: async (fn: (e: unknown) => void) => fn({ add: () => undefined }) },
  });

  const lane = 'fx-grill';
  const evaluate = async (ev: Record<string, unknown>) => {
    errors.length = 0;
    const evaluateHook = hooks.evaluate;
    assert.ok(evaluateHook, 'v2 registers evaluate');
    await evaluateHook(ev);
    return { effect: ev.effect, reported: errors.length };
  };
  const skill = (resources: unknown, agent = 'build') => ({ action: 'skill', agent, resources, effect: 'allow' });

  // A skill request whose resources is not a list: a hidden lane named in it is denied.
  assert.strictEqual((await evaluate(skill(lane))).effect, 'deny', 'string naming a hidden lane is denied');
  assert.deepStrictEqual(await evaluate(skill('tdd')), { effect: 'allow', reported: 1 }, 'string naming another skill');
  assert.deepStrictEqual(await evaluate(skill(5)), { effect: 'allow', reported: 1 }, 'number');
  assert.deepStrictEqual(await evaluate(skill({ a: 1 })), { effect: 'allow', reported: 1 }, 'object');
  // Well-formed lists are unchanged.
  assert.deepStrictEqual(await evaluate(skill([lane])), { effect: 'allow', reported: 0 }, 'list, user rule beat the deny');
  assert.strictEqual((await evaluate(skill([lane], 'unknown-agent'))).effect, 'deny', 'list, runtime default allow');

  // An edit resource that is not a string is reported and the edit stays open.
  const edit = (resources: unknown) => ({ action: 'edit', agent: 'build', resources, effect: 'allow' });
  assert.deepStrictEqual(await evaluate(edit([5])), { effect: 'allow', reported: 1 }, 'number resource');
  assert.deepStrictEqual(await evaluate(edit({})), { effect: 'allow', reported: 1 }, 'object resources');
  assert.deepStrictEqual(await evaluate(edit(undefined)), { effect: 'allow', reported: 0 }, 'no resources');

  // execute.before: a missing event refused the call; other non-objects read as no tool.
  const call = async (name: string, ev: unknown) => {
    errors.length = 0;
    const hook = hooks[name];
    assert.ok(hook, `v2 registers ${name}`);
    try { await hook(ev); return { threw: false, reported: errors.length }; } catch { return { threw: true, reported: errors.length }; }
  };
  assert.strictEqual((await call('execute.before', null)).threw, true, 'null before-event is refused');
  assert.strictEqual((await call('execute.before', undefined)).threw, true, 'undefined before-event is refused');
  assert.strictEqual((await call('execute.before', 42)).threw, false, 'number before-event');
  assert.strictEqual((await call('execute.before', { tool: 'edit' })).threw, false, 'non-shell tool');
  // execute.after: a missing event is reported, never thrown: the forget step and, once per instance, the tracker's no-session line.
  assert.deepStrictEqual(await call('execute.after', null), { threw: false, reported: 2 }, 'null after-event');
  assert.deepStrictEqual(await call('execute.after', 42), { threw: false, reported: 0 }, 'number after-event');

  scratchEnv.restore();
  console.log('opencode-malformed tests passed');
}

main().catch((e: unknown) => { process.stderr.write(`${e instanceof Error ? e.stack : String(e)}\n`); process.exit(1); });
