// generated from src/references/visual/fx-flow-1.ts by scripts/build: edit there, not here
"use strict";
(() => {
  const MAX_WIDTH = 860;
  function field(v, k) {
    return typeof v === "object" && v !== null ? Reflect.get(v, k) : void 0;
  }
  const isArr = (v) => Array.isArray(v);
  function isFigure(v) {
    return typeof field(v, "key") === "string" && typeof field(v, "width") === "number" && typeof field(v, "height") === "number" && isArr(field(v, "nodes")) && isArr(field(v, "edges")) && isArr(field(v, "groups")) && isArr(field(v, "steps"));
  }
  function validateFigure(spec) {
    if (!isFigure(spec)) return ["figure needs key, width, height, nodes, edges, groups and steps"];
    const out = [];
    const edges = new Set(spec.edges.map((e) => e.id));
    const nodes = new Set(spec.nodes.map((n) => n.id));
    spec.steps.forEach((s, i) => {
      for (const e of s.edges) if (!edges.has(e)) out.push(`figure ${spec.key}: step ${i} names a missing edge ${e}`);
      for (const n of s.nodes) if (!nodes.has(n)) out.push(`figure ${spec.key}: step ${i} names a missing node ${n}`);
    });
    if (spec.width > MAX_WIDTH) out.push(`figure ${spec.key}: wider than ${MAX_WIDTH} px`);
    return out;
  }
  const SVG_NS = "http://www.w3.org/2000/svg";
  const STEP_MS = 2200;
  const TOKEN_MS = 900;
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    parent?.appendChild(el);
    return el;
  }
  function button(label, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }
  function mountFigure(host, spec) {
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    host.textContent = "";
    const root = svg("svg", {
      viewBox: `0 0 ${spec.width} ${spec.height}`,
      width: spec.width,
      role: "img",
      "aria-label": spec.key,
      style: "max-inline-size:100%;block-size:auto;display:block"
    });
    const defs = svg("defs", {}, root);
    const marker = svg("marker", { id: `${spec.key}-arrow`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    svg("path", { d: "M0 0L10 5L0 10z", fill: "var(--muted)" }, marker);
    for (const g of spec.groups) {
      svg("rect", { x: g.x, y: g.y, width: g.w, height: g.h, rx: 12, fill: "none", stroke: "var(--muted)", "stroke-dasharray": "5 4" }, root);
      svg("text", { x: g.x + 10, y: g.y + 16, fill: "var(--muted)", "font-size": 12 }, root).textContent = g.label;
    }
    const edgeEls = /* @__PURE__ */ new Map();
    const edgePaths = /* @__PURE__ */ new Map();
    for (const e of spec.edges) {
      const els = [];
      const p = svg("path", {
        d: e.d,
        fill: "none",
        stroke: "var(--muted)",
        "stroke-width": 1.6,
        "marker-end": `url(#${spec.key}-arrow)`,
        ...e.mode === "async" ? { "stroke-dasharray": "6 4" } : {}
      }, root);
      els.push(p);
      if (p instanceof SVGGeometryElement) edgePaths.set(e.id, p);
      if (e.label) {
        els.push(svg("rect", { x: e.label.x, y: e.label.y, width: e.label.w, height: e.label.h, rx: 4, fill: "var(--panel)" }, root));
        const t = svg("text", { x: e.label.x + e.label.w / 2, y: e.label.y + e.label.h / 2 + 4, "text-anchor": "middle", fill: "var(--ink)", "font-size": 12 }, root);
        t.textContent = e.label.text;
        els.push(t);
      }
      edgeEls.set(e.id, els);
    }
    const nodeEls = /* @__PURE__ */ new Map();
    for (const n of spec.nodes) {
      const g = svg("g", {}, root);
      svg("rect", {
        x: n.x,
        y: n.y,
        width: n.w,
        height: n.h,
        rx: n.store ? 4 : 10,
        fill: "var(--panel)",
        stroke: n.primary ? "var(--accent)" : "var(--muted)",
        "stroke-width": 1.6,
        ...n.primary ? {} : { "stroke-dasharray": "5 4" }
      }, g);
      n.lines.forEach((line, i) => {
        svg("text", { x: n.x + n.w / 2, y: n.y + n.h / 2 + (i - (n.lines.length - 1) / 2) * 15 + 4, "text-anchor": "middle", fill: "var(--ink)", "font-size": 13 }, g).textContent = line;
      });
      nodeEls.set(n.id, g);
    }
    const token = svg("circle", { r: 6, fill: "var(--accent)", opacity: 0 }, root);
    const status = document.createElement("p");
    status.setAttribute("aria-live", "polite");
    const counter = document.createElement("span");
    let at = -1;
    let timer;
    let frame;
    function moveToken(step) {
      if (frame !== void 0) cancelAnimationFrame(frame);
      const path = step ? edgePaths.get(step.edges[0] ?? "") : void 0;
      if (!path || reduced) {
        token.setAttribute("opacity", "0");
        return;
      }
      const len = path.getTotalLength();
      const t0 = performance.now();
      token.setAttribute("opacity", "1");
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / TOKEN_MS);
        const pt = path.getPointAtLength(len * k);
        token.setAttribute("cx", String(pt.x));
        token.setAttribute("cy", String(pt.y));
        if (k < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    function paint() {
      const seen = /* @__PURE__ */ new Set();
      const lit = /* @__PURE__ */ new Set();
      spec.steps.forEach((s, i) => {
        if (i > at) return;
        for (const id of [...s.edges, ...s.nodes]) {
          seen.add(id);
          if (i === at) lit.add(id);
        }
      });
      const all = at < 0;
      for (const [id, els] of edgeEls) for (const el of els) {
        el.setAttribute("opacity", all || seen.has(id) ? "1" : "0.25");
        if (el.tagName === "path") el.setAttribute("stroke", lit.has(id) ? "var(--accent)" : "var(--muted)");
      }
      for (const [id, el] of nodeEls) el.setAttribute("opacity", all || seen.has(id) ? "1" : "0.35");
      const step = spec.steps[at];
      counter.textContent = at < 0 ? `Step 0 of ${spec.steps.length}` : `Step ${at + 1} of ${spec.steps.length}`;
      status.textContent = step ? step.caption : "Press Play or Next to step through.";
      moveToken(step);
    }
    function go(i) {
      at = Math.max(-1, Math.min(spec.steps.length - 1, i));
      paint();
    }
    function stop() {
      if (timer !== void 0) clearInterval(timer);
      timer = void 0;
      playBtn.textContent = "Play";
    }
    function play() {
      if (at >= spec.steps.length - 1) go(-1);
      playBtn.textContent = "Pause";
      timer = window.setInterval(() => {
        if (at >= spec.steps.length - 1) {
          stop();
          return;
        }
        go(at + 1);
      }, STEP_MS);
      go(at + 1);
    }
    const playBtn = button("Play", () => timer === void 0 ? play() : stop());
    const bar = document.createElement("div");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", `${spec.key} controls`);
    bar.append(
      button("Back", () => {
        stop();
        go(at - 1);
      }),
      playBtn,
      button("Next", () => {
        stop();
        go(at + 1);
      }),
      button("Reset", () => {
        stop();
        go(-1);
      }),
      counter
    );
    host.append(root, bar, status);
    paint();
    if (!reduced && typeof IntersectionObserver === "function") {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting) && at < 0 && timer === void 0) {
          play();
          io.disconnect();
        }
      }, { threshold: 0.6 });
      io.observe(host);
    }
  }
  function mount() {
    const dataEl = document.getElementById("diagrams");
    if (!dataEl) return;
    const data = JSON.parse(dataEl.textContent ?? "");
    document.querySelectorAll("figure[data-fx-flow]").forEach((fig) => {
      const spec = field(data, fig.getAttribute("data-fx-flow") ?? "");
      const errors = validateFigure(spec);
      if (errors.length || !isFigure(spec)) {
        fig.textContent = `Figure is invalid: ${errors.join("; ")}`;
        return;
      }
      mountFigure(fig, spec);
    });
  }
  Reflect.set(globalThis, "fxFlow", { validateFigure, mount });
  if (typeof document !== "undefined") mount();
})();
