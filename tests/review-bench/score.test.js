// generated from src/tests/review-bench/score.test.ts by scripts/build: edit there, not here
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
var assert = __toESM(require("assert"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_fill_template = require("./fill-template.js");
const SCORE = path.join(__dirname, "score.js");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-review-bench-score-"));
function write(name, body) {
  const p = path.join(root, name);
  fs.writeFileSync(p, body);
  return p;
}
const scoreOf = (stdout) => JSON.parse(stdout);
function run(findingsPath, matchArg) {
  const r = (0, import_child_process.spawnSync)("node", [SCORE, findingsPath, matchArg], { encoding: "utf8" });
  return r;
}
const important = write(
  "important.md",
  [
    "### Issues",
    "",
    "#### Critical (Must Fix)",
    "None.",
    "",
    "#### Important (Should Fix)",
    "- lib/store.js:10 - no containment check lets a name resolve outside NOTES_DIR",
    "",
    "#### Minor (Nice to Have)",
    "None.",
    "",
    "### Assessment",
    "**Task quality:** Needs fixes"
  ].join("\n")
);
{
  const r = run(important, "outside NOTES_DIR");
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  const out = scoreOf(r.stdout);
  assert.strictEqual(out.caught, true, "a match under Important must be caught");
  assert.strictEqual(out.important, 1);
}
const minorOnly = write(
  "minor-only.md",
  [
    "### Issues",
    "",
    "#### Critical (Must Fix)",
    "None.",
    "",
    "#### Important (Should Fix)",
    "None.",
    "",
    "#### Minor (Nice to Have)",
    "- lib/store.js:10 - no containment check lets a name resolve outside NOTES_DIR",
    "",
    "### Assessment",
    "**Task quality:** Approved"
  ].join("\n")
);
{
  const r = run(minorOnly, "outside NOTES_DIR");
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  const out = scoreOf(r.stdout);
  assert.strictEqual(out.caught, false, "a match only under Minor must not be caught");
  assert.strictEqual(out.important, 0);
}
const control = write(
  "control.md",
  [
    "### Issues",
    "",
    "#### Critical (Must Fix)",
    "None.",
    "",
    "#### Important (Should Fix)",
    "- cli.js:4 - no error handling on a missing argument",
    "",
    "#### Minor (Nice to Have)",
    "None.",
    "",
    "### Assessment",
    "**Task quality:** Needs fixes"
  ].join("\n")
);
{
  const r = run(control, "NONE");
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  const out = scoreOf(r.stdout);
  assert.strictEqual(out.caught, false, "NONE never counts as caught");
  assert.strictEqual(out.falsePositive, true, "a control finding under Important is a false positive");
  assert.strictEqual(out.important, 1);
}
const noHeadings = write(
  "no-headings.md",
  ["The reviewer wrote free-form prose: cli.js:22 lets a name escape outside NOTES_DIR."].join("\n")
);
{
  const r = run(noHeadings, "outside NOTES_DIR");
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.deepStrictEqual(scoreOf(r.stdout), { caught: true, falsePositive: false, important: 0, offTemplate: true });
  const miss = run(noHeadings, "binary");
  assert.deepStrictEqual(scoreOf(miss.stdout), { caught: false, falsePositive: false, important: 0, offTemplate: true });
}
{
  const r = run(path.join(root, "does-not-exist.md"), "outside NOTES_DIR");
  assert.strictEqual(r.status, 2, `expected exit 2, got ${r.status}: ${r.stdout}`);
}
const TEMPLATE = path.join(__dirname, "..", "..", "skills", "fx-implement", "task-reviewer-prompt.md");
{
  const raw = fs.readFileSync(TEMPLATE, "utf8");
  const body = (0, import_fill_template.extractPromptBody)(raw);
  assert.ok(body.includes("## Part 1: spec compliance"), "extracted body must be the prompt, not the whole template");
  assert.ok(!body.includes("Subagent (general-purpose):"), "extracted body must exclude the dispatch header");
  const KEYS = ["BRIEF_FILE", "REPORT_FILE", "BASE_SHA", "HEAD_SHA", "DIFF_FILE", "FINDINGS_FILE", "COST_LINE"];
  const values = {};
  for (const k of KEYS) values[k] = `SENTINEL_${k}_VALUE`;
  const filled = (0, import_fill_template.fillPlaceholders)(body, values);
  let reconstructed = filled;
  for (const k of KEYS) reconstructed = reconstructed.split(`SENTINEL_${k}_VALUE`).join(`[${k}]`);
  assert.strictEqual(reconstructed, body, "fill-template must change only the placeholder tokens, byte-identical otherwise");
}
const searchCaseMatch = fs.readFileSync(path.join(__dirname, "cases", "search-case-sensitive", "match"), "utf8").trim();
{
  const falseCatch = write(
    "search-case-false-catch.md",
    [
      "### Issues",
      "",
      "#### Critical (Must Fix)",
      "None.",
      "",
      "#### Important (Should Fix)",
      "- test/search.test.js:12 - this test case only checks the happy path, add a failing lookup case too",
      "",
      "#### Minor (Nice to Have)",
      "None."
    ].join("\n")
  );
  const r = run(falseCatch, searchCaseMatch);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.strictEqual(scoreOf(r.stdout).caught, false, 'the word "case" alone must not score as catching the case-insensitivity defect');
}
{
  const realCatch = write(
    "search-case-real-catch.md",
    [
      "### Issues",
      "",
      "#### Critical (Must Fix)",
      "None.",
      "",
      "#### Important (Should Fix)",
      "- lib/search.js:1 - search is case-sensitive: it never calls toLowerCase on the note text, only on the query",
      "",
      "#### Minor (Nice to Have)",
      "None."
    ].join("\n")
  );
  const r = run(realCatch, searchCaseMatch);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.strictEqual(scoreOf(r.stdout).caught, true, "a genuine case-folding finding must still be caught");
}
const readmeMatch = fs.readFileSync(path.join(__dirname, "cases", "readme-binary", "match"), "utf8").trim();
{
  const benign = write(
    "readme-benign.md",
    [
      "### Issues",
      "",
      "#### Critical (Must Fix)",
      "None.",
      "",
      "#### Important (Should Fix)",
      "- README.md:3 - the usage example correctly runs node cli.js add and node cli.js show",
      "",
      "#### Minor (Nice to Have)",
      "None."
    ].join("\n")
  );
  const r = run(benign, readmeMatch);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.strictEqual(scoreOf(r.stdout).caught, false, "a benign mention of node cli.js must not be a false catch");
}
{
  const realCatch = write(
    "readme-real-catch.md",
    [
      "### Issues",
      "",
      "#### Critical (Must Fix)",
      "None.",
      "",
      "#### Important (Should Fix)",
      "- README.md:3 - the example fails: it calls a `notes` binary that is never installed; it should use node cli.js instead",
      "",
      "#### Minor (Nice to Have)",
      "None."
    ].join("\n")
  );
  const r = run(realCatch, readmeMatch);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.strictEqual(scoreOf(r.stdout).caught, true, "a genuine readme-binary finding must still be caught");
}
{
  const extraTemplate = write(
    "extra-placeholder-template.md",
    [
      "```markdown",
      "Subagent (general-purpose):",
      "  prompt: |",
      "    Read the task: [TASK_FILE]",
      "    A brand new field: [NEW_PLACEHOLDER]",
      "```"
    ].join("\n")
  );
  const r = (0, import_child_process.spawnSync)("node", [path.join(__dirname, "fill-template.js"), extraTemplate], {
    encoding: "utf8",
    env: { ...process.env, TASK_FILE: "/tmp/x.md" }
  });
  assert.notStrictEqual(r.status, 0, "a leftover placeholder must fail fill-template.js");
  assert.match(r.stderr, /NEW_PLACEHOLDER/, "the failure must name the leftover token");
}
const sections = (importantLines) => [
  "### Issues",
  "",
  "#### Critical (Must Fix)",
  "None.",
  "",
  "#### Important (Should Fix)",
  ...importantLines,
  "",
  "#### Minor (Nice to Have)",
  "- cli.js:1 - a style nit that is not the defect",
  ""
].join("\n");
{
  const r = run(write("catch-only.md", sections(["- lib/store.js:10 - a name can resolve outside NOTES_DIR"])), "outside NOTES_DIR");
  const out = scoreOf(r.stdout);
  assert.strictEqual(out.caught, true);
  assert.strictEqual(out.falsePositive, false, "the catching finding alone is not a false positive");
}
{
  const r = run(write("catch-plus-other.md", sections([
    "- lib/store.js:10 - a name can resolve outside NOTES_DIR",
    "  and the check is missing entirely",
    "- cli.js:4 - no error handling on a missing argument"
  ])), "outside NOTES_DIR");
  const out = scoreOf(r.stdout);
  assert.strictEqual(out.caught, true);
  assert.strictEqual(out.falsePositive, true, "a second, non-matching Important finding is a false positive");
  assert.strictEqual(out.important, 2, "a continuation line is part of its finding, not a new one");
}
{
  const r = run(write("numbered-control.md", sections(["1. cli.js:4 - no error handling on a missing argument"])), "NONE");
  const out = scoreOf(r.stdout);
  assert.strictEqual(out.falsePositive, true, "a numbered control finding is a false positive");
  assert.strictEqual(out.important, 1, "a numbered finding is counted");
}
{
  const r = run(write("numbered-catch.md", sections([
    "1. lib/store.js:10 - a name can resolve outside NOTES_DIR",
    "2) cli.js:4 - no error handling on a missing argument"
  ])), "outside NOTES_DIR");
  const out = scoreOf(r.stdout);
  assert.strictEqual(out.caught, true);
  assert.strictEqual(out.falsePositive, true, "the second numbered finding does not match");
  assert.strictEqual(out.important, 2);
}
const caseMatch = (c) => fs.readFileSync(path.join(__dirname, "cases", c, "match"), "utf8").trim();
const caught = (name, match, line) => {
  const r = run(write(name, sections([line])), match);
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  return scoreOf(r.stdout).caught;
};
{
  const m = caseMatch("path-dotdot-only");
  const positives = [
    "- lib/store.js:6 - only rejects names containing `..`; a name like `/etc/passwd` resolves outside NOTES_DIR",
    "- lib/store.js:6 - checks name.includes('..'), but an absolute name escapes NOTES_DIR",
    "- lib/store.js:6 - a leading slash bypasses the guard",
    "- lib/store.js:6 - an absolute path is not rejected"
  ];
  positives.forEach((p, i) => assert.strictEqual(caught(`dotdot-pos-${i}.md`, m, p), true, `must catch: ${p}`));
  assert.strictEqual(
    caught("dotdot-neg.md", m, '- lib/store.js:5 - the error message "bad name" does not say which name was rejected'),
    false,
    "a finding about store.js that does not name the escape must not be caught"
  );
}
{
  const m = caseMatch("readme-binary");
  const positives = [
    "- README.md:3 - runs `notes add`, but the design says there is no package binary; use `node cli.js add`",
    "- README.md:3 - uses a `notes` command that does not exist; it should be `node cli.js add`",
    "- README.md:3 - the task says there is no installed binary",
    "- README.md:3 - notes: command not found",
    "- README.md:6-7 \xB7 the example calls a nonexistent `notes` binary, so it fails when pasted",
    "- README.md:5-6 \xB7 The example uses a non-existent `notes` command."
  ];
  positives.forEach((p, i) => assert.strictEqual(caught(`readme-pos-${i}.md`, m, p), true, `must catch: ${p}`));
  assert.strictEqual(
    caught("readme-neg.md", m, "- README.md:3 - the Usage heading has no sentence saying what `show` prints for a missing note"),
    false,
    "a finding about the README that does not name the missing binary must not be caught"
  );
}
{
  const r = run(write("minor-only.md", ["### Issues", "", "#### Minor (Nice to Have)", "", "- cli.js:1 - the commit message differs from the brief"].join("\n")), "escape");
  assert.strictEqual(r.status, 0, `expected exit 0, got ${r.status}: ${r.stderr}`);
  assert.deepStrictEqual(scoreOf(r.stdout), { caught: false, falsePositive: false, important: 0 });
}
fs.rmSync(root, { recursive: true, force: true });
console.log("score.test.js: ok");
