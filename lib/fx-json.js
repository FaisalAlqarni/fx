// generated from src/lib/fx-json.ts by scripts/build: edit there, not here
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var fx_json_exports = {};
__export(fx_json_exports, {
  parseFxJson: () => parseFxJson
});
module.exports = __toCommonJS(fx_json_exports);
const COMMANDS = ["test_one", "test_scope", "test_all", "setup", "lint", "coverage"];
const SWITCHES = ["stop_check", "loop_nudge", "edit_rules"];
function parseFxJson(raw) {
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: ".fx.json is not an object" };
  const input = new Map(Object.entries(raw));
  const value = {};
  const problems = [];
  const stacks = input.get("stacks");
  if (stacks !== void 0) {
    if (Array.isArray(stacks) && stacks.every((s) => typeof s === "string")) value.stacks = stacks;
    else problems.push({ key: "stacks", reason: "stacks must be an array of strings" });
  }
  for (const key of COMMANDS) {
    const v = input.get(key);
    if (v === void 0) continue;
    if (typeof v === "string" || v === null) value[key] = v;
    else problems.push({ key, reason: `${key} must be a string or null` });
  }
  const floor = input.get("coverage_floor");
  if (floor !== void 0) {
    if (typeof floor === "number" || floor === null) value.coverage_floor = floor;
    else problems.push({ key: "coverage_floor", reason: "coverage_floor must be a number or null" });
  }
  const companions = input.get("companions");
  if (companions !== void 0) {
    if (typeof companions === "string") value.companions = companions;
    else problems.push({ key: "companions", reason: "companions must be a string" });
  }
  const rename = input.get("glossary_rename");
  if (rename !== void 0) {
    if (rename === "declined") value.glossary_rename = rename;
    else problems.push({ key: "glossary_rename", reason: 'glossary_rename must be "declined"' });
  }
  const scratch = input.get("scratch_migrate");
  if (scratch !== void 0) {
    if (scratch === "declined") value.scratch_migrate = scratch;
    else problems.push({ key: "scratch_migrate", reason: 'scratch_migrate must be "declined"' });
  }
  const hooks = input.get("hooks");
  if (hooks !== void 0) {
    if (typeof hooks === "object" && hooks !== null && !Array.isArray(hooks)) {
      const switches = new Map(Object.entries(hooks));
      const out = {};
      for (const name of SWITCHES) {
        const v = switches.get(name);
        if (v === void 0) continue;
        if (typeof v === "boolean") out[name] = v;
        else problems.push({ key: `hooks.${name}`, reason: `hooks.${name} must be a boolean` });
      }
      value.hooks = out;
    } else problems.push({ key: "hooks", reason: "hooks must be an object" });
  }
  return { ok: true, value, problems };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseFxJson
});
