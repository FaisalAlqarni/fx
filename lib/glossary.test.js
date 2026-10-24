// generated from src/lib/glossary.test.ts by scripts/build: edit there, not here
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
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_glossary = require("./glossary.js");
function repo(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "fx-glossary-"));
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(d, name), body);
  return d;
}
const list = (d) => fs.readdirSync(d).sort();
{
  const d = repo({ "GLOSSARY.md": "x" });
  assert.deepStrictEqual((0, import_glossary.findGlossary)(d), { file: "GLOSSARY.md", legacy: false });
  assert.strictEqual((0, import_glossary.glossaryNotice)(d), null);
}
{
  const d = repo({ "CONTEXT.md": "x" });
  assert.deepStrictEqual((0, import_glossary.findGlossary)(d), { file: "CONTEXT.md", legacy: true });
  assert.strictEqual(
    (0, import_glossary.glossaryNotice)(d),
    "This repository's glossary is still named CONTEXT.md. fx now reads GLOSSARY.md (GLOSSARY-MAP.md for a map) first and the old name second. Run the fx-setup command to rename it; answer no there and fx stops asking."
  );
}
{
  const d = repo({ "GLOSSARY.md": "x", "CONTEXT.md": "y" });
  const before = list(d);
  assert.deepStrictEqual((0, import_glossary.findGlossary)(d), { file: "GLOSSARY.md", legacy: false });
  assert.strictEqual((0, import_glossary.glossaryNotice)(d), null);
  assert.deepStrictEqual(list(d), before);
}
{
  const d = repo({});
  assert.strictEqual((0, import_glossary.findGlossary)(d), null);
  assert.strictEqual((0, import_glossary.glossaryNotice)(d), null);
  assert.deepStrictEqual(list(d), []);
}
{
  const d = repo({ "CONTEXT-MAP.md": "x", "CONTEXT.md": "y" });
  assert.deepStrictEqual((0, import_glossary.findGlossary)(d), { file: "CONTEXT-MAP.md", legacy: true });
}
{
  const d = repo({ "GLOSSARY-MAP.md": "x", "GLOSSARY.md": "y", "CONTEXT-MAP.md": "z" });
  assert.deepStrictEqual((0, import_glossary.findGlossary)(d), { file: "GLOSSARY-MAP.md", legacy: false });
}
{
  const d = repo({ "CONTEXT.md": "x", ".fx.json": '{"glossary_rename":"declined"}' });
  assert.strictEqual((0, import_glossary.glossaryNotice)(d), null);
}
console.log("glossary.test.js: ok");
