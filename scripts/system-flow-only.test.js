// generated from src/scripts/system-flow-only.test.ts by scripts/build: edit there, not here
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
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const ev = [{ path: "app/x.rb", lines: "1-4", symbol: "Link" }];
const TEXT = "A link expires after 30 days.";
const corr = (item, before, after) => ({ id: `c-${item.replace(/\W/g, "-")}`, date: "2026-10-28", item, before, after, reason: "stale", evidence: [{ owner: "2026-10-28" }] });
const model = (f, t = {}) => {
  f.fragment("meta", { schemaVersion: 2, meta: { roots: [{ id: "backend" }] } });
  f.fragment("level0", {
    levels: { root: "engine", diagrams: [{
      id: "engine",
      level: 0,
      title: "Engine",
      summary: "S",
      groups: [],
      nodes: [{ id: "api", label: t.api ?? "API", kind: "backend", look: "service", role: "R", evidence: ev }, { id: "db", label: "Db", kind: "database", look: "service", role: "R", evidence: ev }, ...t.extra ?? []],
      edges: [{ from: "api", to: "db", label: "reads", evidence: ev }]
    }] }
  });
  f.fragment("chapters", { sections: [
    { id: "s1", title: "Links", question: "Q?", diagrams: ["engine"], bullets: [{ id: "b1", text: t.b1 ?? TEXT, evidence: ev }] },
    { id: "s2", title: "Turns", question: "Q?", bullets: [{ id: "b2", text: "Second.", evidence: ev }] }
  ] });
  f.fragment("flows", { sequences: [{
    id: "turn",
    title: "Turn",
    chapter: "s2",
    participants: [{ id: "api", label: "API", look: "service", evidence: ev }, { id: "db", label: "DB", look: "service", evidence: ev }],
    messages: Array.from({ length: t.turn ?? 1 }, (_, i) => ({ n: i + 1, from: i % 2 ? "db" : "api", to: i % 2 ? "api" : "db", label: `Reads ${i + 1}`, evidence: ev }))
  }] });
  f.floor();
};
const setup = () => {
  const f = (0, import_sf_fixture.sfFixture)();
  model(f);
  f.commit("host", "fragments");
  return f;
};
const ALWAYS = ["docs/system/index.md", "docs/system/start-here/index.md", "docs/system/coverage.md", "docs/system/rules-in-force.md", "docs/system/glossary.md"];
const GEN = ["docs/system/s1.md", "docs/system/s2.md", "docs/system-flow/diagrams/seq-turn.html", "docs/system-flow/diagrams/arch-engine.html", "docs/system-flow/index.html"];
const snap = (f) => Object.fromEntries(GEN.map((r) => {
  const file = path.join(f.host, r);
  return [r, { text: fs.readFileSync(file, "utf8"), mtime: fs.statSync(file).mtimeMs }];
}));
const pause = () => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40);
};
const full = (f) => {
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const only = (f, ...a) => {
  pause();
  const r = f.run(["build", "--only", ...a]);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const same = (before, after, rel, why) => {
  assert.deepStrictEqual(after[rel], before[rel], `${rel} kept its bytes and mtime: ${why}`);
};
const changed = (before, after, rel) => {
  assert.notStrictEqual(after[rel].text, before[rel].text, `${rel} changed`);
};
{
  const f = setup();
  const first = full(f);
  assert.deepStrictEqual(first.rebuilt.docs.filter((d) => /\/s\d\.md$/.test(d)).sort(), ["docs/system/s1.md", "docs/system/s2.md"], "full build lists every section doc");
  assert.ok(first.rebuilt.figures.includes("level-engine") && first.rebuilt.diagrams.includes("seq-turn"), "full build lists every figure and diagram");
  const before = snap(f);
  model(f, { b1: "A link expires after 60 days." });
  f.fragment("corrections", { corrections: [corr("bullet:b1", TEXT, "A link expires after 60 days.")] });
  const r = only(f, "bullet:b1");
  assert.deepStrictEqual(r.rebuilt, { docs: ["docs/system/s1.md", ...ALWAYS], figures: [], diagrams: [] });
  const after = snap(f);
  changed(before, after, "docs/system/s1.md");
  for (const rel of ["docs/system/s2.md", "docs/system-flow/diagrams/seq-turn.html", "docs/system-flow/diagrams/arch-engine.html"]) same(before, after, rel, "bullet:b1");
  assert.notStrictEqual(after["docs/system-flow/index.html"].mtime, before["docs/system-flow/index.html"].mtime, "index.html rewritten");
  const again = snap(f);
  only(f, "bullet:b1");
  assert.deepStrictEqual(Object.values(snap(f)).map((x) => x.text), Object.values(again).map((x) => x.text), "repeat gives the same bytes");
  const q = (0, import_json.parseJson)(f.run(["query", "app/x.rb"]).stdout);
  assert.ok(q.items.length > 0);
  assert.deepStrictEqual(only(f, "app/x.rb").rebuilt, { docs: ["docs/system/start-here/start-parts.md", "docs/system/s1.md", "docs/system/s2.md", ...ALWAYS], figures: ["level-engine", "seq-turn"], diagrams: ["arch-engine", "seq-turn"] });
  assert.deepStrictEqual(only(f, "bullet:b1,bullet:b2").rebuilt.docs, ["docs/system/s1.md", "docs/system/s2.md", ...ALWAYS]);
  assert.deepStrictEqual(only(f, "bullet:b1", "--only", "bullet:b2").rebuilt.docs, ["docs/system/s1.md", "docs/system/s2.md", ...ALWAYS]);
}
{
  const f = setup();
  full(f);
  model(f, { api: "Gateway" });
  f.fragment("corrections", { corrections: [corr("node:api", "API", "Gateway")] });
  const before = snap(f);
  const r = only(f, "node:api");
  assert.deepStrictEqual(r.rebuilt, { docs: ["docs/system/start-here/start-parts.md", "docs/system/s1.md", ...ALWAYS], figures: ["level-engine"], diagrams: ["arch-engine"] });
  same(before, snap(f), "docs/system-flow/diagrams/seq-turn.html", "node:api");
}
{
  const f = setup();
  full(f);
  assert.deepStrictEqual(only(f, "seq:turn").rebuilt, { docs: ["docs/system/s2.md", ...ALWAYS], figures: ["seq-turn"], diagrams: ["seq-turn"] });
  assert.deepStrictEqual(only(f, "diagram:engine").rebuilt, { docs: ["docs/system/start-here/start-parts.md", "docs/system/s1.md", ...ALWAYS], figures: ["level-engine"], diagrams: ["arch-engine"] });
  assert.deepStrictEqual(only(f, "section:s2").rebuilt, { docs: ["docs/system/s2.md", ...ALWAYS], figures: [], diagrams: [] });
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  model(f, { extra: [{ id: "turn", label: "Turn", kind: "backend", look: "service", role: "R", evidence: ev }] });
  f.fragment("level0", { levels: { root: "engine", diagrams: [{
    id: "engine",
    level: 0,
    title: "Engine",
    summary: "S",
    groups: [],
    nodes: [{ id: "api", label: "API", kind: "backend", look: "service", role: "R", evidence: ev }, { id: "turn", label: "Turn", kind: "backend", look: "service", role: "R", evidence: ev }],
    edges: [{ from: "api", to: "turn", label: "x", evidence: ev }]
  }] } });
  f.floor();
  f.commit("host", "fragments");
  full(f);
  const r = only(f, "node:turn").rebuilt;
  assert.deepStrictEqual(r.figures, ["level-engine"], "node turn is not sequence turn");
  assert.deepStrictEqual(r.diagrams, ["arch-engine"]);
}
{
  const f = setup();
  full(f);
  const before = snap(f);
  const r = f.run(["build", "--only", "node:ghost"]);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /^system-flow: build: no item node:ghost$/m);
  assert.deepStrictEqual(snap(f), before, "nothing written");
}
{
  const f = setup();
  full(f);
  const before = snap(f);
  f.fragment("chapters", { sections: [
    { id: "s1", title: "Links", question: "Q?", diagrams: ["engine"], bullets: [{ id: "b1", text: TEXT, evidence: [{ path: "app/x.rb", lines: "90-99", symbol: "Link" }] }] },
    { id: "s2", title: "Turns", question: "Q?", bullets: [{ id: "b2", text: "Second.", evidence: ev }] }
  ] });
  const r = f.run(["build", "--only", "bullet:b1"]);
  assert.strictEqual(r.status, 1, "a bad range fails the check first");
  assert.deepStrictEqual(snap(f), before, "nothing written");
}
{
  const f = setup();
  const head = f.git("host", "rev-parse", "HEAD");
  full(f);
  const chapters = () => (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, "docs/system-flow/model/fragments/chapters.json"), "utf8"));
  const strip = chapters();
  for (const s of strip.sections) for (const b of s.bullets) delete b.verified;
  f.fragment("chapters", strip);
  only(f, "bullet:b1");
  const [s1, s2] = chapters().sections.slice(4);
  assert.deepStrictEqual(s1?.bullets[0]?.verified, { backend: head }, "selected item stamped");
  assert.strictEqual(s2?.bullets[0]?.verified, void 0, "item outside --only not stamped");
}
{
  const f = setup();
  f.fragment("stores", { stores: { sql: [{ id: "links-table", table: "links", evidence: ev }] } });
  f.commit("host", "stores");
  full(f);
  f.fragment("stores", { stores: { sql: [{ id: "links-table", table: "short_links", evidence: ev }] } });
  f.fragment("corrections", { corrections: [corr("store:links-table", "links", "short_links")] });
  const r = only(f, "store:links-table");
  assert.deepStrictEqual(r.rebuilt.docs, ["docs/system/stores.md", ...ALWAYS]);
  assert.ok(fs.readFileSync(path.join(f.host, "docs/system/stores.md"), "utf8").includes("| short_links |"));
}
const deepLink = (f, key) => {
  const page = fs.readFileSync(path.join(f.host, "docs/system-flow/index.html"), "utf8");
  const c = new RegExp(`<figure class="card" id="fig-${key}">[\\s\\S]*?</figure>`).exec(page)?.[0] ?? "";
  return /<a class="deep" [^>]*>[^<]*<\/a>/.exec(c)?.[0] ?? `no card ${key}`;
};
{
  const f = setup();
  const r = f.run(["build", "--prefer", "cheap"]);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  const before = fs.readFileSync(path.join(f.host, "docs/system-flow/index.html"), "utf8");
  model(f, { b1: "A link expires after 60 days." });
  f.fragment("corrections", { corrections: [corr("bullet:b1", TEXT, "A link expires after 60 days.")] });
  const o = only(f, "bullet:b1", "--prefer", "cheap");
  assert.deepStrictEqual(o.rebuilt.figures, []);
  assert.notStrictEqual(fs.readFileSync(path.join(f.host, "docs/system-flow/index.html"), "utf8"), before, "index.html rewritten");
  assert.strictEqual(deepLink(f, "seq-turn"), '<a class="deep" href="diagrams/seq-turn.html">Open full diagram</a>');
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  model(f, { turn: 9 });
  f.commit("host", "fragments");
  const fake = path.join(f.base, "fake");
  fs.mkdirSync(path.join(fake, "bin"), { recursive: true });
  fs.writeFileSync(path.join(fake, "bin", "archify.mjs"), `import fs from 'node:fs';
const a = process.argv.slice(2);
if (a[0] !== 'finalize') process.exit(1);
fs.writeFileSync(a[a.indexOf('--receipt') + 1], '{}');
fs.writeFileSync(a[3], '<!doctype html><html><body>archify page</body></html>');
`);
  const r = f.run(["build", "--archify", fake]);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.ok(fs.existsSync(path.join(f.host, "docs/system-flow/diagrams/seq-turn-p2.html")), "turn is paged");
  assert.strictEqual(deepLink(f, "seq-turn"), '<a class="deep" href="diagrams/seq-turn.html">Open in archify</a>', "the full build");
  only(f, "bullet:b1");
  assert.strictEqual(deepLink(f, "seq-turn"), '<a class="deep" href="diagrams/seq-turn.html">Open in archify</a>', "the --only build");
}
{
  const f = setup();
  const r = f.run(["build", "--prefer", "cheap", "--only", "bullet:b1"]);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  const out = (0, import_json.parseJson)(r.stdout);
  assert.strictEqual(deepLink(f, "seq-turn"), '<a class="deep" href="diagrams/seq-turn.html">Open full diagram</a>');
  const missing = out.problems.filter((p) => p.level === "warning" && p.message.includes("no deep page")).map((p) => p.message).sort();
  assert.deepStrictEqual(missing, [
    "figure level-engine: no deep page docs/system-flow/diagrams/arch-engine.html; its card links a missing page until a build renders it",
    "figure seq-floor-visit: no deep page docs/system-flow/diagrams/seq-floor-visit.html; its card links a missing page until a build renders it",
    "figure seq-turn: no deep page docs/system-flow/diagrams/seq-turn.html; its card links a missing page until a build renders it"
  ]);
}
process.stdout.write("system-flow-only.test.js: OK\n");
