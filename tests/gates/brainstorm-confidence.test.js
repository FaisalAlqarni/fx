// generated from src/tests/gates/brainstorm-confidence.test.ts by scripts/build: edit there, not here
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
const skill = fs.readFileSync(path.join(__dirname, "..", "..", "skills", "fx-brainstorm", "SKILL.md"), "utf8");
assert.ok(skill.includes("### Close the interview with a confidence check"), "the subsection exists");
assert.ok(skill.includes("95% confident"), "the bar is stated");
assert.ok(skill.includes("**What made you confident**"), "the evidence part is required");
assert.ok(skill.includes("**What you will do**, in two lines."), "the two-line plan is required");
assert.ok(skill.includes("Nothing happens until the user gives an explicit go"), "the stop is explicit");
assert.ok(!skill.includes("**Done when the ledger is empty**"), "the old closing paragraph is gone");
const bounded = skill.slice(skill.indexOf("### Bounded checklist"), skill.indexOf("### Architectural checklist"));
assert.ok(/\n3\. \*\*Confidence check/.test(bounded), "bounded step 3 is the confidence check");
assert.ok(bounded.indexOf("Confidence check") < bounded.indexOf("short design"), "the check comes before the design");
const arch = skill.slice(skill.indexOf("### Architectural checklist"), skill.indexOf("**Terminal states are path-bound.**"));
assert.ok(/\n4\. \*\*Confidence check and approaches, then stop/.test(arch), "architectural step 4 carries the approaches");
assert.ok(/\n6\. Self-review it, then the builder check \(§8\)/.test(arch), "step 6 adds the builder check");
assert.ok(/\n2\. Show rather than tell/.test(arch), "show rather than tell stays");
assert.ok(/\n8\. Hand off to `fx-plan`/.test(arch), "the architectural path hands off at step 8");
assert.ok(/\n6\. \*\*Write a short design\.md\*\*/.test(bounded), "bounded step 6 writes a short design.md");
assert.ok(/\n7\. Implement through the normal workflow/.test(bounded), "bounded step 7 implements");
assert.ok(!arch.includes("Propose 2 to 3 approaches"), "approaches are not a separate step");
assert.ok(!/\| "I'm confident, I'll show approaches in the same message" \|/.test(skill), "the red-flag row against one message is gone");
assert.ok(!skill.includes("create a task for each item on your path"), "no task item per checklist step");
assert.ok(skill.includes("seams included"), "design.md is reviewed once, seams included");
const tpl = fs.readFileSync(path.join(__dirname, "..", "..", "references", "design-template.md"), "utf8");
assert.ok(tpl.includes("**Approved:**") && !tpl.includes("extremely extensive"), "template: approval line, complete stories");
const fxPlan = fs.readFileSync(path.join(__dirname, "..", "..", "skills", "fx-plan", "SKILL.md"), "utf8");
assert.ok(fxPlan.slice(fxPlan.indexOf("## 1."), fxPlan.indexOf("## 2.")).includes("**Approved:**"), "fx-plan skips the restate on an approved design");
assert.ok(fs.existsSync(path.join(__dirname, "..", "..", "docs", "adr", "0045-one-design-checkpoint.md")), "ADR 0045 exists");
assert.ok(/write `\*\*Approved:\*\* YYYY-MM-DD` under the\s+Status line/.test(skill.slice(skill.indexOf("## 8."), skill.indexOf("## 9."))), "section 8 writes the Approved line on approval");
assert.ok(!/^\*\*Approved:\*\*/m.test(tpl.slice(tpl.indexOf("```markdown"))), "the template block carries no Approved line");
const fxPlan1 = fxPlan.slice(fxPlan.indexOf("## 1."), fxPlan.indexOf("## 2."));
assert.ok(fxPlan1.includes("followed by a real date") && fxPlan1.includes("placeholder"), "fx-plan skips the restate only on a real date");
assert.ok(tpl.includes("## Approaches"), "template: Approaches section");
assert.ok(tpl.includes("Anti-goals: what would make this a failure even if every test passes."), "template: anti-goals line");
assert.ok(skill.includes("[builder-check-prompt.md](./builder-check-prompt.md)"), "section 8 links the builder prompt");
console.log("brainstorm-confidence.test.js: OK");
