// generated from src/tests/gates/dispatch-route.test.ts by scripts/build: edit there, not here
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
var import_dispatch_route = require("../../lib/dispatch-route.js");
const scratch = (0, import_hook_env.scratchHookEnv)();
process.on("exit", scratch.cleanup);
const root = path.join(__dirname, "..", "..");
const hook = path.join(root, "hooks", "fx-pretooluse.js");
assert.deepStrictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "general-purpose", description: "d", prompt: "p" }),
  { subagent_type: "general-purpose", description: "d", prompt: "p", model: "sonnet" },
  "a general dispatch with no model gets the standard tier"
);
assert.strictEqual((0, import_dispatch_route.route)({ prompt: "p" })?.model, "sonnet", "no type is a general dispatch on current Claude Code");
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "", prompt: "p" })?.model, "sonnet", "an empty type is a general dispatch");
assert.strictEqual((0, import_dispatch_route.route)({ model: "opus", prompt: "p" })?.model, "sonnet", "no type with opus and no reason runs on the standard tier");
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "fork", prompt: "p" }), null, "a fork inherits the parent model: left alone");
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "fork", model: "opus", prompt: "p" }), null, "a fork is left alone even with a model");
for (const m of ["fable", "claude-opus-4-1", "claude-fable-5"]) {
  assert.strictEqual(
    (0, import_dispatch_route.route)({ subagent_type: "general-purpose", model: m, prompt: "p" })?.model,
    "sonnet",
    `${m} without a reason runs on the standard tier`
  );
  assert.strictEqual(
    (0, import_dispatch_route.route)({ subagent_type: "general-purpose", model: m, prompt: "Capable because: x" }),
    null,
    `${m} with a reason stands`
  );
}
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "claude", prompt: "p" })?.model, "sonnet", "claude is general");
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "Plan", prompt: "p" })?.model, "sonnet", "Plan is general");
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "general-purpose", model: "haiku", prompt: "p" }), null, "a chosen tier stands");
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "general-purpose", model: "sonnet", prompt: "p" }), null, "sonnet stands");
assert.strictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "general-purpose", model: "opus", prompt: "do it" })?.model,
  "sonnet",
  "opus without a reason runs on the standard tier"
);
assert.strictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "general-purpose", model: "opus", prompt: "Capable because: fix round 4\ndo it" }),
  null,
  "opus with a reason stands"
);
assert.strictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "general-purpose", model: "opus", prompt: "task text\n  Capable because: final branch review\n" }),
  null,
  "the reason line may sit on any line"
);
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "fx:fx-lens-security", prompt: "p" }), null, "a typed agent keeps its own pin");
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "Explore", prompt: "p" }), null, "Explore keeps its own default");
assert.strictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "fx:fx-lens-security", model: "opus", prompt: "p" })?.model,
  "sonnet",
  "an fx agent asked for opus with no reason runs on the standard tier"
);
assert.strictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "fx:fx-lens-security", model: "opus", prompt: "Capable because: auth rewrite\np" }),
  null,
  "an fx agent with a reason keeps opus"
);
assert.strictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "fx:fx-lens-security", prompt: "p" }),
  null,
  "an fx agent with no model keeps its frontmatter pin"
);
assert.strictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "fx:fx-lens-database", model: "haiku", prompt: "p" }),
  null,
  "a cheap tier for an fx agent stands"
);
assert.strictEqual(
  (0, import_dispatch_route.route)({ subagent_type: "other-plugin:agent", model: "opus", prompt: "p" })?.model,
  "sonnet",
  "an explicit opus on another type still needs a reason"
);
assert.strictEqual((0, import_dispatch_route.route)({ subagent_type: "other-plugin:agent", prompt: "p" }), null, "another typed agent keeps its own pin");
assert.strictEqual((0, import_dispatch_route.route)(null), null, "no input, no change");
assert.strictEqual((0, import_dispatch_route.route)("nonsense"), null, "a non-object input is left alone");
function run(payload) {
  const r2 = (0, import_child_process.spawnSync)("node", [hook], { input: JSON.stringify(payload), encoding: "utf8", env: scratch.env });
  return { code: r2.status, out: r2.stdout.trim(), err: r2.stderr };
}
const base = { session_id: "s", cwd: root, hook_event_name: "PreToolUse" };
let r = run({ ...base, tool_name: "Agent", tool_input: { subagent_type: "general-purpose", description: "d", prompt: "p" } });
assert.strictEqual(r.code, 0, `the hook never refuses: ${r.err}`);
const out = JSON.parse(r.out).hookSpecificOutput;
assert.strictEqual(out.hookEventName, "PreToolUse");
assert.strictEqual(out.permissionDecision, void 0, "the normal permission flow still applies");
assert.deepStrictEqual(
  out.updatedInput,
  { subagent_type: "general-purpose", description: "d", prompt: "p", model: "sonnet" }
);
r = run({ ...base, tool_name: "Agent", tool_input: { subagent_type: "general-purpose", model: "sonnet", prompt: "p" } });
assert.strictEqual(r.code, 0);
assert.strictEqual(r.out, "", "a routed call passes with no output");
r = run({ ...base, tool_name: "Task", tool_input: { subagent_type: "general-purpose", prompt: "p" } });
assert.strictEqual(JSON.parse(r.out).hookSpecificOutput.updatedInput.model, "sonnet", "the older tool name is routed too");
r = run({ ...base, tool_name: "Agent", tool_input: { subagent_type: "general-purpose", model: "opus", prompt: "p" } });
assert.strictEqual(JSON.parse(r.out).hookSpecificOutput.updatedInput.model, "sonnet", "the hook applies the opus rule");
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fx-route-broken-"));
  fs.cpSync(path.join(root, "hooks"), path.join(tmp, "hooks"), { recursive: true });
  fs.cpSync(path.join(root, "lib"), path.join(tmp, "lib"), { recursive: true });
  const call = { ...base, tool_name: "Agent", tool_input: { subagent_type: "general-purpose", prompt: "p" } };
  const runCopy = () => (0, import_child_process.spawnSync)(
    "node",
    [path.join(tmp, "hooks", "fx-pretooluse.js")],
    { input: JSON.stringify(call), encoding: "utf8", env: scratch.env }
  );
  fs.writeFileSync(path.join(tmp, "lib", "dispatch-route.js"), "module.exports = { route() { throw new Error('boom'); } };\n");
  let b = runCopy();
  assert.strictEqual(b.status, 0, `a throwing route never refuses: ${b.stderr}`);
  let j = JSON.parse(b.stdout);
  assert.match(j.systemMessage, /^\[fx\] dispatch routing off: boom/, "a throwing route tells the user");
  assert.strictEqual(j.hookSpecificOutput, void 0, "a throwing route leaves the call unchanged");
  assert.match(b.stderr, /dispatch routing off: boom/, "a throwing route leaves a trace on stderr");
  fs.writeFileSync(path.join(tmp, "lib", "dispatch-route.js"), "throw new Error('load');\n");
  b = runCopy();
  assert.strictEqual(b.status, 0, `a module that fails to load never refuses: ${b.stderr}`);
  j = JSON.parse(b.stdout);
  assert.match(j.systemMessage, /^\[fx\] dispatch routing off: load/, "a module that fails to load tells the user");
  assert.strictEqual(j.hookSpecificOutput, void 0, "a module that fails to load leaves the call unchanged");
  assert.match(b.stderr, /dispatch routing off: load/, "a module that fails to load leaves a trace on stderr");
  fs.writeFileSync(path.join(tmp, "lib", "dispatch-route.js"), "module.exports = { route() { throw 'plain string'; } };\n");
  b = runCopy();
  assert.strictEqual(b.status, 0, `a non-Error throw never refuses: ${b.stderr}`);
  assert.match(JSON.parse(b.stdout).systemMessage, /routing off: plain string/, "a non-Error throw is reported");
  fs.rmSync(tmp, { recursive: true, force: true });
}
{
  const big = "x".repeat(300 * 1024);
  const r2 = (0, import_child_process.spawnSync)("node", [hook], {
    input: JSON.stringify({ ...base, tool_name: "Agent", tool_input: { subagent_type: "general-purpose", prompt: big } }),
    encoding: "utf8",
    env: scratch.env,
    maxBuffer: 10 * 1024 * 1024
  });
  assert.strictEqual(r2.status, 0);
  assert.strictEqual(JSON.parse(r2.stdout).hookSpecificOutput.updatedInput.prompt, big, "a 300 KB prompt arrives intact");
}
console.log("dispatch-route.test.js: OK");
