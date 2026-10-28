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
async function open(browser, width, height, js = true, reducedMotion = "no-preference") {
  const ctx = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js, reducedMotion });
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
const menuState = (page) => page.evaluate(() => {
  const shown = (e) => e.closest("[hidden]") === null;
  const all = (s) => [...document.querySelectorAll(s)].filter(shown);
  return {
    chapters: all("#menu li:not(.part):not(.term) > a").map((a) => a.getAttribute("href") ?? ""),
    parts: all("#menu li.part").map((li) => ({ text: li.textContent ?? "", under: li.closest("li:not(.part)")?.querySelector("a")?.getAttribute("href") ?? "" })),
    terms: all("#menu li.term a").map((a) => a.getAttribute("href") ?? ""),
    count: document.getElementById("filter-count")?.textContent ?? ""
  };
});
const bar = (page, key) => page.evaluate((k) => {
  const ctl = document.querySelector(`#fig-${k} .ctl`);
  if (!ctl) return null;
  const q = (s) => ctl.querySelector(s);
  return {
    count: q(".count")?.textContent ?? "",
    narr: q(".narr")?.textContent ?? "",
    play: q("button.play")?.textContent ?? "",
    pressed: q("button.play")?.hasAttribute("aria-pressed") ?? true,
    disabled: [...ctl.querySelectorAll("button")].filter((b) => b.disabled).map((b) => b.className)
  };
}, key);
const press = (page, key, button) => page.click(`#fig-${key} .ctl button.${button}`);
const count = async (page, key) => (await bar(page, key))?.count ?? "no bar";
async function until(page, key, want, ms) {
  for (let t = 0; t <= ms; t += 50) {
    if (want(await count(page, key))) return true;
    await page.waitForTimeout(50);
  }
  return false;
}
const figToMiddle = (page, key) => page.evaluate((k) => {
  const el = document.querySelector(`#fig-${k} .fig`);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2, behavior: "instant" });
}, key);
const cardAway = (page, key) => page.evaluate((k) => {
  const c = document.getElementById(`fig-${k}`);
  if (!c) return false;
  const r = c.getBoundingClientRect();
  const up = r.top + window.scrollY - window.innerHeight - 20;
  window.scrollTo({ top: up >= 0 ? up : r.bottom + window.scrollY + 20, behavior: "instant" });
  const n = c.getBoundingClientRect();
  return n.bottom <= 0 || n.top >= window.innerHeight;
}, key);
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
    {
      const lines = { filterTerm: [], filterPart: [], filterNone: [], filterClear: [], termLink: [] };
      const failed2 = /* @__PURE__ */ new Set();
      const say = (name, pass, detail) => {
        lines[name]?.push(detail);
        if (!pass) failed2.add(name);
      };
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        const { page, ctx, errors } = await open(browser, w, h);
        if (await isOpen(page) === false) await page.click("#menu-bar > summary");
        const start = await menuState(page);
        await page.fill("#filter", "link");
        const term = await menuState(page);
        say(
          "filterTerm",
          term.chapters.includes("#ch-05-s1") && term.terms.includes("#term-link") && /^\d+ matches$/.test(term.count),
          `${w}: chapters ${term.chapters.join(" ")}; terms ${term.terms.join(" ")}; count "${term.count}"`
        );
        await page.fill("#filter", "database");
        const part = await menuState(page);
        say("filterPart", part.parts.some((p) => p.text.trim() === "Database" && p.under === "#ch-02-start-parts"), `${w}: parts ${JSON.stringify(part.parts)}`);
        await page.fill("#filter", "zzzz");
        const none = await menuState(page);
        say("filterNone", none.count === "Nothing matches" && none.chapters.length === 0, `${w}: count "${none.count}", chapters ${none.chapters.length}`);
        await page.fill("#filter", "link");
        await page.press("#filter", "Escape");
        const clear = await menuState(page);
        const all = await page.evaluate(() => [...document.querySelectorAll("#menu li.part, #menu li.term")].length);
        say(
          "filterClear",
          clear.chapters.join() === start.chapters.join() && start.chapters.length > 5 && all === 0,
          `${w}: ${clear.chapters.length} of ${start.chapters.length} chapter links back; li.part and li.term left ${all}`
        );
        if (await isOpen(page) === true && w < 900) await page.click("#menu-bar > summary");
        await page.click("#ch-05-s1 a.term");
        await page.waitForTimeout(1e3);
        const row = await page.evaluate(() => {
          const r = document.getElementById("term-link")?.getBoundingClientRect();
          return r === void 0 ? null : { top: Math.round(r.top), bottom: Math.round(r.bottom), inView: r.top >= 0 && r.bottom <= window.innerHeight };
        });
        say("termLink", row !== null && row.inView, `${w}: #term-link at ${row?.top}..${row?.bottom}`);
        consoleErrors.push(...errors.map((e) => `${w} filter: ${e}`));
        await ctx.close();
      }
      for (const [name, l] of Object.entries(lines)) record(name, l.length === 2 && !failed2.has(name), l.join("; "));
    }
    {
      const { page, ctx, errors } = await open(browser, 1440, 900, true, "reduce");
      const K = "seq-turn";
      const REST = "Press Play, or step with Next.";
      const rest = await bar(page, K);
      record("rest", rest !== null && rest.count === "0 / 5" && rest.narr === REST && rest.play === "Play", JSON.stringify(rest));
      await press(page, K, "next");
      const one = await bar(page, K);
      record("next", one !== null && one.count === "1 / 5" && one.narr.startsWith("Step 1: "), JSON.stringify(one));
      await press(page, K, "reset");
      for (let i = 0; i < 4; i++) await press(page, K, "next");
      const four = await count(page, K);
      await press(page, K, "reset");
      const reset = await bar(page, K);
      await page.waitForTimeout(2e3);
      const later = await count(page, K);
      record(
        "reset",
        four === "4 / 5" && reset !== null && reset.count === "0 / 5" && reset.narr === REST && reset.play === "Play" && later === "0 / 5",
        `after four Next ${four}; after Reset ${JSON.stringify(reset)}; 2 s later ${later}`
      );
      await press(page, K, "play");
      const two = await until(page, K, (c) => c === "2 / 5", 4e3);
      await press(page, K, "reset");
      const r0 = await count(page, K);
      await page.waitForTimeout(2e3);
      const r1 = await count(page, K);
      record("resetWhilePlaying", two && r0 === "0 / 5" && r1 === "0 / 5", `reached 2 / 5 ${two}; after Reset ${r0}; 2 s later ${r1}`);
      await press(page, K, "play");
      const playing = await bar(page, K);
      const reached = await until(page, K, (c) => c === "2 / 5", 4e3);
      await press(page, K, "play");
      const paused = await bar(page, K);
      await page.waitForTimeout(2e3);
      const after = await count(page, K);
      record(
        "playPause",
        playing !== null && playing.play === "Pause" && !playing.pressed && reached && paused !== null && paused.play === "Play" && !paused.pressed && after === paused.count,
        `on Play ${JSON.stringify(playing)}; reached 2 / 5 ${reached}; on Pause ${JSON.stringify(paused)}; 2 s later ${after}`
      );
      await press(page, K, "reset");
      await press(page, K, "play");
      const t0 = await count(page, K);
      await page.waitForTimeout(1e3);
      const t1 = await count(page, K);
      await page.waitForTimeout(1e3);
      const t2 = await count(page, K);
      record("interval", t0 === "1 / 5" && t1 === "1 / 5" && t2 === "2 / 5", `at once ${t0}; 1.0 s ${t1}; 2.0 s ${t2}`);
      await press(page, K, "reset");
      await press(page, K, "play");
      await page.waitForTimeout(7500);
      const end = await bar(page, K);
      await page.waitForTimeout(2e3);
      const end2 = await count(page, K);
      record("endStops", end !== null && end.count === "5 / 5" && end.play === "Play" && end2 === "5 / 5", `7.5 s after Play ${JSON.stringify(end)}; 2 s later ${end2}`);
      await press(page, K, "reset");
      await press(page, K, "next");
      await press(page, K, "back");
      const back = await count(page, K);
      record("back", back === "0 / 5", `Next then Back: ${back}`);
      for (let i = 0; i < 5; i++) await press(page, K, "next");
      const five = await count(page, K);
      await press(page, K, "play");
      const again = await until(page, K, (c) => c === "1 / 5", 2e3);
      record("restart", five === "5 / 5" && again, `five Next ${five}; Play gives 1 / 5 within 2 s ${again}`);
      await press(page, K, "reset");
      const empty = await page.evaluate(() => {
        const data = document.getElementById("diagrams");
        if (!data) return null;
        const specs = JSON.parse(data.textContent ?? "{}");
        const first = Object.keys(specs).find((k) => k.startsWith("level-"));
        if (first === void 0) return null;
        specs["empty-proof"] = { ...specs[first], key: "empty-proof", steps: [] };
        data.textContent = JSON.stringify(specs);
        const card = document.createElement("figure");
        card.className = "card";
        card.id = "fig-empty-proof";
        card.innerHTML = '<h3>Empty</h3><p class="cap">No steps.</p><div class="fig" role="region" tabindex="0" aria-label="Empty"></div><div class="ctl" data-fx-flow="empty-proof"><a class="deep" href="diagrams/x.html">Open full diagram</a></div>';
        document.body.append(card);
        fxFlow.mount(card);
        return true;
      });
      const e = await bar(page, "empty-proof");
      record(
        "emptyFigure",
        empty === true && e !== null && e.count === "0 / 0" && ["play", "next", "reset"].every((b) => e.disabled.includes(b)) && errors.length === 0,
        `${JSON.stringify(e)}; console errors ${errors.length}`
      );
      const inCard = await page.evaluate(() => [...document.querySelectorAll("figure.card")].map((c) => {
        const r = c.getBoundingClientRect(), b = c.querySelector(".ctl")?.getBoundingClientRect();
        return b !== void 0 && b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5 ? "" : c.id;
      }).filter((x) => x !== ""));
      results.barInCard = { pass: inCard.length === 0, detail: inCard.length === 0 ? "every .ctl inside its card at 1440" : `outside at 1440: ${inCard.join(", ")}` };
      consoleErrors.push(...errors.map((x) => `player: ${x}`));
      await ctx.close();
    }
    const auto = { autoplay: [], pause: [], resume: [], noResumeAtEnd: [], reducedMotion: [] };
    const fails = {};
    const note = (name, pass, detail) => {
      auto[name].push(detail);
      if (!pass) fails[name] = true;
    };
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      {
        const { page, ctx, errors } = await open(browser, w, h);
        const keys = await page.evaluate(() => [...document.querySelectorAll(".ctl[data-fx-flow]")].map((c) => c.getAttribute("data-fx-flow") ?? ""));
        for (const k of keys) {
          await figToMiddle(page, k);
          const moved = await until(page, k, (c) => !c.startsWith("0 "), 3e3);
          note("autoplay", moved, `${w}: ${k} ${moved ? "played" : `stayed ${await count(page, k)}`}`);
        }
        consoleErrors.push(...errors.map((x) => `${w} autoplay: ${x}`));
        await ctx.close();
      }
      {
        const { page, ctx, errors } = await open(browser, w, h);
        const K = "seq-turn";
        await figToMiddle(page, K);
        await until(page, K, (c) => c === "1 / 5", 3e3);
        const away = await cardAway(page, K);
        await page.waitForTimeout(1e3);
        const c1 = await count(page, K);
        await page.waitForTimeout(2e3);
        const c2 = await count(page, K);
        note("pause", away && c1 === c2 && c1 !== "5 / 5", `${w}: card out of view ${away}; ${c1} then ${c2}`);
        await figToMiddle(page, K);
        const rose = await until(page, K, (c) => Number(c.split(" ")[0]) > Number(c2.split(" ")[0]), 3e3);
        note("resume", rose, `${w}: from ${c2} to ${await count(page, K)}`);
        consoleErrors.push(...errors.map((x) => `${w} pause: ${x}`));
        await ctx.close();
      }
      {
        const { page, ctx, errors } = await open(browser, w, h);
        const K = "seq-turn";
        await figToMiddle(page, K);
        const ended = await until(page, K, (c) => c === "5 / 5", 1e4);
        const away = await cardAway(page, K);
        await page.waitForTimeout(1e3);
        await figToMiddle(page, K);
        await page.waitForTimeout(3e3);
        const b = await bar(page, K);
        note("noResumeAtEnd", ended && away && b !== null && b.count === "5 / 5" && b.play === "Play", `${w}: reached 5 / 5 ${ended}; after the return ${b?.count}, button ${b?.play}`);
        consoleErrors.push(...errors.map((x) => `${w} end: ${x}`));
        await ctx.close();
      }
      {
        const { page, ctx, errors } = await open(browser, w, h, true, "reduce");
        const K = "seq-turn";
        await figToMiddle(page, K);
        await page.waitForTimeout(3e3);
        const c = await count(page, K);
        note("reducedMotion", c === "0 / 5", `${w}: ${c} 3 s after reaching the middle`);
        consoleErrors.push(...errors.map((x) => `${w} reduced: ${x}`));
        await ctx.close();
      }
    }
    for (const [name, lines] of Object.entries(auto)) record(name, lines.length > 0 && !fails[name], lines.join("; "));
    {
      const { page, ctx, errors } = await open(browser, 1440, 600, true, "reduce");
      const spots = [];
      let ok = true;
      for (const at of [0.1, 0.5, 0.9]) {
        const s = await page.evaluate((f) => {
          const c = document.getElementById("fig-level-tall");
          const ctl = c?.querySelector(".ctl");
          if (!c || !ctl) return null;
          const r = c.getBoundingClientRect();
          const y = f === 0.1 ? r.top - window.innerHeight * 0.1 : f === 0.5 ? r.top + r.height / 2 - window.innerHeight / 2 : r.bottom - window.innerHeight * 0.9;
          window.scrollTo({ top: y + window.scrollY, behavior: "instant" });
          const n = c.getBoundingClientRect(), b = ctl.getBoundingClientRect();
          return { card: [Math.round(n.top), Math.round(n.bottom)], bar: [Math.round(b.top), Math.round(b.bottom)], h: n.height, inside: b.top >= -0.5 && b.bottom <= window.innerHeight + 0.5 };
        }, at);
        ok &&= s !== null && s.inside && s.h > 600;
        spots.push(`${at}: card ${s?.card.join("..")}, bar ${s?.bar.join("..")}`);
      }
      record("barInView", ok, `fig-level-tall at 1440 x 600: ${spots.join("; ")}`);
      consoleErrors.push(...errors.map((x) => `barInView: ${x}`));
      await ctx.close();
    }
    {
      const { page, ctx, errors } = await open(browser, 390, 844, true, "reduce");
      const dims = () => page.evaluate(() => {
        const f = document.querySelector("#fig-seq-wide .fig");
        return { sw: f?.scrollWidth ?? 0, cw: f?.clientWidth ?? 0, left: f?.scrollLeft ?? 0, page: document.documentElement.scrollWidth };
      });
      const d0 = await dims();
      for (let i = 0; i < 5; i++) await press(page, "seq-wide", "next");
      await page.waitForTimeout(300);
      const d1 = await dims();
      const last = await count(page, "seq-wide");
      record(
        "sideways",
        d0.sw > d0.cw && last === "5 / 5" && d1.left > 0 && d1.page <= 390,
        `.fig scrollWidth ${d0.sw}, clientWidth ${d0.cw}; at ${last} scrollLeft ${d1.left}; page scrollWidth ${d1.page}`
      );
      const inCard = await page.evaluate(() => [...document.querySelectorAll("figure.card")].map((c) => {
        const r = c.getBoundingClientRect(), b = c.querySelector(".ctl")?.getBoundingClientRect();
        return b !== void 0 && b.top >= r.top - 0.5 && b.bottom <= r.bottom + 0.5 ? "" : c.id;
      }).filter((x) => x !== ""));
      const prior = results.barInCard;
      results.barInCard = { pass: (prior?.pass ?? false) && inCard.length === 0, detail: `${prior?.detail}; ${inCard.length === 0 ? "every .ctl inside its card at 390" : `outside at 390: ${inCard.join(", ")}`}` };
      consoleErrors.push(...errors.map((x) => `sideways: ${x}`));
      await ctx.close();
    }
    {
      const small = [];
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        const { page, ctx } = await open(browser, w, h, true, "reduce");
        const found = await page.evaluate(() => [...document.querySelectorAll(".fig svg text")].map((t) => getComputedStyle(t).fontSize).filter((s) => parseFloat(s) < 12));
        const total = await page.evaluate(() => [...document.querySelectorAll(".fig svg text")].length);
        if (total === 0) small.push(`${w}: no svg text found`);
        if (found.length) small.push(`${w}: ${found.join(", ")}`);
        await ctx.close();
      }
      record("labels", small.length === 0, small.length === 0 ? "every figure text is 12 px or more at 1440 and 390" : small.join("; "));
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
