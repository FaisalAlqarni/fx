// The stuck-loop tracker (design decision 8). Records every tool call in the
// session journal and, past a threshold, returns one advisory line. It never
// blocks and never throws; a hook prints the line as additionalContext.
import * as path from 'path';
import { logDecision } from './decision-log.js';
import { countsAsVerification, checkHint } from './evidence.js';
import { appendEvent, currentTurn, journalKey, readJournal } from './journal.js';
import { PASSIVE_READS, REPEAT_FAILURES, UNVERIFIED_EDITS } from './thresholds.js';
import { READ_ONLY_AGENTS } from './plant-roles.js';
import { laneAddress } from './preamble.js';
import { readRepoConfig, repoRoot } from './repo-config.js';
import { normalizeCommand } from './shell-guard.js';
import { classifyTool, editedPaths } from './tool-events.js';
import type { Harness, JournalEvent, NudgeSignal } from './types.js';

// A shell loop (normalized: one line) that repeats one command (benchmark finding 4):
// a `for` body that never names the loop variable, a `while true` (or `:`) body,
// or the condition of an `until` loop (review minor 1).
const LOOP = /^(?:for (\w+) in (.*?)|for \(\((.*?)\)\)|while (.+?)|until (.+?)) ?;? do (.+?) ?;? done$/;
const CSTYLE = /^\s*(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*(<=?)\s*(\d+)\s*;\s*(?:(\w+)\+\+|\+\+(\w+)|(\w+)\s*\+=\s*1)\s*$/;
const oneCommand = (text: string) => !/[;&|]/.test(text.replace(/\d*>&\d/g, '')) && !/\b(?:do|done)\b/.test(text);

// The command a loop repeats and how many times, capped at REPEAT_FAILURES. An
// endless loop (while true, until) that failed was stopped, so it gets the cap;
// a `for` over a list that is not written out gets one.
function loopedCommand(command: string): { inner: string; times: number } | null {
  const m = LOOP.exec(command);
  if (!m) return null;
  const [, name, list, cstyle, whileCond, untilCond, body = ''] = m;
  const cap = (n: number) => ({ times: Math.max(0, Math.min(n, REPEAT_FAILURES)) });
  if (untilCond !== undefined) return oneCommand(untilCond) ? { inner: untilCond, ...cap(REPEAT_FAILURES) } : null;
  if (!oneCommand(body)) return null;
  if (whileCond !== undefined) return whileCond === 'true' || whileCond === ':' ? { inner: body, ...cap(REPEAT_FAILURES) } : null;
  if (cstyle !== undefined) {
    const c = CSTYLE.exec(cstyle);
    const v = c?.[1];
    if (!c || v === undefined || c[3] !== v || (c[6] ?? c[7] ?? c[8]) !== v || new RegExp(`\\$\\{?${v}\\b`).test(body)) return null;
    return { inner: body, ...cap(Number(c[5]) - Number(c[2]) + (c[4] === '<=' ? 1 : 0)) };
  }
  if (name === undefined || new RegExp(`\\$\\{?${name}\\b`).test(body)) return null;
  const items = (list ?? '').trim();
  const seq = /^(?:\$\(|`)seq (\d+)(?: (\d+))?(?:\)|`)$/.exec(items);
  const brace = /^\{(\d+)\.\.(\d+)\}$/.exec(items);
  const count = seq ? (seq[2] === undefined ? Number(seq[1]) : Number(seq[2]) - Number(seq[1]) + 1)
    : brace ? Math.abs(Number(brace[2]) - Number(brace[1])) + 1
      : /[$*?{`]/.test(items) ? 1 : items.split(' ').filter(Boolean).length;
  return { inner: body, ...cap(count) };
}

// The command that failed REPEAT_FAILURES times with no edit between, or null.
function repeatedCommand(turn: JournalEvent[]): string | null {
  let counts = new Map<string, number>();
  for (const e of turn) {
    if (e.kind === 'edit') { counts = new Map(); continue; }
    if (e.kind !== 'tool' || e.outcome !== 'fail' || e.command === null) continue;
    const loop = loopedCommand(e.command);
    const command = loop?.inner ?? e.command;
    const n = (counts.get(command) ?? 0) + (loop?.times ?? 1);
    if (n >= REPEAT_FAILURES) return command;
    counts.set(command, n);
  }
  return null;
}

function passiveStall(turn: JournalEvent[]): boolean {
  const lastNonRead = turn.findLastIndex((e) => e.kind === 'tool' && e.tool !== 'read');
  return turn.slice(lastNonRead + 1).filter((e) => e.kind === 'tool').length >= PASSIVE_READS && !turn.slice(lastNonRead + 1).some((e) => e.kind === 'edit');
}

function unverifiedWrites(turn: JournalEvent[]): boolean {
  const since = turn.slice(turn.findLastIndex((e) => e.kind === 'tool' && e.verified) + 1);
  return since.filter((e) => e.kind === 'edit').length >= UNVERIFIED_EDITS;
}

// The first signal, in order, that reached its threshold and has no nudge in this turn.
export function checkSignals(turn: JournalEvent[], skip: NudgeSignal[] = []): NudgeSignal | null {
  const fired = (s: NudgeSignal) => turn.some((e) => e.kind === 'nudge' && e.signal === s);
  const rules: [NudgeSignal, () => boolean][] = [
    ['repeat-failure', () => repeatedCommand(turn) !== null],
    ['unverified-writes', () => unverifiedWrites(turn)],
    ['passive-stall', () => passiveStall(turn)],
  ];
  return rules.find(([s, hit]) => !skip.includes(s) && !fired(s) && hit())?.[0] ?? null;
}

export interface ToolResultInput {
  harness: Harness;
  sessionId: string | null;
  agentId: string | null;
  cwd: string;
  toolName: string;
  toolInput: unknown;
  command: string | null;
  outcome: 'ok' | 'fail' | 'unknown';
  output: string;
  // The call was interrupted: partial output never verifies.
  interrupted?: boolean;
}

// The tracker fails open, so a failure must leave a trace a log reader can find.
function trackerError(input: ToolResultInput, unavailable: string, now: number): void {
  logDecision({ ts: new Date(now).toISOString(), harness: input.harness, event: 'nudge', session: input.sessionId, cwd: input.cwd, text: '', source: 'tracker-error', action: 'none', unavailable: unavailable.slice(0, 200) });
}

export function recordToolResult(input: ToolResultInput): string | null {
  try {
    const { harness, cwd } = input;
    const key = journalKey(input.sessionId, input.agentId ?? undefined);
    if (key === null) return null;
    const config = readRepoConfig(cwd);
    const kind = classifyTool(harness, input.toolName, input.command);
    const now = Date.now();
    const failures: string[] = [];
    // A journal that cannot be written leaves gaps the Stop check reads as "no edits".
    const append = (ev: JournalEvent) => { if (!appendEvent(key, ev) && failures.length === 0) failures.push('a journal event could not be written'); };
    append({
      t: now, kind: 'tool', tool: kind, outcome: input.outcome,
      command: input.command === null ? null : normalizeCommand(input.command, process.platform !== 'win32'),
      verified: input.interrupted !== true && countsAsVerification(kind, input.command, input.outcome, input.output, config.checks),
    });
    // A failed edit changed no file: it is a tool event, never an edit event.
    if (input.outcome !== 'fail') {
      try {
        const paths = editedPaths(harness, input.toolName, input.toolInput, cwd);
        const root = paths.length > 0 ? repoRoot(cwd) : cwd;
        // Relative to the repository, as the Stop check compares it; absolute when outside it.
        const stored = (p: string) => { const rel = path.relative(root, p); return rel === '' || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel) ? p : rel; };
        for (const p of paths) append({ t: now, kind: 'edit', path: stored(p) });
      } catch (e) {
        failures.push(`edit paths could not be read: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    for (const unavailable of failures) trackerError(input, unavailable, now);
    if (!config.hooks.loopNudge) return null;

    const journal = readJournal(key);
    const first = journal.find((e) => e.kind === 'prompt');
    // A read-only review agent reads for a living (red team I17).
    if (first?.kind === 'prompt' && typeof first.agentType === 'string' && READ_ONLY_AGENTS.includes(first.agentType)) return null;
    const turn = currentTurn(journal);
    const signal = checkSignals(turn, input.agentId === null ? [] : ['passive-stall']);
    if (signal === null) return null;

    const lane = laneAddress(harness, 'fx-debug');
    const line = signal === 'repeat-failure'
      ? `[fx] \`${(repeatedCommand(turn) ?? '').slice(0, 80)}\` has failed ${REPEAT_FAILURES} times this turn. Stop retrying and invoke ${lane} to find the cause.`
      : signal === 'passive-stall'
        ? `[fx] ${PASSIVE_READS} reads in a row with no edit. If you are going in circles, invoke ${lane}; otherwise say what you are looking for.`
        : `[fx] ${UNVERIFIED_EDITS} edits since the last passing check. Run ${checkHint(config.checks)} now; if it fails, invoke ${lane}.`;
    if (!appendEvent(key, { t: now, kind: 'nudge', signal })) {
      trackerError(input, 'a nudge event could not be written', now);
      return null;
    }
    logDecision({ ts: new Date(now).toISOString(), harness, event: 'nudge', session: input.sessionId, cwd, text: line, source: signal, action: 'nudge' });
    return line;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[fx] loop tracker: ${m}\n`);
    trackerError(input, m, Date.now());
    return null;
  }
}
