// generated from src/tests/gates/visual-kit.test.ts by scripts/build: edit there, not here
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
var visual_kit_test_exports = {};
__export(visual_kit_test_exports, {
  kitErrors: () => kitErrors
});
module.exports = __toCommonJS(visual_kit_test_exports);
var assert = __toESM(require("assert"));
var crypto = __toESM(require("crypto"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var vm = __toESM(require("vm"));
const TABLE = "references/visual/visual-assets.md";
const NAMESPACES = ["http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink", "http://www.w3.org/1999/xhtml"];
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
function rows(root) {
  const out = [];
  for (const line of fs.readFileSync(path.join(root, TABLE), "utf8").split("\n")) {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim().replace(/^`|`$/g, ""));
    const [file, , , , , hash] = cells;
    if (cells.length === 7 && file && hash && /^[0-9a-f]{64}$/.test(hash)) out.push({ file, sha: hash });
  }
  return out;
}
function findFile(root, name) {
  return ["references/vendor", "references/visual"].map((d) => path.join(root, d, name)).find((p) => fs.existsSync(p));
}
function kitErrors(root, files) {
  const table = rows(root);
  const known = new Set(table.map((r) => r.file));
  const out = [];
  for (const r of table) {
    const p = findFile(root, r.file);
    if (!p) {
      out.push(`visual-assets: ${r.file} missing`);
      continue;
    }
    const got = sha(fs.readFileSync(p));
    if (got !== r.sha) out.push(`visual-assets: ${r.file} SHA-256 ${got}, table says ${r.sha}`);
  }
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), "utf8");
    if (/\.(html|md|css)$/.test(f)) {
      const loads = [
        ...text.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']?([^\s"'>]+)/g),
        ...text.matchAll(/<link\b[^>]*\bhref\s*=\s*["']?([^\s"'>]+)/g),
        ...text.matchAll(/@import\s+(?:url\()?["']?([^\s"')]+)/g),
        ...text.matchAll(/url\(\s*["']?([^\s"')]+)/g)
      ].map((m) => m[1] ?? "");
      for (const v of loads.filter((x) => !x.startsWith("#"))) {
        const ok = v.startsWith("../_assets/") && known.has(v.slice("../_assets/".length));
        if (!ok) out.push(`${f}: loads ${v}, which is not in the assets table`);
      }
    }
    for (const m of text.matchAll(/https?:\/\/[^\s"'<>)\]`]+/g)) {
      if (!NAMESPACES.includes(m[0])) out.push(`${f}: names a host: ${m[0]}`);
    }
  }
  return out;
}
const repo = path.join(__dirname, "..", "..");
function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "visual-kit-"));
  for (const [rel, body] of Object.entries(files)) {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  }
  return root;
}
const row = (file, hash) => `| \`${file}\` | Lib | 1 | pkg/${file} | https://example.org | \`${hash}\` | \`LICENSE-x\` |`;
const TABLE_HEAD = "| File | Library | Version | Package path | Source URL | SHA-256 | Licence file |\n|---|---|---|---|---|---|---|\n";
const ELK = "elkjs-0.9.3.bundled.js";
const REACT = "react-18.3.1.production.min.js";
function kit(extra = {}, bytes = "elk bytes") {
  return tree({
    [TABLE]: TABLE_HEAD + row(ELK, sha("elk bytes")) + "\n",
    [`references/vendor/${ELK}`]: bytes,
    ...extra
  });
}
const dir = path.join(repo, "references", "visual");
const shown = fs.readdirSync(dir).sort();
assert.deepStrictEqual(shown, [
  "archify-adapter.md",
  "fx-flow-1.js",
  "fx-map-1.js",
  "fx-map-2.js",
  "fx-tokens-1.css",
  "page-template.html",
  "svg-animated.md",
  "svg-static.md",
  "visual-assets.md",
  "visual-check.md"
]);
for (const part of ["<!-- slot: NAV", "<!-- slot: DIAGRAMS"]) assert.ok(fs.readFileSync(path.join(dir, "page-template.html"), "utf8").includes(part), `page-template.html holds ${part}`);
const REPORT = "skills/fx-architecture/HTML-REPORT.md";
const PAGE_LANES = [REPORT, "skills/fx-docs/html-pages.md", "skills/fx-audit/SKILL.md"];
assert.deepStrictEqual(kitErrors(repo, [...shown.filter((n) => n !== "visual-assets.md").map((n) => `references/visual/${n}`), ...PAGE_LANES]), []);
const tableText = fs.readFileSync(path.join(repo, TABLE), "utf8");
const listed = rows(repo).map((r) => r.file).sort();
assert.deepStrictEqual(listed, [
  "elkjs-0.9.3.bundled.js",
  "fx-flow-1.js",
  "fx-map-1.js",
  "fx-map-2.js",
  "fx-tokens-1.css",
  "react-18.3.1.production.min.js",
  "react-dom-18.3.1.production.min.js",
  "reactflow-11.11.4.min.js",
  "reactflow-11.11.4.style.css"
]);
const licences = [...tableText.matchAll(/`(LICENSE-[\w-]+)`/g)].map((m) => m[1]);
const unlisted = fs.readdirSync(path.join(repo, "references", "vendor")).filter((n) => !listed.includes(n) && !licences.includes(n));
assert.deepStrictEqual(unlisted, [], "every vendored file has a row in the assets table");
const template = fs.readFileSync(path.join(dir, "page-template.html"), "utf8");
for (const part of ['localStorage.setItem("fx-theme"', 'class="legend"', 'id="evtoggle"']) {
  assert.ok(template.includes(part), `page-template.html keeps ${part}`);
}
assert.ok(template.includes(".react-flow__edge-textbg{fill:var(--panel)}"), "page-template.html themes the edge-label background");
const rule = (sel) => new RegExp(`(?:^|\\n)${sel.replace(".", "\\.")}\\{([^}]*)\\}`).exec(template)?.[1] ?? "";
assert.ok(!rule("table").includes("display:block"), "page-template.html table rule keeps the table a table");
for (const part of ["max-width:100%", "overflow-x:auto"]) assert.ok(rule(".table-scroll").includes(part), `page-template.html .table-scroll rule keeps ${part}`);
assert.ok(rule("th,td").includes("overflow-wrap:anywhere"), "page-template.html table cells wrap long words");
assert.ok(rule("body").includes("overflow-wrap:anywhere"), "page-template.html body wraps long words");
assert.deepStrictEqual(template.match(/(?<![\w-])(margin|padding|border)-(left|right)\b|(?<![\w-])(left|right)\s*:/g) ?? [], [], "page-template.html uses logical properties");
for (const part of ["page-template.html", "visual-assets.md"]) assert.ok(fs.readFileSync(path.join(repo, REPORT), "utf8").includes(part), `${REPORT} names ${part}`);
assert.ok(
  fs.readFileSync(path.join(repo, "skills/fx-audit/SKILL.md"), "utf8").includes("../../references/visual/archify-adapter.md"),
  "fx-audit Phase 4 points at the archify adapter"
);
const mermaid = '<script src="../_assets/mermaid-11.17.2.min.js"></script>';
assert.deepStrictEqual(
  kitErrors(kit({ [REPORT]: fs.readFileSync(path.join(repo, REPORT), "utf8") + "\n" + mermaid }), [REPORT]),
  [`${REPORT}: loads ../_assets/mermaid-11.17.2.min.js, which is not in the assets table`]
);
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
}
const retired = /tailwindcss-play|mermaid-11|report-assets/;
const stale = ["skills", "commands", "references", "agents"].flatMap((d) => walk(path.join(repo, d))).filter((f) => /\.(md|html|json)$/.test(f) && retired.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(repo, f));
assert.deepStrictEqual(stale, []);
for (const f of ["skills/fx-architecture/SKILL.md", REPORT]) {
  const names = fs.readFileSync(path.join(repo, f), "utf8").match(/\b(emerald|amber|slate)\b/gi) ?? [];
  assert.deepStrictEqual(names, [], `${f} names Tailwind colours`);
}
const escape = /every `<` written as\s+`([^`]+)`/.exec(fs.readFileSync(path.join(repo, TABLE), "utf8"))?.[1];
assert.ok(escape, `${TABLE} states how a < in map data is written`);
const hostile = { root: "l0", levels: [{ id: "l0", title: "</script><script>alert(1)</script>", nodes: [], edges: [] }] };
const inline = JSON.stringify(hostile).split("<").join(escape);
assert.ok(!/<\/script/i.test(inline), `map data written with ${escape} still closes its script block: ${inline}`);
assert.deepStrictEqual(JSON.parse(inline), hostile);
assert.ok(
  fs.readFileSync(path.join(dir, "page-template.html"), "utf8").includes(`Write every < inside the JSON as ${escape}.`),
  "page-template.html states the same map-data escape as the assets table"
);
const PAGE_WRITERS = ["references/visual/page-template.html", "skills/fx-docs/html-pages.md", REPORT, "skills/fx-audit/SKILL.md"];
const ESCAPE_RULE = 'HTML-escape `&`, `<`, `>` and `"`';
assert.deepStrictEqual(PAGE_WRITERS.filter((f) => !fs.readFileSync(path.join(repo, f), "utf8").includes(ESCAPE_RULE)), []);
assert.deepStrictEqual(kitErrors(kit({}, "other bytes"), []), [
  `visual-assets: ${ELK} SHA-256 ${sha("other bytes")}, table says ${sha("elk bytes")}`
]);
assert.deepStrictEqual(
  kitErrors(tree({ [TABLE]: TABLE_HEAD + row(REACT, sha("x")) + "\n" }), []),
  [`visual-assets: ${REACT} missing`]
);
const page = "references/visual/page-template.html";
assert.deepStrictEqual(kitErrors(kit({ [page]: '<script src="../_assets/other.js"></script>' }), [page]), [
  `${page}: loads ../_assets/other.js, which is not in the assets table`
]);
assert.deepStrictEqual(kitErrors(kit({ [page]: `<script src="../_assets/${ELK}"></script>` }), [page]), []);
const svg = "references/visual/svg-static.md";
assert.deepStrictEqual(kitErrors(kit({ [svg]: "see https://example.com/x.svg" }), [svg]), [
  `${svg}: names a host: https://example.com/x.svg`
]);
assert.deepStrictEqual(kitErrors(kit({ [svg]: '<svg xmlns="http://www.w3.org/2000/svg">' }), [svg]), []);
assert.deepStrictEqual(kitErrors(kit({ [svg]: '<path marker-end="url(#a)"/>' }), [svg]), []);
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(dir, "fx-map-1.js"), "utf8"), ctx);
const fxMap = ctx.fxMap;
const plain = (v) => JSON.parse(JSON.stringify(v));
const node = (id, children) => ({ id, label: id, kind: "service", role: "r", ...children ? { children } : {}, evidence: [] });
const data = (levels) => ({ root: "l0", levels });
const l0 = { id: "l0", title: "System", nodes: [node("api", "l1-api"), node("db")], edges: [{ from: "api", to: "db", label: "writes", evidence: [] }] };
const l1 = { id: "l1-api", title: "API", nodes: [node("x")], edges: [] };
assert.deepStrictEqual(plain(fxMap.validateMapData(data([l0]))), ["level l0: node api opens missing level l1-api"]);
assert.deepStrictEqual(plain(fxMap.validateMapData(data([l0, l1]))), []);
assert.deepStrictEqual(
  plain(fxMap.validateMapData(data([{ ...l0, nodes: [node("api", "l1-api")] }, l1]))),
  ["level l0: edge api -> db names a missing node"]
);
assert.deepStrictEqual(plain(fxMap.validateMapData({ root: "zz", levels: [] })), ["root level zz missing"]);
assert.deepStrictEqual(plain(fxMap.levelPath(data([l0, l1]), "l1-api")), ["l0", "l1-api"]);
function load(name) {
  const c = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(dir, name), "utf8"), c);
  return c;
}
const map2 = load("fx-map-2.js").fxMap;
const ctxNode = (id) => ({ ...node(id), primary: false, children: void 0 });
const gnode = (id) => ({ ...node(id), primary: true });
const glevel = { id: "l0", title: "System", groups: [{ id: "g", label: "G", members: ["api", "ghost"] }], nodes: [gnode("api")], edges: [] };
assert.deepStrictEqual(plain(map2.validateMapData(data([glevel]))), ["level l0: group g names a missing node ghost"]);
const m2l0 = {
  id: "l0",
  title: "System",
  groups: [],
  nodes: [{ ...gnode("api"), children: "l1-api" }, ctxNode("ext")],
  edges: [{ from: "api", to: "ext", label: "calls", mode: "async", evidence: [] }]
};
const m2l1 = { id: "l1-api", title: "API", groups: [], nodes: [gnode("x")], edges: [] };
assert.deepStrictEqual(plain(map2.validateMapData(data([m2l0, m2l1]))), []);
assert.deepStrictEqual(plain(map2.levelPath(data([m2l0, m2l1]), "l1-api")), ["l0", "l1-api"]);
assert.deepStrictEqual(
  plain(map2.validateMapData(data([{ ...m2l0, nodes: [gnode("api")] }, m2l1]))),
  ["level l0: edge api -> ext names a missing node"]
);
const flow = load("fx-flow-1.js").fxFlow;
const fig = (over = {}) => ({
  key: "seq-turn",
  kind: "sequence",
  width: 400,
  height: 200,
  direction: "DOWN",
  nodes: [{ id: "a", x: 0, y: 0, w: 100, h: 40, lines: ["A"], kind: "service", primary: true, store: false }],
  edges: [{ id: "e1", d: "M0 0L10 10", mode: "sync", label: null }],
  groups: [],
  steps: [{ edges: ["e1"], nodes: ["a"], caption: "a.rb:1" }],
  notDrawn: [],
  ...over
});
assert.deepStrictEqual(plain(flow.validateFigure(fig())), []);
assert.deepStrictEqual(plain(flow.validateFigure(fig({ steps: [{ edges: ["e9"], nodes: ["a"], caption: "c" }] }))), ["figure seq-turn: step 0 names a missing edge e9"]);
assert.deepStrictEqual(plain(flow.validateFigure(fig({ steps: [{ edges: ["e1"], nodes: ["zz"], caption: "c" }] }))), ["figure seq-turn: step 0 names a missing node zz"]);
assert.deepStrictEqual(plain(flow.validateFigure(fig({ width: 900 }))), ["figure seq-turn: wider than 860 px"]);
const textOf = (n) => typeof n === "string" ? n : Array.isArray(n) ? n.map(textOf).join("") : n !== null && typeof n === "object" && "children" in n ? textOf(n.children) : "";
function mountWith(layout) {
  const state = [];
  const deps = [];
  let slot = 0;
  let app = null;
  let tree2 = null;
  let effects = [];
  const render = () => {
    slot = 0;
    effects = [];
    tree2 = app ? app() : null;
    const run = effects;
    run.forEach((f) => f());
  };
  const React = {
    createElement: (type, _props, ...children) => ({ type, children }),
    useState: (init) => {
      const i = slot++;
      if (!(i in state)) state[i] = init;
      return [state[i], (v) => {
        state[i] = v;
        render();
      }];
    },
    useEffect: (f, d) => {
      const i = slot++;
      if (JSON.stringify(deps[i]) !== JSON.stringify(d)) {
        deps[i] = d;
        effects.push(f);
      }
    }
  };
  const ReactDOM = { createRoot: () => ({ render: (el) => {
    app = el.type;
    render();
  } }) };
  Object.assign(ctx, { React, ReactDOM, ReactFlow: { default: "flow", Controls: "controls" }, ELK: class {
    layout = layout;
  } });
  ctx.fxMap.mount({}, data([l0, l1]));
  return () => textOf(tree2);
}
const failed = mountWith(() => Promise.reject(new Error("elk broke")));
assert.ok(failed().includes("Laying out the map."), "the canvas waits for the layout");
setTimeout(() => {
  assert.ok(failed().includes("The map could not be laid out: Error: elk broke"), `a failed layout shows an error: ${failed()}`);
  console.log("visual-kit: OK");
}, 0);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  kitErrors
});
