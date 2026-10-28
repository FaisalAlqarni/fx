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
var import_sf_corrections = require("./sf-corrections.js");
var import_sf_markdown = require("./sf-markdown.js");
var import_sf_rules = require("./sf-rules.js");
var import_sf_coverage = require("./sf-coverage.js");
var import_sf_stale = require("./sf-stale.js");
var import_sf_estimate = require("./sf-estimate.js");
var import_sf_layout = require("./sf-layout.js");
var import_sf_page = require("./sf-page.js");
var import_sf_diagrams = require("./sf-diagrams.js");
var import_sf_theme = require("./sf-theme.js");
var import_sf_model = require("./sf-model.js");
const RETRY_PAGE = 5;
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
    problems.push(...resolved.problems, ...(0, import_sf_rules.checkRuleAdrs)(merged.model, resolved.roots), ...(0, import_sf_evidence.verifyEvidence)(items, resolved.roots, mode));
    const host = [...resolved.roots.values()].find((r) => r.host);
    if (host) {
      const head = (0, import_sf_corrections.headModel)(host, path.join(hostRoot, site, "model", "fragments"));
      problems.push(...(0, import_sf_corrections.checkCorrections)(head.items, head.model, (0, import_sf_model.itemsOf)(merged.model), merged.model));
    }
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
const REFERENCES = path.join(__dirname, "..", "references");
const ASSETS = [
  ...["fx-tokens-1.css", "fx-map-2.js", "fx-flow-1.js"].map((n) => [n, "visual"]),
  ...["react-18.3.1.production.min.js", "react-dom-18.3.1.production.min.js", "reactflow-11.11.4.min.js", "reactflow-11.11.4.style.css", "elkjs-0.9.3.bundled.js", "LICENSE-react", "LICENSE-reactflow", "LICENSE-elkjs"].map((n) => [n, "vendor"])
];
function saveChoices(hostRoot, c) {
  const file = path.join(hostRoot, ".fx.json");
  const doc = fs.existsSync(file) ? (0, import_json.parseJson)(fs.readFileSync(file, "utf8")) : {};
  const sf = doc.system_flow ?? {};
  const d = { ...sf.diagrams };
  if (c.prefer) d.prefer = c.prefer;
  if (Object.keys(c.pageLimits ?? {}).length) d.pageLimits = c.pageLimits;
  if (c.svg?.length) d.svg = c.svg;
  sf.diagrams = d;
  doc.system_flow = sf;
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}
`);
}
function selectOnly(model, items, only, hostId) {
  const given = only.filter((a) => (0, import_sf_model.parseHandle)(a) !== null);
  const sel = /* @__PURE__ */ new Set([...given, ...(0, import_sf_stale.queryPaths)(items, only.filter((a) => (0, import_sf_model.parseHandle)(a) === null), hostId).map((i) => i.handle)]);
  const containers = /* @__PURE__ */ new Set([...model.sections.map((s) => `section:${s.id}`), ...model.levels.diagrams.map((d) => `diagram:${d.id}`), ...model.sequences.map((q) => `seq:${q.id}`), ...model.storeFlows.map((f) => `flow:${f.id}`)]);
  const known = /* @__PURE__ */ new Set([...items.map((i) => i.handle), ...containers]);
  const unknown = given.filter((h) => !known.has(h));
  const owner = /* @__PURE__ */ new Map();
  for (const d of model.levels.diagrams) for (const o of [...d.groups, ...d.nodes, ...d.edges]) owner.set(o, `level-${d.id}`);
  for (const q of model.sequences) for (const o of [...q.participants, ...q.messages]) owner.set(o, `seq-${q.id}`);
  for (const f of model.storeFlows) for (const o of f.steps) owner.set(o, `flow-${f.id}`);
  const figures = /* @__PURE__ */ new Set();
  for (const { item, o } of (0, import_sf_model.collect)(model)) if (sel.has(item.handle) && owner.has(o)) figures.add(owner.get(o));
  for (const h of sel) {
    const p = (0, import_sf_model.parseHandle)(h);
    if (p?.prefix === "diagram") figures.add(`level-${p.id}`);
    if (p?.prefix === "seq") figures.add(`seq-${p.id}`);
    if (p?.prefix === "flow") figures.add(`flow-${p.id}`);
  }
  const sections = /* @__PURE__ */ new Set();
  for (const s of model.sections) {
    const own = [
      ...model.levels.diagrams.filter((d) => (s.diagrams ?? []).includes(d.id)).map((d) => `diagram:${d.id}`),
      ...model.sequences.filter((q) => (s.sequences ?? []).includes(q.id) || q.chapter === s.id).map((q) => `seq:${q.id}`),
      ...model.storeFlows.filter((f) => (s.storeFlows ?? []).includes(f.id) || f.chapter === s.id).map((f) => `flow:${f.id}`)
    ];
    if (sel.has(`section:${s.id}`) || own.some((h) => sel.has(h)) || (0, import_sf_coverage.sectionItems)(model, s.id).some((i) => sel.has(i.handle))) sections.add(s.id);
  }
  const has = (prefix) => [...sel].some((h) => (0, import_sf_model.parseHandle)(h)?.prefix === prefix);
  return { unknown, selected: sel, figures, sections, components: has("catalogue"), rules: has("rule") };
}
async function build(opts) {
  const result = { ok: false, problems: [], written: [], collisions: [], diagrams: [], layout: [], pageBytes: null, coverage: null, theme: null, depth: null, rebuilt: { docs: [], figures: [], diagrams: [] } };
  const checked = checkModel(opts.hostRoot, opts.site, "build");
  result.problems = checked.problems;
  if (checked.problems.some((p) => p.level === "error")) return result;
  const hostId = [...checked.roots.values()].find((r) => r.host)?.id ?? "";
  const picked = opts.only === void 0 ? null : selectOnly(checked.model, checked.items, opts.only, hostId);
  if (picked && picked.unknown.length) {
    result.problems.push(...picked.unknown.map((h) => ({ file: "", pointer: "", message: `no item ${h}`, level: "error" })));
    return result;
  }
  const planFile = path.join(opts.hostRoot, opts.site, "model", "plan.json");
  const plan = fs.existsSync(planFile) ? (0, import_sf_estimate.readPlan)(planFile, path.posix.join(opts.site, "model", "plan.json")) : { plan: null, problems: [] };
  if (plan.problems.length) {
    result.problems.push(...plan.problems);
    return result;
  }
  result.depth = (0, import_sf_estimate.depth)(checked.model, checked.items, plan.plan, checked.origin);
  const stamps = (0, import_sf_model.planStamps)(picked === null ? checked.items : checked.items.filter((i) => picked.selected.has(i.handle)), checked.roots);
  for (const { item, o } of (0, import_sf_model.collect)(checked.model)) {
    const add = stamps.get(item.handle);
    if (add) o.verified = { ...o.verified, ...add };
  }
  const laid = await (0, import_sf_layout.layoutAll)(checked.model);
  result.layout = laid.report;
  const owners = new Map([
    ...checked.model.levels.diagrams.map((d) => [`level-${d.id}`, d]),
    ...checked.model.sequences.map((q) => [`seq-${q.id}`, q]),
    ...checked.model.storeFlows.map((f) => [`flow-${f.id}`, f])
  ]);
  for (const u of laid.unfit) {
    const at = (0, import_sf_model.originOf)(owners.get(u.key) ?? {});
    result.problems.push({ ...at, message: `figure ${u.key} cannot meet 1 crossing and 860 px: ${u.line}`, level: "error" });
  }
  if (laid.unfit.length) return result;
  const hasMarker = (old) => old.includes(import_sf_markdown.GENERATED);
  const docs = (0, import_sf_markdown.renderMarkdown)(checked.model, checked.roots, hostId, opts.markdown, opts.site);
  const wanted = (i) => picked === null || (i < checked.model.sections.length ? picked.sections.has(checked.model.sections[i].id) : picked.components && docs[i].path.endsWith("/components.md"));
  docs.forEach((doc, i) => {
    if (!wanted(i)) return;
    result.rebuilt.docs.push(doc.path);
    writeGenerated(opts.hostRoot, doc.path, doc.text, hasMarker, result);
  });
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
  const cov = (0, import_sf_coverage.coverage)(checked.model);
  result.coverage = cov.counts;
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, "model", "coverage.json"), `${JSON.stringify({ generated: true, ...cov }, null, 2)}
`, isGeneratedJson, result);
  const covDoc = (0, import_sf_markdown.renderCoverage)(checked.model, cov, opts.markdown);
  const rules = (0, import_sf_markdown.renderRules)(checked.model, checked.roots, hostId, opts.markdown);
  if (picked === null) {
    writeGenerated(opts.hostRoot, covDoc.path, covDoc.text, hasMarker, result);
    result.rebuilt.docs.push(covDoc.path);
  }
  if (picked === null || picked.rules) {
    writeGenerated(opts.hostRoot, rules.path, rules.text, hasMarker, result);
    result.rebuilt.docs.push(rules.path);
  }
  result.rebuilt.figures = laid.figures.map((f) => f.key).filter((k) => picked === null || picked.figures.has(k));
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, "model", "layout-report.json"), `${JSON.stringify(laid.report, null, 2)}
`, () => true, result);
  const theme = (0, import_sf_theme.detectTheme)(opts.hostRoot, opts.docsDir ?? null);
  result.theme = { source: theme.source, kind: theme.kind, fallbacks: theme.fallbacks };
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, "assets", "theme.css"), (0, import_sf_theme.themeCss)(theme), (old) => old.startsWith("/* fx "), result);
  for (const [name, dir] of ASSETS) {
    if (!fs.existsSync(path.join(REFERENCES, dir, name))) throw new Error(`fx asset missing: references/${dir}/${name}`);
  }
  for (const [name, dir] of ASSETS) {
    const rel = path.posix.join(opts.site, "assets", name);
    const dest = path.join(opts.hostRoot, rel);
    if (fs.existsSync(dest)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(REFERENCES, dir, name), dest);
    result.written.push(rel);
  }
  const template = fs.readFileSync(path.join(REFERENCES, "visual", "page-template.html"), "utf8");
  const html = (0, import_sf_page.renderPage)({ model: checked.model, figures: laid.figures, coverage: cov, theme, roots: checked.roots, template });
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, "index.html"), html, hasMarker, result);
  if (!result.collisions.includes(path.posix.join(opts.site, "index.html"))) result.pageBytes = Buffer.byteLength(html);
  const saved = checked.config?.diagrams ?? {};
  const flags = opts.flags ?? {};
  const prefer = flags.prefer ?? saved.prefer;
  const limits = { ...saved.pageLimits, ...flags.pageLimits };
  const svgNames = [.../* @__PURE__ */ new Set([...saved.svg ?? [], ...flags.svg ?? []])].sort();
  const archify = opts.archify ?? (prefer === "cheap" ? void 0 : (0, import_sf_diagrams.findArchify)(opts.hostRoot, process.env, checked.config)?.dir);
  const pages = path.posix.join(opts.site, "diagrams");
  const generatedJson = (old) => {
    try {
      return (0, import_json.parseJson)(old) !== null;
    } catch {
      return false;
    }
  };
  const all = (0, import_sf_diagrams.deepDiagrams)(checked.model, laid.figures, checked.roots, limits);
  const keyOf = (d) => d.source.startsWith("diagram:") ? `level-${d.source.slice(8)}` : d.source.startsWith("seq:") ? `seq-${d.source.slice(4)}` : `flow-${d.source.slice(5)}`;
  const figureOf = (d) => {
    const figure = laid.figures.find((f) => f.key === keyOf(d));
    if (!figure) throw new Error(`no figure for ${d.name}`);
    return figure;
  };
  const writeSpecs = (ds) => {
    for (const d of ds) writeGenerated(opts.hostRoot, path.posix.join(pages, "src", `${d.name}.json`), `${JSON.stringify(d.spec, null, 2)}
`, generatedJson, result);
  };
  const jobsOf = (ds) => ds.map((d) => ({
    name: d.name,
    kind: d.kind,
    spec: path.join(opts.hostRoot, pages, "src", `${d.name}.json`),
    out: path.join(opts.hostRoot, pages, `${d.name}.html`),
    repoRoot: checked.roots.get(d.owningRoot)?.dir ?? opts.hostRoot
  }));
  const bySource = /* @__PURE__ */ new Map();
  for (const d of all) bySource.set(d.source, [...bySource.get(d.source) ?? [], d]);
  const groups = [...bySource.values()].filter((g) => picked === null || picked.figures.has(keyOf(g[0])));
  result.rebuilt.diagrams = groups.flat().map((d) => d.name);
  const svgReason = (g) => prefer === "cheap" && opts.archify === void 0 ? "preference cheap" : svgNames.includes(g[0].name) ? "owner or lane chose SVG" : archify === void 0 ? "archify not installed" : null;
  const svgLabel = (g) => g[0].kind === "sequence" ? "animated SVG" : "static SVG";
  for (const g of groups) writeSpecs(g);
  const live = archify === void 0 ? [] : groups.filter((g) => svgReason(g) === null);
  const runAll = async (gs) => {
    const rs = await (0, import_sf_diagrams.runArchify)(archify, jobsOf(gs.flat()));
    const byGroup = /* @__PURE__ */ new Map();
    gs.flat().forEach((d, i) => {
      const r = rs[i];
      byGroup.set(d.source, [...byGroup.get(d.source) ?? [], { ok: r.ok, receipt: path.posix.join(pages, `${d.name}.receipt.json`) }]);
    });
    return byGroup;
  };
  const first = live.length ? await runAll(live) : /* @__PURE__ */ new Map();
  const retried = /* @__PURE__ */ new Map();
  for (const g of live) {
    const g0 = g[0];
    const key = g0.source.replace(":", "-");
    if (g0.kind === "sequence" && first.get(g0.source).some((r) => !r.ok) && (limits[key] ?? 8) > RETRY_PAGE) {
      retried.set(g0.source, (0, import_sf_diagrams.deepDiagrams)(checked.model, laid.figures, checked.roots, { ...limits, [key]: RETRY_PAGE }).filter((d) => d.source === g0.source));
    }
  }
  for (const g of retried.values()) writeSpecs(g);
  const second = retried.size ? await runAll([...retried.values()]) : /* @__PURE__ */ new Map();
  const msgs = (g) => g.reduce((n, d) => n + (d.spec.messages?.length ?? 0), 0);
  for (const g of groups) {
    const g0 = g[0];
    const skip = svgReason(g);
    const attempt = second.get(g0.source) ?? first.get(g0.source);
    const done = retried.get(g0.source) ?? g;
    const leak = attempt?.every((r) => r.ok) ? done.flatMap((d) => (0, import_sf_diagrams.outsideRefs)(fs.readFileSync(path.join(opts.hostRoot, pages, `${d.name}.html`), "utf8")))[0] : void 0;
    let shown = g, renderer = "svg", line;
    if (skip !== null) line = (0, import_sf_diagrams.pickLine)(g0.name, svgLabel(g), skip);
    else if (leak !== void 0) {
      line = (0, import_sf_diagrams.pickLine)(g0.name, svgLabel(g), `archify page loads outside the site: ${leak}`);
      writeSpecs(g);
    } else if (attempt?.every((r) => r.ok)) {
      renderer = "archify";
      shown = done;
      const cut = [...new Set(done.flatMap((d) => d.shortened))];
      const tail = `${retried.has(g0.source) ? ", retried at 5 per page" : ""}${cut.length ? `, shortened: ${cut.join(", ")}` : ""}`;
      line = g0.kind === "architecture" ? (0, import_sf_diagrams.pickLine)(g0.name, "archify architecture", `${g0.spec.components.length} components${tail}`) : (0, import_sf_diagrams.pickLine)(g0.name, "archify sequence", `${msgs(done)} messages in ${done.length} pages${tail}`);
    } else {
      const failed = attempt.map((r, i) => ({ r, i })).filter((x) => !x.r.ok).pop();
      line = (0, import_sf_diagrams.pickLine)(g0.name, svgLabel(g), `archify failed: ${failed.r.receipt}`);
      writeSpecs(g);
    }
    for (const d of shown) {
      if (renderer === "svg") writeGenerated(opts.hostRoot, path.posix.join(pages, `${d.name}.html`), (0, import_sf_diagrams.svgPage)(d, figureOf(d), Number(/-p(\d+)$/.exec(d.name)?.[1] ?? 1)), () => true, result);
      else {
        const rel = path.posix.join(pages, `${d.name}.html`);
        const file = path.join(opts.hostRoot, rel);
        fs.writeFileSync(file, (0, import_sf_diagrams.applyThemeBlock)(fs.readFileSync(file, "utf8"), theme));
        result.written.push(rel);
      }
    }
    for (const d of shown) result.diagrams.push({ name: d.name, renderer, reason: line.slice(g0.name.length + 2) });
  }
  (0, import_sf_model.stampVerified)(path.join(opts.hostRoot, opts.site, "model", "fragments"), stamps);
  if (opts.flags) saveChoices(opts.hostRoot, { prefer, pageLimits: limits, svg: svgNames });
  result.ok = true;
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  build,
  checkModel,
  systemFlowConfig
});
