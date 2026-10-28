// generated from src/scripts/system-flow-page.test.ts by scripts/build: edit there, not here
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
const ev = (p, lines, symbol) => [{ path: p, lines, symbol }];
const LABEL = "<script>alert(1)</script>";
function setup(o = {}) {
  const f2 = (0, import_sf_fixture.sfFixture)();
  f2.fxJson({});
  f2.fragment("meta", { schemaVersion: 2, meta: { title: "Fixture", purpose: "A fixture system.", roots: [{ id: "backend" }] } });
  f2.fragment("level0", {
    levels: { root: "engine", diagrams: [{
      id: "engine",
      level: 0,
      title: "Engine",
      summary: "The engine.",
      groups: [],
      nodes: [
        { id: "api", label: LABEL, kind: "backend", look: "service", role: "Takes calls", evidence: ev("app/x.rb", "1-4", "Link") },
        { id: "db", label: "Database", kind: "database", look: "service", role: "Stores rows", evidence: [], unconfirmed: true }
      ],
      edges: [{ from: "api", to: "db", label: "reads", evidence: ev("app/y.rb", "1-2", "Y") }]
    }] }
  });
  f2.fragment("chapters", {
    sections: [
      {
        id: "s1",
        title: "Links",
        question: "Where do links expire?",
        diagrams: ["engine"],
        sequences: ["turn"],
        storeFlows: ["first"],
        storeRefs: ["links-table"],
        bullets: [{ id: "b1", text: "Reply: \u0645\u0631\u062D\u0628\u0627", evidence: ev("app/x.rb", "4", "expired?") }]
      },
      { id: "s2", title: "Again", question: "Who else draws it?", diagrams: ["engine"], lead: "The engine is drawn again here as <b>x</b> for the reader. The second chapter links to the first drawing of it." }
    ]
  });
  f2.fragment("flows", {
    sequences: [{
      id: "turn",
      title: "Turn",
      chapter: "s1",
      participants: [{ id: "api", label: "API", look: "service", evidence: ev("app/x.rb", "1", "Link") }, { id: "db", label: "DB", look: "service", evidence: ev("app/y.rb", "1", "Y") }],
      messages: [{ n: 1, from: "api", to: "db", label: "Reads link", evidence: ev("app/x.rb", "4", "expired?") }, { n: 2, from: "db", to: "api", label: "Returns row", evidence: ev("app/y.rb", "1", "Y") }]
    }],
    stores: { sql: [{ id: "links-table", table: "links", evidence: ev("app/y.rb", "1", "Y") }] },
    storeFlows: [{ id: "first", trigger: "A link is opened", chapter: "s1", steps: [{ n: 1, actor: "api", op: "read", store: "sql", key: "links:{id}", evidence: ev("app/x.rb", "4", "expired?") }] }]
  });
  if (o.catalogue !== false) f2.fragment("catalogue", { catalogue: [{ id: "q1", kind: "queue", name: "Main queue", role: "Holds jobs", evidence: ev("app/y.rb", "1", "Y") }] });
  f2.fragment("rules", { rules: [{ id: "r1", text: "Links expire.", evidence: ev("app/x.rb", "4", "expired?") }] });
  f2.fragment("inventory", { inventory: [{ id: "job-a", kind: "job", name: "Job A", evidence: ev("app/x.rb", "1-4", "Link") }, { id: "job-b", kind: "job", name: "Job B", evidence: ev("app/y.rb", "1", "Y") }] });
  f2.fragment("corrections", { corrections: [{ id: "c1", date: "2026-10-01", item: "bullet:b1", before: "Links never expire.", after: "Links expire.", reason: "owner" }] });
  if (o.questions) f2.fragment("questions", { questions: [{ id: "q1", text: "Who prunes expired links?", recommended: "The nightly job.", items: ["node:api"] }] });
  f2.floor();
  return f2;
}
const read = (f2, rel) => fs.readFileSync(path.join(f2.host, rel), "utf8");
const build = (f2) => {
  const r = f2.run(["build"]);
  assert.strictEqual(r.status, 0, `build exits 0
${r.stdout}${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const chapter = (page2, id) => {
  const at = page2.search(new RegExp(`<section [^>]*id="${id}"`));
  assert.ok(at >= 0, id);
  const end = page2.indexOf("<section", at + 1);
  return page2.slice(at, end < 0 ? void 0 : end);
};
const block = (page2, id) => {
  const m = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`).exec(page2);
  assert.ok(m, id);
  return (0, import_json.parseJson)(m[1] ?? "");
};
const card = (page2, key) => {
  const all = [...page2.matchAll(new RegExp(`<figure class="card" id="fig-${key}">([\\s\\S]*?)</figure>`, "g"))];
  assert.strictEqual(all.length, 1, `one card for ${key}`);
  return all[0]?.[1] ?? "";
};
const sandbox = (file) => {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(KIT, file), "utf8"), ctx);
  return ctx;
};
const f = setup();
const out = build(f);
const page = read(f, `${SITE}/index.html`);
{
  const refs = [...page.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((m) => m[1] ?? "").filter((r) => !r.startsWith("#") && !r.startsWith("diagrams/"));
  assert.ok(refs.every((r) => r.startsWith("assets/")), refs.join(","));
  const names = new Set(refs.map((r) => r.slice("assets/".length)));
  for (const n of names) assert.ok(fs.existsSync(path.join(f.host, SITE, "assets", n)), n);
  assert.deepStrictEqual([...names].sort(), ["elkjs-0.9.3.bundled.js", "fx-flow-2.js", "fx-map-2.js", "fx-tokens-1.css", "react-18.3.1.production.min.js", "react-dom-18.3.1.production.min.js", "reactflow-11.11.4.min.js", "reactflow-11.11.4.style.css", "theme.css"]);
  assert.ok(!page.replace(/xmlns(:\w+)?="http:\/\/www\.w3\.org\/[^"]*"/g, "").match(/https?:\/\//), "no network url");
  for (const l of ["LICENSE-react", "LICENSE-reactflow", "LICENSE-elkjs"]) assert.ok(fs.existsSync(path.join(f.host, SITE, "assets", l)), l);
  assert.ok(!fs.existsSync(path.join(f.host, SITE, "assets", "fx-map-1.js")));
  assert.ok(fs.existsSync(path.join(f.host, SITE, "assets", "fx-flow-2.js")), "fx-flow-2.js copied");
  assert.ok(!page.includes("fx-flow-1"), "no fx-flow-1 on the page");
}
{
  const tables = page.match(/<table>/g) ?? [];
  const wrapped = [...page.matchAll(/<div class="table-scroll" role="region" aria-label="([^"]+)" tabindex="0"><table>/g)].map((m) => m[1]);
  assert.ok(tables.length >= 4, `${tables.length} tables`);
  assert.strictEqual(wrapped.length, tables.length, "every table is wrapped");
  assert.ok(wrapped.includes("Store: sql") && wrapped.includes("Corrections"), wrapped.join(","));
}
{
  const g = setup();
  g.put("host", `${SITE}/assets/fx-tokens-1.css`, "/* mine */");
  g.put("host", `${SITE}/assets/theme.css`, "/* fx stale */");
  build(g);
  assert.strictEqual(read(g, `${SITE}/assets/fx-tokens-1.css`), "/* mine */");
  assert.notStrictEqual(read(g, `${SITE}/assets/theme.css`), "/* fx stale */");
}
{
  const marks = ["<header", 'class="legend"', 'id="ch-01-start-what"', 'id="ch-04-start-code"', 'id="ch-05-s1"', 'id="ch-06-s2"', 'id="ch-00-explore"', 'id="components"', 'id="rules-in-force"', 'id="coverage"', 'id="corrections"'].map((m) => page.indexOf(m));
  assert.ok(marks.every((m, i) => m >= 0 && (i === 0 || m > (marks[i - 1] ?? 0))), marks.join(","));
  assert.ok(!page.includes('id="open-questions"'));
  assert.ok(page.includes('<html lang="en" dir="ltr">'));
}
{
  const s1 = chapter(page, "ch-05-s1");
  assert.ok(/<p class="eyebrow">[\s\S]*?Where do links expire\?[\s\S]*?<\/p>\s*<h2>/.test(s1), "the question opens the chapter");
  assert.strictEqual(page.split('<figure class="card" id="fig-level-engine">').length - 1, 1);
  assert.ok(chapter(page, "ch-02-start-parts").includes('<figure class="card" id="fig-level-engine">'));
  for (const id of ["ch-05-s1", "ch-06-s2"]) {
    const c = chapter(page, id);
    assert.ok(c.includes('href="#ch-02-start-parts"') && c.includes("Drawn in chapter 02"), id);
    assert.ok(!c.includes("fig-level-engine"), id);
  }
}
{
  const s1 = chapter(page, "ch-05-s1");
  assert.strictEqual(s1.split('<details class="evidence">').length - 1, 1);
  const box = /<details class="evidence"><summary>Files and locations \((\d+)\)<\/summary>([\s\S]*?)<\/details>/.exec(s1);
  assert.ok(box, "evidence box");
  assert.strictEqual(Number(box[1]), (box[2]?.match(/<li/g) ?? []).length);
  for (const h of ["Facts", "Diagram: Engine", "Sequence: Turn", "Store flow: A link is opened"]) assert.ok((box[2] ?? "").includes(`>${h}<`), h);
  assert.ok(/<li[^>]*>[^]*?Database[^]*?unconfirmed/.test(box[2] ?? ""), "unconfirmed marked");
}
{
  const c = chapter(page, "components");
  assert.strictEqual(c.split("<table").length - 1, 1);
  assert.ok(c.includes("Main queue"));
  const g = setup({ catalogue: false });
  build(g);
  assert.ok(!read(g, `${SITE}/index.html`).includes('id="components"'));
}
{
  assert.ok(page.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!page.includes("<script>alert") && page.split("</script").length === page.split("<script").length);
  for (const id of ["map-data", "diagrams"]) {
    const m = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`).exec(page);
    assert.ok(m?.[1]?.includes("\\u003cscript>alert(1)\\u003c/script>"), id);
    assert.ok(JSON.stringify((0, import_json.parseJson)(m?.[1] ?? "")).includes(LABEL.replace(/"/g, '\\"')) || JSON.stringify((0, import_json.parseJson)(m?.[1] ?? "")).includes(LABEL), id);
  }
}
assert.ok(page.includes('Reply: <span lang="ar" dir="rtl">\u0645\u0631\u062D\u0628\u0627</span>'));
{
  assert.strictEqual(JSON.stringify(sandbox("fx-map-2.js").fxMap?.validateMapData?.(block(page, "map-data"))), "[]");
  const figs = block(page, "diagrams");
  assert.deepStrictEqual(Object.keys(figs).sort(), ["flow-first", "level-engine", "seq-floor-visit", "seq-turn"]);
  const flow = sandbox("fx-flow-2.js").fxFlow;
  for (const [k, spec] of Object.entries(figs)) assert.strictEqual(JSON.stringify(flow?.validateFigure?.(spec)), "[]", k);
}
{
  for (const [key, d] of [["level-engine", "arch-engine"], ["seq-turn", "seq-turn"], ["flow-first", "flow-first"]]) {
    assert.ok(card(page, key).includes(`<a class="deep" href="diagrams/${d}.html">`), `card ${key} links ${d}`);
  }
  assert.ok(!page.includes("Deep diagrams:"), "no Deep diagrams: comma list");
  const written = fs.readdirSync(path.join(f.host, SITE, "diagrams")).filter((n) => n.endsWith(".html"));
  assert.ok(written.length >= 3, written.join(","));
  for (const n of written) assert.ok(page.includes(`href="diagrams/${n}"`), `index.html links ${n}`);
  assert.ok(!/<(?:iframe|embed|object)\b[^>]*diagrams\//i.test(page), "index.html embeds a deep diagram");
}
{
  const model = (0, import_json.parseJson)(read(f, `${SITE}/model/system-model.json`));
  const want = new Map([
    ...model.levels.diagrams.map((d) => [`level-${d.id}`, [d.title, d.summary]]),
    ...model.sequences.map((q) => [`seq-${q.id}`, [`Sequence: ${q.title}`, q.summary ?? ""]]),
    ...model.storeFlows.map((x) => [`flow-${x.id}`, [`Store flow: ${x.trigger}`, x.summary ?? ""]])
  ]);
  const keys = Object.keys(block(page, "diagrams"));
  assert.ok(keys.length >= 4, keys.join(","));
  const strip2 = (h) => h.replace(/<[^>]*>/g, "");
  for (const key of keys) {
    const c = card(page, key);
    const [title, summary] = want.get(key) ?? ["", ""];
    assert.strictEqual(strip2(/^\s*<h3>([\s\S]*?)<\/h3>/.exec(c)?.[1] ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">"), title, `${key} title`);
    assert.strictEqual(strip2(/<p class="cap">([\s\S]*?)<\/p>/.exec(c)?.[1] ?? ""), summary, `${key} caption`);
    assert.ok(/<div class="fig" role="region" tabindex="0" aria-label="[^"]+"><noscript>This figure needs JavaScript\. The link below opens the full diagram\.<\/noscript><\/div>/.test(c), `${key} scroller`);
    const ctl = new RegExp(`<div class="ctl" data-fx-flow="${key}">([\\s\\S]*?)</div>`).exec(c)?.[1] ?? "";
    assert.strictEqual((ctl.match(/<a class="deep" /g) ?? []).length, 1, `${key} bar holds one deep link`);
  }
}
{
  const g = setup();
  const r = g.run(["build", "--prefer", "cheap"]);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.ok(card(read(g, `${SITE}/index.html`), "seq-turn").includes('<a class="deep" href="diagrams/seq-turn.html">Open full diagram</a>'));
}
{
  const g = setup();
  const old = "<!doctype html>\n<!-- fx-system-flow generated: edit the model, then rebuild -->\nold page\n";
  g.put("host", `${SITE}/index.html`, old);
  g.put("host", `${SITE}/diagrams/src`, "a file where the spec folder goes");
  const frags = () => fs.readdirSync(path.join(g.host, SITE, "model", "fragments")).sort().map((n) => read(g, `${SITE}/model/fragments/${n}`));
  const before = frags();
  const r = g.run(["build", "--prefer", "cheap"]);
  assert.notStrictEqual(r.status, 0, "the build fails");
  assert.strictEqual(read(g, `${SITE}/index.html`), old, "index.html unchanged");
  assert.deepStrictEqual(frags(), before, "no stamps written");
}
{
  const g = setup({ questions: true });
  build(g);
  const pg = read(g, `${SITE}/index.html`);
  const q = chapter(pg, "open-questions");
  for (const want of ["Who prunes expired links?", "The nightly job.", "node:api"]) assert.ok(q.includes(want), want);
  const cells = (/<tbody><tr>([\s\S]*?)<\/tr>/.exec(chapter(pg, "corrections"))?.[1] ?? "").split("</td><td>").map((c) => c.replace(/<[^>]*>/g, ""));
  assert.deepStrictEqual(cells, ["2026-10-01", "bullet:b1", "Links never expire.", "Links expire.", "owner"]);
  const cov = (0, import_json.parseJson)(read(g, `${SITE}/model/coverage.json`));
  const covHtml = chapter(pg, "coverage");
  assert.ok(cov.entries.length > 0);
  for (const e of cov.entries) assert.ok(covHtml.includes(`>${e.name}<`), `coverage row ${e.name}`);
  for (const [k, c] of Object.entries(cov.counts)) assert.ok(covHtml.includes(`<td>${k}</td><td>${c.covered}</td><td>${c.total}</td>`), `coverage count ${k}`);
  const s1 = chapter(pg, "ch-05-s1");
  assert.ok(/Store flow: A link is opened<\/h4>\s*<div class="table-scroll"[^>]*><table>[\s\S]*?<td>1<\/td><td>api<\/td><td>read<\/td><td>sql<\/td><td>links:\{id\}<\/td>/.test(s1), "flow step row");
  assert.ok(/Store: sql<\/h4>\s*<div class="table-scroll"[^>]*><table>[\s\S]*?<td>links-table<\/td><td>links<\/td>/.test(s1), "storeRefs row");
}
{
  const g = setup();
  const names = ["a1", "a2", "a3", "b1", "b2", "b3"];
  const nodes = names.map((id) => ({ id, label: `Node ${id}`, kind: "backend", look: "service", role: `Role of ${id}`, evidence: ev("app/x.rb", "1-4", "Link") }));
  const edges = ["a1", "a2", "a3"].flatMap((a) => ["b1", "b2", "b3"].map((b) => ({ from: a, to: b, label: `${a} to ${b}`, evidence: ev("app/y.rb", "1-2", "Y") })));
  g.fragment("level0", { levels: { root: "dense", diagrams: [{ id: "dense", level: 0, title: "Dense", summary: "K33.", groups: [], nodes, edges }] } });
  g.fragment("chapters", { sections: [{ id: "s1", title: "Dense", question: "Why so many?", diagrams: ["dense"] }] });
  g.fragment("flows", {});
  g.fragment("corrections", {});
  g.floor();
  build(g);
  const pg = read(g, `${SITE}/index.html`);
  const fig = block(pg, "diagrams")["level-dense"];
  assert.ok(fig && fig.notDrawn.length >= 1, "a dense figure drops an arrow");
  const note = /<p class="not-drawn">([\s\S]*?)<\/p>/.exec(chapter(pg, "ch-02-start-parts"))?.[1] ?? "";
  for (const id of fig?.notDrawn ?? []) assert.ok(note.includes(id.slice(id.indexOf(":") + 1).replace(">", " to ")), `${id} named under the figure`);
  assert.ok(chapter(pg, "ch-02-start-parts").indexOf("</figure>") < chapter(pg, "ch-02-start-parts").indexOf('class="not-drawn"'), "the list follows the figure");
  const map = block(pg, "map-data");
  assert.strictEqual(map.levels[0]?.edges.length, 9, "map-data keeps every edge");
}
assert.strictEqual(out.pageBytes, fs.statSync(path.join(f.host, SITE, "index.html")).size);
const strip = (h) => h.replace(/<[^>]*>/g, "");
const gs = (0, import_sf_fixture.sfFixture)();
gs.fxJson({});
gs.goodSet();
build(gs);
const site = read(gs, `${SITE}/index.html`);
const metaFrag = (0, import_json.parseJson)(read(gs, `${SITE}/model/fragments/meta.json`));
const chFrag = (0, import_json.parseJson)(read(gs, `${SITE}/model/fragments/chapters.json`));
assert.ok(/<aside id="side">\s*<p class="menu-name">Fixture<\/p>\s*<p class="menu-sub">System flow, generated by fx<\/p>\s*<button id="theme" type="button"[^>]*>[^<]*<\/button>\s*<details id="menu-bar">\s*<summary>Chapters<\/summary>\s*<nav id="menu" aria-label="Chapters">/.test(site), "the menu column follows the DOM contract");
{
  const menu = /<nav id="menu" aria-label="Chapters">([\s\S]*?)<\/nav>/.exec(site)?.[1] ?? "";
  const groups = [...menu.matchAll(/<section class="group" data-group="(\w+)">\s*<h2>([^<]*)<\/h2>\s*<(ol|ul)>([\s\S]*?)<\/\3>\s*<\/section>/g)];
  assert.deepStrictEqual(groups.map((m) => [m[1], m[2], m[3]]), [["start", "Start here", "ol"], ["how", "How it works", "ol"], ["ref", "Reference", "ul"]]);
  const hrefs = (h) => [...(h ?? "").matchAll(/<a href="#([^"]+)">/g)].map((m) => m[1] ?? "");
  assert.deepStrictEqual(hrefs(groups[0]?.[4]), ["ch-01-start-what", "ch-02-start-parts", "ch-03-start-request", "ch-04-start-code"]);
  assert.deepStrictEqual(hrefs(groups[1]?.[4]), ["ch-05-s1"]);
  assert.deepStrictEqual(hrefs(groups[2]?.[4]), ["ch-00-explore", "components", "rules-in-force", "coverage", "corrections"]);
  const chapters = [...site.matchAll(/<section class="chapter" id="([^"]+)" data-group="(start|how|ref)">/g)];
  assert.deepStrictEqual(chapters.map((m) => m[1]), groups.flatMap((g) => hrefs(g[4])));
  assert.strictEqual((site.match(/<section class="chapter"/g) ?? []).length, chapters.length, "every chapter carries data-group");
  assert.deepStrictEqual(chapters.map((m) => m[2]), [...Array(4).fill("start"), "how", ...Array(5).fill("ref")]);
}
assert.ok(site.includes('<html lang="en" dir="ltr">'));
{
  const head = /<header>([\s\S]*?)<\/header>/.exec(site)?.[1] ?? "";
  assert.ok(head.includes("<h1>Fixture system</h1>"), "h1 is meta.title");
  assert.ok(head.includes(`<p class="intro">${metaFrag.meta.intro}</p>`), "the intro is meta.intro");
  assert.ok(/<button type="button" id="evall">Open all evidence boxes<\/button>/.test(head), "the evidence button");
  const items = (/<ul class="legend"[^>]*>([\s\S]*?)<\/ul>/.exec(head)?.[1] ?? "").match(/<li[^>]*>[\s\S]*?<\/li>/g) ?? [];
  assert.deepStrictEqual(items.map(strip), ["Part of Fixture", "Data or files", "Phone or browser", "Outside Fixture", "Call that leaves Fixture", "Step in flight"]);
}
{
  const s1 = chapter(site, "ch-05-s1");
  const want = chFrag.sections.find((x) => x.id === "s1");
  assert.ok(s1.includes('<p class="eyebrow"><span class="n">05</span> <span class="q">Where do links expire?</span></p>'), "eyebrow");
  assert.ok(/<\/p>\s*<h2>Links<\/h2>\s*<p class="lead">/.test(s1), "h2 then lead");
  assert.strictEqual(strip(/<p class="lead">([\s\S]*?)<\/p>/.exec(s1)?.[1] ?? ""), want?.lead);
  const facts = (/<ul class="facts">([\s\S]*?)<\/ul>/.exec(s1)?.[1] ?? "").match(/<li>[\s\S]*?<\/li>/g) ?? [];
  assert.strictEqual(facts.length, 4);
  assert.ok(facts[0]?.includes('<code class="at">app/x.rb:4</code>'), facts[0]);
  assert.strictEqual(strip(facts[0]?.replace(/<code class="at">[\s\S]*?<\/code>/, "") ?? "").trim(), want?.bullets[0]?.text);
}
assert.ok(chapter(page, "ch-06-s2").includes("&lt;b&gt;x&lt;/b&gt;") && !page.includes("<b>x</b>"), "the lead is escaped");
{
  const foot = /<footer>([\s\S]*?)<\/footer>/.exec(site)?.[1] ?? "";
  for (const w of ["model/fragments/", "system-flow check", "system-flow build", "offline"]) assert.ok(foot.includes(w), `footer names ${w}`);
}
assert.ok(!site.includes("Shamel") && !fs.readFileSync(path.join(__dirname, "..", "references", "system-flow", "site-template.html"), "utf8").includes("Shamel"));
console.log("system-flow-page.test.js: OK");
