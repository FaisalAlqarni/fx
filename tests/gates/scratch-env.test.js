// generated from src/tests/gates/scratch-env.test.ts by scripts/build: edit there, not here
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
var import_hook_env = require("../helpers/hook-env.js");
const root = path.join(__dirname, "..", "..");
const KEYS = ["HOME", "XDG_CONFIG_HOME", "XDG_STATE_HOME", "APPDATA", "LOCALAPPDATA", "TMPDIR"];
const r = (0, import_child_process.spawnSync)(
  path.join(root, "scripts", "scratch-env"),
  ["node", "-e", `console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(KEYS)}.map((k) => [k, process.env[k]]))))`],
  { encoding: "utf8" }
);
assert.strictEqual(r.status, 0, r.stderr);
const named = /^scratch-env: (\S+)$/m.exec(r.stderr);
assert.ok(named, `stderr names the scratch directory: ${r.stderr}`);
const dir = named[1] ?? "";
const seen = JSON.parse(r.stdout);
for (const k of KEYS) {
  const v = seen[k];
  assert.ok(typeof v === "string" && v.startsWith(`${dir}/`), `${k} is inside ${dir}: ${String(v)}`);
  assert.notStrictEqual(v, os.homedir(), `${k} is not the caller's HOME`);
  assert.ok(fs.statSync(v).isDirectory(), `${k} exists`);
}
const s = (0, import_hook_env.scratchHookEnv)();
try {
  assert.strictEqual(s.env.TMPDIR, path.join(s.dirs.root, "tmp"));
  assert.ok(fs.statSync(path.join(s.dirs.root, "tmp")).isDirectory(), "the scratch TMPDIR exists");
} finally {
  s.cleanup();
}
const before = process.env.TMPDIR;
const applied = (0, import_hook_env.applyScratchEnv)();
assert.strictEqual(process.env.TMPDIR, path.join(applied.dirs.root, "tmp"));
applied.restore();
assert.strictEqual(process.env.TMPDIR, before, "restore puts the old TMPDIR back");
console.log("scratch-env: ok");
