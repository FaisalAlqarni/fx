// generated from src/lib/decision-log.ts by scripts/build: edit there, not here
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
var decision_log_exports = {};
__export(decision_log_exports, {
  logDecision: () => logDecision
});
module.exports = __toCommonJS(decision_log_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_fx_paths = require("./fx-paths.js");
var import_thresholds = require("./thresholds.js");
var import_redact = require("./redact.js");
const LOCK_STALE_MS = 1e4;
function rotate(dir, file) {
  const lock = path.join(dir, "decisions.rotate.lock");
  try {
    fs.closeSync(fs.openSync(lock, "wx", 384));
  } catch {
    let age = 0;
    try {
      age = Date.now() - fs.statSync(lock).mtimeMs;
    } catch {
      return;
    }
    if (age <= LOCK_STALE_MS) return;
    fs.rmSync(lock, { force: true });
    try {
      fs.closeSync(fs.openSync(lock, "wx", 384));
    } catch {
      return;
    }
  }
  try {
    if (fs.statSync(file).size > import_thresholds.LOG_ROTATE_BYTES) fs.renameSync(file, path.join(dir, "decisions.1.jsonl"));
  } finally {
    fs.rmSync(lock, { force: true });
  }
}
function logDecision(entry, stateDir) {
  try {
    const dir = stateDir ?? (0, import_fx_paths.machinePaths)().stateDir;
    const file = path.join(dir, "decisions.jsonl");
    fs.mkdirSync(dir, { recursive: true, mode: 448 });
    const posix = process.platform !== "win32";
    if (posix) fs.chmodSync(dir, 448);
    let size = 0;
    try {
      size = fs.statSync(file).size;
    } catch {
    }
    if (size > import_thresholds.LOG_ROTATE_BYTES) rotate(dir, file);
    const redacted = Object.fromEntries(Object.entries(entry).map(([k, v]) => [k, typeof v === "string" ? (0, import_redact.redact)(v, import_redact.CAP_COMMAND, k !== "cwd") : v]));
    const fd = fs.openSync(file, "a", 384);
    try {
      if (posix) fs.fchmodSync(fd, 384);
      fs.writeSync(fd, `${JSON.stringify(redacted)}
`);
    } finally {
      fs.closeSync(fd);
    }
  } catch (e) {
    process.stderr.write(`[fx] decision log: ${e instanceof Error ? e.message : String(e)}
`);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  logDecision
});
