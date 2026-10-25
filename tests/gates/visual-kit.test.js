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
  "fx-map-1.js",
  "fx-tokens-1.css",
  "page-template.html",
  "svg-animated.md",
  "svg-static.md",
  "visual-assets.md",
  "visual-check.md"
]);
assert.deepStrictEqual(kitErrors(repo, shown.filter((n) => n !== "visual-assets.md").map((n) => `references/visual/${n}`)), []);
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
console.log("visual-kit: OK");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  kitErrors
});
