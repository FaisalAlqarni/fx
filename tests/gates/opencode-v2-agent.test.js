// generated from src/tests/gates/opencode-v2-agent.test.ts by scripts/build: edit there, not here
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
var assert = __toESM(require("node:assert"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_agent_dialects = require("../../lib/agent-dialects.js");
const root = path.join(__dirname, "..", "..");
function effect(rules, action, resource) {
  const glob = (p, s) => new RegExp("^" + p.split("*").map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$").test(s);
  let out = "ask";
  for (const r of rules) if (glob(r.action, action) && glob(r.resource, resource)) out = r.effect;
  return out;
}
const refs = path.join(root, "references");
for (const f of fs.readdirSync(path.join(root, "agents")).filter((n) => n.endsWith(".md"))) {
  const md = fs.readFileSync(path.join(root, "agents", f), "utf8");
  const a = (0, import_agent_dialects.toOpencodeV2Agent)(md, { referencesDirs: [refs] });
  assert.strictEqual(a.mode, "subagent", `${f}: a subagent`);
  assert.ok(a.description && a.description.length > 20, `${f}: has its description`);
  assert.ok(a.system && a.system.length > 100, `${f}: body becomes the system prompt`);
  assert.deepStrictEqual(a.permissions[0], { action: "*", resource: "*", effect: "deny" }, `${f}: deny everything first`);
  assert.strictEqual(effect(a.permissions, "read", "src/x.js"), "allow", `${f}: can read`);
  assert.strictEqual(effect(a.permissions, "grep", "*"), "allow", `${f}: can grep`);
  assert.strictEqual(effect(a.permissions, "edit", "src/x.js"), "deny", `${f}: cannot edit`);
  assert.strictEqual(effect(a.permissions, "shell", "rm -rf /"), "deny", `${f}: cannot run a shell`);
  assert.strictEqual(effect(a.permissions, "subagent", "general"), "deny", `${f}: cannot delegate`);
  assert.strictEqual(effect(a.permissions, "external_directory", path.join(refs, "vocab", "x.md")), "allow", `${f}: reads fx references`);
  assert.ok((0, import_agent_dialects.toOpencodeAgent)(md, { referencesDirs: [refs] }).permission, `${f}: the v1 converter is unchanged`);
}
console.log("opencode-v2-agent.test.js: OK");
