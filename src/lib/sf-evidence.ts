// Evidence verifier: every cited path, range and symbol is checked against the
// root it names, from HEAD in a git root and from the working tree otherwise.
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import type { Item, Meta, Problem } from './sf-model.js';
import { KIND_WORD } from './sf-rules.js';
import type { FxJson } from './types.js';

// `missing` marks a root meta.roots names whose folder is not there: reported once, its entries skipped.
export type Root = { id: string; dir: string; git: boolean; head: string | null; remote: string | null; host: boolean; missing?: boolean };

const git = (dir: string, args: string[]): string | null => {
  try { return execFileSync('git', args, { cwd: dir, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
};

export const COMMIT = /^[0-9a-f]{40}$/;

// The one way a ref from the CLI or a fragment reaches git: a ref with a dash first or white space is refused,
// the rest is resolved to a full commit id, so git never sees the caller's text as an option.
export function resolveCommit(dir: string, ref: string): string | null {
  if (ref === '' || /^-|[\s\0]/.test(ref)) return null;
  const sha = git(dir, ['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`])?.trim();
  return sha !== undefined && COMMIT.test(sha) ? sha : null;
}

// Only a network address (URL or scp-style git@host:path) is a remote: archify rejects a local path as url-invalid,
// and a path names one machine's folders, so it never goes into the model.
const address = (remote: string | undefined): string | null =>
  remote !== undefined && (/^(?!file:)[a-z][a-z0-9+.-]*:\/\//i.test(remote) || /^[^/\s@]+@[^/\s:]+:/.test(remote)) ? remote : null;

// The folder relative roots resolve from: the main working tree when the host is a linked worktree
// (fx-docs runs in <repo>/.worktrees/<slug>, where ../<id> points nowhere), else the host itself.
export function rootsBase(hostRoot: string): string {
  const out = git(hostRoot, ['rev-parse', '--path-format=absolute', '--git-common-dir', '--git-dir'])?.trim().split('\n');
  return out?.length === 2 && out[0] !== out[1] ? path.dirname(out[0] as string) : hostRoot;
}

export function resolveRoots(hostRoot: string, meta: Meta, fx: FxJson['system_flow']): { roots: Map<string, Root>; problems: Problem[] } {
  const roots = new Map<string, Root>();
  const problems: Problem[] = [];
  const base = rootsBase(hostRoot);
  meta.roots.forEach((r, i) => {
    const mapped = i === 0 ? hostRoot : (fx?.roots ?? {})[r.id];
    const dir = path.resolve(base, mapped ?? path.join('..', r.id));
    const pointer = `/system_flow/roots/${r.id}`;
    if (!fs.existsSync(dir)) {
      problems.push({ file: '.fx.json', pointer, message: `root ${r.id} not found at ${dir}`, level: 'error' });
      roots.set(r.id, { id: r.id, dir, git: false, head: null, remote: null, host: i === 0, missing: true });
      return;
    }
    const isGit = fs.existsSync(path.join(dir, '.git'));
    if (!isGit) problems.push({ file: '.fx.json', pointer, message: `root ${r.id}: no git: stale and archify sources unavailable`, level: 'warning' });
    roots.set(r.id, {
      id: r.id, dir, git: isGit, host: i === 0,
      head: isGit ? git(dir, ['rev-parse', 'HEAD'])?.trim() ?? null : null,
      remote: address(isGit ? git(dir, ['remote', 'get-url', 'origin'])?.trim() ?? r.remote : r.remote),
    });
  });
  return { roots, problems };
}

// Per process: the tracked file list and the dirty file list of each git root, and each file read.
const tracked = new Map<string, Set<string>>();
const dirty = new Map<string, Set<string>>();
const reads = new Map<string, string | null>();

const trackedIn = (root: Root): Set<string> => {
  let s = tracked.get(root.dir);
  if (!s) tracked.set(root.dir, s = new Set((root.head ? git(root.dir, ['ls-tree', '-r', '--name-only', 'HEAD']) ?? '' : '').split('\n').filter(Boolean)));
  return s;
};
const dirtyIn = (root: Root): Set<string> => {
  let s = dirty.get(root.dir);
  if (!s) dirty.set(root.dir, s = new Set((git(root.dir, ['status', '--porcelain', '-z', '--untracked-files=no']) ?? '').split('\0').filter((l) => l.length > 3).map((l) => l.slice(3))));
  return s;
};

// The one place an evidence path meets a root's folder: null when it is absolute or leaves the root.
const inside = (root: Root, rel: string): string | null => {
  const full = path.resolve(root.dir, rel);
  return !path.isAbsolute(rel) && full.startsWith(root.dir + path.sep) ? full : null;
};

export function readCited(root: Root, file: string): string | null {
  const key = `${root.dir}\0${file}`;
  if (reads.has(key)) return reads.get(key) ?? null;
  let text: string | null;
  if (root.git) text = trackedIn(root).has(file) ? git(root.dir, ['show', `HEAD:${file}`]) : null;
  else {
    const full = inside(root, file);
    text = full !== null && fs.existsSync(full) && fs.statSync(full).isFile() ? fs.readFileSync(full, 'utf8') : null;
  }
  reads.set(key, text);
  return text;
}

const folderExists = (root: Root, dir: string): boolean => {
  const bare = dir.replace(/\/+$/, '');
  if (root.git) return [...trackedIn(root)].some((f) => f.startsWith(`${bare}/`));
  const full = inside(root, bare);
  return full !== null && fs.existsSync(full) && fs.statSync(full).isDirectory();
};

// Every range is inside 1..count and in order; returns the union of the cited lines, or null.
function cite(text: string, spec: string): string | null {
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const picked: string[] = [];
  for (const part of spec.split(',')) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!m) return null;
    const start = Number(m[1]);
    const end = m[2] === undefined ? start : Number(m[2]);
    if (start < 1 || end > lines.length || start > end) return null;
    picked.push(...lines.slice(start - 1, end));
  }
  return picked.join('\n');
}
const countLines = (text: string): number => text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

export function verifyEvidence(items: Item[], roots: Map<string, Root>, mode: 'check' | 'build'): Problem[] {
  const out: Problem[] = [];
  const warned = new Set<string>();
  for (const item of items) {
    item.evidence.forEach((e, i) => {
      if (!('path' in e)) return;
      const rootId = e.root ?? [...roots.values()].find((r) => r.host)?.id ?? '';
      const shown = `${rootId}/${e.path}${e.lines === undefined ? '' : `:${e.lines}`}${e.symbol === undefined ? '' : ` ${e.symbol}`}`;
      const at = { file: item.file, pointer: `${item.pointer}/evidence/${i}` };
      const fail = (test: string, whole = false): void => { out.push({ ...at, message: whole ? test : `${item.handle}: ${shown}: ${test}`, level: 'error' }); };
      // First, before any return: lines lands in generated Markdown however the rest of the entry fares.
      if (e.lines !== undefined && !/^\d+(?:-\d+)?(?: ?, ?\d+(?:-\d+)?)*$/.test(e.lines)) return fail('lines must be ranges such as 4, 1-4 or 1-4,9');
      const root = roots.get(rootId);
      if (!root) return fail(`evidence names root ${rootId}, not in meta.roots`);
      if (/[*{]/.test(e.path)) return fail('path with * or { is not allowed');
      if (/[\s`]/.test(e.path)) return fail('path with whitespace or a backtick cannot be written as an evidence line');
      if (e.symbol?.includes('`')) return fail('symbol with a backtick cannot be written as an evidence line');
      if (path.isAbsolute(e.path) || e.path.split('/').includes('..')) return fail('path must be relative to its root and hold no .. segment');
      if (root.missing) return;
      if (e.path.endsWith('/')) {
        if (item.kind !== 'catalogue' && item.kind !== 'inventory') return fail(`${KIND_WORD[item.kind]} ${item.id}: a folder entry is allowed only on catalogue and inventory entries`, true);
        if (!folderExists(root, e.path)) fail('folder missing');
        return;
      }
      if (e.lines === undefined || e.symbol === undefined) return fail('a file entry needs lines and symbol');
      const text = readCited(root, e.path);
      if (text === null) return fail('file missing');
      const cited = cite(text, e.lines);
      if (cited === null) return fail(`range outside file (${countLines(text)} lines)`);
      const last = e.symbol.split(/#|\.|::|\//).pop() ?? '';
      if (!cited.includes(e.symbol) && !(last !== '' && cited.includes(last))) return fail('symbol not in cited lines');
      if (root.git && dirtyIn(root).has(e.path) && !warned.has(`${rootId}\0${e.path}`)) {
        warned.add(`${rootId}\0${e.path}`);
        out.push({ ...at, message: `${item.handle}: ${shown}: ${e.path} has uncommitted changes`, level: mode === 'build' ? 'error' : 'warning' });
      }
    });
  }
  return out;
}
