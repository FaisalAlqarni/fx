// Run: node scripts/system-flow-detect.test.js
// system-flow detect: docs config, output location and evidence roots, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { parseFxJson } from '../lib/fx-json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';
import type { Detected } from '../lib/sf-detect.js';

type Fx = ReturnType<typeof sfFixture>;
const MARK = '<!-- fx-system-flow generated: edit the model, then rebuild -->';
const DEFAULT = { site: 'docs/system-flow', markdown: 'docs/system' };
const ok = (f: Fx, args: string[] = []): Detected => {
  const r = f.run(['detect', ...args]);
  assert.strictEqual(r.status, 0, `detect ${args.join(' ')}\n${r.stderr}`);
  return parseJson(r.stdout) as Detected;
};
const mkdocs = (f: Fx, body = 'docs_dir: docs\ntheme:\n  name: material\n'): void => { f.put('host', 'mkdocs.yml', body); f.commit('host'); };

{ // MkDocs
  const f = sfFixture();
  mkdocs(f);
  const d = ok(f);
  assert.deepStrictEqual(d.output, DEFAULT);
  assert.deepStrictEqual(d.docsConfig, { kind: 'mkdocs', path: 'mkdocs.yml', docsDir: 'docs' });
  assert.deepStrictEqual(d.mkdocs?.excludeDocs, ['system-flow/README.md', 'system-flow/model/', 'system-flow/diagrams/src/']);
  assert.deepStrictEqual(d.mkdocs?.nav, ['- System flow: system-flow/index.html', '- System docs: system/index.md']);
  assert.deepStrictEqual(d.theme, { source: 'fx', kind: 'fx' });
}
{ // hand-written Markdown, and the generated marker
  const f = sfFixture();
  f.put('host', 'docs/system/notes.md', '# Notes\n');
  f.commit('host');
  assert.strictEqual(ok(f).output.markdown, 'docs/system-generated');
  const g = sfFixture();
  g.put('host', 'docs/system/index.md', `# System\n\n${MARK}\n`);
  g.commit('host');
  assert.strictEqual(ok(g).output.markdown, 'docs/system');
}
{ // both taken
  const f = sfFixture();
  f.put('host', 'docs/system/a.md', 'a\n');
  f.put('host', 'docs/system-generated/b.md', 'b\n');
  f.commit('host');
  const r = f.run(['detect']);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr.trim(), 'system-flow: detect: docs/system and docs/system-generated hold hand-written Markdown; set system_flow.output.markdown in .fx.json');
}
{ // other docs_dir
  const f = sfFixture();
  mkdocs(f, 'docs_dir: site-docs\n');
  assert.deepStrictEqual(ok(f).output, { site: 'site-docs/system-flow', markdown: 'site-docs/system' });
}
{ // Docusaurus, VitePress, none
  const f = sfFixture();
  f.put('host', 'docusaurus.config.js', 'module.exports = {};\n');
  f.put('host', 'docs/intro.md', '# Intro\n');
  f.commit('host');
  const d = ok(f);
  assert.strictEqual(d.docsConfig.kind, 'docusaurus');
  assert.deepStrictEqual(d.output, DEFAULT);
  assert.strictEqual(d.mkdocs, null);
  const v = sfFixture();
  v.put('host', 'guide/.vitepress/config.ts', 'export default {};\n');
  v.commit('host');
  const dv = ok(v);
  assert.strictEqual(dv.docsConfig.kind, 'vitepress');
  assert.strictEqual(dv.docsConfig.docsDir, 'guide');
  assert.deepStrictEqual(dv.output, { site: 'guide/system-flow', markdown: 'guide/system' });
  const n = ok(sfFixture());
  assert.deepStrictEqual(n.docsConfig, { kind: null, path: null, docsDir: null });
  assert.deepStrictEqual(n.output, DEFAULT);
}
{ // an existing pick is reported unchanged
  const f = sfFixture();
  f.fxJson({ system_flow: { output: { site: 'x/flow', markdown: 'x/md' } } });
  assert.deepStrictEqual(ok(f).output, { site: 'x/flow', markdown: 'x/md' });
}
{ // roots from .fx.json
  const f = sfFixture();
  f.fxJson({ system_flow: { roots: { guide: '../guide' } } });
  const d = ok(f);
  assert.strictEqual(d.roots.length, 2);
  assert.deepStrictEqual({ ...d.roots[0], dir: '' }, { id: 'host', path: '.', dir: '', git: true, remote: null, head: f.git('host', 'rev-parse', 'HEAD') });
  assert.deepStrictEqual(d.roots[1], { id: 'guide', path: '../guide', dir: f.guide, git: true, remote: null, head: f.git('guide', 'rev-parse', 'HEAD') });
}
{ // --repo and --write
  const f = sfFixture();
  const d = ok(f, ['--repo', '../guide', '--repo', '../plain', '--write']);
  assert.deepStrictEqual(d.roots[2], { id: 'plain', path: '../plain', git: false, remote: null, head: null, dir: f.plain });
  const text = fs.readFileSync(path.join(f.host, '.fx.json'), 'utf8');
  assert.deepStrictEqual((parseJson(text) as { system_flow: { roots: object } }).system_flow.roots, { guide: '../guide', plain: '../plain' });
  assert.ok(!/": "\//.test(text), 'no absolute path in .fx.json');
  ok(f, ['--repo', '../guide', '--repo', '../plain', '--write']);
  assert.strictEqual(fs.readFileSync(path.join(f.host, '.fx.json'), 'utf8'), text, 'second write is byte-identical');
}
{ // id from folder name, collisions, missing folder
  const f = sfFixture();
  fs.mkdirSync(path.join(f.base, 'Shamel.Backend'));
  fs.mkdirSync(path.join(f.base, 'shamel_backend'));
  assert.strictEqual(ok(f, ['--repo', '../Shamel.Backend']).roots[1]?.id, 'shamel-backend');
  const r = f.run(['detect', '--repo', '../Shamel.Backend', '--repo', '../shamel_backend']);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr.trim(), 'system-flow: detect: roots ../Shamel.Backend and ../shamel_backend both map to id shamel-backend; rename one in .fx.json system_flow.roots');
  const m = f.run(['detect', '--repo', '../nowhere']);
  assert.strictEqual(m.status, 1);
  assert.strictEqual(m.stderr.trim(), 'system-flow: detect: no folder at ../nowhere');
}
{ // --write keeps other keys; nothing else is written
  const f = sfFixture();
  f.fxJson({ test_all: 'x' });
  f.commit('host');
  const clean = f.run(['detect']);
  assert.strictEqual(clean.status, 0);
  assert.strictEqual(f.git('host', 'status', '--porcelain'), '', 'no --write, no change');
  const d = ok(f, ['--write']);
  const written = parseJson(fs.readFileSync(path.join(f.host, '.fx.json'), 'utf8')) as Record<string, unknown> & { system_flow: { output: unknown } };
  assert.strictEqual(written.test_all, 'x');
  assert.deepStrictEqual(written.system_flow.output, d.output);
  assert.strictEqual(parseFxJson(written).ok && (parseFxJson(written) as { problems: unknown[] }).problems.length, 0);
}
console.log('system-flow-detect.test.js: OK');
