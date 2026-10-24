// generated from src/lib/fx-json.test.ts by scripts/build: edit there, not here
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
var import_fx_json = require("./fx-json.js");
const good = (0, import_fx_json.parseFxJson)({ stacks: ["rails"], test_one: "x {file}", test_all: "make test" });
assert.ok(good.ok);
assert.deepStrictEqual(good.value.stacks, ["rails"]);
assert.strictEqual(good.value.test_all, "make test");
assert.deepStrictEqual(good.problems, []);
const bad = (0, import_fx_json.parseFxJson)({ stacks: "rails", companions: "X" });
assert.ok(bad.ok);
assert.strictEqual(bad.value.companions, "X");
assert.strictEqual(bad.value.stacks, void 0);
assert.deepStrictEqual(bad.problems, [{ key: "stacks", reason: "stacks must be an array of strings" }]);
for (const notObject of [null, "x", 5]) {
  assert.deepStrictEqual((0, import_fx_json.parseFxJson)(notObject), { ok: false, reason: ".fx.json is not an object" });
}
const nulled = (0, import_fx_json.parseFxJson)({ lint: null });
assert.ok(nulled.ok);
assert.strictEqual(nulled.value.lint, null);
assert.deepStrictEqual(nulled.problems, []);
const mixed = (0, import_fx_json.parseFxJson)({ coverage_floor: 80, setup: 3, test_scope: null });
assert.ok(mixed.ok);
assert.strictEqual(mixed.value.coverage_floor, 80);
assert.strictEqual(mixed.value.test_scope, null);
assert.strictEqual("setup" in mixed.value, false);
assert.deepStrictEqual(mixed.problems.map((p) => p.key), ["setup"]);
const hooks = (0, import_fx_json.parseFxJson)({ hooks: { stop_check: "no", loop_nudge: false, shell_guard: false, lane_hint: false } });
assert.ok(hooks.ok);
assert.deepStrictEqual(hooks.value.hooks, { loop_nudge: false });
assert.deepStrictEqual(hooks.problems, [{ key: "hooks.stop_check", reason: "hooks.stop_check must be a boolean" }]);
const hooksBad = (0, import_fx_json.parseFxJson)({ hooks: [] });
assert.ok(hooksBad.ok);
assert.strictEqual(hooksBad.value.hooks, void 0);
assert.deepStrictEqual(hooksBad.problems, [{ key: "hooks", reason: "hooks must be an object" }]);
const hooksOk = (0, import_fx_json.parseFxJson)({ hooks: { stop_check: false, edit_rules: false } });
assert.ok(hooksOk.ok);
assert.deepStrictEqual(hooksOk.value.hooks, { stop_check: false, edit_rules: false });
const rules = (0, import_fx_json.parseFxJson)({ rules: [{ id: "fk-index", glob: "db/migrate/*.rb", rule: "Every foreign key gets an index." }] });
assert.ok(rules.ok);
assert.strictEqual("rules" in rules.value, false);
assert.deepStrictEqual(rules.problems, []);
const notArray = (0, import_fx_json.parseFxJson)({ rules: "x" });
assert.ok(notArray.ok);
assert.deepStrictEqual(notArray.problems, []);
const gl = (0, import_fx_json.parseFxJson)({ glossary_rename: "yes" });
assert.ok(gl.ok);
assert.strictEqual("glossary_rename" in gl.value, false);
assert.deepStrictEqual(gl.problems, [{ key: "glossary_rename", reason: 'glossary_rename must be "declined"' }]);
const glOk = (0, import_fx_json.parseFxJson)({ glossary_rename: "declined" });
assert.ok(glOk.ok);
assert.strictEqual(glOk.value.glossary_rename, "declined");
console.log("fx-json.test.js: ok");
