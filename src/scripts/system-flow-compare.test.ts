// Run: node scripts/system-flow-compare.test.js
// proof/compare.js, run as a process: one Markdown row per measure, a Pass cell per new site.
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

type Obj = Record<string, any>; // ts-gate-ok: measure JSON built by hand in a test
const ok = { pass: true, detail: 'fine' };
const no = { pass: false, detail: 'broken' };
const site = (over: Obj = {}): Obj => ({
  chapters: 5, proseWordsAvg: 130, proseWords: [], chaptersWithLeadAndBullets: 5, glossary: 15, lifelines: 2, sequences: 2,
  menu: { sticky: ok, widthPx: 240, groups: 3, current: ok, phoneBar: ok },
  filter: { term: ok, chapter: ok, part: ok, none: ok, clear: ok },
  cards: { barInCard: ok, barInView: ok },
  autoplay: { within3s: ok, pauses: ok, resumes: ok, reducedMotion: ok },
  labelsMinPx: 13, pageScrollAt390: false, consoleErrors: 0, player: { reset: ok, playPause: ok }, ...over,
});
const owner = site({ proseWordsAvg: 122, chaptersWithLeadAndBullets: 0, glossary: null, lifelines: 0, sequences: 13, menu: { sticky: ok, widthPx: 230, groups: 0, current: ok, phoneBar: null }, filter: null });

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-compare-'));
const put = (name: string, o: Obj): string => { const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify(o)); return p; };
const compare = path.join(__dirname, '..', 'docs', 'plans', '2026-10-29-system-flow-site', 'proof', 'compare.js');
const run = (...files: string[]) => spawnSync(process.execPath, [compare, ...files], { encoding: 'utf8' });
const row = (out: string, measure: string): string[] => {
  const line = out.split('\n').find((l) => l.startsWith(`| ${measure}`));
  assert.ok(line, `no row for ${measure} in:\n${out}`);
  return line.split('|').slice(1, -1).map((c) => c.trim());
};

{
  const r = run(put('o.json', owner), put('a.json', site()));
  assert.strictEqual(r.status, 0, r.stderr);
  assert.ok(r.stdout.startsWith('| Measure |'), r.stdout);
  const prose = row(r.stdout, 'Reading prose');
  assert.deepStrictEqual([prose[2], prose[3], prose[4]], ['122', '130', 'yes'], 'owner value, site value, pass');
  assert.strictEqual(row(r.stdout, 'Glossary size')[2], '-', 'a measure the owner page lacks prints a dash');
  for (const m of ['Chapters with', 'Glossary', 'Sequences', 'Side menu', 'Filter', 'Cards', 'Autoplay', 'Labels', 'Page width', 'Console', 'Player']) {
    assert.strictEqual(row(r.stdout, m).at(-1), 'yes', `${m} passes on the good site`);
  }
}
{
  const bad = site({ proseWordsAvg: 119.9, chaptersWithLeadAndBullets: 4, glossary: 41, lifelines: 1, labelsMinPx: 11.5, pageScrollAt390: true, consoleErrors: 1,
    menu: { sticky: ok, widthPx: 260, groups: 3, current: ok, phoneBar: ok }, filter: { term: no, chapter: ok, part: ok, none: ok, clear: ok },
    cards: { barInCard: ok, barInView: no }, autoplay: { within3s: no, pauses: ok, resumes: ok, reducedMotion: ok }, player: { reset: ok, playPause: no } });
  const r = run(put('o.json', owner), put('a.json', site()), put('b.json', bad));
  assert.strictEqual(r.status, 0, r.stderr);
  const cols = row(r.stdout, 'Reading prose');
  assert.deepStrictEqual([cols[4], cols[6]], ['yes', 'no'], 'one Pass cell per new site');
  for (const m of ['Reading prose', 'Chapters with', 'Glossary', 'Sequences', 'Side menu', 'Filter', 'Cards', 'Autoplay', 'Labels', 'Page width', 'Console', 'Player']) {
    assert.strictEqual(row(r.stdout, m).at(-1), 'no', `${m} fails on the bad site`);
  }
}
{
  assert.strictEqual(run().status, 2, 'no files is a usage error');
}
console.log('system-flow-compare.test.js: OK');
