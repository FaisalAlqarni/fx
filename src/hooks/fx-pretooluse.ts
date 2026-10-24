#!/usr/bin/env node
// Claude Code: the ONE PreToolUse hook fx registers.
//
// ONE ENTRY POINT, ROUTED ON tool_name
//
// Matcher `*`, and this file routes on tool_name itself rather than
// registering a group per tool. Adding a check means adding a branch here,
// never a second group. Kept for portability, not for a harness limit: this
// is what lets the same script serve both Claude Code and Codex, which do
// not share a matcher-group syntax. Per ADR 0018, matcher groups are not
// capped per plugin on either runtime, so the branch here is a design choice,
// not a workaround.
//
// FAIL CLOSED on the guard, FAIL OPEN on the lane check. They are different
// kinds of rule: the guard prevents irreversible damage, so a broken guard must
// refuse; the lane check is advice, so a broken one must not wedge the session.
// The Agent routing branch is advice-class and fails open, like the lane check.
//
// Every fx module is a runtime require inside a try, never a hoisted import:
// an import that throws at load crashes the hook, and a crash fails open.
// The parser and lib/json fail closed like the guard: without them no call
// can be read.

import * as fs from 'fs';
import * as path from 'path';
import type { ClaudePreToolUseOutput, DispatchInput, HookDecision } from '../lib/types';

function deny(reason: string): never {
  process.stderr.write(`[fx] ${reason}\n`);
  process.exit(2);
}

function message(e: unknown): unknown {
  return typeof e === 'object' && e !== null && 'message' in e ? e.message : undefined;
}

let inspect: typeof import('../lib/git-guard').inspect;
let laneCheck: typeof import('../lib/lane-check').laneCheck;
try {
  const guard: typeof import('../lib/git-guard') = require('../lib/git-guard');
  inspect = guard.inspect;
  if (typeof inspect !== 'function') throw new Error('inspect is not a function');
} catch (e) {
  deny(`git guard failed to load (${message(e)}). Denying every command until the plugin is repaired.`);
}
let parseClaudeHookInput: typeof import('../lib/hook-input').parseClaudeHookInput;
let parseJson: typeof import('../lib/json').parseJson;
try {
  const hookInput: typeof import('../lib/hook-input') = require('../lib/hook-input');
  const json: typeof import('../lib/json') = require('../lib/json');
  ({ parseClaudeHookInput } = hookInput);
  ({ parseJson } = json);
  // A file that loads but lacks the export is as broken as one that throws.
  if (typeof parseClaudeHookInput !== 'function') throw new Error('parseClaudeHookInput is not a function');
  if (typeof parseJson !== 'function') throw new Error('parseJson is not a function');
} catch (e) {
  deny(`hook input parser failed to load (${message(e)}). Denying every call until the plugin is repaired.`);
}
try {
  const lane: typeof import('../lib/lane-check') = require('../lib/lane-check');
  ({ laneCheck } = lane);
} catch {
  laneCheck = () => null;            // advice only; never block because it is missing
}

// Routing is advice and fails open, but the user is told: systemMessage is
// shown by Claude Code, stderr alone is not.
let routingOffMsg: string | null = null;
function routingOff(e: unknown): void {
  const m = `[fx] dispatch routing off: ${String(message(e) || e)}`;
  process.stderr.write(`${m}\n`);
  routingOffMsg = m;
}

let route: typeof import('../lib/dispatch-route').route;
try {
  const dispatch: typeof import('../lib/dispatch-route') = require('../lib/dispatch-route');
  ({ route } = dispatch);
} catch (e) {
  routingOff(e);
  route = () => null;                // routing is advice; a broken module passes calls through
}

// Edit rules fail open, except their own refusals: a module that fails to load
// lets the write through, said on stderr once the fx-state refusal and the lane check pass.
let checkEdit: typeof import('../lib/edit-rules').checkEdit | null = null;
let editRulesError: unknown = null;
try {
  const rules: typeof import('../lib/edit-rules') = require('../lib/edit-rules');
  ({ checkEdit } = rules);
  if (typeof checkEdit !== 'function') throw new Error('checkEdit is not a function');
} catch (e) {
  editRulesError = e;
}

// The hard rules fail closed like the git guard; they load apart from the
// rest of the shell guard, so a broken guard module cannot drop them (lens I10).
let classifyShell: typeof import('../lib/shell-rules').classifyShell;
let namesFxState: typeof import('../lib/shell-rules').namesFxState;
let hardReason: typeof import('../lib/shell-rules').hardReason;
let shellRulesError: unknown = null;
try {
  const rules: typeof import('../lib/shell-rules') = require('../lib/shell-rules');
  ({ classifyShell, namesFxState, hardReason } = rules);
  if (typeof classifyShell !== 'function' || typeof namesFxState !== 'function' || typeof hardReason !== 'function') {
    throw new Error('shell-rules is missing an export');
  }
} catch (e) {
  shellRulesError = e;
}

// The rest of the shell guard is a hygiene guard and fails open (red team I8):
// a load failure is reported only after the git guard has allowed the call.
let guardShell: typeof import('../lib/shell-guard').guardShell | null = null;
let claudeGuardOutput: typeof import('../lib/guard-output').claudeGuardOutput | null = null;
let shellGuardError: unknown = null;
try {
  const shell: typeof import('../lib/shell-guard') = require('../lib/shell-guard');
  const output: typeof import('../lib/guard-output') = require('../lib/guard-output');
  ({ guardShell } = shell);
  ({ claudeGuardOutput } = output);
  if (typeof guardShell !== 'function') throw new Error('guardShell is not a function');
  if (typeof claudeGuardOutput !== 'function') throw new Error('claudeGuardOutput is not a function');
} catch (e) {
  shellGuardError = e;
}

// Every path ends with process.exit after its output drains, so an open
// socket or timer never holds the hook past its timeout.
function emit(stdout: string, stderr: string, code: number): void {
  if (stderr) process.stderr.write(stderr);
  if (stdout) process.stdout.write(stdout, () => process.exit(code));
  else process.exit(code);
}

// The state directory, found at load so a guard crash can log without loading anything.
let crashLogDir: string | null = null;
try {
  const paths: typeof import('../lib/fx-paths') = require('../lib/fx-paths');
  crashLogDir = paths.machinePaths().stateDir;
} catch { /* a guard crash then leaves only the warning */ }

// Never throws: it runs inside the crash handlers (lens SF 3).
function describe(e: unknown): string {
  try { return String(message(e) ?? e); } catch { return 'an error that could not be printed'; }
}

// Twin of the same function in hooks/fx-codex.js. A fail-open allow still leaves a
// decision-log line, written with builtins only; the logged message is capped
// and the command is left out, because nothing here can redact it.
function shellGuardOff(e: unknown, session: string | null, cwd: string): void {
  const m = `[fx] shell guard off: ${describe(e)}`;
  try {
    if (crashLogDir === null) throw new Error('no state directory');
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 0o700 });
    const entry = { ts: new Date().toISOString(), harness: 'claude-code', event: 'guard', session, cwd, text: '', source: 'guard-error', action: 'allow', unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* the warning below is the trace */ }
  emit(JSON.stringify({ systemMessage: m, hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: m } }), `${m}\n`, 0);
}

// Twin of the same function in hooks/fx-codex.js. The edit rules fail open, so a
// load failure or crash leaves one decision-log line, written with builtins only
// because the failure may be in the logger. Returns the stderr line.
function editRulesOff(e: unknown, session: string | null, cwd: string): string {
  const m = `[fx] edit rules off: ${describe(e)}`;
  try {
    if (crashLogDir === null) throw new Error('no state directory');
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 0o700 });
    const entry = { ts: new Date().toISOString(), harness: 'claude-code', event: 'edit-rule', session, cwd, text: '', source: 'error', action: 'allow', unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* the stderr line is the trace */ }
  return m;
}

const crashed = (e: Error) => deny(`hook crashed (${e.message}). Denying rather than assuming this is safe.`);
process.on('uncaughtException', crashed);

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let parsed: unknown;
  try { parsed = parseJson(raw); } catch { process.exit(0); }
  // The hand-written hook read tool_name off a null payload, crashed, and its
  // crash handler refused the call. The refusal and its text are kept.
  if (parsed === null) deny("hook crashed (Cannot read properties of null (reading 'tool_name')). Denying rather than assuming this is safe.");
  const r = parseClaudeHookInput(parsed);
  if (!r.ok) process.exit(0);        // no tool_name to act on
  const input = r.value;

  const tool = input.tool_name;
  const ti = input.tool_input;
  const cwd = input.cwd || process.cwd();

  if (tool === 'Bash') {
    const command = ti?.command;
    if (!command) process.exit(0);
    let verdict: HookDecision;
    try {
      verdict = inspect(command, cwd);
    } catch (e) {
      verdict = { allow: false, reason: `git guard failed to evaluate this command (${message(e)}). Denying rather than assuming it is safe.` };
    }
    if (!verdict.allow) deny(verdict.reason);
    if (typeof command !== 'string') deny(`the shell command is not a string (${typeof command}), so the guards cannot read it. Denying rather than assuming it is safe.`);
    if (shellRulesError !== null) deny(`shell rules failed to load (${message(shellRulesError)}). Denying every shell command until the plugin is repaired.`);
    // A hard rule stands whatever the rest of the guard does; a crash before this line denies.
    const hard = classifyShell(command);
    const hardDeny = hard.kind === 'hard-deny' ? hard.reason : null;
    // From here on a crash fails open, except over a hard rule: the git guard has allowed this call.
    const off = hardDeny === null ? (e: unknown) => shellGuardOff(e, input.session_id ?? null, cwd) : () => emit('', `${hardDeny}\n`, 2);
    process.removeListener('uncaughtException', crashed);
    process.on('uncaughtException', off);
    process.on('unhandledRejection', off);
    if (!guardShell || !claudeGuardOutput) {
      off(shellGuardError);
      return;
    }
    const render = claudeGuardOutput;
    guardShell({ command, cwd, harness: 'claude-code', sessionId: input.session_id ?? null, now: Date.now() })
      .then((d) => {
        const out = render(hardDeny === null ? d : { action: 'deny', reason: hardDeny, source: 'hard-rule' });
        emit(out.stdout, out.stderr, out.exitCode);
      }, off);
    return;
  }

  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const file = ti?.file_path || ti?.path || ti?.notebook_path;
    // fx's own state holds the session journals; a forged line would change what the Stop check sees (lens I8).
    if (shellRulesError !== null) deny(`shell rules failed to load (${message(shellRulesError)}). Denying every file write until the plugin is repaired.`);
    if (typeof file === 'string' && namesFxState(path.resolve(cwd, file))) deny(hardReason('fx-state').slice('[fx] '.length));
    let reason: string | null = null;
    try {
      // A non-string path made laneCheck throw, which allowed the write; null allows it too.
      reason = laneCheck(typeof file === 'string' ? file : null, cwd);
    } catch {
      reason = null;                 // advice: a bug here must not block a write
    }
    if (reason) deny(reason);
    // From here a crash allows the write: the fx-state refusal and the lane check have passed.
    const off = (e: unknown) => emit('', `${editRulesOff(e, input.session_id ?? null, cwd)}\n`, 0);
    process.removeListener('uncaughtException', crashed);
    process.on('uncaughtException', off);
    process.on('unhandledRejection', off);
    if (!checkEdit) {
      off(editRulesError);
      return;
    }
    checkEdit({ harness: 'claude-code', sessionId: input.session_id ?? null, cwd, toolName: tool, toolInput: ti, now: Date.now() })
      .then((d) => {
        if (d.action === 'refuse') emit('', `${d.reason}\n`, 2);
        else emit('', '', 0);
      }, off);
    return;
  }

  if (tool === 'Agent' || tool === 'Task') {
    // Routing is advice: from here a crash lets the dispatch through unchanged.
    process.removeListener('uncaughtException', crashed);
    process.on('uncaughtException', () => process.exit(0));
    let routed: DispatchInput | null = null;
    try {
      routed = route(ti);
    } catch (e) {
      routingOff(e);
    }
    let out: ClaudePreToolUseOutput | null = null;
    if (routed) out = { hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: routed } };
    else if (routingOffMsg) out = { systemMessage: routingOffMsg };
    // exit only after stdout drains: a large prompt can outrun the pipe
    if (out) process.stdout.write(JSON.stringify(out), () => process.exit(0));
    else process.exit(0);
    return;
  }

  process.exit(0);
});
