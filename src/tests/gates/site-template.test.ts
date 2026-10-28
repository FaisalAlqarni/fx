// Run: node tests/gates/site-template.test.js
// The system flow site template: its slots, its sticky menu contract, and the kit rules a page
// template keeps (loads only listed ../_assets/ files, names no host, fx token colours, logical properties).
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const repo = path.join(__dirname, '..', '..');
const FILE = 'references/system-flow/site-template.html';
assert.ok(fs.existsSync(path.join(repo, FILE)), `${FILE} exists`);
const tpl = fs.readFileSync(path.join(repo, FILE), 'utf8');
const css = /<style>([\s\S]*?)<\/style>/.exec(tpl)?.[1] ?? '';
assert.ok(css.length > 0, `${FILE} has a style block`);

for (const s of ['TITLE', 'NAME', 'HEADER', 'LEGEND', 'MENU', 'CHAPTERS', 'MAP_DATA', 'DIAGRAMS', 'SITE_INDEX', 'FOOTER']) {
  assert.ok(tpl.includes(`<!-- slot: ${s}`), `${FILE} holds the ${s} slot`);
}
assert.deepStrictEqual(tpl.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '').match(/https?:\/\//g) ?? [], [], `${FILE} names no host`);
assert.ok(!tpl.includes('Shamel'), `${FILE} carries no Shamel string`);

// The first rule for a selector, at the start of a line.
const rule = (sel: string): string => new RegExp(`(?:^|\\n)${sel.replace(/[.#(),:]/g, '\\$&')}\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
for (const part of ['position:sticky', 'top:0', 'max-block-size:100vh']) assert.ok(rule('#side').includes(part), `#side rule holds ${part}`);
assert.ok(rule('#menu').includes('overflow:auto'), '#menu rule holds overflow:auto');
assert.ok(rule('.wrap').includes('grid-template-columns:240px'), 'the menu column is 240px');
assert.ok(tpl.includes('<details id="menu-bar">'), '#menu-bar carries no open attribute');
assert.ok(tpl.includes("matchMedia('(min-width: 900px)')"), 'the script follows the 900px query');
assert.ok(/@media \(min-width: 900px\)\s*\{\s*@supports selector\(::details-content\)\s*\{[^}]*#menu-bar::details-content\{[^}]*content-visibility:visible[^}]*display:block/.test(css),
  'at 900px and up, #menu-bar::details-content is shown inside @supports selector(::details-content)');
assert.ok(css.includes('@media (max-width: 899.98px)'), 'a narrow block below 900px exists');

// Colours come only from fx token names, so theme.css themes the page.
const TOKENS = new Set(['--paper', '--panel', '--ink', '--muted', '--rule', '--code', '--accent', '--accent-tint', '--warn', '--alert', '--violet', '--info', '--info-tint']);
const bodies = [...css.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1] ?? '');
assert.deepStrictEqual(bodies.filter((b) => /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|hsl)a?\(/.test(b)), [], 'no colour literal in a rule');
assert.deepStrictEqual([...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1] ?? ''))].filter((v) => !TOKENS.has(v)), [], 'only fx token variables');
assert.deepStrictEqual(tpl.match(/(?<![\w-])(margin|padding|border)-(left|right)\b|(?<![\w-])(left|right)\s*:/g) ?? [], [], `${FILE} uses logical properties`);

// Moved from the kit page template: theme memory, legend, edge-label background, tables that scroll in their region, wrapping.
for (const part of ['localStorage.setItem("fx-theme"', 'class="legend"', '.react-flow__edge-textbg{fill:var(--panel)}']) assert.ok(tpl.includes(part), `${FILE} keeps ${part}`);
assert.ok(!rule('table').includes('display:block'), 'the table rule keeps the table a table');
for (const part of ['max-width:100%', 'overflow-x:auto']) assert.ok(rule('.table-scroll').includes(part), `.table-scroll rule keeps ${part}`);
assert.ok(rule('th,td').includes('overflow-wrap:anywhere'), 'table cells wrap long words');
assert.ok(rule('body').includes('overflow-wrap:anywhere'), 'body wraps long words');

// Loads: only ../_assets/<file> that the assets table lists; the tokens link line stays as sf-page rewrites it (ruling C15).
const table = fs.readFileSync(path.join(repo, 'references/visual/visual-assets.md'), 'utf8');
const loads = [...tpl.matchAll(/\s(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1] ?? '');
assert.ok(loads.length > 0, 'the template loads files');
for (const l of loads) {
  assert.ok(l.startsWith('../_assets/'), `${l} loads through ../_assets/`);
  assert.ok(table.includes(`| \`${l.slice('../_assets/'.length)}\` |`), `${l} has a row in the assets table`);
}
assert.ok(tpl.includes('\n<link rel="stylesheet" href="../_assets/fx-tokens-1.css">\n'), 'the fx-tokens-1.css link line is verbatim');

console.log('site-template.test.js: OK');
