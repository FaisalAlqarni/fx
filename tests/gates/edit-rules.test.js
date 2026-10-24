// generated from src/tests/gates/edit-rules.test.ts by scripts/build: edit there, not here
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
var import_shell_rules = require("../../lib/shell-rules.js");
const ROOT = path.join(__dirname, "..", "..");
const PRETOOL = path.join(ROOT, "hooks", "fx-pretooluse.js");
const CODEX = path.join(ROOT, "hooks", "fx-codex.js");
const EM = String.fromCodePoint(8212);
const RM_ROOT = "[fx] refused: rm -r on a root, home or system directory cannot be undone. This rule has no override.\n";
const DASH_REFUSAL = "[fx] rule no-dashes: Prose uses no em dash (U+2014) or en dash (U+2013) characters. (docs/a.md)\n";
const FK = { id: "fk-index", glob: "db/migrate/*.rb", rule: "Every foreign key gets an index.", scope: "file" };
const TODO = { id: "no-todo", glob: "**/*.rb", rule: "No TODO comments." };
const MIGRATION = "db/migrate/1_add_user.rb";
const CONTENT = "class AddUser < ActiveRecord::Migration[7.1]\n  def change\n    add_reference :users, :org\n  end\nend\n";
function get(v, ...keys) {
  let cur = v;
  for (const k of keys) cur = typeof cur === "object" && cur !== null ? Reflect.get(cur, k) : void 0;
  return cur;
}
async function main() {
  const cleanups = [];
  let repos = 0;
  const repo = (files = {}, fxJson) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `fx-edit-rules-${repos++}-`));
    cleanups.push(() => fs.rmSync(dir, { recursive: true, force: true }));
    (0, import_child_process.spawnSync)("git", ["init", "-q", dir]);
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    }
    if (fxJson !== void 0) fs.writeFileSync(path.join(dir, ".fx.json"), JSON.stringify(fxJson));
    return dir;
  };
  const setup = () => {
    const e = (0, import_hook_env.scratchHookEnv)();
    cleanups.push(e.cleanup);
    return { env: e.env, dirs: e.dirs };
  };
  const call = (hook, env, cwd, tool, ti, session = "s1") => (0, import_hook_env.runHook)(hook, { hook_event_name: "PreToolUse", session_id: session, cwd, tool_name: tool, tool_input: ti }, env);
  const write = (env, cwd, file, content, session) => call(PRETOOL, env, cwd, "Write", { file_path: file, content }, session);
  const ruleLog = (dirs) => (0, import_hook_env.readDecisionLog)(dirs).filter((e) => get(e, "event") === "edit-rule");
  const repoRules = { rules: [FK, TODO] };
  const pluginWith = (dirs, lib, source, hook = "fx-pretooluse.js") => {
    const copy = path.join(dirs.root, `plugin-${fs.readdirSync(dirs.root).length}`);
    fs.cpSync(path.join(ROOT, "hooks"), path.join(copy, "hooks"), { recursive: true });
    fs.cpSync(path.join(ROOT, "lib"), path.join(copy, "lib"), { recursive: true });
    fs.writeFileSync(path.join(copy, "lib", lib), source);
    return path.join(copy, "hooks", hook);
  };
  const errorLines = (dirs) => ruleLog(dirs).filter((l) => get(l, "source") === "error");
  try {
    {
      const { env, dirs } = setup();
      const r = await write(env, repo(), "docs/a.md", `# T
an ${EM} b
`);
      assert.strictEqual(r.code, 2, r.err);
      assert.strictEqual(r.err, DASH_REFUSAL);
      const log = ruleLog(dirs);
      assert.strictEqual(log.length, 1, JSON.stringify(log));
      assert.deepStrictEqual([get(log[0], "source"), get(log[0], "action"), get(log[0], "text")], ["hard-rule", "refuse", "docs/a.md no-dashes"]);
    }
    {
      const { env } = setup();
      const old = `old ${EM} line
`;
      const r = await write(env, repo({ "docs/a.md": old }), "docs/a.md", `${old}new clean line
`);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, "");
    }
    {
      const { env } = setup();
      const dir = repo({ "docs/a.md": `a typo ${EM} here
` });
      const fix = await call(PRETOOL, env, dir, "Edit", { file_path: "docs/a.md", old_string: `a typo ${EM} here`, new_string: `a fix ${EM} here` });
      assert.strictEqual(fix.code, 0, fix.err);
      const more = await call(PRETOOL, env, dir, "Edit", { file_path: "docs/a.md", old_string: `a typo ${EM} here`, new_string: `a typo ${EM} here ${EM} too` });
      assert.strictEqual([more.code, more.err].join(" "), `2 ${DASH_REFUSAL}`);
    }
    {
      const { env } = setup();
      const dir = repo();
      const marker = await write(env, dir, "src/a.ts", "const a = 1;\n<<<<<<< HEAD\n");
      assert.strictEqual(marker.code, 2);
      assert.ok(marker.err.startsWith("[fx] rule no-conflict-markers:"), marker.err);
      const setext = await write(env, dir, "docs/b.md", "Title\n=======\n");
      assert.strictEqual(setext.code, 0, setext.err);
    }
    {
      const { env, dirs } = setup();
      const r = await write(env, repo(), "src/env.sh", "export OPENAI_API_KEY=sk-proj-1234567890abcdef");
      assert.strictEqual(r.code, 2);
      assert.ok(r.err.startsWith("[fx] rule no-secrets:"), r.err);
      const log = ruleLog(dirs);
      assert.strictEqual(log.length, 1);
      assert.ok(!JSON.stringify(log).includes("sk-proj"), JSON.stringify(log));
    }
    {
      const { env, dirs } = setup();
      const r = await write(env, repo({}, { hooks: { edit_rules: false } }), "docs/a.md", `an ${EM} b
`);
      assert.strictEqual(r.code, 0, r.err);
      assert.deepStrictEqual(ruleLog(dirs), []);
    }
    {
      const { env } = setup();
      const dir = repo();
      const add = await call(PRETOOL, env, dir, "Edit", { file_path: "docs/a.md", old_string: "a", new_string: `a
b ${EM}` });
      assert.strictEqual(add.code, 2);
      assert.strictEqual(add.err, DASH_REFUSAL);
      const removal = await call(PRETOOL, env, dir, "Edit", { file_path: "docs/a.md", old_string: `a
b ${EM}`, new_string: "a" });
      assert.strictEqual(removal.code, 0, removal.err);
    }
    {
      const { env, dirs } = setup();
      const r = await write(env, repo({}, repoRules), MIGRATION, `${CONTENT}# TODO
`);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, "");
      assert.deepStrictEqual(ruleLog(dirs), []);
    }
    {
      const { env, dirs } = setup();
      const dir = repo({}, { rules: [{ id: "all", glob: "**/*", rule: "Anything." }] });
      const state = await write(env, dir, path.join(dirs.state, "sessions", "x.jsonl"), "x");
      assert.strictEqual(state.code, 2);
      assert.strictEqual(state.err, `${(0, import_shell_rules.hardReason)("fx-state")}
`);
      const outside = await write(env, dir, "../outside.md", `an ${EM} b
`);
      assert.strictEqual(outside.code, 0, outside.err);
    }
    for (const hook of ["fx-pretooluse.js", "fx-codex.js"]) {
      const { env, dirs } = setup();
      const copy = pluginWith(dirs, "edit-rules.js", "throw new Error('load');\n", hook);
      const r = hook === "fx-codex.js" ? await call(copy, env, repo(), "apply_patch", { command: `*** Begin Patch
*** Add File: docs/a.md
+an ${EM} b
*** End Patch` }) : await call(copy, env, repo(), "Write", { file_path: "docs/a.md", content: `an ${EM} b
` });
      assert.strictEqual(r.code, 0, r.err);
      assert.ok(r.err.includes("[fx] edit rules off: load"), r.err);
      const errors = errorLines(dirs);
      assert.strictEqual(errors.length, 1, JSON.stringify(ruleLog(dirs)));
      assert.ok(String(get(errors[0], "unavailable")).includes("load"), hook);
      if (hook === "fx-pretooluse.js") {
        const state = await call(copy, env, repo(), "Write", { file_path: path.join(dirs.state, "x"), content: "x" });
        assert.strictEqual(state.code, 2, "the fx-state refusal does not need the rule module");
      }
    }
    {
      const { env, dirs } = setup();
      const hook = pluginWith(dirs, "repo-config.js", [
        "exports.repoRoot = () => { throw new Error('boom'); };",
        "exports.readRepoConfig = () => ({ hooks: { stopCheck: true, loopNudge: true, editRules: true }, checks: {} });",
        ""
      ].join("\n"));
      const r = await call(hook, env, repo(), "Write", { file_path: "docs/a.md", content: `an ${EM} b
` });
      assert.strictEqual(r.code, 0, r.err);
      assert.ok(r.err.includes("[fx] edit rules off: boom"), r.err);
      const errors = errorLines(dirs);
      assert.strictEqual(errors.length, 1, JSON.stringify(ruleLog(dirs)));
      assert.deepStrictEqual([get(errors[0], "action"), get(errors[0], "unavailable")], ["allow", "boom"]);
    }
    {
      const PATCH = `*** Begin Patch
*** Add File: docs/a.md
+an ${EM} b
*** End Patch`;
      const { env } = setup();
      const direct = await call(CODEX, env, repo(), "apply_patch", { command: PATCH });
      assert.strictEqual(direct.code, 2, direct.err);
      assert.strictEqual(direct.err, DASH_REFUSAL);
      const shell = await call(CODEX, env, repo(), "Bash", { command: `apply_patch <<'PATCH'
${PATCH}
PATCH` });
      assert.strictEqual(shell.code, 2, shell.err);
      assert.strictEqual(shell.err, DASH_REFUSAL);
      const clean = "*** Begin Patch\n*** Add File: docs/ok.md\n+fine\n*** End Patch";
      const hard = await call(CODEX, env, repo(), "Bash", { command: `apply_patch <<'PATCH'
${clean}
PATCH
rm -rf ~` });
      assert.strictEqual(hard.code, 2, hard.err);
      assert.strictEqual(hard.err, RM_ROOT);
    }
  } finally {
    for (const c of cleanups) c();
  }
  console.log("edit-rules.test.js: ok");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
