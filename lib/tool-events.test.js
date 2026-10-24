// generated from src/lib/tool-events.test.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var assert = __toESM(require("assert"));
var path = __toESM(require("path"));
var import_tool_events = require("./tool-events.js");
assert.strictEqual((0, import_tool_events.classifyTool)("claude-code", "Bash", "git status"), "read");
assert.strictEqual((0, import_tool_events.classifyTool)("claude-code", "Bash", "npm test"), "shell");
assert.strictEqual((0, import_tool_events.classifyTool)("codex", "apply_patch", null), "edit");
assert.strictEqual((0, import_tool_events.classifyTool)("opencode-v2", "shell", "ls"), "read");
assert.strictEqual((0, import_tool_events.classifyTool)("claude-code", "WebFetch", null), "other");
for (const t of ["Write", "Edit", "MultiEdit", "NotebookEdit"]) assert.strictEqual((0, import_tool_events.classifyTool)("claude-code", t, null), "edit", t);
for (const t of ["Read", "Grep", "Glob"]) assert.strictEqual((0, import_tool_events.classifyTool)("claude-code", t, null), "read", t);
for (const t of ["edit", "write", "apply_patch"]) assert.strictEqual((0, import_tool_events.classifyTool)("opencode", t, null), "edit", t);
for (const t of ["read", "grep", "glob", "list"]) assert.strictEqual((0, import_tool_events.classifyTool)("opencode", t, null), "read", t);
assert.strictEqual((0, import_tool_events.classifyTool)("codex", "exec_command", "make test"), "shell");
assert.strictEqual((0, import_tool_events.classifyTool)("opencode", "bash", "make test"), "shell");
assert.strictEqual((0, import_tool_events.classifyTool)("claude-code", "Bash", null), "shell", "a shell call with no readable command is not read-only");
assert.strictEqual((0, import_tool_events.classifyTool)("claude-code", "apply_patch", null), "other", "apply_patch is not a Claude Code tool");
let r = (0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUse", { stdout: "out", stderr: "err", interrupted: false });
assert.deepStrictEqual(r, { outcome: "ok", output: "out\nerr" });
r = (0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUseFailure", "Exit code 1\nboom");
assert.deepStrictEqual(r, { outcome: "fail", output: "Exit code 1\nboom" });
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUse", "a plain string").outcome, "ok");
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUse", void 0).output, "");
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUse", { stdout: "x".repeat(5e3) }).output.length, 4096, "the last 4 KB");
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUse", { stdout: `${"a".repeat(5e3)}END` }).output.endsWith("END"), true);
assert.deepStrictEqual((0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUse", { stdout: "partial", stderr: "", interrupted: true }), { outcome: "unknown", output: "partial", interrupted: true });
assert.deepStrictEqual((0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUseFailure", "Interrupted", true), { outcome: "unknown", output: "Interrupted", interrupted: true });
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUseFailure", "Exit code 1", false).outcome, "fail");
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("claude-code", "PostToolUse", { stdout: "x", interrupted: false }).outcome, "ok");
r = (0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", "Exit code: 1\nWall time: 0.2s\nOutput:\nboom");
assert.strictEqual(r.outcome, "fail");
assert.ok(r.output.includes("boom"));
assert.deepStrictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", { exit_code: 0, output: "ok" }), { outcome: "ok", output: "ok" });
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", { exitCode: 2, stdout: "a", stderr: "b" }).outcome, "fail");
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", "Exit code: 0\nOutput:\nfine").outcome, "ok");
assert.deepStrictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", "no code here"), { outcome: "unknown", output: "no code here" });
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", { exit_code: "x" }).outcome, "unknown");
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", void 0).outcome, "unknown");
const unified = (status) => `Chunk ID: 3f2a
Wall time: 0.0123 seconds
${status}
Original token count: 2
Output:
boom`;
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", unified("Process exited with code 0")).outcome, "ok");
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", unified("Process exited with code 1")).outcome, "fail");
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", unified("Process running with session ID 7")).outcome, "unknown", "still running: no exit yet");
const running = "Chunk ID: 3f2a\nWall time: 10.0000 seconds\nProcess running with session ID 7\nOutput:\nProcess exited with code 0\nExit code: 0";
assert.strictEqual((0, import_tool_events.toolOutcomeAndOutput)("codex", "PostToolUse", running).outcome, "unknown", "an exit line in the output is not the header");
const cwd = path.resolve("/work/repo");
assert.deepStrictEqual((0, import_tool_events.editedPaths)("claude-code", "Edit", { file_path: "/work/repo/a.ts" }, cwd), ["/work/repo/a.ts"]);
assert.deepStrictEqual((0, import_tool_events.editedPaths)("claude-code", "NotebookEdit", { notebook_path: "n.ipynb" }, cwd), [path.join(cwd, "n.ipynb")]);
assert.deepStrictEqual((0, import_tool_events.editedPaths)("codex", "apply_patch", { command: "*** Begin Patch\n*** Update File: x.js\n*** End Patch" }, cwd), [path.join(cwd, "x.js")]);
assert.deepStrictEqual((0, import_tool_events.editedPaths)("opencode", "edit", { filePath: "src/b.ts" }, cwd), [path.join(cwd, "src/b.ts")]);
const heredoc = "apply_patch <<'PATCH'\n*** Begin Patch\n*** Update File: s.js\n*** Add File: t.js\n*** End Patch\nPATCH";
assert.deepStrictEqual((0, import_tool_events.editedPaths)("codex", "Bash", { command: heredoc }, cwd), [path.join(cwd, "s.js"), path.join(cwd, "t.js")]);
assert.deepStrictEqual((0, import_tool_events.editedPaths)("codex", "exec_command", { command: heredoc }, cwd), [path.join(cwd, "s.js"), path.join(cwd, "t.js")]);
assert.deepStrictEqual((0, import_tool_events.editedPaths)("codex", "Bash", { command: 'echo "*** Update File: s.js"' }, cwd), [], "quoting a header is not a patch");
assert.deepStrictEqual((0, import_tool_events.editedPaths)("codex", "Bash", { command: "ls" }, cwd), []);
assert.deepStrictEqual((0, import_tool_events.editedPaths)("claude-code", "Bash", { command: heredoc }, cwd), [], "only Codex runs a shell apply_patch");
assert.deepStrictEqual((0, import_tool_events.editedPaths)("claude-code", "Edit", {}, cwd), []);
assert.deepStrictEqual((0, import_tool_events.editedPaths)("claude-code", "Edit", null, cwd), []);
assert.deepStrictEqual((0, import_tool_events.editedPaths)("claude-code", "Read", { file_path: "/x" }, cwd), [], "a read edits nothing");
console.log("tool-events.test.js: ok");
