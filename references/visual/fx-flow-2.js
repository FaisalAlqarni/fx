// generated from src/references/visual/fx-flow-2.ts by scripts/build: edit there, not here
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
    const lifeline = isArr(spec.lanes) && isArr(spec.rows);
    const out = [];
    const edges = new Set((lifeline ? spec.rows ?? [] : spec.edges).map((e) => e.id));
    const nodes = new Set((lifeline ? spec.lanes ?? [] : spec.nodes).map((n) => n.id));
    spec.steps.forEach((s, i) => {
      for (const e of s.edges) if (!edges.has(e)) out.push(`figure ${spec.key}: step ${i} names a missing ${lifeline ? "row" : "edge"} ${e}`);
      for (const n of s.nodes) if (!nodes.has(n)) out.push(`figure ${spec.key}: step ${i} names a missing node ${n}`);
    });
    if (!lifeline && spec.width > MAX_WIDTH) out.push(`figure ${spec.key}: wider than ${MAX_WIDTH} px`);
    return out;
  }
  const LOOK = {
    service: { stroke: "var(--accent)" },
    store: { stroke: "var(--ink)" },
    client: { stroke: "var(--info)", tint: "var(--info)" },
    external: { stroke: "var(--muted)", dash: "5 4", tint: "var(--muted)" },
    security: { stroke: "var(--violet)" }
  };
  const lookAttrs = (look) => {
    const l = LOOK[look] ?? LOOK.service;
    return { stroke: l.stroke, "stroke-width": 1.6, style: `fill:${l.tint ? `color-mix(in srgb, ${l.tint} 14%, var(--panel))` : "var(--panel)"}`, ...l.dash ? { "stroke-dasharray": l.dash } : {} };
  };
  const SVG_NS = "http://www.w3.org/2000/svg";
  const STEP_MS = 1600;
  const TOKEN_MS = 900;
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    parent?.appendChild(el);
    return el;
  }
  function button(cls, text, onClick, label) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = text;
    if (label !== void 0) b.setAttribute("aria-label", label);
    b.addEventListener("click", onClick);
    return b;
  }
  const REST = "Press Play, or step with Next.";
  function mountFigure(card, fig, ctl, spec) {
    const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    fig.textContent = "";
    const root = svg("svg", {
      viewBox: `0 0 ${spec.width} ${spec.height}`,
      width: spec.width,
      height: spec.height,
      role: "img",
      "aria-label": card.querySelector("h3")?.textContent ?? spec.key
    });
    const defs = svg("defs", {}, root);
    const marker = svg("marker", { id: `${spec.key}-arrow`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    svg("path", { d: "M0 0L10 5L0 10z", fill: "var(--muted)" }, marker);
    const open = svg("marker", { id: `${spec.key}-open`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    svg("path", { d: "M0 0L10 5L0 10", fill: "none", stroke: "var(--muted)", "stroke-width": 1.6 }, open);
    const arrows = /* @__PURE__ */ new Map();
    const edgePaths = /* @__PURE__ */ new Map();
    const nodeEls = /* @__PURE__ */ new Map();
    const arrow = (id, d, attrs, rest, label, text, anchor) => {
      const p = svg("path", { d, fill: "none", stroke: rest[0], "stroke-width": rest[1], ...attrs }, root);
      const els = [p];
      let t = null;
      if (label) {
        els.push(svg("rect", { x: label.x, y: label.y, width: label.w, height: label.h, rx: 4, fill: "var(--panel)" }, root));
        t = svg("text", { x: anchor === "middle" ? label.x + label.w / 2 : label.x + 6, y: label.y + label.h - 4, "text-anchor": anchor, fill: "var(--ink)", "font-size": 12 }, root);
        text(t);
        els.push(t);
      }
      if (p instanceof SVGGeometryElement) edgePaths.set(id, p);
      arrows.set(id, { path: p, label: t, rest, els });
    };
    if (spec.lanes && spec.rows) {
      for (const l of spec.lanes) {
        const g = svg("g", {}, root);
        svg("title", {}, g).textContent = l.title;
        svg("rect", { x: l.x - l.w / 2, y: 14, width: l.w, height: 44, rx: 8, ...lookAttrs(l.look) }, g);
        l.lines.forEach((line, i) => {
          svg("text", { x: l.x, y: 36 + (i - (l.lines.length - 1) / 2) * 15 + 4, "text-anchor": "middle", fill: "var(--ink)", "font-size": 13 }, g).textContent = line;
        });
        svg("line", { x1: l.x, y1: 58, x2: l.x, y2: spec.height - 12, stroke: "var(--rule)", "stroke-width": 1.2, "stroke-dasharray": "4 4" }, g);
        nodeEls.set(l.id, g);
      }
      for (const r of spec.rows) {
        const y = r.y + 28;
        arrow(r.id, r.self ? `M${r.x1} ${y}h28v20h-28` : `M${r.x1} ${y}H${r.x2}`, {
          "marker-end": `url(#${spec.key}-${r.mode === "async" ? "open" : "arrow"})`,
          ...r.reply ? { "stroke-dasharray": "6 4" } : {}
        }, r.leaves ? ["var(--warn)", 2.4] : ["var(--muted)", 1.6], r.label, (t) => {
          svg("tspan", { "font-weight": "bold" }, t).textContent = String(r.n);
          t.appendChild(document.createTextNode(` ${r.text}`));
        }, "start");
      }
    } else {
      for (const g of spec.groups) {
        svg("rect", { x: g.x, y: g.y, width: g.w, height: g.h, rx: 12, fill: "none", stroke: "var(--muted)", "stroke-dasharray": "5 4" }, root);
        svg("text", { x: g.x + 10, y: g.y + 16, fill: "var(--muted)", "font-size": 12 }, root).textContent = g.label;
      }
      for (const e of spec.edges) {
        arrow(
          e.id,
          e.d,
          { "marker-end": `url(#${spec.key}-arrow)`, ...e.mode === "async" ? { "stroke-dasharray": "6 4" } : {} },
          ["var(--muted)", 1.6],
          e.label,
          (t) => {
            t.textContent = e.label?.text ?? "";
          },
          "middle"
        );
      }
      for (const n of spec.nodes) {
        const g = svg("g", {}, root);
        svg("rect", { x: n.x, y: n.y, width: n.w, height: n.h, rx: n.store ? 4 : 10, ...lookAttrs(n.look), ...n.primary ? {} : { stroke: "var(--muted)", "stroke-dasharray": "5 4" } }, g);
        if (n.look === "store") svg("path", { d: `M${n.x} ${n.y + 8}h${n.w}`, stroke: "var(--ink)", "stroke-width": 1.2 }, g);
        const top = n.y + n.h / 2 - ((n.lines.length - 1) * 15.5 + 15) / 2 + 4;
        n.lines.forEach((line, i) => {
          svg("text", { x: n.x + n.w / 2, y: top + i * 15.5, "text-anchor": "middle", fill: "var(--ink)", "font-size": 13.5 }, g).textContent = line;
        });
        if (n.sub) svg("text", { x: n.x + n.w / 2, y: top + n.lines.length * 15.5, "text-anchor": "middle", fill: "var(--muted)", "font-size": 12 }, g).textContent = n.sub;
        nodeEls.set(n.id, g);
      }
    }
    const token = svg("circle", { r: 6, fill: "var(--accent)", opacity: 0 }, root);
    const narr = document.createElement("span");
    narr.className = "narr";
    const said = document.createElement("span");
    said.className = "vh";
    said.setAttribute("aria-live", "polite");
    const narrBox = document.createElement("span");
    narrBox.className = "narr-box";
    narrBox.append(narr);
    for (const s of [...spec.steps, void 0]) {
      const size = document.createElement("span");
      size.className = "narr-size";
      size.setAttribute("aria-hidden", "true");
      size.textContent = s ? s.caption : REST;
      if (s?.where) {
        const code = document.createElement("code");
        code.textContent = s.where;
        size.append(" ", code);
      }
      narrBox.append(size);
    }
    const counter = document.createElement("span");
    counter.className = "count";
    const last = spec.steps.length - 1;
    let at = -1;
    let timer;
    let frame;
    let started = false;
    let parked = false;
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
    function follow(step) {
      const a = step ? arrows.get(step.edges[0] ?? "") : void 0;
      if (!a || fig.scrollWidth <= fig.clientWidth) return;
      const f = fig.getBoundingClientRect();
      const boxes = a.els.map((el) => el.getBoundingClientRect());
      const left = Math.min(...boxes.map((b) => b.left)) - f.left + fig.scrollLeft;
      const right = Math.max(...boxes.map((b) => b.right)) - f.left + fig.scrollLeft;
      if (left >= fig.scrollLeft && right <= fig.scrollLeft + fig.clientWidth) return;
      fig.scrollTo({ left: Math.max(0, (left + right) / 2 - fig.clientWidth / 2), behavior: reduced ? "instant" : "smooth" });
    }
    function paint(spoken = false) {
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
      for (const [id, a] of arrows) {
        for (const el of a.els) el.setAttribute("opacity", all || seen.has(id) ? "1" : "0.25");
        a.path.setAttribute("stroke", lit.has(id) ? "var(--accent)" : a.rest[0]);
        a.path.setAttribute("stroke-width", String(lit.has(id) ? 2.8 : a.rest[1]));
        a.label?.setAttribute("font-weight", lit.has(id) ? "bold" : "normal");
      }
      for (const [id, el] of nodeEls) el.setAttribute("opacity", all || seen.has(id) ? "1" : "0.35");
      const step = spec.steps[at];
      counter.textContent = `${at + 1} / ${spec.steps.length}`;
      narr.textContent = step ? step.caption : REST;
      if (step?.where) {
        const code = document.createElement("code");
        code.textContent = step.where;
        narr.append(" ", code);
      }
      said.textContent = spoken ? narr.textContent : "";
      moveToken(step);
      follow(step);
    }
    function go(i, spoken = false) {
      at = Math.max(-1, Math.min(last, i));
      paint(spoken);
    }
    function halt() {
      if (timer !== void 0) clearInterval(timer);
      timer = void 0;
      playBtn.textContent = "Play";
    }
    function play(spoken = false) {
      started = true;
      parked = false;
      halt();
      go(at >= last ? 0 : at + 1, spoken);
      if (at >= last) return;
      playBtn.textContent = "Pause";
      timer = window.setInterval(() => {
        go(at + 1);
        if (at >= last) halt();
      }, STEP_MS);
    }
    const by = (f) => () => {
      started = true;
      parked = false;
      f();
    };
    const playBtn = button("play", "Play", () => timer === void 0 ? play(true) : by(halt)());
    const back = button("back", "\u2039", by(() => {
      halt();
      go(at - 1, true);
    }), "Back");
    const next = button("next", "\u203A", by(() => {
      halt();
      go(at + 1, true);
    }), "Next");
    const reset = button("reset", "Reset", by(() => {
      halt();
      go(-1, true);
    }));
    if (spec.steps.length === 0) for (const b of [playBtn, next, reset]) b.disabled = true;
    ctl.setAttribute("role", "group");
    ctl.setAttribute("aria-label", `${card.querySelector("h3")?.textContent ?? spec.key} controls`);
    const deep = ctl.querySelector("a.deep");
    for (const el of [playBtn, back, next, reset, narrBox, counter, said]) ctl.insertBefore(el, deep);
    fig.append(root);
    paint();
    const clear = () => {
      for (const el of card.querySelectorAll(".fig, .cap a")) el.style.scrollMarginBlockEnd = `${ctl.getBoundingClientRect().height}px`;
    };
    clear();
    if (typeof ResizeObserver === "function") new ResizeObserver(clear).observe(ctl);
    if (!reduced && spec.steps.length > 0 && typeof IntersectionObserver === "function") {
      const band = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          band.disconnect();
          if (!started) play();
        }
      }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });
      band.observe(fig);
      new IntersectionObserver((entries) => {
        const seen = entries.some((en) => en.isIntersecting);
        if (!seen && timer !== void 0) {
          halt();
          parked = true;
        } else if (seen && parked) play();
      }, { threshold: 0 }).observe(card);
    }
  }
  function mount(root = document) {
    const dataEl = document.getElementById("diagrams");
    if (!dataEl) return;
    const data = JSON.parse(dataEl.textContent ?? "");
    root.querySelectorAll(".ctl[data-fx-flow]").forEach((ctl) => {
      const card = ctl.closest("figure.card");
      const fig = card?.querySelector(".fig");
      if (!card || !fig) return;
      const spec = field(data, ctl.getAttribute("data-fx-flow") ?? "");
      const errors = validateFigure(spec);
      if (errors.length || !isFigure(spec)) {
        fig.textContent = `Figure is invalid: ${errors.join("; ")}`;
        return;
      }
      mountFigure(card, fig, ctl, spec);
    });
  }
  Reflect.set(globalThis, "fxFlow", { validateFigure, mount });
  if (typeof document !== "undefined") mount();
})();
