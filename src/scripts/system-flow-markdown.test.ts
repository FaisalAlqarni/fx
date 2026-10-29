// Run: node scripts/system-flow-markdown.test.js
// system-flow build: the Markdown carries leads, Start here docs, the code map, captions and glossary.md; run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseDoc } from '../lib/doc-evidence.js';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Obj = Record<string, any>; // ts-gate-ok: fragments are edited by key in the tests
const GEN = '<!-- fx-system-flow generated: edit the model, then rebuild -->';
const F = 'docs/system-flow/model/fragments';

const built = (change: (f: Fx) => void = () => undefined): Fx => {
  const f = sfFixture();
  f.goodSet();
  change(f);
  const r = f.run(['build']);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  return f;
};
const read = (f: Fx, rel: string): string => fs.readFileSync(path.join(f.host, 'docs/system', rel), 'utf8');
const lines = (f: Fx, rel: string): string[] => read(f, rel).split('\n');
const model = (f: Fx): Obj => parseJson(fs.readFileSync(path.join(f.host, 'docs/system-flow/model/system-model.json'), 'utf8')) as Obj;

const f = built();

// Paths: the Start here docs, a chapter doc and the glossary, each with the generated marker.
for (const rel of ['start-here/index.md', 'start-here/start-what.md', 'start-here/start-parts.md', 'start-here/start-request.md', 'start-here/start-code.md', 's1.md', 'glossary.md']) {
  assert.ok(read(f, rel).includes(GEN), `${rel} is written with the marker`);
}

// The root index links the Start here index and the glossary, and both targets exist.
{
  const targets = [...read(f, 'index.md').matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1] as string);
  for (const t of ['start-here/index.md', 'glossary.md']) {
    assert.ok(targets.includes(t), `index.md links ${t}\n${targets.join('\n')}`);
    assert.ok(fs.existsSync(path.join(f.host, 'docs/system', t)), `${t} is written`);
  }
}

// Lead: the paragraph after the question.
{
  const l = lines(f, 's1.md');
  const q = l.indexOf('Where do links expire?');
  assert.ok(q > 0, 'the question is there');
  const lead = (model(f).sections as Obj[]).find((s) => s.id === 's1')?.lead as string;
  assert.strictEqual(l[q + 1], '');
  assert.strictEqual(l[q + 2], lead);
}

// Not owned: a heading, then 2 list items each with an evidence line.
{
  const l = lines(f, 'start-here/start-what.md');
  const h = l.indexOf('## Not owned here');
  assert.ok(h > 0, 'the heading is there');
  const rest = l.slice(h + 1, l.findIndex((x, i) => i > h && x.startsWith('[')));
  assert.strictEqual(rest.filter((x) => x.startsWith('- ')).length, 2);
  assert.strictEqual(rest.filter((x) => x.startsWith('  Evidence: ')).length, 2);
}

// Code doc: the stores overview and the code map.
{
  const l = lines(f, 'start-here/start-code.md');
  assert.ok(l.includes('| Store kind | Rows | Shown in |'), 'stores overview header');
  assert.ok(l.some((x) => x.startsWith('| sql | 1 |')), 'one sql row');
  assert.ok(!l.some((x) => /^\| (cache|memory|files|client) \| 0 \|/.test(x)), `no row for an empty store kind, as on the page\n${l.join('\n')}`);
  assert.ok(l.includes('- Store keys read table:column.'), 'the conventions note');
  assert.ok(l.includes('| Folder | What it owns | Start reading at |'), 'code map header');
  assert.ok(l.includes('| app/ | The application code. | `app/x.rb:1-4` `Link` |'), l.join('\n'));
}

// A chapter's sequences are the ones it lists and the ones that name it, as on the page (final review, unprimed 7).
{
  const g = built((x) => {
    const file = path.join(x.host, F, 'chapters.json');
    const ch = parseJson(fs.readFileSync(file, 'utf8')) as Obj;
    ((ch.sections as Obj[]).find((sec) => sec.id === 's1') as Obj).sequences = ['turn'];
    fs.writeFileSync(file, JSON.stringify(ch));
  });
  const l = lines(g, 's1.md');
  assert.ok(l.includes('## Sequences') && l.some((x) => x.includes('A visit')), l.join('\n'));
}

// Captions: the sequence summary in italics, right before its Mermaid fence.
{
  const l = lines(f, 'start-here/start-request.md');
  const summary = (model(f).sequences as Obj[]).find((q) => q.id === 'turn')?.summary as string;
  const fence = l.indexOf('```mermaid');
  assert.ok(fence > 0, 'a Mermaid block');
  assert.strictEqual(l[fence - 1], `_${summary}_`);
}

// Glossary: 15 rows sorted by term, each with an evidence line; a pipe in a term is escaped.
{
  const g = built((x) => {
    const o = parseJson(fs.readFileSync(path.join(x.host, F, 'glossary.json'), 'utf8')) as Obj;
    o.glossary[2].term = 'a|b';
    x.fragment('glossary', o);
  });
  const l = lines(g, 'glossary.md');
  assert.strictEqual(l[0], '# Glossary');
  const rows = l.filter((x) => x.startsWith('| ')).slice(2); // header and separator
  assert.strictEqual(rows.length, 15, rows.join('\n'));
  const terms = rows.map((r) => /^\| ((?:\\\||[^|])*) \|/.exec(r)?.[1] as string);
  const sorted = [...terms].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  assert.deepStrictEqual(terms, sorted);
  assert.ok(terms.includes('a\\|b'), terms.join(','));
  assert.ok(rows.every((r) => r.includes('Evidence') === false && /`[^`]+`/.test(r)), 'each row holds its evidence');
  assert.strictEqual(l.filter((x) => x.startsWith('  Evidence: ')).length, 15);
}

// Parsed back: parseDoc reads the model's evidence for the chapter, the not-owned list and the glossary.
{
  const m = model(f);
  const count = (items: Obj[]): number => items.filter((i) => (i.evidence ?? []).length > 0).length;
  const sec = (id: string): Obj => (m.sections as Obj[]).find((s) => s.id === id) as Obj;
  const expect: Record<string, number> = {
    's1.md': count(sec('s1').bullets),
    'start-here/start-what.md': count(sec('start-what').bullets) + count(sec('start-what').notOwned),
    'glossary.md': count(m.glossary),
  };
  for (const [rel, n] of Object.entries(expect)) {
    const p = parseDoc(rel, read(f, rel));
    assert.deepStrictEqual(p.problems, [], `${rel} parses clean`);
    assert.strictEqual(p.claims.length, n, `${rel} evidence claims`);
    assert.ok(p.claims.every((c) => c.evidence.length > 0));
  }
}

// A hand-written glossary.md is left alone and the build fails with the collision message.
{
  const x = sfFixture();
  x.goodSet();
  x.put('host', 'docs/system/glossary.md', '# Mine\n');
  x.commit('host', 'hand written');
  const r = x.run(['build']);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.strictEqual(r.stderr, 'system-flow: build: docs/system/glossary.md exists without the generated marker; move it, or set system_flow.output.markdown, then rebuild\n');
  assert.strictEqual(read(x, 'glossary.md'), '# Mine\n');
}

console.log('system-flow-markdown.test.js: OK');
