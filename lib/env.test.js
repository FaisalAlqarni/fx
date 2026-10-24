// generated from src/lib/env.test.ts by scripts/build: edit there, not here
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
var import_env = require("./env.js");
assert.strictEqual((0, import_env.parseFxEnv)({ CODEX_HOME: "/h" }).codexHome, "/h");
assert.strictEqual((0, import_env.parseFxEnv)({ CODEX_HOME: "" }).codexHome, void 0);
assert.strictEqual((0, import_env.parseFxEnv)({}).codexHome, void 0);
const xdg = (0, import_env.parseFxEnv)({ XDG_CONFIG_HOME: "/c", XDG_STATE_HOME: "/s", APPDATA: "C:\\A", LOCALAPPDATA: "C:\\L" });
assert.deepStrictEqual(
  [xdg.xdgConfigHome, xdg.xdgStateHome, xdg.appData, xdg.localAppData],
  ["/c", "/s", "C:\\A", "C:\\L"]
);
assert.strictEqual((0, import_env.parseFxEnv)({ XDG_CONFIG_HOME: "" }).xdgConfigHome, void 0);
const empty = (0, import_env.parseFxEnv)({ XDG_STATE_HOME: "", APPDATA: "", LOCALAPPDATA: "" });
assert.deepStrictEqual([empty.xdgStateHome, empty.appData, empty.localAppData], [void 0, void 0, void 0]);
