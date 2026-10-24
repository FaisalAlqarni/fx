// generated from src/lib/fx-json-watch.test.ts by scripts/build: edit there, not here
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
var import_fx_json_watch = require("./fx-json-watch.js");
var import_fx_paths = require("./fx-paths.js");
var import_journal = require("./journal.js");
var import_hook_env = require("../tests/helpers/hook-env.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-json-watch-"));
process.on("exit", () => fs.rmSync(root, { recursive: true, force: true }));
process.env.XDG_STATE_HOME = path.join(root, "state");
process.env.XDG_CONFIG_HOME = path.join(root, "config");
process.env.LOCALAPPDATA = path.join(root, "state");
const dirs = { root, home: root, config: path.join(root, "config", "fx"), state: path.join(root, "state", "fx") };
const repo = path.join(root, "repo");
fs.mkdirSync(path.join(repo, "sub"), { recursive: true });
assert.strictEqual((0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: repo }).status, 0);
const write = (json) => fs.writeFileSync(path.join(repo, ".fx.json"), JSON.stringify(json));
assert.strictEqual(import_fx_json_watch.FX_JSON_NOTICE, "[fx] notice: the hook switches in .fx.json changed during this session. An agent can edit that file; check the change.");
write({ hooks: { stop_check: false }, test_all: "make test" });
const first = (0, import_fx_json_watch.fxJsonFingerprint)(repo);
assert.match(first, /^[0-9a-f]{64}$/);
write({ hooks: { stop_check: false }, test_all: "make check" });
assert.strictEqual((0, import_fx_json_watch.fxJsonFingerprint)(repo), first, "a test command change is not a switch change");
write({ hooks: { stop_check: false }, test_all: "make check", rules: [{ id: "a", glob: "*", rule: "x" }] });
assert.strictEqual((0, import_fx_json_watch.fxJsonFingerprint)(repo), first, "the retired rules key is not watched (ADR 0049)");
assert.strictEqual((0, import_fx_json_watch.fxJsonFingerprint)(path.join(repo, "sub")), first, "read from the top level");
fs.writeFileSync(path.join(repo, "sub", ".fx.json"), '{"hooks":{"stop_check":true}}');
assert.strictEqual((0, import_fx_json_watch.fxJsonFingerprint)(path.join(repo, "sub")), first, "a nested .fx.json is never read");
fs.writeFileSync(path.join(repo, ".fx.json"), "not json");
const broken = (0, import_fx_json_watch.fxJsonFingerprint)(repo);
fs.rmSync(path.join(repo, ".fx.json"));
assert.strictEqual((0, import_fx_json_watch.fxJsonFingerprint)(repo), broken, "missing and not JSON both read as {}");
assert.notStrictEqual(broken, first);
write({ hooks: { loop_nudge: true } });
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("s1", repo, 1), null, "the first call records the baseline");
assert.deepStrictEqual((0, import_journal.readJournal)("s1").filter((e) => e.kind === "fx-json-hooks").length, 1);
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("s1", repo, 2), null, "unchanged");
write({ hooks: { loop_nudge: false } });
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("s1", repo, 3), import_fx_json_watch.FX_JSON_NOTICE, "a switch changed");
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("s1", repo, 4), null, "told once");
write({ hooks: { loop_nudge: false, edit_rules: false } });
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("s1", repo, 5), import_fx_json_watch.FX_JSON_NOTICE, "a switch was added");
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)(null, repo, 6), null, "no session");
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("s2", path.join(root, "missing-dir"), 7), null, "a directory that does not exist");
fs.mkdirSync(path.join((0, import_fx_paths.machinePaths)().stateDir, "sessions"), { recursive: true });
fs.writeFileSync(path.join((0, import_fx_paths.machinePaths)().stateDir, "sessions", `${(0, import_journal.journalKey)("s3")}.jsonl`), `${JSON.stringify({ t: 1, kind: "fx-json", hash: "old-shape" })}
`);
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("s3", repo, 8), null, "an old-kind baseline is re-recorded silently");
assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("s3", repo, 9), null, "and then holds");
const log = (0, import_hook_env.readDecisionLog)(dirs);
assert.strictEqual(log.length, 2, JSON.stringify(log));
for (const e of log) {
  assert.ok(typeof e === "object" && e !== null);
  assert.deepStrictEqual([Reflect.get(e, "event"), Reflect.get(e, "source"), Reflect.get(e, "action"), Reflect.get(e, "session")], ["health", "fx-json", "notice", "s1"]);
}
{
  const memory = /* @__PURE__ */ new Map();
  write({ rules: [] });
  assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("m1", repo, 8, "opencode", memory), null, "the first call records the baseline");
  assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("m1", repo, 9, "opencode", memory), null, "unchanged");
  write({ rules: [], hooks: { x: true } });
  assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("m1", repo, 10, "opencode", memory), import_fx_json_watch.FX_JSON_NOTICE, "changed");
  assert.strictEqual((0, import_fx_json_watch.fxJsonNotice)("m1", repo, 11, "opencode", memory), null, "told once");
  assert.deepStrictEqual((0, import_journal.readJournal)("m1"), [], "nothing in the journal");
  const lines = (0, import_hook_env.readDecisionLog)(dirs).filter((e) => typeof e === "object" && e !== null && Reflect.get(e, "session") === "m1");
  assert.deepStrictEqual(lines.map((e) => [Reflect.get(Object(e), "harness"), Reflect.get(Object(e), "source"), Reflect.get(Object(e), "action")]), [["opencode", "fx-json", "notice"]]);
}
console.log("fx-json-watch.test.js: ok");
