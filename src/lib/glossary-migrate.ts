// Renames a repository's CONTEXT.md files to GLOSSARY.md with git mv. It
// follows the root map's links, never overwrites a GLOSSARY file and commits
// nothing. Usage: node glossary-migrate.js <root> [--apply]

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// edits name each file at its path after the moves; byHand lists `path:line`
// in tracked non-Markdown files, which are never edited.
export interface Plan { moves: { from: string; to: string }[]; edits: string[]; byHand: string[]; conflicts: string[] }

// Whole file names only: MY-CONTEXT.md and CONTEXT.mdx stay untouched.
const OLD_NAME = /(?<![\w-])CONTEXT(-MAP)?\.md(?![\w-])/g;
const rename = (text: string) => text.replace(OLD_NAME, (_m, map) => (map ? 'GLOSSARY-MAP.md' : 'GLOSSARY.md'));
const MENTIONS = new RegExp(OLD_NAME.source); // not global, so test() keeps no state
const exists = (root: string, rel: string) => fs.existsSync(path.join(root, rel));

export function planMigration(root: string): Plan {
  const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0'));
  const problems = new Set<string>();
  const from = new Set<string>();
  const isLink = (rel: string) => fs.lstatSync(path.join(root, rel)).isSymbolicLink();
  const want = (rel: string) => {
    if (!tracked.has(rel)) problems.add(`${rel} is not tracked by git`);
    else if (isLink(rel)) problems.add(`${rel} is a symlink`);
    else from.add(rel);
  };
  if (exists(root, 'CONTEXT-MAP.md')) want('CONTEXT-MAP.md');
  // A rerun after a partial move reads the links from the already renamed map.
  const mapFile = ['CONTEXT-MAP.md', 'GLOSSARY-MAP.md'].find((f) => exists(root, f));
  if (mapFile && isLink(mapFile)) problems.add(`${mapFile} is a symlink`);
  else if (mapFile) {
    const map = fs.readFileSync(path.join(root, mapFile), 'utf8');
    // Inline links and reference-style definitions.
    for (const m of map.matchAll(/(?:\]\(|^\s*\[[^\]]+\]:)\s*<?([^)\s>#]+)/gm)) {
      const link = m[1] ?? '';
      if (path.posix.basename(link) !== 'CONTEXT.md') continue;
      const rel = path.posix.normalize(link);
      if (link.startsWith('/') || rel.startsWith('..')) problems.add(`${link} is not a relative path inside the repo`);
      else if (rel.startsWith('-')) problems.add(`${rel} starts with -`);
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

  // Every tracked Markdown file except archived plans and ADRs, which keep the old name.
  const renamed = new Map(moves.map((m) => [m.from, m.to]));
  const realRoot = fs.realpathSync(root);
  const edits: string[] = [];
  const byHand: string[] = [];
  for (const f of [...tracked].sort()) {
    const p = path.join(root, f);
    if (!f || f.startsWith('docs/plans/') || f.startsWith('docs/adr/')) continue;
    const st = fs.lstatSync(p, { throwIfNoEntry: false });
    if (!st || st.isDirectory() || !fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (text.includes('\0') || !MENTIONS.test(text)) continue;
    if (!f.endsWith('.md')) {
      text.split('\n').forEach((l, i) => { if (MENTIONS.test(l)) byHand.push(`${f}:${i + 1}`); });
      continue;
    }
    // Never write through a link; one to a tracked file in the repo is edited at its target.
    const target = path.relative(realRoot, fs.realpathSync(p)).split(path.sep).join('/');
    if (target === f) edits.push(renamed.get(f) ?? f);
    else if (!tracked.has(target)) problems.add(`${f} is a symlink`);
  }
  edits.sort();
  return { moves, edits, byHand, conflicts: [...problems].sort() };
}

// Thrown when an apply fails and its rollback could not undo every change.
export class PartlyApplied extends Error {}

const gitMv = (root: string, from: string, to: string) =>
  execFileSync('git', ['mv', '--', from, to], { cwd: root, stdio: 'pipe' });

// All or nothing: the whole plan is validated before the first git mv, and a
// failure after that undoes every completed write and move, newest first.
export function applyMigration(root: string): void {
  const { moves, edits, conflicts } = planMigration(root);
  if (conflicts.length) throw new Error(conflicts.join('; '));
  const moved: { from: string; to: string }[] = [];
  const written: { file: string; text: string }[] = [];
  try {
    for (const m of moves) { gitMv(root, m.from, m.to); moved.push(m); }
    for (const f of edits) {
      const p = path.join(root, f);
      const text = fs.readFileSync(p, 'utf8');
      fs.writeFileSync(p, rename(text));
      written.push({ file: f, text });
    }
  } catch (e) {
    const edited = written.reverse().filter((w) => {
      try { fs.writeFileSync(path.join(root, w.file), w.text); return false; } catch { return true; }
    }).map((w) => w.file);
    const still = moved.reverse().filter((m) => {
      try { gitMv(root, m.to, m.from); return false; } catch { return true; }
    });
    if (!edited.length && !still.length) throw e;
    const notMoved = moves.filter((m) => !still.includes(m)).map((m) => m.from);
    throw new PartlyApplied([
      `moved: ${still.map((m) => `${m.from} -> ${m.to}`).join(', ') || 'none'}`,
      `not moved: ${notMoved.join(', ') || 'none'}`,
      `edited: ${edited.join(', ') || 'none'}`,
    ].join('; '));
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
    for (const h of plan.byHand) console.log(`update by hand ${h}`);
    console.log(`moved ${plan.moves.length}, edited ${plan.edits.length}, committed nothing`);
  } else {
    for (const m of plan.moves) console.log(`git mv ${m.from} ${m.to}`);
    for (const e of plan.edits) console.log(`edit ${e}`);
    for (const h of plan.byHand) console.log(`update by hand ${h}`);
    for (const c of plan.conflicts) console.log(`conflict ${c}`);
    console.log('dry run: nothing changed');
  }
}

if (require.main === module) {
  try { main(); } catch (e) {
    if (e instanceof PartlyApplied) {
      console.error(`glossary-migrate: failed, partly applied, rerun to finish: ${e.message}`);
      process.exit(1);
    }
    const msg = String((e as { stderr?: unknown; message?: unknown }).stderr || (e as Error).message).trim().split('\n')[0];
    console.error(`glossary-migrate: refused, repo unchanged: ${msg}`);
    process.exit(1);
  }
}
