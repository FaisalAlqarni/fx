// generated from src/lib/sf-diagrams.ts by scripts/build: edit there, not here
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
var sf_diagrams_exports = {};
__export(sf_diagrams_exports, {
  applyThemeBlock: () => applyThemeBlock,
  deepDiagrams: () => deepDiagrams,
  findArchify: () => findArchify,
  hasArchify: () => hasArchify,
  outsideRefs: () => outsideRefs,
  pickLine: () => pickLine,
  runArchify: () => runArchify,
  svgPage: () => svgPage
});
module.exports = __toCommonJS(sf_diagrams_exports);
var fs = __toESM(require("fs"));
var import_json = require("./json.js");
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_sf_page = require("./sf-page.js");
var import_sf_markdown = require("./sf-markdown.js");
var import_sf_layout = require("./sf-layout.js");
const PAGE_DEFAULT = 8;
const EDGE = 16;
const COMPONENT_TYPES = ["frontend", "backend", "database", "cloud", "security", "messagebus", "external"];
const aid = (id) => /^[0-9]/.test(id) ? `n${id}` : id;
const componentType = (kind) => COMPONENT_TYPES.includes(kind) ? kind : "backend";
const cut = (s, n) => [...s].slice(0, n).join("");
const isFile = (e) => "path" in e;
const units = (s) => [...s].reduce((n, ch) => n + ((ch.codePointAt(0) ?? 0) >= 4352 ? 2 : 1), 0);
function fit(s, max, what, shortened) {
  if (units(s) <= max) return s;
  let out = "";
  for (const ch of s) {
    if (units(out + ch) + 3 > max) break;
    out += ch;
  }
  shortened.push(what);
  return `${out.trimEnd()}...`;
}
function owningRoot(entries, roots) {
  const host = [...roots.values()].find((r) => r.host)?.id ?? "";
  const count = /* @__PURE__ */ new Map();
  for (const e of entries) if (isFile(e)) count.set(e.root ?? host, (count.get(e.root ?? host) ?? 0) + 1);
  let best = host, top = count.get(host) ?? 0;
  for (const [id, n] of count) if (n > top) {
    best = id;
    top = n;
  }
  return best;
}
function sourcesOf(list, own, host, rest, who) {
  const out = [];
  for (const e of list) {
    if (!isFile(e)) continue;
    const root = e.root ?? host;
    const parts = e.lines === void 0 ? [""] : e.lines.split(",").map((x) => x.trim());
    if (root !== own) {
      rest.push(`${who}: @${root}/${e.path}${e.lines === void 0 ? "" : `:${e.lines}`}`);
      continue;
    }
    for (const p of parts) {
      const m = /^(\d+)(?:-(\d+))?$/.exec(p);
      const src = { path: cut(e.path, 240), ...m ? { line: Number(m[1]), ...m[2] ? { end_line: Number(m[2]) } : {} } : {}, ...e.symbol ? { label: cut(e.symbol, 48) } : {} };
      if (out.length < 3) out.push(src);
      else rest.push(`${who}: ${e.path}${p ? `:${p}` : ""}`);
    }
  }
  return out.length ? out : void 0;
}
const publicUrl = (remote) => remote.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]*@/i, "$1");
function repository(root) {
  if (!root?.head || !root.remote) return void 0;
  return { url: publicUrl(root.remote), revision: root.head, link_mode: "local-only" };
}
const linked = (own, repo) => repo ? own : "";
const evCard = (rest) => rest.length ? [{ dot: "slate", title: "Evidence", items: rest }] : [];
function architecture(d, fig, roots) {
  const host = [...roots.values()].find((r) => r.host)?.id ?? "";
  const all = [...d.nodes, ...d.edges, ...d.groups].flatMap((o) => o.evidence);
  const own = owningRoot(all, roots);
  const rest = [];
  const repo = repository(roots.get(own));
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const shortened = [];
  const parts = [];
  const known = new Set(d.nodes.map((n) => n.id));
  const groups = d.groups.flatMap((g) => {
    const wraps = g.members.filter((x) => known.has(x));
    return wraps.length ? [{ label: g.label, wraps }] : [];
  });
  const need = (id) => Math.ceil(units(byId.get(id)?.label ?? id) * 6.6 - 8);
  const sx = Math.min(1.6, Math.max(1, ...fig.nodes.map((n) => need(n.id) / n.w)));
  const boxes = fig.nodes.map((n) => {
    const w = Math.max(n.w, Math.min(need(n.id), Math.round(n.w * sx)));
    return { ...n, x: Math.round((n.x + n.w / 2) * sx - w / 2), w };
  });
  let dx = 0, dy = 0;
  for (const g of groups) {
    const m = boxes.filter((n) => g.wraps.includes(n.id));
    const x0 = Math.min(...m.map((n) => n.x)), x1 = Math.max(...m.map((n) => n.x + n.w));
    const title = Math.max(30, units(g.label) * 9 * 0.6 + 10) + 8;
    dx = Math.max(dx, EDGE + 30 + Math.max(0, title - (x1 - x0 + 60)) / 2 - x0);
    dy = Math.max(dy, EDGE + 30 - Math.min(...m.map((n) => n.y)));
  }
  dx = Math.ceil(dx);
  dy = Math.ceil(dy);
  const components = boxes.map((n) => {
    const m = byId.get(n.id);
    const sources = m && m.primary !== false ? sourcesOf(m.evidence, linked(own, repo), host, rest, m.label) : void 0;
    const label = fit(m?.label ?? n.id, Math.floor((n.w + 8) / 6.6), `${n.id} label`, shortened);
    const sublabel = m?.role && units(m.role) * 5.4 <= n.w - 8 ? m.role : void 0;
    if (m && (label !== m.label || m.role && !sublabel)) parts.push(m.role ? `${m.label}: ${m.role}` : m.label);
    return { id: aid(n.id), type: componentType(m?.kind ?? n.kind), label, ...sublabel ? { sublabel } : {}, ...sources ? { sources } : {}, pos: [n.x + dx, n.y + dy], size: [n.w, n.h] };
  });
  const boundaries = groups.map((g) => ({ kind: "region", label: g.label, wraps: g.wraps.map(aid) }));
  const name = `arch-${d.id}`;
  const spec = {
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: d.title, subtitle: d.summary, output: `${name}.html`, quality_profile: "showcase", ...repo ? { repository: repo } : {} },
    components,
    ...boundaries.length ? { boundaries } : {},
    // The figure's short label: the layout made room for it, and archify places it on its own route.
    connections: d.edges.map((e) => ({ from: aid(e.from), to: aid(e.to), label: (0, import_sf_layout.shortLabel)(e.label, e.short), ...e.mode === "async" ? { variant: "dashed" } : {} })),
    ...rest.length || parts.length ? { cards: [...parts.length ? [{ dot: "cyan", title: "Parts", items: parts }] : [], ...evCard(rest)] } : {}
  };
  return { name, kind: "architecture", source: `diagram:${d.id}`, spec, pages: 1, owningRoot: own, shortened };
}
function columns(width, count) {
  const box = Math.max(86, Math.min(190, Math.round((width - 124) / count) - 24));
  const margin = Math.max(40, Math.min(62, width - 40 - (count * box + (count - 1) * 16)));
  const gap = count > 1 ? Math.max(box + 16, (width - 40 - margin - box) / (count - 1)) : 108;
  return { box, at: (i) => margin + box / 2 + i * gap };
}
function noteLines(text, width) {
  let lines = 1, line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && units(next) * 4.2 > width) {
      lines += 1;
      line = word;
    } else line = next;
  }
  return lines + 1;
}
function foldSelf(slice) {
  const out = slice.map((m) => ({ ...m }));
  const real = out.filter((m) => m.from !== m.to);
  if (!real.length) return out;
  for (const m of out) {
    if (m.from !== m.to) continue;
    const host = [...real].reverse().find((r) => r.n < m.n) ?? real[0];
    host.note = [host.note, `${m.n}. ${m.label}`].filter(Boolean).join("; ");
  }
  return real;
}
function sequencePages(base, title, parts, msgs, own, repo, rest, limit, source) {
  const pages = Math.max(1, Math.ceil(msgs.length / limit));
  return Array.from({ length: pages }, (_, p) => {
    const slice = msgs.slice(p * limit, (p + 1) * limit);
    const used = new Set(slice.flatMap((m) => [m.from, m.to]));
    for (const x of parts) if (used.size < 2) used.add(x.id);
    const shown = parts.filter((x) => used.has(x.id));
    const index = new Map(shown.map((x, i) => [x.id, i]));
    const name = p === 0 ? base : `${base}-p${p + 1}`;
    const page = foldSelf(slice);
    const rows = (width2) => {
      const { at: at2 } = columns(width2, shown.length);
      const ys2 = [];
      let y = 180, bottom = 0;
      for (const m of page) {
        ys2.push(y);
        const span = Math.abs(at2(index.get(m.to) ?? 0) - at2(index.get(m.from) ?? 0));
        const end = m.note ? y + 22 + 11 * (noteLines(m.note, span - 30) - 1) : y + 6;
        bottom = Math.max(bottom, end);
        y = Math.max(y + 56, m.note ? end + 22 : 0);
      }
      return { ys: ys2, height: Math.max(480, (ys2[ys2.length - 1] ?? 180) + 116, bottom + 12 + 86 + 8) };
    };
    const narrow = Math.max(480, 150 * shown.length + 60);
    const { ys, height } = rows(narrow);
    const width = Math.max(narrow, Math.ceil(height * 1.55));
    const { box, at } = columns(width, shown.length);
    const shortened = [];
    const label = (m) => {
      const mid = (at(index.get(m.from) ?? 0) + at(index.get(m.to) ?? 0)) / 2;
      return fit(`${m.n}. ${m.label}`, Math.floor((2 * Math.min(mid, width - mid) - 12) / 6.6), `message ${m.n} label`, shortened);
    };
    const spec = {
      schema_version: 1,
      diagram_type: "sequence",
      meta: { title: pages > 1 ? `${title} (page ${p + 1} of ${pages})` : title, output: `${name}.html`, quality_profile: "showcase", ...repo ? { repository: repo } : {}, viewBox: [width, height] },
      // A participant label needs units * 6.8 px within its box + 6 (participant-label-overflow).
      participants: shown.map((x) => ({ id: aid(x.id), type: x.type, label: fit(x.label, Math.floor((box + 6) / 6.8), `${x.id} label`, shortened), ...x.sources ? { sources: x.sources } : {} })),
      messages: page.map((m, i) => ({ id: `m${m.n}`, from: aid(m.from), to: aid(m.to), y: ys[i], label: label(m), ...m.mode === "async" ? { variant: "dashed" } : {}, ...m.note ? { note: m.note } : {} })),
      ...rest.length && p === 0 ? { cards: evCard(rest) } : {}
    };
    return { name, kind: "sequence", source, spec, pages, owningRoot: own, shortened, steps: slice.map((m) => m.n) };
  });
}
function sequence(q, roots, limit) {
  const host = [...roots.values()].find((r) => r.host)?.id ?? "";
  const own = owningRoot([...q.participants, ...q.messages].flatMap((o) => o.evidence), roots);
  const rest = [];
  const repo = repository(roots.get(own)), src = linked(own, repo);
  const parts = q.participants.map((p) => ({ id: p.id, type: componentType(p.kind ?? ""), label: p.label, sources: sourcesOf(p.evidence, src, host, rest, p.label) }));
  for (const m of q.messages) sourcesOf(m.evidence, src, host, rest, `message ${m.n}`);
  return sequencePages(`seq-${q.id}`, q.title, parts, q.messages, own, repo, rest, limit, `seq:${q.id}`);
}
function flow(f, model, roots, limit) {
  const host = [...roots.values()].find((r) => r.host)?.id ?? "";
  const own = owningRoot(f.steps.flatMap((s) => s.evidence), roots);
  const rest = [];
  const repo = repository(roots.get(own)), src = linked(own, repo);
  const nodes = new Map(model.levels.diagrams.flatMap((d) => d.nodes).map((n) => [n.id, n]));
  for (const s of f.steps) sourcesOf(s.evidence, src, host, rest, `step ${s.n}`);
  const actors = [...new Set(f.steps.map((s) => s.actor))], stores = [...new Set(f.steps.map((s) => s.store))];
  const parts = [
    ...actors.map((id) => {
      const n = nodes.get(id);
      return { id, type: componentType(n?.kind ?? ""), label: n?.label ?? id, sources: n ? sourcesOf(n.evidence, src, host, [], id) : void 0 };
    }),
    // Model ids are lowercase with no underscore, so S_<store> never equals an actor id.
    ...stores.map((id) => ({ id: `S_${id}`, type: "database", label: id }))
  ];
  const msgs = f.steps.map((s) => ({ n: s.n, from: s.actor, to: `S_${s.store}`, label: `${s.op}${s.key ? ` ${s.key}` : ""}`, ...s.when ? { note: s.when } : {} }));
  return sequencePages(`flow-${f.id}`, f.trigger, parts, msgs, own, repo, rest, limit, `flow:${f.id}`);
}
function deepDiagrams(model, figures, roots, pageLimit) {
  const fig = (key) => {
    const x = figures.find((y) => y.key === key);
    if (!x) throw new Error(`no figure ${key}`);
    return x;
  };
  return [
    ...model.levels.diagrams.map((d) => architecture(d, fig(`level-${d.id}`), roots)),
    ...model.sequences.flatMap((q) => sequence(q, roots, pageLimit[`seq-${q.id}`] ?? PAGE_DEFAULT)),
    ...model.storeFlows.flatMap((f) => flow(f, model, roots, pageLimit[`flow-${f.id}`] ?? PAGE_DEFAULT))
  ];
}
const pickLine = (name, label, detail) => `${name}: ${label}, ${detail}`;
const STEP_SECONDS = 1.2;
const marker = (async) => `url(#${async ? "open" : "arrow"})`;
function boxSvg(figure, anim) {
  const groups = figure.groups.map((g) => `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" class="group"/><text x="${g.x + 10}" y="${g.y + 16}" class="muted">${(0, import_sf_page.escapeHtml)(g.label)}</text>`).join("");
  const edges = figure.edges.map((e) => {
    const label = e.label ? `<rect x="${e.label.x}" y="${e.label.y}" width="${e.label.w}" height="${e.label.h}" rx="4" class="chip"/><text x="${e.label.x + e.label.w / 2}" y="${e.label.y + e.label.h / 2 + 4}" text-anchor="middle">${(0, import_sf_page.escapeHtml)(e.label.text)}</text>` : "";
    return `<path d="${(0, import_sf_page.escapeHtml)(e.d)}" class="edge${e.mode === "async" ? " async" : ""}" marker-end="${marker(false)}"${anim(e.id)}/>${label}`;
  }).join("");
  const nodes = figure.nodes.map((n) => `<g><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" class="node${n.primary ? "" : " ctx"}"/>${n.lines.map((l, i) => `<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + (i - (n.lines.length - 1) / 2) * 15 + 4}" text-anchor="middle" class="ink">${(0, import_sf_page.escapeHtml)(l)}</text>`).join("")}</g>`).join("");
  return { width: figure.width, height: figure.height, body: `${groups}${edges}${nodes}` };
}
function lifelineSvg(figure, mine, anim) {
  const rows = (figure.rows ?? []).filter((r) => mine.has(r.n));
  const first = rows[0], last = rows[rows.length - 1];
  const shift = (first?.y ?? 72) - 72;
  const height = last ? last.y - shift + (last.self ? 56 : 40) + 24 : 96;
  const lanes = (figure.lanes ?? []).map((l) => {
    const x0 = l.x - l.w / 2;
    const text = l.lines.map((t, i) => `<text x="${l.x}" y="${36 + (i - (l.lines.length - 1) / 2) * 15 + 4}" text-anchor="middle">${(0, import_sf_page.escapeHtml)(t)}</text>`).join("");
    return `<g><title>${(0, import_sf_page.escapeHtml)(l.title)}</title><rect x="${x0}" y="14" width="${l.w}" height="44" rx="8" class="lane ${l.look}"/>${text}</g><line x1="${l.x}" y1="58" x2="${l.x}" y2="${height - 12}" class="life"/>`;
  }).join("");
  const msgs = rows.map((r) => {
    const y = r.y - shift + 28;
    const d = r.self ? `M${r.x1} ${y}h28v20h-28` : `M${r.x1} ${y}H${r.x2}`;
    const l = { ...r.label, y: r.label.y - shift };
    return `<g class="msg${r.reply ? " reply" : ""}${r.leaves ? " leaves" : ""}"><path d="${d}" class="edge${r.leaves ? " leaves" : ""}"${r.reply ? ' stroke-dasharray="6 4"' : ""} marker-end="${marker(r.mode === "async")}"${anim(r.id)}/><rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="4" class="chip"/><text x="${l.x + 6}" y="${l.y + l.h - 4}" font-size="12"><tspan font-weight="bold">${r.n}</tspan> ${(0, import_sf_page.escapeHtml)(r.text)}</text></g>`;
  }).join("");
  return { width: figure.width, height, body: `${lanes}${msgs}` };
}
function svgPage(d, figure, page) {
  const spec = d.spec;
  const animated = d.kind === "sequence";
  const mine = animated ? d.steps ?? (spec.messages ?? []).map((m) => Number(m.id.slice(1))) : [];
  const total = Math.max(1, mine.length) * STEP_SECONDS;
  const stepOf = /* @__PURE__ */ new Map();
  mine.forEach((n, j) => {
    for (const e of figure.steps[n - 1]?.edges ?? []) if (!stepOf.has(e)) stepOf.set(e, j);
  });
  const keyframes = [...new Set(stepOf.values())].map((j) => {
    const a = j / mine.length * 100, b = (j + 1) / mine.length * 100;
    const rest = "stroke:var(--rest);stroke-width:var(--rest-w)";
    return `@keyframes step${j}{0%,${a.toFixed(2)}%{${rest}}${(a + 0.01).toFixed(2)}%,${b.toFixed(2)}%{stroke:var(--accent);stroke-width:2.8}${(b + 0.01).toFixed(2)}%,100%{${rest}}}`;
  }).join("");
  const anim = (id) => {
    const j = stepOf.get(id);
    return j === void 0 ? "" : ` style="animation:step${j} ${total}s linear infinite"`;
  };
  const { width, height, body } = figure.lanes && figure.rows ? lifelineSvg(figure, new Set(mine), anim) : boxSvg(figure, anim);
  const item = (s, n) => {
    if (!s?.caption) return [];
    const text = n === void 0 ? s.caption : s.caption.replace(new RegExp(`^(?:Step ${n}: |${n}\\. )`), "");
    return [`<li${n === void 0 ? "" : ` value="${n}"`}>${(0, import_sf_page.escapeHtml)(text)}${s.where ? ` <code>${(0, import_sf_page.escapeHtml)(s.where)}</code>` : ""}</li>`];
  };
  const items = animated ? mine.flatMap((n) => item(figure.steps[n - 1], n)) : figure.steps.flatMap((s) => item(s));
  const title = (0, import_sf_page.escapeHtml)(spec.meta.title);
  return `<!doctype html>
${import_sf_markdown.GENERATED}
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
#theme,#pause{font:inherit;color:var(--ink);background:var(--panel);border:1.5px solid var(--rule);border-radius:999px;padding:4px 14px;margin-inline-start:12px;cursor:pointer}
.scroll{max-inline-size:100%;overflow-x:auto}
svg{max-inline-size:100%;block-size:auto;background:var(--panel);border:1px solid var(--rule);border-radius:8px}
svg text{font-size:13px;fill:var(--ink)} svg .muted{fill:var(--muted);font-size:12px}
.node{fill:var(--panel);stroke:var(--ink);stroke-width:1.4} .node.ctx{stroke:var(--muted);stroke-dasharray:5 4}
.group{fill:none;stroke:var(--muted);stroke-dasharray:5 4} .chip{fill:var(--panel)}
.edge{fill:none;--rest:var(--muted);--rest-w:1.6;stroke:var(--rest);stroke-width:var(--rest-w)} .edge.async{stroke-dasharray:6 4}
.lane{fill:var(--panel);stroke:var(--ink);stroke-width:1.4} .lane.client{stroke:var(--info)} .lane.security{stroke:var(--violet)}
.lane.external{stroke:var(--muted);stroke-dasharray:5 4;fill:color-mix(in srgb,var(--muted) 14%,var(--panel))}
.life{stroke:var(--rule);stroke-width:1.2;stroke-dasharray:4 4} .msg .edge.leaves{--rest:var(--warn);--rest-w:2.4;stroke-dasharray:12 4 2 4}
${keyframes}
.paused .edge{animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.edge{animation:none!important}#pause{display:none}}
</style>
</head>
<body>
<p><a href="../index.html">Back to the system page</a> <button id="theme" type="button">Theme</button>${keyframes === "" ? "" : ' <button id="pause" type="button" aria-pressed="false">Pause animation</button>'}</p>
<h1>${title}</h1>
${d.pages > 1 ? `<p>Page ${page} of ${d.pages}</p>
` : ""}<div class="scroll">
<svg role="img" aria-label="${title}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="min-inline-size:${Math.ceil(width * 12 / 13)}px" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker><marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="none" stroke="var(--muted)" stroke-width="1.6"/></marker></defs>
${body}
</svg>
</div>
<ol>
${items.join("\n")}
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
  // The steps loop for as long as the page is open, so the reader can stop them (WCAG 2.2.2).
  var pz = document.getElementById("pause");
  if (pz) pz.addEventListener("click", function () { pz.setAttribute("aria-pressed", String(root.classList.toggle("paused"))); });
})();
</script>
</body>
</html>
`;
}
const hasArchify = (dir) => fs.existsSync(path.join(dir, "bin", "archify.mjs"));
function findArchify(env) {
  const tries = [
    ["CLAUDE_CONFIG_DIR", env.CLAUDE_CONFIG_DIR ? path.join(env.CLAUDE_CONFIG_DIR, "skills", "archify") : void 0],
    ["HOME", env.HOME ? path.join(env.HOME, ".claude", "skills", "archify") : void 0]
  ];
  for (const [via, dir] of tries) {
    if (!dir || !hasArchify(dir)) continue;
    let version = null;
    try {
      version = (0, import_json.parseJson)(fs.readFileSync(path.join(dir, "skill-release.json"), "utf8")).version ?? null;
    } catch {
    }
    return { dir, version, via };
  }
  return null;
}
const READ_WIDTH = 1e3;
function authorCanvas(dir, spec, timeoutS) {
  const r = (0, import_child_process.spawnSync)(process.execPath, [path.join(dir, "bin", "archify.mjs"), "validate", "architecture", spec, "--layout-json"], { encoding: "utf8", timeout: timeoutS * 1e3, killSignal: "SIGKILL" });
  if (r.error || r.signal) return `archify validate timed out after ${timeoutS} s`;
  const failed = `archify validate failed: ${r.stdout.trim().slice(0, 200) || `exit ${r.status}`}`;
  let vb;
  try {
    vb = (0, import_json.parseJson)(r.stdout).viewBox;
  } catch {
    return failed;
  }
  if (!Array.isArray(vb) || typeof vb[0] !== "number" || typeof vb[1] !== "number") return failed;
  const doc = (0, import_json.parseJson)(fs.readFileSync(spec, "utf8"));
  const shift = Math.max(0, Math.ceil((READ_WIDTH - vb[0]) / 2));
  for (const c of doc.components) c.pos = [c.pos[0] + shift, c.pos[1]];
  doc.meta.viewBox = [vb[0] + 2 * shift, vb[1]];
  fs.writeFileSync(spec, `${JSON.stringify(doc, null, 2)}
`);
  return null;
}
async function runArchify(dir, jobs, timeoutS = 600) {
  const results = [];
  const one = (j) => new Promise((resolve) => {
    const receipt = j.receipt;
    fs.rmSync(j.check, { force: true });
    const canvas = j.kind === "architecture" && j.ours ? authorCanvas(dir, j.spec, timeoutS) : null;
    const args = [path.join(dir, "bin", "archify.mjs"), "finalize", j.kind, j.spec, j.out, "--repo-root", j.repoRoot, "--quality", "showcase", "--receipt", receipt, "--json"];
    let stdout = "", stderr = "", timedOut = false, settled = false;
    const child = (0, import_child_process.spawn)(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"], detached: true });
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutS * 1e3);
    child.stdout.on("data", (b) => {
      stdout += b.toString();
    });
    child.stderr.on("data", (b) => {
      stderr += b.toString();
    });
    const done = (code, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) stderr += `${error.message}
`;
      results[jobs.indexOf(j)] = { name: j.name, ok: !timedOut && code === 0 && fs.existsSync(j.out), receipt: fs.existsSync(receipt) ? receipt : null, timedOut, json: stdout.trim(), stderr: stderr.trimEnd().split("\n").slice(-20).join("\n"), canvas };
      resolve();
    };
    child.on("error", (e) => done(null, e));
    child.on("close", (code) => done(code));
    child.on("exit", (code) => {
      if (timedOut) done(code);
    });
  });
  for (const j of jobs) await one(j);
  return results;
}
function outsideRefs(html) {
  const all = (re) => [...html.matchAll(re)].map((m) => m[1] ?? "");
  const urls = [
    ...all(/\bsrc\s*=\s*["']([^"']*)["']/gi),
    ...all(/\bsrcset\s*=\s*["']([^"']*)["']/gi).flatMap((v) => v.split(",").map((x) => x.trim().split(/\s+/)[0] ?? "")),
    ...all(/<link\b[^>]*?\bhref\s*=\s*["']([^"']*)["']/gi),
    ...all(/url\(\s*["']?([^"')]*)["']?\s*\)/gi),
    ...all(/@import\s+["']([^"']*)["']/gi)
  ].map((u) => u.trim());
  return urls.filter((u) => u && !/^data:/i.test(u) && (/^(?:\/|[a-z][a-z0-9+.-]*:)/i.test(u) || path.posix.normalize(`diagrams/${u}`).startsWith("../")));
}
const rgba = (hex, a) => {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return `rgba(${parseInt(f.slice(0, 2), 16)}, ${parseInt(f.slice(2, 4), 16)}, ${parseInt(f.slice(4, 6), 16)}, ${a})`;
};
const KIND_SLOT = [["frontend", "--info"], ["backend", "--accent"], ["database", "--violet"], ["cloud", "--warn"], ["security", "--alert"], ["messagebus", "--alert"], ["external", "--muted"]];
function archifyVars(v, fillA, pad) {
  const x = (k) => v[k];
  const all = [
    ["bg", x("--paper")],
    ["grid", x("--rule")],
    ["text", x("--ink")],
    ["text-muted", x("--muted")],
    ["text-dim", x("--muted")],
    ["text-faint", x("--muted")],
    ["panel", x("--panel")],
    ["panel-border", x("--rule")],
    ["lane-fill", rgba(x("--code"), 0.7)],
    ["lane-stroke", x("--rule")],
    ["arrow", x("--muted")],
    ["arrow-emphasis", x("--accent")],
    ["mask", x("--panel")],
    ["toolbar-bg", x("--panel")],
    ["toolbar-border", x("--rule")],
    ["toolbar-text", x("--ink")],
    ["toolbar-hover", x("--panel")],
    ["toolbar-menu-bg", x("--panel")],
    ...KIND_SLOT.flatMap(([k, slot]) => [[`${k}-fill`, rgba(x(slot), fillA)], [`${k}-stroke`, x(slot)]])
  ];
  return all.map(([k, val]) => `${pad}--${k}: ${val};`).join("\n");
}
const THEME_BLOCK = /\/\* fx-theme:begin \*\/[\s\S]*?\/\* fx-theme:end \*\/\n?/g;
function applyThemeBlock(html, t) {
  const block = `/* fx-theme:begin */
:root, [data-theme="light"] {
${archifyVars(t.light, 0.1, "  ")}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${archifyVars(t.dark, 0.14, "    ")}
  }
}
[data-theme="dark"] {
${archifyVars(t.dark, 0.14, "  ")}
}
/* fx-theme:end */
`;
  const bare = html.replace(THEME_BLOCK, "");
  const close = bare.indexOf("</style>");
  if (close >= 0) return `${bare.slice(0, close)}${block}${bare.slice(close)}`;
  const head = bare.indexOf("</head>");
  return head >= 0 ? `${bare.slice(0, head)}<style>
${block}</style>
${bare.slice(head)}` : `<style>
${block}</style>
${bare}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyThemeBlock,
  deepDiagrams,
  findArchify,
  hasArchify,
  outsideRefs,
  pickLine,
  runArchify,
  svgPage
});
