#!/usr/bin/env node
'use strict';
// Claude Code: SessionStart and SubagentStart.
//
// Two events, one text. The subagent case is the one that matters: a dispatched
// subagent reads neither CLAUDE.md nor memory, so without this hook the
// non-negotiables reach it through nothing at all.
//
// `--part <i>`: hooks.json runs three handlers per event, each printing one
// part of the render, because Claude Code previews any single hook's context
// over 10,000 characters instead of showing it (design amendment A3). With no
// `--part` the whole render is printed.

const { render, renderParts, partForHandler } = require('../lib/preamble');

const at = process.argv.indexOf('--part');
const part = at === -1 ? 0 : Number(process.argv[at + 1]);

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* fall through — emit anyway */ }

  const cwd = input.cwd || process.cwd();

  let text;
  try {
    text = part
      ? partForHandler(renderParts({ harness: 'claude-code', cwd }), part)
      : render({ harness: 'claude-code', cwd });
  } catch {
    // Say so rather than starting a session that silently has no rules.
    // Once only: part 1 says it, the other handlers stay quiet.
    text = part > 1 ? '' : '[fx] PREAMBLE.md could not be read. The fx routing table and '
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
