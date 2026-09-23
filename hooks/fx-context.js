#!/usr/bin/env node
'use strict';
// Claude Code: SessionStart and SubagentStart.
//
// Two events, one text. The subagent case is the one that matters: a dispatched
// subagent reads neither CLAUDE.md nor memory, so without this hook the
// always-on rules reach it through nothing at all.
//
// Claude Code previews any single hook's context over 10,000 characters
// instead of showing it. The render stays under 9,000 in the worst case, and
// the bootstrap alone under 3,000 (lib/preamble.test.js pins both,
// docs/adr/0021). One handler per event: with several, Claude
// Code runs them in unstable order and a later part can land above the
// opening imperative.

const { render } = require('../lib/preamble');

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* fall through — emit anyway */ }

  const cwd = input.cwd || process.cwd();

  let text;
  try {
    text = render({ harness: 'claude-code', cwd, subagent: input.hook_event_name === 'SubagentStart' });
  } catch {
    // Say so rather than starting a session that silently has no rules.
    text = '[fx] PREAMBLE.md could not be read. The fx bootstrap and its always-on '
         + 'rules are NOT loaded in this session. Do not commit, '
         + 'and tell the user the plugin is misinstalled.';
  }

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name || 'SessionStart',
      additionalContext: text,
    },
  }));
});
