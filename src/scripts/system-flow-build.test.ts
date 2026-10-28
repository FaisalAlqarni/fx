// Run: node scripts/system-flow-build.test.js
// system-flow build: Markdown, README, merged model and verified stamps, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseDoc } from '../lib/doc-evidence.js';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';

type Fx = ReturnType<typeof sfFixture>;
type Obj = Record<string, unknown>;
const F = 'docs/system-flow/model/fragments';
const GEN = '<!-- fx-system-flow generated: edit the model, then rebuild -->';
const ev = (p: string, lines: string, symbol: string, root?: string) => [{ ...(root === undefined ? {} : { root }), path: p, lines, symbol }];

type Tweak = { label?: string; api?: string; key?: string; bullet?: string; folder?: string };
function setup(t: Tweak = {}): Fx {
  const f = sfFixture();
  f.goodSet();
  f.fragment('meta', { schemaVersion: 1, meta: { roots: [{ id: 'backend' }, { id: 'guide' }] } });
  f.fxJson({ system_flow: { roots: { guide: '../guide' } } });
  f.fragment('chapters', {
    sections: [{
      id: 's1', title: 'Links', question: 'Where do links expire?', ...(t.folder === undefined ? {} : { folder: t.folder }),
      bullets: [
        { id: 'b1', text: t.bullet ?? 'A link expires after 30 days.', evidence: [{ path: 'app/x.rb', lines: '1,4', symbol: 'expired?' }] },
        { id: 'b2', text: 'The guide explains it.', evidence: ev('README.md', '1', 'Guide', 'guide') },
      ],
    }],
  });
  f.fragment('flows', {
    sequences: [{
      id: 'turn', title: 'Turn', chapter: 's1',
      participants: [{ id: 'api', label: t.api ?? 'API', evidence: ev('app/x.rb', '1', 'Link') }, { id: 'db', label: 'DB', evidence: ev('app/y.rb', '1', 'Y') }],
      messages: [
        { n: 1, from: 'api', to: 'db', label: t.label ?? 'Reads link', evidence: ev('app/x.rb', '4', 'expired?') },
        { n: 2, from: 'db', to: 'api', label: 'Returns row', mode: 'async', evidence: ev('app/y.rb', '1', 'Y') },
      ],
    }],
    stores: { sql: [{ id: 'links-table', table: 'links', evidence: ev('app/y.rb', '1', 'Y') }] },
    storeFlows: [{
      id: 'first', trigger: 'A link is opened', chapter: 's1',
      steps: [
        { n: 1, actor: 'api', op: 'read', store: 'sql', key: t.key ?? 'links:{id}', evidence: ev('app/x.rb', '4', 'expired?') },
        { n: 2, actor: 'api', op: 'write', store: 'sql', key: 'links:{id}', evidence: ev('app/x.rb', '4', 'expired?') },
      ],
    }],
  });
  return f;
}
const read = (f: Fx, rel: string): string => fs.readFileSync(path.join(f.host, rel), 'utf8');
const lines = (f: Fx, rel: string): string[] => read(f, rel).split('\n');
const built = (f: Fx) => { const r = f.run(['build']); assert.strictEqual(r.status, 0, `build exits 0\n${r.stdout}${r.stderr}`); return parseJson(r.stdout) as { ok: boolean; written: string[]; collisions: string[]; diagrams: unknown[]; layout: unknown[]; pageBytes: number | null }; };
// Every file under docs/ with its bytes, for before and after comparisons.
const snapshot = (f: Fx): Record<string, string> => {
  const out: Record<string, string> = {};
  const walk = (rel: string): void => {
    for (const e of fs.readdirSync(path.join(f.host, rel), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${rel}/${e.name}`); else out[`${rel}/${e.name}`] = read(f, `${rel}/${e.name}`);
    }
  };
  if (fs.existsSync(path.join(f.host, 'docs'))) walk('docs');
  return out;
};
const fragments = (f: Fx): Record<string, string> => Object.fromEntries(Object.entries(snapshot(f)).filter(([k]) => k.startsWith(`${F}/`)));
const verifiedOf = (f: Fx): Record<string, Obj | undefined> => {
  const out: Record<string, Obj | undefined> = {};
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object' && v !== null) {
      const o = v as Obj;
      if (typeof o.id === 'string' && Array.isArray(o.evidence)) out[o.id] = o.verified as Obj | undefined;
      Object.values(o).forEach(walk);
    }
  };
  for (const n of fs.readdirSync(path.join(f.host, F))) walk(parseJson(read(f, `${F}/${n}`)));
  return out;
};

// Unknown subcommands still exit 2.
assert.strictEqual(setup().run(['nope']).status, 2);

// The Markdown of a good build.
{
  const f = setup();
  const head = f.git('host', 'rev-parse', 'HEAD');
  const guideHead = f.git('guide', 'rev-parse', 'HEAD');
  const result = built(f);
  assert.deepStrictEqual([result.ok, result.collisions, (result.diagrams as { name: string }[]).map((d) => d.name), (result.layout as { key: string }[]).map((l) => l.key), typeof result.pageBytes], [true, [], ['arch-system', 'seq-turn', 'flow-first'], ['level-system', 'seq-turn', 'flow-first'], 'number']);
  assert.ok(result.written.includes('docs/system/s1.md'), result.written.join(','));

  const s1 = lines(f, 'docs/system/s1.md');
  assert.strictEqual(s1.find((l) => l !== '' && !l.startsWith('#')), 'Where do links expire?');
  const at = (text: string): number => s1.indexOf(text);
  assert.strictEqual(s1[at('- A link expires after 30 days.') + 1], '  Evidence: `app/x.rb:1` `expired?`; `app/x.rb:4` `expired?`');
  assert.strictEqual(s1[at('- The guide explains it.') + 1], '  Evidence: `@guide/README.md:1` `Guide`');

  const parsed = parseDoc('docs/system/s1.md', read(f, 'docs/system/s1.md'));
  assert.deepStrictEqual(parsed.problems, []);
  assert.deepStrictEqual(parsed.claims.flatMap((c) => c.evidence.map((e) => (e.type === 'path' ? e.path : ''))), ['app/x.rb', 'app/x.rb', '@guide/README.md']);

  const tail = s1.filter((l) => l !== '').slice(-2);
  assert.deepStrictEqual(tail, [GEN, `<!-- fx-docs verified: ${head} -->`]);

  const text = read(f, 'docs/system/s1.md');
  assert.ok(text.includes('```mermaid\nsequenceDiagram\n'), 'a mermaid block');
  const header = s1.indexOf('| # | From | To | Message | Evidence |');
  assert.ok(header > 0 && s1[header + 2]?.startsWith('| 1 |') && s1[header + 3]?.startsWith('| 2 |') && s1[header + 4] === '', 'two message rows');
  assert.ok(s1.includes('| # | Actor | Op | Store | Key | When | Evidence |'), 'store flow table');

  const index = lines(f, 'docs/system/index.md');
  assert.ok(index.some((l) => l.includes('(s1.md)')), 'index links s1.md');
  assert.ok(index.some((l) => l.includes('(../system-flow/index.html)')), 'index links the site');
  // Design, Renderers (Markdown): each doc links its figure in the site; stores.md holds a row per store row.
  assert.ok(s1.includes('[Figures for this chapter in the site](../system-flow/index.html#s1)'), 's1.md links its figure');
  assert.ok(read(f, 'docs/system/stores.md').split('\n').some((l) => l.startsWith('| links-table | links |')), 'stores.md row');
  for (const doc of ['components', 'stores']) assert.ok(read(f, `docs/system/${doc}.md`).includes(GEN), doc);

  const readme = read(f, 'docs/system-flow/README.md');
  for (const word of ['system-flow check', 'system-flow build', 'fragments are the record', 'index.html', 'diagrams/', 'system-model.json', 'Markdown']) assert.ok(readme.includes(word), word);
  assert.ok(readme.includes(GEN));

  const model = parseJson(read(f, 'docs/system-flow/model/system-model.json')) as Obj & { sections: { bullets: unknown[] }[]; levels: { diagrams: unknown[] } };
  assert.strictEqual(model.generated, true);
  assert.strictEqual(model.sections[0]?.bullets.length, 2);
  assert.strictEqual(model.levels.diagrams.length, 1);

  // Ruling 6: an item citing the host carries verified.backend, b2 (guide only) carries verified.guide only.
  const v = verifiedOf(f);
  assert.deepStrictEqual(v.b1, { backend: head });
  assert.deepStrictEqual(v.b2, { guide: guideHead });
  assert.deepStrictEqual(v.link, { backend: head });

  // A second build changes no byte anywhere.
  const before = snapshot(f);
  assert.deepStrictEqual(built(f).written, []);
  assert.deepStrictEqual(snapshot(f), before);
}

// The marker names the oldest verified commit.
{
  const f = setup();
  const c0 = f.git('host', 'rev-parse', 'HEAD');
  f.put('host', 'NOTES.md', 'later\n');
  const c1 = f.commit('host', 'later');
  built(f);
  assert.ok(read(f, 'docs/system/s1.md').includes(`verified: ${c1} -->`));
  const chapters = parseJson(read(f, `${F}/chapters.json`)) as { sections: { bullets: Obj[] }[] };
  chapters.sections[0]!.bullets[0]!.verified = { backend: c0 };
  f.fragment('chapters', chapters);
  built(f);
  assert.ok(read(f, 'docs/system/s1.md').includes(`<!-- fx-docs verified: ${c0} -->`));
}

// A hand-written doc is never overwritten, and the collision is listed.
{
  const f = setup();
  f.put('host', 'docs/system/s1.md', '# Mine\n\nHand written.\n');
  f.commit('host', 'hand written doc');
  const r = built(f);
  assert.strictEqual(read(f, 'docs/system/s1.md'), '# Mine\n\nHand written.\n');
  assert.deepStrictEqual(r.collisions, ['docs/system/s1.md']);
  assert.ok(fs.existsSync(path.join(f.host, 'docs/system/components.md')));
}

// An uncommitted cited file stops the build and nothing changes.
{
  const f = setup();
  built(f);
  f.put('host', 'app/x.rb', 'class Link\nend\n');
  const before = snapshot(f);
  const r = f.run(['build']);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.split('\n').some((l) => l.endsWith('app/x.rb has uncommitted changes')), r.stderr);
  assert.deepStrictEqual(snapshot(f), before);
}

// Stamp last: a failed check or a failed write leaves every fragment as it was.
{
  const f = setup();
  const chapters = parseJson(read(f, `${F}/chapters.json`)) as { sections: { bullets: Obj[] }[] };
  chapters.sections[0]!.bullets[0]!.evidence = ev('app/x.rb', '40-50', 'expired?');
  f.fragment('chapters', chapters);
  const before = snapshot(f);
  const r = f.run(['build']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /range outside file/);
  assert.deepStrictEqual(snapshot(f), before, 'nothing written');
}
{
  const f = setup();
  const dir = path.join(f.host, 'docs/system');
  fs.mkdirSync(dir, { recursive: true });
  const before = fragments(f);
  fs.chmodSync(dir, 0o500);
  try {
    const r = f.run(['build']);
    assert.strictEqual(r.status, 1, r.stdout);
    assert.deepStrictEqual(fragments(f), before);
    assert.ok(Object.values(verifiedOf(f)).every((v) => v === undefined), 'no verified field');
  } finally { fs.chmodSync(dir, 0o700); }
}

// Table cells: an unescaped pipe never splits a row; a line break stays on one line.
{
  const f = setup({ label: 'a|b', key: 'user:{id}|v2' });
  built(f);
  const s1 = lines(f, 'docs/system/s1.md');
  const row = s1.find((l) => l.startsWith('| 1 | API'));
  assert.ok(row?.includes('| a\\|b |'), row);
  assert.strictEqual(row?.split(/(?<!\\)\|/).length, 5 + 2, 'five cells');
  assert.ok(s1.some((l) => l.includes('| user:{id}\\|v2 |')));
}
{
  const f = setup({ label: 'one\ntwo' });
  built(f);
  assert.ok(lines(f, 'docs/system/s1.md').some((l) => l.includes('| one two |')));
}

// Mermaid lines: one pass, no double escape.
{
  const f = setup({ label: 'Reads #3; then: "writes"', api: 'API; v2' });
  built(f);
  const s1 = lines(f, 'docs/system/s1.md');
  assert.ok(s1.includes('    api->>db: Reads #35;3#59; then#58; #quot;writes#quot;'));
  assert.ok(s1.includes('    participant api as API#59; v2'));
}

// Ruling 7: repository text never becomes HTML in Markdown.
{
  const f = setup({ label: '<script>alert(1)</script>', bullet: 'Uses <b>bold</b> & more' });
  built(f);
  const text = read(f, 'docs/system/s1.md');
  assert.ok(!text.includes('<script>') && !text.includes('<b>'));
  assert.ok(text.includes('| &lt;script&gt;alert(1)&lt;/script&gt; |'));
  assert.ok(text.includes('- Uses &lt;b&gt;bold&lt;/b&gt; &amp; more'));
}

// Design, Renderers (Markdown): a section with a folder gets an index.md there, listing its chapters and linking the site.
{
  const f = setup({ folder: 'api' });
  const r = built(f);
  assert.ok(r.written.includes('docs/system/api/s1.md') && r.written.includes('docs/system/api/index.md'), r.written.join(','));
  const sub = lines(f, 'docs/system/api/index.md');
  assert.ok(sub.some((l) => l.includes('[Links](s1.md): Where do links expire?')), 'folder index lists the chapter');
  assert.ok(sub.some((l) => l.includes('(../../system-flow/index.html)')), 'folder index links the site');
  assert.ok(lines(f, 'docs/system/index.md').some((l) => l.includes('(api/s1.md)')), 'root index reaches the chapter');
  assert.ok(read(f, 'docs/system/api/s1.md').includes('(../../system-flow/index.html#s1)'), 'doc in a folder links the site');
}

// Writes stay inside the host root (final fix A4).
{ // A committed symlink in the site is never written through
  const f = setup();
  const target = path.join(f.base, 'target.txt');
  fs.writeFileSync(target, 'keep\n');
  fs.mkdirSync(path.join(f.host, 'docs/system-flow/model'), { recursive: true });
  fs.symlinkSync(target, path.join(f.host, 'docs/system-flow/model/layout-report.json'));
  f.commit('host', 'model');
  const before = fs.readFileSync(path.join(f.host, F, 'level0.json'), 'utf8');
  const r = f.run(['build']);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.includes('refusing to write through a symlink: docs/system-flow/model/layout-report.json'), r.stderr);
  assert.strictEqual(fs.readFileSync(target, 'utf8'), 'keep\n', 'the link target is untouched');
  assert.strictEqual(fs.readFileSync(path.join(f.host, F, 'level0.json'), 'utf8'), before, 'no stamps');
}
{ // output.site and output.markdown are relative paths inside the root
  for (const output of [{ site: '../out', markdown: 'docs/system' }, { site: 'docs/system-flow', markdown: '/tmp/x' }]) {
    const f = setup();
    f.fxJson({ system_flow: { roots: { guide: '../guide' }, output } });
    f.commit('host', 'model');
    const r = f.run(['check']);
    assert.strictEqual(r.status, 1, r.stdout);
    assert.ok(r.stderr.includes('.fx.json:/system_flow/output: output must have site and markdown paths relative to the root and inside it'), r.stderr);
  }
}
{ // An mkdocs docs_dir that leaves the root is refused by detect
  const f = setup();
  f.put('host', 'mkdocs.yml', 'site_name: x\ndocs_dir: ../..\n');
  const r = f.run(['detect']);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.includes('docs_dir ../.. leaves the host root'), r.stderr);
}

console.log('system-flow-build.test.js: ok');
