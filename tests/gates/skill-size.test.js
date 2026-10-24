// generated from src/tests/gates/skill-size.test.ts by scripts/build: edit there, not here
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
var skill_size_test_exports = {};
__export(skill_size_test_exports, {
  LIMIT: () => LIMIT,
  PENDING: () => PENDING,
  oversize: () => oversize
});
module.exports = __toCommonJS(skill_size_test_exports);
var assert = __toESM(require("assert"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
const LIMIT = 2e4;
const PENDING = {};
function oversize(root, pending) {
  const out = [];
  const dir = path.join(root, "skills");
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    const n = fs.statSync(file).size;
    const over = n >= LIMIT;
    if (over && !(name in pending)) {
      out.push(`skill-size: skills/${name}/SKILL.md is ${n} bytes, at or over the ${LIMIT}-byte limit. Move what only some steps need into a file beside it.`);
    } else if (!over && name in pending) {
      out.push(`skill-size: skills/${name}/SKILL.md is ${n} bytes, under the limit: delete '${name}' from PENDING.`);
    }
  }
  return out;
}
const repo = path.join(__dirname, "..", "..");
function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skill-size-"));
  for (const [rel, body] of Object.entries(files)) {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  }
  return root;
}
function checkPaths(root) {
  const r2 = (0, import_child_process.spawnSync)("python3", ["-I", path.join(repo, "scripts", "check-paths"), "--root", root], { encoding: "utf8" });
  return { code: r2.status, out: r2.stdout + r2.stderr };
}
const sized = tree({ "skills/a/SKILL.md": "x".repeat(2e4), "skills/b/SKILL.md": "x".repeat(19999) });
assert.deepStrictEqual(oversize(sized, {}), [
  "skill-size: skills/a/SKILL.md is 20000 bytes, at or over the 20000-byte limit. Move what only some steps need into a file beside it."
]);
assert.ok(
  oversize(sized, { b: "NN" }).includes("skill-size: skills/b/SKILL.md is 19999 bytes, under the limit: delete 'b' from PENDING.")
);
assert.deepStrictEqual(oversize(repo, PENDING), []);
let r = checkPaths(tree({ "skills/x/SKILL.md": "[a](./references/a.md)\n" }));
assert.strictEqual(r.code, 1);
assert.ok(r.out.includes("skills/x/SKILL.md: link ./references/a.md -> no such file"), r.out);
r = checkPaths(tree({ "skills/x/SKILL.md": "[u](https://e.com/a.md) [m](mailto:a@b.c) [h](#top)\n" }));
assert.strictEqual(r.code, 0, r.out);
r = checkPaths(tree({ "skills/x/SKILL.md": "see `extra.md`\n", "skills/x/extra.md": "x\n" }));
assert.strictEqual(r.code, 1);
assert.ok(r.out.includes("skills/x/extra.md: no link from another file in skills/x/ reaches it"), r.out);
r = checkPaths(tree({ "skills/x/SKILL.md": "nothing\n", "skills/x/references/deep.md": "x\n" }));
assert.strictEqual(r.code, 1);
assert.ok(r.out.includes("skills/x/references/deep.md: no link from another file in skills/x/ reaches it"), r.out);
r = checkPaths(tree({ "skills/x/SKILL.md": "nothing\n", "skills/x/COVERAGE.md": "[e](./extra.md)\n", "skills/x/extra.md": "x\n" }));
assert.strictEqual(r.code, 1);
assert.ok(r.out.includes("skills/x/extra.md: no link from another file in skills/x/ reaches it"), r.out);
r = checkPaths(tree({ "skills/x/SKILL.md": "[d](./references/deep.md)\n", "skills/x/references/deep.md": "x\n" }));
assert.strictEqual(r.code, 0, r.out);
r = checkPaths(repo);
assert.strictEqual(r.code, 0, r.out);
console.log("skill-size: OK");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LIMIT,
  PENDING,
  oversize
});
