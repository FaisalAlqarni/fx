// The site page: the system flow site template filled with the model. Every repository string is HTML-escaped
// before it enters the page, and inline JSON writes every `<` as < so it cannot close its script.
import { sectionItems } from './sf-coverage.js';
import type { Coverage } from './sf-coverage.js';
import type { Root as EvRoot } from './sf-evidence.js';
import type { Evidence, Evidenced, FileEvidence, FigureSpec, Look, Model, Section } from './sf-model.js';
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
// A section with a Start here role is in Start here; every other section is How it works.
const group = (s: Section): 'start' | 'how' => (s.role === undefined ? 'how' : 'start');

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
    const parts: string[] = [
      `<section class="chapter" id="${id}" data-group="${group(s)}">`,
      `<p class="eyebrow"><span class="n">${nn(i + 1)}</span> <span class="q">${t(s.question)}</span></p>`,
      `<h2>${t(s.title)}</h2>`,
    ];
    if (s.lead !== undefined) parts.push(`<p class="lead">${t(s.lead)}</p>`);
    // Each bullet shows its first file evidence; the full list stays in the chapter's evidence box.
    const at = (b: Evidenced): string => {
      const e = (b.evidence ?? []).find((x): x is FileEvidence => 'path' in x);
      return e === undefined ? '' : ` <code class="at">${escapeHtml(where(e) + (e.lines === undefined ? '' : `:${e.lines}`))}</code>`;
    };
    if ((s.bullets ?? []).length > 0) parts.push(`<ul class="facts">${(s.bullets ?? []).map((b) => `<li>${t(b.text)}${at(b)}</li>`).join('')}</ul>`);
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
    const evGroup = (title: string, rows: { label: string; o: Evidenced }[]): void => {
      if (rows.length > 0) groups.push({ title, rows: rows.map((r) => `<li>${t(r.label)} ${evCell(r.o)}</li>`) });
    };
    evGroup('Facts', (s.bullets ?? []).map((b) => ({ label: b.text, o: b })));
    for (const d of diagrams) {
      evGroup(`Diagram: ${d.title}`, [
        ...d.groups.map((g) => ({ label: `Group ${g.label}`, o: g as Evidenced })),
        ...d.nodes.map((n) => ({ label: n.label, o: n as Evidenced })),
        ...d.edges.map((e) => ({ label: `${e.from} to ${e.to}: ${e.label}`, o: e as Evidenced })),
      ]);
    }
    for (const q of seqs) evGroup(`Sequence: ${q.title}`, [...q.participants.map((p) => ({ label: p.label, o: p as Evidenced })), ...q.messages.map((m) => ({ label: `${m.n}. ${m.label}`, o: m as Evidenced }))]);
    for (const f of flows) evGroup(`Store flow: ${f.trigger}`, f.steps.map((st) => ({ label: `${st.n}. ${st.actor} ${st.op} ${st.store}`, o: st as Evidenced })));
    const have = new Set(sectionItems(model, s.id).map((x) => x.handle));
    evGroup('Stores', Object.values(model.stores).flat().filter((r) => have.has(`store:${r.id}`)).map((r) => ({ label: r.id, o: r as Evidenced })));
    evGroup('Components', model.catalogue.filter((c) => have.has(`catalogue:${c.id}`)).map((c) => ({ label: c.name, o: c as Evidenced })));
    const n = groups.reduce((a, g) => a + g.rows.length, 0);
    if (n > 0) parts.push(`<details class="evidence"><summary>Files and locations (${n})</summary>${groups.map((g) => `<h4>${escapeHtml(g.title)}</h4><ul>${g.rows.join('')}</ul>`).join('')}</details>`);
    parts.push('</section>');
    return parts.join('\n');
  };

  const sections = model.sections.map(chapterHtml);
  // Reference chapters, unnumbered. Until the map moves into chapter 02 (task 08), chapter 00 is the first of them.
  const fixed: { id: string; title: string; html: string }[] = [];
  const fixedChapter = (id: string, title: string, question: string, body: string): void => {
    fixed.push({ id, title, html: `<section class="chapter" id="${id}" data-group="ref">\n<p class="eyebrow"><span class="q">${question}</span></p>\n<h2>${title}</h2>\n${body}\n</section>` });
  };
  fixedChapter('ch-00-explore', 'Explore the system', 'What sits inside each part?', '<div id="map-root"><noscript>The map needs JavaScript. The chapters hold the same facts.</noscript></div>');
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

  const links = (list: { id: string; title: string }[]): string => list.map((c) => `<li><a href="#${c.id}">${c.title}</a></li>`).join('');
  const listed = model.sections.map((s, i) => ({ id: chapterId(i, s), title: t(s.title), group: group(s) }));
  const menu = ([['start', 'Start here', 'ol'], ['how', 'How it works', 'ol'], ['ref', 'Reference', 'ul']] as const)
    .map(([g, h, tag]) => [g, h, tag, g === 'ref' ? links(fixed) : links(listed.filter((c) => c.group === g))] as const)
    .filter(([, , , items]) => items !== '')
    .map(([g, h, tag, items]) => `<section class="group" data-group="${g}">\n<h2>${h}</h2>\n<${tag}>${items}</${tag}>\n</section>`).join('\n');

  const name = escapeHtml(model.meta.name ?? model.meta.title ?? 'the system');
  const rootList = model.meta.roots.map((r) => `${escapeHtml(r.label ?? r.id)}${roots.get(r.id)?.host ? ' (this repository)' : ''}`).join(', ');
  const header = [
    `<p class="intro">${t(model.meta.intro ?? model.meta.purpose ?? 'How this system works, chapter by chapter.')}</p>`,
    `<p>Roots: ${rootList}. Model date: ${escapeHtml(model.meta.date ?? 'not recorded')}. ${model.sections.length} chapters.</p>`,
  ].join('\n');

  // Legend by look: one item per look the figures draw, then the leaving call when a sequence has one, then the moving step.
  const LOOKS: [Look, string][] = [['service', `Part of ${name}`], ['store', 'Data or files'], ['client', 'Phone or browser'], ['external', `Outside ${name}`], ['security', 'Security or identity check']];
  const used = new Set(input.figures.flatMap((f) => [...f.nodes.map((n) => n.look), ...(f.lanes ?? []).map((l) => l.look)]));
  const legend = [
    ...LOOKS.filter(([look]) => used.has(look)).map(([look, label]) => `<li data-look="${look}"><span class="sw ${look}"></span>${label}</li>`),
    ...(input.figures.some((f) => (f.rows ?? []).some((r) => r.leaves)) ? [`<li data-look="leaves"><span class="sw leaves"></span>Call that leaves ${name}</li>`] : []),
    '<li data-look="step"><span class="sw step"></span>Step in flight</li>',
  ].join('\n');

  const footer = 'This page is generated by fx from the model in <code>model/fragments/</code>, the record. To change it, edit a fragment, then run <code>system-flow check</code> and <code>system-flow build</code>. It runs offline: it loads only the files in <code>assets/</code>.';

  const slot = (name: string): RegExp => new RegExp(`<!-- slot: ${name}[\\s\\S]*?-->`);
  const pageTitle = escapeHtml(model.meta.title ?? 'System');
  // Replacement functions, not strings: repository text may hold `$&`.
  return input.template
    .replace(/<!--\n {2}fx system flow site template[\s\S]*?-->\n/, '')
    .replace(/<!doctype html>/i, (m) => `${m}\n<!-- fx-system-flow generated: edit the model, then rebuild -->`)
    .replace(/<!-- slot: TITLE -->/g, () => pageTitle)
    .replace(slot('NAME'), () => name)
    .replace(slot('HEADER'), () => header)
    .replace(slot('LEGEND'), () => legend)
    .replace(slot('MENU'), () => menu)
    .replace(slot('CHAPTERS'), () => [...sections, ...fixed.map((f) => f.html)].join('\n'))
    .replace(slot('FOOTER'), () => footer)
    .replace(/<!-- slot: SITE_INDEX -->\n/, '')
    .replace(slot('MAP_DATA'), () => `<script type="application/json" id="map-data">${inlineJson(mapData)}</script>`)
    .replace(slot('DIAGRAMS'), () => `<script type="application/json" id="diagrams">${inlineJson(figures)}</script>\n<script src="../_assets/fx-flow-2.js"></script>`)
    .replace(/<link rel="stylesheet" href="..\/_assets\/fx-tokens-1\.css">/, (m) => `${m}\n<link rel="stylesheet" href="../_assets/theme.css">`)
    .replace(/\.\.\/_assets\//g, 'assets/');
}
