import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findGlossary, glossaryNotice } from './glossary.js';

function repo(files: Record<string, string>): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-glossary-'));
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(d, name), body);
  return d;
}
const list = (d: string) => fs.readdirSync(d).sort();

{
  const d = repo({ 'GLOSSARY.md': 'x' });
  assert.deepStrictEqual(findGlossary(d), { file: 'GLOSSARY.md', legacy: false });
  assert.strictEqual(glossaryNotice(d), null);
}
{
  const d = repo({ 'CONTEXT.md': 'x' });
  assert.deepStrictEqual(findGlossary(d), { file: 'CONTEXT.md', legacy: true });
  assert.strictEqual(glossaryNotice(d),
    "This repository's glossary is still named CONTEXT.md. fx now reads GLOSSARY.md (GLOSSARY-MAP.md for a map) first and the old name second. Run the fx-setup command to rename it; answer no there and fx stops asking.");
}
{
  const d = repo({ 'GLOSSARY.md': 'x', 'CONTEXT.md': 'y' });
  const before = list(d);
  assert.deepStrictEqual(findGlossary(d), { file: 'GLOSSARY.md', legacy: false });
  assert.strictEqual(glossaryNotice(d), null);
  assert.deepStrictEqual(list(d), before);
}
{
  const d = repo({});
  assert.strictEqual(findGlossary(d), null);
  assert.strictEqual(glossaryNotice(d), null);
  assert.deepStrictEqual(list(d), []);
}
{
  const d = repo({ 'CONTEXT-MAP.md': 'x', 'CONTEXT.md': 'y' });
  assert.deepStrictEqual(findGlossary(d), { file: 'CONTEXT-MAP.md', legacy: true });
}
{
  const d = repo({ 'GLOSSARY-MAP.md': 'x', 'GLOSSARY.md': 'y', 'CONTEXT-MAP.md': 'z' });
  assert.deepStrictEqual(findGlossary(d), { file: 'GLOSSARY-MAP.md', legacy: false });
}
{
  const d = repo({ 'CONTEXT.md': 'x', '.fx.json': '{"glossary_rename":"declined"}' });
  assert.strictEqual(glossaryNotice(d), null);
}
console.log('glossary.test.js: ok');
