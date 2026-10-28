// generated from src/scripts/system-flow-diagrams.test.ts by scripts/build: edit there, not here
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
var import_json = require("../lib/json.js");
var import_sf_layout = require("../lib/sf-layout.js");
var import_sf_schema = require("../lib/sf-schema.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const SITE = "docs/system-flow";
const D = `${SITE}/diagrams`;
const SCHEMAS = path.join(__dirname, "..", "tests", "fixtures", "archify-3.2.0");
const schema = (n) => (0, import_json.parseJson)(fs.readFileSync(path.join(SCHEMAS, `${n}.schema.json`), "utf8"));
const refs = { "common.schema.json": schema("common") };
const ev = (p, lines, symbol) => [{ path: p, lines, symbol }];
const LONG = "A source label that is clearly longer than forty-eight characters";
function setup() {
  const f2 = (0, import_sf_fixture.sfFixture)();
  f2.put("host", "app/api.rb", `${Array.from({ length: 49 }, (_, i) => i === 9 ? "# Api#call" : `# line ${i + 1}`).join("\n")}
# Api#log
# ${LONG}
`);
  f2.commit("host", "api");
  f2.git("host", "remote", "add", "origin", "https://example.com/acme/app.git");
  f2.fxJson({});
  f2.fragment("meta", { schemaVersion: 1, meta: { roots: [{ id: "backend" }, { id: "guide" }] } });
  f2.fxJson({ system_flow: { roots: { guide: "../guide" } } });
  const nodes = (extra = []) => [
    { id: "api", label: "<b>", kind: "backend", role: "Takes calls", evidence: [
      { path: "app/api.rb", lines: "10-42", symbol: "Api#call" },
      { path: "app/api.rb", lines: "50", symbol: "Api#log" },
      { path: "app/api.rb", lines: "51", symbol: LONG },
      { path: "app/y.rb", lines: "1", symbol: "Y" }
    ] },
    { id: "db", label: "Database", kind: "database", role: "Stores rows", evidence: ev("app/y.rb", "1-2", "Y") },
    { id: "2fa", label: "Second factor", kind: "security", role: "Checks codes", evidence: ev("app/x.rb", "4", "expired?") },
    ...extra
  ];
  f2.fragment("level0", { levels: { root: "system", diagrams: [
    {
      id: "system",
      level: 0,
      title: "System",
      summary: "All.",
      groups: [],
      nodes: [
        { id: "engine", label: "Engine", kind: "backend", role: "Runs", children: "engine", evidence: ev("app/x.rb", "1-4", "Link") },
        { id: "store", label: "Store", kind: "database", role: "Keeps", evidence: ev("app/y.rb", "1", "Y") }
      ],
      edges: [{ from: "engine", to: "store", label: "writes", evidence: ev("app/y.rb", "1", "Y") }]
    },
    {
      id: "engine",
      level: 1,
      parent: "system",
      title: "Engine",
      summary: "The engine.",
      groups: [],
      nodes: nodes(),
      edges: [{ from: "api", to: "db", label: "reads", evidence: ev("app/y.rb", "1-2", "Y") }, { from: "api", to: "2fa", label: "checks", evidence: ev("app/x.rb", "4", "expired?") }]
    }
  ] } });
  f2.fragment("chapters", { sections: [{ id: "s1", title: "Links", question: "Where do links expire?", diagrams: ["system", "engine"], bullets: [{ id: "b1", text: "x", evidence: ev("app/x.rb", "4", "expired?") }] }] });
  const msgs = Array.from({ length: 14 }, (_, i) => ({ n: i + 1, from: i % 2 ? "db" : "api", to: i % 2 ? "api" : "db", label: `Step ${i + 1}`, evidence: i === 13 ? ev("app/x.rb", "4", "expired?") : ev("app/y.rb", "1", "Y") }));
  f2.fragment("flows", {
    sequences: [{
      id: "turn",
      title: "Turn",
      chapter: "s1",
      participants: [{ id: "api", label: "API", evidence: ev("app/x.rb", "1", "Link") }, { id: "db", label: "DB", evidence: ev("app/y.rb", "1", "Y") }, { id: "aux", label: "Aux", evidence: ev("app/y.rb", "1", "Y") }],
      messages: msgs
    }],
    stores: { sql: [{ id: "links-table", table: "links", evidence: ev("app/y.rb", "1", "Y") }] },
    storeFlows: [{ id: "first", trigger: "A link is opened", chapter: "s1", steps: Array.from({ length: 7 }, (_, i) => ({ n: i + 1, actor: "api", op: i % 2 ? "write" : "read", store: "sql", key: "links:{id}", evidence: ev("app/x.rb", "4", "expired?") })) }]
  });
  return f2;
}
const read = (f2, rel) => fs.readFileSync(path.join(f2.host, rel), "utf8");
const spec = (f2, name) => (0, import_json.parseJson)(read(f2, `${D}/src/${name}.json`));
const build = (f2) => {
  const r = f2.run(["build"]);
  assert.strictEqual(r.status, 0, `build exits 0
${r.stdout}${r.stderr}`);
  return { out: (0, import_json.parseJson)(r.stdout), err: r.stderr };
};
const f = setup();
const { out, err } = build(f);
{
  const have = fs.readdirSync(path.join(f.host, D)).filter((n) => n.endsWith(".html")).sort();
  assert.deepStrictEqual(have, ["arch-engine.html", "arch-system.html", "flow-first.html", "seq-turn-p2.html", "seq-turn.html"]);
  const json = fs.readdirSync(path.join(f.host, D, "src")).sort();
  assert.deepStrictEqual(json, ["arch-engine.json", "arch-system.json", "flow-first.json", "seq-turn-p2.json", "seq-turn.json"]);
  assert.deepStrictEqual(spec(f, "seq-turn").messages.length, 8);
  assert.deepStrictEqual(spec(f, "seq-turn-p2").messages.length, 6);
  for (const n of ["seq-turn", "seq-turn-p2"]) {
    const s = spec(f, n);
    const used = new Set(s.messages.flatMap((m) => [m.from, m.to]));
    assert.deepStrictEqual(s.participants.map((p) => p.id).sort(), [...used].sort(), n);
  }
}
{
  const c = spec(f, "arch-engine").components.find((x) => x.id === "api");
  assert.strictEqual(c.sources.length, 3);
  assert.deepStrictEqual(c.sources[0], { path: "app/api.rb", line: 10, end_line: 42, label: "Api#call" });
  assert.strictEqual(c.sources[2].label.length, 48);
  assert.ok(!("sources" in spec(f, "arch-engine").connections[0]));
  for (const m of spec(f, "seq-turn").messages) assert.ok(!("sources" in m));
}
{
  const head = f.git("host", "rev-parse", "HEAD");
  const s = spec(f, "arch-engine");
  assert.deepStrictEqual(s.meta.repository, { url: "https://example.com/acme/app.git", revision: head, link_mode: "local-only" });
  assert.strictEqual(s.meta.quality_profile, "showcase");
  assert.strictEqual(s.meta.output, "arch-engine.html");
  for (const n of fs.readdirSync(path.join(f.host, D, "src"))) assert.ok(!read(f, `${D}/src/${n}`).includes(f.base), n);
  f.git("host", "remote", "set-url", "origin", "https://user:token@example.com/acme/app.git");
  build(f);
  assert.strictEqual(spec(f, "arch-engine").meta.repository.url, "https://example.com/acme/app.git");
}
{
  const g = setup();
  g.git("host", "remote", "remove", "origin");
  build(g);
  for (const n of fs.readdirSync(path.join(g.host, D, "src"))) {
    const s = (0, import_json.parseJson)(read(g, `${D}/src/${n}`));
    assert.ok(!("repository" in s.meta), n);
    assert.ok([...s.components ?? [], ...s.participants ?? []].every((c) => !("sources" in c)), n);
    assert.deepStrictEqual((0, import_sf_schema.validate)(schema(s.diagram_type === "architecture" ? "architecture" : "sequence"), s, refs), [], n);
  }
  assert.ok(JSON.stringify(spec(g, "arch-engine").cards).includes("@backend/app/api.rb:10-42"), JSON.stringify(spec(g, "arch-engine").cards));
}
{
  const g = setup();
  const lvl = (0, import_json.parseJson)(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/level0.json`), "utf8"));
  const api = lvl.levels.diagrams[1].nodes[0];
  api.evidence = [api.evidence[0], api.evidence[3], { root: "guide", path: "README.md", lines: "1", symbol: "Guide" }];
  g.fragment("level0", lvl);
  build(g);
  const s = spec(g, "arch-engine");
  assert.ok(s.components.every((c) => !(c.sources ?? []).some((x) => x.path === "README.md")));
  assert.ok(JSON.stringify(s.cards).includes("@guide/README.md:1"), JSON.stringify(s.cards));
}
{
  const g = setup();
  const lvl = (0, import_json.parseJson)(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/level0.json`), "utf8"));
  lvl.levels.diagrams[1].nodes.push({ id: "cache", label: "Cache", kind: "cloud", role: "Holds", evidence: ev("app/y.rb", "1", "Y") });
  lvl.levels.diagrams[1].edges.push({ from: "api", to: "cache", label: "caches", evidence: ev("app/y.rb", "1", "Y") });
  g.fragment("level0", lvl);
  const fl = (0, import_json.parseJson)(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/flows.json`), "utf8"));
  fl.stores.cache = [{ id: "k1", pattern: "k:*", evidence: ev("app/y.rb", "1", "Y") }];
  fl.storeFlows.push({ id: "second", trigger: "Cached", chapter: "s1", steps: [{ n: 1, actor: "cache", op: "read", store: "cache", key: "k", evidence: ev("app/y.rb", "1", "Y") }] });
  g.fragment("flows", fl);
  build(g);
  const s = spec(g, "flow-second");
  const ids = s.participants.map((x) => x.id);
  assert.strictEqual(new Set(ids).size, 2, ids.join());
  assert.deepStrictEqual((0, import_sf_schema.validate)(schema("sequence"), s, refs), []);
  assert.ok(s.messages.every((m) => ids.includes(m.from) && ids.includes(m.to)));
}
{
  const g = setup();
  const fl = (0, import_json.parseJson)(fs.readFileSync(path.join(g.host, `${SITE}/model/fragments/flows.json`), "utf8"));
  fl.sequences[0].messages = fl.sequences[0].messages.slice(0, 10);
  fl.storeFlows[0].steps = fl.storeFlows[0].steps.slice(0, 3);
  g.fragment("flows", fl);
  build(g);
  assert.strictEqual(spec(g, "seq-turn-p2").messages.length, 2);
  assert.strictEqual(spec(g, "flow-first").messages.length, 3);
  for (const n of ["seq-turn", "seq-turn-p2", "flow-first"]) {
    const [w, h] = spec(g, n).meta.viewBox;
    assert.ok(w / h >= 1.55 || Math.round(1346 * h / w) + 126 <= 900, `${n} ${w}x${h}`);
  }
}
{
  for (const n of fs.readdirSync(path.join(f.host, D, "src"))) {
    const s = (0, import_json.parseJson)(read(f, `${D}/src/${n}`));
    const sch = schema(s.diagram_type === "architecture" ? "architecture" : "sequence");
    assert.deepStrictEqual((0, import_sf_schema.validate)(sch, s, refs), [], n);
  }
  const bad = spec(f, "arch-engine");
  bad.components[0].sources = [1, 2, 3, 4].map((line) => ({ path: "a", line }));
  assert.ok((0, import_sf_schema.validate)(schema("architecture"), bad, refs).some((e) => e.message === "more than 3 items"));
  const bad2 = spec(f, "arch-engine");
  bad2.meta.repository.revision = "abc";
  assert.ok((0, import_sf_schema.validate)(schema("architecture"), bad2, refs).some((e) => e.message === "does not match ^[a-fA-F0-9]{40}$"));
}
async function geometry() {
  const s = spec(f, "arch-engine");
  const model = (0, import_json.parseJson)(read(f, `${SITE}/model/system-model.json`));
  const level = (await (0, import_sf_layout.layoutAll)(model)).figures.find((x) => x.key === "level-engine");
  assert.ok(level);
  for (const n of level.nodes) {
    const id = /^[0-9]/.test(n.id) ? `n${n.id}` : n.id;
    const c = s.components.find((x) => x.id === id);
    assert.ok(c, id);
    assert.deepStrictEqual([c.pos, c.size], [[n.x, n.y], [n.w, n.h]]);
  }
  assert.deepStrictEqual(s.meta.viewBox, [Math.max(320, level.width), Math.max(240, level.height)]);
  assert.ok(s.components.some((c) => c.id === "n2fa"));
  assert.ok(s.connections.some((c) => c.to === "n2fa"));
}
void geometry().then(rest);
function rest() {
  assert.deepStrictEqual((0, import_sf_schema.validate)({ type: "string", format: "email" }, "x"), [{ pointer: "", message: "unsupported keyword format" }]);
  {
    const arch = read(f, `${D}/arch-engine.html`);
    assert.ok(arch.includes("<svg"));
    const refsIn = [...arch.matchAll(/<(?:link|script)\b[^>]*\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]).sort();
    assert.deepStrictEqual(refsIn, ["../assets/fx-tokens-1.css", "../assets/theme.css"]);
    assert.ok(arch.includes("&lt;b&gt;") && !arch.includes("<b>"));
    const seq = read(f, `${D}/seq-turn.html`);
    assert.ok(seq.includes("<animate") || seq.includes("@keyframes") && seq.includes("prefers-reduced-motion"));
  }
  for (const n of ["arch-engine", "seq-turn"]) {
    const html = read(f, `${D}/${n}.html`);
    const w = Number(/<svg\b[^>]*\swidth="(\d+)"/.exec(html)?.[1]);
    const min = Number(/<svg\b[^>]*min-inline-size:(\d+)px/.exec(html)?.[1]);
    assert.ok(min >= Math.ceil(w * 12 / 13), `${n}: svg min-inline-size ${min} keeps text at 12 px for width ${w}`);
    assert.ok(/<div class="scroll">\s*<svg\b/.test(html), `${n}: svg sits in the scroll box`);
    assert.ok(/\.scroll\{[^}]*overflow-x:auto/.test(html), `${n}: the scroll box scrolls sideways`);
  }
  {
    assert.deepStrictEqual(out.diagrams.find((d) => d.name === "seq-turn"), { name: "seq-turn", renderer: "svg", reason: "animated SVG, archify not installed" });
    assert.deepStrictEqual(out.diagrams.find((d) => d.name === "arch-engine"), { name: "arch-engine", renderer: "svg", reason: "static SVG, archify not installed" });
    assert.strictEqual(err, "");
  }
  {
    const snap = () => Object.fromEntries(fs.readdirSync(path.join(f.host, D), { recursive: true, withFileTypes: false }).filter((n) => String(n).includes(".")).map((n) => [String(n), read(f, `${D}/${String(n)}`)]));
    const a = snap();
    build(f);
    assert.deepStrictEqual(snap(), a);
  }
  console.log("system-flow-diagrams.test.js: OK");
}
