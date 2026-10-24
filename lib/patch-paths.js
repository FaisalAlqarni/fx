// generated from src/lib/patch-paths.ts by scripts/build: edit there, not here
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var patch_paths_exports = {};
__export(patch_paths_exports, {
  extractPatchAdditions: () => extractPatchAdditions,
  extractPatchPaths: () => extractPatchPaths
});
module.exports = __toCommonJS(patch_paths_exports);
function extractPatchPaths(command) {
  if (typeof command !== "string") return [];
  const paths = [];
  for (const line of command.split("\n")) {
    const m = line.match(/^\s*\*\*\* (?:Update|Add|Delete) File: (.+)$/) || line.match(/^\s*\*\*\* Move to: (.+)$/);
    if (m?.[1] !== void 0) paths.push(m[1].trim());
  }
  return paths;
}
function extractPatchAdditions(command) {
  if (typeof command !== "string") return [];
  const out = [];
  let current = null;
  for (const line of command.split("\n")) {
    const header = line.match(/^\s*\*\*\* (Update|Add|Delete) File: (.+)$/);
    const move = line.match(/^\s*\*\*\* Move to: (.+)$/);
    if (header?.[2] !== void 0) {
      current = header[1] === "Delete" ? null : { path: header[2].trim(), lines: [], removed: [] };
      if (current) out.push(current);
    } else if (move?.[1] !== void 0) {
      if (current) current.path = move[1].trim();
    } else if (current && line.startsWith("+")) current.lines.push(line.slice(1));
    else if (current && line.startsWith("-")) current.removed.push(line.slice(1));
  }
  return out.map((f) => ({ path: f.path, text: f.lines.join("\n"), removed: f.removed.join("\n") }));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractPatchAdditions,
  extractPatchPaths
});
