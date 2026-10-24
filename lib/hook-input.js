// generated from src/lib/hook-input.ts by scripts/build: edit there, not here
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
var hook_input_exports = {};
__export(hook_input_exports, {
  parseClaudeHookInput: () => parseClaudeHookInput,
  parseCodexHookInput: () => parseCodexHookInput,
  subagentId: () => subagentId
});
module.exports = __toCommonJS(hook_input_exports);
const NOT_AN_OBJECT = "hook input is not an object";
function isRecord(v) {
  return typeof v === "object" && v !== null;
}
function str(v) {
  return typeof v === "string" ? v : void 0;
}
function toolInput(v) {
  if (!v) return {};
  return isRecord(v) ? v : null;
}
function subagentId(id) {
  return id === void 0 || id === null || id === "" ? null : String(id);
}
function parseClaudeHookInput(raw) {
  if (!isRecord(raw) || Array.isArray(raw)) return { ok: false, reason: NOT_AN_OBJECT };
  return {
    ok: true,
    value: {
      hook_event_name: raw.hook_event_name,
      tool_name: str(raw.tool_name),
      tool_input: toolInput(raw.tool_input),
      tool_response: raw.tool_response,
      error: str(raw.error),
      is_interrupt: typeof raw.is_interrupt === "boolean" ? raw.is_interrupt : void 0,
      cwd: str(raw.cwd),
      transcript_path: str(raw.transcript_path),
      session_id: str(raw.session_id),
      prompt: str(raw.prompt),
      agent_id: raw.agent_id,
      agent_type: str(raw.agent_type),
      stop_hook_active: raw.stop_hook_active === true,
      last_assistant_message: str(raw.last_assistant_message) ?? null
    }
  };
}
function parseCodexHookInput(raw) {
  if (!isRecord(raw) || Array.isArray(raw)) return { ok: false, reason: NOT_AN_OBJECT };
  const ti = toolInput(raw.tool_input);
  return {
    ok: true,
    value: {
      hook_event_name: raw.hook_event_name,
      tool_name: raw.tool_name,
      tool_input: ti,
      // exec_command reaches hooks as Bash with a string command (red team M21).
      tool_response: raw.tool_response,
      command: raw.tool_name === "Bash" ? str(ti?.command) : void 0,
      cwd: str(raw.cwd),
      session_id: str(raw.session_id),
      prompt: str(raw.prompt),
      agent_id: raw.agent_id,
      agent_type: str(raw.agent_type),
      stop_hook_active: raw.stop_hook_active === true,
      last_assistant_message: str(raw.last_assistant_message) ?? null
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseClaudeHookInput,
  parseCodexHookInput,
  subagentId
});
