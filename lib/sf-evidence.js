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
  rootsBase: () => rootsBase,
  verifyEvidence: () => verifyEvidence
});
module.exports = __toCommonJS(sf_evidence_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_sf_rules = require("./sf-rules.js");
var import_sf_model = require("./sf-model.js");
const gitRun = (dir, args) => {
  try {
    return { out: (0, import_child_process.execFileSync)("git", args, { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (e) {
    const stderr = String(e.stderr ?? "").trim();
    return { err: stderr.split("\n")[0] || e.message.split("\n")[0] || "git failed" };
  }
};
const git = (dir, args) => {
  const r = gitRun(dir, args);
  return "out" in r ? r.out : null;
};
const COMMIT = /^[0-9a-f]{40}$/;
function resolveCommit(dir, ref) {
  if (ref === "" || /^-|[\s\0]/.test(ref)) return null;
  const sha = git(dir, ["rev-parse", "--verify", "--quiet", "--end-of-options", `${ref}^{commit}`])?.trim();
  return sha !== void 0 && COMMIT.test(sha) ? sha : null;
}
const USERINFO = /^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i;
const address = (remote) => remote !== void 0 && (/^(?!file:)[a-z][a-z0-9+.-]*:\/\//i.test(remote) || /^[^/\s@]+@[^/\s:]+:/.test(remote)) ? remote.replace(USERINFO, "$1") : null;
function rootsBase(hostRoot) {
  const out = git(hostRoot, ["rev-parse", "--path-format=absolute", "--git-common-dir", "--git-dir"])?.trim().split("\n");
  return out?.length === 2 && out[0] !== out[1] ? path.dirname(out[0]) : hostRoot;
}
function resolveRoots(hostRoot, meta, fx) {
  const roots = /* @__PURE__ */ new Map();
  const problems = [];
  const base = rootsBase(hostRoot);
  meta.roots.forEach((r, i) => {
    if (r.remote !== void 0 && USERINFO.test(r.remote)) problems.push({ ...(0, import_sf_model.originOf)(r), message: `root ${r.id}: remote holds a user name or password; write it without them`, level: "error" });
    const mapped = i === 0 ? hostRoot : (fx?.roots ?? {})[r.id];
    const dir = path.resolve(base, mapped ?? path.join("..", r.id));
    const pointer = `/system_flow/roots/${r.id}`;
    if (!fs.existsSync(dir)) {
      problems.push({ file: ".fx.json", pointer, message: `root ${r.id} not found at ${dir}`, level: "error" });
      roots.set(r.id, { id: r.id, dir, git: false, head: null, remote: null, host: i === 0, missing: true });
      return;
    }
    const isGit = fs.existsSync(path.join(dir, ".git"));
    if (!isGit) problems.push({ file: ".fx.json", pointer, message: `root ${r.id}: no git: stale and archify sources unavailable`, level: "warning" });
    const head = isGit ? gitRun(dir, ["rev-parse", "--verify", "HEAD"]) : null;
    const refused = head !== null && "err" in head ? head.err : void 0;
    if (refused !== void 0) problems.push({ file: ".fx.json", pointer, message: `root ${r.id}: git cannot read HEAD: ${refused}`, level: "error" });
    roots.set(r.id, {
      id: r.id,
      dir,
      git: isGit,
      host: i === 0,
      head: head !== null && "out" in head ? head.out.trim() : null,
      remote: address(isGit ? git(dir, ["remote", "get-url", "origin"])?.trim() ?? r.remote : r.remote),
      ...refused === void 0 ? {} : { refused }
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
  if (s === void 0) {
    const r = gitRun(root.dir, ["status", "--porcelain", "-z", "--untracked-files=no"]);
    dirty.set(root.dir, s = "err" in r ? r.err : new Set(r.out.split("\0").filter((l) => l.length > 3).map((l) => l.slice(3))));
  }
  return s;
};
const inside = (root, rel) => {
  const full = path.resolve(root.dir, rel);
  if (path.isAbsolute(rel) || !full.startsWith(root.dir + path.sep)) return null;
  let real, base;
  try {
    real = fs.realpathSync(full);
    base = fs.realpathSync(root.dir);
  } catch {
    return full;
  }
  return real.startsWith(base + path.sep) ? full : null;
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
      if (e.lines !== void 0 && !/^\d+(?:-\d+)?(?: ?, ?\d+(?:-\d+)?)*$/.test(e.lines)) return fail("lines must be ranges such as 4, 1-4 or 1-4,9");
      const root = roots.get(rootId);
      if (!root) return fail(`evidence names root ${rootId}, not in meta.roots`);
      if (/[*{]/.test(e.path)) return fail("path with * or { is not allowed");
      if (/[\s`]/.test(e.path)) return fail("path with whitespace or a backtick cannot be written as an evidence line");
      if (e.symbol?.includes("`")) return fail("symbol with a backtick cannot be written as an evidence line");
      if (path.isAbsolute(e.path) || e.path.split("/").includes("..")) return fail("path must be relative to its root and hold no .. segment");
      if (root.missing || root.refused !== void 0) return;
      if (e.path.endsWith("/")) {
        if (item.kind !== "catalogue" && item.kind !== "inventory" && item.kind !== "code") return fail(`${import_sf_rules.KIND_WORD[item.kind]} ${item.id}: a folder entry is allowed only on catalogue and inventory entries`, true);
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
      const changed = root.git ? dirtyIn(root) : /* @__PURE__ */ new Set();
      if (typeof changed === "string") {
        if (!warned.has(`${rootId}\0`)) out.push({ file: ".fx.json", pointer: `/system_flow/roots/${rootId}`, message: `root ${rootId}: git status failed: ${changed}`, level: "error" });
        warned.add(`${rootId}\0`);
      } else if (changed.has(e.path) && !warned.has(`${rootId}\0${e.path}`)) {
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
  rootsBase,
  verifyEvidence
});
