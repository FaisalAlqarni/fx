// generated from src/lib/hook-input.test.ts by scripts/build: edit there, not here
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
var assert = __toESM(require("assert"));
var import_child_process = require("child_process");
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_hook_input = require("./hook-input.js");
const bash = { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } };
for (const [label, parse] of [["claude", import_hook_input.parseClaudeHookInput], ["codex", import_hook_input.parseCodexHookInput]]) {
  const ok = parse(bash);
  assert.ok(ok.ok, `${label}: a PreToolUse payload parses`);
  assert.strictEqual(ok.value.tool_name, "Bash", `${label}: tool_name`);
  assert.deepStrictEqual(ok.value.tool_input, { command: "ls" }, `${label}: tool_input`);
  for (const raw of ["x", null, 7, ["a"]]) {
    assert.deepStrictEqual(parse(raw), { ok: false, reason: "hook input is not an object" }, `${label}: ${JSON.stringify(raw)}`);
  }
  const falsy = parse({ tool_input: false });
  assert.ok(falsy.ok);
  assert.deepStrictEqual(falsy.value.tool_input, {}, `${label}: falsy tool_input`);
  const str = parse({ tool_input: "x" });
  assert.ok(str.ok);
  assert.strictEqual(str.value.tool_input, null, `${label}: string tool_input`);
  const seven = parse({ hook_event_name: 7 });
  assert.ok(seven.ok);
  assert.strictEqual(seven.value.hook_event_name, 7, `${label}: hook_event_name kept as sent`);
  const cwd = parse({ cwd: 42 });
  assert.ok(cwd.ok);
  assert.strictEqual(cwd.value.cwd, void 0, `${label}: a non-string cwd is dropped`);
}
{
  const post = (0, import_hook_input.parseClaudeHookInput)({ hook_event_name: "PostToolUse", tool_response: { stdout: "o", stderr: "" } });
  assert.ok(post.ok);
  assert.deepStrictEqual(post.value.tool_response, { stdout: "o", stderr: "" }, "claude: tool_response kept as sent");
  const failure = (0, import_hook_input.parseClaudeHookInput)({ hook_event_name: "PostToolUseFailure", error: "Exit code 1" });
  assert.ok(failure.ok);
  assert.strictEqual(failure.value.error, "Exit code 1", "claude: error string");
  const interrupt = (0, import_hook_input.parseClaudeHookInput)({ hook_event_name: "PostToolUseFailure", is_interrupt: true });
  assert.ok(interrupt.ok);
  assert.strictEqual(interrupt.value.is_interrupt, true, "claude: is_interrupt");
  const badInterrupt = (0, import_hook_input.parseClaudeHookInput)({ is_interrupt: "yes" });
  assert.ok(badInterrupt.ok);
  assert.strictEqual(badInterrupt.value.is_interrupt, void 0, "claude: a non-boolean is_interrupt is dropped");
  const badError = (0, import_hook_input.parseClaudeHookInput)({ error: { message: "x" } });
  assert.ok(badError.ok);
  assert.strictEqual(badError.value.error, void 0, "claude: a non-string error is dropped");
  const codexPost = (0, import_hook_input.parseCodexHookInput)({ hook_event_name: "PostToolUse", tool_response: "Exit code: 1" });
  assert.ok(codexPost.ok);
  assert.strictEqual(codexPost.value.tool_response, "Exit code: 1", "codex: tool_response kept as sent");
}
const turn = (0, import_hook_input.parseClaudeHookInput)({ session_id: "s", prompt: "hi", agent_id: "a1", agent_type: "x" });
assert.ok(turn.ok);
assert.strictEqual(turn.value.prompt, "hi");
assert.strictEqual(turn.value.agent_id, "a1");
assert.strictEqual(turn.value.agent_type, "x");
const noTurn = (0, import_hook_input.parseClaudeHookInput)({ prompt: 3, agent_type: 4 });
assert.ok(noTurn.ok);
assert.strictEqual(noTurn.value.prompt, void 0);
assert.strictEqual(noTurn.value.agent_type, void 0);
const claude = (0, import_hook_input.parseClaudeHookInput)({ tool_name: 7, transcript_path: "/t.jsonl", session_id: "s" });
assert.ok(claude.ok);
assert.strictEqual(claude.value.tool_name, void 0, "claude: a non-string tool_name is dropped");
assert.strictEqual(claude.value.transcript_path, "/t.jsonl");
assert.strictEqual(claude.value.session_id, "s");
const codex = (0, import_hook_input.parseCodexHookInput)({ tool_name: 7, agent_id: 7, agent_type: "fx-lens-security" });
assert.ok(codex.ok);
assert.strictEqual(codex.value.tool_name, 7, "codex: tool_name kept as sent");
assert.strictEqual(codex.value.agent_id, 7, "codex: agent_id kept as sent");
assert.strictEqual(codex.value.agent_type, "fx-lens-security");
const shell = (0, import_hook_input.parseCodexHookInput)({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } });
assert.ok(shell.ok);
assert.strictEqual(shell.value.command, "ls", "codex: the Bash command");
for (const raw of [{ tool_name: "Bash", tool_input: { command: 42 } }, { tool_name: "apply_patch", tool_input: { command: "ls" } }]) {
  const none = (0, import_hook_input.parseCodexHookInput)(raw);
  assert.ok(none.ok);
  assert.strictEqual(none.value.command, void 0, `codex: no command in ${JSON.stringify(raw)}`);
}
const prompt = (0, import_hook_input.parseCodexHookInput)({ hook_event_name: "UserPromptSubmit", session_id: "s1", prompt: "publish it", agent_id: "a1", agent_type: "default" });
assert.ok(prompt.ok);
assert.strictEqual(prompt.value.prompt, "publish it", "codex: prompt");
assert.strictEqual(prompt.value.session_id, "s1", "codex: session_id");
assert.strictEqual(prompt.value.agent_id, "a1", "codex: a string agent_id");
assert.strictEqual(prompt.value.agent_type, "default", "codex: a string agent_type");
const noPrompt = (0, import_hook_input.parseCodexHookInput)({ prompt: 3 });
assert.ok(noPrompt.ok);
assert.strictEqual(noPrompt.value.prompt, void 0, "codex: a non-string prompt is dropped");
const badType = (0, import_hook_input.parseCodexHookInput)({ agent_type: 7 });
assert.ok(badType.ok);
assert.strictEqual(badType.value.agent_type, void 0, "codex: a non-string agent_type is dropped");
const ROOT = path.join(__dirname, "..");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fx-hook-input-"));
try {
  const env = {
    PATH: process.env.PATH ?? "",
    HOME: scratch,
    CODEX_HOME: scratch,
    TMPDIR: scratch,
    XDG_CONFIG_HOME: path.join(scratch, "config"),
    XDG_STATE_HOME: path.join(scratch, "state"),
    APPDATA: path.join(scratch, "appdata"),
    LOCALAPPDATA: path.join(scratch, "localappdata")
  };
  const bashLs = JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" }, cwd: scratch });
  const sessionStart = JSON.stringify({ hook_event_name: "SessionStart", source: "startup", cwd: scratch });
  const stubs = [
    ["hook-input.js", "throw new Error('load')\n", "load", "load"],
    ["json.js", "throw new Error('load')\n", "load", "load"],
    ["hook-input.js", "module.exports = {};\n", "parseClaudeHookInput is not a function", "parseCodexHookInput is not a function"],
    ["json.js", "module.exports = {};\n", "parseJson is not a function", "parseJson is not a function"]
  ];
  stubs.forEach(([lib, stub, claudeWhy, codexWhy], i) => {
    const copy = path.join(scratch, `copy-${i}`);
    for (const dir of ["hooks", "lib", path.join("codex", "agents")]) {
      fs.cpSync(path.join(ROOT, dir), path.join(copy, dir), { recursive: true });
    }
    fs.copyFileSync(path.join(ROOT, "PREAMBLE.md"), path.join(copy, "PREAMBLE.md"));
    fs.writeFileSync(path.join(copy, "lib", lib), stub);
    const run = (hook, input) => (0, import_child_process.spawnSync)(process.execPath, [path.join(copy, "hooks", hook)], { input, cwd: scratch, env, encoding: "utf8" });
    const refusal = (why) => `[fx] hook input parser failed to load (${why}). Denying every call until the plugin is repaired.
`;
    const label = `lib/${lib} as ${JSON.stringify(stub)}`;
    for (const [hook, why, input] of [["fx-pretooluse.js", claudeWhy, bashLs], ["fx-codex.js", codexWhy, bashLs], ["fx-codex.js", codexWhy, sessionStart]]) {
      const r = run(hook, input);
      assert.strictEqual(r.status, 2, `${hook} with ${label}: exit ${r.status}, stderr ${r.stderr}`);
      assert.strictEqual(r.stderr, refusal(why), `${hook} with ${label}`);
      assert.strictEqual(r.stdout, "", `${hook} with ${label}: stdout`);
    }
    const ctx = run("fx-context.js", sessionStart);
    assert.strictEqual(ctx.status, 0, `fx-context.js with ${label}: exit ${ctx.status}, stderr ${ctx.stderr}`);
    assert.match(ctx.stdout, /PREAMBLE\.md could not be read/, `fx-context.js with ${label}: the warning`);
  });
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
for (const [label, parse] of [["claude", import_hook_input.parseClaudeHookInput], ["codex", import_hook_input.parseCodexHookInput]]) {
  const stop = parse({ hook_event_name: "Stop", session_id: "s", stop_hook_active: true, last_assistant_message: "done" });
  assert.ok(stop.ok);
  assert.strictEqual(stop.value.stop_hook_active, true, `${label}: stop_hook_active`);
  assert.strictEqual(stop.value.last_assistant_message, "done", `${label}: last_assistant_message`);
  const bare = parse({ hook_event_name: "Stop", session_id: "s" });
  assert.ok(bare.ok);
  assert.strictEqual(bare.value.stop_hook_active, false, `${label}: absent stop_hook_active is false`);
  assert.strictEqual(bare.value.last_assistant_message, null, `${label}: absent message is null`);
  const odd = parse({ stop_hook_active: "true", last_assistant_message: 7 });
  assert.ok(odd.ok);
  assert.strictEqual(odd.value.stop_hook_active, false, `${label}: a string is not true`);
  assert.strictEqual(odd.value.last_assistant_message, null, `${label}: a number is not a message`);
}
assert.strictEqual((0, import_hook_input.subagentId)("a1"), "a1");
assert.strictEqual((0, import_hook_input.subagentId)(7), "7");
assert.strictEqual((0, import_hook_input.subagentId)(0), "0");
for (const none of [void 0, null, ""]) assert.strictEqual((0, import_hook_input.subagentId)(none), null, String(none));
console.log("hook-input.test.js: ok");
