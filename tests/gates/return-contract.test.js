// generated from src/tests/gates/return-contract.test.ts by scripts/build: edit there, not here
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
var path = __toESM(require("path"));
const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const MARK = "Reply with at most five lines:";
function contract(file, fields, from = 0) {
  const text = read(file);
  const at = text.indexOf(MARK, from);
  assert.ok(at >= 0, `${file}: states the five-line reply`);
  const tail = text.slice(at, at + 1200);
  for (const f of fields) assert.ok(tail.includes(f), `${file}: five-line reply names ${f}`);
  return text;
}
const REVIEWER = ["Spec", "Quality", "C/I/M", "Findings", "Ready", "plan-mandated", ", declined: <n>"];
contract("skills/fx-implement/implementer-prompt.md", ["Status", "Commits", "Tests", "Report", "Concerns"]);
contract("skills/fx-implement/task-reviewer-prompt.md", REVIEWER);
contract("skills/fx-review/reviewer-prompt.md", REVIEWER);
for (const f of ["skills/fx-implement/task-reviewer-prompt.md", "skills/fx-review/reviewer-prompt.md"]) {
  assert.ok(read(f).includes("### Declined to judge"), `${f}: the findings template has a Declined to judge section`);
}
const rr = contract("skills/fx-implement/re-review-prompt.md", ["Verdict", "Open", "Fixed", "Findings", "New breakage"]);
const skill = read("skills/fx-implement/SKILL.md");
contract("skills/fx-implement/references/coverage-audit.md", ["Gaps", "Findings", "Tasks affected", "Verdict", "Next"], 0);
const lensDispatch = read("skills/fx-implement/references/lens-dispatch.md");
const readingRules = read("skills/fx-implement/references/reading-rules.md");
const reviewSkill = read("skills/fx-review/SKILL.md");
assert.ok(!reviewSkill.includes(MARK), "Ruling R: lenses no longer carry the five-line contract");
assert.ok(/no Write tool/i.test(reviewSkill), "Ruling R: fx-review/SKILL.md says lenses have no Write tool");
assert.ok(lensDispatch.startsWith("**Lens dispatch.**"), "references/lens-dispatch.md holds the Lens dispatch paragraph");
{
  const lens = lensDispatch;
  assert.ok(lens.includes("your Write tool"), "Lens dispatch: the controller records a lens reply with its Write tool, without reasoning over it");
  assert.ok(!/<<\s*'?EOF/.test(lens), "adversarial 3: no heredoc saves a lens reply (a reply line reading EOF ends it and runs the rest)");
}
assert.ok(read("skills/fx-implement/references/review-inputs.md").includes("confirmed \u26A0\uFE0F:"), "confirming a \u26A0\uFE0F is ledgered with the finding's exact text, for the fixer and re-reviewer to read");
assert.ok(!/under 15 lines/.test(read("skills/fx-implement/implementer-prompt.md")), "implementer: the old 15-line contract is gone");
assert.ok(!/final message \*\*is\*\* the report/i.test(rr), "re-review: the final message is no longer the report");
assert.ok(/\[FINDINGS_FILE\]/.test(rr), "re-review: writes to its findings file");
for (const f of ["skills/fx-implement/task-reviewer-prompt.md", "skills/fx-review/reviewer-prompt.md", "skills/fx-implement/re-review-prompt.md"]) {
  assert.ok(read(f).includes("## Ledger lines"), `${f}: writes ready-to-copy ledger lines`);
}
const loop = read("skills/fx-implement/fix-loop.md");
if (loop.split("\n").length > 101) {
  assert.ok(/^## Contents$/m.test(loop.split("\n").slice(0, 20).join("\n")), "fix-loop.md: over 100 lines, so it opens with a ## Contents table");
}
assert.ok(!/open findings\s+verbatim/i.test(loop), "fix loop: findings go as a path, not pasted verbatim");
assert.ok(loop.includes("## Ledger lines"), "fix loop: ledgers one-liners from the findings file");
assert.ok(loop.includes("findings file(s) as a whole"), "fix loop: points the fixer at the findings file(s) as a whole");
assert.ok(rr.includes("findings file(s) as a whole"), "re-review: points at the findings file(s) as a whole");
assert.ok(rr.includes("Finding verdicts"), "re-review: names the prior re-review file's own section for round 2+");
assert.ok(rr.includes("out-of-scope"), "re-review: Ledger lines cover out-of-scope observations");
assert.ok(rr.includes("none | Minor | Important | Critical"), "re-review: New breakage states the highest severity");
const i = skill.indexOf("### Controller reading rules");
assert.ok(i >= 0, "fx-implement has a Controller reading rules section");
assert.ok(i < skill.indexOf("### 1. Dispatch the implementer"), "the rules come before the first dispatch step");
const rules = skill.slice(i, i + 3500);
for (const needle of [">>", "tail", "git log --oneline", "review-package", "five lines", "Concerns"]) {
  assert.ok(rules.includes(needle), `reading rules mention ${needle}`);
}
for (const needle of ["report contract breached", "BLOCKED", "appended line count"]) {
  assert.ok(readingRules.includes(needle), `references/reading-rules.md mentions ${needle}`);
}
for (const f of ["skills/fx-implement/task-reviewer-prompt.md", "skills/fx-review/reviewer-prompt.md", "skills/fx-implement/re-review-prompt.md"]) {
  const t = read(f);
  assert.ok(t.includes("no backticks"), `${f}: Ledger lines instructions rule out backticks`);
  assert.ok(t.includes("not three"), `${f}: Ledger lines instructions disambiguate ## from ###`);
}
assert.ok(rr.includes("ledger `<m>`"), "re-review: the Fixed field carries the ledger-line count the count check needs");
assert.ok(loop.includes("in its `Fixed` field"), "fix loop: the re-review count check reads the count from the reply, not from a count the reply lacks");
assert.ok(readingRules.includes("Fixed` field"), "reading rules: the re-reviewer count check cites the Fixed field, not counts absent from the reply");
assert.ok(!loop.toLowerCase().includes("no severity split"), "fix loop: lenses do rate severity, so this false claim is gone");
assert.ok(!rr.toLowerCase().includes("no severity split"), "re-review: lenses do rate severity, so this false claim is gone");
assert.ok(loop.includes("[Critical]") && loop.includes("[Important]"), "fix loop: routes lens findings by their own Critical/Important tags");
assert.ok(rr.includes("[Critical]") && rr.includes("[Important]"), "re-review: routes lens findings by their own Critical/Important tags");
assert.ok(lensDispatch.includes("[Minor]"), "Lens dispatch: the controller ledgers a lens's own Minor findings itself");
{
  const completion = read("skills/fx-implement/references/completion.md");
  const at = completion.indexOf("## Write the plan-complete line");
  assert.ok(at >= 0, "fx-implement has a Write the plan-complete line section");
  const nextAt = completion.indexOf("## Completion report");
  assert.ok(nextAt > at, "the plan-complete section comes before the completion report");
  const section = completion.slice(at, nextAt);
  assert.ok(/git commit/.test(section), "plan-complete section: commits the ledger itself");
  assert.ok(/git add .*state\.md/.test(section), "plan-complete section: stages state.md before committing");
}
console.log("return-contract: ok");
