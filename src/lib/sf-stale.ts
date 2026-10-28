// query, stale and verify: which model items to recheck, from the evidence lines they cite.
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { parseJson } from './json.js';
import { checkPath } from './doc-index.js';
import { collect, itemsOf, loadFragments, mergeFragments, writeAll } from './sf-model.js';
import type { Evidenced, Evidence, Fragment, Item, ItemKind, Verified } from './sf-model.js';
import { COMMIT, resolveCommit, resolveRoots } from './sf-evidence.js';
import type { Root } from './sf-evidence.js';
import { systemFlowConfig } from './sf-build.js';

export type StaleReason = 'shifted' | 'changed' | 'deleted' | 'unverified';

const git = (dir: string, args: string[]): string | null => {
  try { return execFileSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
};
const hostIdOf = (roots: Map<string, Root>): string => [...roots.values()].find((r) => r.host)?.id ?? '';
const fileEvidence = (e: Evidence): e is Extract<Evidence, { path: string }> => 'path' in e;
const norm = (p: string): string => p.replace(/^\.\//, '').replace(/\/+$/, '');

// The model as the lane left it, without the evidence checks: a cited file may be gone, and stale reports that.
export function loadModelItems(hostRoot: string, site: string): { items: Item[]; roots: Map<string, Root>; fragmentsDir: string } {
  const fragmentsDir = path.join(hostRoot, site, 'model', 'fragments');
  const loaded = loadFragments(fragmentsDir, hostRoot);
  const merged = mergeFragments(loaded.fragments);
  const bad = [...loaded.problems, ...merged.problems].find((p) => p.level === 'error');
  if (bad) throw new Error(`${bad.file}:${bad.pointer}: ${bad.message}`);
  const items = itemsOf(merged.model);
  // A verified value is a commit id, so none can start with a dash or reach git as an option.
  for (const i of items) for (const [id, v] of Object.entries(i.verified ?? {})) if (!COMMIT.test(v)) throw new Error(`${i.file}: ${i.handle}: verified ${id} is not a 40-character commit`);
  const { roots } = resolveRoots(hostRoot, merged.model.meta, systemFlowConfig(hostRoot).config);
  return { items, roots, fragmentsDir };
}

// stale and verify read every root from git at HEAD; a root they cannot read is an error, never an empty list.
export function unusableRoots(roots: Map<string, Root>): string[] {
  return [...roots.values()].flatMap((r) => (r.missing ? [`root ${r.id} not found at ${r.dir}`] : !r.git ? [`root ${r.id} at ${r.dir} is not a git root`] : !r.head ? [`root ${r.id}: git cannot read HEAD: ${r.refused ?? 'no commit'}`] : []));
}

// A query path is host-relative or `@<root id>/<path>`; a folder matches what lies under it, and an evidence folder matches what lies under it.
export function queryPaths(items: Item[], paths: string[], hostId: string): { handle: string; kind: ItemKind; file: string }[] {
  const qs = paths.map((p) => {
    const m = /^@([^/]+)\/(.*)$/.exec(p);
    return { root: m ? m[1] ?? '' : hostId, path: norm(m ? m[2] ?? '' : p) };
  });
  return items
    .filter((i) => i.evidence.some((e) => fileEvidence(e) && qs.some((q) => {
      const p = norm(e.path);
      return (e.root ?? hostId) === q.root && (p === q.path || p.startsWith(`${q.path}/`) || q.path.startsWith(`${p}/`));
    })))
    .map((i) => ({ handle: i.handle, kind: i.kind, file: i.file }));
}

export function changedPaths(root: Root, base: string): { changed: string[]; added: string[] } {
  const sha = resolveCommit(root.dir, base);
  if (sha === null) throw new Error(`${base} is not a commit in root ${root.id}`);
  const text = git(root.dir, ['diff', '--no-renames', '--name-status', `${sha}...HEAD`, '--']);
  if (text === null) throw new Error(`cannot diff ${base}...HEAD in root ${root.id}`);
  const changed: string[] = [];
  const added: string[] = [];
  for (const line of text.split('\n')) {
    const [status, ...rest] = line.split('\t');
    const p = rest.join('\t');
    if (!status || !p) continue;
    changed.push(p);
    if (status === 'A') added.push(p);
  }
  return { changed, added };
}

// Host: the given base. Other roots: their --base, else the oldest verified commit any item records for them.
export function diffBases(items: Item[], roots: Map<string, Root>, hostBase: string, given: Record<string, string>): { bases: Record<string, string>; unbased: string[] } {
  const bases: Record<string, string> = {};
  const unbased: string[] = [];
  for (const root of roots.values()) {
    if (root.host) { bases[root.id] = hostBase; continue; }
    const ref = given[root.id];
    if (ref !== undefined) { bases[root.id] = ref; continue; }
    const seen = [...new Set(items.map((i) => i.verified?.[root.id]).filter((s): s is string => s !== undefined))]
      .filter((s) => root.git && git(root.dir, ['cat-file', '-e', `${s}^{commit}`]) !== null);
    // --no-walk=sorted lists newest first, so the last one is the oldest.
    const oldest = seen.length === 0 ? undefined : git(root.dir, ['rev-list', '--no-walk=sorted', ...seen])?.trim().split('\n').pop();
    if (oldest) bases[root.id] = oldest; else unbased.push(root.id);
  }
  return { bases, unbased };
}

const RANK: Record<string, number> = { unchanged: 0, shifted: 1, changed: 2, deleted: 3 };

// Every range is checked on its own, so a change between two ranges does not count against either.
function worstOf(root: Root, sha: string, e: { path: string; lines?: string }): string {
  const p = norm(e.path);
  const ranges = e.lines === undefined ? [null] : e.lines.split(',').map((r) => /^(\d+)(?:-(\d+))?$/.exec(r.trim()));
  let worst = 'unchanged';
  for (const m of ranges) {
    const r = checkPath(root.dir, sha, p, m ? Number(m[1]) : null, m ? Number(m[2] ?? m[1]) : null);
    if (RANK[r] as number > (RANK[worst] as number)) worst = r;
  }
  return worst;
}

// Lists only items to recheck. The caller refuses a root that is missing, not a git root or without a commit (unusableRoots).
export function staleItems(items: Item[], roots: Map<string, Root>): Record<string, { handle: string; reason: StaleReason }[]> {
  const hostId = hostIdOf(roots);
  const out: Record<string, { handle: string; reason: StaleReason }[]> = {};
  const reachable = new Map<string, boolean>();
  for (const root of roots.values()) {
    out[root.id] = [];
    if (root.missing || !root.git || !root.head) continue;
    for (const item of items) {
      const cited = item.evidence.filter(fileEvidence).filter((e) => (e.root ?? hostId) === root.id);
      if (cited.length === 0) continue;
      const sha = item.verified?.[root.id];
      const key = `${root.id}\0${sha}`;
      if (sha !== undefined && !reachable.has(key)) reachable.set(key, git(root.dir, ['cat-file', '-e', `${sha}^{commit}`]) !== null);
      if (sha === undefined || !reachable.get(key)) { out[root.id]?.push({ handle: item.handle, reason: 'unverified' }); continue; }
      let worst = 'unchanged';
      for (const e of cited) { const r = worstOf(root, sha, e); if ((RANK[r] as number) > (RANK[worst] as number)) worst = r; }
      if (worst !== 'unchanged') out[root.id]?.push({ handle: item.handle, reason: worst as StaleReason });
    }
  }
  return out;
}

// Sets each named item's verified value to the HEAD of every root it cites, replacing an old value.
// An unknown handle throws before any file is written. Returns the handles that got a value.
export function verifyItems(hostRoot: string, fragmentsDir: string, handles: string[] | 'all', roots: Map<string, Root>): string[] {
  const names = fs.readdirSync(fragmentsDir).filter((n) => n.endsWith('.json'));
  const fragments: Fragment[] = names.map((file) => ({ file, data: parseJson(fs.readFileSync(path.join(fragmentsDir, file), 'utf8')) as Record<string, unknown> }));
  const all = collect(mergeFragments(fragments).model);
  const known = new Set(all.map(({ item }) => item.handle));
  for (const h of handles === 'all' ? [] : handles) if (!known.has(h)) throw new Error(`no item ${h}`);
  const hostId = hostIdOf(roots);
  const changed = new Set<string>();
  const done: string[] = [];
  for (const { item, o } of all) {
    if (handles !== 'all' && !handles.includes(item.handle)) continue;
    const stamp: Verified = {};
    for (const e of item.evidence.filter(fileEvidence)) {
      const head = roots.get(e.root ?? hostId)?.head;
      if (head) stamp[e.root ?? hostId] = head;
    }
    if (Object.keys(stamp).length === 0) continue;
    const target = o as Evidenced;
    const next = { ...target.verified, ...stamp };
    if (JSON.stringify(next) !== JSON.stringify(target.verified)) { target.verified = next; changed.add(item.file); }
    done.push(item.handle);
  }
  writeAll(hostRoot, [...changed].map((file) => [path.join(fragmentsDir, file), `${JSON.stringify(fragments.find((f) => f.file === file)?.data, null, 2)}\n`]));
  return done;
}
