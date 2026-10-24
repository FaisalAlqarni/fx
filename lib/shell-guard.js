// generated from src/lib/shell-guard.ts by scripts/build: edit there, not here
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
var shell_guard_exports = {};
__export(shell_guard_exports, {
  classifyShell: () => import_shell_rules2.classifyShell,
  guardShell: () => guardShell,
  guardShellCodeOnly: () => guardShellCodeOnly,
  normalizeCommand: () => normalizeCommand,
  stripComments: () => import_shell_rules2.stripComments
});
module.exports = __toCommonJS(shell_guard_exports);
var import_child_process = require("child_process");
var import_redact = require("./redact.js");
var import_decision_log = require("./decision-log.js");
var import_evidence = require("./evidence.js");
var import_repo_config = require("./repo-config.js");
var import_shell_rules = require("./shell-rules.js");
var import_shell_rules2 = require("./shell-rules.js");
function normalizeCommand(command, posix = true) {
  return (0, import_redact.redact)((0, import_shell_rules.stripComments)(command, posix).trim().replace(/\s+/g, " "), import_redact.CAP_COMMAND);
}
const UNSAFE_TAIL = /[;&|><`]|\$\(/;
const LEAVES_REPO = /(?:^|[\\/])\.\.(?:[\\/]|$)|^[\\/~]|^[A-Za-z]:|\$/;
function repoCommand(code, checks) {
  if (/[\r\n]/.test(code.trim())) return false;
  return [checks.test_one, checks.test_scope, checks.test_all, checks.lint, checks.setup].some((t) => {
    const m = (0, import_evidence.matchRepoCommand)(code, t);
    if (m === null || UNSAFE_TAIL.test(m.tail)) return false;
    const extra = m.tail.split(" ").filter(Boolean);
    return m.placeholder ? extra.every((a) => !a.startsWith("-") && !LEAVES_REPO.test(a)) : extra.length === 0;
  });
}
const RUNS_PROGRAM = "^(core\\.(fsmonitor|pager)|pager\\..+|diff\\.external|diff\\..+\\.(textconv|command)|filter\\..+\\.(clean|process)|gpg\\.(.+\\.)?program|include\\.path|includeif\\..+\\.path)$";
function gitRunsRepoProgram(code, cwd) {
  if (!/^\s*git\s+(?:status|log|diff|show|blame)(?:\s|$)/.test(code)) return false;
  const r = (0, import_child_process.spawnSync)("git", ["config", "--show-scope", "--get-regexp", RUNS_PROGRAM], { cwd, timeout: 2e3, encoding: "utf8" });
  if (r.status === 1 && r.stdout === "") return false;
  if (r.status !== 0) return true;
  return r.stdout.split("\n").some((l) => /^(?:local|worktree)\s/.test(l));
}
async function guardShell(input) {
  try {
    return guardShellCodeOnly(input);
  } catch (e) {
    return { action: "warn", reason: `[fx] shell guard off: ${e instanceof Error ? e.message : String(e)}`, source: "guard-error" };
  }
}
function guardShellCodeOnly(input) {
  const { command, cwd, harness, sessionId } = input;
  const norm = normalizeCommand(command, input.posix);
  const log = (d) => {
    (0, import_decision_log.logDecision)({ ts: new Date(input.now ?? Date.now()).toISOString(), harness, event: "guard", session: sessionId, cwd, text: norm, source: d.source, action: d.action });
    return d;
  };
  const c = (0, import_shell_rules.classifyShell)(command, input.posix);
  if (c.kind === "hard-deny") return log({ action: "deny", reason: c.reason, source: "hard-rule" });
  const code = (0, import_shell_rules.stripComments)(command, input.posix);
  if (c.kind === "read-only" && !gitRunsRepoProgram(code, cwd)) return { action: "allow", reason: null, source: "read-only" };
  if (repoCommand(code, (0, import_repo_config.readRepoConfig)(cwd).checks)) return log({ action: "allow", reason: null, source: "repo-command" });
  return log({ action: "allow", reason: null, source: "grey" });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  classifyShell,
  guardShell,
  guardShellCodeOnly,
  normalizeCommand,
  stripComments
});
