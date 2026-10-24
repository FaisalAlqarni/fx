import * as assert from 'assert';
import { parseJournalLine } from './session-input.js';

assert.deepStrictEqual(parseJournalLine({ t: 1, kind: 'edit', path: 'a.ts' }), { t: 1, kind: 'edit', path: 'a.ts' });
assert.strictEqual(parseJournalLine({ t: 1, kind: 'edit' }), null, 'edit without a path');
assert.strictEqual(parseJournalLine({ t: 'x', kind: 'prompt', text: null }), null, 'non-numeric time');
assert.strictEqual(parseJournalLine({ t: 1, kind: 'nope' }), null, 'unknown kind');
assert.strictEqual(parseJournalLine('x'), null);
assert.strictEqual(parseJournalLine(null), null);
assert.deepStrictEqual(parseJournalLine({ t: 1, kind: 'prompt', text: null, agentType: 'a' }), { t: 1, kind: 'prompt', text: null, agentType: 'a' });
assert.strictEqual(parseJournalLine({ t: 1, kind: 'prompt', text: 3 }), null, 'prompt text must be string or null');
const tool = { t: 1, kind: 'tool', tool: 'shell', command: 'ls', outcome: 'ok', verified: false };
assert.deepStrictEqual(parseJournalLine(tool), tool);
assert.strictEqual(parseJournalLine({ ...tool, tool: 'weird' }), null, 'unknown tool kind');
assert.strictEqual(parseJournalLine({ ...tool, outcome: 'maybe' }), null, 'unknown outcome');
assert.strictEqual(parseJournalLine({ ...tool, verified: 'yes' }), null, 'verified must be boolean');
// The retired kinds read as no event.
for (const kind of ['deny', 'ask']) assert.strictEqual(parseJournalLine({ t: 1, kind, command: 'x' }), null, kind);
assert.deepStrictEqual(parseJournalLine({ t: 1, kind: 'nudge', signal: 'passive-stall' }), { t: 1, kind: 'nudge', signal: 'passive-stall' });
assert.strictEqual(parseJournalLine({ t: 1, kind: 'nudge', signal: 'other' }), null, 'unknown signal');
assert.deepStrictEqual(parseJournalLine({ t: 1, kind: 'stop-block' }), { t: 1, kind: 'stop-block' });
assert.deepStrictEqual(parseJournalLine({ t: 1, kind: 'fx-json-hooks', hash: 'ab' }), { t: 1, kind: 'fx-json-hooks', hash: 'ab' });
assert.strictEqual(parseJournalLine({ t: 1, kind: 'fx-json-hooks', hash: 7 }), null, 'an fx-json-hooks event needs its hash');
console.log('session-input.test.js: ok');
