// generated from src/scripts/system-flow-coverage.test.ts by scripts/build: edit there, not here
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
const ev = (p, lines, symbol, root) => [{ ...root === void 0 ? {} : { root }, path: p, lines, symbol }];
const lines30 = Array.from({ length: 30 }, (_, i) => i === 0 ? "class Sweep" : `  # line ${i + 1}`).join("\n") + "\n";
function setup(o = {}) {
  const f = (0, import_sf_fixture.sfFixture)();
  f.put("host", "app/jobs/sweep.rb", lines30);
  f.put("guide", "app/jobs/sweep.rb", lines30);
  f.put("host", "engines/a/app/x.rb", "class Ax\nend\n");
  f.put("host", "app/sms.rb", "class Sms\nend\n");
  f.put("host", "app/flow.rb", "class Flow\nend\n");
  f.put("host", "app/store.rb", "class Store\nend\n");
  f.put("host", "docs/adr/0001-x.md", `# 1. X

Status: ${o.adrStatus ?? "accepted, 2026-01-01"}

1. Use X.
`);
  f.commit("host", "files");
  f.commit("guide", "files");
  f.fxJson({ system_flow: { roots: { guide: "../guide" } } });
  f.fragment("meta", { schemaVersion: 1, meta: { roots: [{ id: "backend" }, { id: "guide" }] } });
  f.fragment("level0", {
    levels: { root: "system", diagrams: [{
      id: "system",
      level: 0,
      title: "System",
      summary: "The whole system.",
      groups: [],
      nodes: [{ id: "ea", label: "Ax", kind: "backend", role: "Engine A", evidence: ev("engines/a/app/x.rb", "1", "Ax") }, { id: "eb", label: "Y", kind: "backend", role: "Y", evidence: ev("app/y.rb", "1", "Y") }],
      edges: [{ from: "ea", to: "eb", label: "calls", evidence: ev("app/y.rb", "1", "Y") }, ...o.bare ? [{ from: "eb", to: "ea", label: "replies", unconfirmed: true }] : []]
    }] }
  });
  f.fragment("inventory", {
    inventory: [
      { id: "job-sweep", kind: "job", name: "Sweep job", evidence: ev("app/jobs/sweep.rb", "1-20", "Sweep") },
      { id: "eng-a", kind: "engine", name: "Engine A", evidence: [{ path: "engines/a/" }] },
      { id: "int-sms", kind: "integration", name: "SMS", evidence: ev("app/sms.rb", "1", "Sms") },
      { id: "flow-x", kind: "flow", name: "Flow X", evidence: ev("app/flow.rb", "1", "Flow") },
      { id: "store-y", kind: "store", name: "Store Y", evidence: ev("app/store.rb", "1", "Store") }
    ]
  });
  const bullet = (id, e) => ({ id, text: "A fact.", evidence: e });
  f.fragment("chapters", {
    sections: [
      { id: "s1", title: "Jobs", question: "What sweeps?", bullets: [bullet("b1", o.bullet ?? ev("app/x.rb", "4", "expired?"))], ...o.covers ? { covers: o.covers } : {} },
      { id: "s2", title: "Engines", question: "What is in A?", diagrams: ["system"], ...o.second ? { covers: ["job-sweep"], bullets: [bullet("b2", ev("app/jobs/sweep.rb", "1", "Sweep"))] } : {} }
    ]
  });
  f.fragment("rules", { rules: [{ id: "r1", text: "Use X.", adr: { path: o.ruleAdr ?? "docs/adr/0001-x.md" }, decision: "Decision 1: use X", evidence: ev("app/x.rb", "4", "expired?") }] });
  return f;
}
const buildOk = (f) => {
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 0, `build exits 0
${r.stdout}${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const entries = (f) => (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, "docs/system-flow/model/coverage.json"), "utf8")).entries;
const chapterOf = (f, id) => entries(f).find((e) => e.id === id)?.chapter;
const read = (f, rel) => fs.readFileSync(path.join(f.host, rel), "utf8");
{
  const f = setup({ bullet: ev("app/jobs/sweep.rb", "10-12", "line 10") });
  const out = buildOk(f);
  assert.deepStrictEqual(entries(f).find((e) => e.id === "job-sweep"), { id: "job-sweep", kind: "job", name: "Sweep job", chapter: "s1" });
  assert.deepStrictEqual(out.coverage.job, { covered: 1, total: 1 });
  assert.deepStrictEqual(Object.keys(out.coverage).sort(), ["engine", "flow", "integration", "job", "store"]);
  assert.deepStrictEqual(out.coverage.flow, { covered: 0, total: 1 });
}
{
  const f = setup({ bare: true, bullet: ev("app/jobs/sweep.rb", "10-12", "line 10") });
  buildOk(f);
  assert.strictEqual(chapterOf(f, "job-sweep"), "s1");
}
assert.strictEqual(chapterOf((() => {
  const f = setup({ bullet: ev("app/jobs/sweep.rb", "21-30", "line 21") });
  buildOk(f);
  return f;
})(), "job-sweep"), null);
assert.strictEqual(chapterOf((() => {
  const f = setup({ bullet: ev("app/jobs/sweep.rb", "10-12", "line 10", "guide") });
  buildOk(f);
  return f;
})(), "job-sweep"), null);
{
  const f = setup();
  buildOk(f);
  assert.strictEqual(chapterOf(f, "eng-a"), "s2");
}
{
  const f = setup({ covers: ["int-sms"] });
  buildOk(f);
  assert.strictEqual(chapterOf(f, "int-sms"), "s1");
}
{
  const f = setup({ covers: ["job-sweep"], second: true });
  buildOk(f);
  assert.strictEqual(chapterOf(f, "job-sweep"), "s1");
}
{
  const f = setup({ bullet: ev("app/jobs/sweep.rb", "10-12", "line 10") });
  buildOk(f);
  const md = read(f, "docs/system/coverage.md");
  assert.ok(md.includes("| Kind | Name | Chapter |"), md);
  assert.ok(/^\| flow \| Flow X \| not covered \|$/m.test(md), md);
  assert.ok(/^\| job \| Sweep job \| .*s1.* \|$/m.test(md), md);
}
{
  const f = setup();
  const c = f.run(["check"]);
  assert.strictEqual(c.status, 0, c.stderr);
  buildOk(f);
  const md = read(f, "docs/system/rules-in-force.md");
  assert.ok(md.includes("r1"), md);
  assert.ok(md.includes("[docs/adr/0001-x.md](../adr/0001-x.md)"), md);
  assert.ok(md.includes("Decision 1: use X"), md);
}
for (const status of ["Superseded by 0002 (replaced: 1; the rest carried forward)", "Deprecated", "Ignored"]) {
  const r = setup({ adrStatus: status }).run(["check"]);
  assert.strictEqual(r.status, 1, status);
  assert.ok(r.stderr.trimEnd().endsWith("rule r1: ADR docs/adr/0001-x.md is superseded"), r.stderr);
}
assert.strictEqual(setup({ adrStatus: "Partly superseded by 0002" }).run(["check"]).status, 0);
{
  const r = setup({ ruleAdr: "docs/adr/0009-gone.md" }).run(["check"]);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.trimEnd().endsWith("rule r1: ADR docs/adr/0009-gone.md not found"), r.stderr);
}
console.log("system-flow-coverage.test.js: ok");
