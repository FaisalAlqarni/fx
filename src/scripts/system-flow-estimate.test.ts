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

// two areas, cost from filesToRead; the controller per area and per area squared; archify per figure page, run one at a time.
// By hand: A 10 * 38,400 + 3 * 70,200 = 594,600; B 768,000 + 140,400 = 908,400; controller 2 * 2,411,000 + 4 * 75,800 = 5,125,200.
// Minutes: 24.5 + 2 * 2.05 + (1.845 + 2.43) / 2 lanes + 5 pages * 0.2 = 31.7.
{
  const { r, out } = estimate({ areas: [area('A', 120, 10, 2, 2, 1, 0), area('B', 300, 20, 1, 1, 0, 1)], chapters: 4 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(out.areas, [{ id: 'A', tokens: 594600, minutes: 1.8 }, { id: 'B', tokens: 908400, minutes: 2.4 }]);
  assert.deepStrictEqual(out.total, { tokens: 6628200, minutes: 31.7, archifyMinutes: 1 });
  assert.strictEqual(out.constants.calibrated, true);
  assert.strictEqual(out.note, 'constants measured on 2026-10-29 from proof runs (a) and (b) of that day; both land within 1% of tokens and minutes, and a third repo may not');
  assert.deepStrictEqual(out.warnings, []);
}
// each ADR the rules pass reads adds 28,900 tokens
{
  const { out } = estimate({ areas: [area('A', 120, 10, 2, 2, 1, 0), area('B', 300, 20, 1, 1, 0, 1)], chapters: 4, adrs: 10 });
  assert.strictEqual(out.total.tokens, 6628200 + 289000);
}
// files does not drive cost, only the split warning
{
  const { out } = estimate({ areas: [area('A', 5000, 10, 2, 2, 1, 0)], chapters: 1 });
  assert.deepStrictEqual(out.areas, [{ id: 'A', tokens: 594600, minutes: 1.8 }]);
  assert.deepStrictEqual(out.warnings, ['area A has 5000 files; split it into sub-areas of at most 400']);
  assert.strictEqual(out.total.minutes, 29, 'one area runs alone: 24.5 + 2.05 + 1.845 + 0.6');
}
// parallel is capped by the area count and by 4
{
  const { out } = estimate({ areas: ['a', 'b', 'c', 'd', 'e', 'f'].map((i) => area(i, 10, 10, 1, 0, 0, 0)), chapters: 1 });
  assert.deepStrictEqual(out.areas[0], { id: 'a', tokens: 384000, minutes: 0.9 });
  assert.strictEqual(out.total.minutes, 38.2, '24.5 + 6 * 2.05 + 6 * 0.9 / 4');
}
// Proof run (a) of 2026-10-29, Shamel.Backend, its plan.json and its 15 ADRs: 16,744,779 tokens (controller and four
// area agents, deduplicated by request id) and 41.4 minutes from the first step's start to the last step's end, its
// archify builds included.
{
  const { out } = estimate({ areas: [area('mobile-api', 30, 22, 2, 4, 2, 0), area('conversations', 34, 24, 2, 3, 1, 0), area('shaheen', 32, 14, 3, 5, 1, 1), area('twk-framework', 88, 40, 2, 4, 1, 1)], chapters: 9, adrs: 15 });
  assert.ok(Math.abs(out.total.tokens / 16744779 - 1) <= 0.02, `tokens ${out.total.tokens}`);
  assert.ok(Math.abs(out.total.minutes / 41.4 - 1) <= 0.02, `minutes ${out.total.minutes}`);
}
// Proof run (b) of 2026-10-29, four Advantage roots, its plan.json (13 areas, 630 files to read, 80 figures) and 66 ADRs:
// 75,867,997 tokens (controller 44,158,295, 13 area agents 29,804,697, rules agent 1,905,005) and 87.7 minutes from the
// step stamps, archify included.
{
  const plan = [['core-platform', 70, 9], ['core-billing', 50, 8], ['core-ui', 25, 1], ['engagement-runtime', 90, 13], ['engagement-data', 70, 10], ['engagement-studio', 45, 5], ['shortlink', 80, 10], ['measurement', 55, 7], ['survey', 40, 5], ['platform', 45, 4], ['android-sdk', 30, 5], ['store-app', 15, 2], ['guide', 15, 1]] as const;
  const { out } = estimate({ areas: plan.map(([id, read, figs]) => area(id, read, read, 2, figs, 0, 0)), chapters: 19, adrs: 66 });
  assert.ok(Math.abs(out.total.tokens / 75867997 - 1) <= 0.02, `tokens ${out.total.tokens}`);
  assert.ok(Math.abs(out.total.minutes / 87.7 - 1) <= 0.02, `minutes ${out.total.minutes}`);
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

// depth in build; goodSet() holds sequence turn, so the engine's is trip.
const engine = {
  schemaVersion: 2,
  levels: {
    root: 'system',
    diagrams: [
      {
        id: 'engine', level: 1, parent: 'system', title: 'Engine', summary: 'The engine runs its parts and calls one outside.', groups: [],
        nodes: [
          { id: 'a1', label: 'A1', kind: 'backend', look: 'service', role: 'r', children: 'engine-jobs', evidence: ev('app/x.rb', '1-4', 'Link') },
          { id: 'a2', label: 'A2', kind: 'backend', look: 'service', role: 'r', evidence: ev('app/x.rb', '1-4', 'Link') },
          { id: 'a3', label: 'A3', kind: 'backend', look: 'service', role: 'r', evidence: ev('app/x.rb', '1-4', 'Link') },
          { id: 'ctx', label: 'Ctx', kind: 'external', look: 'service', role: 'r', primary: false, evidence: ev('app/x.rb', '1-4', 'Link') },
        ],
        edges: [{ from: 'a1', to: 'a2', label: 'e', evidence: ev('app/x.rb', '1-4', 'Link') }, { from: 'a2', to: 'a3', label: 'e', evidence: ev('app/x.rb', '1-4', 'Link') }, { from: 'a3', to: 'ctx', label: 'e', evidence: ev('app/x.rb', '1-4', 'Link') }],
      },
      {
        id: 'engine-jobs', level: 2, parent: 'engine', title: 'Jobs', summary: 'The jobs run one after the other.', groups: [],
        nodes: [{ id: 'j1', label: 'J1', kind: 'job', look: 'service', role: 'r', evidence: ev('app/x.rb', '1-4', 'Link') }, { id: 'j2', label: 'J2', kind: 'job', look: 'service', role: 'r', evidence: ev('app/x.rb', '1-4', 'Link') }],
        edges: [{ from: 'j1', to: 'j2', label: 'e', evidence: ev('app/x.rb', '1-4', 'Link') }],
      },
    ],
  },
  sequences: [{
    id: 'trip', title: 'Trip', chapter: 's1', summary: 'The first part calls the second four times.',
    participants: [{ id: 'p1', label: 'P1', look: 'service', evidence: ev('app/x.rb', '1-4', 'Link') }, { id: 'p2', label: 'P2', look: 'service', evidence: ev('app/x.rb', '1-4', 'Link') }],
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
  // goodSet(): five chapters; 53 path entries over app/x.rb, app/y.rb and the code map folder app/; the engine adds 16.
  assert.strictEqual(t.chapters, 5);
  assert.strictEqual(t.filesCited, 3);
  assert.strictEqual(t.evidence, 69);
}
{
  const out = built(null);
  assert.deepStrictEqual(out.depth.areas, []);
  assert.strictEqual(out.depth.total.diagrams, 3);
}
console.log('system-flow-estimate.test.js: OK');
