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
// archify validate --layout-json: the auto canvas, FAKE_VIEWBOX or 600 by 400; FAKE_VALIDATE_FAIL or FAKE_VALIDATE_HANG names a spec.
if (a[0] === 'validate' && process.env.FAKE_VALIDATE_HANG === path.basename(a[2], '.json')) await new Promise((r) => setTimeout(r, 60000));
if (a[0] === 'validate' && process.env.FAKE_VALIDATE_FAIL === path.basename(a[2], '.json')) { process.stdout.write('{"ok":false}'); process.exit(1); }
if (a[0] === 'validate') { process.stdout.write(JSON.stringify({ ok: true, viewBox: JSON.parse(process.env.FAKE_VIEWBOX || '[600, 400]') })); process.exit(0); } // ts-gate-ok: plain JS inside the fake
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
// archify's browser-check refuses to replace evidence written for other page bytes (viewer/evidence-path-conflict),
// and the build rewrites every page with its theme block, so a leftover evidence file always mismatches.
const evidence = path.join(path.dirname(out), name + '.browser-check.json');
const conflict = process.env.FAKE_EVIDENCE === '1' && fs.existsSync(evidence);
const bad = conflict || fails.some((n) => name === n || name.startsWith(n + '-p')) || (type === 'sequence' && messages > max);
// archify leaves a pending marker beside a page whose delivery it did not finish.
fs.writeFileSync(path.join(path.dirname(out), name + '.delivery-pending.json'), '{}');
// archify runs its own stages with inherited stdio, so a hung stage holds the build's pipes open after archify dies.
if (process.env.FAKE_HANG_CHILD === name) (await import('node:child_process')).spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'inherit' });
if (process.env.FAKE_HANG === name || process.env.FAKE_HANG_CHILD === name) await new Promise((r) => setTimeout(r, 60000));
const receipt = a[a.indexOf('--receipt') + 1];
fs.mkdirSync(path.dirname(receipt), { recursive: true });
if (process.env.FAKE_NORECEIPT !== name) fs.writeFileSync(receipt, JSON.stringify({ name, ok: !bad }));
if (bad && process.env.FAKE_NOISY === '1') {
  process.stdout.write(JSON.stringify({ ok: false, code: 'geometry/edge-through-node' }) + '\\n');
  for (let i = 1; i <= 25; i++) process.stderr.write('err ' + i + '\\n');
}
if (!bad) fs.writeFileSync(out, '<!doctype html><html><head><style>:root{--bg:#000}</style></head><body><a href="#top">top</a><a class="diagram-guide-credit" href="https://github.com/tt-a1i/archify">archify</a><img src="data:image/png;base64,AA">' + (process.env.FAKE_LEAK === name ? '<script src="https://cdn.example/x.js"></script>' : '') + name + '</body></html>');
if (!bad && process.env.FAKE_EVIDENCE === '1') fs.writeFileSync(evidence, '{}');
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
  f.fragment("meta", { schemaVersion: 2, meta: { roots: [{ id: "backend" }] } });
  const nodes = [
    { id: "api", label: "API", kind: "backend", look: "service", role: "Takes calls", evidence: ev("app/x.rb", "1-4", "Link") },
    { id: "db", label: "Database", kind: "database", look: "service", role: "Stores rows", evidence: ev("app/y.rb", "1-2", "Y") }
  ];
  f.fragment("level0", { levels: { root: "system", diagrams: [
    {
      id: "system",
      level: 0,
      title: "System",
      summary: "All.",
      groups: [],
      nodes: [
        { id: "engine", label: "Engine", kind: "backend", look: "service", role: "Runs", children: "engine", evidence: ev("app/x.rb", "1-4", "Link") },
        { id: "store", label: "Store", kind: "database", look: "service", role: "Keeps", evidence: ev("app/y.rb", "1", "Y") }
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
  const parts = [{ id: "api", label: "API", look: "service", evidence: ev("app/x.rb", "1", "Link") }, { id: "db", label: "DB", look: "service", evidence: ev("app/y.rb", "1", "Y") }];
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
const run = (f, args, env = {}) => {
  f.floor();
  return f.run(["build", ...args], { FAKE_LOG: path.join(f.base, "calls.log"), ...env });
};
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
  assert.deepStrictEqual(calls.map((c) => c.name).sort(), ["arch-engine", "arch-system", "flow-first", "seq-floor-visit", "seq-turn", "seq-turn-p2"]);
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
  assert.deepStrictEqual(fs.readdirSync(path.join(f.host, D)).filter((n) => n.endsWith(".delivery-pending.json")), [], "no pending marker outlives the build (A22)");
  const page = read(f, `${SITE}/index.html`);
  for (const [key, first] of [["seq-turn", "seq-turn"], ["level-engine", "arch-engine"]]) {
    const card = new RegExp(`<figure class="card" id="fig-${key}">[\\s\\S]*?</figure>`).exec(page)?.[0] ?? "";
    assert.ok(card.includes(`<a class="deep" href="diagrams/${first}.html">Open in archify</a>`), `${key} card: ${card}`);
  }
}
{
  const f = setup();
  const a = fake(f, "fake");
  const first = ok(f, ["--archify", a], { FAKE_EVIDENCE: "1" });
  assert.ok(first.diagrams.every((d) => d.renderer === "archify"), JSON.stringify(first.diagrams));
  const again = ok(f, ["--archify", a], { FAKE_EVIDENCE: "1" });
  assert.ok(again.diagrams.every((d) => d.renderer === "archify"), JSON.stringify(again.diagrams));
}
{
  const f = setup(4);
  const a = fake(f, "fake");
  ok(f, ["--archify", a], { FAKE_SLEEP_MS: "200" });
  const calls = logOf(f);
  assert.strictEqual(calls.length, 10);
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
  assert.deepStrictEqual(reason(o, "flow-first"), { name: "flow-first", renderer: "svg", reason: `animated SVG, archify failed: ${D}/flow-first-p2.retry.receipt.json` });
}
{
  const f = setup();
  const hand = [`${D}/seq-turn-notes.html`, `${D}/seq-turn-p2x.html`, `${D}/seq-turn-p.html`, `${D}/src/seq-turn.extra.json`];
  for (const h of hand) {
    fs.mkdirSync(path.dirname(path.join(f.host, h)), { recursive: true });
    fs.writeFileSync(path.join(f.host, h), "hand");
  }
  const o = ok(f, ["--archify", fake(f, "fake")], { FAKE_FAIL: "seq-turn-p2" });
  for (const h of hand) assert.strictEqual(read(f, h), "hand", h);
  for (const h of hand) fs.renameSync(path.join(f.host, h), path.join(f.base, path.basename(h)));
  assert.deepStrictEqual(
    logOf(f).filter((c) => c.name.startsWith("seq-turn")).map((c) => `${c.name}:${c.messages}`).sort(),
    ["seq-turn-p2:5", "seq-turn-p2:6", "seq-turn-p3:4", "seq-turn:5", "seq-turn:8"]
  );
  const mine = (dir, end) => fs.readdirSync(path.join(f.host, dir)).filter((n) => n.startsWith("seq-turn") && n.endsWith(end)).sort();
  assert.deepStrictEqual(mine(D, ".html"), ["seq-turn-p2.html", "seq-turn.html"]);
  for (const n of mine(D, ".html")) assert.ok(read(f, `${D}/${n}`).includes("<svg"), n);
  assert.deepStrictEqual(mine(`${D}/src`, ".json"), ["seq-turn-p2.json", "seq-turn.json"]);
  assert.deepStrictEqual(mine(D, ".receipt.json"), ["seq-turn-p2.receipt.json", "seq-turn-p2.retry.receipt.json", "seq-turn-p3.retry.receipt.json", "seq-turn.receipt.json", "seq-turn.retry.receipt.json"]);
  assert.deepStrictEqual(reason(o, "seq-turn"), { name: "seq-turn", renderer: "svg", reason: `animated SVG, archify failed: ${D}/seq-turn-p2.retry.receipt.json` });
}
{
  const f = setup();
  const o = ok(f, ["--archify", fake(f, "fake")], { FAKE_LEAK: "arch-engine" });
  assert.ok(read(f, `${D}/arch-engine.html`).includes("<svg"));
  assert.deepStrictEqual(reason(o, "arch-engine"), { name: "arch-engine", renderer: "svg", reason: "static SVG, archify page loads outside the site: https://cdn.example/x.js" });
  for (const n of ["arch-system", "seq-turn", "seq-turn-p2", "flow-first"]) {
    assert.strictEqual(reason(o, n).renderer, "archify", n);
    assert.deepStrictEqual((0, import_sf_diagrams.outsideRefs)(read(f, `${D}/${n}.html`)), [], n);
  }
  const page = `<a href="//x.io/a"></a><a href="https://github.com/tt-a1i/archify">c</a><link rel="stylesheet" href='http://y'><img src="assets/a.png"><img src="data:image/png;base64,AA"><img srcset="a.png 1x, https://z.io/b.png 2x"><script src="../../up.js"></script><link rel="stylesheet" href="../assets/ok.css"><img src="/root.png"><style>@import "https://i.io/x.css"; @import url(../../w.css); .a{background:url(https://u.io/p.png)} .b{background:url("data:image/png;base64,AA")} .c{background:url('../assets/k.png')}</style>`;
  assert.deepStrictEqual((0, import_sf_diagrams.outsideRefs)(page).sort(), ["../../up.js", "../../w.css", "/root.png", "http://y", "https://i.io/x.css", "https://u.io/p.png", "https://z.io/b.png"]);
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
  const o = ok(f, ["--archify", fake(f, "fake"), "--archify-timeout", "1"], { FAKE_HANG: "arch-engine" });
  assert.deepStrictEqual(reason(o, "arch-engine"), { name: "arch-engine", renderer: "svg", reason: "static SVG, archify timed out after 1 s" });
  assert.strictEqual(reason(o, "arch-system").renderer, "archify");
}
{
  const f = setup();
  const t0 = Date.now();
  const o = ok(f, ["--archify", fake(f, "fake"), "--archify-timeout", "2"], { FAKE_HANG_CHILD: "arch-engine" });
  const elapsed = (Date.now() - t0) / 1e3;
  assert.strictEqual(reason(o, "arch-engine").reason, "static SVG, archify timed out after 2 s");
  assert.ok(elapsed < 15, `the build returned ${elapsed} s after a 2 s timeout; a 30 s stage outlived the kill`);
}
{
  const f = setup();
  const o = ok(f, ["--archify", fake(f, "fake")], { FAKE_FAIL: "arch-engine", FAKE_NOISY: "1", FAKE_NORECEIPT: "arch-engine" });
  const tail = Array.from({ length: 20 }, (_, i) => `err ${i + 6}`).join(" | ");
  assert.strictEqual(reason(o, "arch-engine").reason, `static SVG, archify failed: no receipt; result: {"ok":false,"code":"geometry/edge-through-node"}; stderr: ${tail}`);
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
  fake(f, path.join(f.host, "tools", "archify"));
  f.fxJson({ system_flow: { diagrams: { archify: "tools/archify" } } });
  const named = f.run(["detect"]);
  assert.strictEqual(named.status, 1, named.stdout);
  assert.ok(named.stderr.includes("/system_flow/diagrams/archify"), named.stderr);
  assert.strictEqual(run(f, []).status, 1, "build refuses it too");
  assert.deepStrictEqual(logOf(f), [], "the repo copy never ran");
  f.fxJson({});
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
  assert.strictEqual(logOf(f).length, 6);
  assert.strictEqual(reason(d, "arch-system").renderer, "archify");
  assert.strictEqual(reason(d, "arch-system").reason, "archify architecture, 2 components");
  assert.strictEqual(reason(d, "flow-first").reason, "archify sequence, 7 messages in 1 pages");
}
{
  const f = setup();
  f.fxJson({ system_flow: { diagrams: { prefer: "cheap" } } });
  const a = fake(f, "fake");
  const o = ok(f, ["--archify", a]);
  assert.strictEqual(logOf(f).length, 6);
  assert.strictEqual(reason(o, "arch-system").renderer, "archify");
  ok(f, ["--prefer", "cheap", "--archify", a]);
  assert.strictEqual(logOf(f).length, 12);
  assert.strictEqual(fxDoc(f).system_flow.diagrams.prefer, "cheap");
}
{
  const f = setup();
  const lvl = (0, import_json.parseJson)(read(f, `${SITE}/model/fragments/level0.json`));
  const [api, db] = lvl.levels.diagrams[1].nodes;
  const ROLE = "Sends prompts and reads answers over HTTP, SSE or SignalR to the backend.";
  const LABEL = "Primary relational database cluster for every region";
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
  assert.strictEqual(c("api").sublabel, void 0);
  assert.strictEqual(c("db").sublabel, "Stores rows");
  assert.deepStrictEqual(arch.cards.find((x) => x.title === "Parts")?.items, [`API: ${ROLE}`, `${LABEL}: Stores rows`]);
  cutOf(LABEL, c("db").label);
  assert.ok([...c("db").label].length * 6.6 <= c("db").size[0] + 8, c("db").label);
  for (const n of ["seq-turn", "seq-turn-p2"]) {
    const seq = (0, import_json.parseJson)(read(f, `${D}/src/${n}.json`));
    const box = Math.max(86, Math.min(190, Math.round((seq.meta.viewBox[0] - 124) / seq.participants.length) - 24));
    const p = seq.participants.find((x) => x.id === "api");
    cutOf(PART, p.label);
    assert.ok([...p.label].length * 6.8 <= box + 6, `${n} ${p.label} ${box}`);
  }
  assert.strictEqual(reason(o, "arch-engine").reason, "archify architecture, 2 components, shortened: db label");
  assert.strictEqual(reason(o, "seq-turn").reason, "archify sequence, 14 messages in 2 pages, shortened: api label");
  assert.strictEqual(reason(o, "arch-system").reason, "archify architecture, 2 components");
}
{
  const f = setup();
  const lvl = (0, import_json.parseJson)(read(f, `${SITE}/model/fragments/level0.json`));
  const LONG = "Primary relational database node";
  assert.strictEqual(LONG.length, 32);
  lvl.levels.diagrams[1].nodes[1].label = LONG;
  f.fragment("level0", lvl);
  const o = ok(f, ["--archify", fake(f, "fake")]);
  const arch = (0, import_json.parseJson)(read(f, `${D}/src/arch-engine.json`));
  const db = arch.components.find((x) => x.id === "db");
  assert.strictEqual(db.label, LONG);
  assert.ok(32 * 6.6 <= db.size[0] + 8, `box ${db.size[0]} holds 32 units`);
  const boxes = arch.components.map((x) => ({ x0: x.pos[0], x1: x.pos[0] + x.size[0], y0: x.pos[1], y1: x.pos[1] + x.size[1] }));
  for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `boxes overlap: ${JSON.stringify([a, b])}`);
  assert.strictEqual(reason(o, "arch-engine").reason, "archify architecture, 2 components");
}
{
  const f = setup();
  const a = fake(f, "fake");
  ok(f, ["--archify", a]);
  const narrow = (0, import_json.parseJson)(read(f, `${D}/src/arch-engine.json`));
  assert.deepStrictEqual(narrow.meta.viewBox, [1e3, 400]);
  const f2 = setup();
  ok(f2, ["--archify", fake(f2, "fake")], { FAKE_VIEWBOX: "[1100, 500]" });
  const wide = (0, import_json.parseJson)(read(f2, `${D}/src/arch-engine.json`));
  assert.deepStrictEqual(wide.meta.viewBox, [1100, 500]);
  assert.deepStrictEqual(narrow.components.map((x) => x.pos[0] - 200), wide.components.map((x) => x.pos[0]));
  assert.deepStrictEqual(narrow.components.map((x) => x.pos[1]), wide.components.map((x) => x.pos[1]));
}
{
  const f = setup();
  const o = ok(f, ["--archify", fake(f, "fake")], { FAKE_VALIDATE_FAIL: "arch-engine" });
  assert.strictEqual(reason(o, "arch-engine").reason, 'archify architecture, 2 components, auto canvas: archify validate failed: {"ok":false}');
  assert.strictEqual(reason(o, "arch-system").reason, "archify architecture, 2 components");
  const g = setup();
  const t0 = Date.now();
  const h = ok(g, ["--archify", fake(g, "fake"), "--archify-timeout", "1"], { FAKE_VALIDATE_HANG: "arch-engine" });
  assert.strictEqual(reason(h, "arch-engine").reason, "archify architecture, 2 components, auto canvas: archify validate timed out after 1 s");
  assert.ok((Date.now() - t0) / 1e3 < 30, "the canvas call stopped at the 1 s timeout");
}
{
  const f = setup();
  const own = "A hand-written spec, not JSON.\n";
  fs.mkdirSync(path.join(f.host, D, "src"), { recursive: true });
  fs.writeFileSync(path.join(f.host, D, "src", "arch-engine.json"), own);
  const r = run(f, ["--archify", fake(f, "fake")]);
  assert.strictEqual(read(f, `${D}/src/arch-engine.json`), own);
  assert.match(r.stderr, new RegExp(`${D}/src/arch-engine.json exists without the generated marker`), `the build reports the collision
${r.stdout}${r.stderr}`);
}
{
  const f = setup();
  const empty = path.join(f.base, "no-archify");
  fs.mkdirSync(empty);
  const r = run(f, ["--archify", empty]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.strictEqual(r.stderr, `system-flow: build: --archify ${empty} has no bin/archify.mjs
`);
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
