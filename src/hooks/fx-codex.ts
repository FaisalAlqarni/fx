#!/usr/bin/env node
// Codex: SessionStart, SubagentStart, PreToolUse, UserPromptSubmit, PostToolUse, Stop and SubagentStop.
//
// ONE ENTRY POINT, ROUTED ON hook_event_name, THEN ON tool_name
//
// The two context events still just emit the rendered preamble, mirroring
// hooks/fx-context.js addressed for Codex instead of Claude Code. PreToolUse
// mirrors hooks/fx-pretooluse.js: same fail-closed guard, same fail-open
// lane check, on the same stdin-JSON/exit-code contract Codex measures as
// identical to Claude Code's. See fx-pretooluse.js's header for why one
// entry point routed on tool_name is what lets the same script serve both
// runtimes.
//
// Codex has no Write/Edit tool: it edits through apply_patch. So the lane
// check here follows apply_patch, where on Claude Code it follows
// Write/Edit/MultiEdit/NotebookEdit. Routing only the shell would leave the
// check absent while looking present, which is the failure this plan exists
// to stop.
//
// FAIL CLOSED on the guard, FAIL OPEN on the lane check: same split as
// fx-pretooluse.js, for the same reason: the guard prevents irreversible
// damage, so a broken guard must refuse; the lane check is advice, so a
// broken one must not wedge the session. The shell guard after the git guard
// keeps its hard rules fail-closed and fails open past them, as on Claude Code.
//
// UserPromptSubmit records the user's prompt in the session journal (design
// decision 6); a named event this file does not route prints nothing (red team M23).

// Only builtins load unguarded. Every fx module is a runtime require inside a
// try, never a hoisted import, so a broken install can never crash the hook at
// load: a crash exits 1, which Codex treats as a failed, non-blocking run, and
// that would skip the guard and the read-only check (security re-review I2).
// lib/preamble, which only the context events need, is required where it is
// used, below.
import * as fs from 'fs';
import * as path from 'path';
import type { CodexHookInput, CodexHookOutput, HookDecision } from '../lib/types';

function message(e: unknown): unknown {
  return typeof e === 'object' && e !== null && 'message' in e ? e.message : undefined;
}

// Read-only agents (task 06): identity from SubagentStart, enforcement here.
// See lib/plant-roles.js's header for the full reasoning; this file only
// routes to it.
type PlantRoles = typeof import('../lib/plant-roles');
let roles: PlantRoles | undefined;
let rolesLoadError: unknown;
try {
  roles = require('../lib/plant-roles');
} catch (e) {
  // A broken require must not stop SessionStart from rendering the
  // preamble. It must not open the read-only check either: PreToolUse
  // refuses every subagent call while this is set (final review I3).
  rolesLoadError = e;
}

// Codex's apply_patch carries its whole payload as raw text under `command`,
// the SAME key Bash uses. Measured live against Codex CLI 0.155.1 (fix
// round 1):
//
//   tool_name='apply_patch'  tool_input keys=['command']
//     command = '*** Begin Patch\n*** Update File: target.js\n@@\n' +
//                '-const b = 2;\n+const b = 3;\n*** End Patch'
//
// This is why routing on tool_name, not on the presence of tool_input.command,
// is load-bearing: a hook that dispatched on "does tool_input have a command
// field" would hand raw patch text to the git guard and have it inspected as
// a shell command. Nothing here does that: tool_name is checked first, and
// only 'Bash' ever reaches inspect().
//
// extractPatchPaths lives in lib/patch-paths (it parses the V4A headers). The
// fx-state refusal reads its paths, so it fails closed like the guards: a load
// failure or a throw denies every apply_patch (checkPatchPaths). Only the
// PostToolUse edit counting, in lib/tool-events, fails open.
let extractPatchPaths: typeof import('../lib/patch-paths').extractPatchPaths | undefined;
let patchPathsError: unknown;
try {
  const patchPaths: typeof import('../lib/patch-paths') = require('../lib/patch-paths');
  if (typeof patchPaths.extractPatchPaths !== 'function') throw new Error('extractPatchPaths is not a function');
  ({ extractPatchPaths } = patchPaths);
} catch (e) {
  patchPathsError = e;
}

let inspect: typeof import('../lib/git-guard').inspect | undefined;
let guardLoadError: unknown;
try {
  const guard: typeof import('../lib/git-guard') = require('../lib/git-guard');
  inspect = guard.inspect;
  if (typeof inspect !== 'function') throw new Error('inspect is not a function');
} catch (e) {
  guardLoadError = e;                // deferred: only PreToolUse needs the guard
}
let laneCheck: typeof import('../lib/lane-check').laneCheck;
try {
  const lane: typeof import('../lib/lane-check') = require('../lib/lane-check');
  ({ laneCheck } = lane);
} catch {
  laneCheck = () => null;            // advice only; never block because it is missing
}
// The parser and lib/json fail closed like the guard: without them no event
// can be told apart from a PreToolUse call, so every event is refused,
// SessionStart and SubagentStart included. That costs the preamble and role
// planting for the session, which is the price of never allowing a call unread.
let parseCodexHookInput: typeof import('../lib/hook-input').parseCodexHookInput | undefined;
let subagentId: typeof import('../lib/hook-input').subagentId | undefined;
let parseJson: typeof import('../lib/json').parseJson | undefined;
let parserLoadError: unknown;
try {
  const hookInput: typeof import('../lib/hook-input') = require('../lib/hook-input');
  const json: typeof import('../lib/json') = require('../lib/json');
  ({ parseCodexHookInput, subagentId } = hookInput);
  ({ parseJson } = json);
  // A file that loads but lacks the export is as broken as one that throws.
  if (typeof parseCodexHookInput !== 'function') throw new Error('parseCodexHookInput is not a function');
  if (typeof subagentId !== 'function') throw new Error('subagentId is not a function');
  if (typeof parseJson !== 'function') throw new Error('parseJson is not a function');
} catch (e) {
  parserLoadError = e;
}

function deny(reason: string): never {
  process.stderr.write(`[fx] ${reason}\n`);
  process.exit(2);
}

// Edit rules fail open, except their own refusals: a module that fails to load
// lets the patch through, said on stderr once the fx-state refusal and the lane check pass.
let checkEdit: typeof import('../lib/edit-rules').checkEdit | null = null;
let editRulesError: unknown = null;
try {
  const rules: typeof import('../lib/edit-rules') = require('../lib/edit-rules');
  ({ checkEdit } = rules);
  if (typeof checkEdit !== 'function') throw new Error('checkEdit is not a function');
} catch (e) {
  editRulesError = e;
}

// The hard rules fail closed like the git guard; they import nothing from the
// rest of the shell guard, so a broken guard module cannot drop them (lens I10).
let classifyShell: typeof import('../lib/shell-rules').classifyShell | null = null;
let namesFxState: typeof import('../lib/shell-rules').namesFxState | null = null;
let hardReason: typeof import('../lib/shell-rules').hardReason | null = null;
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

// The rest of the shell guard fails open (red team I8): a load failure is
// reported only after the git guard has allowed the call.
let guardShell: typeof import('../lib/shell-guard').guardShell | null = null;
let codexGuardOutput: typeof import('../lib/guard-output').codexGuardOutput | null = null;
let shellGuardError: unknown = null;
try {
  const shell: typeof import('../lib/shell-guard') = require('../lib/shell-guard');
  const output: typeof import('../lib/guard-output') = require('../lib/guard-output');
  ({ guardShell } = shell);
  ({ codexGuardOutput } = output);
  if (typeof guardShell !== 'function') throw new Error('guardShell is not a function');
  if (typeof codexGuardOutput !== 'function') throw new Error('codexGuardOutput is not a function');
} catch (e) {
  shellGuardError = e;
}

// Every shell guard path ends with process.exit after its output drains, so an
// open socket or timer never holds the hook past its timeout.
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

// Twin of the same function in hooks/fx-pretooluse.js. It prints codexGuardOutput's
// warn form itself, because that module may be the one that failed. A fail-open allow still leaves a
// decision-log line, written with builtins only; the logged message is capped
// and the command is left out, because nothing here can redact it.
function shellGuardOff(e: unknown, session: string | null, cwd: string): void {
  const m = `[fx] shell guard off: ${describe(e)}`;
  try {
    if (crashLogDir === null) throw new Error('no state directory');
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 0o700 });
    const entry = { ts: new Date().toISOString(), harness: 'codex', event: 'guard', session, cwd, text: '', source: 'guard-error', action: 'allow', unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* the warning below is the trace */ }
  emit(JSON.stringify({ systemMessage: m, hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: m } }), `${m}\n`, 0);
}

// Twin of the same function in hooks/fx-pretooluse.js: one decision-log line, builtins only. Returns the stderr line.
function editRulesOff(e: unknown, session: string | null, cwd: string): string {
  const m = `[fx] edit rules off: ${describe(e)}`;
  try {
    if (crashLogDir === null) throw new Error('no state directory');
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 0o700 });
    const entry = { ts: new Date().toISOString(), harness: 'codex', event: 'edit-rule', session, cwd, text: '', source: 'error', action: 'allow', unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* the stderr line is the trace */ }
  return m;
}

const crashed = (e: unknown) => deny(`hook crashed (${describe(e)}). Denying rather than assuming this is safe.`);

// The lane check on every path a patch names; refuses on the first offender.
// extractPatchPaths does not throw on any input; if it cannot load or throws, the call is denied. A shell call known to be an apply_patch
// whose paths cannot be read (a patch from a file or a variable) is allowed,
// and one stderr line says the lane check could not read it.
function checkPatchPaths(patchText: unknown, cwd: string, fromShell?: boolean): void {
  let paths: string[];
  try {
    if (!extractPatchPaths) throw patchPathsError ?? new Error('extractPatchPaths is not loaded');
    paths = extractPatchPaths(patchText);
  } catch (e) {
    deny(`lib/patch-paths failed (${message(e)}), so the paths of this apply_patch cannot be read. Denying every apply_patch until the plugin is repaired.`);
  }
  // fx's own state holds the user's prompts; a forged one would loosen the shell guard (lens I8).
  if (paths.length > 0) {
    if (shellRulesError !== null || !namesFxState || !hardReason) {
      deny(`shell rules failed to load (${message(shellRulesError)}). Denying every file write until the plugin is repaired.`);
    }
    for (const p of paths) {
      if (namesFxState(path.resolve(cwd, p))) deny(hardReason('fx-state').slice('[fx] '.length));
    }
  }
  if (fromShell && paths.length === 0) {
    process.stderr.write('[fx] the lane check could not read the paths of this apply_patch, so it did not check them.\n');
  }
  for (const p of paths) {
    let reason = null;
    try {
      reason = laneCheck(path.resolve(cwd, p), cwd);
    } catch {
      reason = null;                 // advice: a bug here must not block an edit
    }
    if (reason) deny(reason);        // refuse on the FIRST offending path; its own
  }                                   // reason already names which one
}

// A model with no apply_patch function tool edits through a shell call,
// `apply_patch <<'PATCH' ...`, which Codex runs as a patch itself. The word
// counts as a command wherever a command can start: at the start, after a
// separator, a subshell, a group or `$(`, inside `bash -c "`, or after
// env/time/xargs and their words. `grep apply_patch` and `echo apply_patch`
// are not edits.
const SHELL_APPLY_PATCH = /(?:^|[\n;&|({`]|\$\(|\b(?:ba|z|da)?sh\s+-\w*c\s+["']|\b(?:env|time|xargs|exec|command|nohup|sudo)\b[^\n;&|]*?)\s*apply_patch\b/;

function handlePreToolUse(input: CodexHookInput): void {
  // This runs inside the async stdin handler, so a throw here arrives as a rejection:
  // both events deny, whatever Node's --unhandled-rejections mode.
  process.on('uncaughtException', crashed);
  process.on('unhandledRejection', crashed);

  const tool = input.tool_name;
  const ti = input.tool_input;
  const cwd = input.cwd || process.cwd();
  const agentId = input.agent_id;

  // Read-only agents. A subagent's own tool calls carry agent_id; the
  // controller's do not (ADR 0019), so no agent_id means this check is not
  // this call's business at all. `agent_type` on THIS payload is never
  // consulted: it is undocumented here, so the only identity trusted is
  // whatever SubagentStart recorded for this agent_id. Unrecorded ==
  // unclassifiable == refused on a write, same as a classified lens.
  // Without plant-roles there is no way to tell a lens from an implementer,
  // or a read from a write, so a subagent's call is refused. Fail closed.
  if (agentId && (rolesLoadError || !roles)) {
    deny(`lib/plant-roles failed to load (${message(rolesLoadError)}), so subagent ${agentId}'s role cannot be verified; refusing the call. Reinstall the plugin.`);
  }
  if (agentId && roles) {
    let known = null;
    try { known = roles.lookupAgentIdentity(agentId); } catch { known = null; }
    const mustRefuseWrites = known === null ? true : roles.isReadOnlyAgent(known);
    // Amendment A5, fail closed: an allowlist, not a denylist. A read-only
    // agent may call exactly one tool, Bash, and only when the read-only
    // classifier clears the command. Everything else is refused, including
    // tools this hook has never heard of. research/codex.md section 2
    // ("PreToolUse stdin") lists the tool names a hook sees: Bash,
    // apply_patch, spawn_agent, mcp__<server>__<tool>, and any other function
    // tool by its flat name. Of those, only Bash is gated by a classifier that
    // can prove a call read-only; apply_patch writes, spawn_agent hands work to
    // a child, an MCP server's effects are invisible here, and "Making a
    // subagent read-only" in section 3 names memory_tool, apps and
    // request_permissions_tool as further tools a role can carry. A lens reads
    // through the shell (references/harnesses/codex.md), so it needs no other.
    let cleared = false;
    if (tool === 'Bash') {
      try { cleared = !roles.isWritingToolCall(tool, ti); } catch { cleared = false; } // a crash is a refusal
    }
    if (mustRefuseWrites && !cleared) {
      deny(known
        ? `${known} is read-only and must not write (blocked: ${tool}).`
        : `subagent ${agentId} was never recorded at SubagentStart, so its role cannot be verified; refusing the write rather than assuming it is safe.`);
    }
  }

  if (tool === 'Bash') {
    // The git guard reads whatever arrived; the shell guard reads only a string (red team M21).
    const raw = ti?.command;
    if (!raw) process.exit(0);
    if (guardLoadError || !inspect) {
      deny(`git guard failed to load (${message(guardLoadError)}). Denying every command until the plugin is repaired.`);
    }
    let verdict: HookDecision;
    try {
      verdict = inspect(raw, cwd);
    } catch (e) {
      verdict = { allow: false, reason: `git guard failed to evaluate this command (${message(e)}). Denying rather than assuming it is safe.` };
    }
    if (!verdict.allow) deny(verdict.reason);
    const command = input.command;
    if (command === undefined) deny(`the shell command is not a string (${typeof raw}), so the guards cannot read it. Denying rather than assuming it is safe.`);
    const patch = SHELL_APPLY_PATCH.test(command);
    if (patch) checkPatchPaths(command, cwd, true);
    // The hard rules run here, synchronously: a throw becomes a rejection that
    // `crashed` denies, and a slow edit check below cannot delay or skip them.
    const hardDeny = shellHardRules(command);
    if (!patch || hardDeny !== null) return shellGuard(input, command, cwd, hardDeny);
    // A refusal comes before the shell guard.
    const rulesOff = (e: unknown) => {
      process.stderr.write(`${editRulesOff(e, input.session_id ?? null, cwd)}\n`);
      shellGuard(input, command, cwd, null);
    };
    if (!checkEdit) return rulesOff(editRulesError);
    checkEdit({ harness: 'codex', sessionId: input.session_id ?? null, cwd, toolName: 'Bash', toolInput: ti, now: Date.now() })
      .then((d) => (d.action === 'refuse' ? emit('', `${d.reason}\n`, 2) : shellGuard(input, command, cwd, null)), rulesOff);
    return;
  }

  if (tool === 'apply_patch') {
    checkPatchPaths(ti?.command, cwd);
    // From here a crash allows the patch: the fx-state refusal and the lane check have passed.
    const off = (e: unknown) => emit('', `${editRulesOff(e, input.session_id ?? null, cwd)}\n`, 0);
    process.removeListener('uncaughtException', crashed);
    process.removeListener('unhandledRejection', crashed);
    process.on('uncaughtException', off);
    process.on('unhandledRejection', off);
    if (!checkEdit) return off(editRulesError);
    checkEdit({ harness: 'codex', sessionId: input.session_id ?? null, cwd, toolName: 'apply_patch', toolInput: ti, now: Date.now() })
      .then((d) => {
        if (d.action === 'refuse') emit('', `${d.reason}\n`, 2);
        else emit('', '', 0);
      }, off);
    return;
  }

  process.exit(0);
}

// On Windows Codex runs the command in PowerShell.
const posix = process.platform !== 'win32';

// The shell hard rules, fail closed: the reason of the rule a command breaks, or null.
function shellHardRules(command: string): string | null {
  if (shellRulesError !== null || !classifyShell) deny(`shell rules failed to load (${message(shellRulesError)}). Denying every shell command until the plugin is repaired.`);
  const hard = classifyShell(command, posix);
  return hard.kind === 'hard-deny' ? hard.reason : null;
}

// The rest of the shell guard, after its hard rules: a hard rule stands whatever the rest does.
function shellGuard(input: CodexHookInput, command: string, cwd: string, hardDeny: string | null): void {
  // From here on a crash fails open, except over a hard rule: the git guard has allowed this call.
  const off = hardDeny === null ? (e: unknown) => shellGuardOff(e, input.session_id ?? null, cwd) : () => emit('', `${hardDeny}\n`, 2);
  process.removeListener('uncaughtException', crashed);
  process.removeListener('unhandledRejection', crashed);
  process.on('uncaughtException', off);
  process.on('unhandledRejection', off);
  if (!guardShell || !codexGuardOutput) {
    off(shellGuardError);
    return;
  }
  const render = codexGuardOutput;
  guardShell({ command, cwd, harness: 'codex', sessionId: input.session_id ?? null, now: Date.now(), posix })
    .then((d) => {
      const out = render(hardDeny === null ? d : { action: 'deny', reason: hardDeny, source: 'hard-rule' });
      emit(out.stdout, out.stderr, out.exitCode);
    }, off);
}

// The one agent_id rule (lib/hook-input). Without it the parser failed to load and no call gets this far.
const subagentOf = (id: unknown): string | null => (subagentId ? subagentId(id) : null);

// A subagent's turn starts here: a prompt event with no text in its own journal.
function startSubagentTurn(input: CodexHookInput, agentId: string, journal: typeof import('../lib/journal')): void {
  const key = journal.journalKey(input.session_id, agentId);
  if (key !== null) journal.appendEvent(key, { t: Date.now(), kind: 'prompt', text: null, agentType: input.agent_type ?? null });
}

function loadJournal(): typeof import('../lib/journal') {
  const journal: typeof import('../lib/journal') = require('../lib/journal');
  if (![journal.appendEvent, journal.appendPrompt, journal.journalKey].every((f) => typeof f === 'function')) throw new Error('journal exports are missing');
  return journal;
}

// Never exits 2: on UserPromptSubmit that would block the user's prompt.
function recordPrompt(input: CodexHookInput): void {
  try {
    const prompt = input.prompt;
    const { STOP_SENTENCE }: typeof import('../lib/stop-sentence') = require('../lib/stop-sentence');
    // fx's own Stop continuation is not a user prompt (red team I18), wherever Codex puts its sentence (final review I5).
    if (typeof prompt !== 'string' || prompt.startsWith('[fx] ') || STOP_SENTENCE.test(prompt)) return;
    const journal = loadJournal();
    const agentId = subagentOf(input.agent_id);
    // Inside a subagent the prompt is the parent's dispatch, never the user's words.
    if (agentId !== null) {
      startSubagentTurn(input, agentId, journal);
      return;
    }
    const key = journal.journalKey(input.session_id);
    // With no session id there is no journal.
    if (key !== null) journal.appendPrompt(key, prompt, Date.now());
  } catch (e) {
    process.stderr.write(`[fx] turn hook: ${String(message(e) ?? e)}\n`);
  }
}

// A tracker that cannot load or that throws leaves one decision-log line, written with builtins
// only because the failure may be in the logger. Twin of trackerOff in hooks/fx-turn.ts.
function trackerOff(e: unknown, input: CodexHookInput): void {
  const m = `[fx] loop tracker off: ${describe(e)}`;
  process.stderr.write(`${m}\n`);
  try {
    if (crashLogDir === null) throw new Error('no state directory');
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 0o700 });
    const entry = { ts: new Date().toISOString(), harness: 'codex', event: 'nudge', session: input.session_id ?? null, cwd: input.cwd ?? '', text: '', source: 'tracker-error', action: 'none', unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* the stderr line is the trace */ }
}

// Records the call and prints the stuck-loop nudge, if any. Never exits 2 and
// never throws: a nudge is advice, so a load failure costs the record only.
function recordToolCall(input: CodexHookInput): string {
  try {
    const tracker: typeof import('../lib/loop-tracker') = require('../lib/loop-tracker');
    const events: typeof import('../lib/tool-events') = require('../lib/tool-events');
    if (typeof tracker.recordToolResult !== 'function' || typeof events.toolOutcomeAndOutput !== 'function') throw new Error('a tracker module is missing an export');
    if (typeof input.tool_name !== 'string') return '';
    const { outcome, output } = events.toolOutcomeAndOutput('codex', 'PostToolUse', input.tool_response);
    const line = tracker.recordToolResult({
      harness: 'codex', sessionId: input.session_id ?? null, agentId: subagentOf(input.agent_id),
      cwd: input.cwd || process.cwd(), toolName: input.tool_name, toolInput: input.tool_input, command: input.command ?? null, outcome, output,
    });
    return line === null ? '' : JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: line } });
  } catch (e) {
    trackerOff(e, input);
    return '';
  }
}

// Stop and SubagentStop: block the end of a turn once when it edited code and no check passed
// after the last edit. Prints the block JSON or nothing and never exits 2: Codex fails the run
// on a bad Stop hook. A load failure or a throw allows the stop (fail open).
async function stopCheck(input: CodexHookInput, event: 'Stop' | 'SubagentStop'): Promise<string> {
  const cwd = input.cwd || process.cwd();
  try {
    const { decideStop }: typeof import('../lib/stop-check') = require('../lib/stop-check');
    if (typeof decideStop !== 'function') throw new Error('decideStop is not a function');
    const agentId = event === 'SubagentStop' ? subagentOf(input.agent_id) : null;
    if (event === 'SubagentStop' && agentId === null) return '';
    const { text, notice } = await decideStop({
      harness: 'codex', sessionId: input.session_id ?? null, agentId, cwd,
      stopHookActive: input.stop_hook_active, mode: 'block',
    });
    // ADR 0023: Stop prints only decision and reason, so the .fx.json notice goes to stderr.
    if (notice !== null) process.stderr.write(`${notice}\n`);
    return text === null ? '' : JSON.stringify({ decision: 'block', reason: text });
  } catch (e) {
    stopOff(e, input.session_id ?? null, cwd);
    return '';
  }
}

// Twin of shellGuardOff for the Stop check: the allow leaves one decision-log line, builtins only.
function stopOff(e: unknown, session: string | null, cwd: string): void {
  const m = `stop check off: ${describe(e)}`;
  process.stderr.write(`[fx] ${m}\n`);
  try {
    if (crashLogDir === null) throw new Error('no state directory');
    fs.mkdirSync(crashLogDir, { recursive: true, mode: 0o700 });
    const entry = { ts: new Date().toISOString(), harness: 'codex', event: 'stop', session, cwd, text: '', source: 'stop-error', action: 'allow', unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(crashLogDir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* stderr above is the trace */ }
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', async () => {
  if (parserLoadError || !parseCodexHookInput || !parseJson) {
    deny(`hook input parser failed to load (${message(parserLoadError)}). Denying every call until the plugin is repaired.`);
  }
  // Empty stdin is a context event with nothing to say. Anything else must
  // parse to an object: a malformed payload cannot be told apart from a
  // PreToolUse event, and printing SessionStart output for it would allow the
  // call (security re-review Minor 5).
  let parsed: unknown = {};
  if (raw.trim() !== '') {
    try { parsed = parseJson(raw); } catch { parsed = null; }
  }
  const r = parseCodexHookInput(parsed);
  if (!r.ok) deny('hook input is not a JSON object. Refusing rather than guessing which event this is.');
  const input = r.value;

  const event = input.hook_event_name;
  if (event === 'PreToolUse') {
    handlePreToolUse(input);
    return;
  }
  if (event === 'UserPromptSubmit') {
    recordPrompt(input);
    emit('', '', 0);
    return;
  }
  if (event === 'PostToolUse') {
    emit(recordToolCall(input), '', 0);
    return;
  }
  if (event === 'Stop' || event === 'SubagentStop') {
    emit(await stopCheck(input, event), '', 0);
    return;
  }
  // A payload naming no event keeps today's context output (golden fixtures).
  if (typeof event === 'string' && event !== '' && event !== 'SessionStart' && event !== 'SubagentStart') process.exit(0);

  const cwd = input.cwd || process.cwd();

  // Plant the read-only roles on every session. Never lets a planting
  // failure stop the session: Codex also skips a plugin's hooks until the
  // user trusts them, so the setup lane and the installer are the other two
  // callers of the same plantRoles (design.md: "one function does the
  // planting and three callers invoke it").
  //
  // Codex reads roles once, when a session starts and before any hook runs
  // (research/codex.md, "Follow-up: role visibility timing"), so a role this
  // hook writes is dispatchable from the NEXT session only. Say so, once, in
  // the session that wrote or repaired one: `systemMessage` reaches the user
  // (ponytail's writeHookOutput shape), and the same line ends the model's
  // context. A session that wrote nothing is silent.
  let notice: string | null = null;
  if (input.hook_event_name === 'SessionStart' && roles) {
    try {
      const { written, stale } = roles.plantRoles();
      const names = [...written, ...stale].map((p) => path.basename(p, '.toml'));
      if (names.length) {
        notice = `fx installed or updated its review roles (${names.join(', ')}). `
               + 'Codex reads roles when a session starts, so restart Codex once before dispatching an fx review agent.';
      }
    } catch (e) { console.error(`[fx] planting the review roles failed: ${message(e) || e}`); /* the session starts regardless */ }
  }

  // Record which role this subagent is, at the event where agent_type is
  // documented, so PreToolUse never has to trust it on its own undocumented
  // appearance there.
  if (input.hook_event_name === 'SubagentStart' && roles) {
    try { roles.recordAgentIdentity({ agentId: input.agent_id, agentType: input.agent_type }); } catch { /* best effort */ }
  }
  // A broken journal means no journal, never a missing preamble.
  const startedId = subagentOf(input.agent_id);
  if (input.hook_event_name === 'SubagentStart' && startedId !== null) {
    try { startSubagentTurn(input, startedId, loadJournal()); } catch (e) { process.stderr.write(`[fx] journal: ${String(message(e) ?? e)}\n`); }
  }

  // SessionStart only: delete stale journals, then check .fx.json for changed
  // hook switches. A failed load skips both, never the preamble.
  let health: string | null = null;
  if (input.hook_event_name === 'SessionStart') {
    try {
      const { pruneJournals }: typeof import('../lib/journal') = require('../lib/journal');
      const { fxJsonNotice }: typeof import('../lib/fx-json-watch') = require('../lib/fx-json-watch');
      if (typeof pruneJournals !== 'function' || typeof fxJsonNotice !== 'function') throw new Error('session start exports are missing');
      pruneJournals(Date.now());
      const line = fxJsonNotice(input.session_id ?? null, cwd, Date.now(), 'codex');
      // Codex skips a hook event until the user trusts it, and fx cannot read that state.
      if (line) health = `${line} New fx hook events need trusting once in /hooks.`;
    } catch (e) {
      console.error(`[fx] session start: ${message(e) || e}`);
    }
  }

  let text: string;
  try {
    const preamble: typeof import('../lib/preamble') = require('../lib/preamble');
    text = preamble.render({ harness: 'codex', cwd, subagent: input.hook_event_name === 'SubagentStart' });
  } catch {
    // Say so rather than starting a session that silently has no rules.
    text = '[fx] PREAMBLE.md could not be read. The fx bootstrap and its always-on '
         + 'rules are NOT loaded in this session. Do not commit, '
         + 'and tell the user the plugin is misinstalled.';
  }

  const lines = [notice, health].filter((l): l is string => l !== null);
  const out: CodexHookOutput = {
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || 'SessionStart',
      additionalContext: lines.length ? `${text.trimEnd()}${lines.map((l) => `\n\n${l}`).join('')}\n` : text,
    },
  };
  if (lines.length) out.systemMessage = lines.join('\n');
  process.stdout.write(JSON.stringify(out));
});
