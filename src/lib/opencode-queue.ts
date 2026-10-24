// The per-session queue of nudges and Stop reminders on opencode. Neither major can inject text where a
// tool call ends, so lines wait here until that session's next model request. The queue lives in the
// plugin's memory: a restart loses it (advice). Every push and every drop leaves a decision-log line,
// so a line that was queued but never delivered shows as a missing push.
import { logDecision } from './decision-log.js';
import type { Harness } from './types.js';

export const MAX_LINES_PER_SESSION = 5;
export const MAX_SESSIONS = 50;

export function createQueue(harness: Harness, cwd: string) {
  const queue = new Map<string, string[]>();
  const note = (session: string, source: 'queue-pushed' | 'queue-dropped', text: string): void =>
    logDecision({ ts: new Date().toISOString(), harness, event: 'queue', session, cwd, text, source, action: 'none' });

  return {
    enqueue(session: string, line: string): void {
      const lines = queue.get(session);
      if (lines === undefined) {
        if (queue.size >= MAX_SESSIONS) {
          const [oldest] = queue.keys();
          if (oldest !== undefined) {
            note(oldest, 'queue-dropped', `${queue.get(oldest)?.length ?? 0} undelivered line(s): too many sessions queued`);
            queue.delete(oldest);
          }
        }
        queue.set(session, [line]);
      } else if (lines.length >= MAX_LINES_PER_SESSION) {
        note(session, 'queue-dropped', `1 line: ${MAX_LINES_PER_SESSION} already queued for this session`);
      } else {
        lines.push(line);
      }
    },
    // A new user prompt: lines still waiting belong to an earlier turn and are stale.
    startTurn(session: string): void {
      const lines = queue.get(session);
      if (lines === undefined) return;
      queue.delete(session);
      note(session, 'queue-dropped', `${lines.length} undelivered line(s) from an earlier turn`);
    },
    drain(session: string): string[] {
      const lines = queue.get(session) ?? [];
      queue.delete(session);
      if (lines.length > 0) note(session, 'queue-pushed', lines.join('\n'));
      return lines;
    },
  };
}
