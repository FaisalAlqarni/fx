// Run: node docs/plans/2026-10-29-system-flow-site/proof/compare.js <owner.json> <a.json> [<b.json>]
// Reads the files page-check.js --measure writes and prints the design's Proof table as Markdown:
// one row per measure, a column for the owner's page and for each new site, and a Pass cell per new site.
import * as fs from 'fs';
import { parseJson } from '../../../../lib/json.js';

type Done = { pass: boolean; detail: string };
type Check = Done | null;
type Measure = {
  chapters: number; proseWordsAvg: number; chaptersWithLeadAndBullets: number; glossary: number | null; lifelines: number; sequences: number;
  menu: { sticky: Check; widthPx: number | null; groups: number | null; current: Check; phoneBar: Check };
  filter: Record<string, Check> | null; cards: Record<string, Check | number>; autoplay: Record<string, Check>;
  labelsMinPx: number | null; pageScrollAt390: boolean; consoleErrors: number; player: Record<string, Check>;
};
type Row = { name: string; line: string; show: (m: Measure) => string; pass: (m: Measure) => boolean };

const files = process.argv.slice(2);
if (files.length < 2 || files.length > 3) {
  process.stderr.write('usage: compare.js <owner.json> <a.json> [<b.json>]\n');
  process.exit(2);
}
const [owner, ...sites] = files.map((f) => parseJson(fs.readFileSync(f, 'utf8')) as Measure);

// The checks a page has a control for: a null entry is "not defined here" and a number (the figure count) is not a check.
const defined = (o: Record<string, Check | number>): Done[] => Object.values(o).filter((c): c is Done => typeof c === 'object' && c !== null);
const all = (o: Record<string, Check> | null): boolean => o !== null && defined(o).length > 0 && defined(o).every((c) => c.pass);
const count = (o: Record<string, Check> | null): string => o === null ? '-' : `${defined(o).filter((c) => c.pass).length} of ${defined(o).length}`;
const rows: Row[] = [
  { name: 'Reading prose per chapter (words)', line: 'average at least 120', show: (m) => String(m.proseWordsAvg), pass: (m) => m.proseWordsAvg >= 120 },
  { name: 'Chapters with a lead and 4 to 8 bullets', line: 'every chapter', show: (m) => `${m.chaptersWithLeadAndBullets} of ${m.chapters}`, pass: (m) => m.chaptersWithLeadAndBullets === m.chapters },
  { name: 'Glossary size', line: '15 to 40', show: (m) => m.glossary === null ? '-' : String(m.glossary), pass: (m) => m.glossary !== null && m.glossary >= 15 && m.glossary <= 40 },
  { name: 'Sequences drawn inline as lifelines', line: 'every sequence', show: (m) => `${m.lifelines} of ${m.sequences}`, pass: (m) => m.lifelines === m.sequences },
  { name: 'Side menu', line: 'sticky, 230 to 250 px, three groups, current marked, top bar opens and closes',
    show: (m) => `${m.menu.widthPx ?? '-'} px, ${m.menu.groups ?? '-'} groups, sticky ${m.menu.sticky?.pass ?? '-'}, current ${m.menu.current?.pass ?? '-'}, bar ${m.menu.phoneBar?.pass ?? '-'}`,
    pass: (m) => m.menu.sticky?.pass === true && m.menu.widthPx !== null && m.menu.widthPx >= 230 && m.menu.widthPx <= 250 && m.menu.groups === 3 && m.menu.current?.pass === true && m.menu.phoneBar?.pass === true },
  { name: 'Filter', line: 'term, chapter and part narrow; clearing restores', show: (m) => count(m.filter), pass: (m) => all(m.filter) },
  { name: 'Cards', line: 'bar inside its card and in view with it', show: (m) => count(m.cards as Record<string, Check>), pass: (m) => (m.cards.barInCard as Check)?.pass === true && (m.cards.barInView as Check)?.pass === true },
  { name: 'Autoplay', line: 'step 1 within 3 s at both widths; pauses when away', show: (m) => count(m.autoplay), pass: (m) => m.autoplay.within3s?.pass === true && m.autoplay.pauses?.pass === true },
  { name: 'Labels (smallest figure text, px)', line: '12 or more', show: (m) => String(m.labelsMinPx ?? '-'), pass: (m) => m.labelsMinPx !== null && m.labelsMinPx >= 12 },
  { name: 'Page width', line: 'no sideways scroll at 390', show: (m) => m.pageScrollAt390 ? 'scrolls' : 'fits', pass: (m) => !m.pageScrollAt390 },
  { name: 'Console errors', line: '0', show: (m) => String(m.consoleErrors), pass: (m) => m.consoleErrors === 0 },
  { name: 'Player checks', line: 'every bar check passes', show: (m) => count(m.player), pass: (m) => all(m.player) },
];

const head = ['Measure', 'Pass line', 'Owner', ...sites.flatMap((_, i) => [`Site ${'AB'[i]}`, `Pass ${'AB'[i]}`])];
const lines = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
for (const r of rows) lines.push(`| ${[r.name, r.line, r.show(owner as Measure), ...sites.flatMap((s) => [r.show(s), r.pass(s) ? 'yes' : 'no'])].join(' | ')} |`);
console.log(lines.join('\n'));
