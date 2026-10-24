// generated from src/lib/patch-paths.test.ts by scripts/build: edit there, not here
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
var import_patch_paths = require("./patch-paths.js");
const patch = (...lines) => ["*** Begin Patch", ...lines, "*** End Patch", ""].join("\n");
assert.deepStrictEqual((0, import_patch_paths.extractPatchPaths)(patch("*** Add File: x.txt", "+hi")), ["x.txt"]);
assert.deepStrictEqual((0, import_patch_paths.extractPatchPaths)(patch("*** Update File: a.js", "@@", "-1", "+2", "*** Delete File: b.js")), ["a.js", "b.js"]);
assert.deepStrictEqual((0, import_patch_paths.extractPatchPaths)(patch("*** Update File: old.js", "*** Move to: new.js")), ["old.js", "new.js"], "a rename names both paths");
assert.deepStrictEqual((0, import_patch_paths.extractPatchPaths)(`apply_patch <<'PATCH'
  *** Update File: indented.js
PATCH`), ["indented.js"], "an indented heredoc body");
assert.deepStrictEqual((0, import_patch_paths.extractPatchPaths)("not a patch"), []);
for (const bad of [void 0, null, 7, {}, ["*** Add File: x"]]) assert.deepStrictEqual((0, import_patch_paths.extractPatchPaths)(bad), [], `${JSON.stringify(bad)} yields no paths`);
assert.deepStrictEqual(
  (0, import_patch_paths.extractPatchAdditions)("*** Begin Patch\n*** Update File: a.md\n@@\n-old\n+new one\n+new two\n*** Add File: b.txt\n+hello\n*** End Patch"),
  [{ path: "a.md", text: "new one\nnew two", removed: "old" }, { path: "b.txt", text: "hello", removed: "" }]
);
assert.deepStrictEqual((0, import_patch_paths.extractPatchAdditions)(patch("*** Update File: old.md", "*** Move to: new.md", "@@", "+x")), [{ path: "new.md", text: "x", removed: "" }], "a rename adds to the new path");
assert.deepStrictEqual((0, import_patch_paths.extractPatchAdditions)(patch("*** Delete File: gone.md", "+x")), [], "a deleted file gains nothing");
assert.deepStrictEqual((0, import_patch_paths.extractPatchAdditions)(42), []);
assert.deepStrictEqual((0, import_patch_paths.extractPatchAdditions)("not a patch\n+x"), []);
console.log("patch-paths.test.js: ok");
