// generated from src/tests/gates/turn-journal.test.ts by scripts/build: edit there, not here
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
var import_hook_env = require("../helpers/hook-env.js");
var import_json = require("../../lib/json.js");
var import_stop_check = require("../../lib/stop-check.js");
const ROOT = path.join(__dirname, "..", "..");
const turn = path.join(ROOT, "hooks", "fx-turn.js");
const context = path.join(ROOT, "hooks", "fx-context.js");
async function main() {
  const { env, dirs, cleanup } = (0, import_hook_env.scratchHookEnv)();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "fx-turn-cwd-"));
  const sessions = path.join(dirs.state, "sessions");
  const lines = (name) => fs.readFileSync(path.join(sessions, `${name}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => (0, import_json.parseJson)(l));
  const files = () => fs.existsSync(sessions) ? fs.readdirSync(sessions).sort() : [];
  const submit = { hook_event_name: "UserPromptSubmit", session_id: "s1", cwd, prompt: "deploy with token=abc123def456ghi789" };
  try {
    let r = await (0, import_hook_env.runHook)(turn, submit, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, "");
    const first = lines("s1");
    assert.strictEqual(first.length, 1);
    assert.deepStrictEqual({ ...first[0], t: 0 }, { t: 0, kind: "prompt", text: "deploy with token=[REDACTED]" });
    if (process.platform !== "win32") assert.strictEqual(fs.statSync(path.join(sessions, "s1.jsonl")).mode & 511, 384);
    r = await (0, import_hook_env.runHook)(turn, { ...submit, prompt: "second" }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(lines("s1").length, 2, "a second prompt adds a line");
    const before = fs.readFileSync(path.join(sessions, "s1.jsonl"), "utf8");
    r = await (0, import_hook_env.runHook)(turn, { hook_event_name: "UserPromptSubmit", session_id: "s1", agent_id: "a1", agent_type: "default", prompt: "implement task 3" }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, "");
    assert.strictEqual(fs.readFileSync(path.join(sessions, "s1.jsonl"), "utf8"), before, "the root journal is unchanged");
    const sub = lines("s1__a1");
    assert.strictEqual(sub.length, 1);
    assert.deepStrictEqual({ ...sub[0], t: 0 }, { t: 0, kind: "prompt", text: null });
    r = await (0, import_hook_env.runHook)(turn, { hook_event_name: "UserPromptSubmit", session_id: "s1", agent_id: 7, prompt: "implement task 4" }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(fs.readFileSync(path.join(sessions, "s1.jsonl"), "utf8"), before, "a numeric agent_id leaves the root journal alone");
    assert.deepStrictEqual({ ...lines("s1__7")[0], t: 0 }, { t: 0, kind: "prompt", text: null });
    {
      const copy = fs.mkdtempSync(path.join(os.tmpdir(), "fx-turn-copy-"));
      try {
        for (const d of ["hooks", "lib"]) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
        fs.writeFileSync(path.join(copy, "lib", "redact.js"), "exports.CAP_PROMPT = 2000; exports.CAP_COMMAND = 2000; exports.redact = () => { throw new Error('redact'); };\n");
        const sizeBefore = lines("s1").length;
        r = await (0, import_hook_env.runHook)(path.join(copy, "hooks", "fx-turn.js"), { ...submit, prompt: "third" }, env);
        assert.strictEqual(r.code, 0, r.err);
        assert.strictEqual(r.out, "");
        const all = lines("s1");
        assert.strictEqual(all.length, sizeBefore + 1);
        assert.deepStrictEqual({ ...all.at(-1), t: 0 }, { t: 0, kind: "prompt", text: null });
      } finally {
        fs.rmSync(copy, { recursive: true, force: true });
      }
    }
    const names = files();
    r = await (0, import_hook_env.runHook)(turn, { ...submit, prompt: "[fx] This turn edited files and no check has passed since the last edit." }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, "");
    assert.deepStrictEqual(files(), names);
    assert.strictEqual(lines("s1").length, 3);
    for (const mode of ["block", "reminder"]) {
      r = await (0, import_hook_env.runHook)(turn, { ...submit, prompt: `Stop hook feedback:
${(0, import_stop_check.stopReason)("`npm test`", mode)}` }, env);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(lines("s1").length, 3, mode);
    }
    {
      const copy = fs.mkdtempSync(path.join(os.tmpdir(), "fx-turn-copy-"));
      try {
        for (const d of ["hooks", "lib"]) fs.cpSync(path.join(ROOT, d), path.join(copy, d), { recursive: true });
        fs.writeFileSync(path.join(copy, "lib", "stop-check.js"), "throw new Error('stop-check broken');\n");
        r = await (0, import_hook_env.runHook)(path.join(copy, "hooks", "fx-turn.js"), { ...submit, session_id: "s7", prompt: "fourth" }, env);
        assert.strictEqual(r.code, 0, r.err);
        assert.deepStrictEqual(lines("s7").map((l) => ({ ...l, t: 0 })), [{ t: 0, kind: "prompt", text: "fourth" }]);
      } finally {
        fs.rmSync(copy, { recursive: true, force: true });
      }
    }
    const fresh = (0, import_hook_env.scratchHookEnv)();
    try {
      r = await (0, import_hook_env.runHook)(turn, { hook_event_name: "UserPromptSubmit", cwd, prompt: "hi" }, fresh.env);
      assert.strictEqual(r.code, 0, r.err);
      assert.strictEqual(r.out, "");
      assert.ok(!fs.existsSync(path.join(fresh.dirs.state, "sessions")));
    } finally {
      fresh.cleanup();
    }
    r = await (0, import_hook_env.runHook)(turn, "not json", env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, "");
    r = await (0, import_hook_env.runHook)(turn, { hook_event_name: "Stop", session_id: "s1" }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, "");
    const kinds = lines("s1").map((l) => Reflect.get(Object(l), "kind"));
    assert.deepStrictEqual(kinds.filter((k) => k !== "fx-json-hooks").length, 3, "Stop adds no turn event");
    assert.deepStrictEqual(kinds.filter((k) => k === "fx-json-hooks").length, 1, "and one .fx.json baseline");
    const blocked = path.join(dirs.root, "blocked");
    fs.writeFileSync(blocked, "");
    r = await (0, import_hook_env.runHook)(turn, submit, { ...env, XDG_STATE_HOME: blocked, LOCALAPPDATA: blocked });
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, "");
    assert.ok(r.err.startsWith("[fx] journal:"), r.err);
    const start = { hook_event_name: "SubagentStart", cwd };
    const plain = await (0, import_hook_env.runHook)(context, start, env);
    assert.strictEqual(plain.code, 0, plain.err);
    assert.ok(plain.out.length > 0);
    const noIds = files();
    r = await (0, import_hook_env.runHook)(context, { ...start, session_id: "s1", agent_id: "a2" }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.strictEqual(r.out, plain.out, "stdout is byte-identical");
    const s2 = lines("s1__a2");
    assert.strictEqual(s2.length, 1);
    assert.deepStrictEqual({ ...s2[0], t: 0 }, { t: 0, kind: "prompt", text: null, agentType: null });
    r = await (0, import_hook_env.runHook)(context, { ...start, session_id: "s1", agent_id: "a3", agent_type: "fx-lens-security" }, env);
    assert.strictEqual(r.out, plain.out);
    assert.deepStrictEqual({ ...lines("s1__a3")[0], t: 0 }, { t: 0, kind: "prompt", text: null, agentType: "fx-lens-security" });
    assert.deepStrictEqual(files(), [...noIds, "s1__a2.jsonl", "s1__a3.jsonl"].sort(), "no ids, no journal");
    r = await (0, import_hook_env.runHook)(context, { ...start, session_id: "s1", agent_id: 8 }, env);
    assert.strictEqual(r.code, 0, r.err);
    assert.deepStrictEqual({ ...lines("s1__8")[0], t: 0 }, { t: 0, kind: "prompt", text: null, agentType: null });
    r = await (0, import_hook_env.runHook)(context, { hook_event_name: "SessionStart", session_id: "s9", cwd }, env);
    assert.deepStrictEqual(lines("s9").map((l) => Reflect.get(Object(l), "kind")), ["fx-json-hooks"]);
  } finally {
    cleanup();
    fs.rmSync(cwd, { recursive: true, force: true });
  }
  const reg = (0, import_json.parseJson)(fs.readFileSync(path.join(ROOT, "hooks", "hooks.json"), "utf8"));
  const group = reg.hooks.UserPromptSubmit;
  assert.strictEqual(group[0]?.hooks[0]?.command, 'node "${CLAUDE_PLUGIN_ROOT}/hooks/fx-turn.js"');
  assert.strictEqual(group[0]?.hooks[0]?.timeout, 5);
  console.log("turn-journal.test.js: ok");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
