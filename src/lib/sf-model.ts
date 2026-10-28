// The system model: types, fragment loading, merge and the item list.
// The JSON Schema in references/system-flow/system-model.schema.json is the
// one copy of the format; these types follow it.
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from './json.js';
import { validate } from './sf-schema.js';

export type FileEvidence = { root?: string; path: string; lines?: string; symbol?: string };
export type OwnerEvidence = { owner: string; question?: string };
export type Evidence = FileEvidence | OwnerEvidence;
export type Verified = Record<string, string>; // root id -> 40-hex commit
export type Evidenced = { evidence: Evidence[]; unconfirmed?: boolean; verified?: Verified };
export type Node = Evidenced & { id: string; label: string; kind: string; role: string; children?: string; primary?: boolean };
export type Edge = Evidenced & { from: string; to: string; label: string; short?: string; mode?: 'sync' | 'async' };
export type Group = Evidenced & { id: string; label: string; members: string[]; groups?: string[] };
export type Diagram = { id: string; level: 0 | 1 | 2 | 3; parent?: string; title: string; summary: string; groups: Group[]; nodes: Node[]; edges: Edge[]; layout?: Record<string, { col: number; row: number }> };
export type Root = { id: string; label?: string; remote?: string };
export type Meta = { title?: string; date?: string; purpose?: string; roots: Root[]; conventions?: string[] };
export type Participant = Evidenced & { id: string; label: string; kind?: string; role?: string };
export type Message = Evidenced & { n: number; from: string; to: string; label: string; mode?: 'sync' | 'async'; note?: string };
export type Sequence = { id: string; title: string; chapter: string; participants: Participant[]; messages: Message[]; notes?: string[] };
export type SqlRow = Evidenced & { id: string; table?: string; database?: string; purpose?: string; writtenBy?: string; readBy?: string; when?: string };
export type CacheRow = Evidenced & { id: string; pattern?: string; owner?: string; value?: string; ttl?: string; writtenBy?: string; readBy?: string; when?: string };
export type MemoryRow = Evidenced & { id: string; owner?: string; name?: string; holds?: string; key?: string; lifetime?: string };
export type FilesRow = Evidenced & { id: string; owner?: string; path?: string; purpose?: string; writtenBy?: string; readBy?: string };
export type Stores = { sql: SqlRow[]; cache: CacheRow[]; memory: MemoryRow[]; files: FilesRow[]; client: FilesRow[] };
export type StoreName = keyof Stores;
export type FlowStep = Evidenced & { n: number; actor: string; op: 'read' | 'write' | 'delete'; store: StoreName; key?: string; when?: string };
export type StoreFlow = { id: string; trigger: string; chapter: string; steps: FlowStep[] };
export type CatalogueEntry = Evidenced & { id: string; kind: 'stream' | 'gateway' | 'queue' | 'scheduler' | 'cache' | 'integration' | 'component'; name: string; role?: string; owner?: string; connects?: string[] };
export type Rule = Evidenced & { id: string; text: string; adr?: { root?: string; path: string }; decision?: string };
export type InventoryEntry = Evidenced & { id: string; kind: 'engine' | 'flow' | 'store' | 'job' | 'integration'; name: string };
export type Bullet = Evidenced & { id: string; text: string };
export type Section = { id: string; title: string; question: string; folder?: string; bullets?: Bullet[]; diagrams?: string[]; sequences?: string[]; storeFlows?: string[]; storeRefs?: string[]; catalogueRefs?: string[]; covers?: string[] };
export type Question = { id: string; text: string; recommended?: string; answer?: string; date?: string; items?: string[] };
export type Correction = { id: string; date: string; item: string; before?: string; after?: string; reason: 'owner' | 'stale' | 'audit'; evidence?: Evidence[] };
export type Model = { schemaVersion: 1; meta: Meta; levels: { root: string; diagrams: Diagram[] }; sequences: Sequence[]; stores: Stores; storeFlows: StoreFlow[]; catalogue: CatalogueEntry[]; rules: Rule[]; inventory: InventoryEntry[]; sections: Section[]; questions: Question[]; corrections: Correction[] };
export type ItemKind = 'node' | 'edge' | 'group' | 'participant' | 'message' | 'sql' | 'cache' | 'memory' | 'files' | 'client' | 'step' | 'catalogue' | 'inventory' | 'rule' | 'bullet';
export type Item = { id: string; kind: ItemKind; handle: string; evidence: Evidence[]; verified?: Verified; unconfirmed?: boolean; file: string; pointer: string };
export type Problem = { file: string; pointer: string; message: string; level: 'error' | 'warning' };
export type Fragment = { file: string; data: Record<string, unknown> };

const STORE_KINDS: ItemKind[] = ['sql', 'cache', 'memory', 'files', 'client'];
// Store rows share one handle prefix across the five tables.
export function handleOf(kind: ItemKind, id: string): string {
  return `${STORE_KINDS.includes(kind) ? 'store' : kind}:${id}`;
}

const PREFIXES = ['diagram', 'node', 'edge', 'group', 'seq', 'participant', 'message', 'flow', 'step', 'store', 'bullet', 'catalogue', 'inventory', 'rule', 'section', 'question', 'correction'];
// The prefix ends at the first colon, so edge:engine:api>db is the edge engine:api>db.
export function parseHandle(h: string): { prefix: string; id: string } | null {
  const at = h.indexOf(':');
  const prefix = h.slice(0, at);
  const id = h.slice(at + 1);
  return at > 0 && id !== '' && PREFIXES.includes(prefix) ? { prefix, id } : null;
}

export const SCHEMA_VERSION = 1;
export const ID_PATTERN = '^[a-z0-9][a-z0-9-]*$';

const SCHEMA_FILE = path.join(__dirname, '..', 'references', 'system-flow', 'system-model.schema.json');

// The design's named fragments load first, in this order, then area fragments by name,
// so a duplicate id is reported on the area fragment, not on level0.json.
const NAMED = ['meta.json', 'level0.json', 'chapters.json', 'rules.json', 'inventory.json', 'questions.json', 'corrections.json'];
const fragmentOrder = (names: string[]): string[] => [...NAMED.filter((n) => names.includes(n)), ...names.filter((n) => !NAMED.includes(n)).sort()];

// Only fragments that pass the schema come back, so merge never sees a malformed one.
export function loadFragments(dir: string, hostRoot: string): { fragments: Fragment[]; problems: Problem[] } {
  const schema = parseJson(fs.readFileSync(SCHEMA_FILE, 'utf8')) as object;
  const fragments: Fragment[] = [];
  const problems: Problem[] = [];
  if (!fs.existsSync(dir)) throw new Error(`no fragments folder at ${path.relative(hostRoot, dir)}`);
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.json'));
  if (!names.includes('meta.json')) problems.push({ file: path.relative(hostRoot, path.join(dir, 'meta.json')), pointer: '', message: 'file not found', level: 'error' });
  for (const name of fragmentOrder(names)) {
    const file = path.relative(hostRoot, path.join(dir, name));
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    let data: Record<string, unknown>;
    try {
      data = parseJson(text) as Record<string, unknown>;
    } catch (e) {
      problems.push({ file, pointer: '', message: `invalid JSON: ${(e as Error).message}`, level: 'error' });
      continue;
    }
    const errors = validate(schema, data);
    // The schema has passed, so data is an object and schemaVersion an integer when present.
    if (errors.length === 0 && name === 'meta.json' && data.schemaVersion === undefined) errors.push({ pointer: '', message: 'required property schemaVersion missing' });
    if (errors.length === 0 && (data.schemaVersion as number) > SCHEMA_VERSION) {
      errors.push({ pointer: '/schemaVersion', message: `schemaVersion ${data.schemaVersion} is newer than this CLI (${SCHEMA_VERSION})` });
    }
    for (const e of errors) problems.push({ file, pointer: e.pointer, message: e.message, level: 'error' });
    if (errors.length === 0) fragments.push({ file, data });
  }
  return { fragments, problems };
}

const emptyModel = (): Model => ({
  schemaVersion: 1, meta: { roots: [] }, levels: { root: '', diagrams: [] }, sequences: [],
  stores: { sql: [], cache: [], memory: [], files: [], client: [] }, storeFlows: [], catalogue: [], rules: [],
  inventory: [], sections: [], questions: [], corrections: [],
});

// Arrays concatenate, objects merge key by key, and the first scalar wins.
function mergeInto(into: Record<string, unknown>, from: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(from)) {
    // A JSON "__proto__" key is an own property; writing through it would reach Object.prototype.
    if (k === '__proto__') continue;
    const cur = Object.hasOwn(into, k) ? into[k] : undefined;
    if (Array.isArray(cur) && Array.isArray(v)) into[k] = [...cur, ...v];
    else if (isObject(cur) && isObject(v)) mergeInto(cur, v);
    else if (cur === undefined || cur === '') into[k] = v;
  }
}
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Where each merged object came from, so items and problems name the fragment file and pointer.
const origin = new WeakMap<object, { file: string; pointer: string }>();
function recordOrigin(v: unknown, file: string, pointer: string): void {
  if (typeof v !== 'object' || v === null) return;
  origin.set(v, { file, pointer });
  for (const [k, child] of Object.entries(v)) recordOrigin(child, file, `${pointer}/${k}`);
}
export const originOf = (o: object) => origin.get(o) ?? { file: '', pointer: '' };

export function mergeFragments(fragments: Fragment[]): { model: Model; problems: Problem[]; origin: Map<string, { file: string; pointer: string }> } {
  const model = emptyModel();
  for (const f of fragments) {
    recordOrigin(f.data, f.file, '');
    mergeInto(model as unknown as Record<string, unknown>, f.data);
  }
  const origin = new Map<string, { file: string; pointer: string }>();
  for (const { handle, o } of declared(model)) if (!origin.has(handle)) origin.set(handle, originOf(o));
  return { model, problems: duplicates(model), origin };
}

// Every declared handle with its object: items plus the structural kinds.
function declared(model: Model): { handle: string; o: object }[] {
  const declared: { handle: string; o: object }[] = collect(model).map(({ item, o }) => ({ handle: item.handle, o }));
  const add = (prefix: string, list: { id: string }[]) => { for (const o of list) declared.push({ handle: `${prefix}:${o.id}`, o }); };
  add('diagram', model.levels.diagrams);
  add('seq', model.sequences);
  add('flow', model.storeFlows);
  add('section', model.sections);
  add('question', model.questions);
  add('correction', model.corrections);
  add('root', model.meta.roots);
  return declared;
}

// Ids are unique per kind: the second definition is the problem, naming the first one's file.
function duplicates(model: Model): Problem[] {
  const seen = new Map<string, string>();
  const problems: Problem[] = [];
  for (const { handle, o } of declared(model)) {
    const first = seen.get(handle);
    const at = originOf(o);
    if (first === undefined) seen.set(handle, at.file);
    else problems.push({ ...at, message: `${handle.replace(':', ' ')} is also defined in ${first}`, level: 'error' });
  }
  return problems;
}

export function itemsOf(model: Model): Item[] {
  return collect(model).map(({ item }) => item);
}

export function collect(model: Model): { item: Item; o: object }[] {
  const out: { item: Item; o: object }[] = [];
  const add = (kind: ItemKind, id: string, o: Evidenced): void => {
    out.push({ o, item: { id, kind, handle: handleOf(kind, id), evidence: o.evidence ?? [], verified: o.verified, unconfirmed: o.unconfirmed, ...originOf(o) } });
  };
  for (const d of model.levels.diagrams) {
    for (const g of d.groups) add('group', g.id, g);
    for (const n of d.nodes) add('node', n.id, n);
    // A repeated pair in one diagram gets #2, #3 in order.
    const pairs = new Map<string, number>();
    for (const e of d.edges) {
      const pair = `${d.id}:${e.from}>${e.to}`;
      const n = (pairs.get(pair) ?? 0) + 1;
      pairs.set(pair, n);
      add('edge', n === 1 ? pair : `${pair}#${n}`, e);
    }
  }
  for (const q of model.sequences) {
    for (const p of q.participants) add('participant', `${q.id}.${p.id}`, p);
    for (const m of q.messages) add('message', `${q.id}#${m.n}`, m);
  }
  for (const fl of model.storeFlows) for (const st of fl.steps) add('step', `${fl.id}#${st.n}`, st);
  for (const c of model.catalogue) add('catalogue', c.id, c);
  for (const i of model.inventory) add('inventory', i.id, i);
  for (const r of model.rules) add('rule', r.id, r);
  for (const t of STORE_KINDS) for (const r of model.stores[t as StoreName]) add(t, r.id, r);
  for (const s of model.sections) for (const b of s.bullets ?? []) add('bullet', b.id, b);
  return out;
}

// Shared by the layout step (task 05) and the browser kit (task 08).
export type LayoutLine = { key: string; width: number; height: number; direction: 'RIGHT' | 'DOWN'; crossings: number; nodeHits: number; nodes: number; arrows: number; notDrawn: number; unlabelled: number };
export type FigureSpec = {
  key: string; // level-<diagram id> | seq-<sequence id> | flow-<flow id>
  kind: 'level' | 'sequence' | 'flow';
  width: number; height: number; direction: 'RIGHT' | 'DOWN';
  nodes: { id: string; x: number; y: number; w: number; h: number; lines: string[]; kind: string; primary: boolean; store: boolean }[];
  edges: { id: string; d: string; mode: 'sync' | 'async'; label: { x: number; y: number; w: number; h: number; text: string } | null }[];
  groups: { id: string; label: string; x: number; y: number; w: number; h: number }[];
  steps: { edges: string[]; nodes: string[]; caption: string }[]; // caption is plain text holding the first evidence `path:lines`
  notDrawn: string[]; // edge ids
};

// The values build adds: <root HEAD> for each root an item cites and its `verified` lacks. An existing value is never replaced.
export function planStamps(items: Item[], roots: Map<string, { head: string | null; host: boolean }>): Map<string, Verified> {
  const hostId = [...roots].find(([, r]) => r.host)?.[0] ?? '';
  const stamps = new Map<string, Verified>();
  for (const item of items) {
    const add: Verified = {};
    for (const e of item.evidence) {
      if (!('path' in e)) continue;
      const id = e.root ?? hostId;
      const head = roots.get(id)?.head;
      if (head && item.verified?.[id] === undefined) add[id] = head;
    }
    if (Object.keys(add).length > 0) stamps.set(item.handle, add);
  }
  return stamps;
}

// Writes the planned values into the fragment files that hold those items; returns the files it changed.
// Only a file that gained a value is rewritten (2-space JSON, as the fixtures and the lane write it).
export function stampVerified(fragmentsDir: string, stamps: Map<string, Verified>): string[] {
  const names = fs.readdirSync(fragmentsDir).filter((n) => n.endsWith('.json'));
  const fragments: Fragment[] = names.map((file) => ({ file, data: parseJson(fs.readFileSync(path.join(fragmentsDir, file), 'utf8')) as Record<string, unknown> }));
  const model = mergeFragments(fragments).model;
  const changed = new Set<string>();
  // Merge shares the item objects with the fragment data, so setting `verified` here edits what is written below.
  for (const { item, o } of collect(model)) {
    const add = stamps.get(item.handle);
    if (!add) continue;
    const target = o as Evidenced;
    const fresh = Object.fromEntries(Object.entries(add).filter(([id]) => target.verified?.[id] === undefined));
    if (Object.keys(fresh).length === 0) continue;
    target.verified = { ...target.verified, ...fresh };
    changed.add(item.file);
  }
  return [...changed].sort().map((file) => {
    const full = path.join(fragmentsDir, file);
    fs.writeFileSync(full, `${JSON.stringify(fragments.find((f) => f.file === file)?.data, null, 2)}\n`);
    return full;
  });
}
