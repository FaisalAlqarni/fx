#!/usr/bin/env node
// generated from src/hooks/fx-codex.ts by scripts/build: edit there, not here
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
function message(e) {
  return typeof e === "object" && e !== null && "message" in e ? e.message : void 0;
}
let roles;
let rolesLoadError;
try {
  roles = require("../lib/plant-roles");
} catch (e) {
  rolesLoadError = e;
}
let extractPatchPaths;
let patchPathsError;
try {
  const patchPaths = require("../lib/patch-paths");
  if (typeof patchPaths.extractPatchPaths !== "function") throw new Error("extractPatchPaths is not a function");
  ({ extractPatchPaths } = patchPaths);
} catch (e) {
  patchPathsError = e;
}
let inspect;
let guardLoadError;
try {
  const guard = require("../lib/git-guard");
  inspect = guard.inspect;
  if (typeof inspect !== "function") throw new Error("inspect is not a function");
} catch (e) {
  guardLoadError = e;
}
let laneCheck;
try {
  const lane = require("../lib/lane-check");
  ({ laneCheck } = lane);
} catch {
  laneCheck = () => null;
}
let parseCodexHookInput;
let subagentId;
let parseJson;
let parserLoadError;
try {
  const hookInput = require("../lib/hook-input");
  const json = require("../lib/json");
  ({ parseCodexHookInput, subagentId } = hookInput);
  ({ parseJson } = json);
  if (typeof parseCodexHookInput !== "function") throw new Error("parseCodexHookInput is not a function");
  if (typeof subagentId !== "function") throw new Error("subagentId is not a function");
  if (typeof parseJson !== "function") throw new Error("parseJson is not a function");
} catch (e) {
  parserLoadError = e;
}
function deny(reason) {
  process.stderr.write(`[fx] ${reason}
`);
  process.exit(2);
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
let classifyShell = null;
let namesFxState = null;
let hardReason = null;
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
let codexGuardOutput = null;
let shellGuardError = null;
try {
  const shell = require("../lib/shell-guard");
  const output = require("../lib/guard-output");
  ({ guardShell } = shell);
  ({ codexGuardOutput } = output);
  if (typeof guardShell !== "function") throw new Error("guardShell is not a function");
  if (typeof codexGuardOutput !== "function") throw new Error("codexGuardOutput is not a function");
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
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "codex", event: "guard", session, cwd, text: "", source: "guard-error", action: "allow", unavailable: m.slice(0, 200) };
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
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "codex", event: "edit-rule", session, cwd, text: "", source: "error", action: "allow", unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, "decisions.jsonl"), `${JSON.stringify(entry)}
`, { mode: 384 });
  } catch {
  }
  return m;
}
const crashed = (e) => deny(`hook crashed (${describe(e)}). Denying rather than assuming this is safe.`);
function checkPatchPaths(patchText, cwd, fromShell) {
  let paths;
  try {
    if (!extractPatchPaths) throw patchPathsError ?? new Error("extractPatchPaths is not loaded");
    paths = extractPatchPaths(patchText);
  } catch (e) {
    deny(`lib/patch-paths failed (${message(e)}), so the paths of this apply_patch cannot be read. Denying every apply_patch until the plugin is repaired.`);
  }
  if (paths.length > 0) {
    if (shellRulesError !== null || !namesFxState || !hardReason) {
      deny(`shell rules failed to load (${message(shellRulesError)}). Denying every file write until the plugin is repaired.`);
    }
    for (const p of paths) {
      if (namesFxState(path.resolve(cwd, p))) deny(hardReason("fx-state").slice("[fx] ".length));
    }
  }
  if (fromShell && paths.length === 0) {
    process.stderr.write("[fx] the lane check could not read the paths of this apply_patch, so it did not check them.\n");
  }
  for (const p of paths) {
    let reason = null;
    try {
      reason = laneCheck(path.resolve(cwd, p), cwd);
    } catch {
      reason = null;
    }
    if (reason) deny(reason);
  }
}
const SHELL_APPLY_PATCH = /(?:^|[\n;&|({`]|\$\(|\b(?:ba|z|da)?sh\s+-\w*c\s+["']|\b(?:env|time|xargs|exec|command|nohup|sudo)\b[^\n;&|]*?)\s*apply_patch\b/;
function handlePreToolUse(input) {
  process.on("uncaughtException", crashed);
  process.on("unhandledRejection", crashed);
  const tool = input.tool_name;
  const ti = input.tool_input;
  const cwd = input.cwd || process.cwd();
  const agentId = input.agent_id;
  if (agentId && (rolesLoadError || !roles)) {
    deny(`lib/plant-roles failed to load (${message(rolesLoadError)}), so subagent ${agentId}'s role cannot be verified; refusing the call. Reinstall the plugin.`);
  }
  if (agentId && roles) {
    let known = null;
    try {
      known = roles.lookupAgentIdentity(agentId);
    } catch {
      known = null;
    }
    const mustRefuseWrites = known === null ? true : roles.isReadOnlyAgent(known);
    let cleared = false;
    if (tool === "Bash") {
      try {
        cleared = !roles.isWritingToolCall(tool, ti);
      } catch {
        cleared = false;
      }
    }
    if (mustRefuseWrites && !cleared) {
      deny(known ? `${known} is read-only and must not write (blocked: ${tool}).` : `subagent ${agentId} was never recorded at SubagentStart, so its role cannot be verified; refusing the write rather than assuming it is safe.`);
    }
  }
  if (tool === "Bash") {
    const raw2 = ti?.command;
    if (!raw2) process.exit(0);
    if (guardLoadError || !inspect) {
      deny(`git guard failed to load (${message(guardLoadError)}). Denying every command until the plugin is repaired.`);
    }
    let verdict;
    try {
      verdict = inspect(raw2, cwd);
    } catch (e) {
      verdict = { allow: false, reason: `git guard failed to evaluate this command (${message(e)}). Denying rather than assuming it is safe.` };
    }
    if (!verdict.allow) deny(verdict.reason);
    const command = input.command;
    if (command === void 0) deny(`the shell command is not a string (${typeof raw2}), so the guards cannot read it. Denying rather than assuming it is safe.`);
    const patch = SHELL_APPLY_PATCH.test(command);
    if (patch) checkPatchPaths(command, cwd, true);
    const hardDeny = shellHardRules(command);
    if (!patch || hardDeny !== null) return shellGuard(input, command, cwd, hardDeny);
    const rulesOff = (e) => {
      process.stderr.write(`${editRulesOff(e, input.session_id ?? null, cwd)}
`);
      shellGuard(input, command, cwd, null);
    };
    if (!checkEdit) return rulesOff(editRulesError);
    checkEdit({ harness: "codex", sessionId: input.session_id ?? null, cwd, toolName: "Bash", toolInput: ti, now: Date.now() }).then((d) => d.action === "refuse" ? emit("", `${d.reason}
`, 2) : shellGuard(input, command, cwd, null), rulesOff);
    return;
  }
  if (tool === "apply_patch") {
    checkPatchPaths(ti?.command, cwd);
    const off = (e) => emit("", `${editRulesOff(e, input.session_id ?? null, cwd)}
`, 0);
    process.removeListener("uncaughtException", crashed);
    process.removeListener("unhandledRejection", crashed);
    process.on("uncaughtException", off);
    process.on("unhandledRejection", off);
    if (!checkEdit) return off(editRulesError);
    checkEdit({ harness: "codex", sessionId: input.session_id ?? null, cwd, toolName: "apply_patch", toolInput: ti, now: Date.now() }).then((d) => {
      if (d.action === "refuse") emit("", `${d.reason}
`, 2);
      else emit("", "", 0);
    }, off);
    return;
  }
  process.exit(0);
}
const posix = process.platform !== "win32";
function shellHardRules(command) {
  if (shellRulesError !== null || !classifyShell) deny(`shell rules failed to load (${message(shellRulesError)}). Denying every shell command until the plugin is repaired.`);
  const hard = classifyShell(command, posix);
  return hard.kind === "hard-deny" ? hard.reason : null;
}
function shellGuard(input, command, cwd, hardDeny) {
  const off = hardDeny === null ? (e) => shellGuardOff(e, input.session_id ?? null, cwd) : () => emit("", `${hardDeny}
`, 2);
  process.removeListener("uncaughtException", crashed);
  process.removeListener("unhandledRejection", crashed);
  process.on("uncaughtException", off);
  process.on("unhandledRejection", off);
  if (!guardShell || !codexGuardOutput) {
    off(shellGuardError);
    return;
  }
  const render = codexGuardOutput;
  guardShell({ command, cwd, harness: "codex", sessionId: input.session_id ?? null, now: Date.now(), posix }).then((d) => {
    const out = render(hardDeny === null ? d : { action: "deny", reason: hardDeny, source: "hard-rule" });
    emit(out.stdout, out.stderr, out.exitCode);
  }, off);
}
const subagentOf = (id) => subagentId ? subagentId(id) : null;
function startSubagentTurn(input, agentId, journal) {
  const key = journal.journalKey(input.session_id, agentId);
  if (key !== null) journal.appendEvent(key, { t: Date.now(), kind: "prompt", text: null, agentType: input.agent_type ?? null });
}
function loadJournal() {
  const journal = require("../lib/journal");
  if (![journal.appendEvent, journal.appendPrompt, journal.journalKey].every((f) => typeof f === "function")) throw new Error("journal exports are missing");
  return journal;
}
function recordPrompt(input) {
  try {
    const prompt = input.prompt;
    const { STOP_SENTENCE } = require("../lib/stop-sentence");
    if (typeof prompt !== "string" || prompt.startsWith("[fx] ") || STOP_SENTENCE.test(prompt)) return;
    const journal = loadJournal();
    const agentId = subagentOf(input.agent_id);
    if (agentId !== null) {
      startSubagentTurn(input, agentId, journal);
      return;
    }
    const key = journal.journalKey(input.session_id);
    if (key !== null) journal.appendPrompt(key, prompt, Date.now());
  } catch (e) {
    process.stderr.write(`[fx] turn hook: ${String(message(e) ?? e)}
`);
  }
}
function trackerOff(e, input) {
  const m = `[fx] loop tracker off: ${describe(e)}`;
  process.stderr.write(`${m}
`);
  try {
    if (crashLogDir === null) throw new Error("no state directory");
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 448 });
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "codex", event: "nudge", session: input.session_id ?? null, cwd: input.cwd ?? "", text: "", source: "tracker-error", action: "none", unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, "decisions.jsonl"), `${JSON.stringify(entry)}
`, { mode: 384 });
  } catch {
  }
}
function recordToolCall(input) {
  try {
    const tracker = require("../lib/loop-tracker");
    const events = require("../lib/tool-events");
    if (typeof tracker.recordToolResult !== "function" || typeof events.toolOutcomeAndOutput !== "function") throw new Error("a tracker module is missing an export");
    if (typeof input.tool_name !== "string") return "";
    const { outcome, output } = events.toolOutcomeAndOutput("codex", "PostToolUse", input.tool_response);
    const line = tracker.recordToolResult({
      harness: "codex",
      sessionId: input.session_id ?? null,
      agentId: subagentOf(input.agent_id),
      cwd: input.cwd || process.cwd(),
      toolName: input.tool_name,
      toolInput: input.tool_input,
      command: input.command ?? null,
      outcome,
      output
    });
    return line === null ? "" : JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: line } });
  } catch (e) {
    trackerOff(e, input);
    return "";
  }
}
async function stopCheck(input, event) {
  const cwd = input.cwd || process.cwd();
  try {
    const { decideStop } = require("../lib/stop-check");
    if (typeof decideStop !== "function") throw new Error("decideStop is not a function");
    const agentId = event === "SubagentStop" ? subagentOf(input.agent_id) : null;
    if (event === "SubagentStop" && agentId === null) return "";
    const { text, notice } = await decideStop({
      harness: "codex",
      sessionId: input.session_id ?? null,
      agentId,
      cwd,
      stopHookActive: input.stop_hook_active,
      mode: "block"
    });
    if (notice !== null) process.stderr.write(`${notice}
`);
    return text === null ? "" : JSON.stringify({ decision: "block", reason: text });
  } catch (e) {
    stopOff(e, input.session_id ?? null, cwd);
    return "";
  }
}
function stopOff(e, session, cwd) {
  const m = `stop check off: ${describe(e)}`;
  process.stderr.write(`[fx] ${m}
`);
  try {
    if (crashLogDir === null) throw new Error("no state directory");
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 448 });
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "codex", event: "stop", session, cwd, text: "", source: "stop-error", action: "allow", unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, "decisions.jsonl"), `${JSON.stringify(entry)}
`, { mode: 384 });
  } catch {
  }
}
let raw = "";
process.stdin.on("data", (c) => {
  raw += c;
});
process.stdin.on("end", async () => {
  if (parserLoadError || !parseCodexHookInput || !parseJson) {
    deny(`hook input parser failed to load (${message(parserLoadError)}). Denying every call until the plugin is repaired.`);
  }
  let parsed = {};
  if (raw.trim() !== "") {
    try {
      parsed = parseJson(raw);
    } catch {
      parsed = null;
    }
  }
  const r = parseCodexHookInput(parsed);
  if (!r.ok) deny("hook input is not a JSON object. Refusing rather than guessing which event this is.");
  const input = r.value;
  const event = input.hook_event_name;
  if (event === "PreToolUse") {
    handlePreToolUse(input);
    return;
  }
  if (event === "UserPromptSubmit") {
    recordPrompt(input);
    emit("", "", 0);
    return;
  }
  if (event === "PostToolUse") {
    emit(recordToolCall(input), "", 0);
    return;
  }
  if (event === "Stop" || event === "SubagentStop") {
    emit(await stopCheck(input, event), "", 0);
    return;
  }
  if (typeof event === "string" && event !== "" && event !== "SessionStart" && event !== "SubagentStart") process.exit(0);
  const cwd = input.cwd || process.cwd();
  let notice = null;
  if (input.hook_event_name === "SessionStart" && roles) {
    try {
      const { written, stale } = roles.plantRoles();
      const names = [...written, ...stale].map((p) => path.basename(p, ".toml"));
      if (names.length) {
        notice = `fx installed or updated its review roles (${names.join(", ")}). Codex reads roles when a session starts, so restart Codex once before dispatching an fx review agent.`;
      }
    } catch (e) {
      console.error(`[fx] planting the review roles failed: ${message(e) || e}`);
    }
  }
  if (input.hook_event_name === "SubagentStart" && roles) {
    try {
      roles.recordAgentIdentity({ agentId: input.agent_id, agentType: input.agent_type });
    } catch {
    }
  }
  const startedId = subagentOf(input.agent_id);
  if (input.hook_event_name === "SubagentStart" && startedId !== null) {
    try {
      startSubagentTurn(input, startedId, loadJournal());
    } catch (e) {
      process.stderr.write(`[fx] journal: ${String(message(e) ?? e)}
`);
    }
  }
  let health = null;
  if (input.hook_event_name === "SessionStart") {
    try {
      const { pruneJournals } = require("../lib/journal");
      const { fxJsonNotice } = require("../lib/fx-json-watch");
      if (typeof pruneJournals !== "function" || typeof fxJsonNotice !== "function") throw new Error("session start exports are missing");
      pruneJournals(Date.now());
      const line = fxJsonNotice(input.session_id ?? null, cwd, Date.now(), "codex");
      if (line) health = `${line} New fx hook events need trusting once in /hooks.`;
    } catch (e) {
      console.error(`[fx] session start: ${message(e) || e}`);
    }
  }
  let text;
  try {
    const preamble = require("../lib/preamble");
    text = preamble.render({ harness: "codex", cwd, subagent: input.hook_event_name === "SubagentStart" });
  } catch {
    text = "[fx] PREAMBLE.md could not be read. The fx bootstrap and its always-on rules are NOT loaded in this session. Do not commit, and tell the user the plugin is misinstalled.";
  }
  const lines = [notice, health].filter((l) => l !== null);
  const out = {
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || "SessionStart",
      additionalContext: lines.length ? `${text.trimEnd()}${lines.map((l) => `

${l}`).join("")}
` : text
    }
  };
  if (lines.length) out.systemMessage = lines.join("\n");
  process.stdout.write(JSON.stringify(out));
});
