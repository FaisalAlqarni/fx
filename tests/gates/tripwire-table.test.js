// generated from src/tests/gates/tripwire-table.test.ts by scripts/build: edit there, not here
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
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const review = read("skills/fx-review/SKILL.md");
const lines = review.split("\n");
const header = lines.find((l) => l.startsWith("| Lens |"));
assert.ok(header, "the lens table header is present");
assert.ok(header.includes("| Per task (tripwire) |"), `the header has a per-task column: ${header}`);
function cells(lens) {
  const line = lines.find((l) => l.startsWith(`| \`${lens}\``));
  assert.ok(line, `a row for ${lens}`);
  return line.split("|").map((c) => c.trim()).filter(Boolean);
}
for (const lens of ["fx-lens-security", "fx-lens-database", "fx-lens-silent-failure"]) {
  assert.ok(cells(lens)[1]?.startsWith("tripwire:"), `${lens} fires per task only on its tripwire`);
}
for (const lens of ["fx-lens-a11y", "fx-lens-pipeline"]) {
  assert.strictEqual(cells(lens)[1], "no", `${lens} never fires per task`);
}
assert.ok(!review.includes("auth, payment, or a migration"), "the old task-mode blurb is gone");
const span = read("skills/fx-implement/references/lens-dispatch.md");
assert.ok(span.startsWith("**Lens dispatch.**"), "the lens dispatch span is intact");
assert.ok(span.includes("tripwire"), "lens dispatch uses the tripwire column");
assert.ok(span.includes("grep -n '^Tripwires:'"), "lens dispatch reads the report Tripwires line, not the diff");
assert.ok(span.includes("`mode: task`"), "lens dispatch sends mode: task");
assert.ok(read("skills/fx-implement/implementer-prompt.md").includes("A line `Tripwires:`"), "the implementer report carries a Tripwires line");
assert.ok(read("skills/fx-implement/task-reviewer-prompt.md").includes("`Tripwires:` line"), "the task reviewer checks the Tripwires line");
assert.ok(!span.includes("-a11y"), "lens dispatch no longer sends a11y per task");
console.log("tripwire-table.test.js: OK");
