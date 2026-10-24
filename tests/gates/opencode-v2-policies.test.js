// generated from src/tests/gates/opencode-v2-policies.test.ts by scripts/build: edit there, not here
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
var import_opencode_v2_policies = require("../../lib/opencode-v2-policies.js");
var import_git_guard = require("../../lib/git-guard.js");
const root = path.join(__dirname, "..", "..");
function match(input, pattern) {
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  if (escaped.endsWith(" .*")) escaped = escaped.slice(0, -3) + "( .*)?";
  return new RegExp("^" + escaped + "$", "s").test(input);
}
const matchesAny = (cmd) => import_opencode_v2_policies.GUARD_POLICIES.some((p) => match(`shell:${cmd}`, p.resource));
const repo = fs.mkdtempSync(path.join(os.tmpdir(), "fx-v2-pol-"));
(0, import_child_process.execFileSync)("git", ["init", "-q", "-b", "main", repo]);
assert.ok(Array.isArray(import_opencode_v2_policies.GUARD_POLICIES) && import_opencode_v2_policies.GUARD_POLICIES.length >= 10, "a policy list exists");
for (const p of import_opencode_v2_policies.GUARD_POLICIES) {
  assert.strictEqual(p.action, "permission");
  assert.strictEqual(p.effect, "deny");
  assert.ok(p.resource.startsWith("shell:"), `${p.resource} is a shell pattern`);
  assert.ok(!p.resource.includes("?"), `${p.resource} has no ? (v2 reads it as any character)`);
  assert.ok(typeof p.sample === "string" && p.sample.length, `${p.resource} has a sample`);
  assert.strictEqual((0, import_git_guard.inspect)(p.sample, repo).allow, false, `the guard refuses ${p.resource}'s sample: ${p.sample}`);
  assert.ok(match(`shell:${p.sample}`, p.resource), `${p.resource} matches its own sample: ${p.sample}`);
  assert.ok(Array.isArray(p.allowed) && p.allowed.length, `${p.resource} has allowed samples`);
  for (const ok of p.allowed) {
    assert.strictEqual((0, import_git_guard.inspect)(ok, repo).allow, true, `the guard allows ${p.resource}'s allowed sample: ${ok}`);
    assert.ok(!match(`shell:${ok}`, p.resource), `${p.resource} does not block ${ok}`);
  }
}
for (const needle of ["--force", "--no-verify", "reset --hard", "clean -f", "branch -D", "stash drop", "checkout .", "tag -d", "--delete"]) {
  assert.ok(import_opencode_v2_policies.GUARD_POLICIES.some((p) => p.resource.includes(needle)), `a policy covers ${needle}`);
}
for (const ok of ["git push origin main-fix", "git checkout .github/x", "git log --grep no-verify", "git status", "git push origin feature"]) {
  assert.ok(!matchesAny(ok), `no policy blocks ${ok}`);
}
fs.rmSync(repo, { recursive: true, force: true });
console.log("opencode-v2-policies.test.js: OK");
