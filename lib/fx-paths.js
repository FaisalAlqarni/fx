// generated from src/lib/fx-paths.ts by scripts/build: edit there, not here
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
var fx_paths_exports = {};
__export(fx_paths_exports, {
  fxConfigDir: () => fxConfigDir,
  fxStateDir: () => fxStateDir,
  machinePaths: () => machinePaths
});
module.exports = __toCommonJS(fx_paths_exports);
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_env = require("./env.js");
const xdg = (value) => value && path.posix.isAbsolute(value) ? value : void 0;
function fxConfigDir(platform, env, home) {
  if (platform === "win32") return path.win32.join(env.appData ?? path.win32.join(home, "AppData", "Roaming"), "fx");
  return path.posix.join(xdg(env.xdgConfigHome) ?? path.posix.join(home, ".config"), "fx");
}
function fxStateDir(platform, env, home) {
  if (platform === "win32") return path.win32.join(env.localAppData ?? path.win32.join(home, "AppData", "Local"), "fx");
  return path.posix.join(xdg(env.xdgStateHome) ?? path.posix.join(home, ".local", "state"), "fx");
}
function machinePaths() {
  const env = (0, import_env.parseFxEnv)(process.env);
  const configDir = fxConfigDir(process.platform, env, os.homedir());
  return { configDir, stateDir: fxStateDir(process.platform, env, os.homedir()) };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fxConfigDir,
  fxStateDir,
  machinePaths
});
