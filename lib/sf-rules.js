// generated from src/lib/sf-rules.ts by scripts/build: edit there, not here
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
var sf_rules_exports = {};
__export(sf_rules_exports, {
  KIND_WORD: () => KIND_WORD,
  checkRules: () => checkRules
});
module.exports = __toCommonJS(sf_rules_exports);
var import_sf_model = require("./sf-model.js");
const KIND_WORD = {
  node: "node",
  edge: "edge",
  group: "group",
  participant: "participant",
  message: "message",
  step: "step",
  sql: "store row",
  cache: "store row",
  memory: "store row",
  files: "store row",
  client: "store row",
  catalogue: "catalogue entry",
  inventory: "inventory entry",
  rule: "rule",
  bullet: "bullet"
};
const MAX_PRIMARY = 12;
const DASH = /[\u2013\u2014]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function checkRules(model, origin) {
  const out = [];
  const at = (o, message, level = "error") => {
    out.push({ ...(0, import_sf_model.originOf)(o), message, level });
  };
  const entries = (0, import_sf_model.collect)(model);
  const idOf = new Map(entries.map(({ o, item }) => [o, item]));
  const diagrams = new Map(model.levels.diagrams.map((d) => [d.id, d]));
  for (const { o, item } of entries) {
    if (item.evidence.length === 0 && !item.unconfirmed) at(o, `${KIND_WORD[item.kind]} ${item.id} has no evidence and is not unconfirmed`);
  }
  const nodeIds = /* @__PURE__ */ new Set();
  for (const d of model.levels.diagrams) {
    for (const n of d.nodes) nodeIds.add(n.id);
    const primary = d.nodes.filter((n) => n.primary !== false).length;
    if (primary > MAX_PRIMARY) at(d, `level ${d.id} has ${primary} primary nodes, at most ${MAX_PRIMARY}`);
    const here = new Set(d.nodes.map((n) => n.id));
    for (const e of d.edges) {
      for (const end of [e.from, e.to]) if (!here.has(end)) at(e, `edge ${idOf.get(e)?.id} names a missing node ${end}`);
    }
    for (const n of d.nodes) {
      if (n.children !== void 0) {
        const target = diagrams.get(n.children);
        if (!target) at(n, `node ${n.id} opens missing diagram ${n.children}`);
        else if (n.primary !== false && target.parent !== d.id) at(n, `node ${n.id} opens ${target.id}, whose parent is ${target.parent ?? "none"}, not ${d.id}`);
      }
      if (!d.edges.some((e) => e.from === n.id || e.to === n.id)) at(n, `node ${n.id} in ${d.id} has no edge`);
    }
  }
  const sections = new Set(model.sections.map((s) => s.id));
  const actors = new Set(nodeIds);
  for (const q of model.sequences) {
    for (const p of q.participants) actors.add(p.id);
    const here = new Set(q.participants.map((p) => p.id));
    for (const m of q.messages) {
      for (const end of [m.from, m.to]) if (!here.has(end)) at(m, `message ${q.id}#${m.n} names a missing participant ${end}`);
    }
    if (!sections.has(q.chapter)) at(q, `sequence ${q.id} names a missing chapter ${q.chapter}`);
  }
  for (const fl of model.storeFlows) {
    if (!sections.has(fl.chapter)) at(fl, `flow ${fl.id} names a missing chapter ${fl.chapter}`);
    for (const st of fl.steps) if (!actors.has(st.actor)) at(st, `step ${fl.id}#${st.n} names a missing actor ${st.actor}`);
  }
  const ids = (list) => new Set(list.map((x) => x.id));
  const refs = [
    ["diagrams", "diagram", ids(model.levels.diagrams)],
    ["sequences", "sequence", ids(model.sequences)],
    ["storeFlows", "store flow", ids(model.storeFlows)],
    ["storeRefs", "store row", new Set(Object.values(model.stores).flatMap((t) => t.map((r) => r.id)))],
    ["catalogueRefs", "catalogue entry", ids(model.catalogue)],
    ["covers", "inventory entry", ids(model.inventory)]
  ];
  for (const s of model.sections) {
    for (const [key, word, known] of refs) {
      for (const id of s[key] ?? []) if (!known.has(id)) at(s, `section ${s.id} names a missing ${word} ${id}`);
    }
  }
  const handle = (o, owner, h) => {
    if (!(0, import_sf_model.parseHandle)(h)) at(o, `${owner} names ${h}, which is not a handle (<kind>:<id>)`);
    else if (!origin.has(h)) at(o, `${owner} names a missing item ${h}`);
  };
  for (const q of model.questions) for (const h of q.items ?? []) handle(q, `question ${q.id}`, h);
  for (const c of model.corrections) handle(c, `correction ${c.id}`, c.item);
  for (const { o, item } of entries) {
    const label = o.label;
    if (typeof label === "string" && ARABIC.test(label)) out.push({ ...(0, import_sf_model.originOf)(o), pointer: `${(0, import_sf_model.originOf)(o).pointer}/label`, message: `Arabic script in a label of ${KIND_WORD[item.kind]} ${item.id}`, level: "warning" });
  }
  dashes(model, "", "", out);
  return out;
}
function dashes(v, file, pointer, out) {
  if (typeof v === "string") {
    if (DASH.test(v)) out.push({ file, pointer, message: "em or en dash", level: "error" });
  } else if (typeof v === "object" && v !== null) {
    const known = (0, import_sf_model.originOf)(v);
    if (known.file !== "") {
      file = known.file;
      pointer = known.pointer;
    }
    for (const [k, child] of Object.entries(v)) dashes(child, file, `${pointer}/${k}`, out);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  KIND_WORD,
  checkRules
});
