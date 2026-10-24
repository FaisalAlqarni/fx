// Amendment A8: every runtime fx claims has a nightly probe against its real
// CLI, at the pinned floor AND at @latest. Copied from caveman's
// .github/workflows/agent-conformance.yml, which fails the build when a
// profile has no pinned probe. The @latest half exists because of caveman's
// issue 1097: a pinned job stays green while the installed CLI moves on.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
const root = path.join(__dirname, '..', '..');
import { HARNESSES } from '../../lib/preamble.js';
import type { Harness } from '../../lib/types.js';

const wf = path.join(root, '.github', 'workflows', 'conformance-nightly.yml');
assert.ok(fs.existsSync(wf), 'the nightly workflow exists');
// Comments never count: a pin or an entry that is commented out is not a probe.
const lines = fs.readFileSync(wf, 'utf8').split('\n').filter((l) => !/^\s*#/.test(l));
const y = lines.join('\n');

assert.match(y, /^\s*schedule:\s*$/m, 'runs on a schedule');
assert.match(y, /^\s*-\s*cron:\s*['"][^'"]+['"]\s*$/m, 'has a cron line');
assert.match(y, /^\s*workflow_dispatch:/m, 'can be run by hand');
assert.match(y, /^\s*fail-fast:\s*false\s*$/m, 'a red @latest never cancels the floor');
assert.ok(!/\bsecrets\s*[.\[]/.test(y), 'needs no secrets: the free rows make no model calls');
assert.ok(!/\bgithub\.token\b/.test(y), 'needs no token: nothing here writes to GitHub');
assert.match(y, /^\s*run:\s*\$\{\{\s*matrix\.install\s*\}\}\s*$/m, 'the install step runs the entry\'s install line');
assert.match(y, /^\s*run:\s*bash tests\/conformance\/run\.sh \$\{\{\s*matrix\.harness\s*\}\} --free\s*$/m,
  'each entry runs its free rows');

// Pair every install line with the matrix entry it belongs to.
const entries: { harness: string; install: string | null }[] = [];
for (const l of lines) {
  const h = l.match(/^\s*-\s*harness:\s*([a-z0-9-]+)\s*$/);
  if (h && h[1] !== undefined) { entries.push({ harness: h[1], install: null }); continue; }
  const i = l.match(/^\s*install:\s*npm install -g (\S+)\s*$/);
  const last = entries[entries.length - 1];
  if (i && i[1] !== undefined && last !== undefined && last.install === null) last.install = i[1];
}

const PKG: Record<Harness, string> = { 'claude-code': '@anthropic-ai/claude-code', codex: '@openai/codex', opencode: 'opencode-ai', 'opencode-v2': 'opencode-ai' };
const FLOOR: Record<Harness, string> = { 'claude-code': '2.1.278', codex: '0.155.1', opencode: '1.18.25', 'opencode-v2': '2.0.18' };
// opencode-ai@latest installs 2.x, so v1 tracks its own 1.x line.
const LATEST: Record<Harness, string> = { 'claude-code': 'latest', codex: 'latest', opencode: '1', 'opencode-v2': 'latest' };
for (const h of HARNESSES) {
  assert.ok(PKG[h] && FLOOR[h], `a package and a floor are defined for ${h}`);
  const mine = entries.filter((e) => e.harness === h);
  assert.ok(mine.length > 0, `${h} has a real matrix entry`);
  for (const e of mine) {
    assert.ok(e.install, `${h} entry has an install line`);
    assert.ok(e.install.startsWith(`${PKG[h]}@`), `${h} installs ${PKG[h]}, not ${e.install}`);
  }
  const versions = mine.map((e) => (e.install ?? '').slice(PKG[h].length + 1));
  assert.ok(versions.includes(FLOOR[h]), `${h} is installed at the floor ${PKG[h]}@${FLOOR[h]}`);
  assert.ok(versions.includes(LATEST[h]), `${h} is installed at ${PKG[h]}@${LATEST[h]}`);
  // Exactly the floor and latest, once each: a stray third pin is a probe
  // nobody decided on.
  assert.deepStrictEqual([...versions].sort(), [FLOOR[h], LATEST[h]].sort(),
    `${h} is installed at exactly ${FLOOR[h]} and ${LATEST[h]}, once each, not ${versions.join(', ')}`);
}
const KNOWN: readonly string[] = HARNESSES;
for (const e of entries) assert.ok(KNOWN.includes(e.harness), `matrix entry ${e.harness} is a known harness`);
console.log('ci-pins: passed');
