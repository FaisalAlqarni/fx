#!/usr/bin/env node
// generated from src/tests/review-bench/score.ts by scripts/build: edit there, not here
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
function usage(msg) {
  process.stderr.write(msg + "\n");
  process.exit(2);
}
const [findingsPath, matchArg] = process.argv.slice(2);
if (!findingsPath || matchArg === void 0) usage("usage: score.js <findings.md> <match-regex|NONE>");
let text;
try {
  text = fs.readFileSync(findingsPath, "utf8");
} catch (e) {
  usage(`could not read findings file: ${findingsPath}: ${e instanceof Error ? e.message : String(e)}`);
}
const HEADING_RE = /^#{1,6}\s.*$/;
function section(name) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => HEADING_RE.test(l) && new RegExp(`\\b${name}\\b`, "i").test(l));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length && !HEADING_RE.test(lines[i] ?? ""); i++) body.push(lines[i] ?? "");
  return body.join("\n");
}
const critical = section("Critical");
const important = section("Important");
const offTemplate = critical === null && important === null && section("Issues") === null;
const ITEM_RE = /^\s*(?:[-*]|\d+[.)])\s+\S/;
function findings(body) {
  const items = [];
  for (const line of (body || "").split(/\r?\n/)) {
    if (ITEM_RE.test(line)) items.push(line);
    else if (items.length && line.trim()) items[items.length - 1] += "\n" + line;
  }
  return items;
}
const combined = [critical || "", important || ""].join("\n");
const match = matchArg === "NONE" ? null : new RegExp(matchArg, "i");
const caught = match ? match.test(offTemplate ? text : combined) : false;
const falsePositive = [...findings(critical), ...findings(important)].some((f) => !match || !match.test(f));
process.stdout.write(JSON.stringify({ caught, falsePositive, important: findings(important).length, ...offTemplate ? { offTemplate } : {} }) + "\n");
