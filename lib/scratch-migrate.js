// generated from src/lib/scratch-migrate.ts by scripts/build: edit there, not here
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
var scratch_migrate_exports = {};
__export(scratch_migrate_exports, {
  ApplyFailed: () => ApplyFailed,
  UndoIncomplete: () => UndoIncomplete,
  applyScratchMigration: () => applyScratchMigration,
  planScratchMigration: () => planScratchMigration
});
module.exports = __toCommonJS(scratch_migrate_exports);
var import_child_process = require("child_process");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const OLD = /(?<![\w.\/-])\.scratch\//g;
const IGNORE_LINES = /* @__PURE__ */ new Set([".scratch", ".scratch/", "/.scratch", "/.scratch/"]);
const git = (root, ...args) => (0, import_child_process.execFileSync)("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
const abs = (root, rel) => path.join(root, rel);
const q = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
function filesUnder(root, rel) {
  const st = fs.lstatSync(abs(root, rel));
  if (!st.isDirectory()) return [rel];
  return fs.readdirSync(abs(root, rel)).sort().flatMap((n) => filesUnder(root, `${rel}/${n}`));
}
const isLink = (root, rel) => fs.lstatSync(abs(root, rel), { throwIfNoEntry: false })?.isSymbolicLink() ?? false;
function planScratchMigration(root) {
  const plan = { moves: [], edits: [], gitignore: null, conflicts: [], rollback: [] };
  if (isLink(root, ".scratch")) {
    plan.conflicts.push(".scratch is a symlink");
    return plan;
  }
  if (!fs.existsSync(abs(root, ".scratch"))) return plan;
  const names = fs.readdirSync(abs(root, ".scratch")).sort();
  if (!names.length) return plan;
  const tracked = new Set(git(root, "ls-files", "-z").split("\0").filter(Boolean));
  const problems = [];
  for (const p of ["docs", "docs/issues", ".gitignore"]) if (isLink(root, p)) problems.push(`${p} is a symlink`);
  if (git(root, "status", "--porcelain", "--untracked-files=no", "--", ".scratch").trim()) {
    problems.push(".scratch has uncommitted changes to tracked files");
  }
  for (const name of names) {
    const from = `.scratch/${name}`;
    const to = `docs/issues/${name}`;
    if (fs.lstatSync(abs(root, from)).isSymbolicLink()) {
      problems.push(`${from} is a symlink`);
      continue;
    }
    if (fs.existsSync(abs(root, to))) problems.push(`${to} already exists`);
    const files = filesUnder(root, from);
    const n = files.filter((f) => tracked.has(f)).length;
    if (n && n < files.length) problems.push(`${from} mixes tracked and untracked files`);
    plan.moves.push({ from, to, tracked: n > 0 });
  }
  const candidates = new Set(["CLAUDE.md", "AGENTS.md", "repo.md"].filter((f) => tracked.has(f)));
  for (const f of tracked) {
    if (f.startsWith("docs/") && f.endsWith(".md") && !/^docs\/(plans|adr|issues)\//.test(f)) candidates.add(f);
  }
  for (const f of [...candidates].sort()) {
    const p = abs(root, f);
    if (isLink(root, f)) {
      problems.push(`${f} is a symlink`);
      continue;
    }
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, "utf8").split("\n").forEach((before, i) => {
      if (before.match(OLD)) plan.edits.push({ file: f, line: i + 1, before, after: before.replace(OLD, "docs/issues/") });
    });
  }
  const gi = abs(root, ".gitignore");
  if (fs.existsSync(gi)) {
    const i = fs.readFileSync(gi, "utf8").split("\n").findIndex((l) => IGNORE_LINES.has(l));
    if (i >= 0) plan.gitignore = { file: ".gitignore", line: i + 1, text: fs.readFileSync(gi, "utf8").split("\n")[i] };
  }
  plan.conflicts = problems.sort();
  plan.rollback = steps(root, plan).reverse().flatMap((s) => s.rollback);
  return plan;
}
function steps(root, plan) {
  const out = [];
  for (const m of plan.moves) {
    let made = "";
    const dropMade = () => {
      if (!made) return;
      fs.rmdirSync(abs(root, "docs/issues"));
      if (made !== abs(root, "docs/issues")) fs.rmdirSync(made);
      made = "";
    };
    out.push({
      name: `move ${m.from}`,
      run: () => {
        made = fs.mkdirSync(abs(root, "docs/issues"), { recursive: true }) ?? "";
        try {
          if (m.tracked) git(root, "mv", "--", m.from, m.to);
          else fs.renameSync(abs(root, m.from), abs(root, m.to));
        } catch (e) {
          dropMade();
          throw e;
        }
      },
      undo: () => {
        fs.mkdirSync(abs(root, ".scratch"), { recursive: true });
        if (m.tracked) git(root, "mv", "--", m.to, m.from);
        else fs.renameSync(abs(root, m.to), abs(root, m.from));
        dropMade();
      },
      rollback: ["mkdir -p .scratch", m.tracked ? `git mv -- ${q(m.to)} ${q(m.from)}` : `mv -- ${q(m.to)} ${q(m.from)}`]
    });
  }
  const byFile = /* @__PURE__ */ new Map();
  for (const e of plan.edits) byFile.set(e.file, [...byFile.get(e.file) ?? [], e]);
  for (const [file, list] of byFile) {
    let original = "";
    out.push({
      name: `edit ${file}`,
      run: () => {
        original = fs.readFileSync(abs(root, file), "utf8");
        const lines = original.split("\n");
        for (const e of list) lines[e.line - 1] = e.after;
        fs.writeFileSync(abs(root, file), lines.join("\n"));
      },
      undo: () => fs.writeFileSync(abs(root, file), original),
      rollback: list.map((e) => `sed -i ${q(`${e.line}s#docs/issues/#.scratch/#g`)} ${q(file)}`)
    });
  }
  if (plan.gitignore) {
    const g = plan.gitignore;
    let original = "";
    out.push({
      name: `remove ${g.file}:${g.line}`,
      run: () => {
        original = fs.readFileSync(abs(root, g.file), "utf8");
        const lines = original.split("\n");
        lines.splice(g.line - 1, 1);
        fs.writeFileSync(abs(root, g.file), lines.join("\n"));
      },
      undo: () => fs.writeFileSync(abs(root, g.file), original),
      rollback: [`sed -i ${q(`${g.line}i ${g.text}`)} ${q(g.file)}`]
    });
  }
  return out;
}
class ApplyFailed extends Error {
}
class UndoIncomplete extends Error {
  constructor(remaining) {
    super("undo incomplete");
    this.remaining = remaining;
  }
  remaining;
}
function applyScratchMigration(root) {
  const plan = planScratchMigration(root);
  if (plan.conflicts.length) throw new Error(plan.conflicts.join("\n"));
  const all = steps(root, plan);
  const done = [];
  for (const s of all) {
    try {
      s.run();
      done.push(s);
    } catch (e) {
      const left = [];
      for (const d of [...done].reverse()) {
        try {
          d.undo();
        } catch {
          left.push(...d.rollback);
        }
      }
      if (left.length) throw new UndoIncomplete(left);
      throw new ApplyFailed(`failed at ${s.name}: ${e.message.split("\n")[0]}; undone`);
    }
  }
  try {
    fs.rmdirSync(abs(root, ".scratch"));
  } catch {
  }
}
function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const root = args.find((a) => a !== "--apply");
  if (!root) {
    console.error("usage: scratch-migrate <root> [--apply]");
    process.exit(2);
  }
  const plan = planScratchMigration(root);
  if (plan.conflicts.length) {
    console.error(["scratch-migrate: refused, repo unchanged:", ...plan.conflicts].join("\n"));
    process.exit(1);
  }
  if (!plan.moves.length) {
    console.log("scratch-migrate: nothing to move");
    return;
  }
  if (apply) {
    applyScratchMigration(root);
    console.log(`moved ${plan.moves.length}, edited ${plan.edits.length}, committed nothing`);
    return;
  }
  for (const m of plan.moves) console.log(`move ${m.from} -> ${m.to} (${m.tracked ? "git mv" : "filesystem move"})`);
  for (const e of plan.edits) console.log(`edit ${e.file}:${e.line}: ${e.before} -> ${e.after}`);
  if (plan.gitignore) console.log(`remove ${plan.gitignore.file}:${plan.gitignore.line}: ${plan.gitignore.text}`);
  console.log("rollback:");
  for (const r of plan.rollback) console.log(r);
}
if (require.main === module) {
  try {
    main();
  } catch (e) {
    if (e instanceof UndoIncomplete) {
      console.error(["scratch-migrate: undo incomplete; run:", ...e.remaining].join("\n"));
    } else if (e instanceof ApplyFailed) {
      console.error(`scratch-migrate: ${e.message}`);
    } else {
      console.error(["scratch-migrate: refused, repo unchanged:", ...String(e.message).trim().split("\n")].join("\n"));
    }
    process.exit(1);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApplyFailed,
  UndoIncomplete,
  applyScratchMigration,
  planScratchMigration
});
