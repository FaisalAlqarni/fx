// Run: node scripts/system-flow-stale.test.js
// system-flow query, stale and verify, run as processes on the two-root fixture.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Obj = Record<string, any>; // ts-gate-ok: parsed CLI output in a test
const F = 'docs/system-flow/model/fragments';
const ev = (p: string, lines: string, symbol: string, root?: string) => [{ ...(root === undefined ? {} : { root }), path: p, lines, symbol }];
const out = (r: { stdout: string }): Obj => parseJson(r.stdout) as Obj;
const handles = (r: { stdout: string }): string[] => (out(r).items as { handle: string }[]).map((i) => i.handle).sort();
const frag = (f: Fx, name: string): Obj => parseJson(fs.readFileSync(path.join(f.host, F, `${name}.json`), 'utf8')) as Obj;
const fragBytes = (f: Fx): Record<string, string> => Object.fromEntries(fs.readdirSync(path.join(f.host, F)).map((n) => [n, fs.readFileSync(path.join(f.host, F, n), 'utf8')]));
const xrb = (): string => Array.from({ length: 20 }, (_, i) => (i === 0 ? 'class Link' : i === 10 ? '  def expired?' : `  # pad ${i + 1}`)).join('\n') + '\n';
const stale = (f: Fx): Record<string, { handle: string; reason: string }[]> => { const r = f.run(['stale']); assert.strictEqual(r.status, 0, r.stderr); return out(r).roots; };

// Item link cites x.rb 10-12; edge system:link>db cites y.rb; bullet b2 cites the guide; node db is unconfirmed.
function setup(opts: { third?: boolean; twoEdges?: boolean } = {}): Fx {
  const f = sfFixture();
  f.put('host', 'app/x.rb', xrb());
  const roots = [{ id: 'backend' }, { id: 'guide' }, ...(opts.third ? [{ id: 'third' }] : [])];
  f.fragment('meta', { schemaVersion: 1, meta: { roots } });
  f.fxJson({ system_flow: { roots: { guide: '../guide', ...(opts.third ? { third: '../third' } : {}) } } });
  const edge = { from: 'link', to: 'db', label: 'reads', evidence: ev('app/y.rb', '1-2', 'Y') };
  f.fragment('level0', {
    levels: {
      root: 'system',
      diagrams: [{
        id: 'system', level: 0, title: 'System', summary: 'The whole system.', groups: [],
        nodes: [
          { id: 'link', label: 'Link', kind: 'backend', role: 'Expires links', evidence: ev('app/x.rb', '10-12', 'Link#expired?') },
          { id: 'db', label: 'Database', kind: 'database', role: 'Stores links', unconfirmed: true, evidence: [] },
        ],
        edges: opts.twoEdges ? [edge, { ...edge, label: 'writes' }] : [edge],
      }],
    },
  });
  f.fragment('chapters', { sections: [{ id: 's1', title: 'Links', question: 'Where do links expire?', bullets: [{ id: 'b2', text: 'The guide explains it.', evidence: ev('README.md', '1', 'Guide', 'guide') }] }] });
  if (opts.third) {
    const dir = path.join(f.base, 'third');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'A\n');
    for (const args of [['init', '-q', '-b', 'main'], ['add', '-A'], ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'first']]) {
      assert.strictEqual(spawnSync('git', args, { cwd: dir }).status, 0);
    }
  }
  f.commit('host', 'model');
  const b = f.run(['build']);
  assert.strictEqual(b.status, 0, `build\n${b.stdout}${b.stderr}`);
  f.commit('host', 'build');
  return f;
}
const editX = (f: Fx, edit: (lines: string[]) => string[]): string => {
  f.put('host', 'app/x.rb', edit(xrb().split('\n')).join('\n'));
  return f.commit('host', 'edit x');
};

// stale
{
  const f = setup();
  assert.deepStrictEqual(stale(f), { backend: [], guide: [] }, 'fresh');
}
{
  const f = setup();
  editX(f, (l) => ['# a', '# b', ...l]);
  assert.deepStrictEqual(stale(f), { backend: [{ handle: 'node:link', reason: 'shifted' }], guide: [] }, 'two lines inserted at the top');
}
{
  const f = setup();
  editX(f, (l) => l.map((x, i) => (i === 10 ? '  def expired?; false' : x)));
  assert.deepStrictEqual(stale(f).backend, [{ handle: 'node:link', reason: 'changed' }], 'edit on a cited line');
}
{
  const f = setup();
  f.git('host', 'rm', '-q', 'app/y.rb');
  f.commit('host', 'rm y');
  assert.deepStrictEqual(stale(f).backend, [{ handle: 'edge:system:link>db', reason: 'deleted' }]);
}
{
  const f = setup();
  const l0 = frag(f, 'level0');
  delete l0.levels.diagrams[0].nodes[0].verified;
  l0.levels.diagrams[0].edges[0].verified.backend = '1'.repeat(40);
  f.fragment('level0', l0);
  assert.deepStrictEqual(stale(f).backend, [{ handle: 'node:link', reason: 'unverified' }, { handle: 'edge:system:link>db', reason: 'unverified' }], 'no verified; a commit not in the repo');
}
{
  const f = setup();
  f.put('guide', 'README.md', '# Guide 2\n');
  f.commit('guide', 'edit readme');
  assert.deepStrictEqual(stale(f), { backend: [], guide: [{ handle: 'bullet:b2', reason: 'changed' }] }, 'a change in the other root');
}

// query by path
{
  const f = setup({ twoEdges: true });
  assert.deepStrictEqual(handles(f.run(['query', 'app/x.rb'])), ['node:link']);
  assert.deepStrictEqual(handles(f.run(['query', '@guide/README.md'])), ['bullet:b2']);
  assert.deepStrictEqual(handles(f.run(['query', 'app/y.rb'])), ['edge:system:link>db', 'edge:system:link>db#2'], 'repeated pair');
  const one = (out(f.run(['query', 'app/x.rb'])).items as Obj[])[0];
  assert.deepStrictEqual(one, { handle: 'node:link', kind: 'node', file: `${F}/level0.json` });
  assert.strictEqual(f.run(['query']).status, 2);
}

// query --diff
{
  const f = setup();
  const guide0 = f.git('guide', 'rev-parse', 'HEAD');
  f.git('host', 'checkout', '-q', '-b', 'feat');
  f.put('host', 'app/y.rb', 'module Y\n  X = 1\nend\n');
  f.commit('host', 'edit y');
  const r = f.run(['query', '--diff', 'main']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(handles(r), ['edge:system:link>db']);
  assert.strictEqual(out(r).bases.backend, 'main');
  assert.strictEqual(out(r).bases.guide, guide0, 'guide falls back to its verified commit');
  assert.deepStrictEqual(out(r).unbased, []);
  assert.deepStrictEqual(out(r).added, { backend: [], guide: [] });
}
{
  const f = setup();
  const guide0 = f.git('guide', 'rev-parse', 'HEAD');
  f.put('guide', 'README.md', '# Guide 2\n');
  f.commit('guide', 'edit readme');
  const r = f.run(['query', '--diff', 'main']);
  assert.deepStrictEqual(handles(r), ['bullet:b2']);
  assert.strictEqual(out(r).bases.guide, guide0);
}
{
  const f = setup();
  f.git('guide', 'tag', 'g0');
  f.put('guide', 'README.md', '# Guide 2\n');
  f.commit('guide', 'edit readme');
  const r = f.run(['query', '--diff', 'main', '--base', 'guide=g0']);
  assert.deepStrictEqual(handles(r), ['bullet:b2']);
  assert.strictEqual(out(r).bases.guide, 'g0');
  assert.strictEqual(f.run(['query', '--diff', 'main', '--base', 'nope=g0']).status, 2, 'unknown root in --base');
}
{
  const f = setup({ third: true });
  const r = f.run(['query', '--diff', 'main']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(out(r).unbased, ['third']);
  assert.deepStrictEqual(handles(r), []);
  assert.strictEqual(out(r).bases.third, undefined);
}
{
  const f = setup();
  f.git('host', 'checkout', '-q', '-b', 'feat');
  f.put('host', 'app/jobs/sweep_job.rb', 'class SweepJob\nend\n');
  f.commit('host', 'add job');
  const r = f.run(['query', '--diff', 'main']);
  assert.deepStrictEqual(out(r).added.backend, ['app/jobs/sweep_job.rb']);
  assert.deepStrictEqual(handles(r), []);
}

// verify
{
  const f = setup();
  const head = editX(f, (l) => l.map((x, i) => (i === 10 ? '  def expired?; false' : x)));
  const before = frag(f, 'level0');
  const r = f.run(['verify', 'node:link']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(out(r), { verified: ['node:link'] });
  const after = frag(f, 'level0');
  assert.strictEqual(after.levels.diagrams[0].nodes[0].verified.backend, head);
  delete after.levels.diagrams[0].nodes[0].verified.backend;
  delete before.levels.diagrams[0].nodes[0].verified.backend;
  assert.deepStrictEqual(after, before, 'only the verified field changed');
  assert.deepStrictEqual(stale(f).backend, []);
}
{
  const f = setup();
  editX(f, (l) => ['# a', ...l]);
  f.put('guide', 'README.md', '# Guide 2\n');
  const guideHead = f.commit('guide', 'edit readme');
  const r = f.run(['verify', '--all']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(out(r).verified.sort(), ['bullet:b2', 'edge:system:link>db', 'node:link']);
  assert.strictEqual(frag(f, 'chapters').sections[0].bullets[0].verified.guide, guideHead);
  assert.deepStrictEqual(stale(f), { backend: [], guide: [] });
  const once = fragBytes(f);
  assert.strictEqual(f.run(['verify', '--all']).status, 0);
  assert.deepStrictEqual(fragBytes(f), once, 'repeating verify writes the same bytes');
}
{
  const f = setup();
  editX(f, (l) => ['# a', ...l]);
  const before = fragBytes(f);
  const ghost = f.run(['verify', 'node:link', 'node:ghost']);
  assert.strictEqual(ghost.status, 1);
  assert.strictEqual(ghost.stderr, 'system-flow: verify: no item node:ghost\n');
  assert.deepStrictEqual(fragBytes(f), before, 'nothing written');
  const bare = f.run(['verify', 'link']);
  assert.strictEqual(bare.status, 2);
  assert.strictEqual(bare.stderr, 'system-flow: verify: link is not a handle (<kind>:<id>)\n');
  assert.strictEqual(f.run(['verify']).status, 2);
}

console.log('system-flow-stale.test.js: OK');
