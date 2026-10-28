// generated from src/lib/sf-evidence.ts by scripts/build: edit there, not here
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
var sf_evidence_exports = {};
__export(sf_evidence_exports, {
  COMMIT: () => COMMIT,
  readCited: () => readCited,
  resolveCommit: () => resolveCommit,
  resolveRoots: () => resolveRoots,
  verifyEvidence: () => verifyEvidence
});
module.exports = __toCommonJS(sf_evidence_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_sf_rules = require("./sf-rules.js");
const git = (dir, args) => {
  try {
    return (0, import_child_process.execFileSync)("git", args, { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
};
const COMMIT = /^[0-9a-f]{40}$/;
function resolveCommit(dir, ref) {
  if (ref === "" || /^-|[\s\0]/.test(ref)) return null;
  const sha = git(dir, ["rev-parse", "--verify", "--quiet", "--end-of-options", `${ref}^{commit}`])?.trim();
  return sha !== void 0 && COMMIT.test(sha) ? sha : null;
}
function resolveRoots(hostRoot, meta, fx) {
  const roots = /* @__PURE__ */ new Map();
  const problems = [];
  meta.roots.forEach((r, i) => {
    const mapped = i === 0 ? hostRoot : (fx?.roots ?? {})[r.id];
    const dir = path.resolve(hostRoot, mapped ?? path.join("..", r.id));
    const pointer = `/system_flow/roots/${r.id}`;
    if (!fs.existsSync(dir)) {
      problems.push({ file: ".fx.json", pointer, message: `root ${r.id} not found at ${dir}`, level: "error" });
      roots.set(r.id, { id: r.id, dir, git: false, head: null, remote: null, host: i === 0, missing: true });
      return;
    }
    const isGit = fs.existsSync(path.join(dir, ".git"));
    if (!isGit) problems.push({ file: ".fx.json", pointer, message: `root ${r.id}: no git: stale and archify sources unavailable`, level: "warning" });
    roots.set(r.id, {
      id: r.id,
      dir,
      git: isGit,
      host: i === 0,
      head: isGit ? git(dir, ["rev-parse", "HEAD"])?.trim() ?? null : null,
      remote: isGit ? git(dir, ["remote", "get-url", "origin"])?.trim() ?? r.remote ?? null : r.remote ?? null
    });
  });
  return { roots, problems };
}
const tracked = /* @__PURE__ */ new Map();
const dirty = /* @__PURE__ */ new Map();
const reads = /* @__PURE__ */ new Map();
const trackedIn = (root) => {
  let s = tracked.get(root.dir);
  if (!s) tracked.set(root.dir, s = new Set((root.head ? git(root.dir, ["ls-tree", "-r", "--name-only", "HEAD"]) ?? "" : "").split("\n").filter(Boolean)));
  return s;
};
const dirtyIn = (root) => {
  let s = dirty.get(root.dir);
  if (!s) dirty.set(root.dir, s = new Set((git(root.dir, ["status", "--porcelain", "-z", "--untracked-files=no"]) ?? "").split("\0").filter((l) => l.length > 3).map((l) => l.slice(3))));
  return s;
};
const inside = (root, rel) => {
  const full = path.resolve(root.dir, rel);
  return !path.isAbsolute(rel) && full.startsWith(root.dir + path.sep) ? full : null;
};
function readCited(root, file) {
  const key = `${root.dir}\0${file}`;
  if (reads.has(key)) return reads.get(key) ?? null;
  let text;
  if (root.git) text = trackedIn(root).has(file) ? git(root.dir, ["show", `HEAD:${file}`]) : null;
  else {
    const full = inside(root, file);
    text = full !== null && fs.existsSync(full) && fs.statSync(full).isFile() ? fs.readFileSync(full, "utf8") : null;
  }
  reads.set(key, text);
  return text;
}
const folderExists = (root, dir) => {
  const bare = dir.replace(/\/+$/, "");
  if (root.git) return [...trackedIn(root)].some((f) => f.startsWith(`${bare}/`));
  const full = inside(root, bare);
  return full !== null && fs.existsSync(full) && fs.statSync(full).isDirectory();
};
function cite(text, spec) {
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  const picked = [];
  for (const part of spec.split(",")) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!m) return null;
    const start = Number(m[1]);
    const end = m[2] === void 0 ? start : Number(m[2]);
    if (start < 1 || end > lines.length || start > end) return null;
    picked.push(...lines.slice(start - 1, end));
  }
  return picked.join("\n");
}
const countLines = (text) => text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
function verifyEvidence(items, roots, mode) {
  const out = [];
  const warned = /* @__PURE__ */ new Set();
  for (const item of items) {
    item.evidence.forEach((e, i) => {
      if (!("path" in e)) return;
      const rootId = e.root ?? [...roots.values()].find((r) => r.host)?.id ?? "";
      const shown = `${rootId}/${e.path}${e.lines === void 0 ? "" : `:${e.lines}`}${e.symbol === void 0 ? "" : ` ${e.symbol}`}`;
      const at = { file: item.file, pointer: `${item.pointer}/evidence/${i}` };
      const fail = (test, whole = false) => {
        out.push({ ...at, message: whole ? test : `${item.handle}: ${shown}: ${test}`, level: "error" });
      };
      const root = roots.get(rootId);
      if (!root) return fail(`evidence names root ${rootId}, not in meta.roots`);
      if (/[*{]/.test(e.path)) return fail("path with * or { is not allowed");
      if (/[\s`]/.test(e.path)) return fail("path with whitespace or a backtick cannot be written as an evidence line");
      if (e.symbol?.includes("`")) return fail("symbol with a backtick cannot be written as an evidence line");
      if (path.isAbsolute(e.path) || e.path.split("/").includes("..")) return fail("path must be relative to its root and hold no .. segment");
      if (root.missing) return;
      if (e.path.endsWith("/")) {
        if (item.kind !== "catalogue" && item.kind !== "inventory") return fail(`${import_sf_rules.KIND_WORD[item.kind]} ${item.id}: a folder entry is allowed only on catalogue and inventory entries`, true);
        if (!folderExists(root, e.path)) fail("folder missing");
        return;
      }
      if (e.lines === void 0 || e.symbol === void 0) return fail("a file entry needs lines and symbol");
      const text = readCited(root, e.path);
      if (text === null) return fail("file missing");
      const cited = cite(text, e.lines);
      if (cited === null) return fail(`range outside file (${countLines(text)} lines)`);
      const last = e.symbol.split(/#|\.|::|\//).pop() ?? "";
      if (!cited.includes(e.symbol) && !(last !== "" && cited.includes(last))) return fail("symbol not in cited lines");
      if (root.git && dirtyIn(root).has(e.path) && !warned.has(`${rootId}\0${e.path}`)) {
        warned.add(`${rootId}\0${e.path}`);
        out.push({ ...at, message: `${item.handle}: ${shown}: ${e.path} has uncommitted changes`, level: mode === "build" ? "error" : "warning" });
      }
    });
  }
  return out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COMMIT,
  readCited,
  resolveCommit,
  resolveRoots,
  verifyEvidence
});
