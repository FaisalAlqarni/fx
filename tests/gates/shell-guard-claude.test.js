// generated from src/tests/gates/shell-guard-claude.test.ts by scripts/build: edit there, not here
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
const ROOT = path.join(__dirname, "..", "..");
const HOOK = path.join(ROOT, "hooks", "fx-pretooluse.js");
const TURN = path.join(ROOT, "hooks", "fx-turn.js");
const RM_ROOT = "[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.\n";
const FORCE_PUSH = "[fx] force push rewrites history that has already left the machine.\n";
function get(v, ...keys) {
  let cur = v;
  for (const k of keys) cur = typeof cur === "object" && cur !== null ? Reflect.get(cur, k) : void 0;
  return cur;
}
function gitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fx-shell-guard-repo-"));
  (0, import_child_process.spawnSync)("git", ["init", "-q", dir]);
  return dir;
}
async function main() {
  const cleanups = [];
  const env = () => {
    const e = (0, import_hook_env.scratchHookEnv)();
    cleanups.push(e.cleanup);
    return e;
  };
  const repo = gitRepo();
  cleanups.push(() => fs.rmSync(repo, { recursive: true, force: true }));
  const payload = (command, extra = {}, cwd = repo) => ({ hook_event_name: "PreToolUse", session_id: "s1", tool_name: "Bash", tool_input: { command }, cwd, ...extra });
  const prompt = (e, text) => (0, import_hook_env.runHook)(TURN, { hook_event_name: "UserPromptSubmit", session_id: "s1", cwd: repo, prompt: text }, e);
  const fxJson = (text) => fs.writeFileSync(path.join(repo, ".fx.json"), text);
  const noFxJson = () => fs.rmSync(path.join(repo, ".fx.json"), { force: true });
  const lastSource = (dirs, before) => {
    const log = (0, import_hook_env.readDecisionLog)(dirs);
    return log.length > before ? get(log.at(-1), "source") : null;
  };
  try {
    {
      const { env: e, dirs } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, payload("rm -rf ~"), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, RM_ROOT);
      const log = (0, import_hook_env.readDecisionLog)(dirs);
      assert.strictEqual(log.length, 1);
      assert.strictEqual(get(log[0], "source"), "hard-rule");
      assert.strictEqual(get(log[0], "action"), "deny");
    }
    {
      const { env: e } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, { ...payload(""), tool_input: { command: ["npm", "publish"] } }, e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, "[fx] the shell command is not a string (object), so the guards cannot read it. Denying rather than assuming it is safe.\n");
    }
    {
      const { env: e } = env();
      await prompt(e, "wipe my home directory");
      const r = await (0, import_hook_env.runHook)(HOOK, payload("rm -rf ~ # fx-ok: user asked"), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, RM_ROOT);
    }
    {
      const { env: e, dirs } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, payload("ls -la"), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, "");
      assert.deepStrictEqual((0, import_hook_env.readDecisionLog)(dirs), []);
    }
    {
      const { env: e, dirs } = env();
      fxJson('{"test_all":"make test"}');
      let r = await (0, import_hook_env.runHook)(HOOK, payload("make test"), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, "");
      assert.deepStrictEqual((0, import_hook_env.readDecisionLog)(dirs).map((l) => [get(l, "source"), get(l, "action")]), [["repo-command", "allow"]]);
      r = await (0, import_hook_env.runHook)(HOOK, payload("make test; npm publish"), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(lastSource(dirs, 1), "grey");
      noFxJson();
    }
    {
      const { env: e, dirs } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, payload("npm publish"), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, "");
      assert.deepStrictEqual((0, import_hook_env.readDecisionLog)(dirs).map((l) => [get(l, "source"), get(l, "action")]), [["grey", "allow"]]);
    }
    {
      const { env: e, dirs } = env();
      fxJson('{"test_all":"make test","test_scope":"scripts/test-scope {paths}","setup":"npm ci"}');
      for (const cmd of [
        "make test\nnpm publish",
        "make test\r\nnpm publish",
        "scripts/test-scope lib/a.js\nnpm publish",
        "make test -f /tmp/evil.mk",
        "make test --eval=x",
        "make test SHELL=/tmp/x",
        "scripts/test-scope-evil a",
        "scripts/test-scope/../../tmp/x.sh",
        "scripts/test-scope ../../tmp/x.sh",
        "npm ci evil-package"
      ]) {
        const before = (0, import_hook_env.readDecisionLog)(dirs).length;
        await (0, import_hook_env.runHook)(HOOK, payload(cmd), e);
        assert.strictEqual(lastSource(dirs, before), "grey", JSON.stringify(cmd));
      }
      for (const cmd of ["make test", "scripts/test-scope lib/a.js src/b.ts", "npm ci"]) {
        const before = (0, import_hook_env.readDecisionLog)(dirs).length;
        await (0, import_hook_env.runHook)(HOOK, payload(cmd), e);
        assert.strictEqual(lastSource(dirs, before), "repo-command", JSON.stringify(cmd));
      }
      noFxJson();
    }
    {
      const { env: e, dirs } = env();
      const file = path.join(dirs.state, "sessions", "s1.jsonl");
      for (const tool of ["Write", "Edit", "MultiEdit"]) {
        const r2 = await (0, import_hook_env.runHook)(HOOK, { hook_event_name: "PreToolUse", session_id: "s1", tool_name: tool, tool_input: { file_path: file, content: "x" }, cwd: repo }, e);
        assert.strictEqual(r2.code, 2, `${tool}: ${r2.err}`);
        assert.strictEqual(r2.err, "[fx] refused: the fx state and config directories hold the decision log, session journals and fx config, which only fx writes. This rule has no override.\n");
      }
      const r = await (0, import_hook_env.runHook)(HOOK, payload(`printf x >> ${file}`), e);
      assert.strictEqual(r.code, 2, r.err);
      const ok = await (0, import_hook_env.runHook)(HOOK, { hook_event_name: "PreToolUse", session_id: "s1", tool_name: "Write", tool_input: { file_path: path.join(repo, "a.txt"), content: "x" }, cwd: repo }, e);
      assert.strictEqual(ok.code, 0, ok.err);
    }
    {
      const { env: e, dirs } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, { hook_event_name: "PreToolUse", session_id: "s1", tool_name: "Write", tool_input: { file_path: path.join(dirs.config, "x.json"), content: "{}" }, cwd: repo }, e);
      assert.strictEqual(r.code, 2, r.err);
    }
    {
      const { env: e, dirs } = env();
      let before = (0, import_hook_env.readDecisionLog)(dirs).length;
      await (0, import_hook_env.runHook)(HOOK, payload("git status"), e);
      assert.strictEqual(lastSource(dirs, before), null, "plain git status is read-only");
      for (const [key, value] of [["core.fsmonitor", "./x"], ["diff.external", "./x"], ["diff.x.textconv", "./x"], ["core.pager", "./x"]]) {
        (0, import_child_process.spawnSync)("git", ["-C", repo, "config", key, value]);
        before = (0, import_hook_env.readDecisionLog)(dirs).length;
        await (0, import_hook_env.runHook)(HOOK, payload("git status"), e);
        await (0, import_hook_env.runHook)(HOOK, payload("git log --oneline -5"), e);
        (0, import_child_process.spawnSync)("git", ["-C", repo, "config", "--unset", key]);
        assert.deepStrictEqual((0, import_hook_env.readDecisionLog)(dirs).slice(before).map((l) => get(l, "source")), ["grey", "grey"], `${key} set: git status and git log are grey`);
      }
    }
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fx-shell-guard-fixture-"));
    cleanups.push(() => fs.rmSync(scratch, { recursive: true, force: true }));
    const fix = (0, import_child_process.spawnSync)(path.join(ROOT, "scripts", "make-git-fixture"), [path.join(scratch, "repo")], { encoding: "utf8" });
    const worktree = fix.stdout.trim().split(" ")[1];
    assert.ok(fix.status === 0 && worktree, fix.stderr);
    {
      const { env: e } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, payload("git push --force origin main", {}, worktree), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, FORCE_PUSH);
    }
    const broken = (name, stub, file = "shell-guard.js") => {
      const base = path.join(scratch, name);
      for (const dir of ["hooks", "lib"]) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.writeFileSync(path.join(base, "lib", file), stub);
      return path.join(base, "hooks", "fx-pretooluse.js");
    };
    const guardOff = (out) => get((0, import_json.parseJson)(out), "systemMessage");
    const cases = [
      ["hostile", "exports.guardShell = () => Promise.reject({ get message() { throw new Error('m'); }, toString() { throw new Error('s'); } });\n", "[fx] shell guard off: an error that could not be printed"],
      ["load", "throw new Error('load')\n", "[fx] shell guard off: load"],
      ["async", "exports.guardShell = () => Promise.reject(new Error('async'));\n", "[fx] shell guard off: async"],
      ["timer", "exports.guardShell = () => { setTimeout(() => { throw new Error('timer'); }, 10); return new Promise(() => {}); };\n", "[fx] shell guard off: timer"]
    ];
    for (const [name, stub, want] of cases) {
      const hook = broken(name, stub);
      const { env: e, dirs } = env();
      let r = await (0, import_hook_env.runHook)(hook, payload("npm publish", {}, worktree), e);
      assert.strictEqual(r.code, 0, `${name}: ${r.err}`);
      assert.strictEqual(guardOff(r.out), want, name);
      const log = (0, import_hook_env.readDecisionLog)(dirs);
      assert.deepStrictEqual(log.map((l) => [get(l, "source"), get(l, "action"), get(l, "harness")]), [["guard-error", "allow", "claude-code"]], name);
      assert.ok(r.ms < 5e3, `${name}: took ${r.ms} ms`);
      r = await (0, import_hook_env.runHook)(hook, payload("git push --force origin main", {}, worktree), e);
      assert.strictEqual(r.code, 2, name);
      assert.strictEqual(r.err, FORCE_PUSH, name);
    }
    for (const [name, stub] of [["guard", "throw new Error('load')\n"], ["guard-dep", "throw new Error('load')\n"]]) {
      const hook = name === "guard" ? broken(name, stub) : broken(name, stub, "evidence.js");
      const { env: e } = env();
      const r = await (0, import_hook_env.runHook)(hook, payload("rm -rf ~", {}, worktree), e);
      assert.strictEqual(r.code, 2, `${name}: ${r.err}`);
      assert.strictEqual(r.err, RM_ROOT, name);
    }
    {
      const hook = broken("rules", "throw new Error('load')\n", "shell-rules.js");
      const { env: e } = env();
      for (const cmd of ["npm publish", "ls"]) {
        const r = await (0, import_hook_env.runHook)(hook, payload(cmd, {}, worktree), e);
        assert.strictEqual(r.code, 2, cmd);
        assert.strictEqual(r.err, "[fx] shell rules failed to load (load). Denying every shell command until the plugin is repaired.\n");
      }
    }
  } finally {
    for (const c of cleanups) c();
  }
  console.log("shell-guard-claude.test.js: ok");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
