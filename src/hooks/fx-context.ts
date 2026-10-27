#!/usr/bin/env node
// Claude Code: SessionStart and SubagentStart.
//
// Two events, one text. The subagent case is the one that matters: a dispatched
// subagent reads neither CLAUDE.md nor memory, so without this hook the
// always-on rules reach it through nothing at all.
//
// Claude Code previews any single hook's context over 10,000 characters
// instead of showing it. The render stays under 9,000 in the worst case, and
// the bootstrap alone under 3,400 (lib/preamble.test.js pins both,
// docs/adr/0021). One handler per event: with several, Claude
// Code runs them in unstable order and a later part can land above the
// opening imperative.

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { ClaudeContextOutput, ClaudeHookInput } from '../lib/types';

const UNREAD = '[fx] PREAMBLE.md could not be read. The fx bootstrap and its always-on '
  + 'rules are NOT loaded in this session. Do not commit, '
  + 'and tell the user the plugin is misinstalled.';

// Every fx module loads inside a try (lib/preamble below, where it is used): a
// broken one ends in the warning above, not in a crash that starts the session
// with no rules and no word about it.
let readInput: ((raw: string) => ClaudeHookInput | null) | null = null;
try {
  const { parseClaudeHookInput }: typeof import('../lib/hook-input') = require('../lib/hook-input');
  const { parseJson }: typeof import('../lib/json') = require('../lib/json');
  if (typeof parseClaudeHookInput !== 'function') throw new Error('parseClaudeHookInput is not a function');
  if (typeof parseJson !== 'function') throw new Error('parseJson is not a function');
  readInput = (raw) => {
    let parsed: unknown = {};
    try { parsed = parseJson(raw); } catch { /* fall through: emit anyway */ }
    // Input that is not an object reads as no fields at all.
    const r = parseClaudeHookInput(parsed);
    return r.ok ? r.value : null;
  };
} catch { /* readInput stays null */ }

// build-cost reads the session transcript from <git common dir>/fx/transcript-path
// (ADR 0040, e2e bug 3). git never tracks that dir and every worktree of the
// repo shares it, so a session in the main checkout is found from a worktree
// and no ignore rule is needed. Outside git, or when git fails, it writes
// nothing. With no transcript it removes the file, so an earlier session's
// path is never read as this one's.
function recordTranscriptPath(cwd: string, transcript: string | undefined): void {
  try {
    const g = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd, encoding: 'utf8', timeout: 2000 });
    if (g.status !== 0 || !g.stdout.trim()) return;
    const file = path.join(path.resolve(cwd, g.stdout.trim()), 'fx', 'transcript-path');
    if (typeof transcript !== 'string') return fs.rmSync(file, { force: true });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, transcript + '\n');
  } catch { /* never block the preamble */ }
}

// A subagent's turn starts at its SubagentStart. The journal loads inside the
// try: a broken journal means no journal, never a crashed context hook.
function recordSubagentTurn(input: ClaudeHookInput): void {
  try {
    const { appendEvent, journalKey }: typeof import('../lib/journal') = require('../lib/journal');
    const { subagentId }: typeof import('../lib/hook-input') = require('../lib/hook-input');
    if (typeof appendEvent !== 'function' || typeof journalKey !== 'function' || typeof subagentId !== 'function') throw new Error('journal exports are missing');
    // Without an agent id this is not a subagent: the root turn stays alone.
    const agentId = subagentId(input.agent_id);
    if (agentId === null) return;
    const key = journalKey(input.session_id, agentId);
    if (key === null) return;
    appendEvent(key, { t: Date.now(), kind: 'prompt', text: null, agentType: input.agent_type ?? null });
  } catch (e) {
    process.stderr.write(`[fx] journal: ${e instanceof Error ? e.message : String(e)}\n`);
  }
}

// SessionStart only: delete stale journals, then check .fx.json for changed
// hook switches. Both load inside the try, so a broken module costs the line
// and the prune, never the preamble. Returns the notice, or null.
function sessionStartNotice(input: ClaudeHookInput, cwd: string): string | null {
  try {
    const { pruneJournals }: typeof import('../lib/journal') = require('../lib/journal');
    const { fxJsonNotice }: typeof import('../lib/fx-json-watch') = require('../lib/fx-json-watch');
    if (typeof pruneJournals !== 'function' || typeof fxJsonNotice !== 'function') throw new Error('session start exports are missing');
    pruneJournals(Date.now());
    return fxJsonNotice(input.session_id ?? null, cwd, Date.now(), 'claude-code');
  } catch (e) {
    process.stderr.write(`[fx] session start: ${e instanceof Error ? e.message : String(e)}\n`);
    return null;
  }
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  const input = readInput ? readInput(raw) : null;

  const cwd = input?.cwd || process.cwd();

  if (input?.hook_event_name === 'SessionStart') recordTranscriptPath(cwd, input.transcript_path);
  if (input?.hook_event_name === 'SubagentStart') recordSubagentTurn(input);

  // Say so rather than starting a session that silently has no rules.
  let text = UNREAD;
  if (readInput) {
    try {
      const { render }: typeof import('../lib/preamble') = require('../lib/preamble');
      text = render({ harness: 'claude-code', cwd, subagent: input?.hook_event_name === 'SubagentStart' });
    } catch { /* text stays UNREAD */ }
  }

  const notice = input?.hook_event_name === 'SessionStart' ? sessionStartNotice(input, cwd) : null;

  const out: ClaudeContextOutput = {
    hookSpecificOutput: {
      hookEventName: input?.hook_event_name || 'SessionStart',
      additionalContext: notice ? `${text.trimEnd()}\n\n${notice}\n` : text,
    },
  };
  if (notice) out.systemMessage = notice;
  process.stdout.write(JSON.stringify(out));
});
