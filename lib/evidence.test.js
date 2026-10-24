// generated from src/lib/evidence.test.ts by scripts/build: edit there, not here
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
var import_evidence = require("./evidence.js");
assert.strictEqual((0, import_evidence.isRepoCommand)("make test", "make test"), true);
assert.strictEqual((0, import_evidence.isRepoCommand)("make test VERBOSE=1", "make test"), true);
assert.strictEqual((0, import_evidence.isRepoCommand)("make testing", "make test"), false);
assert.strictEqual((0, import_evidence.isRepoCommand)("node lib/x.test.js", "node {file}"), false, "a one-word prefix matches nothing");
assert.strictEqual((0, import_evidence.isRepoCommand)("scripts/test-scope lib/a.js", "scripts/test-scope {paths}"), true, "a first word with / counts");
assert.strictEqual((0, import_evidence.isRepoCommand)("bundle exec rspec spec/a_spec.rb:3", "bundle exec rspec {file}:{line}"), true);
assert.strictEqual((0, import_evidence.isRepoCommand)("x", null), false);
assert.strictEqual((0, import_evidence.isRepoCommand)("scripts/test-scope-evil x", "scripts/test-scope {paths}"), false, "the prefix is a whole word");
assert.strictEqual((0, import_evidence.isRepoCommand)("scripts/test-scope/../../tmp/x.sh", "scripts/test-scope {paths}"), false, "the prefix is a whole word");
assert.strictEqual((0, import_evidence.isRepoCommand)("scripts/test-scope", "scripts/test-scope {paths}"), true, "the placeholder may be empty");
assert.strictEqual((0, import_evidence.isRepoCommand)("node lib/a.test.js", "node lib/{file}"), true, "a placeholder glued to its prefix");
assert.strictEqual((0, import_evidence.isRepoCommand)("  make   test  ", "make test"), true, "the command is normalized first");
const checks = { test_one: null, test_scope: null, test_all: "make test", lint: "make lint", setup: "make setup" };
assert.strictEqual((0, import_evidence.isCheckCommand)("make test", checks), true);
assert.strictEqual((0, import_evidence.isCheckCommand)("make lint", checks), true);
assert.strictEqual((0, import_evidence.isCheckCommand)("make setup", checks), false, "setup is never a check");
for (const t of [
  "Tests: 12 passed, 12 total",
  "12 examples, 0 failures",
  "OK (3 tests)",
  "ok  	github.com/x/y	0.01s",
  "test result: ok. 3 passed; 0 failed",
  "Passed!  - Failed:     0, Passed:    10",
  "ALL GREEN",
  "=== 5 passed in 0.12s ==="
]) {
  assert.strictEqual((0, import_evidence.hasPassSummary)(t), true, t);
}
for (const t of ["5 passed, 1 failed", "ok  	github.com/x\nFAIL	github.com/y", "Tests: 3 failed, 3 passed", "0 passed", "error: build failed", ""]) {
  assert.strictEqual((0, import_evidence.hasPassSummary)(t), false, JSON.stringify(t));
}
assert.strictEqual((0, import_evidence.hasPassSummary)(`${"ALL GREEN\n"}${"x".repeat(5e3)}`), false, "only the last 4 KB counts");
const c2 = { test_one: "node {file}", test_scope: "scripts/test-scope {paths}", test_all: "make test", lint: null, setup: null };
const cases = [
  ["shell", "make test", "ok", "", true],
  ["shell", "make test", "fail", "", false],
  ["shell", "make test | tail -5", "ok", "error", false],
  ["shell", "make test | tail -5", "ok", "Tests: 3 passed", true],
  ["shell", "npm test || true", "ok", "", false],
  ["shell", 'echo "Tests: 1 passed"', "ok", "Tests: 1 passed", false],
  ["shell", 'grep "ALL GREEN" log.txt', "ok", "ALL GREEN", false],
  ["read", "cat out.txt", "ok", "Tests: 3 passed", false],
  ["shell", "npx vitest run", "unknown", "Tests: 4 passed", true],
  ["shell", "node lib/x.test.js", "ok", "", false],
  ["shell", "make test; echo done", "ok", "", false],
  ["shell", "npx vitest run", "fail", "Tests: 4 passed", false],
  ["shell", "make test", "fail", "ALL GREEN", false],
  ["shell", "scripts/test-scope lib/a.js --verbose", "ok", "", true]
];
for (const [kind, cmd, outcome, output, want] of cases) assert.strictEqual((0, import_evidence.countsAsVerification)(kind, cmd, outcome, output, c2), want, `${kind} ${cmd} ${outcome}`);
assert.strictEqual((0, import_evidence.checkHint)(c2), "`scripts/test-scope {paths}`");
assert.strictEqual((0, import_evidence.checkHint)({ ...c2, test_scope: null }), "`make test`");
assert.strictEqual((0, import_evidence.checkHint)({ test_one: null, test_scope: null, test_all: null, lint: null, setup: null }), "the project's tests");
console.log("evidence.test.js: ok");
