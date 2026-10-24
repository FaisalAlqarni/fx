// generated from src/lib/evidence.ts by scripts/build: edit there, not here
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
var evidence_exports = {};
__export(evidence_exports, {
  checkHint: () => checkHint,
  countsAsVerification: () => countsAsVerification,
  hasPassSummary: () => hasPassSummary,
  isCheckCommand: () => isCheckCommand,
  isRepoCommand: () => isRepoCommand,
  matchRepoCommand: () => matchRepoCommand
});
module.exports = __toCommonJS(evidence_exports);
const squash = (s) => s.trim().replace(/\s+/g, " ");
function matchRepoCommand(command, template) {
  if (template === null) return null;
  const cmd = squash(command);
  const brace = template.indexOf("{");
  const head = squash(brace < 0 ? template : template.slice(0, brace));
  if (head === "") return null;
  if (brace >= 0) {
    const words = head.split(" ");
    if (words.length < 2 && !words[0]?.includes("/")) return null;
    if (!/\s/.test(template[brace - 1] ?? " ")) return cmd.startsWith(head) ? { tail: cmd.slice(head.length), placeholder: true } : null;
  }
  if (cmd !== head && !cmd.startsWith(`${head} `)) return null;
  return { tail: cmd.slice(head.length), placeholder: brace >= 0 };
}
function isRepoCommand(command, template) {
  return matchRepoCommand(command, template) !== null;
}
function isCheckCommand(command, checks) {
  return [checks.test_one, checks.test_scope, checks.test_all, checks.lint].some((t) => isRepoCommand(command, t));
}
const TAIL = 4096;
function hasPassSummary(output) {
  const o = output.length > TAIL ? output.slice(-TAIL) : output;
  const failed = /\b[1-9]\d* failed\b/.test(o);
  return /ALL GREEN/.test(o) || /\b[1-9]\d* (?:tests? )?passed\b/.test(o) && !failed || /\b\d+ examples?, 0 failures\b/.test(o) || /^OK(?: \(\d+ tests?\))?$/m.test(o) || /Tests:\s+[1-9]\d* passed/.test(o) && !/failed/.test(o) || /^ok\s+\S+/m.test(o) && !/^FAIL/m.test(o) || /test result: ok\./.test(o) || /Passed!\s+-\s+Failed:\s+0/.test(o);
}
const QUOTING = ["echo", "printf", "cat", "grep", "rg", "head", "tail", "sed", "awk"];
function firstProgram(command) {
  const segment = command.split(/[|;&\n]/)[0] ?? "";
  const word = segment.trim().split(/\s+/).find((w) => !/^\w+=/.test(w)) ?? "";
  return word.split(/[\\/]/).pop() ?? "";
}
function countsAsVerification(kind, command, outcome, output, checks) {
  if (kind !== "shell" || outcome === "fail") return false;
  if (command !== null && outcome === "ok" && isCheckCommand(command, checks) && !/[|;\n]/.test(command.trim())) return true;
  return (command === null || !QUOTING.includes(firstProgram(command))) && hasPassSummary(output);
}
function checkHint(checks) {
  const cmd = checks.test_scope ?? checks.test_all;
  return cmd === null ? "the project's tests" : `\`${cmd}\``;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkHint,
  countsAsVerification,
  hasPassSummary,
  isCheckCommand,
  isRepoCommand,
  matchRepoCommand
});
