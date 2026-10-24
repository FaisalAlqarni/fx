// generated from src/lib/opencode-input.test.ts by scripts/build: edit there, not here
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
var import_opencode_input = require("./opencode-input.js");
const ok = (0, import_opencode_input.parseOpencodeToolEvent)({ tool: "bash", args: { command: "ls" } });
assert.ok(ok.ok, "a tool event parses");
assert.strictEqual(ok.value.tool, "bash");
assert.deepStrictEqual(ok.value.args, { command: "ls" });
for (const raw of [42, "x", null, void 0]) {
  assert.deepStrictEqual((0, import_opencode_input.parseOpencodeToolEvent)(raw), { ok: false, reason: "opencode event is not an object" }, JSON.stringify(raw));
}
const noArgs = (0, import_opencode_input.parseOpencodeToolEvent)({ tool: "edit", args: null });
assert.ok(noArgs.ok);
assert.deepStrictEqual(noArgs.value.args, {});
const numTool = (0, import_opencode_input.parseOpencodeToolEvent)({ tool: 7 });
assert.ok(numTool.ok);
assert.strictEqual(numTool.value.tool, void 0);
const v2 = (0, import_opencode_input.parseOpencodeToolEvent)({ tool: "shell", sessionID: "s", messageID: "m", id: "i", input: { command: "ls" } });
assert.ok(v2.ok);
assert.deepStrictEqual([v2.value.sessionID, v2.value.messageID, v2.value.id], ["s", "m", "i"]);
assert.deepStrictEqual(v2.value.input, { command: "ls" });
const v1 = (0, import_opencode_input.parseOpencodeV1Call)({ tool: "bash" }, { args: { command: "ls" } });
assert.ok(v1.ok);
assert.strictEqual(v1.value.tool, "bash");
assert.deepStrictEqual(v1.value.args, { command: "ls" });
const v1None = (0, import_opencode_input.parseOpencodeV1Call)(void 0, void 0);
assert.ok(v1None.ok, "missing input and output are an empty call, as before");
assert.strictEqual(v1None.value.tool, void 0);
assert.deepStrictEqual(v1None.value.args, {});
const v1Session = (0, import_opencode_input.parseOpencodeV1Call)({ tool: "bash", sessionID: "s1" }, void 0);
assert.ok(v1Session.ok);
assert.strictEqual(v1Session.value.sessionID, "s1");
const v1BadSession = (0, import_opencode_input.parseOpencodeV1Call)({ sessionID: 7 }, void 0);
assert.ok(v1BadSession.ok);
assert.strictEqual(v1BadSession.value.sessionID, void 0, "a non-string id is no id");
const r1 = (0, import_opencode_input.parseOpencodeV1Result)({ tool: "bash", sessionID: "s", args: { command: "ls" } }, { output: "hi", metadata: { exit: 0 } });
assert.deepStrictEqual(r1, { tool: "bash", sessionID: "s", args: { command: "ls" }, outcome: "ok", output: "hi" });
assert.strictEqual((0, import_opencode_input.parseOpencodeV1Result)({}, { metadata: { exit: 2 } }).outcome, "fail", "a non-zero exit fails");
assert.strictEqual((0, import_opencode_input.parseOpencodeV1Result)({}, { metadata: { exit: null } }).outcome, "unknown", "a null exit is unknown");
assert.strictEqual((0, import_opencode_input.parseOpencodeV1Result)({}, { metadata: { exit: null } }).interrupted, true, "a null exit is a killed process");
assert.strictEqual((0, import_opencode_input.parseOpencodeV1Result)({}, { metadata: {} }).interrupted, void 0, "no exit is not an interruption");
assert.strictEqual((0, import_opencode_input.parseOpencodeAgent)({ agent: "build" }), "build");
assert.strictEqual((0, import_opencode_input.parseOpencodeAgent)({ agent: 3 }), void 0);
assert.strictEqual((0, import_opencode_input.parseOpencodeV1Result)({}, { output: "x" }).outcome, "unknown", "no exit is unknown");
assert.deepStrictEqual((0, import_opencode_input.parseOpencodeV1Result)(void 0, void 0), { tool: void 0, sessionID: void 0, args: {}, outcome: "unknown", output: "" });
const base2 = { tool: "shell", sessionID: "s", input: { command: "ls" } };
assert.strictEqual((0, import_opencode_input.parseOpencodeV2Result)({ ...base2, status: "error" }).outcome, "fail");
assert.strictEqual((0, import_opencode_input.parseOpencodeV2Result)({ ...base2, status: "completed", metadata: { exit: 0 }, output: "ok" }).outcome, "ok");
assert.strictEqual((0, import_opencode_input.parseOpencodeV2Result)({ ...base2, status: "completed", metadata: { exit: 1 } }).outcome, "fail");
assert.strictEqual((0, import_opencode_input.parseOpencodeV2Result)({ ...base2, status: "completed" }).outcome, "unknown");
assert.deepStrictEqual((0, import_opencode_input.parseOpencodeV2Result)({ ...base2, status: "completed", output: "hi" }), { tool: "shell", sessionID: "s", args: { command: "ls" }, outcome: "unknown", output: "hi" });
assert.strictEqual((0, import_opencode_input.parseOpencodeV2Result)(null).sessionID, void 0);
console.log("opencode-input tests passed");
