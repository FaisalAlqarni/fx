// The Stop evidence check (design decision 7): a turn that edited code and
// has no passing check after its last edit is blocked once. It fails open:
// decideStop never rejects.
import * as path from 'path';
import { logDecision } from './decision-log.js';
import { checkHint } from './evidence.js';
import { fxJsonNotice } from './fx-json-watch.js';
import { appendEvent, currentTurn, journalKey, readJournal } from './journal.js';
import { readRepoConfig, repoRoot } from './repo-config.js';
import type { Harness, JournalEvent } from './types.js';

export const DOC_EXTENSIONS = ['.md', '.mdx', '.txt', '.rst', '.adoc'];

const isDoc = (p: string) => DOC_EXTENSIONS.some((x) => p.toLowerCase().endsWith(x));

// Inside `root`, or anywhere when no root is given. A relative path is taken from the root.
const inside = (p: string, root?: string) => {
  if (root === undefined) return true;
  const rel = path.relative(root, path.resolve(root, p));
  return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
};

// True when the turn has a non-documentation edit (inside `root`, when given)
// and no verified check after the last one. An edit outside the repository,
// such as a scratch script, needs no evidence (final review, devil's advocate minor 5).
export function turnNeedsEvidence(turn: JournalEvent[], root?: string): boolean {
  const lastEdit = turn.findLastIndex((e) => e.kind === 'edit' && !isDoc(e.path) && inside(e.path, root));
  return lastEdit >= 0 && !turn.slice(lastEdit + 1).some((e) => e.kind === 'tool' && e.verified);
}

export { STOP_SENTENCE } from './stop-sentence.js';

export function stopReason(hint: string, mode: 'block' | 'reminder'): string {
  return mode === 'block'
    ? `[fx] This turn edited files and no check has passed since the last edit. Run ${hint} and report the result before you finish. If you cannot run it, say so plainly.`
    : `[fx] The previous turn edited files and no check passed after the last edit. Run ${hint} before you report that work as done.`;
}

export interface StopInput {
  harness: Harness;
  sessionId: string | null;
  agentId: string | null;
  cwd: string;
  stopHookActive: boolean;
  mode: 'block' | 'reminder';
}

// `notice` is the .fx.json change notice, for the root session's Stop only: the
// opencode reminder runs on every user message and has nowhere to show it.
export async function decideStop(input: StopInput): Promise<{ text: string | null; notice: string | null }> {
  const notice = input.agentId === null && input.mode === 'block' ? fxJsonNotice(input.sessionId, input.cwd, Date.now(), input.harness) : null;
  return { text: stopText(input), notice };
}

function stopText(input: StopInput): string | null {
  try {
    const key = journalKey(input.sessionId, input.agentId ?? undefined);
    if (key === null || input.stopHookActive) return null;
    const config = readRepoConfig(input.cwd);
    if (!config.hooks.stopCheck) return null;
    const turn = currentTurn(readJournal(key));
    if (turn.some((e) => e.kind === 'stop-block') || !turnNeedsEvidence(turn, repoRoot(input.cwd))) return null;

    const hint = checkHint(config.checks);
    const text = stopReason(hint, input.mode);
    const entry = { ts: new Date().toISOString(), harness: input.harness, event: 'stop' as const, session: input.sessionId, cwd: input.cwd, text };

    // A block that cannot be journaled would repeat every turn (block-once rests on the journal): allow and say so.
    if (appendEvent(key, { t: Date.now(), kind: 'stop-block' })) {
      logDecision({ ...entry, source: 'evidence', action: 'block' });
      return text;
    }
    logDecision({ ...entry, source: 'journal-error', action: 'allow', unavailable: 'the stop-block event could not be written' });
    return null;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[fx] stop check: ${m}\n`);
    // Fail open, but leave a trace in the decision log (its own try: the log may be what broke).
    try {
      logDecision({ ts: new Date().toISOString(), harness: input.harness, event: 'stop', session: input.sessionId, cwd: input.cwd, text: '', source: 'stop-error', action: 'allow', unavailable: m.slice(0, 200) });
    } catch { /* stderr above is the trace */ }
    return null;
  }
}
