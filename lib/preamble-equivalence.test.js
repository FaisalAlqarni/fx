// generated from src/lib/preamble-equivalence.test.ts by scripts/build: edit there, not here
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
var import_plan_state = require("./plan-state");
var import_preamble = require("./preamble");
const FIXTURES = path.join(__dirname, "..", "tests", "gates", "fixtures", "plan-state");
const RECORD = process.argv.includes("--record");
const ROOT = path.resolve(__dirname, "..");
function check(raw, name, label) {
  const got = raw === null ? null : [fs.realpathSync(ROOT), ROOT].reduce((out, r) => out.split(r).join("<root>"), raw);
  const file = path.join(FIXTURES, "expected", name);
  if (RECORD) fs.writeFileSync(file, got ?? "");
  else assert.strictEqual(got, fs.readFileSync(file, "utf8"), label);
}
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "fx-plan-state-"));
const unreadable = path.join(scratch, "d", "docs", "plans", "demo", "state.md");
try {
  fs.cpSync(FIXTURES, scratch, { recursive: true, filter: (src) => path.basename(src) !== "expected" });
  for (const name of ["a", "b", "c"]) {
    check((0, import_plan_state.describePlans)(path.join(scratch, name)), `plans-${name}.txt`, `describePlans ${name}`);
  }
  if (process.getuid?.() === 0) {
    console.log("preamble-equivalence: skipping fixture d (running as root, mode 000 is still readable)");
  } else {
    fs.chmodSync(unreadable, 0);
    check((0, import_plan_state.describePlans)(path.join(scratch, "d")), "plans-d.txt", "describePlans d");
  }
  for (const harness of import_preamble.HARNESSES) {
    for (const subagent of [false, true]) {
      const got = (0, import_preamble.render)({ harness, cwd: path.join(scratch, "a"), subagent });
      check(got, `render-${harness}-${subagent ? "subagent" : "session"}.txt`, `render ${harness} subagent=${subagent}`);
    }
  }
} finally {
  try {
    fs.chmodSync(unreadable, 420);
  } catch {
  }
  fs.rmSync(scratch, { recursive: true, force: true });
}
console.log(`preamble-equivalence.test.js: ${RECORD ? "recorded" : "ok"}`);
