// generated from src/tests/gates/no-stories-in-loaded-lanes.test.ts by scripts/build: edit there, not here
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
const loaded = {
  "skills/fx-implement/SKILL.md": "skills/fx-implement/COVERAGE.md",
  "skills/fx-implement/implementer-prompt.md": "skills/fx-implement/COVERAGE.md",
  "skills/fx-implement/task-reviewer-prompt.md": "skills/fx-implement/COVERAGE.md",
  "skills/fx-implement/re-review-prompt.md": "skills/fx-implement/COVERAGE.md",
  ...Object.fromEntries(fs.readdirSync(path.join(root, "skills/fx-implement/references")).filter((f) => f.endsWith(".md")).map((f) => [`skills/fx-implement/references/${f}`, "skills/fx-implement/COVERAGE.md"])),
  "skills/fx-plan/SKILL.md": "skills/fx-plan/COVERAGE.md",
  "skills/fx-tdd/SKILL.md": "skills/fx-tdd/COVERAGE.md"
};
for (const [file, coverage] of Object.entries(loaded)) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  const hits = text.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /\bMeasured\b/.test(l));
  assert.deepStrictEqual(hits, [], `${file} still carries a story: line ${hits.map(([n]) => n).join(", ")}`);
  assert.ok(fs.readFileSync(path.join(root, coverage), "utf8").includes("## Incident record"), `${coverage} has an Incident record section`);
}
assert.ok(fs.existsSync(path.join(root, "docs", "adr", "0041-rules-load-stories-do-not.md")), "ADR 0041 exists");
console.log("no-stories-in-loaded-lanes: OK");
