// generated from src/lib/sf-estimate.ts by scripts/build: edit there, not here
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
var sf_estimate_exports = {};
__export(sf_estimate_exports, {
  ESTIMATE: () => ESTIMATE,
  depth: () => depth,
  estimate: () => estimate,
  readPlan: () => readPlan
});
module.exports = __toCommonJS(sf_estimate_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("./json.js");
var import_sf_schema = require("./sf-schema.js");
const ESTIMATE = { calibrated: true, measuredOn: "2026-10-28", tokensPerFile: 37e3, tokensPerFigure: 93e3, controllerTokensPerArea: 21e5, minutesPerFile: 0.2, minutesPerFigure: 0.7, controllerMinutes: 9.4, archifyMinutesPerPage: 0.2, parallel: 4 };
const count = { type: "integer", minimum: 0 };
const PLAN_SCHEMA = {
  type: "object",
  required: ["areas", "chapters"],
  properties: {
    chapters: count,
    areas: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "root", "files", "filesToRead", "levels", "diagrams", "sequences", "storeFlows"],
        properties: { id: { type: "string", minLength: 1 }, root: { type: "string", minLength: 1 }, files: count, filesToRead: count, levels: { type: "integer", minimum: 1, maximum: 3 }, diagrams: count, sequences: count, storeFlows: count }
      }
    }
  }
};
function readPlan(file, label = file) {
  const bad = (pointer, message, f = label) => ({ plan: null, problems: [{ file: f, pointer, message, level: "error" }] });
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return bad("", `cannot read ${label}`, "");
  }
  let data;
  try {
    data = (0, import_json.parseJson)(text);
  } catch (e) {
    return bad("", `invalid JSON: ${e.message}`);
  }
  const errors = (0, import_sf_schema.validate)(PLAN_SCHEMA, data);
  if (errors.length > 0) return { plan: null, problems: errors.map((e) => ({ file: label, pointer: e.pointer, message: e.message, level: "error" })) };
  return { plan: data, problems: [] };
}
function estimate(plan) {
  const c = ESTIMATE;
  const areas = plan.areas.map((a) => {
    const figures = a.diagrams + a.sequences + a.storeFlows;
    return { id: a.id, tokens: a.filesToRead * c.tokensPerFile + figures * c.tokensPerFigure, minutes: a.filesToRead * c.minutesPerFile + figures * c.minutesPerFigure };
  });
  const sum = (f) => areas.reduce((n, a) => n + f(a), 0);
  const lanes = Math.max(1, Math.min(c.parallel, areas.length));
  const round = (n) => Math.round(n * 10) / 10;
  const archifyMinutes = round(plan.areas.reduce((n, a) => n + a.diagrams + a.sequences + a.storeFlows, 0) * c.archifyMinutesPerPage);
  return {
    areas: areas.map((a) => ({ ...a, minutes: round(a.minutes) })),
    total: { tokens: sum((a) => a.tokens) + c.controllerTokensPerArea * plan.areas.length, minutes: round(c.controllerMinutes + sum((a) => a.minutes) / lanes + archifyMinutes), archifyMinutes },
    constants: c,
    note: c.calibrated ? `constants measured on ${c.measuredOn} from proof runs (a) and (b); the split between per-file and per-figure cost is unproven` : "constants are guesses until proof run (a) calibrates them",
    warnings: plan.areas.filter((a) => a.files > 400).map((a) => `area ${a.id} has ${a.files} files; split it into sub-areas of at most 400`)
  };
}
const STORE = /* @__PURE__ */ new Set(["sql", "cache", "memory", "files", "client"]);
function count_(model, items, origin, inFile) {
  const has = (handle) => inFile(origin.get(handle)?.file ?? "");
  const diagrams = model.levels.diagrams.filter((d) => has(`diagram:${d.id}`));
  const sequences = model.sequences.filter((q) => has(`seq:${q.id}`));
  const mine = items.filter((i) => inFile(i.file));
  const perLevel = [0, 0, 0, 0];
  for (const d of diagrams) perLevel[d.level] += 1;
  const cited = /* @__PURE__ */ new Set();
  let evidence = 0;
  for (const i of mine) {
    for (const e of i.evidence) {
      if (!("path" in e)) continue;
      evidence += 1;
      cited.add(JSON.stringify([e.root ?? "", e.path]));
    }
  }
  return {
    levels: new Set(diagrams.map((d) => d.level)).size,
    diagramsPerLevel: perLevel,
    diagrams: diagrams.length,
    primaryNodes: diagrams.reduce((n, d) => n + d.nodes.filter((x) => x.primary !== false).length, 0),
    contextNodes: diagrams.reduce((n, d) => n + d.nodes.filter((x) => x.primary === false).length, 0),
    edges: diagrams.reduce((n, d) => n + d.edges.length, 0),
    sequences: sequences.length,
    messages: sequences.reduce((n, q) => n + q.messages.length, 0),
    storeRows: mine.filter((i) => STORE.has(i.kind)).length,
    flows: model.storeFlows.filter((f) => has(`flow:${f.id}`)).length,
    chapters: model.sections.filter((s) => has(`section:${s.id}`)).length,
    evidence,
    filesCited: cited.size
  };
}
function depth(model, items, plan, origin) {
  const stem = (file) => path.basename(file, ".json");
  return {
    total: count_(model, items, origin, () => true),
    areas: (plan?.areas ?? []).map((a) => ({
      id: a.id,
      planned: { levels: a.levels, diagrams: a.diagrams, sequences: a.sequences, storeFlows: a.storeFlows },
      built: count_(model, items, origin, (file) => file !== "" && stem(file) === a.id)
    }))
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ESTIMATE,
  depth,
  estimate,
  readPlan
});
