// generated from src/tests/gates/opencode-edit-rules.test.ts by scripts/build: edit there, not here
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
var import_fx_json_watch = require("../../lib/fx-json-watch.js");
var import_shell_rules = require("../../lib/shell-rules.js");
var import_preamble = require("../../lib/preamble.js");
const ROOT = path.join(__dirname, "..", "..");
const EM = String.fromCodePoint(8212);
const DASH = "[fx] rule no-dashes: Prose uses no em dash (U+2014) or en dash (U+2013) characters. (docs/a.md)";
const TODO = { id: "no-todo", glob: "**/*.rb", rule: "No TODO comments." };
const V2_GAP = "GAP: opencode 2.x shows no notice when the .fx.json hook switches change during a session.";
function get(v, ...keys) {
  let cur = v;
  for (const k of keys) cur = typeof cur === "object" && cur !== null ? Reflect.get(cur, k) : void 0;
  return cur;
}
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const count = (lines, line) => lines.filter((l) => l === line).length;
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
function stub(directory, during) {
  const hooks = {};
  const duringErrors = [];
  const reg = { dispose() {
  } };
  const hook = (domain) => async (name, cb) => {
    (hooks[`${domain}.${name}`] ||= []).push(cb);
    if (during && domain === "tool" && name === "execute.before") {
      try {
        await cb(during);
      } catch (e) {
        duringErrors.push(e);
      }
    }
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
  return { hooks, ctx, duringErrors };
}
async function main() {
  const fx = (await import(path.join(ROOT, "plugins", "fx-opencode-v1.js"))).fx;
  const v2 = await import((0, import_url.pathToFileURL)(path.join(ROOT, "plugins", "fx-opencode-v2.js")).href);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fx-oc-edit-rules-"));
  cleanups.push(() => fs.rmSync(tmp, { recursive: true, force: true }));
  let repos = 0;
  const repo = (files = {}) => {
    const dir = path.join(tmp, `r${repos++}`);
    fs.mkdirSync(dir);
    assert.strictEqual((0, import_child_process.spawnSync)("git", ["init", "-q", dir]).status, 0);
    fs.writeFileSync(path.join(dir, ".fx.json"), JSON.stringify({ rules: [TODO] }));
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    }
    return dir;
  };
  const copyWith = (lib, source) => {
    const copy = path.join(tmp, `copy${repos++}`);
    for (const d of ["plugins", "lib", "agents", "codex", "commands", "skills", "references"]) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
    for (const f of ["PREAMBLE.md", "package.json"]) if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(copy, f));
    fs.copyFileSync(path.join(ROOT, "lib", lib), path.join(copy, "lib", `real-${lib}`));
    fs.writeFileSync(path.join(copy, "lib", lib), source);
    return copy;
  };
  const ruleErrors = (dirs) => (0, import_hook_env.readDecisionLog)(dirs).filter((e) => get(e, "event") === "edit-rule" && get(e, "source") === "error");
  const v1 = async (opts = {}) => {
    const dirs = scratch();
    const dir = repo(opts.files);
    const plugin = opts.root === void 0 ? fx : (await import(path.join(opts.root, "plugins", "fx-opencode-v1.js"))).fx;
    return { h: await plugin({ directory: dir }), dir, dirs };
  };
  const call = (h, tool, args) => h["tool.execute.before"]({ tool, sessionID: "s" }, { args });
  const RB = { filePath: "app/a.rb", content: "# TODO later\n" };
  const transform = async (h) => {
    const out = { system: [] };
    await h["experimental.chat.system.transform"]({ sessionID: "s" }, out);
    return out.system;
  };
  const userMessage = (h) => h["chat.message"]({ sessionID: "s", agent: "build", model: { providerID: "p", modelID: "m" }, messageID: "msg1", variant: void 0 });
  const v2Setup = async (opts = {}) => {
    const dirs = scratch();
    const dir = repo();
    const s = stub(dir, opts.during);
    const plugin = opts.root === void 0 ? v2 : await import((0, import_url.pathToFileURL)(path.join(opts.root, "plugins", "fx-opencode-v2.js")).href);
    await plugin.default.setup(s.ctx);
    const before = (s.hooks["tool.execute.before"] ?? [])[0];
    assert.ok(before, "execute.before is registered");
    const context = async () => {
      const ev = { system: [], sessionID: "s" };
      for (const cb of s.hooks["session.context"] ?? []) await cb(ev);
      return ev.system.map((t) => t.text);
    };
    return { before, context, dir, dirs, duringErrors: s.duringErrors };
  };
  let n = 0;
  const v2Event = (tool, input) => ({ tool, sessionID: "s", messageID: "m", id: `call_${n++}`, input });
  const V2_RB = { path: "app/a.rb", oldString: "x", newString: "x\n# TODO later" };
  try {
    for (const [tool, args] of [
      ["write", { filePath: "docs/a.md", content: `# T
an ${EM} b
` }],
      ["edit", { filePath: "docs/a.md", oldString: "a", newString: `an ${EM} b` }],
      ["apply_patch", { patchText: `*** Begin Patch
*** Add File: docs/a.md
+an ${EM} b
*** End Patch` }]
    ]) {
      const { h } = await v1();
      await assert.rejects(call(h, tool, args), { message: DASH }, tool);
    }
    {
      const old = `old ${EM} line
`;
      const { h } = await v1({ files: { "docs/a.md": old } });
      await call(h, "write", { filePath: "docs/a.md", content: `${old}new clean line
` });
    }
    {
      const { h, dir, dirs } = await v1();
      await call(h, "write", RB);
      assert.deepStrictEqual((0, import_hook_env.readDecisionLog)(dirs), []);
      assert.deepStrictEqual(await transform(h), [(0, import_preamble.render)({ harness: "opencode", cwd: dir })]);
    }
    {
      const { h, dirs } = await v1();
      await assert.rejects(call(h, "write", { filePath: path.join(dirs.state, "x.rb"), content: "# TODO later\n" }), { message: (0, import_shell_rules.hardReason)("fx-state") });
    }
    {
      const { h, dir, dirs } = await v1();
      await userMessage(h);
      assert.strictEqual(count(await transform(h), import_fx_json_watch.FX_JSON_NOTICE), 0);
      fs.writeFileSync(path.join(dir, ".fx.json"), JSON.stringify({ rules: [TODO], hooks: { stop_check: false } }));
      stderr.length = 0;
      await userMessage(h);
      assert.strictEqual(stderr.filter((l) => l.includes(import_fx_json_watch.FX_JSON_NOTICE)).length, 1, stderr.join("\n"));
      assert.strictEqual(count(await transform(h), import_fx_json_watch.FX_JSON_NOTICE), 1);
      await userMessage(h);
      assert.strictEqual(count(await transform(h), import_fx_json_watch.FX_JSON_NOTICE), 0, "told once");
      const notices = (0, import_hook_env.readDecisionLog)(dirs).filter((e) => get(e, "source") === "fx-json");
      assert.deepStrictEqual(notices.map((e) => [get(e, "event"), get(e, "action"), get(e, "harness"), get(e, "session")]), [["health", "notice", "opencode", "s"]]);
    }
    assert.deepStrictEqual(stderr.filter((l) => l.startsWith("[fx] edit rules off")), []);
    {
      const { h } = await v1({ root: copyWith("fx-json-watch.js", "throw new Error('watch load');\n") });
      stderr.length = 0;
      await userMessage(h);
      await userMessage(h);
      assert.strictEqual(stderr.filter((l) => l === "[fx] the .fx.json change notice is off: watch load").length, 1, stderr.join("\n"));
    }
    {
      const { h, dirs } = await v1({ root: copyWith("edit-rules.js", "throw new Error('rules load');\n") });
      await call(h, "write", { filePath: "docs/a.md", content: `an ${EM} b
` });
      await call(h, "edit", { filePath: "docs/a.md", oldString: "a", newString: `an ${EM} b` });
      const lines = ruleErrors(dirs);
      assert.strictEqual(lines.length, 2, JSON.stringify(lines));
      for (const l of lines) assert.deepStrictEqual([get(l, "action"), get(l, "harness"), get(l, "session"), get(l, "unavailable")], ["allow", "opencode", "s", "rules load"]);
    }
    stderr.length = 0;
    for (const [tool, input] of [
      ["edit", { path: "docs/a.md", oldString: "a", newString: `an ${EM} b` }],
      ["write", { path: "docs/a.md", content: `an ${EM} b
` }],
      ["patch", { patchText: `*** Begin Patch
*** Add File: docs/a.md
+an ${EM} b
*** End Patch` }]
    ]) {
      const { before } = await v2Setup();
      assert.throws(() => before(v2Event(tool, input)), { message: DASH }, tool);
    }
    assert.deepStrictEqual(stderr.filter((l) => l.startsWith("[fx] edit rules off")), []);
    for (const [source, unavailable] of [
      ["throw new Error('rules load');\n", "rules load"],
      ["const r = require('./real-edit-rules.js');\nmodule.exports = { checkEdit: r.checkEdit, logEditRuleError: r.logEditRuleError };\n", "checkBuiltins is not a function"]
    ]) {
      const { before, dirs } = await v2Setup({ root: copyWith("edit-rules.js", source) });
      assert.strictEqual(before(v2Event("edit", { path: "docs/a.md", oldString: "a", newString: `an ${EM} b` })), void 0);
      assert.strictEqual(before(v2Event("write", { path: "docs/a.md", content: `an ${EM} b
` })), void 0);
      const lines = ruleErrors(dirs);
      assert.strictEqual(lines.length, 2, JSON.stringify(lines));
      for (const l of lines) assert.deepStrictEqual([get(l, "action"), get(l, "harness"), get(l, "session"), get(l, "unavailable")], ["allow", "opencode-v2", "s", unavailable]);
    }
    {
      const { before, dirs } = await v2Setup();
      const input = { oldString: "a", newString: "b", get path() {
        throw new Error("path broke");
      } };
      await before(v2Event("edit", input));
      await wait(50);
      const lines = ruleErrors(dirs);
      assert.strictEqual(lines.length, 1, JSON.stringify(lines));
      assert.strictEqual(get(lines[0], "unavailable"), "path broke");
    }
    {
      const { duringErrors } = await v2Setup({ root: copyWith("edit-rules.js", "throw new Error('rules load');\n"), during: v2Event("edit", { path: "docs/a.md", oldString: "a", newString: "b" }) });
      assert.deepStrictEqual(duringErrors.map(String), []);
    }
    {
      const ref = fs.readFileSync(path.join(ROOT, "references", "harnesses", "opencode-v2.md"), "utf8");
      assert.ok(ref.includes(V2_GAP));
    }
  } finally {
    for (const c of cleanups.reverse()) c();
  }
  console.log("opencode-edit-rules.test.js: ok");
}
main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack : String(e)}
`);
  process.exit(1);
});
