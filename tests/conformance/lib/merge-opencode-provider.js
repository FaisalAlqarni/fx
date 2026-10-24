#!/usr/bin/env node
// generated from src/tests/conformance/lib/merge-opencode-provider.ts by scripts/build: edit there, not here
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
var fs = __toESM(require("fs"));
var import_json = require("../../../lib/json.js");
const [src = "", dst = "", model, harness] = process.argv.slice(2);
let p;
try {
  p = Reflect.get(Object(Reflect.get(Object((0, import_json.parseJson)(fs.readFileSync(src, "utf8"))), "provider")), "llamacpp");
} catch {
  p = null;
}
if (!p) process.exit(3);
let cfg = {};
try {
  cfg = (0, import_json.parseJson)(fs.readFileSync(dst, "utf8"));
} catch {
}
if (cfg === null) throw new TypeError("Cannot convert undefined or null to object");
Object.assign(Object(cfg), { model, autoupdate: false, share: "disabled", provider: { llamacpp: p } });
if (harness === "opencode-v2") {
  if (typeof cfg !== "object") throw new TypeError(`Cannot create property 'permissions' on ${typeof cfg} '${cfg}'`);
  Object.assign(cfg, {
    permissions: [{ action: "question", resource: "*", effect: "deny" }],
    // The user's own answer, see INSTALL.md: fx does not grant nested dispatch on 2.x.
    agents: { general: { permissions: [{ action: "subagent", resource: "*", effect: "allow" }] } }
  });
}
fs.writeFileSync(dst, JSON.stringify(cfg, null, 2) + "\n", { mode: 384 });
fs.chmodSync(dst, 384);
