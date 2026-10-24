// generated from src/lib/opencode-queue.ts by scripts/build: edit there, not here
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
var opencode_queue_exports = {};
__export(opencode_queue_exports, {
  MAX_LINES_PER_SESSION: () => MAX_LINES_PER_SESSION,
  MAX_SESSIONS: () => MAX_SESSIONS,
  createQueue: () => createQueue
});
module.exports = __toCommonJS(opencode_queue_exports);
var import_decision_log = require("./decision-log.js");
const MAX_LINES_PER_SESSION = 5;
const MAX_SESSIONS = 50;
function createQueue(harness, cwd) {
  const queue = /* @__PURE__ */ new Map();
  const note = (session, source, text) => (0, import_decision_log.logDecision)({ ts: (/* @__PURE__ */ new Date()).toISOString(), harness, event: "queue", session, cwd, text, source, action: "none" });
  return {
    enqueue(session, line) {
      const lines = queue.get(session);
      if (lines === void 0) {
        if (queue.size >= MAX_SESSIONS) {
          const [oldest] = queue.keys();
          if (oldest !== void 0) {
            note(oldest, "queue-dropped", `${queue.get(oldest)?.length ?? 0} undelivered line(s): too many sessions queued`);
            queue.delete(oldest);
          }
        }
        queue.set(session, [line]);
      } else if (lines.length >= MAX_LINES_PER_SESSION) {
        note(session, "queue-dropped", `1 line: ${MAX_LINES_PER_SESSION} already queued for this session`);
      } else {
        lines.push(line);
      }
    },
    // A new user prompt: lines still waiting belong to an earlier turn and are stale.
    startTurn(session) {
      const lines = queue.get(session);
      if (lines === void 0) return;
      queue.delete(session);
      note(session, "queue-dropped", `${lines.length} undelivered line(s) from an earlier turn`);
    },
    drain(session) {
      const lines = queue.get(session) ?? [];
      queue.delete(session);
      if (lines.length > 0) note(session, "queue-pushed", lines.join("\n"));
      return lines;
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MAX_LINES_PER_SESSION,
  MAX_SESSIONS,
  createQueue
});
