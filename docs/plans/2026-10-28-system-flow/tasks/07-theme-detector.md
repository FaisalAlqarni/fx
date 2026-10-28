# 07: Theme detector and theme.css

**Status:** ready-for-agent
**Blocked by:** 06
**Phase:** Core

**What to build:** the site looks like the rest of the owner's docs. The theme detector finds the repo's design language silently (first hit wins, in the design's order), maps its names onto fx's token slots by role, carries MkDocs Material's `font.text` and `font.code` by family name, checks every text and border pair in both themes, falls back to fx's value for a pair that fails, and lists it. `detect` reports the pick and `--write` saves it as `system_flow.theme`; `build` re-reads the source on every run and writes `<site>/assets/theme.css` that loads after `fx-tokens-1.css`, so the kit file is never edited.

**Design:** Theme detector; Renderers; Error handling

**Files:**
- Create: `src/lib/sf-theme.ts`
- Modify: `src/lib/sf-detect.ts` (fill `theme`; `writeFxJson` saves `system_flow.theme`)
- Modify: `src/lib/sf-build.ts` (write `<site>/assets/theme.css`; add `theme` to `BuildResult`)
- Create: `src/scripts/system-flow-theme.test.ts` (built to `scripts/system-flow-theme.test.js`)
- Modify: `scripts/check-all` (one line)

**Interfaces:**
- Consumes: `detect`, `writeFxJson`, `Detected` (task 06); `build`, `BuildResult` (task 04).
- Produces, `src/lib/sf-theme.ts`:

```ts
export const SLOTS = ['--paper', '--panel', '--ink', '--muted', '--rule', '--code', '--accent', '--accent-tint', '--warn', '--alert', '--violet', '--info', '--info-tint'] as const;
export type Theme = { source: string; kind: 'docs-css' | 'mkdocs-material' | 'tailwind' | 'app-css' | 'brand' | 'fx'; light: Record<string, string>; dark: Record<string, string>; fonts: { text: string | null; code: string | null }; fallbacks: { theme: 'light' | 'dark'; slot: string; against: string; ratio: number; used: string }[] };
export function detectTheme(hostRoot: string, docsDir: string | null): Theme;
export function themeCss(t: Theme): string;            // light block on :root, dark block on the same selectors fx-tokens-1.css uses, then the font rules
export function contrast(a: string, b: string): number; // WCAG ratio rounded to 2 decimals
```

  Pairs checked (decided here; the design names "every text and border pair"): text at 4.5:1 is `--ink` on `--paper`, `--ink` on `--panel`, `--muted` on `--paper`, `--accent` on `--paper`; border at 3:1 is `--accent` on `--panel`. Material colour names map through the Material Design 500 table (`teal` `#009688`, `indigo` `#3f51b5`, `blue` `#2196f3`, and the other 18 named colours); scheme `default` gives paper and panel `#ffffff` and ink `#1f2328`, scheme `slate` gives paper and panel `#1e2129` and ink `#e2e4e9`; a slot the source does not define takes fx's value. A pair is skipped only when both of its values are fx's own. Pairs are checked in the order listed, per theme; once a slot falls back, later pairs use fx's value and the slot is listed once. A Tailwind config is read as text with regular expressions, never `require`d or executed. Fonts (decided here): read from `mkdocs.yml` `theme.font.text` and `theme.font.code` whatever source wins the colours, kept only when they match `^[A-Za-z0-9 ]{1,64}$`; `themeCss` then adds `html body{font-family:"<text>",system-ui,sans-serif}` and `html code,html pre{font-family:"<code>",ui-monospace,monospace}` (the `html` prefix outranks the template's own `body` and `code` rules whatever the load order). No `@import`, `@font-face` or URL is ever written: the family is used only when the reader's machine has it. `BuildResult` gains `theme: { source: string; kind: string; fallbacks: Theme['fallbacks'] }`.

**Seam:** the `system-flow` CLI run as a process (`detect`, `build`).

**Tests:**
- Docs CSS: `docs/assets/docs.css` defining `--bg:#ffffff; --ink:#111111; --accent:#0a7d6e` in `:root` and `--bg:#101010; --ink:#eeeeee; --accent:#3fd0bf` under `[data-theme="dark"]`: `detect` reports `theme: { source: "docs/assets/docs.css", kind: "docs-css" }`; after `build`, `docs/system-flow/assets/theme.css` holds `--paper: #ffffff`, `--ink: #111111`, `--accent: #0a7d6e` in the light block and `--paper: #101010`, `--ink: #eeeeee`, `--accent: #3fd0bf` in the dark block; `fallbacks` is `[]`.
- Failing pair: the same file with dark `--ink:#222222`: `fallbacks` deep-equals `[{ theme: "dark", slot: "--ink", against: "--paper", ratio: 1.2, used: "#e6edf3" }]` and the dark block holds `--ink: #e6edf3`.
- A CSS file under `docs/` without a dark variant is skipped (rule 1 needs one); with no other source, `kind` is `"fx"` and `theme.css` repeats fx's values.
- MkDocs Material: `mkdocs.yml` with `theme: { name: material, palette: [{scheme: default, primary: teal, accent: teal}, {scheme: slate, primary: teal, accent: teal}] }` and no docs CSS: `kind` is `"mkdocs-material"`, `source` is `"mkdocs.yml"`; teal `#009688` is 3.67:1 on `#ffffff` and 4.38:1 on `#1e2129`, so `fallbacks` deep-equals `[{ theme: "light", slot: "--accent", against: "--paper", ratio: 3.67, used: "#0f766e" }, { theme: "dark", slot: "--accent", against: "--paper", ratio: 4.38, used: "#2dd4bf" }]`, and the dark `--ink` is `#e2e4e9`.
- Order: docs CSS and `mkdocs.yml` both present: `kind` is `"docs-css"`.
- Fonts: `mkdocs.yml` with `theme: { name: material, font: { text: Roboto, code: Roboto Mono } }`: `fonts` deep-equals `{ text: "Roboto", code: "Roboto Mono" }` (also when the docs CSS wins the colours); `theme.css` holds `html body{font-family:"Roboto",system-ui,sans-serif}` and `html code,html pre{font-family:"Roboto Mono",ui-monospace,monospace}` and no `@import`, `@font-face` or `url` function.
- Font injection: `font: { text: 'Roboto"}body{color:red' }`: `fonts.text` is `null` and `theme.css` holds no `font-family` rule for text.
- No font: `fonts` is `{ text: null, code: null }` and `theme.css` holds no `font-family`.
- Tailwind v3: `tailwind.config.js` with `theme: { extend: { colors: { primary: '#0a7d6e' } } }`: `kind` is `"tailwind"`, light `--accent` is `#0a7d6e`. Tailwind v4: a CSS file with `@theme { --color-primary: #0a7d6e; }`: the same.
- App CSS: `app/assets/stylesheets/app.css` with `:root { --background: #ffffff; --foreground: #111111; --primary: #0a7d6e }` and a `@media (prefers-color-scheme: dark)` block: `kind` is `"app-css"`.
- Brand: `design-tokens.json` with `{"color": {"primary": "#0a7d6e"}}`: `kind` is `"brand"`.
- Re-read: change the docs CSS accent after `detect --write`, rebuild: `theme.css` holds the new value.

**Risks:** the source CSS is untrusted text: parse custom properties with a strict `--name: <hex>` pattern and ignore everything else, so no value can inject CSS beyond a colour.

**Idempotency:** `theme.css` is generated and rewritten whole on every build; `--write` replaces only `system_flow.theme`.

**Testing:** CLI process tests.

## Acceptance criteria
- [ ] The six sources are tried in the design's order and the report names the one used.
- [ ] Every failing pair falls back to fx's value and is listed.
- [ ] MkDocs fonts reach the site by family name, and nothing is fetched.
- [ ] `fx-tokens-1.css` bytes are unchanged.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/scripts/system-flow-theme.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node scripts/system-flow-theme.test.js`
Expected: `theme` is `null` and no `theme.css` is written.

- [ ] **4. Implement the minimum that passes**

- [ ] **5. Run them: verify GREEN**

Run: same. Expected: `system-flow-theme.test.js: OK`.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope src/lib/sf-theme.ts src/lib/sf-detect.ts src/lib/sf-build.ts`, then `node scripts/system-flow-detect.test.js` and `node scripts/system-flow-build.test.js` under the same prefix

- [ ] **7. Commit by path**

```
git add src/lib/sf-theme.ts lib/sf-theme.js src/lib/sf-detect.ts lib/sf-detect.js src/lib/sf-build.ts lib/sf-build.js src/scripts/system-flow-theme.test.ts scripts/system-flow-theme.test.js scripts/check-all
git commit -m "feat(system-flow): detect the repo's design language and write theme.css with a contrast check"
```

No attribution trailers. Then continue to the next task: never stop and wait.
