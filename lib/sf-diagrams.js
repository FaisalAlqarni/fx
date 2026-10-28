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
  const known = new Set(d.nodes.map((n) => n.id));
  const groups = d.groups.flatMap((g) => {
    const wraps = g.members.filter((x) => known.has(x));
    return wraps.length ? [{ label: g.label, wraps }] : [];
  });
  let dx = 0, dy = 0;
  for (const g of groups) {
    const m = fig.nodes.filter((n) => g.wraps.includes(n.id));
    const x0 = Math.min(...m.map((n) => n.x)), x1 = Math.max(...m.map((n) => n.x + n.w));
    const title = Math.max(30, units(g.label) * 9 * 0.6 + 10) + 8;
    dx = Math.max(dx, EDGE + 30 + Math.max(0, title - (x1 - x0 + 60)) / 2 - x0);
    dy = Math.max(dy, EDGE + 30 - Math.min(...m.map((n) => n.y)));
  }
  dx = Math.ceil(dx);
  dy = Math.ceil(dy);
  const components = fig.nodes.map((n) => {
    const m = byId.get(n.id);
    const sources = m && m.primary !== false ? sourcesOf(m.evidence, linked(own, repo), host, rest, m.label) : void 0;
    const label = fit(m?.label ?? n.id, Math.floor((n.w + 8) / 6.6), `${n.id} label`, shortened);
    const sublabel = m?.role ? fit(m.role, Math.floor((n.w - 8) / 3.6), `${n.id} sublabel`, shortened) : void 0;
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
    ...rest.length ? { cards: evCard(rest) } : {}
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
  const items = animated ? mine.flatMap((n) => {
    const c = figure.steps[n - 1]?.caption;
    return c ? [`<li value="${n}">${(0, import_sf_page.escapeHtml)(c.startsWith(`${n}. `) ? c.slice(`${n}. `.length) : c)}</li>`] : [];
  }) : figure.steps.flatMap((s) => s.caption ? [`<li>${(0, import_sf_page.escapeHtml)(s.caption)}</li>`] : []);
  const title = (0, import_sf_page.escapeHtml)(spec.meta.title);
  return `<!doctype html>
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
.scroll{max-inline-size:100%;overflow-x:auto}
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
` : ""}<div class="scroll">
<svg role="img" aria-label="${title}" viewBox="0 0 ${figure.width} ${figure.height}" width="${figure.width}" height="${figure.height}" style="min-inline-size:${Math.ceil(figure.width * 12 / 13)}px" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
${groups}${edges}${nodes}
</svg>
</div>
<ol>
${items.join("\n")}
</ol>
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
async function runArchify(dir, jobs, timeoutS = 600) {
  const results = [];
  const one = (j) => new Promise((resolve) => {
    const receipt = j.receipt;
    fs.rmSync(j.check, { force: true });
    const args = [path.join(dir, "bin", "archify.mjs"), "finalize", j.kind, j.spec, j.out, "--repo-root", j.repoRoot, "--quality", "showcase", "--receipt", receipt, "--json"];
    let stdout = "", stderr = "", timedOut = false, settled = false;
    const child = (0, import_child_process.spawn)(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
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
      results[jobs.indexOf(j)] = { name: j.name, ok: !timedOut && code === 0 && fs.existsSync(j.out), receipt: fs.existsSync(receipt) ? receipt : null, timedOut, json: stdout.trim(), stderr: stderr.trimEnd().split("\n").slice(-20).join("\n") };
      resolve();
    };
    child.on("error", (e) => done(null, e));
    child.on("close", (code) => done(code));
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
