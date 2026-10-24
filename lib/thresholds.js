// generated from src/lib/thresholds.ts by scripts/build: edit there, not here
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
var thresholds_exports = {};
__export(thresholds_exports, {
  JOURNAL_COMMAND_CHARS: () => JOURNAL_COMMAND_CHARS,
  JOURNAL_LINE_BYTES: () => JOURNAL_LINE_BYTES,
  JOURNAL_MAX_AGE_MS: () => JOURNAL_MAX_AGE_MS,
  JOURNAL_MAX_BYTES: () => JOURNAL_MAX_BYTES,
  LOG_ROTATE_BYTES: () => LOG_ROTATE_BYTES,
  PASSIVE_READS: () => PASSIVE_READS,
  REPEAT_FAILURES: () => REPEAT_FAILURES,
  UNVERIFIED_EDITS: () => UNVERIFIED_EDITS
});
module.exports = __toCommonJS(thresholds_exports);
const REPEAT_FAILURES = 3;
const PASSIVE_READS = 12;
const UNVERIFIED_EDITS = 10;
const JOURNAL_MAX_AGE_MS = 6048e5;
const JOURNAL_LINE_BYTES = 2048;
const JOURNAL_COMMAND_CHARS = 500;
const JOURNAL_MAX_BYTES = 262144;
const LOG_ROTATE_BYTES = 5242880;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JOURNAL_COMMAND_CHARS,
  JOURNAL_LINE_BYTES,
  JOURNAL_MAX_AGE_MS,
  JOURNAL_MAX_BYTES,
  LOG_ROTATE_BYTES,
  PASSIVE_READS,
  REPEAT_FAILURES,
  UNVERIFIED_EDITS
});
