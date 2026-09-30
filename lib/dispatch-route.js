'use strict';
// Model routing for Agent dispatches, called from hooks/fx-pretooluse.js.
//
// Returns a new tool input with `model` set, or null to leave the call as it
// is. It never refuses: the worst outcome is a cheaper tier, never a blocked
// dispatch, and the hook treats any throw as null.
//
// Only the general types are defaulted. No type may be a fork, which must
// inherit the parent's model; `fx:` agents pin their own tier in frontmatter.

const GENERAL = new Set(['general-purpose', 'claude', 'Plan']);
const STANDARD = 'sonnet';

function route(ti) {
  if (!ti || typeof ti !== 'object') return null;
  const type = ti.subagent_type;
  if (typeof type !== 'string' || !type || type.startsWith('fx:')) return null;
  if (!ti.model) return GENERAL.has(type) ? { ...ti, model: STANDARD } : null;
  if (ti.model === 'opus' && !/^\s*Capable because:/m.test(ti.prompt || '')) {
    return { ...ti, model: STANDARD };
  }
  return null;
}

module.exports = { route };
