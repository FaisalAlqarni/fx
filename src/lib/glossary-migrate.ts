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
  const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0'));
  const problems = new Set<string>();
  const from = new Set<string>();
  const want = (rel: string) => {
    if (!tracked.has(rel)) problems.add(`${rel} is not tracked by git`);
    else from.add(rel);
  };
  if (exists(root, 'CONTEXT-MAP.md')) want('CONTEXT-MAP.md');
  // A rerun after a partial move reads the links from the already renamed map.
  const mapFile = ['CONTEXT-MAP.md', 'GLOSSARY-MAP.md'].find((f) => exists(root, f));
  if (mapFile) {
    const map = fs.readFileSync(path.join(root, mapFile), 'utf8');
    for (const m of map.matchAll(/\]\(\s*<?([^)\s>#]+)/g)) {
      const link = m[1] ?? '';
      if (path.posix.basename(link) !== 'CONTEXT.md') continue;
      const rel = path.posix.normalize(link);
      if (link.startsWith('/') || rel.startsWith('..')) problems.add(`${link} is not a relative path inside the repo`);
      else if (exists(root, rel)) want(rel);
      else if (!exists(root, path.posix.join(path.posix.dirname(rel), 'GLOSSARY.md'))) problems.add(`${rel} is missing`);
    }
  }
  if (exists(root, 'CONTEXT.md')) want('CONTEXT.md');
  const moves = [...from].sort().map((f) => ({
    from: f,
    to: path.posix.join(path.posix.dirname(f), f.endsWith('-MAP.md') ? 'GLOSSARY-MAP.md' : 'GLOSSARY.md'),
  }));
  for (const m of moves) if (exists(root, m.to)) problems.add(m.to);
  const conflicts = [...problems].sort();

  const candidates = ['CLAUDE.md', 'AGENTS.md', 'repo.md'].filter((f) => exists(root, f));
  if (exists(root, 'docs')) docFiles(root, 'docs', candidates);
  const edits = candidates.filter((f) => !from.has(f)
    && (fs.readFileSync(path.join(root, f), 'utf8').match(OLD_NAME) ?? []).length > 0).sort();
  return { moves, edits, conflicts };
}

// All or nothing: the whole plan is validated before the first git mv.
export function applyMigration(root: string): void {
  const { moves, edits, conflicts } = planMigration(root);
  if (conflicts.length) throw new Error(conflicts.join('; '));
  for (const m of moves) execFileSync('git', ['mv', m.from, m.to], { cwd: root, stdio: 'pipe' });
  const files = [...edits, ...(exists(root, 'GLOSSARY-MAP.md') ? ['GLOSSARY-MAP.md'] : [])];
  for (const f of files) {
    const p = path.join(root, f);
    fs.writeFileSync(p, rename(fs.readFileSync(p, 'utf8')));
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const root = args.find((a) => a !== '--apply');
  if (!root) { console.error('usage: glossary-migrate <root> [--apply]'); process.exit(2); }
  const plan = planMigration(root);
  if (apply) {
    applyMigration(root);
    console.log(`moved ${plan.moves.length}, edited ${plan.edits.length}, committed nothing`);
  } else {
    for (const m of plan.moves) console.log(`git mv ${m.from} ${m.to}`);
    for (const e of plan.edits) console.log(`edit ${e}`);
    for (const c of plan.conflicts) console.log(`conflict ${c}`);
    console.log('dry run: nothing changed');
  }
}

if (require.main === module) {
  try { main(); } catch (e) {
    const msg = String((e as { stderr?: unknown; message?: unknown }).stderr || (e as Error).message).trim().split('\n')[0];
    console.error(`glossary-migrate: refused, repo unchanged: ${msg}`);
    process.exit(1);
  }
}
