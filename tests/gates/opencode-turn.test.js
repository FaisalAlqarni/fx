// generated from src/tests/gates/opencode-turn.test.ts by scripts/build: edit there, not here
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
var import_url = require("url");
var import_child_process = require("child_process");
var import_hook_env = require("../helpers/hook-env.js");
var import_opencode_queue = require("../../lib/opencode-queue.js");
const ROOT = path.join(__dirname, "..", "..");
const REPEAT = "[fx] `npm test` has failed 3 times this turn. Stop retrying and invoke fx-debug to find the cause.";
const STALL = "[fx] 12 reads in a row with no edit. If you are going in circles, invoke fx-debug; otherwise say what you are looking for.";
const REMINDER_MAKE = "[fx] The previous turn edited files and no check passed after the last edit. Run `make test` before you report that work as done.";
const REMINDER = "[fx] The previous turn edited files and no check passed after the last edit. Run the project's tests before you report that work as done.";
const stderr = [];
console.error = (m) => {
  stderr.push(String(m));
};
const cleanups = [];
let dirs;
const scratch = () => {
  const s = (0, import_hook_env.applyScratchEnv)();
  dirs = s.dirs;
  cleanups.push(s.restore);
};
const log = () => (dirs ? (0, import_hook_env.readDecisionLog)(dirs) : []).map((e) => typeof e === "object" && e !== null ? Reflect.get(e, "source") : null);
function repo(fxJson) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-turn-"));
  cleanups.push(() => fs.rmSync(d, { recursive: true, force: true }));
  (0, import_child_process.spawnSync)("git", ["init", "-q", d]);
  if (fxJson !== void 0) fs.writeFileSync(path.join(d, ".fx.json"), JSON.stringify(fxJson));
  return d;
}
async function plugin1(directory, seed) {
  scratch();
  if (seed && dirs) seed(dirs);
  const mod = await import((0, import_url.pathToFileURL)(path.join(ROOT, "plugins", "fx-opencode-v1.js")).href);
  return mod.fx({ directory });
}
const message1 = (h, sessionID, agent = "build") => h["chat.message"]({ sessionID, agent, messageID: "m1" }, { message: {}, parts: [] });
const after1 = (h, tool, args, sessionID, result = { title: "", output: "", metadata: {} }) => h["tool.execute.after"]({ tool, sessionID, callID: "c1", args }, result);
const bashAfter1 = (h, command, exit, sessionID = "s1") => after1(h, "bash", { command }, sessionID, { title: command, output: "", metadata: { exit } });
async function transform1(h, input) {
  const output = { system: [] };
  await h["experimental.chat.system.transform"](input, output);
  return output.system;
}
function stub(directory) {
  const hooks = {};
  const reg = { dispose() {
  } };
  const hook = (domain) => async (name, cb) => {
    (hooks[`${domain}.${name}`] ||= []).push(cb);
    return reg;
  };
  const ctx = {
    location: { directory },
    session: { hook: hook("session"), prompt: async () => void 0 },
    tool: { hook: hook("tool") },
    permission: { hook: hook("permission") },
    agent: { transform: async (cb) => {
      await cb({ list: () => [], update: () => void 0 });
      return reg;
    } },
    command: { transform: async (cb) => {
      await cb({ add: () => void 0 });
      return reg;
    } }
  };
  return { hooks, ctx };
}
async function plugin2(directory, seed) {
  scratch();
  if (seed && dirs) seed(dirs);
  const mod = await import((0, import_url.pathToFileURL)(path.join(ROOT, "plugins", "fx-opencode-v2.js")).href);
  const s = stub(directory);
  await mod.default.setup(s.ctx);
  return s;
}
const fire = async (s, name, ev) => {
  for (const cb of s.hooks[name] || []) await cb(ev);
};
const prompt2 = (s, sessionID = "s1") => fire(s, "session.prompt", { sessionID });
const after2 = (s, tool, input, sessionID = "s1") => fire(s, "tool.execute.after", { tool, ...sessionID === null ? {} : { sessionID }, messageID: "m", id: `c${Math.random()}`, input, status: "completed" });
async function context2(s, sessionID) {
  const ev = { system: [], ...sessionID === void 0 ? {} : { sessionID } };
  await fire(s, "session.context", ev);
  return ev.system.map((p) => p.text);
}
const count = (lines, line) => lines.filter((l) => l === line).length;
const DAY = 24 * 60 * 60 * 1e3;
function seedJournals(d) {
  const dir = path.join(d.state, "sessions");
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, days] of [["old", 8], ["new", 1]]) {
    const file = path.join(dir, `${name}.jsonl`);
    fs.writeFileSync(file, "{}\n");
    const t = new Date(Date.now() - days * DAY);
    fs.utimesSync(file, t, t);
  }
}
const journals = () => dirs ? fs.readdirSync(path.join(dirs.state, "sessions")).sort() : [];
async function main() {
  try {
    {
      await plugin1(repo(), seedJournals);
      assert.deepStrictEqual(journals(), ["new.jsonl"], "opencode 1.x");
      await plugin2(repo(), seedJournals);
      assert.deepStrictEqual(journals(), ["new.jsonl"], "opencode 2.x");
    }
    {
      const h = await plugin1(repo());
      await message1(h, "s1");
      for (let i = 0; i < 3; i++) await bashAfter1(h, "npm test", 1);
      const first = await transform1(h, { sessionID: "s1", model: {} });
      assert.strictEqual(count(first, REPEAT), 1, "pushed once");
      assert.ok(first.indexOf(REPEAT) > 0, "after the preamble");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REPEAT), 0, "not pushed again");
    }
    {
      const cwd = repo();
      const h = await plugin1(cwd);
      await message1(h, "s1");
      await after1(h, "edit", { filePath: path.join(cwd, "a.ts") }, "s1");
      await message1(h, "s1");
      const first = await transform1(h, { sessionID: "s1", model: {} });
      assert.strictEqual(count(first, REMINDER), 1);
      assert.ok(first.indexOf(REMINDER) > 0, "after the preamble");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REMINDER), 0);
    }
    {
      const cwd = repo({ test_all: "make test" });
      const h = await plugin1(cwd);
      await message1(h, "s1");
      await after1(h, "edit", { filePath: path.join(cwd, "a.ts") }, "s1");
      await bashAfter1(h, "make test", 0);
      await message1(h, "s1");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REMINDER), 0);
    }
    {
      const cwd = repo({ hooks: { stop_check: false } });
      const h = await plugin1(cwd);
      await message1(h, "s1");
      await after1(h, "edit", { filePath: path.join(cwd, "a.ts") }, "s1");
      await message1(h, "s1");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REMINDER), 0);
    }
    {
      const h = await plugin1(repo());
      await message1(h, "s1");
      for (let i = 0; i < 3; i++) await bashAfter1(h, "npm test", 1);
      assert.strictEqual(count(await transform1(h, { model: {} }), REPEAT), 0, "no session id: nothing pushed");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REPEAT), 1, "the queue was kept");
    }
    {
      const h = await plugin1(repo());
      await message1(h, "s1");
      for (let i = 0; i < 3; i++) await bashAfter1(h, "npm test", 1);
      assert.strictEqual(count(await transform1(h, { sessionID: "s2", model: {} }), REPEAT), 0, "another session gets nothing");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REPEAT), 1);
    }
    {
      const h = await plugin1(repo());
      for (let i = 0; i < 3; i++) await after1(h, "bash", { command: "npm test" }, void 0, { output: "", metadata: { exit: 1 } });
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REPEAT), 0);
      assert.strictEqual(count(await transform1(h, { model: {} }), REPEAT), 0);
    }
    {
      const cwd = repo({ test_all: "make test" });
      const h = await plugin1(cwd);
      await message1(h, "s1");
      await after1(h, "edit", { filePath: path.join(cwd, "a.ts") }, "s1");
      await after1(h, "bash", { command: "make test" }, "s1", { output: "Tests: 3 passed", metadata: { exit: null } });
      await message1(h, "s1");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REMINDER_MAKE), 1, "a killed check is no evidence");
    }
    {
      const h = await plugin1(repo());
      await message1(h, "s1", "fx-lens-security");
      for (let i = 0; i < 12; i++) await after1(h, "read", { filePath: "/x" }, "s1");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), STALL), 0);
      const g = await plugin1(repo());
      await message1(g, "s1", "build");
      for (let i = 0; i < 12; i++) await after1(g, "read", { filePath: "/x" }, "s1");
      assert.strictEqual(count(await transform1(g, { sessionID: "s1", model: {} }), STALL), 1, "an ordinary agent still is");
    }
    {
      const h = await plugin1(repo());
      await message1(h, "s1");
      for (let i = 0; i < 3; i++) await bashAfter1(h, "npm test", 1);
      await transform1(h, { sessionID: "s1", model: {} });
      assert.ok(log().includes("queue-pushed"), "push is logged");
      const events = (dirs ? (0, import_hook_env.readDecisionLog)(dirs) : []).filter((e) => String(Reflect.get(Object(e), "source")).startsWith("queue-")).map((e) => Reflect.get(Object(e), "event"));
      assert.ok(events.length > 0 && events.every((e) => e === "queue"), JSON.stringify(events));
    }
    {
      const h = await plugin1(repo());
      await message1(h, "s1");
      for (let i = 0; i < 3; i++) await bashAfter1(h, "npm test", 1);
      await message1(h, "s1");
      assert.strictEqual(count(await transform1(h, { sessionID: "s1", model: {} }), REPEAT), 0, "an earlier turn line is dropped");
      assert.ok(log().includes("queue-dropped"), "the drop is logged");
    }
    {
      stderr.length = 0;
      const h = await plugin1(repo());
      await after1(h, "bash", { command: "ls" }, void 0);
      await after1(h, "bash", { command: "ls" }, void 0);
      assert.strictEqual(stderr.filter((l) => l.includes("carried no session id or tool name")).length, 1);
    }
    {
      const s = await plugin2(repo());
      await prompt2(s);
      for (let i = 0; i < 12; i++) await after2(s, "read", { filePath: "/x" });
      const first = await context2(s, "s1");
      assert.strictEqual(count(first, STALL), 1);
      assert.ok(first.indexOf(STALL) > 0, "after the preamble");
      assert.strictEqual(count(await context2(s, "s1"), STALL), 0);
    }
    {
      const cwd = repo();
      const s = await plugin2(cwd);
      await prompt2(s);
      await after2(s, "edit", { filePath: path.join(cwd, "a.ts") });
      await prompt2(s);
      assert.strictEqual(count(await context2(s, "s1"), REMINDER), 1);
      assert.strictEqual(count(await context2(s, "s1"), REMINDER), 0);
    }
    {
      const s = await plugin2(repo());
      await prompt2(s);
      for (let i = 0; i < 3; i++) {
        const id = `call_${i}`;
        await fire(s, "tool.execute.before", { tool: "shell", sessionID: "s1", messageID: "m", id, input: { command: "npm test" } });
        await fire(s, "tool.execute.after", { tool: "shell", sessionID: "s1", messageID: "m", id, status: "error" });
      }
      assert.strictEqual(count(await context2(s, "s1"), REPEAT), 1);
    }
    {
      const cwd = repo({ hooks: { stop_check: false } });
      const s = await plugin2(cwd);
      await prompt2(s);
      await after2(s, "edit", { filePath: path.join(cwd, "a.ts") });
      await prompt2(s);
      assert.strictEqual(count(await context2(s, "s1"), REMINDER), 0);
    }
    {
      const s = await plugin2(repo());
      await prompt2(s);
      for (let i = 0; i < 12; i++) await after2(s, "read", { filePath: "/x" });
      assert.strictEqual(count(await context2(s), STALL), 0, "no session id: nothing pushed");
      assert.strictEqual(count(await context2(s, "s1"), STALL), 1, "the queue was kept");
      const t = await plugin2(repo());
      for (let i = 0; i < 12; i++) await after2(t, "read", { filePath: "/x" }, null);
      assert.strictEqual(count(await context2(t, "s1"), STALL), 0);
    }
    {
      stderr.length = 0;
      const cwd = repo({ test_all: "make test" });
      const s = await plugin2(cwd);
      await prompt2(s);
      await after2(s, "edit", { filePath: path.join(cwd, "a.ts") });
      for (let i = 0; i < 2; i++) {
        const id = `blind_${i}`;
        await fire(s, "tool.execute.before", { tool: "shell", sessionID: "s1", messageID: "m", id, input: { command: "make test" } });
        await fire(s, "tool.execute.after", { tool: "shell", sessionID: "s1", messageID: "m", id, status: "completed" });
      }
      await prompt2(s);
      assert.strictEqual(count(await context2(s, "s1"), REMINDER_MAKE), 0, "fx could not see the check, so it does not claim there was none");
      assert.strictEqual(stderr.filter((l) => l.includes("no exit status and no output")).length, 1, "said once");
    }
    {
      stderr.length = 0;
      const s = await plugin2(repo());
      await after2(s, "read", {}, null);
      await after2(s, "read", {}, null);
      assert.strictEqual(stderr.filter((l) => l.includes("carried no session id or tool name")).length, 1);
    }
    {
      const s = await plugin2(repo());
      await fire(s, "session.prompt", { sessionID: "s1", agent: "fx-lens-security" });
      for (let i = 0; i < 12; i++) await after2(s, "read", { filePath: "/x" });
      assert.strictEqual(count(await context2(s, "s1"), STALL), 0);
    }
    {
      scratch();
      const q = (0, import_opencode_queue.createQueue)("opencode", "/x");
      for (let i = 0; i < 7; i++) q.enqueue("s1", `line ${i}`);
      assert.deepStrictEqual(q.drain("s1"), ["line 0", "line 1", "line 2", "line 3", "line 4"], "five lines per session");
      for (let i = 0; i < 60; i++) q.enqueue(`t${i}`, "x");
      assert.deepStrictEqual(q.drain("t0"), [], "the oldest session was evicted");
      assert.deepStrictEqual(q.drain("t59"), ["x"]);
      assert.ok(log().includes("queue-dropped"));
    }
  } finally {
    for (const c of cleanups.reverse()) c();
  }
  console.log("opencode-turn tests passed");
}
main().catch((e) => {
  console.error = () => void 0;
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}
`);
  process.exit(1);
});
