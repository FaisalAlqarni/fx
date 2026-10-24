// generated from src/tests/gates/agent-model.test.ts by scripts/build: edit there, not here
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
const root = path.join(__dirname, "..", "..");
const dir = path.join(root, "agents");
for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const text = fs.readFileSync(path.join(dir, name), "utf8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, `${name}: no frontmatter`);
  assert.ok(/^model:\s*\S+/m.test(m[1] ?? ""), `${name}: no model: pinned in frontmatter`);
  assert.ok(!/`\.\.\/(references|agents|skills)\//.test(text), `${name}: cites a path relative to agents/, which no runtime resolves`);
}
console.log("agent-model: OK");
