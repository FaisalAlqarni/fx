// generated from src/lib/session-input.test.ts by scripts/build: edit there, not here
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
var import_session_input = require("./session-input.js");
assert.deepStrictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "edit", path: "a.ts" }), { t: 1, kind: "edit", path: "a.ts" });
assert.strictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "edit" }), null, "edit without a path");
assert.strictEqual((0, import_session_input.parseJournalLine)({ t: "x", kind: "prompt", text: null }), null, "non-numeric time");
assert.strictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "nope" }), null, "unknown kind");
assert.strictEqual((0, import_session_input.parseJournalLine)("x"), null);
assert.strictEqual((0, import_session_input.parseJournalLine)(null), null);
assert.deepStrictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "prompt", text: null, agentType: "a" }), { t: 1, kind: "prompt", text: null, agentType: "a" });
assert.strictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "prompt", text: 3 }), null, "prompt text must be string or null");
const tool = { t: 1, kind: "tool", tool: "shell", command: "ls", outcome: "ok", verified: false };
assert.deepStrictEqual((0, import_session_input.parseJournalLine)(tool), tool);
assert.strictEqual((0, import_session_input.parseJournalLine)({ ...tool, tool: "weird" }), null, "unknown tool kind");
assert.strictEqual((0, import_session_input.parseJournalLine)({ ...tool, outcome: "maybe" }), null, "unknown outcome");
assert.strictEqual((0, import_session_input.parseJournalLine)({ ...tool, verified: "yes" }), null, "verified must be boolean");
for (const kind of ["deny", "ask"]) assert.strictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind, command: "x" }), null, kind);
assert.deepStrictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "nudge", signal: "passive-stall" }), { t: 1, kind: "nudge", signal: "passive-stall" });
assert.strictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "nudge", signal: "other" }), null, "unknown signal");
assert.deepStrictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "stop-block" }), { t: 1, kind: "stop-block" });
assert.deepStrictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "fx-json-hooks", hash: "ab" }), { t: 1, kind: "fx-json-hooks", hash: "ab" });
assert.strictEqual((0, import_session_input.parseJournalLine)({ t: 1, kind: "fx-json-hooks", hash: 7 }), null, "an fx-json-hooks event needs its hash");
console.log("session-input.test.js: ok");
