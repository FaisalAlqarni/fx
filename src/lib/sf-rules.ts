// Structure rules for `system-flow check`: caps, references, evidence, dash ban.
import { collect, originOf, parseHandle } from './sf-model.js';
import type { Item, ItemKind, Model, Problem } from './sf-model.js';

type Origin = Map<string, { file: string; pointer: string }>;

export const KIND_WORD: Record<ItemKind, string> = {
  node: 'node', edge: 'edge', group: 'group', participant: 'participant', message: 'message', step: 'step',
  sql: 'store row', cache: 'store row', memory: 'store row', files: 'store row', client: 'store row',
  catalogue: 'catalogue entry', inventory: 'inventory entry', rule: 'rule', bullet: 'bullet',
};
const MAX_PRIMARY = 12;
const DASH = /[\u2013\u2014]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function checkRules(model: Model, origin: Origin): Problem[] {
  const out: Problem[] = [];
  const at = (o: object, message: string, level: 'error' | 'warning' = 'error'): void => { out.push({ ...originOf(o), message, level }); };
  const entries = collect(model);
  const idOf = new Map<object, Item>(entries.map(({ o, item }) => [o, item]));
  const diagrams = new Map(model.levels.diagrams.map((d) => [d.id, d]));

  for (const { o, item } of entries) {
    if (item.evidence.length === 0 && !item.unconfirmed) at(o, `${KIND_WORD[item.kind]} ${item.id} has no evidence and is not unconfirmed`);
  }

  const nodeIds = new Set<string>();
  for (const d of model.levels.diagrams) {
    for (const n of d.nodes) nodeIds.add(n.id);
    const primary = d.nodes.filter((n) => n.primary !== false).length;
    if (primary > MAX_PRIMARY) at(d, `level ${d.id} has ${primary} primary nodes, at most ${MAX_PRIMARY}`);
    const here = new Set(d.nodes.map((n) => n.id));
    for (const e of d.edges) {
      for (const end of [e.from, e.to]) if (!here.has(end)) at(e, `edge ${idOf.get(e)?.id} names a missing node ${end}`);
    }
    for (const n of d.nodes) {
      if (n.children !== undefined) {
        const target = diagrams.get(n.children);
        if (!target) at(n, `node ${n.id} opens missing diagram ${n.children}`);
        else if (n.primary !== false && target.parent !== d.id) at(n, `node ${n.id} opens ${target.id}, whose parent is ${target.parent ?? 'none'}, not ${d.id}`);
      }
      if (!d.edges.some((e) => e.from === n.id || e.to === n.id)) at(n, `node ${n.id} in ${d.id} has no edge`);
    }
  }

  const sections = new Set(model.sections.map((s) => s.id));
  const actors = new Set(nodeIds);
  for (const q of model.sequences) {
    for (const p of q.participants) actors.add(p.id);
    const here = new Set(q.participants.map((p) => p.id));
    for (const m of q.messages) {
      for (const end of [m.from, m.to]) if (!here.has(end)) at(m, `message ${q.id}#${m.n} names a missing participant ${end}`);
    }
    if (!sections.has(q.chapter)) at(q, `sequence ${q.id} names a missing chapter ${q.chapter}`);
  }
  for (const fl of model.storeFlows) {
    if (!sections.has(fl.chapter)) at(fl, `flow ${fl.id} names a missing chapter ${fl.chapter}`);
    for (const st of fl.steps) if (!actors.has(st.actor)) at(st, `step ${fl.id}#${st.n} names a missing actor ${st.actor}`);
  }

  const ids = (list: { id: string }[]) => new Set(list.map((x) => x.id));
  const refs: [keyof NonNullable<Model['sections'][number]>, string, Set<string>][] = [
    ['diagrams', 'diagram', ids(model.levels.diagrams)],
    ['sequences', 'sequence', ids(model.sequences)],
    ['storeFlows', 'store flow', ids(model.storeFlows)],
    ['storeRefs', 'store row', new Set(Object.values(model.stores).flatMap((t) => t.map((r) => r.id)))],
    ['catalogueRefs', 'catalogue entry', ids(model.catalogue)],
    ['covers', 'inventory entry', ids(model.inventory)],
  ];
  for (const s of model.sections) {
    for (const [key, word, known] of refs) {
      for (const id of (s[key] as string[] | undefined) ?? []) if (!known.has(id)) at(s, `section ${s.id} names a missing ${word} ${id}`);
    }
  }

  const handle = (o: object, owner: string, h: string): void => {
    if (!parseHandle(h)) at(o, `${owner} names ${h}, which is not a handle (<kind>:<id>)`);
    else if (!origin.has(h)) at(o, `${owner} names a missing item ${h}`);
  };
  for (const q of model.questions) for (const h of q.items ?? []) handle(q, `question ${q.id}`, h);
  for (const c of model.corrections) handle(c, `correction ${c.id}`, c.item);

  for (const { o, item } of entries) {
    const label = (o as { label?: unknown }).label;
    if (typeof label === 'string' && ARABIC.test(label)) out.push({ ...originOf(o), pointer: `${originOf(o).pointer}/label`, message: `Arabic script in a label of ${KIND_WORD[item.kind]} ${item.id}`, level: 'warning' });
  }
  dashes(model, '', '', out);
  return out;
}

// Walks the merged model; an object with a recorded origin resets the file and pointer.
// shortcut: a string inside a primitive array merged from two fragments gets its merged index.
function dashes(v: unknown, file: string, pointer: string, out: Problem[]): void {
  if (typeof v === 'string') {
    if (DASH.test(v)) out.push({ file, pointer, message: 'em or en dash', level: 'error' });
  } else if (typeof v === 'object' && v !== null) {
    const known = originOf(v);
    if (known.file !== '') { file = known.file; pointer = known.pointer; }
    for (const [k, child] of Object.entries(v)) dashes(child, file, `${pointer}/${k}`, out);
  }
}
