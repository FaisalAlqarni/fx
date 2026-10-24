// generated from src/tests/gates/no-rm-in-shell-c.test.ts by scripts/build: edit there, not here
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
const BULLET = "- **No rm inside a shell -c string.** Never put rm inside a bash -c or similar quoted script: Claude Code cannot inspect it and stops for a permission prompt. Leave scratch files for a later cleanup instead of deleting them in a -c string; fx's own commands carry their cleanup in script files.";
const config = JSON.parse(fs.readFileSync(path.join(root, ".fx.json"), "utf8"));
assert.ok(typeof config === "object" && config !== null, ".fx.json is an object");
const bad = Object.entries(config).filter(([, v]) => typeof v === "string" && /-c\s+['"]/.test(v) && (/\brm\s/.test(v) || /\btrap\b/.test(v))).map(([k]) => k);
assert.deepStrictEqual(bad, [], `.fx.json values run rm or trap inside a -c string: ${bad.join(", ")}`);
assert.ok(fs.readFileSync(path.join(root, "PREAMBLE.md"), "utf8").includes(BULLET), "PREAMBLE.md lacks the no-rm bullet verbatim");
const script = process.argv[2] ?? path.join(root, "scripts", "test-one");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fx-no-rm-"));
const env = { ...process.env, HOME: scratch, TMPDIR: scratch };
const run = (...args) => (0, import_child_process.spawnSync)(script, args, { cwd: root, env, encoding: "utf8", timeout: 6e5 });
const out = (r) => `${String(r.status)}
${r.stdout}
${r.stderr}`;
const pass = run("src/lib/git-guard.test.ts");
assert.strictEqual(pass.status, 0, `test-one on git-guard.test.ts: ${out(pass)}`);
const fail = run("src/lib/no-such-test.test.ts");
assert.ok(fail.status !== null && fail.status !== 0, `test-one on a missing test exited 0: ${out(fail)}`);
const none = run();
assert.strictEqual(none.status, 2, `test-one with no argument: ${out(none)}`);
assert.ok(/usage/i.test(none.stderr), `test-one with no argument prints no usage: ${out(none)}`);
for (const arg of ["/tmp/x.test.ts", "../x.test.ts", "src/../../x.test.ts"]) {
  const r = run(arg);
  assert.strictEqual(r.status, 2, `test-one ${arg}: ${out(r)}`);
  assert.ok(/usage/i.test(r.stderr), `test-one ${arg} prints no usage: ${out(r)}`);
}
const left = fs.readdirSync(scratch);
assert.deepStrictEqual(left, [], `scripts/test-one left files in TMPDIR: ${left.join(", ")}`);
fs.rmdirSync(scratch);
console.log("no-rm-in-shell-c.test.js: ok");
