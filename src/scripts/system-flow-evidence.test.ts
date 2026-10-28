// Run: node scripts/system-flow-evidence.test.js
// system-flow check: evidence roots and the path, range and symbol tests, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Ev = Record<string, unknown>;
const F = 'docs/system-flow/model/fragments';
const NODE0 = `${F}/level0.json:/levels/diagrams/0/nodes/0/evidence/0`;
const good: Ev = { path: 'app/x.rb', lines: '1-4', symbol: 'Link#expired?' };

const setup = (evidence: Ev[], roots: object[] = [{ id: 'backend' }, { id: 'guide' }], map: Record<string, string> = { guide: '../guide' }): Fx => {
  const f = sfFixture();
  f.goodSet();
  f.fragment('meta', { schemaVersion: 1, meta: { roots } });
  f.fxJson({ system_flow: { roots: map } });
  const l0 = parseJson(fs.readFileSync(path.join(f.host, F, 'level0.json'), 'utf8')) as { levels: { diagrams: { nodes: { evidence: Ev[] }[] }[] } };
  l0.levels.diagrams[0]!.nodes[0]!.evidence = evidence;
  f.fragment('level0', l0);
  return f;
};
const fails = (why: string, evidence: Ev[], line: string, tweak: (f: Fx) => void = () => {}): void => {
  const f = setup(evidence);
  tweak(f);
  const r = f.run(['check']);
  assert.strictEqual(r.status, 1, `${why}: exits 1\n${r.stdout}${r.stderr}`);
  assert.ok(r.stderr.split('\n').includes(line), `${why}: expected line ${line}\n${r.stderr}`);
};
const passes = (why: string, evidence: Ev[], tweak: (f: Fx) => void = () => {}): { warnings: string[] } => {
  const f = setup(evidence);
  tweak(f);
  const r = f.run(['check']);
  assert.strictEqual(r.status, 0, `${why}\n${r.stderr}`);
  return parseJson(r.stdout) as { warnings: string[] };
};
const miss = (why: string, entry: Ev, shown: string, test: string): void => fails(why, [entry], `${NODE0}: node:link: ${shown}: ${test}`);

assert.deepStrictEqual(passes('good', [good]).warnings, []);
passes('whole symbol', [{ path: 'app/x.rb', lines: '1', symbol: 'class Link' }]);
passes('multi-range', [{ path: 'app/x.rb', lines: '1,4', symbol: 'expired?' }]);
passes('other root', [{ root: 'guide', path: 'README.md', lines: '1', symbol: 'Guide' }]);
passes('owner evidence', [{ owner: '2026-10-28', question: 'q1' }]);

miss('missing file', { ...good, path: 'app/nope.rb' }, 'backend/app/nope.rb:1-4 Link#expired?', 'file missing');
for (const lines of ['8-12', '0-2', '5-3']) {
  miss(`range ${lines}`, { ...good, lines }, `backend/app/x.rb:${lines} Link#expired?`, 'range outside file (10 lines)');
}
miss('symbol absent', { path: 'app/x.rb', lines: '5-10', symbol: 'expired?' }, 'backend/app/x.rb:5-10 expired?', 'symbol not in cited lines');
miss('case', { ...good, symbol: 'Expired?' }, 'backend/app/x.rb:1-4 Expired?', 'symbol not in cited lines');
miss('glob', { path: 'app/*.rb', lines: '1', symbol: 'Link' }, 'backend/app/*.rb:1 Link', 'path with * or { is not allowed');
miss('whitespace', { path: 'app/my file.rb', lines: '1', symbol: 'Link' }, 'backend/app/my file.rb:1 Link', 'path with whitespace or a backtick cannot be written as an evidence line');
miss('backtick path', { path: 'app/x`.rb', lines: '1', symbol: 'Link' }, 'backend/app/x`.rb:1 Link', 'path with whitespace or a backtick cannot be written as an evidence line');
miss('backtick symbol', { path: 'app/x.rb', lines: '1', symbol: 'a`b' }, 'backend/app/x.rb:1 a`b', 'symbol with a backtick cannot be written as an evidence line');
miss('no symbol', { path: 'app/x.rb', lines: '1' }, 'backend/app/x.rb:1', 'a file entry needs lines and symbol');
miss('unknown root', { root: 'mobile', path: 'app/x.rb', lines: '1', symbol: 'Link' }, 'mobile/app/x.rb:1 Link', 'evidence names root mobile, not in meta.roots');

// A folder entry: allowed on an inventory entry, not on a node.
const inventory = (p: string) => (f: Fx) => f.fragment('inventory', { inventory: [{ id: 'inv', kind: 'store', name: 'N', evidence: [{ path: p }] }] });
passes('folder on inventory', [good], inventory('app/'));
fails('folder missing on inventory', [good], `${F}/inventory.json:/inventory/0/evidence/0: inventory:inv: backend/nope/: folder missing`, inventory('nope/'));
fails('folder on a node', [{ path: 'app/' }], `${NODE0}: node link: a folder entry is allowed only on catalogue and inventory entries`);

// A path that leaves its root is rejected before any read, in git and plain roots alike.
{
  const msg = 'path must be relative to its root and hold no .. segment';
  const plain = (e: Ev, line: string): void => {
    const f = setup([e], [{ id: 'backend' }, { id: 'plain' }], { plain: '../plain' });
    f.put('plain', '../secret.txt', 'Secret\n');
    const r = f.run(['check']);
    assert.strictEqual(r.status, 1, `${line}\n${r.stdout}`);
    assert.ok(r.stderr.split('\n').includes(`${NODE0}: node:link: ${line}: ${msg}`), r.stderr);
  };
  plain({ root: 'plain', path: '../secret.txt', lines: '1', symbol: 'Secret' }, 'plain/../secret.txt:1 Secret');
  plain({ root: 'plain', path: '/etc/passwd', lines: '1', symbol: 'root' }, 'plain//etc/passwd:1 root');
  miss('dotdot in a git root', { path: 'app/../app/x.rb', lines: '1', symbol: 'Link' }, 'backend/app/../app/x.rb:1 Link', msg);
}

// A missing root is one line however many entries cite it.
{
  const f = setup([{ root: 'guide', path: 'README.md', lines: '1', symbol: 'Guide' }, { root: 'guide', path: 'README.md', lines: '1', symbol: 'Guide' }], undefined, { guide: '../nowhere' });
  const r = f.run(['check']);
  assert.strictEqual(r.status, 1);
  assert.deepStrictEqual(r.stderr.trim().split('\n'), [`.fx.json:/system_flow/roots/guide: root guide not found at ${path.resolve(f.host, '../nowhere')}`]);
}

// Uncommitted changes warn in check, and the HEAD bytes are still what is checked.
{
  const w = passes('uncommitted', [good], (f) => f.put('host', 'app/x.rb', 'changed\n')).warnings;
  assert.ok(w.some((x) => x.includes('app/x.rb has uncommitted changes')), w.join('\n'));
}

// A root with no git is read from the working tree and warned about once.
{
  const f = setup([{ root: 'plain', path: 'notes.txt', lines: '1', symbol: 'Plain' }], [{ id: 'backend' }, { id: 'plain' }], { plain: '../plain' });
  const r = f.run(['check']);
  assert.strictEqual(r.status, 0, r.stderr);
  const warnings = (parseJson(r.stdout) as { warnings: string[] }).warnings;
  assert.ok(warnings.some((x) => x.includes('root plain: no git: stale and archify sources unavailable')), warnings.join('\n'));
}

// One git read per cited file, however many entries cite it.
{
  const f = setup([good]);
  const real = (process.env.PATH ?? '').split(path.delimiter).map((d) => path.join(d, 'git')).find((p) => fs.existsSync(p));
  assert.ok(real);
  const shim = path.join(f.base, 'shim');
  const log = path.join(f.base, 'git.log');
  fs.mkdirSync(shim);
  fs.writeFileSync(path.join(shim, 'git'), `#!/bin/sh\necho "$@" >> ${log}\nexec ${real} "$@"\n`, { mode: 0o755 });
  const diagrams = Array.from({ length: 5 }, (_, d) => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `n${d}-${i}`, label: 'N', kind: 'backend', role: 'R', evidence: [good] }));
    const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i]!.id, to: n.id, label: 'l', evidence: [good] }));
    return { id: `d${d}`, level: 0, title: 'D', summary: 'D', groups: [], nodes, edges };
  });
  f.fragment('level0', { levels: { root: 'd0', diagrams } });
  const r = f.run(['check'], { PATH: `${shim}${path.delimiter}${process.env.PATH ?? ''}` });
  assert.strictEqual(r.status, 0, r.stderr);
  const shows = fs.readFileSync(log, 'utf8').split('\n').filter((l) => l.includes('show HEAD:app/x.rb'));
  assert.strictEqual(shows.length, 1, shows.join('\n'));
}

// --fragment verifies one fragment; plain check fails on another fragment's bad range.
{
  const f = setup([{ ...good, lines: '8-12' }]);
  f.fragment('engine', { sequences: [{ id: 'turn', title: 'Turn', chapter: 's1', participants: [], messages: [] }] });
  const one = f.run(['check', '--fragment', `${F}/engine.json`]);
  assert.strictEqual(one.status, 0, one.stderr);
  assert.strictEqual(f.run(['check']).status, 1);
}

console.log('system-flow-evidence.test.js: ok');
