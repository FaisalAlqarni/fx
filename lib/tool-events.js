// generated from src/lib/tool-events.ts by scripts/build: edit there, not here
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
var tool_events_exports = {};
__export(tool_events_exports, {
  classifyTool: () => classifyTool,
  editedPaths: () => editedPaths,
  toolOutcomeAndOutput: () => toolOutcomeAndOutput
});
module.exports = __toCommonJS(tool_events_exports);
var path = __toESM(require("path"));
var import_shell_rules = require("./shell-rules.js");
const EDIT = /* @__PURE__ */ new Set(["Write", "Edit", "MultiEdit", "NotebookEdit", "apply_patch", "edit", "write"]);
const READ = /* @__PURE__ */ new Set(["Read", "Grep", "Glob", "read", "grep", "glob", "list"]);
const SHELL = /* @__PURE__ */ new Set(["Bash", "exec_command", "bash", "shell"]);
const HAS = {
  "claude-code": (n) => ["Write", "Edit", "MultiEdit", "NotebookEdit", "Read", "Grep", "Glob", "Bash"].includes(n),
  codex: (n) => n === "apply_patch" || n === "Bash" || n === "exec_command",
  opencode: (n) => ["edit", "write", "apply_patch", "read", "grep", "glob", "list", "bash"].includes(n),
  "opencode-v2": (n) => ["edit", "write", "apply_patch", "read", "grep", "glob", "list", "shell", "bash"].includes(n)
};
function classifyTool(harness, toolName, command) {
  if (!HAS[harness](toolName)) return "other";
  if (EDIT.has(toolName)) return "edit";
  if (READ.has(toolName)) return "read";
  if (!SHELL.has(toolName)) return "other";
  return command !== null && (0, import_shell_rules.classifyShell)(command, process.platform !== "win32").kind === "read-only" ? "read" : "shell";
}
const TAIL = 4096;
const last4k = (s) => s.length > TAIL ? s.slice(-TAIL) : s;
const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (r, keys) => keys.map((k) => r[k]).filter((v) => typeof v === "string" && v !== "");
function toolOutcomeAndOutput(harness, event, toolResponse, interrupted = false) {
  if (harness === "claude-code") {
    const text = typeof toolResponse === "string" ? toolResponse : isRecord(toolResponse) ? strings(toolResponse, ["stdout", "stderr"]).join("\n") : "";
    const stopped = interrupted || isRecord(toolResponse) && toolResponse.interrupted === true;
    if (stopped) return { outcome: "unknown", output: last4k(text), interrupted: true };
    return { outcome: event === "PostToolUseFailure" ? "fail" : "ok", output: last4k(text) };
  }
  if (typeof toolResponse === "string") {
    const header = toolResponse.split(/^Output:$/m)[0] ?? "";
    const m = /^(?:Exit code:|Process exited with code) (\d+)/m.exec(header);
    return { outcome: m ? Number(m[1]) === 0 ? "ok" : "fail" : "unknown", output: last4k(toolResponse) };
  }
  if (isRecord(toolResponse)) {
    const code = [toolResponse.exit_code, toolResponse.exitCode].find((v) => typeof v === "number");
    const output = strings(toolResponse, ["output", "stdout", "stderr"]).join("\n");
    return { outcome: code === void 0 ? "unknown" : code === 0 ? "ok" : "fail", output: last4k(output) };
  }
  return { outcome: "unknown", output: "" };
}
const SHELL_TOOLS = ["Bash", "exec_command"];
function editedPaths(harness, toolName, toolInput, cwd) {
  if (!isRecord(toolInput)) return [];
  const abs = (p2) => path.resolve(cwd, p2);
  const patchPaths = (text) => {
    const { extractPatchPaths } = require("./patch-paths.js");
    return extractPatchPaths(text).map(abs);
  };
  const command = toolInput.command;
  if (harness === "codex" && SHELL_TOOLS.includes(toolName) && typeof command === "string" && /\bapply_patch\b/.test(command)) return patchPaths(command);
  if (classifyTool(harness, toolName, null) !== "edit") return [];
  if (toolName === "apply_patch") return patchPaths(command ?? toolInput.patchText);
  const p = [toolInput.file_path, toolInput.notebook_path, toolInput.filePath].find((v) => typeof v === "string" && v !== "");
  return p === void 0 ? [] : [abs(p)];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  classifyTool,
  editedPaths,
  toolOutcomeAndOutput
});
