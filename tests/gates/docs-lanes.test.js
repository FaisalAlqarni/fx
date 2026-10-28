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
has(docs, "The full run is `/fx:fx-system-flow`, which the owner types; a lane cannot invoke it (ADR 0055).", "fx-docs names the user-invoked full run and never runs it");
has(finalReview, "/fx:fx-system-flow", "the first-run offer names the user-invoked full run");
assert.ok(!/owner away/i.test(read(finalReview)), `${finalReview}: no "owner away" skip`);
has(finalReview, "Docs: offer pending", "an offer the controller cannot put now is ledgered as pending");
has(finalReview, "Never ledger `Docs: not run` without the owner's answer or the declined key", "not run needs an answer or the declined key");
has(completion, "Run `fx-docs` on the branch", "a pending docs offer is a completion menu option");
has(completion, "**ADR candidates**", "the completion report has an ADR candidates section");
has(completion, "ADR candidates: none", "zero candidates are stated, not omitted");
has(completion, "Write ADRs for the candidates with `fx-adr`", "the ADR offer is a completion menu option");
has("skills/fx-system-flow/interview.md", "Every question carries a recommended answer", "full-run interview questions carry a recommended answer");
has("skills/fx-system-flow/interview.md", "or take the recommended answer for every question", "the interview offer includes taking every recommended answer");
has(docs, "each with a recommended answer", "branch-mode questions carry a recommended answer");
has(docs, "docs-index --root <worktree> stale", "branch mode step 3 runs the stale check");
has(docs, "every `recheck` claim in a doc outside the step 2 set", "step 3 lists recheck claims outside the touched docs");
for (const f of [docs, finalReview]) has(f, "<n> listed stale, <n> HTML pages out of date", "the Docs line counts out-of-date HTML pages");
has(docs, "system-flow --root <worktree> query --diff <merge-base>", "the model path starts from the branch diff");
for (const t of [
  "build --only",
  "--archify",
  "added",
  "/fx:fx-system-flow",
  "Docs: <n> model items updated, <n> listed stale, <n> uncovered, <n> inventory added, <n> diagrams rebuilt"
]) has(docs, t, `the model path names ${t}`);
has(docs, "In a repo with a system model, the model path runs first and the Markdown path runs after it", "the two paths run in order");
has(docs, "The Markdown path skips every file that carries `<!-- fx-system-flow generated`", "the Markdown path skips generated files, keyed on the marker alone");
has(docs, "For each new engine, job or integration among the added paths, add an inventory entry", "new engines, jobs and integrations get inventory entries");
has(docs, "Write a new doc only in a repo without a system model; with one, the inventory entry from the model path is the one record", "a model repo gets no second, hand-written record of a new engine");
assert.ok(!read(docs).includes("full-run.md"), `${docs}: no link to the removed full-run.md`);
assert.ok(!fs.existsSync(path.join(root, "skills/fx-docs/full-run.md")), "full-run.md is gone");
has(docs, "(./html-pages.md)", "fx-docs still links html-pages.md");
has(docs, "only in a repo without a system model", "the HTML pages stay for a repo without a model");
has("skills/fx-docs/html-pages.md", "only in a repo without a system model", "html-pages.md says when it applies");
has(finalReview, "Docs: <n> model items updated", "the branch offer ledger follows the model-path line");
{
  const adr62 = raw("docs/adr/0062-fx-docs-keeps-docs-on-evidence-lines-and-the-docs-step-is-offered.md");
  assert.ok(/^Status: Superseded by 0066 \(replaced: decisions 2, 4; the rest carried forward\)/m.test(adr62), "0062 reads as superseded by 0066");
  const adr66 = raw("docs/adr/0066-a-system-model-is-the-record-for-the-system-flow-site.md");
  assert.ok(/^Supersedes: 0062/m.test(adr66), "0066 supersedes 0062");
  assert.ok(adr66.includes("`<docs_dir>/system/`"), "0066 records the Markdown location rule");
  assert.ok(raw("docs/adr/index.md").includes("](0066-a-system-model-is-the-record-for-the-system-flow-site.md)"), "the index links 0066");
}
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
{
  const sf = "skills/fx-system-flow";
  const all = (file, texts) => {
    for (const t of texts) has(`${sf}/${file}`, t, `holds ${t}`);
  };
  all("planning.md", [
    "start-what",
    "start-parts",
    "start-request",
    "start-code",
    '"schemaVersion": 2',
    "the main request",
    "one writer per chapter",
    '"name"',
    '"intro"',
    "120 to 200 words",
    "at least 100 words"
  ]);
  all("area-brief.md", [
    "## Prose",
    "2 to 4 sentences",
    "4 to 8 bullets",
    "at most 40 words",
    "120 to 200 words",
    "at least 100 words",
    "one sentence of 6 to 30 words",
    "`look`",
    "`short`",
    "`reply`",
    "`codeMap`",
    "Prose: <chapter ids written>",
    "Glossary candidates",
    'no "who uses it"'
  ]);
  all("fragment-guide.md", [
    "`look`",
    "`service`",
    "`store`",
    "`client`",
    "`external`",
    "`security`",
    "`term:<id>`",
    "`code:<id>`",
    "chapters.json declares every section",
    "a scalar set in two fragments is an error"
  ]);
  all("check-and-report.md", [
    "Prose",
    "words per chapter",
    "glossary",
    "lifelines",
    "at most 2 rounds",
    "merge the chapter into a neighbour, or drop it",
    "There is no flag that waives the floor",
    "a chapter with the 120 to 200 words warning goes back to its writer once",
    "ask each area for more glossary candidates, one round"
  ]);
  all("interview.md", ["at least 100 words", "goes back to its writer"]);
  all("SKILL.md", ["system-flow migrate", "Bring the prose up to date", "glossary.json", "only on a clean working tree", "git restore -- <site>/model/fragments"]);
  for (const f of ["area-brief.md", "planning.md"]) all(f, ["fx-humanize", "before returning"]);
  all("planning.md", [
    "The agent that writes chapter prose, leads, bullets, captions, glossary definitions and code-map lines invokes `fx-humanize` on it before returning.",
    "The controller does the same for the Start here prose and the glossary it writes."
  ]);
  all("area-brief.md", [
    "invoke it on the chapter prose, leads, bullets, captions, glossary candidates and code-map lines before returning.",
    "Every node and participant carries `look`; every message carries `label`",
    "`short` (the code-ish name on the arrow), and `reply` set to `true` on a reply.",
    "one `codeMap` entry for each folder of your area that a newcomer opens first: `root`, `path` (a folder ending in `/`), `owns` (one sentence) and evidence"
  ]);
  all("fragment-guide.md", [
    "`look` is required on every node and participant.",
    "| `service` | code of this system: a service, job, worker, controller |",
    "| `store` | a database, cache, queue or file store |",
    "| `client` | a browser, phone app or other caller of the system |",
    "| `external` | a system outside this one |",
    "| `security` | an identity or access check |"
  ]);
  all("check-and-report.md", [
    "words per chapter (id, words, lead sentences, bullets), the average words per chapter, the glossary size and the lifelines drawn inline.",
    "**Prose:** a block beside Depth, from `BuildResult.prose`"
  ]);
  has(docs, "every node or participant it adds carries `look`", "fx-docs sets look on what it adds");
  has(docs, "Bring the prose up to date", "fx-docs points a prose floor failure to the rerun choice");
  has(docs, "system-flow migrate", "fx-docs names the migrate hint it stops on");
  has(`${sf}/check-and-report.md`, "section <id>: <n> words of lead, bullets and not owned; at least 100 required", "the floor message is quoted");
  const adr66 = "docs/adr/0066-a-system-model-is-the-record-for-the-system-flow-site.md";
  for (const t of ["site template", "Start here", "schema version 2", "lifelines"]) has(adr66, t, `ADR 0066 holds ${t}`);
  const adr = raw(adr66);
  const nums = (body) => [...body.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
  const decision = nums(adr.slice(adr.indexOf("## Decision"), adr.indexOf("## Still in force")));
  const kept = nums(adr.slice(adr.indexOf("## Still in force"), adr.indexOf("## Consequences")));
  const wanted = (n, from) => Array.from({ length: n }, (_, i) => from + i);
  assert.deepStrictEqual(decision, wanted(decision.length, 1), "ADR 0066 Decision is numbered from 1 with no gap");
  assert.deepStrictEqual(kept, wanted(kept.length, decision.length + 1), "ADR 0066 Still in force continues the numbering with no gap");
  assert.ok(kept.length === 5, "ADR 0066 still carries the five decisions of 0062");
  for (const f of ["SKILL.md", "planning.md", "area-brief.md", "fragment-guide.md", "check-and-report.md", "interview.md"].map((n) => `${sf}/${n}`).concat([docs, adr66])) {
    assert.ok(!/[\u2013\u2014]/.test(raw(f)), `${f}: no en or em dash`);
  }
}
console.log("docs-lanes: OK");
