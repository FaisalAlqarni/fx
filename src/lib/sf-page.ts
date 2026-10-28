// The site page: fx's page template filled with the model. Every repository string is HTML-escaped
// before it enters the page, and inline JSON writes every `<` as < so it cannot close its script.
import { sectionItems } from './sf-coverage.js';
import type { Coverage } from './sf-coverage.js';
import type { Root as EvRoot } from './sf-evidence.js';
import type { Evidence, Evidenced, FileEvidence, FigureSpec, Model, Section } from './sf-model.js';
import type { Theme } from './sf-theme.js';

export const escapeHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const inlineJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

// Takes escaped text: Arabic runs (with the spaces between their words) get their own direction.
const AR = '[\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF]+';
export const wrapArabic = (escaped: string): string =>
  escaped.replace(new RegExp(`${AR}(?:[ \\u00A0]+${AR})*`, 'g'), (run) => `<span lang="ar" dir="rtl">${run}</span>`);
const t = (s: string | undefined): string => wrapArabic(escapeHtml(s ?? ''));

type Input = { model: Model; figures: FigureSpec[]; coverage: Coverage; theme: Theme; roots: Map<string, EvRoot>; template: string };

const nn = (i: number): string => String(i).padStart(2, '0');
const chapterId = (i: number, s: Section): string => `ch-${nn(i + 1)}-${s.id}`;

// Each table scrolls inside its own region, named for screen readers and reachable by keyboard; the table stays a table.
const table = (label: string, head: string[], rows: string[][]): string =>
  `<div class="table-scroll" role="region" aria-label="${escapeHtml(label)}" tabindex="0"><table><thead><tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

export function renderPage(input: Input): string {
  const { model, roots } = input;
  const hostId = [...roots.values()].find((r) => r.host)?.id ?? model.meta.roots[0]?.id ?? '';
  const where = (e: FileEvidence | { root?: string; path: string }): string => `${e.root !== undefined && e.root !== hostId ? `@${e.root}/` : ''}${e.path}`;
  const evCodes = (list: Evidence[] | undefined): string => (list ?? []).map((e) => (
    'path' in e ? `<code>${escapeHtml(where(e) + (e.lines === undefined ? '' : `:${e.lines}`))}</code>${e.symbol === undefined ? '' : ` ${escapeHtml(e.symbol)}`}`
      : `owner ${escapeHtml(e.owner)}`)).join(' ');
  const evCell = (o: Evidenced): string => evCodes(o.evidence) + (o.unconfirmed ? ' <strong>unconfirmed</strong>' : '');

  // The first section to list a figure draws it; later ones link to it.
  const drawnBy = new Map<string, number>();
  const claim = (key: string, i: number): boolean => { if (!drawnBy.has(key)) drawnBy.set(key, i); return drawnBy.get(key) === i; };
  const sectionSeqs = (s: Section) => model.sequences.filter((q) => (s.sequences ?? []).includes(q.id) || q.chapter === s.id);
  const sectionFlows = (s: Section) => model.storeFlows.filter((f) => (s.storeFlows ?? []).includes(f.id) || f.chapter === s.id);

  const storeCols: Record<string, [string, string][]> = {
    sql: [['Table', 'table'], ['Database', 'database'], ['Purpose', 'purpose'], ['Written by', 'writtenBy'], ['Read by', 'readBy'], ['When', 'when']],
    cache: [['Pattern', 'pattern'], ['Owner', 'owner'], ['Value', 'value'], ['TTL', 'ttl'], ['Written by', 'writtenBy'], ['Read by', 'readBy'], ['When', 'when']],
    memory: [['Owner', 'owner'], ['Name', 'name'], ['Holds', 'holds'], ['Key', 'key'], ['Lifetime', 'lifetime']],
    files: [['Owner', 'owner'], ['Path', 'path'], ['Purpose', 'purpose'], ['Written by', 'writtenBy'], ['Read by', 'readBy']],
    client: [['Owner', 'owner'], ['Path', 'path'], ['Purpose', 'purpose'], ['Written by', 'writtenBy'], ['Read by', 'readBy']],
  };
  const storeTable = (kind: string, ids: Set<string> | null): string => {
    const rows = model.stores[kind as keyof Model['stores']].filter((r) => ids === null || ids.has(r.id));
    const cols = storeCols[kind] ?? [];
    return rows.length === 0 ? '' : `<h4>Store: ${escapeHtml(kind)}</h4>${table(`Store: ${kind}`, ['Id', ...cols.map(([h]) => h), 'Evidence'], rows.map((r) => [t(r.id), ...cols.map(([, k]) => t((r as unknown as Record<string, string | undefined>)[k])), evCell(r)]))}`;
  };
  const CAT_KINDS = ['stream', 'gateway', 'queue', 'scheduler', 'cache', 'integration', 'component'];
  const catTable = (kind: string, ids: Set<string> | null): string => {
    const rows = model.catalogue.filter((c) => c.kind === kind && (ids === null || ids.has(c.id)));
    return rows.length === 0 ? '' : `<h4>${escapeHtml(kind)}</h4>${table(kind, ['Name', 'Role', 'Owner', 'Connects', 'Evidence'], rows.map((c) => [t(c.name), t(c.role), t(c.owner), t((c.connects ?? []).join(', ')), evCell(c)]))}`;
  };

  const chapterHtml = (s: Section, i: number): string => {
    const id = chapterId(i, s);
    const parts: string[] = [`<section id="${id}">`, `<h2>${nn(i + 1)}. ${t(s.title)}</h2>`, `<p class="lead-q">${t(s.question)}</p>`];
    if ((s.bullets ?? []).length > 0) parts.push(`<ul class="facts">${(s.bullets ?? []).map((b) => `<li>${t(b.text)}</li>`).join('')}</ul>`);
    const figure = (key: string, title: string): void => {
      if (claim(key, i)) {
        parts.push(`<h3>${t(title)}</h3><figure data-fx-flow="${escapeHtml(key)}"></figure>`);
        // Arrows the layout left out of the figure; the map still draws them.
        const left = input.figures.find((f) => f.key === key)?.notDrawn ?? [];
        if (left.length > 0) parts.push(`<p class="not-drawn">Arrows not drawn here (the map shows them): ${left.map((id) => escapeHtml(id.slice(id.indexOf(':') + 1).replace(/#\d+$/, '').replace('>', ' to '))).join(', ')}.</p>`);
      }
      else {
        const at = drawnBy.get(key) ?? 0;
        const home = model.sections[at];
        parts.push(`<p>${t(title)}: <a href="#${home === undefined ? '' : chapterId(at, home)}">Drawn in chapter ${nn(at + 1)}</a></p>`);
      }
    };
    const diagrams = model.levels.diagrams.filter((d) => (s.diagrams ?? []).includes(d.id));
    const seqs = sectionSeqs(s);
    const flows = sectionFlows(s);
    for (const d of diagrams) figure(`level-${d.id}`, d.title);
    for (const q of seqs) figure(`seq-${q.id}`, q.title);
    for (const f of flows) figure(`flow-${f.id}`, f.trigger);
    const deep = [...diagrams.map((d) => [`diagrams/arch-${d.id}.html`, d.title]), ...seqs.map((q) => [`diagrams/seq-${q.id}.html`, q.title]), ...flows.map((f) => [`diagrams/flow-${f.id}.html`, f.trigger])];
    if (deep.length > 0) parts.push(`<p>Deep diagrams: ${deep.map(([href, title]) => `<a href="${href}">${t(title)}</a>`).join(', ')}</p>`);
    for (const f of flows) {
      parts.push(`<h4>Store flow: ${t(f.trigger)}</h4>`, table(`Store flow: ${f.trigger}`, ['#', 'Actor', 'Op', 'Store', 'Key', 'When', 'Evidence'], f.steps.map((st) => [String(st.n), t(st.actor), t(st.op), t(st.store), t(st.key), t(st.when), evCell(st)])));
    }
    const refs = new Set(s.storeRefs ?? []);
    if (refs.size > 0) for (const kind of Object.keys(storeCols)) parts.push(storeTable(kind, refs));
    const cats = new Set(s.catalogueRefs ?? []);
    if (cats.size > 0) for (const kind of CAT_KINDS) parts.push(catTable(kind, cats));

    // Evidence box: one row per evidenced item, grouped by what it belongs to.
    const groups: { title: string; rows: string[] }[] = [];
    const group = (title: string, rows: { label: string; o: Evidenced }[]): void => {
      if (rows.length > 0) groups.push({ title, rows: rows.map((r) => `<li>${t(r.label)} ${evCell(r.o)}</li>`) });
    };
    group('Facts', (s.bullets ?? []).map((b) => ({ label: b.text, o: b })));
    for (const d of diagrams) {
      group(`Diagram: ${d.title}`, [
        ...d.groups.map((g) => ({ label: `Group ${g.label}`, o: g as Evidenced })),
        ...d.nodes.map((n) => ({ label: n.label, o: n as Evidenced })),
        ...d.edges.map((e) => ({ label: `${e.from} to ${e.to}: ${e.label}`, o: e as Evidenced })),
      ]);
    }
    for (const q of seqs) group(`Sequence: ${q.title}`, [...q.participants.map((p) => ({ label: p.label, o: p as Evidenced })), ...q.messages.map((m) => ({ label: `${m.n}. ${m.label}`, o: m as Evidenced }))]);
    for (const f of flows) group(`Store flow: ${f.trigger}`, f.steps.map((st) => ({ label: `${st.n}. ${st.actor} ${st.op} ${st.store}`, o: st as Evidenced })));
    const have = new Set(sectionItems(model, s.id).map((x) => x.handle));
    group('Stores', Object.values(model.stores).flat().filter((r) => have.has(`store:${r.id}`)).map((r) => ({ label: r.id, o: r as Evidenced })));
    group('Components', model.catalogue.filter((c) => have.has(`catalogue:${c.id}`)).map((c) => ({ label: c.name, o: c as Evidenced })));
    const n = groups.reduce((a, g) => a + g.rows.length, 0);
    if (n > 0) parts.push(`<details class="evidence"><summary>Files and locations (${n})</summary>${groups.map((g) => `<h4>${escapeHtml(g.title)}</h4><ul>${g.rows.join('')}</ul>`).join('')}</details>`);
    parts.push('</section>');
    return parts.join('\n');
  };

  const sections = model.sections.map(chapterHtml);
  const explore = '<section id="ch-00-explore">\n<h2>00. Explore the system</h2>\n<p class="lead-q">What sits inside each part?</p>\n<div id="map-root"><noscript>The map needs JavaScript. The chapters below hold the same facts.</noscript></div>\n</section>';

  const fixed: string[] = [];
  const fixedChapter = (id: string, title: string, question: string, body: string): void => {
    fixed.push(`<section id="${id}">\n<h2>${title}</h2>\n<p class="lead-q">${question}</p>\n${body}\n</section>`);
  };
  const catalogue = CAT_KINDS.map((k) => catTable(k, null)).join('');
  if (catalogue !== '') fixedChapter('components', 'Components', 'Which queues, gateways, schedulers and other parts sit around the engines?', catalogue);
  fixedChapter('rules-in-force', 'Rules in force', 'Which decisions must every change respect?', model.rules.length === 0 ? '<p>No rules are listed.</p>'
    : `<ul class="facts">${model.rules.map((r) => `<li>${t(r.text)}${r.adr === undefined ? '' : ` (<code>${escapeHtml(where(r.adr))}</code>)`}${r.decision === undefined ? '' : ` ${t(r.decision)}`} ${evCell(r)}</li>`).join('')}</ul>`);
  const title = new Map(model.sections.map((s, i) => [s.id, { s, i }]));
  fixedChapter('coverage', 'Coverage', 'Which parts of the repository do the chapters cover?',
    table('Coverage by kind', ['Kind', 'Covered', 'Total'], Object.entries(input.coverage.counts).map(([k, c]) => [escapeHtml(k), String(c.covered), String(c.total)])) +
    table('Coverage entries', ['Kind', 'Name', 'Chapter'], input.coverage.entries.map((e) => {
      const hit = e.chapter === null ? undefined : title.get(e.chapter);
      return [escapeHtml(e.kind), t(e.name), hit === undefined ? 'not covered' : `<a href="#${chapterId(hit.i, hit.s)}">${t(hit.s.title)}</a>`];
    })));
  if (model.questions.length > 0) {
    fixedChapter('open-questions', 'Open questions', 'What does the model not yet know?',
      `<ul class="facts">${model.questions.map((q) => `<li>${t(q.text)}${q.answer === undefined ? '' : ` Answer: ${t(q.answer)}`}${q.recommended === undefined ? '' : ` Recommended: ${t(q.recommended)}`}${(q.items ?? []).length === 0 ? '' : ` Items: ${(q.items ?? []).map((h) => `<code>${escapeHtml(h)}</code>`).join(' ')}`}</li>`).join('')}</ul>`);
  }
  fixedChapter('corrections', 'Corrections', 'What was changed after the first draft?', model.corrections.length === 0 ? '<p>No corrections are recorded.</p>'
    : table('Corrections', ['Date', 'Item', 'Before', 'After', 'Reason'], model.corrections.map((c) => [escapeHtml(c.date), t(c.item), t(c.before), t(c.after), escapeHtml(c.reason)])));

  const mapEv = (list: Evidence[]): { path: string; lines?: string; symbol?: string }[] =>
    list.flatMap((e) => ('path' in e ? [{ path: where(e), lines: e.lines, symbol: e.symbol }] : []));
  const mapData = {
    root: model.levels.root,
    levels: model.levels.diagrams.map((d) => ({
      id: d.id, title: d.title,
      groups: d.groups.map((g) => ({ id: g.id, label: g.label, members: g.members, groups: g.groups })),
      nodes: d.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind, role: n.role, children: n.children, primary: n.primary !== false, evidence: mapEv(n.evidence ?? []) })),
      edges: d.edges.map((e) => ({ from: e.from, to: e.to, label: e.label, mode: e.mode ?? 'sync', evidence: mapEv(e.evidence ?? []) })),
    })),
  };
  const figures = Object.fromEntries(input.figures.filter((f) => drawnBy.has(f.key)).map((f) => [f.key, f]));

  const nav = `<nav aria-label="Chapters"><ol><li><a href="#ch-00-explore">Explore the system</a></li>${model.sections.map((s, i) => `<li><a href="#${chapterId(i, s)}">${t(s.title)}</a></li>`).join('')}${fixed.map((f) => { const id = /id="([^"]+)"/.exec(f)?.[1] ?? ''; const h = /<h2>([^<]+)<\/h2>/.exec(f)?.[1] ?? ''; return `<li><a href="#${id}">${h}</a></li>`; }).join('')}</ol>\n<p>Deep diagrams: ${[
    ...model.levels.diagrams.map((d) => [`diagrams/arch-${d.id}.html`, d.title]),
    ...model.sequences.map((q) => [`diagrams/seq-${q.id}.html`, q.title]),
    ...model.storeFlows.map((f) => [`diagrams/flow-${f.id}.html`, f.trigger]),
  ].map(([href, label]) => `<a href="${href}">${t(label)}</a>`).join(', ')}</p></nav>`;

  const rootList = model.meta.roots.map((r) => `${escapeHtml(r.label ?? r.id)}${roots.get(r.id)?.host ? ' (this repository)' : ''}`).join(', ');
  const lead = [
    `<p>${t(model.meta.purpose ?? 'How this system works, chapter by chapter.')}</p>`,
    '<p>How to read this page: each chapter opens with the question it answers. Play the figures step by step, and open "Files and locations" to see the code behind every claim.</p>',
    `<p>Roots: ${rootList}. Model date: ${escapeHtml(model.meta.date ?? 'not recorded')}.</p>`,
  ].join('\n');

  // One item per node kind the page draws; the swatch class follows the kit's four looks.
  const SWATCH: Record<string, string> = { client: ' info', outside: ' outside', external: ' outside', check: ' check', security: ' check' };
  const kinds = [...new Set(model.levels.diagrams.flatMap((d) => d.nodes.map((n) => n.kind)))];
  const legend = kinds.map((k) => `<li><span class="sw${SWATCH[k] ?? ''}"></span>${escapeHtml(k)}</li>`).join('\n');

  const slot = (name: string): RegExp => new RegExp(`<!-- slot: ${name}[\\s\\S]*?-->`);
  const pageTitle = escapeHtml(model.meta.title ?? 'System');
  // Replacement functions, not strings: repository text may hold `$&`.
  return input.template
    .replace(/<!--\n {2}fx page template[\s\S]*?-->\n/, '')
    .replace(/<!doctype html>/i, (m) => `${m}\n<!-- fx-system-flow generated: edit the model, then rebuild -->`)
    .replace(/<!-- slot: TITLE -->/g, () => pageTitle)
    .replace(/<p><!-- slot: LEAD[\s\S]*?--><\/p>/, () => lead)
    .replace(/(<ul class="legend"[^>]*>)[\s\S]*?<\/ul>/, (_m, open: string) => `${open}\n${legend}\n</ul>`)
    .replace(slot('NAV'), () => nav)
    .replace(/<section id="map">[\s\S]*?<\/section>\n*/, '')
    .replace(slot('CHAPTERS'), () => [explore, ...sections, ...fixed].join('\n'))
    .replace(/<!-- slot: MAP_DATA[\s\S]*?-->\s*<script type="application\/json" id="map-data">[\s\S]*?<\/script>/, () => `<script type="application/json" id="map-data">${inlineJson(mapData)}</script>`)
    .replace(slot('DIAGRAMS'), () => `<script type="application/json" id="diagrams">${inlineJson(figures)}</script>\n<script src="../_assets/fx-flow-2.js"></script>`)
    .replace(/fx-map-1\.js/g, 'fx-map-2.js')
    .replace(/<link rel="stylesheet" href="..\/_assets\/fx-tokens-1\.css">/, (m) => `${m}\n<link rel="stylesheet" href="../_assets/theme.css">`)
    .replace('details.ev"', 'details.ev, details.evidence"')
    .replace(/\.\.\/_assets\//g, 'assets/');
}
