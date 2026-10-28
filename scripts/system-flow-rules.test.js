// generated from src/scripts/system-flow-rules.test.ts by scripts/build: edit there, not here
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
var import_json = require("../lib/json.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const F = "docs/system-flow/model/fragments";
const ev = [{ path: "app/x.rb", lines: "1-4", symbol: "Link" }];
const node = (id, extra = {}) => ({ id, label: id, kind: "backend", role: "R", evidence: ev, ...extra });
const edge = (from, to, extra = {}) => ({ from, to, label: "l", evidence: ev, ...extra });
const diagram = (id, nodes, edges, extra = {}) => ({ id, level: 0, title: id, summary: "S", groups: [], nodes, edges, ...extra });
const levels = (...diagrams) => ({ levels: { root: "system", diagrams } });
const system = (nodes, edges = [edge("link", "db")]) => diagram("system", nodes, edges);
const base = [node("link"), node("db")];
const run = (change) => {
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  change(f);
  return f.run(["check"]);
};
const fails = (why, change, line) => {
  const r = run(change);
  assert.strictEqual(r.status, 1, `${why}: exits 1
${r.stdout}${r.stderr}`);
  assert.ok(r.stderr.split("\n").includes(`${F}/${line}`), `${why}: expected line ${line}
${r.stderr}`);
};
const passes = (why, change) => {
  const r = run(change);
  assert.strictEqual(r.status, 0, `${why}
${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const L0 = "level0.json:";
const D0 = "/levels/diagrams/0";
assert.deepStrictEqual(passes("good set", () => {
}).warnings, []);
const many = (n) => Array.from({ length: n }, (_, i) => node(`n${i}`));
const chain = (n) => Array.from({ length: n - 1 }, (_, i) => edge(`n${i}`, `n${i + 1}`));
fails("13 primary nodes", (f) => f.fragment("level0", levels(diagram("engine", many(13), chain(13)))), `${L0}${D0}: level engine has 13 primary nodes, at most 12`);
passes("12 primary nodes", (f) => f.fragment("level0", levels(diagram("engine", many(12), chain(12)))));
passes("12 primary and a context node", (f) => f.fragment("level0", levels(diagram("engine", [...many(12), node("ctx", { primary: false })], [...chain(12), edge("n0", "ctx")]))));
const withParts = (extra, bare) => (f) => {
  const e = ev;
  f.fragment("level0", levels(diagram("system", [node("api", { ...extra.node }), node("db")], [edge("api", "db", { ...extra.edge })], { groups: [{ id: "g1", label: "G", members: ["api"], evidence: e, ...extra.group }] })));
  f.fragment("chapters", {
    sections: [{ id: "s1", title: "T", question: "Q?", bullets: [{ id: "b1", text: "t", evidence: e, ...extra.bullet }] }],
    sequences: [{ id: "turn", title: "T", chapter: "s1", participants: [{ id: "api", label: "A", evidence: e, ...extra.seq }, { id: "db", label: "D", evidence: e }], messages: [{ n: 1, from: "api", to: "db", label: "m", evidence: e, ...extra.msg }] }],
    stores: { sql: [{ id: "sql-links", evidence: e, ...extra.store }] },
    storeFlows: [{ id: "first", trigger: "t", chapter: "s1", steps: [{ n: 1, actor: "api", op: "read", store: "sql", evidence: e, ...extra.step }] }],
    catalogue: [{ id: "q-mail", kind: "queue", name: "Mail", evidence: e, ...extra.cat }],
    inventory: [{ id: "job-sweep", kind: "job", name: "Sweep", evidence: e, ...extra.inv }]
  });
  f.fragment("rules", { rules: [{ id: "r1", text: "R", evidence: e, ...extra.rule }] });
  void bare;
};
const kinds = [
  ["node api", "node", "level0.json", `${D0}/nodes/0`],
  ["edge engine:api>db", "edge", "level0.json", ""],
  ["group g1", "group", "level0.json", `${D0}/groups/0`],
  ["participant turn.api", "seq", "chapters.json", "/sequences/0/participants/0"],
  ["message turn#1", "msg", "chapters.json", "/sequences/0/messages/0"],
  ["store row sql-links", "store", "chapters.json", "/stores/sql/0"],
  ["step first#1", "step", "chapters.json", "/storeFlows/0/steps/0"],
  ["catalogue entry q-mail", "cat", "chapters.json", "/catalogue/0"],
  ["inventory entry job-sweep", "inv", "chapters.json", "/inventory/0"],
  ["rule r1", "rule", "rules.json", "/rules/0"],
  ["bullet b1", "bullet", "chapters.json", "/sections/0/bullets/0"]
];
for (const [word, key, file, pointer] of kinds) {
  const id = word.split(" ").pop();
  const edgeWord = key === "edge";
  const shown = edgeWord ? "edge system:api>db" : word;
  const where = edgeWord ? `${D0}/edges/0` : pointer;
  void id;
  const bare = { evidence: [] };
  fails(`${word} without evidence`, withParts({ [key]: bare }, bare), `${file}:${where}: ${shown} has no evidence and is not unconfirmed`);
  passes(`${word} unconfirmed`, withParts({ [key]: { ...bare, unconfirmed: true } }, bare));
}
passes("all evidenced kinds with evidence", withParts({}, {}));
const two = (primary) => (f) => f.fragment("level0", levels(
  diagram("system", [node("api", { children: "engine", primary }), node("db")], [edge("api", "db")]),
  diagram("engine", [node("a"), node("b")], [edge("a", "b")], { level: 1, parent: "clients" })
));
fails("primary node opens a diagram of another parent", two(true), `${L0}${D0}/nodes/0: node api opens engine, whose parent is clients, not system`);
passes("context node opens any existing diagram", two(false));
for (const primary of [true, false]) {
  fails(`children nowhere (primary ${primary})`, (f) => f.fragment("level0", levels(system([node("link", { children: "nowhere", primary }), node("db")]))), `${L0}${D0}/nodes/0: node link opens missing diagram nowhere`);
}
fails("node with no edge", (f) => f.fragment("level0", levels(system([...base, node("lonely")]))), `${L0}${D0}/nodes/2: node lonely in system has no edge`);
fails("edge to a missing node", (f) => f.fragment("level0", levels(system([...base, node("api")], [edge("link", "db"), edge("api", "ghost")]))), `${L0}${D0}/edges/1: edge system:api>ghost names a missing node ghost`);
const seq = (msg, step = {}) => (f) => {
  f.fragment("chapters", {
    sections: [{ id: "s1", title: "T", question: "Q?" }],
    sequences: [{ id: "turn", title: "T", chapter: "s1", participants: [{ id: "api", label: "A", evidence: ev }], messages: [{ n: 1, from: "api", to: "api", label: "m", evidence: ev }, { n: 3, from: "api", to: "api", label: "m", evidence: ev, ...msg }] }],
    storeFlows: [{ id: "first", trigger: "t", chapter: "s1", steps: [{ n: 2, actor: "api", op: "read", store: "sql", evidence: ev, ...step }] }]
  });
  f.fragment("level0", levels(system([node("link"), node("db"), node("api")], [edge("link", "db"), edge("api", "db")])));
};
fails("message to a missing participant", seq({ to: "ghost" }), "chapters.json:/sequences/0/messages/1: message turn#3 names a missing participant ghost");
fails("step actor missing everywhere", seq({}, { actor: "ghost" }), "chapters.json:/storeFlows/0/steps/0: step first#2 names a missing actor ghost");
passes("step actor is a node", seq({}, { actor: "db" }));
fails("flow chapter", (f) => f.fragment("chapters", { sections: [{ id: "s1", title: "T", question: "Q?" }], storeFlows: [{ id: "first", trigger: "t", chapter: "nochapter", steps: [] }] }), "chapters.json:/storeFlows/0: flow first names a missing chapter nochapter");
fails("sequence chapter", (f) => f.fragment("chapters", { sections: [{ id: "s1", title: "T", question: "Q?" }], sequences: [{ id: "turn", title: "T", chapter: "x", participants: [], messages: [] }] }), "chapters.json:/sequences/0: sequence turn names a missing chapter x");
for (const [key, word] of [["diagrams", "diagram"], ["sequences", "sequence"], ["storeFlows", "store flow"], ["storeRefs", "store row"], ["catalogueRefs", "catalogue entry"], ["covers", "inventory entry"]]) {
  fails(`section ${key}`, (f) => f.fragment("chapters", { sections: [{ id: "s1", title: "T", question: "Q?", [key]: ["gone"] }] }), `chapters.json:/sections/0: section s1 names a missing ${word} gone`);
}
passes("section refs that resolve", (f) => f.fragment("chapters", { sections: [{ id: "s1", title: "T", question: "Q?", diagrams: ["system"] }] }));
const qs = (items) => (f) => f.fragment("questions", { questions: [{ id: "q1", text: "Q", items }] });
fails("question item missing", qs(["node:ghost"]), "questions.json:/questions/0: question q1 names a missing item node:ghost");
fails("question item not a handle", qs(["api"]), "questions.json:/questions/0: question q1 names api, which is not a handle (<kind>:<id>)");
passes("question item resolves", qs(["node:link"]));
fails("correction item missing", (f) => f.fragment("corrections", { corrections: [{ id: "c1", date: "2026-10-28", item: "bullet:b9", reason: "owner" }] }), "corrections.json:/corrections/0: correction c1 names a missing item bullet:b9");
passes("correction item resolves", (f) => f.fragment("corrections", { corrections: [{ id: "c1", date: "2026-10-28", item: "bullet:b1", reason: "owner" }] }));
fails("em dash in a label", (f) => f.fragment("level0", levels(system([node("link", { label: "a\u2014b" }), node("db")]))), `${L0}${D0}/nodes/0/label: em or en dash`);
fails("en dash in a bullet", (f) => f.fragment("chapters", { sections: [{ id: "s1", title: "T", question: "Q?", bullets: [{ id: "b1", text: "a\u2013b", evidence: ev }] }] }), "chapters.json:/sections/0/bullets/0/text: em or en dash");
assert.deepStrictEqual(passes("Arabic label", (f) => f.fragment("level0", levels(system([node("link", { label: "\u0645\u0631\u062D\u0628\u0627" }), node("db")])))).warnings, [`${F}/${L0}${D0}/nodes/0/label: Arabic script in a label of node link`]);
console.log("system-flow-rules.test.js: OK");
