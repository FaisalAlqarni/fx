#!/usr/bin/env node
'use strict';
// Codex: SessionStart and SubagentStart.
//
// Mirrors hooks/fx-context.js exactly, addressed for Codex instead of Claude
// Code. The subagent case is the one that matters: a dispatched subagent
// reads neither CLAUDE.md nor memory, so without this hook the
// non-negotiables reach it through nothing at all.

const { render } = require('../lib/preamble');

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* fall through — emit anyway */ }

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
