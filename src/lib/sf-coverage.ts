// Coverage: which inventory entries the chapters cite, by overlapping range, folder, or `covers`.
import { collect } from './sf-model.js';
import type { Evidence, Item, Model } from './sf-model.js';

type Kind = 'engine' | 'flow' | 'store' | 'job' | 'integration';
export type Coverage = {
  entries: { id: string; kind: Kind; name: string; chapter: string | null }[];
  counts: Record<Kind, { covered: number; total: number }>;
};

// The items a chapter owns: bullets, its diagrams' nodes and edges, its sequences, flows, store rows and catalogue entries.
export function sectionItems(model: Model, sectionId: string): Item[] {
  const s = model.sections.find((x) => x.id === sectionId);
  if (!s) return [];
  const own = new Set<object>(s.bullets ?? []);
  for (const d of model.levels.diagrams.filter((x) => (s.diagrams ?? []).includes(x.id))) for (const o of [...d.nodes, ...d.edges]) own.add(o);
  for (const q of model.sequences.filter((x) => (s.sequences ?? []).includes(x.id) || x.chapter === s.id)) for (const o of [...q.participants, ...q.messages]) own.add(o);
  for (const f of model.storeFlows.filter((x) => (s.storeFlows ?? []).includes(x.id) || x.chapter === s.id)) for (const o of f.steps) own.add(o);
  const rows = new Set(s.storeRefs ?? []);
  for (const t of Object.values(model.stores)) for (const r of t) if (rows.has(r.id)) own.add(r);
  const cat = new Set(s.catalogueRefs ?? []);
  for (const c of model.catalogue) if (cat.has(c.id)) own.add(c);
  return collect(model).filter(({ o }) => own.has(o)).map(({ item }) => item);
}

// "63,67-245" as [start, end] pairs; null (the whole file) when a side has no lines.
const spans = (lines: string | undefined): [number, number][] | null => lines === undefined ? null
  : lines.split(',').map((p) => { const [a, b] = p.trim().split('-'); return [Number(a), Number(b ?? a)] as [number, number]; });

function overlaps(a: Evidence, b: Evidence, hostId: string): boolean {
  if (!('path' in a) || !('path' in b) || (a.root ?? hostId) !== (b.root ?? hostId)) return false;
  if (a.path.endsWith('/')) return b.path.startsWith(a.path);
  if (b.path.endsWith('/')) return a.path.startsWith(b.path);
  if (a.path !== b.path) return false;
  const x = spans(a.lines);
  const y = spans(b.lines);
  return x === null || y === null || x.some(([s1, e1]) => y.some(([s2, e2]) => s1 <= e2 && s2 <= e1));
}

export function coverage(model: Model): Coverage {
  const hostId = model.meta.roots[0]?.id ?? '';
  const chapters = model.sections.map((s) => ({ id: s.id, covers: new Set(s.covers ?? []), evidence: sectionItems(model, s.id).flatMap((i) => i.evidence) }));
  const counts = Object.fromEntries((['engine', 'flow', 'store', 'job', 'integration'] as Kind[]).map((k) => [k, { covered: 0, total: 0 }])) as Coverage['counts'];
  const entries = model.inventory.map((e) => {
    const hit = chapters.find((c) => c.covers.has(e.id) || e.evidence.some((a) => c.evidence.some((b) => overlaps(a, b, hostId))));
    counts[e.kind].total++;
    if (hit) counts[e.kind].covered++;
    return { id: e.id, kind: e.kind, name: e.name, chapter: hit?.id ?? null };
  });
  return { entries, counts };
}
