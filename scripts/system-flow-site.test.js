// generated from src/scripts/system-flow-site.test.ts by scripts/build: edit there, not here
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
var vm = __toESM(require("vm"));
var import_json = require("../lib/json.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const SITE = "docs/system-flow";
const KIT = path.join(__dirname, "..", "references", "visual");
const read = (f2, rel) => fs.readFileSync(path.join(f2.host, rel), "utf8");
const frag = (f2, name) => (0, import_json.parseJson)(read(f2, `${SITE}/model/fragments/${name}.json`));
const build = (f2) => {
  const r = f2.run(["build"]);
  assert.strictEqual(r.status, 0, `build exits 0
${r.stdout}${r.stderr}`);
  return read(f2, `${SITE}/index.html`);
};
const chapter = (page2, id) => {
  const at = page2.search(new RegExp(`<section [^>]*id="${id}"`));
  assert.ok(at >= 0, id);
  const end = page2.indexOf("<section", at + 1);
  return page2.slice(at, end < 0 ? void 0 : end);
};
const rawBlock = (page2, id) => {
  const m = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`).exec(page2);
  assert.ok(m, id);
  return m[1] ?? "";
};
const terms = (html) => [...html.matchAll(/<a class="term" href="#term-([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => `${m[1]}=${m[2]}`);
function setup() {
  const f2 = (0, import_sf_fixture.sfFixture)();
  f2.fxJson({});
  f2.goodSet();
  f2.put("host", "app/link.rb", "class ShortLink\nend\n");
  const ch = frag(f2, "chapters");
  const code = ch.sections.find((s) => s.id === "start-code");
  code.bullets[0] = {
    id: "start-code-b1",
    text: "Each short link the service reads from the store points at one row and the job checks it every day.",
    evidence: [{ path: "app/link.rb", lines: "1", symbol: "ShortLink" }]
  };
  f2.fragment("chapters", ch);
  f2.commit("host", "link file");
  return f2;
}
const f = setup();
const page = build(f);
{
  const ids = ["ch-01-start-what", "ch-02-start-parts", "ch-03-start-request", "ch-04-start-code", "ch-05-s1", "glossary", "rules-in-force", "coverage", "corrections"];
  const at = ids.map((id) => page.search(new RegExp(`<section class="chapter" id="${id}"`)));
  assert.ok(at.every((a, i) => a >= 0 && (i === 0 || a > (at[i - 1] ?? 0))), `${ids.join(",")} at ${at.join(",")}`);
  for (const gone of ['id="ch-00-explore"', 'id="components"', 'id="open-questions"']) assert.ok(!page.includes(gone), gone);
}
{
  const c = chapter(page, "ch-01-start-what");
  const list = /<h3>Not owned here<\/h3>\s*<ul class="not-owned">([\s\S]*?)<\/ul>/.exec(c)?.[1];
  assert.ok(list !== void 0, "not owned list");
  const items = list.match(/<li>[\s\S]*?<\/li>/g) ?? [];
  assert.strictEqual(items.length, 2);
  for (const li of items) assert.ok(li.includes('<code class="at">app/x.rb:1-4</code>'), li);
}
{
  const c = chapter(page, "ch-02-start-parts");
  const card = c.indexOf('<figure class="card" id="fig-level-system">');
  const map = c.indexOf('<div id="map">');
  const cat = c.indexOf("Mailer</td>");
  assert.ok(card >= 0 && map > card && cat > map, `card ${card}, map ${map}, catalogue ${cat}`);
  assert.ok(c.slice(map).includes('<div id="map-root">'), "the explorer mounts inside #map");
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(KIT, "fx-map-2.js"), "utf8"), ctx);
  const fxMap = ctx.fxMap;
  assert.strictEqual(JSON.stringify(fxMap.validateMapData((0, import_json.parseJson)(rawBlock(page, "map-data")))), "[]");
}
assert.ok(chapter(page, "ch-03-start-request").includes('<figure class="card" id="fig-seq-turn">'));
{
  const c = chapter(page, "ch-04-start-code");
  const stores = /<table class="stores">([\s\S]*?)<\/table>/.exec(c)?.[1] ?? "";
  assert.deepStrictEqual([...stores.matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1]), ["Store kind", "Rows", "Shown in"]);
  const rows = [...stores.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td>/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepStrictEqual(rows, ["sql 1"], "one row per non-empty store kind");
  const map = /<h3>backend<\/h3>\s*<div[^>]*><table class="code-map">([\s\S]*?)<\/table>/.exec(c)?.[1] ?? "";
  assert.deepStrictEqual([...map.matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1]), ["Folder", "What it owns", "Start reading at"]);
  assert.ok(map.includes("<td>app/</td><td>The application code.</td><td><code>app/x.rb:1-4</code> Link</td>"), map);
}
{
  const g = chapter(page, "glossary");
  assert.ok(g.includes("The words this site uses, in the meaning the code gives them. 15 terms."), "intro");
  assert.strictEqual((g.match(/<tr id="term-/g) ?? []).length, 15);
  const link = /<tr id="term-link">([\s\S]*?)<\/tr>/.exec(g)?.[1] ?? "";
  assert.ok(link.includes('<span class="tag">model</span>') && link.includes("A short address that points at a long one."), link);
  const order = [...g.matchAll(/<tr id="term-([^"]+)">/g)].map((m) => m[1]);
  assert.strictEqual(order[0], "chapter", "sorted by term, case-insensitive");
  assert.ok(order.indexOf("link") < order.indexOf("mailer") && order.indexOf("row") < order.indexOf("short-link"), order.join(","));
}
{
  const s1 = chapter(page, "ch-05-s1");
  const lead = /<p class="lead">([\s\S]*?)<\/p>/.exec(s1)?.[1] ?? "";
  assert.ok(lead.startsWith('Each <a class="term" href="#term-link" title="A short address that points at a long one.">link</a> expires'), lead);
  assert.ok(/every link once/.test(lead), "the second link is plain text");
  const code = chapter(page, "ch-04-start-code");
  const bullet = /<li>Each [\s\S]*?<\/li>/.exec(code)?.[0] ?? "";
  assert.deepStrictEqual(terms(bullet).filter((x) => x.includes("link")), ["short-link=short link"], bullet);
  assert.ok(bullet.includes('<code class="at">app/link.rb:1</code>'), "no term link inside code.at");
  const cap = /<figure class="card" id="fig-level-system">[\s\S]*?<p class="cap">([\s\S]*?)<\/p>/.exec(chapter(page, "ch-02-start-parts"))?.[1] ?? "";
  assert.ok(terms(cap).includes("link=link"), cap);
}
{
  const raw = rawBlock(page, "site-index");
  const idx = (0, import_json.parseJson)(raw);
  assert.deepStrictEqual(idx.chapters.map((c) => c.n), ["01", "02", "03", "04", "05"]);
  assert.strictEqual(idx.chapters[4]?.id, "ch-05-s1");
  assert.ok(idx.parts.some((p) => p.label === "Database" && p.chapter === "ch-02-start-parts"), JSON.stringify(idx.parts));
  assert.strictEqual(idx.terms.length, 15);
}
{
  const g = setup();
  const gl = frag(g, "glossary");
  gl.glossary.push({ id: "script", term: "<script>", tag: "concept", meaning: "A <script> tag in a page.", evidence: [{ path: "app/x.rb", lines: "1-4", symbol: "Link" }] });
  g.fragment("glossary", gl);
  const ch = frag(g, "chapters");
  const s1 = ch.sections.find((s) => s.id === "s1");
  s1.bullets[0].text = `${s1.bullets[0].text} <script>`;
  g.fragment("chapters", ch);
  g.commit("host", "script term");
  const pg = build(g);
  assert.ok(/<tr id="term-script"><td>&lt;script&gt;<\/td>/.test(chapter(pg, "glossary")), "the row escapes the term");
  const titles = [...pg.matchAll(/<a class="term" href="#term-script" title="([^"]*)">/g)].map((m) => m[1]);
  assert.ok(titles.length >= 1, "the term links");
  for (const t of titles) assert.strictEqual(t, "A &lt;script&gt; tag in a page.");
  const raw = rawBlock(pg, "site-index");
  assert.ok(!raw.includes("<script>") && raw.includes("\\u003cscript>"), "the raw block writes < as \\u003c");
  assert.ok((0, import_json.parseJson)(raw).terms.some((x) => x.term === "<script>"), "the index parses back to <script>");
}
{
  assert.ok(!chapter(page, "coverage").includes("Not known yet"));
  const g = setup();
  g.fragment("questions", { questions: [{ id: "q1", text: "Who prunes expired links?" }] });
  const c = chapter(build(g), "coverage");
  assert.ok(/<h3>Not known yet<\/h3>[\s\S]*Who prunes expired/.test(c), c);
}
console.log("system-flow-site.test.js: OK");
