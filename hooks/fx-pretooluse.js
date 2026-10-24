#!/usr/bin/env node
// generated from src/hooks/fx-pretooluse.ts by scripts/build: edit there, not here
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
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
function deny(reason) {
  process.stderr.write(`[fx] ${reason}
`);
  process.exit(2);
}
function message(e) {
  return typeof e === "object" && e !== null && "message" in e ? e.message : void 0;
}
let inspect;
let laneCheck;
try {
  const guard = require("../lib/git-guard");
  inspect = guard.inspect;
  if (typeof inspect !== "function") throw new Error("inspect is not a function");
} catch (e) {
  deny(`git guard failed to load (${message(e)}). Denying every command until the plugin is repaired.`);
}
let parseClaudeHookInput;
let parseJson;
try {
  const hookInput = require("../lib/hook-input");
  const json = require("../lib/json");
  ({ parseClaudeHookInput } = hookInput);
  ({ parseJson } = json);
  if (typeof parseClaudeHookInput !== "function") throw new Error("parseClaudeHookInput is not a function");
  if (typeof parseJson !== "function") throw new Error("parseJson is not a function");
} catch (e) {
  deny(`hook input parser failed to load (${message(e)}). Denying every call until the plugin is repaired.`);
}
try {
  const lane = require("../lib/lane-check");
  ({ laneCheck } = lane);
} catch {
  laneCheck = () => null;
}
let routingOffMsg = null;
function routingOff(e) {
  const m = `[fx] dispatch routing off: ${String(message(e) || e)}`;
  process.stderr.write(`${m}
`);
  routingOffMsg = m;
}
let route;
try {
  const dispatch = require("../lib/dispatch-route");
  ({ route } = dispatch);
} catch (e) {
  routingOff(e);
  route = () => null;
}
let checkEdit = null;
let editRulesError = null;
try {
  const rules = require("../lib/edit-rules");
  ({ checkEdit } = rules);
  if (typeof checkEdit !== "function") throw new Error("checkEdit is not a function");
} catch (e) {
  editRulesError = e;
}
let classifyShell;
let namesFxState;
let hardReason;
let shellRulesError = null;
try {
  const rules = require("../lib/shell-rules");
  ({ classifyShell, namesFxState, hardReason } = rules);
  if (typeof classifyShell !== "function" || typeof namesFxState !== "function" || typeof hardReason !== "function") {
    throw new Error("shell-rules is missing an export");
  }
} catch (e) {
  shellRulesError = e;
}
let guardShell = null;
let claudeGuardOutput = null;
let shellGuardError = null;
try {
  const shell = require("../lib/shell-guard");
  const output = require("../lib/guard-output");
  ({ guardShell } = shell);
  ({ claudeGuardOutput } = output);
  if (typeof guardShell !== "function") throw new Error("guardShell is not a function");
  if (typeof claudeGuardOutput !== "function") throw new Error("claudeGuardOutput is not a function");
} catch (e) {
  shellGuardError = e;
}
function emit(stdout, stderr, code) {
  if (stderr) process.stderr.write(stderr);
  if (stdout) process.stdout.write(stdout, () => process.exit(code));
  else process.exit(code);
}
let crashLogDir = null;
try {
  const paths = require("../lib/fx-paths");
  crashLogDir = paths.machinePaths().stateDir;
} catch {
}
function describe(e) {
  try {
    return String(message(e) ?? e);
  } catch {
    return "an error that could not be printed";
  }
}
function shellGuardOff(e, session, cwd) {
  const m = `[fx] shell guard off: ${describe(e)}`;
  try {
    if (crashLogDir === null) throw new Error("no state directory");
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 448 });
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "claude-code", event: "guard", session, cwd, text: "", source: "guard-error", action: "allow", unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, "decisions.jsonl"), `${JSON.stringify(entry)}
`, { mode: 384 });
  } catch {
  }
  emit(JSON.stringify({ systemMessage: m, hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: m } }), `${m}
`, 0);
}
function editRulesOff(e, session, cwd) {
  const m = `[fx] edit rules off: ${describe(e)}`;
  try {
    if (crashLogDir === null) throw new Error("no state directory");
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 448 });
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "claude-code", event: "edit-rule", session, cwd, text: "", source: "error", action: "allow", unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, "decisions.jsonl"), `${JSON.stringify(entry)}
`, { mode: 384 });
  } catch {
  }
  return m;
}
const crashed = (e) => deny(`hook crashed (${e.message}). Denying rather than assuming this is safe.`);
process.on("uncaughtException", crashed);
let raw = "";
process.stdin.on("data", (c) => {
  raw += c;
});
process.stdin.on("end", () => {
  let parsed;
  try {
    parsed = parseJson(raw);
  } catch {
    process.exit(0);
  }
  if (parsed === null) deny("hook crashed (Cannot read properties of null (reading 'tool_name')). Denying rather than assuming this is safe.");
  const r = parseClaudeHookInput(parsed);
  if (!r.ok) process.exit(0);
  const input = r.value;
  const tool = input.tool_name;
  const ti = input.tool_input;
  const cwd = input.cwd || process.cwd();
  if (tool === "Bash") {
    const command = ti?.command;
    if (!command) process.exit(0);
    let verdict;
    try {
      verdict = inspect(command, cwd);
    } catch (e) {
      verdict = { allow: false, reason: `git guard failed to evaluate this command (${message(e)}). Denying rather than assuming it is safe.` };
    }
    if (!verdict.allow) deny(verdict.reason);
    if (typeof command !== "string") deny(`the shell command is not a string (${typeof command}), so the guards cannot read it. Denying rather than assuming it is safe.`);
    if (shellRulesError !== null) deny(`shell rules failed to load (${message(shellRulesError)}). Denying every shell command until the plugin is repaired.`);
    const hard = classifyShell(command);
    const hardDeny = hard.kind === "hard-deny" ? hard.reason : null;
    const off = hardDeny === null ? (e) => shellGuardOff(e, input.session_id ?? null, cwd) : () => emit("", `${hardDeny}
`, 2);
    process.removeListener("uncaughtException", crashed);
    process.on("uncaughtException", off);
    process.on("unhandledRejection", off);
    if (!guardShell || !claudeGuardOutput) {
      off(shellGuardError);
      return;
    }
    const render = claudeGuardOutput;
    guardShell({ command, cwd, harness: "claude-code", sessionId: input.session_id ?? null, now: Date.now() }).then((d) => {
      const out = render(hardDeny === null ? d : { action: "deny", reason: hardDeny, source: "hard-rule" });
      emit(out.stdout, out.stderr, out.exitCode);
    }, off);
    return;
  }
  if (tool === "Write" || tool === "Edit" || tool === "MultiEdit" || tool === "NotebookEdit") {
    const file = ti?.file_path || ti?.path || ti?.notebook_path;
    if (shellRulesError !== null) deny(`shell rules failed to load (${message(shellRulesError)}). Denying every file write until the plugin is repaired.`);
    if (typeof file === "string" && namesFxState(path.resolve(cwd, file))) deny(hardReason("fx-state").slice("[fx] ".length));
    let reason = null;
    try {
      reason = laneCheck(typeof file === "string" ? file : null, cwd);
    } catch {
      reason = null;
    }
    if (reason) deny(reason);
    const off = (e) => emit("", `${editRulesOff(e, input.session_id ?? null, cwd)}
`, 0);
    process.removeListener("uncaughtException", crashed);
    process.on("uncaughtException", off);
    process.on("unhandledRejection", off);
    if (!checkEdit) {
      off(editRulesError);
      return;
    }
    checkEdit({ harness: "claude-code", sessionId: input.session_id ?? null, cwd, toolName: tool, toolInput: ti, now: Date.now() }).then((d) => {
      if (d.action === "refuse") emit("", `${d.reason}
`, 2);
      else emit("", "", 0);
    }, off);
    return;
  }
  if (tool === "Agent" || tool === "Task") {
    process.removeListener("uncaughtException", crashed);
    process.on("uncaughtException", () => process.exit(0));
    let routed = null;
    try {
      routed = route(ti);
    } catch (e) {
      routingOff(e);
    }
    let out = null;
    if (routed) out = { hookSpecificOutput: { hookEventName: "PreToolUse", updatedInput: routed } };
    else if (routingOffMsg) out = { systemMessage: routingOffMsg };
    if (out) process.stdout.write(JSON.stringify(out), () => process.exit(0));
    else process.exit(0);
    return;
  }
  process.exit(0);
});
