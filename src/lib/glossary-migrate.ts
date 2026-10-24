// Renames a repository's CONTEXT.md files to GLOSSARY.md with git mv. It
// follows the root map's links, never overwrites a GLOSSARY file and commits
// nothing. Usage: node glossary-migrate.js <root> [--apply]

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface Plan { moves: { from: string; to: string }[]; edits: string[]; conflicts: string[] }

// Whole file names only: MY-CONTEXT.md and CONTEXT.mdx stay untouched.
const OLD_NAME = /(?<![\w-])CONTEXT(-MAP)?\.md(?![\w-])/g;
const rename = (text: string) => text.replace(OLD_NAME, (_m, map) => (map ? 'GLOSSARY-MAP.md' : 'GLOSSARY.md'));
const exists = (root: string, rel: string) => fs.existsSync(path.join(root, rel));

function docFiles(root: string, dir: string, out: string[]): void {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory() && !(rel === 'docs/plans' || rel === 'docs/adr')) docFiles(root, rel, out);
    else if (e.isFile() && e.name.endsWith('.md')) out.push(rel);
  }
}

export function planMigration(root: string): Plan {
  const from = new Set<string>();
  if (exists(root, 'CONTEXT-MAP.md')) {
    from.add('CONTEXT-MAP.md');
    const map = fs.readFileSync(path.join(root, 'CONTEXT-MAP.md'), 'utf8');
    for (const m of map.matchAll(/\]\(\s*<?([^)\s>#]+)/g)) {
      const rel = path.posix.normalize(m[1] ?? '');
      // Links that leave the repository are not ours to move.
      if (path.posix.basename(rel) === 'CONTEXT.md' && !rel.startsWith('..') && exists(root, rel)) from.add(rel);
    }
  }
  if (exists(root, 'CONTEXT.md')) from.add('CONTEXT.md');
  const moves = [...from].sort().map((f) => ({
    from: f,
    to: path.posix.join(path.posix.dirname(f), f.endsWith('-MAP.md') ? 'GLOSSARY-MAP.md' : 'GLOSSARY.md'),
  }));
  const conflicts = moves.filter((m) => exists(root, m.to)).map((m) => m.to).sort();

  const candidates = ['CLAUDE.md', 'AGENTS.md', 'repo.md'].filter((f) => exists(root, f));
  if (exists(root, 'docs')) docFiles(root, 'docs', candidates);
  const edits = candidates.filter((f) => !from.has(f)
    && (fs.readFileSync(path.join(root, f), 'utf8').match(OLD_NAME) ?? []).length > 0).sort();
  return { moves, edits, conflicts };
}

export function applyMigration(root: string): void {
  const { moves, edits, conflicts } = planMigration(root);
  if (conflicts.length) throw new Error(`already exists: ${conflicts.join(', ')}`);
  for (const m of moves) execFileSync('git', ['mv', m.from, m.to], { cwd: root });
  const files = [...edits, ...moves.filter((m) => m.to.endsWith('-MAP.md')).map((m) => m.to)];
  for (const f of files) {
    const p = path.join(root, f);
    fs.writeFileSync(p, rename(fs.readFileSync(p, 'utf8')));
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const root = args.find((a) => a !== '--apply');
  if (!root) { console.error('usage: glossary-migrate <root> [--apply]'); process.exit(2); }
  const plan = planMigration(root);
  if (apply && plan.conflicts.length) {
    for (const c of plan.conflicts) console.error(`conflict: ${c} already exists`);
    process.exit(1);
  }
  if (apply) {
    applyMigration(root);
    console.log(`moved ${plan.moves.length}, edited ${plan.edits.length}, committed nothing`);
  } else {
    for (const m of plan.moves) console.log(`git mv ${m.from} ${m.to}`);
    for (const e of plan.edits) console.log(`edit ${e}`);
    for (const c of plan.conflicts) console.log(`conflict ${c} already exists`);
    console.log('dry run: nothing changed');
  }
}
