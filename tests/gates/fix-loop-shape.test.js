// generated from src/tests/gates/fix-loop-shape.test.ts by scripts/build: edit there, not here
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
const impl = read("skills/fx-implement/SKILL.md");
const loop = read("skills/fx-implement/fix-loop.md");
const ref = (f) => read(`skills/fx-implement/references/${f}`);
const setup = ref("setup.md");
const gateFile = ref("exit-gate.md");
assert.ok(!impl.includes("once here for the baseline") && !setup.includes("once here for the baseline"), "the baseline test_all run is gone");
assert.ok(setup.includes("`test_all` runs once in a run, at the exit gate."), "test_all runs once");
assert.ok(!impl.includes("Run the baseline suite **before task 01**") && !setup.includes("Run the baseline suite **before task 01**"), "no baseline paragraph");
assert.ok(ref("handling-reports.md").includes("ran test_all (rule)"), "a per-task test_all run is ledgered");
assert.ok(read("skills/fx-implement/implementer-prompt.md").includes("naming the command it ran"), "the Tests field names the command");
assert.ok(impl.includes("**Never read a diff yourself**, except"), "the reading rule names its one exception");
assert.ok(!ref("rationalizations.md").includes('| "The fix was small, skip the re-review" | Unreviewed fixes'), "the old rationalization row is replaced");
assert.ok(/recompile the brief[^.]*before the re-review dispatch/i.test(loop) && loop.includes("[re-review-prompt.md](./re-review-prompt.md)"), "the controller recompiles the brief before the re-review dispatch and links the prompt");
assert.ok(loop.includes("**Small fixes: controller re-review.**"), "the controller re-review rule exists");
assert.ok(loop.includes("20 production lines or fewer"), "the cap counts production lines");
assert.ok(loop.includes("git diff --numstat"), "the count is a command, not a guess");
assert.ok(loop.includes("':(glob,exclude)**/spec/**'"), "test paths are excluded at any depth");
assert.ok(loop.includes("binary file"), "a binary file counts as over the cap");
assert.ok(loop.includes("### New breakage in the fix diff"), "the controller checks for new breakage and writes it down");
assert.ok(loop.includes("controller re-review (<L> lines)"), "the ledger line shape is given");
assert.ok(loop.includes("Never fix findings yourself in the controller session."), "the controller still never fixes");
assert.ok(loop.includes("when all five hold"), "the controller re-review has five conditions");
assert.ok(!loop.includes("':(glob,exclude)**/*.md'"), "Markdown is not excluded from the production count");
for (const x of ["':(glob,exclude)docs/**'", "':(glob,exclude)README*'", "':(glob,exclude)CHANGELOG*'"]) {
  assert.ok(loop.includes(x), `the count excludes ${x}`);
}
assert.ok(loop.includes("does not edit or delete an existing test assertion"), "a weakened test always gets a dispatched re-review");
assert.ok(gateFile.includes("**A `test_all` that stops at its first failure**"), "the exit gate handles a fail-fast runner");
assert.ok(gateFile.includes("Order-dependent blocks the completion claim like introduced"), "order-dependent failures block");
assert.ok(!gateFile.includes("the baseline is 0 tests"), "no vestigial baseline wording");
assert.ok(impl.includes("then a `## Log` heading"), "a created ledger gets a Log heading after the rulings");
assert.ok(impl.includes("or you reading the fix diff when it qualifies as small"), "SKILL.md points at the rule");
const gateAt = gateFile.indexOf("### Classify every failing test");
assert.ok(gateAt > 0, "the exit gate classifies failures");
assert.ok(gateAt > gateFile.indexOf("### Run what the repository's own gate runs"), "classification follows the CI step");
const exitPtr = impl.indexOf("[exit-gate.md](./references/exit-gate.md)");
assert.ok(exitPtr > 0 && exitPtr < impl.indexOf("[completion.md](./references/completion.md)"), "classification precedes the plan-complete line");
const gate = gateFile.slice(gateAt, gateAt + 1800);
for (const word of ["test_one", "merge base", "setup", "does not exist on the merge base", "same assertion", "pre-existing", "introduced", "order-dependent"]) {
  assert.ok(gate.includes(word), `the classification names ${word}`);
}
assert.ok(ref("final-review.md").includes("serial fixers grouped by file"), "the end-pass wave may split by file");
console.log("fix-loop-shape.test.js: OK");
