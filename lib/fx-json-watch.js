// generated from src/lib/fx-json-watch.ts by scripts/build: edit there, not here
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
var fx_json_watch_exports = {};
__export(fx_json_watch_exports, {
  FX_JSON_NOTICE: () => FX_JSON_NOTICE,
  fxJsonFingerprint: () => fxJsonFingerprint,
  fxJsonNotice: () => fxJsonNotice
});
module.exports = __toCommonJS(fx_json_watch_exports);
var import_crypto = require("crypto");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_decision_log = require("./decision-log.js");
var import_journal = require("./journal.js");
var import_json = require("./json.js");
var import_repo_config = require("./repo-config.js");
const FX_JSON_NOTICE = "[fx] notice: the hook switches in .fx.json changed during this session. An agent can edit that file; check the change.";
function fxJsonFingerprint(cwd) {
  let raw = {};
  try {
    raw = (0, import_json.parseJson)(fs.readFileSync(path.join((0, import_repo_config.repoRoot)(cwd), ".fx.json"), "utf8"));
  } catch {
  }
  const f = new Map(typeof raw === "object" && raw !== null ? Object.entries(raw) : []);
  return (0, import_crypto.createHash)("sha256").update(JSON.stringify({ hooks: f.get("hooks") ?? null })).digest("hex");
}
function fxJsonNotice(sessionId, cwd, now, harness = "claude-code", memory) {
  try {
    const key = (0, import_journal.journalKey)(sessionId);
    if (key === null) return null;
    const hash = fxJsonFingerprint(cwd);
    let last;
    if (memory) last = memory.get(key);
    else {
      const event = (0, import_journal.readJournal)(key).findLast((e) => e.kind === "fx-json-hooks");
      last = event?.kind === "fx-json-hooks" ? event.hash : void 0;
    }
    if (last === hash) return null;
    if (memory) memory.set(key, hash);
    else (0, import_journal.appendEvent)(key, { t: now, kind: "fx-json-hooks", hash });
    if (last === void 0) return null;
    (0, import_decision_log.logDecision)({ ts: new Date(now).toISOString(), harness, event: "health", session: sessionId, cwd, text: FX_JSON_NOTICE, source: "fx-json", action: "notice" });
    return FX_JSON_NOTICE;
  } catch {
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FX_JSON_NOTICE,
  fxJsonFingerprint,
  fxJsonNotice
});
