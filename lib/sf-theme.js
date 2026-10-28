// generated from src/lib/sf-theme.ts by scripts/build: edit there, not here
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
var sf_theme_exports = {};
__export(sf_theme_exports, {
  SLOTS: () => SLOTS,
  contrast: () => contrast,
  detectTheme: () => detectTheme,
  themeCss: () => themeCss
});
module.exports = __toCommonJS(sf_theme_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("./json.js");
const SLOTS = ["--paper", "--panel", "--ink", "--muted", "--rule", "--code", "--accent", "--accent-tint", "--warn", "--alert", "--violet", "--info", "--info-tint"];
const FX_LIGHT = { "--paper": "#f6f7f9", "--panel": "#ffffff", "--ink": "#14181f", "--muted": "#5b6472", "--rule": "#e3e7ee", "--code": "#eef2f7", "--accent": "#0f766e", "--accent-tint": "#dcf0ed", "--warn": "#a16207", "--alert": "#b45309", "--violet": "#7c3aed", "--info": "#2563eb", "--info-tint": "#e3ecfd" };
const FX_DARK = { "--paper": "#0f1318", "--panel": "#161b22", "--ink": "#e6edf3", "--muted": "#9aa4b2", "--rule": "#2a313b", "--code": "#1f2630", "--accent": "#2dd4bf", "--accent-tint": "#123a37", "--warn": "#fbbf24", "--alert": "#fdba74", "--violet": "#c9a2ff", "--info": "#93c5fd", "--info-tint": "#1a2a45" };
const ALIASES = {
  "--paper": ["paper", "bg", "background", "page", "body-bg"],
  "--panel": ["panel", "surface", "card", "bg-alt", "bg-secondary"],
  "--ink": ["ink", "text", "fg", "foreground", "text-primary"],
  "--muted": ["muted", "text-muted", "muted-foreground", "fg-muted", "text-secondary"],
  "--rule": ["rule", "border", "line", "divider"],
  "--code": ["code", "code-bg"],
  "--accent": ["accent", "primary", "brand"],
  "--accent-tint": ["accent-tint", "accent-soft", "primary-tint"],
  "--warn": ["warn", "warning"],
  "--alert": ["alert", "danger", "error", "destructive"],
  "--violet": ["violet", "purple"],
  "--info": ["info"],
  "--info-tint": ["info-tint"]
};
const slotOf = (name) => {
  const n = name.toLowerCase().replace(/^-+/, "").replace(/^color-/, "");
  return SLOTS.find((s) => ALIASES[s].includes(n));
};
const MATERIAL = {
  red: "#f44336",
  pink: "#e91e63",
  purple: "#9c27b0",
  "deep purple": "#673ab7",
  indigo: "#3f51b5",
  blue: "#2196f3",
  "light blue": "#03a9f4",
  cyan: "#00bcd4",
  teal: "#009688",
  green: "#4caf50",
  "light green": "#8bc34a",
  lime: "#cddc39",
  yellow: "#ffeb3b",
  amber: "#ffc107",
  orange: "#ff9800",
  "deep orange": "#ff5722",
  brown: "#795548",
  grey: "#9e9e9e",
  "blue grey": "#607d8b"
};
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const norm = (h) => {
  const x = h.toLowerCase();
  return x.length === 4 ? `#${x[1]}${x[1]}${x[2]}${x[2]}${x[3]}${x[3]}` : x;
};
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(norm(h).slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)];
  return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100;
}
function rules(css, inDark = false) {
  const out = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let i = 0;
  for (; ; ) {
    const open = text.indexOf("{", i);
    if (open < 0) return out;
    let depth = 1;
    let j = open + 1;
    for (; j < text.length && depth > 0; j++) depth += text[j] === "{" ? 1 : text[j] === "}" ? -1 : 0;
    const selector = text.slice(i, open).replace(/^[\s;}]+/, "").trim();
    const body = text.slice(open + 1, j - 1);
    if (selector.startsWith("@media")) out.push(...rules(body, inDark || /prefers-color-scheme:\s*dark/.test(selector)));
    else if (!selector.startsWith("@")) out.push({ selector, body, dark: inDark || /\[data-(?:bs-)?theme=["']?dark["']?\]|\.(?:theme-)?dark\b/.test(selector) });
    i = j;
  }
}
const vars = (body) => [...body.matchAll(/(?:^|[;{\s])(--[A-Za-z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6})\s*(?=;|$)/g)].map((m) => [m[1], norm(m[2])]);
function cssTheme(text) {
  const out = { light: {}, dark: {} };
  for (const r of rules(text)) {
    if (!/(^|[\s,])(:root|html|body)\b|^\[data-theme|^\.dark/.test(r.selector)) continue;
    for (const [name, value] of vars(r.body)) {
      const slot = slotOf(name);
      if (slot) out[r.dark ? "dark" : "light"][slot] = value;
    }
  }
  return out;
}
const hasCore = (v) => ["--paper", "--ink", "--accent"].every((s) => v[s] !== void 0);
const SKIP = /* @__PURE__ */ new Set(["node_modules", ".git", "vendor", "dist", "build", "tmp", "coverage"]);
function walk(root, dir, depth, out = []) {
  if (depth < 0 || !fs.existsSync(path.join(root, dir))) return out;
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name) && !e.name.startsWith(".")) walk(root, path.posix.join(dir, e.name), depth - 1, out);
    } else if (e.isFile()) out.push(path.posix.join(dir, e.name));
  }
  return out;
}
const read = (root, rel) => {
  const f = path.join(root, rel);
  return fs.statSync(f).size > 1e6 ? "" : fs.readFileSync(f, "utf8");
};
const OURS = "/* fx ";
const cssFiles = (root, dir) => walk(root, dir, 6).filter((p) => p.endsWith(".css")).map((rel) => ({ rel, text: read(root, rel) })).filter((f) => !f.text.startsWith(OURS));
function docsCss(root, docsDir) {
  for (const f of cssFiles(root, docsDir)) {
    const t = cssTheme(f.text);
    if (hasCore(t.light) && Object.keys(t.dark).length > 0) return { source: f.rel, kind: "docs-css", ...t };
  }
  return null;
}
const blockOf = (yml, key) => {
  const m = new RegExp(`^( *)${key}:(.*)$`, "m").exec(yml);
  if (!m) return null;
  const rest = yml.slice((m.index ?? 0) + m[0].length).split("\n").slice(1);
  const body = [m[2] ?? ""];
  for (const line of rest) {
    if (line.trim() !== "" && line.search(/\S/) <= (m[1] ?? "").length) break;
    body.push(line);
  }
  return body.join("\n");
};
const scalar = (text, key) => {
  const m = new RegExp(`(?:^|[\\s{,])${key}:\\s*(?:'([^']*)'|"([^"]*)"|([^,}\\n#]+))`).exec(text);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : null;
};
function mkdocsFonts(yml) {
  const font = blockOf(yml, "font") ?? "";
  const pick = (k) => {
    const v = scalar(font, k);
    return v !== null && /^[A-Za-z0-9 ]{1,64}$/.test(v) && v !== "false" ? v : null;
  };
  return { text: pick("text"), code: pick("code") };
}
function material(yml) {
  const palette = blockOf(yml, "palette");
  if (palette === null) return null;
  const parts = palette.split(/^\s*-\s+/m).slice(1);
  const light = {};
  const dark = {};
  let found = false;
  for (const e of parts.length ? parts : [palette]) {
    const scheme = scalar(`
${e}`, "scheme") ?? "default";
    const target = scheme === "slate" ? dark : light;
    const name = (scalar(`
${e}`, "accent") ?? scalar(`
${e}`, "primary") ?? "").toLowerCase().replace(/[-_]/g, " ");
    if (MATERIAL[name]) target["--accent"] = MATERIAL[name];
    Object.assign(target, scheme === "slate" ? { "--paper": "#1e2129", "--panel": "#1e2129", "--ink": "#e2e4e9" } : { "--paper": "#ffffff", "--panel": "#ffffff", "--ink": "#1f2328" });
    found = true;
  }
  return found ? { source: "mkdocs.yml", kind: "mkdocs-material", light, dark } : null;
}
const TAILWIND_NAMES = "(primary|accent|brand|background|foreground|muted|border)";
function tailwind(root) {
  const light = {};
  const add = (name, value) => {
    const s = slotOf(name);
    if (s && light[s] === void 0) light[s] = norm(value);
  };
  const cfg = ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs", "tailwind.config.ts"].find((n) => fs.existsSync(path.join(root, n)));
  if (cfg) {
    const text = read(root, cfg);
    for (const m of text.matchAll(new RegExp(`['"]?${TAILWIND_NAMES}['"]?\\s*:\\s*(?:['"](#[0-9a-fA-F]{3,6})['"]|\\{[^}]*?DEFAULT\\s*:\\s*['"](#[0-9a-fA-F]{3,6})['"])`, "g"))) add(m[1] ?? "", m[2] ?? m[3] ?? "");
    if (light["--accent"]) return { source: cfg, kind: "tailwind", light, dark: {} };
    for (const k of Object.keys(light)) delete light[k];
  }
  for (const f of cssFiles(root, ".").filter((c) => c.text.includes("@theme"))) {
    const body = /@theme[^{]*\{([^}]*)\}/.exec(f.text.replace(/\/\*[\s\S]*?\*\//g, ""));
    for (const [name, value] of vars(body?.[1] ?? "")) if (name.startsWith("--color-")) add(name, value);
    if (light["--accent"]) return { source: f.rel, kind: "tailwind", light, dark: {} };
  }
  return null;
}
function appCss(root) {
  let best = null;
  for (const f of cssFiles(root, ".")) {
    const t = cssTheme(f.text);
    if (!hasCore(t.light) || Object.keys(t.dark).length === 0) continue;
    if (!best || Object.keys(t.light).length > Object.keys(best.light).length) best = { source: f.rel, kind: "app-css", ...t };
  }
  return best;
}
function jsonColours(v, key, out) {
  if (typeof v === "string") {
    const s = HEX.test(v) ? slotOf(key) : void 0;
    if (s && out[s] === void 0) out[s] = norm(v);
  } else if (v && typeof v === "object") {
    const o = v;
    for (const leaf of ["value", "$value"]) if (typeof o[leaf] === "string") {
      jsonColours(o[leaf], key, out);
      return;
    }
    for (const [k, x] of Object.entries(o)) jsonColours(x, k, out);
  }
}
const BRAND_FILES = /* @__PURE__ */ new Set(["design-tokens.json", "tokens.json", "brand.json", "brand.css"]);
function brandFile(root, rel) {
  const text = read(root, rel);
  if (text.startsWith(OURS)) return null;
  const light = {};
  if (rel.endsWith(".css")) Object.assign(light, cssTheme(text).light);
  else {
    try {
      jsonColours((0, import_json.parseJson)(text), "", light);
    } catch {
      return null;
    }
  }
  return light["--accent"] ? { source: rel, kind: "brand", light, dark: {} } : null;
}
function brand(root) {
  const files = walk(root, ".", 4).filter((p) => BRAND_FILES.has(path.posix.basename(p)) || /(^|\/)brand(ing)?\//.test(p) && /\.(css|json)$/.test(p));
  for (const rel of files) {
    const p = brandFile(root, rel);
    if (p) return p;
  }
  return null;
}
function chosenPick(root, docsDir, yml, c) {
  if (c.kind === "fx") return { source: "fx", kind: "fx", light: {}, dark: {} };
  if (c.kind === "mkdocs-material") return material(yml);
  if (c.kind === "tailwind") {
    const t2 = tailwind(root);
    return t2?.source === c.source ? t2 : null;
  }
  if (c.kind === "docs-css" && !c.source.startsWith(`${docsDir}/`)) return null;
  const file = path.resolve(root, c.source);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  if (c.kind === "brand") return brandFile(root, c.source);
  const t = cssTheme(read(root, c.source));
  return hasCore(t.light) && Object.keys(t.dark).length > 0 ? { source: c.source, kind: c.kind, ...t } : null;
}
const PAIRS = [["--ink", "--paper", 4.5], ["--ink", "--panel", 4.5], ["--muted", "--paper", 4.5], ["--accent", "--paper", 4.5], ["--accent", "--panel", 3]];
function detectTheme(hostRoot, docsDir, chosen) {
  const yml = fs.existsSync(path.join(hostRoot, "mkdocs.yml")) ? read(hostRoot, "mkdocs.yml") : "";
  const fromChoice = chosen === void 0 ? void 0 : chosenPick(hostRoot, docsDir ?? "docs", yml, chosen);
  if (chosen !== void 0 && !fromChoice) throw new Error(`.fx.json system_flow.theme names ${chosen.source} (${chosen.kind}), which gives no theme now; fix it, or remove the key to detect again`);
  const pick = fromChoice ?? docsCss(hostRoot, docsDir ?? "docs") ?? material(yml) ?? tailwind(hostRoot) ?? appCss(hostRoot) ?? brand(hostRoot) ?? { source: "fx", kind: "fx", light: {}, dark: {} };
  const light = { ...FX_LIGHT, ...pick.light };
  const dark = { ...FX_DARK, ...pick.dark };
  const fallbacks = [];
  for (const [name, v, fx] of [["light", light, FX_LIGHT], ["dark", dark, FX_DARK]]) {
    const fell = /* @__PURE__ */ new Set();
    for (const [slot, against, min] of PAIRS) {
      if (fell.has(slot) || v[slot] === fx[slot] && v[against] === fx[against]) continue;
      const ratio = contrast(v[slot], v[against]);
      if (ratio >= min) continue;
      fallbacks.push({ theme: name, slot, against, ratio, used: fx[slot] });
      v[slot] = fx[slot];
      fell.add(slot);
    }
  }
  return { source: pick.source, kind: pick.kind, light, dark, fonts: mkdocsFonts(yml), fallbacks };
}
function themeCss(t) {
  const block = (v, pad) => SLOTS.map((s) => `${pad}${s}: ${v[s]};`).join("\n");
  const parts = [
    "/* fx system-flow theme, generated on every build; loads after fx-tokens-1.css */",
    `:root {
${block(t.light, "  ")}
}`,
    `@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${block(t.dark, "    ")}
  }
}`,
    `:root[data-theme="dark"] {
${block(t.dark, "  ")}
}`
  ];
  if (t.fonts.text) parts.push(`html body{font-family:"${t.fonts.text}",system-ui,sans-serif}`);
  if (t.fonts.code) parts.push(`html code,html pre{font-family:"${t.fonts.code}",ui-monospace,monospace}`);
  return `${parts.join("\n")}
`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SLOTS,
  contrast,
  detectTheme,
  themeCss
});
