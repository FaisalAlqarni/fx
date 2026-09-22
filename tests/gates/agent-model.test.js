'use strict';
// Run: node tests/gates/agent-model.test.js
//
// SURFACE.md: "An omitted model silently inherits the session's, usually the
// priciest, so every agent file pins one explicitly." plugin-dev's
// plugin-validator caught fx-devils-advocate missing one (task 26).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const dir = path.join(root, 'agents');

for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
  const text = fs.readFileSync(path.join(dir, name), 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, `${name}: no frontmatter`);
  assert.ok(/^model:\s*\S+/m.test(m[1]), `${name}: no model: pinned in frontmatter`);
  // Final review Minor 8: an agent's prompt ships to Codex as a role and to
  // opencode as config, where a path relative to agents/ resolves to nothing.
  assert.ok(!/`\.\.\/(references|agents|skills)\//.test(text), `${name}: cites a path relative to agents/, which no runtime resolves`);
}

console.log('agent-model: OK');
