#!/usr/bin/env node
'use strict';
// Claude Code — SessionStart and SubagentStart.
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

  // A repo may add its own context; the plugin never writes to it.
  const repoMd = path.join(input.cwd || process.cwd(), 'repo.md');
  if (fs.existsSync(repoMd)) {
    text += `\n\nThis repository has a \`repo.md\` describing its structure, `
          + `patterns and local decisions. Read it before changing code here.\n`;
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || 'SessionStart',
      additionalContext: text,
    },
  }));
});
