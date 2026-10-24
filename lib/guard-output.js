// generated from src/lib/guard-output.ts by scripts/build: edit there, not here
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
var guard_output_exports = {};
__export(guard_output_exports, {
  claudeGuardOutput: () => claudeGuardOutput,
  codexGuardOutput: () => codexGuardOutput
});
module.exports = __toCommonJS(guard_output_exports);
function claudeGuardOutput(d) {
  const reason = d.reason ?? "";
  switch (d.action) {
    case "allow":
      return { stdout: "", stderr: "", exitCode: 0 };
    case "warn":
      return { stdout: JSON.stringify({ systemMessage: reason, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: reason } }), stderr: "", exitCode: 0 };
    case "ask":
      return { stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: reason } }), stderr: "", exitCode: 0 };
    case "deny":
      return { stdout: "", stderr: `${reason}
`, exitCode: 2 };
  }
}
function codexGuardOutput(d) {
  return claudeGuardOutput(d.action === "ask" ? { ...d, action: "warn" } : d);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  claudeGuardOutput,
  codexGuardOutput
});
