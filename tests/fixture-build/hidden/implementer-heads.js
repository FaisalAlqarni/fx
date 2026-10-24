// generated from src/tests/fixture-build/hidden/implementer-heads.ts by scripts/build: edit there, not here
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
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("../../../lib/json.js");
function fail(msg) {
  process.stderr.write(msg + "\n");
  process.exit(2);
}
function get(v, key) {
  if (v === null || v === void 0) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}
const file = process.argv[2];
if (!file) fail("usage: implementer-heads.js <controller.jsonl>");
if (!fs.existsSync(file)) fail(`file not found: ${file}`);
function contentOf(rec) {
  const m = get(rec, "message");
  return m && get(m, "content");
}
function textOf(rec) {
  const c = contentOf(rec);
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    const parts = [];
    for (const b of c) {
      if (!b || get(b, "type") !== "text") continue;
      const t = get(b, "text");
      if (typeof t === "string") parts.push(t);
    }
    return parts.join("\n");
  }
  return "";
}
function records(f) {
  return fs.readFileSync(f, "utf8").split("\n").flatMap((line, i) => {
    if (!line.trim()) return [];
    try {
      return [(0, import_json.parseJson)(line)];
    } catch (e) {
      return fail(`malformed JSON: ${f}:${i + 1}`);
    }
  });
}
const dir = path.join(path.dirname(file), path.basename(file, ".jsonl"), "subagents");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => path.join(dir, f)) : [];
const original = {};
for (const f of files) {
  const recs = records(f);
  const first = recs.find((r) => get(r, "type") === "user");
  const m = first === void 0 ? null : textOf(first).match(/You are implementing task (\d+)/);
  if (!m) continue;
  const task = (m[1] ?? "").padStart(2, "0");
  const start = Math.min(...recs.map((r) => Date.parse(String(get(r, "timestamp")))).filter((t) => !Number.isNaN(t)));
  const prior = original[task];
  if (!prior || start < prior.start) original[task] = { start, recs };
}
const SKILL_EXPANSION = "Base directory for this skill:";
function isToolResultOrSkillExpansion(rec) {
  const c = contentOf(rec);
  if (Array.isArray(c) && c.length > 0 && c.every((b) => b && get(b, "type") === "tool_result")) return true;
  return get(rec, "isMeta") === true && textOf(rec).startsWith(SKILL_EXPANSION);
}
function firstReply(recs) {
  const dispatch = recs.findIndex((r) => get(r, "type") === "user");
  let boundary = recs.length;
  for (let i = dispatch + 1; i < recs.length; i++) {
    const r = recs[i];
    if (get(r, "type") !== "user") continue;
    if (isToolResultOrSkillExpansion(r)) continue;
    boundary = i;
    break;
  }
  for (let i = boundary - 1; i > dispatch; i--) {
    if (get(recs[i], "type") === "assistant" && textOf(recs[i]).trim()) return recs[i];
  }
  return null;
}
const heads = {};
for (const task of Object.keys(original).sort()) {
  const reply = firstReply(original[task]?.recs ?? []);
  const shas = reply ? textOf(reply).match(/\b[0-9a-f]{7,40}\b/g) : null;
  if (shas) heads[task] = shas[shas.length - 1] ?? "";
}
process.stdout.write(JSON.stringify(heads) + "\n");
