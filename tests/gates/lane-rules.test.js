// generated from src/tests/gates/lane-rules.test.ts by scripts/build: edit there, not here
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
const has = (file, text, rule) => assert.ok(read(file).includes(text), `${file}: ${rule}`);
const tdd = "skills/fx-tdd/SKILL.md";
has(tdd, "Give each proposed seam one line: what it catches, what it misses.", "each proposed seam names what it catches and misses");
has(tdd, "never drive RED from a browser or system test", "no RED from a browser or system test");
has(tdd, "Name every failure it shows in the report", "every failure the wider run shows is named");
has(tdd, "Never `git checkout`, `git restore` or `git stash` for this.", "a regression undo is done by diff, never by git");
const debug = "skills/fx-debug/SKILL.md";
has(debug, "Forced the red by changing code or a fixture? `diff` against a clean copy", "a forced red is undone and proved by diff");
has(debug, "(`../../references/vocab/verification.md`)", "verification points at verification.md");
has(debug, "A missing seam goes to `fx-architecture`, a process or lane gap to `/fx:fx-retro`.", "the prevention question routes to fx-architecture or fx-retro");
const refs = "skills/fx-implement/references";
has(`${refs}/finishing.md`, "Run no `git pull`", "finishing fetches nothing the owner did not ask for");
has(`${refs}/finishing.md`, "Never add `--force`", "finishing never forces a worktree removal");
has(`${refs}/parallel.md`, "Only the controller writes the ledger.", "parallel builds keep one ledger writer");
has(`${refs}/parallel.md`, "Never `git stash`.", "parallel builds never stash across worktrees");
const dm = "references/vocab/domain-modeling.md";
has(dm, "## Relationships", "the map format keeps its Relationships section");
has(dm, "If unclear,", "an unclear context is asked about, not guessed");
has(
  dm,
  "Only `/fx:fx-setup` migrates. Any other lane that would write the glossary reads the old name, writes to the old-named file,",
  "a lane other than fx-setup writes the old-named file and runs no migration"
);
has("skills/fx-humanize/SKILL.md", "## How to work", "humanize keeps How to work");
has("skills/fx-humanize/SKILL.md", "## When not to act", "humanize keeps When not to act");
console.log("lane-rules: OK");
