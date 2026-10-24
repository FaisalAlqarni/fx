#!/usr/bin/env node
// generated from src/tests/lane-triggering/verdict.ts by scripts/build: edit there, not here
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
var import_json = require("../../lib/json.js");
const [, , expected, streamFile] = process.argv;
if (!expected || !streamFile) {
  console.error("usage: verdict.js <expected-lane|none> <stream.json>");
  process.exit(2);
}
function get(v, key) {
  if (v === null || v === void 0) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}
const skillsDir = path.join(__dirname, "..", "..", "skills");
const knownLanes = new Set(fs.readdirSync(skillsDir));
const lines = fs.readFileSync(streamFile, "utf8").split("\n").filter(Boolean);
let firstLane = null;
for (const line of lines) {
  let event;
  try {
    event = (0, import_json.parseJson)(line);
  } catch {
    continue;
  }
  const content = event && get(event, "message") && get(get(event, "message"), "content");
  if (!Array.isArray(content)) continue;
  for (const block of content) {
    if (get(block, "type") !== "tool_use" || get(block, "name") !== "Skill") continue;
    const input = get(block, "input");
    const raw = input && get(input, "skill");
    if (!raw) continue;
    if (typeof raw !== "string") throw new TypeError("raw.includes is not a function");
    const name = raw.includes(":") ? raw.slice(raw.lastIndexOf(":") + 1) : raw;
    if (!knownLanes.has(name)) continue;
    firstLane = name;
    break;
  }
  if (firstLane) break;
}
if (expected === "none") {
  if (firstLane) {
    console.log(`FAIL a lane was invoked: ${firstLane}`);
    process.exit(1);
  }
  console.log("PASS");
  process.exit(0);
}
if (!firstLane) {
  console.log("FAIL no lane invoked");
  process.exit(1);
}
if (firstLane !== expected) {
  console.log(`FAIL first lane was ${firstLane}`);
  process.exit(1);
}
console.log("PASS");
process.exit(0);
