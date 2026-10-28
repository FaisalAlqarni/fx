// generated from src/scripts/system-flow-evidence.test.ts by scripts/build: edit there, not here
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
var import_child_process = require("child_process");
var import_json = require("../lib/json.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const F = "docs/system-flow/model/fragments";
const NODE0 = `${F}/level0.json:/levels/diagrams/0/nodes/0/evidence/0`;
const good = { path: "app/x.rb", lines: "1-4", symbol: "Link#expired?" };
const setup = (evidence, roots = [{ id: "backend" }, { id: "guide" }], map = { guide: "../guide" }) => {
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("meta", { schemaVersion: 1, meta: { roots } });
  f.fxJson({ system_flow: { roots: map } });
  const l0 = (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, F, "level0.json"), "utf8"));
  l0.levels.diagrams[0].nodes[0].evidence = evidence;
  f.fragment("level0", l0);
  return f;
};
const fails = (why, evidence, line, tweak = () => {
}) => {
  const f = setup(evidence);
  tweak(f);
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, `${why}: exits 1
${r.stdout}${r.stderr}`);
  assert.ok(r.stderr.split("\n").includes(line), `${why}: expected line ${line}
${r.stderr}`);
};
const passes = (why, evidence, tweak = () => {
}) => {
  const f = setup(evidence);
  tweak(f);
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 0, `${why}
${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const miss = (why, entry, shown, test) => fails(why, [entry], `${NODE0}: node:link: ${shown}: ${test}`);
assert.deepStrictEqual(passes("good", [good]).warnings, []);
passes("whole symbol", [{ path: "app/x.rb", lines: "1", symbol: "class Link" }]);
passes("multi-range", [{ path: "app/x.rb", lines: "1,4", symbol: "expired?" }]);
passes("other root", [{ root: "guide", path: "README.md", lines: "1", symbol: "Guide" }]);
passes("owner evidence", [{ owner: "2026-10-28", question: "q1" }]);
miss("missing file", { ...good, path: "app/nope.rb" }, "backend/app/nope.rb:1-4 Link#expired?", "file missing");
for (const lines of ["8-12", "0-2", "5-3"]) {
  miss(`range ${lines}`, { ...good, lines }, `backend/app/x.rb:${lines} Link#expired?`, "range outside file (10 lines)");
}
miss("symbol absent", { path: "app/x.rb", lines: "5-10", symbol: "expired?" }, "backend/app/x.rb:5-10 expired?", "symbol not in cited lines");
miss("case", { ...good, symbol: "Expired?" }, "backend/app/x.rb:1-4 Expired?", "symbol not in cited lines");
miss("glob", { path: "app/*.rb", lines: "1", symbol: "Link" }, "backend/app/*.rb:1 Link", "path with * or { is not allowed");
miss("whitespace", { path: "app/my file.rb", lines: "1", symbol: "Link" }, "backend/app/my file.rb:1 Link", "path with whitespace or a backtick cannot be written as an evidence line");
miss("backtick path", { path: "app/x`.rb", lines: "1", symbol: "Link" }, "backend/app/x`.rb:1 Link", "path with whitespace or a backtick cannot be written as an evidence line");
miss("backtick symbol", { path: "app/x.rb", lines: "1", symbol: "a`b" }, "backend/app/x.rb:1 a`b", "symbol with a backtick cannot be written as an evidence line");
miss("no symbol", { path: "app/x.rb", lines: "1" }, "backend/app/x.rb:1", "a file entry needs lines and symbol");
miss("unknown root", { root: "mobile", path: "app/x.rb", lines: "1", symbol: "Link" }, "mobile/app/x.rb:1 Link", "evidence names root mobile, not in meta.roots");
const LINES = "lines must be ranges such as 4, 1-4 or 1-4,9";
miss("bad lines", { path: "app/x.rb", lines: "1`<b>x</b>", symbol: "Link" }, "backend/app/x.rb:1`<b>x</b> Link", LINES);
fails(
  "bad lines on a folder",
  [good],
  `${F}/inventory.json:/inventory/0/evidence/0: inventory:inv: backend/app/:1\`x: ${LINES}`,
  (f) => f.fragment("inventory", { inventory: [{ id: "inv", kind: "store", name: "N", evidence: [{ path: "app/", lines: "1`x" }] }] })
);
{
  const f = setup([good, { root: "guide", path: "README.md", lines: "1`x", symbol: "Guide" }], void 0, { guide: "../nowhere" });
  const r = f.run(["check"]);
  assert.ok(r.stderr.includes(`node:link: guide/README.md:1\`x Guide: ${LINES}`), `bad lines in a missing root
${r.stderr}`);
}
{
  const entry = { root: "empty", path: "README.md", lines: "1", symbol: "Guide" };
  const f = setup([good, entry, entry], [{ id: "backend" }, { id: "empty" }], { empty: "../empty" });
  const dir = path.join(f.base, "empty");
  fs.mkdirSync(dir);
  assert.strictEqual((0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: dir }).status, 0);
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, r.stdout);
  const lines = r.stderr.trim().split("\n");
  assert.strictEqual(lines.length, 1, r.stderr);
  assert.ok(lines[0]?.startsWith(".fx.json:/system_flow/roots/empty: root empty: git cannot read HEAD: fatal:"), r.stderr);
}
{
  const f = setup([good]);
  fs.writeFileSync(path.join(f.host, ".git", "index"), "not an index");
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(/root backend: git status failed: (error|fatal):/.test(r.stderr), r.stderr);
}
const inventory = (p) => (f) => f.fragment("inventory", { inventory: [{ id: "inv", kind: "store", name: "N", evidence: [{ path: p }] }] });
passes("folder on inventory", [good], inventory("app/"));
fails("folder missing on inventory", [good], `${F}/inventory.json:/inventory/0/evidence/0: inventory:inv: backend/nope/: folder missing`, inventory("nope/"));
fails("folder on a node", [{ path: "app/" }], `${NODE0}: node link: a folder entry is allowed only on catalogue and inventory entries`);
{
  const msg = "path must be relative to its root and hold no .. segment";
  const plain = (e, line) => {
    const f = setup([e], [{ id: "backend" }, { id: "plain" }], { plain: "../plain" });
    f.put("plain", "../secret.txt", "Secret\n");
    const r = f.run(["check"]);
    assert.strictEqual(r.status, 1, `${line}
${r.stdout}`);
    assert.ok(r.stderr.split("\n").includes(`${NODE0}: node:link: ${line}: ${msg}`), r.stderr);
  };
  plain({ root: "plain", path: "../secret.txt", lines: "1", symbol: "Secret" }, "plain/../secret.txt:1 Secret");
  plain({ root: "plain", path: "/etc/passwd", lines: "1", symbol: "root" }, "plain//etc/passwd:1 root");
  miss("dotdot in a git root", { path: "app/../app/x.rb", lines: "1", symbol: "Link" }, "backend/app/../app/x.rb:1 Link", msg);
}
{
  const f = setup([{ root: "plain", path: "leak.txt", lines: "1", symbol: "Secret" }], [{ id: "backend" }, { id: "plain" }], { plain: "../plain" });
  fs.writeFileSync(path.join(f.base, "secret.txt"), "Secret\n");
  fs.symlinkSync(path.join(f.base, "secret.txt"), path.join(f.plain, "leak.txt"));
  fs.symlinkSync(f.base, path.join(f.plain, "up"));
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.includes("node:link: plain/leak.txt:1 Secret: file missing"), r.stderr);
  const dir = setup([good], [{ id: "backend" }, { id: "plain" }], { plain: "../plain" });
  fs.symlinkSync(dir.base, path.join(dir.plain, "up"));
  dir.fragment("inventory", { inventory: [{ id: "inv", kind: "store", name: "N", evidence: [{ root: "plain", path: "up/host/" }] }] });
  assert.ok(dir.run(["check"]).stderr.includes("inventory:inv: plain/up/host/: folder missing"), "a folder through a link is missing too");
}
{
  const f = setup([{ root: "guide", path: "README.md", lines: "1", symbol: "Guide" }, { root: "guide", path: "README.md", lines: "1", symbol: "Guide" }], void 0, { guide: "../nowhere" });
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1);
  assert.deepStrictEqual(r.stderr.trim().split("\n"), [`.fx.json:/system_flow/roots/guide: root guide not found at ${path.resolve(f.host, "../nowhere")}`]);
}
{
  const w = passes("uncommitted", [good], (f) => f.put("host", "app/x.rb", "changed\n")).warnings;
  assert.ok(w.some((x) => x.includes("app/x.rb has uncommitted changes")), w.join("\n"));
}
{
  const f = setup([{ root: "plain", path: "notes.txt", lines: "1", symbol: "Plain" }], [{ id: "backend" }, { id: "plain" }], { plain: "../plain" });
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 0, r.stderr);
  const warnings = (0, import_json.parseJson)(r.stdout).warnings;
  assert.ok(warnings.some((x) => x.includes("root plain: no git: stale and archify sources unavailable")), warnings.join("\n"));
}
{
  const f = setup([good]);
  const real = (process.env.PATH ?? "").split(path.delimiter).map((d) => path.join(d, "git")).find((p) => fs.existsSync(p));
  assert.ok(real);
  const shim = path.join(f.base, "shim");
  const log = path.join(f.base, "git.log");
  fs.mkdirSync(shim);
  fs.writeFileSync(path.join(shim, "git"), `#!/bin/sh
echo "$@" >> ${log}
exec ${real} "$@"
`, { mode: 493 });
  const diagrams = Array.from({ length: 5 }, (_, d) => {
    const nodes = Array.from({ length: 10 }, (_2, i) => ({ id: `n${d}-${i}`, label: "N", kind: "backend", role: "R", evidence: [good] }));
    const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id, label: "l", evidence: [good] }));
    return { id: `d${d}`, level: 0, title: "D", summary: "D", groups: [], nodes, edges };
  });
  f.fragment("level0", { levels: { root: "d0", diagrams } });
  const r = f.run(["check"], { PATH: `${shim}${path.delimiter}${process.env.PATH ?? ""}` });
  assert.strictEqual(r.status, 0, r.stderr);
  const shows = fs.readFileSync(log, "utf8").split("\n").filter((l) => l.includes("show HEAD:app/x.rb"));
  assert.strictEqual(shows.length, 1, shows.join("\n"));
}
{
  const f = setup([{ ...good, lines: "8-12" }]);
  f.fragment("engine", { sequences: [{ id: "turn", title: "Turn", chapter: "s1", participants: [], messages: [] }] });
  const one = f.run(["check", "--fragment", `${F}/engine.json`]);
  assert.strictEqual(one.status, 0, one.stderr);
  assert.strictEqual(f.run(["check"]).status, 1);
}
{
  const f = setup([good]);
  f.fragment("engine", { sequences: [{ id: "turn", title: "Turn", chapter: "s1", participants: [], messages: [] }] });
  f.put("host", `${F}/other.json`, '{ "sections": [ half written');
  f.fragment("broken", { sections: [{ id: "x" }] });
  const one = f.run(["check", "--fragment", `${F}/engine.json`]);
  assert.strictEqual(one.status, 0, one.stderr);
  const w = (0, import_json.parseJson)(one.stdout).warnings;
  assert.ok(w.some((x) => x.startsWith(`${F}/other.json:`)) && w.some((x) => x.startsWith(`${F}/broken.json:`)), w.join("\n"));
  const own = f.run(["check", "--fragment", `${F}/other.json`]);
  assert.strictEqual(own.status, 1, "its own parse error still fails it");
  assert.ok(own.stderr.startsWith(`${F}/other.json:`), own.stderr);
}
console.log("system-flow-evidence.test.js: ok");
