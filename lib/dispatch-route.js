// generated from src/lib/dispatch-route.ts by scripts/build: edit there, not here
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
var dispatch_route_exports = {};
__export(dispatch_route_exports, {
  hasCapableLine: () => hasCapableLine,
  isGeneralType: () => isGeneralType,
  route: () => route
});
module.exports = __toCommonJS(dispatch_route_exports);
const GENERAL = /* @__PURE__ */ new Set(["general-purpose", "claude", "Plan"]);
const STANDARD = "sonnet";
const CHEAP = /* @__PURE__ */ new Set(["sonnet", "haiku"]);
function isRecord(v) {
  return typeof v === "object" && v !== null;
}
function isGeneralType(ti) {
  return !ti.subagent_type || typeof ti.subagent_type === "string" && GENERAL.has(ti.subagent_type);
}
function hasCapableLine(prompt) {
  return /^\s*Capable because:/m.test(String(prompt || ""));
}
function route(ti) {
  if (!isRecord(ti)) return null;
  const type = ti.subagent_type || "general-purpose";
  if (typeof type !== "string" || type === "fork") return null;
  if (!ti.model) return GENERAL.has(type) ? { ...ti, model: STANDARD } : null;
  const cheap = typeof ti.model === "string" && CHEAP.has(ti.model);
  if (!cheap && !hasCapableLine(ti.prompt)) {
    return { ...ti, model: STANDARD };
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  hasCapableLine,
  isGeneralType,
  route
});
