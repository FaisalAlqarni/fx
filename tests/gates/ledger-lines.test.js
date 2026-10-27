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
assert.ok(handling.includes("`Task <NN>: parked: needs you: <one-line reason>`"), "the parked line has the needs-you shape status.md uses");
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
  impl.includes("A task whose last `parked:` line has no later `unparked:` line is never re-dispatched, and the tasks it blocks are skipped and named in the completion report."),
  "resume never re-dispatches a task while it is parked"
);
assert.ok(impl.includes("A task with an `unparked:` line after its last `parked:` line is dispatchable"), "resume treats an unparked task as dispatchable");
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
assert.ok(ref("reading-rules.md").includes("must equal the reply's Minor count plus its `declined: <n>` count"), "the ledger-copy check counts declined lines");
assert.ok(rev.includes("Task <NN>: declined: <behaviour>: <reason>"), "the task reviewer defines the declined ledger line");
const inputs = ref("review-inputs.md");
assert.ok(inputs.includes("Task <NN>: declined: <behaviour>: <reason>. Ruling: <stands | fix | parked>: <why>"), "review-inputs defines the ruling line");
for (const o of ["stands", "fix", "parked"]) assert.ok(inputs.includes(`**${o}**`), `review-inputs defines the ${o} outcome`);
assert.ok(inputs.includes("Task <NN>: needs you: declined: <item text>"), "a parked declined item writes a needs-you line");
assert.ok(ref("final-review.md").includes("Final review: declined: <behaviour>: <reason>. Ruling: <stands | fix | parked>: <why>"), "the branch pass declined line is defined");
const status = ref("status.md");
assert.ok(status.includes("Task <NN>: parked: needs you: <stop condition>: <what unblocks it>"), "status.md defines the needs-you parked line");
for (const l of ["Done: <n> of <total>", "Running: Task <NN>, <dispatch", "Left: <NN, NN> or none", "Needs you: <NN: what unblocks it"]) assert.ok(status.includes(l), `status.md defines the status line starting ${l}`);
assert.ok(impl.includes("For those, park the task and continue: read [status.md](./references/status.md), every time."), "the stop list parks and continues");
const completion = ref("completion.md");
const menu = completion.slice(completion.indexOf("1. Merge it into"), completion.indexOf("Which?"));
assert.ok(menu.includes("1. Merge it into") && menu.includes("2. Push the branch and open a pull request") && menu.includes("3. Leave it as it is, I will handle it"), "the menu has three options");
assert.ok(menu.includes("4. Run `fx-docs` on the branch") && menu.includes("5. Write ADRs for the candidates with `fx-adr`"), "the menu carries the conditional docs and ADR options");
assert.ok(!menu.includes("6. "), "the menu offers no sixth option");
assert.ok(completion.includes("Discard only when the owner asks for it: list the branch, its commits and the worktree path, and act only after the owner types the word discard."), "discard needs the listing and the typed word");
assert.ok(status.includes("Task <NN>: unparked: <owner answer>"), "status.md defines the unparked line");
assert.ok(/re-dispatch the task/i.test(status), "status.md says the unparked task is re-dispatched");
assert.ok(completion.includes("Plan complete: tasks <first> to <last> complete, final review <clean|fixed>"), "the plan-complete line carries no parked count");
assert.ok(completion.includes("Plan paused: tasks <a> to <b> complete, <K> parked, needs you"), "completion.md defines the plan-paused line");
assert.ok(completion.includes("only when no task is parked"), "Plan complete is written only with nothing parked");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8").replace(/\s+/g, " ");
assert.ok(readme.includes("three options: merge | push and open a PR | leave it. Discard happens only when you type it."), "README shows the three-option menu");
const retro = completion.indexOf("`/fx:fx-retro` reviews this build");
assert.ok(retro >= 0 && retro < completion.indexOf("1. Merge it into"), "the fx-retro line comes before the menu");
const setup = ref("setup.md").replace(/\s+/g, " ");
assert.ok(setup.includes("Before task 01, check the test command can start."), "setup.md checks the test runner before task 01");
for (const o of ["1. Install or fix the runner, then I retry (recommended)", '2. Build on review alone: every task ledgered "tests written, not run"', "3. Stop here"]) {
  assert.ok(setup.includes(o), `setup.md offers: ${o}`);
}
assert.ok(setup.includes("Ruling: test runner:"), "the answer is recorded as a Ruling line");
assert.ok(setup.includes("**Fix:** move `docs/plans/<slug>/` into the worktree"), "setup.md moves the plan dir, not copies it");
assert.ok(!/copy `docs\/plans/.test(setup), "setup.md no longer copies the plan dir");
assert.ok(setup.includes("the main checkout gets it back on merge"), "setup.md says where the plan dir returns");
console.log("ledger-lines: OK");
