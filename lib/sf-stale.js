// generated from src/lib/sf-stale.ts by scripts/build: edit there, not here
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
var sf_stale_exports = {};
__export(sf_stale_exports, {
  changedPaths: () => changedPaths,
  diffBases: () => diffBases,
  loadModelItems: () => loadModelItems,
  queryPaths: () => queryPaths,
  staleItems: () => staleItems,
  verifyItems: () => verifyItems
});
module.exports = __toCommonJS(sf_stale_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_json = require("./json.js");
var import_doc_index = require("./doc-index.js");
var import_sf_model = require("./sf-model.js");
var import_sf_evidence = require("./sf-evidence.js");
var import_sf_build = require("./sf-build.js");
const git = (dir, args) => {
  try {
    return (0, import_child_process.execFileSync)("git", ["-c", "core.quotepath=off", ...args], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};
const hostIdOf = (roots) => [...roots.values()].find((r) => r.host)?.id ?? "";
const fileEvidence = (e) => "path" in e;
const norm = (p) => p.replace(/^\.\//, "").replace(/\/+$/, "");
function loadModelItems(hostRoot, site) {
  const fragmentsDir = path.join(hostRoot, site, "model", "fragments");
  const loaded = (0, import_sf_model.loadFragments)(fragmentsDir, hostRoot);
  const merged = (0, import_sf_model.mergeFragments)(loaded.fragments);
  const bad = [...loaded.problems, ...merged.problems].find((p) => p.level === "error");
  if (bad) throw new Error(`${bad.file}:${bad.pointer}: ${bad.message}`);
  return { items: (0, import_sf_model.itemsOf)(merged.model), roots: (0, import_sf_evidence.resolveRoots)(hostRoot, merged.model.meta, (0, import_sf_build.systemFlowConfig)(hostRoot).config).roots, fragmentsDir };
}
function queryPaths(items, paths, hostId) {
  const qs = paths.map((p) => {
    const m = /^@([^/]+)\/(.*)$/.exec(p);
    return { root: m ? m[1] ?? "" : hostId, path: norm(m ? m[2] ?? "" : p) };
  });
  return items.filter((i) => i.evidence.some((e) => fileEvidence(e) && qs.some((q) => {
    const p = norm(e.path);
    return (e.root ?? hostId) === q.root && (p === q.path || p.startsWith(`${q.path}/`) || q.path.startsWith(`${p}/`));
  }))).map((i) => ({ handle: i.handle, kind: i.kind, file: i.file }));
}
function changedPaths(root, base) {
  const text = git(root.dir, ["diff", "--no-renames", "--name-status", `${base}...HEAD`]);
  if (text === null) throw new Error(`cannot diff ${base}...HEAD in root ${root.id}`);
  const changed = [];
  const added = [];
  for (const line of text.split("\n")) {
    const [status, ...rest] = line.split("	");
    const p = rest.join("	");
    if (!status || !p) continue;
    changed.push(p);
    if (status === "A") added.push(p);
  }
  return { changed, added };
}
function diffBases(items, roots, hostBase, given) {
  const bases = {};
  const unbased = [];
  for (const root of roots.values()) {
    if (root.host) {
      bases[root.id] = hostBase;
      continue;
    }
    const ref = given[root.id];
    if (ref !== void 0) {
      bases[root.id] = ref;
      continue;
    }
    const seen = [...new Set(items.map((i) => i.verified?.[root.id]).filter((s) => s !== void 0))].filter((s) => root.git && git(root.dir, ["cat-file", "-e", `${s}^{commit}`]) !== null);
    const oldest = seen.length === 0 ? void 0 : git(root.dir, ["rev-list", "--no-walk=sorted", ...seen])?.trim().split("\n").pop();
    if (oldest) bases[root.id] = oldest;
    else unbased.push(root.id);
  }
  return { bases, unbased };
}
const RANK = { unchanged: 0, shifted: 1, changed: 2, deleted: 3 };
function worstOf(root, sha, e) {
  const p = norm(e.path);
  const ranges = e.lines === void 0 ? [null] : e.lines.split(",").map((r) => /^(\d+)(?:-(\d+))?$/.exec(r.trim()));
  let worst = "unchanged";
  for (const m of ranges) {
    const r = (0, import_doc_index.checkPath)(root.dir, sha, p, m ? Number(m[1]) : null, m ? Number(m[2] ?? m[1]) : null);
    if (RANK[r] > RANK[worst]) worst = r;
  }
  return worst;
}
function staleItems(items, roots) {
  const hostId = hostIdOf(roots);
  const out = {};
  const reachable = /* @__PURE__ */ new Map();
  for (const root of roots.values()) {
    out[root.id] = [];
    if (root.missing || !root.git || !root.head) continue;
    for (const item of items) {
      const cited = item.evidence.filter(fileEvidence).filter((e) => (e.root ?? hostId) === root.id);
      if (cited.length === 0) continue;
      const sha = item.verified?.[root.id];
      const key = `${root.id}\0${sha}`;
      if (sha !== void 0 && !reachable.has(key)) reachable.set(key, git(root.dir, ["cat-file", "-e", `${sha}^{commit}`]) !== null);
      if (sha === void 0 || !reachable.get(key)) {
        out[root.id]?.push({ handle: item.handle, reason: "unverified" });
        continue;
      }
      let worst = "unchanged";
      for (const e of cited) {
        const r = worstOf(root, sha, e);
        if (RANK[r] > RANK[worst]) worst = r;
      }
      if (worst !== "unchanged") out[root.id]?.push({ handle: item.handle, reason: worst });
    }
  }
  return out;
}
function verifyItems(fragmentsDir, handles, roots) {
  const names = fs.readdirSync(fragmentsDir).filter((n) => n.endsWith(".json"));
  const fragments = names.map((file) => ({ file, data: (0, import_json.parseJson)(fs.readFileSync(path.join(fragmentsDir, file), "utf8")) }));
  const all = (0, import_sf_model.collect)((0, import_sf_model.mergeFragments)(fragments).model);
  const known = new Set(all.map(({ item }) => item.handle));
  for (const h of handles === "all" ? [] : handles) if (!known.has(h)) throw new Error(`no item ${h}`);
  const hostId = hostIdOf(roots);
  const changed = /* @__PURE__ */ new Set();
  const done = [];
  for (const { item, o } of all) {
    if (handles !== "all" && !handles.includes(item.handle)) continue;
    const stamp = {};
    for (const e of item.evidence.filter(fileEvidence)) {
      const head = roots.get(e.root ?? hostId)?.head;
      if (head) stamp[e.root ?? hostId] = head;
    }
    if (Object.keys(stamp).length === 0) continue;
    const target = o;
    const next = { ...target.verified, ...stamp };
    if (JSON.stringify(next) !== JSON.stringify(target.verified)) {
      target.verified = next;
      changed.add(item.file);
    }
    done.push(item.handle);
  }
  for (const file of changed) fs.writeFileSync(path.join(fragmentsDir, file), `${JSON.stringify(fragments.find((f) => f.file === file)?.data, null, 2)}
`);
  return done;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  changedPaths,
  diffBases,
  loadModelItems,
  queryPaths,
  staleItems,
  verifyItems
});
