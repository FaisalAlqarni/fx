// generated from src/tests/gates/opencode-v2-plugin.test.ts by scripts/build: edit there, not here
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
var assert = __toESM(require("node:assert"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_preamble = require("../../lib/preamble.js");
var import_opencode_commands = require("../../lib/opencode-commands.js");
var import_user_invoked_lanes = require("../../lib/user-invoked-lanes.js");
var import_url = require("url");
var import_hook_env = require("../helpers/hook-env.js");
const root = path.join(__dirname, "..", "..");
const need = (v, what) => {
  if (v === void 0) throw new Error(`missing ${what}`);
  return v;
};
const agentOf = (rec, id) => need(rec.agents.get(id), `agent ${id}`);
const HIDDEN = import_user_invoked_lanes.USER_INVOKED_LANES;
function defaults(id) {
  return {
    id,
    name: id,
    request: { settings: {}, headers: {}, body: {} },
    mode: "primary",
    hidden: false,
    permissions: [
      { action: "*", resource: "*", effect: "allow" },
      { action: "external_directory", resource: "*", effect: "ask" },
      { action: "read", resource: "*.env", effect: "ask" },
      { action: "read", resource: "*.env.*", effect: "ask" },
      { action: "read", resource: "*.env.example", effect: "allow" },
      { action: "external_directory", resource: "/data/tool-output/*", effect: "allow" }
    ]
  };
}
function effect(rules, action, resource) {
  const glob = (p, s) => new RegExp("^" + p.split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$").test(s);
  let out = "ask";
  for (const r of rules) if (glob(r.action, action) && glob(r.resource, resource)) out = r.effect;
  return out;
}
function stub(directory, existingAgents = {}, existingCommands = []) {
  const rec = { hooks: {}, agents: /* @__PURE__ */ new Map(), commands: [], prompts: [] };
  for (const id of ["build", "plan", "general"]) rec.agents.set(id, defaults(id));
  agentOf(rec, "general").permissions.push({ action: "subagent", resource: "*", effect: "deny" });
  for (const [id, a] of Object.entries(existingAgents)) rec.agents.set(id, { ...defaults(id), ...JSON.parse(JSON.stringify(a)) });
  const reg = { dispose() {
  } };
  const hook = (domain) => async (name, cb) => {
    (rec.hooks[`${domain}.${name}`] ||= []).push(cb);
    return reg;
  };
  const editor = {
    get: (id) => rec.agents.get(id),
    list: () => [...rec.agents.values()],
    update(id, fn) {
      const a = rec.agents.get(id) || defaults(id);
      rec.agents.set(id, a);
      fn(a);
      a.id = id;
    }
  };
  const deliver = async (req) => {
    rec.prompts.push(req);
  };
  const ctx = {
    location: { directory },
    options: {},
    session: { hook: hook("session"), prompt: deliver, command: deliver },
    tool: { hook: hook("tool") },
    permission: { hook: hook("permission") },
    agent: { transform: async (cb) => {
      await cb(editor);
      return reg;
    } },
    skill: { transform: async () => reg },
    command: {
      list: async () => existingCommands.map((name) => ({ name })),
      transform: async (cb) => {
        await cb({ add: (d) => rec.commands.push(d) });
        return reg;
      }
    }
  };
  return { rec, ctx };
}
async function evaluate(rec, ev) {
  for (const cb of rec.hooks["permission.evaluate"] || []) await cb(ev);
  return ev;
}
const scratchEnv = (0, import_hook_env.applyScratchEnv)();
(async () => {
  const mod = await import((0, import_url.pathToFileURL)(path.join(root, "plugins", "fx-opencode-v2.js")).href);
  assert.strictEqual(mod.default.id, "fx", "default export carries the id");
  assert.strictEqual(typeof mod.default.setup, "function", "default export carries setup");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fx-v2-plugin-"));
  const { rec, ctx } = stub(dir, { "my-agent": { system: "mine" } });
  await mod.default.setup(ctx);
  const ctxHooks = rec.hooks["session.context"] || [];
  assert.strictEqual(ctxHooks.length, 1, "one context hook");
  const ev = { system: [] };
  await need(ctxHooks[0], "the context hook")(ev);
  assert.deepStrictEqual(
    ev.system,
    [{ type: "text", text: (0, import_preamble.render)({ harness: "opencode-v2", cwd: dir }) }],
    "the context hook pushes the rendered v2 preamble as a text part"
  );
  for (const name of ["fx-devils-advocate", "fx-lens-a11y", "fx-lens-database", "fx-lens-pipeline", "fx-lens-security", "fx-lens-silent-failure"]) {
    const a = rec.agents.get(name);
    assert.ok(a, `${name} is registered`);
    assert.strictEqual(a.mode, "subagent", `${name} is a subagent`);
    assert.strictEqual(effect(a.permissions, "edit", "src/x.js"), "deny", `${name} cannot edit, over the default allow`);
  }
  for (const a of rec.agents.values()) {
    for (const lane of HIDDEN) {
      assert.strictEqual(effect(a.permissions, "skill", lane), "deny", `${a.id}: ${lane} is hidden from its skill list`);
    }
  }
  assert.strictEqual(effect(agentOf(rec, "build").permissions, "skill", "fx-tdd"), "allow", "a model-facing lane stays listed");
  for (const a of rec.agents.values()) {
    assert.ok(!a.permissions.some((r) => r.action === "subagent" && r.effect === "allow"), `${a.id}: fx adds no subagent allow`);
  }
  assert.strictEqual(effect(agentOf(rec, "general").permissions, "subagent", "general"), "deny", "general keeps the built-in subagent deny");
  assert.notStrictEqual(effect(agentOf(rec, "fx-lens-security").permissions, "subagent", "general"), "allow", "a read-only lens still cannot dispatch");
  const expected = Object.keys((0, import_opencode_commands.opencodeCommands)(root, root)).sort();
  assert.deepStrictEqual(rec.commands.map((c) => c.name).sort(), expected, "every fx command is registered once");
  for (const c of rec.commands) {
    assert.ok(c.description, `${c.name} has a description`);
    assert.strictEqual(typeof c.execute, "function", `${c.name} has execute`);
  }
  const audit = need(rec.commands.find((c) => c.name === "fx-audit"), "the fx-audit command");
  await audit.execute({ sessionID: "ses_1", prompt: { text: "src/" }, delivery: "steer" });
  assert.strictEqual(rec.prompts.length, 1, "execute prompts the session once");
  const sent = JSON.stringify(rec.prompts[0]);
  assert.ok(sent.includes("ses_1"), "the prompt goes to the invoking session");
  assert.ok(sent.includes("src/") && !sent.includes("$ARGUMENTS"), "the arguments replace $ARGUMENTS");
  for (const lane of HIDDEN) {
    const e = await evaluate(rec, { action: "skill", resources: [lane], agent: "build", effect: "deny" });
    assert.strictEqual(e.effect, "deny", `${lane} stays denied when fx's own rule won`);
    assert.ok(e.message && e.message.includes(lane), `${lane}'s refusal names it`);
    const yes = await evaluate(rec, { action: "skill", resources: [lane], agent: "build", effect: "allow" });
    assert.strictEqual(yes.effect, "allow", `${lane}: the user's allow on an agent fx configured is honoured`);
    const ghost = await evaluate(rec, { action: "skill", resources: [lane], agent: "ghost", effect: "allow" });
    assert.strictEqual(ghost.effect, "deny", `${lane} is refused for an agent fx never processed`);
    assert.ok(ghost.message && ghost.message.includes(lane), `${lane}'s backstop refusal names it`);
  }
  const open = await evaluate(rec, { action: "skill", resources: ["fx-tdd"], effect: "allow" });
  assert.strictEqual(open.effect, "allow", "a model-facing lane stays allowed");
  const other = await evaluate(rec, { action: "read", resources: ["fx-audit"], effect: "allow" });
  assert.strictEqual(other.effect, "allow", "only the skill action is touched");
  const mine = stub(dir, {
    "fx-lens-security": { system: "user owned" },
    "keeps-audit": { permissions: [{ action: "skill", resource: "fx-audit", effect: "allow" }] }
  }, ["fx-audit"]);
  await mod.default.setup(mine.ctx);
  assert.strictEqual(agentOf(mine.rec, "fx-lens-security").system, "user owned", "a user's own agent definition wins");
  assert.strictEqual(effect(agentOf(mine.rec, "keeps-audit").permissions, "skill", "fx-audit"), "allow", "a user's explicit skill rule keeps the lane listed to the model");
  assert.strictEqual(
    (await evaluate(mine.rec, { action: "skill", resources: ["fx-audit"], agent: "keeps-audit", effect: "allow" })).effect,
    "allow",
    "a user's explicit skill rule on an agent fx configured is honoured at call time"
  );
  assert.ok(mine.rec.commands.some((c) => c.name === "fx-audit"), "setup never reads the command list: the runtime merges same-named commands itself");
  const g = stub(dir);
  await mod.default.setup(g.ctx);
  let n = 0;
  async function shell(command, pieces) {
    const id = `call_${++n}`;
    for (const cb of g.rec.hooks["tool.execute.before"] || []) await cb({ tool: "shell", sessionID: "s", agent: "build", messageID: "m", id, input: { command } });
    const e = await evaluate(g.rec, { sessionID: "s", action: "shell", resources: pieces || [command], source: { type: "tool", messageID: "m", id }, effect: "allow" });
    for (const cb of g.rec.hooks["tool.execute.after"] || []) await cb({ tool: "shell", sessionID: "s", messageID: "m", id, status: "completed" });
    return e;
  }
  const REFUSED = [
    ["git push --force origin main"],
    ['bash -c "git reset --hard"'],
    ["git commit --no-verify -m x"],
    ["bash <<'EOF'\ngit reset --hard\nEOF", ["bash <<'EOF'"]]
    // Known gap, for task 09: `echo "git reset --hard" | sh` is allowed by lib/git-guard.js
    // (a quoted echo body feeding a shell is not scanned), so it is not asserted here.
  ];
  for (const [cmd, pieces] of REFUSED) {
    const e = await shell(cmd, pieces);
    assert.strictEqual(e.effect, "deny", `the guard refuses the full command: ${cmd}`);
    assert.ok(e.message, `the refusal carries the guard's reason: ${cmd}`);
    assert.ok(e.message.startsWith("[fx] "), `the reason is marked as fx's, as on every other harness: ${cmd}`);
  }
  for (const cmd of ["git status", "ls"]) assert.strictEqual((await shell(cmd)).effect, "allow", `${cmd} is untouched`);
  const miss = await evaluate(g.rec, { sessionID: "s", action: "shell", resources: ["ls"], source: { type: "tool", messageID: "m", id: "never_recorded" }, effect: "allow" });
  assert.strictEqual(miss.effect, "deny", "a call id with no recorded command is denied");
  const nosrc = await evaluate(g.rec, { sessionID: "s", action: "shell", resources: ["ls"], effect: "allow" });
  const nullsrc = await evaluate(g.rec, { sessionID: "s", action: "shell", resources: ["ls"], source: null, effect: "allow" });
  assert.strictEqual(nullsrc.effect, "deny", "a null source is denied");
  const nosess = await evaluate(g.rec, { action: "shell", resources: ["ls"], source: { type: "tool", messageID: "m", id: "call_1" }, effect: "allow" });
  assert.strictEqual(nosess.effect, "deny", "an evaluation with no sessionID is a miss and is denied");
  const before = async (sessionID, command) => {
    for (const cb of g.rec.hooks["tool.execute.before"] || []) await cb({ tool: "shell", sessionID, messageID: "m", id: "dup", input: { command } });
  };
  const eval1 = (sessionID) => evaluate(g.rec, { sessionID, action: "shell", resources: ["x"], source: { type: "tool", messageID: "m", id: "dup" }, effect: "allow" });
  await before("s1", "ls");
  await before("s2", "git reset --hard");
  assert.strictEqual((await eval1("s1")).effect, "allow", "session s1 sees its own command, not s2's");
  assert.strictEqual((await eval1("s2")).effect, "deny", "session s2 sees its own command");
  await before("s3", "ls");
  const rewritten = await evaluate(g.rec, { sessionID: "s3", action: "shell", resources: ["git push --force origin main"], source: { type: "tool", messageID: "m", id: "dup" }, effect: "allow" });
  assert.strictEqual(rewritten.effect, "deny", "a resource the guard refuses is denied even when the recorded text was clean");
  assert.strictEqual(nosrc.effect, "deny", "a shell evaluation with no source is denied");
  async function withGuard(guardSource) {
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), "fx-v2-broken-"));
    for (const d of ["plugins", "lib", "agents", "codex", "commands", "skills", "references"]) fs.cpSync(path.join(root, d), path.join(copy, d), { recursive: true });
    for (const f of ["PREAMBLE.md", "package.json"]) if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(copy, f));
    fs.writeFileSync(path.join(copy, "lib", "git-guard.js"), guardSource);
    const m = await import((0, import_url.pathToFileURL)(path.join(copy, "plugins", "fx-opencode-v2.js")).href);
    const b = stub(dir);
    await m.default.setup(b.ctx);
    for (const cb of b.rec.hooks["tool.execute.before"] || []) await cb({ tool: "shell", sessionID: "s", messageID: "m", id: "c1", input: { command: "ls" } });
    const e = await evaluate(b.rec, { sessionID: "s", action: "shell", resources: ["ls"], source: { type: "tool", messageID: "m", id: "c1" }, effect: "allow" });
    fs.rmSync(copy, { recursive: true, force: true });
    return e;
  }
  assert.strictEqual((await withGuard("throw new Error('load');\n")).effect, "deny", "a guard that cannot load denies every shell call");
  const threw = await withGuard("module.exports = { inspect() { throw new Error('inspect broke'); } };\n");
  assert.strictEqual(threw.effect, "deny", "a throwing inspect denies, and the hook does not reject");
  assert.ok(/inspect broke/.test(threw.message ?? ""), "the denial names the error");
  const lc = fs.mkdtempSync(path.join(os.tmpdir(), "fx-v2-lane-"));
  const l = stub(lc);
  await mod.default.setup(l.ctx);
  const edit = (r) => evaluate(l.rec, { action: "edit", resources: [r], effect: "allow" });
  assert.strictEqual((await edit(path.join(lc, "app.js"))).effect, "deny", "the lane check refuses a first write (absolute)");
  const lc2 = fs.mkdtempSync(path.join(os.tmpdir(), "fx-v2-lane-"));
  const l2 = stub(lc2);
  await mod.default.setup(l2.ctx);
  const here = process.cwd();
  process.chdir(os.tmpdir());
  const rel = await evaluate(l2.rec, { action: "edit", resources: ["app.js"], effect: "allow" });
  process.chdir(here);
  assert.strictEqual(rel.effect, "deny", "a project-relative resource is resolved against the project, not process.cwd()");
  assert.strictEqual((await edit(path.join(lc, "README.md"))).effect, "allow", "prose is not nudged");
  assert.strictEqual((await evaluate(l.rec, { action: "edit", resources: [42], effect: "allow" })).effect, "allow", "a lane-check crash leaves the edit alone");
  const SHAPES = [["an array command", { command: ["git", "push", "--force"] }], ["no command field", {}], ["no input", void 0]];
  for (const [label, input] of SHAPES) {
    const id = `shape_${label}`;
    for (const cb of g.rec.hooks["tool.execute.before"] || []) await cb({ tool: "shell", sessionID: "s", messageID: "m", id, input });
    const e = await evaluate(g.rec, { sessionID: "s", action: "shell", resources: ["x"], source: { type: "tool", messageID: "m", id }, effect: "allow" });
    assert.strictEqual(e.effect, "deny", `${label} is not recorded, so the shell call is denied`);
  }
  const failing = (which) => {
    const f = stub(dir);
    const base = f.ctx;
    if (which.includes("evaluate")) base.permission.hook = async (name, cb) => {
      if (name === "evaluate") throw new Error("evaluate registration broke");
      return {};
    };
    if (which.includes("before")) {
      const h = base.tool.hook;
      base.tool.hook = async (name, cb) => {
        if (name === "execute.before") throw new Error("before registration broke");
        return h(name, cb);
      };
    }
    return f;
  };
  const noEval = failing(["evaluate"]);
  await mod.default.setup(noEval.ctx);
  let thrown;
  try {
    for (const cb of noEval.rec.hooks["tool.execute.before"] || []) await cb({ tool: "shell", id: "f1", input: { command: "git push --force origin main" } });
  } catch (e) {
    thrown = e;
  }
  assert.ok(thrown instanceof Error && /evaluate registration broke/.test(thrown.message), "with evaluate unregistered, execute.before refuses every shell call and names the failure");
  for (const cb of noEval.rec.hooks["tool.execute.before"] || []) await cb({ tool: "read", id: "f2", input: {} });
  const noGuard = failing(["evaluate", "before"]);
  await mod.default.setup(noGuard.ctx);
  const pre = { system: [] };
  for (const cb of noGuard.rec.hooks["session.context"] || []) await cb(pre);
  assert.ok(/git guard is off/i.test(pre.system.map((p) => p.text).join("\n")), "with both registrations failed, the preamble says the git guard is off");
  const noBefore = failing(["before"]);
  await mod.default.setup(noBefore.ctx);
  const nb = await evaluate(noBefore.rec, { sessionID: "s", action: "shell", resources: ["ls"], source: { type: "tool", messageID: "m", id: "nb" }, effect: "allow" });
  assert.ok(nb.effect === "deny" && /before registration broke/.test(nb.message ?? ""), "a failed execute.before registration shows in the denial");
  fs.rmSync(lc, { recursive: true, force: true });
  fs.rmSync(lc2, { recursive: true, force: true });
  const bounded = async (c) => Promise.race([mod.default.setup(c.ctx).then(() => "done"), new Promise((r) => setTimeout(() => r("stalled"), 1500))]);
  const LISTS = [["never resolves", () => new Promise(() => {
  })], ["throws", async () => {
    throw new Error("list down");
  }]];
  for (const [label, list] of LISTS) {
    const h = stub(dir);
    h.ctx.command.list = list;
    assert.strictEqual(await bounded(h), "done", `setup resolves when command.list ${label}`);
    for (const name of ["permission.evaluate", "tool.execute.before", "tool.execute.after", "session.context"]) {
      assert.ok((h.rec.hooks[name] || []).length === 1, `${name} is registered when command.list ${label}`);
    }
    assert.ok(h.rec.agents.has("fx-lens-security"), `the agents are registered when command.list ${label}`);
    assert.ok(h.rec.commands.length > 0, `the commands are registered when command.list ${label}`);
  }
  const ctxText = async (r) => {
    const e = { system: [] };
    await need(r.hooks["session.context"]?.[0], "the context hook")(e);
    return e.system.map((x) => x.text).join("\n");
  };
  const broken = stub(dir);
  broken.ctx.agent.transform = async () => {
    throw new Error("boom");
  };
  broken.ctx.command.transform = async () => {
    throw new Error("no list");
  };
  await mod.default.setup(broken.ctx);
  const note = await ctxText(broken.rec);
  assert.ok(note.includes("fx: agent.transform failed: boom"), "a failed step is reported in the preamble");
  assert.ok(/fx: .*fx commands are unavailable.*: no list/.test(note), "a failed command registration says the commands are unavailable");
  assert.strictEqual(broken.rec.commands.length, 0, "no commands when registration fails");
  const refused = await evaluate(broken.rec, { action: "skill", resources: ["fx-audit"], effect: "allow" });
  assert.ok(refused.message?.includes("boom"), "a denied evaluation carries the failure list");
  const nolist = stub(dir);
  nolist.ctx.agent.transform = async (cb) => {
    await cb({ list: () => {
      throw new Error("list down");
    }, get: () => void 0, update() {
    } });
    return { dispose() {
    } };
  };
  await mod.default.setup(nolist.ctx);
  for (const agent of ["build", "plan", "general", "keeps-audit"]) {
    assert.strictEqual((await evaluate(nolist.rec, { action: "skill", resources: ["fx-audit"], agent, effect: "allow" })).effect, "deny", `${agent}: denied when the hide-lanes step failed`);
  }
  const throwing = stub(dir);
  const realUpdate = throwing.ctx.agent.transform;
  throwing.ctx.agent.transform = (cb) => realUpdate((ed) => cb({ ...ed, update: (id, fn) => {
    if (id === "plan") throw new Error("update down");
    return ed.update(id, fn);
  } }));
  await mod.default.setup(throwing.ctx);
  assert.strictEqual((await evaluate(throwing.rec, { action: "skill", resources: ["fx-audit"], agent: "plan", effect: "allow" })).effect, "deny", "an agent whose update failed is not recorded, so it is denied");
  assert.strictEqual((await evaluate(throwing.rec, { action: "skill", resources: ["fx-audit"], agent: "build", effect: "allow" })).effect, "allow", "an agent whose update succeeded is recorded");
  const nohook = stub(dir);
  nohook.ctx.session.hook = async () => {
    throw new Error("no ctx hook");
  };
  await mod.default.setup(nohook.ctx);
  const nh = await evaluate(nohook.rec, { action: "skill", resources: ["fx-audit"], effect: "allow" });
  assert.ok(nh.message?.includes("no ctx hook"), "with no context hook the failure reaches the evaluate message");
  const strthrow = stub(dir);
  strthrow.ctx.agent.transform = async () => {
    throw "plain string";
  };
  await mod.default.setup(strthrow.ctx);
  assert.ok((await ctxText(strthrow.rec)).includes("plain string"), 'a non-Error throw is reported, not "undefined"');
  const fc = stub(dir);
  await mod.default.setup(fc.ctx);
  const closed = await evaluate(fc.rec, { action: "skill", resources: "fx-audit", effect: "allow" });
  assert.strictEqual(closed.effect, "deny", "a hidden-lane evaluation that throws still denies");
  const fp = stub(dir);
  fp.ctx.session.prompt = async () => {
    throw new Error("prompt down");
  };
  await mod.default.setup(fp.ctx);
  await assert.rejects(
    need(fp.rec.commands.find((c) => c.name === "fx-audit"), "the fx-audit command").execute({ sessionID: "s", prompt: { text: "" } }),
    /prompt down/,
    "a command whose prompt fails does not report success"
  );
  const refsDir = path.join(root, "references");
  for (const agent of ["fx-lens-security", "fx-devils-advocate"]) {
    const DENIED = [["shell", ["ls"]], ["edit", ["src/x.js"]], ["subagent", ["general"]], ["external_directory", ["/etc/*"]], ["skill", ["fx-tdd"]]];
    for (const [action, resources] of DENIED) {
      const e = await evaluate(fc.rec, { action, resources, agent, effect: "allow" });
      assert.strictEqual(e.effect, "deny", `${agent}: ${action} is denied over an incoming allow (session rules cannot widen it)`);
      assert.ok(e.message, `${agent}: ${action} denial has a message`);
    }
    const ALLOWED = [["read", ["src/x.js"]], ["grep", ["*"]], ["glob", ["*"]], ["external_directory", [`${refsDir}/*`]]];
    for (const [action, resources] of ALLOWED) {
      assert.strictEqual((await evaluate(fc.rec, { action, resources, agent, effect: "allow" })).effect, "allow", `${agent}: ${action} stays allowed`);
    }
  }
  const ro = { agent: "fx-lens-security", effect: "allow" };
  assert.strictEqual((await evaluate(fc.rec, { ...ro, action: "external_directory", resources: [] })).effect, "deny", "an empty resource list is denied");
  assert.strictEqual((await evaluate(fc.rec, { ...ro, action: "external_directory", resources: void 0 })).effect, "deny", "a missing resource list is denied");
  assert.strictEqual((await evaluate(fc.rec, { ...ro, action: "external_directory", resources: [`${refsDir}/../README.md`] })).effect, "deny", "<refs>/../x escapes references and is denied");
  assert.strictEqual((await evaluate(fc.rec, { ...ro, action: "external_directory", resources: [`${refsDir}/harnesses/opencode-v2.md`] })).effect, "allow", "a file under references stays readable");
  const rawFs = require("fs");
  const realRealpath = rawFs.realpathSync;
  rawFs.realpathSync = () => {
    throw new Error("EIO");
  };
  try {
    const t = await evaluate(fc.rec, { ...ro, action: "external_directory", resources: [`${refsDir}/*`] });
    assert.strictEqual(t.effect, "deny", "a realpath that throws denies instead of leaving the call open");
    assert.ok(/EIO/.test(t.message ?? ""), "the denial carries the reason");
  } finally {
    rawFs.realpathSync = realRealpath;
  }
  assert.strictEqual((await evaluate(fc.rec, { action: "edit", resources: ["README.md"], agent: "build", effect: "allow" })).effect, "allow", "a non-fx agent is untouched by the read-only rule");
  fs.rmSync(dir, { recursive: true, force: true });
  scratchEnv.restore();
  console.log("opencode-v2-plugin.test.js: OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
