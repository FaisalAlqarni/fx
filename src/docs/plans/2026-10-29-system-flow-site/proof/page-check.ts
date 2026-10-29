// Run: NODE_PATH=<PW>/node_modules PLAYWRIGHT_BROWSERS_PATH=<PW>/browsers node docs/plans/2026-10-29-system-flow-site/proof/page-check.js <index.html> <out.json>
// Site mode: ... page-check.js --site <index.html> <out.json> runs only the checks that find their own targets on any built
// site (arrowStyle, fitAt1440, panelEscape, termLinks); the default mode runs them too, after checks bound to the fixture's ids.
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
  getBoundingClientRect(): Rect; getAttribute(n: string): string | null; hasAttribute(n: string): boolean; scrollTop: number; scrollHeight: number; clientHeight: number; open: boolean;
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
const measureProfile = flag('--measure');
const outDir = flag('--out-dir');
const [file, out] = args;
if (file === undefined || out === undefined || (siteOnly && measureProfile !== undefined) || (measureProfile !== undefined && measureProfile !== 'owner' && measureProfile !== 'fx')) {
  process.stderr.write('usage: page-check.js [--site | --measure owner|fx] [--out-dir <dir>] <index.html> <out.json>\n');
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
        if (r.reply !== !!a.dash) bad.push(`${k} #${i + 1}: reply ${r.reply}, dash ${a.dash}`);
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
      const after = await page.evaluate(() => ({ open: document.getElementById('menu-bar')?.open ?? null, focus: document.activeElement === document.querySelector('#menu-bar > summary') }));
      record('phoneBar', closed && sum !== null && Math.abs(sum.top) < 1 && themeVisible && th !== null && Math.abs(th.top - sum.top) <= 8 && opened && after.open === false && after.focus,
        `closed at load ${closed}; summary top ${sum?.top}, theme top ${th?.top} visible ${themeVisible}; summary opens list ${opened}; after a link: open ${after.open}, focus on summary ${after.focus}`);
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
        const after = await page.evaluate(() => ({ open: document.getElementById('menu-bar')?.open ?? null, focus: document.activeElement === document.querySelector('#menu-bar > summary') }));
        phoneBar = { pass: closed && sum !== null && Math.abs(sum.top) < 1 && opened && after.open === false && after.focus, detail: `closed at load ${closed}; summary top ${sum?.top} after scrolling 1500; opens the list ${opened}; after a link: open ${after.open}, focus on summary ${after.focus}` };
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

(siteOnly ? site() : measureProfile === undefined ? main() : measure(measureProfile)).catch((e: unknown) => { process.stderr.write(`page-check: ${e instanceof Error ? e.stack : String(e)}\n`); process.exit(1); });
