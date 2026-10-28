// generated from src/tests/gates/site-template.test.ts by scripts/build: edit there, not here
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
var assert = __toESM(require("assert"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const repo = path.join(__dirname, "..", "..");
const FILE = "references/system-flow/site-template.html";
assert.ok(fs.existsSync(path.join(repo, FILE)), `${FILE} exists`);
const tpl = fs.readFileSync(path.join(repo, FILE), "utf8");
const css = /<style>([\s\S]*?)<\/style>/.exec(tpl)?.[1] ?? "";
assert.ok(css.length > 0, `${FILE} has a style block`);
for (const s of ["TITLE", "NAME", "HEADER", "LEGEND", "MENU", "CHAPTERS", "MAP_DATA", "DIAGRAMS", "SITE_INDEX", "FOOTER"]) {
  assert.ok(tpl.includes(`<!-- slot: ${s}`), `${FILE} holds the ${s} slot`);
}
assert.deepStrictEqual(tpl.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, "").match(/https?:\/\//g) ?? [], [], `${FILE} names no host`);
assert.ok(!tpl.includes("Shamel"), `${FILE} carries no Shamel string`);
const rule = (sel) => new RegExp(`(?:^|\\n)${sel.replace(/[.#(),:]/g, "\\$&")}\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
for (const part of ["position:sticky", "top:0", "max-block-size:100vh"]) assert.ok(rule("#side").includes(part), `#side rule holds ${part}`);
assert.ok(rule("#menu").includes("overflow:auto"), "#menu rule holds overflow:auto");
assert.ok(rule(".wrap").includes("grid-template-columns:240px"), "the menu column is 240px");
assert.ok(tpl.includes('<details id="menu-bar">'), "#menu-bar carries no open attribute");
assert.ok(/<nav id="menu" aria-label="Chapters">\s*<input id="filter" type="search" aria-label="Filter chapters, parts, terms"[^>]*>/.test(tpl), "input#filter opens nav#menu");
assert.ok(/<p id="filter-count" aria-live="polite"[^>]*><\/p>/.test(tpl), "p#filter-count is a polite live region");
for (const part of ['"site-index"', '" matches"', '"Nothing matches"', '"li"', '"Escape"']) assert.ok(tpl.includes(part), `the filter script holds ${part}`);
assert.ok(rule("a.term") !== "", "an a.term rule exists");
assert.ok(tpl.includes("matchMedia('(min-width: 900px)')"), "the script follows the 900px query");
assert.ok(
  /@media \(min-width: 900px\)\s*\{\s*@supports selector\(::details-content\)\s*\{[^}]*#menu-bar::details-content\{[^}]*content-visibility:visible[^}]*display:block/.test(css),
  "at 900px and up, #menu-bar::details-content is shown inside @supports selector(::details-content)"
);
assert.ok(css.includes("@media (max-width: 899.98px)"), "a narrow block below 900px exists");
assert.ok(rule(".card") !== "", "a .card rule exists");
assert.ok(!/(?:^|;)\s*overflow(?:-x|-y)?\s*:/.test(rule(".card")), ".card holds no overflow declaration");
for (const part of ["position:sticky", "bottom:0"]) assert.ok(rule(".ctl").includes(part), `.ctl rule holds ${part}`);
assert.ok(rule(".fig").includes("overflow-x:auto"), ".fig rule holds overflow-x:auto");
const px = (body, prop) => Number(new RegExp(`(?:^|;)${prop}:(\\d+(?:\\.\\d+)?)px`).exec(body)?.[1] ?? 0);
assert.ok(px(rule(".ctl button.play"), "min-inline-size") >= 84, "button.play is at least 84px wide");
assert.ok((px(rule(".ctl button"), "min-block-size") || px(rule("button"), "min-block-size")) >= 36, "every bar button is at least 36px tall");
assert.deepStrictEqual(
  [...css.matchAll(/(?:^|\n|\})([^{}]*svg[^{}]*)\{([^}]*)\}/g)].filter((m) => /(?:max-)?width:100%|(?:max-)?inline-size:100%/.test(m[2] ?? "")).map((m) => m[1]),
  [],
  "no rule shrinks an svg to its box"
);
const TOKENS = /* @__PURE__ */ new Set(["--paper", "--panel", "--ink", "--muted", "--rule", "--code", "--accent", "--accent-tint", "--warn", "--alert", "--violet", "--info", "--info-tint"]);
const bodies = [...css.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1] ?? "");
assert.deepStrictEqual(bodies.filter((b) => /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(/.test(b)), [], "no colour literal in a rule");
assert.deepStrictEqual([...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1] ?? ""))].filter((v) => !TOKENS.has(v)), [], "only fx token variables");
assert.deepStrictEqual(tpl.match(/(?<![\w-])(margin|padding|border)-(left|right)\b|(?<![\w-])(left|right)\s*:/g) ?? [], [], `${FILE} uses logical properties`);
for (const part of ['localStorage.setItem("fx-theme"', 'class="legend"', ".react-flow__edge-textbg{fill:var(--panel)}"]) assert.ok(tpl.includes(part), `${FILE} keeps ${part}`);
assert.ok(!rule("table").includes("display:block"), "the table rule keeps the table a table");
for (const part of ["max-width:100%", "overflow-x:auto"]) assert.ok(rule(".table-scroll").includes(part), `.table-scroll rule keeps ${part}`);
assert.ok(rule("th,td").includes("overflow-wrap:anywhere"), "table cells wrap long words");
assert.ok(rule("body").includes("overflow-wrap:anywhere"), "body wraps long words");
const table = fs.readFileSync(path.join(repo, "references/visual/visual-assets.md"), "utf8");
const loads = [...tpl.matchAll(/\s(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1] ?? "");
assert.ok(loads.length > 0, "the template loads files");
for (const l of loads) {
  assert.ok(l.startsWith("../_assets/"), `${l} loads through ../_assets/`);
  assert.ok(table.includes(`| \`${l.slice("../_assets/".length)}\` |`), `${l} has a row in the assets table`);
}
assert.ok(tpl.includes('\n<link rel="stylesheet" href="../_assets/fx-tokens-1.css">\n'), "the fx-tokens-1.css link line is verbatim");
console.log("site-template.test.js: OK");
