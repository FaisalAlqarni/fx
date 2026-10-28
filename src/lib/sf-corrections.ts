// Corrections log: a fact, label, store row or flow step that changed or vanished since HEAD
// needs a corrections entry that HEAD does not already hold.
import * as path from 'path';
import { execFileSync } from 'child_process';
import { parseJson } from './json.js';
import { readCited } from './sf-evidence.js';
import type { Root } from './sf-evidence.js';
import { collect, mergeFragments } from './sf-model.js';
import type { Fragment, Item, Model, Problem } from './sf-model.js';

// Every fragment file committed under fragmentsDir at HEAD, merged. No HEAD or no fragments gives an empty model.
export function headModel(host: Root, fragmentsDir: string): { model: Model; items: Item[] } {
  const fragments: Fragment[] = [];
  if (host.git && host.head) {
    const dir = path.relative(host.dir, path.resolve(host.dir, fragmentsDir)).split(path.sep).join('/');
    let names: string[] = [];
    try { names = execFileSync('git', ['ls-tree', '--name-only', 'HEAD', `${dir}/`], { cwd: host.dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter((n) => n.endsWith('.json')).sort(); } catch { /* no such folder at HEAD */ }
    for (const file of names) {
      const text = readCited(host, file);
      // A HEAD fragment that no longer parses cannot be compared; skip it.
      try { if (text !== null) fragments.push({ file, data: parseJson(text) as Record<string, unknown> }); } catch { /* skipped */ }
    }
  }
  const merged = mergeFragments(fragments);
  return { model: merged.model, items: collect(merged.model).map(({ item }) => item) };
}

const SKIP = new Set(['id', 'evidence', 'verified', 'unconfirmed']);
const STEP_TEXT = ['actor', 'op', 'store', 'key', 'when'];
// The compared text of one item, or null for a kind the log does not cover.
function textOf(item: Item, o: Record<string, unknown>): string | null {
  const pick = (keys: string[]): string => JSON.stringify(keys.map((k) => o[k] ?? null));
  switch (item.kind) {
    case 'bullet': return pick(['text']);
    case 'node': case 'edge': return pick(['label', 'short']);
    case 'step': return pick(STEP_TEXT);
    case 'sql': case 'cache': case 'memory': case 'files': case 'client':
      return pick(Object.keys(o).filter((k) => !SKIP.has(k)).sort());
    default: return null;
  }
}

export function checkCorrections(head: Item[], headM: Model, now: Item[], nowM: Model): Problem[] {
  const objects = (m: Model) => new Map(collect(m).map(({ item, o }) => [item.handle, o as Record<string, unknown>]));
  const oldO = objects(headM);
  const nowO = objects(nowM);
  const nowItem = new Map(now.map((i) => [i.handle, i]));
  const oldIds = new Set(headM.corrections.map((c) => c.id));
  const covered = new Set(nowM.corrections.filter((c) => !oldIds.has(c.id)).map((c) => c.item));
  const problems: Problem[] = [];
  for (const item of head) {
    const before = textOf(item, oldO.get(item.handle) ?? {});
    if (before === null || covered.has(item.handle)) continue;
    const kept = nowItem.get(item.handle);
    // A removed item points at its place at HEAD, a changed one at its place now.
    if (!kept) problems.push({ file: item.file, pointer: item.pointer, message: `${item.handle} removed since HEAD with no corrections entry`, level: 'error' });
    else if (before !== textOf(kept, nowO.get(item.handle) ?? {})) problems.push({ file: kept.file, pointer: kept.pointer, message: `${item.handle} changed since HEAD with no corrections entry`, level: 'error' });
  }
  return problems;
}
