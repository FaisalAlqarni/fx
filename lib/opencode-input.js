// generated from src/lib/opencode-input.ts by scripts/build: edit there, not here
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
var opencode_input_exports = {};
__export(opencode_input_exports, {
  parseOpencodeAgent: () => parseOpencodeAgent,
  parseOpencodeToolEvent: () => parseOpencodeToolEvent,
  parseOpencodeV1Call: () => parseOpencodeV1Call,
  parseOpencodeV1Result: () => parseOpencodeV1Result,
  parseOpencodeV2Result: () => parseOpencodeV2Result
});
module.exports = __toCommonJS(opencode_input_exports);
function isRecord(v) {
  return typeof v === "object" && v !== null;
}
function str(v) {
  return typeof v === "string" ? v : void 0;
}
function obj(v) {
  return isRecord(v) ? v : {};
}
function parseOpencodeToolEvent(raw) {
  if (!isRecord(raw)) return { ok: false, reason: "opencode event is not an object" };
  return {
    ok: true,
    value: {
      tool: str(raw.tool),
      args: obj(raw.args),
      input: obj(raw.input),
      sessionID: str(raw.sessionID),
      messageID: str(raw.messageID),
      id: str(raw.id)
    }
  };
}
function parseOpencodeV1Call(input, output) {
  return parseOpencodeToolEvent({ tool: obj(input).tool, args: obj(output).args, sessionID: obj(input).sessionID });
}
function outcomeOf(exit) {
  return typeof exit === "number" ? exit === 0 ? "ok" : "fail" : "unknown";
}
function parseOpencodeV1Result(input, output) {
  const out = obj(output);
  return {
    tool: str(obj(input).tool),
    sessionID: str(obj(input).sessionID),
    args: obj(obj(input).args),
    outcome: outcomeOf(obj(out.metadata).exit),
    output: str(out.output) ?? "",
    // A null exit is a killed process: its partial output never verifies.
    ...obj(out.metadata).exit === null ? { interrupted: true } : {}
  };
}
function parseOpencodeV2Result(raw) {
  const ev = obj(raw);
  const exit = obj(ev.metadata).exit ?? ev.exit;
  return {
    tool: str(ev.tool),
    sessionID: str(ev.sessionID),
    args: obj(ev.input),
    outcome: ev.status === "error" ? "fail" : outcomeOf(exit),
    output: str(ev.output) ?? ""
  };
}
function parseOpencodeAgent(input) {
  return str(obj(input).agent);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseOpencodeAgent,
  parseOpencodeToolEvent,
  parseOpencodeV1Call,
  parseOpencodeV1Result,
  parseOpencodeV2Result
});
