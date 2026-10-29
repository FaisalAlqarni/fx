// Deep diagrams: one archify spec per level diagram, sequence and store flow page, and the SVG
// fallback page drawn from the same figure spec. Archify itself runs in a later task.
import * as fs from 'fs';
import { parseJson } from './json.js';
import * as path from 'path';
import { spawn, spawnSync } from 'child_process';
import type { Theme } from './sf-theme.js';
import type { FxJson } from './types.js';
import type { Diagram, Evidence, FigureSpec, FigureStep, FileEvidence, Model, StoreFlow } from './sf-model.js';
import type { Root } from './sf-evidence.js';
import { escapeHtml } from './sf-page.js';
import { GENERATED } from './sf-markdown.js';
import { shortLabel } from './sf-layout.js';

type Obj = Record<string, unknown>;
// shortened: each label the spec cut to fit archify, as '<model id> <field>'.
// steps: the message numbers a sequence page covers, self-messages folded into notes included.
export type DeepDiagram = { name: string; kind: 'architecture' | 'sequence'; source: string; spec: object; pages: number; owningRoot: string; shortened: string[]; steps?: number[] };

const PAGE_DEFAULT = 8;
const EDGE = 16; // px kept clear between a boundary frame and the canvas's left or top edge
const COMPONENT_TYPES = ['frontend', 'backend', 'database', 'cloud', 'security', 'messagebus', 'external'];

// Model ids allow a leading digit; archify ids do not.
const aid = (id: string): string => (/^[0-9]/.test(id) ? `n${id}` : id);
const componentType = (kind: string): string => (COMPONENT_TYPES.includes(kind) ? kind : 'backend');
const cut = (s: string, n: number): string => [...s].slice(0, n).join('');

const isFile = (e: Evidence): e is FileEvidence => 'path' in e;

// archify 3.2.0 measures text in units, a full-width character counting 2 (textUnits). Everything from U+1100 up
// counts 2 here: it over-counts some characters, so a fitted label is at worst shorter than it had to be.
const units = (s: string): number => [...s].reduce((n, ch) => n + ((ch.codePointAt(0) ?? 0) >= 0x1100 ? 2 : 1), 0);
// archify renders node text on one line and rejects what does not fit, so the spec carries a cut copy ending in "...".
function fit(s: string, max: number, what: string, shortened: string[]): string {
  if (units(s) <= max) return s;
  let out = '';
  for (const ch of s) { if (units(out + ch) + 3 > max) break; out += ch; }
  shortened.push(what);
  return `${out.trimEnd()}...`;
}

// The root most evidence entries cite; a tie goes to the host.
function owningRoot(entries: Evidence[], roots: Map<string, Root>): string {
  const host = [...roots.values()].find((r) => r.host)?.id ?? '';
  const count = new Map<string, number>();
  for (const e of entries) if (isFile(e)) count.set(e.root ?? host, (count.get(e.root ?? host) ?? 0) + 1);
  let best = host, top = count.get(host) ?? 0;
  for (const [id, n] of count) if (n > top) { best = id; top = n; }
  return best;
}

type Source = { path: string; line?: number; end_line?: number; label?: string };
// "63,67-245" is two ranges. An entry of another root, or past the third range, goes to the steps card.
function sourcesOf(list: Evidence[], own: string, host: string, rest: string[], who: string): Source[] | undefined {
  const out: Source[] = [];
  for (const e of list) {
    if (!isFile(e)) continue;
    const root = e.root ?? host;
    const parts = e.lines === undefined ? [''] : e.lines.split(',').map((x) => x.trim());
    if (root !== own) { rest.push(`${who}: @${root}/${e.path}${e.lines === undefined ? '' : `:${e.lines}`}`); continue; }
    for (const p of parts) {
      const m = /^(\d+)(?:-(\d+))?$/.exec(p);
      const src: Source = { path: cut(e.path, 240), ...(m ? { line: Number(m[1]), ...(m[2] ? { end_line: Number(m[2]) } : {}) } : {}), ...(e.symbol ? { label: cut(e.symbol, 48) } : {}) };
      if (out.length < 3) out.push(src); else rest.push(`${who}: ${e.path}${p ? `:${p}` : ''}`);
    }
  }
  return out.length ? out : undefined;
}

// Credentials never reach a spec: userinfo is cut from a URL remote.
const publicUrl = (remote: string): string => remote.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]*@/i, '$1');

// archify accepts only a remote address as the url (repository-evidence/url-invalid), so a root with no remote gets none.
function repository(root: Root | undefined): Obj | undefined {
  if (!root?.head || !root.remote) return undefined;
  return { url: publicUrl(root.remote), revision: root.head, link_mode: 'local-only' };
}
// archify verifies sources only through meta.repository; without one, the owning root's evidence goes to the card too.
const linked = (own: string, repo: Obj | undefined): string => (repo ? own : '');

const evCard = (rest: string[]): Obj[] => (rest.length ? [{ dot: 'slate', title: 'Evidence', items: rest }] : []);

function architecture(d: Diagram, fig: FigureSpec, roots: Map<string, Root>): DeepDiagram {
  const host = [...roots.values()].find((r) => r.host)?.id ?? '';
  const all = [...d.nodes, ...d.edges, ...d.groups].flatMap((o) => o.evidence);
  const own = owningRoot(all, roots);
  const rest: string[] = [];
  const repo = repository(roots.get(own));
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const shortened: string[] = [];
  const parts: string[] = [];
  const known = new Set(d.nodes.map((n) => n.id));
  const groups = d.groups.flatMap((g) => { const wraps = g.members.filter((x) => known.has(x)); return wraps.length ? [{ label: g.label, wraps }] : []; });
  // archify 3.2.0 frames a boundary 30 px around its members' box (boundaryRect) and widens it to fit its title at up to
  // 9 px (0.6 px a unit + 18); it never moves a frame back from the left or top edge, so everything shifts right and down.
  let dx = 0, dy = 0;
  for (const g of groups) {
    const m = fig.nodes.filter((n) => g.wraps.includes(n.id));
    const x0 = Math.min(...m.map((n) => n.x)), x1 = Math.max(...m.map((n) => n.x + n.w));
    const title = Math.max(30, units(g.label) * 9 * 0.6 + 10) + 8;
    dx = Math.max(dx, EDGE + 30 + Math.max(0, title - (x1 - x0 + 60)) / 2 - x0);
    dy = Math.max(dy, EDGE + 30 - Math.min(...m.map((n) => n.y)));
  }
  dx = Math.ceil(dx); dy = Math.ceil(dy);
  const components = fig.nodes.map((n) => {
    const m = byId.get(n.id);
    const sources = m && m.primary !== false ? sourcesOf(m.evidence, linked(own, repo), host, rest, m.label) : undefined;
    // archify 3.2.0: a label needs units * 6.6 px within width + 8 (component-label-overflow). A subtitle is drawn at
    // 9 px only when units * 9 * 0.6 fit within width - 8, and shrinks to 6 px when not; a role that long goes whole
    // to the Parts card instead (the 1000 px canvas in runArchify puts 9 px at 12 px).
    const label = fit(m?.label ?? n.id, Math.floor((n.w + 8) / 6.6), `${n.id} label`, shortened);
    const sublabel = m?.role && units(m.role) * 5.4 <= n.w - 8 ? m.role : undefined;
    if (m?.role && !sublabel) parts.push(`${m.label}: ${m.role}`);
    return { id: aid(n.id), type: componentType(m?.kind ?? n.kind), label, ...(sublabel ? { sublabel } : {}), ...(sources ? { sources } : {}), pos: [n.x + dx, n.y + dy], size: [n.w, n.h] };
  });
  const boundaries = groups.map((g) => ({ kind: 'region', label: g.label, wraps: g.wraps.map(aid) }));
  const name = `arch-${d.id}`;
  // No viewBox: archify's own canvas then covers frames, routes, labels and the legend on the right and at the bottom.
  const spec = {
    schema_version: 1, diagram_type: 'architecture',
    meta: { title: d.title, subtitle: d.summary, output: `${name}.html`, quality_profile: 'showcase', ...(repo ? { repository: repo } : {}) },
    components,
    ...(boundaries.length ? { boundaries } : {}),
    // The figure's short label: the layout made room for it, and archify places it on its own route.
    connections: d.edges.map((e) => ({ from: aid(e.from), to: aid(e.to), label: shortLabel(e.label, e.short), ...(e.mode === 'async' ? { variant: 'dashed' } : {}) })),
    ...(rest.length || parts.length ? { cards: [...(parts.length ? [{ dot: 'cyan', title: 'Parts', items: parts }] : []), ...evCard(rest)] } : {}),
  };
  return { name, kind: 'architecture', source: `diagram:${d.id}`, spec, pages: 1, owningRoot: own, shortened };
}

type Msg = { n: number; from: string; to: string; label: string; mode?: string; note?: string };
type Part = { id: string; type: string; label: string; sources?: Source[] };

// archify 3.2.0 sequence geometry on an authored width (render-sequence.mjs spreadColumnGeometry): each box is
// max(86, min(190, round((width - 124) / count) - 24)) px, and lifeline i stands at margin + box / 2 + i * gap.
function columns(width: number, count: number): { box: number; at: (i: number) => number } {
  const box = Math.max(86, Math.min(190, Math.round((width - 124) / count) - 24));
  const margin = Math.max(40, Math.min(62, width - 40 - (count * box + (count - 1) * 16)));
  const gap = count > 1 ? Math.max(box + 16, (width - 40 - margin - box) / (count - 1)) : 108;
  return { box, at: (i) => margin + box / 2 + i * gap };
}

// archify 3.2.0 wraps a note's 7 px text (4.2 px a unit) inside the lane gap less 30 px (noteLayout). Greedy word
// wrap plus one spare line: archify may also break inside a long word, and a spare line only costs 11 px.
function noteLines(text: string, width: number): number {
  let lines = 1, line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && units(next) * 4.2 > width) { lines += 1; line = word; } else line = next;
  }
  return lines + 1;
}

// archify 3.2.0 rejects a self-message (sequence/self-message-unsupported) and suggests a note on a real message:
// each one joins the note of the message before it on the page, or after it when it comes first.
function foldSelf(slice: Msg[]): Msg[] {
  const out = slice.map((m) => ({ ...m }));
  const real = out.filter((m) => m.from !== m.to);
  if (!real.length) return out;
  for (const m of out) {
    if (m.from !== m.to) continue;
    const host = [...real].reverse().find((r) => r.n < m.n) ?? (real[0] as Msg);
    host.note = [host.note, `${m.n}. ${m.label}`].filter(Boolean).join('; ');
  }
  return real;
}

// Splits messages into pages and writes one sequence spec per page, listing only the participants it uses.
function sequencePages(base: string, title: string, parts: Part[], msgs: Msg[], own: string, repo: Obj | undefined, rest: string[], limit: number, source: string): DeepDiagram[] {
  const pages = Math.max(1, Math.ceil(msgs.length / limit));
  return Array.from({ length: pages }, (_, p) => {
    const slice = msgs.slice(p * limit, (p + 1) * limit);
    const used = new Set(slice.flatMap((m) => [m.from, m.to]));
    // archify wants two participants; a page of self messages borrows the next one.
    for (const x of parts) if (used.size < 2) used.add(x.id);
    const shown = parts.filter((x) => used.has(x.id));
    const index = new Map(shown.map((x, i) => [x.id, i]));
    const name = p === 0 ? base : `${base}-p${p + 1}`;
    const page = foldSelf(slice);
    // Message rows: 56 px apart, more under a wrapped note (the next message sits 22 px below its bottom, y + 22 +
    // 11 px a line). The legend needs content bottom + 12 + 86 (legendRequiredHeight). The canvas widens to 1.55 times
    // its height: archify 3.2.0 gives an authored sequence viewBox no reader fit, and its delivery fails a narrower
    // canvas when the page outgrows 900 px (composition/viewport-height). A wider canvas only shortens notes, so the
    // rows measured at the narrower width still hold.
    const rows = (width: number): { ys: number[]; height: number } => {
      const { at } = columns(width, shown.length);
      const ys: number[] = [];
      let y = 180, bottom = 0;
      for (const m of page) {
        ys.push(y);
        const span = Math.abs(at(index.get(m.to) ?? 0) - at(index.get(m.from) ?? 0));
        const end = m.note ? y + 22 + 11 * (noteLines(m.note, span - 30) - 1) : y + 6;
        bottom = Math.max(bottom, end);
        y = Math.max(y + 56, m.note ? end + 22 : 0);
      }
      return { ys, height: Math.max(480, (ys[ys.length - 1] ?? 180) + 116, bottom + 12 + 86 + 8) };
    };
    const narrow = Math.max(480, 150 * shown.length + 60);
    const { ys, height } = rows(narrow);
    const width = Math.max(narrow, Math.ceil(height * 1.55));
    const { box, at } = columns(width, shown.length);
    const shortened: string[] = [];
    // A `showcase` message label is units * 6.6 + 12 px wide, centred between its lifelines, and must stay on the canvas
    // (composition/label-canvas-containment).
    const label = (m: Msg): string => {
      const mid = (at(index.get(m.from) ?? 0) + at(index.get(m.to) ?? 0)) / 2;
      return fit(`${m.n}. ${m.label}`, Math.floor((2 * Math.min(mid, width - mid) - 12) / 6.6), `message ${m.n} label`, shortened);
    };
    const spec = {
      schema_version: 1, diagram_type: 'sequence',
      meta: { title: pages > 1 ? `${title} (page ${p + 1} of ${pages})` : title, output: `${name}.html`, quality_profile: 'showcase', ...(repo ? { repository: repo } : {}), viewBox: [width, height] },
      // A participant label needs units * 6.8 px within its box + 6 (participant-label-overflow).
      participants: shown.map((x) => ({ id: aid(x.id), type: x.type, label: fit(x.label, Math.floor((box + 6) / 6.8), `${x.id} label`, shortened), ...(x.sources ? { sources: x.sources } : {}) })),
      messages: page.map((m, i) => ({ id: `m${m.n}`, from: aid(m.from), to: aid(m.to), y: ys[i], label: label(m), ...(m.mode === 'async' ? { variant: 'dashed' } : {}), ...(m.note ? { note: m.note } : {}) })),
      ...(rest.length && p === 0 ? { cards: evCard(rest) } : {}),
    };
    return { name, kind: 'sequence' as const, source, spec, pages, owningRoot: own, shortened, steps: slice.map((m) => m.n) };
  });
}

function sequence(q: Model['sequences'][number], roots: Map<string, Root>, limit: number): DeepDiagram[] {
  const host = [...roots.values()].find((r) => r.host)?.id ?? '';
  const own = owningRoot([...q.participants, ...q.messages].flatMap((o) => o.evidence), roots);
  const rest: string[] = [];
  const repo = repository(roots.get(own)), src = linked(own, repo);
  const parts = q.participants.map((p): Part => ({ id: p.id, type: componentType(p.kind ?? ''), label: p.label, sources: sourcesOf(p.evidence, src, host, rest, p.label) }));
  for (const m of q.messages) sourcesOf(m.evidence, src, host, rest, `message ${m.n}`);
  return sequencePages(`seq-${q.id}`, q.title, parts, q.messages, own, repo, rest, limit, `seq:${q.id}`);
}

function flow(f: StoreFlow, model: Model, roots: Map<string, Root>, limit: number): DeepDiagram[] {
  const host = [...roots.values()].find((r) => r.host)?.id ?? '';
  const own = owningRoot(f.steps.flatMap((s) => s.evidence), roots);
  const rest: string[] = [];
  const repo = repository(roots.get(own)), src = linked(own, repo);
  const nodes = new Map(model.levels.diagrams.flatMap((d) => d.nodes).map((n) => [n.id, n]));
  for (const s of f.steps) sourcesOf(s.evidence, src, host, rest, `step ${s.n}`);
  const actors = [...new Set(f.steps.map((s) => s.actor))], stores = [...new Set(f.steps.map((s) => s.store as string))];
  const parts: Part[] = [
    ...actors.map((id): Part => { const n = nodes.get(id); return { id, type: componentType(n?.kind ?? ''), label: n?.label ?? id, sources: n ? sourcesOf(n.evidence, src, host, [], id) : undefined }; }),
    // Model ids are lowercase with no underscore, so S_<store> never equals an actor id.
    ...stores.map((id): Part => ({ id: `S_${id}`, type: 'database', label: id })),
  ];
  const msgs = f.steps.map((s): Msg => ({ n: s.n, from: s.actor, to: `S_${s.store}`, label: `${s.op}${s.key ? ` ${s.key}` : ''}`, ...(s.when ? { note: s.when } : {}) }));
  return sequencePages(`flow-${f.id}`, f.trigger, parts, msgs, own, repo, rest, limit, `flow:${f.id}`);
}

export function deepDiagrams(model: Model, figures: FigureSpec[], roots: Map<string, Root>, pageLimit: Record<string, number>): DeepDiagram[] {
  const fig = (key: string): FigureSpec => { const x = figures.find((y) => y.key === key); if (!x) throw new Error(`no figure ${key}`); return x; };
  return [
    ...model.levels.diagrams.map((d) => architecture(d, fig(`level-${d.id}`), roots)),
    ...model.sequences.flatMap((q) => sequence(q, roots, pageLimit[`seq-${q.id}`] ?? PAGE_DEFAULT)),
    ...model.storeFlows.flatMap((f) => flow(f, model, roots, pageLimit[`flow-${f.id}`] ?? PAGE_DEFAULT)),
  ];
}

export const pickLine = (name: string, label: 'archify architecture' | 'archify sequence' | 'static SVG' | 'animated SVG', detail: string): string => `${name}: ${label}, ${detail}`;

// ---------------------------------------------------------------- SVG fallback
const STEP_SECONDS = 1.2;

type Anim = (id: string) => string;
const marker = (async: boolean): string => `url(#${async ? 'open' : 'arrow'})`;

function boxSvg(figure: FigureSpec, anim: Anim): { width: number; height: number; body: string } {
  const groups = figure.groups.map((g) => `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" class="group"/><text x="${g.x + 10}" y="${g.y + 16}" class="muted">${escapeHtml(g.label)}</text>`).join('');
  const edges = figure.edges.map((e) => {
    const label = e.label ? `<rect x="${e.label.x}" y="${e.label.y}" width="${e.label.w}" height="${e.label.h}" rx="4" class="chip"/><text x="${e.label.x + e.label.w / 2}" y="${e.label.y + e.label.h / 2 + 4}" text-anchor="middle">${escapeHtml(e.label.text)}</text>` : '';
    return `<path d="${escapeHtml(e.d)}" class="edge${e.mode === 'async' ? ' async' : ''}" marker-end="${marker(false)}"${anim(e.id)}/>${label}`;
  }).join('');
  const nodes = figure.nodes.map((n) => `<g><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" class="node${n.primary ? '' : ' ctx'}"/>${n.lines.map((l, i) => `<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + (i - (n.lines.length - 1) / 2) * 15 + 4}" text-anchor="middle" class="ink">${escapeHtml(l)}</text>`).join('')}</g>`).join('');
  return { width: figure.width, height: figure.height, body: `${groups}${edges}${nodes}` };
}

// The page's rows from the lifeline geometry, moved up so the page's first row sits where row 1 does (y 72).
function lifelineSvg(figure: FigureSpec, mine: Set<number>, anim: Anim): { width: number; height: number; body: string } {
  const rows = (figure.rows ?? []).filter((r) => mine.has(r.n));
  const first = rows[0], last = rows[rows.length - 1];
  const shift = (first?.y ?? 72) - 72;
  const height = last ? last.y - shift + (last.self ? 56 : 40) + 24 : 96;
  const lanes = (figure.lanes ?? []).map((l) => {
    const x0 = l.x - l.w / 2;
    const text = l.lines.map((t, i) => `<text x="${l.x}" y="${36 + (i - (l.lines.length - 1) / 2) * 15 + 4}" text-anchor="middle">${escapeHtml(t)}</text>`).join('');
    return `<g><title>${escapeHtml(l.title)}</title><rect x="${x0}" y="14" width="${l.w}" height="44" rx="8" class="lane ${l.look}"/>${text}</g><line x1="${l.x}" y1="58" x2="${l.x}" y2="${height - 12}" class="life"/>`;
  }).join('');
  const msgs = rows.map((r) => {
    const y = r.y - shift + 28;
    const d = r.self ? `M${r.x1} ${y}h28v20h-28` : `M${r.x1} ${y}H${r.x2}`;
    const l = { ...r.label, y: r.label.y - shift };
    return `<g class="msg${r.reply ? ' reply' : ''}${r.leaves ? ' leaves' : ''}"><path d="${d}" class="edge${r.leaves ? ' leaves' : ''}"${r.reply ? ' stroke-dasharray="6 4"' : ''} marker-end="${marker(r.mode === 'async')}"${anim(r.id)}/>`
      + `<rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="4" class="chip"/><text x="${l.x + 6}" y="${l.y + l.h - 4}" font-size="12"><tspan font-weight="bold">${r.n}</tspan> ${escapeHtml(r.text)}</text></g>`;
  }).join('');
  return { width: figure.width, height, body: `${lanes}${msgs}` };
}

export function svgPage(d: DeepDiagram, figure: FigureSpec, page: number): string {
  const spec = d.spec as { meta: { title: string }; messages?: { id: string }[] };
  const animated = d.kind === 'sequence';
  // A sequence page animates its own messages: message m<n> is figure step n.
  const mine = animated ? d.steps ?? (spec.messages ?? []).map((m) => Number(m.id.slice(1))) : [];
  const total = Math.max(1, mine.length) * STEP_SECONDS;
  const stepOf = new Map<string, number>();
  mine.forEach((n, j) => { for (const e of figure.steps[n - 1]?.edges ?? []) if (!stepOf.has(e)) stepOf.set(e, j); });
  // The rest colour and width come from the arrow's class, so a leaving call returns to --warn after its step.
  const keyframes = [...new Set(stepOf.values())].map((j) => {
    const a = (j / mine.length) * 100, b = ((j + 1) / mine.length) * 100;
    const rest = 'stroke:var(--rest);stroke-width:var(--rest-w)';
    return `@keyframes step${j}{0%,${a.toFixed(2)}%{${rest}}${(a + 0.01).toFixed(2)}%,${b.toFixed(2)}%{stroke:var(--accent);stroke-width:2.8}${(b + 0.01).toFixed(2)}%,100%{${rest}}}`;
  }).join('');
  const anim = (id: string): string => { const j = stepOf.get(id); return j === undefined ? '' : ` style="animation:step${j} ${total}s linear infinite"`; };
  const { width, height, body } = figure.lanes && figure.rows ? lifelineSvg(figure, new Set(mine), anim) : boxSvg(figure, anim);
  // The list numbers each step, so a caption's own `Step <n>: ` or `<n>. ` goes; the step's code follows it.
  const item = (s: FigureStep | undefined, n?: number): string[] => {
    if (!s?.caption) return [];
    const text = n === undefined ? s.caption : s.caption.replace(new RegExp(`^(?:Step ${n}: |${n}\\. )`), '');
    return [`<li${n === undefined ? '' : ` value="${n}"`}>${escapeHtml(text)}${s.where ? ` <code>${escapeHtml(s.where)}</code>` : ''}</li>`];
  };
  const items = animated ? mine.flatMap((n) => item(figure.steps[n - 1], n)) : figure.steps.flatMap((s) => item(s));
  const title = escapeHtml(spec.meta.title);
  // The head script is page-template.html's: it applies the theme index.html stored under fx-theme (same origin). The
// theme button is index.html's toggle, writing the same key.
  // Node text is 13 px: the svg never shrinks below 12/13 of its width, and a narrow screen scrolls it in .scroll.
  return `<!doctype html>
${GENERATED}
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="../assets/fx-tokens-1.css">
<link rel="stylesheet" href="../assets/theme.css">
<script>try{var t=localStorage.getItem("fx-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
<style>
body{margin:0;padding:1.5rem;background:var(--paper);color:var(--ink);font:16px/1.5 system-ui,sans-serif;overflow-wrap:anywhere}
a{color:var(--accent)}
#theme{font:inherit;color:var(--ink);background:var(--panel);border:1.5px solid var(--rule);border-radius:999px;padding:4px 14px;margin-inline-start:12px;cursor:pointer}
.scroll{max-inline-size:100%;overflow-x:auto}
svg{max-inline-size:100%;block-size:auto;background:var(--panel);border:1px solid var(--rule);border-radius:8px}
svg text{font-size:13px;fill:var(--ink)} svg .muted{fill:var(--muted);font-size:12px}
.node{fill:var(--panel);stroke:var(--ink);stroke-width:1.4} .node.ctx{stroke:var(--muted);stroke-dasharray:5 4}
.group{fill:none;stroke:var(--muted);stroke-dasharray:5 4} .chip{fill:var(--panel)}
.edge{fill:none;--rest:var(--muted);--rest-w:1.6;stroke:var(--rest);stroke-width:var(--rest-w)} .edge.async{stroke-dasharray:6 4}
.lane{fill:var(--panel);stroke:var(--ink);stroke-width:1.4} .lane.client{stroke:var(--info)} .lane.security{stroke:var(--violet)}
.lane.external{stroke:var(--muted);stroke-dasharray:5 4;fill:color-mix(in srgb,var(--muted) 14%,var(--panel))}
.life{stroke:var(--rule);stroke-width:1.2;stroke-dasharray:4 4} .msg .edge.leaves{--rest:var(--warn);--rest-w:2.4}
${keyframes}
@media (prefers-reduced-motion:reduce){.edge{animation:none!important}}
</style>
</head>
<body>
<p><a href="../index.html">Back to the system page</a> <button id="theme" type="button" aria-label="Change theme">Theme</button></p>
<h1>${title}</h1>
${d.pages > 1 ? `<p>Page ${page} of ${d.pages}</p>\n` : ''}<div class="scroll">
<svg role="img" aria-label="${title}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="min-inline-size:${Math.ceil((width * 12) / 13)}px" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="var(--muted)" stroke-width="1.6"/></marker></defs>
${body}
</svg>
</div>
<ol>
${items.join('\n')}
</ol>
<script>
(function () {
  var root = document.documentElement, btn = document.getElementById("theme");
  function dark() { var t = root.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
  function paint() { btn.textContent = "Theme: " + (dark() ? "dark" : "light"); }
  paint();
  btn.addEventListener("click", function () {
    var n = dark() ? "light" : "dark"; root.setAttribute("data-theme", n);
    try { localStorage.setItem("fx-theme", n); } catch (e) {}
    paint();
  });
})();
</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- running archify
export const hasArchify = (dir: string): boolean => fs.existsSync(path.join(dir, 'bin', 'archify.mjs'));

// The lookup order: $CLAUDE_CONFIG_DIR, then $HOME/.claude; a folder without bin/archify.mjs is skipped.
// Never a path from the repo: a cloned repo's files are not run (security review S1).
export function findArchify(env: NodeJS.ProcessEnv): { dir: string; version: string | null; via: 'CLAUDE_CONFIG_DIR' | 'HOME' } | null {
  const tries: ['CLAUDE_CONFIG_DIR' | 'HOME', string | undefined][] = [
    ['CLAUDE_CONFIG_DIR', env.CLAUDE_CONFIG_DIR ? path.join(env.CLAUDE_CONFIG_DIR, 'skills', 'archify') : undefined],
    ['HOME', env.HOME ? path.join(env.HOME, '.claude', 'skills', 'archify') : undefined],
  ];
  for (const [via, dir] of tries) {
    if (!dir || !hasArchify(dir)) continue;
    let version: string | null = null;
    try { version = (parseJson(fs.readFileSync(path.join(dir, 'skill-release.json'), 'utf8')) as { version?: string }).version ?? null; } catch { /* no release file */ }
    return { dir, version, via };
  }
  return null;
}

// archify 3.2.0 fits an automatic architecture canvas to the window height, which drew 11 px labels at 6 to 9 px. An
// authored viewBox fills the page's 1349 px column at 1440 instead; 1000 wide draws archify's 9 px subtitle at 12 px
// there. The canvas comes from archify's own layout, widened to 1000 with the parts centred.
const READ_WIDTH = 1000;
function authorCanvas(dir: string, spec: string): void {
  const r = spawnSync(process.execPath, [path.join(dir, 'bin', 'archify.mjs'), 'validate', 'architecture', spec, '--layout-json'], { encoding: 'utf8', timeout: 60000 });
  let vb: unknown;
  try { vb = (parseJson(r.stdout) as { viewBox?: unknown }).viewBox; } catch { return; } // finalize reports the failure
  if (!Array.isArray(vb) || typeof vb[0] !== 'number' || typeof vb[1] !== 'number') return;
  const doc = parseJson(fs.readFileSync(spec, 'utf8')) as { meta: Obj; components: { pos: [number, number] }[] };
  const shift = Math.max(0, Math.ceil((READ_WIDTH - vb[0]) / 2));
  for (const c of doc.components) c.pos = [c.pos[0] + shift, c.pos[1]];
  doc.meta.viewBox = [vb[0] + 2 * shift, vb[1]];
  fs.writeFileSync(spec, `${JSON.stringify(doc, null, 2)}\n`);
}

// Runs `finalize` for each job, one at a time: archify's delivery lock rejects a second call in the same folder
// (delivery/concurrent-attempt). Each job names its receipt (ruling 17). A call past timeoutS is killed.
export type ArchifyRun = { name: string; ok: boolean; receipt: string | null; timedOut: boolean; json: string; stderr: string };
export async function runArchify(dir: string, jobs: { name: string; kind: 'architecture' | 'sequence'; spec: string; out: string; repoRoot: string; receipt: string; check: string }[], timeoutS = 600): Promise<ArchifyRun[]> {
  const results: ArchifyRun[] = [];
  const one = (j: (typeof jobs)[number]): Promise<void> => new Promise((resolve) => {
    const receipt = j.receipt;
    // The build rewrites each page with its theme block after archify's browser check, so that check's evidence never
    // matches the page again and archify refuses to replace it (viewer/evidence-path-conflict) on the next build.
    fs.rmSync(j.check, { force: true });
    if (j.kind === 'architecture') authorCanvas(dir, j.spec);
    const args = [path.join(dir, 'bin', 'archify.mjs'), 'finalize', j.kind, j.spec, j.out, '--repo-root', j.repoRoot, '--quality', 'showcase', '--receipt', receipt, '--json'];
    let stdout = '', stderr = '', timedOut = false, settled = false;
    // Its own process group: archify's stages inherit these pipes, so the timeout kills the group, not one process.
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-(child.pid as number), 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    }, timeoutS * 1000);
    child.stdout.on('data', (b: Buffer) => { stdout += b.toString(); });
    child.stderr.on('data', (b: Buffer) => { stderr += b.toString(); });
    const done = (code: number | null, error?: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) stderr += `${error.message}\n`;
      results[jobs.indexOf(j)] = { name: j.name, ok: !timedOut && code === 0 && fs.existsSync(j.out), receipt: fs.existsSync(receipt) ? receipt : null, timedOut, json: stdout.trim(), stderr: stderr.trimEnd().split('\n').slice(-20).join('\n') };
      resolve();
    };
    child.on('error', (e) => done(null, e));
    child.on('close', (code) => done(code));
    // After a kill, a stray holder of the pipes must not keep the build waiting for 'close'.
    child.on('exit', (code) => { if (timedOut) done(code); });
  });
  for (const j of jobs) await one(j);
  return results;
}

// Loads that leave the site, for a page in <site>/diagrams/: src, srcset, a <link> href, CSS url() and @import.
// An anchor href is a link, not a load (archify's credit link is in every page). Outside means any scheme but data:,
// a // or root path, or a ../ that climbs above the site.
export function outsideRefs(html: string): string[] {
  const all = (re: RegExp): string[] => [...html.matchAll(re)].map((m) => m[1] ?? '');
  const urls = [
    ...all(/\bsrc\s*=\s*["']([^"']*)["']/gi),
    ...all(/\bsrcset\s*=\s*["']([^"']*)["']/gi).flatMap((v) => v.split(',').map((x) => x.trim().split(/\s+/)[0] ?? '')),
    ...all(/<link\b[^>]*?\bhref\s*=\s*["']([^"']*)["']/gi),
    ...all(/url\(\s*["']?([^"')]*)["']?\s*\)/gi),
    ...all(/@import\s+["']([^"']*)["']/gi),
  ].map((u) => u.trim());
  return urls.filter((u) => u && !/^data:/i.test(u) && (/^(?:\/|[a-z][a-z0-9+.-]*:)/i.test(u) || path.posix.normalize(`diagrams/${u}`).startsWith('../')));
}

// ---------------------------------------------------------------- theme block
const rgba = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return `rgba(${parseInt(f.slice(0, 2), 16)}, ${parseInt(f.slice(2, 4), 16)}, ${parseInt(f.slice(4, 6), 16)}, ${a})`;
};
// archify's component kinds take fx's stroke slots; fx has no red slot, so security shares --alert with messagebus.
const KIND_SLOT: [string, string][] = [['frontend', '--info'], ['backend', '--accent'], ['database', '--violet'], ['cloud', '--warn'], ['security', '--alert'], ['messagebus', '--alert'], ['external', '--muted']];

// archify's variable names from fx's slots, after system-flow's apply-theme.mjs.
function archifyVars(v: Record<string, string>, fillA: number, pad: string): string {
  const x = (k: string): string => v[k] as string;
  const all: [string, string][] = [
    ['bg', x('--paper')], ['grid', x('--rule')], ['text', x('--ink')], ['text-muted', x('--muted')], ['text-dim', x('--muted')], ['text-faint', x('--muted')],
    ['panel', x('--panel')], ['panel-border', x('--rule')], ['lane-fill', rgba(x('--code'), 0.7)], ['lane-stroke', x('--rule')],
    ['arrow', x('--muted')], ['arrow-emphasis', x('--accent')], ['mask', x('--panel')],
    ['toolbar-bg', x('--panel')], ['toolbar-border', x('--rule')], ['toolbar-text', x('--ink')], ['toolbar-hover', x('--panel')], ['toolbar-menu-bg', x('--panel')],
    ...KIND_SLOT.flatMap(([k, slot]): [string, string][] => [[`${k}-fill`, rgba(x(slot), fillA)], [`${k}-stroke`, x(slot)]]),
  ];
  return all.map(([k, val]) => `${pad}--${k}: ${val};`).join('\n');
}

const THEME_BLOCK = /\/\* fx-theme:begin \*\/[\s\S]*?\/\* fx-theme:end \*\/\n?/g;
// shortcut: archify's print block and opt-in presets keep their own colours; map them if a proof run shows the need.
export function applyThemeBlock(html: string, t: Theme): string {
  const block = `/* fx-theme:begin */
:root, [data-theme="light"] {
${archifyVars(t.light, 0.1, '  ')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${archifyVars(t.dark, 0.14, '    ')}
  }
}
[data-theme="dark"] {
${archifyVars(t.dark, 0.14, '  ')}
}
/* fx-theme:end */
`;
  const bare = html.replace(THEME_BLOCK, '');
  const close = bare.indexOf('</style>');
  if (close >= 0) return `${bare.slice(0, close)}${block}${bare.slice(close)}`;
  const head = bare.indexOf('</head>');
  return head >= 0 ? `${bare.slice(0, head)}<style>\n${block}</style>\n${bare.slice(head)}` : `<style>\n${block}</style>\n${bare}`;
}
