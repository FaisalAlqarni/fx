// generated from src/lib/scratch-migrate.test.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var assert = __toESM(require("assert"));
var import_child_process = require("child_process");
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_scratch_migrate = require("./scratch-migrate.js");
const script = path.join(__dirname, "scratch-migrate.js");
const git = (d, ...a) => (0, import_child_process.execFileSync)("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: d, encoding: "utf8" });
const fixtureBase = fs.mkdtempSync(path.join(os.tmpdir(), "fx-scratch-"));
const fixtureScript = path.join(__dirname, "..", "scripts", "make-git-fixture");
let n = 0;
function repo(tracked, untracked = {}) {
  const out = (0, import_child_process.execFileSync)(fixtureScript, [path.join(fixtureBase, `r${n++}`)], { encoding: "utf8" }).trim();
  const d = out.split(" ")[0];
  const put = (files) => {
    for (const [f, b] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true });
      fs.writeFileSync(path.join(d, f), b);
    }
  };
  put(tracked);
  git(d, "add", "--", ...Object.keys(tracked), ...Object.keys(tracked).length ? [] : ["."]);
  git(d, "commit", "-q", "--allow-empty", "-m", "init");
  put(untracked);
  return d;
}
const run = (d, ...a) => (0, import_child_process.spawnSync)("node", [script, d, ...a], { encoding: "utf8" });
const read = (d, f) => fs.readFileSync(path.join(d, f), "utf8");
const count = (d) => git(d, "rev-list", "--count", "HEAD").trim();
const snapshot = (d) => (0, import_child_process.execFileSync)("find", [".", "-path", "./.git", "-prune", "-o", "-type", "f", "-print"], { cwd: d, encoding: "utf8" }).split("\n").sort().map((f) => f ? `${f}=${fs.readFileSync(path.join(d, f), "utf8")}` : "").join("\n");
{
  const d = repo({ ".scratch/feat/spec.md": "s", "docs/issues/feat/x.md": "x" });
  assert.deepStrictEqual((0, import_scratch_migrate.planScratchMigration)(d).conflicts, ["docs/issues/feat already exists"]);
  const before = snapshot(d);
  const r = run(d, "--apply");
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes("scratch-migrate: refused, repo unchanged:"), r.stderr);
  assert.strictEqual(snapshot(d), before);
}
{
  const d = repo({ ".scratch/feat/spec.md": "s" });
  fs.writeFileSync(path.join(d, ".scratch/feat/spec.md"), "changed");
  assert.ok((0, import_scratch_migrate.planScratchMigration)(d).conflicts.includes(".scratch has uncommitted changes to tracked files"));
}
{
  const d = repo({ ".scratch/feat/a.md": "a" }, { ".scratch/feat/b.md": "b" });
  assert.deepStrictEqual((0, import_scratch_migrate.planScratchMigration)(d).conflicts, [".scratch/feat mixes tracked and untracked files"]);
}
{
  const d = repo(
    { ".gitignore": "node_modules\n.scratch/\n", "CLAUDE.md": "a\nb\nIssues in .scratch/<feature>/ here\n" },
    { ".scratch/feat/01-x.md": "x" }
  );
  const plan = (0, import_scratch_migrate.planScratchMigration)(d);
  assert.deepStrictEqual(plan.moves, [{ from: ".scratch/feat", to: "docs/issues/feat", tracked: false }]);
  assert.deepStrictEqual(plan.gitignore, { file: ".gitignore", line: 2, text: ".scratch/" });
  assert.deepStrictEqual(plan.edits, [{ file: "CLAUDE.md", line: 3, before: "Issues in .scratch/<feature>/ here", after: "Issues in docs/issues/<feature>/ here" }]);
  const before = count(d);
  const dry = run(d);
  assert.strictEqual(dry.status, 0);
  assert.ok(dry.stdout.includes("move .scratch/feat -> docs/issues/feat (filesystem move)"), dry.stdout);
  assert.ok(dry.stdout.includes("remove .gitignore:2: .scratch/"), dry.stdout);
  assert.ok(dry.stdout.includes("rollback:"), dry.stdout);
  assert.ok(fs.existsSync(path.join(d, ".scratch/feat/01-x.md")));
  (0, import_scratch_migrate.applyScratchMigration)(d);
  assert.strictEqual(read(d, "docs/issues/feat/01-x.md"), "x");
  assert.ok(!fs.existsSync(path.join(d, ".scratch")));
  assert.ok(!read(d, ".gitignore").split("\n").includes(".scratch/"));
  assert.strictEqual(read(d, "CLAUDE.md").split("\n")[2], "Issues in docs/issues/<feature>/ here");
  assert.strictEqual(count(d), before);
  const again = run(d);
  assert.strictEqual(again.status, 0);
  assert.strictEqual(again.stdout.trim(), "scratch-migrate: nothing to move");
}
{
  const d = repo({ ".scratch/feat/spec.md": "s" });
  assert.strictEqual((0, import_scratch_migrate.planScratchMigration)(d).moves[0]?.tracked, true);
  (0, import_scratch_migrate.applyScratchMigration)(d);
  assert.ok(/^R\s+\.scratch\/feat\/spec\.md -> docs\/issues\/feat\/spec\.md$/m.test(git(d, "status", "--porcelain")));
}
if (process.getuid && process.getuid() === 0) {
  console.log("scratch-migrate.test.js: skipping the read-only failure cases when run as root");
} else {
  const d = repo({ ".gitignore": ".scratch/\n", "CLAUDE.md": "see .scratch/x\n" }, { ".scratch/feat/a.md": "a" });
  fs.chmodSync(path.join(d, "CLAUDE.md"), 292);
  const before = snapshot(d);
  const r = run(d, "--apply");
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.startsWith("scratch-migrate: failed at edit CLAUDE.md"), r.stderr);
  assert.ok(r.stderr.trim().endsWith("; undone"), r.stderr);
  assert.strictEqual(snapshot(d), before);
  assert.ok(!fs.existsSync(path.join(d, "docs")), "no leftover docs/");
  const e = repo({ ".gitignore": ".scratch/\n" }, { ".scratch/feat/a.md": "a" });
  fs.chmodSync(path.join(e, ".gitignore"), 292);
  const r2 = run(e, "--apply");
  assert.ok(r2.stderr.startsWith("scratch-migrate: failed at remove .gitignore:1") && r2.stderr.trim().endsWith("; undone"), r2.stderr);
  assert.ok(fs.existsSync(path.join(e, ".scratch/feat/a.md")));
  assert.ok(!fs.existsSync(path.join(e, "docs")), "no leftover docs/");
}
{
  const d = repo({ "x.md": "x" });
  fs.mkdirSync(path.join(d, ".scratch"));
  fs.symlinkSync("../x.md", path.join(d, ".scratch/link"));
  assert.deepStrictEqual((0, import_scratch_migrate.planScratchMigration)(d).conflicts, [".scratch/link is a symlink"]);
}
{
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "fx-scratch-out-"));
  fs.writeFileSync(path.join(outside, "gi"), "keep\n");
  const d = repo({ ".scratch/feat/a.md": "a" });
  fs.symlinkSync(outside, path.join(d, "docs"));
  fs.symlinkSync(path.join(outside, "gi"), path.join(d, ".gitignore"));
  assert.deepStrictEqual((0, import_scratch_migrate.planScratchMigration)(d).conflicts, [".gitignore is a symlink", "docs is a symlink"]);
  const r = run(d, "--apply");
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes("scratch-migrate: refused, repo unchanged:"), r.stderr);
  assert.deepStrictEqual(fs.readdirSync(outside).sort(), ["gi"]);
  assert.strictEqual(fs.readFileSync(path.join(outside, "gi"), "utf8"), "keep\n");
  assert.ok(fs.existsSync(path.join(d, ".scratch/feat/a.md")));
  const e = repo({ "x/a.md": "a" });
  fs.symlinkSync(path.join(e, "x"), path.join(e, ".scratch"));
  assert.deepStrictEqual((0, import_scratch_migrate.planScratchMigration)(e).conflicts, [".scratch is a symlink"]);
  const f = repo({ ".scratch/feat/a.md": "a" });
  fs.mkdirSync(path.join(f, "docs"));
  fs.symlinkSync(outside, path.join(f, "docs/issues"));
  assert.deepStrictEqual((0, import_scratch_migrate.planScratchMigration)(f).conflicts, ["docs/issues is a symlink"]);
}
{
  const d = repo({ ".gitignore": ".scratch/\n" }, { ".scratch/feat/a.md": "a" });
  const dry = run(d);
  assert.ok(/kept out of git on purpose.*private notes or secrets.*before `git add -- docs\/issues`/.test(dry.stdout), dry.stdout);
  const t = repo({ ".scratch/feat/a.md": "a" });
  assert.ok(!run(t).stdout.includes("kept out of git"), "no warning when every entry is tracked");
}
{
  const d = repo({}, { ".scratch/feat/01-a.md": "title\nsee .scratch/feat/02-b.md\n", ".scratch/feat/02-b.md": "b" });
  const plan = (0, import_scratch_migrate.planScratchMigration)(d);
  assert.deepStrictEqual(plan.edits, [{ file: "docs/issues/feat/01-a.md", line: 2, before: "see .scratch/feat/02-b.md", after: "see docs/issues/feat/02-b.md" }]);
  (0, import_scratch_migrate.applyScratchMigration)(d);
  assert.strictEqual(read(d, "docs/issues/feat/01-a.md"), "title\nsee docs/issues/feat/02-b.md\n");
}
{
  const d = repo(
    { ".claude/CLAUDE.md": "see .scratch/x\n", "engines/core/CONTEXT.md": "issues: .scratch/\n", "docs/adr/0001-x.md": "was .scratch/\n", "lib/a.rb": "no mention\n" },
    { ".scratch/feat/a.md": "a", ".fx.json": '{"issues": ".scratch/"}\n' }
  );
  const plan = (0, import_scratch_migrate.planScratchMigration)(d);
  assert.deepStrictEqual(plan.byHand, [".claude/CLAUDE.md", ".fx.json", "engines/core/CONTEXT.md"]);
  const dry = run(d);
  assert.ok(dry.stdout.includes("update by hand: .claude/CLAUDE.md\n"), dry.stdout);
  (0, import_scratch_migrate.applyScratchMigration)(d);
  assert.strictEqual(read(d, ".claude/CLAUDE.md"), "see .scratch/x\n");
}
{
  const d = repo({ ".gitignore": ".scratch/\n" }, { ".scratch/feat/a.md": "a", ".scratch/draft.txt": "d", ".scratch/mixed/a.md": "a", ".scratch/mixed/b.png": "b" });
  const plan = (0, import_scratch_migrate.planScratchMigration)(d);
  assert.deepStrictEqual(plan.moves.map((m) => m.from), [".scratch/feat"]);
  assert.deepStrictEqual(plan.left, [".scratch/draft.txt", ".scratch/mixed"]);
  assert.strictEqual(plan.gitignore, null);
  assert.ok(run(d).stdout.includes("leave .scratch/draft.txt: not only Markdown\n"));
  (0, import_scratch_migrate.applyScratchMigration)(d);
  assert.strictEqual(read(d, ".scratch/draft.txt"), "d");
  assert.strictEqual(read(d, ".scratch/mixed/b.png"), "b");
  assert.strictEqual(read(d, ".gitignore"), ".scratch/\n");
}
{
  const d = repo({ ".gitignore": "node_modules\r\n.scratch/\r\nlog\r\n" }, { ".scratch/feat/a.md": "a" });
  assert.deepStrictEqual((0, import_scratch_migrate.planScratchMigration)(d).gitignore, { file: ".gitignore", line: 2, text: ".scratch/" });
  (0, import_scratch_migrate.applyScratchMigration)(d);
  assert.strictEqual(read(d, ".gitignore"), "node_modules\r\nlog\r\n");
  const e = repo({ ".gitignore": "/.scratch/*\n" }, { ".scratch/feat/a.md": "a" });
  assert.deepStrictEqual((0, import_scratch_migrate.planScratchMigration)(e).gitignore, { file: ".gitignore", line: 1, text: "/.scratch/*" });
}
if ((0, import_child_process.spawnSync)("prlimit", ["--version"]).status !== 0) {
  console.log("scratch-migrate.test.js: skipping the partial-write case, prlimit is missing");
} else {
  const body = "see .scratch/x\n" + "a long line that will not fit under the size limit\n".repeat(2e3);
  const d = repo({ ".gitignore": ".scratch/\n", "CLAUDE.md": body }, { ".scratch/feat/a.md": "a" });
  const before = snapshot(d);
  const r = (0, import_child_process.spawnSync)("prlimit", ["--fsize=8192", "node", script, d, "--apply"], { encoding: "utf8" });
  assert.strictEqual(r.status, 1, r.stderr);
  assert.ok(r.stderr.startsWith("scratch-migrate: failed at edit CLAUDE.md") && r.stderr.trim().endsWith("; undone"), r.stderr);
  assert.strictEqual(read(d, "CLAUDE.md"), body);
  assert.strictEqual(snapshot(d), before);
}
console.log("scratch-migrate.test.js: ok");
