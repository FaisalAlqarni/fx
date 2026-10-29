// generated from src/scripts/system-flow-markdown.test.ts by scripts/build: edit there, not here
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
var import_doc_evidence = require("../lib/doc-evidence.js");
var import_json = require("../lib/json.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const GEN = "<!-- fx-system-flow generated: edit the model, then rebuild -->";
const F = "docs/system-flow/model/fragments";
const built = (change = () => void 0) => {
  const f2 = (0, import_sf_fixture.sfFixture)();
  f2.goodSet();
  change(f2);
  const r = f2.run(["build"]);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  return f2;
};
const read = (f2, rel) => fs.readFileSync(path.join(f2.host, "docs/system", rel), "utf8");
const lines = (f2, rel) => read(f2, rel).split("\n");
const model = (f2) => (0, import_json.parseJson)(fs.readFileSync(path.join(f2.host, "docs/system-flow/model/system-model.json"), "utf8"));
const f = built();
for (const rel of ["start-here/index.md", "start-here/start-what.md", "start-here/start-parts.md", "start-here/start-request.md", "start-here/start-code.md", "s1.md", "glossary.md"]) {
  assert.ok(read(f, rel).includes(GEN), `${rel} is written with the marker`);
}
{
  const targets = [...read(f, "index.md").matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  for (const t of ["start-here/index.md", "glossary.md"]) {
    assert.ok(targets.includes(t), `index.md links ${t}
${targets.join("\n")}`);
    assert.ok(fs.existsSync(path.join(f.host, "docs/system", t)), `${t} is written`);
  }
}
{
  const l = lines(f, "s1.md");
  const q = l.indexOf("Where do links expire?");
  assert.ok(q > 0, "the question is there");
  const lead = model(f).sections.find((s) => s.id === "s1")?.lead;
  assert.strictEqual(l[q + 1], "");
  assert.strictEqual(l[q + 2], lead);
}
{
  const l = lines(f, "start-here/start-what.md");
  const h = l.indexOf("## Not owned here");
  assert.ok(h > 0, "the heading is there");
  const rest = l.slice(h + 1, l.findIndex((x, i) => i > h && x.startsWith("[")));
  assert.strictEqual(rest.filter((x) => x.startsWith("- ")).length, 2);
  assert.strictEqual(rest.filter((x) => x.startsWith("  Evidence: ")).length, 2);
}
{
  const l = lines(f, "start-here/start-code.md");
  assert.ok(l.includes("| Store kind | Rows | Shown in |"), "stores overview header");
  assert.ok(l.some((x) => x.startsWith("| sql | 1 |")), "one sql row");
  assert.ok(l.includes("- Store keys read table:column."), "the conventions note");
  assert.ok(l.includes("| Folder | What it owns | Start reading at |"), "code map header");
  assert.ok(l.includes("| app/ | The application code. | `app/x.rb:1-4` `Link` |"), l.join("\n"));
}
{
  const l = lines(f, "start-here/start-request.md");
  const summary = model(f).sequences.find((q) => q.id === "turn")?.summary;
  const fence = l.indexOf("```mermaid");
  assert.ok(fence > 0, "a Mermaid block");
  assert.strictEqual(l[fence - 1], `_${summary}_`);
}
{
  const g = built((x) => {
    const o = (0, import_json.parseJson)(fs.readFileSync(path.join(x.host, F, "glossary.json"), "utf8"));
    o.glossary[2].term = "a|b";
    x.fragment("glossary", o);
  });
  const l = lines(g, "glossary.md");
  assert.strictEqual(l[0], "# Glossary");
  const rows = l.filter((x) => x.startsWith("| ")).slice(2);
  assert.strictEqual(rows.length, 15, rows.join("\n"));
  const terms = rows.map((r) => /^\| ((?:\\\||[^|])*) \|/.exec(r)?.[1]);
  const sorted = [...terms].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  assert.deepStrictEqual(terms, sorted);
  assert.ok(terms.includes("a\\|b"), terms.join(","));
  assert.ok(rows.every((r) => r.includes("Evidence") === false && /`[^`]+`/.test(r)), "each row holds its evidence");
  assert.strictEqual(l.filter((x) => x.startsWith("  Evidence: ")).length, 15);
}
{
  const m = model(f);
  const count = (items) => items.filter((i) => (i.evidence ?? []).length > 0).length;
  const sec = (id) => m.sections.find((s) => s.id === id);
  const expect = {
    "s1.md": count(sec("s1").bullets),
    "start-here/start-what.md": count(sec("start-what").bullets) + count(sec("start-what").notOwned),
    "glossary.md": count(m.glossary)
  };
  for (const [rel, n] of Object.entries(expect)) {
    const p = (0, import_doc_evidence.parseDoc)(rel, read(f, rel));
    assert.deepStrictEqual(p.problems, [], `${rel} parses clean`);
    assert.strictEqual(p.claims.length, n, `${rel} evidence claims`);
    assert.ok(p.claims.every((c) => c.evidence.length > 0));
  }
}
{
  const x = (0, import_sf_fixture.sfFixture)();
  x.goodSet();
  x.put("host", "docs/system/glossary.md", "# Mine\n");
  x.commit("host", "hand written");
  const r = x.run(["build"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.strictEqual(r.stderr, "system-flow: build: docs/system/glossary.md exists without the generated marker; move it, or set system_flow.output.markdown, then rebuild\n");
  assert.strictEqual(read(x, "glossary.md"), "# Mine\n");
}
console.log("system-flow-markdown.test.js: OK");
