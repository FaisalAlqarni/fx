// Moves a repository's .scratch/ issues into docs/issues/. Tracked entries move
// with git mv, untracked or ignored ones with a filesystem move. It rewrites
// the pointers that name .scratch/, removes the .gitignore line for it, undoes
// everything on the first failure and commits nothing.
// Usage: node scratch-migrate.js <root> [--apply]

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ScratchPlan {
  moves: { from: string; to: string; tracked: boolean }[];
  edits: { file: string; line: number; before: string; after: string }[];
  gitignore: { file: string; line: number; text: string } | null;
  conflicts: string[];
  rollback: string[];
}

const OLD = /(?<![\w.\/-])\.scratch\//g;
const IGNORE_LINES = new Set(['.scratch', '.scratch/', '/.scratch', '/.scratch/']);
const git = (root: string, ...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
const abs = (root: string, rel: string) => path.join(root, rel);
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

function filesUnder(root: string, rel: string): string[] {
  const st = fs.lstatSync(abs(root, rel));
  if (!st.isDirectory()) return [rel];
  return fs.readdirSync(abs(root, rel)).sort().flatMap((n) => filesUnder(root, `${rel}/${n}`));
}

export function planScratchMigration(root: string): ScratchPlan {
  const plan: ScratchPlan = { moves: [], edits: [], gitignore: null, conflicts: [], rollback: [] };
  if (!fs.existsSync(abs(root, '.scratch'))) return plan;
  const names = fs.readdirSync(abs(root, '.scratch')).sort();
  if (!names.length) return plan;
  const tracked = new Set(git(root, 'ls-files', '-z').split('\0').filter(Boolean));
  const problems: string[] = [];
  if (git(root, 'status', '--porcelain', '--untracked-files=no', '--', '.scratch').trim()) {
    problems.push('.scratch has uncommitted changes to tracked files');
  }
  for (const name of names) {
    const from = `.scratch/${name}`;
    const to = `docs/issues/${name}`;
    if (fs.lstatSync(abs(root, from)).isSymbolicLink()) { problems.push(`${from} is a symlink`); continue; }
    if (fs.existsSync(abs(root, to))) problems.push(`${to} already exists`);
    const files = filesUnder(root, from);
    const n = files.filter((f) => tracked.has(f)).length;
    if (n && n < files.length) problems.push(`${from} mixes tracked and untracked files`);
    plan.moves.push({ from, to, tracked: n > 0 });
  }

  // Pointers: the agent files, repo.md and tracked docs outside plans, ADRs and issues.
  const candidates = new Set(['CLAUDE.md', 'AGENTS.md', 'repo.md'].filter((f) => tracked.has(f)));
  for (const f of tracked) {
    if (f.startsWith('docs/') && f.endsWith('.md') && !/^docs\/(plans|adr|issues)\//.test(f)) candidates.add(f);
  }
  for (const f of [...candidates].sort()) {
    const p = abs(root, f);
    if (!fs.existsSync(p) || fs.lstatSync(p).isSymbolicLink()) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach((before, i) => {
      if (before.match(OLD)) plan.edits.push({ file: f, line: i + 1, before, after: before.replace(OLD, 'docs/issues/') });
    });
  }

  const gi = abs(root, '.gitignore');
  if (fs.existsSync(gi)) {
    const i = fs.readFileSync(gi, 'utf8').split('\n').findIndex((l) => IGNORE_LINES.has(l));
    if (i >= 0) plan.gitignore = { file: '.gitignore', line: i + 1, text: fs.readFileSync(gi, 'utf8').split('\n')[i] as string };
  }
  plan.conflicts = problems.sort();
  plan.rollback = steps(root, plan).reverse().flatMap((s) => s.rollback);
  return plan;
}

interface Step { name: string; run: () => void; undo: () => void; rollback: string[] }

// shortcut: the rollback sed reverses every docs/issues/ on an edited line, so a
// line that already held docs/issues/ before the move needs a hand fix.
function steps(root: string, plan: ScratchPlan): Step[] {
  const out: Step[] = [];
  for (const m of plan.moves) {
    const made: string[] = [];
    out.push({
      name: `move ${m.from}`,
      run: () => {
        if (!fs.existsSync(abs(root, 'docs/issues'))) { fs.mkdirSync(abs(root, 'docs/issues'), { recursive: true }); made.push('docs/issues'); }
        if (m.tracked) git(root, 'mv', '--', m.from, m.to); else fs.renameSync(abs(root, m.from), abs(root, m.to));
      },
      undo: () => {
        fs.mkdirSync(abs(root, '.scratch'), { recursive: true });
        if (m.tracked) git(root, 'mv', '--', m.to, m.from); else fs.renameSync(abs(root, m.to), abs(root, m.from));
        for (const d of made) fs.rmdirSync(abs(root, d));
      },
      rollback: ['mkdir -p .scratch', m.tracked ? `git mv -- ${q(m.to)} ${q(m.from)}` : `mv -- ${q(m.to)} ${q(m.from)}`],
    });
  }
  const byFile = new Map<string, ScratchPlan['edits']>();
  for (const e of plan.edits) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e]);
  for (const [file, list] of byFile) {
    let original = '';
    out.push({
      name: `edit ${file}`,
      run: () => {
        original = fs.readFileSync(abs(root, file), 'utf8');
        const lines = original.split('\n');
        for (const e of list) lines[e.line - 1] = e.after;
        fs.writeFileSync(abs(root, file), lines.join('\n'));
      },
      undo: () => fs.writeFileSync(abs(root, file), original),
      rollback: list.map((e) => `sed -i ${q(`${e.line}s#docs/issues/#.scratch/#g`)} ${q(file)}`),
    });
  }
  if (plan.gitignore) {
    const g = plan.gitignore;
    let original = '';
    out.push({
      name: `remove ${g.file}:${g.line}`,
      run: () => {
        original = fs.readFileSync(abs(root, g.file), 'utf8');
        const lines = original.split('\n');
        lines.splice(g.line - 1, 1);
        fs.writeFileSync(abs(root, g.file), lines.join('\n'));
      },
      undo: () => fs.writeFileSync(abs(root, g.file), original),
      rollback: [`sed -i ${q(`${g.line}i ${g.text}`)} ${q(g.file)}`],
    });
  }
  return out;
}

export class ApplyFailed extends Error {}
export class UndoIncomplete extends Error { constructor(public remaining: string[]) { super('undo incomplete'); } }

// Re-plans, refuses on any conflict, then runs the steps in order; the first
// failure undoes the finished steps, newest first.
export function applyScratchMigration(root: string): void {
  const plan = planScratchMigration(root);
  if (plan.conflicts.length) throw new Error(plan.conflicts.join('\n'));
  const all = steps(root, plan);
  const done: Step[] = [];
  for (const s of all) {
    try { s.run(); done.push(s); } catch (e) {
      const left: string[] = [];
      for (const d of [...done, s].reverse()) {
        try { d.undo(); } catch { left.push(...d.rollback); }
      }
      if (left.length) throw new UndoIncomplete(left);
      throw new ApplyFailed(`failed at ${s.name}: ${(e as Error).message.split('\n')[0]}; undone`);
    }
  }
  try { fs.rmdirSync(abs(root, '.scratch')); } catch { /* git mv already removed it, or files remain */ }
}

function main(): void {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const root = args.find((a) => a !== '--apply');
  if (!root) { console.error('usage: scratch-migrate <root> [--apply]'); process.exit(2); }
  const plan = planScratchMigration(root);
  if (plan.conflicts.length) {
    console.error(['scratch-migrate: refused, repo unchanged:', ...plan.conflicts].join('\n'));
    process.exit(1);
  }
  if (!plan.moves.length) { console.log('scratch-migrate: nothing to move'); return; }
  if (apply) {
    applyScratchMigration(root);
    console.log(`moved ${plan.moves.length}, edited ${plan.edits.length}, committed nothing`);
    return;
  }
  for (const m of plan.moves) console.log(`move ${m.from} -> ${m.to} (${m.tracked ? 'git mv' : 'filesystem move'})`);
  for (const e of plan.edits) console.log(`edit ${e.file}:${e.line}: ${e.before} -> ${e.after}`);
  if (plan.gitignore) console.log(`remove ${plan.gitignore.file}:${plan.gitignore.line}: ${plan.gitignore.text}`);
  console.log('rollback:');
  for (const r of plan.rollback) console.log(r);
}

if (require.main === module) {
  try { main(); } catch (e) {
    if (e instanceof UndoIncomplete) {
      console.error(['scratch-migrate: undo incomplete; run:', ...e.remaining].join('\n'));
    } else if (e instanceof ApplyFailed) {
      console.error(`scratch-migrate: ${e.message}`);
    } else {
      console.error(['scratch-migrate: refused, repo unchanged:', ...String((e as Error).message).trim().split('\n')].join('\n'));
    }
    process.exit(1);
  }
}
