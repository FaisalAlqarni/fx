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
const fenced = [...md.matchAll(/^```[^\n]*\n([\s\S]*?)^```$/gm)].map((m) => (m[1] ?? "").trim());
const PREFIX = "FX_SKILL_DIR='SKILL_DIR' node -e '";
const blocks = fenced.filter((b) => b.includes("plant-roles"));
assert.strictEqual(blocks.length, 1, `one command loads plant-roles, found ${blocks.length}`);
const command = blocks[0] ?? "";
assert.ok(command.startsWith(PREFIX), "the command takes the skill base directory in FX_SKILL_DIR");
assert.ok(!command.slice(PREFIX.length).includes("SKILL_DIR'"), "the base directory is substituted in one place only");
const s = fs.mkdtempSync(path.join(os.tmpdir(), "fx-setup-root-"));
process.on("exit", () => fs.rmSync(s, { recursive: true, force: true }));
const repo = path.join(s, "repo");
fs.mkdirSync(repo);
const shq = (v) => `'${v.replace(/'/g, `'\\''`)}'`;
const withBase = (cmd, base) => cmd.replace("'SKILL_DIR'", shq(base));
const marker = path.join(s, "fake-loaded");
function fakeRoot(dir, { manifest = true } = {}) {
  fs.mkdirSync(path.join(dir, "lib"), { recursive: true });
  fs.mkdirSync(path.join(dir, "skills", "fx-setup"), { recursive: true });
  fs.writeFileSync(path.join(dir, "skills", "fx-setup", "SKILL.md"), "# fx-setup\n");
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
const skillDir = (fx) => path.join(fx, "skills", "fx-setup");
function run(base) {
  const env = { ...process.env, HOME: s, TMPDIR: s, CODEX_HOME: path.join(s, "codex") };
  return (0, import_child_process.spawnSync)("bash", ["-c", withBase(command, base)], { cwd: repo, env, encoding: "utf8" });
}
function refused(base, label) {
  const r = run(base);
  assert.notStrictEqual(r.status, 0, `${label}: must be refused`);
  assert.match(r.stderr, /refusing/i, `${label}: says why (${r.stderr.trim()})`);
  assert.ok(!fs.existsSync(marker), `${label}: nothing was loaded from it`);
  assert.ok(!fs.existsSync(path.join(s, "codex", "agents")), `${label}: nothing was planted`);
}
refused(skillDir(fakeRoot(path.join(repo, "vendor", "fx"))), "a fake root inside cwd");
refused(path.join(repo, "skills", "fx-setup"), "cwd itself");
refused(skillDir(fakeRoot(path.join(s, "no-manifest"), { manifest: false })), "a root without an fx manifest");
fs.mkdirSync(path.join(s, "no-preamble", ".claude-plugin"), { recursive: true });
fs.mkdirSync(skillDir(path.join(s, "no-preamble")), { recursive: true });
fs.writeFileSync(path.join(s, "no-preamble", ".claude-plugin", "plugin.json"), '{"name":"fx"}');
refused(skillDir(path.join(s, "no-preamble")), "a root without PREAMBLE.md");
fs.symlinkSync(path.join(repo, "vendor", "fx"), path.join(s, "link-into-repo"));
refused(skillDir(path.join(s, "link-into-repo")), "a symlink outside cwd that resolves inside it");
const other = fakeRoot(path.join(s, "other"));
fs.mkdirSync(path.join(other, "skills", "not-setup"), { recursive: true });
refused(path.join(other, "skills", "not-setup"), "a base directory that is not skills/fx-setup");
refused(other, "the plugin root given in place of the skill directory");
const ok = run(skillDir(root));
assert.strictEqual(ok.status, 0, `the real plugin root passes: ${ok.stderr}`);
const out = JSON.parse(ok.stdout);
assert.strictEqual(out.written.length, 6, "all six roles planted on a fresh CODEX_HOME");
assert.strictEqual(out.audit.present.length, 6, "and audited present");
assert.ok("hooksTrusted" in out, "and hook trust reported");
const odd = path.join(s, 'we$HOME`id`"ird');
fs.symlinkSync(root, odd);
const oddRun = run(skillDir(odd));
assert.strictEqual(oddRun.status, 0, `a path with $, a backtick and " still runs: ${oddRun.stderr}`);
const mig = fenced.filter((b) => b.includes("glossary-migrate"));
assert.strictEqual(mig.length, 1, `one command runs glossary-migrate, found ${mig.length}`);
const migCmd = mig[0] ?? "";
assert.ok(migCmd.startsWith(PREFIX), "the migration command takes the skill base directory in FX_SKILL_DIR");
assert.ok(migCmd.endsWith(`' ""`), "the migration command ends with the mode argument");
function runMig(base, cwd) {
  return (0, import_child_process.spawnSync)("bash", ["-c", withBase(migCmd, base)], { cwd, env: { ...process.env, HOME: s, TMPDIR: s }, encoding: "utf8" });
}
const fakeMig = fakeRoot(path.join(repo, "vendor", "fx2"));
fs.writeFileSync(path.join(fakeMig, "lib", "glossary-migrate.js"), `require('fs').writeFileSync(${JSON.stringify(marker + "-mig")}, 'x');`);
const badMig = runMig(skillDir(fakeMig), repo);
assert.notStrictEqual(badMig.status, 0, "a root inside cwd is refused");
assert.match(badMig.stderr, /refusing/i);
assert.ok(!fs.existsSync(marker + "-mig"), "and no migration code was loaded from it");
(0, import_child_process.spawnSync)("git", ["init", "-q"], { cwd: repo });
const okMig = runMig(skillDir(odd), repo);
assert.strictEqual(okMig.status, 0, `the real plugin root runs the migration dry run: ${okMig.stderr}`);
assert.match(okMig.stdout, /dry run: nothing changed/);
console.log("fx-setup-root-check: passed");
