// generated from src/tests/gates/opencode-v1-shell-guard.test.ts by scripts/build: edit there, not here
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
var import_child_process = require("child_process");
var import_hook_env = require("../helpers/hook-env.js");
var import_json = require("../../lib/json.js");
var import_preamble = require("../../lib/preamble.js");
const ROOT = path.join(__dirname, "..", "..");
const RM_ROOT = "[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.";
const NOT_STRING = "[fx] the shell command is not a string (object), so the guards cannot read it. Denying rather than assuming it is safe.";
const FORCE_PUSH = "[fx] force push rewrites history that has already left the machine.";
const FX_STATE = "[fx] refused: the fx state and config directories hold the decision log, session journals and fx config, which only fx writes. This rule has no override.";
const loadFx = async (file) => (await import(file)).fx;
function get(v, ...keys) {
  let cur = v;
  for (const k of keys) cur = typeof cur === "object" && cur !== null ? Reflect.get(cur, k) : void 0;
  return cur;
}
const cleanups = [];
function scratch() {
  const s = (0, import_hook_env.applyScratchEnv)();
  cleanups.push(s.restore);
  return s.dirs;
}
const stderr = [];
console.error = (m) => {
  stderr.push(String(m));
};
const bash = (h, command, sessionID = "s1") => h["tool.execute.before"]({ tool: "bash", sessionID }, { args: { command } });
const userMessage = (h, sessionID) => h["chat.message"]({ sessionID, agent: "build", model: { providerID: "p", modelID: "m" }, messageID: "msg1", variant: void 0 });
const transform = async (h, input) => {
  const output = { system: [] };
  await h["experimental.chat.system.transform"](input, output);
  return output.system;
};
const lastLog = (dirs) => (0, import_hook_env.readDecisionLog)(dirs).at(-1);
async function main() {
  const fx = await loadFx(path.join(ROOT, "plugins", "fx-opencode-v1.js"));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc1-guard-"));
  cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
  (0, import_child_process.spawnSync)("git", ["init", "-q", tmp]);
  const plugin = async () => {
    const dirs = scratch();
    return { h: await fx({ directory: tmp }), dirs };
  };
  try {
    {
      const { h } = await plugin();
      await assert.rejects(bash(h, "rm -rf ~"), { message: RM_ROOT });
    }
    {
      const { h, dirs } = await plugin();
      await bash(h, "npm publish");
      assert.deepStrictEqual([get(lastLog(dirs), "source"), get(lastLog(dirs), "action"), get(lastLog(dirs), "harness")], ["grey", "allow", "opencode"]);
      await userMessage(h, "s1");
      await bash(h, "npm publish # fx-ok: user agreed");
      assert.strictEqual(get(lastLog(dirs), "source"), "grey");
    }
    {
      const { h } = await plugin();
      await assert.rejects(h["tool.execute.before"]({ tool: "bash", sessionID: "s1" }, { args: { command: ["npm", "publish"] } }), { message: NOT_STRING });
    }
    {
      const { h, dirs } = await plugin();
      const before = (tool, args) => h["tool.execute.before"]({ tool, sessionID: "s1" }, { args });
      const journalFile = path.join(dirs.state, "sessions", "s1.jsonl");
      await assert.rejects(before("write", { filePath: journalFile, content: "x" }), { message: FX_STATE });
      await assert.rejects(before("edit", { filePath: path.join(dirs.config, "x.json"), oldString: "a", newString: "b" }), { message: FX_STATE });
      await assert.rejects(before("apply_patch", { patchText: `*** Begin Patch
*** Add File: ${journalFile}
+x
*** End Patch` }), { message: FX_STATE });
      await before("write", { filePath: path.join(tmp, "a.txt"), content: "x" });
    }
    {
      const { h, dirs } = await plugin();
      stderr.length = 0;
      await h["chat.message"]({});
      await h["chat.message"]({ sessionID: 7 });
      assert.deepStrictEqual(stderr, ["[fx] chat.message carried no session id, so fx did not mark this turn in the session journal."]);
      fs.mkdirSync(dirs.state, { recursive: true });
      fs.writeFileSync(path.join(dirs.state, "sessions"), "not a directory");
      stderr.length = 0;
      await userMessage(h, "s1");
      await userMessage(h, "s1");
      assert.deepStrictEqual(stderr, ["[fx] the session journal could not be written, so fx did not mark this turn."]);
      stderr.length = 0;
      await transform(h, { model: {} });
      await transform(h, { model: {} });
      assert.deepStrictEqual(stderr, []);
    }
    {
      const { h, dirs } = await plugin();
      await bash(h, "ls -la");
      assert.deepStrictEqual((0, import_hook_env.readDecisionLog)(dirs), []);
    }
    {
      const { h, dirs } = await plugin();
      await userMessage(h, "s1");
      const lines = fs.readFileSync(path.join(dirs.state, "sessions", "s1.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => (0, import_json.parseJson)(l));
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(get(lines[0], "kind"), "prompt");
      assert.strictEqual(get(lines[0], "text"), null);
    }
    {
      scratch();
      const h = await fx({ directory: tmp });
      assert.deepStrictEqual(await transform(h, { sessionID: "s1" }), [(0, import_preamble.render)({ harness: "opencode", cwd: tmp })]);
    }
    const fixtures = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc1-guard-fixture-"));
    cleanups.push(() => fs.rmSync(fixtures, { recursive: true, force: true }));
    const fix = (0, import_child_process.spawnSync)(path.join(ROOT, "scripts", "make-git-fixture"), [path.join(fixtures, "repo")], { encoding: "utf8" });
    const worktree = fix.stdout.trim().split(" ")[1];
    assert.ok(fix.status === 0 && worktree, fix.stderr);
    {
      scratch();
      const h = await fx({ directory: worktree });
      await assert.rejects(bash(h, "git push --force origin main"), { message: FORCE_PUSH });
    }
    {
      const dirs = scratch();
      const base = path.join(fixtures, "broken");
      for (const dir of ["plugins", "lib"]) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, "PREAMBLE.md"), path.join(base, "PREAMBLE.md"));
      fs.writeFileSync(path.join(base, "lib", "shell-guard.js"), "throw new Error('load')\n");
      const h = await (await loadFx(path.join(base, "plugins", "fx-opencode-v1.js")))({ directory: worktree });
      await bash(h, "npm publish");
      assert.strictEqual(get(lastLog(dirs), "source"), "guard-error");
      await assert.rejects(bash(h, "git push --force origin main"), { message: FORCE_PUSH });
      await assert.rejects(bash(h, "rm -rf ~"), { message: RM_ROOT });
      const first = await transform(h, { sessionID: "s1" });
      assert.ok(first.includes("[fx] shell guard off: load"), first.join("\n"));
      assert.ok(!(await transform(h, { sessionID: "s1" })).includes("[fx] shell guard off: load"), "said once");
    }
    for (const [name, stub, message] of [
      ["rules-load", "throw new Error('rules')\n", "[fx] shell rules failed to load (rules). Denying every shell command until the plugin is repaired."],
      ["rules-throw", "exports.classifyShell = () => { throw new Error('rules'); };\n", "[fx] shell rules failed to evaluate this command (rules). Denying rather than assuming it is safe."]
    ]) {
      scratch();
      const base = path.join(fixtures, name ?? "");
      for (const dir of ["plugins", "lib"]) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, "PREAMBLE.md"), path.join(base, "PREAMBLE.md"));
      fs.writeFileSync(path.join(base, "lib", "shell-rules.js"), stub ?? "");
      const h = await (await loadFx(path.join(base, "plugins", "fx-opencode-v1.js")))({ directory: worktree });
      await assert.rejects(bash(h, "npm publish"), { message }, name);
      if (name === "rules-load") await assert.rejects(
        h["tool.execute.before"]({ tool: "write", sessionID: "s1" }, { args: { filePath: path.join(worktree, "a.txt"), content: "x" } }),
        { message: "[fx] shell rules failed to load (rules). Denying every file write until the plugin is repaired." },
        name
      );
    }
  } finally {
    for (const c of cleanups.reverse()) c();
  }
  console.log("opencode-v1-shell-guard tests passed");
}
main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}
`);
  process.exit(1);
});
