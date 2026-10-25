// generated from src/lib/doc-evidence.test.ts by scripts/build: edit there, not here
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
var import_doc_evidence = require("./doc-evidence.js");
const SHA = "3f2c1a9e0b7d4c6a8e1f2b3c4d5e6f708192a3b4";
const PATH_DOC = [
  "Shortlinks expire after 90 days unless the plan says otherwise.",
  "Evidence: `engines/shortlink/app/models/link.rb:40-58` `Link#expired?`; `config/plans.yml:12`",
  ""
].join("\n");
const OWNER_DOC = "The product is sold to banks and financing companies in KSA.\nEvidence: owner, 2026-10-23\n";
const p = (0, import_doc_evidence.parseDoc)("docs/a.md", PATH_DOC);
assert.deepStrictEqual(p.problems, []);
assert.deepStrictEqual(p.claims, [{
  doc: "docs/a.md",
  line: 2,
  text: "Shortlinks expire after 90 days unless the plan says otherwise.",
  kind: "doc",
  status: "current",
  evidence: [
    { type: "path", path: "engines/shortlink/app/models/link.rb", start: 40, end: 58, symbol: "Link#expired?" },
    { type: "path", path: "config/plans.yml", start: 12, end: 12, symbol: null }
  ]
}]);
assert.deepStrictEqual((0, import_doc_evidence.parseDoc)("docs/a.md", OWNER_DOC).claims[0]?.evidence, [{ type: "owner", date: "2026-10-23" }]);
const w = (0, import_doc_evidence.parseDoc)("docs/a.md", "> **Note**\n> Retries stop\n> after three tries.\n> Evidence: `lib/retry.js`\n");
assert.deepStrictEqual(
  w.claims.map((c) => [c.text, c.evidence]),
  [["**Note** Retries stop after three tries.", [{ type: "path", path: "lib/retry.js", start: null, end: null, symbol: null }]]]
);
const bad = (0, import_doc_evidence.parseDoc)("docs/a.md", "\n\n\n\n\nA claim.\nEvidence: link.rb line 40\n");
assert.deepStrictEqual(bad.claims, []);
assert.deepStrictEqual(bad.problems, [{ doc: "docs/a.md", line: 7, message: "malformed evidence line: Evidence: link.rb line 40" }]);
assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/a.md", `${PATH_DOC}
<!-- fx-docs verified: ${SHA} -->
`).verified, SHA);
assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/a.md", PATH_DOC).verified, null);
assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/a.md", "<!-- fx-docs verified: abc123 -->\n").verified, null, "a short sha is no marker");
const fenced = (0, import_doc_evidence.parseDoc)("docs/a.md", `\`\`\`markdown
${PATH_DOC}
<!-- fx-docs verified: ${SHA} -->
Evidence: nonsense
\`\`\`
`);
assert.deepStrictEqual(fenced, { claims: [], problems: [], verified: null });
const ADR2 = [
  "# 2. Source of truth",
  "",
  "## Status",
  "",
  "Accepted",
  "",
  "## Decisions",
  "",
  "1. Keep Postgres as the source",
  "   of truth.",
  "   Evidence: `db/schema.rb:1-9`",
  ""
].join("\n");
const a2 = (0, import_doc_evidence.parseDoc)("docs/adr/0002-x.md", ADR2);
assert.strictEqual(a2.claims.length, 1);
assert.strictEqual(a2.claims[0]?.kind, "adr");
assert.strictEqual(a2.claims[0]?.status, "current");
assert.strictEqual(a2.claims[0]?.text, "1. Keep Postgres as the source of truth.");
const decision = "\n1. Use X.\n   Evidence: `a.rb`\n";
for (const status of [
  "Status: superseded by 0002 (replaced: decisions 1; the rest carried forward).",
  "## Status\n\nSuperseded by 0002",
  "- **Status:** SUPERSEDED BY 0002"
]) {
  assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/adr/0001-x.md", status + decision).claims[0]?.status, "superseded", status);
}
assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/adr/0001-x.md", "Status: accepted" + decision).claims[0]?.status, "current");
assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/decisions/0001-x.md", "Status: accepted" + decision).claims[0]?.kind, "adr");
assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/arch/0001-x.md", "Status: superseded by 2" + decision).claims[0]?.status, "current", "only ADR docs carry a status");
assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/arch/adr.md", "x\nEvidence: `a.rb`\n").claims[0]?.kind, "doc", "a file named adr is not an adr folder");
for (const status of ["Status: Partly superseded by 0005: decisions 2 and 4", "## Status\n\nPartly superseded by 0005"]) {
  assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/adr/0001-x.md", status + decision).claims[0]?.status, "current", status);
}
for (const status of ["Status: Deprecated", "Status: Ignored", "## Status\n\nSuperseded"]) {
  assert.strictEqual((0, import_doc_evidence.parseDoc)("docs/adr/0001-x.md", status + decision).claims[0]?.status, "superseded", status);
}
console.log("doc-evidence tests passed");
