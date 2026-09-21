'use strict';
// Amendment A8: every runtime fx claims has a nightly probe against its real
// CLI, at the pinned floor AND at @latest. Copied from caveman's
// .github/workflows/agent-conformance.yml, which fails the build when a
// profile has no pinned probe. The @latest half exists because of caveman's
// issue 1097: a pinned job stays green while the installed CLI moves on.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const { HARNESSES } = require(path.join(root, 'lib', 'preamble'));

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
const entries = [];
for (const l of lines) {
  const h = l.match(/^\s*-\s*harness:\s*([a-z-]+)\s*$/);
  if (h) { entries.push({ harness: h[1], install: null }); continue; }
  const i = l.match(/^\s*install:\s*npm install -g (\S+)\s*$/);
  if (i && entries.length && entries[entries.length - 1].install === null) entries[entries.length - 1].install = i[1];
}

const PKG = { 'claude-code': '@anthropic-ai/claude-code', codex: '@openai/codex', opencode: 'opencode-ai' };
const FLOOR = { 'claude-code': '2.1.278', codex: '0.155.1', opencode: '1.18.25' };
for (const h of HARNESSES) {
  assert.ok(PKG[h] && FLOOR[h], `a package and a floor are defined for ${h}`);
  const mine = entries.filter((e) => e.harness === h);
  assert.ok(mine.length > 0, `${h} has a real matrix entry`);
  for (const e of mine) {
    assert.ok(e.install, `${h} entry has an install line`);
    assert.ok(e.install.startsWith(`${PKG[h]}@`), `${h} installs ${PKG[h]}, not ${e.install}`);
  }
  const versions = mine.map((e) => e.install.slice(PKG[h].length + 1));
  assert.ok(versions.includes(FLOOR[h]), `${h} is installed at the floor ${PKG[h]}@${FLOOR[h]}`);
  assert.ok(versions.includes('latest'), `${h} is installed at ${PKG[h]}@latest`);
  // Exactly the floor and latest, once each: a stray third pin is a probe
  // nobody decided on.
  assert.deepStrictEqual([...versions].sort(), [FLOOR[h], 'latest'].sort(),
    `${h} is installed at exactly ${FLOOR[h]} and latest, once each, not ${versions.join(', ')}`);
}
for (const e of entries) assert.ok(HARNESSES.includes(e.harness), `matrix entry ${e.harness} is a known harness`);
console.log('ci-pins: passed');
