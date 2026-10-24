// generated from src/lib/glossary.ts by scripts/build: edit there, not here
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
var glossary_exports = {};
__export(glossary_exports, {
  findGlossary: () => findGlossary,
  glossaryNotice: () => glossaryNotice
});
module.exports = __toCommonJS(glossary_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_fx_json = require("./fx-json");
var import_json = require("./json");
const ORDER = ["GLOSSARY-MAP.md", "GLOSSARY.md", "CONTEXT-MAP.md", "CONTEXT.md"];
function findGlossary(root) {
  const file = ORDER.find((f) => fs.existsSync(path.join(root, f)));
  return file ? { file, legacy: file.startsWith("CONTEXT") } : null;
}
function declined(root) {
  try {
    const parsed = (0, import_fx_json.parseFxJson)((0, import_json.parseJson)(fs.readFileSync(path.join(root, ".fx.json"), "utf8")));
    return parsed.ok && parsed.value.glossary_rename === "declined";
  } catch {
    return false;
  }
}
function glossaryNotice(root) {
  const found = findGlossary(root);
  if (!found || !found.legacy || declined(root)) return null;
  return `This repository's glossary is still named ${found.file}. fx now reads GLOSSARY.md (GLOSSARY-MAP.md for a map) first and the old name second. Run the fx-setup command to rename it; answer no there and fx stops asking.`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findGlossary,
  glossaryNotice
});
