// generated from src/scripts/system-flow-archify.test.ts by scripts/build: edit there, not here
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
var import_sf_diagrams = require("../lib/sf-diagrams.js");
var import_sf_theme = require("../lib/sf-theme.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const SITE = "docs/system-flow";
const D = `${SITE}/diagrams`;
const ev = (p, lines, symbol) => [{ path: p, lines, symbol }];
const FAKE = `import fs from 'node:fs';
import path from 'node:path';
const a = process.argv.slice(2);
const [, type, specPath, out] = a;
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')); // ts-gate-ok: plain JS inside the fake
const name = path.basename(out, '.html');
// The monotonic clock, shared by every process on the machine; the wall clock can step back under WSL.
const now = () => Number(process.hrtime.bigint() / 1000000n);
const start = now();
await new Promise((r) => setTimeout(r, Number(process.env.FAKE_SLEEP_MS || 0)));
const fails = (process.env.FAKE_FAIL || '').split(',').filter(Boolean);
const max = Number(process.env.FAKE_MAX_MSGS || 1e9);
const messages = (spec.messages || []).length;
const bad = fails.some((n) => name === n || name.startsWith(n + '-p')) || (type === 'sequence' && messages > max);
const receipt = a[a.indexOf('--receipt') + 1];
fs.mkdirSync(path.dirname(receipt), { recursive: true });
fs.writeFileSync(receipt, JSON.stringify({ name, ok: !bad }));
if (!bad) fs.writeFileSync(out, '<!doctype html><html><head><style>:root{--bg:#000}</style></head><body>' + name + '</body></html>');
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ args: a, name, messages, start, end: now() }) + '\\n');
process.exit(bad ? 1 : 0);
`;
function fake(f, dir) {
  const abs = path.isAbsolute(dir) ? dir : path.join(f.base, dir);
  fs.mkdirSync(path.join(abs, "bin"), { recursive: true });
  fs.writeFileSync(path.join(abs, "bin", "archify.mjs"), FAKE);
  fs.writeFileSync(path.join(abs, "skill-release.json"), '{"version": "0.0.0-fake"}\n');
  return abs;
}
function setup(extraSeqs = 0) {
  const f = (0, import_sf_fixture.sfFixture)();
  f.fxJson({});
  f.fragment("meta", { schemaVersion: 1, meta: { roots: [{ id: "backend" }] } });
  const nodes = [
    { id: "api", label: "API", kind: "backend", role: "Takes calls", evidence: ev("app/x.rb", "1-4", "Link") },
    { id: "db", label: "Database", kind: "database", role: "Stores rows", evidence: ev("app/y.rb", "1-2", "Y") }
  ];
  f.fragment("level0", { levels: { root: "system", diagrams: [
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
      nodes,
      edges: [{ from: "api", to: "db", label: "reads", evidence: ev("app/y.rb", "1-2", "Y") }]
    }
  ] } });
  f.fragment("chapters", { sections: [{ id: "s1", title: "Links", question: "Where?", diagrams: ["system", "engine"], bullets: [{ id: "b1", text: "x", evidence: ev("app/x.rb", "4", "expired?") }] }] });
  const parts = [{ id: "api", label: "API", evidence: ev("app/x.rb", "1", "Link") }, { id: "db", label: "DB", evidence: ev("app/y.rb", "1", "Y") }];
  const seq = (id, n) => ({
    id,
    title: id,
    chapter: "s1",
    participants: parts,
    messages: Array.from({ length: n }, (_, i) => ({ n: i + 1, from: i % 2 ? "db" : "api", to: i % 2 ? "api" : "db", label: `Step ${i + 1}`, evidence: ev("app/y.rb", "1", "Y") }))
  });
  f.fragment("flows", {
    sequences: [seq("turn", 14), ...Array.from({ length: extraSeqs }, (_, i) => seq(`x${i}`, 2))],
    stores: { sql: [{ id: "links-table", table: "links", evidence: ev("app/y.rb", "1", "Y") }] },
    storeFlows: [{ id: "first", trigger: "A link is opened", chapter: "s1", steps: Array.from({ length: 7 }, (_, i) => ({ n: i + 1, actor: "api", op: i % 2 ? "write" : "read", store: "sql", key: "links:{id}", evidence: ev("app/x.rb", "4", "expired?") })) }]
  });
  return f;
}
const logOf = (f) => fs.existsSync(path.join(f.base, "calls.log")) ? fs.readFileSync(path.join(f.base, "calls.log"), "utf8").trim().split("\n").filter(Boolean).map((l) => (0, import_json.parseJson)(l)) : [];
const run = (f, args, env = {}) => f.run(["build", ...args], { FAKE_LOG: path.join(f.base, "calls.log"), ...env });
const ok = (f, args, env = {}) => {
  const r = run(f, args, env);
  assert.strictEqual(r.status, 0, `build ${args.join(" ")}
${r.stdout}${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const read = (f, rel) => fs.readFileSync(path.join(f.host, rel), "utf8");
const fxDoc = (f) => (0, import_json.parseJson)(read(f, ".fx.json"));
const reason = (o, name) => o.diagrams.find((d) => d.name === name);
{
  const f = setup();
  const a = fake(f, "fake");
  ok(f, ["--archify", a]);
  const calls = logOf(f);
  assert.deepStrictEqual(calls.map((c) => c.name).sort(), ["arch-engine", "arch-system", "flow-first", "seq-turn", "seq-turn-p2"]);
  for (const c of calls) {
    const type = c.name.startsWith("arch-") ? "architecture" : "sequence";
    assert.deepStrictEqual(c.args, [
      "finalize",
      type,
      path.join(f.host, D, "src", `${c.name}.json`),
      path.join(f.host, D, `${c.name}.html`),
      "--repo-root",
      f.host,
      "--quality",
      "showcase",
      "--receipt",
      path.join(f.host, D, `${c.name}.receipt.json`),
      "--json"
    ], c.name);
  }
}
{
  const f = setup(4);
  const a = fake(f, "fake");
  ok(f, ["--archify", a], { FAKE_SLEEP_MS: "200" });
  const calls = logOf(f);
  assert.strictEqual(calls.length, 9);
  const overlap = Math.max(...calls.map((c) => calls.filter((o) => o.start < c.end && c.start < o.end).length));
  assert.strictEqual(overlap, 1, `overlap ${overlap}`);
}
const theme = (ink, accent) => {
  const v = (k) => Object.fromEntries(import_sf_theme.SLOTS.map((s) => [s, s === "--ink" ? ink : s === "--accent" ? accent : "#abcdef"]));
  return { source: "t", kind: "fx", light: v("l"), dark: v("d"), fonts: { text: null, code: null }, fallbacks: [] };
};
const BEGIN = "/* fx-theme:begin */", END = "/* fx-theme:end */";
const varOf = (css, name) => [...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, "g"))].map((m) => m[1]);
{
  const f = setup();
  ok(f, ["--archify", fake(f, "fake")]);
  const css = read(f, `${SITE}/assets/theme.css`);
  const inkLight = /:root \{[^}]*--ink: ([^;]+);/.exec(css)[1];
  const inkDark = /:root\[data-theme="dark"\] \{[^}]*--ink: ([^;]+);/.exec(css)[1];
  assert.notStrictEqual(inkLight, inkDark);
  for (const n of ["arch-system", "arch-engine", "seq-turn", "seq-turn-p2", "flow-first"]) {
    const html = read(f, `${D}/${n}.html`);
    assert.strictEqual(html.split(BEGIN).length, 2, n);
    assert.strictEqual(html.split(END).length, 2, n);
    const body = html.slice(html.indexOf(BEGIN), html.indexOf(END));
    assert.deepStrictEqual(varOf(body, "--text"), [inkLight, inkDark, inkDark], n);
    assert.ok(html.indexOf("--bg:#000") < html.indexOf(BEGIN), "block comes after archify's own variables");
  }
  const once = (0, import_sf_diagrams.applyThemeBlock)(read(f, `${D}/seq-turn.html`), theme("#111111", "#222222"));
  const twice = (0, import_sf_diagrams.applyThemeBlock)(once, theme("#333333", "#444444"));
  assert.strictEqual(twice.split(BEGIN).length, 2);
  assert.deepStrictEqual(varOf(twice, "--text"), ["#333333", "#333333", "#333333"]);
  assert.ok(!twice.includes("#111111"));
  assert.strictEqual((0, import_sf_diagrams.applyThemeBlock)("<p>no style</p>", theme("#111111", "#222222")).split(BEGIN).length, 2);
}
{
  const f = setup();
  const o = ok(f, ["--archify", fake(f, "fake")], { FAKE_MAX_MSGS: "5" });
  assert.deepStrictEqual(
    logOf(f).filter((c) => c.name.startsWith("seq-turn")).map((c) => `${c.name}:${c.messages}`).sort(),
    ["seq-turn-p2:6", "seq-turn-p2:5", "seq-turn-p3:4", "seq-turn:5", "seq-turn:8"].sort()
  );
  assert.deepStrictEqual(reason(o, "seq-turn"), { name: "seq-turn", renderer: "archify", reason: "archify sequence, 14 messages in 3 pages, retried at 5 per page" });
  assert.ok(fs.existsSync(path.join(f.host, D, "seq-turn-p3.html")));
}
{
  const f = setup();
  const o = ok(f, ["--archify", fake(f, "fake")], { FAKE_FAIL: "flow-first" });
  assert.deepStrictEqual(
    logOf(f).filter((c) => c.name.startsWith("flow-first")).map((c) => `${c.name}:${c.messages}`).sort(),
    ["flow-first-p2:2", "flow-first:5", "flow-first:7"]
  );
  assert.ok(read(f, `${D}/flow-first.html`).includes("<svg"));
  assert.deepStrictEqual(reason(o, "flow-first"), { name: "flow-first", renderer: "svg", reason: `animated SVG, archify failed: ${D}/flow-first-p2.receipt.json` });
}
{
  const f = setup();
  const o = ok(f, ["--archify", fake(f, "fake")], { FAKE_FAIL: "arch-engine" });
  assert.strictEqual(logOf(f).filter((c) => c.name === "arch-engine").length, 1);
  assert.ok(read(f, `${D}/arch-engine.html`).includes("<svg"));
  assert.deepStrictEqual(reason(o, "arch-engine"), { name: "arch-engine", renderer: "svg", reason: `static SVG, archify failed: ${D}/arch-engine.receipt.json` });
}
{
  const f = setup();
  ok(f, ["--archify", fake(f, "fake"), "--page-limit", "seq-turn=5"]);
  assert.deepStrictEqual(logOf(f).filter((c) => c.name.startsWith("seq-turn")).map((c) => `${c.name}:${c.messages}`).sort(), ["seq-turn-p2:5", "seq-turn-p3:4", "seq-turn:5"]);
}
{
  const f = setup();
  const o = ok(f, ["--archify", fake(f, "fake"), "--svg", "seq-turn"]);
  assert.deepStrictEqual(logOf(f).map((c) => c.name).filter((n) => n.startsWith("seq-turn")), []);
  assert.strictEqual(reason(o, "seq-turn").reason, "animated SVG, owner or lane chose SVG");
  assert.strictEqual(reason(o, "seq-turn-p2").reason, "animated SVG, owner or lane chose SVG");
}
{
  const f = setup();
  f.fxJson({ keep: 1, system_flow: { output: { site: SITE, markdown: "docs/system" } } });
  const first = ok(f, ["--archify", fake(f, "fake"), "--page-limit", "seq-turn=5", "--svg", "arch-engine"]);
  const doc = fxDoc(f);
  assert.deepStrictEqual(doc.system_flow.diagrams, { pageLimits: { "seq-turn": 5 }, svg: ["arch-engine"] });
  assert.strictEqual(doc.keep, 1);
  assert.deepStrictEqual(doc.system_flow.output, { site: SITE, markdown: "docs/system" });
  assert.ok(!read(f, ".fx.json").includes(f.base), "no absolute path in .fx.json");
  const names = ["seq-turn", "seq-turn-p2", "seq-turn-p3", "arch-engine"];
  const bytes = () => names.map((n) => read(f, `${D}/${n}.html`));
  const before = bytes();
  fake(f, path.join(f.home, ".claude", "skills", "archify"));
  const second = ok(f, []);
  assert.deepStrictEqual(second.diagrams, first.diagrams);
  assert.strictEqual(reason(second, "seq-turn").reason, "archify sequence, 14 messages in 3 pages");
  assert.strictEqual(reason(second, "arch-engine").reason, "static SVG, owner or lane chose SVG");
  assert.deepStrictEqual(bytes(), before);
  ok(f, ["--page-limit", "seq-turn=5", "--svg", "arch-engine"]);
  assert.deepStrictEqual(fxDoc(f).system_flow.diagrams, { pageLimits: { "seq-turn": 5 }, svg: ["arch-engine"] });
}
{
  const f = setup();
  fake(f, path.join(f.home, ".claude", "skills", "archify"));
  f.fragment("bad", { sections: [{ id: "s1", title: "dup", question: "q" }] });
  assert.strictEqual(run(f, ["--svg", "arch-engine"]).status, 1);
  assert.strictEqual(fxDoc(f).system_flow?.diagrams, void 0);
}
const detectOf = (f, env = {}) => (0, import_json.parseJson)(f.run(["detect"], env).stdout);
{
  const f = setup();
  assert.strictEqual(detectOf(f).archify, null);
  fs.mkdirSync(path.join(f.base, "empty-cfg", "skills", "archify"), { recursive: true });
  assert.strictEqual(detectOf(f, { CLAUDE_CONFIG_DIR: path.join(f.base, "empty-cfg") }).archify, null);
  const tools = fake(f, path.join(f.host, "tools", "archify"));
  f.fxJson({ system_flow: { diagrams: { archify: "tools/archify" } } });
  assert.deepStrictEqual(detectOf(f).archify, { dir: tools, version: "0.0.0-fake", via: ".fx.json" });
  const home = fake(f, path.join(f.home, ".claude", "skills", "archify"));
  assert.strictEqual(detectOf(f).archify.via, "HOME");
  assert.strictEqual(detectOf(f).archify.dir, home);
  const cfg = fake(f, path.join(f.base, "cfg", "skills", "archify"));
  const d = detectOf(f, { CLAUDE_CONFIG_DIR: path.join(f.base, "cfg") });
  assert.deepStrictEqual(d.archify, { dir: cfg, version: "0.0.0-fake", via: "CLAUDE_CONFIG_DIR" });
}
{
  const f = setup();
  fake(f, path.join(f.home, ".claude", "skills", "archify"));
  const o = ok(f, ["--prefer", "cheap"]);
  assert.deepStrictEqual(logOf(f), []);
  for (const d2 of o.diagrams) assert.ok(d2.reason.endsWith(", preference cheap"), d2.reason);
  assert.strictEqual(fxDoc(f).system_flow.diagrams.prefer, "cheap");
  assert.strictEqual(detectOf(f).archify, null);
  ok(f, []);
  assert.strictEqual(logOf(f).length, 0, "the saved cheap holds");
  const d = ok(f, ["--prefer", "detailed"]);
  assert.strictEqual(logOf(f).length, 5);
  assert.strictEqual(reason(d, "arch-system").renderer, "archify");
  assert.strictEqual(reason(d, "arch-system").reason, "archify architecture, 2 components");
  assert.strictEqual(reason(d, "flow-first").reason, "archify sequence, 7 messages in 1 pages");
}
{
  const f = setup();
  f.fxJson({ system_flow: { diagrams: { prefer: "cheap" } } });
  const a = fake(f, "fake");
  const o = ok(f, ["--archify", a]);
  assert.strictEqual(logOf(f).length, 5);
  assert.strictEqual(reason(o, "arch-system").renderer, "archify");
  ok(f, ["--prefer", "cheap", "--archify", a]);
  assert.strictEqual(logOf(f).length, 10);
  assert.strictEqual(fxDoc(f).system_flow.diagrams.prefer, "cheap");
}
{
  const f = setup();
  const lvl = (0, import_json.parseJson)(read(f, `${SITE}/model/fragments/level0.json`));
  const [api, db] = lvl.levels.diagrams[1].nodes;
  const ROLE = "Sends prompts and reads answers over HTTP, SSE or SignalR to the backend.";
  const LABEL = "Primary relational database cluster";
  api.role = ROLE;
  db.label = LABEL;
  f.fragment("level0", lvl);
  const fl = (0, import_json.parseJson)(read(f, `${SITE}/model/fragments/flows.json`));
  const PART = "AnswerChannelPumpBackgroundWorker";
  fl.sequences[0].participants[0].label = PART;
  f.fragment("flows", fl);
  const o = ok(f, ["--archify", fake(f, "fake")]);
  const cutOf = (whole, got) => {
    assert.ok(got.endsWith("...") && whole.startsWith(got.slice(0, -3)), got);
  };
  const arch = (0, import_json.parseJson)(read(f, `${D}/src/arch-engine.json`));
  const c = (id) => arch.components.find((x) => x.id === id);
  cutOf(ROLE, c("api").sublabel);
  assert.ok([...c("api").sublabel].length * 3.6 <= c("api").size[0] - 8, c("api").sublabel);
  cutOf(LABEL, c("db").label);
  assert.ok([...c("db").label].length * 6.6 <= c("db").size[0] + 8, c("db").label);
  for (const n of ["seq-turn", "seq-turn-p2"]) {
    const seq = (0, import_json.parseJson)(read(f, `${D}/src/${n}.json`));
    const box = Math.max(86, Math.min(190, Math.round((seq.meta.viewBox[0] - 124) / seq.participants.length) - 24));
    const p = seq.participants.find((x) => x.id === "api");
    cutOf(PART, p.label);
    assert.ok([...p.label].length * 6.8 <= box + 6, `${n} ${p.label} ${box}`);
  }
  assert.strictEqual(reason(o, "arch-engine").reason, "archify architecture, 2 components, shortened: api sublabel, db label");
  assert.strictEqual(reason(o, "seq-turn").reason, "archify sequence, 14 messages in 2 pages, shortened: api label");
  assert.strictEqual(reason(o, "arch-system").reason, "archify architecture, 2 components");
}
{
  const f = setup();
  const o = ok(f, []);
  assert.deepStrictEqual(logOf(f), []);
  for (const d of o.diagrams) assert.ok(d.reason.endsWith(", archify not installed"), d.reason);
}
{
  const f = setup();
  for (const args of [["--page-limit", "seq-turn"], ["--page-limit", "seq-turn=9"], ["--page-limit", "seq-turn=0"], ["--prefer", "max"], ["--svg"]]) {
    const r = run(f, args);
    assert.strictEqual(r.status, 2, args.join(" "));
  }
}
{
  const root = path.join(__dirname, "..");
  const adapter = fs.readFileSync(path.join(root, "references", "visual", "archify-adapter.md"), "utf8");
  for (const s of ["sources", "one repository", "fx-theme:begin", "390", "5 messages per page", "$CLAUDE_CONFIG_DIR/skills/archify"]) assert.ok(adapter.includes(s), s);
  const check = fs.readFileSync(path.join(root, "references", "visual", "visual-check.md"), "utf8");
  assert.ok(/archify outputs are opened at 1440 and 390, light and dark/.test(check));
}
console.log("system-flow-archify.test.js: OK");
