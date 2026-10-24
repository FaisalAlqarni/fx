// generated from src/tests/gates/review-content.test.ts by scripts/build: edit there, not here
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
const task = read("skills/fx-implement/task-reviewer-prompt.md");
assert.ok(task.includes("**Callers and variants.**"), "task reviewer sweeps callers and variants");
assert.ok(task.includes("every variant the shared code touches"), "variants are named");
assert.ok(task.includes("must agree on precedence, validation and error mapping"), "parallel paths must agree");
assert.ok(task.includes("re-read every fact it cites at its source"), "cited facts are re-read");
assert.ok(task.includes("copied from the implementation"), "test-constant drift is asked about");
const da = read("agents/fx-devils-advocate.md");
const code = da.slice(da.indexOf("## Code mode"), da.indexOf("## Output"));
assert.ok(code.includes("**Unchanged callers and variants**"), "devil's advocate hunts caller breaks");
const branch = read("skills/fx-review/reviewer-prompt.md");
assert.ok(branch.includes("Docs, runbooks or examples the diff has made stale?"), "branch review checks doc drift");
for (const f of ["skills/fx-implement/task-reviewer-prompt.md", "skills/fx-review/reviewer-prompt.md"]) {
  assert.ok(read(f).includes("Read the brief's Review focus section with its Global constraints"), `${f} points at Review focus`);
}
console.log("review-content.test.js: OK");
