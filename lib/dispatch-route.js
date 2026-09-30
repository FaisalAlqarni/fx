'use strict';
// Model routing for Agent dispatches, called from hooks/fx-pretooluse.js.
//
// Returns a new tool input with `model` set, or null to leave the call as it
// is. It never refuses: the worst outcome is a cheaper tier, never a blocked
// dispatch, and the hook treats any throw as null.
//
// Only the general types are defaulted. A missing or empty type is general:
// the Agent tool starts a general-purpose agent when it is omitted. A fork is
// the explicit type `fork` and inherits the parent's model; `fx:` agents pin
// their own tier in frontmatter.

const GENERAL = new Set(['general-purpose', 'claude', 'Plan']);
const STANDARD = 'sonnet';
const CHEAP = new Set(['sonnet', 'haiku']);

function route(ti) {
  if (!ti || typeof ti !== 'object') return null;
  const type = ti.subagent_type || 'general-purpose';
  if (typeof type !== 'string' || type === 'fork' || type.startsWith('fx:')) return null;
  if (!ti.model) return GENERAL.has(type) ? { ...ti, model: STANDARD } : null;
  if (!CHEAP.has(ti.model) && !/^\s*Capable because:/m.test(ti.prompt || '')) {
    return { ...ti, model: STANDARD };
  }
  return null;
}

module.exports = { route };
