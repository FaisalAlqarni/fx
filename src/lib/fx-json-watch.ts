// The agent can write .fx.json (fx-setup runs as the agent), so a hook switch
// can change mid-session. fx allows that and says so: session start and the
// Stop check show one notice when the top-level file's `hooks` differ from
// what the session saw last (plan red-team F10; README.md, Hooks, records the gap).
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { logDecision } from './decision-log.js';
import { appendEvent, journalKey, readJournal } from './journal.js';
import { parseJson } from './json.js';
import { repoRoot } from './repo-config.js';
import type { Harness } from './types.js';

export const FX_JSON_NOTICE = '[fx] notice: the hook switches in .fx.json changed during this session. An agent can edit that file; check the change.';

// The raw values, unparsed: a change the parser would drop is still a change.
export function fxJsonFingerprint(cwd: string): string {
  let raw: unknown = {};
  try { raw = parseJson(fs.readFileSync(path.join(repoRoot(cwd), '.fx.json'), 'utf8')); } catch { /* missing or not JSON: {} */ }
  const f = new Map(typeof raw === 'object' && raw !== null ? Object.entries(raw) : []);
  return createHash('sha256').update(JSON.stringify({ hooks: f.get('hooks') ?? null })).digest('hex');
}

// `harness` only names the decision-log line's harness. `memory` holds the
// baseline instead of the session journal (opencode 1.x, whose plugin lives
// for the whole session).
export function fxJsonNotice(sessionId: string | null, cwd: string, now: number, harness: Harness = 'claude-code', memory?: Map<string, string>): string | null {
  try {
    const key = journalKey(sessionId);
    if (key === null) return null;
    const hash = fxJsonFingerprint(cwd);
    let last: string | undefined;
    if (memory) last = memory.get(key);
    else {
      const event = readJournal(key).findLast((e) => e.kind === 'fx-json-hooks');
      last = event?.kind === 'fx-json-hooks' ? event.hash : undefined;
    }
    if (last === hash) return null;
    if (memory) memory.set(key, hash);
    else appendEvent(key, { t: now, kind: 'fx-json-hooks', hash });
    if (last === undefined) return null;
    logDecision({ ts: new Date(now).toISOString(), harness, event: 'health', session: sessionId, cwd, text: FX_JSON_NOTICE, source: 'fx-json', action: 'notice' });
    return FX_JSON_NOTICE;
  } catch {
    return null;
  }
}
