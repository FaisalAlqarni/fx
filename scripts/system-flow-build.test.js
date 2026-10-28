// generated from src/scripts/system-flow-build.test.ts by scripts/build: edit there, not here
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
var import_sf_markdown = require("../lib/sf-markdown.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const F = "docs/system-flow/model/fragments";
const GEN = "<!-- fx-system-flow generated: edit the model, then rebuild -->";
const ev = (p, lines2, symbol, root) => [{ ...root === void 0 ? {} : { root }, path: p, lines: lines2, symbol }];
function setup(t = {}) {
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("meta", { schemaVersion: 1, meta: { roots: [{ id: "backend" }, { id: "guide" }] } });
  f.fxJson({ system_flow: { roots: { guide: "../guide" } } });
  f.fragment("chapters", {
    sections: [{
      id: "s1",
      title: "Links",
      question: "Where do links expire?",
      ...t.folder === void 0 ? {} : { folder: t.folder },
      bullets: [
        { id: "b1", text: t.bullet ?? "A link expires after 30 days.", evidence: [{ path: "app/x.rb", lines: "1,4", symbol: "expired?" }] },
        { id: "b2", text: "The guide explains it.", evidence: ev("README.md", "1", "Guide", "guide") }
      ]
    }]
  });
  f.fragment("flows", {
    sequences: [{
      id: "turn",
      title: "Turn",
      chapter: "s1",
      participants: [{ id: "api", label: t.api ?? "API", evidence: ev("app/x.rb", "1", "Link") }, { id: "db", label: "DB", evidence: ev("app/y.rb", "1", "Y") }],
      messages: [
        { n: 1, from: "api", to: "db", label: t.label ?? "Reads link", evidence: ev("app/x.rb", "4", "expired?") },
        { n: 2, from: "db", to: "api", label: "Returns row", mode: "async", evidence: ev("app/y.rb", "1", "Y") }
      ]
    }],
    stores: { sql: [{ id: "links-table", table: "links", evidence: ev("app/y.rb", "1", "Y") }] },
    storeFlows: [{
      id: "first",
      trigger: "A link is opened",
      chapter: "s1",
      steps: [
        { n: 1, actor: "api", op: "read", store: "sql", key: t.key ?? "links:{id}", evidence: ev("app/x.rb", "4", "expired?") },
        { n: 2, actor: "api", op: "write", store: "sql", key: "links:{id}", evidence: ev("app/x.rb", "4", "expired?") }
      ]
    }]
  });
  return f;
}
const read = (f, rel) => fs.readFileSync(path.join(f.host, rel), "utf8");
const lines = (f, rel) => read(f, rel).split("\n");
const built = (f) => {
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 0, `build exits 0
${r.stdout}${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const snapshot = (f) => {
  const out = {};
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(f.host, rel), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${rel}/${e.name}`);
      else out[`${rel}/${e.name}`] = read(f, `${rel}/${e.name}`);
    }
  };
  if (fs.existsSync(path.join(f.host, "docs"))) walk("docs");
  return out;
};
const fragments = (f) => Object.fromEntries(Object.entries(snapshot(f)).filter(([k]) => k.startsWith(`${F}/`)));
const verifiedOf = (f) => {
  const out = {};
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === "object" && v !== null) {
      const o = v;
      if (typeof o.id === "string" && Array.isArray(o.evidence)) out[o.id] = o.verified;
      Object.values(o).forEach(walk);
    }
  };
  for (const n of fs.readdirSync(path.join(f.host, F))) walk((0, import_json.parseJson)(read(f, `${F}/${n}`)));
  return out;
};
assert.strictEqual(setup().run(["nope"]).status, 2);
{
  const f = setup();
  const head = f.git("host", "rev-parse", "HEAD");
  const guideHead = f.git("guide", "rev-parse", "HEAD");
  const result = built(f);
  assert.deepStrictEqual([result.ok, result.collisions, result.diagrams.map((d) => d.name), result.layout.map((l) => l.key), typeof result.pageBytes], [true, [], ["arch-system", "seq-turn", "flow-first"], ["level-system", "seq-turn", "flow-first"], "number"]);
  assert.ok(result.written.includes("docs/system/s1.md"), result.written.join(","));
  const s1 = lines(f, "docs/system/s1.md");
  assert.strictEqual(s1.find((l) => l !== "" && !l.startsWith("#")), "Where do links expire?");
  const at = (text2) => s1.indexOf(text2);
  assert.strictEqual(s1[at("- A link expires after 30 days.") + 1], "  Evidence: `app/x.rb:1` `expired?`; `app/x.rb:4` `expired?`");
  assert.strictEqual(s1[at("- The guide explains it.") + 1], "  Evidence: `@guide/README.md:1` `Guide`");
  const parsed = (0, import_doc_evidence.parseDoc)("docs/system/s1.md", read(f, "docs/system/s1.md"));
  assert.deepStrictEqual(parsed.problems, []);
  assert.deepStrictEqual(parsed.claims.flatMap((c) => c.evidence.map((e) => e.type === "path" ? e.path : "")), ["app/x.rb", "app/x.rb", "@guide/README.md"]);
  const tail = s1.filter((l) => l !== "").slice(-2);
  assert.deepStrictEqual(tail, [GEN, `<!-- fx-docs verified: ${head} -->`]);
  const text = read(f, "docs/system/s1.md");
  assert.ok(text.includes("```mermaid\nsequenceDiagram\n"), "a mermaid block");
  const header = s1.indexOf("| # | From | To | Message | Evidence |");
  assert.ok(header > 0 && s1[header + 2]?.startsWith("| 1 |") && s1[header + 3]?.startsWith("| 2 |") && s1[header + 4] === "", "two message rows");
  assert.ok(s1.includes("| # | Actor | Op | Store | Key | When | Evidence |"), "store flow table");
  const index = lines(f, "docs/system/index.md");
  assert.ok(index.some((l) => l.includes("(s1.md)")), "index links s1.md");
  assert.ok(index.some((l) => l.includes("(../system-flow/index.html)")), "index links the site");
  assert.ok(s1.includes("[Figures for this chapter in the site](../system-flow/index.html#s1)"), "s1.md links its figure");
  assert.ok(read(f, "docs/system/stores.md").split("\n").some((l) => l.startsWith("| links-table | links |")), "stores.md row");
  for (const doc of ["components", "stores"]) assert.ok(read(f, `docs/system/${doc}.md`).includes(GEN), doc);
  const readme = read(f, "docs/system-flow/README.md");
  for (const word of ["system-flow check", "system-flow build", "fragments are the record", "index.html", "diagrams/", "system-model.json", "Markdown"]) assert.ok(readme.includes(word), word);
  assert.ok(readme.includes(GEN));
  const model = (0, import_json.parseJson)(read(f, "docs/system-flow/model/system-model.json"));
  assert.strictEqual(model.generated, true);
  assert.strictEqual(model.sections[0]?.bullets.length, 2);
  assert.strictEqual(model.levels.diagrams.length, 1);
  const v = verifiedOf(f);
  assert.deepStrictEqual(v.b1, { backend: head });
  assert.deepStrictEqual(v.b2, { guide: guideHead });
  assert.deepStrictEqual(v.link, { backend: head });
  const before = snapshot(f);
  assert.deepStrictEqual(built(f).written, []);
  assert.deepStrictEqual(snapshot(f), before);
}
{
  const f = setup();
  const c0 = f.git("host", "rev-parse", "HEAD");
  f.put("host", "NOTES.md", "later\n");
  const c1 = f.commit("host", "later");
  built(f);
  assert.ok(read(f, "docs/system/s1.md").includes(`verified: ${c1} -->`));
  const chapters = (0, import_json.parseJson)(read(f, `${F}/chapters.json`));
  chapters.sections[0].bullets[0].verified = { backend: c0 };
  f.fragment("chapters", chapters);
  built(f);
  assert.ok(read(f, "docs/system/s1.md").includes(`<!-- fx-docs verified: ${c0} -->`));
}
{
  const f = setup();
  f.put("host", "docs/system/s1.md", "# Mine\n\nHand written.\n");
  f.commit("host", "hand written doc");
  const before = fs.readFileSync(path.join(f.host, F, "level0.json"), "utf8");
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.strictEqual(r.stderr, "system-flow: build: docs/system/s1.md exists without the generated marker; move it, or set system_flow.output.markdown, then rebuild\n");
  assert.strictEqual(read(f, "docs/system/s1.md"), "# Mine\n\nHand written.\n");
  assert.strictEqual(fs.readFileSync(path.join(f.host, F, "level0.json"), "utf8"), before, "no stamps");
}
{
  const f = setup();
  built(f);
  f.put("host", "app/x.rb", "class Link\nend\n");
  const before = snapshot(f);
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.split("\n").some((l) => l.endsWith("app/x.rb has uncommitted changes")), r.stderr);
  assert.deepStrictEqual(snapshot(f), before);
}
{
  const f = setup();
  const chapters = (0, import_json.parseJson)(read(f, `${F}/chapters.json`));
  chapters.sections[0].bullets[0].evidence = ev("app/x.rb", "40-50", "expired?");
  f.fragment("chapters", chapters);
  const before = snapshot(f);
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /range outside file/);
  assert.deepStrictEqual(snapshot(f), before, "nothing written");
}
{
  const f = setup();
  const dir = path.join(f.host, "docs/system");
  fs.mkdirSync(dir, { recursive: true });
  const before = fragments(f);
  fs.chmodSync(dir, 320);
  try {
    const r = f.run(["build"]);
    assert.strictEqual(r.status, 1, r.stdout);
    assert.deepStrictEqual(fragments(f), before);
    assert.ok(Object.values(verifiedOf(f)).every((v) => v === void 0), "no verified field");
  } finally {
    fs.chmodSync(dir, 448);
  }
}
{
  const f = setup({ label: "a|b", key: "user:{id}|v2" });
  built(f);
  const s1 = lines(f, "docs/system/s1.md");
  const row = s1.find((l) => l.startsWith("| 1 | API"));
  assert.ok(row?.includes("| a\\|b |"), row);
  assert.strictEqual(row?.split(/(?<!\\)\|/).length, 5 + 2, "five cells");
  assert.ok(s1.some((l) => l.includes("| user:{id}\\|v2 |")));
}
{
  const f = setup({ label: "one\ntwo" });
  built(f);
  assert.ok(lines(f, "docs/system/s1.md").some((l) => l.includes("| one two |")));
}
{
  const f = setup({ label: 'Reads #3; then: "writes"', api: "API; v2" });
  built(f);
  const s1 = lines(f, "docs/system/s1.md");
  assert.ok(s1.includes("    api->>db: Reads #35;3#59; then#58; #quot;writes#quot;"));
  assert.ok(s1.includes("    participant api as API#59; v2"));
}
{
  const f = setup({ label: "<script>alert(1)</script>", bullet: "Uses <b>bold</b> & more" });
  built(f);
  const text = read(f, "docs/system/s1.md");
  assert.ok(!text.includes("<script>") && !text.includes("<b>"));
  assert.ok(text.includes("| &lt;script&gt;alert(1)&lt;/script&gt; |"));
  assert.ok(text.includes("- Uses &lt;b&gt;bold&lt;/b&gt; &amp; more"));
}
{
  const f = setup({ folder: "api" });
  const r = built(f);
  assert.ok(r.written.includes("docs/system/api/s1.md") && r.written.includes("docs/system/api/index.md"), r.written.join(","));
  const sub = lines(f, "docs/system/api/index.md");
  assert.ok(sub.some((l) => l.includes("[Links](s1.md): Where do links expire?")), "folder index lists the chapter");
  assert.ok(sub.some((l) => l.includes("(../../system-flow/index.html)")), "folder index links the site");
  assert.ok(lines(f, "docs/system/index.md").some((l) => l.includes("(api/s1.md)")), "root index reaches the chapter");
  assert.ok(read(f, "docs/system/api/s1.md").includes("(../../system-flow/index.html#s1)"), "doc in a folder links the site");
}
{
  const f = setup();
  const target = path.join(f.base, "target.txt");
  fs.writeFileSync(target, "keep\n");
  fs.mkdirSync(path.join(f.host, "docs/system-flow/model"), { recursive: true });
  fs.symlinkSync(target, path.join(f.host, "docs/system-flow/model/layout-report.json"));
  f.commit("host", "model");
  const before = fs.readFileSync(path.join(f.host, F, "level0.json"), "utf8");
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.includes("refusing to write through a symlink: docs/system-flow/model/layout-report.json"), r.stderr);
  assert.strictEqual(fs.readFileSync(target, "utf8"), "keep\n", "the link target is untouched");
  assert.strictEqual(fs.readFileSync(path.join(f.host, F, "level0.json"), "utf8"), before, "no stamps");
}
{
  for (const output of [{ site: "../out", markdown: "docs/system" }, { site: "docs/system-flow", markdown: "/tmp/x" }]) {
    const f = setup();
    f.fxJson({ system_flow: { roots: { guide: "../guide" }, output } });
    f.commit("host", "model");
    const r = f.run(["check"]);
    assert.strictEqual(r.status, 1, r.stdout);
    assert.ok(r.stderr.includes(".fx.json:/system_flow/output: output must have site and markdown paths relative to the root and inside it"), r.stderr);
  }
}
{
  const f = setup();
  f.put("host", "mkdocs.yml", "site_name: x\ndocs_dir: ../..\n");
  const r = f.run(["detect"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.includes("docs_dir ../.. leaves the host root"), r.stderr);
}
{
  const f = setup({ bullet: "See [here](javascript:alert(1)) and \\[x](y)." });
  built(f);
  const doc = read(f, "docs/system/s1.md");
  assert.ok(doc.includes("- See \\[here\\](javascript:alert(1)) and \\\\\\[x\\](y)."), doc);
  assert.strictEqual((0, import_sf_markdown.evidenceLine)([{ path: "a.rb", lines: "1", symbol: "a`b" }], "h"), "Evidence: `a.rb:1` ``a`b``", "a backtick gets a longer fence");
  const rules = (0, import_sf_markdown.renderRules)({ rules: [{ id: "r1", text: "t", adr: { root: "<b>g", path: "docs/<i>.md" } }] }, /* @__PURE__ */ new Map(), "h", "docs/system").text;
  assert.ok(rules.includes("(@&lt;b&gt;g/docs/&lt;i&gt;.md)"), rules);
}
console.log("system-flow-build.test.js: ok");
