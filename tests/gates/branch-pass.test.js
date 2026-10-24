// generated from src/tests/gates/branch-pass.test.ts by scripts/build: edit there, not here
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
const read = (p) => fs.readFileSync(path.join(root, p), "utf8").replace(/\s+/g, " ");
const review = read("skills/fx-review/SKILL.md");
assert.ok(review.includes("never fired on any task"), "lenses that already ran are skipped");
assert.ok(review.includes("outside the tasks where they fired"), "a lens whose trigger reaches new files still runs");
assert.ok(review.includes("at most four lenses"), "the lens count is capped");
assert.ok(review.includes("fold into the broad pass"), "lenses past the cap are not dropped");
assert.ok(review.includes("cross-task seams"), "the broad pass covers seams between tasks");
assert.ok(review.includes("no ledger"), "a standalone branch run keeps the full pass");
const finalReview = read("skills/fx-implement/references/final-review.md");
assert.ok(finalReview.includes("never fired on any task"), "fx-implement final review matches");
for (const a of ["fx-lens-security", "fx-devils-advocate"]) {
  assert.ok(/^model:\s*sonnet\s*$/m.test(fs.readFileSync(path.join(root, "agents", `${a}.md`), "utf8")), `${a} pins sonnet`);
}
const sites = {
  "skills/fx-plan/SKILL.md": "Capable because: plan red-team",
  "commands/fx-critique.md": "Capable because: critique of a design or plan",
  "skills/fx-review/SKILL.md": "Capable because: standalone branch review",
  "skills/fx-implement/references/final-review.md": "Capable because: final branch review, auth change"
};
for (const [site, line] of Object.entries(sites)) {
  assert.ok(read(site).includes(line), `${site} writes its reason for the top tier`);
}
assert.ok(fs.existsSync(path.join(root, "docs", "adr", "0044-the-branch-pass-reviews-what-per-task-review-missed.md")), "ADR 0044 exists");
const cap = "The branch pass is limited, not full: the broad pass, the unprimed devil's advocate, and at most four lenses, with `fx-lens-security` on an auth change counted inside the four. Devil's advocate always runs; an auth change only moves it to the top tier.";
const implText = finalReview;
assert.ok(review.includes(cap) && implText.includes(cap), "both lanes state the branch-pass cap in the same sentence");
assert.ok(!implText.includes("dispatch `fx-lens-security` and `fx-devils-advocate`"), "no rule dispatches security outside the four lenses");
console.log("branch-pass: OK");
