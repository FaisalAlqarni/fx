// generated from src/tests/helpers/sf-fixture.ts by scripts/build: edit there, not here
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
var sf_fixture_exports = {};
__export(sf_fixture_exports, {
  sfFixture: () => sfFixture
});
module.exports = __toCommonJS(sf_fixture_exports);
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
const CLI = path.join(__dirname, "..", "..", "scripts", "system-flow");
const ev = (p, lines, symbol) => [{ path: p, lines, symbol }];
function sfFixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "sf-"));
  const dirs = { host: path.join(base, "host"), guide: path.join(base, "guide"), plain: path.join(base, "plain") };
  const home = path.join(base, "home");
  for (const d of [...Object.values(dirs), home]) fs.mkdirSync(d);
  const put = (root, rel, body) => {
    const f = path.join(dirs[root], rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  };
  const git = (root, ...args) => {
    const r = (0, import_child_process.spawnSync)("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dirs[root], encoding: "utf8" });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} in ${root}: ${r.stderr}`);
    return r.stdout.trim();
  };
  const commit = (root, message = "change") => {
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", message);
    return git(root, "rev-parse", "HEAD");
  };
  const fragment = (name, data) => put("host", `docs/system-flow/model/fragments/${name}.json`, `${JSON.stringify(data, null, 2)}
`);
  const fxJson = (data) => put("host", ".fx.json", `${JSON.stringify(data, null, 2)}
`);
  const goodSet = () => {
    fragment("meta", { schemaVersion: 1, meta: { roots: [{ id: "backend" }] } });
    fragment("level0", {
      levels: {
        root: "system",
        diagrams: [{
          id: "system",
          level: 0,
          title: "System",
          summary: "The whole system.",
          groups: [],
          nodes: [
            { id: "link", label: "Link", kind: "backend", role: "Expires links", evidence: ev("app/x.rb", "1-4", "Link#expired?") },
            { id: "db", label: "Database", kind: "database", role: "Stores links", evidence: ev("app/y.rb", "1-2", "Y") }
          ],
          edges: [{ from: "link", to: "db", label: "reads", evidence: ev("app/y.rb", "1-2", "Y") }]
        }]
      }
    });
    fragment("chapters", {
      sections: [{ id: "s1", title: "Links", question: "Where do links expire?", bullets: [{ id: "b1", text: "Link#expired? decides.", evidence: ev("app/x.rb", "4", "expired?") }] }]
    });
  };
  const env = (extra = {}) => {
    const e = {};
    for (const [k, v] of Object.entries(process.env)) if (v !== void 0 && k !== "CLAUDE_CONFIG_DIR") e[k] = v;
    return { ...e, HOME: home, ...extra };
  };
  const run = (args, extra) => {
    const r = (0, import_child_process.spawnSync)(process.execPath, [CLI, "--root", dirs.host, ...args], { encoding: "utf8", env: env(extra) });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr };
  };
  git("host", "init", "-q", "-b", "main");
  git("guide", "init", "-q", "-b", "main");
  const pad = (n) => `  # pad ${n}`;
  put("host", "app/x.rb", ["class Link", pad(2), pad(3), "  def expired?", "    true", pad(6), pad(7), pad(8), pad(9), pad(10)].join("\n") + "\n");
  put("host", "app/y.rb", "module Y\nend\n");
  commit("host", "fixture");
  put("guide", "README.md", "# Guide\n");
  commit("guide", "fixture");
  put("plain", "notes.txt", "Plain\n");
  return { base, ...dirs, home, put, git, commit, fragment, fxJson, goodSet, env, run };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sfFixture
});
