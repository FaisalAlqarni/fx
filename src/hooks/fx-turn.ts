#!/usr/bin/env node
// Claude Code: the turn events. Routed on hook_event_name: UserPromptSubmit
// records the prompt in the session journal; PostToolUse and PostToolUseFailure
// record the tool call and may print one stuck-loop nudge as additionalContext;
// Stop and SubagentStop may print one evidence-check block as JSON, and Stop the
// .fx.json change notice as systemMessage.
//
// Always exits 0: a UserPromptSubmit exit 2 would block the user's prompt, and
// a nudge never blocks. A failure is one stderr line starting [fx].
import * as fs from 'fs';
import * as path from 'path';
import type { ClaudeHookInput } from '../lib/types';

// A tracker that cannot load or that throws leaves one decision-log line, written with builtins
// only because the failure may be in the logger. Twin of trackerOff in hooks/fx-codex.ts.
function trackerOff(e: unknown, input: ClaudeHookInput): void {
  const m = `[fx] loop tracker off: ${e instanceof Error ? e.message : String(e)}`;
  process.stderr.write(`${m}\n`);
  try {
    const paths: typeof import('../lib/fx-paths') = require('../lib/fx-paths');
    const dir = paths.machinePaths().stateDir;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const entry = { ts: new Date().toISOString(), harness: 'claude-code', event: 'nudge', session: input.session_id ?? null, cwd: input.cwd ?? '', text: '', source: 'tracker-error', action: 'none', unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(dir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* the stderr line is the trace */ }
}

// Records the call and prints the nudge line, if any. A tracker that cannot
// load costs the record, never the session.
function postToolUse(input: ClaudeHookInput, event: 'PostToolUse' | 'PostToolUseFailure'): void {
  try {
    recordAndNudge(input, event);
  } catch (e) {
    trackerOff(e, input);
  }
}

// The one agent_id rule (lib/hook-input), loaded where it is used: a broken module fails that call's own try.
const subagentOf = (id: unknown): string | null => {
  const { subagentId }: typeof import('../lib/hook-input') = require('../lib/hook-input');
  return subagentId(id);
};

function recordAndNudge(input: ClaudeHookInput, event: 'PostToolUse' | 'PostToolUseFailure'): void {
  const tracker: typeof import('../lib/loop-tracker') = require('../lib/loop-tracker');
  const events: typeof import('../lib/tool-events') = require('../lib/tool-events');
  if (typeof tracker.recordToolResult !== 'function' || typeof events.toolOutcomeAndOutput !== 'function') throw new Error('a tracker module is missing an export');
  if (typeof input.tool_name !== 'string') return;
  const command = typeof input.tool_input?.command === 'string' ? input.tool_input.command : null;
  const { outcome, output, interrupted } = events.toolOutcomeAndOutput('claude-code', event, event === 'PostToolUseFailure' ? input.error : input.tool_response, input.is_interrupt === true);
  const line = tracker.recordToolResult({
    harness: 'claude-code', sessionId: input.session_id ?? null, agentId: subagentOf(input.agent_id),
    cwd: input.cwd ?? process.cwd(), toolName: input.tool_name, toolInput: input.tool_input, command, outcome, output, interrupted,
  });
  if (line !== null) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: line } }));
}

// Stop and SubagentStop: block the end of a turn once when it edited code and no check passed
// after the last edit. A subagent's own journal is keyed by its agent_id; the root has none.
// Fail open, but leave one decision-log line, written with builtins only: the module that failed
// may be decision-log itself. The message is capped; nothing here can redact it, so it names no input.
function stopOff(e: unknown, session: string | null, cwd: string): void {
  const m = `stop check off: ${e instanceof Error ? e.message : String(e)}`;
  process.stderr.write(`[fx] ${m}\n`);
  try {
    const { machinePaths }: typeof import('../lib/fx-paths') = require('../lib/fx-paths');
    const dir = machinePaths().stateDir;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const entry = { ts: new Date().toISOString(), harness: 'claude-code', event: 'stop', session, cwd, text: '', source: 'stop-error', action: 'allow', unavailable: m.slice(0, 200) };
    fs.appendFileSync(path.join(dir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* stderr above is the trace */ }
}

async function stop(input: ClaudeHookInput, event: 'Stop' | 'SubagentStop'): Promise<void> {
  const cwd = input.cwd ?? process.cwd();
  try {
    const { decideStop }: typeof import('../lib/stop-check') = require('../lib/stop-check');
    if (typeof decideStop !== 'function') throw new Error('decideStop is not a function');
    const agentId = event === 'SubagentStop' ? subagentOf(input.agent_id) : null;
    if (event === 'SubagentStop' && agentId === null) return;
    const { text, notice } = await decideStop({
      harness: 'claude-code', sessionId: input.session_id ?? null, agentId, cwd,
      stopHookActive: input.stop_hook_active, mode: 'block',
    });
    // The .fx.json notice reaches the user as systemMessage, beside a block or alone.
    const out = { ...(text === null ? {} : { decision: 'block', reason: text }), ...(notice === null ? {} : { systemMessage: notice }) };
    if (Object.keys(out).length > 0) process.stdout.write(JSON.stringify(out));
  } catch (e) {
    stopOff(e, input.session_id ?? null, cwd);
  }
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', async () => {
  try {
    const { parseClaudeHookInput, subagentId }: typeof import('../lib/hook-input') = require('../lib/hook-input');
    const { parseJson }: typeof import('../lib/json') = require('../lib/json');
    const { appendEvent, appendPrompt, journalKey }: typeof import('../lib/journal') = require('../lib/journal');
    if (![parseClaudeHookInput, subagentId, parseJson, appendEvent, appendPrompt, journalKey].every((f) => typeof f === 'function')) {
      throw new Error('a turn module is missing an export');
    }
    const parsed = parseClaudeHookInput(parseJson(raw));
    if (!parsed.ok) return;
    const input = parsed.value;
    const event = input.hook_event_name;
    if (event === 'PostToolUse' || event === 'PostToolUseFailure') return postToolUse(input, event);
    if (event === 'Stop' || event === 'SubagentStop') return await stop(input, event);
    if (input.hook_event_name !== 'UserPromptSubmit' || typeof input.prompt !== 'string') return;
    // fx's own Stop continuation is not a user prompt, wherever the harness puts its sentence (final review I5).
    const { STOP_SENTENCE }: typeof import('../lib/stop-sentence') = require('../lib/stop-sentence');
    if (input.prompt.startsWith('[fx] ') || STOP_SENTENCE.test(input.prompt)) return;
    const agentId = subagentId(input.agent_id);
    const subagent = agentId !== null;
    const key = journalKey(input.session_id, agentId ?? undefined);
    // With an agent_id the text is the parent's dispatch, not the user's words.
    if (subagent) return void (key !== null && appendEvent(key, { t: Date.now(), kind: 'prompt', text: null }));
    // With no session id there is no journal.
    if (key !== null) appendPrompt(key, input.prompt, Date.now());
  } catch (e) {
    process.stderr.write(`[fx] turn hook: ${e instanceof Error ? e.message : String(e)}\n`);
  }
});
