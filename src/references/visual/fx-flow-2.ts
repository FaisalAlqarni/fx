// The inline figure player for the system flow site. The page supplies the figure
// specs inline in <script type="application/json" id="diagrams"> (an object keyed by
// figure key) and one card per figure: figure.card > div.fig (the scroller) and
// div.ctl[data-fx-flow="<key>"] (the bar, holding a.deep). This file draws the SVG at 1:1
// into .fig, a box figure (nodes and edges) or a lifeline sequence (lanes and rows), puts
// Play or Pause, Back, Next, Reset, the narration, the count and a live region for the reader's own steps before a.deep,
// steps every 1.6 s, plays the first time the figure reaches the middle of the window,
// pauses while the card is off screen, scrolls .fig sideways to the active arrow, and
// plays nothing on its own under reduced motion.
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
const STEP_MS = 1600;
const TOKEN_MS = 900;

function svg(tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

function button(cls: string, text: string, onClick: () => void, label?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = text;
  if (label !== undefined) b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

const REST = 'Press Play, or step with Next.';

// card: figure.card; fig: its .fig scroller; ctl: its .ctl bar.
function mountFigure(card: Element, fig: Element, ctl: Element, spec: FigureSpec): void {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  fig.textContent = '';
  // 1:1, never shrunk: a figure wider than the card scrolls inside .fig.
  const root = svg('svg', {
    viewBox: `0 0 ${spec.width} ${spec.height}`, width: spec.width, height: spec.height, role: 'img', 'aria-label': card.querySelector('h3')?.textContent ?? spec.key,
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

  const narr = document.createElement('span');
  narr.className = 'narr';
  // The narration is not live: autoplay would speak every 1.6 s. A step the reader takes is copied into `said`.
  const said = document.createElement('span');
  said.className = 'vh';
  said.setAttribute('aria-live', 'polite');
  // Every caption sits hidden in the same grid cell as the live one, so the bar is as tall as its longest caption from
  // the start: a step never changes the card's height, and the page below does not move while a figure plays.
  const narrBox = document.createElement('span');
  narrBox.className = 'narr-box';
  narrBox.append(narr);
  for (const s of [...spec.steps, undefined]) {
    const size = document.createElement('span');
    size.className = 'narr-size';
    size.setAttribute('aria-hidden', 'true');
    size.textContent = s ? s.caption : REST;
    if (s?.where) { const code = document.createElement('code'); code.textContent = s.where; size.append(' ', code); }
    narrBox.append(size);
  }
  const counter = document.createElement('span');
  counter.className = 'count';
  const last = spec.steps.length - 1;
  let at = -1; // -1: at rest, before step 1
  let timer: number | undefined;
  let frame: number | undefined;
  let started = false; // autoplay starts a figure once, and never after the reader touched it
  let parked = false; // the card observer paused it, so the card observer may resume it

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

  // Scrolls .fig sideways (never the page) so the active arrow and its label are in view.
  function follow(step: FigStep | undefined): void {
    const a = step ? arrows.get(step.edges[0] ?? '') : undefined;
    if (!a || fig.scrollWidth <= fig.clientWidth) return;
    const f = fig.getBoundingClientRect();
    const boxes = a.els.map((el) => el.getBoundingClientRect());
    const left = Math.min(...boxes.map((b) => b.left)) - f.left + fig.scrollLeft;
    const right = Math.max(...boxes.map((b) => b.right)) - f.left + fig.scrollLeft;
    if (left >= fig.scrollLeft && right <= fig.scrollLeft + fig.clientWidth) return;
    fig.scrollTo({ left: Math.max(0, (left + right) / 2 - fig.clientWidth / 2), behavior: reduced ? 'instant' : 'smooth' });
  }

  function paint(spoken = false): void {
    const seen = new Set<string>();
    const lit = new Set<string>();
    spec.steps.forEach((s, i) => {
      if (i > at) return;
      for (const id of [...s.edges, ...s.nodes]) { seen.add(id); if (i === at) lit.add(id); }
    });
    const all = at < 0; // at rest, the whole figure shows
    for (const [id, a] of arrows) {
      for (const el of a.els) el.setAttribute('opacity', all || seen.has(id) ? '1' : '0.25');
      a.path.setAttribute('stroke', lit.has(id) ? 'var(--accent)' : a.rest[0]);
      a.path.setAttribute('stroke-width', String(lit.has(id) ? 2.8 : a.rest[1]));
      a.label?.setAttribute('font-weight', lit.has(id) ? 'bold' : 'normal');
    }
    for (const [id, el] of nodeEls) el.setAttribute('opacity', all || seen.has(id) ? '1' : '0.35');
    const step = spec.steps[at];
    counter.textContent = `${at + 1} / ${spec.steps.length}`;
    narr.textContent = step ? step.caption : REST;
    if (step?.where) { const code = document.createElement('code'); code.textContent = step.where; narr.append(' ', code); }
    said.textContent = spoken ? narr.textContent : '';
    moveToken(step);
    follow(step);
  }

  function go(i: number, spoken = false): void {
    at = Math.max(-1, Math.min(last, i));
    paint(spoken);
  }
  // Stops playback; the button reads Play again.
  function halt(): void {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
    playBtn.textContent = 'Play';
  }
  // Shows the next step at once (step 1 again from the last step), then one step every 1.6 s; the last step stops it for good.
  // spoken: the reader pressed Play, so its first step is announced; the steps that follow are not.
  function play(spoken = false): void {
    started = true;
    parked = false;
    halt();
    go(at >= last ? 0 : at + 1, spoken);
    if (at >= last) return;
    playBtn.textContent = 'Pause';
    timer = window.setInterval(() => {
      go(at + 1);
      if (at >= last) halt();
    }, STEP_MS);
  }
  // A reader's own action: autoplay and the card observer leave the figure alone from here on.
  const by = (f: () => void) => (): void => { started = true; parked = false; f(); };
  const playBtn = button('play', 'Play', () => (timer === undefined ? play(true) : by(halt)()));
  const back = button('back', '\u2039', by(() => { halt(); go(at - 1, true); }), 'Back');
  const next = button('next', '\u203A', by(() => { halt(); go(at + 1, true); }), 'Next');
  const reset = button('reset', 'Reset', by(() => { halt(); go(-1, true); }));
  if (spec.steps.length === 0) for (const b of [playBtn, next, reset]) b.disabled = true;
  ctl.setAttribute('role', 'group');
  ctl.setAttribute('aria-label', `${card.querySelector('h3')?.textContent ?? spec.key} controls`);
  const deep = ctl.querySelector('a.deep');
  for (const el of [playBtn, back, next, reset, narrBox, counter, said]) ctl.insertBefore(el, deep);
  fig.append(root);
  paint();
  // The sticky bar must not cover a focused part of its own card: each keeps a scroll margin as tall as the bar.
  const clear = (): void => { for (const el of card.querySelectorAll<HTMLElement>('.fig, .cap a')) el.style.scrollMarginBlockEnd = `${ctl.getBoundingClientRect().height}px`; };
  clear();
  if (typeof ResizeObserver === 'function') new ResizeObserver(clear).observe(ctl);

  if (!reduced && spec.steps.length > 0 && typeof IntersectionObserver === 'function') {
    // Plays the first time any part of .fig enters the middle band of the window.
    const band = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        band.disconnect();
        if (!started) play();
      }
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    band.observe(fig);
    // Pauses while no part of the card is visible; resumes only what this observer paused.
    new IntersectionObserver((entries) => {
      const seen = entries.some((en) => en.isIntersecting);
      if (!seen && timer !== undefined) { halt(); parked = true; }
      else if (seen && parked) play();
    }, { threshold: 0 }).observe(card);
  }
}

// root: where to look for cards, the whole page by default.
function mount(root: ParentNode = document): void {
  const dataEl = document.getElementById('diagrams');
  if (!dataEl) return;
  const data: unknown = JSON.parse(dataEl.textContent ?? ''); // ts-gate-ok: page-supplied figure specs, validated per figure below
  root.querySelectorAll('.ctl[data-fx-flow]').forEach((ctl) => {
    const card = ctl.closest('figure.card');
    const fig = card?.querySelector('.fig');
    if (!card || !fig) return;
    const spec = field(data, ctl.getAttribute('data-fx-flow') ?? '');
    const errors = validateFigure(spec);
    if (errors.length || !isFigure(spec)) { fig.textContent = `Figure is invalid: ${errors.join('; ')}`; return; }
    mountFigure(card, fig, ctl, spec);
  });
}

Reflect.set(globalThis, 'fxFlow', { validateFigure, mount });
// mount runs only on a page that has figure data, so node can load this file.
if (typeof document !== 'undefined') mount();

export {}; // a module, so its names do not collide with fx-map-1.ts in the browser project
