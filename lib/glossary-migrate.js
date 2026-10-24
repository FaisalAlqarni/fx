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
  applyMigration: () => applyMigration,
  planMigration: () => planMigration
});
module.exports = __toCommonJS(glossary_migrate_exports);
var import_child_process = require("child_process");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const OLD_NAME = /(?<![\w-])CONTEXT(-MAP)?\.md(?![\w-])/g;
const rename = (text) => text.replace(OLD_NAME, (_m, map) => map ? "GLOSSARY-MAP.md" : "GLOSSARY.md");
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
function docFiles(root, dir, out) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory() && !(rel === "docs/plans" || rel === "docs/adr")) docFiles(root, rel, out);
    else if (e.isFile() && e.name.endsWith(".md")) out.push(rel);
  }
}
function planMigration(root) {
  const tracked = new Set((0, import_child_process.execFileSync)("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0"));
  const problems = /* @__PURE__ */ new Set();
  const from = /* @__PURE__ */ new Set();
  const want = (rel) => {
    if (!tracked.has(rel)) problems.add(`${rel} is not tracked by git`);
    else from.add(rel);
  };
  if (exists(root, "CONTEXT-MAP.md")) want("CONTEXT-MAP.md");
  const mapFile = ["CONTEXT-MAP.md", "GLOSSARY-MAP.md"].find((f) => exists(root, f));
  if (mapFile) {
    const map = fs.readFileSync(path.join(root, mapFile), "utf8");
    for (const m of map.matchAll(/\]\(\s*<?([^)\s>#]+)/g)) {
      const link = m[1] ?? "";
      if (path.posix.basename(link) !== "CONTEXT.md") continue;
      const rel = path.posix.normalize(link);
      if (link.startsWith("/") || rel.startsWith("..")) problems.add(`${link} is not a relative path inside the repo`);
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
  const conflicts = [...problems].sort();
  const candidates = ["CLAUDE.md", "AGENTS.md", "repo.md"].filter((f) => exists(root, f));
  if (exists(root, "docs")) docFiles(root, "docs", candidates);
  const edits = candidates.filter((f) => !from.has(f) && (fs.readFileSync(path.join(root, f), "utf8").match(OLD_NAME) ?? []).length > 0).sort();
  return { moves, edits, conflicts };
}
function applyMigration(root) {
  const { moves, edits, conflicts } = planMigration(root);
  if (conflicts.length) throw new Error(conflicts.join("; "));
  for (const m of moves) (0, import_child_process.execFileSync)("git", ["mv", m.from, m.to], { cwd: root, stdio: "pipe" });
  const files = [...edits, ...exists(root, "GLOSSARY-MAP.md") ? ["GLOSSARY-MAP.md"] : []];
  for (const f of files) {
    const p = path.join(root, f);
    fs.writeFileSync(p, rename(fs.readFileSync(p, "utf8")));
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
    console.log(`moved ${plan.moves.length}, edited ${plan.edits.length}, committed nothing`);
  } else {
    for (const m of plan.moves) console.log(`git mv ${m.from} ${m.to}`);
    for (const e of plan.edits) console.log(`edit ${e}`);
    for (const c of plan.conflicts) console.log(`conflict ${c}`);
    console.log("dry run: nothing changed");
  }
}
if (require.main === module) {
  try {
    main();
  } catch (e) {
    const msg = String(e.stderr || e.message).trim().split("\n")[0];
    console.error(`glossary-migrate: refused, repo unchanged: ${msg}`);
    process.exit(1);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyMigration,
  planMigration
});
