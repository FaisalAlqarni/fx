// generated from src/lib/sf-corrections.ts by scripts/build: edit there, not here
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
var sf_corrections_exports = {};
__export(sf_corrections_exports, {
  checkCorrections: () => checkCorrections,
  headModel: () => headModel
});
module.exports = __toCommonJS(sf_corrections_exports);
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_json = require("./json.js");
var import_sf_evidence = require("./sf-evidence.js");
var import_sf_model = require("./sf-model.js");
function headModel(host, fragmentsDir) {
  const fragments = [];
  const problems = [];
  if (host.git && host.head) {
    const dir = path.relative(host.dir, path.resolve(host.dir, fragmentsDir)).split(path.sep).join("/");
    let names = [];
    try {
      names = (0, import_child_process.execFileSync)("git", ["ls-tree", "--name-only", "HEAD", `${dir}/`], { cwd: host.dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split("\n").filter((n) => n.endsWith(".json")).sort();
    } catch (e) {
      const why = String(e.stderr ?? "").trim().split("\n")[0] || e.message.split("\n")[0];
      problems.push({ file: "", pointer: "", message: `cannot read the model at HEAD: ${why}`, level: "error" });
    }
    for (const file of names) {
      const text = (0, import_sf_evidence.readCited)(host, file);
      try {
        if (text !== null) fragments.push({ file, data: (0, import_json.parseJson)(text) });
      } catch {
      }
    }
  }
  const merged = (0, import_sf_model.mergeFragments)(fragments);
  return { model: merged.model, items: (0, import_sf_model.collect)(merged.model).map(({ item }) => item), problems };
}
const SKIP = /* @__PURE__ */ new Set(["id", "evidence", "verified", "unconfirmed"]);
const STEP_TEXT = ["actor", "op", "store", "key", "when"];
function textOf(item, o) {
  const pick = (keys) => JSON.stringify(keys.map((k) => o[k] ?? null));
  switch (item.kind) {
    case "bullet":
      return pick(["text"]);
    case "node":
    case "edge":
      return pick(["label", "short"]);
    case "step":
      return pick(STEP_TEXT);
    case "sql":
    case "cache":
    case "memory":
    case "files":
    case "client":
      return pick(Object.keys(o).filter((k) => !SKIP.has(k)).sort());
    default:
      return null;
  }
}
function checkCorrections(head, headM, now, nowM) {
  const objects = (m) => new Map((0, import_sf_model.collect)(m).map(({ item, o }) => [item.handle, o]));
  const oldO = objects(headM);
  const nowO = objects(nowM);
  const nowItem = new Map(now.map((i) => [i.handle, i]));
  const oldIds = new Set(headM.corrections.map((c) => c.id));
  const covered = new Set(nowM.corrections.filter((c) => !oldIds.has(c.id)).map((c) => c.item));
  const problems = [];
  for (const item of head) {
    const before = textOf(item, oldO.get(item.handle) ?? {});
    if (before === null || covered.has(item.handle)) continue;
    const kept = nowItem.get(item.handle);
    if (!kept) problems.push({ file: item.file, pointer: item.pointer, message: `${item.handle} removed since HEAD with no corrections entry`, level: "error" });
    else if (before !== textOf(kept, nowO.get(item.handle) ?? {})) problems.push({ file: kept.file, pointer: kept.pointer, message: `${item.handle} changed since HEAD with no corrections entry`, level: "error" });
  }
  return problems;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkCorrections,
  headModel
});
