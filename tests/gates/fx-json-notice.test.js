// generated from src/tests/gates/fx-json-notice.test.ts by scripts/build: edit there, not here
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
var import_fx_json_watch = require("../../lib/fx-json-watch.js");
var import_json = require("../../lib/json.js");
const ROOT = path.join(__dirname, "..", "..");
const CONTEXT = path.join(ROOT, "hooks", "fx-context.js");
const TURN = path.join(ROOT, "hooks", "fx-turn.js");
const CODEX = path.join(ROOT, "hooks", "fx-codex.js");
function get(v, ...keys2) {
  let cur = v;
  for (const k of keys2) cur = typeof cur === "object" && cur !== null ? Reflect.get(cur, k) : void 0;
  return cur;
}
const keys = (out) => {
  const v = (0, import_json.parseJson)(out);
  return typeof v === "object" && v !== null ? Object.keys(v).sort() : [];
};
async function main() {
  const scratch = (0, import_hook_env.scratchHookEnv)();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "fx-json-notice-"));
  (0, import_child_process.spawnSync)("git", ["init", "-q", repo]);
  const env = scratch.env;
  const fxJson = (v) => fs.writeFileSync(path.join(repo, ".fx.json"), JSON.stringify(v));
  const stop = (hook, session) => (0, import_hook_env.runHook)(hook, { hook_event_name: "Stop", session_id: session, cwd: repo, stop_hook_active: false, last_assistant_message: null }, env);
  try {
    const start = await (0, import_hook_env.runHook)(CONTEXT, { hook_event_name: "SessionStart", session_id: "s5", cwd: repo, source: "startup" }, env);
    assert.strictEqual(start.code, 0, start.err);
    assert.strictEqual(get((0, import_json.parseJson)(start.out), "systemMessage"), void 0, "nothing changed yet");
    fxJson({ hooks: { edit_rules: false } });
    const first = await stop(TURN, "s5");
    assert.strictEqual(first.code, 0, first.err);
    assert.deepStrictEqual((0, import_json.parseJson)(first.out), { systemMessage: import_fx_json_watch.FX_JSON_NOTICE });
    const quiet = await stop(TURN, "s5");
    assert.strictEqual(quiet.out, "", "nothing changed since");
    fxJson({ hooks: { edit_rules: false }, rules: [{ id: "a", glob: "*", rule: "x" }] });
    assert.strictEqual((await stop(TURN, "s5")).out, "", "rules are not watched");
    fxJson({ hooks: { edit_rules: false, loop_nudge: false } });
    const resume = await (0, import_hook_env.runHook)(CONTEXT, { hook_event_name: "SessionStart", session_id: "s5", cwd: repo, source: "resume" }, env);
    assert.strictEqual(resume.code, 0, resume.err);
    assert.strictEqual(get((0, import_json.parseJson)(resume.out), "systemMessage"), import_fx_json_watch.FX_JSON_NOTICE);
    assert.ok(String(get((0, import_json.parseJson)(resume.out), "hookSpecificOutput", "additionalContext")).includes(import_fx_json_watch.FX_JSON_NOTICE));
    await (0, import_hook_env.runHook)(TURN, { hook_event_name: "UserPromptSubmit", session_id: "s5", cwd: repo, prompt: "change the helper please" }, env);
    await (0, import_hook_env.runHook)(TURN, { hook_event_name: "PostToolUse", session_id: "s5", cwd: repo, tool_name: "Edit", tool_input: { file_path: path.join(repo, "a.ts") }, tool_response: {} }, env);
    fxJson({ hooks: { loop_nudge: false } });
    const blocked = await stop(TURN, "s5");
    assert.deepStrictEqual(keys(blocked.out), ["decision", "reason", "systemMessage"]);
    assert.strictEqual(get((0, import_json.parseJson)(blocked.out), "systemMessage"), import_fx_json_watch.FX_JSON_NOTICE);
    const cstart = await (0, import_hook_env.runHook)(CODEX, { hook_event_name: "SessionStart", session_id: "s7", cwd: repo, source: "startup" }, env);
    assert.strictEqual(cstart.code, 0, cstart.err);
    fxJson({ hooks: { stop_check: false } });
    const cstop = await stop(CODEX, "s7");
    assert.strictEqual(cstop.code, 0, cstop.err);
    assert.strictEqual(cstop.out, "");
    assert.ok(cstop.err.includes(import_fx_json_watch.FX_JSON_NOTICE), cstop.err);
    const cquiet = await stop(CODEX, "s7");
    assert.ok(!cquiet.err.includes(import_fx_json_watch.FX_JSON_NOTICE), "told once");
  } finally {
    scratch.cleanup();
    fs.rmSync(repo, { recursive: true, force: true });
  }
  console.log("fx-json-notice.test.js: ok");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
