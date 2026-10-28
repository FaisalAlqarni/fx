// generated from src/scripts/system-flow-detect.test.ts by scripts/build: edit there, not here
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
var import_json = require("../lib/json.js");
var import_fx_json = require("../lib/fx-json.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const MARK = "<!-- fx-system-flow generated: edit the model, then rebuild -->";
const DEFAULT = { site: "docs/system-flow", markdown: "docs/system" };
const ok = (f, args = []) => {
  const r = f.run(["detect", ...args]);
  assert.strictEqual(r.status, 0, `detect ${args.join(" ")}
${r.stderr}`);
  return (0, import_json.parseJson)(r.stdout);
};
const mkdocs = (f, body = "docs_dir: docs\ntheme:\n  name: material\n") => {
  f.put("host", "mkdocs.yml", body);
  f.commit("host");
};
{
  const f = (0, import_sf_fixture.sfFixture)();
  mkdocs(f);
  const d = ok(f);
  assert.deepStrictEqual(d.output, DEFAULT);
  assert.deepStrictEqual(d.docsConfig, { kind: "mkdocs", path: "mkdocs.yml", docsDir: "docs" });
  assert.deepStrictEqual(d.mkdocs?.excludeDocs, ["system-flow/README.md", "system-flow/model/", "system-flow/diagrams/src/"]);
  assert.deepStrictEqual(d.mkdocs?.nav, ["- System flow: system-flow/index.html", "- System docs: system/index.md"]);
  assert.deepStrictEqual(d.theme, { source: "fx", kind: "fx" });
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.put("host", "docs/system/notes.md", "# Notes\n");
  f.commit("host");
  assert.strictEqual(ok(f).output.markdown, "docs/system-generated");
  const g = (0, import_sf_fixture.sfFixture)();
  g.put("host", "docs/system/index.md", `# System

${MARK}
`);
  g.commit("host");
  assert.strictEqual(ok(g).output.markdown, "docs/system");
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.put("host", "docs/system/a.md", "a\n");
  f.put("host", "docs/system-generated/b.md", "b\n");
  f.commit("host");
  const r = f.run(["detect"]);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr.trim(), "system-flow: detect: docs/system and docs/system-generated hold hand-written Markdown; set system_flow.output.markdown in .fx.json");
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  mkdocs(f, "docs_dir: site-docs\n");
  assert.deepStrictEqual(ok(f).output, { site: "site-docs/system-flow", markdown: "site-docs/system" });
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.put("host", "docusaurus.config.js", "module.exports = {};\n");
  f.put("host", "docs/intro.md", "# Intro\n");
  f.commit("host");
  const d = ok(f);
  assert.strictEqual(d.docsConfig.kind, "docusaurus");
  assert.deepStrictEqual(d.output, DEFAULT);
  assert.strictEqual(d.mkdocs, null);
  const v = (0, import_sf_fixture.sfFixture)();
  v.put("host", "guide/.vitepress/config.ts", "export default {};\n");
  v.commit("host");
  const dv = ok(v);
  assert.strictEqual(dv.docsConfig.kind, "vitepress");
  assert.strictEqual(dv.docsConfig.docsDir, "guide");
  assert.deepStrictEqual(dv.output, { site: "guide/system-flow", markdown: "guide/system" });
  const n = ok((0, import_sf_fixture.sfFixture)());
  assert.deepStrictEqual(n.docsConfig, { kind: null, path: null, docsDir: null });
  assert.deepStrictEqual(n.output, DEFAULT);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.fxJson({ system_flow: { output: { site: "x/flow", markdown: "x/md" } } });
  assert.deepStrictEqual(ok(f).output, { site: "x/flow", markdown: "x/md" });
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.fxJson({ system_flow: { roots: { guide: "../guide" } } });
  const d = ok(f);
  assert.strictEqual(d.roots.length, 2);
  assert.deepStrictEqual({ ...d.roots[0], dir: "" }, { id: "host", path: ".", dir: "", git: true, remote: null, head: f.git("host", "rev-parse", "HEAD") });
  assert.deepStrictEqual(d.roots[1], { id: "guide", path: "../guide", dir: f.guide, git: true, remote: null, head: f.git("guide", "rev-parse", "HEAD") });
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  const d = ok(f, ["--repo", "../guide", "--repo", "../plain", "--write"]);
  assert.deepStrictEqual(d.roots[2], { id: "plain", path: "../plain", git: false, remote: null, head: null, dir: f.plain });
  const text = fs.readFileSync(path.join(f.host, ".fx.json"), "utf8");
  assert.deepStrictEqual((0, import_json.parseJson)(text).system_flow.roots, { guide: "../guide", plain: "../plain" });
  assert.ok(!/": "\//.test(text), "no absolute path in .fx.json");
  ok(f, ["--repo", "../guide", "--repo", "../plain", "--write"]);
  assert.strictEqual(fs.readFileSync(path.join(f.host, ".fx.json"), "utf8"), text, "second write is byte-identical");
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  fs.mkdirSync(path.join(f.base, "Shamel.Backend"));
  fs.mkdirSync(path.join(f.base, "shamel_backend"));
  assert.strictEqual(ok(f, ["--repo", "../Shamel.Backend"]).roots[1]?.id, "shamel-backend");
  const r = f.run(["detect", "--repo", "../Shamel.Backend", "--repo", "../shamel_backend"]);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr.trim(), "system-flow: detect: roots ../Shamel.Backend and ../shamel_backend both map to id shamel-backend; rename one in .fx.json system_flow.roots");
  const m = f.run(["detect", "--repo", "../nowhere"]);
  assert.strictEqual(m.status, 1);
  assert.strictEqual(m.stderr.trim(), "system-flow: detect: no folder at ../nowhere");
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.fxJson({ test_all: "x" });
  f.commit("host");
  const clean = f.run(["detect"]);
  assert.strictEqual(clean.status, 0);
  assert.strictEqual(f.git("host", "status", "--porcelain"), "", "no --write, no change");
  const d = ok(f, ["--write"]);
  const written = (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, ".fx.json"), "utf8"));
  assert.strictEqual(written.test_all, "x");
  assert.deepStrictEqual(written.system_flow.output, d.output);
  assert.strictEqual((0, import_fx_json.parseFxJson)(written).ok && (0, import_fx_json.parseFxJson)(written).problems.length, 0);
}
console.log("system-flow-detect.test.js: OK");
