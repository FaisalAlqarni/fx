// One reverse index from code path to the doc claims citing it, cached in
// .fx/docs-index.json, plus the stale check's first pass.
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { parseJson } from './json.js';
import { Claim, Problem, parseDoc } from './doc-evidence.js';

export type DocIndex = { version: 1; claims: Claim[]; problems: Problem[]; verified: Record<string, string | null> };
export type Stale = { claim: Claim; verdict: 'free' | 'recheck' | 'skip'; reason: 'unchanged' | 'changed' | 'shifted' | 'deleted' | 'unverified' | 'owner' | 'superseded' };

const SKIP_DIRS = new Set(['plans', 'issues', 'html']);
const emptyIndex = (): DocIndex => ({ version: 1, claims: [], problems: [], verified: {} });

// Every docs/**/*.md outside docs/plans, docs/issues and docs/html, sorted; symlinks are not followed.
function listDocs(root: string): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const next = `${rel}/${e.name}`;
      if (e.isDirectory() && !(rel === 'docs' && SKIP_DIRS.has(e.name))) walk(next);
      else if (e.isFile() && e.name.endsWith('.md')) out.push(next);
    }
  };
  if (fs.existsSync(path.join(root, 'docs'))) walk('docs');
  return out.sort();
}

export function buildIndex(root: string): DocIndex {
  const index = emptyIndex();
  for (const doc of listDocs(root)) {
    const parsed = parseDoc(doc, fs.readFileSync(path.join(root, doc), 'utf8'));
    index.claims.push(...parsed.claims);
    index.problems.push(...parsed.problems);
    index.verified[doc] = parsed.verified;
  }
  return index;
}

// Builds the index and overwrites .fx/docs-index.json whole; writes nothing when there is no doc to read.
export function writeIndex(root: string): DocIndex {
  const index = buildIndex(root);
  if (Object.keys(index.verified).length === 0) return index;
  fs.mkdirSync(path.join(root, '.fx'), { recursive: true });
  fs.writeFileSync(path.join(root, '.fx', 'docs-index.json'), JSON.stringify(index, null, 2) + '\n');
  return index;
}

function readCached(file: string): DocIndex | null {
  try {
    const v = parseJson(fs.readFileSync(file, 'utf8'));
    if (typeof v !== 'object' || v === null || !('version' in v) || v.version !== 1) return null;
    if (!('claims' in v) || !Array.isArray(v.claims) || !('problems' in v) || !Array.isArray(v.problems)) return null;
    if (!('verified' in v) || typeof v.verified !== 'object' || v.verified === null) return null;
    // shortcut: the cache is trusted past this shape check; a hand-edited file is overwritten on the next doc change.
    return { version: 1, claims: v.claims, problems: v.problems, verified: { ...v.verified } };
  } catch { return null; }
}

export function loadIndex(root: string): DocIndex {
  const docs = listDocs(root);
  if (docs.length === 0) return emptyIndex();
  const file = path.join(root, '.fx', 'docs-index.json');
  const cached = readCached(file);
  if (cached) {
    const built = fs.statSync(file).mtimeMs;
    const sameDocs = JSON.stringify(Object.keys(cached.verified)) === JSON.stringify(docs);
    if (sameDocs && docs.every((d) => fs.statSync(path.join(root, d)).mtimeMs <= built)) return cached;
  }
  return writeIndex(root);
}

const norm = (p: string): string => p.replace(/^\.\//, '').replace(/\/+$/, '');

export function queryIndex(index: DocIndex, paths: string[]): Claim[] {
  const qs = paths.map(norm);
  const hit = (c: Claim): boolean => c.status === 'current' && c.evidence.some((e) =>
    e.type === 'path' && qs.some((q) => e.path === q || e.path.startsWith(`${q}/`) || q.startsWith(`${e.path}/`)));
  return index.claims.filter(hit).sort((a, b) => (a.doc < b.doc ? -1 : a.doc > b.doc ? 1 : a.line - b.line));
}

function git(root: string, args: string[]): string | null {
  try { return execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
}

const RANK = { unchanged: 0, shifted: 1, changed: 2, deleted: 3 } as const;
type Item = keyof typeof RANK;

function checkPath(root: string, verified: string, p: string, start: number | null, end: number | null): Item {
  if (git(root, ['cat-file', '-e', `HEAD:${p}`]) === null) return 'deleted';
  if (git(root, ['cat-file', '-e', `${verified}:${p}`]) === null) return 'changed';
  const diff = git(root, ['diff', '--no-color', '--no-renames', '-U0', verified, 'HEAD', '--', p]);
  if (diff === null) return 'changed';
  let shift = 0;
  for (const m of diff.matchAll(/^@@ -(\d+)(?:,(\d+))? \+\d+(?:,(\d+))? @@/gm)) {
    const a = Number(m[1]);
    const oldCount = m[2] === undefined ? 1 : Number(m[2]);
    const newCount = m[3] === undefined ? 1 : Number(m[3]);
    if (start === null || end === null) return 'changed';
    // An insertion (oldCount 0) lands after line a; a replacement covers a..a+oldCount-1.
    const first = oldCount === 0 ? a + 1 : a;
    const last = oldCount === 0 ? a : a + oldCount - 1;
    if (oldCount === 0 ? a >= start && a < end : first <= end && last >= start) return 'changed';
    if (last < start) shift += newCount - oldCount;
  }
  return shift !== 0 ? 'shifted' : 'unchanged';
}

export function stalePassOne(root: string, index: DocIndex): Stale[] {
  const reachable = new Map<string, boolean>();
  return index.claims.map((claim): Stale => {
    if (claim.status === 'superseded') return { claim, verdict: 'skip', reason: 'superseded' };
    const paths = claim.evidence.filter((e) => e.type === 'path');
    if (paths.length === 0) return { claim, verdict: 'skip', reason: 'owner' };
    const sha = index.verified[claim.doc] ?? null;
    if (sha !== null && !reachable.has(sha)) reachable.set(sha, git(root, ['cat-file', '-e', `${sha}^{commit}`]) !== null);
    if (sha === null || !reachable.get(sha)) return { claim, verdict: 'recheck', reason: 'unverified' };
    let worst: Item = 'unchanged';
    for (const e of paths) {
      const r = checkPath(root, sha, e.path, e.start, e.end);
      if (RANK[r] > RANK[worst]) worst = r;
    }
    return worst === 'unchanged' ? { claim, verdict: 'free', reason: 'unchanged' } : { claim, verdict: 'recheck', reason: worst };
  });
}
