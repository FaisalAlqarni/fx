// generated from src/lib/sf-model.ts by scripts/build: edit there, not here
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
var sf_model_exports = {};
__export(sf_model_exports, {
  ID_PATTERN: () => ID_PATTERN,
  SCHEMA_VERSION: () => SCHEMA_VERSION,
  collect: () => collect,
  handleOf: () => handleOf,
  itemsOf: () => itemsOf,
  loadFragments: () => loadFragments,
  mergeFragments: () => mergeFragments,
  originOf: () => originOf,
  parseHandle: () => parseHandle,
  planStamps: () => planStamps,
  stampVerified: () => stampVerified
});
module.exports = __toCommonJS(sf_model_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("./json.js");
var import_sf_schema = require("./sf-schema.js");
const STORE_KINDS = ["sql", "cache", "memory", "files", "client"];
function handleOf(kind, id) {
  return `${STORE_KINDS.includes(kind) ? "store" : kind}:${id}`;
}
const PREFIXES = ["diagram", "node", "edge", "group", "seq", "participant", "message", "flow", "step", "store", "bullet", "catalogue", "inventory", "rule", "section", "question", "correction"];
function parseHandle(h) {
  const at = h.indexOf(":");
  const prefix = h.slice(0, at);
  const id = h.slice(at + 1);
  return at > 0 && id !== "" && PREFIXES.includes(prefix) ? { prefix, id } : null;
}
const SCHEMA_VERSION = 1;
const ID_PATTERN = "^[a-z0-9][a-z0-9-]*$";
const SCHEMA_FILE = path.join(__dirname, "..", "references", "system-flow", "system-model.schema.json");
const NAMED = ["meta.json", "level0.json", "chapters.json", "rules.json", "inventory.json", "questions.json", "corrections.json"];
const fragmentOrder = (names) => [...NAMED.filter((n) => names.includes(n)), ...names.filter((n) => !NAMED.includes(n)).sort()];
function loadFragments(dir, hostRoot) {
  const schema = (0, import_json.parseJson)(fs.readFileSync(SCHEMA_FILE, "utf8"));
  const fragments = [];
  const problems = [];
  if (!fs.existsSync(dir)) throw new Error(`no fragments folder at ${path.relative(hostRoot, dir)}`);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
  if (!names.includes("meta.json")) problems.push({ file: path.relative(hostRoot, path.join(dir, "meta.json")), pointer: "", message: "file not found", level: "error" });
  for (const name of fragmentOrder(names)) {
    const file = path.relative(hostRoot, path.join(dir, name));
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    let data;
    try {
      data = (0, import_json.parseJson)(text);
    } catch (e) {
      problems.push({ file, pointer: "", message: `invalid JSON: ${e.message}`, level: "error" });
      continue;
    }
    const errors = (0, import_sf_schema.validate)(schema, data);
    if (errors.length === 0 && name === "meta.json" && data.schemaVersion === void 0) errors.push({ pointer: "", message: "required property schemaVersion missing" });
    if (errors.length === 0 && data.schemaVersion > SCHEMA_VERSION) {
      errors.push({ pointer: "/schemaVersion", message: `schemaVersion ${data.schemaVersion} is newer than this CLI (${SCHEMA_VERSION})` });
    }
    for (const e of errors) problems.push({ file, pointer: e.pointer, message: e.message, level: "error" });
    if (errors.length === 0) fragments.push({ file, data });
  }
  return { fragments, problems };
}
const emptyModel = () => ({
  schemaVersion: 1,
  meta: { roots: [] },
  levels: { root: "", diagrams: [] },
  sequences: [],
  stores: { sql: [], cache: [], memory: [], files: [], client: [] },
  storeFlows: [],
  catalogue: [],
  rules: [],
  inventory: [],
  sections: [],
  questions: [],
  corrections: []
});
function mergeInto(into, from) {
  for (const [k, v] of Object.entries(from)) {
    if (k === "__proto__") continue;
    const cur = Object.hasOwn(into, k) ? into[k] : void 0;
    if (Array.isArray(cur) && Array.isArray(v)) into[k] = [...cur, ...v];
    else if (isObject(cur) && isObject(v)) mergeInto(cur, v);
    else if (cur === void 0 || cur === "") into[k] = v;
  }
}
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const origin = /* @__PURE__ */ new WeakMap();
function recordOrigin(v, file, pointer) {
  if (typeof v !== "object" || v === null) return;
  origin.set(v, { file, pointer });
  for (const [k, child] of Object.entries(v)) recordOrigin(child, file, `${pointer}/${k}`);
}
const originOf = (o) => origin.get(o) ?? { file: "", pointer: "" };
function mergeFragments(fragments) {
  const model = emptyModel();
  for (const f of fragments) {
    recordOrigin(f.data, f.file, "");
    mergeInto(model, f.data);
  }
  for (const { o } of collect(model)) o.evidence ??= [];
  const origin2 = /* @__PURE__ */ new Map();
  for (const { handle, o } of declared(model)) if (!origin2.has(handle)) origin2.set(handle, originOf(o));
  return { model, problems: duplicates(model), origin: origin2 };
}
function declared(model) {
  const declared2 = collect(model).map(({ item, o }) => ({ handle: item.handle, o }));
  const add = (prefix, list) => {
    for (const o of list) declared2.push({ handle: `${prefix}:${o.id}`, o });
  };
  add("diagram", model.levels.diagrams);
  add("seq", model.sequences);
  add("flow", model.storeFlows);
  add("section", model.sections);
  add("question", model.questions);
  add("correction", model.corrections);
  add("root", model.meta.roots);
  return declared2;
}
function duplicates(model) {
  const seen = /* @__PURE__ */ new Map();
  const problems = [];
  for (const { handle, o } of declared(model)) {
    const first = seen.get(handle);
    const at = originOf(o);
    if (first === void 0) seen.set(handle, at.file);
    else problems.push({ ...at, message: `${handle.replace(":", " ")} is also defined in ${first}`, level: "error" });
  }
  return problems;
}
function itemsOf(model) {
  return collect(model).map(({ item }) => item);
}
function collect(model) {
  const out = [];
  const add = (kind, id, o) => {
    out.push({ o, item: { id, kind, handle: handleOf(kind, id), evidence: o.evidence ?? [], verified: o.verified, unconfirmed: o.unconfirmed, ...originOf(o) } });
  };
  for (const d of model.levels.diagrams) {
    for (const g of d.groups) add("group", g.id, g);
    for (const n of d.nodes) add("node", n.id, n);
    const pairs = /* @__PURE__ */ new Map();
    for (const e of d.edges) {
      const pair = `${d.id}:${e.from}>${e.to}`;
      const n = (pairs.get(pair) ?? 0) + 1;
      pairs.set(pair, n);
      add("edge", n === 1 ? pair : `${pair}#${n}`, e);
    }
  }
  for (const q of model.sequences) {
    for (const p of q.participants) add("participant", `${q.id}.${p.id}`, p);
    for (const m of q.messages) add("message", `${q.id}#${m.n}`, m);
  }
  for (const fl of model.storeFlows) for (const st of fl.steps) add("step", `${fl.id}#${st.n}`, st);
  for (const c of model.catalogue) add("catalogue", c.id, c);
  for (const i of model.inventory) add("inventory", i.id, i);
  for (const r of model.rules) add("rule", r.id, r);
  for (const t of STORE_KINDS) for (const r of model.stores[t]) add(t, r.id, r);
  for (const s of model.sections) for (const b of s.bullets ?? []) add("bullet", b.id, b);
  return out;
}
function planStamps(items, roots) {
  const hostId = [...roots].find(([, r]) => r.host)?.[0] ?? "";
  const stamps = /* @__PURE__ */ new Map();
  for (const item of items) {
    const add = {};
    for (const e of item.evidence) {
      if (!("path" in e)) continue;
      const id = e.root ?? hostId;
      const head = roots.get(id)?.head;
      if (head && item.verified?.[id] === void 0) add[id] = head;
    }
    if (Object.keys(add).length > 0) stamps.set(item.handle, add);
  }
  return stamps;
}
function stampVerified(fragmentsDir, stamps) {
  const names = fs.readdirSync(fragmentsDir).filter((n) => n.endsWith(".json"));
  const fragments = names.map((file) => ({ file, data: (0, import_json.parseJson)(fs.readFileSync(path.join(fragmentsDir, file), "utf8")) }));
  const model = mergeFragments(fragments).model;
  const changed = /* @__PURE__ */ new Set();
  for (const { item, o } of collect(model)) {
    const add = stamps.get(item.handle);
    if (!add) continue;
    const target = o;
    const fresh = Object.fromEntries(Object.entries(add).filter(([id]) => target.verified?.[id] === void 0));
    if (Object.keys(fresh).length === 0) continue;
    target.verified = { ...target.verified, ...fresh };
    changed.add(item.file);
  }
  return [...changed].sort().map((file) => {
    const full = path.join(fragmentsDir, file);
    fs.writeFileSync(full, `${JSON.stringify(fragments.find((f) => f.file === file)?.data, null, 2)}
`);
    return full;
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ID_PATTERN,
  SCHEMA_VERSION,
  collect,
  handleOf,
  itemsOf,
  loadFragments,
  mergeFragments,
  originOf,
  parseHandle,
  planStamps,
  stampVerified
});
