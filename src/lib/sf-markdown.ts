// Markdown renderers: one doc per section, components.md, stores.md, an index per folder and the site README.
// Text from the model is escaped for the place it lands; evidence lines use docs-index's format.
import * as path from 'path';
import { execFileSync } from 'child_process';
import { COMMIT } from './sf-evidence.js';
import type { Root } from './sf-evidence.js';
import type { Coverage } from './sf-coverage.js';
import type { Evidence, Evidenced, Model, Section, Sequence, StoreFlow } from './sf-model.js';

export const GENERATED = '<!-- fx-system-flow generated: edit the model, then rebuild -->';

// Prose and table text: a repository string must never become HTML in Markdown.
const html = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const oneLine = (s: string): string => s.replace(/\r\n|[\r\n\u2028\u2029]/g, ' ');
const prose = (s: string): string => oneLine(html(s));

export const escapeCell = (s: string): string => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r\n|[\r\n]/g, ' ');
const cell = (s: string | undefined): string => escapeCell(html(s ?? ''));

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
    const sym = e.symbol === undefined ? '' : ` \`${e.symbol.replace(/\s+/g, ' ').replace(/; /g, ';')}\``;
    if (e.lines === undefined) out.push(`\`${p}\`${sym}`);
    else for (const part of e.lines.split(',')) out.push(`\`${p}:${part.trim()}\`${sym}`);
  }
  return out;
}
export function evidenceLine(evidence: Evidence[], hostId: string): string {
  const items = evidenceItems(evidence, hostId);
  return items.length === 0 ? '' : `Evidence: ${items.join('; ')}`;
}
const evCell = (e: Evidenced, hostId: string): string => escapeCell(evidenceItems(e.evidence ?? [], hostId).join('; '));

const table = (head: string[], rows: string[][]): string[] => [`| ${head.join(' | ')} |`, `|${head.map(() => ' --- |').join('')}`, ...rows.map((r) => `| ${r.join(' | ')} |`)];

function sequenceBlock(q: Sequence, hostId: string): string[] {
  const label = new Map(q.participants.map((p) => [p.id, p.label]));
  const arrow = (m: { mode?: string }): string => (m.mode === 'async' ? '-)' : '->>');
  return [
    `### ${prose(q.title)}`, '',
    '```mermaid', 'sequenceDiagram',
    ...q.participants.map((p) => `    participant ${p.id} as ${escapeMermaid(p.label)}`),
    ...q.messages.map((m) => `    ${m.from}${arrow(m)}${m.to}: ${escapeMermaid(m.label)}`),
    '```', '',
    ...table(['#', 'From', 'To', 'Message', 'Evidence'], q.messages.map((m) => [String(m.n), cell(label.get(m.from) ?? m.from), cell(label.get(m.to) ?? m.to), cell(m.label), evCell(m, hostId)])), '',
  ];
}
function flowBlock(fl: StoreFlow, hostId: string): string[] {
  return [
    `### ${prose(fl.id)}`, '', `Trigger: ${prose(fl.trigger)}`, '',
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
const linkText = (s: string): string => prose(s).replace(/[[\]]/g, '\\$&');

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
    const body = [`# ${prose(s.title)}`, '', prose(s.question), ''];
    for (const b of bullets) {
      const line = evidenceLine(b.evidence ?? [], hostId);
      body.push(`- ${prose(b.text)}${line === '' && b.unconfirmed ? ' (unconfirmed)' : ''}`);
      if (line !== '') body.push(`  ${line}`);
    }
    if (bullets.length > 0) body.push('');
    if (sequences.length > 0) body.push('## Sequences', '', ...sequences.flatMap((q) => sequenceBlock(q, hostId)));
    if (flows.length > 0) body.push('## Store flows', '', ...flows.flatMap((f) => flowBlock(f, hostId)));
    body.push(`[Figures for this chapter in the site](${siteLink(dir)}#${s.id})`);
    emit(secPath(s), body, [...bullets, ...sequences.flatMap((q) => [...q.participants, ...q.messages]), ...flows.flatMap((f) => f.steps)]);
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
      ...sections.map((s) => `- [${linkText(s.title)}](${rel(s)}): ${prose(s.question)}`),
      ...extra,
    ], []);
  };
  indexOf(markdownRoot, model.sections, ['- [Components](components.md)', '- [Stores](stores.md)']);
  for (const folder of new Set(model.sections.flatMap((s) => (s.folder === undefined ? [] : [s.folder])))) {
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
      ? ` ([${linkText(r.adr.path)}](${posix(path.relative(markdownRoot, r.adr.path))}))`
      : ` (@${r.adr.root}/${prose(r.adr.path)})`;
    body.push(`- ${r.id}: ${prose(r.text)}${adr}${r.decision === undefined ? '' : ` ${prose(r.decision)}`}`);
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
