// generated from src/lib/stop-check.test.ts by scripts/build: edit there, not here
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
var import_fx_paths = require("./fx-paths.js");
var import_journal = require("./journal.js");
var import_fx_json_watch = require("./fx-json-watch.js");
var import_stop_check = require("./stop-check.js");
let t = 0;
const edit = (p) => ({ t: ++t, kind: "edit", path: p });
const check = (verified) => ({ t: ++t, kind: "tool", tool: "shell", command: "make test", outcome: verified ? "ok" : "fail", verified });
const prompt = () => ({ t: ++t, kind: "prompt", text: "go" });
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit("a.ts")]), true);
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit("a.ts"), check(true)]), false);
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit("a.ts"), check(true), edit("b.ts")]), true, "an edit after the check");
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit("a.ts"), check(false)]), true, "a check that did not verify");
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit("docs/x.md")]), false, "documentation only");
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit("docs/x.md"), edit("a.ts")]), true);
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit("a.ts"), edit("docs/x.md")]), true, "a doc edit after a code edit leaves the code edit unverified");
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit("a.ts"), check(true), edit("notes.TXT")]), false, "a later doc edit does not undo the check");
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([]), false);
const repo = path.resolve("/w/repo");
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit(path.resolve("/tmp/scratch.ts"))], repo), false, "a scratch file outside the repository");
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit(path.resolve("/w/repo-other/a.ts"))], repo), false, "a sibling whose name starts with the root");
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit(path.join(repo, "src", "a.ts"))], repo), true);
assert.strictEqual((0, import_stop_check.turnNeedsEvidence)([edit(path.join(repo, "a.ts")), edit(path.resolve("/tmp/scratch.ts"))], repo), true, "a later outside edit leaves the inside one unverified");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-stop-check-"));
process.env.XDG_STATE_HOME = path.join(root, "state");
process.env.XDG_CONFIG_HOME = path.join(root, "config");
process.env.HOME = path.join(root, "home");
process.env.APPDATA = path.join(root, "appdata");
process.env.LOCALAPPDATA = path.join(root, "localappdata");
const cwd = path.join(root, "cwd");
fs.mkdirSync(cwd, { recursive: true });
fs.writeFileSync(path.join(cwd, ".fx.json"), '{"test_all":"make test"}');
const bare = path.join(root, "bare");
fs.mkdirSync(bare);
const BLOCK = "[fx] This turn edited files and no check has passed since the last edit. Run `make test` and report the result before you finish. If you cannot run it, say so plainly.";
const REMIND = "[fx] The previous turn edited files and no check passed after the last edit. Run `make test` before you report that work as done.";
const input = (over = {}) => ({
  harness: "claude-code",
  sessionId: "s1",
  agentId: null,
  cwd,
  stopHookActive: false,
  mode: "block",
  ...over
});
const seed = (session, ...events) => {
  const key = (0, import_journal.journalKey)(session);
  assert.ok(key !== null);
  for (const e of [prompt(), ...events]) (0, import_journal.appendEvent)(key, e);
};
async function main() {
  try {
    seed("s1", edit("a.ts"));
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: null })), { text: null, notice: null }, "no session id");
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ stopHookActive: true })), { text: null, notice: null }, "the harness says the hook already fired");
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ cwd: bare, sessionId: "unseeded" })), { text: null, notice: null }, "no journal");
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input()), { text: BLOCK, notice: null });
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input()), { text: null, notice: null }, "the journal holds a stop-block: once per turn");
    assert.ok((0, import_journal.readJournal)("s1").some((e) => e.kind === "stop-block"));
    seed("s1", edit("b.ts"));
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input()), { text: BLOCK, notice: null }, "a new prompt starts a new turn");
    seed("s2", edit("a.ts"));
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "s2", mode: "reminder" })), { text: REMIND, notice: null });
    seed("s3", edit("a.ts"));
    assert.strictEqual((await (0, import_stop_check.decideStop)(input({ sessionId: "s3", cwd: bare }))).text?.includes("Run the project's tests and report"), true, "no .fx.json: the project tests, no backticks");
    const gitCwd = path.join(root, "git");
    fs.mkdirSync(path.join(gitCwd, "sub"), { recursive: true });
    (0, import_child_process.spawnSync)("git", ["init", "-q", gitCwd]);
    fs.writeFileSync(path.join(gitCwd, ".fx.json"), '{"test_all":"make test"}');
    seed("g1", edit(path.join(root, "scratch.ts")));
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "g1", cwd: path.join(gitCwd, "sub") })), { text: null, notice: null }, "an edit outside the repository");
    seed("g2", edit(path.join(gitCwd, "a.ts")));
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "g2", cwd: path.join(gitCwd, "sub") })), { text: BLOCK, notice: null }, "an edit elsewhere in the repository");
    const sub = (0, import_journal.journalKey)("s4", "a1");
    assert.ok(sub !== null);
    (0, import_journal.appendEvent)(sub, prompt());
    (0, import_journal.appendEvent)(sub, edit("a.ts"));
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "s4" })), { text: null, notice: null }, "the root has no edits");
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "s4", agentId: "a1" })), { text: BLOCK, notice: null }, "the subagent does");
    for (const name of ["w1"]) {
      seed(name, edit("a.ts"));
      const file = path.join((0, import_fx_paths.machinePaths)().stateDir, "sessions", `${name}.jsonl`);
      fs.chmodSync(file, 292);
      assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: name })), { text: null, notice: null }, `${name}: an unwritable journal does not block`);
      const entries = fs.readFileSync(path.join((0, import_fx_paths.machinePaths)().stateDir, "decisions.jsonl"), "utf8").split("\n").filter(Boolean).filter((l) => l.includes(`"session":"${name}"`));
      assert.strictEqual(entries.length, 1, `${name}: one log line`);
      assert.ok(entries[0]?.includes('"action":"allow"') && entries[0].includes('"source":"journal-error"'), entries[0]);
    }
    seed("t1", edit("a.ts"));
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "t1", cwd: 42 })), { text: null, notice: null });
    const thrown = fs.readFileSync(path.join((0, import_fx_paths.machinePaths)().stateDir, "decisions.jsonl"), "utf8").split("\n").filter((l) => l.includes('"session":"t1"'));
    assert.strictEqual(thrown.length, 1);
    assert.ok(thrown[0]?.includes('"event":"stop"') && thrown[0].includes('"action":"allow"') && thrown[0].includes('"source":"stop-error"'), thrown[0]);
    const log = fs.readFileSync(path.join((0, import_fx_paths.machinePaths)().stateDir, "decisions.jsonl"), "utf8").split("\n").filter(Boolean);
    assert.ok(log.some((l) => l.includes('"source":"evidence"') && l.includes('"action":"block"')), "the block is logged");
    assert.ok(log.every((l) => l.includes('"event":"stop"')));
    seed("n1", edit("a.ts"), check(true));
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "n1" })), { text: null, notice: null }, "the baseline");
    fs.writeFileSync(path.join(cwd, ".fx.json"), '{"test_all":"make test","hooks":{"stop_check":false}}');
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "n1", agentId: "a1" })), { text: null, notice: null }, "a subagent gets no notice");
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "n1", mode: "reminder" })), { text: null, notice: null }, "the opencode reminder has nowhere to show it");
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "n1", stopHookActive: true })), { text: null, notice: import_fx_json_watch.FX_JSON_NOTICE });
    assert.deepStrictEqual(await (0, import_stop_check.decideStop)(input({ sessionId: "n1" })), { text: null, notice: null }, "told once");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log("stop-check.test.js: ok");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
