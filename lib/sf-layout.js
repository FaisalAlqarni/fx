// generated from src/lib/sf-layout.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sf_layout_exports = {};
__export(sf_layout_exports, {
  layoutAll: () => layoutAll,
  reportLine: () => reportLine,
  shortLabel: () => shortLabel
});
module.exports = __toCommonJS(sf_layout_exports);
var path = __toESM(require("path"));
const ElkCtor = require(path.join(__dirname, "..", "references", "vendor", "elkjs-0.9.3.bundled.js"));
const elk = new ElkCtor();
const MAX_W = 860;
const MAX_CROSS = 1;
const STOP = /* @__PURE__ */ new Set(["to", "for", "the", "a", "an", "of", "and", "or", "under", "whose", "with", "in", "on", "at", "by", "from", "into", "as", "per", "via", "when", "if", "is", "are", "its", "their", "then", "after", "before", "each", "every", "no", "not"]);
function ruleShort(label, max = 26) {
  const t = label.replace(/^[\s(;,:]+/, "").trim();
  if (t.length <= max) return t;
  let out = "";
  for (const p of t.split(/(?=;\s|,\s|:\s|\s\(|\s-\s)/)) {
    if ((out + p).length > max) break;
    out += p;
  }
  if (!out) for (const w of t.split(/\s+/)) {
    const next = out ? `${out} ${w}` : w;
    if (next.length > max) break;
    out = next;
  }
  if (!out) out = t.slice(0, max);
  const ob = out.lastIndexOf("(");
  if (ob > 0 && out.indexOf(")", ob) < 0) out = out.slice(0, ob);
  const words = out.replace(/[\s;,:-]+$/, "").split(/\s+/);
  while (words.length > 1 && STOP.has((words[words.length - 1] ?? "").toLowerCase())) words.pop();
  return words.join(" ").replace(/[\s;,:-]+$/, "");
}
function shortLabel(label, short) {
  return short ?? ruleShort(label);
}
const where = (evidence) => {
  const e = evidence.find((x) => "path" in x);
  return e && "path" in e ? ` ${e.path}:${e.lines ?? ""}` : "";
};
function edgeIds(d) {
  const seen = /* @__PURE__ */ new Map();
  return d.edges.map((e) => {
    const k = `${d.id}:${e.from}>${e.to}`, n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return n > 1 ? `${k}#${n}` : k;
  });
}
function levelInput(d) {
  const ids = edgeIds(d);
  const label = new Map(d.nodes.map((n) => [n.id, n.label]));
  const edges = d.edges.map((e, i) => ({ id: ids[i] ?? "", from: e.from, to: e.to, label: shortLabel(e.label, e.short), mode: e.mode ?? "sync" }));
  return {
    key: `level-${d.id}`,
    kind: "level",
    nodes: d.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind, primary: n.primary !== false, store: false })),
    edges,
    groups: d.groups.map((g) => ({ id: g.id, label: g.label, members: g.members, groups: g.groups ?? [] })),
    ...d.layout ? { hints: d.layout } : {},
    steps: (drawn, order) => order.flatMap((id) => {
      const n = d.nodes.find((x) => x.id === id);
      const outs = d.edges.map((e, i) => ({ e, id: ids[i] ?? "" })).filter((x) => x.e.from === id);
      if (!n || n.primary === false && !outs.length) return [];
      const to = outs.map((x) => `; to ${label.get(x.e.to) ?? x.e.to}: ${x.e.label}${drawn.has(x.id) ? "" : " (arrow not drawn)"}`).join("");
      return [{ edges: outs.filter((x) => drawn.has(x.id)).map((x) => x.id), nodes: [id], caption: `${n.label}${n.primary === false ? " (in another diagram)" : ""}: ${n.role}${where(n.evidence)}${to}` }];
    })
  };
}
function sequenceInput(q) {
  const label = new Map(q.participants.map((p) => [p.id, p.label]));
  const pairs = /* @__PURE__ */ new Map();
  for (const m of q.messages) {
    if (m.from === m.to) continue;
    const k = [m.from, m.to].sort().join("|");
    const p = pairs.get(k) ?? { id: `${q.id}:${m.from}>${m.to}`, from: m.from, to: m.to, label: "", mode: m.mode ?? "sync", ns: [] };
    p.ns.push(m.n);
    pairs.set(k, p);
  }
  const edges = [...pairs.values()].map(({ ns, ...e }) => ({ ...e, label: ruleShort(ns.join(", ")) }));
  return {
    key: `seq-${q.id}`,
    kind: "sequence",
    groups: [],
    edges,
    nodes: q.participants.map((p) => ({ id: p.id, label: p.label, kind: p.kind ?? "service", primary: true, store: false })),
    steps: (drawn) => q.messages.map((m) => {
      const e = pairs.get([m.from, m.to].sort().join("|"));
      return { edges: e && drawn.has(e.id) ? [e.id] : [], nodes: [.../* @__PURE__ */ new Set([m.from, m.to])], caption: `${m.n}. ${label.get(m.from) ?? m.from} to ${label.get(m.to) ?? m.to}: ${m.label}${where(m.evidence)}${e && !drawn.has(e.id) ? " (arrow not drawn)" : ""}` };
    })
  };
}
function flowInput(f) {
  const actors = [...new Set(f.steps.map((s) => s.actor))], stores = [...new Set(f.steps.map((s) => s.store))];
  const pairs = /* @__PURE__ */ new Map();
  for (const s of f.steps) {
    const k = `${s.actor}|${s.store}`;
    const p = pairs.get(k) ?? { id: `${f.id}:${s.actor}>${s.store}`, from: s.actor, to: s.store, ops: /* @__PURE__ */ new Set() };
    p.ops.add(s.op === "read" ? "read" : "write");
    pairs.set(k, p);
  }
  return {
    key: `flow-${f.id}`,
    kind: "flow",
    groups: [],
    nodes: [...actors.map((id) => ({ id, label: id, kind: "actor", primary: true, store: false })), ...stores.map((id) => ({ id, label: id, kind: "store", primary: true, store: true }))],
    edges: [...pairs.values()].map((p) => ({ id: p.id, from: p.from, to: p.to, label: p.ops.size > 1 ? "read, write" : [...p.ops].join(""), mode: "sync" })),
    steps: (drawn) => f.steps.map((s) => {
      const id = pairs.get(`${s.actor}|${s.store}`)?.id ?? "";
      return { edges: drawn.has(id) ? [id] : [], nodes: [s.actor, s.store], caption: `${s.n}. ${s.actor} ${s.op} ${s.store}${s.key ? ` ${s.key}` : ""}${s.when ? ` (${s.when})` : ""}${where(s.evidence)}${drawn.has(id) ? "" : " (arrow not drawn)"}` };
    })
  };
}
function wrapText(text, n) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if (!cur) cur = w;
    else if (`${cur} ${w}`.length <= n) cur += ` ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) {
    lines.length = 3;
    const l = `${lines[2]}...`;
    lines[2] = l.length <= n ? l : `${l.slice(0, n - 1).trimEnd()}...`;
  }
  return lines;
}
const sized = (n, nw) => {
  const lines = wrapText(n.label, nw >= 188 ? 22 : 18);
  return { lines, w: nw, h: 22 + 16 * lines.length + 18 };
};
function wrap2(s) {
  const sp = [...s.matchAll(/ /g)].map((m) => m.index ?? 0);
  if (!sp.length) return [s];
  const mid = s.length / 2, i = sp.reduce((a, b) => Math.abs(b - mid) < Math.abs(a - mid) ? b : a);
  return [s.slice(0, i), s.slice(i + 1)];
}
const CW = 6.9, LBH = 18, LH2 = 34;
const labelBox = (lines) => ({ w: Math.max(...lines.map((l) => l.length)) * CW + 12, h: lines.length > 1 ? LH2 : LBH });
const segsOf = (pts) => pts.slice(1).map((p, i) => [pts[i] ?? p, p]);
const ortho = (s) => Math.abs(s[0][0] - s[1][0]) <= 1 || Math.abs(s[0][1] - s[1][1]) <= 1;
function segCross(a, b) {
  const [p1, p2] = a, [q1, q2] = b;
  if (ortho(a) && ortho(b)) {
    const aH = p1[1] === p2[1], bH = q1[1] === q2[1];
    if (aH !== bH) {
      const [h1, h2, v1, v2] = aH ? [p1, p2, q1, q2] : [q1, q2, p1, p2];
      const x = v1[0], y = h1[1];
      return x > Math.min(h1[0], h2[0]) + 1 && x < Math.max(h1[0], h2[0]) - 1 && y > Math.min(v1[1], v2[1]) + 1 && y < Math.max(v1[1], v2[1]) - 1 ? 1 : 0;
    }
    const at = (p) => aH ? p[1] : p[0], along = (p) => aH ? p[0] : p[1];
    if (Math.abs(at(p1) - at(q1)) >= 2) return 0;
    const lap = Math.min(Math.max(along(p1), along(p2)), Math.max(along(q1), along(q2))) - Math.max(Math.min(along(p1), along(p2)), Math.min(along(q1), along(q2)));
    return lap > 3 ? 0.5 : 0;
  }
  const side = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(p1, p2, q1) * side(p1, p2, q2) < 0 && side(q1, q2, p1) * side(q1, q2, p2) < 0 ? 1 : 0;
}
function segHitsRect([p, q], r) {
  if (!ortho([p, q])) {
    for (let t = 0; t <= 1; t += 1 / 64) {
      const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
      if (x > r.x + 1 && x < r.x + r.w - 1 && y > r.y + 1 && y < r.y + r.h - 1) return true;
    }
    return false;
  }
  return Math.max(p[0], q[0]) > r.x + 1 && Math.min(p[0], q[0]) < r.x + r.w - 1 && Math.max(p[1], q[1]) > r.y + 1 && Math.min(p[1], q[1]) < r.y + r.h - 1;
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const segInRect = ([p, q], r) => Math.max(p[0], q[0]) > r.x && Math.min(p[0], q[0]) < r.x + r.w && Math.max(p[1], q[1]) > r.y && Math.min(p[1], q[1]) < r.y + r.h;
function roundedPath(pts, r = 7) {
  const first = pts[0] ?? [0, 0], last = pts[pts.length - 1] ?? first;
  let d = `M${first[0]},${first[1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1] ?? first, [cx, cy] = pts[i] ?? first, [nx, ny] = pts[i + 1] ?? last;
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy), rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr <= 0) continue;
    const r1 = (v) => Math.round(v * 10) / 10;
    d += ` L${r1(cx - (cx - px) / l1 * rr)},${r1(cy - (cy - py) / l1 * rr)} Q${cx},${cy} ${r1(cx + (nx - cx) / l2 * rr)},${r1(cy + (ny - cy) / l2 * rr)}`;
  }
  return `${d} L${last[0]},${last[1]}`;
}
const ELK_OPTS = {
  "elk.algorithm": "layered",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.padding": "[top=16,left=16,bottom=16,right=16]",
  "elk.spacing.nodeNode": "30",
  "elk.layered.spacing.nodeNodeBetweenLayers": "64",
  "elk.spacing.edgeNode": "18",
  "elk.spacing.edgeEdge": "10",
  "elk.layered.spacing.edgeNodeBetweenLayers": "18",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "10",
  "elk.spacing.edgeLabel": "4",
  "elk.edgeLabels.inline": "false",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.thoroughness": "60",
  "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
  "elk.separateConnectedComponents": "true"
};
const GROUP_OPTS = { "elk.padding": "[top=34,left=12,bottom=12,right=12]" };
function measure(lay, edges) {
  let cross = 0, hits = 0;
  edges.forEach((e, i) => {
    const si = segsOf(lay.routes.get(e.id) ?? []);
    for (const f of edges.slice(i + 1)) for (const s1 of si) for (const s2 of segsOf(lay.routes.get(f.id) ?? [])) cross += segCross(s1, s2);
    for (const [id, r] of lay.rects) if (id !== e.from && id !== e.to) {
      for (const s of si) if (segHitsRect(s, r)) hits++;
    }
  });
  const score = cross * 1e3 + hits * 5e3 + Math.max(0, lay.W - MAX_W) * 60 + Math.max(0, lay.H - 640) * 8 + Math.abs(lay.W / lay.H - 1.9) * 40;
  return { ...lay, cross, hits, score };
}
async function elkVariant(input, edges, v) {
  const size = new Map(input.nodes.map((n) => [n.id, sized(n, v.nw)]));
  const leaf = (id) => ({ id, width: size.get(id)?.w ?? v.nw, height: size.get(id)?.h ?? 0 });
  const groupById = new Map(input.groups.map((g) => [g.id, g]));
  const grouped = new Set(input.groups.flatMap((g) => g.members));
  const nested = new Set(input.groups.flatMap((g) => g.groups));
  const compound = (g) => ({ id: g.id, layoutOptions: GROUP_OPTS, children: [...g.members.map(leaf), ...g.groups.flatMap((c) => {
    const sub = groupById.get(c);
    return sub ? [compound(sub)] : [];
  })] });
  const graph = {
    id: "root",
    layoutOptions: {
      ...ELK_OPTS,
      "elk.direction": v.dir,
      "elk.aspectRatio": String(v.aspect),
      ...input.groups.length ? { "elk.hierarchyHandling": "INCLUDE_CHILDREN" } : {},
      ...v.wrap ? { "elk.layered.wrapping.strategy": "MULTI_EDGE", "elk.layered.wrapping.correctionFactor": "1.0" } : {},
      ...v.bound ? { "elk.layered.layering.strategy": "COFFMAN_GRAHAM", "elk.layered.layering.coffmanGraham.layerBound": String(v.bound) } : {}
    },
    children: [...input.nodes.filter((n) => !grouped.has(n.id)).map((n) => leaf(n.id)), ...input.groups.filter((g) => !nested.has(g.id)).map(compound)],
    // ELK reserves room for each label beside its own arrow, on two lines when long.
    edges: edges.map((e) => {
      const ls = e.label ? e.label.length > (v.lw ?? 16) && e.label.includes(" ") ? wrap2(e.label) : [e.label] : null;
      return { id: e.id, sources: [e.from], targets: [e.to], labels: ls ? [{ id: `${e.id}/label`, text: ls.join("\n"), ...{ width: labelBox(ls).w, height: labelBox(ls).h } }] : [] };
    })
  };
  const out = await elk.layout(graph);
  const abs = /* @__PURE__ */ new Map([["root", { x: 0, y: 0, w: out.width ?? 0, h: out.height ?? 0 }]]);
  const walk = (n, ox, oy) => {
    for (const c of n.children ?? []) {
      const r = { x: ox + (c.x ?? 0), y: oy + (c.y ?? 0), w: c.width ?? 0, h: c.height ?? 0 };
      abs.set(c.id, r);
      walk(c, r.x, r.y);
    }
  };
  walk(out, 0, 0);
  const rects = new Map(input.nodes.map((n) => [n.id, { ...abs.get(n.id) ?? { x: 0, y: 0, w: 0, h: 0 }, lines: size.get(n.id)?.lines ?? [] }]));
  const groups = new Map(input.groups.map((g) => [g.id, abs.get(g.id) ?? { x: 0, y: 0, w: 0, h: 0 }]));
  const routes = /* @__PURE__ */ new Map(), labels = /* @__PURE__ */ new Map();
  for (const e of out.edges ?? []) {
    const o = abs.get(e.container ?? "root") ?? { x: 0, y: 0 }, sec = e.sections?.[0];
    if (sec) routes.set(e.id, [sec.startPoint, ...sec.bendPoints ?? [], sec.endPoint].map((p) => [p.x + o.x, p.y + o.y]));
    const l = e.labels?.[0];
    if (l) labels.set(e.id, { x: (l.x ?? 0) + o.x, y: (l.y ?? 0) + o.y, w: l.width, h: l.height, lines: l.text.split("\n") });
  }
  return measure({ W: out.width ?? 0, H: out.height ?? 0, dir: v.dir, rects, groups, routes, labels }, edges);
}
function hintLayout(input, edges, hints) {
  const NW = 164, GX = 48, GY = 70, PAD = 16;
  const size = new Map(input.nodes.map((n) => [n.id, sized(n, NW)]));
  const cellH = Math.max(...[...size.values()].map((s) => s.h)) + GY;
  const lastRow = Math.max(-1, ...Object.values(hints).map((h) => h.row));
  let spare = 0;
  const rects = /* @__PURE__ */ new Map();
  for (const n of input.nodes) {
    const h = hints[n.id] ?? { col: spare++, row: lastRow + 1 };
    const s = size.get(n.id) ?? { lines: [], w: NW, h: 0 };
    rects.set(n.id, { x: PAD + h.col * (NW + GX), y: PAD + h.row * cellH, w: s.w, h: s.h, lines: s.lines });
  }
  const groupBox = (g, seen) => {
    const parts = [...g.members.flatMap((m) => {
      const r = rects.get(m);
      return r ? [r] : [];
    }), ...g.groups.flatMap((c) => {
      const sub = input.groups.find((x) => x.id === c);
      return sub && !seen.has(c) ? [groupBox(sub, /* @__PURE__ */ new Set([...seen, c]))] : [];
    })];
    const x0 = Math.min(...parts.map((r) => r.x)) - 12, y0 = Math.min(...parts.map((r) => r.y)) - 34;
    return { x: x0, y: y0, w: Math.max(...parts.map((r) => r.x + r.w)) + 12 - x0, h: Math.max(...parts.map((r) => r.y + r.h)) + 12 - y0 };
  };
  const groups = new Map(input.groups.map((g) => [g.id, groupBox(g, /* @__PURE__ */ new Set([g.id]))]));
  const centre = (r) => [r.x + r.w / 2, r.y + r.h / 2];
  const border = (r, toward) => {
    const [cx, cy] = centre(r), dx = toward[0] - cx, dy = toward[1] - cy;
    const t = Math.min(dx ? r.w / 2 / Math.abs(dx) : Infinity, dy ? r.h / 2 / Math.abs(dy) : Infinity);
    return [cx + dx * t, cy + dy * t];
  };
  const routes = /* @__PURE__ */ new Map(), labels = /* @__PURE__ */ new Map();
  for (const e of edges) {
    const a = rects.get(e.from), b = rects.get(e.to);
    if (!a || !b) continue;
    const p = border(a, centre(b)), q = border(b, centre(a));
    routes.set(e.id, [p, q]);
    if (e.label) {
      const box = labelBox([e.label]);
      labels.set(e.id, { x: (p[0] + q[0]) / 2 - box.w / 2, y: (p[1] + q[1]) / 2 - box.h / 2, ...box, lines: [e.label] });
    }
  }
  const all = [...rects.values(), ...groups.values()];
  const W = Math.max(...all.map((r) => r.x + r.w)) + PAD, H = Math.max(...all.map((r) => r.y + r.h)) + PAD;
  return measure({ W, H, dir: "DOWN", rects, groups, routes, labels }, edges);
}
async function layoutVariants(input, edges) {
  if (input.hints) return hintLayout(input, edges, input.hints);
  let best = null;
  const better = (r, b) => !b || (r.W <= MAX_W !== b.W <= MAX_W ? r.W <= MAX_W : r.score < b.score);
  const tryAll = async (vs) => {
    for (const v of vs) {
      let r;
      try {
        r = await elkVariant(input, edges, v);
      } catch {
        continue;
      }
      if (better(r, best)) best = r;
    }
  };
  const dirs = ["RIGHT", "DOWN"];
  await tryAll([188, 164, 144].flatMap((nw) => dirs.flatMap((dir) => [1.6, 1].map((aspect) => ({ nw, dir, aspect })))));
  const wide = () => best !== null && best.W > MAX_W;
  if (wide()) await tryAll([164, 144, 128].flatMap((nw) => dirs.flatMap((dir) => [0.4, 0.6, 1].flatMap((aspect) => [false, true].map((wrap) => ({ nw, dir, aspect, wrap, lw: 10 }))))));
  if (wide()) await tryAll([164, 144].flatMap((nw) => [4, 5].map((bound) => ({ nw, dir: "DOWN", aspect: 1, lw: 10, bound }))));
  if (!best) throw new Error(`${input.key}: ELK laid out no variant`);
  return best;
}
async function layoutFigure(input) {
  let edges = input.edges, lay = await layoutVariants(input, edges);
  const dropped = [];
  while (lay.cross > MAX_CROSS && edges.length > 4) {
    const cnt = edges.map(() => 0), deg = /* @__PURE__ */ new Map();
    for (const e of edges) {
      deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
      deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
    }
    edges.forEach((e, i) => {
      for (let j = i + 1; j < edges.length; j++) {
        const f = edges[j];
        if (!f) continue;
        for (const s1 of segsOf(lay.routes.get(e.id) ?? [])) for (const s2 of segsOf(lay.routes.get(f.id) ?? [])) {
          const c = segCross(s1, s2);
          cnt[i] = (cnt[i] ?? 0) + c;
          cnt[j] = (cnt[j] ?? 0) + c;
        }
      }
    });
    const score = edges.map((e, i) => (cnt[i] ?? 0) > 0 && (deg.get(e.from) ?? 0) > 1 && (deg.get(e.to) ?? 0) > 1 ? cnt[i] ?? 0 : -1);
    const k = score.indexOf(Math.max(...score));
    const drop = edges[k];
    if (!drop || (score[k] ?? -1) < 0) break;
    dropped.push(drop);
    edges = edges.filter((_, i) => i !== k);
    lay = await layoutVariants(input, edges);
  }
  return { lay, edges, dropped };
}
function placeLabels(lay, edges) {
  const placed = [], out = /* @__PURE__ */ new Map();
  for (const e of edges) {
    const l = lay.labels.get(e.id);
    const ok = !!l && ![...lay.rects.values()].some((r) => overlap(l, r)) && !placed.some((r) => overlap(l, r)) && !edges.some((f) => f.id !== e.id && segsOf(lay.routes.get(f.id) ?? []).some((s) => segInRect(s, l)));
    if (l && ok) placed.push(l);
    out.set(e.id, l && ok ? l : null);
  }
  return out;
}
async function figureOf(input) {
  const { lay, edges, dropped } = await layoutFigure(input);
  const labels = placeLabels(lay, edges);
  const round = (r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });
  const r1 = (v) => Math.round(v * 10) / 10;
  const order = [...lay.rects.entries()].sort(([, p], [, q]) => lay.dir === "RIGHT" ? p.x - q.x || p.y - q.y : p.y - q.y || p.x - q.x).map(([id]) => id);
  const spec = {
    key: input.key,
    kind: input.kind,
    width: Math.ceil(lay.W),
    height: Math.ceil(lay.H),
    direction: lay.dir,
    nodes: input.nodes.map((n) => {
      const r = lay.rects.get(n.id) ?? { x: 0, y: 0, w: 0, h: 0, lines: [] };
      return { id: n.id, ...round(r), lines: r.lines, kind: n.kind, primary: n.primary, store: n.store };
    }),
    edges: edges.map((e) => {
      const l = labels.get(e.id);
      return { id: e.id, d: roundedPath((lay.routes.get(e.id) ?? []).map(([x, y]) => [r1(x), r1(y)])), mode: e.mode, label: l ? { ...round(l), text: l.lines.join(" ") } : null };
    }),
    groups: input.groups.map((g) => ({ id: g.id, label: g.label, ...round(lay.groups.get(g.id) ?? { x: 0, y: 0, w: 0, h: 0 }) })),
    steps: input.steps(new Set(edges.map((e) => e.id)), order),
    notDrawn: dropped.map((e) => e.id)
  };
  const line = {
    key: spec.key,
    width: spec.width,
    height: spec.height,
    direction: spec.direction,
    crossings: lay.cross,
    nodeHits: lay.hits,
    nodes: spec.nodes.length,
    arrows: spec.edges.length,
    notDrawn: spec.notDrawn.length,
    unlabelled: spec.edges.filter((e) => !e.label).length
  };
  return { spec, line };
}
function reportLine(l) {
  return `${l.key} ${l.width}x${l.height} ${l.direction} crossings=${l.crossings} hits=${l.nodeHits} nodes=${l.nodes} arrows=${l.arrows} notDrawn=${l.notDrawn} unlabelled=${l.unlabelled}`;
}
async function layoutAll(model) {
  const inputs = [...model.levels.diagrams.map(levelInput), ...model.sequences.map(sequenceInput), ...model.storeFlows.map(flowInput)];
  const figures = [], report = [], unfit = [];
  for (const input of inputs) {
    const { spec, line } = await figureOf(input);
    figures.push(spec);
    report.push(line);
    if (line.crossings > MAX_CROSS || line.width > MAX_W) unfit.push({ key: line.key, line: reportLine(line) });
  }
  return { figures, report, unfit };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  layoutAll,
  reportLine,
  shortLabel
});
