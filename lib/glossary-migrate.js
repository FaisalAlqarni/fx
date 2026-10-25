// generated from src/lib/glossary-migrate.ts by scripts/build: edit there, not here
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
var glossary_migrate_exports = {};
__export(glossary_migrate_exports, {
  PartlyApplied: () => PartlyApplied,
  applyMigration: () => applyMigration,
  planMigration: () => planMigration
});
module.exports = __toCommonJS(glossary_migrate_exports);
var import_child_process = require("child_process");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const OLD_NAME = /(?<![\w-])CONTEXT(-MAP)?\.md(?![\w-])/g;
const rename = (text) => text.replace(OLD_NAME, (_m, map) => map ? "GLOSSARY-MAP.md" : "GLOSSARY.md");
const MENTIONS = new RegExp(OLD_NAME.source);
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
function planMigration(root) {
  const tracked = new Set((0, import_child_process.execFileSync)("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0"));
  const problems = /* @__PURE__ */ new Set();
  const from = /* @__PURE__ */ new Set();
  const isLink = (rel) => fs.lstatSync(path.join(root, rel)).isSymbolicLink();
  const want = (rel) => {
    if (!tracked.has(rel)) problems.add(`${rel} is not tracked by git`);
    else if (isLink(rel)) problems.add(`${rel} is a symlink`);
    else from.add(rel);
  };
  if (exists(root, "CONTEXT-MAP.md")) want("CONTEXT-MAP.md");
  const mapFile = ["CONTEXT-MAP.md", "GLOSSARY-MAP.md"].find((f) => exists(root, f));
  if (mapFile && isLink(mapFile)) problems.add(`${mapFile} is a symlink`);
  else if (mapFile) {
    const map = fs.readFileSync(path.join(root, mapFile), "utf8");
    for (const m of map.matchAll(/(?:\]\(|^\s*\[[^\]]+\]:)\s*<?([^)\s>#]+)/gm)) {
      const link = m[1] ?? "";
      if (path.posix.basename(link) !== "CONTEXT.md") continue;
      const rel = path.posix.normalize(link);
      if (link.startsWith("/") || rel.startsWith("..")) problems.add(`${link} is not a relative path inside the repo`);
      else if (rel.startsWith("-")) problems.add(`${rel} starts with -`);
      else if (exists(root, rel)) want(rel);
      else if (!exists(root, path.posix.join(path.posix.dirname(rel), "GLOSSARY.md"))) problems.add(`${rel} is missing`);
    }
  }
  if (exists(root, "CONTEXT.md")) want("CONTEXT.md");
  const moves = [...from].sort().map((f) => ({
    from: f,
    to: path.posix.join(path.posix.dirname(f), f.endsWith("-MAP.md") ? "GLOSSARY-MAP.md" : "GLOSSARY.md")
  }));
  for (const m of moves) if (exists(root, m.to)) problems.add(m.to);
  const renamed = new Map(moves.map((m) => [m.from, m.to]));
  const realRoot = fs.realpathSync(root);
  const edits = [];
  const byHand = [];
  for (const f of [...tracked].sort()) {
    const p = path.join(root, f);
    if (!f || f.startsWith("docs/plans/") || f.startsWith("docs/adr/")) continue;
    const st = fs.lstatSync(p, { throwIfNoEntry: false });
    if (!st || st.isDirectory() || !fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    if (text.includes("\0") || !MENTIONS.test(text)) continue;
    if (!f.endsWith(".md")) {
      text.split("\n").forEach((l, i) => {
        if (MENTIONS.test(l)) byHand.push(`${f}:${i + 1}`);
      });
      continue;
    }
    const target = path.relative(realRoot, fs.realpathSync(p)).split(path.sep).join("/");
    if (target === f) edits.push(renamed.get(f) ?? f);
    else if (!tracked.has(target)) problems.add(`${f} is a symlink`);
  }
  edits.sort();
  return { moves, edits, byHand, conflicts: [...problems].sort() };
}
class PartlyApplied extends Error {
}
const gitMv = (root, from, to) => (0, import_child_process.execFileSync)("git", ["mv", "--", from, to], { cwd: root, stdio: "pipe" });
function applyMigration(root) {
  const { moves, edits, conflicts } = planMigration(root);
  if (conflicts.length) throw new Error(conflicts.join("; "));
  const moved = [];
  const written = [];
  try {
    for (const m of moves) {
      gitMv(root, m.from, m.to);
      moved.push(m);
    }
    for (const f of edits) {
      const p = path.join(root, f);
      const text = fs.readFileSync(p, "utf8");
      fs.writeFileSync(p, rename(text));
      written.push({ file: f, text });
    }
  } catch (e) {
    const edited = written.reverse().filter((w) => {
      try {
        fs.writeFileSync(path.join(root, w.file), w.text);
        return false;
      } catch {
        return true;
      }
    }).map((w) => w.file);
    const still = moved.reverse().filter((m) => {
      try {
        gitMv(root, m.to, m.from);
        return false;
      } catch {
        return true;
      }
    });
    if (!edited.length && !still.length) throw e;
    const notMoved = moves.filter((m) => !still.includes(m)).map((m) => m.from);
    throw new PartlyApplied([
      `moved: ${still.map((m) => `${m.from} -> ${m.to}`).join(", ") || "none"}`,
      `not moved: ${notMoved.join(", ") || "none"}`,
      `edited: ${edited.join(", ") || "none"}`
    ].join("; "));
  }
}
function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const root = args.find((a) => a !== "--apply");
  if (!root) {
    console.error("usage: glossary-migrate <root> [--apply]");
    process.exit(2);
  }
  const plan = planMigration(root);
  if (apply) {
    applyMigration(root);
    for (const h of plan.byHand) console.log(`update by hand ${h}`);
    console.log(`moved ${plan.moves.length}, edited ${plan.edits.length}, committed nothing`);
  } else {
    for (const m of plan.moves) console.log(`git mv ${m.from} ${m.to}`);
    for (const e of plan.edits) console.log(`edit ${e}`);
    for (const h of plan.byHand) console.log(`update by hand ${h}`);
    for (const c of plan.conflicts) console.log(`conflict ${c}`);
    console.log("dry run: nothing changed");
  }
}
if (require.main === module) {
  try {
    main();
  } catch (e) {
    if (e instanceof PartlyApplied) {
      console.error(`glossary-migrate: failed, partly applied, rerun to finish: ${e.message}`);
      process.exit(1);
    }
    const msg = String(e.stderr || e.message).trim().split("\n")[0];
    console.error(`glossary-migrate: refused, repo unchanged: ${msg}`);
    process.exit(1);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PartlyApplied,
  applyMigration,
  planMigration
});
