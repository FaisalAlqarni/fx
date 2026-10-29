// Run: node scripts/system-flow-migrate.test.js
// system-flow migrate: a version-1 model is brought to version 2 and the prose it still owes is listed, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Obj = Record<string, any>; // ts-gate-ok: fragments are edited by key in the tests
const F = 'docs/system-flow/model/fragments';
const NAMES = ['meta', 'level0', 'turns', 'chapters'];
const U = { unconfirmed: true };

const node = (id: string, kind: unknown): Obj => ({ id, label: id, kind, role: 'Does a job', ...U });
const v1 = (change: (f: Fx) => void = () => undefined): Fx => {
  const f = sfFixture();
  f.fragment('meta', { schemaVersion: 1, meta: { title: 'Shop', roots: [{ id: 'backend' }] } });
  f.fragment('level0', { levels: { root: 'system', diagrams: [{ id: 'system', level: 0, title: 'System', summary: 'The shop keeps its data in a database.', groups: [],
    nodes: [node('db', 'Database'), node('web', 'browser'), node('pay', 'third-party'), node('login', 'auth'), node('api', 'backend')],
    edges: [['web', 'api'], ['api', 'db'], ['api', 'pay'], ['api', 'login']].map(([from, to]) => ({ from, to, label: 'calls', ...U })) }] } });
  f.fragment('turns', { sequences: [{ id: 'turn', title: 'A visit', chapter: 's1', summary: 'The client asks the service for a page.',
    participants: [{ id: 'cache', label: 'Cache', kind: 'cache', ...U }, { id: 'svc', label: 'Service', ...U }],
    messages: [{ n: 1, from: 'svc', to: 'cache', label: 'The service reads the cache.', ...U }] }] });
  f.fragment('chapters', { sections: [{ id: 's1', title: 'Pages', question: 'How is a page served?' }] });
  f.fragment('rules', { rules: [{ id: 'r1', text: 'Pages are cached.', adr: { path: 'docs/adr/0009-gone.md' }, decision: '1', ...U }] });
  change(f);
  return f;
};
const path_ = (f: Fx, name: string): string => path.join(f.host, F, `${name}.json`);
const read = (f: Fx, name: string): Obj => parseJson(fs.readFileSync(path_(f, name), 'utf8')) as Obj;
const bytes = (f: Fx): Record<string, string> => Object.fromEntries(NAMES.map((n) => [n, fs.readFileSync(path_(f, n), 'utf8')]));
const mtimes = (f: Fx): number[] => NAMES.map((n) => fs.statSync(path_(f, n)).mtimeMs);
const stripped = (v: unknown): unknown => parseJson(JSON.stringify(v, (k, x) => (k === 'look' || k === 'schemaVersion' ? undefined : x)));

const f = v1();
const before: Record<string, Obj> = Object.fromEntries(NAMES.map((n) => [n, read(f, n)]));
const old = bytes(f);
const oldTimes = mtimes(f);
const hint = f.run(['check']);
assert.match(hint.stderr, /schemaVersion 1: run system-flow migrate/, 'check on version 1 gives the hint');

const r = f.run(['migrate']);
assert.strictEqual(r.status, 0, `migrate exits 0\n${r.stdout}${r.stderr}`);
const out = parseJson(r.stdout) as { rewritten: string[]; owed: string[] };
assert.deepStrictEqual(out.rewritten, ['level0', 'meta', 'turns'].map((n) => `${F}/${n}.json`), 'the changed files, sorted; chapters.json holds nothing to upgrade');

// Looks, version and name.
assert.deepStrictEqual(read(f, 'level0').levels.diagrams[0].nodes.map((n: Obj) => n.look), ['store', 'client', 'external', 'security', 'service']);
assert.deepStrictEqual(read(f, 'turns').sequences[0].participants.map((p: Obj) => p.look), ['store', 'service']);
assert.strictEqual(read(f, 'meta').schemaVersion, 2);
assert.strictEqual(read(f, 'meta').meta.name, 'Shop');
const named = v1((g) => g.fragment('meta', { schemaVersion: 1, meta: { title: 'Shop', name: 'Own name', roots: [{ id: 'backend' }] } }));
named.run(['migrate']);
assert.strictEqual(read(named, 'meta').meta.name, 'Own name', 'a name already present is kept');

// Nothing else changes.
for (const n of NAMES) assert.deepStrictEqual(stripped(read(f, n)), stripped(n === 'meta' ? { ...before[n], meta: { ...before[n]?.meta, name: 'Shop' } } : before[n]), `${n} differs only by look, schemaVersion and name`);

// Owed is what check fails on.
assert.ok(out.owed.includes(`${F}/meta.json:/meta: meta.intro missing`), out.owed.join('\n'));
assert.ok(out.owed.includes(`${F}/chapters.json:/sections: Start here role what missing`), out.owed.join('\n'));
assert.ok(out.owed.some((l) => l.endsWith('rule r1: ADR docs/adr/0009-gone.md not found')), `owed holds the rule check too\n${out.owed.join('\n')}`);
const checked = f.run(['check']);
assert.strictEqual(checked.status, 1);
assert.doesNotMatch(checked.stderr, /run system-flow migrate/, 'the hint is gone');
assert.deepStrictEqual([...out.owed].sort(), checked.stderr.split('\n').filter((l) => l !== '').sort(), 'owed equals the error lines check prints');

// Idempotent: a second run writes nothing.
const again = v1();
again.run(['migrate']);
const done = bytes(again);
const doneTimes = mtimes(again);
const second = again.run(['migrate']);
assert.strictEqual(second.status, 0, second.stderr);
assert.deepStrictEqual((parseJson(second.stdout) as { rewritten: string[] }).rewritten, []);
assert.deepStrictEqual(bytes(again), done);
assert.deepStrictEqual(mtimes(again), doneTimes);
assert.notDeepStrictEqual(old, done, 'the first run did change the files');
assert.ok(oldTimes.length > 0);

// A mixed set: only the version-1 fragment is rewritten.
const mixed = v1((g) => g.fragment('meta', { schemaVersion: 2, meta: { name: 'Shop', roots: [{ id: 'backend' }] } }));
mixed.fragment('chapters', { schemaVersion: 1, sections: [{ id: 's1', title: 'Pages', question: 'How is a page served?' }] });
fs.writeFileSync(path_(mixed, 'level0'), JSON.stringify({ schemaVersion: 2, levels: { root: 'system', diagrams: [] } }));
fs.writeFileSync(path_(mixed, 'turns'), JSON.stringify({ schemaVersion: 2, sequences: [] }));
const mixedOut = mixed.run(['migrate']);
assert.strictEqual(mixedOut.status, 0, mixedOut.stderr);
assert.deepStrictEqual((parseJson(mixedOut.stdout) as { rewritten: string[] }).rewritten, [`${F}/chapters.json`]);

// An area fragment with no schemaVersion under a version-2 meta.json: check hints, migrate adds the look.
const area = v1((g) => g.fragment('meta', { schemaVersion: 2, meta: { name: 'Shop', roots: [{ id: 'backend' }] } }));
fs.writeFileSync(path_(area, 'turns'), JSON.stringify({ schemaVersion: 2, sequences: [] }));
fs.writeFileSync(path_(area, 'chapters'), JSON.stringify({ schemaVersion: 2, sections: [{ id: 's1', title: 'Pages', question: 'How is a page served?' }] }));
const areaHint = area.run(['check']);
assert.match(areaHint.stderr, new RegExp(`^${F}/level0.json:/levels/diagrams/0/nodes/0: look missing: run system-flow migrate$`, 'm'), areaHint.stderr);
const areaOut = area.run(['migrate']);
assert.strictEqual(areaOut.status, 0, areaOut.stderr);
assert.deepStrictEqual((parseJson(areaOut.stdout) as { rewritten: string[] }).rewritten, [`${F}/level0.json`], 'only the changed fragment is written');
assert.deepStrictEqual(read(area, 'level0').levels.diagrams[0].nodes.map((n: Obj) => n.look), ['store', 'client', 'external', 'security', 'service']);

// All or nothing: a fragment that cannot become valid stops every write.
const bad = v1((g) => g.fragment('level0', { levels: { root: 'system', diagrams: [{ id: 'system', level: 0, title: 'System', summary: 'The shop keeps its data in a database.', groups: [], nodes: [node('db', 42)], edges: [] }] } }));
const badBytes = bytes(bad);
const failed = bad.run(['migrate']);
assert.strictEqual(failed.status, 1, failed.stdout);
assert.match(failed.stderr, new RegExp(`^${F}/level0.json:/levels/diagrams/0/nodes/0/kind: `, 'm'));
assert.deepStrictEqual(bytes(bad), badBytes, 'every fragment is unchanged');

// No folder, and usage.
const none = sfFixture().run(['--site', 'nowhere', 'migrate']);
assert.strictEqual(none.status, 1);
assert.strictEqual(none.stderr.trim(), 'system-flow: migrate: no fragments folder at nowhere/model/fragments');
const extra = sfFixture().run(['migrate', 'extra']);
assert.strictEqual(extra.status, 2);
assert.match(extra.stderr, /^system-flow: usage: .*\| migrate/);

console.log('system-flow-migrate.test.js: OK');
