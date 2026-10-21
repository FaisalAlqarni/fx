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

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { render } = require('../lib/preamble');

// build-cost reads the session transcript from <cwd>/.fx/transcript-path
// (ADR 0040). Writes only where it cannot dirty a work tree: outside git
// (check-ignore exits 128) or where .fx is ignored (0). Whenever it writes
// nothing it removes the file instead, so an earlier session's path is never
// read as this one's. Exit 1 (a tree where .fx is not ignored) is the one case
// it leaves alone: the hook may not touch that tree. A git failure or timeout
// is unknown, and clearing a file this hook wrote is safe there.
function recordTranscriptPath(cwd, transcript) {
  const file = path.join(cwd, '.fx', 'transcript-path');
  const clear = () => { try { fs.rmSync(file, { force: true }); } catch { /* nothing more to do */ } };
  try {
    const g = spawnSync('git', ['check-ignore', '-q', '.fx/transcript-path'], { cwd, timeout: 2000 });
    if (g.status === 1) return;
    if ((g.status !== 0 && g.status !== 128) || typeof transcript !== 'string') return clear();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, transcript + '\n');
  } catch { clear(); } // never block the preamble
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* fall through — emit anyway */ }

  const cwd = input.cwd || process.cwd();

  if (input.hook_event_name === 'SessionStart') recordTranscriptPath(cwd, input.transcript_path);

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
