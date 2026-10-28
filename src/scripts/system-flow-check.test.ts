// Run: node scripts/system-flow-check.test.js
// system-flow check: fragment load, schema, merge and duplicate ids, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { parseJson } from '../lib/json.js';
import { handleOf, mergeFragments, parseHandle } from '../lib/sf-model.js';
import { validate } from '../lib/sf-schema.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

// The check's stdout on success.
const out = (stdout: string) => parseJson(stdout) as { ok: boolean; fragments: number; items: number; warnings: string[] };
const F = 'docs/system-flow/model/fragments';
const ev = [{ path: 'app/x.rb', lines: '1-4', symbol: 'Link' }];

// The fixture: a plain root, one commit per git root, and an env with no CLAUDE_CONFIG_DIR.
{
  const f = sfFixture();
  assert.ok(!fs.existsSync(path.join(f.plain, '.git')), 'plain has no .git');
  assert.strictEqual(f.git('host', 'log', '--format=%s').split('\n').length, 1, 'host has one commit');
  const saved = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = '/nowhere';
  const e = f.env();
  assert.strictEqual(e.HOME, f.home);
  assert.ok(!('CLAUDE_CONFIG_DIR' in e), 'env drops CLAUDE_CONFIG_DIR');
  assert.strictEqual(f.env({ CLAUDE_CONFIG_DIR: 'x' }).CLAUDE_CONFIG_DIR, 'x');
  if (saved === undefined) delete process.env.CLAUDE_CONFIG_DIR; else process.env.CLAUDE_CONFIG_DIR = saved;
}

// The good set checks clean: 2 nodes, 1 edge, 1 bullet.
{
  const f = sfFixture();
  f.goodSet();
  const r = f.run(['check']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(out(r.stdout), { ok: true, fragments: 3, items: 4, warnings: [] });
}

// A good set with one change: the check exits 1 and stderr holds the expected line.
type Fx = ReturnType<typeof sfFixture>;
const fails = (why: string, change: (f: Fx) => void, line: RegExp): void => {
  const f = sfFixture();
  f.goodSet();
  change(f);
  const r = f.run(['check']);
  assert.strictEqual(r.status, 1, `${why}: exits 1\n${r.stdout}${r.stderr}`);
  assert.match(r.stderr, line, why);
};
const level0 = (node: object, edge: object = {}) => ({
  levels: { root: 'system', diagrams: [{ id: 'system', level: 0, title: 'System', summary: 'S', groups: [], nodes: [{ id: 'link', label: 'Link', kind: 'backend', role: 'R', evidence: ev, ...node }, { id: 'db', label: 'Db', kind: 'database', role: 'R', evidence: ev }], edges: [{ from: 'link', to: 'db', label: 'reads', evidence: ev, ...edge }] }] },
});

fails('an unknown key', (f) => f.fragment('level0', level0({ colour: 'red' })),
  /^docs\/system-flow\/model\/fragments\/level0\.json:\/levels\/diagrams\/0\/nodes\/0: property colour not allowed$/m);

fails('a section with no question', (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'Links' }] }),
  /chapters\.json:\/sections\/0: required property question missing$/m);

fails('an edge mode out of the enum', (f) => f.fragment('level0', level0({}, { mode: 'maybe' })),
  /\/levels\/diagrams\/0\/edges\/0\/mode: value "maybe" not in enum$/m);

fails('an edge short label of 27 characters', (f) => f.fragment('level0', level0({}, { short: 'x'.repeat(27) })),
  /\/levels\/diagrams\/0\/edges\/0\/short: longer than 26 characters$/m);

fails('a node id with a capital', (f) => f.fragment('level0', level0({ id: 'Api' }, { from: 'Api' })),
  /\/levels\/diagrams\/0\/nodes\/0\/id: does not match \^\[a-z0-9\]\[a-z0-9-\]\*\$$/m);
fails('a section folder that climbs out', (f) => f.fragment('chapters', { sections: [{ id: 's1', title: 'Links', question: 'Q?', folder: '../x' }] }),
  /\/sections\/0\/folder: does not match \^\[a-z0-9\]\[a-z0-9-\]\*\$$/m);
fails('a root id with a capital', (f) => f.fragment('meta', { schemaVersion: 1, meta: { roots: [{ id: 'Guide' }] } }),
  /meta\.json:\/meta\/roots\/0\/id: does not match \^\[a-z0-9\]\[a-z0-9-\]\*\$$/m);

fails('a boolean field given a string', (f) => f.fragment('level0', level0({ primary: 'yes' })),
  /\/levels\/diagrams\/0\/nodes\/0\/primary: expected boolean$/m);
fails('an integer field given a fraction', (f) => f.fragment('meta', { schemaVersion: 1.5, meta: { roots: [{ id: 'backend' }] } }),
  /meta\.json:\/schemaVersion: expected integer$/m);
fails('a fragment that is an array', (f) => f.fragment('x', []), /x\.json:: expected object$/m);
fails('a fragment that is null', (f) => f.fragment('x', null), /x\.json:: expected object$/m);

fails('a schemaVersion newer than the CLI', (f) => f.fragment('meta', { schemaVersion: 2, meta: { roots: [{ id: 'backend' }] } }),
  /^docs\/system-flow\/model\/fragments\/meta\.json:\/schemaVersion: schemaVersion 2 is newer than this CLI \(1\)$/m);
fails('meta.json with no schemaVersion', (f) => f.fragment('meta', { meta: { roots: [{ id: 'backend' }] } }),
  /meta\.json:: required property schemaVersion missing$/m);

fails('a fragment that is not JSON', (f) => f.put('host', `${F}/x.json`, '{'),
  /^docs\/system-flow\/model\/fragments\/x\.json:: invalid JSON/m);

// Usage errors exit 2.
{
  const f = sfFixture();
  for (const args of [['frobnicate'], [], ['check', 'extra'], ['--site']]) {
    const r = f.run(args);
    assert.strictEqual(r.status, 2, `${args.join(' ')}: exits 2\n${r.stderr}`);
    assert.match(r.stderr, /^system-flow: usage:/, args.join(' '));
  }
}

// A diagram fragment for engine.json holding the given nodes and a node src, each given an edge from src (edges resolve inside their diagram).
const engine = (extra: object, ...ids: string[]) => ({
  levels: { diagrams: [{ id: 'engine', level: 1, title: 'Engine', summary: 'E', groups: [], nodes: [...ids, 'src'].map((id) => ({ id, label: id, kind: 'backend', role: 'R', evidence: ev })), edges: ids.map((id) => ({ from: 'src', to: id, label: 'calls', evidence: ev })) }] },
  ...extra,
});
fails('node api in two fragments', (f) => { f.fragment('level0', level0({ id: 'api' }, { from: 'api' })); f.fragment('engine', engine({}, 'api')); },
  /^docs\/system-flow\/model\/fragments\/engine\.json:\/levels\/diagrams\/0\/nodes\/0: node api is also defined in docs\/system-flow\/model\/fragments\/level0\.json$/m);

// A good set with one change: the check exits 0 and reports this many items.
const passes = (why: string, change: (f: Fx) => void, items: number): void => {
  const f = sfFixture();
  f.goodSet();
  change(f);
  const r = f.run(['check']);
  assert.strictEqual(r.status, 0, `${why}: exits 0\n${r.stderr}`);
  assert.strictEqual(out(r.stdout).items, items, `${why}: items`);
};
const turnSeq = { id: 'turn', title: 'Turn', chapter: 's1', participants: [], messages: [] };
passes('node turn and sequence turn', (f) => f.fragment('engine', engine({ sequences: [turnSeq] }, 'turn')), 7);
{
  const f = sfFixture();
  f.goodSet();
  const twin = level0({});
  const d = twin.levels.diagrams[0];
  if (d) d.edges.push({ from: 'link', to: 'db', label: 'writes', evidence: ev });
  f.fragment('level0', twin);
  const r = f.run(['check']);
  assert.strictEqual(r.status, 0, `a second link to db edge is not a duplicate\n${r.stderr}`);
  assert.strictEqual(out(r.stdout).items, 5, 'both edges are items');
}

const withGroup = (group: object) => {
  const l = level0({});
  const d = l.levels.diagrams[0];
  if (d) (d.groups as object[]).push({ id: 'g1', label: 'Group', members: ['link', 'db'], evidence: ev, unconfirmed: true, ...group });
  return l;
};
passes('a group with evidence and unconfirmed', (f) => f.fragment('level0', withGroup({})), 5);
fails('a group with an unknown key', (f) => f.fragment('level0', withGroup({ colour: 'red' })),
  /level0\.json:\/levels\/diagrams\/0\/groups\/0: property colour not allowed$/m);

passes('stores tables from two fragments', (f) => {
  f.fragment('a', { stores: { sql: [{ id: 'sql-links', table: 'links', evidence: ev }] } });
  f.fragment('b', { stores: { sql: [{ id: 'sql-users', table: 'users', evidence: ev }], cache: [{ id: 'cache-links', pattern: 'link:{id}', evidence: ev }] } });
}, 7);
fails('one store id in two tables', (f) => f.fragment('a', { stores: { sql: [{ id: 'links', evidence: ev }], cache: [{ id: 'links', evidence: ev }] } }),
  /^docs\/system-flow\/model\/fragments\/a\.json:\/stores\/cache\/0: store links is also defined in docs\/system-flow\/model\/fragments\/a\.json$/m);

const api = { id: 'api', label: 'API', evidence: ev };
passes('a participant, message, flow step, catalogue, inventory and rule entry', (f) => f.fragment('engine', {
  sequences: [{ ...turnSeq, participants: [api], messages: [{ n: 1, from: 'api', to: 'api', label: 'loops', evidence: ev }] }],
  storeFlows: [{ id: 'save', trigger: 'A save', chapter: 's1', steps: [{ n: 1, actor: 'api', op: 'write', store: 'sql', evidence: ev }] }],
  catalogue: [{ id: 'bus', kind: 'queue', name: 'Bus', evidence: ev }],
  inventory: [{ id: 'links', kind: 'engine', name: 'Links', evidence: ev }],
  rules: [{ id: 'expiry', text: 'Links expire.', evidence: ev }],
}), 10);
fails('one participant twice in a sequence', (f) => f.fragment('engine', { sequences: [{ ...turnSeq, participants: [api, api] }] }),
  /engine\.json:\/sequences\/0\/participants\/1: participant turn\.api is also defined in docs\/system-flow\/model\/fragments\/engine\.json$/m);

// The site comes from --site, else .fx.json system_flow.output.site, else docs/system-flow.
{
  const f = sfFixture();
  const meta = `${JSON.stringify({ schemaVersion: 1, meta: { roots: [{ id: 'backend' }] } })}\n`;
  f.put('host', 'site/model/fragments/meta.json', meta);
  f.fxJson({ system_flow: { output: { site: 'site', markdown: 'docs/system' } } });
  let r = f.run(['check']);
  assert.strictEqual(r.status, 0, `.fx.json site\n${r.stderr}`);
  assert.strictEqual(out(r.stdout).fragments, 1, '.fx.json site: one fragment');
  f.put('host', 'flag/model/fragments/meta.json', meta);
  f.put('host', 'flag/model/fragments/more.json', '{}\n');
  r = f.run(['--site', 'flag', 'check']);
  assert.strictEqual(r.status, 0, `--site\n${r.stderr}`);
  assert.strictEqual(out(r.stdout).fragments, 2, '--site wins over .fx.json');
}

// With no --root, the root is the git top level of the working directory.
{
  const f = sfFixture();
  f.goodSet();
  const r = spawnSync(process.execPath, [path.join(__dirname, 'system-flow'), 'check'], { cwd: path.join(f.host, 'app'), encoding: 'utf8', env: f.env() });
  assert.strictEqual(r.status, 0, `no --root, run from app/\n${r.stderr}`);
  assert.strictEqual(out(r.stdout).fragments, 3);
}

// No fragments folder: one line naming it, exit 1.
{
  const r = sfFixture().run(['check']);
  assert.strictEqual(r.status, 1, r.stderr);
  assert.strictEqual(r.stderr, 'system-flow: check: no fragments folder at docs/system-flow/model/fragments\n');
}
// Fragments with no meta.json carry no schemaVersion to check.
{
  const f = sfFixture();
  f.fragment('engine', {});
  const r = f.run(['check']);
  assert.strictEqual(r.status, 1, r.stderr);
  assert.match(r.stderr, /^docs\/system-flow\/model\/fragments\/meta\.json:: file not found$/m);
}

// Handles: the prefix ends at the first colon and must be a known one.
assert.strictEqual(handleOf('cache', 'sql-links'), 'store:sql-links');
assert.strictEqual(handleOf('step', 'first#2'), 'step:first#2');
assert.deepStrictEqual(parseHandle('edge:engine:api>db'), { prefix: 'edge', id: 'engine:api>db' });
assert.deepStrictEqual(parseHandle('seq:turn'), { prefix: 'seq', id: 'turn' });
assert.strictEqual(parseHandle('sql:links'), null, 'sql is a kind, not a handle prefix');
assert.strictEqual(parseHandle('node'), null, 'no colon');
assert.strictEqual(parseHandle('node:'), null, 'no id');

// The validator skips annotation keywords, follows $ref, and refuses a keyword it does not enforce.
assert.deepStrictEqual(
  validate({ $schema: 's', $id: 'i', title: 't', description: 'd', $defs: { a: { type: 'string' } }, $ref: '#/$defs/a' }, 1),
  [{ pointer: '', message: 'expected string' }]);
assert.deepStrictEqual(validate({ type: 'string', format: 'email' }, 'x'), [{ pointer: '', message: 'unsupported keyword format' }]);
assert.throws(() => validate({ $ref: '#/$defs/missing' }, 'x'), /cannot resolve \$ref #\/\$defs\/missing/);

// Property names inherited from Object.prototype are checked like any other key.
fails('a node carrying constructor', (f) => f.fragment('level0', level0({ constructor: 1 })),
  /level0\.json:\/levels\/diagrams\/0\/nodes\/0: property constructor not allowed$/m);
fails('a node carrying toString', (f) => f.fragment('level0', level0({ toString: 'x' })),
  /level0\.json:\/levels\/diagrams\/0\/nodes\/0: property toString not allowed$/m);
{
  const f = sfFixture();
  f.goodSet();
  f.put('host', `${F}/x.json`, '{ "__proto__": { "polluted": "yes" } }\n');
  const r = f.run(['check']);
  assert.strictEqual(r.status, 1, `a top-level __proto__ key: exits 1\n${r.stderr}`);
  assert.match(r.stderr, /^docs\/system-flow\/model\/fragments\/x\.json:: property __proto__ not allowed$/m);
}
assert.deepStrictEqual(validate({ required: ['toString'] }, {}), [{ pointer: '', message: 'required property toString missing' }]);
assert.throws(() => validate({ $ref: '#/$defs/constructor', $defs: {} }, 'x'), /cannot resolve \$ref #\/\$defs\/constructor/);
// mergeFragments never writes through a __proto__ key onto Object.prototype.
{
  const data = parseJson('{ "__proto__": { "polluted": "yes" } }') as Record<string, unknown>;
  mergeFragments([{ file: 'x.json', data }]);
  assert.strictEqual(({} as Record<string, unknown>).polluted, undefined, 'Object.prototype is untouched');
}

process.stdout.write('system-flow-check.test.js: OK\n');
