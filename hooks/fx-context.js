#!/usr/bin/env node
// generated from src/hooks/fx-context.ts by scripts/build: edit there, not here
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
var import_child_process = require("child_process");
const UNREAD = "[fx] PREAMBLE.md could not be read. The fx bootstrap and its always-on rules are NOT loaded in this session. Do not commit, and tell the user the plugin is misinstalled.";
let readInput = null;
try {
  const { parseClaudeHookInput } = require("../lib/hook-input");
  const { parseJson } = require("../lib/json");
  if (typeof parseClaudeHookInput !== "function") throw new Error("parseClaudeHookInput is not a function");
  if (typeof parseJson !== "function") throw new Error("parseJson is not a function");
  readInput = (raw2) => {
    let parsed = {};
    try {
      parsed = parseJson(raw2);
    } catch {
    }
    const r = parseClaudeHookInput(parsed);
    return r.ok ? r.value : null;
  };
} catch {
}
function recordTranscriptPath(cwd, transcript) {
  const file = path.join(cwd, ".fx", "transcript-path");
  const clear = () => {
    try {
      fs.rmSync(file, { force: true });
    } catch {
    }
  };
  try {
    const g = (0, import_child_process.spawnSync)("git", ["check-ignore", "-q", ".fx/transcript-path"], { cwd, timeout: 2e3 });
    if (g.status === 1) return;
    if (g.status !== 0 && g.status !== 128 || typeof transcript !== "string") return clear();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, transcript + "\n");
  } catch {
    clear();
  }
}
function recordSubagentTurn(input) {
  try {
    const { appendEvent, journalKey } = require("../lib/journal");
    const { subagentId } = require("../lib/hook-input");
    if (typeof appendEvent !== "function" || typeof journalKey !== "function" || typeof subagentId !== "function") throw new Error("journal exports are missing");
    const agentId = subagentId(input.agent_id);
    if (agentId === null) return;
    const key = journalKey(input.session_id, agentId);
    if (key === null) return;
    appendEvent(key, { t: Date.now(), kind: "prompt", text: null, agentType: input.agent_type ?? null });
  } catch (e) {
    process.stderr.write(`[fx] journal: ${e instanceof Error ? e.message : String(e)}
`);
  }
}
function sessionStartNotice(input, cwd) {
  try {
    const { pruneJournals } = require("../lib/journal");
    const { fxJsonNotice } = require("../lib/fx-json-watch");
    if (typeof pruneJournals !== "function" || typeof fxJsonNotice !== "function") throw new Error("session start exports are missing");
    pruneJournals(Date.now());
    return fxJsonNotice(input.session_id ?? null, cwd, Date.now(), "claude-code");
  } catch (e) {
    process.stderr.write(`[fx] session start: ${e instanceof Error ? e.message : String(e)}
`);
    return null;
  }
}
let raw = "";
process.stdin.on("data", (c) => {
  raw += c;
});
process.stdin.on("end", () => {
  const input = readInput ? readInput(raw) : null;
  const cwd = input?.cwd || process.cwd();
  if (input?.hook_event_name === "SessionStart") recordTranscriptPath(cwd, input.transcript_path);
  if (input?.hook_event_name === "SubagentStart") recordSubagentTurn(input);
  let text = UNREAD;
  if (readInput) {
    try {
      const { render } = require("../lib/preamble");
      text = render({ harness: "claude-code", cwd, subagent: input?.hook_event_name === "SubagentStart" });
    } catch {
    }
  }
  const notice = input?.hook_event_name === "SessionStart" ? sessionStartNotice(input, cwd) : null;
  const out = {
    hookSpecificOutput: {
      hookEventName: input?.hook_event_name || "SessionStart",
      additionalContext: notice ? `${text.trimEnd()}

${notice}
` : text
    }
  };
  if (notice) out.systemMessage = notice;
  process.stdout.write(JSON.stringify(out));
});
