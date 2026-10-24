// generated from src/lib/stop-check.ts by scripts/build: edit there, not here
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
var stop_check_exports = {};
__export(stop_check_exports, {
  DOC_EXTENSIONS: () => DOC_EXTENSIONS,
  STOP_SENTENCE: () => import_stop_sentence.STOP_SENTENCE,
  decideStop: () => decideStop,
  stopReason: () => stopReason,
  turnNeedsEvidence: () => turnNeedsEvidence
});
module.exports = __toCommonJS(stop_check_exports);
var path = __toESM(require("path"));
var import_decision_log = require("./decision-log.js");
var import_evidence = require("./evidence.js");
var import_fx_json_watch = require("./fx-json-watch.js");
var import_journal = require("./journal.js");
var import_repo_config = require("./repo-config.js");
var import_stop_sentence = require("./stop-sentence.js");
const DOC_EXTENSIONS = [".md", ".mdx", ".txt", ".rst", ".adoc"];
const isDoc = (p) => DOC_EXTENSIONS.some((x) => p.toLowerCase().endsWith(x));
const inside = (p, root) => {
  if (root === void 0) return true;
  const rel = path.relative(root, path.resolve(root, p));
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
};
function turnNeedsEvidence(turn, root) {
  const lastEdit = turn.findLastIndex((e) => e.kind === "edit" && !isDoc(e.path) && inside(e.path, root));
  return lastEdit >= 0 && !turn.slice(lastEdit + 1).some((e) => e.kind === "tool" && e.verified);
}
function stopReason(hint, mode) {
  return mode === "block" ? `[fx] This turn edited files and no check has passed since the last edit. Run ${hint} and report the result before you finish. If you cannot run it, say so plainly.` : `[fx] The previous turn edited files and no check passed after the last edit. Run ${hint} before you report that work as done.`;
}
async function decideStop(input) {
  const notice = input.agentId === null && input.mode === "block" ? (0, import_fx_json_watch.fxJsonNotice)(input.sessionId, input.cwd, Date.now(), input.harness) : null;
  return { text: stopText(input), notice };
}
function stopText(input) {
  try {
    const key = (0, import_journal.journalKey)(input.sessionId, input.agentId ?? void 0);
    if (key === null || input.stopHookActive) return null;
    const config = (0, import_repo_config.readRepoConfig)(input.cwd);
    if (!config.hooks.stopCheck) return null;
    const turn = (0, import_journal.currentTurn)((0, import_journal.readJournal)(key));
    if (turn.some((e) => e.kind === "stop-block") || !turnNeedsEvidence(turn, (0, import_repo_config.repoRoot)(input.cwd))) return null;
    const hint = (0, import_evidence.checkHint)(config.checks);
    const text = stopReason(hint, input.mode);
    const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), harness: input.harness, event: "stop", session: input.sessionId, cwd: input.cwd, text };
    if ((0, import_journal.appendEvent)(key, { t: Date.now(), kind: "stop-block" })) {
      (0, import_decision_log.logDecision)({ ...entry, source: "evidence", action: "block" });
      return text;
    }
    (0, import_decision_log.logDecision)({ ...entry, source: "journal-error", action: "allow", unavailable: "the stop-block event could not be written" });
    return null;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[fx] stop check: ${m}
`);
    try {
      (0, import_decision_log.logDecision)({ ts: (/* @__PURE__ */ new Date()).toISOString(), harness: input.harness, event: "stop", session: input.sessionId, cwd: input.cwd, text: "", source: "stop-error", action: "allow", unavailable: m.slice(0, 200) });
    } catch {
    }
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DOC_EXTENSIONS,
  STOP_SENTENCE,
  decideStop,
  stopReason,
  turnNeedsEvidence
});
