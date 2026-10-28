// generated from src/lib/sf-build.ts by scripts/build: edit there, not here
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
var sf_build_exports = {};
__export(sf_build_exports, {
  build: () => build,
  checkModel: () => checkModel,
  systemFlowConfig: () => systemFlowConfig
});
module.exports = __toCommonJS(sf_build_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("./json.js");
var import_fx_json = require("./fx-json.js");
var import_sf_evidence = require("./sf-evidence.js");
var import_sf_markdown = require("./sf-markdown.js");
var import_sf_rules = require("./sf-rules.js");
var import_sf_model = require("./sf-model.js");
function systemFlowConfig(root) {
  const file = path.join(root, ".fx.json");
  if (!fs.existsSync(file)) return { config: void 0, problems: [] };
  const parsed = (0, import_fx_json.parseFxJson)((0, import_json.parseJson)(fs.readFileSync(file, "utf8")));
  if (!parsed.ok) throw new Error(parsed.reason);
  const problems = parsed.problems.filter((p) => p.key.startsWith("system_flow")).map((p) => ({ file: ".fx.json", pointer: `/${p.key.split(".").join("/")}`, message: p.reason, level: "error" }));
  return { config: parsed.value.system_flow, problems };
}
function checkModel(hostRoot, site, mode, fragment) {
  const cfg = systemFlowConfig(hostRoot);
  const loaded = (0, import_sf_model.loadFragments)(path.join(hostRoot, site, "model", "fragments"), hostRoot);
  const merged = (0, import_sf_model.mergeFragments)(loaded.fragments);
  let problems = [...cfg.problems, ...loaded.problems, ...merged.problems];
  let items = (0, import_sf_model.itemsOf)(merged.model);
  let roots = /* @__PURE__ */ new Map();
  if (problems.length === 0) {
    problems = (0, import_sf_rules.checkRules)(merged.model, merged.origin);
    const resolved = (0, import_sf_evidence.resolveRoots)(hostRoot, merged.model.meta, cfg.config);
    roots = resolved.roots;
    const only = fragment === void 0 ? void 0 : path.relative(hostRoot, path.resolve(hostRoot, fragment));
    if (only !== void 0 && !loaded.fragments.some((f) => f.file === only)) throw new Error(`no fragment ${only}`);
    if (only !== void 0) items = items.filter((i) => i.file === only);
    problems.push(...resolved.problems, ...(0, import_sf_evidence.verifyEvidence)(items, resolved.roots, mode));
    if (only !== void 0) problems = problems.filter((p) => p.file === only || p.file === ".fx.json");
  }
  return { config: cfg.config, fragments: loaded.fragments, model: merged.model, items, roots, origin: merged.origin, problems };
}
function writeGenerated(root, rel, text, isOurs, r) {
  const file = path.join(root, rel);
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file, "utf8");
    if (!isOurs(old)) {
      r.collisions.push(rel);
      return;
    }
    if (old === text) return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  r.written.push(rel);
}
async function build(opts) {
  const result = { ok: false, problems: [], written: [], collisions: [], diagrams: [], layout: [], pageBytes: null };
  const checked = checkModel(opts.hostRoot, opts.site, "build");
  result.problems = checked.problems;
  if (checked.problems.some((p) => p.level === "error")) return result;
  const stamps = (0, import_sf_model.planStamps)(checked.items, checked.roots);
  for (const { item, o } of (0, import_sf_model.collect)(checked.model)) {
    const add = stamps.get(item.handle);
    if (add) o.verified = { ...o.verified, ...add };
  }
  const hostId = [...checked.roots.values()].find((r) => r.host)?.id ?? "";
  const hasMarker = (old) => old.includes(import_sf_markdown.GENERATED);
  for (const doc of (0, import_sf_markdown.renderMarkdown)(checked.model, checked.roots, hostId, opts.markdown, opts.site)) {
    writeGenerated(opts.hostRoot, doc.path, doc.text, hasMarker, result);
  }
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, "README.md"), (0, import_sf_markdown.renderReadme)(), hasMarker, result);
  const isGeneratedJson = (old) => {
    try {
      return (0, import_json.parseJson)(old).generated === true;
    } catch {
      return false;
    }
  };
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, "model", "system-model.json"), `${JSON.stringify({ generated: true, ...checked.model }, null, 2)}
`, isGeneratedJson, result);
  (0, import_sf_model.stampVerified)(path.join(opts.hostRoot, opts.site, "model", "fragments"), stamps);
  result.ok = true;
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  build,
  checkModel,
  systemFlowConfig
});
