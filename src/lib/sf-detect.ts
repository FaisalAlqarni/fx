// system-flow detect: the docs config, where the site and Markdown go, and the evidence roots.
// It reads and prints; only writeFxJson writes, and only the keys named in the task.
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from './json.js';
import { systemFlowConfig } from './sf-build.js';
import { resolveRoots, rootsBase } from './sf-evidence.js';
import type { Problem } from './sf-model.js';
import { findArchify } from './sf-diagrams.js';
import { GENERATED } from './sf-markdown.js';
import { detectTheme } from './sf-theme.js';

export type Detected = {
  docsConfig: { kind: 'mkdocs' | 'docusaurus' | 'vitepress' | null; path: string | null; docsDir: string | null };
  output: { site: string; markdown: string };
  mkdocs: { nav: string[]; excludeDocs: string[] } | null;
  theme: { source: string; kind: string };
  archify: { dir: string; version: string | null; via: string } | null; // null when the saved preference is cheap or nothing is found
  roots: { id: string; path: string; dir: string; git: boolean; remote: string | null; head: string | null }[]; // [0] is the host; path is relative to the main working tree
};

export function rootId(folder: string): string {
  return path.basename(folder).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const first = (root: string, names: string[]): string | undefined => names.find((n) => fs.existsSync(path.join(root, n)));

// shortcut: docs_dir is read with a line match, not a YAML parser; a docs_dir set inside a flow mapping is missed.
export function docsConfig(host: string): Detected['docsConfig'] {
  if (fs.existsSync(path.join(host, 'mkdocs.yml'))) {
    const m = /^docs_dir:\s*["']?([^"'#\s]+)/m.exec(fs.readFileSync(path.join(host, 'mkdocs.yml'), 'utf8'));
    return { kind: 'mkdocs', path: 'mkdocs.yml', docsDir: path.posix.normalize(m?.[1] ?? 'docs').replace(/\/$/, '') };
  }
  const docusaurus = first(host, ['js', 'ts', 'mjs', 'cjs'].map((e) => `docusaurus.config.${e}`));
  if (docusaurus) return { kind: 'docusaurus', path: docusaurus, docsDir: 'docs' };
  const configs = (dir: string): string[] => ['ts', 'mts', 'js', 'mjs'].map((e) => path.posix.join(dir, '.vitepress', `config.${e}`));
  // The config sits in the docs folder: the host, or a folder directly under it.
  const subs = fs.readdirSync(host, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules').map((e) => e.name).sort();
  for (const dir of ['.', ...subs]) {
    const found = first(host, configs(dir));
    if (found) return { kind: 'vitepress', path: found, docsDir: dir };
  }
  return { kind: null, path: null, docsDir: null };
}

// Hand-written means a Markdown file without the generated marker.
function handWritten(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir, { withFileTypes: true }).some((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? handWritten(p) : e.name.endsWith('.md') && !fs.readFileSync(p, 'utf8').includes(GENERATED);
  });
}

const err = (message: string, file = ''): Problem => ({ file, pointer: '', message, level: 'error' });

export function detect(hostRoot: string, repos: string[]): { detected: Detected; problems: Problem[] } {
  const problems: Problem[] = [];
  const cfg = systemFlowConfig(hostRoot);
  problems.push(...cfg.problems);
  const dc = docsConfig(hostRoot);
  const base = dc.docsDir === null || dc.docsDir === '.' ? (dc.docsDir === '.' ? '' : 'docs') : dc.docsDir;
  const join = (name: string): string => path.posix.join(base, name);
  let output = cfg.config?.output;
  if (!output) {
    let markdown = join('system');
    if (handWritten(path.join(hostRoot, markdown))) {
      if (handWritten(path.join(hostRoot, join('system-generated')))) problems.push(err(`${markdown} and ${join('system-generated')} hold hand-written Markdown; set system_flow.output.markdown in .fx.json`));
      markdown = join('system-generated');
    }
    output = { site: join('system-flow'), markdown };
  }

  // Roots: the host, the .fx.json roots, then each --repo not listed yet (same folder).
  const listed = new Map<string, string>(); // id -> path relative to the host root
  const given: Record<string, string> = {};
  const seen = new Map<string, string>(); // resolved dir -> id
  const hostId = rootId(hostRoot);
  listed.set(hostId, '.');
  seen.set(hostRoot, hostId);
  // .fx.json roots are relative to the main working tree; a --repo path is relative to the host root.
  const rootBase = rootsBase(hostRoot);
  const add = (id: string, shown: string, p: string, from: string): void => {
    const dir = path.resolve(from, p);
    if (seen.has(dir)) return;
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) { problems.push(err(`no folder at ${shown}`)); return; }
    const other = [...listed].find(([k]) => k === id);
    if (other) { problems.push(err(`roots ${other[1]} and ${shown} both map to id ${id}; rename one in .fx.json system_flow.roots`)); return; }
    listed.set(id, path.relative(rootBase, dir) || '.');
    given[id] = listed.get(id) as string;
    seen.set(dir, id);
  };
  for (const [id, p] of Object.entries(cfg.config?.roots ?? {})) add(id, p, p, rootBase);
  for (const r of repos) add(rootId(r), r, r, hostRoot);

  const { roots } = resolveRoots(hostRoot, { roots: [...listed.keys()].map((id) => ({ id })) }, { roots: given });
  const rootList = [...roots.values()].map((r) => ({ id: r.id, path: listed.get(r.id) as string, dir: r.dir, git: r.git, remote: r.remote, head: r.head }));

  const theme = detectTheme(hostRoot, dc.docsDir);
  const rel = (p: string): string => (base === '' ? p : path.posix.relative(base, p));
  const site = rel(output.site);
  const mkdocs = dc.kind === 'mkdocs'
    ? { nav: [`- System flow: ${site}/index.html`, `- System docs: ${rel(output.markdown)}/index.md`], excludeDocs: [`${site}/README.md`, `${site}/model/`, `${site}/diagrams/src/`] }
    : null;
  return { detected: { docsConfig: dc, output, mkdocs, theme: { source: theme.source, kind: theme.kind }, archify: cfg.config?.diagrams?.prefer === 'cheap' ? null : findArchify(hostRoot, process.env, cfg.config), roots: rootList }, problems };
}

// Replaces system_flow.output and system_flow.theme and adds roots not listed yet; every other key stays.
export function writeFxJson(hostRoot: string, d: Detected): void {
  const file = path.join(hostRoot, '.fx.json');
  const doc = (fs.existsSync(file) ? parseJson(fs.readFileSync(file, 'utf8')) : {}) as Record<string, unknown>;
  const sf = (doc.system_flow ?? {}) as Record<string, unknown>;
  const roots = (sf.roots ?? {}) as Record<string, string>;
  for (const r of d.roots.slice(1)) if (roots[r.id] === undefined) roots[r.id] = r.path;
  sf.output = d.output;
  sf.theme = d.theme;
  if (Object.keys(roots).length > 0) sf.roots = roots;
  doc.system_flow = sf;
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
}
