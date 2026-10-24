// generated from src/lib/glossary-migrate.test.ts by scripts/build: edit there, not here
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
var import_glossary_migrate = require("./glossary-migrate.js");
const script = path.join(__dirname, "glossary-migrate.js");
const git = (d, ...a) => (0, import_child_process.execFileSync)("git", ["-c", "user.name=fx", "-c", "user.email=fx@example.invalid", ...a], { cwd: d, encoding: "utf8" });
function repo(extra = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "fx-migrate-"));
  const files = {
    "CONTEXT-MAP.md": "# Map\n[a](engines/a/CONTEXT.md)\n",
    "CONTEXT.md": "root",
    "engines/a/CONTEXT.md": "a",
    "CLAUDE.md": "See CONTEXT-MAP.md.\n",
    "docs/plans/x.md": "CONTEXT.md\n",
    ...extra
  };
  git(d, "init", "-q");
  for (const [n, b] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, n)), { recursive: true });
    fs.writeFileSync(path.join(d, n), b);
  }
  git(d, "add", ".");
  git(d, "commit", "-q", "-m", "init");
  return d;
}
const run = (d, ...a) => (0, import_child_process.spawnSync)("node", [script, d, ...a], { encoding: "utf8" });
const read = (d, n) => fs.readFileSync(path.join(d, n), "utf8");
const count = (d) => git(d, "rev-list", "--count", "HEAD").trim();
{
  const d = repo();
  assert.deepStrictEqual((0, import_glossary_migrate.planMigration)(d), {
    moves: [
      { from: "CONTEXT-MAP.md", to: "GLOSSARY-MAP.md" },
      { from: "CONTEXT.md", to: "GLOSSARY.md" },
      { from: "engines/a/CONTEXT.md", to: "engines/a/GLOSSARY.md" }
    ],
    edits: ["CLAUDE.md"],
    conflicts: []
  });
}
{
  const d = repo();
  const r = run(d);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, [
    "git mv CONTEXT-MAP.md GLOSSARY-MAP.md",
    "git mv CONTEXT.md GLOSSARY.md",
    "git mv engines/a/CONTEXT.md engines/a/GLOSSARY.md",
    "edit CLAUDE.md",
    "dry run: nothing changed",
    ""
  ].join("\n"));
  assert.strictEqual(git(d, "status", "--porcelain"), "");
}
{
  const d = repo();
  const before = count(d);
  const r = run(d, "--apply");
  assert.strictEqual(r.status, 0);
  assert.ok(read(d, "GLOSSARY-MAP.md").includes("[a](engines/a/GLOSSARY.md)"));
  assert.ok(fs.existsSync(path.join(d, "engines/a/GLOSSARY.md")));
  assert.ok(!fs.existsSync(path.join(d, "engines/a/CONTEXT.md")));
  assert.ok(read(d, "CLAUDE.md").includes("See GLOSSARY-MAP.md."));
  assert.ok(read(d, "docs/plans/x.md").includes("CONTEXT.md"));
  assert.ok(r.stdout.trimEnd().endsWith("moved 3, edited 1, committed nothing"));
  assert.strictEqual(count(d), before);
  const again = run(d, "--apply");
  assert.strictEqual(again.status, 0);
  assert.ok(again.stdout.trimEnd().endsWith("moved 0, edited 0, committed nothing"));
}
{
  const d = repo({ "engines/a/GLOSSARY.md": "mine" });
  assert.deepStrictEqual((0, import_glossary_migrate.planMigration)(d).conflicts, ["engines/a/GLOSSARY.md"]);
  const r = run(d, "--apply");
  assert.strictEqual(r.status, 1);
  assert.ok(fs.existsSync(path.join(d, "CONTEXT.md")));
  assert.strictEqual(read(d, "engines/a/GLOSSARY.md"), "mine");
  assert.strictEqual(git(d, "status", "--porcelain"), "");
}
{
  const d = repo();
  fs.mkdirSync(path.join(d, "engines/b"));
  fs.writeFileSync(path.join(d, "engines/b/CONTEXT.md"), "b");
  fs.appendFileSync(path.join(d, "CONTEXT-MAP.md"), "[b](engines/b/CONTEXT.md)\n");
  git(d, "add", "CONTEXT-MAP.md");
  git(d, "commit", "-q", "-m", "link b");
  const r = run(d, "--apply");
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr.trim().split("\n").length, 1, r.stderr);
  assert.ok(!/\n\s+at /.test(r.stderr));
  assert.deepStrictEqual((0, import_glossary_migrate.planMigration)(d).conflicts, ["engines/b/CONTEXT.md is not tracked by git"]);
  assert.ok(fs.existsSync(path.join(d, "CONTEXT-MAP.md")));
  assert.strictEqual(git(d, "status", "--porcelain"), "?? engines/b/\n");
}
{
  const d = repo({ "CONTEXT-MAP.md": "[x](../x/CONTEXT.md) [y](/engines/a/CONTEXT.md)\n" });
  const r = run(d, "--apply");
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr.trim().split("\n").length, 1, r.stderr);
  assert.strictEqual(git(d, "status", "--porcelain"), "");
}
{
  const d = repo({ "CONTEXT-MAP.md": "[z](engines/z/CONTEXT.md)\n" });
  assert.deepStrictEqual((0, import_glossary_migrate.planMigration)(d).conflicts, ["engines/z/CONTEXT.md is missing"]);
  assert.strictEqual(run(d, "--apply").status, 1);
  assert.strictEqual(git(d, "status", "--porcelain"), "");
}
{
  const d = repo();
  git(d, "mv", "CONTEXT-MAP.md", "GLOSSARY-MAP.md");
  git(d, "mv", "CONTEXT.md", "GLOSSARY.md");
  assert.deepStrictEqual((0, import_glossary_migrate.planMigration)(d).moves, [{ from: "engines/a/CONTEXT.md", to: "engines/a/GLOSSARY.md" }]);
  const r = run(d, "--apply");
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(read(d, "GLOSSARY-MAP.md").includes("[a](engines/a/GLOSSARY.md)"));
  assert.ok(fs.existsSync(path.join(d, "engines/a/GLOSSARY.md")));
  assert.ok(run(d, "--apply").stdout.trimEnd().endsWith("moved 0, edited 0, committed nothing"));
}
console.log("glossary-migrate.test.js: ok");
