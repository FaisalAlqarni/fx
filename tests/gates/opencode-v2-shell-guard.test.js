// generated from src/tests/gates/opencode-v2-shell-guard.test.ts by scripts/build: edit there, not here
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
var import_json = require("../../lib/json.js");
const ROOT = path.join(__dirname, "..", "..");
const RM_ROOT = "[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.";
const FX_STATE = "[fx] refused: the fx state and config directories hold the decision log, session journals and fx config, which only fx writes. This rule has no override.";
const PROMPT_GAP = "[fx] the prompt hook is unavailable: no prompt hook here; the Stop reminder cannot work on this opencode.";
function get(v, ...keys) {
  let cur = v;
  for (const k of keys) cur = typeof cur === "object" && cur !== null ? Reflect.get(cur, k) : void 0;
  return cur;
}
function stub(directory, failPrompt = false) {
  const hooks = {};
  const reg = { dispose() {
  } };
  const hook = (domain) => async (name, cb) => {
    if (failPrompt && domain === "session" && name === "prompt") throw new Error("no prompt hook here");
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
const fire = async (s, name, ev) => {
  for (const cb of s.hooks[name] || []) await cb(ev);
};
let n = 0;
async function shell(s, command, sessionID = "s1") {
  const id = `call_${n++}`;
  await fire(s, "tool.execute.before", { tool: "shell", sessionID, messageID: "m", id, input: { command } });
  const ev = { sessionID, action: "shell", resources: [command], source: { type: "tool", messageID: "m", id }, effect: "allow" };
  await fire(s, "permission.evaluate", ev);
  await fire(s, "tool.execute.after", { tool: "shell", sessionID, messageID: "m", id, status: "completed" });
  return ev;
}
async function context(s, sessionID) {
  const ev = { system: [], ...sessionID === void 0 ? {} : { sessionID } };
  await fire(s, "session.context", ev);
  return ev.system.map((p) => p.text);
}
const stderr = [];
console.error = (m) => {
  stderr.push(String(m));
};
const cleanups = [];
function scratch() {
  const s = (0, import_hook_env.applyScratchEnv)();
  cleanups.push(s.restore);
  return s.dirs;
}
async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc2-guard-"));
  cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const fix = (0, import_child_process.spawnSync)(path.join(ROOT, "scripts", "make-git-fixture"), [path.join(tmp, "repo")], { encoding: "utf8" });
  const worktree = fix.stdout.trim().split(" ")[1];
  assert.ok(fix.status === 0 && worktree, fix.stderr);
  const load = async (root = ROOT) => import((0, import_url.pathToFileURL)(path.join(root, "plugins", "fx-opencode-v2.js")).href);
  const mod = await load();
  const plugin = async () => {
    const dirs = scratch();
    const s = stub(worktree);
    await mod.default.setup(s.ctx);
    return { s, dirs };
  };
  try {
    {
      const { s } = await plugin();
      const e = await shell(s, "git -C . push --force origin main");
      assert.strictEqual(e.effect, "deny");
      assert.ok(String(e.message).startsWith("[fx] force push"), String(e.message));
    }
    {
      const { s, dirs } = await plugin();
      for (const file of [path.join(dirs.state, "sessions", "s1.jsonl"), path.join(dirs.config, "x.json")]) {
        const ev = { sessionID: "s1", action: "edit", resources: [file], effect: "allow" };
        await fire(s, "permission.evaluate", ev);
        assert.deepStrictEqual([ev.effect, ev.message], ["deny", FX_STATE], file);
      }
      const ok = { sessionID: "s1", action: "edit", resources: [path.join(worktree, "a.txt")], effect: "allow" };
      await fire(s, "permission.evaluate", ok);
      assert.strictEqual(ok.effect, "allow");
    }
    {
      const { s } = await plugin();
      const e = await shell(s, "rm -rf ~");
      assert.deepStrictEqual([e.effect, e.message], ["deny", RM_ROOT]);
    }
    {
      const { s, dirs } = await plugin();
      const e = await shell(s, "ls -la");
      assert.strictEqual(e.effect, "allow");
      assert.strictEqual(e.message, void 0);
      assert.deepStrictEqual((0, import_hook_env.readDecisionLog)(dirs), []);
    }
    const broken = async (name, file, body) => {
      const dirs = scratch();
      const base = path.join(tmp, name);
      for (const dir of ["plugins", "lib", "agents", "references"]) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, "PREAMBLE.md"), path.join(base, "PREAMBLE.md"));
      fs.writeFileSync(path.join(base, "lib", file), body);
      const s = stub(worktree);
      await (await load(base)).default.setup(s.ctx);
      return { s, dirs };
    };
    const guardLog = (dirs) => (0, import_hook_env.readDecisionLog)(dirs).filter((e) => get(e, "event") === "guard");
    const callEvents = (command, id = `call_${n++}`) => ({
      before: { tool: "shell", sessionID: "s", messageID: "m", id, input: { command } },
      ev: { action: "shell", sessionID: "s", source: { messageID: "m", id }, resources: [command], effect: "allow" }
    });
    {
      const { s } = await plugin();
      const { before, ev } = callEvents("rm -rf ~");
      await fire(s, "tool.execute.before", before);
      await fire(s, "permission.evaluate", ev);
      assert.deepStrictEqual([ev.effect, ev.message], ["deny", RM_ROOT]);
    }
    {
      const { s } = await plugin();
      const { before, ev } = callEvents("git push --force origin main");
      await fire(s, "tool.execute.before", before);
      await fire(s, "permission.evaluate", ev);
      assert.strictEqual(ev.effect, "deny");
      assert.ok(String(ev.message).startsWith("[fx] force push"), String(ev.message));
    }
    {
      const { s, dirs } = await plugin();
      const { before, ev } = callEvents("npm publish");
      await fire(s, "tool.execute.before", before);
      await fire(s, "permission.evaluate", ev);
      assert.deepStrictEqual([ev.effect, ev.message], ["allow", void 0]);
      assert.deepStrictEqual(guardLog(dirs).map((e) => [get(e, "source"), get(e, "action"), get(e, "harness")]), [["grey", "allow", "opencode-v2"]]);
    }
    {
      const { s, dirs } = await broken("guard-throws", "shell-guard.js", "exports.guardShellCodeOnly = () => { throw new TypeError('sync'); };\n");
      stderr.length = 0;
      const { before, ev } = callEvents("npm publish");
      await fire(s, "tool.execute.before", before);
      await fire(s, "permission.evaluate", ev);
      assert.strictEqual(ev.effect, "allow");
      assert.ok(stderr.includes("[fx] shell guard off: sync"), stderr.join("\n"));
      const off = guardLog(dirs).filter((e) => get(e, "source") === "guard-error");
      assert.strictEqual(get(off.at(-1), "error"), "TypeError", "the entry names the failure class");
      assert.strictEqual(get(off.at(-1), "text"), "");
    }
    {
      const { s } = await plugin();
      assert.strictEqual((await shell(s, "rm -rf ~")).effect, "deny");
      await fire(s, "session.prompt", { sessionID: "s1" });
      const e = await shell(s, "rm -rf ~ # fx-ok: user agreed");
      assert.deepStrictEqual([e.effect, e.message], ["deny", RM_ROOT]);
    }
    {
      const { s, dirs } = await plugin();
      await fire(s, "session.prompt", { sessionID: "s1" });
      await fire(s, "session.prompt", {});
      const lines = fs.readFileSync(path.join(dirs.state, "sessions", "s1.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => (0, import_json.parseJson)(l));
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(get(lines[0], "kind"), "prompt");
      assert.strictEqual(get(lines[0], "text"), null);
      assert.deepStrictEqual(fs.readdirSync(path.join(dirs.state, "sessions")), ["s1.jsonl"], "no session id, no journal");
    }
    {
      const { s, dirs } = await plugin();
      stderr.length = 0;
      await fire(s, "session.prompt", {});
      await fire(s, "session.prompt", { sessionID: 7 });
      assert.deepStrictEqual(stderr, ["[fx] the prompt hook carried no session id, so fx did not mark this turn in the session journal."]);
      fs.mkdirSync(dirs.state, { recursive: true });
      fs.writeFileSync(path.join(dirs.state, "sessions"), "not a directory");
      stderr.length = 0;
      await fire(s, "session.prompt", { sessionID: "s1" });
      await fire(s, "session.prompt", { sessionID: "s1" });
      assert.deepStrictEqual(stderr, ["[fx] the session journal could not be written, so fx did not mark this turn."]);
    }
    {
      scratch();
      const s = stub(worktree, true);
      stderr.length = 0;
      await mod.default.setup(s.ctx);
      assert.deepStrictEqual(stderr, [PROMPT_GAP]);
      const text = (await context(s, "s1")).join("\n");
      assert.ok(!text.includes("misinstalled"), text);
      assert.strictEqual((await shell(s, "rm -rf ~")).message, RM_ROOT, "the guard still runs");
    }
    {
      const { s, dirs } = await broken("guard-load", "shell-guard.js", "throw new Error('load')\n");
      assert.strictEqual((await shell(s, "npm publish")).effect, "allow");
      assert.strictEqual(get((0, import_hook_env.readDecisionLog)(dirs).at(-1), "source"), "guard-error");
      assert.ok(String((await shell(s, "git push --force origin main")).message).startsWith("[fx] force push"));
      assert.strictEqual((await shell(s, "rm -rf ~")).message, RM_ROOT);
    }
    for (const [name, body, message] of [
      ["rules-load", "throw new Error('rules')\n", "[fx] shell rules failed to load (rules). Denying every shell command until the plugin is repaired."],
      ["rules-throw", "exports.classifyShell = () => { throw new Error('rules'); };\n", "[fx] shell rules failed to evaluate this command (rules). Denying rather than assuming it is safe."]
    ]) {
      const { s } = await broken(name, "shell-rules.js", body);
      const e = await shell(s, "npm publish");
      assert.deepStrictEqual([e.effect, e.message], ["deny", message], name);
      if (name === "rules-load") {
        const ev = { sessionID: "s1", action: "edit", resources: [path.join(worktree, "a.txt")], effect: "allow" };
        await fire(s, "permission.evaluate", ev);
        assert.deepStrictEqual([ev.effect, ev.message], ["deny", "[fx] shell rules failed to load (rules). Denying every file write until the plugin is repaired."], name);
      }
    }
  } finally {
    for (const c of cleanups.reverse()) c();
  }
  console.log("opencode-v2-shell-guard tests passed");
}
main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}
`);
  process.exit(1);
});
