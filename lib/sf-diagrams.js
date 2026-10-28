// generated from src/lib/sf-diagrams.ts by scripts/build: edit there, not here
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sf_diagrams_exports = {};
__export(sf_diagrams_exports, {
  deepDiagrams: () => deepDiagrams,
  pickLine: () => pickLine,
  svgPage: () => svgPage
});
module.exports = __toCommonJS(sf_diagrams_exports);
var import_sf_page = require("./sf-page.js");
const PAGE_DEFAULT = 8;
const COMPONENT_TYPES = ["frontend", "backend", "database", "cloud", "security", "messagebus", "external"];
const aid = (id) => /^[0-9]/.test(id) ? `n${id}` : id;
const componentType = (kind) => COMPONENT_TYPES.includes(kind) ? kind : "backend";
const cut = (s, n) => [...s].slice(0, n).join("");
const isFile = (e) => "path" in e;
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
function repository(root, id) {
  if (!root?.head) return void 0;
  return { url: root.remote ? publicUrl(root.remote) : id, revision: root.head, link_mode: "local-only" };
}
const evCard = (rest) => rest.length ? [{ dot: "slate", title: "Evidence in other roots", items: rest }] : [];
function architecture(d, fig, roots) {
  const host = [...roots.values()].find((r) => r.host)?.id ?? "";
  const all = [...d.nodes, ...d.edges, ...d.groups].flatMap((o) => o.evidence);
  const own = owningRoot(all, roots);
  const rest = [];
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const components = fig.nodes.map((n) => {
    const m = byId.get(n.id);
    const sources = m && m.primary !== false ? sourcesOf(m.evidence, own, host, rest, m.label) : void 0;
    return { id: aid(n.id), type: componentType(m?.kind ?? n.kind), label: m?.label ?? n.id, ...m?.role ? { sublabel: m.role } : {}, ...sources ? { sources } : {}, pos: [n.x, n.y], size: [n.w, n.h] };
  });
  const known = new Set(d.nodes.map((n) => n.id));
  const boundaries = d.groups.flatMap((g) => {
    const wraps = g.members.filter((x) => known.has(x)).map(aid);
    return wraps.length ? [{ kind: "region", label: g.label, wraps }] : [];
  });
  const repo = repository(roots.get(own), own);
  const name = `arch-${d.id}`;
  const spec = {
    schema_version: 1,
    diagram_type: "architecture",
    meta: { title: d.title, subtitle: d.summary, output: `${name}.html`, quality_profile: "showcase", ...repo ? { repository: repo } : {}, viewBox: [Math.max(320, fig.width), Math.max(240, fig.height)] },
    components,
    ...boundaries.length ? { boundaries } : {},
    connections: d.edges.map((e) => ({ from: aid(e.from), to: aid(e.to), label: e.label, ...e.mode === "async" ? { variant: "dashed" } : {} })),
    ...rest.length ? { cards: evCard(rest) } : {}
  };
  return { name, kind: "architecture", source: `diagram:${d.id}`, spec, pages: 1, owningRoot: own };
}
function sequencePages(base, title, parts, msgs, own, repo, rest, limit, source) {
  const pages = Math.max(1, Math.ceil(msgs.length / limit));
  return Array.from({ length: pages }, (_, p) => {
    const slice = msgs.slice(p * limit, (p + 1) * limit);
    const used = new Set(slice.flatMap((m) => [m.from, m.to]));
    for (const x of parts) if (used.size < 2) used.add(x.id);
    const shown = parts.filter((x) => used.has(x.id));
    const name = p === 0 ? base : `${base}-p${p + 1}`;
    const spec = {
      schema_version: 1,
      diagram_type: "sequence",
      meta: { title: pages > 1 ? `${title} (page ${p + 1} of ${pages})` : title, output: `${name}.html`, quality_profile: "showcase", ...repo ? { repository: repo } : {}, viewBox: [Math.max(480, 150 * shown.length + 60), Math.max(480, 180 + 56 * slice.length + 60)] },
      participants: shown.map((x) => ({ id: aid(x.id), type: x.type, label: x.label, ...x.sources ? { sources: x.sources } : {} })),
      messages: slice.map((m, i) => ({ id: `m${m.n}`, from: aid(m.from), to: aid(m.to), y: 180 + 56 * i, label: `${m.n}. ${m.label}`, ...m.mode === "async" ? { variant: "dashed" } : {}, ...m.note ? { note: m.note } : {} })),
      ...rest.length && p === 0 ? { cards: evCard(rest) } : {}
    };
    return { name, kind: "sequence", source, spec, pages, owningRoot: own };
  });
}
function sequence(q, roots, limit) {
  const host = [...roots.values()].find((r) => r.host)?.id ?? "";
  const own = owningRoot([...q.participants, ...q.messages].flatMap((o) => o.evidence), roots);
  const rest = [];
  const parts = q.participants.map((p) => ({ id: p.id, type: componentType(p.kind ?? ""), label: p.label, sources: sourcesOf(p.evidence, own, host, rest, p.label) }));
  for (const m of q.messages) sourcesOf(m.evidence, own, host, rest, `message ${m.n}`);
  return sequencePages(`seq-${q.id}`, q.title, parts, q.messages, own, repository(roots.get(own), own), rest, limit, `seq:${q.id}`);
}
function flow(f, model, roots, limit) {
  const host = [...roots.values()].find((r) => r.host)?.id ?? "";
  const own = owningRoot(f.steps.flatMap((s) => s.evidence), roots);
  const rest = [];
  const nodes = new Map(model.levels.diagrams.flatMap((d) => d.nodes).map((n) => [n.id, n]));
  for (const s of f.steps) sourcesOf(s.evidence, own, host, rest, `step ${s.n}`);
  const actors = [...new Set(f.steps.map((s) => s.actor))], stores = [...new Set(f.steps.map((s) => s.store))];
  const parts = [
    ...actors.map((id) => {
      const n = nodes.get(id);
      return { id, type: componentType(n?.kind ?? ""), label: n?.label ?? id, sources: n ? sourcesOf(n.evidence, own, host, [], id) : void 0 };
    }),
    // Model ids are lowercase with no underscore, so S_<store> never equals an actor id.
    ...stores.map((id) => ({ id: `S_${id}`, type: "database", label: id }))
  ];
  const msgs = f.steps.map((s) => ({ n: s.n, from: s.actor, to: `S_${s.store}`, label: `${s.op}${s.key ? ` ${s.key}` : ""}`, ...s.when ? { note: s.when } : {} }));
  return sequencePages(`flow-${f.id}`, f.trigger, parts, msgs, own, repository(roots.get(own), own), rest, limit, `flow:${f.id}`);
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
function svgPage(d, figure, page) {
  const spec = d.spec;
  const animated = d.kind === "sequence";
  const mine = animated ? (spec.messages ?? []).map((m) => Number(m.id.slice(1))) : [];
  const total = Math.max(1, mine.length) * STEP_SECONDS;
  const stepOf = /* @__PURE__ */ new Map();
  mine.forEach((n, j) => {
    for (const e of figure.steps[n - 1]?.edges ?? []) if (!stepOf.has(e)) stepOf.set(e, j);
  });
  const keyframes = [...new Set(stepOf.values())].map((j) => {
    const a = j / mine.length * 100, b = (j + 1) / mine.length * 100;
    return `@keyframes step${j}{0%,${a.toFixed(2)}%{stroke:var(--muted);stroke-width:1.6}${(a + 0.01).toFixed(2)}%,${b.toFixed(2)}%{stroke:var(--accent);stroke-width:3}${(b + 0.01).toFixed(2)}%,100%{stroke:var(--muted);stroke-width:1.6}}`;
  }).join("");
  const groups = figure.groups.map((g) => `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" class="group"/><text x="${g.x + 10}" y="${g.y + 16}" class="muted">${(0, import_sf_page.escapeHtml)(g.label)}</text>`).join("");
  const edges = figure.edges.map((e) => {
    const j = stepOf.get(e.id);
    const style = j === void 0 ? "" : ` style="animation:step${j} ${total}s linear infinite"`;
    const label = e.label ? `<rect x="${e.label.x}" y="${e.label.y}" width="${e.label.w}" height="${e.label.h}" rx="4" class="chip"/><text x="${e.label.x + e.label.w / 2}" y="${e.label.y + e.label.h / 2 + 4}" text-anchor="middle">${(0, import_sf_page.escapeHtml)(e.label.text)}</text>` : "";
    return `<path d="${(0, import_sf_page.escapeHtml)(e.d)}" class="edge${e.mode === "async" ? " async" : ""}" marker-end="url(#arrow)"${style}/>${label}`;
  }).join("");
  const nodes = figure.nodes.map((n) => `<g><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" class="node${n.primary ? "" : " ctx"}"/>${n.lines.map((l, i) => `<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + (i - (n.lines.length - 1) / 2) * 15 + 4}" text-anchor="middle" class="ink">${(0, import_sf_page.escapeHtml)(l)}</text>`).join("")}</g>`).join("");
  const captions = (animated ? mine.map((n) => figure.steps[n - 1]?.caption) : figure.steps.map((s) => s.caption)).filter((c) => !!c);
  const title = (0, import_sf_page.escapeHtml)(spec.meta.title);
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="../assets/fx-tokens-1.css">
<link rel="stylesheet" href="../assets/theme.css">
<style>
body{margin:0;padding:1.5rem;background:var(--paper);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
a{color:var(--accent)}
svg{max-inline-size:100%;block-size:auto;background:var(--panel);border:1px solid var(--rule);border-radius:8px}
svg text{font-size:13px;fill:var(--ink)} svg .muted{fill:var(--muted);font-size:12px}
.node{fill:var(--panel);stroke:var(--ink);stroke-width:1.4} .node.ctx{stroke:var(--muted);stroke-dasharray:5 4}
.group{fill:none;stroke:var(--muted);stroke-dasharray:5 4} .chip{fill:var(--panel)}
.edge{fill:none;stroke:var(--muted);stroke-width:1.6} .edge.async{stroke-dasharray:6 4}
${keyframes}
@media (prefers-reduced-motion:reduce){.edge{animation:none!important}}
</style>
</head>
<body>
<p><a href="../index.html">Back to the system page</a></p>
<h1>${title}</h1>
${d.pages > 1 ? `<p>Page ${page} of ${d.pages}</p>
` : ""}<svg role="img" aria-label="${title}" viewBox="0 0 ${figure.width} ${figure.height}" width="${figure.width}" height="${figure.height}" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
${groups}${edges}${nodes}
</svg>
<ol>
${captions.map((c) => `<li>${(0, import_sf_page.escapeHtml)(c)}</li>`).join("\n")}
</ol>
</body>
</html>
`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deepDiagrams,
  pickLine,
  svgPage
});
