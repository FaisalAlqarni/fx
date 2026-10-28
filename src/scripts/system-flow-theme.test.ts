// Run: node scripts/system-flow-theme.test.js
// system-flow theme: the detector, theme.css and the contrast check, run as a process.
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from '../lib/json.js';
import { sfFixture } from '../tests/helpers/sf-fixture.js';
import type { Detected } from '../lib/sf-detect.js';

type Fx = ReturnType<typeof sfFixture>;
type Fallback = { theme: string; slot: string; against: string; ratio: number; used: string };
const THEME = 'docs/system-flow/assets/theme.css';
const css = (light: string, dark: string): string => `:root { --bg:#ffffff; --ink:#111111; --accent:#0a7d6e; ${light} }\n[data-theme="dark"] { --bg:#101010; --ink:#eeeeee; --accent:#3fd0bf; ${dark} }\n`;
const make = (files: Record<string, string> = {}): Fx => {
  const f = sfFixture();
  f.goodSet();
  for (const [p, body] of Object.entries(files)) f.put('host', p, body);
  return f;
};
const detected = (f: Fx): Detected['theme'] => {
  const r = f.run(['detect']);
  assert.strictEqual(r.status, 0, r.stderr);
  return (parseJson(r.stdout) as Detected).theme;
};
const built = (f: Fx): { text: string; light: string; dark: string; fallbacks: Fallback[]; kind: string; source: string } => {
  const r = f.run(['build']);
  assert.strictEqual(r.status, 0, `build\n${r.stdout}${r.stderr}`);
  const out = parseJson(r.stdout) as { theme: { source: string; kind: string; fallbacks: Fallback[] } };
  const text = fs.readFileSync(path.join(f.host, THEME), 'utf8');
  const at = text.indexOf('@media');
  return { text, light: text.slice(0, at), dark: text.slice(at), fallbacks: out.theme.fallbacks, kind: out.theme.kind, source: out.theme.source };
};
const mk = (body: string): string => `site_name: x\ntheme:\n  name: material\n${body}`;
const TEAL = '    - scheme: default\n      primary: teal\n      accent: teal\n    - scheme: slate\n      primary: teal\n      accent: teal\n';

{ // Docs CSS
  const f = make({ 'docs/assets/docs.css': css('', '') });
  assert.deepStrictEqual(detected(f), { source: 'docs/assets/docs.css', kind: 'docs-css' });
  const b = built(f);
  for (const v of ['--paper: #ffffff', '--ink: #111111', '--accent: #0a7d6e']) assert.ok(b.light.includes(v), v);
  for (const v of ['--paper: #101010', '--ink: #eeeeee', '--accent: #3fd0bf']) assert.ok(b.dark.includes(v), v);
  assert.deepStrictEqual(b.fallbacks, []);
  assert.deepStrictEqual([b.kind, b.source], ['docs-css', 'docs/assets/docs.css']);
  assert.ok(!b.text.includes('@import') && !b.text.includes('@font-face') && !/url\s*\(/.test(b.text));
}
{ // Failing pair
  const f = make({ 'docs/assets/docs.css': css('', '').replace('--ink:#eeeeee', '--ink:#222222') });
  const b = built(f);
  assert.deepStrictEqual(b.fallbacks, [{ theme: 'dark', slot: '--ink', against: '--paper', ratio: 1.2, used: '#e6edf3' }]);
  assert.ok(b.dark.includes('--ink: #e6edf3'));
}
{ // No dark variant: skipped
  const f = make({ 'docs/assets/docs.css': ':root { --bg:#ffffff; --ink:#111111; --accent:#0a7d6e; }\n' });
  assert.deepStrictEqual(detected(f), { source: 'fx', kind: 'fx' });
  const b = built(f);
  assert.ok(b.light.includes('--paper: #f6f7f9') && b.dark.includes('--paper: #0f1318'));
}
{ // Material
  const f = make({ 'mkdocs.yml': mk(`  palette:\n${TEAL}`) });
  assert.deepStrictEqual(detected(f), { source: 'mkdocs.yml', kind: 'mkdocs-material' });
  const b = built(f);
  assert.deepStrictEqual(b.fallbacks, [
    { theme: 'light', slot: '--accent', against: '--paper', ratio: 3.67, used: '#0f766e' },
    { theme: 'dark', slot: '--accent', against: '--paper', ratio: 4.38, used: '#2dd4bf' },
  ]);
  assert.ok(b.dark.includes('--ink: #e2e4e9') && b.light.includes('--ink: #1f2328'));
}
{ // Order
  const f = make({ 'mkdocs.yml': mk(`  palette:\n${TEAL}`), 'docs/assets/docs.css': css('', '') });
  assert.strictEqual(built(f).kind, 'docs-css');
}
{ // Fonts, also when docs CSS wins
  const font = '  font:\n    text: Roboto\n    code: Roboto Mono\n';
  for (const extra of [{} as Record<string, string>, { 'docs/assets/docs.css': css('', '') }]) {
    const b = built(make({ 'mkdocs.yml': mk(font), ...extra }));
    assert.ok(b.text.includes('html body{font-family:"Roboto",system-ui,sans-serif}'));
    assert.ok(b.text.includes('html code,html pre{font-family:"Roboto Mono",ui-monospace,monospace}'));
    assert.ok(!b.text.includes('@import') && !b.text.includes('@font-face') && !/url\s*\(/.test(b.text));
  }
}
{ // Font injection and no font
  const b = built(make({ 'mkdocs.yml': mk('  font:\n    text: \'Roboto"}body{color:red\'\n    code: Roboto Mono\n') }));
  assert.ok(!b.text.includes('red') && !b.text.includes('html body{font-family'));
  assert.ok(b.text.includes('html code,html pre{font-family:"Roboto Mono"'));
  assert.ok(!built(make({ 'mkdocs.yml': mk('') })).text.includes('font-family'));
}
{ // Tailwind v3 and v4
  const v3 = make({ 'tailwind.config.js': "module.exports = { theme: { extend: { colors: { primary: '#0a7d6e' } } } };\n" });
  assert.strictEqual(detected(v3)?.kind, 'tailwind');
  assert.ok(built(v3).light.includes('--accent: #0a7d6e'));
  const v4 = make({ 'src/main.css': '@theme {\n  --color-primary: #0a7d6e;\n}\n' });
  assert.deepStrictEqual(detected(v4), { source: 'src/main.css', kind: 'tailwind' });
  assert.ok(built(v4).light.includes('--accent: #0a7d6e'));
}
{ // App CSS
  const f = make({ 'app/assets/stylesheets/app.css': ':root { --background: #ffffff; --foreground: #111111; --primary: #0a7d6e }\n@media (prefers-color-scheme: dark) { :root { --background: #101010; --foreground: #eeeeee; --primary: #3fd0bf } }\n' });
  assert.deepStrictEqual(detected(f), { source: 'app/assets/stylesheets/app.css', kind: 'app-css' });
  assert.ok(built(f).dark.includes('--accent: #3fd0bf'));
}
{ // Brand
  const f = make({ 'design-tokens.json': '{"color": {"primary": "#0a7d6e"}}\n' });
  assert.deepStrictEqual(detected(f), { source: 'design-tokens.json', kind: 'brand' });
  assert.ok(built(f).light.includes('--accent: #0a7d6e'));
}
{ // A value that is not a plain hex colour never reaches theme.css
  const f = make({ 'docs/assets/docs.css': css('--rule: red;}body{x:y;', '--rule: url(http://x/y);') });
  const b = built(f);
  assert.ok(!b.text.includes('body{x') && !b.text.includes('http') && !b.text.includes('red'));
}
{ // Re-read after --write
  const f = make({ 'docs/assets/docs.css': css('', '') });
  const w = f.run(['detect', '--write']);
  assert.strictEqual(w.status, 0, w.stderr);
  assert.deepStrictEqual((parseJson(fs.readFileSync(path.join(f.host, '.fx.json'), 'utf8')) as { system_flow: { theme: unknown } }).system_flow.theme, { source: 'docs/assets/docs.css', kind: 'docs-css' });
  assert.ok(built(f).light.includes('--accent: #0a7d6e'));
  f.put('host', 'docs/assets/docs.css', css('', '').replace('#0a7d6e', '#0b7a3e'));
  assert.ok(built(f).light.includes('--accent: #0b7a3e'));
}
{ // The theme saved in .fx.json wins; build detects only when the key is absent (final fix A21)
  const f = make({ 'docs/assets/docs.css': css('', ''), 'app/assets/app.css': css('', '').replace('#0a7d6e', '#7a1f8f') });
  f.fxJson({ system_flow: { theme: { source: 'app/assets/app.css', kind: 'app-css' } } });
  const b = built(f);
  assert.deepStrictEqual([b.kind, b.source], ['app-css', 'app/assets/app.css']);
  assert.ok(b.light.includes('--accent: #7a1f8f'), b.light);
  f.fxJson({ system_flow: { theme: { source: 'fx', kind: 'fx' } } });
  assert.deepStrictEqual([built(f).kind], ['fx'], 'a saved fx theme is not replaced by the docs CSS');
  f.fxJson({ system_flow: { theme: { source: 'app/gone.css', kind: 'app-css' } } });
  const r = f.run(['build']);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.includes('system_flow.theme names app/gone.css (app-css), which gives no theme now'), r.stderr);
}
{ // Candidates seen and why each was set aside, in the build result (final fix A14)
  const big = `:root { --ink:#111111; }\n/* ${'x'.repeat(1_000_001)} */\n`;
  const f = make({ 'docs/assets/big.css': big, 'brand.json': '{ "accent": ', 'tailwind.config.js': "module.exports = { theme: { colors: { accent: '#abcd' } } };\n" });
  const r = f.run(['build']);
  assert.strictEqual(r.status, 0, r.stderr);
  const t = (parseJson(r.stdout) as { theme: { kind: string; candidates: { source: string; kind: string; why: string }[] } }).theme;
  assert.strictEqual(t.kind, 'fx', 'a 4-digit hex is no colour');
  const why = Object.fromEntries(t.candidates.map((c) => [c.source, c.why]));
  assert.strictEqual(why['docs/assets/big.css'], 'over 1 MB, not read');
  assert.ok(why['brand.json']?.startsWith('invalid JSON: '), JSON.stringify(t.candidates));
  assert.strictEqual(why['tailwind.config.js'], 'no accent colour');
}
console.log('system-flow-theme.test.js: OK');
