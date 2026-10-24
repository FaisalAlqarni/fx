// generated from src/lib/opencode-malformed.test.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var assert = __toESM(require("assert"));
var path = __toESM(require("path"));
var import_url = require("url");
var import_hook_env = require("../tests/helpers/hook-env.js");
const plugins = path.join(__dirname, "..", "plugins");
async function main() {
  const scratchEnv = (0, import_hook_env.applyScratchEnv)();
  const errors = [];
  console.error = (m) => {
    errors.push(String(m));
  };
  const v1 = await import((0, import_url.pathToFileURL)(path.join(plugins, "fx-opencode-v1.js")).href);
  const badConfigs = {
    "agent.general is true": { agent: { general: true } },
    "agent.general is a string": { agent: { general: "x" } },
    "permission is a number": { permission: 5 },
    "permission is true": { permission: true },
    "permission.skill is a number": { permission: { skill: 5 } },
    "permission.skill is true": { permission: { skill: true } }
  };
  for (const [label, config] of Object.entries(badConfigs)) {
    const agent = config.agent;
    errors.length = 0;
    await (await v1.fx({ directory: "/tmp" })).config(config);
    assert.strictEqual(errors.length, 1, `v1 ${label}: the config step reports it`);
    assert.strictEqual(config.subagent_depth, void 0, `v1 ${label}: depth is not raised`);
    assert.strictEqual(config.command, void 0, `v1 ${label}: no command is registered`);
    if (agent !== void 0) assert.deepStrictEqual(config.agent, agent, `v1 ${label}: agent is left alone`);
  }
  const good = {};
  errors.length = 0;
  await (await v1.fx({ directory: "/tmp" })).config(good);
  assert.strictEqual(errors.length, 0, "v1: a well-formed config is not reported");
  assert.strictEqual(good.subagent_depth, 2, "v1: a well-formed config gets depth 2");
  const v2 = await import((0, import_url.pathToFileURL)(path.join(plugins, "fx-opencode-v2.js")).href);
  const hooks = {};
  const record = async (n, f) => {
    hooks[n] = f;
  };
  await v2.default.setup({
    location: { directory: "/tmp" },
    permission: { hook: record },
    tool: { hook: record },
    session: { hook: record, prompt: async () => void 0 },
    agent: {
      transform: (fn) => fn({
        list: () => [{ id: "build" }],
        update: (id, f) => f({ id, permissions: [] })
      })
    },
    command: { transform: async (fn) => fn({ add: () => void 0 }) }
  });
  const lane = "fx-grill";
  const evaluate = async (ev) => {
    errors.length = 0;
    const evaluateHook = hooks.evaluate;
    assert.ok(evaluateHook, "v2 registers evaluate");
    await evaluateHook(ev);
    return { effect: ev.effect, reported: errors.length };
  };
  const skill = (resources, agent = "build") => ({ action: "skill", agent, resources, effect: "allow" });
  assert.strictEqual((await evaluate(skill(lane))).effect, "deny", "string naming a hidden lane is denied");
  assert.deepStrictEqual(await evaluate(skill("tdd")), { effect: "allow", reported: 1 }, "string naming another skill");
  assert.deepStrictEqual(await evaluate(skill(5)), { effect: "allow", reported: 1 }, "number");
  assert.deepStrictEqual(await evaluate(skill({ a: 1 })), { effect: "allow", reported: 1 }, "object");
  assert.deepStrictEqual(await evaluate(skill([lane])), { effect: "allow", reported: 0 }, "list, user rule beat the deny");
  assert.strictEqual((await evaluate(skill([lane], "unknown-agent"))).effect, "deny", "list, runtime default allow");
  const edit = (resources) => ({ action: "edit", agent: "build", resources, effect: "allow" });
  assert.deepStrictEqual(await evaluate(edit([5])), { effect: "allow", reported: 1 }, "number resource");
  assert.deepStrictEqual(await evaluate(edit({})), { effect: "allow", reported: 1 }, "object resources");
  assert.deepStrictEqual(await evaluate(edit(void 0)), { effect: "allow", reported: 0 }, "no resources");
  const call = async (name, ev) => {
    errors.length = 0;
    const hook = hooks[name];
    assert.ok(hook, `v2 registers ${name}`);
    try {
      await hook(ev);
      return { threw: false, reported: errors.length };
    } catch {
      return { threw: true, reported: errors.length };
    }
  };
  assert.strictEqual((await call("execute.before", null)).threw, true, "null before-event is refused");
  assert.strictEqual((await call("execute.before", void 0)).threw, true, "undefined before-event is refused");
  assert.strictEqual((await call("execute.before", 42)).threw, false, "number before-event");
  assert.strictEqual((await call("execute.before", { tool: "edit" })).threw, false, "non-shell tool");
  assert.deepStrictEqual(await call("execute.after", null), { threw: false, reported: 2 }, "null after-event");
  assert.deepStrictEqual(await call("execute.after", 42), { threw: false, reported: 0 }, "number after-event");
  scratchEnv.restore();
  console.log("opencode-malformed tests passed");
}
main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}
`);
  process.exit(1);
});
