// generated from src/tests/gates/docs-lanes.test.ts by scripts/build: edit there, not here
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
const raw = (p) => fs.readFileSync(path.join(root, p), "utf8");
const read = (p) => raw(p).replace(/\s+/g, " ");
const has = (file, text, rule) => assert.ok(read(file).includes(text), `${file}: ${rule}`);
const section = (file, heading) => {
  const text = raw(file);
  const at = text.indexOf(`${heading}
`);
  assert.ok(at >= 0, `${file}: has ${heading}`);
  const rest = text.slice(at + heading.length + 1);
  const end = rest.search(/^#{1,6} /m);
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, " ");
};
const docs = "skills/fx-docs/SKILL.md";
const finalReview = "skills/fx-implement/references/final-review.md";
const completion = "skills/fx-implement/references/completion.md";
for (const f of ["commands/fx-retro.md", "skills/fx-retro/SKILL.md"]) {
  assert.ok(section(f, "## Read").includes("`docs/issues/`"), `${f}: the retro reads the bug reports in docs/issues/`);
}
assert.ok(
  section("skills/fx-debug/SKILL.md", "### Inputs that shape the loop").includes("`docs/issues/`"),
  "fx-debug reads past bug reports in docs/issues/"
);
has(
  "skills/fx-adr/SKILL.md",
  "The docs index reads an ADR only under a folder named `adr` or `decisions`",
  "fx-adr says which ADR folders the docs index recognises"
);
has(
  completion,
  "When the docs step did not run, list every `Docs claim wrong:` ledger line",
  "the completion Docs bullet lists Docs claim wrong lines when the step did not run"
);
has(finalReview, "Docs: not run: no evidence-bearing docs", "the ledger skip wording names evidence-bearing docs");
assert.ok(!read(finalReview).includes("Docs: not run: no docs/"), `${finalReview}: the old "no docs/" wording is gone`);
has(finalReview, '"docs_first_run": "declined"', "a declined first run is recorded in .fx.json");
has(docs, "says yes to fx-implement's first-run offer", "fx-docs names the first-run offer as a full-run trigger");
assert.ok(!/owner away/i.test(read(finalReview)), `${finalReview}: no "owner away" skip`);
has(finalReview, "Docs: offer pending", "an offer the controller cannot put now is ledgered as pending");
has(finalReview, "Never ledger `Docs: not run` without the owner's answer or the declined key", "not run needs an answer or the declined key");
has(completion, "Run `fx-docs` on the branch", "a pending docs offer is a completion menu option");
has(completion, "**ADR candidates**", "the completion report has an ADR candidates section");
has(completion, "ADR candidates: none", "zero candidates are stated, not omitted");
has(completion, "Write ADRs for the candidates with `fx-adr`", "the ADR offer is a completion menu option");
has("skills/fx-docs/full-run.md", "Every question carries a recommended answer", "full-run interview questions carry a recommended answer");
has("skills/fx-docs/full-run.md", "or take the recommended answer for every question", "the interview offer includes taking every recommended answer");
has(docs, "each with a recommended answer", "branch-mode questions carry a recommended answer");
has(docs, "docs-index --root <worktree> stale", "branch mode step 3 runs the stale check");
has(docs, "every `recheck` claim in a doc outside the step 2 set", "step 3 lists recheck claims outside the touched docs");
for (const f of [docs, finalReview]) has(f, "<n> listed stale, <n> HTML pages out of date", "the Docs line counts out-of-date HTML pages");
has(docs, "docs-index --root <repo> verify <adr path>", "fx-docs records a verified ADR with docs-index verify");
for (const f of [docs, finalReview]) {
  has(f, "git diff --no-renames <merge-base>...HEAD --name-only", "the changed-path list keeps both sides of a rename");
  assert.ok(!read(f).includes("git diff <merge-base>...HEAD --name-only"), `${f}: no changed-path list with rename detection`);
}
has(docs, "annotate only the docs this change touches", "update the docs without evidence lines stays scoped");
{
  const old = raw("docs/adr/0015-artifacts-live-in-the-repository.md");
  const neu = raw("docs/adr/0061-the-visual-kit-replaces-the-tailwind-and-mermaid-reports.md");
  const replaced = /^Status: Superseded by 0061 \(replaced: "(.+)"; the rest carried forward\)\.$/m.exec(old)?.[1];
  const supersedes = /^Supersedes: 0015 \(decision: "(.+)"\)$/m.exec(neu)?.[1];
  assert.ok(replaced && replaced === supersedes, `0015 and 0061 quote one replaced clause: ${replaced} | ${supersedes}`);
  assert.ok(old.replace(/\s+/g, " ").includes(replaced), "0015 holds the quoted clause");
  const decisions = neu.slice(neu.indexOf("## Decision"));
  assert.ok(!decisions.replace(/\s+/g, " ").includes(replaced), "0061 keeps no live copy of the replaced clause");
}
has(
  "docs/adr/0060-templates-live-in-one-folder-and-scratch-is-retired.md",
  "and in fx-setup's one-time migration step",
  "decision 3 names fx-setup's migration step"
);
assert.ok(/^## Branch pass$/m.test(raw(finalReview)), `${finalReview}: the branch pass sits under its own heading`);
console.log("docs-lanes: OK");
