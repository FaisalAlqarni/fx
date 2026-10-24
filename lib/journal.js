// generated from src/lib/journal.ts by scripts/build: edit there, not here
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
var journal_exports = {};
__export(journal_exports, {
  appendEvent: () => appendEvent,
  appendPrompt: () => appendPrompt,
  currentTurn: () => currentTurn,
  journalCommand: () => journalCommand,
  journalKey: () => journalKey,
  lastUserPrompt: () => lastUserPrompt,
  pruneJournals: () => pruneJournals,
  readJournal: () => readJournal
});
module.exports = __toCommonJS(journal_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_fx_paths = require("./fx-paths.js");
var import_thresholds = require("./thresholds.js");
var import_json = require("./json.js");
var import_redact = require("./redact.js");
var import_session_input = require("./session-input.js");
function journalKey(sessionId, agentId) {
  if (typeof sessionId !== "string" || sessionId === "") return null;
  const clean = (s) => s.replace(/[^A-Za-z0-9._-]/g, "_");
  return typeof agentId === "string" && agentId !== "" ? `${clean(sessionId)}__${clean(agentId)}` : clean(sessionId);
}
const sessionsDir = (stateDir) => path.join(stateDir ?? (0, import_fx_paths.machinePaths)().stateDir, "sessions");
const journalCommand = (command) => (0, import_redact.redact)(command, import_thresholds.JOURNAL_COMMAND_CHARS);
function redactEvent(ev) {
  const r = (s) => (0, import_redact.redact)(s, import_redact.CAP_COMMAND);
  switch (ev.kind) {
    case "prompt":
      return { ...ev, text: ev.text === null ? null : (0, import_redact.redact)(ev.text, import_redact.CAP_PROMPT), ...typeof ev.agentType === "string" ? { agentType: r(ev.agentType) } : {} };
    case "tool":
      return { ...ev, command: ev.command === null ? null : journalCommand(ev.command) };
    // A path is a file name, not contents; the redactor's long-run pattern would hide a deep one from the Stop check (benchmark finding 1).
    case "edit":
      return { ...ev, path: ev.path.slice(0, import_redact.CAP_COMMAND) };
    default:
      return ev;
  }
}
const FREE_TEXT = /* @__PURE__ */ new Set(["text", "command", "path", "agentType"]);
function journalLine(ev) {
  const redacted = redactEvent(ev);
  let line = JSON.stringify(redacted);
  for (let cap = 1024; cap > 0 && Buffer.byteLength(line) > import_thresholds.JOURNAL_LINE_BYTES; cap = Math.floor(cap / 2)) {
    line = JSON.stringify(Object.fromEntries(Object.entries(redacted).map(([k, v]) => [k, FREE_TEXT.has(k) && typeof v === "string" && v.length > cap ? `${v.slice(0, cap)}[...]` : v])));
  }
  return line;
}
const kindOf = (line) => {
  try {
    return (0, import_session_input.parseJournalLine)((0, import_json.parseJson)(line))?.kind;
  } catch {
    return void 0;
  }
};
const isPromptLine = (line) => kindOf(line) === "prompt";
function trimJournal(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  let keep = lines.length;
  let bytes = 0;
  while (keep > 0 && bytes + Buffer.byteLength(lines[keep - 1] ?? "") + 1 <= import_thresholds.JOURNAL_MAX_BYTES / 2) bytes += Buffer.byteLength(lines[--keep] ?? "") + 1;
  const prompts = lines.flatMap((l, i) => isPromptLine(l) ? [i] : []);
  const baseline = lines.findLastIndex((l) => kindOf(l) === "fx-json-hooks");
  const head = [.../* @__PURE__ */ new Set([prompts[0], prompts.at(-1), baseline])].filter((i) => i !== void 0 && i >= 0 && i < keep).sort((a, b) => a - b);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${[...head.map((i) => lines[i]), ...lines.slice(keep)].join("\n")}
`, { mode: 384 });
  fs.renameSync(tmp, file);
}
function appendEvent(key, ev, stateDir) {
  try {
    const dir = sessionsDir(stateDir);
    fs.mkdirSync(dir, { recursive: true, mode: 448 });
    const file = path.join(dir, `${key}.jsonl`);
    fs.appendFileSync(file, `${journalLine(ev)}
`, { mode: 384 });
    try {
      if (fs.statSync(file).size > import_thresholds.JOURNAL_MAX_BYTES) trimJournal(file);
    } catch (e) {
      process.stderr.write(`[fx] journal: ${e instanceof Error ? e.message : String(e)}
`);
    }
    return true;
  } catch (e) {
    process.stderr.write(`[fx] journal: ${e instanceof Error ? e.message : String(e)}
`);
    return false;
  }
}
function readTail(file) {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const n = Math.min(size, import_thresholds.JOURNAL_MAX_BYTES);
    const buf = Buffer.alloc(n);
    fs.readSync(fd, buf, 0, n, size - n);
    const text = buf.toString("utf8");
    return n < size ? text.slice(text.indexOf("\n") + 1) : text;
  } finally {
    fs.closeSync(fd);
  }
}
function appendPrompt(key, text, t, stateDir) {
  if (appendEvent(key, { t, kind: "prompt", text }, stateDir)) return;
  if (appendEvent(key, { t, kind: "prompt", text: null }, stateDir)) return;
  const file = path.join(sessionsDir(stateDir), `${key}.jsonl`);
  try {
    fs.truncateSync(file, 0);
  } catch {
    try {
      fs.rmSync(file, { force: true });
    } catch (e) {
      process.stderr.write(`[fx] journal: ${e instanceof Error ? e.message : String(e)}
`);
    }
  }
}
function readJournal(key, stateDir) {
  let text;
  try {
    text = readTail(path.join(sessionsDir(stateDir), `${key}.jsonl`));
  } catch {
    return [];
  }
  const events = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      const ev = (0, import_session_input.parseJournalLine)((0, import_json.parseJson)(line));
      if (ev) events.push(ev);
    } catch {
    }
  }
  return events;
}
function currentTurn(events) {
  const i = events.findLastIndex((e) => e.kind === "prompt");
  return i < 0 ? events : events.slice(i + 1);
}
function lastUserPrompt(sessionId, stateDir) {
  const key = journalKey(sessionId);
  if (key === null) return null;
  const last = readJournal(key, stateDir).findLast((e) => e.kind === "prompt");
  return last?.kind === "prompt" ? last.text : null;
}
function pruneJournals(now, stateDir) {
  try {
    const dir = sessionsDir(stateDir);
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".jsonl")) continue;
      const file = path.join(dir, name);
      try {
        if (fs.statSync(file).mtimeMs < now - import_thresholds.JOURNAL_MAX_AGE_MS) fs.rmSync(file);
      } catch {
      }
    }
  } catch {
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appendEvent,
  appendPrompt,
  currentTurn,
  journalCommand,
  journalKey,
  lastUserPrompt,
  pruneJournals,
  readJournal
});
