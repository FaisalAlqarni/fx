// generated from src/lib/sf-coverage.ts by scripts/build: edit there, not here
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sf_coverage_exports = {};
__export(sf_coverage_exports, {
  coverage: () => coverage,
  sectionItems: () => sectionItems
});
module.exports = __toCommonJS(sf_coverage_exports);
var import_sf_model = require("./sf-model.js");
function sectionItems(model, sectionId) {
  const s = model.sections.find((x) => x.id === sectionId);
  if (!s) return [];
  const own = new Set(s.bullets ?? []);
  for (const d of model.levels.diagrams.filter((x) => (s.diagrams ?? []).includes(x.id))) for (const o of [...d.nodes, ...d.edges]) own.add(o);
  for (const q of model.sequences.filter((x) => (s.sequences ?? []).includes(x.id) || x.chapter === s.id)) for (const o of [...q.participants, ...q.messages]) own.add(o);
  for (const f of model.storeFlows.filter((x) => (s.storeFlows ?? []).includes(x.id) || x.chapter === s.id)) for (const o of f.steps) own.add(o);
  const rows = new Set(s.storeRefs ?? []);
  for (const t of Object.values(model.stores)) for (const r of t) if (rows.has(r.id)) own.add(r);
  const cat = new Set(s.catalogueRefs ?? []);
  for (const c of model.catalogue) if (cat.has(c.id)) own.add(c);
  return (0, import_sf_model.collect)(model).filter(({ o }) => own.has(o)).map(({ item }) => item);
}
const spans = (lines) => lines === void 0 ? null : lines.split(",").map((p) => {
  const [a, b] = p.trim().split("-");
  return [Number(a), Number(b ?? a)];
});
function overlaps(a, b, hostId) {
  if (!("path" in a) || !("path" in b) || (a.root ?? hostId) !== (b.root ?? hostId)) return false;
  if (a.path.endsWith("/")) return b.path.startsWith(a.path);
  if (b.path.endsWith("/")) return a.path.startsWith(b.path);
  if (a.path !== b.path) return false;
  const x = spans(a.lines);
  const y = spans(b.lines);
  return x === null || y === null || x.some(([s1, e1]) => y.some(([s2, e2]) => s1 <= e2 && s2 <= e1));
}
function coverage(model) {
  const hostId = model.meta.roots[0]?.id ?? "";
  const chapters = model.sections.map((s) => ({ id: s.id, covers: new Set(s.covers ?? []), evidence: sectionItems(model, s.id).flatMap((i) => i.evidence) }));
  const counts = Object.fromEntries(["engine", "flow", "store", "job", "integration"].map((k) => [k, { covered: 0, total: 0 }]));
  const entries = model.inventory.map((e) => {
    const hit = chapters.find((c) => c.covers.has(e.id) || e.evidence.some((a) => c.evidence.some((b) => overlaps(a, b, hostId))));
    counts[e.kind].total++;
    if (hit) counts[e.kind].covered++;
    return { id: e.id, kind: e.kind, name: e.name, chapter: hit?.id ?? null };
  });
  return { entries, counts };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  coverage,
  sectionItems
});
