// generated from src/scripts/test-scope.test.ts by scripts/build: edit there, not here
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
var path = __toESM(require("path"));
var import_child_process = require("child_process");
const ROOT = path.join(__dirname, "..");
const dry = (...paths) => (0, import_child_process.execFileSync)(path.join(__dirname, "test-scope"), ["--dry-run", ...paths], { cwd: ROOT, encoding: "utf8" }).trim().split("\n");
const LAST = "node tests/gates/release-version.test.js";
const HOOKS_RULE = ["node lib/preamble.test.js", "node tests/gates/codex-hook-output.test.js", "node tests/gates/opencode-plugin.test.js"];
const TURN = "node tests/gates/turn-journal.test.js";
const SHELL_GUARD = "node tests/gates/shell-guard-claude.test.js";
const SHELL_GUARD_CODEX = "node tests/gates/shell-guard-codex.test.js";
const LOOP = "node tests/gates/loop-nudge.test.js";
const STOP = "node tests/gates/stop-check.test.js";
const EDIT_RULES = ["node tests/gates/edit-rules.test.js", "node tests/gates/fx-json-notice.test.js"];
assert.deepStrictEqual(dry("lib/plan-state.test.js"), ["node lib/plan-state.test.js", LAST]);
assert.deepStrictEqual(dry("lib/plan-state.js"), ["node lib/plan-state.test.js", ...HOOKS_RULE, LAST]);
assert.deepStrictEqual(
  dry("lib/plan-state.js", "lib/plan-state.test.js"),
  [...HOOKS_RULE, "node lib/plan-state.test.js", LAST],
  "deduplicated"
);
assert.deepStrictEqual(dry("lib/preamble.js"), [...HOOKS_RULE, LAST]);
const GATES = fs.readdirSync(path.join(ROOT, "tests", "gates")).filter((f) => f.endsWith(".test.js")).sort().map((f) => `node tests/gates/${f}`).filter((c) => c !== LAST);
assert.deepStrictEqual(
  dry("skills/fx-plan/SKILL.md"),
  ["scripts/check-prose", "scripts/check-paths", "scripts/check-generated", "scripts/check-manifest", ...GATES, LAST]
);
const FACTS = "node tests/gates/harness-facts.test.js";
assert.deepStrictEqual(
  dry("references/harnesses/codex.md"),
  ["scripts/check-prose", "scripts/check-paths", "scripts/check-generated", "scripts/check-manifest", ...GATES.filter((c) => c !== FACTS), FACTS, LAST]
);
assert.deepStrictEqual(dry("hooks/fx-context.js"), [...HOOKS_RULE, TURN, SHELL_GUARD, SHELL_GUARD_CODEX, LOOP, STOP, ...EDIT_RULES, LAST]);
assert.deepStrictEqual(dry("plugins/fx-opencode-v1.js"), [...HOOKS_RULE, "node tests/gates/opencode-v1-shell-guard.test.js", "node tests/gates/opencode-turn.test.js", "node tests/gates/opencode-edit-rules.test.js", LAST]);
assert.deepStrictEqual(dry("plugins/fx-opencode-v2.js"), [
  ...HOOKS_RULE,
  "node tests/gates/opencode-v1-shell-guard.test.js",
  "node tests/gates/opencode-turn.test.js",
  "node tests/gates/opencode-edit-rules.test.js",
  "node tests/gates/opencode-v2-plugin.test.js",
  "node tests/gates/opencode-v2-shell-guard.test.js",
  LAST
]);
assert.deepStrictEqual(dry("no/such/file.js"), ["scripts/check-all", LAST], "a deleted path falls back to check-all");
assert.deepStrictEqual(dry("skills/no-such-skill/SKILL.md"), ["scripts/check-all", LAST], "a deleted skill file falls back to check-all");
assert.deepStrictEqual(dry("lib/no-such.test.js"), ["scripts/check-all", LAST], "a deleted test is never run by name");
for (const p of ["lib/git-guard.js", "lib/git-guard.test.js", "lib/heredoc.test.js", "lib/base-branch.test.js"]) {
  assert.deepStrictEqual(dry(p), ["scripts/check-all", LAST], `${p} needs the git fixture`);
}
assert.deepStrictEqual(dry("tests/conformance/lib/live.sh"), ["scripts/check-all", LAST], "unmapped path falls back to check-all");
assert.deepStrictEqual(dry(".codex-plugin/plugin.json"), ["node tests/gates/codex-manifest.test.js", LAST], "codex manifest routes to the gate that reads it");
assert.deepStrictEqual(dry(".agents/plugins/marketplace.json"), ["node tests/gates/codex-manifest.test.js", LAST], "marketplace.json routes to the gate that reads it");
const TS_GATES = ["scripts/check-types", "scripts/check-ts-escapes", "scripts/check-generated"];
assert.deepStrictEqual(dry("src/lib/dispatch-route.ts"), [...TS_GATES, ...dry("lib/dispatch-route.js")]);
assert.deepStrictEqual(dry("src/hooks/fx-context.ts"), [...TS_GATES, ...dry("hooks/fx-context.js")]);
assert.deepStrictEqual(dry("src/lib/git-guard.ts"), ["scripts/check-all", LAST], "check-all already runs the TypeScript gates");
const built = (p) => (0, import_child_process.execFileSync)(path.join(__dirname, "test-scope"), ["--built-path", p], { cwd: ROOT, encoding: "utf8" }).trim();
assert.strictEqual(built("src/lib/x.test.ts"), "lib/x.test.js");
assert.strictEqual(built("src/scripts/build-cost.ts"), "scripts/build-cost");
assert.strictEqual(built("src/scripts/test-scope.ts"), "scripts/test-scope");
assert.strictEqual(built("lib/plan-state.test.js"), "lib/plan-state.test.js", "a non-src path prints unchanged");
console.log("test-scope: ok");
