// generated from src/scripts/system-flow-estimate.test.ts by scripts/build: edit there, not here
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
const area = (id, files, filesToRead, levels, diagrams, sequences, storeFlows) => ({ id, root: "backend", files, filesToRead, levels, diagrams, sequences, storeFlows });
const ev = (p, lines, symbol) => [{ path: p, lines, symbol }];
const PLAN = "plan.json";
function estimate(plan) {
  const f = (0, import_sf_fixture.sfFixture)();
  f.put("host", PLAN, JSON.stringify(plan));
  const r = f.run(["estimate", path.join(f.host, PLAN)]);
  return { f, r, out: r.status === 0 ? (0, import_json.parseJson)(r.stdout) : {} };
}
{
  const { r, out } = estimate({ areas: [area("A", 120, 10, 2, 2, 1, 0), area("B", 300, 20, 1, 1, 0, 1)], chapters: 4 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(out.areas, [{ id: "A", tokens: 645e3, minutes: 1.8 }, { id: "B", tokens: 71e4, minutes: 2.4 }]);
  assert.deepStrictEqual(out.total, { tokens: 6355e3, minutes: 35.8, archifyMinutes: 1 });
  assert.strictEqual(out.constants.calibrated, true);
  assert.strictEqual(out.note, "constants measured on 2026-10-29 from proof runs (a) and (b); the split between per-file and per-figure cost is unproven");
  assert.deepStrictEqual(out.warnings, []);
}
{
  const { out } = estimate({ areas: [area("A", 5e3, 10, 2, 2, 1, 0)], chapters: 1 });
  assert.deepStrictEqual(out.areas, [{ id: "A", tokens: 645e3, minutes: 1.8 }]);
  assert.deepStrictEqual(out.warnings, ["area A has 5000 files; split it into sub-areas of at most 400"]);
  assert.strictEqual(out.total.minutes, 35.1, "one area runs alone");
}
{
  const { out } = estimate({ areas: ["a", "b", "c", "d", "e", "f"].map((i) => area(i, 10, 10, 1, 0, 0, 0)), chapters: 1 });
  assert.deepStrictEqual(out.areas[0], { id: "a", tokens: 21e4, minutes: 0.9 });
  assert.strictEqual(out.total.minutes, 34.1);
}
{
  const { out } = estimate({ areas: [area("mobile-api", 30, 22, 2, 4, 2, 0), area("conversations", 34, 24, 2, 3, 1, 0), area("shaheen", 32, 14, 3, 5, 1, 1), area("twk-framework", 88, 40, 2, 4, 1, 1)], chapters: 9 });
  assert.ok(Math.abs(out.total.tokens / 16744779 - 1) <= 0.1, `tokens ${out.total.tokens}`);
  assert.ok(Math.abs(out.total.minutes / 41.4 - 1) <= 0.1, `minutes ${out.total.minutes}`);
}
{
  const areas = Array.from({ length: 12 }, (_, i) => area(`a${i}`, 100, i === 11 ? 56 : 51, 2, i === 11 ? 11 : 6, 0, 0));
  const { out } = estimate({ areas, chapters: 12 });
  assert.ok(Math.abs(out.total.tokens / 49415523 - 1) <= 0.12, `tokens ${out.total.tokens}`);
  assert.ok(Math.abs((out.total.minutes - out.total.archifyMinutes) / 52.7 - 1) <= 0.1, `minutes ${out.total.minutes}`);
}
{
  const { f, r } = estimate({ areas: [{ id: "A", root: "backend", files: 1, levels: 1, diagrams: 0, sequences: 0, storeFlows: 0 }], chapters: 1 });
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr, `${path.join(f.host, PLAN)}:/areas/0: required property filesToRead missing
`);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  const r = f.run(["estimate", path.join(f.host, "nope.json")]);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr, `system-flow: estimate: cannot read ${path.join(f.host, "nope.json")}
`);
}
const engine = {
  schemaVersion: 2,
  levels: {
    root: "system",
    diagrams: [
      {
        id: "engine",
        level: 1,
        parent: "system",
        title: "Engine",
        summary: "The engine runs its parts and calls one outside.",
        groups: [],
        nodes: [
          { id: "a1", label: "A1", kind: "backend", look: "service", role: "r", children: "engine-jobs", evidence: ev("app/x.rb", "1-4", "Link") },
          { id: "a2", label: "A2", kind: "backend", look: "service", role: "r", evidence: ev("app/x.rb", "1-4", "Link") },
          { id: "a3", label: "A3", kind: "backend", look: "service", role: "r", evidence: ev("app/x.rb", "1-4", "Link") },
          { id: "ctx", label: "Ctx", kind: "external", look: "service", role: "r", primary: false, evidence: ev("app/x.rb", "1-4", "Link") }
        ],
        edges: [{ from: "a1", to: "a2", label: "e", evidence: ev("app/x.rb", "1-4", "Link") }, { from: "a2", to: "a3", label: "e", evidence: ev("app/x.rb", "1-4", "Link") }, { from: "a3", to: "ctx", label: "e", evidence: ev("app/x.rb", "1-4", "Link") }]
      },
      {
        id: "engine-jobs",
        level: 2,
        parent: "engine",
        title: "Jobs",
        summary: "The jobs run one after the other.",
        groups: [],
        nodes: [{ id: "j1", label: "J1", kind: "job", look: "service", role: "r", evidence: ev("app/x.rb", "1-4", "Link") }, { id: "j2", label: "J2", kind: "job", look: "service", role: "r", evidence: ev("app/x.rb", "1-4", "Link") }],
        edges: [{ from: "j1", to: "j2", label: "e", evidence: ev("app/x.rb", "1-4", "Link") }]
      }
    ]
  },
  sequences: [{
    id: "trip",
    title: "Trip",
    chapter: "s1",
    summary: "The first part calls the second four times.",
    participants: [{ id: "p1", label: "P1", look: "service", evidence: ev("app/x.rb", "1-4", "Link") }, { id: "p2", label: "P2", look: "service", evidence: ev("app/x.rb", "1-4", "Link") }],
    messages: [1, 2, 3, 4].map((n) => ({ n, from: "p1", to: "p2", label: "m", evidence: ev("app/x.rb", "1-4", "Link") }))
  }]
};
function built(planAreas) {
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  const l0 = (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, "docs/system-flow/model/fragments/level0.json"), "utf8"));
  l0.levels.diagrams[0].nodes[0].children = "engine";
  f.fragment("level0", l0);
  f.fragment("engine", engine);
  if (planAreas) f.put("host", "docs/system-flow/model/plan.json", JSON.stringify({ areas: planAreas, chapters: 1 }));
  f.commit("host", "model");
  const r = f.run(["build"]);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
}
{
  const out = built([area("engine", 3, 3, 2, 2, 1, 0), area("ghost", 1, 1, 1, 0, 0, 0)]);
  assert.deepStrictEqual(out.depth.areas[0], {
    id: "engine",
    planned: { levels: 2, diagrams: 2, sequences: 1, storeFlows: 0 },
    built: { levels: 2, diagramsPerLevel: [0, 1, 1, 0], diagrams: 2, primaryNodes: 5, contextNodes: 1, edges: 4, sequences: 1, messages: 4, storeRows: 0, flows: 0, chapters: 0, evidence: 16, filesCited: 1 }
  });
  const zero = { levels: 0, diagramsPerLevel: [0, 0, 0, 0], diagrams: 0, primaryNodes: 0, contextNodes: 0, edges: 0, sequences: 0, messages: 0, storeRows: 0, flows: 0, chapters: 0, evidence: 0, filesCited: 0 };
  assert.deepStrictEqual(out.depth.areas[1].built, zero, "planned area without a fragment");
  const t = out.depth.total;
  assert.strictEqual(t.levels, 3);
  assert.deepStrictEqual(t.diagramsPerLevel, [1, 1, 1, 0]);
  assert.strictEqual(t.chapters, 5);
  assert.strictEqual(t.filesCited, 3);
  assert.strictEqual(t.evidence, 69);
}
{
  const out = built(null);
  assert.deepStrictEqual(out.depth.areas, []);
  assert.strictEqual(out.depth.total.diagrams, 3);
}
console.log("system-flow-estimate.test.js: OK");
