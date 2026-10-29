// Structure rules for `system-flow check`: caps, references, evidence, dash ban.
import * as path from 'path';
import { collect, originOf, parseHandle } from './sf-model.js';
import type { Item, ItemKind, Model, Problem } from './sf-model.js';
import { adrStatus } from './doc-evidence.js';
import { readCited } from './sf-evidence.js';
import type { Root } from './sf-evidence.js';

type Origin = Map<string, { file: string; pointer: string }>;

export const KIND_WORD: Record<ItemKind, string> = {
  node: 'node', edge: 'edge', group: 'group', participant: 'participant', message: 'message', step: 'step',
  sql: 'store row', cache: 'store row', memory: 'store row', files: 'store row', client: 'store row',
  catalogue: 'catalogue entry', inventory: 'inventory entry', rule: 'rule', bullet: 'bullet', term: 'glossary term', code: 'code map entry',
};
const MAX_PRIMARY = 12;
const DASH = /[\u2013\u2014]/;
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function checkRules(model: Model, origin: Origin): Problem[] {
  const out: Problem[] = [];
  const at = (o: object, message: string, level: 'error' | 'warning' = 'error'): void => { out.push({ ...originOf(o), message, level }); };
  for (const s of model.sections) {
    for (const f of ['title', 'question'] as const) if (s[f] === undefined) at(s, `section ${s.id}: ${f} missing`);
  }
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
  // A sequence or flow page past the first is <name>-p<n>, so such an id would name another diagram's page.
  const PAGED = /-p\d+$/;
  const actors = new Set(nodeIds);
  for (const q of model.sequences) {
    for (const p of q.participants) actors.add(p.id);
    const here = new Set(q.participants.map((p) => p.id));
    for (const m of q.messages) {
      for (const end of [m.from, m.to]) if (!here.has(end)) at(m, `message ${q.id}#${m.n} names a missing participant ${end}`);
    }
    if (!sections.has(q.chapter)) at(q, `sequence ${q.id} names a missing chapter ${q.chapter}`);
    if (PAGED.test(q.id)) at(q, `sequence ${q.id} ends in -p and digits, which deep diagram page names use`);
  }
  for (const fl of model.storeFlows) {
    if (!sections.has(fl.chapter)) at(fl, `flow ${fl.id} names a missing chapter ${fl.chapter}`);
    if (PAGED.test(fl.id)) at(fl, `flow ${fl.id} ends in -p and digits, which deep diagram page names use`);
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

// A rule fails when its ADR is gone or out of force (the status test docs-index applies).
export function checkRuleAdrs(model: Model, roots: Map<string, Root>): Problem[] {
  const out: Problem[] = [];
  const hostId = [...roots.values()].find((r) => r.host)?.id ?? '';
  for (const r of model.rules) {
    if (!r.adr) continue;
    // The path becomes a Markdown link target in rules-in-force.md, so it is held to the evidence path rules.
    const p = r.adr.path;
    const bad = /[\s()<>`]/.test(p) ? 'path with whitespace, ( ) < > or a backtick cannot be written as a link'
      : path.isAbsolute(p) || p.split('/').includes('..') ? 'path must be relative to its root and hold no .. segment' : null;
    if (bad !== null) { out.push({ ...originOf(r), message: `rule ${r.id}: ADR ${p}: ${bad}`, level: 'error' }); continue; }
    const root = roots.get(r.adr.root ?? hostId);
    if (!root) { out.push({ ...originOf(r), message: `rule ${r.id}: ADR names root ${r.adr.root}, not in meta.roots`, level: 'error' }); continue; }
    if (root.missing || root.refused !== undefined) continue;
    const text = readCited(root, r.adr.path);
    const why = text === null ? 'not found' : adrStatus(text) === 'superseded' ? 'is superseded' : null;
    const problem = why ?? (text === null ? null : decisionProblem(text, r.decision));
    if (problem !== null) out.push({ ...originOf(r), message: `rule ${r.id}: ADR ${r.adr.path} ${problem}`, level: 'error' });
  }
  return out;
}

// A rule names a decision the ADR really has, so a summary written from a clipped read still points at a real item.
function decisionProblem(text: string, decision: string | undefined): string | null {
  const numbers = decisionNumbers(text);
  if (decision !== undefined && /^\d+$/.test(decision)) return numbers.has(decision) ? null : `has no decision ${decision}`;
  return numbers.size === 0 ? null : `numbers its decisions; cite one by number, not ${decision ?? 'none'}`;
}

// Top-level numbered items in the first Decision heading's own section (MADR's Decision Drivers is not one), its deeper
// subsections included except a Consequences one; the section ends at the next heading of its level or higher, and fenced lines are skipped.
// shortcut: numbers continued in a later section (fx's own "Still in force") are not seen; widen the scan when an ADR cites one.
function decisionNumbers(text: string): Set<string> {
  const lines = text.split('\n');
  const at = lines.findIndex((l) => /^#{1,6}\s+decisions?\b(?!\s+drivers)/i.test(l));
  const out = new Set<string>();
  if (at < 0) return out;
  const level = /^#+/.exec(lines[at] ?? '')?.[0].length ?? 1;
  let fence = false, skip = false;
  for (const l of lines.slice(at + 1)) {
    if (/^\s{0,3}(```|~~~)/.test(l)) { fence = !fence; continue; }
    if (fence) continue;
    const h = /^(#{1,6})\s/.exec(l);
    if (h) {
      if ((h[1] ?? '').length <= level) break;
      skip = /consequences?\b/i.test(l);
      continue;
    }
    const m = skip ? null : /^ {0,2}(\d+)\.\s/.exec(l);
    if (m) out.add(m[1] ?? '');
  }
  return out;
}
