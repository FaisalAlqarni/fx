// generated from src/tests/gates/fx-setup-root-check.test.ts by scripts/build: edit there, not here
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
const root = path.join(__dirname, "..", "..");
const md = fs.readFileSync(path.join(root, "commands", "fx-setup.md"), "utf8");
const blocks = [...md.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)].map((m) => (m[1] ?? "").trim()).filter((b) => b.includes("plant-roles"));
assert.strictEqual(blocks.length, 1, `one command loads plant-roles, found ${blocks.length}`);
const command = blocks[0] ?? "";
assert.ok(command.endsWith('"FX"'), "the command takes FX as its last argument");
const s = fs.mkdtempSync(path.join(os.tmpdir(), "fx-setup-root-"));
process.on("exit", () => fs.rmSync(s, { recursive: true, force: true }));
const repo = path.join(s, "repo");
fs.mkdirSync(repo);
const marker = path.join(s, "fake-loaded");
function fakeRoot(dir, { manifest = true } = {}) {
  fs.mkdirSync(path.join(dir, "lib"), { recursive: true });
  if (manifest) {
    fs.mkdirSync(path.join(dir, ".codex-plugin"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".codex-plugin", "plugin.json"), '{"name":"fx"}');
  }
  fs.writeFileSync(path.join(dir, "PREAMBLE.md"), "# fx\n");
  fs.writeFileSync(
    path.join(dir, "lib", "plant-roles.js"),
    `require('fs').writeFileSync(${JSON.stringify(marker)}, 'x'); module.exports = {};`
  );
  return dir;
}
function run(fx) {
  const cmd = command.slice(0, -'"FX"'.length) + JSON.stringify(fx);
  const env = { ...process.env, HOME: s, TMPDIR: s, CODEX_HOME: path.join(s, "codex") };
  return (0, import_child_process.spawnSync)("bash", ["-c", cmd], { cwd: repo, env, encoding: "utf8" });
}
function refused(fx, label) {
  const r = run(fx);
  assert.notStrictEqual(r.status, 0, `${label}: must be refused`);
  assert.match(r.stderr, /refusing/i, `${label}: says why (${r.stderr.trim()})`);
  assert.ok(!fs.existsSync(marker), `${label}: nothing was loaded from it`);
  assert.ok(!fs.existsSync(path.join(s, "codex", "agents")), `${label}: nothing was planted`);
}
refused(fakeRoot(path.join(repo, "vendor", "fx")), "a fake root inside cwd");
refused(repo, "cwd itself");
refused(fakeRoot(path.join(s, "no-manifest"), { manifest: false }), "a root without an fx manifest");
fs.mkdirSync(path.join(s, "no-preamble", ".claude-plugin"), { recursive: true });
fs.writeFileSync(path.join(s, "no-preamble", ".claude-plugin", "plugin.json"), '{"name":"fx"}');
refused(path.join(s, "no-preamble"), "a root without PREAMBLE.md");
fs.symlinkSync(path.join(repo, "vendor", "fx"), path.join(s, "link-into-repo"));
refused(path.join(s, "link-into-repo"), "a symlink outside cwd that resolves inside it");
const ok = run(root);
assert.strictEqual(ok.status, 0, `the real plugin root passes: ${ok.stderr}`);
const out = JSON.parse(ok.stdout);
assert.strictEqual(out.written.length, 6, "all six roles planted on a fresh CODEX_HOME");
assert.strictEqual(out.audit.present.length, 6, "and audited present");
assert.ok("hooksTrusted" in out, "and hook trust reported");
const mig = [...md.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)].map((m) => (m[1] ?? "").trim()).filter((b) => b.includes("glossary-migrate"));
assert.strictEqual(mig.length, 1, `one command runs glossary-migrate, found ${mig.length}`);
const migCmd = mig[0] ?? "";
assert.ok(migCmd.endsWith('"FX" ""'), "the migration command ends with the FX and mode arguments");
function runMig(fx, cwd) {
  const c = migCmd.slice(0, -'"FX" ""'.length) + JSON.stringify(fx) + ' ""';
  return (0, import_child_process.spawnSync)("bash", ["-c", c], { cwd, env: { ...process.env, HOME: s, TMPDIR: s }, encoding: "utf8" });
}
const fakeMig = fakeRoot(path.join(repo, "vendor", "fx2"));
fs.mkdirSync(path.join(fakeMig, "lib"), { recursive: true });
fs.writeFileSync(path.join(fakeMig, "lib", "glossary-migrate.js"), `require('fs').writeFileSync(${JSON.stringify(marker + "-mig")}, 'x');`);
const badMig = runMig(fakeMig, repo);
assert.notStrictEqual(badMig.status, 0, "a root inside cwd is refused");
assert.match(badMig.stderr, /refusing/i);
assert.ok(!fs.existsSync(marker + "-mig"), "and no migration code was loaded from it");
(0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: repo });
const okMig = runMig(root, repo);
assert.strictEqual(okMig.status, 0, `the real plugin root runs the migration dry run: ${okMig.stderr}`);
assert.match(okMig.stdout, /dry run: nothing changed/);
console.log("fx-setup-root-check: passed");
