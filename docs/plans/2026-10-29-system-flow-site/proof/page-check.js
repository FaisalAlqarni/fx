// generated from src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts by scripts/build: edit there, not here
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_url = require("url");
const [file, out] = process.argv.slice(2);
if (file === void 0 || out === void 0) {
  process.stderr.write("usage: page-check.js <index.html> <out.json>\n");
  process.exit(2);
}
const url = (0, import_url.pathToFileURL)(path.resolve(file)).href;
const { chromium } = require("playwright");
const results = {};
const record = (name, pass, detail) => {
  results[name] = { pass, detail };
};
async function open(browser, width, height, js = true) {
  const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type?.() === "error") errors.push(m.text?.() ?? "");
  });
  page.on("pageerror", (e) => {
    errors.push(e.message ?? String(e));
  });
  await page.goto(url);
  await page.waitForTimeout(300);
  return { page, ctx, errors };
}
const toMiddle = (page, id) => page.evaluate((cid) => {
  const el = document.getElementById(cid);
  if (!el) return -1;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3, behavior: "instant" });
  return window.scrollY;
}, id);
const linkState = (page, id) => page.evaluate((cid) => {
  const a = document.querySelector(`#menu a[href="#${cid}"]`);
  const menu = document.getElementById("menu");
  if (!a || !menu) return null;
  const r = a.getBoundingClientRect(), m = menu.getBoundingClientRect();
  return { current: a.getAttribute("aria-current"), inside: r.top >= m.top - 1 && r.bottom <= m.bottom + 1, scrollY: window.scrollY, menuTop: menu.scrollTop, menuH: menu.clientHeight, menuFull: menu.scrollHeight };
}, id);
const box = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, width: r.width, height: r.height };
}, sel);
const isOpen = (page) => page.evaluate(() => document.getElementById("menu-bar")?.open ?? null);
async function main() {
  const browser = await chromium.launch();
  const consoleErrors = [];
  try {
    {
      const { page, ctx, errors } = await open(browser, 1440, 900);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      await page.waitForTimeout(300);
      const side = await box(page, "#side");
      const menuVisible = await page.isVisible("#menu");
      record(
        "menuSticky",
        side !== null && Math.abs(side.top) < 1 && side.width >= 230 && side.width <= 250 && menuVisible,
        `#side top ${side?.top}, width ${side?.width}, #menu visible ${menuVisible}`
      );
      const spy = [];
      let ok = true;
      for (const id of ["ch-01-start-what", "ch-03-start-request", "ch-05-s1"]) {
        const y2 = await toMiddle(page, id);
        await page.waitForTimeout(500);
        const s2 = await linkState(page, id);
        const pass = s2 !== null && s2.current === "location" && s2.scrollY === y2;
        ok &&= pass;
        spy.push(`${id}: aria-current ${s2?.current}, scrollY ${s2?.scrollY} (set ${y2})`);
      }
      await page.setViewportSize({ width: 1440, height: 400 });
      await page.waitForTimeout(300);
      const before = await page.evaluate(() => {
        const m = document.getElementById("menu");
        if (m) m.scrollTop = m.scrollHeight;
        return m?.scrollTop ?? -1;
      });
      await toMiddle(page, "ch-01-start-what");
      await page.waitForTimeout(500);
      const atTop = await linkState(page, "ch-01-start-what");
      const y = await toMiddle(page, "ch-05-s1");
      await page.waitForTimeout(500);
      const s = await linkState(page, "ch-05-s1");
      const scrolls = atTop !== null && atTop.menuFull > atTop.menuH;
      const moved = atTop !== null && s !== null && s.menuTop !== atTop.menuTop;
      const short = scrolls && moved && s !== null && s.inside && s.current === "location" && s.scrollY === y && atTop.inside;
      record("scrollSpy", ok && short, `${spy.join("; ")}; at 400: menu ${atTop?.menuH}/${atTop?.menuFull} px, scrollTop ${before} then ${atTop?.menuTop} (ch-01, inside ${atTop?.inside}) then ${s?.menuTop} (ch-05-s1, inside ${s?.inside}, aria-current ${s?.current}), scrollY ${s?.scrollY} (set ${y})`);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      const theme = async () => page.evaluate(() => [document.documentElement.dataset.theme ?? "", localStorage.getItem("fx-theme") ?? ""]);
      await page.click("#theme");
      const t1 = await theme();
      await page.click("#theme");
      const t2 = await theme();
      const flips = t1[0] !== t2[0] && [t1[0], t2[0]].sort().join() === "dark,light" && t1[1] === t1[0] && t2[1] === t2[0];
      record("themeToggle", flips, `after one click ${t1.join("/")}, after two ${t2.join("/")}`);
      await page.click("#evall");
      const ev = await page.evaluate(() => {
        const d = [...document.querySelectorAll("details.evidence")];
        return { n: d.length, open: d.filter((x) => x.open).length };
      });
      record("evidenceAll", ev.n > 0 && ev.open === ev.n, `${ev.open} of ${ev.n} details.evidence open`);
      consoleErrors.push(...errors.map((e) => `1440: ${e}`));
      await ctx.close();
    }
    {
      const { page, ctx, errors } = await open(browser, 390, 844);
      const closed = await isOpen(page) === false;
      await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "instant" }));
      await page.waitForTimeout(200);
      const sum = await box(page, "#menu-bar > summary");
      const th = await box(page, "#theme");
      const themeVisible = await page.isVisible("#theme");
      await page.click("#menu-bar > summary");
      await page.waitForTimeout(100);
      const opened = await isOpen(page) === true && await page.isVisible('#menu a[href="#ch-05-s1"]');
      await page.click('#menu a[href="#ch-05-s1"]');
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => ({ open: document.getElementById("menu-bar")?.open ?? null, focus: document.activeElement === document.querySelector("#menu-bar > summary") }));
      record(
        "phoneBar",
        closed && sum !== null && Math.abs(sum.top) < 1 && themeVisible && th !== null && Math.abs(th.top - sum.top) <= 8 && opened && after.open === false && after.focus,
        `closed at load ${closed}; summary top ${sum?.top}, theme top ${th?.top} visible ${themeVisible}; summary opens list ${opened}; after a link: open ${after.open}, focus on summary ${after.focus}`
      );
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      record("pageWidth", width <= 390, `scrollWidth ${width} at 390`);
      consoleErrors.push(...errors.map((e) => `390: ${e}`));
      await ctx.close();
    }
    {
      const { page, ctx, errors } = await open(browser, 390, 844);
      const start = await isOpen(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      let wide = false;
      for (let i = 0; i < 10 && !wide; i++) {
        await page.waitForTimeout(50);
        wide = await isOpen(page) === true && await page.isVisible('#menu a[href="#ch-01-start-what"]');
      }
      await page.setViewportSize({ width: 390, height: 844 });
      let narrow = false;
      for (let i = 0; i < 10 && !narrow; i++) {
        await page.waitForTimeout(50);
        narrow = await isOpen(page) === false;
      }
      record("resize", start === false && wide && narrow, `open at 390: ${start}; open with link visible within 500 ms at 1440: ${wide}; closed again at 390: ${narrow}`);
      consoleErrors.push(...errors.map((e) => `resize: ${e}`));
      await ctx.close();
    }
    {
      const w = await open(browser, 1440, 900, false);
      let shown = await w.page.isVisible('#menu a[href="#ch-01-start-what"]');
      let how = "link visible without a click";
      if (!shown && await w.page.isVisible("#menu-bar > summary")) {
        await w.page.click("#menu-bar > summary");
        shown = await w.page.isVisible('#menu a[href="#ch-01-start-what"]');
        how = "link visible after the Chapters summary";
      }
      await w.ctx.close();
      const n = await open(browser, 390, 844, false);
      const closed = !await n.page.isVisible('#menu a[href="#ch-01-start-what"]');
      await n.page.click("#menu-bar > summary");
      const opens = await n.page.isVisible('#menu a[href="#ch-01-start-what"]');
      await n.ctx.close();
      record("noScript", shown && closed && opens, `1440: ${shown ? how : "link not reachable"}; 390: closed at load ${closed}, summary shows the link ${opens}`);
    }
    record("console", consoleErrors.length === 0, consoleErrors.length === 0 ? "0 errors at 1440 and 390" : consoleErrors.join(" | "));
    results.browser = { pass: true, detail: `chromium ${browser.version()}` };
  } finally {
    await browser.close();
  }
  fs.writeFileSync(out, `${JSON.stringify(results, null, 2)}
`);
  const failed = Object.entries(results).filter(([, c]) => !c.pass).map(([n]) => n);
  console.log(failed.length === 0 ? "OK" : `FAILED: ${failed.join(", ")}`);
  process.exit(failed.length === 0 ? 0 : 1);
}
main().catch((e) => {
  process.stderr.write(`page-check: ${e instanceof Error ? e.stack : String(e)}
`);
  process.exit(1);
});
