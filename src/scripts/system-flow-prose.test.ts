// Run: node scripts/system-flow-prose.test.js
// system-flow check and build: the prose floor, run as a process on goodSet() with one field changed.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { sentence, sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Obj = Record<string, any>; // ts-gate-ok: fragments are edited by key in the tests
const F = 'docs/system-flow/model/fragments';
const LINK = [{ path: 'app/x.rb', lines: '1-4', symbol: 'Link' }];
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const read = (f: Fx, name: string): Obj => parseJson(fs.readFileSync(path.join(f.host, F, `${name}.json`), 'utf8')) as Obj;
const edit = (f: Fx, name: string, change: (o: Obj) => void): void => { const o = read(f, name); change(o); f.fragment(name, o); };
const set = (change: (f: Fx) => void = () => undefined): Fx => { const f = sfFixture(); f.goodSet(); change(f); return f; };
const s1 = (change: (s: Obj) => void) => (f: Fx) => edit(f, 'chapters', (c) => change(c.sections[4]));
const bullets = (counts: number[], prefix = 'b') => counts.map((n, i) => ({ id: `${prefix}${i + 1}`, text: sentence(n), evidence: LINK }));
const warningsOf = (stdout: string): string[] => (parseJson(stdout) as { warnings: string[] }).warnings;

// The check exits 1 and stderr holds `<file>:<pointer>: <message>` for the stated fragment.
const fails = (why: string, change: (f: Fx) => void, file: string, pointer: string, message: string, args = ['check']): void => {
  const r = set(change).run(args);
  assert.strictEqual(r.status, 1, `${why}: exits 1\n${r.stdout}${r.stderr}`);
  const line = file === '' ? `system-flow: ${args[0]}: ${message}` : `${F}/${file}:${pointer}: ${message}`;
  assert.match(r.stderr, new RegExp(`^${esc(line)}$`, 'm'), `${why}\n${r.stderr}`);
};
const passes = (why: string, change: (f: Fx) => void): string[] => {
  const r = set(change).run(['check']);
  assert.strictEqual(r.status, 0, `${why}: exits 0\n${r.stdout}${r.stderr}`);
  return warningsOf(r.stdout);
};

// goodSet() meets the floor with no prose warning.
assert.deepStrictEqual(passes('the good set', () => undefined), []);

// Sentences, counted through a lead: each sample plus padding comes to 5, so a miscount shows as another number.
for (const [sample, pad] of [['A b. C d? E!', ' F. G.'], ['Use e.g. this. Then go.', ' A. B. C.'], ['Run `a. b` now. Done.', ' A. B. C.'], ['v1.2 is out. Yes.', ' A. B. C.'], ['See i.e. that. Fine.', ' A. B. C.']] as const) {
  fails(`sentences in "${sample}"`, s1((s) => { s.lead = `${sample}${pad}`; }), 'chapters.json', '/sections/4/lead', 'section s1: lead has 5 sentences; 2 to 4 required');
}

// Intro.
const intro = (n: number) => (f: Fx) => edit(f, 'meta', (m) => { m.meta.intro = Array.from({ length: n }, () => sentence(5)).join(' '); });
fails('a 1-sentence intro', intro(1), 'meta.json', '/meta/intro', 'meta.intro has 1 sentences; 2 to 5 required');
passes('a 2-sentence intro', intro(2));
passes('a 5-sentence intro', intro(5));
fails('a 6-sentence intro', intro(6), 'meta.json', '/meta/intro', 'meta.intro has 6 sentences; 2 to 5 required');
fails('no intro', (f) => edit(f, 'meta', (m) => { delete m.meta.intro; }), 'meta.json', '/meta', 'meta.intro missing');
fails('no name', (f) => edit(f, 'meta', (m) => { delete m.meta.name; }), 'meta.json', '/meta', 'meta.name missing');

// Lead.
const lead = (n: number, each: number) => s1((s) => { s.lead = Array.from({ length: n }, () => sentence(each)).join(' '); });
fails('a 1-sentence lead', lead(1, 40), 'chapters.json', '/sections/4/lead', 'section s1: lead has 1 sentences; 2 to 4 required');
passes('a 2-sentence lead', lead(2, 20));
passes('a 4-sentence lead', lead(4, 10));
fails('a 5-sentence lead', lead(5, 8), 'chapters.json', '/sections/4/lead', 'section s1: lead has 5 sentences; 2 to 4 required');
fails('no lead', s1((s) => { delete s.lead; }), 'chapters.json', '/sections/4', 'section s1: lead missing');

// Bullets.
fails('3 bullets', s1((s) => { s.bullets = bullets([20, 20, 20]); }), 'chapters.json', '/sections/4/bullets', 'section s1: 3 bullets; 4 to 8 required');
passes('4 bullets', s1((s) => { s.bullets = bullets([20, 20, 20, 20]); }));
passes('8 bullets', s1((s) => { s.bullets = bullets([20, 20, 20, 20, 20, 20, 20, 20]); }));
fails('9 bullets', s1((s) => { s.bullets = bullets([10, 10, 10, 10, 10, 10, 10, 10, 10]); }), 'chapters.json', '/sections/4/bullets', 'section s1: 9 bullets; 4 to 8 required');
passes('a 40-word bullet', s1((s) => { s.bullets = bullets([40, 20, 20, 20]); }));
fails('a 41-word bullet', s1((s) => { s.bullets = bullets([41, 20, 20, 20]); }), 'chapters.json', '/sections/4/bullets/0', 'bullet b1: 41 words; at most 40');

// Words: lead plus bullets plus not owned; goodSet() stays at 120 and these edit s1 after it.
const WORDS = 'words of lead, bullets and not owned';
fails('99 words', s1((s) => { s.bullets = bullets([15, 15, 15, 14]); }), 'chapters.json', '/sections/4/lead', `section s1: 99 ${WORDS}; at least 100 required`);
assert.deepStrictEqual(passes('100 words', s1((s) => { s.bullets = bullets([15, 15, 15, 15]); })),
  [`${F}/chapters.json:/sections/4/lead: section s1: 100 ${WORDS}; 120 to 200 expected`]);
assert.deepStrictEqual(passes('200 words', s1((s) => { s.bullets = bullets([40, 40, 40, 40]); })), []);
assert.deepStrictEqual(passes('201 words', s1((s) => { s.lead = `${sentence(20)} ${sentence(21)}`; s.bullets = bullets([40, 40, 40, 40]); })),
  [`${F}/chapters.json:/sections/4/lead: section s1: 201 ${WORDS}; 120 to 200 expected`]);

// Not owned, on the what section.
const notOwned = (n: number) => (f: Fx) => edit(f, 'chapters', (c) => { c.sections[0].notOwned = Array.from({ length: n }, (_, i) => ({ id: `not-${i + 1}`, text: sentence(10), evidence: LINK })); });
fails('1 notOwned bullet', notOwned(1), 'chapters.json', '/sections/0/notOwned', 'section start-what: 1 notOwned bullets; 2 to 6 required');
passes('2 notOwned bullets', notOwned(2));
passes('6 notOwned bullets', notOwned(6));
fails('7 notOwned bullets', notOwned(7), 'chapters.json', '/sections/0/notOwned', 'section start-what: 7 notOwned bullets; 2 to 6 required');

// Roles.
fails('no code section', (f) => edit(f, 'chapters', (c) => { c.sections.splice(3, 1); }), 'chapters.json', '/sections', 'Start here role code missing');
fails('parts and request swapped', (f) => edit(f, 'chapters', (c) => { [c.sections[1], c.sections[2]] = [c.sections[2], c.sections[1]]; }),
  'chapters.json', '/sections/1', 'section start-request has role request; the first four sections must be what, parts, request, code in that order');
fails('two request sections', s1((s) => { s.role = 'request'; s.sequences = ['turn']; }), 'chapters.json', '/sections/4', 'role request appears 2 times; exactly one required');

// Parts.
fails('parts without the level-0 diagram', (f) => edit(f, 'chapters', (c) => { c.sections[1].diagrams = []; }),
  'chapters.json', '/sections/1', 'section start-parts: diagrams must include the level-0 diagram system');

// Request: listed and named sequences both count, once each.
const other = (chapter: string) => ({ id: 'other', title: 'Other', chapter, summary: 'The client asks the service for a second time.', participants: [{ id: 'a', label: 'A', look: 'client', evidence: LINK }, { id: 'b', label: 'B', look: 'service', evidence: LINK }], messages: [{ n: 1, from: 'a', to: 'b', label: 'A asks B.', evidence: LINK }] });
fails('a second sequence naming the request chapter', (f) => edit(f, 'app', (a) => { a.sequences.push(other('start-request')); }),
  'chapters.json', '/sections/2', 'section start-request: 2 sequences; exactly one required');
fails('a second sequence listed by the request chapter', (f) => { edit(f, 'app', (a) => { a.sequences.push(other('s1')); }); edit(f, 'chapters', (c) => { c.sections[2].sequences = ['other']; }); },
  'chapters.json', '/sections/2', 'section start-request: 2 sequences; exactly one required');
passes('the request sequence both listed and named', (f) => edit(f, 'chapters', (c) => { c.sections[2].sequences = ['turn']; }));

// Code map: every root an item cites has an entry.
const guide = (f: Fx): void => {
  edit(f, 'meta', (m) => { m.meta.roots.push({ id: 'guide' }); });
  f.fxJson({ system_flow: { roots: { guide: '../guide' } } });
  edit(f, 'chapters', (c) => { c.sections[3].bullets[0].evidence = [{ root: 'guide', path: 'README.md', lines: '1', symbol: 'Guide' }]; });
};
fails('a cited root with no code map entry', guide, 'chapters.json', '/sections/3', 'section start-code: root guide has no code map entry; items cite it');
passes('a cited root with a code map entry', (f) => { guide(f); edit(f, 'app', (a) => { a.codeMap.push({ id: 'guide', root: 'guide', path: 'docs/', owns: 'The guide.', unconfirmed: true }); }); });

// Code map evidence: a folder entry and a file entry, the first file being where to start reading (final review F6).
const appMap = (evidence: Obj[]) => (f: Fx) => edit(f, 'app', (a) => { a.codeMap[0].evidence = evidence; });
fails('a code map entry with no folder entry', appMap(LINK), 'app.json', '/codeMap/0/evidence', 'code map entry app: evidence has no folder entry (a path ending in /)');
fails('a code map entry with no file entry', appMap([{ path: 'app/' }]), 'app.json', '/codeMap/0/evidence', 'code map entry app: evidence has no file entry; the first file entry is where to start reading');
passes('a code map entry with a folder entry and a file entry', appMap([...LINK, { path: 'app/' }]));
// A folder entry on any other item names every kind that may hold one (final review F12).
fails('a folder entry on a bullet', s1((s) => { s.bullets[0].evidence = [{ path: 'app/' }]; }), 'chapters.json', '/sections/4/bullets/0/evidence/0',
  'bullet b1: a folder entry is allowed only on catalogue, inventory and code map entries');

// Captions.
const summary = (text: string) => (f: Fx) => edit(f, 'app', (a) => { a.sequences[0].summary = text; });
fails('a 5-word summary', summary(sentence(5)), 'app.json', '/sequences/0/summary', 'sequence turn: summary has 5 words; 6 to 30 required');
passes('a 6-word summary', summary(sentence(6)));
passes('a 30-word summary', summary(sentence(30)));
fails('a 31-word summary', summary(sentence(31)), 'app.json', '/sequences/0/summary', 'sequence turn: summary has 31 words; 6 to 30 required');
fails('a 2-sentence summary', summary(`${sentence(6)} ${sentence(6)}`), 'app.json', '/sequences/0/summary', 'sequence turn: summary has 2 sentences; one required');
fails('a sequence with no summary', (f) => edit(f, 'app', (a) => { delete a.sequences[0].summary; }), 'app.json', '/sequences/0', 'sequence turn: summary missing');
fails('a diagram summary of 3 words', (f) => edit(f, 'level0', (l) => { l.levels.diagrams[0].summary = 'The whole system.'; }), 'level0.json', '/levels/diagrams/0/summary', 'diagram system: summary has 3 words; 6 to 30 required');
fails('a store flow with no summary', (f) => edit(f, 'app', (a) => { a.storeFlows = [{ id: 'save', trigger: 'A save', chapter: 's1', steps: [{ n: 1, actor: 'link', op: 'write', store: 'sql', evidence: LINK }] }]; }),
  'app.json', '/storeFlows/0', 'store flow save: summary missing');

// Participants.
const participants = (n: number) => (f: Fx) => edit(f, 'app', (a) => {
  for (let i = a.sequences[0].participants.length; i < n; i++) a.sequences[0].participants.push({ id: `p${i}`, label: `P${i}`, look: 'service', evidence: LINK });
});
passes('12 participants', participants(12));
fails('13 participants', participants(13), 'app.json', '/sequences/0', 'sequence turn: 13 participants; at most 12 (split it)');

// Glossary.
const terms = (n: number) => (f: Fx) => edit(f, 'glossary', (g) => {
  g.glossary = g.glossary.slice(0, n);
  for (let i = g.glossary.length; i < n; i++) g.glossary.push({ id: `t${i}`, term: `term ${i}`, tag: 'concept', meaning: 'A term.', evidence: LINK });
});
fails('14 terms', terms(14), 'glossary.json', '/glossary', 'glossary has 14 terms; 15 to 40 required');
passes('15 terms', terms(15));
passes('40 terms', terms(40));
fails('41 terms', terms(41), 'glossary.json', '/glossary', 'glossary has 41 terms; 15 to 40 required');
fails('alias link beside term Link', (f) => edit(f, 'glossary', (g) => { g.glossary[0].aliases = ['link']; }), 'glossary.json', '/glossary/0', 'term "link" is also used by term:link');

// --fragment: shape rules only, on what the fragment writes.
const area = (lead: string, counts: number[]) => (f: Fx): void => {
  edit(f, 'chapters', (c) => { c.sections.push({ id: 's2', title: 'More', question: 'What else?' }); });
  f.fragment('area', { sections: [{ id: 's2', lead, bullets: bullets(counts, 'a') }] });
};
const fragment = (why: string, lead: string, counts: number[], extra: (f: Fx) => void = () => undefined) => { const f = set((g) => { area(lead, counts)(g); extra(g); }); return { why, r: f.run(['check', '--fragment', `${F}/area.json`]) }; };
{
  const { why, r } = fragment('a 5-sentence lead in an area fragment', Array.from({ length: 5 }, () => sentence(8)).join(' '), [20, 20, 20, 20]);
  assert.strictEqual(r.status, 1, `${why}\n${r.stdout}${r.stderr}`);
  assert.match(r.stderr, new RegExp(`^${esc(`${F}/area.json:/sections/0/lead: section s2: lead has 5 sentences; 2 to 4 required`)}$`, 'm'), why);
}
{
  // No glossary.json in the folder and 2 bullets: both are whole-model rules, skipped.
  const { why, r } = fragment('an area fragment with no glossary', `${sentence(20)} ${sentence(20)}`, [20, 20],
    (f) => fs.renameSync(path.join(f.host, F, 'glossary.json'), path.join(f.base, 'glossary.json')));
  assert.strictEqual(r.status, 0, `${why}\n${r.stdout}${r.stderr}`);
  assert.deepStrictEqual(warningsOf(r.stdout), [], why);
}
{
  const { why, r } = fragment('a 9-bullet section in an area fragment', `${sentence(20)} ${sentence(20)}`, [10, 10, 10, 10, 10, 10, 10, 10, 10]);
  assert.strictEqual(r.status, 1, `${why}\n${r.stdout}${r.stderr}`);
  assert.match(r.stderr, new RegExp(`^${esc(`${F}/area.json:/sections/0/bullets: section s2: 9 bullets; 4 to 8 required`)}$`, 'm'), why);
}

// build refuses a model below the floor, as check does.
fails('build with no lead', s1((s) => { delete s.lead; }), 'chapters.json', '/sections/4', 'section s1: lead missing', ['build']);

// build reports the prose numbers.
{
  const f = set();
  f.commit('host', 'model');
  const r = f.run(['build']);
  assert.strictEqual(r.status, 0, `build exits 0\n${r.stdout}${r.stderr}`);
  const out = parseJson(r.stdout) as { prose: { chapters: Obj[]; averageWords: number; glossary: number; lifelines: number }; problems: { message: string }[] };
  assert.deepStrictEqual(out.prose.chapters.find((c) => c.id === 's1'), { id: 's1', words: 120, leadSentences: 2, bullets: 4 });
  assert.deepStrictEqual(out.prose.chapters.find((c) => c.id === 'start-what'), { id: 'start-what', words: 140, leadSentences: 2, bullets: 4 });
  assert.strictEqual(out.prose.chapters.length, 5);
  assert.strictEqual(out.prose.averageWords, 124);
  assert.strictEqual(out.prose.glossary, 15);
  // goodSet() holds one sequence, turn, drawn as lifelines.
  assert.strictEqual(out.prose.lifelines, 1);
  assert.deepStrictEqual(out.problems.filter((p) => p.message.includes(WORDS)), [], 'no prose warning');
}

// The dash ban still holds in a lead.
fails('an en dash in a lead', s1((s) => { s.lead = `${sentence(20)} One \u2013 two ${sentence(18)}`; }), 'chapters.json', '/sections/4/lead', 'em or en dash');

console.log('system-flow-prose.test.js: OK');
