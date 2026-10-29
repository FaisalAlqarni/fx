// Markdown renderers: one doc per section, components.md, stores.md, an index per folder and the site README.
// Text from the model is escaped for the place it lands; evidence lines use docs-index's format.
import * as path from 'path';
import { execFileSync } from 'child_process';
import { COMMIT } from './sf-evidence.js';
import type { Root } from './sf-evidence.js';
import type { Coverage } from './sf-coverage.js';
import { decisionText } from './sf-model.js';
import type { Evidence, Evidenced, Model, Section, Sequence, StoreFlow } from './sf-model.js';

export const GENERATED = '<!-- fx-system-flow generated: edit the model, then rebuild -->';

// Prose and table text: a repository string must never become HTML in Markdown.
// Nor a link: [ and ] are escaped, after the backslashes that could undo that (security review S5).
const html = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const oneLine = (s: string): string => s.replace(/\r\n|[\r\n\u2028\u2029]/g, ' ');
const noLinks = (s: string): string => s.replace(/[[\]]/g, '\\$&');
const prose = (s: string): string => noLinks(oneLine(html(s)).replace(/\\/g, '\\\\'));

export const escapeCell = (s: string): string => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r\n|[\r\n]/g, ' ');
const cell = (s: string | undefined): string => noLinks(escapeCell(html(s ?? '')));
// A code span whose fence is longer than any backtick run inside it, so the text cannot close it early.
const code = (s: string): string => {
  const fence = '`'.repeat(Math.max(0, ...[...s.matchAll(/`+/g)].map((m) => m[0].length)) + 1);
  const pad = fence.length > 1 && (s.startsWith('`') || s.endsWith('`')) ? ' ' : '';
  return `${fence}${pad}${s}${pad}${fence}`;
};

// One pass, so an inserted entity is never escaped again; < > & are entities too, since Mermaid labels may render as HTML.
const MERMAID: Record<string, string> = { '#': '#35;', ';': '#59;', ':': '#58;', '"': '#quot;', '<': '#lt;', '>': '#gt;', '&': '#amp;' };
export const escapeMermaid = (s: string): string => s.replace(/[#;:"<>&]/g, (c) => MERMAID[c] ?? c).replace(/\r\n|[\r\n]/g, ' ');

// "63,67-245" becomes two items. The item list is split on "; ", so a symbol never holds one.
function evidenceItems(evidence: Evidence[], hostId: string): string[] {
  const out: string[] = [];
  for (const e of evidence) {
    if (!('path' in e)) {
      // shortcut: docs-index reads only `owner, <date>`; an owner entry that is not a date is left out, not written malformed.
      if (/^\d{4}-\d{2}-\d{2}$/.test(e.owner)) out.push(`owner, ${e.owner}`);
      continue;
    }
    const p = `${e.root !== undefined && e.root !== hostId ? `@${e.root}/` : ''}${e.path}`;
    const sym = e.symbol === undefined ? '' : ` ${code(e.symbol.replace(/\s+/g, ' ').replace(/; /g, ';'))}`;
    if (e.lines === undefined) out.push(`${code(p)}${sym}`);
    else for (const part of e.lines.split(',')) out.push(`${code(`${p}:${part.trim()}`)}${sym}`);
  }
  return out;
}
export function evidenceLine(evidence: Evidence[], hostId: string): string {
  const items = evidenceItems(evidence, hostId);
  return items.length === 0 ? '' : `Evidence: ${items.join('; ')}`;
}
const evCell = (e: Evidenced, hostId: string): string => escapeCell(evidenceItems(e.evidence ?? [], hostId).join('; '));

const table = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => ' --- |').join('')}`, ...rows.map((r) => `| ${r.join(' | ')} |`)];

// A figure's one-line caption in italics; the underscores are escaped by prose() only as far as the text needs.
const caption = (summary: string | undefined): string[] => (summary === undefined ? [] : [`_${prose(summary)}_`]);

// A prefix, so an id that is a Mermaid keyword (end, loop, alt, note) is still a participant.
const pid = (id: string): string => `p_${id}`;
function sequenceBlock(q: Sequence, hostId: string): string[] {
  const label = new Map(q.participants.map((p) => [p.id, p.label]));
  const arrow = (m: { mode?: string }): string => (m.mode === 'async' ? '-)' : '->>');
  return [
    `### ${prose(q.title)}`, '',
    ...caption(q.summary), // directly above the fence
    '```mermaid', 'sequenceDiagram',
    ...q.participants.map((p) => `    participant ${pid(p.id)} as ${escapeMermaid(p.label)}`),
    ...q.messages.map((m) => `    ${pid(m.from)}${arrow(m)}${pid(m.to)}: ${escapeMermaid(m.label)}`),
    '```', '',
    ...table(['#', 'From', 'To', 'Message', 'Evidence'], q.messages.map((m) => [String(m.n), cell(label.get(m.from) ?? m.from), cell(label.get(m.to) ?? m.to), cell(m.label), evCell(m, hostId)])), '',
  ];
}
function flowBlock(fl: StoreFlow, hostId: string): string[] {
  return [
    `### ${prose(fl.id)}`, '', ...caption(fl.summary).flatMap((c) => [c, '']), `Trigger: ${prose(fl.trigger)}`, '',
    ...table(['#', 'Actor', 'Op', 'Store', 'Key', 'When', 'Evidence'], fl.steps.map((s) => [String(s.n), cell(s.actor), s.op, s.store, cell(s.key), cell(s.when), evCell(s, hostId)])), '',
  ];
}

// The oldest host-root verified commit among the doc's items, so docs-index over-reports at worst.
// null when one of them is not reachable in the host root: the doc then carries no marker and reads as unverified.
function oldestVerified(items: Evidenced[], roots: Map<string, Root>, hostId: string, ages: Map<string, number | null>): string | null {
  const host = roots.get(hostId);
  const shas = [...new Set(items.map((i) => i.verified?.[hostId]).filter((s): s is string => s !== undefined))];
  if (shas.length === 0) return host?.head ?? null;
  for (const sha of shas) {
    if (!ages.has(sha)) {
      try { if (!COMMIT.test(sha)) throw new Error('not a commit id'); ages.set(sha, Number(execFileSync('git', ['rev-list', '--count', sha], { cwd: host?.dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))); } catch { ages.set(sha, null); }
    }
  }
  if (shas.some((s) => ages.get(s) === null)) return null;
  return shas.sort((a, b) => (ages.get(a) ?? 0) - (ages.get(b) ?? 0))[0] ?? null;
}

const posix = (p: string): string => p.split(path.sep).join('/');
// encodeURIComponent leaves ( and ) alone, and either can end a Markdown link target.
const linkTarget = (p: string): string => p.split('/').map((s) => encodeURIComponent(s).replace(/[()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');

// The code chapter: one row per store kind with the chapters that show it, the notation note, then the code map by root.
function codeBlocks(model: Model, hostId: string): string[] {
  const title = new Map(model.sections.map((s) => [s.id, s.title]));
  const stores = Object.entries(model.stores).map(([kind, rows]) => {
    const ids = new Set((rows as { id: string }[]).map((r) => r.id));
    const shown = model.sections.filter((s) => (s.storeRefs ?? []).some((r) => ids.has(r)) || model.storeFlows.some((f) => f.chapter === s.id && f.steps.some((st) => st.store === kind)));
    return [kind, String(ids.size), cell(shown.map((s) => title.get(s.id)).join(', '))];
  });
  const out = ['## Where data lives', '', ...table(['Store kind', 'Rows', 'Shown in'], stores), ''];
  const notes = model.meta.conventions ?? [];
  if (notes.length > 0) out.push(...notes.map((n) => `- ${prose(n)}`), '');
  const roots = [...new Set(model.codeMap.map((c) => c.root))];
  if (model.codeMap.length === 0) return out;
  out.push('## Code map', '');
  for (const root of roots) {
    const rows = model.codeMap.filter((c) => c.root === root).map((c) => {
      const first = c.evidence.find((e) => 'path' in e && !e.path.endsWith('/'));
      return [cell(c.path), cell(c.owns), first === undefined ? '' : escapeCell(evidenceItems([first], hostId)[0] ?? '')];
    });
    out.push(`### ${prose(root)}`, '', ...table(['Folder', 'What it owns', 'Start reading at'], rows), '');
  }
  return out;
}

export function renderMarkdown(model: Model, roots: Map<string, Root>, hostId: string, markdownRoot: string, site = 'docs/system-flow'): { path: string; text: string }[] {
  const ages = new Map<string, number | null>();
  const docs: { path: string; text: string }[] = [];
  const emit = (file: string, body: string[], items: Evidenced[]): void => {
    const sha = oldestVerified(items, roots, hostId, ages);
    docs.push({ path: file, text: `${[...body, '', GENERATED, ...(sha === null ? [] : [`<!-- fx-docs verified: ${sha} -->`])].join('\n')}\n` });
  };
  const siteLink = (dir: string): string => `${posix(path.relative(dir, site))}/index.html`;
  const secPath = (s: Section): string => posix(path.join(markdownRoot, s.folder ?? '', `${s.id}.md`));

  for (const s of model.sections) {
    const dir = path.posix.dirname(secPath(s));
    const sequences = model.sequences.filter((q) => q.chapter === s.id);
    const flows = model.storeFlows.filter((f) => f.chapter === s.id);
    const bullets = s.bullets ?? [];
    const body = [`# ${prose(s.title)}`, '', prose(s.question), '', ...(s.lead === undefined ? [] : [prose(s.lead), ''])];
    for (const b of bullets) {
      const line = evidenceLine(b.evidence ?? [], hostId);
      body.push(`- ${prose(b.text)}${line === '' && b.unconfirmed ? ' (unconfirmed)' : ''}`);
      if (line !== '') body.push(`  ${line}`);
    }
    if (bullets.length > 0) body.push('');
    const notOwned = s.notOwned ?? [];
    if (notOwned.length > 0) {
      body.push('## Not owned here', '');
      for (const b of notOwned) {
        body.push(`- ${prose(b.text)}`);
        const line = evidenceLine(b.evidence ?? [], hostId);
        if (line !== '') body.push(`  ${line}`);
      }
      body.push('');
    }
    if (s.role === 'code') body.push(...codeBlocks(model, hostId));
    const diagrams = model.levels.diagrams.filter((d) => (s.diagrams ?? []).includes(d.id));
    if (diagrams.length > 0) body.push('## Diagrams', '', ...diagrams.flatMap((d) => [`### ${prose(d.title)}`, '', ...caption(d.summary).flatMap((c) => [c, ''])]));
    if (sequences.length > 0) body.push('## Sequences', '', ...sequences.flatMap((q) => sequenceBlock(q, hostId)));
    if (flows.length > 0) body.push('## Store flows', '', ...flows.flatMap((f) => flowBlock(f, hostId)));
    body.push(`[Figures for this chapter in the site](${siteLink(dir)}#${s.id})`);
    emit(secPath(s), body, [...bullets, ...notOwned, ...(s.role === 'code' ? model.codeMap : []), ...sequences.flatMap((q) => [...q.participants, ...q.messages]), ...flows.flatMap((f) => f.steps)]);
  }

  const catalogue = ['stream', 'gateway', 'queue', 'scheduler', 'cache', 'integration', 'component'].flatMap((kind) => {
    const rows = model.catalogue.filter((c) => c.kind === kind);
    return rows.length === 0 ? [] : [`## ${kind}`, '', ...table(['Name', 'Role', 'Owner', 'Connects', 'Evidence'], rows.map((c) => [cell(c.name), cell(c.role), cell(c.owner), cell((c.connects ?? []).join(', ')), evCell(c, hostId)])), ''];
  });
  emit(posix(path.join(markdownRoot, 'components.md')), ['# Components', '', ...(catalogue.length > 0 ? catalogue : ['No components are listed.'])], model.catalogue);

  const columns: Record<string, [string, string][]> = {
    sql: [['Table', 'table'], ['Database', 'database'], ['Purpose', 'purpose'], ['Written by', 'writtenBy'], ['Read by', 'readBy'], ['When', 'when']],
    cache: [['Pattern', 'pattern'], ['Owner', 'owner'], ['Value', 'value'], ['TTL', 'ttl'], ['Written by', 'writtenBy'], ['Read by', 'readBy'], ['When', 'when']],
    memory: [['Owner', 'owner'], ['Name', 'name'], ['Holds', 'holds'], ['Key', 'key'], ['Lifetime', 'lifetime']],
    files: [['Owner', 'owner'], ['Path', 'path'], ['Purpose', 'purpose'], ['Written by', 'writtenBy'], ['Read by', 'readBy']],
    client: [['Owner', 'owner'], ['Path', 'path'], ['Purpose', 'purpose'], ['Written by', 'writtenBy'], ['Read by', 'readBy']],
  };
  const storeRows = Object.entries(columns).flatMap(([kind, cols]) => {
    const rows = model.stores[kind as keyof Model['stores']];
    if (rows.length === 0) return [];
    return [`## ${kind}`, '', ...table(['Id', ...cols.map(([h]) => h), 'Evidence'], rows.map((r) => [cell(r.id), ...cols.map(([, k]) => cell((r as unknown as Record<string, string | undefined>)[k])), evCell(r, hostId)])), ''];
  });
  emit(posix(path.join(markdownRoot, 'stores.md')), ['# Stores', '', ...(storeRows.length > 0 ? storeRows : ['No stores are listed.'])], Object.values(model.stores).flat());

  const indexOf = (dir: string, sections: Section[], extra: string[]): void => {
    const rel = (s: Section): string => posix(path.relative(dir, secPath(s)));
    emit(posix(path.join(dir, 'index.md')), [
      `# ${prose(model.meta.title ?? 'System')}`, '', `[Open the site](${siteLink(dir)})`, '',
      ...sections.map((s) => `- [${prose(s.title)}](${rel(s)}): ${prose(s.question)}`),
      ...extra,
    ], []);
  };
  const folders = [...new Set(model.sections.flatMap((s) => (s.folder === undefined ? [] : [s.folder])))];
  indexOf(markdownRoot, model.sections, [...folders.map((f) => `- [${prose(f)}](${linkTarget(f)}/index.md)`), '- [Glossary](glossary.md)', '- [Components](components.md)', '- [Stores](stores.md)']);
  for (const folder of folders) {
    indexOf(posix(path.join(markdownRoot, folder)), model.sections.filter((s) => s.folder === folder), []);
  }
  return docs;
}

// coverage.md: per-kind counts, then every inventory entry with its chapter or "not covered".
export function renderCoverage(model: Model, cov: Coverage, markdownRoot: string): { path: string; text: string } {
  const title = new Map(model.sections.map((s) => [s.id, s.title]));
  const body = [
    '# Coverage', '',
    ...table(['Kind', 'Covered', 'Total'], Object.entries(cov.counts).map(([k, c]) => [k, String(c.covered), String(c.total)])), '',
    ...table(['Kind', 'Name', 'Chapter'], cov.entries.map((e) => [e.kind, cell(e.name), e.chapter === null ? 'not covered' : cell(`${title.get(e.chapter) ?? e.chapter} (${e.chapter})`)])),
    '', GENERATED,
  ];
  return { path: posix(path.join(markdownRoot, 'coverage.md')), text: `${body.join('\n')}\n` };
}

// rules-in-force.md: one entry per rule with a link to its ADR, the decision and the rule's evidence line.
export function renderRules(model: Model, roots: Map<string, Root>, hostId: string, markdownRoot: string): { path: string; text: string } {
  const body = ['# Rules in force', ''];
  for (const r of model.rules) {
    const adr = r.adr === undefined ? '' : (r.adr.root ?? hostId) === hostId
      ? ` ([${prose(r.adr.path)}](${linkTarget(posix(path.relative(markdownRoot, r.adr.path)))}))`
      : ` (@${prose(r.adr.root ?? '')}/${prose(r.adr.path)})`;
    body.push(`- ${r.id}: ${prose(r.text)}${adr}${r.decision === undefined ? '' : ` ${prose(decisionText(r.decision))}`}`);
    const line = evidenceLine(r.evidence ?? [], hostId);
    if (line !== '') body.push(`  ${line}`);
  }
  if (model.rules.length === 0) body.push('No rules are listed.');
  const sha = oldestVerified(model.rules, roots, hostId, new Map());
  return { path: posix(path.join(markdownRoot, 'rules-in-force.md')), text: `${[...body, '', GENERATED, ...(sha === null ? [] : [`<!-- fx-docs verified: ${sha} -->`])].join('\n')}\n` };
}

export function renderReadme(): string {
  return `${[
    '# System flow',
    '',
    'This folder holds the generated description of the system.',
    '',
    '- `model/fragments/` holds the model. The fragments are the record: edit them, never the generated files.',
    '- `model/system-model.json` is the merged model, written for readers and other tools. Nothing reads it back.',
    '- `index.html`, `diagrams/` and the Markdown docs are generated from the fragments.',
    '',
    'To rebuild, run `system-flow check` to verify the model against the code, then `system-flow build` to write the generated files (`scripts/system-flow` in the fx plugin folder).',
    '',
    GENERATED,
  ].join('\n')}\n`;
}

// glossary.md: a table row per term, sorted by term, then the terms' evidence lines (a table cannot hold one that docs-index reads).
export function renderGlossary(model: Model, roots: Map<string, Root>, hostId: string, markdownRoot: string): { path: string; text: string } {
  const terms = [...model.glossary].sort((a, b) => a.term.toLowerCase().localeCompare(b.term.toLowerCase()));
  const body = [
    '# Glossary', '', `The words this site uses, in the meaning the code gives them. ${terms.length} terms.`, '',
    ...table(['Term', 'Tag', 'Meaning', 'Evidence'], terms.map((t) => [cell(t.term), t.tag, cell(t.meaning), evCell(t, hostId)])), '',
    '## Evidence', '',
  ];
  for (const t of terms) {
    body.push(`- ${prose(t.term)}`);
    const line = evidenceLine(t.evidence ?? [], hostId);
    if (line !== '') body.push(`  ${line}`);
  }
  const sha = oldestVerified(terms, roots, hostId, new Map());
  return { path: posix(path.join(markdownRoot, 'glossary.md')), text: `${[...body, '', GENERATED, ...(sha === null ? [] : [`<!-- fx-docs verified: ${sha} -->`])].join('\n')}\n` };
}
