// generated from src/tests/gates/harness-facts.test.ts by scripts/build: edit there, not here
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
var path = __toESM(require("path"));
const dir = path.join(__dirname, "..", "..", "references", "harnesses");
const FACT = /^(MEASURED|READ|UNVERIFIED) 2026-10-\d\d on .+ \d+\.\d+\.\d+:/;
function section(file, heading) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  const start = text.indexOf(`
## ${heading}
`);
  assert.ok(start >= 0, `${file} has a "${heading}" section`);
  const rest = text.slice(start + heading.length + 5);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
}
function fact(file, heading) {
  const paragraphs = section(file, heading).split(/\n\s*\n/).map((p) => p.trim());
  const found = paragraphs.find((p) => FACT.test(p));
  assert.ok(found, `${file} "${heading}" holds a MEASURED, READ or UNVERIFIED paragraph with date, tool and version`);
  return found;
}
fact("claude-code.md", "Model tiers");
fact("codex.md", "Subagent dispatch");
assert.ok(fact("codex.md", "User prompts").startsWith("READ "), "the Codex prompt output fact is READ, not MEASURED");
fact("codex.md", "Skill trigger rules");
fact("codex.md", "Model catalog and profiles");
fact("codex.md", "Hook trust");
assert.ok(fact("codex.md", "Tool vocabulary").includes("anthropic/"), "the Codex Tool vocabulary fact names the anthropic/ case");
assert.ok(
  !fs.readFileSync(path.join(dir, "codex.md"), "utf8").includes("Edits go through `apply_patch`."),
  "codex.md no longer says every edit goes through apply_patch"
);
fact("opencode.md", "Subagent dispatch");
fact("opencode-v2.md", "Subagent dispatch");
const guard = fact("opencode-v2.md", "Shell guard");
assert.ok(/execute\.before is (not )?awaited/.test(guard), "the Shell guard fact says whether execute.before is awaited");
assert.ok(!/openrouter/i.test(guard), "the Shell guard fact never names OpenRouter");
const v2 = fs.readFileSync(path.join(dir, "opencode-v2.md"), "utf8");
assert.ok(
  !v2.includes("Measured against OpenCode 2.0.18") || v2.includes("2.1.4"),
  "opencode-v2.md names 2.1.4 wherever it still cites 2.0.18"
);
console.log("harness-facts: ok");
