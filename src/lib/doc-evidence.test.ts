// Run: node lib/doc-evidence.test.js
import * as assert from 'assert';
import { parseDoc } from './doc-evidence.js';

const SHA = '3f2c1a9e0b7d4c6a8e1f2b3c4d5e6f708192a3b4';
const PATH_DOC = [
  'Shortlinks expire after 90 days unless the plan says otherwise.',
  'Evidence: `engines/shortlink/app/models/link.rb:40-58` `Link#expired?`; `config/plans.yml:12`',
  '',
].join('\n');
const OWNER_DOC = 'The product is sold to banks and financing companies in KSA.\nEvidence: owner, 2026-10-23\n';

// A path claim: lines, a symbol, a single line cited as a range of one.
const p = parseDoc('docs/a.md', PATH_DOC);
assert.deepStrictEqual(p.problems, []);
assert.deepStrictEqual(p.claims, [{
  doc: 'docs/a.md', line: 2, text: 'Shortlinks expire after 90 days unless the plan says otherwise.', kind: 'doc', status: 'current',
  evidence: [
    { type: 'path', path: 'engines/shortlink/app/models/link.rb', start: 40, end: 58, symbol: 'Link#expired?' },
    { type: 'path', path: 'config/plans.yml', start: 12, end: 12, symbol: null },
  ],
}]);

// An owner claim.
assert.deepStrictEqual(parseDoc('docs/a.md', OWNER_DOC).claims[0]?.evidence, [{ type: 'owner', date: '2026-10-23' }]);

// A whole-file citation has no lines; a callout prefix and a multi-line paragraph are read.
const w = parseDoc('docs/a.md', '> **Note**\n> Retries stop\n> after three tries.\n> Evidence: `lib/retry.js`\n');
assert.deepStrictEqual(w.claims.map((c) => [c.text, c.evidence]),
  [['**Note** Retries stop after three tries.', [{ type: 'path', path: 'lib/retry.js', start: null, end: null, symbol: null }]]]);

// A malformed line is reported with its doc and line, and makes no claim.
const bad = parseDoc('docs/a.md', '\n\n\n\n\nA claim.\nEvidence: link.rb line 40\n');
assert.deepStrictEqual(bad.claims, []);
assert.deepStrictEqual(bad.problems, [{ doc: 'docs/a.md', line: 7, message: 'malformed evidence line: Evidence: link.rb line 40' }]);

// The verified marker.
assert.strictEqual(parseDoc('docs/a.md', `${PATH_DOC}\n<!-- fx-docs verified: ${SHA} -->\n`).verified, SHA);
assert.strictEqual(parseDoc('docs/a.md', PATH_DOC).verified, null);
assert.strictEqual(parseDoc('docs/a.md', '<!-- fx-docs verified: abc123 -->\n').verified, null, 'a short sha is no marker');

// Fenced lines are never read.
const fenced = parseDoc('docs/a.md', `\`\`\`markdown\n${PATH_DOC}\n<!-- fx-docs verified: ${SHA} -->\nEvidence: nonsense\n\`\`\`\n`);
assert.deepStrictEqual(fenced, { claims: [], problems: [], verified: null });

// A wrapped numbered ADR decision is one claim, whole.
const ADR2 = [
  '# 2. Source of truth', '', '## Status', '', 'Accepted', '', '## Decisions', '',
  '1. Keep Postgres as the source', '   of truth.', '   Evidence: `db/schema.rb:1-9`', '',
].join('\n');
const a2 = parseDoc('docs/adr/0002-x.md', ADR2);
assert.strictEqual(a2.claims.length, 1);
assert.strictEqual(a2.claims[0]?.kind, 'adr');
assert.strictEqual(a2.claims[0]?.status, 'current');
assert.strictEqual(a2.claims[0]?.text, '1. Keep Postgres as the source of truth.');

// Superseded status in each of the three accepted forms; other words stay current.
const decision = '\n1. Use X.\n   Evidence: `a.rb`\n';
for (const status of [
  'Status: superseded by 0002 (replaced: decisions 1; the rest carried forward).',
  '## Status\n\nSuperseded by 0002',
  '- **Status:** SUPERSEDED BY 0002',
]) {
  assert.strictEqual(parseDoc('docs/adr/0001-x.md', status + decision).claims[0]?.status, 'superseded', status);
}
assert.strictEqual(parseDoc('docs/adr/0001-x.md', 'Status: accepted' + decision).claims[0]?.status, 'current');
assert.strictEqual(parseDoc('docs/decisions/0001-x.md', 'Status: accepted' + decision).claims[0]?.kind, 'adr');
assert.strictEqual(parseDoc('docs/arch/0001-x.md', 'Status: superseded by 2' + decision).claims[0]?.status, 'current', 'only ADR docs carry a status');
assert.strictEqual(parseDoc('docs/arch/adr.md', 'x\nEvidence: `a.rb`\n').claims[0]?.kind, 'doc', 'a file named adr is not an adr folder');

console.log('doc-evidence tests passed');
