// generated from src/lib/repo-config.test.ts by scripts/build: edit there, not here
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
var import_repo_config = require("./repo-config.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-repo-config-"));
process.on("exit", () => fs.rmSync(root, { recursive: true, force: true }));
const mk = (name) => {
  const d = path.join(root, name);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const none = mk("none");
assert.deepStrictEqual((0, import_repo_config.readRepoConfig)(none), {
  hooks: { stopCheck: true, loopNudge: true, editRules: true },
  checks: { test_one: null, test_scope: null, test_all: null, lint: null, setup: null }
});
const some = mk("some");
fs.writeFileSync(path.join(some, ".fx.json"), '{"hooks":{"stop_check":false},"test_all":"make test","setup":"make setup"}');
const c = (0, import_repo_config.readRepoConfig)(some);
assert.deepStrictEqual(c.hooks, { stopCheck: false, loopNudge: true, editRules: true });
assert.strictEqual(c.checks.test_all, "make test");
assert.strictEqual(c.checks.setup, "make setup");
assert.strictEqual(c.checks.lint, null);
const bad = mk("bad");
fs.writeFileSync(path.join(bad, ".fx.json"), '{"hooks":{"edit_rules":"no"}}');
assert.strictEqual((0, import_repo_config.readRepoConfig)(bad).hooks.editRules, true);
const broken = mk("broken");
fs.writeFileSync(path.join(broken, ".fx.json"), "not json");
assert.strictEqual((0, import_repo_config.readRepoConfig)(broken).hooks.stopCheck, true, "unparseable file: defaults");
const old = mk("old");
fs.writeFileSync(path.join(old, ".fx.json"), '{"hooks":{"shell_guard":false}}');
assert.deepStrictEqual((0, import_repo_config.readRepoConfig)(old).hooks, { stopCheck: true, loopNudge: true, editRules: true }, "an old key name is ignored");
const repo = mk("repo");
assert.strictEqual((0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: repo }).status, 0);
fs.writeFileSync(path.join(repo, ".fx.json"), '{"hooks":{"stop_check":false}}');
const sub = path.join(repo, "sub");
fs.mkdirSync(sub);
fs.writeFileSync(path.join(sub, ".fx.json"), '{"hooks":{"stop_check":true,"edit_rules":false}}');
const nested = (0, import_repo_config.readRepoConfig)(sub);
assert.strictEqual(nested.hooks.stopCheck, false);
assert.strictEqual(nested.hooks.editRules, true);
assert.strictEqual(fs.realpathSync((0, import_repo_config.repoRoot)(sub)), fs.realpathSync(repo));
assert.strictEqual((0, import_repo_config.repoRoot)(some), some);
assert.strictEqual((0, import_repo_config.readRepoConfig)(some).hooks.stopCheck, false);
assert.strictEqual((0, import_repo_config.repoRoot)(path.join(root, "does-not-exist")), path.join(root, "does-not-exist"));
console.log("repo-config.test.js: ok");
