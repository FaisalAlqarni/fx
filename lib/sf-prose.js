// generated from src/lib/sf-prose.ts by scripts/build: edit there, not here
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
var sf_prose_exports = {};
__export(sf_prose_exports, {
  checkProse: () => checkProse,
  proseStats: () => proseStats,
  sentences: () => sentences,
  words: () => words
});
module.exports = __toCommonJS(sf_prose_exports);
var import_sf_model = require("./sf-model.js");
function sentences(text) {
  const plain = text.replace(/`[^`]*`/g, "code").replace(/\b(?:e\.g|i\.e)\./gi, "eg");
  return plain.split(/[.?!](?=\s|$)/).filter((s) => s.trim() !== "").length;
}
const words = (text) => text.split(/\s+/).filter((w) => w !== "").length;
const ROLES = ["what", "parts", "request", "code"];
const under = (at, key) => ({ file: at.file, pointer: `${at.pointer}/${key}` });
const floorWords = (s) => words(s.lead ?? "") + [...s.bullets ?? [], ...s.notOwned ?? []].reduce((n, b) => n + words(b.text), 0);
function checkProse(model, mode) {
  const out = [];
  const err = (at, message, level = "error") => {
    out.push({ ...at, message, level });
  };
  const whole = mode === "whole";
  const { meta, sections } = model;
  const metaAt = { file: meta.roots.length ? (0, import_sf_model.originOf)(meta.roots[0]).file : "", pointer: meta.roots.length ? "/meta" : "" };
  if (whole) {
    for (const k of ["name", "intro"]) if (!meta[k]) err(metaAt, `meta.${k} missing`);
  }
  if (meta.intro) {
    const n = sentences(meta.intro);
    if (n < 2 || n > 5) err(under(metaAt, "intro"), `meta.intro has ${n} sentences; 2 to 5 required`);
  }
  const chapters = { file: sections.length ? (0, import_sf_model.originOf)(sections[0]).file : "", pointer: sections.length ? "/sections" : "" };
  for (const role of ROLES) {
    const holders = sections.filter((s) => s.role === role);
    if (whole && holders.length === 0) err(chapters, `Start here role ${role} missing`);
    if (holders.length > 1) err((0, import_sf_model.originOf)(holders[1]), `role ${role} appears ${holders.length} times; exactly one required`);
  }
  if (whole) ROLES.forEach((role, i) => {
    const s = sections[i];
    if (s !== void 0 && s.role !== role) err((0, import_sf_model.originOf)(s), `section ${s.id} has role ${s.role ?? "none"}; the first four sections must be what, parts, request, code in that order`);
  });
  const hostId = meta.roots[0]?.id ?? "";
  const cited = /* @__PURE__ */ new Set();
  for (const { item } of (0, import_sf_model.collect)(model)) for (const e of item.evidence) if ("path" in e) cited.add(e.root ?? hostId);
  const mapped = new Set(model.codeMap.map((c) => c.root));
  for (const s of sections) {
    const decl = (0, import_sf_model.originOf)(s);
    const leadAt = (0, import_sf_model.fieldOrigin)(s, "lead");
    if (s.lead === void 0) {
      if (whole) err(decl, `section ${s.id}: lead missing`);
    } else {
      const n = sentences(s.lead);
      if (n < 2 || n > 4) err(leadAt ?? decl, `section ${s.id}: lead has ${n} sentences; 2 to 4 required`);
    }
    const bullets = s.bullets ?? [];
    const bulletsAt = bullets.length ? { file: (0, import_sf_model.originOf)(bullets[0]).file, pointer: (0, import_sf_model.originOf)(bullets[0]).pointer.replace(/\/\d+$/, "") } : decl;
    if (bullets.length > 8 || whole && bullets.length < 4) err(bulletsAt, `section ${s.id}: ${bullets.length} bullets; 4 to 8 required`);
    for (const b of [...bullets, ...s.notOwned ?? []]) {
      const n = words(b.text);
      if (n > 40) err((0, import_sf_model.originOf)(b), `bullet ${b.id}: ${n} words; at most 40`);
    }
    if (!whole) continue;
    const w = floorWords(s);
    if (w < 100) err(leadAt ?? decl, `section ${s.id}: ${w} words of lead, bullets and not owned; at least 100 required`);
    else if (w < 120 || w > 200) err(leadAt ?? decl, `section ${s.id}: ${w} words of lead, bullets and not owned; 120 to 200 expected`, "warning");
    if (s.role === "what") {
      const n = s.notOwned?.length ?? 0;
      if (n < 2 || n > 6) err((0, import_sf_model.fieldOrigin)(s, "notOwned") ?? decl, `section ${s.id}: ${n} notOwned bullets; 2 to 6 required`);
    }
    if (s.role === "parts" && !(s.diagrams ?? []).includes(model.levels.root)) err(decl, `section ${s.id}: diagrams must include the level-0 diagram ${model.levels.root}`);
    if (s.role === "request") {
      const n = (/* @__PURE__ */ new Set([...s.sequences ?? [], ...model.sequences.filter((q) => q.chapter === s.id).map((q) => q.id)])).size;
      if (n !== 1) err(decl, `section ${s.id}: ${n} sequences; exactly one required`);
    }
    if (s.role === "code") {
      for (const root of cited) if (!mapped.has(root)) err(decl, `section ${s.id}: root ${root} has no code map entry; items cite it`);
    }
  }
  const captions = [
    ...model.levels.diagrams.map((d) => ["diagram", d]),
    ...model.sequences.map((q) => ["sequence", q]),
    ...model.storeFlows.map((f) => ["store flow", f])
  ];
  for (const [kind, o] of captions) {
    const at = (0, import_sf_model.originOf)(o);
    if (!o.summary) {
      err(at, `${kind} ${o.id}: summary missing`);
      continue;
    }
    const n = sentences(o.summary), w = words(o.summary);
    if (n !== 1) err(under(at, "summary"), `${kind} ${o.id}: summary has ${n} sentences; one required`);
    else if (w < 6 || w > 30) err(under(at, "summary"), `${kind} ${o.id}: summary has ${w} words; 6 to 30 required`);
  }
  for (const q of model.sequences) if (q.participants.length > 12) err((0, import_sf_model.originOf)(q), `sequence ${q.id}: ${q.participants.length} participants; at most 12 (split it)`);
  const g = model.glossary;
  if (whole && (g.length < 15 || g.length > 40)) err(g.length ? { file: (0, import_sf_model.originOf)(g[0]).file, pointer: "/glossary" } : { file: "", pointer: "" }, `glossary has ${g.length} terms; 15 to 40 required`);
  const owner = /* @__PURE__ */ new Map();
  for (const t of g) {
    for (const text of [t.term, ...t.aliases ?? []]) {
      const key = text.toLowerCase();
      const first = owner.get(key);
      if (first === void 0) owner.set(key, t.id);
      else err((0, import_sf_model.originOf)(t), `term "${text}" is also used by term:${first}`);
    }
  }
  return out;
}
function proseStats(model, figures) {
  const chapters = model.sections.map((s) => ({ id: s.id, words: floorWords(s), leadSentences: sentences(s.lead ?? ""), bullets: s.bullets?.length ?? 0 }));
  const total = chapters.reduce((n, c) => n + c.words, 0);
  return {
    chapters,
    averageWords: chapters.length ? Math.round(total / chapters.length * 10) / 10 : 0,
    glossary: model.glossary.length,
    lifelines: figures.filter((f) => f.kind === "sequence" && "lanes" in f).length
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkProse,
  proseStats,
  sentences,
  words
});
