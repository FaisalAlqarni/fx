// generated from src/lib/session-input.ts by scripts/build: edit there, not here
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
var session_input_exports = {};
__export(session_input_exports, {
  parseJournalLine: () => parseJournalLine
});
module.exports = __toCommonJS(session_input_exports);
const TOOLS = ["edit", "read", "shell", "other"];
const SIGNALS = ["repeat-failure", "passive-stall", "unverified-writes"];
const OUTCOMES = ["ok", "fail", "unknown"];
function parseJournalLine(raw) {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const f = new Map(Object.entries(raw));
  const t = f.get("t");
  if (typeof t !== "number" || !Number.isFinite(t)) return null;
  const str = (k) => {
    const v = f.get(k);
    return typeof v === "string" ? v : null;
  };
  switch (f.get("kind")) {
    case "prompt": {
      const text = f.get("text");
      if (text !== null && typeof text !== "string") return null;
      const agentType = f.get("agentType");
      if (agentType === void 0) return { t, kind: "prompt", text };
      if (agentType !== null && typeof agentType !== "string") return null;
      return { t, kind: "prompt", text, agentType };
    }
    case "tool": {
      const tool = TOOLS.find((k) => k === f.get("tool"));
      const outcome = OUTCOMES.find((k) => k === f.get("outcome"));
      const command = f.get("command");
      const verified = f.get("verified");
      if (!tool || !outcome || typeof verified !== "boolean") return null;
      if (command !== null && typeof command !== "string") return null;
      return { t, kind: "tool", tool, command, outcome, verified };
    }
    case "edit": {
      const path = str("path");
      return path === null ? null : { t, kind: "edit", path };
    }
    case "nudge": {
      const signal = SIGNALS.find((k) => k === f.get("signal"));
      return signal ? { t, kind: "nudge", signal } : null;
    }
    case "stop-block":
      return { t, kind: "stop-block" };
    case "fx-json-hooks": {
      const hash = str("hash");
      return hash === null ? null : { t, kind: "fx-json-hooks", hash };
    }
    default:
      return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseJournalLine
});
