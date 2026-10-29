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
  SCHEMA_FILE: () => SCHEMA_FILE,
  SCHEMA_VERSION: () => SCHEMA_VERSION,
  collect: () => collect,
  decisionText: () => decisionText,
  fieldOrigin: () => fieldOrigin,
  handleOf: () => handleOf,
  itemsOf: () => itemsOf,
  loadFragments: () => loadFragments,
  mergeFragments: () => mergeFragments,
  originOf: () => originOf,
  parseHandle: () => parseHandle,
  planStamps: () => planStamps,
  stampVerified: () => stampVerified,
  writable: () => writable,
  writeAll: () => writeAll
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
const PREFIXES = ["diagram", "node", "edge", "group", "seq", "participant", "message", "flow", "step", "store", "bullet", "catalogue", "inventory", "rule", "section", "question", "correction", "term", "code"];
function parseHandle(h) {
  const at = h.indexOf(":");
  const prefix = h.slice(0, at);
  const id = h.slice(at + 1);
  return at > 0 && id !== "" && PREFIXES.includes(prefix) ? { prefix, id } : null;
}
const SCHEMA_VERSION = 2;
const ID_PATTERN = "^[a-z0-9][a-z0-9-]*$";
const SCHEMA_FILE = path.join(__dirname, "..", "references", "system-flow", "system-model.schema.json");
const NAMED = ["meta.json", "level0.json", "chapters.json", "rules.json", "inventory.json", "questions.json", "corrections.json"];
const fragmentOrder = (names) => [...NAMED.filter((n) => names.includes(n)), ...names.filter((n) => !NAMED.includes(n)).sort()];
const readVersion = (file) => {
  try {
    return (0, import_json.parseJson)(fs.readFileSync(file, "utf8"))?.schemaVersion;
  } catch {
    return void 0;
  }
};
function loadFragments(dir, hostRoot) {
  const schema = (0, import_json.parseJson)(fs.readFileSync(SCHEMA_FILE, "utf8"));
  const fragments = [];
  const problems = [];
  if (!fs.existsSync(dir)) throw new Error(`no fragments folder at ${path.relative(hostRoot, dir)}`);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
  if (!names.includes("meta.json")) problems.push({ file: path.relative(hostRoot, path.join(dir, "meta.json")), pointer: "", message: "file not found", level: "error" });
  const metaV1 = names.includes("meta.json") && readVersion(path.join(dir, "meta.json")) === 1;
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
    if (isObject(data) && (metaV1 || data.schemaVersion === 1)) {
      problems.push({ file, pointer: data.schemaVersion === 1 ? "/schemaVersion" : "", message: "schemaVersion 1: run system-flow migrate", level: "error" });
      continue;
    }
    const errors = (0, import_sf_schema.validate)(schema, data);
    if (errors.length === 0 && name === "meta.json" && data.schemaVersion === void 0) errors.push({ pointer: "", message: "required property schemaVersion missing" });
    if (errors.length === 0 && data.schemaVersion > SCHEMA_VERSION) {
      errors.push({ pointer: "/schemaVersion", message: `schemaVersion ${data.schemaVersion} is newer than this CLI (${SCHEMA_VERSION})` });
    }
    for (const e of errors) problems.push({ file, pointer: e.pointer, message: e.message === "required property look missing" ? "look missing: run system-flow migrate" : e.message, level: "error" });
    if (errors.length === 0) fragments.push({ file, data });
  }
  return { fragments, problems };
}
const emptyModel = () => ({
  schemaVersion: 2,
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
  corrections: [],
  glossary: [],
  codeMap: []
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
const fieldOrigins = /* @__PURE__ */ new WeakMap();
const fieldOrigin = (section, field) => fieldOrigins.get(section)?.get(field);
const isChapters = (file) => path.basename(file) === "chapters.json";
function mergeSections(fragments) {
  const byId = /* @__PURE__ */ new Map();
  const problems = [];
  const sectionsOf = (f) => Array.isArray(f.data.sections) ? f.data.sections : [];
  for (const f of fragments.filter((x) => isChapters(x.file))) {
    sectionsOf(f).forEach((decl, i) => {
      const at = { file: f.file, pointer: `/sections/${i}` };
      const first = byId.get(decl.id);
      if (first !== void 0) {
        problems.push({ ...at, message: `section ${decl.id} is also defined in ${originOf(first).file}`, level: "error" });
        return;
      }
      const merged = { ...decl };
      origin.set(merged, at);
      fieldOrigins.set(merged, new Map(Object.keys(decl).map((k) => [k, { file: f.file, pointer: `${at.pointer}/${k}` }])));
      byId.set(decl.id, merged);
    });
  }
  for (const f of fragments.filter((x) => !isChapters(x.file))) {
    sectionsOf(f).forEach((add, i) => {
      const at = { file: f.file, pointer: `/sections/${i}` };
      const into = byId.get(add.id);
      if (into === void 0) {
        problems.push({ ...at, message: `section ${add.id} is not declared in chapters.json`, level: "error" });
        return;
      }
      const written = fieldOrigins.get(into);
      for (const [k, v] of Object.entries(add)) {
        if (k === "id") continue;
        const target = into;
        const cur = target[k];
        if (Array.isArray(cur) && Array.isArray(v)) target[k] = [...cur, ...v];
        else if (cur === void 0) {
          target[k] = v;
          written.set(k, { file: f.file, pointer: `${at.pointer}/${k}` });
        } else problems.push({ file: f.file, pointer: `${at.pointer}/${k}`, message: `section ${add.id} ${k} is also set in ${written.get(k)?.file ?? ""}`, level: "error" });
      }
    });
  }
  return { sections: [...byId.values()], problems };
}
function mergeFragments(fragments) {
  const model = emptyModel();
  for (const f of fragments) {
    recordOrigin(f.data, f.file, "");
    const { sections: _sections, ...rest } = f.data;
    mergeInto(model, rest);
  }
  const secs = mergeSections(fragments);
  model.sections = secs.sections;
  for (const { o } of collect(model)) o.evidence ??= [];
  const origin2 = /* @__PURE__ */ new Map();
  for (const { handle, o } of declared(model)) if (!origin2.has(handle)) origin2.set(handle, originOf(o));
  return { model, problems: [...secs.problems, ...duplicates(model)], origin: origin2 };
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
const decisionText = (d) => /^\d+$/.test(d) ? `decision ${d}` : d;
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
  for (const s of model.sections) for (const b of [...s.bullets ?? [], ...s.notOwned ?? []]) add("bullet", b.id, b);
  for (const t of model.glossary) add("term", t.id, t);
  for (const c of model.codeMap) add("code", c.id, c);
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
function writable(root, file) {
  const rel = path.relative(root, file);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(`refusing to write outside the host root: ${file}`);
  let at = root;
  for (const part of rel.split(path.sep)) {
    at = path.join(at, part);
    let link = false;
    try {
      link = fs.lstatSync(at).isSymbolicLink();
    } catch {
      break;
    }
    if (link) throw new Error(`refusing to write through a symlink: ${path.relative(root, at).split(path.sep).join("/")}`);
  }
  return file;
}
function stampVerified(hostRoot, fragmentsDir, stamps) {
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
  return writeAll(hostRoot, [...changed].sort().map((file) => [path.join(fragmentsDir, file), `${JSON.stringify(fragments.find((f) => f.file === file)?.data, null, 2)}
`]));
}
function writeAll(hostRoot, files) {
  const temps = [];
  try {
    for (const [file, text] of files) {
      const tmp = writable(hostRoot, `${writable(hostRoot, file)}.tmp`);
      fs.writeFileSync(tmp, text);
      temps.push(tmp);
    }
  } catch (e) {
    for (const t of temps) fs.rmSync(t, { force: true });
    throw e;
  }
  files.forEach(([file], i) => fs.renameSync(temps[i], file));
  return files.map(([file]) => file);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ID_PATTERN,
  SCHEMA_FILE,
  SCHEMA_VERSION,
  collect,
  decisionText,
  fieldOrigin,
  handleOf,
  itemsOf,
  loadFragments,
  mergeFragments,
  originOf,
  parseHandle,
  planStamps,
  stampVerified,
  writable,
  writeAll
});
