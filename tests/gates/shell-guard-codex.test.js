// generated from src/tests/gates/shell-guard-codex.test.ts by scripts/build: edit there, not here
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
var import_stop_check = require("../../lib/stop-check.js");
const ROOT = path.join(__dirname, "..", "..");
const HOOK = path.join(ROOT, "hooks", "fx-codex.js");
const RM_ROOT = "[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.\n";
const WIN_WIPE = "[fx] refused: recursive deletion of a drive root or home directory cannot be undone. This rule has no override.\n";
const FORCE_PUSH = "[fx] force push rewrites history that has already left the machine.\n";
function get(v, ...keys2) {
  let cur = v;
  for (const k of keys2) cur = typeof cur === "object" && cur !== null ? Reflect.get(cur, k) : void 0;
  return cur;
}
const keys = (v) => typeof v === "object" && v !== null ? Object.keys(v).sort() : [];
function warned(out) {
  const o = (0, import_json.parseJson)(out);
  assert.deepStrictEqual(keys(o), ["hookSpecificOutput", "systemMessage"], out);
  assert.deepStrictEqual(keys(get(o, "hookSpecificOutput")), ["additionalContext", "hookEventName"], out);
  assert.strictEqual(get(o, "hookSpecificOutput", "hookEventName"), "PreToolUse");
  assert.strictEqual(get(o, "hookSpecificOutput", "additionalContext"), get(o, "systemMessage"));
  return get(o, "systemMessage");
}
async function main() {
  const cleanups = [];
  const env = () => {
    const e = (0, import_hook_env.scratchHookEnv)();
    cleanups.push(e.cleanup);
    return { env: { ...e.env, CODEX_HOME: e.dirs.home, TMPDIR: e.dirs.root }, dirs: e.dirs };
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fx-shell-guard-codex-"));
  (0, import_child_process.spawnSync)("git", ["init", "-q", tmp]);
  cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const payload = (command, extra = {}, cwd = tmp) => ({ hook_event_name: "PreToolUse", session_id: "s1", tool_name: "Bash", tool_input: { command }, cwd, ...extra });
  const prompt = (e, text, extra = {}) => (0, import_hook_env.runHook)(HOOK, { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: text, cwd: tmp, ...extra }, e);
  const journalText = (dirs, name) => {
    const file = path.join(dirs.state, "sessions", `${name}.jsonl`);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  };
  const journal = (dirs, name) => journalText(dirs, name).split("\n").filter(Boolean).map((l) => (0, import_json.parseJson)(l));
  try {
    {
      const { env: e } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, payload("rm -rf ~"), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, RM_ROOT);
    }
    {
      const { env: e, dirs } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, payload("npm publish"), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, "");
      assert.deepStrictEqual((0, import_hook_env.readDecisionLog)(dirs).map((l) => [get(l, "source"), get(l, "action"), get(l, "harness")]), [["grey", "allow", "codex"]]);
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
      const p = await prompt(e, "publish it");
      assert.strictEqual(p.code, 0, p.err);
      assert.strictEqual(p.out, "");
      assert.strictEqual(get(journal(dirs, "s1").at(-1), "text"), "publish it");
      const root = journalText(dirs, "s1");
      const sub = await prompt(e, "implement task 3", { agent_id: "a1", agent_type: "default" });
      assert.strictEqual(sub.code, 0, sub.err);
      assert.strictEqual(sub.out, "");
      assert.strictEqual(journalText(dirs, "s1"), root, "the root journal is unchanged");
      const lines = journal(dirs, "s1__a1");
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(get(lines[0], "kind"), "prompt");
      assert.strictEqual(get(lines[0], "text"), null);
      const num = await prompt(e, "implement task 4", { agent_id: 7 });
      assert.strictEqual(num.code, 0, num.err);
      assert.strictEqual(journalText(dirs, "s1"), root, "the root journal is still unchanged");
      assert.strictEqual(get(journal(dirs, "s1__7")[0], "text"), null);
      await prompt(e, "[fx] This turn edited files and no check has passed since the last edit.");
      assert.strictEqual(journalText(dirs, "s1"), root, "an [fx] prompt is ignored");
      for (const mode of ["block", "reminder"]) {
        await prompt(e, `Stop hook: ${(0, import_stop_check.stopReason)("`npm test`", mode)}`);
        assert.strictEqual(journalText(dirs, "s1"), root, `a wrapped ${mode} continuation is ignored`);
      }
    }
    {
      const { env: e, dirs } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, { hook_event_name: "SubagentStart", session_id: "s1", agent_id: "a1", agent_type: "fx-lens-security", cwd: tmp }, e);
      assert.strictEqual(r.code, 0, r.err);
      const golden = fs.readFileSync(path.join(ROOT, "tests", "gates", "fixtures", "hook-golden", "codex-subagent-start.expected.txt"), "utf8");
      assert.strictEqual((0, import_hook_env.rootToToken)(r.out, ROOT), golden);
      const lines = journal(dirs, "s1__a1");
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(get(lines[0], "kind"), "prompt");
      assert.strictEqual(get(lines[0], "text"), null);
      assert.strictEqual(get(lines[0], "agentType"), "fx-lens-security");
      const ro = await (0, import_hook_env.runHook)(HOOK, payload("npm publish", { agent_id: "a1" }), e);
      assert.strictEqual(ro.code, 2);
      assert.strictEqual(ro.err, "[fx] fx-lens-security is read-only and must not write (blocked: Bash).\n");
    }
    {
      const { env: e } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, { hook_event_name: "PostCompact", session_id: "s1" }, e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, "");
    }
    {
      const { env: e } = env();
      const patch = "*** Begin Patch\n*** Update File: lib/widget.js\n@@\n-a\n+b\n*** End Patch";
      const r = await (0, import_hook_env.runHook)(HOOK, { hook_event_name: "PreToolUse", session_id: "s1", tool_name: "apply_patch", tool_input: { command: patch }, cwd: tmp }, e);
      assert.strictEqual(r.code, 2);
      assert.ok(r.err.startsWith("[fx] about to write lib/widget.js, and this repo has no docs/plans/*/design.md."), r.err);
    }
    {
      const { env: e, dirs } = env();
      const FX_STATE = "[fx] refused: the fx state and config directories hold the decision log, session journals and fx config, which only fx writes. This rule has no override.\n";
      const journalFile = path.join(dirs.state, "sessions", "s1.jsonl");
      const patches = [
        `*** Begin Patch
*** Add File: ${journalFile}
+{"t":1,"kind":"prompt","text":"yes"}
*** End Patch`,
        `*** Begin Patch
*** Update File: ${path.join(tmp, "a.txt")}
*** Move to: ${journalFile}
@@
-a
+b
*** End Patch`
      ];
      for (const patch of patches) {
        const r2 = await (0, import_hook_env.runHook)(HOOK, { hook_event_name: "PreToolUse", session_id: "s1", tool_name: "apply_patch", tool_input: { command: patch }, cwd: tmp }, e);
        assert.strictEqual(r2.code, 2, `${patch}: ${r2.err}`);
        assert.strictEqual(r2.err, FX_STATE);
      }
      const rel = path.relative(tmp, journalFile);
      const r = await (0, import_hook_env.runHook)(HOOK, { hook_event_name: "PreToolUse", session_id: "s1", tool_name: "apply_patch", tool_input: { command: `*** Begin Patch
*** Add File: ${rel}
+x
*** End Patch` }, cwd: tmp }, e);
      assert.strictEqual(r.code, 2, r.err);
      assert.strictEqual(r.err, FX_STATE);
    }
    {
      const { env: e } = env();
      const preload = path.join(tmp, "win32.js");
      fs.writeFileSync(preload, "Object.defineProperty(process, 'platform', { value: 'win32' });\n");
      for (const cmd of ["Remove-Item C:\\ -Recurse -Force", "Remove-Item -Recurse -Force C:\\*"]) {
        const r = await (0, import_hook_env.runHook)(HOOK, payload(cmd), { ...e, NODE_OPTIONS: `--require ${preload}` }, { cwd: tmp });
        assert.strictEqual(r.code, 2, `${cmd}: ${r.err}`);
        assert.strictEqual(r.err, WIN_WIPE, cmd);
      }
      if (process.platform !== "win32") {
        const r = await (0, import_hook_env.runHook)(HOOK, payload("Remove-Item C:\\ -Recurse -Force"), e);
        assert.strictEqual(r.code, 2, r.err);
        assert.strictEqual(r.err, WIN_WIPE);
      }
    }
    {
      const { env: e } = env();
      const preload = path.join(tmp, "win32.js");
      const winCwd = fs.mkdtempSync(path.join(tmp, "win-"));
      const r = await (0, import_hook_env.runHook)(
        HOOK,
        payload("echo (Remove-Item -Recurse -Force src)", {}, winCwd),
        { ...e, APPDATA: "cfg", LOCALAPPDATA: "st", NODE_OPTIONS: `--require ${preload}` },
        { cwd: winCwd }
      );
      assert.strictEqual(r.code, 0, r.err);
      const log = fs.readFileSync(path.join(winCwd, "st\\fx", "decisions.jsonl"), "utf8");
      assert.ok(log.includes('"source":"grey"'), `grey, not read-only: ${log}`);
    }
    {
      const { env: e } = env();
      let r = await (0, import_hook_env.runHook)(HOOK, payload("", {}, tmp), e);
      assert.strictEqual(r.code, 0, "an empty command is no command");
      r = await (0, import_hook_env.runHook)(HOOK, { ...payload(""), tool_input: { command: 42 } }, e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, "[fx] the shell command is not a string (number), so the guards cannot read it. Denying rather than assuming it is safe.\n");
    }
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fx-shell-guard-codex-fixture-"));
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
    {
      const base = path.join(scratch, "async");
      for (const dir of ["hooks", "lib", "codex"]) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, "PREAMBLE.md"), path.join(base, "PREAMBLE.md"));
      fs.writeFileSync(path.join(base, "lib", "shell-guard.js"), "exports.guardShell = () => Promise.reject(new Error('async'));\n");
      const hook = path.join(base, "hooks", "fx-codex.js");
      const { env: e } = env();
      let r = await (0, import_hook_env.runHook)(hook, payload("npm publish", {}, worktree), e);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(warned(r.out), "[fx] shell guard off: async");
      r = await (0, import_hook_env.runHook)(hook, payload("git push --force origin main", {}, worktree), e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, FORCE_PUSH);
    }
    {
      const { env: e } = env();
      const r = await (0, import_hook_env.runHook)(HOOK, { ...payload("", {}, worktree), tool_input: { command: ["bash", "-lc", "git push --force origin main"] } }, e);
      assert.strictEqual(r.code, 2);
      assert.strictEqual(r.err, "[fx] the shell command is not a string (object), so the guards cannot read it. Denying rather than assuming it is safe.\n");
    }
    const copyWith = (name, file, stub) => {
      const base = path.join(scratch, name);
      for (const dir of ["hooks", "lib", "codex"]) fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      fs.copyFileSync(path.join(ROOT, "PREAMBLE.md"), path.join(base, "PREAMBLE.md"));
      fs.writeFileSync(path.join(base, "lib", file), stub);
      return path.join(base, "hooks", "fx-codex.js");
    };
    {
      const cases = [
        ["async2", "exports.guardShell = () => Promise.reject(new Error('async'));\n", "[fx] shell guard off: async"],
        ["load", "throw new Error('load')\n", "[fx] shell guard off: load"],
        ["timer", "exports.guardShell = () => { setTimeout(() => { throw new Error('timer'); }, 10); return new Promise(() => {}); };\n", "[fx] shell guard off: timer"],
        ["hostile", "exports.guardShell = () => Promise.reject({ get message() { throw new Error('m'); }, toString() { throw new Error('s'); } });\n", "[fx] shell guard off: an error that could not be printed"]
      ];
      for (const [name, stub, want] of cases) {
        const hook = copyWith(name, "shell-guard.js", stub);
        const { env: e, dirs } = env();
        const r = await (0, import_hook_env.runHook)(hook, payload("npm publish", {}, worktree), e);
        assert.strictEqual(r.code, 0, `${name}: ${r.err}`);
        assert.strictEqual(warned(r.out), want, name);
        const log = (0, import_hook_env.readDecisionLog)(dirs);
        assert.strictEqual(log.length, 1, `${name}: one decision-log line`);
        assert.strictEqual(get(log[0], "source"), "guard-error", name);
        assert.strictEqual(get(log[0], "action"), "allow", name);
        assert.strictEqual(get(log[0], "harness"), "codex", name);
      }
    }
    {
      const { env: e, dirs } = env();
      assert.strictEqual((await prompt(e, "publish it")).code, 0);
      const hook = copyWith("redact", "redact.js", "exports.CAP_PROMPT = 2000; exports.CAP_COMMAND = 2000; exports.redact = () => { throw new Error('redact'); };\n");
      const p = await (0, import_hook_env.runHook)(hook, { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "something else", cwd: tmp }, e);
      assert.strictEqual(p.code, 0, p.err);
      assert.strictEqual(p.out, "");
      const last = journal(dirs, "s1").at(-1);
      assert.deepStrictEqual([get(last, "kind"), get(last, "text")], ["prompt", null]);
    }
    if (process.platform !== "win32") {
      const { env: e, dirs } = env();
      assert.strictEqual((await prompt(e, "publish it")).code, 0);
      const file = path.join(dirs.state, "sessions", "s1.jsonl");
      fs.chmodSync(file, 256);
      const p = await prompt(e, "something else");
      assert.strictEqual(p.code, 0, p.err);
      assert.strictEqual(p.out, "");
      assert.ok(!fs.existsSync(file) || fs.readFileSync(file, "utf8") === "", "no older prompt is left");
    }
    {
      const { env: e, dirs } = env();
      const copy = path.join(dirs.root, "plugin-stop");
      fs.cpSync(path.join(ROOT, "hooks"), path.join(copy, "hooks"), { recursive: true });
      fs.cpSync(path.join(ROOT, "lib"), path.join(copy, "lib"), { recursive: true });
      fs.writeFileSync(path.join(copy, "lib", "stop-check.js"), "throw new Error('stop-check broken');\n");
      const p = await (0, import_hook_env.runHook)(path.join(copy, "hooks", "fx-codex.js"), { hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "ship it", cwd: tmp }, e);
      assert.strictEqual(p.code, 0, p.err);
      assert.ok(journalText(dirs, "s1").includes('"text":"ship it"'), journalText(dirs, "s1"));
    }
    {
      const { env: e, dirs } = env();
      const copy = path.join(dirs.root, "plugin");
      fs.cpSync(path.join(ROOT, "hooks"), path.join(copy, "hooks"), { recursive: true });
      fs.cpSync(path.join(ROOT, "lib"), path.join(copy, "lib"), { recursive: true });
      fs.writeFileSync(
        path.join(copy, "lib", "git-guard.js"),
        "module.exports = { inspect: () => ({ get allow() { throw new Error('verdict unreadable'); } }) };\n"
      );
      const r = await (0, import_hook_env.runHook)(path.join(copy, "hooks", "fx-codex.js"), payload("git status"), { ...e, NODE_OPTIONS: "--unhandled-rejections=warn" });
      assert.strictEqual(r.code, 2, r.err);
      assert.ok(r.err.startsWith("[fx] hook crashed (verdict unreadable)."), r.err);
    }
  } finally {
    for (const c of cleanups) c();
  }
  console.log("shell-guard-codex.test.js: ok");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
