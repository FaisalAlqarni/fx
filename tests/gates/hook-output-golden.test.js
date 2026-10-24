// generated from src/tests/gates/hook-output-golden.test.ts by scripts/build: edit there, not here
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
var import_json = require("../../lib/json.js");
const ROOT = path.join(__dirname, "..", "..");
const CASES = path.join(__dirname, "fixtures", "hook-golden");
const RECORD = process.argv.includes("--record");
function readMeta(file) {
  const m = (0, import_json.parseJson)(fs.readFileSync(file, "utf8"));
  if (typeof m !== "object" || m === null || !("hook" in m) || typeof m.hook !== "string" || !("cwd" in m) || m.cwd !== "main" && m.cwd !== "worktree") {
    throw new Error(`${file}: needs a string "hook" and a "cwd" of "main" or "worktree"`);
  }
  const meta = { hook: m.hook, cwd: m.cwd };
  if ("broken" in m && typeof m.broken === "string") meta.broken = m.broken;
  if ("stub" in m && typeof m.stub === "string") meta.stub = m.stub;
  if ("exit" in m && (typeof m.exit === "number" || m.exit === null)) meta.exit = m.exit;
  if ("stderr" in m && typeof m.stderr === "string") meta.stderr = m.stderr;
  return meta;
}
function normalise(text, scratch) {
  const pairs = [
    [fs.realpathSync(scratch), "<scratch>"],
    [scratch, "<scratch>"],
    [fs.realpathSync(ROOT), "<root>"],
    [ROOT, "<root>"]
  ];
  return pairs.reduce((out, [from, to]) => out.split(from).join(to), text);
}
function run(name, meta) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fx-hook-golden-"));
  try {
    const home = path.join(scratch, "home");
    fs.mkdirSync(home);
    const env = {
      PATH: process.env.PATH ?? "",
      HOME: home,
      CODEX_HOME: home,
      TMPDIR: home,
      XDG_CONFIG_HOME: path.join(scratch, "config"),
      XDG_STATE_HOME: path.join(scratch, "state"),
      APPDATA: path.join(scratch, "appdata"),
      LOCALAPPDATA: path.join(scratch, "localappdata")
    };
    const fix = (0, import_child_process.spawnSync)(path.join(ROOT, "scripts", "make-git-fixture"), [path.join(scratch, "repo")], { env, encoding: "utf8" });
    const [main, worktree] = fix.stdout.trim().split(" ");
    if (fix.status !== 0 || !main || !worktree) throw new Error(`${name}: make-git-fixture failed: ${fix.stderr}`);
    const cwd = meta.cwd === "worktree" ? worktree : main;
    let base = ROOT;
    if (meta.broken) {
      base = path.join(scratch, "copy");
      for (const dir of ["hooks", "lib", path.join("codex", "agents")]) {
        fs.cpSync(path.join(ROOT, dir), path.join(base, dir), { recursive: true });
      }
      fs.writeFileSync(path.join(base, meta.broken), meta.stub ?? "throw new Error('load')\n");
    }
    const input = fs.readFileSync(path.join(CASES, `${name}.input.json`), "utf8").split("{{CWD}}").join(JSON.stringify(cwd).slice(1, -1));
    const r = (0, import_child_process.spawnSync)(process.execPath, [path.join(base, "hooks", meta.hook)], { input, cwd, env, encoding: "utf8", timeout: 1e4 });
    return { stdout: normalise(r.stdout, scratch), stderr: normalise(r.stderr, scratch), exit: r.status };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
const names = fs.readdirSync(CASES).filter((f) => f.endsWith(".meta.json")).map((f) => f.slice(0, -".meta.json".length)).sort();
assert.ok(names.length > 0, `no cases under ${CASES}`);
const failures = [];
for (const name of names) {
  const metaFile = path.join(CASES, `${name}.meta.json`);
  const meta = readMeta(metaFile);
  const got = run(name, meta);
  if (RECORD) {
    fs.writeFileSync(path.join(CASES, `${name}.expected.txt`), got.stdout);
    fs.writeFileSync(metaFile, `${JSON.stringify({ hook: meta.hook, cwd: meta.cwd, broken: meta.broken, stub: meta.stub, exit: got.exit, stderr: got.stderr }, null, 2)}
`);
    continue;
  }
  const want = fs.readFileSync(path.join(CASES, `${name}.expected.txt`), "utf8");
  if (got.stdout !== want) failures.push(`${name}: stdout
  want ${JSON.stringify(want)}
  got  ${JSON.stringify(got.stdout)}`);
  if (got.exit !== meta.exit) failures.push(`${name}: exit want ${meta.exit} got ${got.exit}`);
  if (got.stderr !== meta.stderr) failures.push(`${name}: stderr
  want ${JSON.stringify(meta.stderr)}
  got  ${JSON.stringify(got.stderr)}`);
}
if (failures.length) {
  console.error(`hook-output-golden: ${failures.length} difference(s)
${failures.join("\n")}`);
  process.exit(1);
}
console.log(`hook-output-golden.test.js: ${RECORD ? "recorded" : "ok"} (${names.length} cases)`);
