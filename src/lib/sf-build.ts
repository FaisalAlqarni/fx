// The build pipeline: check in build mode, plan the verified stamps in memory, write the outputs,
// and only then write the stamps into the fragments. Later tasks add steps before the stamp write.
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from './json.js';
import { parseFxJson } from './fx-json.js';
import { resolveRoots, verifyEvidence } from './sf-evidence.js';
import { checkCorrections, headModel } from './sf-corrections.js';
import type { Root } from './sf-evidence.js';
import { renderCoverage, renderMarkdown, renderReadme, renderRules, GENERATED } from './sf-markdown.js';
import { checkRuleAdrs, checkRules } from './sf-rules.js';
import { coverage, sectionItems } from './sf-coverage.js';
import { queryPaths } from './sf-stale.js';
import { depth, readPlan } from './sf-estimate.js';
import type { Depth } from './sf-estimate.js';
import type { Coverage } from './sf-coverage.js';
import { layoutAll } from './sf-layout.js';
import { renderPage } from './sf-page.js';
import { applyThemeBlock, deepDiagrams, findArchify, outsideRefs, pickLine, runArchify, svgPage } from './sf-diagrams.js';
import type { ArchifyRun, DeepDiagram } from './sf-diagrams.js';
import { detectTheme, themeCss } from './sf-theme.js';
import type { Theme } from './sf-theme.js';
import type { Evidenced, FigureSpec, Fragment, Item, LayoutLine, Model, Problem } from './sf-model.js';
import { collect, itemsOf, loadFragments, mergeFragments, originOf, parseHandle, planStamps, stampVerified } from './sf-model.js';
import type { FxJson } from './types.js';

// The diagram choices a build takes from its flags; they merge into .fx.json system_flow.diagrams on success.
export type DiagramFlags = { prefer?: 'cheap' | 'fast' | 'detailed'; pageLimits?: Record<string, number>; svg?: string[] };
const RETRY_PAGE = 5;

export type BuildResult = {
  ok: boolean; problems: Problem[]; written: string[]; collisions: string[];
  diagrams: { name: string; renderer: 'archify' | 'svg'; reason: string }[];
  layout: LayoutLine[]; pageBytes: number | null;
  coverage: Coverage['counts'] | null;
  theme: { source: string; kind: string; fallbacks: Theme['fallbacks'] } | null; // null until the build reaches the theme step
  depth: ReturnType<typeof depth> | null; // null until the check passes; areas is empty without model/plan.json
  rebuilt: { docs: string[]; figures: string[]; diagrams: string[] }; // a full build lists everything; --only lists what holds the given items
};
export type { Depth };

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
    problems.push(...resolved.problems, ...checkRuleAdrs(merged.model, resolved.roots), ...verifyEvidence(items, resolved.roots, mode));
    const host = [...resolved.roots.values()].find((r) => r.host);
    if (host) {
      const head = headModel(host, path.join(hostRoot, site, 'model', 'fragments'));
      problems.push(...checkCorrections(head.items, head.model, itemsOf(merged.model), merged.model));
    }
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

const REFERENCES = path.join(__dirname, '..', 'references');
// Site assets by the copy rule: the kit beside the template, the libraries and their licences from vendor/.
// fx-map-1.js is left out: the site page loads fx-map-2.js.
const ASSETS: [string, string][] = [
  ...['fx-tokens-1.css', 'fx-map-2.js', 'fx-flow-1.js'].map((n): [string, string] => [n, 'visual']),
  ...['react-18.3.1.production.min.js', 'react-dom-18.3.1.production.min.js', 'reactflow-11.11.4.min.js', 'reactflow-11.11.4.style.css', 'elkjs-0.9.3.bundled.js', 'LICENSE-react', 'LICENSE-reactflow', 'LICENSE-elkjs'].map((n): [string, string] => [n, 'vendor']),
];

// Merges the choices into .fx.json system_flow.diagrams by key; every other key stays.
function saveChoices(hostRoot: string, c: DiagramFlags): void {
  const file = path.join(hostRoot, '.fx.json');
  const doc = (fs.existsSync(file) ? parseJson(fs.readFileSync(file, 'utf8')) : {}) as Record<string, unknown>;
  const sf = (doc.system_flow ?? {}) as Record<string, unknown>;
  const d = { ...(sf.diagrams as Record<string, unknown> | undefined) };
  if (c.prefer) d.prefer = c.prefer;
  if (Object.keys(c.pageLimits ?? {}).length) d.pageLimits = c.pageLimits;
  if (c.svg?.length) d.svg = c.svg;
  sf.diagrams = d;
  doc.system_flow = sf;
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
}

// What `--only` selects: arguments with a handle prefix are handles, the rest are paths (items citing them).
// Returns the unknown handles, or the figure keys, section docs and flags that hold the selection.
function selectOnly(model: Model, items: Item[], only: string[], hostId: string): { unknown: string[]; selected: Set<string>; figures: Set<string>; sections: Set<string>; components: boolean; rules: boolean } {
  const given = only.filter((a) => parseHandle(a) !== null);
  const sel = new Set([...given, ...queryPaths(items, only.filter((a) => parseHandle(a) === null), hostId).map((i) => i.handle)]);
  const containers = new Set([...model.sections.map((s) => `section:${s.id}`), ...model.levels.diagrams.map((d) => `diagram:${d.id}`), ...model.sequences.map((q) => `seq:${q.id}`), ...model.storeFlows.map((f) => `flow:${f.id}`)]);
  const known = new Set([...items.map((i) => i.handle), ...containers]);
  const unknown = given.filter((h) => !known.has(h));
  const owner = new Map<object, string>();
  for (const d of model.levels.diagrams) for (const o of [...d.groups, ...d.nodes, ...d.edges]) owner.set(o, `level-${d.id}`);
  for (const q of model.sequences) for (const o of [...q.participants, ...q.messages]) owner.set(o, `seq-${q.id}`);
  for (const f of model.storeFlows) for (const o of f.steps) owner.set(o, `flow-${f.id}`);
  const figures = new Set<string>();
  for (const { item, o } of collect(model)) if (sel.has(item.handle) && owner.has(o)) figures.add(owner.get(o) as string);
  for (const h of sel) {
    const p = parseHandle(h);
    if (p?.prefix === 'diagram') figures.add(`level-${p.id}`);
    if (p?.prefix === 'seq') figures.add(`seq-${p.id}`);
    if (p?.prefix === 'flow') figures.add(`flow-${p.id}`);
  }
  const sections = new Set<string>();
  for (const s of model.sections) {
    const own = [...model.levels.diagrams.filter((d) => (s.diagrams ?? []).includes(d.id)).map((d) => `diagram:${d.id}`),
      ...model.sequences.filter((q) => (s.sequences ?? []).includes(q.id) || q.chapter === s.id).map((q) => `seq:${q.id}`),
      ...model.storeFlows.filter((f) => (s.storeFlows ?? []).includes(f.id) || f.chapter === s.id).map((f) => `flow:${f.id}`)];
    if (sel.has(`section:${s.id}`) || own.some((h) => sel.has(h)) || sectionItems(model, s.id).some((i) => sel.has(i.handle))) sections.add(s.id);
  }
  const has = (prefix: string): boolean => [...sel].some((h) => parseHandle(h)?.prefix === prefix);
  return { unknown, selected: sel, figures, sections, components: has('catalogue'), rules: has('rule') };
}

// Lays out every figure; each one over 1 crossing or 860 px is an error at the fragment that defines it.
export async function layoutChecked(model: Model): Promise<{ figures: FigureSpec[]; report: LayoutLine[]; unfit: Problem[] }> {
  const laid = await layoutAll(model);
  const owners = new Map<string, object>([
    ...model.levels.diagrams.map((d): [string, object] => [`level-${d.id}`, d]),
    ...model.sequences.map((q): [string, object] => [`seq-${q.id}`, q]),
    ...model.storeFlows.map((f): [string, object] => [`flow-${f.id}`, f]),
  ]);
  const unfit = laid.unfit.map((u): Problem => ({ ...originOf(owners.get(u.key) ?? {}), message: `figure ${u.key} cannot meet 1 crossing and 860 px: ${u.line}; split it one level down`, level: 'error' }));
  return { figures: laid.figures, report: laid.report, unfit };
}

export async function build(opts: { hostRoot: string; site: string; markdown: string; docsDir?: string | null; only?: string[]; archify?: string; archifyTimeout?: number; flags?: DiagramFlags }): Promise<BuildResult> {
  const result: BuildResult = { ok: false, problems: [], written: [], collisions: [], diagrams: [], layout: [], pageBytes: null, coverage: null, theme: null, depth: null, rebuilt: { docs: [], figures: [], diagrams: [] } };
  const checked = checkModel(opts.hostRoot, opts.site, 'build');
  result.problems = checked.problems;
  if (checked.problems.some((p) => p.level === 'error')) return result;

  const hostId = [...checked.roots.values()].find((r) => r.host)?.id ?? '';
  const picked = opts.only === undefined ? null : selectOnly(checked.model, checked.items, opts.only, hostId);
  if (picked && picked.unknown.length) {
    result.problems.push(...picked.unknown.map((h): Problem => ({ file: '', pointer: '', message: `no item ${h}`, level: 'error' })));
    return result;
  }

  const planFile = path.join(opts.hostRoot, opts.site, 'model', 'plan.json');
  const plan = fs.existsSync(planFile) ? readPlan(planFile, path.posix.join(opts.site, 'model', 'plan.json')) : { plan: null, problems: [] };
  if (plan.problems.length) { result.problems.push(...plan.problems); return result; }
  result.depth = depth(checked.model, checked.items, plan.plan, checked.origin);

  // The stamps are applied in memory only; the fragments change at the very end.
  // With --only, only the named items are stamped: the rest were not re-read.
  const stamps = planStamps(picked === null ? checked.items : checked.items.filter((i) => picked.selected.has(i.handle)), checked.roots);
  for (const { item, o } of collect(checked.model)) {
    const add = stamps.get(item.handle);
    if (add) (o as Evidenced).verified = { ...(o as Evidenced).verified, ...add };
  }

  // Layout before any write: a figure over 1 crossing or 860 px fails the build with nothing written.
  const laid = await layoutChecked(checked.model);
  result.layout = laid.report;
  result.problems.push(...laid.unfit);
  if (laid.unfit.length) return result;

  const hasMarker = (old: string): boolean => old.includes(GENERATED);
  const docs = renderMarkdown(checked.model, checked.roots, hostId, opts.markdown, opts.site);
  // The first docs are the sections, in model order; components.md follows them.
  const wanted = (i: number): boolean => picked === null || (i < checked.model.sections.length ? picked.sections.has((checked.model.sections[i] as { id: string }).id) : picked.components && (docs[i] as { path: string }).path.endsWith('/components.md'));
  docs.forEach((doc, i) => {
    if (!wanted(i)) return;
    result.rebuilt.docs.push(doc.path);
    writeGenerated(opts.hostRoot, doc.path, doc.text, hasMarker, result);
  });
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'README.md'), renderReadme(), hasMarker, result);
  const isGeneratedJson = (old: string): boolean => { try { return (parseJson(old) as { generated?: unknown }).generated === true; } catch { return false; } };
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'model', 'system-model.json'), `${JSON.stringify({ generated: true, ...checked.model }, null, 2)}\n`, isGeneratedJson, result);
  const cov = coverage(checked.model);
  result.coverage = cov.counts;
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'model', 'coverage.json'), `${JSON.stringify({ generated: true, ...cov }, null, 2)}\n`, isGeneratedJson, result);
  const covDoc = renderCoverage(checked.model, cov, opts.markdown);
  const rules = renderRules(checked.model, checked.roots, hostId, opts.markdown);
  if (picked === null) {
    writeGenerated(opts.hostRoot, covDoc.path, covDoc.text, hasMarker, result);
    result.rebuilt.docs.push(covDoc.path);
  }
  if (picked === null || picked.rules) {
    writeGenerated(opts.hostRoot, rules.path, rules.text, hasMarker, result);
    result.rebuilt.docs.push(rules.path);
  }
  result.rebuilt.figures = laid.figures.map((f) => f.key).filter((k) => picked === null || picked.figures.has(k));

  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'model', 'layout-report.json'), `${JSON.stringify(laid.report, null, 2)}\n`, () => true, result);

  // Re-read from the repo on every build, so a change to its CSS reaches the site.
  const theme = detectTheme(opts.hostRoot, opts.docsDir ?? null);
  result.theme = { source: theme.source, kind: theme.kind, fallbacks: theme.fallbacks };
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'assets', 'theme.css'), themeCss(theme), (old) => old.startsWith('/* fx '), result);

  // A missing source file stops the build before the page is written.
  for (const [name, dir] of ASSETS) {
    if (!fs.existsSync(path.join(REFERENCES, dir, name))) throw new Error(`fx asset missing: references/${dir}/${name}`);
  }
  for (const [name, dir] of ASSETS) {
    const rel = path.posix.join(opts.site, 'assets', name);
    const dest = path.join(opts.hostRoot, rel);
    if (fs.existsSync(dest)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(REFERENCES, dir, name), dest);
    result.written.push(rel);
  }
  const template = fs.readFileSync(path.join(REFERENCES, 'visual', 'page-template.html'), 'utf8');
  const html = renderPage({ model: checked.model, figures: laid.figures, coverage: cov, theme, roots: checked.roots, template });
  writeGenerated(opts.hostRoot, path.posix.join(opts.site, 'index.html'), html, hasMarker, result);
  if (!result.collisions.includes(path.posix.join(opts.site, 'index.html'))) result.pageBytes = Buffer.byteLength(html);

  // Saved choices plus this build's flags, in memory; .fx.json is written at the end.
  const saved = checked.config?.diagrams ?? {};
  const flags = opts.flags ?? {};
  const prefer = flags.prefer ?? saved.prefer;
  const limits = { ...saved.pageLimits, ...flags.pageLimits };
  const svgNames = [...new Set([...(saved.svg ?? []), ...(flags.svg ?? [])])].sort();
  // An explicit --archify wins over cheap; cheap only skips the lookup.
  const archify = opts.archify ?? (prefer === 'cheap' ? undefined : findArchify(opts.hostRoot, process.env, checked.config)?.dir);

  const pages = path.posix.join(opts.site, 'diagrams');
  const generatedJson = (old: string): boolean => { try { return parseJson(old) !== null; } catch { return false; } };
  const all = deepDiagrams(checked.model, laid.figures, checked.roots, limits);
  const keyOf = (d: DeepDiagram): string => (d.source.startsWith('diagram:') ? `level-${d.source.slice(8)}` : d.source.startsWith('seq:') ? `seq-${d.source.slice(4)}` : `flow-${d.source.slice(5)}`);
  const figureOf = (d: DeepDiagram) => {
    const figure = laid.figures.find((f) => f.key === keyOf(d));
    if (!figure) throw new Error(`no figure for ${d.name}`);
    return figure;
  };
  const writeSpecs = (ds: DeepDiagram[]): void => {
    for (const d of ds) writeGenerated(opts.hostRoot, path.posix.join(pages, 'src', `${d.name}.json`), `${JSON.stringify(d.spec, null, 2)}\n`, generatedJson, result);
  };
  // The retry's receipts carry .retry, so the first attempt's receipts survive it.
  const receiptOf = (d: DeepDiagram, retry: boolean): string => path.posix.join(pages, `${d.name}${retry ? '.retry' : ''}.receipt.json`);
  const jobsOf = (ds: DeepDiagram[], retry: boolean) => ds.map((d) => ({
    name: d.name, kind: d.kind, spec: path.join(opts.hostRoot, pages, 'src', `${d.name}.json`),
    out: path.join(opts.hostRoot, pages, `${d.name}.html`), repoRoot: checked.roots.get(d.owningRoot)?.dir ?? opts.hostRoot,
    receipt: path.join(opts.hostRoot, receiptOf(d, retry)),
  }));
  const bySource = new Map<string, DeepDiagram[]>();
  for (const d of all) bySource.set(d.source, [...(bySource.get(d.source) ?? []), d]);
  const groups = [...bySource.values()].filter((g) => picked === null || picked.figures.has(keyOf(g[0] as DeepDiagram)));
  result.rebuilt.diagrams = groups.flat().map((d) => d.name);
  const svgReason = (g: DeepDiagram[]): string | null => (prefer === 'cheap' && opts.archify === undefined ? 'preference cheap' : svgNames.includes((g[0] as DeepDiagram).name) ? 'owner or lane chose SVG' : archify === undefined ? 'archify not installed' : null);
  const svgLabel = (g: DeepDiagram[]): 'static SVG' | 'animated SVG' => ((g[0] as DeepDiagram).kind === 'sequence' ? 'animated SVG' : 'static SVG');

  for (const g of groups) writeSpecs(g);
  const live = archify === undefined ? [] : groups.filter((g) => svgReason(g) === null);
  // why: the fallback reason of a failed call, from what archify left behind.
  type Run = { ok: boolean; why: string };
  const timeoutS = opts.archifyTimeout ?? 600;
  const runAll = async (gs: DeepDiagram[][], retry: boolean): Promise<Map<string, Run[]>> => {
    const rs = await runArchify(archify as string, jobsOf(gs.flat(), retry), timeoutS);
    const byGroup = new Map<string, Run[]>();
    gs.flat().forEach((d, i) => {
      const r = rs[i] as ArchifyRun;
      const why = r.timedOut ? `archify timed out after ${timeoutS} s`
        : `archify failed: ${r.receipt === null ? 'no receipt' : receiptOf(d, retry)}${r.json ? `; result: ${r.json}` : ''}${r.stderr ? `; stderr: ${r.stderr.split('\n').join(' | ')}` : ''}`;
      byGroup.set(d.source, [...(byGroup.get(d.source) ?? []), { ok: r.ok, why }]);
    });
    return byGroup;
  };
  const first = live.length ? await runAll(live, false) : new Map<string, Run[]>();
  // One fixed retry for a sequence or flow whose page limit is above 5; nothing edits the spec between attempts.
  const retried = new Map<string, DeepDiagram[]>();
  for (const g of live) {
    const g0 = g[0] as DeepDiagram;
    const key = g0.source.replace(':', '-');
    if (g0.kind === 'sequence' && (first.get(g0.source) as Run[]).some((r) => !r.ok) && (limits[key] ?? 8) > RETRY_PAGE) {
      retried.set(g0.source, deepDiagrams(checked.model, laid.figures, checked.roots, { ...limits, [key]: RETRY_PAGE }).filter((d) => d.source === g0.source));
    }
  }
  for (const g of retried.values()) writeSpecs(g);
  const second = retried.size ? await runAll([...retried.values()], true) : new Map<string, Run[]>();

  const msgs = (g: DeepDiagram[]): number => g.reduce((n, d) => n + ((d.spec as { messages?: unknown[] }).messages?.length ?? 0), 0);
  for (const g of groups) {
    const g0 = g[0] as DeepDiagram;
    const skip = svgReason(g);
    const attempt = second.get(g0.source) ?? first.get(g0.source);
    const done = retried.get(g0.source) ?? g;
    // Design, Global Constraints: a page may load only files under the site's assets/.
    const leak = attempt?.every((r) => r.ok) ? done.flatMap((d) => outsideRefs(fs.readFileSync(path.join(opts.hostRoot, pages, `${d.name}.html`), 'utf8')))[0] : undefined;
    let shown = g, renderer: 'archify' | 'svg' = 'svg', line: string;
    if (skip !== null) line = pickLine(g0.name, svgLabel(g), skip);
    else if (leak !== undefined) {
      line = pickLine(g0.name, svgLabel(g), `archify page loads outside the site: ${leak}`);
      writeSpecs(g);
    } else if (attempt?.every((r) => r.ok)) {
      renderer = 'archify'; shown = done;
      const cut = [...new Set(done.flatMap((d) => d.shortened))];
      const tail = `${retried.has(g0.source) ? ', retried at 5 per page' : ''}${cut.length ? `, shortened: ${cut.join(', ')}` : ''}`;
      line = g0.kind === 'architecture'
        ? pickLine(g0.name, 'archify architecture', `${(g0.spec as { components: unknown[] }).components.length} components${tail}`)
        : pickLine(g0.name, 'archify sequence', `${msgs(done)} messages in ${done.length} pages${tail}`);
    } else {
      const failed = (attempt as Run[]).map((r, i) => ({ r, i })).filter((x) => !x.r.ok).pop();
      line = pickLine(g0.name, svgLabel(g), (failed as { r: Run }).r.why);
      writeSpecs(g);
    }
    // A page or spec of this diagram from an attempt not shown (a retry's -p3, say) is the build's own stale output.
    const keep = new Set(shown.map((d) => d.name));
    const page = new RegExp(`^${g0.name}(?:-p\\d+)?\\.(?:html|json)$`);
    for (const dir of [pages, path.posix.join(pages, 'src')]) {
      const abs = path.join(opts.hostRoot, dir);
      if (fs.existsSync(abs)) for (const n of fs.readdirSync(abs)) if (page.test(n) && !keep.has(n.replace(/\.(?:html|json)$/, ''))) fs.rmSync(path.join(abs, n));
    }
    for (const d of shown) {
      if (renderer === 'svg') writeGenerated(opts.hostRoot, path.posix.join(pages, `${d.name}.html`), svgPage(d, figureOf(d), Number(/-p(\d+)$/.exec(d.name)?.[1] ?? 1)), () => true, result);
      else {
        const rel = path.posix.join(pages, `${d.name}.html`);
        const file = path.join(opts.hostRoot, rel);
        fs.writeFileSync(file, applyThemeBlock(fs.readFileSync(file, 'utf8'), theme));
        result.written.push(rel);
      }
    }
    for (const d of shown) result.diagrams.push({ name: d.name, renderer, reason: line.slice(g0.name.length + 2) });
  }

  // Last step, only when everything above succeeded (a write error above throws before this line).
  stampVerified(path.join(opts.hostRoot, opts.site, 'model', 'fragments'), stamps);
  if (opts.flags) saveChoices(opts.hostRoot, { prefer, pageLimits: limits, svg: svgNames });
  result.ok = true;
  return result;
}
