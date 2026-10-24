// Model routing for Agent dispatches, called from hooks/fx-pretooluse.js.
//
// Returns a new tool input with `model` set, or null to leave the call as it
// is. It never refuses: the worst outcome is a cheaper tier, never a blocked
// dispatch, and the hook treats any throw as null.
//
// Only the general types are defaulted. A missing or empty type is general:
// the Agent tool starts a general-purpose agent when it is omitted. A fork is
// the explicit type `fork` and inherits the parent's model; `fx:` agents pin
// their own tier in frontmatter, so with no model they are left alone, but an
// explicit top tier needs a reason like any other type (ADR 0044).

import type { DispatchInput, DispatchRoute } from './types.js';

const GENERAL = new Set(['general-purpose', 'claude', 'Plan']);
const STANDARD = 'sonnet';
const CHEAP = new Set(['sonnet', 'haiku']);

function isRecord(v: unknown): v is DispatchInput {
  return typeof v === 'object' && v !== null;
}

export function isGeneralType(ti: DispatchInput): boolean {
  return !ti.subagent_type || (typeof ti.subagent_type === 'string' && GENERAL.has(ti.subagent_type));
}

export function hasCapableLine(prompt: unknown): boolean {
  return /^\s*Capable because:/m.test(String(prompt || ''));
}

export function route(ti: unknown): DispatchRoute {
  if (!isRecord(ti)) return null;
  const type = ti.subagent_type || 'general-purpose';
  if (typeof type !== 'string' || type === 'fork') return null;
  if (!ti.model) return GENERAL.has(type) ? { ...ti, model: STANDARD } : null;
  const cheap = typeof ti.model === 'string' && CHEAP.has(ti.model);
  if (!cheap && !hasCapableLine(ti.prompt)) {
    return { ...ti, model: STANDARD };
  }
  return null;
}
