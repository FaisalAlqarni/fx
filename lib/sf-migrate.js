// generated from src/lib/sf-migrate.ts by scripts/build: edit there, not here
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
var sf_migrate_exports = {};
__export(sf_migrate_exports, {
  lookOf: () => lookOf,
  migrate: () => migrate
});
module.exports = __toCommonJS(sf_migrate_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("./json.js");
var import_sf_build = require("./sf-build.js");
var import_sf_model = require("./sf-model.js");
var import_sf_schema = require("./sf-schema.js");
const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const LOOKS = [
  ["client", ["client", "app", "browser", "mobile", "portal", "ui"]],
  ["store", ["store", "db", "database", "sql", "cache", "redis", "bucket", "files", "storage"]],
  ["external", ["external", "outside", "third-party", "saas"]],
  ["security", ["security", "auth", "identity", "check"]]
];
const lookOf = (kind) => LOOKS.find(([, kinds]) => kinds.includes((kind ?? "").toLowerCase()))?.[0] ?? "service";
const withLook = (o) => {
  if (!isObj(o) || o.look !== void 0) return o;
  const look = lookOf(typeof o.kind === "string" ? o.kind : void 0);
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = v;
    if (k === "kind") out.look = look;
  }
  return "look" in out ? out : { ...out, look };
};
function upgrade(data) {
  const out = { ...data };
  if (out.schemaVersion === 1) out.schemaVersion = 2;
  if (isObj(out.meta) && out.meta.name === void 0 && typeof out.meta.title === "string") out.meta = { ...out.meta, name: out.meta.title };
  if (isObj(out.levels) && Array.isArray(out.levels.diagrams)) {
    out.levels = { ...out.levels, diagrams: out.levels.diagrams.map((d) => isObj(d) && Array.isArray(d.nodes) ? { ...d, nodes: d.nodes.map(withLook) } : d) };
  }
  if (Array.isArray(out.sequences)) out.sequences = out.sequences.map((q) => isObj(q) && Array.isArray(q.participants) ? { ...q, participants: q.participants.map(withLook) } : q);
  return out;
}
function migrate(hostRoot, site) {
  const dir = path.join(hostRoot, site, "model", "fragments");
  if (!fs.existsSync(dir)) throw new Error(`no fragments folder at ${path.relative(hostRoot, dir)}`);
  const schema = (0, import_json.parseJson)(fs.readFileSync(import_sf_model.SCHEMA_FILE, "utf8"));
  const problems = [];
  const parsed = /* @__PURE__ */ new Map();
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const file = path.relative(hostRoot, path.join(dir, name));
    try {
      const data = (0, import_json.parseJson)(fs.readFileSync(path.join(dir, name), "utf8"));
      if (isObj(data)) parsed.set(name, data);
    } catch (e) {
      problems.push({ file, pointer: "", message: `invalid JSON: ${e.message}`, level: "error" });
    }
  }
  const todo = [];
  for (const [name, data] of parsed) {
    const file = path.relative(hostRoot, path.join(dir, name));
    const next = upgrade(data);
    if (JSON.stringify(next) === JSON.stringify(data)) continue;
    for (const e of (0, import_sf_schema.validate)(schema, next)) problems.push({ file, pointer: e.pointer, message: e.message, level: "error" });
    todo.push([name, `${JSON.stringify(next, null, 2)}
`]);
  }
  if (problems.length > 0) return { rewritten: [], owed: [], problems };
  const rewritten = (0, import_sf_model.writeAll)(hostRoot, todo.map(([name, text]) => [path.join(dir, name), text])).map((f) => path.relative(hostRoot, f)).sort();
  const owed = (0, import_sf_build.checkModel)(hostRoot, site, "check").problems.filter((p) => p.level === "error").map((p) => p.file === "" ? `system-flow: check: ${p.message}` : `${p.file}:${p.pointer}: ${p.message}`);
  return { rewritten, owed, problems };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  lookOf,
  migrate
});
