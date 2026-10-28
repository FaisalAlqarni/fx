// Figure layout with the vendored elkjs, ported from system-flow's build-page.mjs: the variant
// search, the crossing count from ELK's routed sections, node hits, arrow dropping and figure specs.
import * as path from 'path';
import type { Diagram, Evidence, FigureSpec, FigureStep, LayoutLine, Look, Model } from './sf-model.js';

type Pt = [number, number];
type Seg = [Pt, Pt];
type Rect = { x: number; y: number; w: number; h: number };

// The narrow slice of elkjs this file uses.
interface ElkPoint { x: number; y: number }
interface ElkLabel { id: string; text: string; width: number; height: number; x?: number; y?: number }
interface ElkEdge { id: string; sources: string[]; targets: string[]; labels?: ElkLabel[]; sections?: { startPoint: ElkPoint; endPoint: ElkPoint; bendPoints?: ElkPoint[] }[]; container?: string }
interface ElkNode { id: string; width?: number; height?: number; x?: number; y?: number; layoutOptions?: Record<string, string>; children?: ElkNode[]; edges?: ElkEdge[] }
interface Elk { layout(g: ElkNode): Promise<ElkNode> }
const ElkCtor: new () => Elk = require(path.join(__dirname, '..', 'references', 'vendor', 'elkjs-0.9.3.bundled.js'));
const elk = new ElkCtor();

const MAX_W = 860;
const MAX_CROSS = 1;

// ---------------------------------------------------------------- short labels
// Whole clauses while they fit, else whole words; an unclosed bracket and trailing stop words go.
const STOP = new Set(['to', 'for', 'the', 'a', 'an', 'of', 'and', 'or', 'under', 'whose', 'with', 'in', 'on', 'at', 'by', 'from', 'into', 'as', 'per', 'via', 'when', 'if', 'is', 'are', 'its', 'their', 'then', 'after', 'before', 'each', 'every', 'no', 'not']);
function ruleShort(label: string, max = 26): string {
  const t = label.replace(/^[\s(;,:]+/, '').trim();
  if (t.length <= max) return t;
  let out = '';
  for (const p of t.split(/(?=;\s|,\s|:\s|\s\(|\s-\s)/)) { if ((out + p).length > max) break; out += p; }
  if (!out) for (const w of t.split(/\s+/)) { const next = out ? `${out} ${w}` : w; if (next.length > max) break; out = next; }
  if (!out) out = t.slice(0, max);
  const ob = out.lastIndexOf('(');
  if (ob > 0 && out.indexOf(')', ob) < 0) out = out.slice(0, ob);
  const words = out.replace(/[\s;,:-]+$/, '').split(/\s+/);
  while (words.length > 1 && STOP.has((words[words.length - 1] ?? '').toLowerCase())) words.pop();
  return words.join(' ').replace(/[\s;,:-]+$/, '');
}
export function shortLabel(label: string, short?: string): string { return short ?? ruleShort(label); }

// ---------------------------------------------------------------- figure inputs
type FNode = { id: string; label: string; kind: string; sub: string; look: Look; primary: boolean; store: boolean };
type FEdge = { id: string; from: string; to: string; label: string; mode: 'sync' | 'async' };
type FGroup = { id: string; label: string; members: string[]; groups: string[] };
type Input = {
  key: string; kind: FigureSpec['kind']; nodes: FNode[]; edges: FEdge[]; groups: FGroup[];
  hints?: Record<string, { col: number; row: number }>;
  steps: (drawn: Set<string>, order: string[]) => FigureStep[];
};

// A step's code: the first file evidence as path:lines, else path.
const where = (evidence: Evidence[]): string | null => {
  const e = evidence.find((x) => 'path' in x);
  return e && 'path' in e ? (e.lines ? `${e.path}:${e.lines}` : e.path) : null;
};
// The node's second line: its role while that fits, else its kind.
const subOf = (role: string, kind: string): string => (role.length <= 26 ? role : kind);

// Derived edge ids: <diagram>:<from>><to>, with #2, #3 for a repeated pair.
function edgeIds(d: Diagram): string[] {
  const seen = new Map<string, number>();
  return d.edges.map((e) => {
    const k = `${d.id}:${e.from}>${e.to}`, n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return n > 1 ? `${k}#${n}` : k;
  });
}

function levelInput(d: Diagram): Input {
  const ids = edgeIds(d);
  const label = new Map(d.nodes.map((n) => [n.id, n.label]));
  const edges = d.edges.map((e, i): FEdge => ({ id: ids[i] ?? '', from: e.from, to: e.to, label: shortLabel(e.label, e.short), mode: e.mode ?? 'sync' }));
  return {
    key: `level-${d.id}`, kind: 'level',
    nodes: d.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind, sub: subOf(n.role, n.kind), look: n.look, primary: n.primary !== false, store: false })),
    edges, groups: d.groups.map((g) => ({ id: g.id, label: g.label, members: g.members, groups: g.groups ?? [] })),
    ...(d.layout ? { hints: d.layout } : {}),
    steps: (drawn, order) => order.flatMap((id) => {
      const n = d.nodes.find((x) => x.id === id);
      const outs = d.edges.map((e, i) => ({ e, id: ids[i] ?? '' })).filter((x) => x.e.from === id);
      if (!n || (n.primary === false && !outs.length)) return [];
      const to = outs.map((x) => `; to ${label.get(x.e.to) ?? x.e.to}: ${x.e.label}${drawn.has(x.id) ? '' : ' (arrow not drawn)'}`).join('');
      return [{ edges: outs.filter((x) => drawn.has(x.id)).map((x) => x.id), nodes: [id], caption: `${n.label}${n.primary === false ? ' (in another diagram)' : ''}: ${n.role}${to}`, where: where(n.evidence) }];
    }),
  };
}

// shortcut: an actor named like a store table (sql, cache, ...) shares its node id; prefix ids if a model ever does that.
function flowInput(f: Model['storeFlows'][number]): Input {
  const actors = [...new Set(f.steps.map((s) => s.actor))], stores = [...new Set(f.steps.map((s) => s.store))];
  const pairs = new Map<string, { id: string; from: string; to: string; ops: Set<string> }>();
  for (const s of f.steps) {
    const k = `${s.actor}|${s.store}`;
    const p = pairs.get(k) ?? { id: `${f.id}:${s.actor}>${s.store}`, from: s.actor, to: s.store, ops: new Set<string>() };
    p.ops.add(s.op === 'read' ? 'read' : 'write');
    pairs.set(k, p);
  }
  return {
    key: `flow-${f.id}`, kind: 'flow', groups: [],
    nodes: [...actors.map((id): FNode => ({ id, label: id, kind: 'actor', sub: 'actor', look: 'service', primary: true, store: false })), ...stores.map((id): FNode => ({ id, label: id, kind: 'store', sub: 'store', look: 'store', primary: true, store: true }))],
    edges: [...pairs.values()].map((p) => ({ id: p.id, from: p.from, to: p.to, label: p.ops.size > 1 ? 'read, write' : [...p.ops].join(''), mode: 'sync' })),
    steps: (drawn) => f.steps.map((s) => {
      const id = pairs.get(`${s.actor}|${s.store}`)?.id ?? '';
      return { edges: drawn.has(id) ? [id] : [], nodes: [s.actor, s.store], caption: `${s.n}. ${s.actor} ${s.op} ${s.store}${s.key ? ` ${s.key}` : ''}${s.when ? ` (${s.when})` : ''}${drawn.has(id) ? '' : ' (arrow not drawn)'}`, where: where(s.evidence) };
    }),
  };
}

// ---------------------------------------------------------------- geometry
function wrapText(text: string, n: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if (!cur) cur = w;
    else if (`${cur} ${w}`.length <= n) cur += ` ${w}`;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) { lines.length = 3; const l = `${lines[2]}...`; lines[2] = l.length <= n ? l : `${l.slice(0, n - 1).trimEnd()}...`; }
  return lines;
}
const sized = (n: FNode, nw: number) => { const lines = wrapText(n.label, nw >= 188 ? 22 : 18); return { lines, w: nw, h: 22 + 16 * lines.length + 18 }; };

// Two lines split at the space nearest the middle.
function wrap2(s: string): string[] {
  const sp = [...s.matchAll(/ /g)].map((m) => m.index ?? 0);
  if (!sp.length) return [s];
  const mid = s.length / 2, i = sp.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [s.slice(0, i), s.slice(i + 1)];
}
const CW = 6.9, LBH = 18, LH2 = 34; // label char width, one-line and two-line label heights (13 px text)
const labelBox = (lines: string[]) => ({ w: Math.max(...lines.map((l) => l.length)) * CW + 12, h: lines.length > 1 ? LH2 : LBH });

const segsOf = (pts: Pt[]): Seg[] => pts.slice(1).map((p, i): Seg => [pts[i] ?? p, p]);
// ELK's orthogonal routes can be off by a float rounding; only a hint route is diagonal.
const ortho = (s: Seg): boolean => Math.abs(s[0][0] - s[1][0]) <= 1 || Math.abs(s[0][1] - s[1][1]) <= 1;
// 1 for a proper crossing, 0.5 for two orthogonal segments overlapping along one line, else 0.
function segCross(a: Seg, b: Seg): number {
  const [p1, p2] = a, [q1, q2] = b;
  if (ortho(a) && ortho(b)) {
    const aH = p1[1] === p2[1], bH = q1[1] === q2[1];
    if (aH !== bH) {
      const [h1, h2, v1, v2] = aH ? [p1, p2, q1, q2] : [q1, q2, p1, p2];
      const x = v1[0], y = h1[1];
      return x > Math.min(h1[0], h2[0]) + 1 && x < Math.max(h1[0], h2[0]) - 1 && y > Math.min(v1[1], v2[1]) + 1 && y < Math.max(v1[1], v2[1]) - 1 ? 1 : 0;
    }
    // Parallel: on the same line (within 2 px), an overlap longer than 3 px counts half.
    const at = (p: Pt): number => (aH ? p[1] : p[0]), along = (p: Pt): number => (aH ? p[0] : p[1]);
    if (Math.abs(at(p1) - at(q1)) >= 2) return 0;
    const lap = Math.min(Math.max(along(p1), along(p2)), Math.max(along(q1), along(q2))) - Math.max(Math.min(along(p1), along(p2)), Math.min(along(q1), along(q2)));
    return lap > 3 ? 0.5 : 0;
  }
  // A straight route from layout hints: a proper intersection of two segments.
  const side = (p: Pt, q: Pt, r: Pt): number => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(p1, p2, q1) * side(p1, p2, q2) < 0 && side(q1, q2, p1) * side(q1, q2, p2) < 0 ? 1 : 0;
}
function segHitsRect([p, q]: Seg, r: Rect): boolean {
  if (!ortho([p, q])) {
    // Sampled: hint routes are straight lines, and a box is never thinner than the step.
    for (let t = 0; t <= 1; t += 1 / 64) { const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t; if (x > r.x + 1 && x < r.x + r.w - 1 && y > r.y + 1 && y < r.y + r.h - 1) return true; }
    return false;
  }
  return Math.max(p[0], q[0]) > r.x + 1 && Math.min(p[0], q[0]) < r.x + r.w - 1 && Math.max(p[1], q[1]) > r.y + 1 && Math.min(p[1], q[1]) < r.y + r.h - 1;
}
const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const segInRect = ([p, q]: Seg, r: Rect): boolean => Math.max(p[0], q[0]) > r.x && Math.min(p[0], q[0]) < r.x + r.w && Math.max(p[1], q[1]) > r.y && Math.min(p[1], q[1]) < r.y + r.h;

function roundedPath(pts: Pt[], r = 7): string {
  const first = pts[0] ?? [0, 0], last = pts[pts.length - 1] ?? first;
  let d = `M${first[0]},${first[1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1] ?? first, [cx, cy] = pts[i] ?? first, [nx, ny] = pts[i + 1] ?? last;
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy), rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr <= 0) continue;
    const r1 = (v: number) => Math.round(v * 10) / 10;
    d += ` L${r1(cx - ((cx - px) / l1) * rr)},${r1(cy - ((cy - py) / l1) * rr)} Q${cx},${cy} ${r1(cx + ((nx - cx) / l2) * rr)},${r1(cy + ((ny - cy) / l2) * rr)}`;
  }
  return `${d} L${last[0]},${last[1]}`;
}

// ---------------------------------------------------------------- one layout
type Lay = {
  W: number; H: number; dir: 'RIGHT' | 'DOWN'; score: number; cross: number; hits: number;
  rects: Map<string, Rect & { lines: string[] }>; groups: Map<string, Rect>; routes: Map<string, Pt[]>; labels: Map<string, Rect & { lines: string[] }>;
};
type Variant = { nw: number; dir: 'RIGHT' | 'DOWN'; aspect: number; wrap?: boolean; lw?: number; bound?: number };

const ELK_OPTS: Record<string, string> = {
  'elk.algorithm': 'layered', 'elk.edgeRouting': 'ORTHOGONAL', 'elk.padding': '[top=16,left=16,bottom=16,right=16]',
  'elk.spacing.nodeNode': '30', 'elk.layered.spacing.nodeNodeBetweenLayers': '64', 'elk.spacing.edgeNode': '18', 'elk.spacing.edgeEdge': '10',
  'elk.layered.spacing.edgeNodeBetweenLayers': '18', 'elk.layered.spacing.edgeEdgeBetweenLayers': '10', 'elk.spacing.edgeLabel': '4', 'elk.edgeLabels.inline': 'false',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP', 'elk.layered.thoroughness': '60', 'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
  'elk.separateConnectedComponents': 'true',
};
const GROUP_OPTS: Record<string, string> = { 'elk.padding': '[top=34,left=12,bottom=12,right=12]' };

// Counts crossings and node hits over the routes and scores the layout as system-flow does.
function measure(lay: Omit<Lay, 'score' | 'cross' | 'hits'>, edges: FEdge[]): Lay {
  let cross = 0, hits = 0;
  edges.forEach((e, i) => {
    const si = segsOf(lay.routes.get(e.id) ?? []);
    for (const f of edges.slice(i + 1)) for (const s1 of si) for (const s2 of segsOf(lay.routes.get(f.id) ?? [])) cross += segCross(s1, s2);
    for (const [id, r] of lay.rects) if (id !== e.from && id !== e.to) for (const s of si) if (segHitsRect(s, r)) hits++;
  });
  const score = cross * 1000 + hits * 5000 + Math.max(0, lay.W - MAX_W) * 60 + Math.max(0, lay.H - 640) * 8 + Math.abs(lay.W / lay.H - 1.9) * 40;
  return { ...lay, cross, hits, score };
}

async function elkVariant(input: Input, edges: FEdge[], v: Variant): Promise<Lay> {
  const size = new Map(input.nodes.map((n) => [n.id, sized(n, v.nw)]));
  const leaf = (id: string): ElkNode => ({ id, width: size.get(id)?.w ?? v.nw, height: size.get(id)?.h ?? 0 });
  const groupById = new Map(input.groups.map((g) => [g.id, g]));
  const grouped = new Set(input.groups.flatMap((g) => g.members));
  const nested = new Set(input.groups.flatMap((g) => g.groups));
  const compound = (g: FGroup): ElkNode => ({ id: g.id, layoutOptions: GROUP_OPTS, children: [...g.members.map(leaf), ...g.groups.flatMap((c) => { const sub = groupById.get(c); return sub ? [compound(sub)] : []; })] });
  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      ...ELK_OPTS, 'elk.direction': v.dir, 'elk.aspectRatio': String(v.aspect),
      ...(input.groups.length ? { 'elk.hierarchyHandling': 'INCLUDE_CHILDREN' } : {}),
      ...(v.wrap ? { 'elk.layered.wrapping.strategy': 'MULTI_EDGE', 'elk.layered.wrapping.correctionFactor': '1.0' } : {}),
      ...(v.bound ? { 'elk.layered.layering.strategy': 'COFFMAN_GRAHAM', 'elk.layered.layering.coffmanGraham.layerBound': String(v.bound) } : {}),
    },
    children: [...input.nodes.filter((n) => !grouped.has(n.id)).map((n) => leaf(n.id)), ...input.groups.filter((g) => !nested.has(g.id)).map(compound)],
    // ELK reserves room for each label beside its own arrow, on two lines when long.
    edges: edges.map((e) => {
      const ls = e.label ? (e.label.length > (v.lw ?? 16) && e.label.includes(' ') ? wrap2(e.label) : [e.label]) : null;
      return { id: e.id, sources: [e.from], targets: [e.to], labels: ls ? [{ id: `${e.id}/label`, text: ls.join('\n'), ...{ width: labelBox(ls).w, height: labelBox(ls).h } }] : [] };
    }),
  };
  const out = await elk.layout(graph);
  // ELK gives child and edge coordinates relative to their container.
  const abs = new Map<string, Rect>([['root', { x: 0, y: 0, w: out.width ?? 0, h: out.height ?? 0 }]]);
  const walk = (n: ElkNode, ox: number, oy: number): void => {
    for (const c of n.children ?? []) {
      const r = { x: ox + (c.x ?? 0), y: oy + (c.y ?? 0), w: c.width ?? 0, h: c.height ?? 0 };
      abs.set(c.id, r);
      walk(c, r.x, r.y);
    }
  };
  walk(out, 0, 0);
  const rects = new Map(input.nodes.map((n) => [n.id, { ...(abs.get(n.id) ?? { x: 0, y: 0, w: 0, h: 0 }), lines: size.get(n.id)?.lines ?? [] }]));
  const groups = new Map(input.groups.map((g) => [g.id, abs.get(g.id) ?? { x: 0, y: 0, w: 0, h: 0 }]));
  const routes = new Map<string, Pt[]>(), labels = new Map<string, Rect & { lines: string[] }>();
  for (const e of out.edges ?? []) {
    const o = abs.get(e.container ?? 'root') ?? { x: 0, y: 0 }, sec = e.sections?.[0];
    if (sec) routes.set(e.id, [sec.startPoint, ...(sec.bendPoints ?? []), sec.endPoint].map((p): Pt => [p.x + o.x, p.y + o.y]));
    const l = e.labels?.[0];
    if (l) labels.set(e.id, { x: (l.x ?? 0) + o.x, y: (l.y ?? 0) + o.y, w: l.width, h: l.height, lines: l.text.split('\n') });
  }
  return measure({ W: out.width ?? 0, H: out.height ?? 0, dir: v.dir, rects, groups, routes, labels }, edges);
}

// Layout hints: each node in its grid cell, each arrow a straight line between box borders.
function hintLayout(input: Input, edges: FEdge[], hints: Record<string, { col: number; row: number }>): Lay {
  const NW = 164, GX = 48, GY = 70, PAD = 16;
  const size = new Map(input.nodes.map((n) => [n.id, sized(n, NW)]));
  const cellH = Math.max(...[...size.values()].map((s) => s.h)) + GY;
  const lastRow = Math.max(-1, ...Object.values(hints).map((h) => h.row));
  let spare = 0;
  const rects = new Map<string, Rect & { lines: string[] }>();
  for (const n of input.nodes) {
    // A node without a hint goes on a row below the hinted ones.
    const h = hints[n.id] ?? { col: spare++, row: lastRow + 1 };
    const s = size.get(n.id) ?? { lines: [], w: NW, h: 0 };
    rects.set(n.id, { x: PAD + h.col * (NW + GX), y: PAD + h.row * cellH, w: s.w, h: s.h, lines: s.lines });
  }
  const groupBox = (g: FGroup, seen: Set<string>): Rect => {
    const parts = [...g.members.flatMap((m) => { const r = rects.get(m); return r ? [r] : []; }), ...g.groups.flatMap((c) => { const sub = input.groups.find((x) => x.id === c); return sub && !seen.has(c) ? [groupBox(sub, new Set([...seen, c]))] : []; })];
    const x0 = Math.min(...parts.map((r) => r.x)) - 12, y0 = Math.min(...parts.map((r) => r.y)) - 34;
    return { x: x0, y: y0, w: Math.max(...parts.map((r) => r.x + r.w)) + 12 - x0, h: Math.max(...parts.map((r) => r.y + r.h)) + 12 - y0 };
  };
  const groups = new Map(input.groups.map((g) => [g.id, groupBox(g, new Set([g.id]))]));
  const centre = (r: Rect): Pt => [r.x + r.w / 2, r.y + r.h / 2];
  const border = (r: Rect, toward: Pt): Pt => {
    const [cx, cy] = centre(r), dx = toward[0] - cx, dy = toward[1] - cy;
    const t = Math.min(dx ? r.w / 2 / Math.abs(dx) : Infinity, dy ? r.h / 2 / Math.abs(dy) : Infinity);
    return [cx + dx * t, cy + dy * t];
  };
  const routes = new Map<string, Pt[]>(), labels = new Map<string, Rect & { lines: string[] }>();
  for (const e of edges) {
    const a = rects.get(e.from), b = rects.get(e.to);
    if (!a || !b) continue;
    // A self-loop has no direction between centres; it goes out of the box's right side and back, inside the gap.
    const route: Pt[] = a === b
      ? [[a.x + a.w, a.y + a.h * 0.3], [a.x + a.w + 14, a.y + a.h * 0.3], [a.x + a.w + 14, a.y + a.h * 0.7], [a.x + a.w, a.y + a.h * 0.7]]
      : [border(a, centre(b)), border(b, centre(a))];
    routes.set(e.id, route);
    const p = route[a === b ? 1 : 0] ?? [0, 0], q = route[a === b ? 2 : 1] ?? p;
    if (e.label) { const box = labelBox([e.label]); labels.set(e.id, { x: (p[0] + q[0]) / 2 - box.w / 2, y: (p[1] + q[1]) / 2 - box.h / 2, ...box, lines: [e.label] }); }
  }
  const all = [...rects.values(), ...groups.values()];
  const W = Math.max(...all.map((r) => r.x + r.w)) + PAD, H = Math.max(...all.map((r) => r.y + r.h)) + PAD;
  return measure({ W, H, dir: 'DOWN', rects, groups, routes, labels }, edges);
}

// system-flow's search: any variant at most 860 wide beats a wider one, then the lower score wins.
// ELK's own words for the first variant it rejected, kept for the report.
export class ElkError extends Error {}
async function layoutVariants(input: Input, edges: FEdge[]): Promise<Lay & { elkError?: string }> {
  if (input.hints) return hintLayout(input, edges, input.hints);
  let best: Lay | null = null;
  let firstError: string | undefined;
  const better = (r: Lay, b: Lay | null): boolean => !b || ((r.W <= MAX_W) !== (b.W <= MAX_W) ? r.W <= MAX_W : r.score < b.score);
  const tryAll = async (vs: Variant[]): Promise<void> => {
    for (const v of vs) {
      let r: Lay;
      // One variant ELK rejects; the others still compete.
      try { r = await elkVariant(input, edges, v); } catch (e) { firstError ??= String((e as Error)?.message ?? e).split('\n')[0]; continue; }
      if (better(r, best)) best = r;
    }
  };
  const dirs: Variant['dir'][] = ['RIGHT', 'DOWN'];
  await tryAll([188, 164, 144].flatMap((nw) => dirs.flatMap((dir) => [1.6, 1.0].map((aspect) => ({ nw, dir, aspect })))));
  const wide = (): boolean => best !== null && best.W > MAX_W;
  // Still wider than the column: let ELK wrap the layers into rows.
  if (wide()) await tryAll([164, 144, 128].flatMap((nw) => dirs.flatMap((dir) => [0.4, 0.6, 1.0].flatMap((aspect) => [false, true].map((wrap) => ({ nw, dir, aspect, wrap, lw: 10 }))))));
  // A top-to-bottom layout with at most four or five boxes per row.
  if (wide()) await tryAll([164, 144].flatMap((nw) => [4, 5].map((bound): Variant => ({ nw, dir: 'DOWN', aspect: 1.0, lw: 10, bound }))));
  if (!best) throw new ElkError(`ELK laid out no variant: ${firstError ?? 'no variant tried'}`);
  return firstError === undefined ? best : { ...(best as Lay), elkError: firstError };
}

// While more than 1 crossing, leave out the arrow that crosses most others, never the last arrow of a box.
async function layoutFigure(input: Input): Promise<{ lay: Lay & { elkError?: string }; edges: FEdge[]; dropped: FEdge[] }> {
  let edges = input.edges, lay = await layoutVariants(input, edges);
  const dropped: FEdge[] = [];
  while (lay.cross > MAX_CROSS && edges.length > 4) {
    const cnt = edges.map(() => 0), deg = new Map<string, number>();
    for (const e of edges) { deg.set(e.from, (deg.get(e.from) ?? 0) + 1); deg.set(e.to, (deg.get(e.to) ?? 0) + 1); }
    edges.forEach((e, i) => {
      for (let j = i + 1; j < edges.length; j++) {
        const f = edges[j];
        if (!f) continue;
        for (const s1 of segsOf(lay.routes.get(e.id) ?? [])) for (const s2 of segsOf(lay.routes.get(f.id) ?? [])) { const c = segCross(s1, s2); cnt[i] = (cnt[i] ?? 0) + c; cnt[j] = (cnt[j] ?? 0) + c; }
      }
    });
    const score = edges.map((e, i) => ((cnt[i] ?? 0) > 0 && (deg.get(e.from) ?? 0) > 1 && (deg.get(e.to) ?? 0) > 1 ? cnt[i] ?? 0 : -1));
    const k = score.indexOf(Math.max(...score));
    const drop = edges[k];
    if (!drop || (score[k] ?? -1) < 0) break;
    dropped.push(drop);
    edges = edges.filter((_, i) => i !== k);
    lay = await layoutVariants(input, edges);
  }
  return { lay, edges, dropped };
}

// A label stays where ELK put it unless it lands on a box, another label or another arrow.
function placeLabels(lay: Lay, edges: FEdge[]): Map<string, (Rect & { lines: string[] }) | null> {
  const placed: Rect[] = [], out = new Map<string, (Rect & { lines: string[] }) | null>();
  for (const e of edges) {
    const l = lay.labels.get(e.id);
    const ok = !!l && ![...lay.rects.values()].some((r) => overlap(l, r)) && !placed.some((r) => overlap(l, r))
      && !edges.some((f) => f.id !== e.id && segsOf(lay.routes.get(f.id) ?? []).some((s) => segInRect(s, l)));
    if (l && ok) placed.push(l);
    out.set(e.id, l && ok ? l : null);
  }
  return out;
}

async function figureOf(input: Input): Promise<{ spec: FigureSpec; line: LayoutLine; elkError?: string }> {
  const { lay, edges, dropped } = await layoutFigure(input);
  const labels = placeLabels(lay, edges);
  const round = (r: Rect): Rect => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const order = [...lay.rects.entries()].sort(([, p], [, q]) => (lay.dir === 'RIGHT' ? p.x - q.x || p.y - q.y : p.y - q.y || p.x - q.x)).map(([id]) => id);
  const spec: FigureSpec = {
    key: input.key, kind: input.kind, width: Math.ceil(lay.W), height: Math.ceil(lay.H), direction: lay.dir,
    nodes: input.nodes.map((n) => { const r = lay.rects.get(n.id) ?? { x: 0, y: 0, w: 0, h: 0, lines: [] }; return { id: n.id, ...round(r), lines: r.lines, sub: n.sub, look: n.look, kind: n.kind, primary: n.primary, store: n.store }; }),
    edges: edges.map((e) => {
      const l = labels.get(e.id);
      return { id: e.id, d: roundedPath((lay.routes.get(e.id) ?? []).map(([x, y]): Pt => [r1(x), r1(y)])), mode: e.mode, label: l ? { ...round(l), text: l.lines.join(' ') } : null };
    }),
    groups: input.groups.map((g) => ({ id: g.id, label: g.label, ...round(lay.groups.get(g.id) ?? { x: 0, y: 0, w: 0, h: 0 }) })),
    steps: input.steps(new Set(edges.map((e) => e.id)), order),
    notDrawn: dropped.map((e) => e.id),
  };
  const line: LayoutLine = {
    key: spec.key, width: spec.width, height: spec.height, direction: spec.direction, crossings: lay.cross, nodeHits: lay.hits,
    nodes: spec.nodes.length, arrows: spec.edges.length, notDrawn: spec.notDrawn.length, unlabelled: spec.edges.filter((e) => !e.label).length,
  };
  return { spec, line, ...(lay.elkError === undefined ? {} : { elkError: lay.elkError }) };
}

// ---------------------------------------------------------------- lifelines
// A sequence is a grid, laid out here without ELK: participant boxes 44 px tall at y 14, one row per message.
const ROW0 = 72, ROW = 40, SELF_ROW = 56, ARROW_DY = 28, MARGIN = 14, LABEL_H = 16, LABEL_CW = 7; // 12 px text, room for the bold active label

// At most 2 lines of the label at 13 px within the box; the second line ends in an ellipsis when the label runs on.
function laneLines(label: string, w: number): string[] {
  const n = Math.max(4, Math.floor((w - 12) / CW));
  const lines = wrapText(label, n).flatMap((l) => (l.length > n ? [l.slice(0, n)] : [l]));
  const all = label.split(/\s+/).join(' ');
  if (lines.length <= 2 && lines.join(' ') === all) return lines;
  const two = lines.slice(0, 2);
  const last = two[two.length - 1] ?? '';
  two[two.length - 1] = `${(last.length >= n ? last.slice(0, n - 1) : last).trimEnd()}\u2026`;
  return two;
}
const endStop = (s: string): string => `${s.trim().replace(/[.!?]+$/, '')}.`;

export function lifelines(q: Model['sequences'][number]): { spec: FigureSpec; line: LayoutLine } {
  const n = q.participants.length;
  const c = Math.min(180, Math.max(104, Math.floor(832 / n)));
  const width = n * c + 2 * MARGIN;
  const lanes = q.participants.map((p, k) => ({ id: p.id, x: MARGIN + c * k + c / 2, w: c - 12, lines: laneLines(p.label, c - 12), title: p.label, look: p.look }));
  const lane = new Map(lanes.map((l) => [l.id, l]));
  const name = (id: string): string => lane.get(id)?.title ?? id;
  let y = ROW0;
  const rows = q.messages.map((m) => {
    const x1 = lane.get(m.from)?.x ?? 0, x2 = lane.get(m.to)?.x ?? 0, self = m.from === m.to, reply = m.reply === true;
    const text = shortLabel(m.label, m.short);
    const w = Math.ceil((`${m.n} ${text}`.length) * LABEL_CW + 12);
    // From the calling lifeline toward the arrow's end; shifted inward so it never passes the figure's edge.
    const want = x2 < x1 ? x1 - 6 - w : x1 + 6;
    const label = { x: Math.round(Math.max(MARGIN, Math.min(want, width - MARGIN - w))), y: y + ARROW_DY - 4 - LABEL_H, w, h: LABEL_H };
    const row = { id: `${q.id}#${m.n}`, n: m.n, y, from: m.from, to: m.to, x1, x2, self, mode: m.mode ?? 'sync', reply, leaves: lane.get(m.to)?.look === 'external' && !reply, text, label };
    y += self ? SELF_ROW : ROW;
    return row;
  });
  const height = y + 24;
  const steps = q.messages.map((m): FigureStep => ({
    edges: [`${q.id}#${m.n}`], nodes: [m.from, m.to], caption: `Step ${m.n}: ${name(m.from)} to ${name(m.to)}: ${endStop(m.label)}`, where: where(m.evidence),
  }));
  const spec: FigureSpec = { key: `seq-${q.id}`, kind: 'sequence', width, height, direction: 'DOWN', nodes: [], edges: [], groups: [], lanes, rows, steps, notDrawn: [] };
  const line: LayoutLine = { key: spec.key, width, height, direction: 'DOWN', crossings: 0, nodeHits: 0, nodes: n, arrows: rows.length, notDrawn: 0, unlabelled: 0, participants: n, messages: rows.length, scrolls: width > MAX_W };
  return { spec, line };
}

export function reportLine(l: LayoutLine): string {
  if (l.participants !== undefined) return `${l.key} ${l.width}x${l.height} lifelines participants=${l.participants} messages=${l.messages ?? 0} scrolls at ${MAX_W}: ${l.scrolls ? 'yes' : 'no'}`;
  return `${l.key} ${l.width}x${l.height} ${l.direction} crossings=${l.crossings} hits=${l.nodeHits} nodes=${l.nodes} arrows=${l.arrows} notDrawn=${l.notDrawn} unlabelled=${l.unlabelled}`;
}

// Every inline figure: each level diagram, each sequence and each store flow, in model order.
// A figure ELK could not lay out at all is unfit with `elk` set: an ELK error, not a figure to split.
export async function layoutAll(model: Model): Promise<{ figures: FigureSpec[]; report: LayoutLine[]; unfit: { key: string; line: string; elk?: string }[] }> {
  const figures: FigureSpec[] = [], report: LayoutLine[] = [], unfit: { key: string; line: string; elk?: string }[] = [];
  const boxes = async (inputs: Input[]): Promise<void> => {
    for (const input of inputs) {
      let laid: Awaited<ReturnType<typeof figureOf>>;
      try { laid = await figureOf(input); } catch (e) {
        if (!(e instanceof ElkError)) throw e;
        unfit.push({ key: input.key, line: '', elk: e.message });
        continue;
      }
      const { spec, line, elkError } = laid;
      figures.push(spec);
      report.push(line);
      if (line.crossings > MAX_CROSS || line.width > MAX_W) unfit.push({ key: line.key, line: reportLine(line), ...(elkError === undefined ? {} : { elk: `ELK rejected some variants: ${elkError}` }) });
    }
  };
  await boxes(model.levels.diagrams.map(levelInput));
  // A sequence is never unfit here: 9 to 12 participants scroll inside the card, and the check caps the count.
  for (const q of model.sequences) { const { spec, line } = lifelines(q); figures.push(spec); report.push(line); }
  await boxes(model.storeFlows.map(flowInput));
  return { figures, report, unfit };
}
