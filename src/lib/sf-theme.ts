// system-flow theme: find the repo's design language, map it onto fx's token slots by role,
// check the contrast pairs and fall back to fx's value for a pair that fails.
// Every repo file read here is untrusted text: only a strict `--name: #hex` pattern is taken from CSS,
// and a Tailwind config is read as text, never required or executed.
import * as fs from 'fs';
import * as path from 'path';
import { parseJson } from './json.js';

export const SLOTS = ['--paper', '--panel', '--ink', '--muted', '--rule', '--code', '--accent', '--accent-tint', '--warn', '--alert', '--violet', '--info', '--info-tint'] as const;
type Values = Record<string, string>;
export type Theme = { source: string; kind: 'docs-css' | 'mkdocs-material' | 'tailwind' | 'app-css' | 'brand' | 'fx'; light: Values; dark: Values; fonts: { text: string | null; code: string | null }; fallbacks: { theme: 'light' | 'dark'; slot: string; against: string; ratio: number; used: string }[] };

// The values of fx-tokens-1.css.
const FX_LIGHT: Values = { '--paper': '#f6f7f9', '--panel': '#ffffff', '--ink': '#14181f', '--muted': '#5b6472', '--rule': '#e3e7ee', '--code': '#eef2f7', '--accent': '#0f766e', '--accent-tint': '#dcf0ed', '--warn': '#a16207', '--alert': '#b45309', '--violet': '#7c3aed', '--info': '#2563eb', '--info-tint': '#e3ecfd' };
const FX_DARK: Values = { '--paper': '#0f1318', '--panel': '#161b22', '--ink': '#e6edf3', '--muted': '#9aa4b2', '--rule': '#2a313b', '--code': '#1f2630', '--accent': '#2dd4bf', '--accent-tint': '#123a37', '--warn': '#fbbf24', '--alert': '#fdba74', '--violet': '#c9a2ff', '--info': '#93c5fd', '--info-tint': '#1a2a45' };

const ALIASES: Record<string, string[]> = {
  '--paper': ['paper', 'bg', 'background', 'page', 'body-bg'],
  '--panel': ['panel', 'surface', 'card', 'bg-alt', 'bg-secondary'],
  '--ink': ['ink', 'text', 'fg', 'foreground', 'text-primary'],
  '--muted': ['muted', 'text-muted', 'muted-foreground', 'fg-muted', 'text-secondary'],
  '--rule': ['rule', 'border', 'line', 'divider'],
  '--code': ['code', 'code-bg'],
  '--accent': ['accent', 'primary', 'brand'],
  '--accent-tint': ['accent-tint', 'accent-soft', 'primary-tint'],
  '--warn': ['warn', 'warning'],
  '--alert': ['alert', 'danger', 'error', 'destructive'],
  '--violet': ['violet', 'purple'],
  '--info': ['info'],
  '--info-tint': ['info-tint'],
};
const slotOf = (name: string): string | undefined => {
  const n = name.toLowerCase().replace(/^-+/, '').replace(/^color-/, '');
  return SLOTS.find((s) => (ALIASES[s] as string[]).includes(n));
};

const MATERIAL: Record<string, string> = {
  red: '#f44336', pink: '#e91e63', purple: '#9c27b0', 'deep purple': '#673ab7', indigo: '#3f51b5', blue: '#2196f3', 'light blue': '#03a9f4', cyan: '#00bcd4', teal: '#009688',
  green: '#4caf50', 'light green': '#8bc34a', lime: '#cddc39', yellow: '#ffeb3b', amber: '#ffc107', orange: '#ff9800', 'deep orange': '#ff5722', brown: '#795548', grey: '#9e9e9e', 'blue grey': '#607d8b',
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const norm = (h: string): string => {
  const x = h.toLowerCase();
  return x.length === 4 ? `#${x[1]}${x[1]}${x[2]}${x[2]}${x[3]}${x[3]}` : x;
};
const lum = (h: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(norm(h).slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (c[0] as number) + 0.7152 * (c[1] as number) + 0.0722 * (c[2] as number);
};
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)];
  return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100;
}

// ---- CSS

type Rule = { selector: string; body: string; dark: boolean };
// shortcut: a small brace scanner, not a CSS parser; a brace inside a string or comment can misplace a block.
function rules(css: string, inDark = false): Rule[] {
  const out: Rule[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let i = 0;
  for (;;) {
    const open = text.indexOf('{', i);
    if (open < 0) return out;
    let depth = 1;
    let j = open + 1;
    for (; j < text.length && depth > 0; j++) depth += text[j] === '{' ? 1 : text[j] === '}' ? -1 : 0;
    const selector = text.slice(i, open).replace(/^[\s;}]+/, '').trim();
    const body = text.slice(open + 1, j - 1);
    if (selector.startsWith('@media')) out.push(...rules(body, inDark || /prefers-color-scheme:\s*dark/.test(selector)));
    else if (!selector.startsWith('@')) out.push({ selector, body, dark: inDark || /\[data-(?:bs-)?theme=["']?dark["']?\]|\.(?:theme-)?dark\b/.test(selector) });
    i = j;
  }
}
const vars = (body: string): [string, string][] =>
  [...body.matchAll(/(?:^|[;{\s])(--[A-Za-z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})\s*(?=;|$)/g)].map((m): [string, string] => [m[1] as string, norm(m[2] as string)]);

// Custom properties of :root (or html) rules, split into the light and dark theme, mapped to slots.
function cssTheme(text: string): { light: Values; dark: Values } {
  const out = { light: {} as Values, dark: {} as Values };
  for (const r of rules(text)) {
    if (!/(^|[\s,])(:root|html|body)\b|^\[data-theme|^\.dark/.test(r.selector)) continue;
    for (const [name, value] of vars(r.body)) {
      const slot = slotOf(name);
      if (slot) out[r.dark ? 'dark' : 'light'][slot] = value;
    }
  }
  return out;
}
const hasCore = (v: Values): boolean => ['--paper', '--ink', '--accent'].every((s) => v[s] !== undefined);

// ---- files

const SKIP = new Set(['node_modules', '.git', 'vendor', 'dist', 'build', 'tmp', 'coverage']);
function walk(root: string, dir: string, depth: number, out: string[] = []): string[] {
  if (depth < 0 || !fs.existsSync(path.join(root, dir))) return out;
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('.')) walk(root, path.posix.join(dir, e.name), depth - 1, out); }
    else if (e.isFile()) out.push(path.posix.join(dir, e.name));
  }
  return out;
}
const read = (root: string, rel: string): string => {
  const f = path.join(root, rel);
  return fs.statSync(f).size > 1_000_000 ? '' : fs.readFileSync(f, 'utf8');
};
// A file this module wrote or the kit ships starts with this.
const OURS = '/* fx ';
const cssFiles = (root: string, dir: string): { rel: string; text: string }[] =>
  walk(root, dir, 6).filter((p) => p.endsWith('.css')).map((rel) => ({ rel, text: read(root, rel) })).filter((f) => !f.text.startsWith(OURS));

// ---- sources

type Pick = { source: string; kind: Theme['kind']; light: Values; dark: Values };

function docsCss(root: string, docsDir: string): Pick | null {
  for (const f of cssFiles(root, docsDir)) {
    const t = cssTheme(f.text);
    if (hasCore(t.light) && Object.keys(t.dark).length > 0) return { source: f.rel, kind: 'docs-css', ...t };
  }
  return null;
}

// shortcut: YAML read with line matches, not a parser; a palette or font written in a way these miss is not seen.
const blockOf = (yml: string, key: string): string | null => {
  const m = new RegExp(`^( *)${key}:(.*)$`, 'm').exec(yml);
  if (!m) return null;
  const rest = yml.slice((m.index ?? 0) + m[0].length).split('\n').slice(1);
  const body: string[] = [m[2] ?? ''];
  for (const line of rest) {
    if (line.trim() !== '' && line.search(/\S/) <= (m[1] ?? '').length) break;
    body.push(line);
  }
  return body.join('\n');
};
const scalar = (text: string, key: string): string | null => {
  const m = new RegExp(`(?:^|[\\s{,])${key}:\\s*(?:'([^']*)'|"([^"]*)"|([^,}\\n#]+))`).exec(text);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : null;
};

function mkdocsFonts(yml: string): Theme['fonts'] {
  const font = blockOf(yml, 'font') ?? '';
  const pick = (k: string): string | null => {
    const v = scalar(font, k);
    return v !== null && /^[A-Za-z0-9 ]{1,64}$/.test(v) && v !== 'false' ? v : null;
  };
  return { text: pick('text'), code: pick('code') };
}

function material(yml: string): Pick | null {
  const palette = blockOf(yml, 'palette');
  if (palette === null) return null;
  const parts = palette.split(/^\s*-\s+/m).slice(1);
  const light: Values = {};
  const dark: Values = {};
  let found = false;
  for (const e of parts.length ? parts : [palette]) {
    const scheme = scalar(`\n${e}`, 'scheme') ?? 'default';
    const target = scheme === 'slate' ? dark : light;
    const name = (scalar(`\n${e}`, 'accent') ?? scalar(`\n${e}`, 'primary') ?? '').toLowerCase().replace(/[-_]/g, ' ');
    if (MATERIAL[name]) target['--accent'] = MATERIAL[name];
    Object.assign(target, scheme === 'slate' ? { '--paper': '#1e2129', '--panel': '#1e2129', '--ink': '#e2e4e9' } : { '--paper': '#ffffff', '--panel': '#ffffff', '--ink': '#1f2328' });
    found = true;
  }
  return found ? { source: 'mkdocs.yml', kind: 'mkdocs-material', light, dark } : null;
}

const TAILWIND_NAMES = '(primary|accent|brand|background|foreground|muted|border)';
function tailwind(root: string): Pick | null {
  const light: Values = {};
  const add = (name: string, value: string): void => { const s = slotOf(name); if (s && light[s] === undefined) light[s] = norm(value); };
  const cfg = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts'].find((n) => fs.existsSync(path.join(root, n)));
  if (cfg) {
    const text = read(root, cfg);
    for (const m of text.matchAll(new RegExp(`['"]?${TAILWIND_NAMES}['"]?\\s*:\\s*(?:['"](#[0-9a-fA-F]{3,6})['"]|\\{[^}]*?DEFAULT\\s*:\\s*['"](#[0-9a-fA-F]{3,6})['"])`, 'g'))) add(m[1] ?? '', m[2] ?? m[3] ?? '');
    if (light['--accent']) return { source: cfg, kind: 'tailwind', light, dark: {} };
    for (const k of Object.keys(light)) delete light[k];
  }
  for (const f of cssFiles(root, '.').filter((c) => c.text.includes('@theme'))) {
    const body = /@theme[^{]*\{([^}]*)\}/.exec(f.text.replace(/\/\*[\s\S]*?\*\//g, ''));
    for (const [name, value] of vars(body?.[1] ?? '')) if (name.startsWith('--color-')) add(name, value);
    if (light['--accent']) return { source: f.rel, kind: 'tailwind', light, dark: {} };
  }
  return null;
}

function appCss(root: string): Pick | null {
  let best: Pick | null = null;
  for (const f of cssFiles(root, '.')) {
    const t = cssTheme(f.text);
    if (!hasCore(t.light) || Object.keys(t.dark).length === 0) continue;
    if (!best || Object.keys(t.light).length > Object.keys(best.light).length) best = { source: f.rel, kind: 'app-css', ...t };
  }
  return best;
}

function jsonColours(v: unknown, key: string, out: Values): void {
  if (typeof v === 'string') { const s = HEX.test(v) ? slotOf(key) : undefined; if (s && out[s] === undefined) out[s] = norm(v); }
  else if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const leaf of ['value', '$value']) if (typeof o[leaf] === 'string') { jsonColours(o[leaf], key, out); return; }
    for (const [k, x] of Object.entries(o)) jsonColours(x, k, out);
  }
}
const BRAND_FILES = new Set(['design-tokens.json', 'tokens.json', 'brand.json', 'brand.css']);
function brand(root: string): Pick | null {
  const files = walk(root, '.', 4).filter((p) => BRAND_FILES.has(path.posix.basename(p)) || (/(^|\/)brand(ing)?\//.test(p) && /\.(css|json)$/.test(p)));
  for (const rel of files) {
    const text = read(root, rel);
    if (text.startsWith(OURS)) continue;
    const light: Values = {};
    if (rel.endsWith('.css')) Object.assign(light, cssTheme(text).light);
    else { try { jsonColours(parseJson(text), '', light); } catch { continue; } }
    if (light['--accent']) return { source: rel, kind: 'brand', light, dark: {} };
  }
  return null;
}

// ---- detection

const PAIRS: [string, string, number][] = [['--ink', '--paper', 4.5], ['--ink', '--panel', 4.5], ['--muted', '--paper', 4.5], ['--accent', '--paper', 4.5], ['--accent', '--panel', 3]];

export function detectTheme(hostRoot: string, docsDir: string | null): Theme {
  const yml = fs.existsSync(path.join(hostRoot, 'mkdocs.yml')) ? read(hostRoot, 'mkdocs.yml') : '';
  const pick = docsCss(hostRoot, docsDir ?? 'docs') ?? material(yml) ?? tailwind(hostRoot) ?? appCss(hostRoot) ?? brand(hostRoot)
    ?? { source: 'fx', kind: 'fx' as const, light: {}, dark: {} };
  const light = { ...FX_LIGHT, ...pick.light };
  const dark = { ...FX_DARK, ...pick.dark };
  const fallbacks: Theme['fallbacks'] = [];
  for (const [name, v, fx] of [['light', light, FX_LIGHT], ['dark', dark, FX_DARK]] as const) {
    const fell = new Set<string>();
    for (const [slot, against, min] of PAIRS) {
      if (fell.has(slot) || (v[slot] === fx[slot] && v[against] === fx[against])) continue;
      const ratio = contrast(v[slot] as string, v[against] as string);
      if (ratio >= min) continue;
      fallbacks.push({ theme: name, slot, against, ratio, used: fx[slot] as string });
      v[slot] = fx[slot] as string;
      fell.add(slot);
    }
  }
  return { source: pick.source, kind: pick.kind, light, dark, fonts: mkdocsFonts(yml), fallbacks };
}

export function themeCss(t: Theme): string {
  const block = (v: Values, pad: string): string => SLOTS.map((s) => `${pad}${s}: ${v[s]};`).join('\n');
  const parts = [
    '/* fx system-flow theme, generated on every build; loads after fx-tokens-1.css */',
    `:root {\n${block(t.light, '  ')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${block(t.dark, '    ')}\n  }\n}`,
    `:root[data-theme="dark"] {\n${block(t.dark, '  ')}\n}`,
  ];
  if (t.fonts.text) parts.push(`html body{font-family:"${t.fonts.text}",system-ui,sans-serif}`);
  if (t.fonts.code) parts.push(`html code,html pre{font-family:"${t.fonts.code}",ui-monospace,monospace}`);
  return `${parts.join('\n')}\n`;
}
