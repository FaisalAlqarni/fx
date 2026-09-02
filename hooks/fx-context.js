#!/usr/bin/env node
'use strict';
// Claude Code: SessionStart and SubagentStart.
//
// Two events, one text. The subagent case is the one that matters: a dispatched
// subagent reads neither CLAUDE.md nor memory, so without this hook the
// non-negotiables reach it through nothing at all.

const fs = require('fs');
const path = require('path');

const PREAMBLE = path.join(__dirname, '..', 'PREAMBLE.md');

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* fall through — emit anyway */ }

  let text;
  try {
    text = fs.readFileSync(PREAMBLE, 'utf8');
  } catch {
    // Say so rather than starting a session that silently has no rules.
    text = '[fx] PREAMBLE.md could not be read. The fx routing table and '
         + 'non-negotiables are NOT loaded in this session. Do not commit, '
         + 'and tell the user the plugin is misinstalled.';
  }

  const cwd = input.cwd || process.cwd();

  // A repo may add its own context; the plugin never writes to it.
  if (fs.existsSync(path.join(cwd, 'repo.md'))) {
    text += `\n\nThis repository has a \`repo.md\` describing its structure, `
          + `patterns and local decisions. Read it before changing code here.\n`;
  }

  // Route on what is actually on disk. The static table above is generic and is
  // read before the agent has looked at the repo; this names the real plan, the
  // real path and the real count, at the one event that fires reliably.
  // DEBT #33. Best effort: never let it stop a session from starting.
  try {
    const { describePlans } = require('../lib/plan-state');
    const plans = describePlans(cwd);
    if (plans) text += `\n\n${plans}`;
  } catch { /* the preamble alone is still worth emitting */ }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || 'SessionStart',
      additionalContext: text,
    },
  }));
});
