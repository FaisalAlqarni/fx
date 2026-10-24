// generated from src/lib/loop-tracker.ts by scripts/build: edit there, not here
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
var loop_tracker_exports = {};
__export(loop_tracker_exports, {
  checkSignals: () => checkSignals,
  recordToolResult: () => recordToolResult
});
module.exports = __toCommonJS(loop_tracker_exports);
var path = __toESM(require("path"));
var import_decision_log = require("./decision-log.js");
var import_evidence = require("./evidence.js");
var import_journal = require("./journal.js");
var import_thresholds = require("./thresholds.js");
var import_plant_roles = require("./plant-roles.js");
var import_preamble = require("./preamble.js");
var import_repo_config = require("./repo-config.js");
var import_shell_guard = require("./shell-guard.js");
var import_tool_events = require("./tool-events.js");
const LOOP = /^(?:for (\w+) in (.*?)|for \(\((.*?)\)\)|while (.+?)|until (.+?)) ?;? do (.+?) ?;? done$/;
const CSTYLE = /^\s*(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*(<=?)\s*(\d+)\s*;\s*(?:(\w+)\+\+|\+\+(\w+)|(\w+)\s*\+=\s*1)\s*$/;
const oneCommand = (text) => !/[;&|]/.test(text.replace(/\d*>&\d/g, "")) && !/\b(?:do|done)\b/.test(text);
function loopedCommand(command) {
  const m = LOOP.exec(command);
  if (!m) return null;
  const [, name, list, cstyle, whileCond, untilCond, body = ""] = m;
  const cap = (n) => ({ times: Math.max(0, Math.min(n, import_thresholds.REPEAT_FAILURES)) });
  if (untilCond !== void 0) return oneCommand(untilCond) ? { inner: untilCond, ...cap(import_thresholds.REPEAT_FAILURES) } : null;
  if (!oneCommand(body)) return null;
  if (whileCond !== void 0) return whileCond === "true" || whileCond === ":" ? { inner: body, ...cap(import_thresholds.REPEAT_FAILURES) } : null;
  if (cstyle !== void 0) {
    const c = CSTYLE.exec(cstyle);
    const v = c?.[1];
    if (!c || v === void 0 || c[3] !== v || (c[6] ?? c[7] ?? c[8]) !== v || new RegExp(`\\$\\{?${v}\\b`).test(body)) return null;
    return { inner: body, ...cap(Number(c[5]) - Number(c[2]) + (c[4] === "<=" ? 1 : 0)) };
  }
  if (name === void 0 || new RegExp(`\\$\\{?${name}\\b`).test(body)) return null;
  const items = (list ?? "").trim();
  const seq = /^(?:\$\(|`)seq (\d+)(?: (\d+))?(?:\)|`)$/.exec(items);
  const brace = /^\{(\d+)\.\.(\d+)\}$/.exec(items);
  const count = seq ? seq[2] === void 0 ? Number(seq[1]) : Number(seq[2]) - Number(seq[1]) + 1 : brace ? Math.abs(Number(brace[2]) - Number(brace[1])) + 1 : /[$*?{`]/.test(items) ? 1 : items.split(" ").filter(Boolean).length;
  return { inner: body, ...cap(count) };
}
function repeatedCommand(turn) {
  let counts = /* @__PURE__ */ new Map();
  for (const e of turn) {
    if (e.kind === "edit") {
      counts = /* @__PURE__ */ new Map();
      continue;
    }
    if (e.kind !== "tool" || e.outcome !== "fail" || e.command === null) continue;
    const loop = loopedCommand(e.command);
    const command = loop?.inner ?? e.command;
    const n = (counts.get(command) ?? 0) + (loop?.times ?? 1);
    if (n >= import_thresholds.REPEAT_FAILURES) return command;
    counts.set(command, n);
  }
  return null;
}
function passiveStall(turn) {
  const lastNonRead = turn.findLastIndex((e) => e.kind === "tool" && e.tool !== "read");
  return turn.slice(lastNonRead + 1).filter((e) => e.kind === "tool").length >= import_thresholds.PASSIVE_READS && !turn.slice(lastNonRead + 1).some((e) => e.kind === "edit");
}
function unverifiedWrites(turn) {
  const since = turn.slice(turn.findLastIndex((e) => e.kind === "tool" && e.verified) + 1);
  return since.filter((e) => e.kind === "edit").length >= import_thresholds.UNVERIFIED_EDITS;
}
function checkSignals(turn, skip = []) {
  const fired = (s) => turn.some((e) => e.kind === "nudge" && e.signal === s);
  const rules = [
    ["repeat-failure", () => repeatedCommand(turn) !== null],
    ["unverified-writes", () => unverifiedWrites(turn)],
    ["passive-stall", () => passiveStall(turn)]
  ];
  return rules.find(([s, hit]) => !skip.includes(s) && !fired(s) && hit())?.[0] ?? null;
}
function trackerError(input, unavailable, now) {
  (0, import_decision_log.logDecision)({ ts: new Date(now).toISOString(), harness: input.harness, event: "nudge", session: input.sessionId, cwd: input.cwd, text: "", source: "tracker-error", action: "none", unavailable: unavailable.slice(0, 200) });
}
function recordToolResult(input) {
  try {
    const { harness, cwd } = input;
    const key = (0, import_journal.journalKey)(input.sessionId, input.agentId ?? void 0);
    if (key === null) return null;
    const config = (0, import_repo_config.readRepoConfig)(cwd);
    const kind = (0, import_tool_events.classifyTool)(harness, input.toolName, input.command);
    const now = Date.now();
    const failures = [];
    const append = (ev) => {
      if (!(0, import_journal.appendEvent)(key, ev) && failures.length === 0) failures.push("a journal event could not be written");
    };
    append({
      t: now,
      kind: "tool",
      tool: kind,
      outcome: input.outcome,
      command: input.command === null ? null : (0, import_shell_guard.normalizeCommand)(input.command, process.platform !== "win32"),
      verified: input.interrupted !== true && (0, import_evidence.countsAsVerification)(kind, input.command, input.outcome, input.output, config.checks)
    });
    if (input.outcome !== "fail") {
      try {
        const paths = (0, import_tool_events.editedPaths)(harness, input.toolName, input.toolInput, cwd);
        const root = paths.length > 0 ? (0, import_repo_config.repoRoot)(cwd) : cwd;
        const stored = (p) => {
          const rel = path.relative(root, p);
          return rel === "" || rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel) ? p : rel;
        };
        for (const p of paths) append({ t: now, kind: "edit", path: stored(p) });
      } catch (e) {
        failures.push(`edit paths could not be read: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    for (const unavailable of failures) trackerError(input, unavailable, now);
    if (!config.hooks.loopNudge) return null;
    const journal = (0, import_journal.readJournal)(key);
    const first = journal.find((e) => e.kind === "prompt");
    if (first?.kind === "prompt" && typeof first.agentType === "string" && import_plant_roles.READ_ONLY_AGENTS.includes(first.agentType)) return null;
    const turn = (0, import_journal.currentTurn)(journal);
    const signal = checkSignals(turn, input.agentId === null ? [] : ["passive-stall"]);
    if (signal === null) return null;
    const lane = (0, import_preamble.laneAddress)(harness, "fx-debug");
    const line = signal === "repeat-failure" ? `[fx] \`${(repeatedCommand(turn) ?? "").slice(0, 80)}\` has failed ${import_thresholds.REPEAT_FAILURES} times this turn. Stop retrying and invoke ${lane} to find the cause.` : signal === "passive-stall" ? `[fx] ${import_thresholds.PASSIVE_READS} reads in a row with no edit. If you are going in circles, invoke ${lane}; otherwise say what you are looking for.` : `[fx] ${import_thresholds.UNVERIFIED_EDITS} edits since the last passing check. Run ${(0, import_evidence.checkHint)(config.checks)} now; if it fails, invoke ${lane}.`;
    if (!(0, import_journal.appendEvent)(key, { t: now, kind: "nudge", signal })) {
      trackerError(input, "a nudge event could not be written", now);
      return null;
    }
    (0, import_decision_log.logDecision)({ ts: new Date(now).toISOString(), harness, event: "nudge", session: input.sessionId, cwd, text: line, source: signal, action: "nudge" });
    return line;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[fx] loop tracker: ${m}
`);
    trackerError(input, m, Date.now());
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkSignals,
  recordToolResult
});
