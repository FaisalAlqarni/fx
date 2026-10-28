// generated from src/lib/sf-detect.ts by scripts/build: edit there, not here
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
var sf_detect_exports = {};
__export(sf_detect_exports, {
  detect: () => detect,
  docsConfig: () => docsConfig,
  rootId: () => rootId,
  writeFxJson: () => writeFxJson
});
module.exports = __toCommonJS(sf_detect_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("./json.js");
var import_sf_build = require("./sf-build.js");
var import_sf_evidence = require("./sf-evidence.js");
var import_sf_diagrams = require("./sf-diagrams.js");
var import_sf_markdown = require("./sf-markdown.js");
var import_sf_theme = require("./sf-theme.js");
function rootId(folder) {
  return path.basename(folder).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
const first = (root, names) => names.find((n) => fs.existsSync(path.join(root, n)));
function docsConfig(host) {
  if (fs.existsSync(path.join(host, "mkdocs.yml"))) {
    const m = /^docs_dir:\s*["']?([^"'#\s]+)/m.exec(fs.readFileSync(path.join(host, "mkdocs.yml"), "utf8"));
    return { kind: "mkdocs", path: "mkdocs.yml", docsDir: path.posix.normalize(m?.[1] ?? "docs").replace(/\/$/, "") };
  }
  const docusaurus = first(host, ["js", "ts", "mjs", "cjs"].map((e) => `docusaurus.config.${e}`));
  if (docusaurus) return { kind: "docusaurus", path: docusaurus, docsDir: "docs" };
  const configs = (dir) => ["ts", "mts", "js", "mjs"].map((e) => path.posix.join(dir, ".vitepress", `config.${e}`));
  const subs = fs.readdirSync(host, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules").map((e) => e.name).sort();
  for (const dir of [".", ...subs]) {
    const found = first(host, configs(dir));
    if (found) return { kind: "vitepress", path: found, docsDir: dir };
  }
  return { kind: null, path: null, docsDir: null };
}
function handWritten(dir) {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir, { withFileTypes: true }).some((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? handWritten(p) : e.name.endsWith(".md") && !fs.readFileSync(p, "utf8").includes(import_sf_markdown.GENERATED);
  });
}
const err = (message, file = "") => ({ file, pointer: "", message, level: "error" });
function detect(hostRoot, repos) {
  const problems = [];
  const cfg = (0, import_sf_build.systemFlowConfig)(hostRoot);
  problems.push(...cfg.problems);
  const dc = docsConfig(hostRoot);
  const base = dc.docsDir === null || dc.docsDir === "." ? dc.docsDir === "." ? "" : "docs" : dc.docsDir;
  const join = (name) => path.posix.join(base, name);
  let output = cfg.config?.output;
  if (!output) {
    let markdown = join("system");
    if (handWritten(path.join(hostRoot, markdown))) {
      if (handWritten(path.join(hostRoot, join("system-generated")))) problems.push(err(`${markdown} and ${join("system-generated")} hold hand-written Markdown; set system_flow.output.markdown in .fx.json`));
      markdown = join("system-generated");
    }
    output = { site: join("system-flow"), markdown };
  }
  const listed = /* @__PURE__ */ new Map();
  const given = {};
  const seen = /* @__PURE__ */ new Map();
  const hostId = rootId(hostRoot);
  listed.set(hostId, ".");
  seen.set(hostRoot, hostId);
  const add = (id, shown, p) => {
    const dir = path.resolve(hostRoot, p);
    if (seen.has(dir)) return;
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      problems.push(err(`no folder at ${shown}`));
      return;
    }
    const other = [...listed].find(([k]) => k === id);
    if (other) {
      problems.push(err(`roots ${other[1]} and ${shown} both map to id ${id}; rename one in .fx.json system_flow.roots`));
      return;
    }
    listed.set(id, path.relative(hostRoot, dir) || ".");
    given[id] = listed.get(id);
    seen.set(dir, id);
  };
  for (const [id, p] of Object.entries(cfg.config?.roots ?? {})) add(id, p, p);
  for (const r of repos) add(rootId(r), r, r);
  const { roots } = (0, import_sf_evidence.resolveRoots)(hostRoot, { roots: [...listed.keys()].map((id) => ({ id })) }, { roots: given });
  const rootList = [...roots.values()].map((r) => ({ id: r.id, path: listed.get(r.id), dir: r.dir, git: r.git, remote: r.remote, head: r.head }));
  const theme = (0, import_sf_theme.detectTheme)(hostRoot, dc.docsDir);
  const rel = (p) => base === "" ? p : path.posix.relative(base, p);
  const site = rel(output.site);
  const mkdocs = dc.kind === "mkdocs" ? { nav: [`- System flow: ${site}/index.html`, `- System docs: ${rel(output.markdown)}/index.md`], excludeDocs: [`${site}/README.md`, `${site}/model/`, `${site}/diagrams/src/`] } : null;
  return { detected: { docsConfig: dc, output, mkdocs, theme: { source: theme.source, kind: theme.kind }, archify: cfg.config?.diagrams?.prefer === "cheap" ? null : (0, import_sf_diagrams.findArchify)(hostRoot, process.env, cfg.config), roots: rootList }, problems };
}
function writeFxJson(hostRoot, d) {
  const file = path.join(hostRoot, ".fx.json");
  const doc = fs.existsSync(file) ? (0, import_json.parseJson)(fs.readFileSync(file, "utf8")) : {};
  const sf = doc.system_flow ?? {};
  const roots = sf.roots ?? {};
  for (const r of d.roots.slice(1)) if (roots[r.id] === void 0) roots[r.id] = r.path;
  sf.output = d.output;
  sf.theme = d.theme;
  if (Object.keys(roots).length > 0) sf.roots = roots;
  doc.system_flow = sf;
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}
`);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  detect,
  docsConfig,
  rootId,
  writeFxJson
});
