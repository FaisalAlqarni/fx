// The session journal: one append-only JSON line per event in
// <state dir>/sessions/<key>.jsonl. It never leaves the machine and never
// changes a decision: a failure is one stderr line, never a throw.
import * as fs from 'fs';
import * as path from 'path';
import { machinePaths } from './fx-paths.js';
import { JOURNAL_COMMAND_CHARS, JOURNAL_LINE_BYTES, JOURNAL_MAX_AGE_MS, JOURNAL_MAX_BYTES } from './thresholds.js';
import { parseJson } from './json.js';
import { CAP_COMMAND, CAP_PROMPT, redact } from './redact.js';
import { parseJournalLine } from './session-input.js';
import type { JournalEvent } from './types.js';

// The harness session id, with `__<agent_id>` for a subagent's own events.
// A payload with no session id gets no journal.
export function journalKey(sessionId: unknown, agentId?: unknown): string | null {
  if (typeof sessionId !== 'string' || sessionId === '') return null;
  const clean = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '_');
  return typeof agentId === 'string' && agentId !== '' ? `${clean(sessionId)}__${clean(agentId)}` : clean(sessionId);
}

const sessionsDir = (stateDir?: string) => path.join(stateDir ?? machinePaths().stateDir, 'sessions');

// A command as the journal stores it.
export const journalCommand = (command: string): string => redact(command, JOURNAL_COMMAND_CHARS);

function redactEvent(ev: JournalEvent): JournalEvent {
  const r = (s: string) => redact(s, CAP_COMMAND);
  switch (ev.kind) {
    case 'prompt': return { ...ev, text: ev.text === null ? null : redact(ev.text, CAP_PROMPT), ...(typeof ev.agentType === 'string' ? { agentType: r(ev.agentType) } : {}) };
    case 'tool': return { ...ev, command: ev.command === null ? null : journalCommand(ev.command) };
    // A path is a file name, not contents; the redactor's long-run pattern would hide a deep one from the Stop check (benchmark finding 1).
    case 'edit': return { ...ev, path: ev.path.slice(0, CAP_COMMAND) };
    default: return ev;
  }
}

const FREE_TEXT = new Set(['text', 'command', 'path', 'agentType']);

// The event as one line of at most JOURNAL_LINE_BYTES: escaping and multi-byte
// characters can push a capped field past it, so free text is cut until it fits.
function journalLine(ev: JournalEvent): string {
  const redacted = redactEvent(ev);
  let line = JSON.stringify(redacted);
  for (let cap = 1024; cap > 0 && Buffer.byteLength(line) > JOURNAL_LINE_BYTES; cap = Math.floor(cap / 2)) {
    line = JSON.stringify(Object.fromEntries(Object.entries(redacted).map(([k, v]) => [k, FREE_TEXT.has(k) && typeof v === 'string' && v.length > cap ? `${v.slice(0, cap)}[...]` : v])));
  }
  return line;
}

const kindOf = (line: string): string | undefined => {
  try { return parseJournalLine(parseJson(line))?.kind; } catch { return undefined; }
};
const isPromptLine = (line: string): boolean => kindOf(line) === 'prompt';

// Cut a journal back to its newest half, keeping its first prompt (a subagent's
// type) and its last (the current turn's start). Written aside and renamed in,
// so a reader never sees half a file.
function trimJournal(file: string): void {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let keep = lines.length;
  let bytes = 0;
  while (keep > 0 && bytes + Buffer.byteLength(lines[keep - 1] ?? '') + 1 <= JOURNAL_MAX_BYTES / 2) bytes += Buffer.byteLength(lines[--keep] ?? '') + 1;
  const prompts = lines.flatMap((l, i) => (isPromptLine(l) ? [i] : []));
  // The newest .fx.json baseline stays too, or the change notice would re-baseline silently.
  const baseline = lines.findLastIndex((l) => kindOf(l) === 'fx-json-hooks');
  const head = [...new Set([prompts[0], prompts.at(-1), baseline])].filter((i): i is number => i !== undefined && i >= 0 && i < keep).sort((a, b) => a - b);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${[...head.map((i) => lines[i]), ...lines.slice(keep)].join('\n')}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

// True when the line was written.
export function appendEvent(key: string, ev: JournalEvent, stateDir?: string): boolean {
  try {
    const dir = sessionsDir(stateDir);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    // mode applies only when the append creates the file.
    const file = path.join(dir, `${key}.jsonl`);
    fs.appendFileSync(file, `${journalLine(ev)}\n`, { mode: 0o600 });
    // The line is written either way; a failed cut only leaves the file long, and readers read its tail.
    try {
      if (fs.statSync(file).size > JOURNAL_MAX_BYTES) trimJournal(file);
    } catch (e) {
      process.stderr.write(`[fx] journal: ${e instanceof Error ? e.message : String(e)}\n`);
    }
    return true;
  } catch (e) {
    process.stderr.write(`[fx] journal: ${e instanceof Error ? e.message : String(e)}\n`);
    return false;
  }
}

// The last JOURNAL_MAX_BYTES of a file, from its first whole line.
function readTail(file: string): string {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const n = Math.min(size, JOURNAL_MAX_BYTES);
    const buf = Buffer.alloc(n);
    fs.readSync(fd, buf, 0, n, size - n);
    const text = buf.toString('utf8');
    return n < size ? text.slice(text.indexOf('\n') + 1) : text;
  } finally {
    fs.closeSync(fd);
  }
}

// The user's prompt, redacted and capped on the way in. One that cannot be
// written leaves a prompt with no text, so the turn boundary still moves
// (lens SF 1). If that fails too (a full disk, a read-only file), the journal
// is emptied, or removed if it cannot be.
export function appendPrompt(key: string, text: string, t: number, stateDir?: string): void {
  if (appendEvent(key, { t, kind: 'prompt', text }, stateDir)) return;
  if (appendEvent(key, { t, kind: 'prompt', text: null }, stateDir)) return;
  const file = path.join(sessionsDir(stateDir), `${key}.jsonl`);
  try {
    fs.truncateSync(file, 0);
  } catch {
    try { fs.rmSync(file, { force: true }); } catch (e) { process.stderr.write(`[fx] journal: ${e instanceof Error ? e.message : String(e)}\n`); }
  }
}

export function readJournal(key: string, stateDir?: string): JournalEvent[] {
  let text: string;
  try { text = readTail(path.join(sessionsDir(stateDir), `${key}.jsonl`)); } catch { return []; }
  const events: JournalEvent[] = [];
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      const ev = parseJournalLine(parseJson(line));
      if (ev) events.push(ev);
    } catch { /* a torn line is skipped */ }
  }
  return events;
}

export function currentTurn(events: JournalEvent[]): JournalEvent[] {
  const i = events.findLastIndex((e) => e.kind === 'prompt');
  return i < 0 ? events : events.slice(i + 1);
}

export function lastUserPrompt(sessionId: string, stateDir?: string): string | null {
  const key = journalKey(sessionId);
  if (key === null) return null;
  const last = readJournal(key, stateDir).findLast((e) => e.kind === 'prompt');
  return last?.kind === 'prompt' ? last.text : null;
}

export function pruneJournals(now: number, stateDir?: string): void {
  try {
    const dir = sessionsDir(stateDir);
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.jsonl')) continue;
      const file = path.join(dir, name);
      try { if (fs.statSync(file).mtimeMs < now - JOURNAL_MAX_AGE_MS) fs.rmSync(file); } catch { /* next file */ }
    }
  } catch { /* no sessions dir, or unreadable */ }
}
