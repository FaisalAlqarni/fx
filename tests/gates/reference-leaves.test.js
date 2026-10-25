// generated from src/tests/gates/reference-leaves.test.ts by scripts/build: edit there, not here
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
var import_child_process = require("child_process");
const script = path.join(__dirname, "..", "..", "scripts", "check-reference-leaves");
function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-leaves-"));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body);
  }
  return root;
}
function run(root) {
  const r = (0, import_child_process.spawnSync)("bash", root ? [script, root] : [script], { encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}
{
  const r = run(tree({ "references/vocab/a.md": "see `adr-template.md`\n", "references/templates/adr-template.md": "# t\n" }));
  assert.strictEqual(r.code, 1, "a vocab file naming a template fails");
  assert.ok(r.out.includes("  references/vocab/a.md -> adr-template.md"), r.out);
}
{
  const r = run(tree({ "references/templates/x-template.md": "see `wayfinder.md`\n", "references/wayfinder.md": "# w\n" }));
  assert.strictEqual(r.code, 1, "a template naming a top-level reference fails");
  assert.ok(r.out.includes("  references/templates/x-template.md -> wayfinder.md"), r.out);
}
{
  const r = run(tree({ "references/a.md": "see `LICENSE-x.md`\n", "references/vendor/LICENSE-x.md": "x\n" }));
  assert.strictEqual(r.code, 0, `vendor is not a target: ${r.out}`);
}
{
  const r = run(tree({ "references/a.md": "see `design.md`\n" }));
  assert.strictEqual(r.code, 0, r.out);
  assert.ok(r.out.includes("OK: no reference links to another reference"), r.out);
}
{
  const r = run();
  assert.strictEqual(r.code, 0, `the repository is clean: ${r.out}`);
}
console.log("reference-leaves.test.js: OK");
