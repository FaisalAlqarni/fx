// Run: NODE_PATH=<PW>/node_modules PLAYWRIGHT_BROWSERS_PATH=<PW>/browsers node docs/plans/2026-10-29-system-flow-site/proof/page-check.js <index.html> <out.json>
// Opens a built system flow site in Chromium and checks the page shell: the sticky menu, the scroll spy,
// the phone top bar, a resize across 900px, the menu without JavaScript, page width, theme, evidence
// and console errors. Writes one JSON object of named checks, each { pass, detail }; exits 1 when any fails.
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

type Check = { pass: boolean; detail: string };
// The DOM names the page.evaluate callbacks use, declared module-local: a `/// <reference lib="dom" />`
// line would give DOM globals to every Node source under src/ (tests/gates/ts-toolchain.test.sh).
type Rect = { top: number; bottom: number; width: number; height: number };
type El = { getBoundingClientRect(): Rect; getAttribute(n: string): string | null; scrollTop: number; scrollHeight: number; clientHeight: number; open: boolean };
declare const document: {
  getElementById(id: string): El | null; querySelector(s: string): El | null; querySelectorAll(s: string): Iterable<El>;
  documentElement: { scrollHeight: number; scrollWidth: number; dataset: Record<string, string | undefined> }; activeElement: unknown;
};
declare const window: { scrollY: number; innerHeight: number; scrollTo(o: { top: number; behavior: 'instant' }): void };
declare const localStorage: { getItem(k: string): string | null };
type Page = {
  goto(url: string): Promise<unknown>;
  evaluate<T, A = unknown>(fn: (arg: A) => T, arg?: A): Promise<T>;
  setViewportSize(s: { width: number; height: number }): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  click(sel: string): Promise<void>;
  isVisible(sel: string): Promise<boolean>;
  on(ev: string, fn: (x: { type?: () => string; text?: () => string; message?: string }) => void): void;
};
type Context = { newPage(): Promise<Page>; close(): Promise<void> };
type Browser = { newContext(o: object): Promise<Context>; close(): Promise<void>; version(): string };

const [file, out] = process.argv.slice(2);
if (file === undefined || out === undefined) {
  process.stderr.write('usage: page-check.js <index.html> <out.json>\n');
  process.exit(2);
}
const url = pathToFileURL(path.resolve(file)).href;
const { chromium } = require('playwright') as { chromium: { launch(): Promise<Browser> } }; // ts-gate-ok: Playwright comes from NODE_PATH, not a dependency
const results: Record<string, Check> = {};
const record = (name: string, pass: boolean, detail: string): void => { results[name] = { pass, detail }; };

async function open(browser: Browser, width: number, height: number, js = true): Promise<{ page: Page; ctx: Context; errors: string[] }> {
  const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js });
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
const isOpen = (page: Page) => page.evaluate(() => document.getElementById('menu-bar')?.open ?? null);

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
    record('console', consoleErrors.length === 0, consoleErrors.length === 0 ? '0 errors at 1440 and 390' : consoleErrors.join(' | '));
    results.browser = { pass: true, detail: `chromium ${browser.version()}` };
  } finally {
    await browser.close();
  }
  fs.writeFileSync(out as string, `${JSON.stringify(results, null, 2)}\n`);
  const failed = Object.entries(results).filter(([, c]) => !c.pass).map(([n]) => n);
  console.log(failed.length === 0 ? 'OK' : `FAILED: ${failed.join(', ')}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e: unknown) => { process.stderr.write(`page-check: ${e instanceof Error ? e.stack : String(e)}\n`); process.exit(1); });
