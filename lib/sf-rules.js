// generated from src/lib/sf-rules.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sf_rules_exports = {};
__export(sf_rules_exports, {
  KIND_WORD: () => KIND_WORD,
  checkRuleAdrs: () => checkRuleAdrs,
  checkRules: () => checkRules
});
module.exports = __toCommonJS(sf_rules_exports);
var path = __toESM(require("path"));
var import_sf_model = require("./sf-model.js");
var import_doc_evidence = require("./doc-evidence.js");
var import_sf_evidence = require("./sf-evidence.js");
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
  bullet: "bullet",
  term: "glossary term",
  code: "code map entry"
};
const MAX_PRIMARY = 12;
const DASH = /[\u2013\u2014]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function checkRules(model, origin) {
  const out = [];
  const at = (o, message, level = "error") => {
    out.push({ ...(0, import_sf_model.originOf)(o), message, level });
  };
  for (const s of model.sections) {
    for (const f of ["title", "question"]) if (s[f] === void 0) at(s, `section ${s.id}: ${f} missing`);
  }
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
  const PAGED = /-p\d+$/;
  const actors = new Set(nodeIds);
  for (const q of model.sequences) {
    for (const p of q.participants) actors.add(p.id);
    const here = new Set(q.participants.map((p) => p.id));
    for (const m of q.messages) {
      for (const end of [m.from, m.to]) if (!here.has(end)) at(m, `message ${q.id}#${m.n} names a missing participant ${end}`);
    }
    if (!sections.has(q.chapter)) at(q, `sequence ${q.id} names a missing chapter ${q.chapter}`);
    if (PAGED.test(q.id)) at(q, `sequence ${q.id} ends in -p and digits, which deep diagram page names use`);
  }
  for (const fl of model.storeFlows) {
    if (!sections.has(fl.chapter)) at(fl, `flow ${fl.id} names a missing chapter ${fl.chapter}`);
    if (PAGED.test(fl.id)) at(fl, `flow ${fl.id} ends in -p and digits, which deep diagram page names use`);
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
function checkRuleAdrs(model, roots) {
  const out = [];
  const hostId = [...roots.values()].find((r) => r.host)?.id ?? "";
  for (const r of model.rules) {
    if (!r.adr) continue;
    const p = r.adr.path;
    const bad = /[\s()<>`]/.test(p) ? "path with whitespace, ( ) < > or a backtick cannot be written as a link" : path.isAbsolute(p) || p.split("/").includes("..") ? "path must be relative to its root and hold no .. segment" : null;
    if (bad !== null) {
      out.push({ ...(0, import_sf_model.originOf)(r), message: `rule ${r.id}: ADR ${p}: ${bad}`, level: "error" });
      continue;
    }
    const root = roots.get(r.adr.root ?? hostId);
    if (!root) {
      out.push({ ...(0, import_sf_model.originOf)(r), message: `rule ${r.id}: ADR names root ${r.adr.root}, not in meta.roots`, level: "error" });
      continue;
    }
    if (root.missing || root.refused !== void 0) continue;
    const text = (0, import_sf_evidence.readCited)(root, r.adr.path);
    const why = text === null ? "not found" : (0, import_doc_evidence.adrStatus)(text) === "superseded" ? "is superseded" : null;
    const problem = why ?? (text === null ? null : decisionProblem(text, r.decision));
    if (problem !== null) out.push({ ...(0, import_sf_model.originOf)(r), message: `rule ${r.id}: ADR ${r.adr.path} ${problem}`, level: "error" });
  }
  return out;
}
function decisionProblem(text, decision) {
  const numbers = decisionNumbers(text);
  if (decision !== void 0 && /^\d+$/.test(decision)) return numbers.has(decision) ? null : `has no decision ${decision}`;
  return numbers.size === 0 ? null : `numbers its decisions; cite one by number, not ${decision ?? "none"}`;
}
function decisionNumbers(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^#{1,6}\s+decisions?\b(?!\s+drivers)/i.test(l));
  const out = /* @__PURE__ */ new Set();
  if (at < 0) return out;
  const level = (lines[at] ?? "").indexOf(" ");
  for (const l of lines.slice(at + 1)) {
    const h = /^(#+)\s/.exec(l);
    if (h && (h[1] ?? "").length <= level) break;
    const m = /^ {0,2}(\d+)\.\s/.exec(l);
    if (m) out.add(m[1] ?? "");
  }
  return out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  KIND_WORD,
  checkRuleAdrs,
  checkRules
});
