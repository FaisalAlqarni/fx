// generated from src/tests/gates/plan-template.test.ts by scripts/build: edit there, not here
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
var path = __toESM(require("path"));
const root = path.join(__dirname, "..", "..");
const plan = fs.readFileSync(path.join(root, "skills", "fx-plan", "SKILL.md"), "utf8");
const flat = plan.replace(/\s+/g, " ");
const template = plan.slice(plan.indexOf("## tasks/NN-<slug>.md template"), plan.indexOf("## No placeholders"));
const placeholders = flat.slice(flat.indexOf("## No placeholders"), flat.indexOf("## Quality red flags"));
const flags = flat.slice(flat.indexOf("## Quality red flags"));
const sec7 = flat.slice(flat.indexOf("## 7. Red-team recommendation"), flat.indexOf("## 8. Handoff"));
assert.ok(template.includes("**Tests:**") && template.includes("**Design:**") && template.includes("**Stack:**"), "template fields");
assert.ok(!/```(ruby|js|javascript|ts|python|csharp|kotlin|swift)\n/.test(template), "no fenced test code in the template");
assert.ok(!flat.includes("Test code is written out") && !flat.includes("Test code in a task is code nobody has run"), "old test-code rules gone");
assert.ok(!placeholders.includes("without the actual test code") && !placeholders.includes("repeat it"), "placeholder list agrees");
assert.ok(placeholders.includes("without an exact expected value"), "a vague Tests entry is a placeholder");
assert.ok(flags.includes("when a neighbour") && flags.includes("outside git"), "red flags make Interfaces and Idempotency conditional");
assert.ok(flags.includes("error contract") && flags.includes("type: :request"), "error-contract and spec-type flags stay");
assert.ok(!/\d+\+ tasks/.test(sec7), "no task-count trigger for the red-team");
assert.ok(!flat.includes("questionable taste"), "reader not assumed to have poor taste");
assert.ok(fs.existsSync(path.join(root, "docs", "adr", "0043-plan-tasks-state-behaviour-and-name-tests.md")), "ADR 0043 exists");
console.log("plan-template: OK");
