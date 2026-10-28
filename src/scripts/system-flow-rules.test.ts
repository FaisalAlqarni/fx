// Run: node scripts/system-flow-rules.test.js
// system-flow check: structure rules, caps, dash ban and the Arabic warning, run as a process.
import * as assert from 'assert';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
const F = 'docs/system-flow/model/fragments';
const ev = [{ path: 'app/x.rb', lines: '1-4', symbol: 'Link' }];
const node = (id: string, extra: object = {}) => ({ id, label: id, kind: 'backend', look: 'service', role: 'R', evidence: ev, ...extra });
const edge = (from: string, to: string, extra: object = {}) => ({ from, to, label: 'l', evidence: ev, ...extra });
const diagram = (id: string, nodes: object[], edges: object[], extra: object = {}) => ({ id, level: 0, title: id, summary: 'S', groups: [], nodes, edges, ...extra });
const levels = (...diagrams: object[]) => ({ levels: { root: 'system', diagrams } });
const system = (nodes: object[], edges: object[] = [edge('link', 'db')]) => diagram('system', nodes, edges);
const base = [node('link'), node('db')];

const run = (change: (f: Fx) => void) => {
  const f = sfFixture();
  f.goodSet();
  change(f);
  return f.run(['check']);
};
const fails = (why: string, change: (f: Fx) => void, line: string): void => {
  const r = run(change);
  assert.strictEqual(r.status, 1, `${why}: exits 1\n${r.stdout}${r.stderr}`);
  assert.ok(r.stderr.split('\n').includes(`${F}/${line}`), `${why}: expected line ${line}\n${r.stderr}`);
};
const passes = (why: string, change: (f: Fx) => void): { warnings: string[] } => {
  const r = run(change);
  assert.strictEqual(r.status, 0, `${why}\n${r.stderr}`);
  return parseJson(r.stdout) as { warnings: string[] };
};
const L0 = 'level0.json:';
const D0 = '/levels/diagrams/0';

// The good set still has no warnings.
assert.deepStrictEqual(passes('good set', () => {}).warnings, []);

// Cap: 12 primary nodes per diagram.
const many = (n: number) => Array.from({ length: n }, (_, i) => node(`n${i}`));
const chain = (n: number) => Array.from({ length: n - 1 }, (_, i) => edge(`n${i}`, `n${i + 1}`));
fails('13 primary nodes', (f) => f.fragment('level0', levels(diagram('engine', many(13), chain(13)))), `${L0}${D0}: level engine has 13 primary nodes, at most 12`);
passes('12 primary nodes', (f) => f.fragment('level0', levels(diagram('engine', many(12), chain(12)))));
passes('12 primary and a context node', (f) => f.fragment('level0', levels(diagram('engine', [...many(12), node('ctx', { primary: false })], [...chain(12), edge('n0', 'ctx')]))));

// Evidence on every evidenced kind.
const withParts = (extra: { node?: object; edge?: object; group?: object; seq?: object; msg?: object; store?: object; step?: object; cat?: object; inv?: object; rule?: object; bullet?: object }, bare: object) => (f: Fx) => {
  const e = ev;
  f.fragment('level0', levels(diagram('system', [node('api', { ...extra.node }), node('db')], [edge('api', 'db', { ...extra.edge })], { groups: [{ id: 'g1', label: 'G', members: ['api'], evidence: e, ...extra.group }] })));
  f.fragment('chapters', {
    sections: [{ id: 's1', title: 'T', question: 'Q?', bullets: [{ id: 'b1', text: 't', evidence: e, ...extra.bullet }] }],
    sequences: [{ id: 'turn', title: 'T', chapter: 's1', participants: [{ id: 'api', label: 'A', look: 'service', evidence: e, ...extra.seq }, { id: 'db', label: 'D', look: 'service', evidence: e }], messages: [{ n: 1, from: 'api', to: 'db', label: 'm', evidence: e, ...extra.msg }] }],
    stores: { sql: [{ id: 'sql-links', evidence: e, ...extra.store }] },
    storeFlows: [{ id: 'first', trigger: 't', chapter: 's1', steps: [{ n: 1, actor: 'api', op: 'read', store: 'sql', evidence: e, ...extra.step }] }],
    catalogue: [{ id: 'q-mail', kind: 'queue', name: 'Mail', evidence: e, ...extra.cat }],
    inventory: [{ id: 'job-sweep', kind: 'job', name: 'Sweep', evidence: e, ...extra.inv }],
  });
  f.fragment('rules', { rules: [{ id: 'r1', text: 'R', evidence: e, ...extra.rule }] });
  void bare;
};
const kinds: [string, keyof Parameters<typeof withParts>[0], string, string][] = [
  ['node api', 'node', 'level0.json', `${D0}/nodes/0`],
  ['edge engine:api>db', 'edge', 'level0.json', ''],
  ['group g1', 'group', 'level0.json', `${D0}/groups/0`],
  ['participant turn.api', 'seq', 'chapters.json', '/sequences/0/participants/0'],
  ['message turn#1', 'msg', 'chapters.json', '/sequences/0/messages/0'],
  ['store row sql-links', 'store', 'chapters.json', '/stores/sql/0'],
  ['step first#1', 'step', 'chapters.json', '/storeFlows/0/steps/0'],
  ['catalogue entry q-mail', 'cat', 'chapters.json', '/catalogue/0'],
  ['inventory entry job-sweep', 'inv', 'chapters.json', '/inventory/0'],
  ['rule r1', 'rule', 'rules.json', '/rules/0'],
  ['bullet b1', 'bullet', 'chapters.json', '/sections/0/bullets/0'],
];
for (const [word, key, file, pointer] of kinds) {
  const id = word.split(' ').pop() as string;
  const edgeWord = key === 'edge';
  // The diagram in this test is "system", so the edge id is system:api>db.
  const shown = edgeWord ? 'edge system:api>db' : word;
  const where = edgeWord ? `${D0}/edges/0` : pointer;
  void id;
  const bare = { evidence: [] };
  fails(`${word} without evidence`, withParts({ [key]: bare }, bare), `${file}:${where}: ${shown} has no evidence and is not unconfirmed`);
  passes(`${word} unconfirmed`, withParts({ [key]: { ...bare, unconfirmed: true } }, bare));
}
passes('all evidenced kinds with evidence', withParts({}, {}));

// Children rule.
const two = (primary: boolean) => (f: Fx) => f.fragment('level0', levels(
  diagram('system', [node('api', { children: 'engine', primary }), node('db')], [edge('api', 'db')]),
  diagram('engine', [node('a'), node('b')], [edge('a', 'b')], { level: 1, parent: 'clients' }),
));
fails('primary node opens a diagram of another parent', two(true), `${L0}${D0}/nodes/0: node api opens engine, whose parent is clients, not system`);
passes('context node opens any existing diagram', two(false));
for (const primary of [true, false]) {
  fails(`children nowhere (primary ${primary})`, (f) => f.fragment('level0', levels(system([node('link', { children: 'nowhere', primary }), node('db')]))), `${L0}${D0}/nodes/0: node link opens missing diagram nowhere`);
}

// Orphan, dangling edge, message, step.
fails('node with no edge', (f) => f.fragment('level0', levels(system([...base, node('lonely')]))), `${L0}${D0}/nodes/2: node lonely in system has no edge`);
fails('edge to a missing node', (f) => f.fragment('level0', levels(system([...base, node('api')], [edge('link', 'db'), edge('api', 'ghost')]))), `${L0}${D0}/edges/1: edge system:api>ghost names a missing node ghost`);
const seq = (msg: object, step: object = {}) => (f: Fx) => {
  f.fragment('chapters', {
    sections: [{ id: 's1', title: 'T', question: 'Q?' }],
    sequences: [{ id: 'turn', title: 'T', chapter: 's1', participants: [{ id: 'api', label: 'A', look: 'service', evidence: ev }], messages: [{ n: 1, from: 'api', to: 'api', label: 'm', evidence: ev }, { n: 3, from: 'api', to: 'api', label: 'm', evidence: ev, ...msg }] }],
    storeFlows: [{ id: 'first', trigger: 't', chapter: 's1', steps: [{ n: 2, actor: 'api', op: 'read', store: 'sql', evidence: ev, ...step }] }],
  });
  f.fragment('level0', levels(system([node('link'), node('db'), node('api')], [edge('link', 'db'), edge('api', 'db')])));
};
fails('message to a missing participant', seq({ to: 'ghost' }), 'chapters.json:/sequences/0/messages/1: message turn#3 names a missing participant ghost');
fails('step actor missing everywhere', seq({}, { actor: 'ghost' }), 'chapters.json:/storeFlows/0/steps/0: step first#2 names a missing actor ghost');
passes('step actor is a node', seq({}, { actor: 'db' }));

// Chapters and section references.
fails('flow chapter', (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'T', question: 'Q?' }], storeFlows: [{ id: 'first', trigger: 't', chapter: 'nochapter', steps: [] }] }), 'chapters.json:/storeFlows/0: flow first names a missing chapter nochapter');
fails('sequence chapter', (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'T', question: 'Q?' }], sequences: [{ id: 'turn', title: 'T', chapter: 'x', participants: [], messages: [] }] }), 'chapters.json:/sequences/0: sequence turn names a missing chapter x');
// A deep diagram page name is <name>-p<n>; an id ending in -p<digits> would collide with another diagram's page.
fails('sequence id ending -p2', (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'T', question: 'Q?' }], sequences: [{ id: 'turn-p2', title: 'T', chapter: 's1', participants: [], messages: [] }] }), 'chapters.json:/sequences/0: sequence turn-p2 ends in -p and digits, which deep diagram page names use');
fails('flow id ending -p10', (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'T', question: 'Q?' }], storeFlows: [{ id: 'first-p10', trigger: 't', chapter: 's1', steps: [] }] }), 'chapters.json:/storeFlows/0: flow first-p10 ends in -p and digits, which deep diagram page names use');
for (const [key, word] of [['diagrams', 'diagram'], ['sequences', 'sequence'], ['storeFlows', 'store flow'], ['storeRefs', 'store row'], ['catalogueRefs', 'catalogue entry'], ['covers', 'inventory entry']]) {
  fails(`section ${key}`, (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'T', question: 'Q?', [key as string]: ['gone'] }] }), `chapters.json:/sections/0: section s1 names a missing ${word} gone`);
}
passes('section refs that resolve', (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'T', question: 'Q?', diagrams: ['system'] }] }));

// Handles.
const qs = (items: string[]) => (f: Fx) => f.fragment('questions', { questions: [{ id: 'q1', text: 'Q', items }] });
fails('question item missing', qs(['node:ghost']), 'questions.json:/questions/0: question q1 names a missing item node:ghost');
fails('question item not a handle', qs(['api']), 'questions.json:/questions/0: question q1 names api, which is not a handle (<kind>:<id>)');
passes('question item resolves', qs(['node:link']));
fails('correction item missing', (f) => f.fragment('corrections', { corrections: [{ id: 'c1', date: '2026-10-28', item: 'bullet:b9', reason: 'owner' }] }), 'corrections.json:/corrections/0: correction c1 names a missing item bullet:b9');
passes('correction item resolves', (f) => f.fragment('corrections', { corrections: [{ id: 'c1', date: '2026-10-28', item: 'bullet:b1', reason: 'owner' }] }));

// Dashes and Arabic.
fails('em dash in a label', (f) => f.fragment('level0', levels(system([node('link', { label: 'a\u2014b' }), node('db')]))), `${L0}${D0}/nodes/0/label: em or en dash`);
fails('en dash in a bullet', (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'T', question: 'Q?', bullets: [{ id: 'b1', text: 'a\u2013b', evidence: ev }] }] }), 'chapters.json:/sections/0/bullets/0/text: em or en dash');
assert.deepStrictEqual(passes('Arabic label', (f) => f.fragment('level0', levels(system([node('link', { label: 'مرحبا' }), node('db')])))).warnings, [`${F}/${L0}${D0}/nodes/0/label: Arabic script in a label of node link`]);

console.log('system-flow-rules.test.js: OK');
