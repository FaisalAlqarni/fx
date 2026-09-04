#!/usr/bin/env node
'use strict';
// Claude Code: the ONE PreToolUse hook fx registers.
//
// WHY ONE
//
// fx originally registered two PreToolUse groups: `Bash` for the git guard and
// `Write|Edit` for the lane check. Measured, twice: the Bash group fires and
// the second group never does, including with the widest matcher the harness
// accepts (`*`). A 333-tool-call build wrote an entire Rails app and the lane
// check observed nothing; a probe forced to use the Write tool was not stopped
// and left no marker.
//
// So the harness honours one PreToolUse group per plugin. Matcher `*`, and this
// file routes on tool_name itself. Adding a check means adding a branch here,
// never a second group.
//
// FAIL CLOSED on the guard, FAIL OPEN on the lane check. They are different
// kinds of rule: the guard prevents irreversible damage, so a broken guard must
// refuse; the lane check is advice, so a broken one must not wedge the session.

const path = require('path');

function deny(reason) {
  process.stderr.write(`[fx] ${reason}\n`);
  process.exit(2);
}

let inspect, laneCheck;
try {
  ({ inspect } = require('../lib/git-guard'));
  if (typeof inspect !== 'function') throw new Error('inspect is not a function');
} catch (e) {
  deny(`git guard failed to load (${e.message}). Denying every command until the plugin is repaired.`);
}
try {
  ({ laneCheck } = require('../lib/lane-check'));
} catch {
  laneCheck = () => null;            // advice only; never block because it is missing
}

process.on('uncaughtException', (e) =>
  deny(`hook crashed (${e.message}). Denying rather than assuming this is safe.`));

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  const tool = input.tool_name;
  const ti = input.tool_input || {};
  const cwd = input.cwd || process.cwd();

  if (tool === 'Bash') {
    const command = ti.command;
    if (!command) process.exit(0);
    let verdict;
    try {
      verdict = inspect(command, cwd);
    } catch (e) {
      verdict = { allow: false, reason: `git guard failed to evaluate this command (${e.message}). Denying rather than assuming it is safe.` };
    }
    if (!verdict.allow) deny(verdict.reason);
    process.exit(0);
  }

  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const file = ti.file_path || ti.path || ti.notebook_path;
    let reason = null;
    try {
      reason = laneCheck(file, cwd);
    } catch {
      reason = null;                 // advice: a bug here must not block a write
    }
    if (reason) deny(reason);
    process.exit(0);
  }

  process.exit(0);
});
