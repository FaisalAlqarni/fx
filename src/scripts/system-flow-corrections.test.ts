// Run: node scripts/system-flow-corrections.test.js
// system-flow check: a changed or removed fact needs a new corrections entry, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

const F = 'docs/system-flow/model/fragments';
const ev = [{ path: 'app/x.rb', lines: '1-4', symbol: 'Link' }];
type Fx = ReturnType<typeof sfFixture>;

const level0 = (label = 'API', purpose = 'Links', extra: object = {}) => ({
  levels: { root: 'system', diagrams: [{ id: 'system', level: 0, title: 'System', summary: 'S', groups: [],
    nodes: [{ id: 'api', label, kind: 'backend', look: 'service', role: 'R', evidence: ev }, { id: 'db', label: 'Db', kind: 'database', look: 'service', role: 'R', evidence: ev }],
    edges: [{ from: 'api', to: 'db', label: 'reads', evidence: ev }] }] },
  stores: { sql: [{ id: 'sql-links', table: 'links', purpose, evidence: ev }] },
  storeFlows: [{ id: 'first', trigger: 'T', chapter: 's1', steps: [{ n: 1, actor: 'api', op: 'read', store: 'sql', key: 'k', when: 'always', evidence: ev, ...extra }] }],
});
const bullet = (text = 'A link expires after 30 days.', more: object = {}) => ({ id: 'b1', text, evidence: ev, ...more });
const chapters = (bullets: object[]) => ({ sections: [{ id: 's1', title: 'Links', question: 'Q?', bullets }] });
const corr = { id: 'c1', date: '2026-10-28', item: 'bullet:b1', before: 'A link expires after 30 days.', after: 'A link expires after 60 days.', reason: 'stale', evidence: [{ owner: '2026-10-28' }] };

// A fixture whose fragments are committed at HEAD.
const committed = (extra?: (f: Fx) => void): Fx => {
  const f = sfFixture();
  f.fragment('meta', { schemaVersion: 2, meta: { roots: [{ id: 'backend' }] } });
  f.fragment('level0', level0());
  f.fragment('chapters', chapters([bullet()]));
  extra?.(f);
  f.commit('host', 'fragments');
  return f;
};
const verdict = (why: string, f: Fx, status: number, line?: RegExp): void => {
  const r = f.run(['check']);
  assert.strictEqual(r.status, status, `${why}\n${r.stdout}${r.stderr}`);
  if (line) assert.match(r.stderr, line, why);
};

verdict('no change', committed(), 0);

{
  const f = committed();
  f.fragment('chapters', chapters([bullet('A link expires after 60 days.')]));
  verdict('changed fact', f, 1, new RegExp(`^${F}/chapters\\.json:/sections/0/bullets/0: bullet:b1 changed since HEAD with no corrections entry$`, 'm'));
  f.fragment('corrections', { corrections: [corr] });
  verdict('corrected', f, 0);
}
{
  const f = committed((g) => g.fragment('corrections', { corrections: [corr] }));
  f.fragment('chapters', chapters([bullet('A link expires after 60 days.')]));
  verdict('a correction already at HEAD does not count', f, 1, /bullet:b1 changed since HEAD/);
}
{
  const f = committed();
  const l = level0();
  const d = l.levels.diagrams[0];
  if (d) { d.nodes.shift(); d.edges.length = 0; }
  f.fragment('level0', { ...l, levels: { ...l.levels, diagrams: [{ ...d, nodes: [...(d?.nodes ?? []), { id: 'q', label: 'Q', kind: 'backend', look: 'service', role: 'R', evidence: ev }], edges: [{ from: 'q', to: 'db', label: 'x', evidence: ev }] }] } });
  verdict('removed node', f, 1, new RegExp(`^${F}/level0\\.json:/levels/diagrams/0/nodes/0: node:api removed since HEAD with no corrections entry$`, 'm'));
}
{
  const f = committed();
  f.fragment('chapters', { sections: [{ id: 's1', title: 'Links', question: 'Q?' }, { id: 's2', title: 'Engine', question: 'Q?' }] });
  f.fragment('engine', { sections: [{ id: 's2', bullets: [bullet()] }] });
  verdict('moved, unchanged', f, 0);
  f.fragment('engine', { sections: [{ id: 's2', bullets: [bullet('A link expires after 60 days.')] }] });
  verdict('moved and changed', f, 1, new RegExp(`^${F}/engine\\.json:/sections/0/bullets/0: bullet:b1 changed since HEAD`, 'm'));
}
{
  const turnSeq = { id: 'turn', title: 'Turn', chapter: 's1', participants: [], messages: [] };
  const withTurn = (label: string) => {
    const l = level0();
    l.levels.diagrams[0]?.nodes.push({ id: 'turn', label, kind: 'backend', look: 'service', role: 'R', evidence: ev });
    l.levels.diagrams[0]?.edges.push({ from: 'api', to: 'turn', label: 'x', evidence: ev });
    return { ...l, sequences: [turnSeq] };
  };
  const f = committed((g) => g.fragment('level0', withTurn('Turn')));
  f.fragment('level0', withTurn('Turn two'));
  verdict('node turn changed, same id as a sequence', f, 1, /node:turn changed since HEAD/);
  f.fragment('corrections', { corrections: [{ ...corr, id: 'c2', item: 'node:turn' }] });
  verdict('node turn corrected', f, 0);
}
{
  const f = committed();
  f.fragment('level0', level0('Public API'));
  verdict('label', f, 1, /node:api changed since HEAD with no corrections entry/);
}
{
  const f = committed();
  f.fragment('level0', level0('API', 'Other'));
  verdict('store row', f, 1, /store:sql-links changed since HEAD/);
}
{
  const f = committed();
  f.fragment('level0', level0('API', 'Links', { when: 'never' }));
  verdict('step', f, 1, /step:first#1 changed since HEAD/);
}
{
  const f = committed();
  f.fragment('chapters', chapters([bullet('A link expires after 30 days.', { verified: { backend: 'a'.repeat(40) }, evidence: [{ path: 'app/y.rb', lines: '1', symbol: 'Y' }] })]));
  verdict('verified and evidence are not text', f, 0);
}
{
  const f = committed();
  f.fragment('extra', { sections: [{ id: 's1', bullets: [{ id: 'b9', text: 'New fact.', evidence: ev }] }] });
  verdict('untracked fragment', f, 0);
}
{
  const f = committed((g) => g.fragment('corrections', { corrections: [corr] }));
  f.put('host', `${F}/corrections.json`, '{}\n');
  f.fragment('extra', { corrections: [corr] });
  f.fragment('chapters', chapters([bullet('A link expires after 60 days.')]));
  verdict('a correction moved to another fragment is still old', f, 1, /bullet:b1 changed since HEAD/);
}
{
  const f = committed();
  f.fragment('corrections', { corrections: [{ ...corr, reason: 'whim' }] });
  verdict('bad reason', f, 1, /value "whim" not in enum/);
}
// A git failure reading the HEAD fragments is an error, never an empty HEAD model that lets every change through (A8).
{
  const f = committed();
  f.fragment('chapters', chapters([bullet('A link expires after 60 days.')]));
  const real = (process.env.PATH ?? '').split(path.delimiter).map((d) => path.join(d, 'git')).find((p) => fs.existsSync(p));
  assert.ok(real);
  const shim = path.join(f.base, 'shim');
  fs.mkdirSync(shim);
  // Only the HEAD fragment listing fails: `ls-tree --name-only HEAD <dir>/`.
  fs.writeFileSync(path.join(shim, 'git'), `#!/bin/sh\ncase "$1 $2" in "ls-tree --name-only") echo "fatal: boom" >&2; exit 128;; esac\nexec ${real} "$@"\n`, { mode: 0o755 });
  const r = f.run(['check'], { PATH: `${shim}${path.delimiter}${process.env.PATH ?? ''}` });
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.split('\n').includes('system-flow: check: cannot read the model at HEAD: fatal: boom'), r.stderr);
}
process.stdout.write('system-flow-corrections.test.js: OK\n');
