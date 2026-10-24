// generated from src/tests/gates/review-package.test.ts by scripts/build: edit there, not here
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
const script = path.join(__dirname, "..", "..", "skills", "fx-implement", "scripts", "review-package");
const repo = fs.mkdtempSync(path.join(os.tmpdir(), "review-package-"));
const git = (...args) => (0, import_child_process.execFileSync)("git", ["-c", "user.name=fx", "-c", "user.email=fx@example.invalid", ...args], { cwd: repo, encoding: "utf8" }).trim();
const commit = (file) => {
  fs.writeFileSync(path.join(repo, file), file);
  git("add", file);
  git("commit", "-m", file);
  return git("rev-parse", "HEAD");
};
const run = (base, head) => (0, import_child_process.spawnSync)("bash", [script, "s", base, head], { cwd: repo, encoding: "utf8" });
git("init", "-q", "-b", "main");
const a = commit("a");
git("checkout", "-q", "-b", "x");
const b = commit("b");
git("checkout", "-q", "-b", "y", a);
const c = commit("c");
const bad = run(b, c);
assert.strictEqual(bad.status, 3, "a non-ancestor BASE exits 3");
assert.strictEqual(bad.stderr.trim(), `BASE ${b} is not an ancestor of HEAD ${c}: refusing a range not rooted at BASE`);
assert.ok(!fs.existsSync(path.join(repo, ".fx", "s", "review")), "no review file is written");
const good = run(a, b);
assert.strictEqual(good.status, 0, `an ancestor range exits 0: ${good.stderr}`);
const m = /^wrote (.+): 1 commit\(s\), \d+ bytes$/.exec(good.stdout.trim());
assert.ok(m && m[1] !== void 0 && fs.existsSync(m[1]), "the package path is printed and exists");
const empty = run(b, b);
assert.strictEqual(empty.status, 3, "an empty range still exits 3");
assert.strictEqual(empty.stderr.trim(), `empty range ${b}..${b}: no commits to review`);
console.log("review-package.test: OK");
