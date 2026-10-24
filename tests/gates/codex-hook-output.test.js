// generated from src/tests/gates/codex-hook-output.test.ts by scripts/build: edit there, not here
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
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_plant_roles = require("../../lib/plant-roles.js");
var import_hook_env = require("../helpers/hook-env.js");
const root = path.join(__dirname, "..", "..");
const hook = path.join(root, "hooks", "fx-codex.js");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "fx-codex-output-home-"));
const scratch = (0, import_hook_env.scratchHookEnv)();
const env = { ...scratch.env, CODEX_HOME: home, HOME: home, TMPDIR: home };
process.on("exit", () => {
  fs.rmSync(home, { recursive: true, force: true });
  scratch.cleanup();
});
const TOP_SESSION = /* @__PURE__ */ new Set(["hookSpecificOutput", "systemMessage"]);
const TOP = /* @__PURE__ */ new Set(["hookSpecificOutput"]);
const TOP_PRE = /* @__PURE__ */ new Set(["hookSpecificOutput", "systemMessage"]);
const INNER = /* @__PURE__ */ new Set(["hookEventName", "additionalContext", "permissionDecision", "permissionDecisionReason"]);
function run(payload) {
  const r2 = (0, import_child_process.spawnSync)("node", [hook], { input: JSON.stringify(payload), env, encoding: "utf8" });
  return { code: r2.status, out: r2.stdout.trim(), err: r2.stderr };
}
function keysOk(out, label, top = TOP) {
  if (!out) return;
  const j = JSON.parse(out);
  for (const k of Object.keys(j)) assert.ok(top.has(k), `${label}: unknown top-level key ${k}`);
  for (const k of Object.keys(j.hookSpecificOutput || {})) assert.ok(INNER.has(k), `${label}: unknown key ${k}`);
}
function denied(r2) {
  return r2.code === 2 && r2.err.trim() !== "" || r2.out !== "" && JSON.parse(r2.out).hookSpecificOutput.permissionDecision === "deny";
}
const base = { session_id: "s", turn_id: "t", cwd: root, transcript_path: null };
const PATCH = "*** Begin Patch\n*** Add File: x.txt\n+hi\n*** End Patch\n";
let r = run({ ...base, hook_event_name: "SessionStart", source: "startup" });
assert.strictEqual(r.code, 0);
keysOk(r.out, "SessionStart", TOP_SESSION);
assert.ok(JSON.parse(r.out).hookSpecificOutput.additionalContext.includes("$fx:fx-tdd"), "Codex addressing");
r = run({ ...base, hook_event_name: "SubagentStart", agent_id: "a1", agent_type: "default" });
assert.strictEqual(r.code, 0);
keysOk(r.out, "SubagentStart");
r = run({ ...base, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git branch -D fx-guard-probe" } });
keysOk(r.out, "refused Bash", TOP_PRE);
assert.ok(denied(r), "guard refuses");
r = run({ ...base, hook_event_name: "UserPromptSubmit", prompt: "publish it" });
assert.strictEqual(r.code, 0);
assert.strictEqual(r.out, "", "UserPromptSubmit prints nothing");
r = run({ ...base, hook_event_name: "UserPromptSubmit", agent_id: "a1", agent_type: "default", prompt: "implement task 3" });
assert.strictEqual(r.code, 0);
assert.strictEqual(r.out, "", "a subagent UserPromptSubmit prints nothing");
{
  const post = {
    ...base,
    session_id: "post-s",
    cwd: home,
    hook_event_name: "PostToolUse",
    tool_name: "Bash",
    tool_input: { command: "npm test" },
    tool_response: "Exit code: 1\nOutput:\nfail"
  };
  for (let i = 1; i <= 2; i++) {
    r = run(post);
    assert.strictEqual(r.code, 0);
    assert.strictEqual(r.out, "", `PostToolUse ${i} prints nothing`);
  }
  r = run(post);
  assert.strictEqual(r.code, 0);
  assert.ok(r.out !== "", "the third failure prints the nudge");
  keysOk(r.out, "PostToolUse nudge", TOP);
  const inner = Object.keys(JSON.parse(r.out).hookSpecificOutput).sort();
  assert.deepStrictEqual(inner, ["additionalContext", "hookEventName"]);
}
for (const [label, stub] of [
  ["shell guard ask", "exports.guardShell = async () => ({ action: 'ask', reason: '[fx] shell guard asks: x.', source: 'grey' });\n"],
  ["shell guard off", "exports.guardShell = () => Promise.reject(new Error('off'));\n"]
]) {
  const copy = fs.mkdtempSync(path.join(home, "guard-"));
  for (const d of ["hooks", "lib", "codex"]) fs.cpSync(path.join(root, d), path.join(copy, d), { recursive: true });
  fs.copyFileSync(path.join(root, "PREAMBLE.md"), path.join(copy, "PREAMBLE.md"));
  fs.writeFileSync(path.join(copy, "lib", "shell-guard.js"), stub);
  const t = (0, import_child_process.spawnSync)("node", [path.join(copy, "hooks", "fx-codex.js")], {
    input: JSON.stringify({ ...base, cwd: home, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "npm publish" } }),
    env,
    encoding: "utf8"
  });
  assert.strictEqual(t.status, 0, `${label}: ${t.stderr}`);
  assert.ok(t.stdout.trim() !== "", `${label}: prints the warning`);
  keysOk(t.stdout.trim(), label, TOP_PRE);
}
r = run({ ...base, hook_event_name: "SubagentStart", agent_id: "lens1", agent_type: "fx-lens-security" });
assert.strictEqual(r.code, 0);
r = run({
  ...base,
  hook_event_name: "PreToolUse",
  agent_id: "lens1",
  agent_type: "fx-lens-security",
  tool_name: "apply_patch",
  tool_input: { command: PATCH }
});
keysOk(r.out, "refused apply_patch");
assert.ok(denied(r), "read-only agent cannot patch");
r = run({
  ...base,
  hook_event_name: "PreToolUse",
  agent_id: "lens1",
  agent_type: "fx-lens-security",
  tool_name: "spawn_agent",
  tool_input: { message: "create x.txt", agent_type: "default" }
});
keysOk(r.out, "refused spawn_agent");
assert.ok(denied(r), "read-only agent cannot spawn a child");
r = run({
  ...base,
  hook_event_name: "PreToolUse",
  agent_id: "lens1",
  agent_type: "fx-lens-security",
  tool_name: "mcp__filesystem__write_file",
  tool_input: { path: "x.txt", content: "hi" }
});
keysOk(r.out, "refused mcp tool");
assert.ok(denied(r), "read-only agent cannot call an MCP tool");
r = run({
  ...base,
  cwd: home,
  hook_event_name: "PreToolUse",
  agent_id: "a1",
  agent_type: "default",
  tool_name: "apply_patch",
  tool_input: { command: PATCH }
});
assert.strictEqual(r.code, 0, `a default agent can patch: ${r.err}`);
assert.strictEqual(r.out, "", "an allowed patch prints nothing");
r = run({
  ...base,
  cwd: home,
  hook_event_name: "PreToolUse",
  agent_id: "a1",
  agent_type: "default",
  tool_name: "spawn_agent",
  tool_input: { message: "reply ok" }
});
assert.strictEqual(r.code, 0, `a default agent can spawn: ${r.err}`);
assert.strictEqual(r.out, "", "an allowed spawn prints nothing");
r = run({ ...base, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } });
assert.strictEqual(r.code, 0);
assert.strictEqual(r.out, "", "an allow prints nothing");
r = run({ ...base, cwd: home, hook_event_name: "PreToolUse", tool_name: "spawn_agent", tool_input: { message: "reply ok" } });
assert.strictEqual(r.code, 0, `the controller can spawn: ${r.err}`);
assert.strictEqual(r.out, "", "an allowed controller spawn prints nothing");
r = run({ ...base, cwd: home, hook_event_name: "PreToolUse", tool_name: "mcp__x__y", tool_input: {} });
assert.strictEqual(r.code, 0, `the controller can call an MCP tool: ${r.err}`);
assert.strictEqual(r.out, "", "an allowed controller MCP call prints nothing");
for (const tool of ["memory_tool", "request_permissions_tool"]) {
  r = run({ ...base, cwd: home, hook_event_name: "PreToolUse", agent_id: "lens1", tool_name: tool, tool_input: {} });
  keysOk(r.out, `refused ${tool}`);
  assert.ok(denied(r), `read-only agent cannot call ${tool}`);
}
for (const command of ["git diff", "git log --oneline", "git status", "/usr/bin/git show x"]) {
  r = run({ ...base, cwd: home, hook_event_name: "PreToolUse", agent_id: "lens1", tool_name: "Bash", tool_input: { command } });
  keysOk(r.out, `lens ${command}`);
  assert.ok(denied(r), `a read-only agent cannot run ${command}`);
}
const WHO = [["controller", {}], ["default agent", { agent_id: "a1" }]];
for (const [who, extra] of WHO) {
  for (const command of ["git status", "git log --oneline", "git diff HEAD~1"]) {
    r = run({ ...base, ...extra, cwd: root, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } });
    assert.strictEqual(r.code, 0, `the ${who} can run ${command}: ${r.err}`);
    assert.strictEqual(r.out, "", `an allowed ${who} git read prints nothing`);
  }
}
r = run({ ...base, cwd: home, hook_event_name: "PreToolUse", agent_id: "lens1", tool_name: "Bash", tool_input: { command: "cat file" } });
assert.strictEqual(r.code, 0, `a read-only agent can run a cleared read: ${r.err}`);
assert.strictEqual(r.out, "", "an allowed read prints nothing");
for (const tool of ["memory_tool", "request_permissions_tool"]) {
  r = run({ ...base, cwd: home, hook_event_name: "PreToolUse", agent_id: "a1", tool_name: tool, tool_input: {} });
  assert.strictEqual(r.code, 0, `a default agent can call ${tool}: ${r.err}`);
  assert.strictEqual(r.out, "", `an allowed ${tool} prints nothing`);
}
{
  const stub = path.join(home, "throwing-classifier.js");
  fs.writeFileSync(stub, `require(${JSON.stringify(path.join(root, "lib", "plant-roles"))}).isWritingToolCall = () => { throw new Error("classifier crashed"); };
`);
  const t = (0, import_child_process.spawnSync)("node", ["--require", stub, hook], {
    input: JSON.stringify({
      ...base,
      cwd: home,
      hook_event_name: "PreToolUse",
      agent_id: "lens1",
      tool_name: "Bash",
      tool_input: { command: "cat file" }
    }),
    env,
    encoding: "utf8"
  });
  const tr = { code: t.status, out: t.stdout.trim(), err: t.stderr };
  keysOk(tr.out, "classifier crash");
  assert.ok(denied(tr), "a classifier crash is refused, not treated as a read");
}
{
  assert.strictEqual(import_plant_roles.READ_ONLY_AGENTS.length, 6, "six read-only roles");
  const fresh = fs.mkdtempSync(path.join(os.tmpdir(), "fx-codex-notice-home-"));
  const env2 = { ...scratch.env, CODEX_HOME: fresh, HOME: fresh, TMPDIR: fresh };
  const start = () => {
    const r2 = (0, import_child_process.spawnSync)("node", [hook], {
      input: JSON.stringify({ ...base, hook_event_name: "SessionStart", source: "startup" }),
      env: env2,
      encoding: "utf8"
    });
    assert.strictEqual(r2.status, 0, r2.stderr);
    keysOk(r2.stdout.trim(), "SessionStart with notice", TOP_SESSION);
    return JSON.parse(r2.stdout);
  };
  const notice = (names) => `fx installed or updated its review roles (${names.join(", ")}). Codex reads roles when a session starts, so restart Codex once before dispatching an fx review agent.`;
  const first = start();
  assert.strictEqual(first.systemMessage, notice(import_plant_roles.READ_ONLY_AGENTS), "the user sees the exact notice");
  assert.ok(
    first.hookSpecificOutput.additionalContext.trimEnd().endsWith(notice(import_plant_roles.READ_ONLY_AGENTS)),
    "the model gets the same line"
  );
  const second = start();
  assert.ok(!("systemMessage" in second), "second session is silent");
  assert.ok(!second.hookSpecificOutput.additionalContext.includes("restart Codex once"), "and carries no copy");
  fs.appendFileSync(path.join(fresh, "agents", "fx-lens-a11y.toml"), "\n# drift\n");
  const third = start();
  assert.strictEqual(third.systemMessage, notice(["fx-lens-a11y"]), "only the repaired role, by name");
  fs.rmSync(fresh, { recursive: true, force: true });
}
{
  const stub = path.join(home, "throwing-plant.js");
  fs.writeFileSync(stub, `require(${JSON.stringify(path.join(root, "lib", "plant-roles"))}).plantRoles = () => { throw new Error("disk full"); };
`);
  const t = (0, import_child_process.spawnSync)("node", ["--require", stub, hook], {
    input: JSON.stringify({ ...base, hook_event_name: "SessionStart", source: "startup" }),
    env,
    encoding: "utf8"
  });
  assert.strictEqual(t.status, 0, "the session still starts when planting throws");
  keysOk(t.stdout.trim(), "SessionStart with a planting failure", TOP_SESSION);
  assert.ok(JSON.parse(t.stdout).hookSpecificOutput.additionalContext.length > 0, "and carries the preamble");
  assert.match(t.stderr, /\[fx\].*plant.*disk full/i, "one stderr line names the failure and its reason");
  assert.strictEqual(t.stderr.trim().split("\n").length, 1, "exactly one line");
}
{
  const broken = fs.mkdtempSync(path.join(os.tmpdir(), "fx-codex-broken-"));
  try {
    for (const d of ["hooks", "lib", "codex"]) fs.cpSync(path.join(root, d), path.join(broken, d), { recursive: true });
    fs.copyFileSync(path.join(root, "PREAMBLE.md"), path.join(broken, "PREAMBLE.md"));
    fs.writeFileSync(path.join(broken, "lib", "plant-roles.js"), "throw new Error('stubbed plant-roles failure');\n");
    const runBroken = (payload) => {
      const r2 = (0, import_child_process.spawnSync)("node", [path.join(broken, "hooks", "fx-codex.js")], { input: JSON.stringify(payload), env, encoding: "utf8" });
      return { code: r2.status, out: r2.stdout.trim(), err: r2.stderr };
    };
    for (const [tool, input] of [["apply_patch", { command: PATCH }], ["Bash", { command: "cat README.md" }]]) {
      const b = runBroken({ ...base, hook_event_name: "PreToolUse", agent_id: "lens-broken", tool_name: tool, tool_input: input });
      assert.strictEqual(b.code, 2, `a subagent's ${tool} is refused when plant-roles did not load`);
      assert.match(b.err, /plant-roles/, "and stderr names the module that failed");
    }
    const ctl = runBroken({ ...base, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "cat README.md" } });
    assert.strictEqual(ctl.code, 0, "the controller (no agent_id) is not affected");
    const ss = runBroken({ ...base, hook_event_name: "SessionStart", source: "startup" });
    assert.strictEqual(ss.code, 0, "the session still starts");
  } finally {
    fs.rmSync(broken, { recursive: true, force: true });
  }
  console.log("plant-roles load failure: passed");
}
for (const [label, stub] of [
  ["patch-paths fails to load", "throw new Error('stubbed patch-paths failure');\n"],
  ["extractPatchPaths throws", "exports.extractPatchPaths = () => { throw new Error('stubbed patch-paths failure'); };\n"]
]) {
  const broken = fs.mkdtempSync(path.join(os.tmpdir(), "fx-codex-broken-"));
  try {
    for (const d of ["hooks", "lib", "codex"]) fs.cpSync(path.join(root, d), path.join(broken, d), { recursive: true });
    fs.copyFileSync(path.join(root, "PREAMBLE.md"), path.join(broken, "PREAMBLE.md"));
    fs.writeFileSync(path.join(broken, "lib", "patch-paths.js"), stub);
    const runBroken = (payload) => {
      const b = (0, import_child_process.spawnSync)("node", [path.join(broken, "hooks", "fx-codex.js")], { input: JSON.stringify(payload), env, encoding: "utf8" });
      return { code: b.status, out: b.stdout.trim(), err: b.stderr };
    };
    const direct = runBroken({ ...base, cwd: home, hook_event_name: "PreToolUse", tool_name: "apply_patch", tool_input: { command: PATCH } });
    assert.strictEqual(direct.code, 2, `${label}: a direct apply_patch into a normal path is denied`);
    assert.match(direct.err, /patch-paths|stubbed patch-paths failure/, `${label}: stderr names the failure`);
    const shell = runBroken({ ...base, cwd: home, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: `apply_patch <<'PATCH'
${PATCH}PATCH` } });
    assert.strictEqual(shell.code, 2, `${label}: a shell apply_patch is denied`);
    assert.match(shell.err, /patch-paths|stubbed patch-paths failure/, `${label}: stderr names the failure`);
    const plain = runBroken({ ...base, cwd: home, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } });
    assert.strictEqual(plain.code, 0, `${label}: an ordinary shell call is not affected`);
    const post = runBroken({ ...base, cwd: home, hook_event_name: "PostToolUse", tool_name: "apply_patch", tool_input: { command: PATCH }, tool_response: "ok" });
    assert.strictEqual(post.code, 0, `${label}: PostToolUse counting fails open`);
  } finally {
    fs.rmSync(broken, { recursive: true, force: true });
  }
}
console.log("patch-paths load failure: passed");
for (const mod of ["preamble.js", "plan-state.js"]) {
  const broken = fs.mkdtempSync(path.join(os.tmpdir(), "fx-codex-broken-"));
  try {
    for (const d of ["hooks", "lib", "codex"]) fs.cpSync(path.join(root, d), path.join(broken, d), { recursive: true });
    fs.copyFileSync(path.join(root, "PREAMBLE.md"), path.join(broken, "PREAMBLE.md"));
    fs.writeFileSync(path.join(broken, "lib", mod), `throw new Error('stubbed ${mod} failure');
`);
    const runBroken = (payload) => {
      const r2 = (0, import_child_process.spawnSync)("node", [path.join(broken, "hooks", "fx-codex.js")], { input: JSON.stringify(payload), env, encoding: "utf8" });
      return { code: r2.status, out: r2.stdout.trim(), err: r2.stderr };
    };
    const sub = runBroken({ ...base, hook_event_name: "SubagentStart", agent_id: "lens-np", agent_type: "fx-lens-security" });
    assert.strictEqual(sub.code, 0, `${mod}: the subagent still starts`);
    const lens = runBroken({ ...base, hook_event_name: "PreToolUse", agent_id: "lens-np", tool_name: "apply_patch", tool_input: { command: PATCH } });
    assert.strictEqual(lens.code, 2, `${mod}: a lens apply_patch is refused when ${mod} did not load`);
    const push = runBroken({ ...base, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git push --force origin main" } });
    assert.strictEqual(push.code, 2, `${mod}: a controller git push --force is refused when ${mod} did not load`);
    const ss = runBroken({ ...base, hook_event_name: "SessionStart", source: "startup" });
    assert.strictEqual(ss.code, 0, `${mod}: the session still starts`);
    assert.match(JSON.parse(ss.out).hookSpecificOutput.additionalContext, /NOT loaded/, `${mod}: and says the rules are missing`);
  } finally {
    fs.rmSync(broken, { recursive: true, force: true });
  }
}
console.log("preamble load failure: passed");
{
  const raw = (input) => {
    const r2 = (0, import_child_process.spawnSync)("node", [hook], { input, env, encoding: "utf8" });
    return { code: r2.status, out: r2.stdout.trim(), err: r2.stderr };
  };
  for (const garbage of ['{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"git push --force"', "not json", "null", "42"]) {
    const g = raw(garbage);
    assert.strictEqual(g.code, 2, `garbage stdin ${JSON.stringify(garbage)} is refused`);
    assert.ok(g.err.trim() !== "", "and says why");
  }
  const empty = raw("");
  assert.strictEqual(empty.code, 0, "empty stdin still starts a session");
  keysOk(empty.out, "empty stdin");
  assert.ok(JSON.parse(empty.out).hookSpecificOutput.additionalContext.includes("$fx:fx-tdd"), "with the preamble");
}
console.log("malformed stdin: passed");
{
  const stopBase = { ...base, session_id: "stop-s", cwd: home };
  r = run({ ...stopBase, hook_event_name: "UserPromptSubmit", prompt: "edit it" });
  r = run({ ...stopBase, hook_event_name: "PostToolUse", tool_name: "apply_patch", tool_input: { command: PATCH.replace("x.txt", "x.ts") }, tool_response: "ok" });
  r = run({ ...stopBase, hook_event_name: "Stop", stop_hook_active: false, last_assistant_message: null });
  assert.strictEqual(r.code, 0, r.err);
  assert.ok(r.out !== "", "an unverified edit blocks the stop");
  const stop = JSON.parse(r.out);
  assert.deepStrictEqual(Object.keys(stop).sort(), ["decision", "reason"]);
  assert.strictEqual(stop.decision, "block");
  r = run({ ...stopBase, hook_event_name: "Stop", stop_hook_active: true, last_assistant_message: null });
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.out, "", "Stop prints nothing when it already fired");
  r = run({ ...stopBase, hook_event_name: "SubagentStop", agent_id: "nobody", agent_type: "default", stop_hook_active: false, last_assistant_message: null });
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.out, "", "SubagentStop with no edits prints nothing");
}
console.log("stop output: passed");
console.log("codex-hook-output: all passed");
