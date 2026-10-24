// generated from src/lib/lane-check.ts by scripts/build: edit there, not here
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
var lane_check_exports = {};
__export(lane_check_exports, {
  laneCheck: () => laneCheck
});
module.exports = __toCommonJS(lane_check_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const NOT_CODE_EXT = /* @__PURE__ */ new Set([
  // prose and data
  ".md",
  ".mdx",
  ".txt",
  ".rst",
  ".adoc",
  ".csv",
  ".tsv",
  ".log",
  // config and manifests
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".env",
  ".lock",
  ".xml",
  ".csproj",
  ".fsproj",
  ".vbproj",
  ".sln",
  ".props",
  ".targets",
  ".plist",
  // markup and styling: real work, but not the implementation this gate is about
  ".html",
  ".htm",
  ".erb",
  ".haml",
  ".slim",
  ".jinja",
  ".j2",
  ".mustache",
  ".hbs",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".styl",
  // binary and assets
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".mp3",
  ".mp4",
  ".zip",
  ".gz"
]);
const SOURCE_DIRS = ["app/", "src/", "lib/", "internal/", "pkg/", "cmd/"];
const NOT_SOURCE = /^(config|db\/migrate|bin|script|vendor|node_modules|\.)/;
const CONFIGISH = /^(Gemfile|Rakefile|Makefile|Dockerfile|config\.ru|.*\.config\.[jt]s|.*rc)$/;
const TEST_DIRS = ["test/", "tests/", "Tests/", "spec/", "specs/", "__tests__/", "features/"];
const TEST_NAME = /(^test_|_test|_spec|\.test|\.spec|Tests?)\.[^.]+$/;
function laneCheck(file, cwd) {
  if (!file) return null;
  const rel = path.relative(cwd, file);
  if (rel.startsWith("..")) return null;
  const stateDir = path.join(cwd, ".fx");
  const mark = (n) => path.join(stateDir, `.lane-${n}`);
  const fired = (n) => fs.existsSync(mark(n));
  const record = (n) => {
    try {
      fs.mkdirSync(stateDir, { recursive: true });
      fs.writeFileSync(mark(n), "");
    } catch {
    }
  };
  const ext = path.extname(rel);
  const isCode = ext !== "" && !NOT_CODE_EXT.has(ext.toLowerCase()) && !CONFIGISH.test(path.basename(rel)) && !NOT_SOURCE.test(rel);
  const inTest = TEST_DIRS.some((d) => rel.startsWith(d)) || rel.split("/").some((seg) => TEST_DIRS.includes(`${seg}/`)) || TEST_NAME.test(path.basename(rel));
  if (isCode && !inTest && !fired("design")) {
    let hasDesign = false;
    try {
      const plans = path.join(cwd, "docs", "plans");
      hasDesign = fs.readdirSync(plans).some((d) => fs.existsSync(path.join(plans, d, "design.md")));
    } catch {
      hasDesign = false;
    }
    record("design");
    if (!hasDesign) {
      return `about to write ${rel}, and this repo has no docs/plans/*/design.md.

The lane descriptions are read once, before your first action. This is the second time of asking, at the moment it actually matters.

If the work is architectural, a new project or subsystem or an interface others depend on, fx-brainstorm owns it and its output is a design doc plus a plan.

If it is genuinely bounded, or you are deliberately skipping the ceremony, say so in one line and write the file. This fires once. An unannounced skip is a decision made in secret.`;
    }
  }
  if (inTest && !fired("tdd")) {
    const stem = path.basename(rel, path.extname(rel)).replace(/^test_/, "").replace(/(_test|_spec|\.test|\.spec|Tests?)$/, "");
    let impl = null;
    const roots = SOURCE_DIRS.map((d) => path.join(cwd, d)).filter(fs.existsSync);
    roots.push(cwd);
    for (const dir of roots) {
      const stack = [dir];
      while (stack.length && !impl) {
        const cur = stack.pop();
        if (cur === void 0) break;
        let entries = [];
        try {
          entries = fs.readdirSync(cur, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const e of entries) {
          const p = path.join(cur, e.name);
          if (e.isDirectory()) {
            if (!/^(\.|node_modules|vendor|tmp|log|test|spec)$/.test(e.name)) stack.push(p);
            continue;
          }
          if (e.name.replace(/\.[^.]+$/, "") === stem) {
            impl = path.relative(cwd, p);
            break;
          }
        }
      }
      if (impl) break;
    }
    record("tdd");
    if (impl) {
      return `about to write the test ${rel}, and ${impl} already exists.

That is the inversion: implementation first, test after. A test written against code that already works routinely restates whatever the code does, and passes whether or not the logic is right.

fx-tdd owns this: Iron Law, verified RED, then GREEN. If you are backfilling coverage on purpose that is legitimate, but prove each test fails against the unfixed code before trusting it. This fires once.`;
    }
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  laneCheck
});
