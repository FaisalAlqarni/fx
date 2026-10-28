// The inline figure player for the system flow site. The page supplies the figure
// specs inline in <script type="application/json" id="diagrams"> (an object keyed by
// figure key) and one <figure data-fx-flow="<key>"> per figure. This file draws the
// SVG, a box figure (nodes and edges) or a lifeline sequence (lanes and rows), steps
// through it with Back, Play or Pause, Next and Reset, names the code for each step in
// an aria-live caption, moves a token along the step's arrow, plays when the figure
// scrolls into view, and does not animate under reduced motion.
// The FigureSpec shape is copied from src/lib/sf-model.ts: a browser file cannot
// import a Node module. scripts/build wraps this in an IIFE; loaded with no DOM
// (the gate test, node) it only exports fxFlow.

type Look = 'service' | 'store' | 'client' | 'external' | 'security';
interface FigNode { id: string; x: number; y: number; w: number; h: number; lines: string[]; sub: string; look: Look; kind: string; primary: boolean; store: boolean }
interface FigEdge { id: string; d: string; mode: 'sync' | 'async'; label: { x: number; y: number; w: number; h: number; text: string } | null }
interface FigGroup { id: string; label: string; x: number; y: number; w: number; h: number }
interface FigLane { id: string; x: number; w: number; lines: string[]; title: string; look: Look }
interface FigRow { id: string; n: number; y: number; from: string; to: string; x1: number; x2: number; self: boolean; mode: 'sync' | 'async'; reply: boolean; leaves: boolean; text: string; label: { x: number; y: number; w: number; h: number } }
interface FigStep { edges: string[]; nodes: string[]; caption: string; where: string | null }
interface FigureSpec { key: string; kind: string; width: number; height: number; nodes: FigNode[]; edges: FigEdge[]; groups: FigGroup[]; lanes?: FigLane[]; rows?: FigRow[]; steps: FigStep[] }

const MAX_WIDTH = 860;

function field(v: unknown, k: string): unknown {
  return typeof v === 'object' && v !== null ? Reflect.get(v, k) : undefined;
}
const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

function isFigure(v: unknown): v is FigureSpec {
  return typeof field(v, 'key') === 'string' && typeof field(v, 'width') === 'number' && typeof field(v, 'height') === 'number' &&
    isArr(field(v, 'nodes')) && isArr(field(v, 'edges')) && isArr(field(v, 'groups')) && isArr(field(v, 'steps'));
}

// A lifeline spec (lanes and rows) may be wider than 860 px: it scrolls inside its card.
function validateFigure(spec: unknown): string[] {
  if (!isFigure(spec)) return ['figure needs key, width, height, nodes, edges, groups and steps'];
  const lifeline = isArr(spec.lanes) && isArr(spec.rows);
  const out: string[] = [];
  const edges = new Set((lifeline ? spec.rows ?? [] : spec.edges).map((e) => e.id));
  const nodes = new Set((lifeline ? spec.lanes ?? [] : spec.nodes).map((n) => n.id));
  spec.steps.forEach((s, i) => {
    for (const e of s.edges) if (!edges.has(e)) out.push(`figure ${spec.key}: step ${i} names a missing ${lifeline ? 'row' : 'edge'} ${e}`);
    for (const n of s.nodes) if (!nodes.has(n)) out.push(`figure ${spec.key}: step ${i} names a missing node ${n}`);
  });
  if (!lifeline && spec.width > MAX_WIDTH) out.push(`figure ${spec.key}: wider than ${MAX_WIDTH} px`);
  return out;
}

// Stroke, dash and tint by look: store with a cap line, client tinted info, external dashed muted, security violet.
const LOOK: Record<Look, { stroke: string; dash?: string; tint?: string }> = {
  service: { stroke: 'var(--accent)' }, store: { stroke: 'var(--ink)' }, client: { stroke: 'var(--info)', tint: 'var(--info)' },
  external: { stroke: 'var(--muted)', dash: '5 4', tint: 'var(--muted)' }, security: { stroke: 'var(--violet)' },
};
const lookAttrs = (look: Look): Record<string, string | number> => {
  const l = LOOK[look] ?? LOOK.service;
  return { stroke: l.stroke, 'stroke-width': 1.6, style: `fill:${l.tint ? `color-mix(in srgb, ${l.tint} 14%, var(--panel))` : 'var(--panel)'}`, ...(l.dash ? { 'stroke-dasharray': l.dash } : {}) };
};

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
  const open = svg('marker', { id: `${spec.key}-open`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  svg('path', { d: 'M0 0L10 5L0 10', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.6 }, open);

  // Every arrow keeps its rest stroke and width, its label text and its path; paint() lights the active step's.
  type Arrow = { path: SVGElement; label: SVGElement | null; rest: [string, number]; els: SVGElement[] };
  const arrows = new Map<string, Arrow>();
  const edgePaths = new Map<string, SVGGeometryElement>();
  const nodeEls = new Map<string, SVGElement>();
  const arrow = (id: string, d: string, attrs: Record<string, string | number>, rest: [string, number], label: { x: number; y: number; w: number; h: number } | null, text: (t: SVGElement) => void, anchor: 'middle' | 'start'): void => {
    const p = svg('path', { d, fill: 'none', stroke: rest[0], 'stroke-width': rest[1], ...attrs }, root);
    const els: SVGElement[] = [p];
    let t: SVGElement | null = null;
    if (label) {
      els.push(svg('rect', { x: label.x, y: label.y, width: label.w, height: label.h, rx: 4, fill: 'var(--panel)' }, root));
      t = svg('text', { x: anchor === 'middle' ? label.x + label.w / 2 : label.x + 6, y: label.y + label.h - 4, 'text-anchor': anchor, fill: 'var(--ink)', 'font-size': 12 }, root);
      text(t);
      els.push(t);
    }
    if (p instanceof SVGGeometryElement) edgePaths.set(id, p);
    arrows.set(id, { path: p, label: t, rest, els });
  };

  if (spec.lanes && spec.rows) {
    for (const l of spec.lanes) {
      const g = svg('g', {}, root);
      svg('title', {}, g).textContent = l.title;
      svg('rect', { x: l.x - l.w / 2, y: 14, width: l.w, height: 44, rx: 8, ...lookAttrs(l.look) }, g);
      l.lines.forEach((line, i) => {
        svg('text', { x: l.x, y: 36 + (i - (l.lines.length - 1) / 2) * 15 + 4, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 13 }, g).textContent = line;
      });
      svg('line', { x1: l.x, y1: 58, x2: l.x, y2: spec.height - 12, stroke: 'var(--rule)', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }, g);
      nodeEls.set(l.id, g);
    }
    for (const r of spec.rows) {
      const y = r.y + 28;
      arrow(r.id, r.self ? `M${r.x1} ${y}h28v20h-28` : `M${r.x1} ${y}H${r.x2}`, {
        'marker-end': `url(#${spec.key}-${r.mode === 'async' ? 'open' : 'arrow'})`, ...(r.reply ? { 'stroke-dasharray': '6 4' } : {}),
      }, r.leaves ? ['var(--warn)', 2.4] : ['var(--muted)', 1.6], r.label, (t) => {
        svg('tspan', { 'font-weight': 'bold' }, t).textContent = String(r.n);
        t.appendChild(document.createTextNode(` ${r.text}`));
      }, 'start');
    }
  } else {
    for (const g of spec.groups) {
      svg('rect', { x: g.x, y: g.y, width: g.w, height: g.h, rx: 12, fill: 'none', stroke: 'var(--muted)', 'stroke-dasharray': '5 4' }, root);
      svg('text', { x: g.x + 10, y: g.y + 16, fill: 'var(--muted)', 'font-size': 12 }, root).textContent = g.label;
    }
    for (const e of spec.edges) {
      arrow(e.id, e.d, { 'marker-end': `url(#${spec.key}-arrow)`, ...(e.mode === 'async' ? { 'stroke-dasharray': '6 4' } : {}) },
        ['var(--muted)', 1.6], e.label, (t) => { t.textContent = e.label?.text ?? ''; }, 'middle');
    }
    for (const n of spec.nodes) {
      const g = svg('g', {}, root);
      svg('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: n.store ? 4 : 10, ...lookAttrs(n.look), ...(n.primary ? {} : { stroke: 'var(--muted)', 'stroke-dasharray': '5 4' }) }, g);
      if (n.look === 'store') svg('path', { d: `M${n.x} ${n.y + 8}h${n.w}`, stroke: 'var(--ink)', 'stroke-width': 1.2 }, g);
      // The label lines over the 12 px second line (role or kind), the block centred in the box.
      const top = n.y + n.h / 2 - ((n.lines.length - 1) * 15.5 + 15) / 2 + 4;
      n.lines.forEach((line, i) => {
        svg('text', { x: n.x + n.w / 2, y: top + i * 15.5, 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 13.5 }, g).textContent = line;
      });
      if (n.sub) svg('text', { x: n.x + n.w / 2, y: top + n.lines.length * 15.5, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 12 }, g).textContent = n.sub;
      nodeEls.set(n.id, g);
    }
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
    for (const [id, a] of arrows) {
      for (const el of a.els) el.setAttribute('opacity', all || seen.has(id) ? '1' : '0.25');
      a.path.setAttribute('stroke', lit.has(id) ? 'var(--accent)' : a.rest[0]);
      a.path.setAttribute('stroke-width', String(lit.has(id) ? 2.8 : a.rest[1]));
      a.label?.setAttribute('font-weight', lit.has(id) ? 'bold' : 'normal');
    }
    for (const [id, el] of nodeEls) el.setAttribute('opacity', all || seen.has(id) ? '1' : '0.35');
    const step = spec.steps[at];
    counter.textContent = at < 0 ? `Step 0 of ${spec.steps.length}` : `Step ${at + 1} of ${spec.steps.length}`;
    status.textContent = step ? step.caption : 'Press Play or Next to step through.';
    if (step?.where) { const code = document.createElement('code'); code.textContent = step.where; status.append(' ', code); }
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
