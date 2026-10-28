// The build pipeline: check in build mode, plan the verified stamps in memory, write the outputs,
// and only then write the stamps into the fragments. Later tasks add steps before the stamp write.
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from './json.js';
import { parseFxJson } from './fx-json.js';
import { resolveRoots, verifyEvidence } from './sf-evidence.js';
import type { Root } from './sf-evidence.js';
import { renderMarkdown, renderReadme, GENERATED } from './sf-markdown.js';
import { checkRules } from './sf-rules.js';
import { layoutAll } from './sf-layout.js';
import { detectTheme, themeCss } from './sf-theme.js';
import type { Theme } from './sf-theme.js';
import type { Evidenced, Fragment, Item, LayoutLine, Model, Problem } from './sf-model.js';
import { collect, itemsOf, loadFragments, mergeFragments, originOf, planStamps, stampVerified } from './sf-model.js';
import type { FxJson } from './types.js';

export type BuildResult = {
  ok: boolean; problems: Problem[]; written: string[]; collisions: string[];
  diagrams: { name: string; renderer: 'archify' | 'svg'; reason: string }[];
  layout: LayoutLine[]; pageBytes: number | null;
  theme: { source: string; kind: string; fallbacks: Theme['fallbacks'] } | null; // null until the build reaches the theme step
};

// .fx.json is read through parseFxJson; only problems under system_flow are this command's.
export function systemFlowConfig(root: string): { config: FxJson['system_flow']; problems: Problem[] } {
  const file = path.join(root, '.fx.json');
  if (!fs.existsSync(file)) return { config: undefined, problems: [] };
  const parsed = parseFxJson(parseJson(fs.readFileSync(file, 'utf8')));
  if (!parsed.ok) throw new Error(parsed.reason);
  const problems = parsed.problems.filter((p) => p.key.startsWith('system_flow'))
    .map((p): Problem => ({ file: '.fx.json', pointer: `/${p.key.split('.').join('/')}`, message: p.reason, level: 'error' }));
  return { config: parsed.value.system_flow, problems };
}

export type Checked = {
  config: FxJson['system_flow']; fragments: Fragment[]; model: Model; items: Item[];
  roots: Map<string, Root>; origin: Map<string, { file: string; pointer: string }>; problems: Problem[];
};

// The one check: `check` and `build` differ only in mode (an uncommitted cited file is an error in build)
// and in `fragment`, which narrows the evidence test and the report to one fragment file.
export function checkModel(hostRoot: string, site: string, mode: 'check' | 'build', fragment?: string): Checked {
  const cfg = systemFlowConfig(hostRoot);
  const loaded = loadFragments(path.join(hostRoot, site, 'model', 'fragments'), hostRoot);
  const merged = mergeFragments(loaded.fragments);
  let problems = [...cfg.problems, ...loaded.problems, ...merged.problems];
  let items = itemsOf(merged.model);
  let roots = new Map<string, Root>();
  if (problems.length === 0) {
    problems = checkRules(merged.model, merged.origin);
    const resolved = resolveRoots(hostRoot, merged.model.meta, cfg.config);
    roots = resolved.roots;
    // With a fragment, only its items are verified and reported; the rest supply the ids it names.
    const only = fragment === undefined ? undefined : path.relative(hostRoot, path.resolve(hostRoot, fragment));
    if (only !== undefined && !loaded.fragments.some((f) => f.file === only)) throw new Error(`no fragment ${only}`);
    if (only !== undefined) items = items.filter((i) => i.file === only);
    problems.push(...resolved.problems, ...verifyEvidence(items, resolved.roots, mode));
    if (only !== undefined) problems = problems.filter((p) => p.file === only || p.file === '.fx.json');
  }
  return { config: cfg.config, fragments: loaded.fragments, model: merged.model, items, roots, origin: merged.origin, problems };
}

// Writes a generated file unless it exists without the marker; returns whether it was written.
function writeGenerated(root: string, rel: string, text: string, isOurs: (old: string) => boolean, r: BuildResult): void {
  const file = path.join(root, rel);
  if (fs.existsSync(file)) {
    const old = fs.readFileSync(file, 'utf8');
    if (!isOurs(old)) { r.collisions.push(rel); return; }
    if (old === text) return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  r.written.push(rel);
}

export async function build(opts: { hostRoot: string; site: string; markdown: string; docsDir?: string | null; only?: string[]; archify?: string }): Promise<BuildResult> {
  const result: BuildResult = { ok: false, problems: [], written: [], collisions: [], diagrams: [], layout: [], pageBytes: null, theme: null };
  const checked = checkModel(opts.hostRoot, opts.site, 'build');
  result.problems = checked.problems;
  if (checked.problems.some((p) => p.level === 'error')) return result;

  // The stamps are applied in memory only; the fragments change at the very end.
  const stamps = planStamps(checked.items, checked.roots);
  for (const { item, o } of collect(checked.model)) {
    const add = stamps.get(item.handle);
    if (add) (o as Evidenced).verified = { ...(o as Evidenced).verified, ...add };
  }

  // Layout before any write: a figure over 1 crossing or 860 px fails the build with nothing written.
  const laid = await layoutAll(checked.model);
  result.layout = laid.report;
  const owners = new Map<string, object>([
    ...checked.model.levels.diagrams.map((d): [string, object] => [`level-${d.id}`, d]),
    ...checked.model.sequences.map((q): [string, object] => [`seq-${q.id}`, q]),
    ...checked.model.storeFlows.map((f): [string, object] => [`flow-${f.id}`, f]),
  ]);
  for (const u of laid.unfit) {
    const at = originOf(owners.get(u.key) ?? {});
    result.problems.push({ ...at, message: `figure ${u.key} cannot meet 1 crossing and 860 px: ${u.line}`, level: 'error' });
  }
  if (laid.unfit.length) return result;

  const hostId = [...checked.roots.values()].find((r) => r.host)?.id ?? '';
  const hasMarker = (old: string): boolean => old.includes(GENERATED);
  for (const doc of renderMarkdown(checked.model, checked.roots, hostId, opts.markdown, opts.site)) {
    writeGenerated(opts.hostRoot, doc.path, doc.text, hasMarker, result);
  }
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'README.md'), renderReadme(), hasMarker, result);
  const isGeneratedJson = (old: string): boolean => { try { return (parseJson(old) as { generated?: unknown }).generated === true; } catch { return false; } };
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'model', 'system-model.json'), `${JSON.stringify({ generated: true, ...checked.model }, null, 2)}\n`, isGeneratedJson, result);

  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'model', 'layout-report.json'), `${JSON.stringify(laid.report, null, 2)}\n`, () => true, result);

  // Re-read from the repo on every build, so a change to its CSS reaches the site.
  const theme = detectTheme(opts.hostRoot, opts.docsDir ?? null);
  result.theme = { source: theme.source, kind: theme.kind, fallbacks: theme.fallbacks };
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'assets', 'theme.css'), themeCss(theme), (old) => old.startsWith('/* fx '), result);

  // Last step, only when everything above succeeded (a write error above throws before this line).
  stampVerified(path.join(opts.hostRoot, opts.site, 'model', 'fragments'), stamps);
  result.ok = true;
  return result;
}
