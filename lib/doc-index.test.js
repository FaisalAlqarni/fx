// generated from src/lib/doc-index.test.ts by scripts/build: edit there, not here
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
var import_doc_index = require("./doc-index.js");
const ROOT = path.join(__dirname, "..");
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `fx-docidx-${name}-`));
function put(root, rel, text) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}
const OVERVIEW = [
  "Shortlinks expire after 90 days.",
  "Evidence: `engines/shortlink/app/models/link.rb:40-58` `Link#expired?`",
  "",
  "The product is sold in KSA.",
  "Evidence: owner, 2026-10-23",
  ""
].join("\n");
const ADR1 = "Status: superseded by 0002 (replaced: decisions 1; the rest carried forward).\n\n1. Keep MySQL.\n   Evidence: `db/schema.rb:1-9`\n";
const ADR2 = "Status: accepted\n\n1. Keep Postgres as the source of truth.\n   Evidence: `db/schema.rb:1-9`\n";
function tree() {
  const r = tmp("tree");
  put(r, "docs/arch/overview.md", OVERVIEW);
  put(r, "docs/adr/0001-x.md", ADR1);
  put(r, "docs/adr/0002-x.md", ADR2);
  put(r, "docs/plans/p/design.md", "A plan claim.\nEvidence: `lib/x.js`\n");
  put(r, "docs/html/a/page.md", "Html.\nEvidence: `lib/x.js`\n");
  put(r, "docs/issues/i.md", "Issue.\nEvidence: `lib/x.js`\n");
  return r;
}
const t = tree();
const idx = (0, import_doc_index.buildIndex)(t);
assert.strictEqual(idx.version, 1);
assert.deepStrictEqual(idx.claims.map((c2) => `${c2.doc}:${c2.line}`), ["docs/adr/0001-x.md:4", "docs/adr/0002-x.md:4", "docs/arch/overview.md:2", "docs/arch/overview.md:5"]);
assert.deepStrictEqual(Object.keys(idx.verified), ["docs/adr/0001-x.md", "docs/adr/0002-x.md", "docs/arch/overview.md"]);
assert.deepStrictEqual((0, import_doc_index.queryIndex)(idx, ["engines/shortlink"]).map((c2) => c2.doc), ["docs/arch/overview.md"]);
assert.deepStrictEqual((0, import_doc_index.queryIndex)(idx, ["engines/shortlink/app/models/link.rb"]).length, 1);
assert.deepStrictEqual((0, import_doc_index.queryIndex)(idx, ["app/other.rb"]), []);
assert.deepStrictEqual((0, import_doc_index.queryIndex)(idx, ["db/schema.rb"]).map((c2) => [c2.doc, c2.status]), [["docs/adr/0002-x.md", "current"]]);
assert.strictEqual((0, import_doc_index.queryIndex)(idx, ["engines", "engines/shortlink"]).length, 1, "no duplicates");
assert.strictEqual((0, import_doc_index.queryIndex)(idx, ["engines/short"]).length, 0, "a directory matches whole segments");
const dirCited = { ...idx, claims: [{ ...idx.claims[2], evidence: [{ type: "path", path: "engines/shortlink", start: null, end: null, symbol: null }] }] };
assert.strictEqual((0, import_doc_index.queryIndex)(dirCited, ["engines/shortlink/app/x.rb"]).length, 1, "a cited directory covers a path under it");
const e = tmp("empty");
put(e, "docs/readme.md", "Just prose.\n");
assert.deepStrictEqual((0, import_doc_index.buildIndex)(e), { version: 1, claims: [], problems: [], verified: { "docs/readme.md": null } });
for (const files of [[], ["docs/plans/p/plan.md"]]) {
  const n = tmp("nodocs");
  for (const f of files) put(n, f, "x\nEvidence: `a.rb`\n");
  assert.deepStrictEqual((0, import_doc_index.loadIndex)(n), { version: 1, claims: [], problems: [], verified: {} });
  assert.strictEqual(fs.existsSync(path.join(n, ".fx")), false, files.join());
}
{
  const n = tmp("prose");
  put(n, "docs/readme.md", "Just prose.\n");
  assert.deepStrictEqual((0, import_doc_index.loadIndex)(n).claims, []);
  assert.strictEqual(fs.existsSync(path.join(n, ".fx")), false, "prose-only docs");
}
const c = tree();
const file = path.join(c, ".fx", "docs-index.json");
assert.strictEqual((0, import_doc_index.loadIndex)(c).claims.length, 4);
const first = fs.readFileSync(file, "utf8");
assert.strictEqual((0, import_doc_index.loadIndex)(c).claims.length, 4);
assert.strictEqual(fs.readFileSync(file, "utf8"), first, "a second load keeps the file");
const old = new Date(Date.now() - 36e5);
fs.utimesSync(file, old, old);
const doc = path.join(c, "docs/arch/overview.md");
fs.writeFileSync(doc, OVERVIEW + "\nA third.\nEvidence: `lib/y.js`\n");
fs.utimesSync(doc, /* @__PURE__ */ new Date(), /* @__PURE__ */ new Date());
assert.strictEqual((0, import_doc_index.loadIndex)(c).claims.length, 5, "a newer doc rebuilds");
fs.unlinkSync(path.join(c, "docs/arch/overview.md"));
assert.deepStrictEqual((0, import_doc_index.loadIndex)(c).claims.map((x) => x.doc), ["docs/adr/0001-x.md", "docs/adr/0002-x.md"], "a deleted doc leaves the index");
fs.writeFileSync(file, "{not json");
assert.strictEqual((0, import_doc_index.loadIndex)(c).claims.length, 2, "an unreadable index rebuilds");
const git = (cwd, ...args) => (0, import_child_process.execFileSync)("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8" }).trim();
function repo() {
  const base = tmp("git");
  const main = (0, import_child_process.execFileSync)(path.join(ROOT, "scripts", "make-git-fixture"), [path.join(base, "f")], { encoding: "utf8" }).trim().split(" ")[0] ?? "";
  put(main, "src/code.rb", ["l1", "l2", "l3", "l4", "l5", ""].join("\n"));
  git(main, "add", ".");
  git(main, "commit", "-q", "-m", "code");
  return main;
}
function staleCase(setup, doc2, docPath = "docs/arch/a.md") {
  const r = repo();
  const sha = git(r, "rev-parse", "HEAD");
  put(r, docPath, doc2(sha));
  setup(r);
  return (0, import_doc_index.stalePassOne)(r, (0, import_doc_index.buildIndex)(r)).map((s) => [s.verdict, s.reason]);
}
const cited = (sha) => `A claim.
Evidence: \`src/code.rb:3-4\`
${sha ? `
<!-- fx-docs verified: ${sha} -->
` : ""}`;
const commit = (r) => {
  git(r, "add", ".");
  git(r, "commit", "-q", "-m", "change");
};
const none = () => void 0;
assert.deepStrictEqual(staleCase(commit, cited), [["free", "unchanged"]]);
assert.deepStrictEqual(staleCase((r) => {
  put(r, "src/code.rb", "l1\nl2\nl3\nL4\nl5\n");
  commit(r);
}, cited), [["recheck", "changed"]]);
assert.deepStrictEqual(staleCase((r) => {
  put(r, "src/code.rb", "l1\nl2\nl3\nl4\nL5\n");
  commit(r);
}, cited), [["free", "unchanged"]], "an edit below the range");
assert.deepStrictEqual(staleCase((r) => {
  put(r, "src/code.rb", "new\nl1\nl2\nl3\nl4\nl5\n");
  commit(r);
}, cited), [["recheck", "shifted"]]);
assert.deepStrictEqual(staleCase((r) => {
  git(r, "rm", "-q", "--", "src/code.rb");
  commit(r);
}, cited), [["recheck", "deleted"]]);
assert.deepStrictEqual(staleCase(none, () => cited(null)), [["recheck", "unverified"]]);
assert.deepStrictEqual(staleCase(none, () => cited("0".repeat(40))), [["recheck", "unverified"]]);
assert.deepStrictEqual(staleCase(none, () => "Owned.\nEvidence: owner, 2026-10-23\n"), [["skip", "owner"]]);
assert.deepStrictEqual(staleCase(none, () => ADR1, "docs/adr/0001-x.md"), [["skip", "superseded"]]);
assert.deepStrictEqual(staleCase((r) => {
  put(r, "src/code.rb", "l1\nl2\nl3\nl4\nL5\n");
  commit(r);
}, (s) => `A.
Evidence: \`src/code.rb\`

<!-- fx-docs verified: ${s} -->
`), [["recheck", "changed"]]);
assert.deepStrictEqual(staleCase(
  (r) => {
    put(r, "src/code.rb", "new\nl1\nl2\nl3\nl4\nl5\n");
    put(r, "src/b.rb", "x\n");
    commit(r);
  },
  (s) => `A.
Evidence: \`src/code.rb:3-4\`; \`src/b.rb\`

<!-- fx-docs verified: ${s} -->
`
), [["recheck", "changed"]], "b.rb did not exist at the verified commit");
const many = tmp("many");
put(many, "docs/a.md", Array.from({ length: 25 }, (_, i) => `Claim ${i}.
Evidence: \`app/x.rb:${i + 1}\`
`).join("\n"));
const cmd = path.join(ROOT, "scripts", "docs-index");
const out = JSON.parse((0, import_child_process.execFileSync)(cmd, ["--root", many, "query", "--limit", "20", "app/x.rb"], { encoding: "utf8" }));
assert.strictEqual(out.claims.length, 20);
assert.strictEqual(out.more, 5);
assert.strictEqual(JSON.parse((0, import_child_process.execFileSync)(cmd, ["--root", many, "query", "app"], { encoding: "utf8" })).claims.length, 20, "the default limit is 20");
const all = JSON.parse((0, import_child_process.execFileSync)(cmd, ["--root", many, "query", "--limit", "0", "app/x.rb"], { encoding: "utf8" }));
assert.strictEqual(all.claims.length, 25, "--limit 0 means no cap");
assert.strictEqual(all.more, 0);
const bad = (0, import_child_process.spawnSync)(cmd, ["frob"], { encoding: "utf8" });
assert.strictEqual(bad.status, 2);
assert.strictEqual(bad.stderr.trim(), "docs-index: usage: docs-index [--root <dir>] build | query [--limit <n>] <path>... | stale");
const prob = tmp("prob");
put(prob, "docs/a.md", "A.\nEvidence: nonsense\n");
const pr = (0, import_child_process.spawnSync)(cmd, ["--root", prob, "build"], { encoding: "utf8" });
assert.strictEqual(pr.status, 0);
assert.strictEqual(pr.stderr.trim(), "docs/a.md:2: malformed evidence line: Evidence: nonsense");
console.log("doc-index tests passed");
