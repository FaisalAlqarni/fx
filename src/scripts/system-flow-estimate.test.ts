// Run: node scripts/system-flow-estimate.test.js
// system-flow estimate and the depth block of build, run as processes.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Obj = Record<string, any>; // ts-gate-ok: parsed CLI output in a test
const area = (id: string, files: number, filesToRead: number, levels: number, diagrams: number, sequences: number, storeFlows: number) => ({ id, root: 'backend', files, filesToRead, levels, diagrams, sequences, storeFlows });
const ev = (p: string, lines: string, symbol: string) => [{ path: p, lines, symbol }];
const PLAN = 'plan.json';

function estimate(plan: unknown) {
  const f = sfFixture();
  f.put('host', PLAN, JSON.stringify(plan));
  const r = f.run(['estimate', path.join(f.host, PLAN)]);
  return { f, r, out: r.status === 0 ? (parseJson(r.stdout) as Obj) : {} };
}

// two areas, cost from filesToRead; the controller per area; archify per figure page, run one at a time
{
  const { r, out } = estimate({ areas: [area('A', 120, 10, 2, 2, 1, 0), area('B', 300, 20, 1, 1, 0, 1)], chapters: 4 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(out.areas, [{ id: 'A', tokens: 649000, minutes: 4.1 }, { id: 'B', tokens: 926000, minutes: 5.4 }]);
  assert.deepStrictEqual(out.total, { tokens: 5775000, minutes: 15.2, archifyMinutes: 1 });
  assert.strictEqual(out.constants.calibrated, true);
  assert.strictEqual(out.note, 'constants measured on 2026-10-28 from proof runs (a) and (b); the split between per-file and per-figure cost is unproven');
  assert.deepStrictEqual(out.warnings, []);
}
// files does not drive cost, only the split warning
{
  const { out } = estimate({ areas: [area('A', 5000, 10, 2, 2, 1, 0)], chapters: 1 });
  assert.deepStrictEqual(out.areas, [{ id: 'A', tokens: 649000, minutes: 4.1 }]);
  assert.deepStrictEqual(out.warnings, ['area A has 5000 files; split it into sub-areas of at most 400']);
  assert.strictEqual(out.total.minutes, 14.1, 'one area runs alone');
}
// parallel is capped by the area count and by 4
{
  const { out } = estimate({ areas: ['a', 'b', 'c', 'd', 'e', 'f'].map((i) => area(i, 10, 10, 1, 0, 0, 0)), chapters: 1 });
  assert.deepStrictEqual(out.areas[0], { id: 'a', tokens: 370000, minutes: 2 });
  assert.strictEqual(out.total.minutes, 12.4);
}
// Both proof runs reproduce within 12% of tokens and 10% of the lane's wall clock (archify minutes apart: the lane
// runs measured almost no archify time). Run (a), Shamel.Backend: 12,813,063 tokens, 20.3 minutes.
{
  const { out } = estimate({ areas: [area('mobile-api', 30, 20, 2, 4, 3, 0), area('core', 66, 28, 3, 5, 2, 1), area('twk-framework', 88, 35, 2, 5, 1, 3)], chapters: 9 });
  assert.ok(Math.abs(out.total.tokens / 12813063 - 1) <= 0.12, `tokens ${out.total.tokens}`);
  assert.ok(Math.abs((out.total.minutes - out.total.archifyMinutes) / (1217 / 60) - 1) <= 0.1, `minutes ${out.total.minutes}`);
}
// Run (b), four Advantage roots: 12 areas, 617 files to read, 77 figures; 49,415,523 tokens, 52.7 minutes.
{
  const areas = Array.from({ length: 12 }, (_, i) => area(`a${i}`, 100, i === 11 ? 56 : 51, 2, i === 11 ? 11 : 6, 0, 0));
  const { out } = estimate({ areas, chapters: 12 });
  assert.ok(Math.abs(out.total.tokens / 49415523 - 1) <= 0.12, `tokens ${out.total.tokens}`);
  assert.ok(Math.abs((out.total.minutes - out.total.archifyMinutes) / 52.7 - 1) <= 0.1, `minutes ${out.total.minutes}`);
}
// malformed and missing
{
  const { f, r } = estimate({ areas: [{ id: 'A', root: 'backend', files: 1, levels: 1, diagrams: 0, sequences: 0, storeFlows: 0 }], chapters: 1 });
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr, `${path.join(f.host, PLAN)}:/areas/0: required property filesToRead missing\n`);
}
{
  const f = sfFixture();
  const r = f.run(['estimate', path.join(f.host, 'nope.json')]);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr, `system-flow: estimate: cannot read ${path.join(f.host, 'nope.json')}\n`);
}

// depth in build
const engine = {
  schemaVersion: 1,
  levels: {
    root: 'system',
    diagrams: [
      {
        id: 'engine', level: 1, parent: 'system', title: 'Engine', summary: 's', groups: [],
        nodes: [
          { id: 'a1', label: 'A1', kind: 'backend', role: 'r', children: 'engine-jobs', evidence: ev('app/x.rb', '1-4', 'Link') },
          { id: 'a2', label: 'A2', kind: 'backend', role: 'r', evidence: ev('app/x.rb', '1-4', 'Link') },
          { id: 'a3', label: 'A3', kind: 'backend', role: 'r', evidence: ev('app/x.rb', '1-4', 'Link') },
          { id: 'ctx', label: 'Ctx', kind: 'external', role: 'r', primary: false, evidence: ev('app/x.rb', '1-4', 'Link') },
        ],
        edges: [{ from: 'a1', to: 'a2', label: 'e', evidence: ev('app/x.rb', '1-4', 'Link') }, { from: 'a2', to: 'a3', label: 'e', evidence: ev('app/x.rb', '1-4', 'Link') }, { from: 'a3', to: 'ctx', label: 'e', evidence: ev('app/x.rb', '1-4', 'Link') }],
      },
      {
        id: 'engine-jobs', level: 2, parent: 'engine', title: 'Jobs', summary: 's', groups: [],
        nodes: [{ id: 'j1', label: 'J1', kind: 'job', role: 'r', evidence: ev('app/x.rb', '1-4', 'Link') }, { id: 'j2', label: 'J2', kind: 'job', role: 'r', evidence: ev('app/x.rb', '1-4', 'Link') }],
        edges: [{ from: 'j1', to: 'j2', label: 'e', evidence: ev('app/x.rb', '1-4', 'Link') }],
      },
    ],
  },
  sequences: [{
    id: 'turn', title: 'Turn', chapter: 's1',
    participants: [{ id: 'p1', label: 'P1', evidence: ev('app/x.rb', '1-4', 'Link') }, { id: 'p2', label: 'P2', evidence: ev('app/x.rb', '1-4', 'Link') }],
    messages: [1, 2, 3, 4].map((n) => ({ n, from: 'p1', to: 'p2', label: 'm', evidence: ev('app/x.rb', '1-4', 'Link') })),
  }],
};
function built(planAreas: unknown[] | null) {
  const f = sfFixture();
  f.goodSet();
  // link opens the engine diagram
  const l0 = parseJson(fs.readFileSync(path.join(f.host, 'docs/system-flow/model/fragments/level0.json'), 'utf8')) as Obj;
  l0.levels.diagrams[0].nodes[0].children = 'engine';
  f.fragment('level0', l0);
  f.fragment('engine', engine);
  if (planAreas) f.put('host', 'docs/system-flow/model/plan.json', JSON.stringify({ areas: planAreas, chapters: 1 }));
  f.commit('host', 'model');
  const r = f.run(['build']);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  return parseJson(r.stdout) as Obj;
}
{
  const out = built([area('engine', 3, 3, 2, 2, 1, 0), area('ghost', 1, 1, 1, 0, 0, 0)]);
  assert.deepStrictEqual(out.depth.areas[0], {
    id: 'engine', planned: { levels: 2, diagrams: 2, sequences: 1, storeFlows: 0 },
    built: { levels: 2, diagramsPerLevel: [0, 1, 1, 0], diagrams: 2, primaryNodes: 5, contextNodes: 1, edges: 4, sequences: 1, messages: 4, storeRows: 0, flows: 0, chapters: 0, evidence: 16, filesCited: 1 },
  });
  const zero = { levels: 0, diagramsPerLevel: [0, 0, 0, 0], diagrams: 0, primaryNodes: 0, contextNodes: 0, edges: 0, sequences: 0, messages: 0, storeRows: 0, flows: 0, chapters: 0, evidence: 0, filesCited: 0 };
  assert.deepStrictEqual(out.depth.areas[1].built, zero, 'planned area without a fragment');
  const t = out.depth.total;
  assert.strictEqual(t.levels, 3);
  assert.deepStrictEqual(t.diagramsPerLevel, [1, 1, 1, 0]);
  assert.strictEqual(t.chapters, 1);
  assert.strictEqual(t.filesCited, 2);
  assert.strictEqual(t.evidence, 20);
}
{
  const out = built(null);
  assert.deepStrictEqual(out.depth.areas, []);
  assert.strictEqual(out.depth.total.diagrams, 3);
}
console.log('system-flow-estimate.test.js: OK');
