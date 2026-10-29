// The prose floor: lead, bullet, word, caption and glossary bounds on the merged model, and the numbers build reports.
import { collect, fieldOrigin, originOf } from './sf-model.js';
import type { FigureSpec, Model, Problem, Section } from './sf-model.js';

// shortcut: a rule-based splitter; replace it if a real lead is miscounted in a proof run.
export function sentences(text: string): number {
  const plain = text.replace(/`[^`]*`/g, 'code').replace(/\b(?:e\.g|i\.e)\./gi, 'eg');
  return plain.split(/[.?!](?=\s|$)/).filter((s) => s.trim() !== '').length;
}
export const words = (text: string): number => text.split(/\s+/).filter((w) => w !== '').length;

const ROLES = ['what', 'parts', 'request', 'code'] as const;
type At = { file: string; pointer: string };
const under = (at: At, key: string): At => ({ file: at.file, pointer: `${at.pointer}/${key}` });
const floorWords = (s: Section): number => words(s.lead ?? '') + [...(s.bullets ?? []), ...(s.notOwned ?? [])].reduce((n, b) => n + words(b.text), 0);

// Whole-model rules need every fragment; under --fragment only the shape rules run, on whatever the model holds.
export function checkProse(model: Model, mode: 'whole' | 'fragment'): Problem[] {
  const out: Problem[] = [];
  const err = (at: At, message: string, level: 'error' | 'warning' = 'error'): void => { out.push({ ...at, message, level }); };
  const whole = mode === 'whole';
  const { meta, sections } = model;

  // model.meta is merged key by key, so it has no origin of its own; meta.json holds the roots and, by the design, name and intro.
  const metaAt: At = { file: meta.roots.length ? originOf(meta.roots[0] as object).file : '', pointer: meta.roots.length ? '/meta' : '' };
  if (whole) for (const k of ['name', 'intro'] as const) if (!meta[k]) err(metaAt, `meta.${k} missing`);
  if (meta.intro) {
    const n = sentences(meta.intro);
    if (n < 2 || n > 5) err(under(metaAt, 'intro'), `meta.intro has ${n} sentences; 2 to 5 required`);
  }

  const chapters: At = { file: sections.length ? originOf(sections[0] as Section).file : '', pointer: sections.length ? '/sections' : '' };
  for (const role of ROLES) {
    const holders = sections.filter((s) => s.role === role);
    if (whole && holders.length === 0) err(chapters, `Start here role ${role} missing`);
    if (holders.length > 1) err(originOf(holders[1] as Section), `role ${role} appears ${holders.length} times; exactly one required`);
  }
  if (whole) ROLES.forEach((role, i) => {
    const s = sections[i];
    if (s !== undefined && s.role !== role) err(originOf(s), `section ${s.id} has role ${s.role ?? 'none'}; the first four sections must be what, parts, request, code in that order`);
  });

  const hostId = meta.roots[0]?.id ?? '';
  const cited = new Set<string>();
  for (const { item } of collect(model)) for (const e of item.evidence) if ('path' in e) cited.add(e.root ?? hostId);
  const mapped = new Set(model.codeMap.map((c) => c.root));

  // design.md, code map: evidence holds a folder entry and a file entry; the first file entry is where to start reading.
  for (const c of model.codeMap) {
    if (c.unconfirmed === true) continue;
    const paths = (c.evidence ?? []).flatMap((e) => ('path' in e ? [e.path] : []));
    const at = under(originOf(c), 'evidence');
    if (!paths.some((p) => p.endsWith('/'))) err(at, `code map entry ${c.id}: evidence has no folder entry (a path ending in /)`);
    if (!paths.some((p) => !p.endsWith('/'))) err(at, `code map entry ${c.id}: evidence has no file entry; the first file entry is where to start reading`);
  }

  for (const s of sections) {
    const decl = originOf(s);
    const leadAt = fieldOrigin(s, 'lead');
    if (s.lead === undefined) { if (whole) err(decl, `section ${s.id}: lead missing`); }
    else {
      const n = sentences(s.lead);
      if (n < 2 || n > 4) err(leadAt ?? decl, `section ${s.id}: lead has ${n} sentences; 2 to 4 required`);
    }
    const bullets = s.bullets ?? [];
    // Bullets concatenate across fragments; the count goes to the fragment that wrote the first one.
    const bulletsAt = bullets.length ? { file: originOf(bullets[0] as object).file, pointer: originOf(bullets[0] as object).pointer.replace(/\/\d+$/, '') } : decl;
    if (bullets.length > 8 || (whole && bullets.length < 4)) err(bulletsAt, `section ${s.id}: ${bullets.length} bullets; 4 to 8 required`);
    for (const b of [...bullets, ...(s.notOwned ?? [])]) {
      const n = words(b.text);
      if (n > 40) err(originOf(b), `bullet ${b.id}: ${n} words; at most 40`);
    }
    if (!whole) continue;
    const w = floorWords(s);
    if (w < 100) err(leadAt ?? decl, `section ${s.id}: ${w} words of lead, bullets and not owned; at least 100 required`);
    else if (w < 120 || w > 200) err(leadAt ?? decl, `section ${s.id}: ${w} words of lead, bullets and not owned; 120 to 200 expected`, 'warning');
    if (s.role === 'what') {
      const n = s.notOwned?.length ?? 0;
      if (n < 2 || n > 6) err(fieldOrigin(s, 'notOwned') ?? decl, `section ${s.id}: ${n} notOwned bullets; 2 to 6 required`);
    }
    if (s.role === 'parts' && !(s.diagrams ?? []).includes(model.levels.root)) err(decl, `section ${s.id}: diagrams must include the level-0 diagram ${model.levels.root}`);
    if (s.role === 'request') {
      const n = new Set([...(s.sequences ?? []), ...model.sequences.filter((q) => q.chapter === s.id).map((q) => q.id)]).size;
      if (n !== 1) err(decl, `section ${s.id}: ${n} sequences; exactly one required`);
    }
    if (s.role === 'code') for (const root of cited) if (!mapped.has(root)) err(decl, `section ${s.id}: root ${root} has no code map entry; items cite it`);
  }

  const captions: [string, { id: string; summary?: string }][] = [
    ...model.levels.diagrams.map((d): [string, typeof d] => ['diagram', d]),
    ...model.sequences.map((q): [string, typeof q] => ['sequence', q]),
    ...model.storeFlows.map((f): [string, typeof f] => ['store flow', f]),
  ];
  for (const [kind, o] of captions) {
    const at = originOf(o);
    if (!o.summary) { err(at, `${kind} ${o.id}: summary missing`); continue; }
    const n = sentences(o.summary), w = words(o.summary);
    if (n !== 1) err(under(at, 'summary'), `${kind} ${o.id}: summary has ${n} sentences; one required`);
    else if (w < 6 || w > 30) err(under(at, 'summary'), `${kind} ${o.id}: summary has ${w} words; 6 to 30 required`);
  }
  for (const q of model.sequences) if (q.participants.length > 12) err(originOf(q), `sequence ${q.id}: ${q.participants.length} participants; at most 12 (split it)`);

  const g = model.glossary;
  if (whole && (g.length < 15 || g.length > 40)) err(g.length ? { file: originOf(g[0] as object).file, pointer: '/glossary' } : { file: '', pointer: '' }, `glossary has ${g.length} terms; 15 to 40 required`);
  const owner = new Map<string, string>();
  for (const t of g) {
    for (const text of [t.term, ...(t.aliases ?? [])]) {
      const key = text.toLowerCase();
      const first = owner.get(key);
      if (first === undefined) owner.set(key, t.id);
      else err(originOf(t), `term "${text}" is also used by term:${first}`);
    }
  }
  return out;
}

export type Prose = { chapters: { id: string; words: number; leadSentences: number; bullets: number }[]; averageWords: number; glossary: number; lifelines: number };

export function proseStats(model: Model, figures: FigureSpec[]): Prose {
  const chapters = model.sections.map((s) => ({ id: s.id, words: floorWords(s), leadSentences: sentences(s.lead ?? ''), bullets: s.bullets?.length ?? 0 }));
  const total = chapters.reduce((n, c) => n + c.words, 0);
  return {
    chapters,
    averageWords: chapters.length ? Math.round((total / chapters.length) * 10) / 10 : 0,
    glossary: model.glossary.length,
    lifelines: figures.filter((f) => f.kind === 'sequence' && 'lanes' in f).length,
  };
}
