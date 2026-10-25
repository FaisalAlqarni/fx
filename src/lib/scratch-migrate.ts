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
  byHand: string[];
  left: string[];
  conflicts: string[];
  rollback: string[];
}

const OLD = /(?<![\w.\/-])\.scratch\//g;
const IGNORE_LINES = new Set(['.scratch', '.scratch/', '/.scratch', '/.scratch/', '.scratch/*', '/.scratch/*']);
const git = (root: string, ...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
const abs = (root: string, rel: string) => path.join(root, rel);
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

function filesUnder(root: string, rel: string): string[] {
  const st = fs.lstatSync(abs(root, rel));
  if (!st.isDirectory()) return [rel];
  return fs.readdirSync(abs(root, rel)).sort().flatMap((n) => filesUnder(root, `${rel}/${n}`));
}

// Writes a temp file beside the target, then renames it over the target, so a failed
// write leaves the old file whole. A read-only target is refused, as a direct write would be.
function writeWhole(file: string, text: string): void {
  fs.accessSync(file, fs.constants.W_OK);
  const tmp = `${file}.fx-tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmp, text, { mode: fs.statSync(file).mode });
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

const isLink = (root: string, rel: string) => fs.lstatSync(abs(root, rel), { throwIfNoEntry: false })?.isSymbolicLink() ?? false;

export function planScratchMigration(root: string): ScratchPlan {
  const plan: ScratchPlan = { moves: [], edits: [], gitignore: null, byHand: [], left: [], conflicts: [], rollback: [] };
  if (isLink(root, '.scratch')) { plan.conflicts.push('.scratch is a symlink'); return plan; }
  if (!fs.existsSync(abs(root, '.scratch'))) return plan;
  const names = fs.readdirSync(abs(root, '.scratch')).sort();
  if (!names.length) return plan;
  const tracked = new Set(git(root, 'ls-files', '-z').split('\0').filter(Boolean));
  const problems: string[] = [];
  // Never read or write through a link: it could lead outside the repository.
  for (const p of ['docs', 'docs/issues', '.gitignore']) if (isLink(root, p)) problems.push(`${p} is a symlink`);
  if (git(root, 'status', '--porcelain', '--untracked-files=no', '--', '.scratch').trim()) {
    problems.push('.scratch has uncommitted changes to tracked files');
  }
  for (const name of names) {
    const from = `.scratch/${name}`;
    const to = `docs/issues/${name}`;
    if (fs.lstatSync(abs(root, from)).isSymbolicLink()) { problems.push(`${from} is a symlink`); continue; }
    const files = filesUnder(root, from);
    // Drafts and test material are not issues (ADR 0060 decision 3): they stay where they are.
    if (files.some((f) => !f.endsWith('.md'))) { plan.left.push(from); continue; }
    if (fs.existsSync(abs(root, to))) problems.push(`${to} already exists`);
    const n = files.filter((f) => tracked.has(f)).length;
    if (n && n < files.length) problems.push(`${from} mixes tracked and untracked files`);
    plan.moves.push({ from, to, tracked: n > 0 });
  }

  // Reads src now; the edit runs on file, which is src unless the move puts it elsewhere.
  const editsFor = (src: string, file: string) => fs.readFileSync(abs(root, src), 'utf8').split('\n').forEach((before, i) => {
    if (before.match(OLD)) plan.edits.push({ file, line: i + 1, before, after: before.replace(OLD, 'docs/issues/') });
  });

  // Pointers: the agent files, repo.md and tracked docs outside plans, ADRs and issues.
  const candidates = new Set(['CLAUDE.md', 'AGENTS.md', 'repo.md'].filter((f) => tracked.has(f)));
  for (const f of tracked) {
    if (f.startsWith('docs/') && f.endsWith('.md') && !/^docs\/(plans|adr|issues)\//.test(f)) candidates.add(f);
  }
  for (const f of [...candidates].sort()) {
    const p = abs(root, f);
    if (isLink(root, f)) { problems.push(`${f} is a symlink`); continue; }
    if (!fs.existsSync(p)) continue;
    editsFor(f, f);
  }

  // Moved issue files cite each other by .scratch/ path; the edit runs after the move, at the new path.
  for (const m of plan.moves) {
    for (const f of filesUnder(root, m.from).filter((x) => x.endsWith('.md') && fs.lstatSync(abs(root, x)).isFile())) {
      const file = m.to + f.slice(m.from.length);
      editsFor(f, file);
    }
  }

  // Any other file naming .scratch/ (.claude/CLAUDE.md, engine glossaries, .fx.json) is listed, not edited.
  const others = new Set([...tracked, '.fx.json'].filter((f) =>
    !candidates.has(f) && !f.startsWith('.scratch/') && !/^docs\/(plans|adr|issues)\//.test(f) && /\.(md|json)$/.test(f)));
  for (const f of [...others].sort()) {
    const st = fs.lstatSync(abs(root, f), { throwIfNoEntry: false });
    if (st?.isFile() && fs.readFileSync(abs(root, f), 'utf8').match(OLD)) plan.byHand.push(f);
  }

  const gi = abs(root, '.gitignore');
  // With entries left behind, the ignore line stays so they do not show up as untracked.
  if (!plan.left.length && fs.existsSync(gi)) {
    const lines = fs.readFileSync(gi, 'utf8').split('\n').map((l) => l.replace(/\r$/, '').trimEnd());
    const i = lines.findIndex((l) => IGNORE_LINES.has(l));
    if (i >= 0) plan.gitignore = { file: '.gitignore', line: i + 1, text: lines[i] as string };
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
    let made = ''; // the first directory mkdir created: docs or docs/issues, or '' when both existed
    const dropMade = () => {
      if (!made) return;
      fs.rmdirSync(abs(root, 'docs/issues'));
      if (made !== abs(root, 'docs/issues')) fs.rmdirSync(made);
      made = '';
    };
    out.push({
      name: `move ${m.from}`,
      run: () => {
        made = fs.mkdirSync(abs(root, 'docs/issues'), { recursive: true }) ?? '';
        try {
          if (m.tracked) git(root, 'mv', '--', m.from, m.to); else fs.renameSync(abs(root, m.from), abs(root, m.to));
        } catch (e) { dropMade(); throw e; }
      },
      undo: () => {
        fs.mkdirSync(abs(root, '.scratch'), { recursive: true });
        if (m.tracked) git(root, 'mv', '--', m.to, m.from); else fs.renameSync(abs(root, m.to), abs(root, m.from));
        dropMade();
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
        writeWhole(abs(root, file), lines.join('\n'));
      },
      undo: () => writeWhole(abs(root, file), original),
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
        writeWhole(abs(root, g.file), lines.join('\n'));
      },
      undo: () => writeWhole(abs(root, g.file), original),
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
      // The failed step cleans up after itself; only finished steps are undone.
      for (const d of [...done].reverse()) {
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
  for (const f of plan.left) console.log(`leave ${f}: not only Markdown`);
  for (const f of plan.byHand) console.log(`update by hand: ${f}`);
  if (plan.moves.some((m) => !m.tracked)) {
    console.log('warning: untracked or ignored .scratch/ content was kept out of git on purpose; read it for private notes or secrets before `git add -- docs/issues`');
  }
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
