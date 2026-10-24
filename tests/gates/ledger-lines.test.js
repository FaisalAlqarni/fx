// generated from src/tests/gates/ledger-lines.test.ts by scripts/build: edit there, not here
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
const impl = fs.readFileSync(path.join(root, "skills", "fx-implement", "SKILL.md"), "utf8").replace(/\s+/g, " ");
const ref = (f) => fs.readFileSync(path.join(root, "skills", "fx-implement", "references", f), "utf8").replace(/\s+/g, " ");
const handling = ref("handling-reports.md");
const cost = ref("cost.md");
assert.ok(impl.includes("`Task <NN>: dispatched <BASE7> <ISO-8601>`"), "the dispatch line is defined");
assert.ok(impl.includes("`Task <NN>: cost <tokens> tokens, <minutes> min, <dispatches> dispatches, fx-tdd <k>/<i>`"), "the cost line is defined");
assert.ok(handling.includes("`Task <NN>: parked: <one-line reason>`"), "the parked line is defined");
assert.ok(cost.includes("../../scripts/build-cost"), "the cost step names the script by its path from the skill");
assert.ok(cost.includes("fx-tdd 0/"), "a task whose implementer skipped fx-tdd is flagged to the reviewer");
assert.ok(impl.includes("git log <BASE>..HEAD"), "resume checks the task commits before re-dispatching");
assert.ok(impl.includes("At most one task review is outstanding"), "outstanding reviews are capped");
assert.ok(handling.includes("at most twice"), "NEEDS_CONTEXT and BLOCKED re-dispatch is capped");
const sec = (from, to) => impl.slice(impl.indexOf(from), impl.indexOf(to));
const s3 = sec("### 3. Review the task", "### 4. The fix loop");
const s5 = sec("### 5. Complete the task", "## Commits");
assert.ok(s3.includes("[cost.md](./references/cost.md)"), "section 3 points at the cost step");
assert.ok(cost.includes("build-cost --task"), "section 3 runs the cost step");
assert.ok(cost.includes("before you dispatch the task reviewer"), "section 3 orders the cost step before the reviewer dispatch");
assert.ok(cost.indexOf("fx-tdd 0/") > cost.indexOf("build-cost --task"), "section 3 passes the fx-tdd line only after it exists");
assert.ok(s5.includes("build-cost --task") && s5.includes("`Task <NN>: cost"), "section 5 runs the cost step again and ledgers the line");
assert.ok(fs.existsSync(path.join(root, "docs", "adr", "0040-every-task-ledgers-its-dispatch-and-cost.md")), "ADR 0040 exists");
const rev = fs.readFileSync(path.join(root, "skills", "fx-implement", "task-reviewer-prompt.md"), "utf8").replace(/\s+/g, " ");
assert.ok(rev.includes("[COST_LINE]"), "the reviewer template has a slot for the cost line");
assert.ok(
  rev.includes("When the controller cost line reads `fx-tdd 0/<i>`, a report with no captured RED run is an Important finding."),
  "the reviewer template states what fx-tdd 0/<i> means"
);
assert.ok(cost.includes("[COST_LINE]"), "section 3 passes the cost line into the reviewer dispatch");
assert.ok(
  impl.includes("A task with a `Task <NN>: parked:` line is never re-dispatched, and the tasks it blocks are skipped and named in the completion report."),
  "resume never re-dispatches a parked task"
);
assert.ok(
  handling.includes("Each re-dispatch appends its own `dispatched` line, so the count is the number of those lines."),
  "the re-dispatch count is the number of dispatched lines"
);
assert.ok(
  impl.includes("If `compile-brief` exits non-zero, do not dispatch: fix the task file's `**Design:**` or `**Stack:**` entry, or record a ruling, and run it again."),
  "a compile-brief failure stops the dispatch"
);
assert.ok(cost.includes("pass `unavailable` when it prints no line"), "section 3 says what to pass when build-cost prints nothing");
const plan = fs.readFileSync(path.join(root, "skills", "fx-plan", "SKILL.md"), "utf8").replace(/\s+/g, " ");
assert.ok(plan.includes("Every heading a task's `**Design:**` line names exists in `design.md`"), "fx-plan self-review resolves Design headings");
console.log("ledger-lines: OK");
