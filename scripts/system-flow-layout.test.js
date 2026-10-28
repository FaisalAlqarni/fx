// generated from src/scripts/system-flow-layout.test.ts by scripts/build: edit there, not here
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
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const SITE = "docs/system-flow";
const F = `${SITE}/model/fragments`;
const ev = [{ path: "app/x.rb", lines: "1-4", symbol: "Link" }];
const K33_CAP = 2;
const node = (id, label = `Node ${id}`) => ({ id, label, kind: "backend", look: "service", role: `Role of ${id}`, evidence: ev });
const edge = (from, to, label = `${from} to ${to}`, extra = {}) => ({ from, to, label, evidence: ev, ...extra });
const diagram = (d) => ({ title: d.id, summary: `The ${d.id} diagram shows its parts and links.`, groups: [], ...d });
function setup(level0, extra = []) {
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("level0", { levels: { root: "system", diagrams: [diagram(level0)] } });
  if (extra.length) f.fragment("area", { levels: { diagrams: extra.map(diagram) } });
  f.floor();
  f.commit("host", "model");
  return f;
}
const chain = () => ({ id: "system", level: 0, nodes: ["a", "b", "c", "d"].map((id) => node(id)), edges: [edge("a", "b"), edge("b", "c"), edge("c", "d")] });
const built = (f) => {
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 0, `build exits 0
${r.stdout}${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const reportBytes = (f) => fs.readFileSync(path.join(f.host, SITE, "model", "layout-report.json"), "utf8");
const report = (f) => (0, import_json.parseJson)(reportBytes(f));
const entry = (f, key) => {
  const e = report(f).find((l) => l.key === key);
  assert.ok(e, `report has ${key}: ${reportBytes(f)}`);
  return e;
};
const mergedModel = (f) => {
  const { generated: _g, ...model } = (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, SITE, "model", "system-model.json"), "utf8"));
  return model;
};
async function figure(f, key) {
  const fig = (await (0, import_sf_layout.layoutAll)(mergedModel(f))).figures.find((x) => x.key === key);
  assert.ok(fig, `figure ${key}`);
  return fig;
}
const labelOf = (fig, id) => fig.edges.find((e) => e.id === id)?.label?.text;
async function main() {
  {
    const long = "Reads the session token from the cache, then refreshes it";
    const f = setup({ id: "system", level: 0, nodes: ["a", "b", "c"].map((id) => node(id)), edges: [edge("a", "b", long), edge("b", "c", long, { short: "Session read" })] });
    built(f);
    const fig = await figure(f, "level-system");
    assert.strictEqual(labelOf(fig, "system:a>b"), "Reads the session token");
    assert.strictEqual(labelOf(fig, "system:b>c"), "Session read");
  }
  {
    const f = setup(chain());
    built(f);
    const r = report(f);
    assert.deepStrictEqual(r.map((l) => l.key), ["level-system", "seq-turn"], reportBytes(f));
    const e = entry(f, "level-system");
    assert.deepStrictEqual([e.crossings, e.notDrawn, e.nodes, e.arrows], [0, 0, 4, 3]);
    assert.ok(e.width <= 860, `width ${e.width}`);
  }
  {
    const ids = [1, 2, 3].flatMap((r) => [1, 2, 3].map((c) => `n${r}${c}`));
    const edges = [];
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) {
      if (c < 3) edges.push(edge(`n${r}${c}`, `n${r}${c + 1}`));
      if (r < 3) edges.push(edge(`n${r}${c}`, `n${r + 1}${c}`));
    }
    const f = setup(chain(), [{ id: "grid", level: 1, parent: "system", nodes: ids.map((id) => node(id)), edges }]);
    built(f);
    const e = entry(f, "level-grid");
    assert.deepStrictEqual([e.crossings, e.notDrawn, e.arrows], [0, 0, 12]);
    assert.ok(e.width <= 860, `width ${e.width}`);
  }
  {
    const edges = ["a1", "a2", "a3"].flatMap((a) => ["b1", "b2", "b3"].map((b) => edge(a, b)));
    const f = setup(chain(), [{ id: "dense", level: 1, parent: "system", nodes: ["a1", "a2", "a3", "b1", "b2", "b3"].map((id) => node(id)), edges }]);
    built(f);
    const e = entry(f, "level-dense");
    assert.ok(e.crossings <= 1, `crossings ${e.crossings}`);
    assert.strictEqual(e.arrows + e.notDrawn, 9);
    assert.ok(e.notDrawn >= 1 && e.notDrawn <= K33_CAP, `notDrawn ${e.notDrawn}`);
    const fig = await figure(f, "level-dense");
    const all = edges.map((x) => `dense:${x.from}>${x.to}`);
    assert.strictEqual(fig.notDrawn.length, e.notDrawn);
    for (const id of fig.notDrawn) assert.ok(all.includes(id), `notDrawn ${id} is an edge id`);
    const drawn = fig.edges.map((x) => x.id);
    for (const n of ["a1", "a2", "a3", "b1", "b2", "b3"]) {
      assert.ok(drawn.some((id) => id.startsWith(`dense:${n}>`) || id.endsWith(`>${n}`)), `${n} keeps an arrow`);
    }
    for (const id of fig.notDrawn) {
      const [from, to] = id.slice(id.indexOf(":") + 1).split(">");
      assert.ok(fig.steps.some((s) => s.caption.includes(`to Node ${to}: ${from} to ${to} (arrow not drawn)`)), `${id} named in a step caption`);
    }
    const dense = mergedModel(f).levels.diagrams.find((d) => d.id === "dense");
    assert.strictEqual(dense?.edges.length, 9, "the map data keeps every edge");
  }
  {
    const fixture = (0, import_json.parseJson)(fs.readFileSync(path.join(__dirname, "..", "tests", "fixtures", "system-flow", "parser-stages.json"), "utf8"));
    const f = setup(chain(), [fixture.diagram]);
    built(f);
    const e = entry(f, "level-parser-stages");
    const sf = fixture.systemFlowLine;
    assert.ok(e.crossings <= sf.crossings && e.nodeHits <= sf.nodeHits && e.notDrawn <= sf.notDrawn, `${JSON.stringify(e)} vs ${JSON.stringify(sf)}`);
    assert.ok(e.width <= 860, `width ${e.width}`);
  }
  {
    const at = { a: [0, 0], b: [1, 1], c: [0, 1], d: [1, 0], e: [2, 0], f: [3, 1], g: [2, 1], h: [3, 0], i: [0, 2], j: [1, 2] };
    const layout = Object.fromEntries(Object.entries(at).map(([id, [col, row]]) => [id, { col, row }]));
    const f = setup({ id: "system", level: 0, nodes: Object.keys(at).map((id) => node(id)), edges: [edge("a", "b"), edge("c", "d"), edge("e", "f"), edge("g", "h"), edge("i", "j")], layout });
    const frag = (n) => fs.readFileSync(path.join(f.host, F, n), "utf8");
    const before = fs.readdirSync(path.join(f.host, F)).map((n) => [n, frag(n)]);
    const r = f.run(["build"]);
    assert.strictEqual(r.status, 1, `${r.stdout}${r.stderr}`);
    assert.deepStrictEqual(fs.readdirSync(path.join(f.host, F)).map((n) => [n, frag(n)]), before);
    assert.ok(!fs.existsSync(path.join(f.host, "docs", "system")), "no docs/system");
    assert.deepStrictEqual(fs.readdirSync(path.join(f.host, SITE)), ["model"]);
    assert.deepStrictEqual(fs.readdirSync(path.join(f.host, SITE, "model")), ["fragments"]);
    const lines = r.stderr.split("\n").filter(Boolean);
    const prefix = "docs/system-flow/model/fragments/level0.json:/levels/diagrams/0: figure level-system cannot meet 1 crossing and 860 px: level-system ";
    const hit = lines.filter((l) => l.startsWith(prefix));
    assert.strictEqual(hit.length, 1, r.stderr);
    const crossings = Number(/ crossings=([0-9.]+) /.exec(hit[0] ?? "")?.[1]);
    assert.ok(crossings >= 2, hit[0]);
  }
  {
    const at = { a: [0, 0], b: [1, 1], c: [0, 1], d: [1, 0], e: [2, 0], f: [3, 1], g: [2, 1], h: [3, 0], i: [0, 2], j: [1, 2] };
    const layout = Object.fromEntries(Object.entries(at).map(([id, [col, row]]) => [id, { col, row }]));
    const w = (id) => `w${id}`;
    const wide = { id: "wide", level: 1, parent: "system", nodes: Object.keys(at).map((id) => node(w(id))), edges: [edge(w("a"), w("b")), edge(w("c"), w("d")), edge(w("e"), w("f")), edge(w("g"), w("h")), edge(w("i"), w("j"))], layout: Object.fromEntries(Object.entries(layout).map(([id, v]) => [w(id), v])) };
    const f = setup(chain(), [wide]);
    const r = f.run(["check", "--fragment", `${F}/area.json`]);
    assert.strictEqual(r.status, 1, `${r.stdout}${r.stderr}`);
    assert.match(r.stderr, /^docs\/system-flow\/model\/fragments\/area\.json:\/levels\/diagrams\/0: figure level-wide cannot meet 1 crossing and 860 px: level-wide .*; split it one level down$/m);
    assert.strictEqual(f.run(["check", "--fragment", `${F}/level0.json`]).status, 0, "another fragment does not answer for it");
  }
  {
    const layout = { a: { col: 0, row: 0 }, b: { col: 1, row: 0 } };
    const f = setup({ id: "system", level: 0, nodes: [node("a"), node("b")], edges: [edge("a", "b"), edge("a", "a", "retries")], layout });
    built(f);
    const fig = await figure(f, "level-system");
    const loop = fig.edges.find((x) => x.id === "system:a>a");
    assert.ok(loop && !loop.d.includes("NaN"), JSON.stringify(loop));
    const box = fig.nodes.find((n) => n.id === "a");
    const pts = [...(loop?.d ?? "").matchAll(/(-?[0-9.]+),(-?[0-9.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    assert.ok(box && pts.some(([x, y]) => (x ?? 0) > box.x + box.w || (y ?? 0) < box.y), `loop leaves box a: ${loop?.d}`);
  }
  {
    const f = setup(chain());
    const seq = (n, extra = []) => ({
      id: `w${n}`,
      title: `Width ${n}`,
      chapter: "s1",
      summary: `A sequence of ${n} participants passes one call along.`,
      participants: Array.from({ length: n }, (_, k) => ({ id: `p-${k + 1}`, label: `Part ${k + 1}`, look: "service", evidence: ev })),
      messages: [...Array.from({ length: n - 1 }, (_, k) => ({ n: k + 1, from: `p-${k + 1}`, to: `p-${k + 2}`, label: `Call ${k + 1}`, evidence: ev })), ...extra]
    });
    const long = "Reads the session token from the cache, then refreshes it for the caller";
    const w4 = seq(4);
    w4.messages[0] = { ...w4.messages[0], label: long.slice(0, 60) };
    w4.messages[1] = { ...w4.messages[1], short: "POST /prompts" };
    w4.messages.push({ n: 4, from: "p-4", to: "p-4", label: "Checks its own quota before it answers anyone", evidence: ev });
    f.fragment("flows", { sequences: [w4, seq(6), seq(8), seq(9), seq(12)] });
    f.commit("host", "sequences");
    built(f);
    const model = mergedModel(f);
    const figs = (await (0, import_sf_layout.layoutAll)(model)).figures;
    const fig = (k) => {
      const x = figs.find((y) => y.key === k);
      assert.ok(x, k);
      return x;
    };
    const table = [4, 6, 8, 9, 12].map((n) => {
      const x = fig(`seq-w${n}`);
      const l = x.lanes ?? [];
      return [l.length, (l[1]?.x ?? 0) - (l[0]?.x ?? 0), x.width];
    });
    assert.deepStrictEqual(table, [[4, 180, 748], [6, 138, 856], [8, 104, 860], [9, 104, 964], [12, 104, 1276]]);
    for (const [n, yes] of [[4, "no"], [6, "no"], [8, "no"], [9, "yes"], [12, "yes"]]) {
      const line = (0, import_sf_layout.reportLine)(entry(f, `seq-w${n}`));
      assert.ok(line.startsWith(`seq-w${n} `) && line.includes(` lifelines participants=${n} messages=`) && line.endsWith(`scrolls at 860: ${yes}`), line);
    }
    for (const l of report(f).filter((x) => x.key.startsWith("seq-"))) assert.strictEqual(l.crossings, 0, l.key);
    const w = fig("seq-w4");
    assert.deepStrictEqual([w.nodes, w.edges, w.groups], [[], [], []]);
    const row = (n) => w.rows?.find((r) => r.id === `w4#${n}`);
    assert.strictEqual(row(2)?.text, "POST /prompts");
    const cut = row(1)?.text ?? "";
    assert.ok(cut.length > 0 && cut.length <= 26, cut);
    const self = row(4)?.label;
    assert.ok(row(4)?.self && self && self.x + self.w <= 734 && self.x >= 14, JSON.stringify(row(4)));
  }
  {
    const f = setup(chain());
    f.fragment("flows", {
      sequences: [{
        id: "rows",
        title: "Rows",
        chapter: "s1",
        summary: "The first part calls the second, which calls itself and answers.",
        participants: ["a", "b"].map((id) => ({ id, label: id.toUpperCase(), look: "service", evidence: ev })),
        messages: [
          { n: 1, from: "a", to: "b", label: "Asks", mode: "async", evidence: ev },
          { n: 2, from: "b", to: "b", label: "Thinks", evidence: ev },
          { n: 3, from: "b", to: "a", label: "Answers", evidence: ev }
        ]
      }]
    });
    f.commit("host", "sequence");
    built(f);
    const fig = await figure(f, "seq-rows");
    assert.deepStrictEqual(fig.rows?.map((r) => [r.y, r.self, r.mode]), [[72, false, "async"], [112, true, "sync"], [168, false, "sync"]]);
    assert.strictEqual(fig.height, 232);
  }
  {
    const f = setup(chain());
    built(f);
    const fig = await figure(f, "seq-turn");
    const r = (n) => fig.rows?.find((x) => x.id === `turn#${n}`);
    assert.deepStrictEqual([r(4)?.reply, r(4)?.leaves, r(5)?.reply, r(5)?.leaves], [false, true, true, false]);
    assert.deepStrictEqual(fig.steps[0], { edges: ["turn#1"], nodes: ["client", "api"], caption: "Step 1: Client to Service: The client opens a link.", where: "app/x.rb:1-4" });
    assert.deepStrictEqual(fig.lanes?.map((l) => [l.id, l.look, l.title]), [["client", "client", "Client"], ["api", "service", "Service"], ["db", "store", "Store"], ["mail", "external", "Mailer"]]);
    assert.ok(fig.lanes?.every((l) => l.lines.length >= 1 && l.lines.length <= 2 && l.w === 168), JSON.stringify(fig.lanes));
  }
  {
    const f = setup(chain());
    const app = (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, F, "app.json"), "utf8"));
    const m1 = app.sequences[0]?.messages[0];
    assert.ok(m1);
    m1.label = "Sends the prompt?";
    f.fragment("app", app);
    f.commit("host", "relabel");
    built(f);
    const caption = (await figure(f, "seq-turn")).steps[0]?.caption ?? "";
    assert.ok(caption.endsWith(": Sends the prompt."), caption);
  }
  {
    const role40 = "Keeps every link and its expiry date too";
    assert.strictEqual(role40.length, 40);
    const f = setup({ id: "system", level: 0, nodes: [{ ...node("link"), role: "Expires a link", look: "client" }, { ...node("db"), role: role40, kind: "database", look: "store" }], edges: [edge("link", "db")] });
    built(f);
    const fig = await figure(f, "level-system");
    assert.deepStrictEqual(fig.nodes.map((n) => [n.id, n.sub, n.look]), [["link", "Expires a link", "client"], ["db", "database", "store"]]);
    assert.deepStrictEqual(fig.steps[0]?.where, "app/x.rb:1-4");
    assert.ok(!fig.steps[0]?.caption.includes("app/x.rb"), fig.steps[0]?.caption);
  }
  {
    const f = setup({ id: "system", level: 0, nodes: [node("api"), node("db")], edges: [edge("api", "db")] });
    f.fragment("flows", {
      storeFlows: [{
        id: "first",
        trigger: "A link is opened",
        chapter: "s1",
        summary: "The api writes two rows and reads one token.",
        steps: [
          { n: 1, actor: "api", op: "write", store: "sql", key: "links", evidence: ev },
          { n: 2, actor: "api", op: "write", store: "sql", key: "clicks", evidence: ev },
          { n: 3, actor: "api", op: "read", store: "cache", key: "token", evidence: ev }
        ]
      }]
    });
    f.commit("host", "flow");
    built(f);
    const fig = await figure(f, "flow-first");
    assert.deepStrictEqual(fig.nodes.map((n) => [n.id, n.store, n.look]), [["api", false, "service"], ["sql", true, "store"], ["cache", true, "store"]]);
    assert.deepStrictEqual(fig.edges.map((x) => x.label?.text).sort(), ["read", "write"]);
  }
  {
    const f = setup({
      id: "system",
      level: 0,
      nodes: ["a", "b", "c", "d"].map((id) => node(id)),
      edges: [edge("a", "b"), edge("b", "c"), edge("c", "d")],
      groups: [{ id: "g1", label: "Group one", members: ["a", "b"], evidence: ev }, { id: "g2", label: "Group two", members: ["c"], evidence: ev }]
    });
    built(f);
    const fig = await figure(f, "level-system");
    assert.strictEqual(fig.groups.length, 2);
    const inside = (n, g) => {
      const b = fig.nodes.find((x) => x.id === n), r = fig.groups.find((x) => x.id === g);
      return !!b && !!r && b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h;
    };
    assert.ok(inside("a", "g1") && inside("b", "g1") && inside("c", "g2"), JSON.stringify(fig));
  }
  {
    const f = setup(chain(), [{ id: "grid2", level: 1, parent: "system", nodes: ["p", "q"].map((id) => node(id)), edges: [edge("p", "q")] }]);
    const out = built(f);
    assert.strictEqual(out.layout.length, 3);
    assert.deepStrictEqual(out.layout, report(f));
    const g = setup(chain(), [{ id: "grid2", level: 1, parent: "system", nodes: ["p", "q"].map((id) => node(id)), edges: [edge("p", "q")] }]);
    built(g);
    assert.strictEqual(reportBytes(g), reportBytes(f));
  }
  console.log("system-flow-layout.test.js: OK");
}
main().catch((e) => {
  console.error(e.stack ?? e.message);
  process.exit(1);
});
