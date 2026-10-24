// generated from src/tests/gates/release-version.test.ts by scripts/build: edit there, not here
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
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
const BASES = ["main", "master", "origin/main", "origin/master"];
const NOT_SHIPPED = ["docs", "tests", "tasks", ".github", "README.md", "INSTALL.md", "SURFACE.md"];
const MANIFEST = ".claude-plugin/plugin.json";
const git = (cwd, ...args) => (0, import_child_process.execFileSync)("git", args, { cwd, encoding: "utf8" }).trim();
const ok = (cwd, ...args) => (0, import_child_process.spawnSync)("git", args, { cwd }).status === 0;
const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(/[.-]/).slice(0, 3).map(Number));
  if (x === void 0 || y === void 0) return false;
  for (let i = 0; i < 3; i++) {
    const p = x[i], q = y[i];
    if (p !== q) return p !== void 0 && q !== void 0 && p > q;
  }
  return false;
};
function releaseCheck(repo) {
  const base = BASES.find((b) => ok(repo, "rev-parse", "--verify", "--quiet", `${b}^{commit}`));
  if (!base) return { skipped: "no base branch to compare" };
  const mb = git(repo, "merge-base", base, "HEAD");
  const changed = !ok(repo, "diff", "--quiet", mb, "--", ".", ...NOT_SHIPPED.map((p) => `:!${p}`));
  if (!changed) return { errors: [] };
  if (!ok(repo, "cat-file", "-e", `${mb}:${MANIFEST}`)) return { skipped: `no ${MANIFEST} at the merge-base ${mb.slice(0, 7)}` };
  const was = JSON.parse(git(repo, "show", `${mb}:${MANIFEST}`)).version;
  const now = JSON.parse(fs.readFileSync(path.join(repo, MANIFEST), "utf8")).version;
  return { errors: newer(now, was) ? [] : [
    `shipped files differ from ${base} (merge-base ${mb.slice(0, 7)}) but ${MANIFEST} is ${now}, not greater than ${was}: bump the version or the update never lands`
  ] };
}
function fixture(dir, { version, file }) {
  const g = (...a) => git(dir, "-c", "user.name=fx", "-c", "user.email=fx@example.invalid", ...a);
  fs.mkdirSync(path.join(dir, ".claude-plugin"), { recursive: true });
  fs.mkdirSync(path.join(dir, "skills"));
  fs.mkdirSync(path.join(dir, "docs"));
  const write = (rel, text) => fs.writeFileSync(path.join(dir, rel), text);
  write(MANIFEST, JSON.stringify({ version: "0.1.0" }));
  write("skills/a.md", "one\n");
  write("docs/a.md", "one\n");
  g("init", "-q", "-b", "main");
  g("add", ".");
  g("commit", "-q", "-m", "base");
  g("checkout", "-q", "-b", "feat");
  write(file, "two\n");
  write(MANIFEST, JSON.stringify({ version }));
  g("commit", "-q", "-am", "change");
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fx-release-version-"));
try {
  const at = (name, opts) => {
    const d = path.join(tmp, name);
    fs.mkdirSync(d);
    fixture(d, opts);
    return releaseCheck(d);
  };
  const same = at("same", { version: "0.1.0", file: "skills/a.md" });
  assert.strictEqual(same.errors?.length, 1, `a shipped change at the base version fails: ${JSON.stringify(same)}`);
  assert.deepStrictEqual(at("lower", { version: "0.0.9", file: "skills/a.md" }).errors?.length, 1, "a lower version fails");
  assert.deepStrictEqual(at("bumped", { version: "0.1.1", file: "skills/a.md" }), { errors: [] }, "a bumped version passes");
  assert.deepStrictEqual(at("docs", { version: "0.1.0", file: "docs/a.md" }), { errors: [] }, "a docs-only change needs no bump");
  assert.ok(newer("0.10.0", "0.9.0"), "versions compare numerically");
  const bare = path.join(tmp, "bare");
  fs.mkdirSync(bare);
  git(bare, "init", "-q", "-b", "feat");
  assert.ok(releaseCheck(bare).skipped, "no base branch skips");
  const fresh = path.join(tmp, "fresh");
  fs.mkdirSync(fresh);
  const g = (...a) => git(fresh, "-c", "user.name=fx", "-c", "user.email=fx@example.invalid", ...a);
  fs.writeFileSync(path.join(fresh, "a.md"), "one\n");
  g("init", "-q", "-b", "main");
  g("add", ".");
  g("commit", "-q", "-m", "base");
  g("checkout", "-q", "-b", "feat");
  fs.mkdirSync(path.join(fresh, ".claude-plugin"));
  fs.writeFileSync(path.join(fresh, MANIFEST), JSON.stringify({ version: "0.1.0" }));
  g("add", ".");
  g("commit", "-q", "-m", "add manifest");
  assert.match(String(releaseCheck(fresh).skipped), /no .*plugin\.json/, "a merge-base without a manifest skips, and says why");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
const root = process.argv[2] || path.join(__dirname, "..", "..");
const here = releaseCheck(root);
if (here.skipped) console.log(`release-version.test.js: skipped on this tree (${here.skipped})`);
else assert.deepStrictEqual(here.errors, [], (here.errors ?? []).join("\n"));
console.log("release-version.test.js: OK");
