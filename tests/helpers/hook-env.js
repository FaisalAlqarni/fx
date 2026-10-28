// generated from src/tests/helpers/hook-env.ts by scripts/build: edit there, not here
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
var hook_env_exports = {};
__export(hook_env_exports, {
  applyScratchEnv: () => applyScratchEnv,
  readDecisionLog: () => readDecisionLog,
  rootToToken: () => rootToToken,
  runHook: () => runHook,
  scratchHookEnv: () => scratchHookEnv
});
module.exports = __toCommonJS(hook_env_exports);
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_env = require("../../lib/env.js");
var import_fx_paths = require("../../lib/fx-paths.js");
var import_json = require("../../lib/json.js");
function scratchHookEnv() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fx-hook-env-"));
  const home = path.join(root, "home");
  fs.mkdirSync(home);
  fs.mkdirSync(path.join(root, "tmp"));
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: path.join(root, "config"),
    XDG_STATE_HOME: path.join(root, "state"),
    APPDATA: path.join(root, "appdata"),
    LOCALAPPDATA: path.join(root, "localappdata"),
    TMPDIR: path.join(root, "tmp")
  };
  const fx = (0, import_env.parseFxEnv)(env);
  const dirs = { root, home, config: (0, import_fx_paths.fxConfigDir)(process.platform, fx, home), state: (0, import_fx_paths.fxStateDir)(process.platform, fx, home) };
  return { env, dirs, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
function applyScratchEnv() {
  const { env, dirs, cleanup } = scratchHookEnv();
  const keys = ["HOME", "USERPROFILE", "XDG_CONFIG_HOME", "XDG_STATE_HOME", "APPDATA", "LOCALAPPDATA", "TMPDIR"];
  const saved = keys.map((k) => [k, process.env[k]]);
  for (const k of keys) process.env[k] = env[k];
  return {
    dirs,
    restore: () => {
      for (const [k, v] of saved) {
        if (v === void 0) delete process.env[k];
        else process.env[k] = v;
      }
      cleanup();
    }
  };
}
function readDecisionLog(dirs) {
  const file = path.join(dirs.state, "decisions.jsonl");
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => (0, import_json.parseJson)(line));
}
function runHook(file, payload, env, opts = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const child = (0, import_child_process.spawn)("node", [file, ...opts.args ?? []], { env, cwd: opts.cwd });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8").on("data", (d) => {
      out += d;
    });
    child.stderr.setEncoding("utf8").on("data", (d) => {
      err += d;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, out, err, ms: Date.now() - start }));
    if (payload !== void 0) child.stdin.write(typeof payload === "string" ? payload : JSON.stringify(payload));
    child.stdin.end();
  });
}
function rootToToken(text, root) {
  return [fs.realpathSync(root), root].reduce((out, from) => out.split(from).join("<root>"), text);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyScratchEnv,
  readDecisionLog,
  rootToToken,
  runHook,
  scratchHookEnv
});
