// generated from src/lib/decision-log.test.ts by scripts/build: edit there, not here
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
var import_decision_log = require("./decision-log.js");
var import_json = require("./json.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-decision-log-"));
process.on("exit", () => fs.rmSync(root, { recursive: true, force: true }));
const state = path.join(root, "state", "fx");
const file = path.join(state, "decisions.jsonl");
const lines = (f) => fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => (0, import_json.parseJson)(l));
const entry = {
  ts: "2026-10-22T00:00:00.000Z",
  harness: "claude-code",
  event: "guard",
  session: "s1",
  cwd: "/w",
  text: "export TOKEN=abc && ls",
  source: "grey",
  action: "allow"
};
(0, import_decision_log.logDecision)(entry, state);
assert.deepStrictEqual(lines(file), [{ ...entry, text: "export TOKEN=[REDACTED] && ls" }]);
if (process.platform !== "win32") assert.strictEqual(fs.statSync(file).mode & 511, 384);
(0, import_decision_log.logDecision)(entry, state);
assert.strictEqual(lines(file).length, 2);
fs.writeFileSync(path.join(state, "decisions.1.jsonl"), "old\n");
fs.writeFileSync(file, "x".repeat(5242881));
(0, import_decision_log.logDecision)(entry, state);
assert.strictEqual(fs.statSync(path.join(state, "decisions.1.jsonl")).size, 5242881);
assert.strictEqual(lines(file).length, 1);
const lock = path.join(state, "decisions.rotate.lock");
fs.writeFileSync(path.join(state, "decisions.1.jsonl"), "old\n");
fs.writeFileSync(file, "x".repeat(5242881));
fs.writeFileSync(lock, "");
(0, import_decision_log.logDecision)(entry, state);
assert.strictEqual(fs.readFileSync(path.join(state, "decisions.1.jsonl"), "utf8"), "old\n");
assert.strictEqual(fs.statSync(file).size > 5242881, true, "appended to the current log");
assert.ok(fs.existsSync(lock), "another hook's lock is not taken");
fs.utimesSync(lock, new Date(Date.now() - 11e3), new Date(Date.now() - 11e3));
(0, import_decision_log.logDecision)(entry, state);
assert.ok(fs.statSync(path.join(state, "decisions.1.jsonl")).size > 5242881);
assert.strictEqual(lines(file).length, 1);
assert.ok(!fs.existsSync(lock), "the lock is released");
const loose = path.join(root, "loose");
(0, import_decision_log.logDecision)({ ...entry, session: "TOKEN=s1", cwd: "/w/TOKEN=c", source: "TOKEN=src", action: "TOKEN=a", unavailable: "TOKEN=u" }, loose);
const [line] = lines(path.join(loose, "decisions.jsonl"));
assert.deepStrictEqual(line, {
  ...entry,
  text: "export TOKEN=[REDACTED] && ls",
  session: "TOKEN=[REDACTED]",
  cwd: "/w/TOKEN=[REDACTED]",
  source: "TOKEN=[REDACTED]",
  action: "TOKEN=[REDACTED]",
  unavailable: "TOKEN=[REDACTED]"
});
const longCwd = "/home/faisal/development/projects/backend/src/main";
(0, import_decision_log.logDecision)({ ...entry, cwd: longCwd }, loose);
assert.strictEqual(lines(path.join(loose, "decisions.jsonl"))[1].cwd, longCwd);
if (process.platform !== "win32") {
  fs.chmodSync(loose, 493);
  fs.chmodSync(path.join(loose, "decisions.jsonl"), 420);
  (0, import_decision_log.logDecision)(entry, loose);
  assert.strictEqual(fs.statSync(loose).mode & 511, 448);
  assert.strictEqual(fs.statSync(path.join(loose, "decisions.jsonl")).mode & 511, 384);
}
const blocked = path.join(root, "blocked");
fs.writeFileSync(blocked, "");
const written = [];
const write = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk) => {
  written.push(String(chunk));
  return true;
};
try {
  (0, import_decision_log.logDecision)(entry, blocked);
} finally {
  process.stderr.write = write;
}
assert.strictEqual(written.length, 1, written.join(""));
assert.ok(written[0]?.startsWith("[fx] decision log:"), written[0]);
assert.ok(written[0]?.endsWith("\n"));
