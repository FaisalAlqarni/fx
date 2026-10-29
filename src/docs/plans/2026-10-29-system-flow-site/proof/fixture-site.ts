// Run: node docs/plans/2026-10-29-system-flow-site/proof/fixture-site.js
// Builds the fixture model that meets the prose floor (goodSet) with --prefer cheap, under os.tmpdir(),
// and prints the site folder for page-check.js. An area fragment adds a 6-participant sequence `wide`
// (wider than a phone, so it scrolls sideways), a level diagram `tall` (taller than a 600 px window) and a level diagram `flat`
// (a hub that fans out to two boxes side by side, wider than a phone, so a box figure scrolls sideways too: its last step ends at the far box). Arabic runs sit in
// the mailer's label, the last message and the last tall node, for the lang and dir check.
import * as fs from 'fs';
import * as path from 'path';
import { sfFixture } from '../../../../tests/helpers/sf-fixture.js';

const f = sfFixture();
f.fxJson({});
f.goodSet();
const evidence = [{ path: 'app/x.rb', lines: '1-4', symbol: 'Link#expired?' }];
const lanes = ['client', 'edge', 'api', 'queue', 'worker', 'mail'];
const tall = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'];
const flat = { f1: [0, 0], f2: [0, 1], f3: [0, 2], f4: [1, 2] };
f.fragment('proof', {
  sequences: [{
    id: 'wide', title: 'A wide hand-off', chapter: 's1', summary: 'The request passes through six parts from the client to the mailer.',
    participants: lanes.map((id) => ({ id, label: id === 'mail' ? 'Part mail البريد' : `Part ${id}`, look: id === 'mail' ? 'external' : 'service', evidence })),
    messages: lanes.slice(1).map((to, i) => ({ n: i + 1, from: lanes[i], to, label: to === 'mail' ? 'Sends رسالة جديدة to mail.' : `Hands the request to ${to}.`, evidence })),
  }],
  levels: { diagrams: [{
    id: 'tall', level: 1, parent: 'system', title: 'A tall chain', summary: 'Seven parts pass a job down one column from the first to the last.', groups: [],
    nodes: tall.map((id) => ({ id, label: id === 't7' ? 'Step t7 الأخير' : `Step ${id}`, kind: 'backend', look: 'service', role: 'Passes the job on', evidence })),
    edges: tall.slice(1).map((to, i) => ({ from: tall[i], to, label: 'passes', evidence })),
    layout: Object.fromEntries(tall.map((id, row) => [id, { col: 0, row }])),
  }, {
    id: 'flat', level: 1, parent: 'system', title: 'A fan-out', summary: 'One part hands a job to two parts that sit side by side below it.', groups: [],
    nodes: Object.keys(flat).map((id) => ({ id, label: `Step ${id}`, kind: 'backend', look: 'service', role: 'Passes the job on', evidence })),
    edges: [['f1', 'f2'], ['f2', 'f3'], ['f2', 'f4']].map(([from, to]) => ({ from, to, label: 'passes', evidence })),
    layout: Object.fromEntries(Object.entries(flat).map(([id, [col, row]]) => [id, { col, row }])),
  }] },
});
// The tall and flat diagrams are drawn in s1.
const file = path.join(f.host, 'docs/system-flow/model/fragments/chapters.json');
const chapters = JSON.parse(fs.readFileSync(file, 'utf8')) as { sections: { id: string; diagrams?: string[] }[] }; // ts-gate-ok: the fixture's own fragment
for (const s of chapters.sections) if (s.id === 's1') s.diagrams = [...(s.diagrams ?? []), 'tall', 'flat'];
f.fragment('chapters', chapters);
const r = f.run(['build', '--prefer', 'cheap']);
if (r.status !== 0) {
  process.stderr.write(`fixture-site: build exited ${r.status}\n${r.stdout}${r.stderr}`);
  process.exit(1);
}
console.log(path.join(f.host, 'docs', 'system-flow'));
