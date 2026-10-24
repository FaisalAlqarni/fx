// generated from src/lib/loop-tracker.test.ts by scripts/build: edit there, not here
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
var import_journal = require("./journal.js");
var import_loop_tracker = require("./loop-tracker.js");
let t = 0;
const tool = (kind, command = null, outcome = "ok", verified = false) => ({ t: ++t, kind: "tool", tool: kind, command, outcome, verified });
const fail = (c = "npm test") => tool("shell", c, "fail");
const edit = (p = "a.ts") => ({ t: ++t, kind: "edit", path: p });
const nudge = (signal) => ({ t: ++t, kind: "nudge", signal });
const times = (n, f) => Array.from({ length: n }, f);
assert.strictEqual((0, import_loop_tracker.checkSignals)([fail(), fail(), fail()]), "repeat-failure");
assert.strictEqual((0, import_loop_tracker.checkSignals)([fail(), fail()]), null);
assert.strictEqual((0, import_loop_tracker.checkSignals)([fail(), edit(), fail(), fail()]), null, "an edit between: the fx-tdd loop");
assert.strictEqual((0, import_loop_tracker.checkSignals)([fail(), fail(), edit(), fail()]), null, "an edit splits the run");
assert.strictEqual((0, import_loop_tracker.checkSignals)([fail("a"), fail("b"), fail("a"), fail("b"), fail("a")]), "repeat-failure", "three of the same command, others between");
assert.strictEqual((0, import_loop_tracker.checkSignals)([fail("a"), fail("b"), fail("c")]), null, "three different commands");
assert.strictEqual((0, import_loop_tracker.checkSignals)([fail(), fail(), fail(), nudge("repeat-failure")]), null, "once per turn");
assert.strictEqual((0, import_loop_tracker.checkSignals)([tool("shell", null, "fail"), tool("shell", null, "fail"), tool("shell", null, "fail")]), null, "no command, no repeat");
assert.strictEqual((0, import_loop_tracker.checkSignals)(times(3, () => tool("shell", "npm test", "unknown"))), null, "unknown is never a failure");
assert.strictEqual((0, import_loop_tracker.checkSignals)(times(12, () => tool("read"))), "passive-stall");
assert.strictEqual((0, import_loop_tracker.checkSignals)(times(11, () => tool("read"))), null);
assert.strictEqual((0, import_loop_tracker.checkSignals)([...times(6, () => tool("read")), tool("shell", "npm test"), ...times(6, () => tool("read"))]), null, "a non-read breaks the run");
assert.strictEqual((0, import_loop_tracker.checkSignals)(times(12, () => tool("read")), ["passive-stall"]), null, "skipped for a subagent");
assert.strictEqual((0, import_loop_tracker.checkSignals)([...times(12, () => tool("read")), nudge("passive-stall")]), null);
assert.strictEqual((0, import_loop_tracker.checkSignals)([tool("shell", "make test", "ok", true), ...times(10, () => edit())]), "unverified-writes");
assert.strictEqual((0, import_loop_tracker.checkSignals)([tool("shell", "make test", "ok", true), ...times(9, () => edit())]), null);
assert.strictEqual((0, import_loop_tracker.checkSignals)([...times(9, () => edit()), tool("shell", "make test", "ok", true), ...times(9, () => edit())]), null, "a passing check resets the count");
assert.strictEqual((0, import_loop_tracker.checkSignals)(times(10, () => edit())), "unverified-writes", "counted from the turn start");
assert.strictEqual((0, import_loop_tracker.checkSignals)([...times(10, () => edit()), nudge("unverified-writes")]), null);
assert.strictEqual((0, import_loop_tracker.checkSignals)([...times(10, () => edit()), fail(), fail(), fail()]), "repeat-failure");
assert.strictEqual((0, import_loop_tracker.checkSignals)([...times(10, () => edit()), fail(), fail(), fail(), nudge("repeat-failure")]), "unverified-writes");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-loop-tracker-"));
process.env.XDG_STATE_HOME = path.join(root, "state");
process.env.HOME = path.join(root, "home");
process.env.APPDATA = path.join(root, "appdata");
process.env.LOCALAPPDATA = path.join(root, "localappdata");
const cwd = path.join(root, "cwd");
fs.mkdirSync(cwd, { recursive: true });
const long = `make ${"target ".repeat(20)}`.trim();
const base = { harness: "claude-code", sessionId: "s1", agentId: null, cwd, toolName: "Bash", toolInput: { command: "npm test" }, command: "npm test", outcome: "fail", output: "" };
try {
  assert.strictEqual((0, import_loop_tracker.recordToolResult)({ ...base, sessionId: null }), null, "no session id, no record");
  assert.strictEqual((0, import_loop_tracker.recordToolResult)(base), null);
  assert.strictEqual((0, import_loop_tracker.recordToolResult)(base), null);
  assert.strictEqual((0, import_loop_tracker.recordToolResult)(base), "[fx] `npm test` has failed 3 times this turn. Stop retrying and invoke fx:fx-debug to find the cause.");
  assert.strictEqual((0, import_loop_tracker.recordToolResult)(base), null, "once per turn");
  const codex = (0, import_loop_tracker.recordToolResult)({ ...base, harness: "codex", sessionId: "s2" });
  assert.strictEqual(codex, null);
  (0, import_loop_tracker.recordToolResult)({ ...base, harness: "codex", sessionId: "s2" });
  assert.match((0, import_loop_tracker.recordToolResult)({ ...base, harness: "codex", sessionId: "s2" }) ?? "", /invoke \$fx:fx-debug to find/);
  (0, import_loop_tracker.recordToolResult)({ ...base, sessionId: "s3", command: long });
  (0, import_loop_tracker.recordToolResult)({ ...base, sessionId: "s3", command: long });
  const cut = (0, import_loop_tracker.recordToolResult)({ ...base, sessionId: "s3", command: long });
  assert.ok(cut?.includes(`\`${long.slice(0, 80)}\``) && !cut.includes(long.slice(0, 81)), "the command is cut to 80 characters");
  const files = fs.readdirSync(path.join(root, "state", "fx", "sessions"));
  assert.ok(files.includes("s1.jsonl"));
  const failedEdit = { ...base, sessionId: "s4", toolName: "Edit", toolInput: { file_path: path.join(cwd, "a.ts") }, command: null };
  assert.strictEqual((0, import_loop_tracker.recordToolResult)(failedEdit), null);
  assert.deepStrictEqual((0, import_journal.readJournal)("s4").map((e) => e.kind), ["tool"], "a failed Edit writes no edit event");
  (0, import_loop_tracker.recordToolResult)({ ...failedEdit, outcome: "ok" });
  assert.deepStrictEqual((0, import_journal.readJournal)("s4").map((e) => e.kind), ["tool", "tool", "edit"], "a successful one does");
  (0, import_loop_tracker.recordToolResult)({ ...failedEdit, outcome: "unknown" });
  assert.deepStrictEqual((0, import_journal.readJournal)("s4").map((e) => e.kind), ["tool", "tool", "edit", "tool", "edit"], "an unknown outcome still counts as an edit");
  const npm = { ...base, sessionId: "s5" };
  (0, import_loop_tracker.recordToolResult)(npm);
  (0, import_loop_tracker.recordToolResult)({ ...failedEdit, sessionId: "s5" });
  (0, import_loop_tracker.recordToolResult)(npm);
  (0, import_loop_tracker.recordToolResult)({ ...failedEdit, sessionId: "s5" });
  assert.match((0, import_loop_tracker.recordToolResult)(npm) ?? "", /has failed 3 times/);
  (0, import_loop_tracker.recordToolResult)({ ...base, sessionId: "s9", command: "make test", outcome: "unknown", output: "Tests: 3 passed", interrupted: true });
  (0, import_loop_tracker.recordToolResult)({ ...base, sessionId: "s9", command: "make test", outcome: "unknown", output: "Tests: 3 passed" });
  assert.deepStrictEqual((0, import_journal.readJournal)("s9").map((e) => e.kind === "tool" && e.verified), [false, true], "an interrupted call never verifies");
  const patch = "apply_patch <<'PATCH'\n*** Begin Patch\n*** Update File: s.js\n*** End Patch\nPATCH";
  (0, import_loop_tracker.recordToolResult)({ ...base, harness: "codex", sessionId: "s6", toolName: "Bash", toolInput: { command: patch }, command: patch, outcome: "ok" });
  assert.deepStrictEqual((0, import_journal.readJournal)("s6").map((e) => e.kind), ["tool", "edit"]);
  (0, import_loop_tracker.recordToolResult)({ ...base, harness: "codex", sessionId: "s7", toolName: "Bash", toolInput: { command: patch }, command: patch, outcome: "fail" });
  assert.deepStrictEqual((0, import_journal.readJournal)("s7").map((e) => e.kind), ["tool"], "a failed shell apply_patch is no edit");
  const NODE_NUDGE = "[fx] `node --test` has failed 3 times this turn. Stop retrying and invoke fx:fx-debug to find the cause.";
  const run = (sessionId, command, outcome = "fail") => (0, import_loop_tracker.recordToolResult)({ ...base, sessionId, toolInput: { command }, command, outcome });
  assert.strictEqual(run("L1", "for i in 1 2 3; do node --test; done"), NODE_NUDGE, "three failures in one loop");
  assert.strictEqual(run("L1", "for i in 1 2 3; do node --test; done"), null, "once per turn");
  assert.strictEqual(run("L2", "for i in 1 2; do node --test; done"), null);
  assert.strictEqual(run("L2", "node --test"), NODE_NUDGE, "a loop plus a later run");
  assert.strictEqual(run("L3", "for i in $(seq 5); do\n  node --test\ndone"), NODE_NUDGE, "seq, over lines");
  assert.strictEqual(run("L4", "while true; do node --test; done"), NODE_NUDGE, "a while loop");
  run("L5", "for i in 1 2 3; do node --test; done", "ok");
  run("L5", "node --test");
  assert.strictEqual(run("L5", "node --test"), null, "a successful loop records no failure");
  assert.strictEqual(run("L6", "for f in *.js; do node $f; done"), null, "a loop over files is not one check");
  assert.strictEqual(run("L7", "for i in 1 2 3; do npm run build; node --test; done"), null, "a body of two commands");
  assert.strictEqual(run("L8", "until npm test; do sleep 1; done"), "[fx] `npm test` has failed 3 times this turn. Stop retrying and invoke fx:fx-debug to find the cause.", "until credits its condition");
  assert.strictEqual(run("L9", "while make; do node --test; done"), null, "a while loop on a command is not counted");
  run("L9", "node --test");
  assert.strictEqual(run("L9", "node --test"), null, "nor credited to its body");
  assert.strictEqual(run("L10", "for ((i=0; i<1; i++)); do node --test; done"), null, "a C-style loop that ran once");
  run("L10", "node --test");
  assert.strictEqual(run("L10", "node --test"), NODE_NUDGE, "counts once");
  assert.strictEqual(run("L11", "for ((i=0; i<3; i++)); do node --test; done"), NODE_NUDGE, "a C-style loop of three");
  assert.strictEqual(run("L12", "for f in *.js; do node --test; done"), null, "a glob loop is charged once, not the threshold");
  const stateDir = path.join(root, "state", "fx");
  fs.rmSync(path.join(stateDir, "sessions"), { recursive: true, force: true });
  fs.writeFileSync(path.join(stateDir, "sessions"), "not a directory");
  const logFile = path.join(stateDir, "decisions.jsonl");
  const logged = () => fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8") : "";
  assert.ok(!logged().includes("tracker-error"));
  assert.strictEqual((0, import_loop_tracker.recordToolResult)({ ...base, sessionId: "s8" }), null);
  assert.match(logged(), /"source":"tracker-error"/, "a failed journal write is logged");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log("loop-tracker.test.js: ok");
