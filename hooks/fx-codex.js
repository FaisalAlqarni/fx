#!/usr/bin/env node
'use strict';
// Codex: SessionStart, SubagentStart, and PreToolUse.
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
// FAIL CLOSED on the guard, FAIL OPEN on the lane check — same split as
// fx-pretooluse.js, for the same reason: the guard prevents irreversible
// damage, so a broken guard must refuse; the lane check is advice, so a
// broken one must not wedge the session.

const { render } = require('../lib/preamble');

let inspect, guardLoadError;
try {
  ({ inspect } = require('../lib/git-guard'));
  if (typeof inspect !== 'function') throw new Error('inspect is not a function');
} catch (e) {
  guardLoadError = e;                // deferred: only PreToolUse needs the guard
}
let laneCheck;
try {
  ({ laneCheck } = require('../lib/lane-check'));
} catch {
  laneCheck = () => null;            // advice only; never block because it is missing
}

function deny(reason) {
  process.stderr.write(`[fx] ${reason}\n`);
  process.exit(2);
}

function handlePreToolUse(input) {
  process.on('uncaughtException', (e) =>
    deny(`hook crashed (${e.message}). Denying rather than assuming this is safe.`));

  const tool = input.tool_name;
  const ti = input.tool_input || {};
  const cwd = input.cwd || process.cwd();

  if (tool === 'Bash') {
    const command = ti.command;
    if (!command) process.exit(0);
    if (guardLoadError) {
      deny(`git guard failed to load (${guardLoadError.message}). Denying every command until the plugin is repaired.`);
    }
    let verdict;
    try {
      verdict = inspect(command, cwd);
    } catch (e) {
      verdict = { allow: false, reason: `git guard failed to evaluate this command (${e.message}). Denying rather than assuming it is safe.` };
    }
    if (!verdict.allow) deny(verdict.reason);
    process.exit(0);
  }

  if (tool === 'apply_patch') {
    // UNVERIFIED FIELD NAME: no live Codex session was run for this task (by
    // instruction). Binary inspection of the installed Codex CLI 0.155.1
    // shows apply_patch is a freeform tool whose argument is raw multi-file
    // patch text ("*** Update File: {path}" markers), not necessarily a
    // structured object with file_path/path keys. If the real PreToolUse
    // payload does not carry either key, laneCheck(undefined, cwd) returns
    // null below and this branch passes every call silently — wired but
    // inert. Confirm the real key against a live session before trusting
    // this in production.
    const file = ti.file_path || ti.path;
    let reason = null;
    try {
      reason = laneCheck(file, cwd);
    } catch {
      reason = null;                 // advice: a bug here must not block an edit
    }
    if (reason) deny(reason);
    process.exit(0);
  }

  process.exit(0);
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* fall through — emit anyway */ }

  if (input.hook_event_name === 'PreToolUse') {
    handlePreToolUse(input);
    return;
  }

  const cwd = input.cwd || process.cwd();

  let text;
  try {
    text = render({ harness: 'codex', cwd });
  } catch {
    // Say so rather than starting a session that silently has no rules.
    text = '[fx] PREAMBLE.md could not be read. The fx routing table and '
         + 'non-negotiables are NOT loaded in this session. Do not commit, '
         + 'and tell the user the plugin is misinstalled.';
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || 'SessionStart',
      additionalContext: text,
    },
  }));
});
