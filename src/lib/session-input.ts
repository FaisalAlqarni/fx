// The trust boundary for a journal line read back from disk. Returns the typed
// event, or null for anything that is not one.
import type { JournalEvent, NudgeSignal, ToolKind } from './types.js';

const TOOLS: ToolKind[] = ['edit', 'read', 'shell', 'other'];
const SIGNALS: NudgeSignal[] = ['repeat-failure', 'passive-stall', 'unverified-writes'];
const OUTCOMES: ('ok' | 'fail' | 'unknown')[] = ['ok', 'fail', 'unknown'];

export function parseJournalLine(raw: unknown): JournalEvent | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const f = new Map(Object.entries(raw));
  const t = f.get('t');
  if (typeof t !== 'number' || !Number.isFinite(t)) return null;
  const str = (k: string): string | null => { const v = f.get(k); return typeof v === 'string' ? v : null; };
  switch (f.get('kind')) {
    case 'prompt': {
      const text = f.get('text');
      if (text !== null && typeof text !== 'string') return null;
      const agentType = f.get('agentType');
      if (agentType === undefined) return { t, kind: 'prompt', text };
      if (agentType !== null && typeof agentType !== 'string') return null;
      return { t, kind: 'prompt', text, agentType };
    }
    case 'tool': {
      const tool = TOOLS.find((k) => k === f.get('tool'));
      const outcome = OUTCOMES.find((k) => k === f.get('outcome'));
      const command = f.get('command');
      const verified = f.get('verified');
      if (!tool || !outcome || typeof verified !== 'boolean') return null;
      if (command !== null && typeof command !== 'string') return null;
      return { t, kind: 'tool', tool, command, outcome, verified };
    }
    case 'edit': { const path = str('path'); return path === null ? null : { t, kind: 'edit', path }; }
    case 'nudge': { const signal = SIGNALS.find((k) => k === f.get('signal')); return signal ? { t, kind: 'nudge', signal } : null; }
    case 'stop-block': return { t, kind: 'stop-block' };
    case 'fx-json-hooks': { const hash = str('hash'); return hash === null ? null : { t, kind: 'fx-json-hooks', hash }; }
    default: return null;
  }
}
