// The inline figure player for the system flow site. The page supplies the figure
// specs inline in <script type="application/json" id="diagrams"> (an object keyed by
// figure key) and one <figure data-fx-flow="<key>"> per figure. This file draws the
// SVG, steps through it with Back, Play or Pause, Next and Reset, names the code for
// each step in an aria-live caption, moves a token along the step's arrow, plays when
// the figure scrolls into view, and does not animate under reduced motion.
// The FigureSpec shape is copied from src/lib/sf-model.ts: a browser file cannot
// import a Node module. scripts/build wraps this in an IIFE; loaded with no DOM
// (the gate test, node) it only exports fxFlow.

interface FigNode { id: string; x: number; y: number; w: number; h: number; lines: string[]; kind: string; primary: boolean; store: boolean }
interface FigEdge { id: string; d: string; mode: 'sync' | 'async'; label: { x: number; y: number; w: number; h: number; text: string } | null }
interface FigGroup { id: string; label: string; x: number; y: number; w: number; h: number }
interface FigStep { edges: string[]; nodes: string[]; caption: string }
interface FigureSpec { key: string; kind: string; width: number; height: number; nodes: FigNode[]; edges: FigEdge[]; groups: FigGroup[]; steps: FigStep[] }

const MAX_WIDTH = 860;

function field(v: unknown, k: string): unknown {
  return typeof v === 'object' && v !== null ? Reflect.get(v, k) : undefined;
}
const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

function isFigure(v: unknown): v is FigureSpec {
  return typeof field(v, 'key') === 'string' && typeof field(v, 'width') === 'number' && typeof field(v, 'height') === 'number' &&
    isArr(field(v, 'nodes')) && isArr(field(v, 'edges')) && isArr(field(v, 'groups')) && isArr(field(v, 'steps'));
}

function validateFigure(spec: unknown): string[] {
  if (!isFigure(spec)) return ['figure needs key, width, height, nodes, edges, groups and steps'];
  const out: string[] = [];
  const edges = new Set(spec.edges.map((e) => e.id));
  const nodes = new Set(spec.nodes.map((n) => n.id));
  spec.steps.forEach((s, i) => {
    for (const e of s.edges) if (!edges.has(e)) out.push(`figure ${spec.key}: step ${i} names a missing edge ${e}`);
    for (const n of s.nodes) if (!nodes.has(n)) out.push(`figure ${spec.key}: step ${i} names a missing node ${n}`);
  });
  if (spec.width > MAX_WIDTH) out.push(`figure ${spec.key}: wider than ${MAX_WIDTH} px`);
  return out;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const STEP_MS = 2200;
const TOKEN_MS = 900;

function svg(tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function mountFigure(host: Element, spec: FigureSpec): void {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.textContent = '';
  const root = svg('svg', {
    viewBox: `0 0 ${spec.width} ${spec.height}`, width: spec.width, role: 'img', 'aria-label': spec.key,
    style: 'max-inline-size:100%;block-size:auto;display:block',
  });
  const defs = svg('defs', {}, root);
  const marker = svg('marker', { id: `${spec.key}-arrow`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  svg('path', { d: 'M0 0L10 5L0 10z', fill: 'var(--muted)' }, marker);

  for (const g of spec.groups) {
    svg('rect', { x: g.x, y: g.y, width: g.w, height: g.h, rx: 12, fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '5 4' }, root);
    svg('text', { x: g.x + 10, y: g.y + 16, fill: 'var(--muted)', 'font-size': 12 }, root).textContent = g.label;
  }
  const edgeEls = new Map<string, SVGElement[]>();
  const edgePaths = new Map<string, SVGGeometryElement>();
  for (const e of spec.edges) {
    const els: SVGElement[] = [];
    const p = svg('path', {
      d: e.d, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.6, 'marker-end': `url(#${spec.key}-arrow)`,
      ...(e.mode === 'async' ? { 'stroke-dasharray': '6 4' } : {}),
    }, root);
    els.push(p);
    if (p instanceof SVGGeometryElement) edgePaths.set(e.id, p);
    if (e.label) {
      els.push(svg('rect', { x: e.label.x, y: e.label.y, width: e.label.w, height: e.label.h, rx: 4, fill: 'var(--panel)' }, root));
      const t = svg('text', { x: e.label.x + e.label.w / 2, y: e.label.y + e.label.h / 2 + 4, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 12 }, root);
      t.textContent = e.label.text;
      els.push(t);
    }
    edgeEls.set(e.id, els);
  }
  const nodeEls = new Map<string, SVGElement>();
  for (const n of spec.nodes) {
    const g = svg('g', {}, root);
    svg('rect', {
      x: n.x, y: n.y, width: n.w, height: n.h, rx: n.store ? 4 : 10, fill: 'var(--panel)',
      stroke: n.primary ? 'var(--accent)' : 'var(--muted)', 'stroke-width': 1.6, ...(n.primary ? {} : { 'stroke-dasharray': '5 4' }),
    }, g);
    n.lines.forEach((line, i) => {
      svg('text', { x: n.x + n.w / 2, y: n.y + n.h / 2 + (i - (n.lines.length - 1) / 2) * 15 + 4, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 13 }, g).textContent = line;
    });
    nodeEls.set(n.id, g);
  }
  const token = svg('circle', { r: 6, fill: 'var(--accent)', opacity: 0 }, root);

  const status = document.createElement('p');
  status.setAttribute('aria-live', 'polite');
  const counter = document.createElement('span');
  let at = -1; // -1: nothing played yet
  let timer: number | undefined;
  let frame: number | undefined;

  function moveToken(step: FigStep | undefined): void {
    if (frame !== undefined) cancelAnimationFrame(frame);
    const path = step ? edgePaths.get(step.edges[0] ?? '') : undefined;
    if (!path || reduced) { token.setAttribute('opacity', '0'); return; }
    const len = path.getTotalLength();
    const t0 = performance.now();
    token.setAttribute('opacity', '1');
    const tick = (now: number): void => {
      const k = Math.min(1, (now - t0) / TOKEN_MS);
      const pt = path.getPointAtLength(len * k);
      token.setAttribute('cx', String(pt.x));
      token.setAttribute('cy', String(pt.y));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }

  function paint(): void {
    const seen = new Set<string>();
    const lit = new Set<string>();
    spec.steps.forEach((s, i) => {
      if (i > at) return;
      for (const id of [...s.edges, ...s.nodes]) { seen.add(id); if (i === at) lit.add(id); }
    });
    const all = at < 0; // before the first step, the whole figure shows at rest
    for (const [id, els] of edgeEls) for (const el of els) {
      el.setAttribute('opacity', all || seen.has(id) ? '1' : '0.25');
      if (el.tagName === 'path') el.setAttribute('stroke', lit.has(id) ? 'var(--accent)' : 'var(--muted)');
    }
    for (const [id, el] of nodeEls) el.setAttribute('opacity', all || seen.has(id) ? '1' : '0.35');
    const step = spec.steps[at];
    counter.textContent = at < 0 ? `Step 0 of ${spec.steps.length}` : `Step ${at + 1} of ${spec.steps.length}`;
    status.textContent = step ? step.caption : 'Press Play or Next to step through.';
    moveToken(step);
  }

  function go(i: number): void {
    at = Math.max(-1, Math.min(spec.steps.length - 1, i));
    paint();
  }
  function stop(): void {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    playBtn.textContent = 'Play';
  }
  function play(): void {
    if (at >= spec.steps.length - 1) go(-1);
    playBtn.textContent = 'Pause';
    timer = window.setInterval(() => {
      if (at >= spec.steps.length - 1) { stop(); return; }
      go(at + 1);
    }, STEP_MS);
    go(at + 1);
  }
  const playBtn = button('Play', () => (timer === undefined ? play() : stop()));
  const bar = document.createElement('div');
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', `${spec.key} controls`);
  bar.append(button('Back', () => { stop(); go(at - 1); }), playBtn, button('Next', () => { stop(); go(at + 1); }),
    button('Reset', () => { stop(); go(-1); }), counter);
  host.append(root, bar, status);
  paint();

  if (!reduced && typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting) && at < 0 && timer === undefined) { play(); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(host);
  }
}

function mount(): void {
  const dataEl = document.getElementById('diagrams');
  if (!dataEl) return;
  const data: unknown = JSON.parse(dataEl.textContent ?? ''); // ts-gate-ok: page-supplied figure specs, validated per figure below
  document.querySelectorAll('figure[data-fx-flow]').forEach((fig) => {
    const spec = field(data, fig.getAttribute('data-fx-flow') ?? '');
    const errors = validateFigure(spec);
    if (errors.length || !isFigure(spec)) { fig.textContent = `Figure is invalid: ${errors.join('; ')}`; return; }
    mountFigure(fig, spec);
  });
}

Reflect.set(globalThis, 'fxFlow', { validateFigure, mount });
// mount runs only on a page that has figure data, so node can load this file.
if (typeof document !== 'undefined') mount();

export {}; // a module, so its names do not collide with fx-map-1.ts in the browser project
