// generated from src/tests/lane-triggering/verdict.test.ts by scripts/build: edit there, not here
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
const DIR = __dirname;
const BIN = path.join(DIR, "verdict.js");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fx-verdict-"));
const skill = (s) => ({ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill: s } }] } });
const stream = (name, skills) => {
  const f = path.join(tmp, `${name}.json`);
  fs.writeFileSync(f, [{ type: "system" }, ...skills.map(skill)].map((o) => JSON.stringify(o)).join("\n") + "\n");
  return f;
};
const run = (lane, file) => {
  const p = (0, import_child_process.spawnSync)("node", [BIN, lane, file], { encoding: "utf8" });
  return { code: p.status, out: p.stdout.trim() };
};
assert.deepStrictEqual(run("fx-tdd", stream("ok", ["fx:fx-tdd"])), { code: 0, out: "PASS" });
assert.deepStrictEqual(run("fx-tdd", stream("bare", ["fx-tdd"])), { code: 0, out: "PASS" });
assert.deepStrictEqual(run("fx-tdd", stream("wrong", ["fx:fx-brainstorm", "fx:fx-tdd"])), { code: 1, out: "FAIL first lane was fx-brainstorm" });
assert.deepStrictEqual(run("fx-tdd", stream("foreign", ["superpowers:brainstorming", "fx:fx-tdd"])), { code: 0, out: "PASS" });
assert.deepStrictEqual(run("fx-tdd", stream("nothing", [])), { code: 1, out: "FAIL no lane invoked" });
assert.deepStrictEqual(run("none", stream("quiet", ["superpowers:brainstorming"])), { code: 0, out: "PASS" });
assert.deepStrictEqual(run("none", stream("noisy", ["fx:fx-debug"])), { code: 1, out: "FAIL a lane was invoked: fx-debug" });
const skillsDir = path.join(DIR, "..", "..", "skills");
const modelFacing = fs.readdirSync(skillsDir).filter((d) => {
  const f = path.join(skillsDir, d, "SKILL.md");
  return fs.existsSync(f) && !/^disable-model-invocation:\s*true/m.test(fs.readFileSync(f, "utf8").split(/^---$/m)[1] || "");
});
const prompts = fs.readdirSync(path.join(DIR, "prompts")).map((f) => f.replace(/\.txt$/, "").split("__")[0]);
for (const lane of modelFacing) assert.ok(prompts.includes(lane), `lane ${lane} has no prompt`);
assert.ok(prompts.includes("none"), "at least one should-not-fire prompt");
fs.rmSync(tmp, { recursive: true, force: true });
console.log("verdict: ok");
