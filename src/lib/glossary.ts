// Decides which file is a repository's domain glossary. Reads only; it never
// creates a file, so a GLOSSARY.md never appears beside an existing CONTEXT.md.

import * as fs from 'fs';
import * as path from 'path';
import { parseFxJson } from './fx-json';
import { parseJson } from './json';

type GlossaryFile = 'GLOSSARY-MAP.md' | 'GLOSSARY.md' | 'CONTEXT-MAP.md' | 'CONTEXT.md';
const ORDER: GlossaryFile[] = ['GLOSSARY-MAP.md', 'GLOSSARY.md', 'CONTEXT-MAP.md', 'CONTEXT.md'];

export function findGlossary(root: string): { file: GlossaryFile; legacy: boolean } | null {
  const file = ORDER.find((f) => fs.existsSync(path.join(root, f)));
  return file ? { file, legacy: file.startsWith('CONTEXT') } : null;
}

function declined(root: string): boolean {
  try {
    const parsed = parseFxJson(parseJson(fs.readFileSync(path.join(root, '.fx.json'), 'utf8')));
    return parsed.ok && parsed.value.glossary_rename === 'declined';
  } catch { return false; }
}

export function glossaryNotice(root: string): string | null {
  const found = findGlossary(root);
  if (!found || !found.legacy || declined(root)) return null;
  return `This repository's glossary is still named ${found.file}. fx now reads GLOSSARY.md `
    + '(GLOSSARY-MAP.md for a map) first and the old name second. '
    + 'Run the fx-setup command to rename it; answer no there and fx stops asking.';
}
