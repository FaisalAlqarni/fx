#!/usr/bin/env node
// generated from src/tests/review-bench/build-case.ts by scripts/build: edit there, not here
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
var build_case_exports = {};
__export(build_case_exports, {
  MODULE_FILES: () => MODULE_FILES,
  buildBase: () => buildBase,
  ownedFiles: () => ownedFiles
});
module.exports = __toCommonJS(build_case_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const MODULE_FILES = ["lib/store.js", "lib/export.js", "lib/search.js", "cli.js", "README.md"];
function ownedFiles(filesDir) {
  const out = [];
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), childRel);
      else out.push(childRel);
    }
  })(filesDir, "");
  return out;
}
function buildBase(caseDir, goodDir, destDir) {
  const owned = ownedFiles(path.join(caseDir, "files"));
  for (const f of MODULE_FILES) {
    const dest = path.join(destDir, f);
    if (owned.includes(f)) {
      fs.rmSync(dest, { force: true });
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(goodDir, f), dest);
  }
  return owned;
}
if (require.main === module) {
  const [caseDir, goodDir, destDir] = process.argv.slice(2);
  if (!caseDir || !goodDir || !destDir) {
    process.stderr.write("usage: build-case.js <case-dir> <good-dir> <dest-dir>\n");
    process.exit(2);
  }
  for (const [name, p] of [["case-dir", caseDir], ["good-dir", goodDir], ["dest-dir", destDir]]) {
    if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
      process.stderr.write(`build-case.js: ${name} is not a directory: ${p}
`);
      process.exit(2);
    }
  }
  const owned = buildBase(caseDir, goodDir, destDir);
  process.stdout.write(owned.join("\n") + "\n");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MODULE_FILES,
  buildBase,
  ownedFiles
});
