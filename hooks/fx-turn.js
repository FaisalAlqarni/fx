#!/usr/bin/env node
// generated from src/hooks/fx-turn.ts by scripts/build: edit there, not here
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
function trackerOff(e, input) {
  const m = `[fx] loop tracker off: ${e instanceof Error ? e.message : String(e)}`;
  process.stderr.write(`${m}
`);
  try {
    const paths = require("../lib/fx-paths");
    const dir = paths.machinePaths().stateDir;
    fs.mkdirSync(dir, { recursive: true, mode: 448 });
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "claude-code", event: "nudge", session: input.session_id ?? null, cwd: input.cwd ?? "", text: "", source: "tracker-error", action: "none", unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(dir, "decisions.jsonl"), `${JSON.stringify(entry)}
`, { mode: 384 });
  } catch {
  }
}
function postToolUse(input, event) {
  try {
    recordAndNudge(input, event);
  } catch (e) {
    trackerOff(e, input);
  }
}
const subagentOf = (id) => {
  const { subagentId } = require("../lib/hook-input");
  return subagentId(id);
};
function recordAndNudge(input, event) {
  const tracker = require("../lib/loop-tracker");
  const events = require("../lib/tool-events");
  if (typeof tracker.recordToolResult !== "function" || typeof events.toolOutcomeAndOutput !== "function") throw new Error("a tracker module is missing an export");
  if (typeof input.tool_name !== "string") return;
  const command = typeof input.tool_input?.command === "string" ? input.tool_input.command : null;
  const { outcome, output, interrupted } = events.toolOutcomeAndOutput("claude-code", event, event === "PostToolUseFailure" ? input.error : input.tool_response, input.is_interrupt === true);
  const line = tracker.recordToolResult({
    harness: "claude-code",
    sessionId: input.session_id ?? null,
    agentId: subagentOf(input.agent_id),
    cwd: input.cwd ?? process.cwd(),
    toolName: input.tool_name,
    toolInput: input.tool_input,
    command,
    outcome,
    output,
    interrupted
  });
  if (line !== null) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: line } }));
}
function stopOff(e, session, cwd) {
  const m = `stop check off: ${e instanceof Error ? e.message : String(e)}`;
  process.stderr.write(`[fx] ${m}
`);
  try {
    const { machinePaths } = require("../lib/fx-paths");
    const dir = machinePaths().stateDir;
    fs.mkdirSync(dir, { recursive: true, mode: 448 });
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "claude-code", event: "stop", session, cwd, text: "", source: "stop-error", action: "allow", unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(dir, "decisions.jsonl"), `${JSON.stringify(entry)}
`, { mode: 384 });
  } catch {
  }
}
async function stop(input, event) {
  const cwd = input.cwd ?? process.cwd();
  try {
    const { decideStop } = require("../lib/stop-check");
    if (typeof decideStop !== "function") throw new Error("decideStop is not a function");
    const agentId = event === "SubagentStop" ? subagentOf(input.agent_id) : null;
    if (event === "SubagentStop" && agentId === null) return;
    const { text, notice } = await decideStop({
      harness: "claude-code",
      sessionId: input.session_id ?? null,
      agentId,
      cwd,
      stopHookActive: input.stop_hook_active,
      mode: "block"
    });
    const out = { ...text === null ? {} : { decision: "block", reason: text }, ...notice === null ? {} : { systemMessage: notice } };
    if (Object.keys(out).length > 0) process.stdout.write(JSON.stringify(out));
  } catch (e) {
    stopOff(e, input.session_id ?? null, cwd);
  }
}
let raw = "";
process.stdin.on("data", (c) => {
  raw += c;
});
process.stdin.on("end", async () => {
  try {
    const { parseClaudeHookInput, subagentId } = require("../lib/hook-input");
    const { parseJson } = require("../lib/json");
    const { appendEvent, appendPrompt, journalKey } = require("../lib/journal");
    if (![parseClaudeHookInput, subagentId, parseJson, appendEvent, appendPrompt, journalKey].every((f) => typeof f === "function")) {
      throw new Error("a turn module is missing an export");
    }
    const parsed = parseClaudeHookInput(parseJson(raw));
    if (!parsed.ok) return;
    const input = parsed.value;
    const event = input.hook_event_name;
    if (event === "PostToolUse" || event === "PostToolUseFailure") return postToolUse(input, event);
    if (event === "Stop" || event === "SubagentStop") return await stop(input, event);
    if (input.hook_event_name !== "UserPromptSubmit" || typeof input.prompt !== "string") return;
    const { STOP_SENTENCE } = require("../lib/stop-sentence");
    if (input.prompt.startsWith("[fx] ") || STOP_SENTENCE.test(input.prompt)) return;
    const agentId = subagentId(input.agent_id);
    const subagent = agentId !== null;
    const key = journalKey(input.session_id, agentId ?? void 0);
    if (subagent) return void (key !== null && appendEvent(key, { t: Date.now(), kind: "prompt", text: null }));
    if (key !== null) appendPrompt(key, input.prompt, Date.now());
  } catch (e) {
    process.stderr.write(`[fx] turn hook: ${e instanceof Error ? e.message : String(e)}
`);
  }
});
