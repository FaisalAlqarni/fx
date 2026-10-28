// generated from src/lib/doc-index.ts by scripts/build: edit there, not here
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
var doc_index_exports = {};
__export(doc_index_exports, {
  buildIndex: () => buildIndex,
  checkPath: () => checkPath,
  loadIndex: () => loadIndex,
  queryIndex: () => queryIndex,
  recordAdrVerified: () => recordAdrVerified,
  stalePassOne: () => stalePassOne,
  writeIndex: () => writeIndex
});
module.exports = __toCommonJS(doc_index_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_json = require("./json.js");
var import_doc_evidence = require("./doc-evidence.js");
const SKIP_DIRS = /* @__PURE__ */ new Set(["plans", "issues", "html"]);
const emptyIndex = () => ({ version: 1, claims: [], problems: [], verified: {} });
function listDocs(root) {
  const out = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const next = `${rel}/${e.name}`;
      if (e.isDirectory() && !(rel === "docs" && SKIP_DIRS.has(e.name))) walk(next);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(next);
    }
  };
  if (fs.existsSync(path.join(root, "docs"))) walk("docs");
  return out.sort();
}
function buildIndex(root) {
  const index = emptyIndex();
  for (const doc of listDocs(root)) {
    const parsed = (0, import_doc_evidence.parseDoc)(doc, fs.readFileSync(path.join(root, doc), "utf8"));
    index.claims.push(...parsed.claims);
    index.problems.push(...parsed.problems);
    index.verified[doc] = parsed.verified;
  }
  return index;
}
function writeIndex(root) {
  const index = buildIndex(root);
  if (index.claims.length === 0 && index.problems.length === 0) return index;
  fs.mkdirSync(path.join(root, ".fx"), { recursive: true });
  fs.writeFileSync(path.join(root, ".fx", "docs-index.json"), JSON.stringify(index, null, 2) + "\n");
  return index;
}
function readCached(file) {
  try {
    const v = (0, import_json.parseJson)(fs.readFileSync(file, "utf8"));
    if (typeof v !== "object" || v === null || !("version" in v) || v.version !== 1) return null;
    if (!("claims" in v) || !Array.isArray(v.claims) || !("problems" in v) || !Array.isArray(v.problems)) return null;
    if (!("verified" in v) || typeof v.verified !== "object" || v.verified === null) return null;
    return { version: 1, claims: v.claims, problems: v.problems, verified: { ...v.verified } };
  } catch {
    return null;
  }
}
function loadIndex(root) {
  const docs = listDocs(root);
  if (docs.length === 0) return emptyIndex();
  const file = path.join(root, ".fx", "docs-index.json");
  const cached = readCached(file);
  if (cached) {
    const built = fs.statSync(file).mtimeMs;
    const sameDocs = JSON.stringify(Object.keys(cached.verified)) === JSON.stringify(docs);
    if (sameDocs && docs.every((d) => fs.statSync(path.join(root, d)).mtimeMs <= built)) return cached;
  }
  return writeIndex(root);
}
const norm = (p) => p.replace(/^\.\//, "").replace(/\/+$/, "");
function queryIndex(index, paths) {
  const qs = paths.map(norm);
  const hit = (c) => c.status === "current" && c.evidence.some((e) => e.type === "path" && qs.some((q) => e.path === q || e.path.startsWith(`${q}/`) || q.startsWith(`${e.path}/`)));
  return index.claims.filter(hit).sort((a, b) => a.doc < b.doc ? -1 : a.doc > b.doc ? 1 : a.line - b.line);
}
function git(root, args) {
  try {
    return (0, import_child_process.execFileSync)("git", ["-c", "core.quotepath=off", ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}
const RANK = { unchanged: 0, shifted: 1, changed: 2, deleted: 3 };
function checkPath(root, verified, p, start, end) {
  if (git(root, ["cat-file", "-e", `HEAD:${p}`]) === null) return "deleted";
  if (git(root, ["cat-file", "-e", `${verified}:${p}`]) === null) return "changed";
  const diff = git(root, ["diff", "--no-color", "--no-renames", "-U0", verified, "HEAD", "--", p]);
  if (diff === null) return "changed";
  let shift = 0;
  for (const m of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+\d+(?:,(\d+))? @@/gm)) {
    const a = Number(m[1]);
    const oldCount = m[2] === void 0 ? 1 : Number(m[2]);
    const newCount = m[3] === void 0 ? 1 : Number(m[3]);
    if (start === null || end === null) return "changed";
    const first = oldCount === 0 ? a + 1 : a;
    const last = oldCount === 0 ? a : a + oldCount - 1;
    if (oldCount === 0 ? a >= start && a < end : first <= end && last >= start) return "changed";
    if (last < start) shift += newCount - oldCount;
  }
  return shift !== 0 ? "shifted" : "unchanged";
}
const ADR_VERIFIED = ".fx-verified";
const VERIFIED_LINE = /^(\S+) ([0-9a-f]{40})\s*$/;
function adrVerified(root, dir) {
  const out = /* @__PURE__ */ new Map();
  const file = path.join(root, dir, ADR_VERIFIED);
  if (!fs.existsSync(file)) return out;
  for (const l of fs.readFileSync(file, "utf8").split("\n")) {
    const m = VERIFIED_LINE.exec(l);
    if (m) out.set(m[1] ?? "", m[2] ?? "");
  }
  return out;
}
function recordAdrVerified(root, doc) {
  if (!(0, import_doc_evidence.isAdrPath)(doc) || !fs.existsSync(path.join(root, doc))) throw new Error(`not an ADR: ${doc}`);
  const sha = (0, import_child_process.execFileSync)("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const file = path.join(root, path.dirname(doc), ADR_VERIFIED);
  if (fs.lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error(`${ADR_VERIFIED} is a symlink`);
  const name = path.basename(doc);
  const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter((l) => l !== "") : [];
  const at = lines.findIndex((l) => VERIFIED_LINE.exec(l)?.[1] === name);
  if (at >= 0) lines[at] = `${name} ${sha}`;
  else lines.push(`${name} ${sha}`);
  fs.writeFileSync(file, lines.join("\n") + "\n");
  return sha;
}
function stalePassOne(root, index) {
  const reachable = /* @__PURE__ */ new Map();
  const folders = /* @__PURE__ */ new Map();
  const verifiedFor = (claim) => {
    if (claim.kind !== "adr") return index.verified[claim.doc] ?? null;
    const dir = path.dirname(claim.doc);
    if (!folders.has(dir)) folders.set(dir, adrVerified(root, dir));
    return folders.get(dir)?.get(path.basename(claim.doc)) ?? null;
  };
  return index.claims.map((claim) => {
    if (claim.status === "superseded") return { claim, verdict: "skip", reason: "superseded" };
    const all = claim.evidence.filter((e) => e.type === "path");
    const paths = all.filter((e) => !e.path.startsWith("@"));
    if (all.length === 0) return { claim, verdict: "skip", reason: "owner" };
    if (paths.length === 0) return { claim, verdict: "skip", reason: "other-root" };
    const sha = verifiedFor(claim);
    if (sha !== null && !reachable.has(sha)) reachable.set(sha, git(root, ["cat-file", "-e", `${sha}^{commit}`]) !== null);
    if (sha === null || !reachable.get(sha)) return { claim, verdict: "recheck", reason: "unverified" };
    let worst = "unchanged";
    for (const e of paths) {
      const r = checkPath(root, sha, e.path, e.start, e.end);
      if (RANK[r] > RANK[worst]) worst = r;
    }
    return worst === "unchanged" ? { claim, verdict: "free", reason: "unchanged" } : { claim, verdict: "recheck", reason: worst };
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildIndex,
  checkPath,
  loadIndex,
  queryIndex,
  recordAdrVerified,
  stalePassOne,
  writeIndex
});
