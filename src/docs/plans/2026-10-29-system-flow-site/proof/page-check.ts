// Run: NODE_PATH=<PW>/node_modules PLAYWRIGHT_BROWSERS_PATH=<PW>/browsers node docs/plans/2026-10-29-system-flow-site/proof/page-check.js <index.html> <out.json>
// Site mode: ... page-check.js --site <index.html> <out.json> runs only the checks that find their own targets on any built
// site (arrowStyle, fitAt1440, panelEscape, termLinks, deepTheme); the default mode runs them too, after checks bound to the fixture's ids.
// A11y mode: ... page-check.js --a11y <index.html> <out.json> runs only the accessibility checks; the default and --site modes run them last.
// Measure mode: ... page-check.js --measure owner|fx [--out-dir <dir>] <index.html> <out.json> prints no checks of its own; it writes the
// numbers of the design's Proof table (see measure() below) and, with --out-dir, one screenshot per width and theme.
// Opens a built system flow site in Chromium and checks the page shell: the sticky menu, the scroll spy,
// the phone top bar, a resize across 900px, the menu without JavaScript, page width, theme, evidence
// and console errors; the menu filter and a term link; then the figure cards and the fx-flow-2 player: the buttons, autoplay, pause and
// resume, the bar staying on screen, sideways scrolling, label size and a figure with no steps. Writes one JSON object of named checks, each { pass, detail }; exits 1 when any fails.
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

type Check = { pass: boolean; detail: string };
// The DOM names the page.evaluate callbacks use, declared module-local: a `/// <reference lib="dom" />`
// line would give DOM globals to every Node source under src/ (tests/gates/ts-toolchain.test.sh).
type Rect = { top: number; bottom: number; left: number; width: number; height: number };
type El = {
  getBoundingClientRect(): Rect; tagName: string; inert: boolean; getAttribute(n: string): string | null; hasAttribute(n: string): boolean; scrollTop: number; scrollHeight: number; clientHeight: number; open: boolean;
  textContent: string | null; className: string; disabled: boolean; scrollLeft: number; scrollWidth: number; clientWidth: number; id: string; innerHTML: string;
  querySelector(s: string): El | null; querySelectorAll(s: string): Iterable<El>; append(e: El): void; contains(e: El): boolean; closest(s: string): El | null; setAttribute(n: string, v: string): void; remove(): void;
};
declare const getComputedStyle: (e: El) => { fontSize: string; stroke: string };
declare const fxFlow: { mount(root?: El): void };
declare const document: {
  createElement(tag: string): El; body: El;
  getElementById(id: string): El | null; querySelector(s: string): El | null; querySelectorAll(s: string): Iterable<El>; elementFromPoint(x: number, y: number): El | null;
  documentElement: { scrollHeight: number; scrollWidth: number; dataset: Record<string, string | undefined> }; activeElement: unknown;
};
declare const window: { scrollY: number; innerHeight: number; innerWidth: number; scrollTo(o: { top: number; behavior: 'instant' }): void };
declare const localStorage: { getItem(k: string): string | null };
declare const location: { hash: string; pathname: string; reload(): void };
declare const history: { replaceState(data: null, unused: string, url: string): void };
type Page = {
  goto(url: string): Promise<unknown>;
  evaluate<T, A = unknown>(fn: (arg: A) => T, arg?: A): Promise<T>;
  setViewportSize(s: { width: number; height: number }): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  click(sel: string): Promise<void>;
  fill(sel: string, value: string): Promise<void>;
  press(sel: string, key: string): Promise<void>;
  focus(sel: string): Promise<void>;
  keyboard: { press(key: string): Promise<void> };
  isVisible(sel: string): Promise<boolean>;
  on(ev: string, fn: (x: { type?: () => string; text?: () => string; message?: string }) => void): void;
  screenshot(o: { path: string }): Promise<unknown>;
};
type Context = { newPage(): Promise<Page>; close(): Promise<void> };
type Browser = { newContext(o: object): Promise<Context>; close(): Promise<void>; version(): string };

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, v === undefined ? 1 : 2);
  return v ?? '';
};
const siteOnly = args.includes('--site');
if (siteOnly) args.splice(args.indexOf('--site'), 1);
// --a11y runs only the accessibility checks (a11y() below), on any built site.
const a11yOnly = args.includes('--a11y');
if (a11yOnly) args.splice(args.indexOf('--a11y'), 1);
const measureProfile = flag('--measure');
const outDir = flag('--out-dir');
const [file, out] = args;
if (file === undefined || out === undefined || (siteOnly && measureProfile !== undefined) || (measureProfile !== undefined && measureProfile !== 'owner' && measureProfile !== 'fx')) {
  process.stderr.write('usage: page-check.js [--site | --a11y | --measure owner|fx] [--out-dir <dir>] <index.html> <out.json>\n');
  process.exit(2);
}
const url = pathToFileURL(path.resolve(file)).href;
const { chromium } = require('playwright') as { chromium: { launch(): Promise<Browser> } }; // ts-gate-ok: Playwright comes from NODE_PATH, not a dependency
const results: Record<string, Check> = {};
const record = (name: string, pass: boolean, detail: string): void => { results[name] = { pass, detail }; };

async function open(browser: Browser, width: number, height: number, js = true, reducedMotion: 'reduce' | 'no-preference' = 'no-preference', colorScheme: 'light' | 'dark' = 'light'): Promise<{ page: Page; ctx: Context; errors: string[] }> {
  const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js, reducedMotion, colorScheme });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type?.() === 'error') errors.push(m.text?.() ?? ''); });
  page.on('pageerror', (e) => { errors.push(e.message ?? String(e)); });
  await page.goto(url);
  await page.waitForTimeout(300);
  return { page, ctx, errors };
}
// Puts the chapter's top at 30% of the window, so the middle band (40% to 45%) lies inside it; returns the scrollY it set.
const toMiddle = (page: Page, id: string): Promise<number> => page.evaluate((cid: string) => {
  const el = document.getElementById(cid);
  if (!el) return -1;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3, behavior: 'instant' });
  return window.scrollY;
}, id);
const linkState = (page: Page, id: string) => page.evaluate((cid: string) => {
  const a = document.querySelector(`#menu a[href="#${cid}"]`);
  const menu = document.getElementById('menu');
  if (!a || !menu) return null;
  const r = a.getBoundingClientRect(), m = menu.getBoundingClientRect();
  return { current: a.getAttribute('aria-current'), inside: r.top >= m.top - 1 && r.bottom <= m.bottom + 1, scrollY: window.scrollY, menuTop: menu.scrollTop, menuH: menu.clientHeight, menuFull: menu.scrollHeight };
}, id);
const box = (page: Page, sel: string) => page.evaluate((s: string) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, width: r.width, height: r.height };
}, sel);
// The menu as the filter left it: chapter links not hidden, parts with the chapter link they sit under, terms with their link, the count line.
type MenuState = { chapters: string[]; parts: { text: string; under: string }[]; terms: string[]; count: string };
const menuState = (page: Page): Promise<MenuState> => page.evaluate(() => {
  const shown = (e: El): boolean => e.closest('[hidden]') === null;
  const all = (s: string): El[] => [...document.querySelectorAll(s)].filter(shown);
  return {
    chapters: all('#menu li:not(.part):not(.term) > a').map((a) => a.getAttribute('href') ?? ''),
    parts: all('#menu li.part').map((li) => ({ text: li.textContent ?? '', under: li.closest('li:not(.part)')?.querySelector('a')?.getAttribute('href') ?? '' })),
    terms: all('#menu li.term a').map((a) => a.getAttribute('href') ?? ''),
    count: document.getElementById('filter-count')?.textContent ?? '',
  };
});
// The player's bar of one card: count, narration, the play button's text and aria-pressed, and the disabled buttons.
type Bar = { count: string; narr: string; play: string; pressed: boolean; disabled: string[] };
const bar = (page: Page, key: string): Promise<Bar | null> => page.evaluate((k: string) => {
  const ctl = document.querySelector(`#fig-${k} .ctl`);
  if (!ctl) return null;
  const q = (s: string): El | null => ctl.querySelector(s);
  return { count: q('.count')?.textContent ?? '', narr: q('.narr')?.textContent ?? '', play: q('button.play')?.textContent ?? '', pressed: q('button.play')?.hasAttribute('aria-pressed') ?? true,
    disabled: [...ctl.querySelectorAll('button')].filter((b) => b.disabled).map((b) => b.className) };
}, key);
const press = (page: Page, key: string, button: string): Promise<void> => page.click(`#fig-${key} .ctl button.${button}`);
const count = async (page: Page, key: string): Promise<string> => (await bar(page, key))?.count ?? 'no bar';
// Polls every 50 ms until the count reads `want`; returns whether it did within `ms`.
async function until(page: Page, key: string, want: (c: string) => boolean, ms: number): Promise<boolean> {
  for (let t = 0; t <= ms; t += 50) { if (want(await count(page, key))) return true; await page.waitForTimeout(50); }
  return false;
}
// Puts the top of a card's .fig at the window's middle, inside the autoplay band.
const figToMiddle = (page: Page, key: string): Promise<void> => page.evaluate((k: string) => {
  const el = document.querySelector(`#fig-${k} .fig`);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2, behavior: 'instant' });
}, key);
// Scrolls until no part of the card is visible (above the card when the page allows, else below it); returns whether none is.
const cardAway = (page: Page, key: string): Promise<boolean> => page.evaluate((k: string) => {
  const c = document.getElementById(`fig-${k}`);
  if (!c) return false;
  const r = c.getBoundingClientRect();
  const up = r.top + window.scrollY - window.innerHeight - 20;
  window.scrollTo({ top: up >= 0 ? up : r.bottom + window.scrollY + 20, behavior: 'instant' });
  const n = c.getBoundingClientRect();
  return n.bottom <= 0 || n.top >= window.innerHeight;
}, key);
const isOpen = (page: Page) => page.evaluate(() => document.getElementById('menu-bar')?.open ?? null);

// The checks that find their targets on the page itself, so they run on any built site. `fixture` also requires the
// fixture's turn to draw a reply and a leaving call; a real site may have neither.
async function siteChecks(browser: Browser, consoleErrors: string[], fixture: boolean): Promise<void> {
  // Lifeline styling of every sequence card against its rows in #diagrams, and each store node's cap line, 1440 x 900, reduced motion on.
  {
    const { page, ctx, errors } = await open(browser, 1440, 900, true, 'reduce');
    type Arrow = { dash: string | null; stroke: string | null; computed: string; width: string | null };
    type Row = { reply: boolean; leaves: boolean };
    const arrows = (k: string): Promise<Arrow[]> => page.evaluate((key: string) => [...document.querySelectorAll(`#fig-${key} svg path[marker-end]`)].map((p) => ({
      dash: p.getAttribute('stroke-dasharray'), stroke: p.getAttribute('stroke'), computed: getComputedStyle(p).stroke, width: p.getAttribute('stroke-width'),
    })), k);
    const specs = await page.evaluate(() => JSON.parse(document.getElementById('diagrams')?.textContent ?? '{}') as Record<string, { rows?: Row[]; nodes: { look: string }[] }>); // ts-gate-ok: the page's own figure data
    const seqs = await page.evaluate(() => [...document.querySelectorAll('figure.card[id^="fig-seq-"]')].map((c) => c.id.slice(4)));
    const bad: string[] = [];
    let replies = 0, leaves = 0, plainComputed = '';
    for (const k of seqs) {
      const rows = specs[k]?.rows ?? [];
      const got = await arrows(k);
      if (got.length !== rows.length) { bad.push(`${k}: ${got.length} arrows for ${rows.length} rows`); continue; }
      rows.forEach((r, i) => {
        const a = got[i] as Arrow;
        // A leaving call is dash-dot (a11y 11: not colour alone), a reply dashed, any other arrow solid.
        const dash = r.leaves ? '12 4 2 4' : r.reply ? '6 4' : null;
        if (a.dash !== dash) bad.push(`${k} #${i + 1}: reply ${r.reply}, leaves ${r.leaves}, dash ${a.dash} (want ${dash})`);
        if (r.leaves && (a.stroke !== 'var(--warn)' || a.width !== '2.4')) bad.push(`${k} #${i + 1}: leaving call stroke ${a.stroke}, width ${a.width}`);
        if (!r.leaves && (a.stroke === 'var(--warn)' || a.width !== '1.6')) bad.push(`${k} #${i + 1}: plain arrow stroke ${a.stroke}, width ${a.width}`);
        if (r.reply) replies++;
        if (r.leaves) leaves++;
        if (!r.leaves && !plainComputed) plainComputed = a.computed;
      });
      for (const [i, r] of rows.entries()) if (r.leaves && (got[i] as Arrow).computed === plainComputed) bad.push(`${k} #${i + 1}: leaving call drawn in the plain colour ${plainComputed}`);
    }
    // After Next on the first sequence with two rows: the first arrow is active (2.8), the second keeps its rest width.
    const first = seqs.find((k) => (specs[k]?.rows ?? []).length >= 2);
    let active = 'no sequence with 2 rows';
    if (first !== undefined) {
      await press(page, first, 'next');
      const after = await arrows(first);
      const rest = (specs[first]?.rows ?? [])[1]?.leaves ? '2.4' : '1.6';
      if (after[0]?.width !== '2.8' || after[1]?.width !== rest) bad.push(`${first} after Next: widths ${after[0]?.width}, ${after[1]?.width} (want 2.8, ${rest})`);
      active = `${first} after Next: ${after[0]?.width}, ${after[1]?.width}`;
    }
    const levels = await page.evaluate(() => [...document.querySelectorAll('figure.card[id^="fig-level-"]')].map((c) => ({ k: c.id.slice(4), caps: [...c.querySelectorAll('svg g > path[stroke-width="1.2"]')].length })));
    const capBad = levels.filter((l) => l.caps !== (specs[l.k]?.nodes ?? []).filter((n) => n.look === 'store').length);
    const stores = levels.reduce((n, l) => n + l.caps, 0);
    const pass = seqs.length > 0 && first !== undefined && bad.length === 0 && capBad.length === 0 && (!fixture || (replies > 0 && leaves > 0 && stores > 0));
    record('arrowStyle', pass,
      `${seqs.length} sequence cards: ${replies} reply arrows dashed, ${leaves} leaving calls in var(--warn) at 2.4 (computed ${leaves ? 'differs from' : 'no leaving call to compare with'} plain ${plainComputed}); ${active}; ${stores} cap lines in ${levels.length} level cards${bad.length ? `; wrong: ${bad.slice(0, 8).join('; ')}` : ''}${capBad.length ? `; cap lines off in ${capBad.map((l) => l.k).join(', ')}` : ''}`);
    consoleErrors.push(...errors.map((x) => `arrowStyle: ${x}`));
    await ctx.close();
  }

  // The 860 rule at 1440 x 900: a figure at most 860 px wide fits inside its card without a scrollbar.
  {
    const { page, ctx } = await open(browser, 1440, 900, true, 'reduce');
    const figs = await page.evaluate(() => [...document.querySelectorAll('.card')].map((c) => {
      const fig = c.querySelector('.fig'), svg = c.querySelector('.fig svg');
      return { id: c.id, svg: svg ? svg.getBoundingClientRect().width : -1, sw: fig?.scrollWidth ?? 0, cw: fig?.clientWidth ?? 0 };
    }));
    const small = figs.filter((g) => g.svg > 0 && g.svg <= 860);
    const bad = small.filter((g) => g.sw > g.cw);
    record('fitAt1440', small.length > 0 && bad.length === 0,
      small.length === 0 ? 'no figure at most 860 px wide found' : `${small.length} figures at most 860 px: ${small.map((g) => `${g.id} ${Math.round(g.svg)} in ${g.cw}`).join(', ')}${bad.length ? `; overflow: ${bad.map((g) => `${g.id} ${g.sw}>${g.cw}`).join(', ')}` : ''}`);
    await ctx.close();
  }

  // Escape on the open phone panel closes it and returns focus to the summary (a key pressed on the first panel link, not on the filter).
  {
    const { page, ctx } = await open(browser, 390, 844);
    await page.click('#menu-bar > summary');
    const opened = (await isOpen(page)) === true;
    await page.press('#menu a >> nth=0', 'Escape');
    await page.waitForTimeout(100);
    const after = await page.evaluate(() => ({ open: document.getElementById('menu-bar')?.open ?? null, focus: document.activeElement === document.querySelector('#menu-bar > summary') }));
    record('panelEscape', opened && after.open === false && after.focus, `opened ${opened}; after Escape: open ${after.open}, focus on summary ${after.focus}`);
    await ctx.close();
  }
}

// Every term link, clicked from the page top at 1440 x 900 and 390 x 844, leaves its glossary row fully in the window and
// clear of the sticky menu and bar: the points just inside the row's top and bottom edges hit the row itself.
async function termLinks(browser: Browser): Promise<void> {
  const lines: string[] = [];
  let pass = true;
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    const { page, ctx } = await open(browser, w, h);
    const n = await page.evaluate(() => [...document.querySelectorAll('main a.term')].length);
    const bad: string[] = [];
    for (let i = 0; i < n; i++) {
      await page.evaluate(() => { history.replaceState(null, '', location.pathname); window.scrollTo({ top: 0, behavior: 'instant' }); });
      await page.click(`main a.term >> nth=${i}`);
      // Smooth scrolling ends when scrollY holds still for 400 ms.
      let last = -1, still = 0;
      for (let t = 0; t < 10000 && still < 400; t += 100) {
        await page.waitForTimeout(100);
        const y = await page.evaluate(() => window.scrollY);
        still = y === last ? still + 100 : 0;
        last = y;
      }
      const r = await page.evaluate(() => {
        const row = document.getElementById(location.hash.slice(1));
        if (!row) return { id: location.hash, top: NaN, bottom: NaN, hit: false };
        const b = row.getBoundingClientRect();
        const inside = (y: number): boolean => { const e = document.elementFromPoint(b.left + 6, y); return e !== null && row.contains(e); };
        return { id: row.id, top: Math.round(b.top), bottom: Math.round(b.bottom), hit: b.top >= 0 && b.bottom <= window.innerHeight && inside(b.top + 3) && inside(b.bottom - 3) };
      });
      if (!r.hit) bad.push(`#${i + 1} ${r.id} top ${r.top} bottom ${r.bottom}`);
    }
    if (n === 0 || bad.length) pass = false;
    lines.push(`${w}: ${n - bad.length} of ${n} land in view${bad.length ? ` (out: ${bad.join(', ')})` : ''}`);
    await ctx.close();
  }
  record('termLinks', pass, lines.join('; '));
}

// Every fx SVG deep page (it links ../assets/theme.css; archify pages bring their own toggle) has the index's theme button:
// a click flips data-theme, stores it under fx-theme, and the page opened again keeps it.
async function deepTheme(browser: Browser): Promise<void> {
  const index = path.resolve(file as string);
  const html = fs.readFileSync(index, 'utf8');
  const deep = [...new Set([...html.matchAll(/<a class="deep" href="(diagrams\/[^"]+\.html)"/g)].map((m) => m[1] as string))];
  const ours = deep.filter((rel) => fs.existsSync(path.join(path.dirname(index), rel)) && fs.readFileSync(path.join(path.dirname(index), rel), 'utf8').includes('href="../assets/theme.css"'));
  const bad: string[] = [];
  for (const rel of ours) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const href = pathToFileURL(path.join(path.dirname(index), rel)).href;
    await page.goto(href);
    const has = await page.isVisible('#theme');
    if (!has) { bad.push(`${rel}: no #theme`); await ctx.close(); continue; }
    const before = await page.evaluate(() => document.documentElement.dataset.theme ?? '');
    await page.click('#theme');
    const after = await page.evaluate(() => [document.documentElement.dataset.theme ?? '', localStorage.getItem('fx-theme') ?? '']);
    await page.goto(href);
    const kept = await page.evaluate(() => document.documentElement.dataset.theme ?? '');
    if (after[0] === before || after[0] === '' || after[1] !== after[0] || kept !== after[0]) bad.push(`${rel}: ${before || 'system'} then ${after.join('/')}, reopened ${kept}`);
    await ctx.close();
  }
  record('deepTheme', ours.length > 0 && bad.length === 0, ours.length === 0 ? 'no fx SVG deep page found' : `${ours.length - bad.length} of ${ours.length} SVG deep pages toggle and keep the theme${bad.length ? `; ${bad.join('; ')}` : ''}`);
}

// The final review's accessibility findings (findings/final-lens-a11y.md), checked by keyboard and computed style on any built site.
async function a11y(browser: Browser): Promise<void> {
  const focused = (page: Page) => page.evaluate(() => {
    const a = document.activeElement as El | null;
    return a === null ? '' : `${a.tagName.toLowerCase()}${a.id ? `#${a.id}` : ''}${a.className ? `.${a.className}` : ''} in ${a.closest('[id]')?.id ?? ''}`;
  });
  // 1 and 2: below 900 px, a menu link closes the panel and focus lands on the target's heading; main is inert while the panel is open.
  {
    const { page, ctx } = await open(browser, 390, 844);
    const href = await page.evaluate(() => [...document.querySelectorAll('#menu ol a')].pop()?.getAttribute('href') ?? '');
    await page.press('#menu-bar > summary', 'Enter');
    const inertOpen = await page.evaluate(() => document.querySelector('main')?.inert ?? null);
    await page.press(`#menu a[href="${href}"]`, 'Enter');
    await page.waitForTimeout(500);
    const after = await page.evaluate((h: string) => ({
      open: document.getElementById('menu-bar')?.open ?? null, inert: document.querySelector('main')?.inert ?? null,
      onHeading: document.activeElement === document.querySelector(`${h} h2`),
    }), href);
    record('menuLinkFocus', after.open === false && after.onHeading, `${href} by Enter at 390: panel open ${after.open}, focus on its h2 ${after.onHeading} (${await focused(page)})`);
    record('panelInert', inertOpen === true && after.inert === false, `main inert with the panel open ${inertOpen}, after it closes ${after.inert}`);
    await ctx.close();
  }
  // Review N1: the panel opened at 390 and the window widened to 1440 leaves main usable, an evidence summary takes a click.
  {
    const { page, ctx } = await open(browser, 390, 844);
    await page.click('#menu-bar > summary');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    const inert = await page.evaluate(() => document.querySelector('main')?.inert ?? null);
    let clicked = 'clicked';
    await Promise.race([page.click('details.evidence > summary'), page.waitForTimeout(2000).then(() => { throw new Error('click timed out'); })]).catch((e: unknown) => { clicked = e instanceof Error ? e.message : String(e); });
    const opened = await page.evaluate(() => document.querySelector('details.evidence')?.open ?? null);
    record('widenInert', inert === false && opened === true, `menu opened at 390, widened to 1440: main inert ${inert}; first evidence summary ${clicked}, open ${opened}`);
    await ctx.close();
  }
  // 14: the first Tab reaches a skip link to main; the menu's own padding leaves room for the 5 px focus ring.
  {
    const { page, ctx } = await open(browser, 1440, 900);
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => {
      const a = document.activeElement as El | null;
      const r = a?.getBoundingClientRect();
      return { href: a?.getAttribute('href') ?? '', shown: r !== undefined && r.width > 1 && r.top >= 0 };
    });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const onMain = await page.evaluate(() => document.activeElement === document.querySelector('main#main'));
    record('skipLink', first.href === '#main' && first.shown && onMain, `first Tab: ${first.href || 'no link'}, visible ${first.shown}; Enter puts focus on main#main ${onMain}`);
    const ring = await page.evaluate(() => {
      const m = document.getElementById('menu')?.getBoundingClientRect(), a = document.querySelector('#menu ol a')?.getBoundingClientRect();
      return m === undefined || a === undefined ? null : { left: Math.round(a.left - m.left), right: Math.round(m.left + m.width - (a.left + a.width)) };
    });
    record('menuRing', ring !== null && ring.left >= 5 && ring.right >= 5, `menu link to menu edge: ${ring?.left} px start, ${ring?.right} px end (the ring needs 5)`);
    await ctx.close();
  }
  // 3: sticky bars cannot cover a focused item: scroll padding under the phone bar, and a card's focusable parts keep
  // a scroll margin at least as tall as the card's bar. 5: the filter count stays in the tree while empty.
  {
    const lines: string[] = [];
    let ok = true;
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      const { page, ctx } = await open(browser, w, h, true, 'reduce');
      const m = await page.evaluate(() => {
        const css = getComputedStyle as unknown as (e: unknown) => Record<string, string>;
        const bar = document.querySelector('#menu-bar > summary')?.getBoundingClientRect().height ?? 0;
        const short = [...document.querySelectorAll('figure.card')].flatMap((c) => {
          const ctl = c.querySelector('.ctl')?.getBoundingClientRect().height ?? 0;
          return [...c.querySelectorAll('.fig, .cap a')].filter((el) => parseFloat(css(el).scrollMarginBlockEnd ?? '0') < ctl - 0.5) // computed lengths keep 3 decimals.map((el) => `${c.id} ${el.className || 'a'} ${css(el).scrollMarginBlockEnd} < ${Math.round(ctl)}`);
        });
        const count = document.getElementById('filter-count');
        return { top: parseFloat(css(document.documentElement).scrollPaddingBlockStart ?? '0') || 0, bar, short, countShown: count !== null && css(count).display !== 'none' };
      });
      const pass = (w > 900 || m.top >= m.bar) && m.short.length === 0;
      ok &&= pass;
      lines.push(`${w}: scroll padding ${m.top} px for a ${Math.round(m.bar)} px bar; ${m.short.length === 0 ? 'every card margin covers its bar' : m.short.slice(0, 4).join(', ')}`);
      if (w === 390) record('filterCount', m.countShown, `#filter-count empty: display ${m.countShown ? 'kept' : 'none'}`);
      await ctx.close();
    }
    record('scrollPadding', ok, lines.join('; '));
  }
  // 4: no figure speaks at mount or while it autoplays; a step the reader takes is announced once, in the card's live region.
  {
    const { page, ctx } = await open(browser, 1440, 900);
    const live = (k?: string) => page.evaluate((key: string | undefined) => [...document.querySelectorAll(key === undefined ? '.ctl' : `#fig-${key} .ctl`)].map((c) => ({
      said: [...c.querySelectorAll('[aria-live]')].map((x) => x.textContent ?? '').join(''), narrLive: c.querySelector('.narr')?.hasAttribute('aria-live') ?? false,
      narr: c.querySelector('.narr')?.textContent ?? '',
    })), k);
    const atMount = await live();
    const k = await page.evaluate(() => [...document.querySelectorAll('.ctl[data-fx-flow]')].map((c) => c.getAttribute('data-fx-flow') ?? '').find((x) => x.startsWith('seq-')) ?? '');
    await figToMiddle(page, k);
    const played = await until(page, k, (c) => c.startsWith('2 '), 5000);
    const auto = (await live(k))[0];
    await press(page, k, 'next');
    const user = (await live(k))[0];
    const silent = atMount.every((x) => x.said === '' && !x.narrLive);
    record('liveRegions', atMount.length > 0 && silent && played && auto?.said === '' && user !== undefined && user.said !== '' && user.said === user.narr,
      `${atMount.length} bars silent at mount ${silent}; ${k} autoplayed to step 2 ${played}, said "${auto?.said}"; after Next said "${user?.said}"`);
    await ctx.close();
  }
  // The map. 6: Enter on a node or an edge opens its evidence and moves focus to the panel, whose Open next level a key
  // reaches; group boxes take no focus. 7: animated edges stop within 5 s and do not move under reduced motion.
  // Review F4: the panel sits under a 640 px canvas at every width; at 390 the map starts top left at zoom 0.6 or more.
  const mapReady = async (page: Page): Promise<boolean> => {
    for (let t = 0; t < 8000; t += 100) { if (await page.evaluate(() => document.querySelector('#map-root .react-flow__node') !== null)) return true; await page.waitForTimeout(100); }
    return false;
  };
  const NODE = '#map-root .react-flow__node:not([data-id^="group:"])';
  {
    const { page, ctx } = await open(browser, 1440, 900);
    const ready = await mapReady(page);
    const groupsFocusable = await page.evaluate(() => [...document.querySelectorAll('#map-root .react-flow__node[data-id^="group:"]')].filter((g) => g.hasAttribute('tabindex')).length);
    const want = await page.evaluate((s: string) => document.querySelector(`${s} .fxm-label`)?.textContent ?? '', NODE);
    // 2.4.7: a focused node shows the page's 3 px ring, a focused edge draws its path in the ring colour.
    const ringOf = (sel: string) => page.evaluate((q: string) => {
      const css = getComputedStyle as unknown as (e: unknown) => Record<string, string> & { getPropertyValue(n: string): string };
      const el = document.querySelector(q);
      if (el === null) return 'none';
      const p = el.querySelector('.react-flow__edge-path');
      if (p === null) return `${css(el).outlineStyle} ${css(el).outlineWidth}`;
      // The ring colour as the browser writes a computed colour, for comparison with the path's stroke.
      const probe = document.createElement('i');
      probe.setAttribute('style', 'color:var(--alert)');
      document.body.append(probe);
      const ring = css(probe).color;
      probe.remove();
      return css(p).stroke === ring ? 'ring colour' : `${css(p).stroke}, ring ${ring}`;
    }, sel);
    await page.focus(`${NODE} >> nth=0`);
    const nodeRing = await ringOf(`${NODE}:focus`);
    await page.focus('#map-root .react-flow__edge >> nth=0');
    const edgeRing = await ringOf('#map-root .react-flow__edge:focus');
    const ringed = nodeRing.startsWith('solid 3px') && edgeRing === 'ring colour';
    await page.press(`${NODE} >> nth=0`, 'Enter');
    await page.waitForTimeout(200);
    const panel = () => page.evaluate(() => ({ h: document.querySelector('.fxm-panel h3')?.textContent ?? '', inPanel: (document.activeElement as El | null)?.closest('.fxm-panel') != null }));
    const byNode = await panel();
    const opener = await page.evaluate((s: string) => [...document.querySelectorAll(s)].findIndex((n) => n.querySelector('.fxm-open') !== null), NODE);
    let deeper = 'no node opens a level';
    if (opener >= 0) {
      await page.press(`${NODE} >> nth=${opener}`, 'Enter');
      await page.waitForTimeout(200);
      await page.keyboard.press('Tab');
      const btn = await page.evaluate(() => (document.activeElement as El | null)?.textContent ?? '');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const crumbs = await page.evaluate(() => [...document.querySelectorAll('nav.fxm-bar button')].length);
      deeper = `Tab from the panel reaches "${btn}", Enter opens level ${crumbs}`;
      if (btn !== 'Open next level' || crumbs < 2) deeper += ' (failed)';
      await page.click('nav.fxm-bar button >> nth=0');
      // The old level's nodes stay until the new layout lands, so wait past the relayout before the edge.
      await page.waitForTimeout(800);
      await mapReady(page);
    }
    const edges = await page.evaluate(() => [...document.querySelectorAll('#map-root .react-flow__edge')].length);
    if (edges > 0) await page.press('#map-root .react-flow__edge >> nth=0', 'Enter');
    await page.waitForTimeout(200);
    const byEdge = await panel();
    record('mapKeyboard', ready && ringed && groupsFocusable === 0 && byNode.h === want && want !== '' && byNode.inPanel && !deeper.endsWith('(failed)') && edges > 0 && byEdge.h.includes(' to ') && byEdge.inPanel,
      `map drawn ${ready}; focused node outline ${nodeRing}, focused edge path ${edgeRing}; focusable group boxes ${groupsFocusable}; Enter on a node shows "${byNode.h}" (want "${want}"), focus in the panel ${byNode.inPanel}; ${deeper}; Enter on an edge shows "${byEdge.h}", focus in the panel ${byEdge.inPanel}`);
    await ctx.close();
  }
  {
    const lines: string[] = [];
    let ok = true;
    for (const [w, h, motion] of [[1440, 900, 'no-preference'], [390, 844, 'reduce']] as const) {
      const { page, ctx } = await open(browser, w, h, true, motion);
      await mapReady(page);
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const css = getComputedStyle as unknown as (e: unknown) => Record<string, string>;
        const rf = document.querySelector('#map-root .react-flow');
        const probe = document.createElement('div');
        probe.innerHTML = '<svg><g class="react-flow__edge animated"><path d="M0 0h9"></path></g></svg>';
        rf?.append(probe);
        const p = probe.querySelector('path');
        const anim = p === null ? 'no probe' : `${css(p).animationName} x ${css(p).animationIterationCount}`;
        probe.remove();
        const c = document.querySelector('.fxm-canvas')?.getBoundingClientRect(), pn = document.querySelector('.fxm-panel')?.getBoundingClientRect();
        const vp = /scale\(([\d.]+)\)/.exec((document.querySelector('#map-root .react-flow__viewport') as unknown as { style: { transform: string } } | null)?.style.transform ?? '');
        const nodes = [...document.querySelectorAll('#map-root .react-flow__node')].map((n) => n.getBoundingClientRect());
        return { anim, stacked: c !== undefined && pn !== undefined && pn.top >= c.top + c.height - 1, canvasH: Math.round(c?.height ?? 0), zoom: Number(vp?.[1] ?? 0),
          left: c === undefined || nodes.length === 0 ? -1 : Math.round(Math.min(...nodes.map((r) => r.left)) - c.left), top: c === undefined || nodes.length === 0 ? -1 : Math.round(Math.min(...nodes.map((r) => r.top)) - c.top) };
      });
      const still = motion === 'reduce' ? m.anim.startsWith('none') : !m.anim.endsWith('infinite') && !m.anim.startsWith('none');
      const fits = m.stacked && m.canvasH === 640 && (w > 900 || (m.zoom >= 0.59 && m.left >= 0 && m.left <= 40 && m.top >= 0 && m.top <= 40));
      ok &&= still && fits;
      lines.push(`${w} (${motion}): animated edge ${m.anim}; panel under the canvas ${m.stacked}, canvas ${m.canvasH} px; zoom ${m.zoom}, first node at ${m.left}, ${m.top} from the canvas corner`);
      await ctx.close();
    }
    record('mapLayout', ok, lines.join('; '));
  }
  // 10: at step 1, the steps not reached yet keep 4.5:1 for text and 3:1 for arrows and boxes, in both themes.
  {
    const lines: string[] = [];
    let ok = true;
    for (const scheme of ['light', 'dark'] as const) {
      const { page, ctx } = await open(browser, 1440, 900, true, 'reduce', scheme);
      const keys = await page.evaluate(() => [...document.querySelectorAll('.ctl[data-fx-flow]')].map((c) => c.getAttribute('data-fx-flow') ?? ''));
      for (const k of keys) await press(page, k, 'next');
      const r = await page.evaluate(() => {
        const css = getComputedStyle as unknown as (e: unknown) => Record<string, string>;
        const rgb = (v: string): number[] | null => {
          const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(v) ?? /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(v);
          if (!m) return null;
          const n = [m[1], m[2], m[3]].map(Number);
          return v.startsWith('color(') ? n.map((x) => x * 255) : n;
        };
        const lum = (c: number[]): number => { const l = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * (l[0] as number) + 0.7152 * (l[1] as number) + 0.0722 * (l[2] as number); };
        const ratio = (a: number[], b: number[]): number => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const up = (e: El): El | null => (e as unknown as { parentElement: El | null }).parentElement;
        // The opacity of the element and every ancestor up to its svg, multiplied.
        const alpha = (el: El): number => { let o = 1; for (let e: El | null = el; e !== null && e.tagName.toLowerCase() !== 'svg'; e = up(e)) o *= Number(css(e).opacity ?? 1); return o; };
        const mix = (c: number[], bg: number[], o: number): number[] => c.map((x, i) => o * x + (1 - o) * (bg[i] as number));
        let worstText = 99, worstLine = 99, n = 0;
        const bad: string[] = [];
        for (const card of document.querySelectorAll('figure.card')) {
          const panel = rgb(css(card).backgroundColor ?? '') ?? [255, 255, 255];
          for (const t of card.querySelectorAll('.fig svg text')) {
            const box = up(t)?.querySelector(':scope > rect');
            const bg = (box ? rgb(css(box).fill ?? '') : null) ?? panel;
            const c = rgb(css(t).fill ?? '');
            if (!c) continue;
            const q = ratio(mix(c, bg, alpha(t)), bg);
            n++;
            if (q < worstText) worstText = q;
            if (q < 4.5) bad.push(`${card.id} text "${(t.textContent ?? '').slice(0, 20)}" ${q.toFixed(2)}`);
          }
          for (const p of card.querySelectorAll('.fig svg path[marker-end], .fig svg g > rect')) {
            const c = rgb(css(p).stroke ?? '');
            if (!c) continue;
            const q = ratio(mix(c, panel, alpha(p)), panel);
            if (q < worstLine) worstLine = q;
            if (q < 3) bad.push(`${card.id} ${p.tagName} ${q.toFixed(2)}`);
          }
        }
        return { n, worstText: worstText.toFixed(2), worstLine: worstLine.toFixed(2), bad };
      });
      ok &&= r.n > 0 && r.bad.length === 0;
      lines.push(`${scheme}: ${r.n} texts at step 1, lowest text ${r.worstText}, lowest arrow or box ${r.worstLine}${r.bad.length ? `; under: ${r.bad.slice(0, 6).join(', ')}` : ''}`);
      await ctx.close();
    }
    record('unreachedContrast', ok, lines.join('; '));
  }
  // 12: a scroll region takes a Tab stop only when it overflows; a figure region is named by its card's h3 alone, and its svg
  // carries the steps as a description.
  {
    const lines: string[] = [];
    let ok = true;
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      const { page, ctx } = await open(browser, w, h, true, 'reduce');
      const r = await page.evaluate(() => {
        const byId = (id: string | null): El | null => (id === null ? null : document.getElementById(id));
        const tab = [...document.querySelectorAll('.fig, .table-scroll')].filter((el) => el.hasAttribute('tabindex') !== el.scrollWidth > el.clientWidth + 1)
          .map((el) => `${el.closest('[id]')?.id ?? '?'} ${el.className} tabindex ${el.getAttribute('tabindex')} overflow ${el.scrollWidth}/${el.clientWidth}`);
        const names = [...document.querySelectorAll('figure.card')].flatMap((c) => {
          const fig = c.querySelector('.fig'), svg = c.querySelector('.fig svg');
          const label = byId(fig?.getAttribute('aria-labelledby') ?? null);
          const desc = byId(svg?.getAttribute('aria-describedby') ?? null)?.textContent ?? '';
          const out: string[] = [];
          if (label === null || label !== c.querySelector('h3') || fig?.hasAttribute('aria-label')) out.push(`${c.id}: region not named by its h3`);
          if ((svg?.getAttribute('aria-label') ?? '') === (c.querySelector('h3')?.textContent ?? '')) out.push(`${c.id}: svg repeats the title`);
          if (desc.trim() === '') out.push(`${c.id}: svg description "${desc.slice(0, 30)}"`);
          return out;
        });
        return { regions: [...document.querySelectorAll('.fig, .table-scroll')].length, scrolls: [...document.querySelectorAll('.fig[tabindex], .table-scroll[tabindex]')].length, tab, names };
      });
      ok &&= r.regions > 0 && r.tab.length === 0 && r.names.length === 0;
      lines.push(`${w}: ${r.scrolls} of ${r.regions} regions take a Tab stop${r.tab.length ? `; wrong: ${r.tab.slice(0, 4).join(', ')}` : ''}${r.names.length ? `; ${r.names.slice(0, 4).join(', ')}` : ''}`);
      await ctx.close();
    }
    record('regions', ok, lines.join('; '));
  }
  // 8: every Arabic run in figure text, narration and filter results sits in an element with lang="ar" (and dir="rtl" in HTML).
  {
    const { page, ctx } = await open(browser, 1440, 900, true, 'reduce');
    // The Arabic letters of `sel`'s elements that no lang="ar" element (itself or inside it) holds.
    const loose = (sel: string) => page.evaluate((q: string) => {
      const AR = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
      const n = (t: string | null): number => (t ?? '').match(AR)?.length ?? 0;
      const els = [...document.querySelectorAll(q)];
      const all = els.reduce((a, e) => a + n(e.textContent), 0);
      const wrapped = els.reduce((a, e) => a + (e.closest('[lang="ar"]') ? n(e.textContent) : [...e.querySelectorAll('[lang="ar"]')].filter((x) => x.tagName.toLowerCase() === 'tspan' || x.getAttribute('dir') === 'rtl').reduce((b, x) => b + n(x.textContent), 0)), 0);
      return { all, loose: all - wrapped };
    }, sel);
    const svgText = await loose('.fig svg text');
    const k = await page.evaluate(() => [...document.querySelectorAll('.fig svg text')].find((t) => /[\u0600-\u06FF]/.test(t.textContent ?? '') && t.closest('figure.card[id^="fig-seq-"]') !== null)?.closest('figure.card')?.id.slice(4) ?? '');
    let narr = { all: 0, loose: 0 };
    if (k !== '') {
      const steps = Number((await count(page, k)).split(' / ')[1]);
      for (let i = 0; i < steps; i++) {
        await press(page, k, 'next');
        const one = await loose(`#fig-${k} .narr`);
        narr = { all: narr.all + one.all, loose: narr.loose + one.loose };
      }
    }
    const word = await page.evaluate(() => {
      const idx = JSON.parse(document.getElementById('site-index')?.textContent ?? '{}') as { parts?: { label: string }[] }; // ts-gate-ok: the page's own index
      return /[\u0600-\u06FF]+/.exec((idx.parts ?? []).map((p) => p.label).join(' '))?.[0] ?? '';
    });
    let menu = { all: 0, loose: 0 };
    if (word !== '') { await page.fill('#filter', word); menu = await loose('#menu li.part'); }
    const found = svgText.all + narr.all + menu.all;
    // A site with no Arabic in its figures passes with nothing to check; the fixture has some.
    record('arabic', svgText.loose + narr.loose + menu.loose === 0,
      found === 0 ? 'no Arabic in figures or parts, nothing to check' : `Arabic letters outside lang="ar": figure text ${svgText.loose} of ${svgText.all}; ${k || 'no sequence'} narration ${narr.loose} of ${narr.all}; filter "${word}" results ${menu.loose} of ${menu.all}`);
    await ctx.close();
  }
  // Review F5: an archify card's link reads "Open in archify" at 1440 and says the diagram is best on a wide screen at 390.
  {
    const seen: string[] = [];
    let ok = true;
    for (const [w, h, want] of [[1440, 900, 'Open in archify'], [390, 844, 'Open full diagram (best on a wide screen)']] as const) {
      const { page, ctx } = await open(browser, w, h, true, 'reduce');
      const texts = await page.evaluate(() => [...document.querySelectorAll('a.deep')].filter((a) => a.querySelector('.narrow') !== null || /archify/.test(a.textContent ?? ''))
        .map((a) => (a as unknown as { innerText: string }).innerText.trim()));
      const off = texts.filter((x) => x !== want);
      ok &&= off.length === 0;
      seen.push(`${w}: ${texts.length - off.length} of ${texts.length} archify links read "${want}"${off.length ? ` (others: ${[...new Set(off)].join(' | ')})` : ''}`);
      await ctx.close();
    }
    record('deepLinkText', ok, seen.join('; '));
  }
  // Review F9: a box node's whole role, cut on its second line to fit, rides in the node's svg <title>.
  {
    const { page, ctx } = await open(browser, 1440, 900, true, 'reduce');
    const r = await page.evaluate(() => {
      const specs = JSON.parse(document.getElementById('diagrams')?.textContent ?? '{}') as Record<string, { lanes?: unknown[]; nodes: { title?: string }[] }>; // ts-gate-ok: the page's own figure data
      let want = 0, got = 0;
      for (const [k, spec] of Object.entries(specs)) {
        if (spec.lanes) continue;
        const titles = [...document.querySelectorAll(`#fig-${k} .fig svg g > title`)].map((t) => t.textContent ?? '');
        for (const n of spec.nodes) if (n.title !== undefined) { want++; if (titles.includes(n.title)) got++; }
      }
      return { want, got };
    });
    record('nodeTitles', r.want > 0 && r.got === r.want, `${r.got} of ${r.want} box nodes with a role carry it as their svg title`);
    await ctx.close();
  }
  // 9 and review F10: the theme button's name is its visible text, on the index and on every fx SVG deep page. 7: a deep
  // page whose steps animate has a pause button that stops them.
  {
    const index = path.resolve(file as string);
    const html = fs.readFileSync(index, 'utf8');
    const deep = [...new Set([...html.matchAll(/<a class="deep" href="(diagrams\/[^"]+\.html)"/g)].map((m) => m[1] as string))]
      .filter((rel) => fs.existsSync(path.join(path.dirname(index), rel)) && fs.readFileSync(path.join(path.dirname(index), rel), 'utf8').includes('href="../assets/theme.css"'));
    const named: string[] = [];
    const pauses: string[] = [];
    let animated = 0;
    for (const rel of ['index.html', ...deep]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(path.join(path.dirname(index), rel)).href);
      const label = await page.evaluate(() => document.getElementById('theme')?.getAttribute('aria-label') ?? null);
      if (label !== null) named.push(`${rel}: aria-label "${label}"`);
      const moving = await page.evaluate(() => [...document.querySelectorAll('svg [style*="animation:"]')].length);
      if (rel !== 'index.html' && moving > 0) {
        animated++;
        const has = await page.isVisible('#pause');
        if (has) await page.click('#pause');
        const st = await page.evaluate(() => ({ state: (getComputedStyle as unknown as (e: unknown) => Record<string, string>)(document.querySelector('svg [style*="animation:"]')).animationPlayState, pressed: document.getElementById('pause')?.getAttribute('aria-pressed') ?? '' }));
        if (!has || st.state !== 'paused' || st.pressed !== 'true') pauses.push(`${rel}: pause button ${has}, then ${st.state}, aria-pressed ${st.pressed}`);
      }
      await ctx.close();
    }
    record('themeName', named.length === 0, named.length === 0 ? `no aria-label on #theme in index.html and ${deep.length} SVG deep pages` : named.join('; '));
    // 11: the legend shows the leaving call's dash-dot, and the SVG deep pages draw it too.
    const legend = await (async () => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(url);
      const bg = await page.evaluate(() => { const sw = document.querySelector('.legend .sw.leaves'); return sw === null ? null : (getComputedStyle as unknown as (e: unknown) => Record<string, string>)(sw).backgroundImage ?? ''; });
      const solid: string[] = [];
      for (const rel of deep) {
        await page.goto(pathToFileURL(path.join(path.dirname(index), rel)).href);
        solid.push(...await page.evaluate((r: string) => [...document.querySelectorAll('.edge.leaves')].filter((e) => !/^12(px)?,? 4/.test((getComputedStyle as unknown as (x: unknown) => Record<string, string>)(e).strokeDasharray ?? '')).map(() => r), rel));
      }
      await ctx.close();
      return { bg, solid };
    })();
    record('leavingDash', legend.bg === null || (legend.bg.includes('repeating-linear-gradient') && legend.solid.length === 0),
      legend.bg === null ? 'no leaving call on this site' : `legend swatch ${legend.bg.slice(0, 40)}; deep page leaving arrows without the dash-dot: ${legend.solid.length}`);
    record('deepPause', animated > 0 && pauses.length === 0, animated === 0 ? 'no animated SVG deep page found' : `${animated - pauses.length} of ${animated} animated deep pages pause${pauses.length ? `; ${pauses.join('; ')}` : ''}`);
  }
}

// Writes the results and exits 1 when any check failed.
function finish(): never {
  fs.writeFileSync(out as string, `${JSON.stringify(results, null, 2)}\n`);
  const failed = Object.entries(results).filter(([, c]) => !c.pass).map(([n]) => n);
  console.log(failed.length === 0 ? 'OK' : `FAILED: ${failed.join(', ')}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

async function site(): Promise<void> {
  const browser = await chromium.launch();
  const consoleErrors: string[] = [];
  try {
    await siteChecks(browser, consoleErrors, false);
    await termLinks(browser);
    await deepTheme(browser);
    await a11y(browser);
    record('console', consoleErrors.length === 0, consoleErrors.length === 0 ? '0 errors at 1440 and 390' : consoleErrors.join(' | '));
    results.browser = { pass: true, detail: `chromium ${browser.version()}` };
  } finally {
    await browser.close();
  }
  finish();
}

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const consoleErrors: string[] = [];
  try {
    // 1440 x 900: sticky menu, scroll spy, theme, evidence.
    {
      const { page, ctx, errors } = await open(browser, 1440, 900);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await page.waitForTimeout(300);
      const side = await box(page, '#side');
      const menuVisible = await page.isVisible('#menu');
      record('menuSticky', side !== null && Math.abs(side.top) < 1 && side.width >= 230 && side.width <= 250 && menuVisible,
        `#side top ${side?.top}, width ${side?.width}, #menu visible ${menuVisible}`);

      const spy: string[] = [];
      let ok = true;
      for (const id of ['ch-01-start-what', 'ch-03-start-request', 'ch-05-s1']) {
        const y = await toMiddle(page, id);
        await page.waitForTimeout(500);
        const s = await linkState(page, id);
        const pass = s !== null && s.current === 'location' && s.scrollY === y;
        ok &&= pass;
        spy.push(`${id}: aria-current ${s?.current}, scrollY ${s?.scrollY} (set ${y})`);
      }
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.waitForTimeout(300);
      // The menu is scrolled to its end first, as a reader may leave it; the spy must bring the link back.
      const before = await page.evaluate(() => { const m = document.getElementById('menu'); if (m) m.scrollTop = m.scrollHeight; return m?.scrollTop ?? -1; });
      await toMiddle(page, 'ch-01-start-what');
      await page.waitForTimeout(500);
      const atTop = await linkState(page, 'ch-01-start-what');
      const y = await toMiddle(page, 'ch-05-s1');
      await page.waitForTimeout(500);
      const s = await linkState(page, 'ch-05-s1');
      const scrolls = atTop !== null && atTop.menuFull > atTop.menuH;
      const moved = atTop !== null && s !== null && s.menuTop !== atTop.menuTop;
      const short = scrolls && moved && s !== null && s.inside && s.current === 'location' && s.scrollY === y && atTop.inside;
      record('scrollSpy', ok && short, `${spy.join('; ')}; at 400: menu ${atTop?.menuH}/${atTop?.menuFull} px, scrollTop ${before} then ${atTop?.menuTop} (ch-01, inside ${atTop?.inside}) then ${s?.menuTop} (ch-05-s1, inside ${s?.inside}, aria-current ${s?.current}), scrollY ${s?.scrollY} (set ${y})`);
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const theme = async () => page.evaluate(() => [document.documentElement.dataset.theme ?? '', localStorage.getItem('fx-theme') ?? '']);
      await page.click('#theme');
      const t1 = await theme();
      await page.click('#theme');
      const t2 = await theme();
      const flips = t1[0] !== t2[0] && [t1[0], t2[0]].sort().join() === 'dark,light' && t1[1] === t1[0] && t2[1] === t2[0];
      record('themeToggle', flips, `after one click ${t1.join('/')}, after two ${t2.join('/')}`);

      await page.click('#evall');
      const ev = await page.evaluate(() => { const d = [...document.querySelectorAll('details.evidence')]; return { n: d.length, open: d.filter((x) => x.open).length }; });
      record('evidenceAll', ev.n > 0 && ev.open === ev.n, `${ev.open} of ${ev.n} details.evidence open`);
      consoleErrors.push(...errors.map((e) => `1440: ${e}`));
      await ctx.close();
    }

    // 390 x 844: the top bar.
    {
      const { page, ctx, errors } = await open(browser, 390, 844);
      const closed = (await isOpen(page)) === false;
      await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
      await page.waitForTimeout(200);
      const sum = await box(page, '#menu-bar > summary');
      const th = await box(page, '#theme');
      const themeVisible = await page.isVisible('#theme');
      await page.click('#menu-bar > summary');
      await page.waitForTimeout(100);
      const opened = (await isOpen(page)) === true && await page.isVisible('#menu a[href="#ch-05-s1"]');
      await page.click('#menu a[href="#ch-05-s1"]');
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => ({ open: document.getElementById('menu-bar')?.open ?? null, focus: document.activeElement === document.querySelector('#ch-05-s1 h2') }));
      record('phoneBar', closed && sum !== null && Math.abs(sum.top) < 1 && themeVisible && th !== null && Math.abs(th.top - sum.top) <= 8 && opened && after.open === false && after.focus,
        `closed at load ${closed}; summary top ${sum?.top}, theme top ${th?.top} visible ${themeVisible}; summary opens list ${opened}; after a link: open ${after.open}, focus on the chapter's h2 ${after.focus}`);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      record('pageWidth', width <= 390, `scrollWidth ${width} at 390`);
      consoleErrors.push(...errors.map((e) => `390: ${e}`));
      await ctx.close();
    }

    // Resize across 900px with JavaScript on.
    {
      const { page, ctx, errors } = await open(browser, 390, 844);
      const start = await isOpen(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      let wide = false;
      for (let i = 0; i < 10 && !wide; i++) { await page.waitForTimeout(50); wide = (await isOpen(page)) === true && await page.isVisible('#menu a[href="#ch-01-start-what"]'); }
      await page.setViewportSize({ width: 390, height: 844 });
      let narrow = false;
      for (let i = 0; i < 10 && !narrow; i++) { await page.waitForTimeout(50); narrow = (await isOpen(page)) === false; }
      record('resize', start === false && wide && narrow, `open at 390: ${start}; open with link visible within 500 ms at 1440: ${wide}; closed again at 390: ${narrow}`);
      consoleErrors.push(...errors.map((e) => `resize: ${e}`));
      await ctx.close();
    }

    // JavaScript off.
    {
      const w = await open(browser, 1440, 900, false);
      let shown = await w.page.isVisible('#menu a[href="#ch-01-start-what"]');
      let how = 'link visible without a click';
      if (!shown && await w.page.isVisible('#menu-bar > summary')) {
        await w.page.click('#menu-bar > summary');
        shown = await w.page.isVisible('#menu a[href="#ch-01-start-what"]');
        how = 'link visible after the Chapters summary';
      }
      await w.ctx.close();
      const n = await open(browser, 390, 844, false);
      const closed = !(await n.page.isVisible('#menu a[href="#ch-01-start-what"]'));
      await n.page.click('#menu-bar > summary');
      const opens = await n.page.isVisible('#menu a[href="#ch-01-start-what"]');
      await n.ctx.close();
      record('noScript', shown && closed && opens, `1440: ${shown ? how : 'link not reachable'}; 390: closed at load ${closed}, summary shows the link ${opens}`);
    }
    // The menu filter and a term link, at both widths; below 900px the Chapters control opens the panel that holds the filter.
    {
      const lines: Record<string, string[]> = { filterTerm: [], filterPart: [], filterNone: [], filterClear: [], termLink: [] };
      const failed = new Set<string>();
      const say = (name: string, pass: boolean, detail: string): void => { lines[name]?.push(detail); if (!pass) failed.add(name); };
      for (const [w, h] of [[1440, 900], [390, 844]] as const) {
        const { page, ctx, errors } = await open(browser, w, h);
        if ((await isOpen(page)) === false) await page.click('#menu-bar > summary');
        const start = await menuState(page);
        await page.fill('#filter', 'link');
        const term = await menuState(page);
        say('filterTerm', term.chapters.includes('#ch-05-s1') && term.terms.includes('#term-link') && /^\d+ matches$/.test(term.count),
          `${w}: chapters ${term.chapters.join(' ')}; terms ${term.terms.join(' ')}; count "${term.count}"`);
        await page.fill('#filter', 'database');
        const part = await menuState(page);
        say('filterPart', part.parts.some((p) => p.text.trim() === 'Database' && p.under === '#ch-02-start-parts'), `${w}: parts ${JSON.stringify(part.parts)}`);
        await page.fill('#filter', 'zzzz');
        const none = await menuState(page);
        say('filterNone', none.count === 'Nothing matches' && none.chapters.length === 0, `${w}: count "${none.count}", chapters ${none.chapters.length}`);
        await page.fill('#filter', 'link');
        await page.press('#filter', 'Escape');
        const clear = await menuState(page);
        const all = await page.evaluate(() => [...document.querySelectorAll('#menu li.part, #menu li.term')].length);
        say('filterClear', clear.chapters.join() === start.chapters.join() && start.chapters.length > 5 && all === 0,
          `${w}: ${clear.chapters.length} of ${start.chapters.length} chapter links back; li.part and li.term left ${all}`);
        if ((await isOpen(page)) === true && w < 900) await page.click('#menu-bar > summary');
        await page.click('#ch-05-s1 a.term');
        await page.waitForTimeout(1000);
        const row = await page.evaluate(() => {
          const r = document.getElementById('term-link')?.getBoundingClientRect();
          return r === undefined ? null : { top: Math.round(r.top), bottom: Math.round(r.bottom), inView: r.top >= 0 && r.bottom <= window.innerHeight };
        });
        say('termLink', row !== null && row.inView, `${w}: #term-link at ${row?.top}..${row?.bottom}`);
        consoleErrors.push(...errors.map((e) => `${w} filter: ${e}`));
        await ctx.close();
      }
      for (const [name, l] of Object.entries(lines)) record(name, l.length === 2 && !failed.has(name), l.join('; '));
    }
    // The player with reduced motion on, 1440 x 900, on fig-seq-turn (5 steps). Nothing plays on its own here.
    {
      const { page, ctx, errors } = await open(browser, 1440, 900, true, 'reduce');
      const K = 'seq-turn';
      const REST = 'Press Play, or step with Next.';
      const rest = await bar(page, K);
      record('rest', rest !== null && rest.count === '0 / 5' && rest.narr === REST && rest.play === 'Play', JSON.stringify(rest));
      await press(page, K, 'next');
      const one = await bar(page, K);
      record('next', one !== null && one.count === '1 / 5' && one.narr.startsWith('Step 1: '), JSON.stringify(one));
      await press(page, K, 'reset');

      for (let i = 0; i < 4; i++) await press(page, K, 'next');
      const four = await count(page, K);
      await press(page, K, 'reset');
      const reset = await bar(page, K);
      await page.waitForTimeout(2000);
      const later = await count(page, K);
      record('reset', four === '4 / 5' && reset !== null && reset.count === '0 / 5' && reset.narr === REST && reset.play === 'Play' && later === '0 / 5',
        `after four Next ${four}; after Reset ${JSON.stringify(reset)}; 2 s later ${later}`);

      await press(page, K, 'play');
      const two = await until(page, K, (c) => c === '2 / 5', 4000);
      await press(page, K, 'reset');
      const r0 = await count(page, K);
      await page.waitForTimeout(2000);
      const r1 = await count(page, K);
      record('resetWhilePlaying', two && r0 === '0 / 5' && r1 === '0 / 5', `reached 2 / 5 ${two}; after Reset ${r0}; 2 s later ${r1}`);

      await press(page, K, 'play');
      const playing = await bar(page, K);
      const reached = await until(page, K, (c) => c === '2 / 5', 4000);
      await press(page, K, 'play');
      const paused = await bar(page, K);
      await page.waitForTimeout(2000);
      const after = await count(page, K);
      record('playPause', playing !== null && playing.play === 'Pause' && !playing.pressed && reached && paused !== null && paused.play === 'Play' && !paused.pressed && after === paused.count,
        `on Play ${JSON.stringify(playing)}; reached 2 / 5 ${reached}; on Pause ${JSON.stringify(paused)}; 2 s later ${after}`);
      await press(page, K, 'reset');

      await press(page, K, 'play');
      const t0 = await count(page, K);
      await page.waitForTimeout(1000);
      const t1 = await count(page, K);
      await page.waitForTimeout(1000);
      const t2 = await count(page, K);
      record('interval', t0 === '1 / 5' && t1 === '1 / 5' && t2 === '2 / 5', `at once ${t0}; 1.0 s ${t1}; 2.0 s ${t2}`);
      await press(page, K, 'reset');

      await press(page, K, 'play');
      await page.waitForTimeout(7500);
      const end = await bar(page, K);
      await page.waitForTimeout(2000);
      const end2 = await count(page, K);
      record('endStops', end !== null && end.count === '5 / 5' && end.play === 'Play' && end2 === '5 / 5', `7.5 s after Play ${JSON.stringify(end)}; 2 s later ${end2}`);
      await press(page, K, 'reset');

      await press(page, K, 'next');
      await press(page, K, 'back');
      const back = await count(page, K);
      record('back', back === '0 / 5', `Next then Back: ${back}`);

      for (let i = 0; i < 5; i++) await press(page, K, 'next');
      const five = await count(page, K);
      await press(page, K, 'play');
      const again = await until(page, K, (c) => c === '1 / 5', 2000);
      record('restart', five === '5 / 5' && again, `five Next ${five}; Play gives 1 / 5 within 2 s ${again}`);
      await press(page, K, 'reset');

      // A figure with no steps: a valid model cannot make one (every node needs an edge, and a node with an
      // outgoing edge is a step), so a copy of a level spec with its steps removed is mounted into a new card.
      const empty = await page.evaluate(() => {
        const data = document.getElementById('diagrams');
        if (!data) return null;
        const specs = JSON.parse(data.textContent ?? '{}') as Record<string, { steps: unknown[] }>; // ts-gate-ok: the page's own figure data
        const first = Object.keys(specs).find((k) => k.startsWith('level-'));
        if (first === undefined) return null;
        specs['empty-proof'] = { ...specs[first], key: 'empty-proof', steps: [] } as { steps: unknown[] };
        data.textContent = JSON.stringify(specs);
        const card = document.createElement('figure');
        card.className = 'card';
        card.id = 'fig-empty-proof';
        card.innerHTML = '<h3>Empty</h3><p class="cap">No steps.</p><div class="fig" role="region" tabindex="0" aria-label="Empty"></div><div class="ctl" data-fx-flow="empty-proof"><a class="deep" href="diagrams/x.html">Open full diagram</a></div>';
        document.body.append(card);
        fxFlow.mount(card);
        return true;
      });
      const e = await bar(page, 'empty-proof');
      record('emptyFigure', empty === true && e !== null && e.count === '0 / 0' && ['play', 'next', 'reset'].every((b) => e.disabled.includes(b)) && errors.length === 0,
        `${JSON.stringify(e)}; console errors ${errors.length}`);

      // Every bar lies inside its card.
      const inCard = await page.evaluate(() => [...document.querySelectorAll('figure.card')].map((c) => {
        const r = c.getBoundingClientRect(), b = c.querySelector('.ctl')?.getBoundingClientRect();
        return b !== undefined && b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5 ? '' : c.id;
      }).filter((x) => x !== ''));
      results.barInCard = { pass: inCard.length === 0, detail: inCard.length === 0 ? 'every .ctl inside its card at 1440' : `outside at 1440: ${inCard.join(', ')}` };
      consoleErrors.push(...errors.map((x) => `player: ${x}`));
      await ctx.close();
    }

    // Autoplay, pause, resume and the stop at the last step, reduced motion off, at both widths.
    const auto: Record<string, string[]> = { autoplay: [], pause: [], resume: [], noResumeAtEnd: [], reducedMotion: [] };
    const fails: Record<string, boolean> = {};
    const note = (name: string, pass: boolean, detail: string): void => { (auto[name] as string[]).push(detail); if (!pass) fails[name] = true; };
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      {
        const { page, ctx, errors } = await open(browser, w, h);
        const keys = await page.evaluate(() => [...document.querySelectorAll('.ctl[data-fx-flow]')].map((c) => c.getAttribute('data-fx-flow') ?? ''));
        for (const k of keys) {
          await figToMiddle(page, k);
          const moved = await until(page, k, (c) => !c.startsWith('0 '), 3000);
          note('autoplay', moved, `${w}: ${k} ${moved ? 'played' : `stayed ${await count(page, k)}`}`);
        }
        consoleErrors.push(...errors.map((x) => `${w} autoplay: ${x}`));
        await ctx.close();
      }
      {
        const { page, ctx, errors } = await open(browser, w, h);
        const K = 'seq-turn';
        await figToMiddle(page, K);
        await until(page, K, (c) => c === '1 / 5', 3000);
        const away = await cardAway(page, K);
        await page.waitForTimeout(1000);
        const c1 = await count(page, K);
        await page.waitForTimeout(2000);
        const c2 = await count(page, K);
        note('pause', away && c1 === c2 && c1 !== '5 / 5', `${w}: card out of view ${away}; ${c1} then ${c2}`);
        await figToMiddle(page, K);
        const rose = await until(page, K, (c) => Number(c.split(' ')[0]) > Number(c2.split(' ')[0]), 3000);
        note('resume', rose, `${w}: from ${c2} to ${await count(page, K)}`);
        consoleErrors.push(...errors.map((x) => `${w} pause: ${x}`));
        await ctx.close();
      }
      {
        const { page, ctx, errors } = await open(browser, w, h);
        const K = 'seq-turn';
        await figToMiddle(page, K);
        const ended = await until(page, K, (c) => c === '5 / 5', 10000);
        const away = await cardAway(page, K);
        await page.waitForTimeout(1000);
        await figToMiddle(page, K);
        await page.waitForTimeout(3000);
        const b = await bar(page, K);
        note('noResumeAtEnd', ended && away && b !== null && b.count === '5 / 5' && b.play === 'Play', `${w}: reached 5 / 5 ${ended}; after the return ${b?.count}, button ${b?.play}`);
        consoleErrors.push(...errors.map((x) => `${w} end: ${x}`));
        await ctx.close();
      }
      {
        const { page, ctx, errors } = await open(browser, w, h, true, 'reduce');
        const K = 'seq-turn';
        await figToMiddle(page, K);
        await page.waitForTimeout(3000);
        const c = await count(page, K);
        note('reducedMotion', c === '0 / 5', `${w}: ${c} 3 s after reaching the middle`);
        consoleErrors.push(...errors.map((x) => `${w} reduced: ${x}`));
        await ctx.close();
      }
    }
    for (const [name, lines] of Object.entries(auto)) record(name, lines.length > 0 && !fails[name], lines.join('; '));

    // The bar stays on screen while the tall card is, at 1440 x 600.
    {
      const { page, ctx, errors } = await open(browser, 1440, 600, true, 'reduce');
      const spots: string[] = [];
      let ok = true;
      for (const at of [0.1, 0.5, 0.9]) {
        const s = await page.evaluate((f: number) => {
          const c = document.getElementById('fig-level-tall');
          const ctl = c?.querySelector('.ctl');
          if (!c || !ctl) return null;
          const r = c.getBoundingClientRect();
          // 0.1: card top at 10% of the window; 0.5: card centre at the middle; 0.9: card bottom at 90%.
          const y = f === 0.1 ? r.top - window.innerHeight * 0.1 : f === 0.5 ? r.top + r.height / 2 - window.innerHeight / 2 : r.bottom - window.innerHeight * 0.9;
          window.scrollTo({ top: y + window.scrollY, behavior: 'instant' });
          const n = c.getBoundingClientRect(), b = ctl.getBoundingClientRect();
          return { card: [Math.round(n.top), Math.round(n.bottom)], bar: [Math.round(b.top), Math.round(b.bottom)], h: n.height, inside: b.top >= -0.5 && b.bottom <= window.innerHeight + 0.5 };
        }, at);
        ok &&= s !== null && s.inside && s.h > 600;
        spots.push(`${at}: card ${s?.card.join('..')}, bar ${s?.bar.join('..')}`);
      }
      record('barInView', ok, `fig-level-tall at 1440 x 600: ${spots.join('; ')}`);
      consoleErrors.push(...errors.map((x) => `barInView: ${x}`));
      await ctx.close();
    }

    // 390: the wide sequence scrolls sideways inside its card, the player follows the active arrow, the page does not.
    {
      const { page, ctx, errors } = await open(browser, 390, 844, true, 'reduce');
      const dims = () => page.evaluate(() => {
        const f = document.querySelector('#fig-seq-wide .fig');
        return { sw: f?.scrollWidth ?? 0, cw: f?.clientWidth ?? 0, left: f?.scrollLeft ?? 0, page: document.documentElement.scrollWidth };
      });
      const d0 = await dims();
      for (let i = 0; i < 5; i++) await press(page, 'seq-wide', 'next');
      await page.waitForTimeout(300);
      const d1 = await dims();
      const last = await count(page, 'seq-wide');
      record('sideways', d0.sw > d0.cw && last === '5 / 5' && d1.left > 0 && d1.page <= 390,
        `.fig scrollWidth ${d0.sw}, clientWidth ${d0.cw}; at ${last} scrollLeft ${d1.left}; page scrollWidth ${d1.page}`);
      const inCard = await page.evaluate(() => [...document.querySelectorAll('figure.card')].map((c) => {
        const r = c.getBoundingClientRect(), b = c.querySelector('.ctl')?.getBoundingClientRect();
        return b !== undefined && b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5 ? '' : c.id;
      }).filter((x) => x !== ''));
      const prior = results.barInCard;
      results.barInCard = { pass: (prior?.pass ?? false) && inCard.length === 0, detail: `${prior?.detail}; ${inCard.length === 0 ? 'every .ctl inside its card at 390' : `outside at 390: ${inCard.join(', ')}`}` };
      consoleErrors.push(...errors.map((x) => `sideways: ${x}`));
      await ctx.close();
    }

    // No figure text under 12 px at either width.
    {
      const small: string[] = [];
      for (const [w, h] of [[1440, 900], [390, 844]] as const) {
        const { page, ctx } = await open(browser, w, h, true, 'reduce');
        const found = await page.evaluate(() => [...document.querySelectorAll('.fig svg text')].map((t) => getComputedStyle(t).fontSize).filter((s) => parseFloat(s) < 12));
        const total = await page.evaluate(() => [...document.querySelectorAll('.fig svg text')].length);
        if (total === 0) small.push(`${w}: no svg text found`);
        if (found.length) small.push(`${w}: ${found.join(', ')}`);
        await ctx.close();
      }
      record('labels', small.length === 0, small.length === 0 ? 'every figure text is 12 px or more at 1440 and 390' : small.join('; '));
    }
    await siteChecks(browser, consoleErrors, true);
    await termLinks(browser);
    await deepTheme(browser);
    await a11y(browser);

    record('console', consoleErrors.length === 0, consoleErrors.length === 0 ? '0 errors at 1440 and 390' : consoleErrors.join(' | '));
    results.browser = { pass: true, detail: `chromium ${browser.version()}` };
  } finally {
    await browser.close();
  }
  finish();
}

// ---- Measure mode -------------------------------------------------------------------------------------------------
// One selector profile per kind of page. `owner` names the selectors of the owner's hand-built index.html, read from that
// file once; `fx` names the DOM contract of a generated site (tasks 06 to 08). Everything below reads a page only through these.
type Profile = {
  chapters: string; question: string; lead: string | null; bullets: string; glossary: string | null;
  fig: string; area: string; count: string; btn: Record<'play' | 'next' | 'back' | 'reset', string>;
  seqs: string; menu: string; link: string; groups: string | null; stepSeconds: number | null;
};
const PROFILES: Record<string, Profile> = {
  owner: {
    chapters: 'section[id]:not(#explore)', // the 19 chapter sections; #explore is the interactive map, not a chapter
    question: 'p.lede', // the question under the chapter title (6 chapters have none)
    lead: null, // the owner's page has no lead
    bullets: 'ul.facts > li', // the chapter's fact list
    glossary: null, // no glossary
    fig: 'figure', // a figure: .svgbox, .ctl, a caption and a note
    area: '.svgbox', // the drawn diagram
    count: '.ctl .cap-n', // the "0 / 17" counter in the step bar
    btn: { play: '.ctl button[data-act="play"]', next: '.ctl button[data-act="next"]', back: '.ctl button[data-act="prev"]', reset: '.ctl button[data-act="reset"]' }, // the bar's buttons
    seqs: 'figure:has(.svgbox[data-diagram^="seq"])', // a figure whose diagram is a model sequence
    menu: 'nav', // the sticky chapter list
    link: 'nav a[href="#ID"]', // a chapter's link in it
    groups: null, // the list has no groups
    stepSeconds: null, // the owner's step interval is not specified
  },
  fx: {
    chapters: 'section.chapter[data-group="start"], section.chapter[data-group="how"]', // reading chapters only; Reference is not measured
    question: '.q', // the question in the eyebrow
    lead: 'p.lead', // the chapter's lead
    bullets: 'ul.facts > li', // the chapter's bullets
    glossary: 'table.glossary tbody tr', // one row per term
    fig: 'figure.card', // a figure card
    area: '.fig', // the drawn diagram
    count: '.ctl .count', // the "0 / 5" counter in the step bar
    btn: { play: '.ctl button.play', next: '.ctl button.next', back: '.ctl button.back', reset: '.ctl button.reset' }, // the bar's buttons
    seqs: 'figure.card[id^="fig-seq-"]', // the card of a model sequence
    menu: '#side', // the sticky side column
    link: '#menu a[href="#ID"]', // a chapter's link in the menu
    groups: '#menu section.group', // Start here, How it works, Reference
    stepSeconds: 1.6, // the player's step interval (task 07)
  },
};

async function measure(name: string): Promise<void> {
  const P = PROFILES[name] as Profile;
  const isFx = name === 'fx';
  const browser = await chromium.launch();
  let consoleErrors = 0;
  const aggs: Record<string, { lines: string[]; fail: boolean }> = {};
  const add = (key: string, pass: boolean, detail: string): void => {
    const a = (aggs[key] ??= { lines: [], fail: false });
    a.lines.push(detail);
    if (!pass) a.fail = true;
  };
  const done = (key: string): Check | null => { const a = aggs[key]; return a === undefined ? null : { pass: !a.fail, detail: a.lines.join('; ') }; };
  const fig = (i: number): string => `[data-pc="${i}"]`;
  const text = (page: Page, sel: string): Promise<string> => page.evaluate((s: string) => document.querySelector(s)?.textContent ?? '', sel);
  const countOf = (page: Page, i: number): Promise<string> => text(page, `${fig(i)} ${P.count}`);
  const playOf = (page: Page, i: number): Promise<string> => text(page, `${fig(i)} ${P.btn.play}`);
  const total = (c: string): number => Number(c.split('/')[1] ?? 0);
  const link = (id: string): string => P.link.replace('ID', id);
  const press = (page: Page, i: number, b: keyof Profile['btn']): Promise<void> => page.click(`${fig(i)} ${P.btn[b]}`);
  async function wait(page: Page, i: number, want: (c: string) => boolean, ms: number): Promise<boolean> {
    for (let t = 0; t <= ms; t += 50) { if (want(await countOf(page, i))) return true; await page.waitForTimeout(50); }
    return false;
  }
  const toMid = (page: Page, i: number): Promise<void> => page.evaluate((a: { f: string; area: string }) => {
    const el = document.querySelector(`${a.f} ${a.area}`);
    // The box centre goes to the window middle; a box taller than the window shows its middle part (the owner's observer needs 30% of it).
    if (el) { const r = el.getBoundingClientRect(); window.scrollTo({ top: r.top + r.height / 2 + window.scrollY - window.innerHeight / 2, behavior: 'instant' }); }
  }, { f: fig(i), area: P.area });
  // Scrolls until no part of the figure is visible (above it when the page allows, else below); returns whether none is.
  const away = (page: Page, i: number): Promise<boolean> => page.evaluate((f: string) => {
    const c = document.querySelector(f);
    if (!c) return false;
    const r = c.getBoundingClientRect();
    const up = r.top + window.scrollY - window.innerHeight - 20;
    window.scrollTo({ top: up >= 0 ? up : r.bottom + window.scrollY + 20, behavior: 'instant' });
    const n = c.getBoundingClientRect();
    return n.bottom <= 0 || n.top >= window.innerHeight;
  }, fig(i));
  // Opens the page, waits for its scripts, and tags every figure data-pc="<index>" so each can be addressed alone.
  async function mopen(w: number, h: number, motion: 'reduce' | 'no-preference', scheme: 'light' | 'dark', js = true) {
    const o = await open(browser, w, h, js, motion, scheme);
    await o.page.waitForTimeout(1200);
    const figs = js ? await o.page.evaluate((s: string) => { let n = 0; for (const f of document.querySelectorAll(s)) f.setAttribute('data-pc', String(n++)); return n; }, P.fig) : 0;
    return { ...o, figs };
  }
  const end = (errors: string[]): void => { consoleErrors += errors.length; };

  try {
    // Prose, glossary, sequences: read once at 1440, light.
    const base = await mopen(1440, 900, 'reduce', 'light');
    const prose = await base.page.evaluate((p: Profile) => {
      const words = (e: El | null): number => {
        if (e === null) return 0;
        let t = e.textContent ?? '';
        for (const c of e.querySelectorAll('code.at')) t = t.replace(c.textContent ?? '', ''); // the file reference after a bullet is evidence, not prose
        return t.split(/\s+/).filter((x) => x !== '').length;
      };
      return [...document.querySelectorAll(p.chapters)].map((ch) => {
        const lead = p.lead === null ? null : ch.querySelector(p.lead);
        const bs = [...ch.querySelectorAll(p.bullets)];
        return { id: ch.id, words: words(ch.querySelector(p.question)) + words(lead) + bs.reduce((n, b) => n + words(b), 0), lead: lead !== null, bullets: bs.length };
      });
    }, P);
    const glossary = P.glossary === null ? null : await base.page.evaluate((s: string) => [...document.querySelectorAll(s)].length, P.glossary);
    const seq = await base.page.evaluate((s: string) => {
      const all = [...document.querySelectorAll(s)];
      // A lifeline is a dashed vertical line under a participant box (fx-flow-2 draws it as a <line> with stroke-dasharray).
      return { sequences: all.length, lifelines: all.filter((f) => f.querySelector('svg line[stroke-dasharray]') !== null).length };
    }, P.seqs);
    // The step bar of every figure: the figure to run the player checks on (fewest steps, at least 3) and the tallest.
    const shape = await base.page.evaluate((a: { fig: string; count: string }) => [...document.querySelectorAll(a.fig)].map((f, i) => ({ i, c: f.querySelector(a.count)?.textContent ?? '', h: f.getBoundingClientRect().height })), { fig: P.fig, count: P.count });
    const pick = shape.filter((s) => total(s.c) >= 3).sort((a, b) => total(a.c) - total(b.c) || a.i - b.i)[0]?.i;
    const tallest = [...shape].sort((a, b) => b.h - a.h)[0]?.i;
    const chapterIds = prose.map((c) => c.id);
    const spyIds = [chapterIds[0], chapterIds[Math.floor(chapterIds.length / 2)], chapterIds[chapterIds.length - 1]].filter((x): x is string => x !== undefined);
    const idx = isFx ? await base.page.evaluate(() => JSON.parse(document.getElementById('site-index')?.textContent ?? '{}') as { chapters: { id: string; title: string }[]; parts: { label: string; chapter: string }[]; terms: { id: string; term: string }[] }) : null; // ts-gate-ok: the page's own filter index

    // Menu at 1440: sticky, width, groups, current chapter marked after scrolling to three chapters.
    await base.page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await base.page.waitForTimeout(300);
    const side = await base.page.evaluate((s: string) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r === undefined ? null : { top: r.top, width: r.width }; }, P.menu);
    const sticky = side !== null && Math.abs(side.top) < 1 && await base.page.isVisible(P.menu);
    const groups = P.groups === null ? null : await base.page.evaluate((s: string) => [...document.querySelectorAll(s)].length, P.groups);
    const marked: string[] = [];
    let current = true;
    for (const id of spyIds) {
      const y = await toMiddle(base.page, id);
      await base.page.waitForTimeout(600);
      const m = await base.page.evaluate((a: { sel: string }) => {
        const l = document.querySelector(a.sel);
        return l !== null && (l.getAttribute('aria-current') === 'location' || ` ${l.className} `.includes(' cur '));
      }, { sel: link(id) });
      current &&= m;
      marked.push(`${id}: ${m} (scrollY ${y})`);
    }
    // Extras of a generated site: the theme toggle and the "open all evidence" button.
    let themeToggle: Check | null = null;
    let evidenceAll: Check | null = null;
    if (isFx) {
      await base.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const theme = (): Promise<string[]> => base.page.evaluate(() => [document.documentElement.dataset.theme ?? '', localStorage.getItem('fx-theme') ?? '']);
      await base.page.click('#theme');
      const t1 = await theme();
      await base.page.click('#theme');
      const t2 = await theme();
      themeToggle = { pass: t1[0] !== t2[0] && [t1[0], t2[0]].sort().join() === 'dark,light' && t1[1] === t1[0] && t2[1] === t2[0], detail: `after one click ${t1.join('/')}, after two ${t2.join('/')}` };
      await base.page.click('#evall');
      const ev = await base.page.evaluate(() => { const d = [...document.querySelectorAll('details.evidence')]; return { n: d.length, open: d.filter((x) => x.open).length }; });
      evidenceAll = { pass: ev.n > 0 && ev.open === ev.n, detail: `${ev.open} of ${ev.n} details.evidence open` };
    }
    end(base.errors);
    await base.ctx.close();

    let phoneBar: Check | null = null;
    let resize: Check | null = null;
    let noScript: Check | null = null;
    let filter: Record<string, Check | null> | null = null;
    if (isFx && idx !== null) {
      const first = chapterIds[0] as string, last = chapterIds[chapterIds.length - 1] as string;
      // 390: the top bar stays on top, opens the list, closes after a link and gives the focus back.
      {
        const { page, ctx, errors } = await mopen(390, 844, 'reduce', 'light');
        const closed = (await isOpen(page)) === false;
        await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
        await page.waitForTimeout(200);
        const sum = await box(page, '#menu-bar > summary');
        await page.click('#menu-bar > summary');
        await page.waitForTimeout(100);
        const opened = (await isOpen(page)) === true && await page.isVisible(link(last));
        await page.click(link(last));
        await page.waitForTimeout(300);
        // A link moves focus to the chapter's h2 (final review a11y 1), not back to the summary.
        const after = await page.evaluate((id: string) => ({ open: document.getElementById('menu-bar')?.open ?? null, focus: document.activeElement === document.querySelector(`#${id} h2`) }), last);
        phoneBar = { pass: closed && sum !== null && Math.abs(sum.top) < 1 && opened && after.open === false && after.focus, detail: `closed at load ${closed}; summary top ${sum?.top} after scrolling 1500; opens the list ${opened}; after a link: open ${after.open}, focus on the chapter's h2 ${after.focus}` };
        end(errors);
        await ctx.close();
      }
      // Resize across 900 px.
      {
        const { page, ctx, errors } = await mopen(390, 844, 'reduce', 'light');
        const start = await isOpen(page);
        await page.setViewportSize({ width: 1440, height: 900 });
        let wide = false;
        for (let i = 0; i < 10 && !wide; i++) { await page.waitForTimeout(50); wide = (await isOpen(page)) === true && await page.isVisible(link(first)); }
        await page.setViewportSize({ width: 390, height: 844 });
        let narrow = false;
        for (let i = 0; i < 10 && !narrow; i++) { await page.waitForTimeout(50); narrow = (await isOpen(page)) === false; }
        resize = { pass: start === false && wide && narrow, detail: `open at 390: ${start}; open with link visible within 500 ms at 1440: ${wide}; closed again at 390: ${narrow}` };
        end(errors);
        await ctx.close();
      }
      // JavaScript off.
      {
        const w = await mopen(1440, 900, 'reduce', 'light', false);
        const shown = await w.page.isVisible(link(first)) || (await w.page.isVisible('#menu-bar > summary') && (await w.page.click('#menu-bar > summary'), await w.page.isVisible(link(first))));
        await w.ctx.close();
        const n = await mopen(390, 844, 'reduce', 'light', false);
        const closed = !(await n.page.isVisible(link(first)));
        await n.page.click('#menu-bar > summary');
        const opens = await n.page.isVisible(link(first));
        await n.ctx.close();
        noScript = { pass: shown && closed && opens, detail: `1440: link reachable ${shown}; 390: closed at load ${closed}, summary shows the link ${opens}` };
      }
      // Filter and term link, at both widths. The count line is read in the singular too ("1 match").
      for (const [w, h] of [[1440, 900], [390, 844]] as const) {
        const { page, ctx, errors } = await mopen(w, h, 'reduce', 'light');
        if ((await isOpen(page)) === false) await page.click('#menu-bar > summary');
        const start = await menuState(page);
        const t = idx.terms[0], c = idx.chapters[0], pt = idx.parts[0];
        if (t !== undefined) {
          await page.fill('#filter', t.term);
          const s = await menuState(page);
          add('filterTerm', s.terms.includes(`#term-${t.id}`) && /^\d+ matches?$/.test(s.count), `${w}: "${t.term}" gives terms ${s.terms.join(' ')}, count "${s.count}"`);
        }
        if (c !== undefined) {
          await page.fill('#filter', c.title);
          const s = await menuState(page);
          add('filterChapter', s.chapters.includes(`#${c.id}`), `${w}: "${c.title}" gives chapters ${s.chapters.join(' ')}`);
        }
        if (pt !== undefined) {
          await page.fill('#filter', pt.label);
          const s = await menuState(page);
          add('filterPart', s.parts.some((p) => p.text.trim() === pt.label && p.under === `#${pt.chapter}`), `${w}: "${pt.label}" gives parts ${JSON.stringify(s.parts)}`);
        }
        await page.fill('#filter', 'zzzz');
        const none = await menuState(page);
        add('filterNone', none.count === 'Nothing matches' && none.chapters.length === 0, `${w}: count "${none.count}", chapters ${none.chapters.length}`);
        await page.fill('#filter', t?.term ?? 'a');
        await page.press('#filter', 'Escape');
        const clear = await menuState(page);
        const left = await page.evaluate(() => [...document.querySelectorAll('#menu li.part, #menu li.term')].length);
        add('filterClear', clear.chapters.join() === start.chapters.join() && start.chapters.length > 0 && left === 0, `${w}: ${clear.chapters.length} of ${start.chapters.length} chapter links back; li.part and li.term left ${left}`);
        if ((await isOpen(page)) === true && w < 900) await page.click('#menu-bar > summary');
        const href = await page.evaluate(() => document.querySelector('section.chapter a.term')?.getAttribute('href') ?? '');
        if (href !== '') {
          await page.click(`section.chapter a.term[href="${href}"]`);
          await page.waitForTimeout(1000);
          const row = await page.evaluate((id: string) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r === undefined ? null : r.top >= 0 && r.bottom <= window.innerHeight; }, href.slice(1));
          add('termLink', row === true, `${w}: ${href} in view ${row}`);
        }
        end(errors);
        await ctx.close();
      }
      filter = { term: done('filterTerm'), chapter: done('filterChapter'), part: done('filterPart'), none: done('filterNone'), clear: done('filterClear'), termLink: done('termLink') };
    }

    // Every state: page width, smallest figure text, the bar inside its card, console errors, and the screenshot.
    let labelsMinPx: number | null = null;
    let pageScrollAt390 = false;
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      for (const scheme of ['light', 'dark'] as const) {
        for (const motion of ['no-preference', 'reduce'] as const) {
          const { page, ctx, errors } = await mopen(w, h, motion, scheme);
          const s = await page.evaluate((a: { fig: string; ctl: string }) => ({
            width: document.documentElement.scrollWidth,
            sizes: [...document.querySelectorAll(`${a.fig} svg text`)].map((t) => parseFloat(getComputedStyle(t).fontSize)),
            outside: [...document.querySelectorAll(a.fig)].filter((c) => { const r = c.getBoundingClientRect(), b = c.querySelector(a.ctl)?.getBoundingClientRect(); return !(b !== undefined && b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5); }).length,
          }), { fig: P.fig, ctl: '.ctl' });
          if (w === 390 && s.width > 390) pageScrollAt390 = true;
          if (s.sizes.length > 0) labelsMinPx = Math.min(labelsMinPx ?? Infinity, ...s.sizes);
          add('barInCard', s.outside === 0, `${w} ${scheme} ${motion}: ${s.outside} outside`);
          if (outDir !== undefined && motion === 'no-preference') await page.screenshot({ path: path.join(outDir, `${name}-${w}-${scheme}.png`) });
          end(errors);
          await ctx.close();
        }
      }
    }

    // The bar stays on screen while the tallest figure is, at 1440 x 600.
    if (tallest !== undefined) {
      const { page, ctx, errors } = await mopen(1440, 600, 'reduce', 'light');
      const spots: string[] = [];
      let ok = true;
      for (const at of [0.1, 0.5, 0.9]) {
        const s = await page.evaluate((a: { f: string; at: number; ctl: string }) => {
          const c = document.querySelector(a.f), ctl = c?.querySelector(a.ctl);
          if (!c || !ctl) return null;
          const r = c.getBoundingClientRect();
          // 0.1: top at 10% of the window; 0.5: centre at the middle; 0.9: bottom at 90%.
          const y = a.at === 0.1 ? r.top - window.innerHeight * 0.1 : a.at === 0.5 ? r.top + r.height / 2 - window.innerHeight / 2 : r.bottom - window.innerHeight * 0.9;
          window.scrollTo({ top: y + window.scrollY, behavior: 'instant' });
          const n = c.getBoundingClientRect(), b = ctl.getBoundingClientRect();
          return { card: [Math.round(n.top), Math.round(n.bottom)], bar: [Math.round(b.top), Math.round(b.bottom)], inside: b.top >= -0.5 && b.bottom <= window.innerHeight + 0.5 };
        }, { f: fig(tallest), at, ctl: '.ctl' });
        ok &&= s !== null && s.inside;
        spots.push(`${at}: card ${s?.card.join('..')}, bar ${s?.bar.join('..')}`);
      }
      add('barInView', ok, `figure ${tallest} at 1440 x 600: ${spots.join('; ')}`);
      end(errors);
      await ctx.close();
    }

    // Autoplay with reduced motion off: every figure reaches step 1 within 3 s of its middle, at both widths and themes.
    let figures = 0;
    for (const [w, h] of [[1440, 900], [390, 844]] as const) {
      for (const scheme of ['light', 'dark'] as const) {
        const { page, ctx, errors, figs } = await mopen(w, h, 'no-preference', scheme);
        figures = figs;
        const bad: number[] = [];
        for (let i = 0; i < figs; i++) {
          await toMid(page, i);
          if (!await wait(page, i, (c) => !c.startsWith('0 '), 3000)) bad.push(i);
        }
        add('within3s', bad.length === 0, `${w} ${scheme}: ${figs - bad.length} of ${figs} reached step 1${bad.length ? `; stayed at 0: ${bad.join(' ')}` : ''}`);
        end(errors);
        await ctx.close();
      }
      if (pick === undefined) continue;
      {
        const { page, ctx, errors } = await mopen(w, h, 'no-preference', 'light');
        await toMid(page, pick);
        await wait(page, pick, (c) => c.startsWith('1 '), 3000);
        const gone = await away(page, pick);
        await page.waitForTimeout(1000);
        const c1 = await countOf(page, pick);
        await page.waitForTimeout(2000);
        const c2 = await countOf(page, pick);
        add('pauses', gone && c1 === c2 && !c1.startsWith(`${total(c1)} `), `${w}: figure ${pick} out of view ${gone}; ${c1} then ${c2}`);
        await toMid(page, pick);
        const rose = await wait(page, pick, (c) => Number(c.split(' ')[0]) > Number(c2.split(' ')[0]), 3000);
        add('resumes', rose, `${w}: from ${c2} to ${await countOf(page, pick)}`);
        end(errors);
        await ctx.close();
      }
      if (P.stepSeconds !== null) {
        const { page, ctx, errors } = await mopen(w, h, 'no-preference', 'light');
        await toMid(page, pick);
        const ended = await wait(page, pick, (c) => Number(c.split(' ')[0]) === total(c), (total(await countOf(page, pick)) * P.stepSeconds + 3) * 1000);
        const gone = await away(page, pick);
        await page.waitForTimeout(1000);
        await toMid(page, pick);
        await page.waitForTimeout(3000);
        const c = await countOf(page, pick), b = await playOf(page, pick);
        add('noResumeAtEnd', ended && gone && Number(c.split(' ')[0]) === total(c) && b === 'Play', `${w}: reached the end ${ended}; after the return ${c}, button ${b}`);
        end(errors);
        await ctx.close();
      }
      {
        const { page, ctx, errors } = await mopen(w, h, 'reduce', 'light');
        if (pick !== undefined) {
          await toMid(page, pick);
          await page.waitForTimeout(3000);
          const c = await countOf(page, pick);
          add('reducedMotion', c.startsWith('0 '), `${w}: ${c} 3 s after reaching the middle`);
        }
        end(errors);
        await ctx.close();
      }
    }

    // The player, reduced motion on so nothing starts by itself, at both widths and themes.
    if (pick !== undefined) {
      for (const [w, h] of [[1440, 900], [390, 844]] as const) {
        for (const scheme of ['light', 'dark'] as const) {
          const { page, ctx, errors } = await mopen(w, h, 'reduce', scheme);
          const tag = `${w} ${scheme}`;
          const N = total(await countOf(page, pick));
          const at = (n: number): string => `${n} / ${N}`;
          await toMid(page, pick);
          add('rest', (await countOf(page, pick)) === at(0) && (await playOf(page, pick)) === 'Play', `${tag}: ${await countOf(page, pick)}, button ${await playOf(page, pick)}`);
          await press(page, pick, 'next');
          add('next', (await countOf(page, pick)) === at(1), `${tag}: ${await countOf(page, pick)} after one Next`);
          await press(page, pick, 'back');
          add('back', (await countOf(page, pick)) === at(0), `${tag}: ${await countOf(page, pick)} after Next then Back`);

          const k = Math.min(4, N - 1);
          for (let i = 0; i < k; i++) await press(page, pick, 'next');
          const before = await countOf(page, pick);
          await press(page, pick, 'reset');
          const reset = await countOf(page, pick), rb = await playOf(page, pick);
          await page.waitForTimeout(2000);
          const later = await countOf(page, pick);
          add('reset', before === at(k) && reset === at(0) && rb === 'Play' && later === at(0), `${tag}: after ${k} Next ${before}; after Reset ${reset}, button ${rb}; 2 s later ${later}`);

          const wait2 = (P.stepSeconds ?? 4) * 2500;
          await press(page, pick, 'play');
          const two = await wait(page, pick, (c) => c === at(2), wait2);
          await press(page, pick, 'reset');
          const r0 = await countOf(page, pick);
          await page.waitForTimeout(2000);
          add('resetWhilePlaying', two && r0 === at(0) && (await countOf(page, pick)) === at(0), `${tag}: reached ${at(2)} ${two}; after Reset ${r0}; 2 s later ${await countOf(page, pick)}`);

          await press(page, pick, 'play');
          const playing = await playOf(page, pick);
          const reached = await wait(page, pick, (c) => c === at(2), wait2);
          await press(page, pick, 'play');
          const paused = await playOf(page, pick), pc = await countOf(page, pick);
          await page.waitForTimeout(2000);
          const after = await countOf(page, pick);
          add('playPause', playing === 'Pause' && reached && paused === 'Play' && after === pc, `${tag}: on Play button ${playing}; reached ${at(2)} ${reached}; on Pause button ${paused}; 2 s later ${after} (was ${pc})`);
          await press(page, pick, 'reset');

          if (P.stepSeconds !== null) {
            await press(page, pick, 'play');
            const t0 = await countOf(page, pick);
            await page.waitForTimeout(1000);
            const t1 = await countOf(page, pick);
            await page.waitForTimeout(1000);
            const t2 = await countOf(page, pick);
            add('interval', t0 === at(1) && t1 === at(1) && t2 === at(2), `${tag}: at once ${t0}; 1.0 s ${t1}; 2.0 s ${t2}`);
            await press(page, pick, 'reset');
            await press(page, pick, 'play');
            await page.waitForTimeout(((N - 1) * P.stepSeconds + 1.1) * 1000);
            const e1 = await countOf(page, pick), eb = await playOf(page, pick);
            await page.waitForTimeout(2000);
            add('endStops', e1 === at(N) && eb === 'Play' && (await countOf(page, pick)) === at(N), `${tag}: ${(N - 1) * P.stepSeconds + 1.1} s after Play ${e1}, button ${eb}; 2 s later ${await countOf(page, pick)}`);
            await press(page, pick, 'reset');
          }
          for (let i = 0; i < N; i++) await press(page, pick, 'next');
          const full = await countOf(page, pick);
          await press(page, pick, 'play');
          const again = await wait(page, pick, (c) => c === at(1), 3000);
          add('restart', full === at(N) && again, `${tag}: ${N} Next gives ${full}; Play gives ${at(1)} within 3 s ${again}`);
          await press(page, pick, 'reset');

          // A figure with no steps: a valid model cannot make one, so a copy of a level spec with its steps removed is mounted into a new card.
          if (isFx && w === 1440 && scheme === 'light') {
            const empty = await page.evaluate(() => {
              const data = document.getElementById('diagrams');
              if (!data) return null;
              const specs = JSON.parse(data.textContent ?? '{}') as Record<string, { steps: unknown[] }>; // ts-gate-ok: the page's own figure data
              const first = Object.keys(specs).find((key) => key.startsWith('level-'));
              if (first === undefined) return null;
              specs['empty-proof'] = { ...specs[first], key: 'empty-proof', steps: [] } as { steps: unknown[] };
              data.textContent = JSON.stringify(specs);
              const card = document.createElement('figure');
              card.className = 'card';
              card.id = 'fig-empty-proof';
              card.setAttribute('data-pc', 'empty');
              card.innerHTML = '<h3>Empty</h3><p class="cap">No steps.</p><div class="fig" role="region" tabindex="0" aria-label="Empty"></div><div class="ctl" data-fx-flow="empty-proof"><a class="deep" href="diagrams/x.html">Open full diagram</a></div>';
              document.body.append(card);
              fxFlow.mount(card);
              return true;
            });
            const e = await bar(page, 'empty-proof');
            add('emptyFigure', empty === true && e !== null && e.count === '0 / 0' && ['play', 'next', 'reset'].every((b) => e.disabled.includes(b)) && errors.length === 0, `${JSON.stringify(e)}; console errors ${errors.length}`);
            await page.evaluate(() => document.getElementById('fig-empty-proof')?.remove());
          }
          end(errors);
          await ctx.close();
        }
      }
    }

    // 390: a figure wider than the phone scrolls sideways inside its card, the player follows the active arrow, the page does not.
    let sideways: Check | null = null;
    if (isFx) {
      const { page, ctx, errors } = await mopen(390, 844, 'reduce', 'light');
      const wide = await page.evaluate((a: { fig: string; area: string }) => [...document.querySelectorAll(a.fig)].findIndex((f) => { const x = f.querySelector(a.area); return x !== null && x.scrollWidth > x.clientWidth; }), { fig: P.fig, area: P.area });
      if (wide >= 0) {
        const dims = (): Promise<{ sw: number; cw: number; left: number; page: number }> => page.evaluate((a: { f: string; area: string }) => {
          const x = document.querySelector(`${a.f} ${a.area}`);
          return { sw: x?.scrollWidth ?? 0, cw: x?.clientWidth ?? 0, left: x?.scrollLeft ?? 0, page: document.documentElement.scrollWidth };
        }, { f: fig(wide), area: P.area });
        const d0 = await dims();
        const N = total(await countOf(page, wide));
        for (let i = 0; i < N; i++) await press(page, wide, 'next');
        await page.waitForTimeout(300);
        const d1 = await dims();
        sideways = { pass: d0.sw > d0.cw && d1.left > 0 && d1.page <= 390, detail: `figure ${wide}: scrollWidth ${d0.sw}, clientWidth ${d0.cw}; after ${N} Next scrollLeft ${d1.left}; page scrollWidth ${d1.page}` };
      }
      end(errors);
      await ctx.close();
    }

    const out2 = {
      chapters: prose.length,
      proseWordsAvg: prose.length === 0 ? 0 : Math.round(prose.reduce((n, c) => n + c.words, 0) / prose.length * 10) / 10,
      proseWords: prose.map((c) => ({ id: c.id, words: c.words })),
      chaptersWithLeadAndBullets: prose.filter((c) => c.lead && c.bullets >= 4 && c.bullets <= 8).length,
      glossary,
      lifelines: seq.lifelines,
      sequences: seq.sequences,
      menu: { sticky: { pass: sticky, detail: `${P.menu} top ${side?.top} after scrolling to the end at 1440` }, widthPx: side === null ? null : side.width, groups, current: { pass: current, detail: marked.join('; ') }, phoneBar, resize, noScript },
      filter,
      cards: { figures, barInCard: done('barInCard'), barInView: done('barInView'), sideways },
      autoplay: { within3s: done('within3s'), pauses: done('pauses'), resumes: done('resumes'), noResumeAtEnd: done('noResumeAtEnd'), reducedMotion: done('reducedMotion') },
      labelsMinPx,
      pageScrollAt390,
      consoleErrors,
      player: { rest: done('rest'), next: done('next'), back: done('back'), reset: done('reset'), resetWhilePlaying: done('resetWhilePlaying'), playPause: done('playPause'), interval: done('interval'), endStops: done('endStops'), restart: done('restart'), emptyFigure: done('emptyFigure') },
      extras: { themeToggle, evidenceAll },
      browser: `chromium ${browser.version()}`,
    };
    fs.writeFileSync(out as string, `${JSON.stringify(out2, null, 2)}\n`);
    // A generated site must pass every check it ran; the owner's page is only measured.
    const checks: [string, Check | null][] = [['menu.sticky', out2.menu.sticky], ['menu.current', out2.menu.current], ['menu.phoneBar', phoneBar], ['menu.resize', resize], ['menu.noScript', noScript], ...Object.entries(filter ?? {}).map(([k, c]): [string, Check | null] => [`filter.${k}`, c]),
      ...Object.entries({ ...out2.cards, ...out2.autoplay, ...out2.player, ...out2.extras }).filter(([, c]) => typeof c === 'object').map(([k, c]): [string, Check | null] => [k, c as Check | null])];
    const failed = checks.filter(([, c]) => c !== null && !c.pass).map(([n]) => n);
    if (labelsMinPx !== null && labelsMinPx < 12) failed.push('labels');
    if (pageScrollAt390) failed.push('pageWidth');
    if (consoleErrors > 0) failed.push('console');
    console.log(isFx ? (failed.length === 0 ? 'OK' : `FAILED: ${failed.join(', ')}`) : `measured ${name}: ${prose.length} chapters, ${out2.proseWordsAvg} words on average`);
    process.exitCode = isFx && failed.length > 0 ? 1 : 0;
  } finally {
    await browser.close();
  }
}

async function a11yRun(): Promise<void> {
  const browser = await chromium.launch();
  try { await a11y(browser); } finally { await browser.close(); }
  finish();
}

(a11yOnly ? a11yRun() : siteOnly ? site() : measureProfile === undefined ? main() : measure(measureProfile)).catch((e: unknown) => { process.stderr.write(`page-check: ${e instanceof Error ? e.stack : String(e)}\n`); process.exit(1); });
