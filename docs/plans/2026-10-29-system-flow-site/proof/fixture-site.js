// generated from src/docs/plans/2026-10-29-system-flow-site/proof/fixture-site.ts by scripts/build: edit there, not here
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
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_sf_fixture = require("../../../../tests/helpers/sf-fixture.js");
const f = (0, import_sf_fixture.sfFixture)();
f.fxJson({});
f.goodSet();
const evidence = [{ path: "app/x.rb", lines: "1-4", symbol: "Link#expired?" }];
const lanes = ["client", "edge", "api", "queue", "worker", "mail"];
const tall = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"];
f.fragment("proof", {
  sequences: [{
    id: "wide",
    title: "A wide hand-off",
    chapter: "s1",
    summary: "The request passes through six parts from the client to the mailer.",
    participants: lanes.map((id) => ({ id, label: `Part ${id}`, look: id === "mail" ? "external" : "service", evidence })),
    messages: lanes.slice(1).map((to, i) => ({ n: i + 1, from: lanes[i], to, label: `Hands the request to ${to}.`, evidence }))
  }],
  levels: { diagrams: [{
    id: "tall",
    level: 1,
    parent: "system",
    title: "A tall chain",
    summary: "Seven parts pass a job down one column from the first to the last.",
    groups: [],
    nodes: tall.map((id) => ({ id, label: `Step ${id}`, kind: "backend", look: "service", role: "Passes the job on", evidence })),
    edges: tall.slice(1).map((to, i) => ({ from: tall[i], to, label: "passes", evidence })),
    layout: Object.fromEntries(tall.map((id, row) => [id, { col: 0, row }]))
  }] }
});
const file = path.join(f.host, "docs/system-flow/model/fragments/chapters.json");
const chapters = JSON.parse(fs.readFileSync(file, "utf8"));
for (const s of chapters.sections) if (s.id === "s1") s.diagrams = [...s.diagrams ?? [], "tall"];
f.fragment("chapters", chapters);
const r = f.run(["build", "--prefer", "cheap"]);
if (r.status !== 0) {
  process.stderr.write(`fixture-site: build exited ${r.status}
${r.stdout}${r.stderr}`);
  process.exit(1);
}
console.log(path.join(f.host, "docs", "system-flow"));
