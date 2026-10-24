#!/usr/bin/env node
// generated from src/tests/review-bench/fill-template.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var fill_template_exports = {};
__export(fill_template_exports, {
  extractPromptBody: () => extractPromptBody,
  fillPlaceholders: () => fillPlaceholders,
  findLeftoverPlaceholders: () => findLeftoverPlaceholders
});
module.exports = __toCommonJS(fill_template_exports);
var fs = __toESM(require("fs"));
const PROMPT_MARKER_RE = /^\s*prompt:\s*\|\s*$/;
const FENCE_RE = /^```\s*$/;
const BODY_INDENT = "    ";
function extractPromptBody(templateText) {
  const lines = templateText.split("\n");
  const start = lines.findIndex((l) => PROMPT_MARKER_RE.test(l));
  if (start === -1) throw new Error('no "prompt: |" line found in template');
  const body = [];
  for (let i = start + 1; i < lines.length && !FENCE_RE.test(lines[i] ?? ""); i++) {
    const l = lines[i] ?? "";
    body.push(l.startsWith(BODY_INDENT) ? l.slice(BODY_INDENT.length) : l);
  }
  return body.join("\n");
}
function fillPlaceholders(body, values) {
  let out = body;
  for (const [k, v] of Object.entries(values)) out = out.split(`[${k}]`).join(v);
  return out;
}
function findLeftoverPlaceholders(originalBody, filledBody) {
  const tokens = new Set(originalBody.match(/\[[A-Z_]+\]/g) || []);
  return [...tokens].filter((t) => filledBody.includes(t));
}
if (require.main === module) {
  const templatePath = process.argv[2];
  if (!templatePath) {
    process.stderr.write("usage: fill-template.js <template.md>\n");
    process.exit(2);
  }
  const KEYS = ["BRIEF_FILE", "REPORT_FILE", "BASE_SHA", "HEAD_SHA", "DIFF_FILE", "FINDINGS_FILE", "COST_LINE"];
  const values = {};
  for (const k of KEYS) {
    const v = process.env[k];
    if (v !== void 0) values[k] = v;
  }
  const body = extractPromptBody(fs.readFileSync(templatePath, "utf8"));
  const filled = fillPlaceholders(body, values);
  const leftover = findLeftoverPlaceholders(body, filled);
  if (leftover.length) {
    process.stderr.write(`fill-template.js: leftover placeholder token(s) in the filled prompt: ${leftover.join(", ")}
`);
    process.exit(1);
  }
  process.stdout.write(filled);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractPromptBody,
  fillPlaceholders,
  findLeftoverPlaceholders
});
