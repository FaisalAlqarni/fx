// generated from src/lib/fx-paths.test.ts by scripts/build: edit there, not here
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
var import_fx_paths = require("./fx-paths.js");
const none = { codexHome: void 0, xdgConfigHome: void 0, xdgStateHome: void 0, appData: void 0, localAppData: void 0 };
assert.strictEqual((0, import_fx_paths.fxConfigDir)("linux", { ...none, xdgConfigHome: "/x" }, "/h"), "/x/fx");
assert.strictEqual((0, import_fx_paths.fxConfigDir)("linux", none, "/h"), "/h/.config/fx");
assert.strictEqual((0, import_fx_paths.fxConfigDir)("darwin", none, "/h"), "/h/.config/fx");
assert.strictEqual((0, import_fx_paths.fxConfigDir)("win32", { ...none, appData: "C:\\Users\\u\\AppData\\Roaming" }, "C:\\Users\\u"), "C:\\Users\\u\\AppData\\Roaming\\fx");
assert.strictEqual((0, import_fx_paths.fxConfigDir)("win32", none, "C:\\Users\\u"), "C:\\Users\\u\\AppData\\Roaming\\fx");
assert.strictEqual((0, import_fx_paths.fxStateDir)("linux", { ...none, xdgStateHome: "/s" }, "/h"), "/s/fx");
assert.strictEqual((0, import_fx_paths.fxStateDir)("linux", none, "/h"), "/h/.local/state/fx");
assert.strictEqual((0, import_fx_paths.fxStateDir)("darwin", none, "/h"), "/h/.local/state/fx");
assert.strictEqual((0, import_fx_paths.fxStateDir)("win32", { ...none, localAppData: "C:\\L" }, "C:\\Users\\u"), "C:\\L\\fx");
assert.strictEqual((0, import_fx_paths.fxStateDir)("win32", none, "C:\\Users\\u"), "C:\\Users\\u\\AppData\\Local\\fx");
assert.strictEqual((0, import_fx_paths.fxConfigDir)("linux", { ...none, xdgConfigHome: "rel/config" }, "/h"), "/h/.config/fx");
assert.strictEqual((0, import_fx_paths.fxStateDir)("darwin", { ...none, xdgStateHome: "./state" }, "/h"), "/h/.local/state/fx");
