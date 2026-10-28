// Deep diagrams: one archify spec per level diagram, sequence and store flow page, and the SVG
// fallback page drawn from the same figure spec. Archify itself runs in a later task.
import * as fs from 'fs';
import { parseJson } from './json.js';
import * as path from 'path';
import { spawn } from 'child_process';
import type { Theme } from './sf-theme.js';
import type { FxJson } from './types.js';
import type { Diagram, Evidence, FigureSpec, FileEvidence, Model, StoreFlow } from './sf-model.js';
import type { Root } from './sf-evidence.js';
import { escapeHtml } from './sf-page.js';

type Obj = Record<string, unknown>;
export type DeepDiagram = { name: string; kind: 'architecture' | 'sequence'; source: string; spec: object; pages: number; owningRoot: string };

const PAGE_DEFAULT = 8;
const COMPONENT_TYPES = ['frontend', 'backend', 'database', 'cloud', 'security', 'messagebus', 'external'];

// Model ids allow a leading digit; archify ids do not.
const aid = (id: string): string => (/^[0-9]/.test(id) ? `n${id}` : id);
const componentType = (kind: string): string => (COMPONENT_TYPES.includes(kind) ? kind : 'backend');
const cut = (s: string, n: number): string => [...s].slice(0, n).join('');

const isFile = (e: Evidence): e is FileEvidence => 'path' in e;

// The root most evidence entries cite; a tie goes to the host.
function owningRoot(entries: Evidence[], roots: Map<string, Root>): string {
  const host = [...roots.values()].find((r) => r.host)?.id ?? '';
  const count = new Map<string, number>();
  for (const e of entries) if (isFile(e)) count.set(e.root ?? host, (count.get(e.root ?? host) ?? 0) + 1);
  let best = host, top = count.get(host) ?? 0;
  for (const [id, n] of count) if (n > top) { best = id; top = n; }
  return best;
}

type Source = { path: string; line?: number; end_line?: number; label?: string };
// "63,67-245" is two ranges. An entry of another root, or past the third range, goes to the steps card.
function sourcesOf(list: Evidence[], own: string, host: string, rest: string[], who: string): Source[] | undefined {
  const out: Source[] = [];
  for (const e of list) {
    if (!isFile(e)) continue;
    const root = e.root ?? host;
    const parts = e.lines === undefined ? [''] : e.lines.split(',').map((x) => x.trim());
    if (root !== own) { rest.push(`${who}: @${root}/${e.path}${e.lines === undefined ? '' : `:${e.lines}`}`); continue; }
    for (const p of parts) {
      const m = /^(\d+)(?:-(\d+))?$/.exec(p);
      const src: Source = { path: cut(e.path, 240), ...(m ? { line: Number(m[1]), ...(m[2] ? { end_line: Number(m[2]) } : {}) } : {}), ...(e.symbol ? { label: cut(e.symbol, 48) } : {}) };
      if (out.length < 3) out.push(src); else rest.push(`${who}: ${e.path}${p ? `:${p}` : ''}`);
    }
  }
  return out.length ? out : undefined;
}

// Credentials never reach a spec: userinfo is cut from a URL remote.
const publicUrl = (remote: string): string => remote.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/]*@/i, '$1');

function repository(root: Root | undefined, id: string): Obj | undefined {
  if (!root?.head) return undefined;
  return { url: root.remote ? publicUrl(root.remote) : id, revision: root.head, link_mode: 'local-only' };
}

const evCard = (rest: string[]): Obj[] => (rest.length ? [{ dot: 'slate', title: 'Evidence in other roots', items: rest }] : []);

function architecture(d: Diagram, fig: FigureSpec, roots: Map<string, Root>): DeepDiagram {
  const host = [...roots.values()].find((r) => r.host)?.id ?? '';
  const all = [...d.nodes, ...d.edges, ...d.groups].flatMap((o) => o.evidence);
  const own = owningRoot(all, roots);
  const rest: string[] = [];
  const byId = new Map(d.nodes.map((n) => [n.id, n]));
  const components = fig.nodes.map((n) => {
    const m = byId.get(n.id);
    const sources = m && m.primary !== false ? sourcesOf(m.evidence, own, host, rest, m.label) : undefined;
    return { id: aid(n.id), type: componentType(m?.kind ?? n.kind), label: m?.label ?? n.id, ...(m?.role ? { sublabel: m.role } : {}), ...(sources ? { sources } : {}), pos: [n.x, n.y], size: [n.w, n.h] };
  });
  const known = new Set(d.nodes.map((n) => n.id));
  const boundaries = d.groups.flatMap((g) => { const wraps = g.members.filter((x) => known.has(x)).map(aid); return wraps.length ? [{ kind: 'region', label: g.label, wraps }] : []; });
  const repo = repository(roots.get(own), own);
  const name = `arch-${d.id}`;
  const spec = {
    schema_version: 1, diagram_type: 'architecture',
    meta: { title: d.title, subtitle: d.summary, output: `${name}.html`, quality_profile: 'showcase', ...(repo ? { repository: repo } : {}), viewBox: [Math.max(320, fig.width), Math.max(240, fig.height)] },
    components,
    ...(boundaries.length ? { boundaries } : {}),
    connections: d.edges.map((e) => ({ from: aid(e.from), to: aid(e.to), label: e.label, ...(e.mode === 'async' ? { variant: 'dashed' } : {}) })),
    ...(rest.length ? { cards: evCard(rest) } : {}),
  };
  return { name, kind: 'architecture', source: `diagram:${d.id}`, spec, pages: 1, owningRoot: own };
}

type Msg = { n: number; from: string; to: string; label: string; mode?: string; note?: string };
type Part = { id: string; type: string; label: string; sources?: Source[] };

// Splits messages into pages and writes one sequence spec per page, listing only the participants it uses.
function sequencePages(base: string, title: string, parts: Part[], msgs: Msg[], own: string, repo: Obj | undefined, rest: string[], limit: number, source: string): DeepDiagram[] {
  const pages = Math.max(1, Math.ceil(msgs.length / limit));
  return Array.from({ length: pages }, (_, p) => {
    const slice = msgs.slice(p * limit, (p + 1) * limit);
    const used = new Set(slice.flatMap((m) => [m.from, m.to]));
    // archify wants two participants; a page of self messages borrows the next one.
    for (const x of parts) if (used.size < 2) used.add(x.id);
    const shown = parts.filter((x) => used.has(x.id));
    const name = p === 0 ? base : `${base}-p${p + 1}`;
    const spec = {
      schema_version: 1, diagram_type: 'sequence',
      meta: { title: pages > 1 ? `${title} (page ${p + 1} of ${pages})` : title, output: `${name}.html`, quality_profile: 'showcase', ...(repo ? { repository: repo } : {}), viewBox: [Math.max(480, 150 * shown.length + 60), Math.max(480, 180 + 56 * slice.length + 60)] },
      participants: shown.map((x) => ({ id: aid(x.id), type: x.type, label: x.label, ...(x.sources ? { sources: x.sources } : {}) })),
      messages: slice.map((m, i) => ({ id: `m${m.n}`, from: aid(m.from), to: aid(m.to), y: 180 + 56 * i, label: `${m.n}. ${m.label}`, ...(m.mode === 'async' ? { variant: 'dashed' } : {}), ...(m.note ? { note: m.note } : {}) })),
      ...(rest.length && p === 0 ? { cards: evCard(rest) } : {}),
    };
    return { name, kind: 'sequence' as const, source, spec, pages, owningRoot: own };
  });
}

function sequence(q: Model['sequences'][number], roots: Map<string, Root>, limit: number): DeepDiagram[] {
  const host = [...roots.values()].find((r) => r.host)?.id ?? '';
  const own = owningRoot([...q.participants, ...q.messages].flatMap((o) => o.evidence), roots);
  const rest: string[] = [];
  const parts = q.participants.map((p): Part => ({ id: p.id, type: componentType(p.kind ?? ''), label: p.label, sources: sourcesOf(p.evidence, own, host, rest, p.label) }));
  for (const m of q.messages) sourcesOf(m.evidence, own, host, rest, `message ${m.n}`);
  return sequencePages(`seq-${q.id}`, q.title, parts, q.messages, own, repository(roots.get(own), own), rest, limit, `seq:${q.id}`);
}

function flow(f: StoreFlow, model: Model, roots: Map<string, Root>, limit: number): DeepDiagram[] {
  const host = [...roots.values()].find((r) => r.host)?.id ?? '';
  const own = owningRoot(f.steps.flatMap((s) => s.evidence), roots);
  const rest: string[] = [];
  const nodes = new Map(model.levels.diagrams.flatMap((d) => d.nodes).map((n) => [n.id, n]));
  for (const s of f.steps) sourcesOf(s.evidence, own, host, rest, `step ${s.n}`);
  const actors = [...new Set(f.steps.map((s) => s.actor))], stores = [...new Set(f.steps.map((s) => s.store as string))];
  const parts: Part[] = [
    ...actors.map((id): Part => { const n = nodes.get(id); return { id, type: componentType(n?.kind ?? ''), label: n?.label ?? id, sources: n ? sourcesOf(n.evidence, own, host, [], id) : undefined }; }),
    // Model ids are lowercase with no underscore, so S_<store> never equals an actor id.
    ...stores.map((id): Part => ({ id: `S_${id}`, type: 'database', label: id })),
  ];
  const msgs = f.steps.map((s): Msg => ({ n: s.n, from: s.actor, to: `S_${s.store}`, label: `${s.op}${s.key ? ` ${s.key}` : ''}`, ...(s.when ? { note: s.when } : {}) }));
  return sequencePages(`flow-${f.id}`, f.trigger, parts, msgs, own, repository(roots.get(own), own), rest, limit, `flow:${f.id}`);
}

export function deepDiagrams(model: Model, figures: FigureSpec[], roots: Map<string, Root>, pageLimit: Record<string, number>): DeepDiagram[] {
  const fig = (key: string): FigureSpec => { const x = figures.find((y) => y.key === key); if (!x) throw new Error(`no figure ${key}`); return x; };
  return [
    ...model.levels.diagrams.map((d) => architecture(d, fig(`level-${d.id}`), roots)),
    ...model.sequences.flatMap((q) => sequence(q, roots, pageLimit[`seq-${q.id}`] ?? PAGE_DEFAULT)),
    ...model.storeFlows.flatMap((f) => flow(f, model, roots, pageLimit[`flow-${f.id}`] ?? PAGE_DEFAULT)),
  ];
}

export const pickLine = (name: string, label: 'archify architecture' | 'archify sequence' | 'static SVG' | 'animated SVG', detail: string): string => `${name}: ${label}, ${detail}`;

// ---------------------------------------------------------------- SVG fallback
const STEP_SECONDS = 1.2;

export function svgPage(d: DeepDiagram, figure: FigureSpec, page: number): string {
  const spec = d.spec as { meta: { title: string }; messages?: { id: string }[] };
  const animated = d.kind === 'sequence';
  // A sequence page animates its own messages: message m<n> is figure step n.
  const mine = animated ? (spec.messages ?? []).map((m) => Number(m.id.slice(1))) : [];
  const total = Math.max(1, mine.length) * STEP_SECONDS;
  const stepOf = new Map<string, number>();
  mine.forEach((n, j) => { for (const e of figure.steps[n - 1]?.edges ?? []) if (!stepOf.has(e)) stepOf.set(e, j); });
  const keyframes = [...new Set(stepOf.values())].map((j) => {
    const a = (j / mine.length) * 100, b = ((j + 1) / mine.length) * 100;
    return `@keyframes step${j}{0%,${a.toFixed(2)}%{stroke:var(--muted);stroke-width:1.6}${(a + 0.01).toFixed(2)}%,${b.toFixed(2)}%{stroke:var(--accent);stroke-width:3}${(b + 0.01).toFixed(2)}%,100%{stroke:var(--muted);stroke-width:1.6}}`;
  }).join('');
  const groups = figure.groups.map((g) => `<rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" class="group"/><text x="${g.x + 10}" y="${g.y + 16}" class="muted">${escapeHtml(g.label)}</text>`).join('');
  const edges = figure.edges.map((e) => {
    const j = stepOf.get(e.id);
    const style = j === undefined ? '' : ` style="animation:step${j} ${total}s linear infinite"`;
    const label = e.label ? `<rect x="${e.label.x}" y="${e.label.y}" width="${e.label.w}" height="${e.label.h}" rx="4" class="chip"/><text x="${e.label.x + e.label.w / 2}" y="${e.label.y + e.label.h / 2 + 4}" text-anchor="middle">${escapeHtml(e.label.text)}</text>` : '';
    return `<path d="${escapeHtml(e.d)}" class="edge${e.mode === 'async' ? ' async' : ''}" marker-end="url(#arrow)"${style}/>${label}`;
  }).join('');
  const nodes = figure.nodes.map((n) => `<g><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" class="node${n.primary ? '' : ' ctx'}"/>${n.lines.map((l, i) => `<text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + (i - (n.lines.length - 1) / 2) * 15 + 4}" text-anchor="middle" class="ink">${escapeHtml(l)}</text>`).join('')}</g>`).join('');
  const captions = (animated ? mine.map((n) => figure.steps[n - 1]?.caption) : figure.steps.map((s) => s.caption)).filter((c): c is string => !!c);
  const title = escapeHtml(spec.meta.title);
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
${d.pages > 1 ? `<p>Page ${page} of ${d.pages}</p>\n` : ''}<svg role="img" aria-label="${title}" viewBox="0 0 ${figure.width} ${figure.height}" width="${figure.width}" height="${figure.height}" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
${groups}${edges}${nodes}
</svg>
<ol>
${captions.map((c) => `<li>${escapeHtml(c)}</li>`).join('\n')}
</ol>
</body>
</html>
`;
}

// ---------------------------------------------------------------- running archify
const hasArchify = (dir: string): boolean => fs.existsSync(path.join(dir, 'bin', 'archify.mjs'));

// The lookup order of the Global Constraints: $CLAUDE_CONFIG_DIR, then $HOME, then .fx.json; a folder without bin/archify.mjs is skipped.
export function findArchify(hostRoot: string, env: NodeJS.ProcessEnv, fx: FxJson['system_flow']): { dir: string; version: string | null; via: 'CLAUDE_CONFIG_DIR' | 'HOME' | '.fx.json' } | null {
  const tries: ['CLAUDE_CONFIG_DIR' | 'HOME' | '.fx.json', string | undefined][] = [
    ['CLAUDE_CONFIG_DIR', env.CLAUDE_CONFIG_DIR ? path.join(env.CLAUDE_CONFIG_DIR, 'skills', 'archify') : undefined],
    ['HOME', env.HOME ? path.join(env.HOME, '.claude', 'skills', 'archify') : undefined],
    ['.fx.json', fx?.diagrams?.archify ? path.resolve(hostRoot, fx.diagrams.archify) : undefined],
  ];
  for (const [via, dir] of tries) {
    if (!dir || !hasArchify(dir)) continue;
    let version: string | null = null;
    try { version = (parseJson(fs.readFileSync(path.join(dir, 'skill-release.json'), 'utf8')) as { version?: string }).version ?? null; } catch { /* no release file */ }
    return { dir, version, via };
  }
  return null;
}

// Runs `finalize` for each job, at most `limit` at a time. The receipt sits beside the output as <name>.receipt.json (ruling 17).
export function runArchify(dir: string, jobs: { name: string; kind: 'architecture' | 'sequence'; spec: string; out: string; repoRoot: string }[], limit: 4): Promise<{ name: string; ok: boolean; receipt: string | null }[]> {
  const results: { name: string; ok: boolean; receipt: string | null }[] = [];
  const one = (j: (typeof jobs)[number]): Promise<void> => new Promise((resolve) => {
    const receipt = path.join(path.dirname(j.out), `${j.name}.receipt.json`);
    const args = [path.join(dir, 'bin', 'archify.mjs'), 'finalize', j.kind, j.spec, j.out, '--repo-root', j.repoRoot, '--quality', 'showcase', '--receipt', receipt, '--json'];
    const done = (code: number | null): void => {
      results[jobs.indexOf(j)] = { name: j.name, ok: code === 0 && fs.existsSync(j.out), receipt: fs.existsSync(receipt) ? receipt : null };
      resolve();
    };
    const child = spawn(process.execPath, args, { stdio: 'ignore' });
    child.on('error', () => done(null));
    child.on('close', done);
  });
  let next = 0;
  const worker = async (): Promise<void> => { while (next < jobs.length) await one(jobs[next++] as (typeof jobs)[number]); };
  return Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker)).then(() => results);
}

// ---------------------------------------------------------------- theme block
const rgba = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  return `rgba(${parseInt(f.slice(0, 2), 16)}, ${parseInt(f.slice(2, 4), 16)}, ${parseInt(f.slice(4, 6), 16)}, ${a})`;
};
// archify's component kinds take fx's stroke slots; fx has no red slot, so security shares --alert with messagebus.
const KIND_SLOT: [string, string][] = [['frontend', '--info'], ['backend', '--accent'], ['database', '--violet'], ['cloud', '--warn'], ['security', '--alert'], ['messagebus', '--alert'], ['external', '--muted']];

// archify's variable names from fx's slots, after system-flow's apply-theme.mjs.
function archifyVars(v: Record<string, string>, fillA: number, pad: string): string {
  const x = (k: string): string => v[k] as string;
  const all: [string, string][] = [
    ['bg', x('--paper')], ['grid', x('--rule')], ['text', x('--ink')], ['text-muted', x('--muted')], ['text-dim', x('--muted')], ['text-faint', x('--muted')],
    ['panel', x('--panel')], ['panel-border', x('--rule')], ['lane-fill', rgba(x('--code'), 0.7)], ['lane-stroke', x('--rule')],
    ['arrow', x('--muted')], ['arrow-emphasis', x('--accent')], ['mask', x('--panel')],
    ['toolbar-bg', x('--panel')], ['toolbar-border', x('--rule')], ['toolbar-text', x('--ink')], ['toolbar-hover', x('--panel')], ['toolbar-menu-bg', x('--panel')],
    ...KIND_SLOT.flatMap(([k, slot]): [string, string][] => [[`${k}-fill`, rgba(x(slot), fillA)], [`${k}-stroke`, x(slot)]]),
  ];
  return all.map(([k, val]) => `${pad}--${k}: ${val};`).join('\n');
}

const THEME_BLOCK = /\/\* fx-theme:begin \*\/[\s\S]*?\/\* fx-theme:end \*\/\n?/g;
// shortcut: archify's print block and opt-in presets keep their own colours; map them if a proof run shows the need.
export function applyThemeBlock(html: string, t: Theme): string {
  const block = `/* fx-theme:begin */
:root, [data-theme="light"] {
${archifyVars(t.light, 0.1, '  ')}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${archifyVars(t.dark, 0.14, '    ')}
  }
}
[data-theme="dark"] {
${archifyVars(t.dark, 0.14, '  ')}
}
/* fx-theme:end */
`;
  const bare = html.replace(THEME_BLOCK, '');
  const close = bare.indexOf('</style>');
  if (close >= 0) return `${bare.slice(0, close)}${block}${bare.slice(close)}`;
  const head = bare.indexOf('</head>');
  return head >= 0 ? `${bare.slice(0, head)}<style>\n${block}</style>\n${bare.slice(head)}` : `<style>\n${block}</style>\n${bare}`;
}
