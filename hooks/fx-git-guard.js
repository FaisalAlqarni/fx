#!/usr/bin/env node
'use strict';
// Claude Code — PreToolUse on Bash.
// Thin adapter. All judgment lives in lib/git-guard.js, shared with opencode.
//
// FAIL CLOSED, including at load time. An earlier version wrapped only the
// inspect() call, so a missing or corrupt lib/git-guard.js crashed the hook
// with exit 1 — which Claude Code treats as a non-blocking error, and the git
// command ran. A guard that disappears when its own module is broken is worse
// than no guard, because nothing announces it.

function deny(reason) {
  // exit 2 is the blocking path and does not depend on stdout being parsed.
  process.stderr.write(`[fx] ${reason}\n`);
  process.exit(2);
}

let inspect;
try {
  ({ inspect } = require('../lib/git-guard'));
  if (typeof inspect !== 'function') throw new Error('inspect is not a function');
} catch (e) {
  // No stdin read, no parsing — refuse everything until the install is fixed.
  deny(`git guard failed to load (${e.message}). Denying every command until the plugin is repaired.`);
}

process.on('uncaughtException', (e) => deny(`git guard crashed (${e.message}). Denying rather than assuming this command is safe.`));

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  if (input.tool_name !== 'Bash') process.exit(0);
  const command = input.tool_input && input.tool_input.command;
  if (!command) process.exit(0);

  let verdict;
  try {
    verdict = inspect(command, input.cwd || process.cwd());
  } catch (e) {
    verdict = { allow: false, reason: `git guard failed to evaluate this command (${e.message}). Denying rather than assuming it is safe.` };
  }

  if (verdict.allow) process.exit(0);
  deny(verdict.reason);
});
