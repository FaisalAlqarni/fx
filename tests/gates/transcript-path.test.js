// generated from src/tests/gates/transcript-path.test.ts by scripts/build: edit there, not here
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
const scratch = (0, import_hook_env.scratchHookEnv)();
process.on("exit", scratch.cleanup);
const hook = path.join(__dirname, "..", "..", "hooks", "fx-context.js");
const run = (cwd, event) => (0, import_child_process.spawnSync)(process.execPath, [hook], { input: JSON.stringify({ cwd, ...event }), encoding: "utf8", env: scratch.env });
const file = (cwd) => path.join(cwd, ".fx", "transcript-path");
const a = fs.mkdtempSync(path.join(os.tmpdir(), "fx-tp-"));
const r = run(a, { hook_event_name: "SessionStart", transcript_path: "/x/s1.jsonl" });
assert.strictEqual(r.status, 0, r.stderr);
assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.length > 0, "the preamble is still emitted");
assert.strictEqual(fs.readFileSync(file(a), "utf8"), "/x/s1.jsonl\n");
const b = fs.mkdtempSync(path.join(os.tmpdir(), "fx-tp-"));
const s = run(b, { hook_event_name: "SubagentStart", transcript_path: "/x/sub.jsonl" });
assert.strictEqual(s.status, 0, s.stderr);
assert.ok(!fs.existsSync(file(b)), "a subagent start records nothing");
const c = fs.mkdtempSync(path.join(os.tmpdir(), "fx-tp-"));
assert.strictEqual((0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: c }).status, 0, "git init");
const g = run(c, { hook_event_name: "SessionStart", transcript_path: "/x/s2.jsonl" });
assert.strictEqual(g.status, 0, g.stderr);
assert.ok(JSON.parse(g.stdout).hookSpecificOutput.additionalContext.length > 0, "the preamble is still emitted");
assert.ok(!fs.existsSync(file(c)), "a git work tree without an ignore rule for .fx gets no file");
const d = fs.mkdtempSync(path.join(os.tmpdir(), "fx-tp-"));
(0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: d });
fs.writeFileSync(path.join(d, ".gitignore"), ".fx/\n");
run(d, { hook_event_name: "SessionStart", transcript_path: "/x/s3.jsonl" });
assert.strictEqual(fs.readFileSync(file(d), "utf8"), "/x/s3.jsonl\n");
const stale = (cwd) => {
  fs.mkdirSync(path.join(cwd, ".fx"));
  fs.writeFileSync(file(cwd), "/old/session.jsonl\n");
};
const e = fs.mkdtempSync(path.join(os.tmpdir(), "fx-tp-"));
stale(e);
const n = run(e, { hook_event_name: "SessionStart" });
assert.strictEqual(n.status, 0, n.stderr);
assert.ok(!fs.existsSync(file(e)), "a session with no transcript_path clears the stale file");
const f = fs.mkdtempSync(path.join(os.tmpdir(), "fx-tp-"));
stale(f);
const noGit = (0, import_child_process.spawnSync)(process.execPath, [hook], { input: JSON.stringify({ cwd: f, hook_event_name: "SessionStart", transcript_path: "/x/s4.jsonl" }), encoding: "utf8", env: { ...scratch.env, PATH: "/nonexistent" } });
assert.strictEqual(noGit.status, 0, noGit.stderr);
assert.ok(!fs.existsSync(file(f)), "a git failure clears the stale file instead of leaving it");
assert.ok(JSON.parse(noGit.stdout).hookSpecificOutput.additionalContext.length > 0, "the preamble is still emitted");
const h = fs.mkdtempSync(path.join(os.tmpdir(), "fx-tp-"));
(0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: h });
run(h, { hook_event_name: "SessionStart", transcript_path: "/x/s5.jsonl" });
assert.ok(!fs.existsSync(path.join(h, ".fx")), "clearing never creates .fx/");
console.log("transcript-path: OK");
