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
  sentence: () => sentence,
  sfFixture: () => sfFixture,
  words: () => words
});
module.exports = __toCommonJS(sf_fixture_exports);
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
var import_json = require("../../lib/json.js");
var import_sf_prose = require("../../lib/sf-prose.js");
const CLI = path.join(__dirname, "..", "..", "scripts", "system-flow");
const ev = (p, lines, symbol) => [{ path: p, lines, symbol }];
const LINK = ev("app/x.rb", "1-4", "Link");
const FILL = ["the", "service", "reads", "each", "row", "from", "the", "store", "and", "writes", "one", "reply", "to", "the", "client", "before", "the", "job", "runs", "again"];
const words = (n) => Array.from({ length: n }, (_, i) => FILL[i % FILL.length]).join(" ");
const sentence = (n) => {
  const w = words(n);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}.`;
};
const LEAD = `${sentence(20)} ${sentence(20)}`;
const S1_LEAD = "Each link expires on its date and the service reads the row from the store before it answers the client. The job checks every link once a day and marks the old rows as expired so the page shows them.";
const INTRO = "The fixture system keeps short links. A job expires old links every day. A page shows what the service holds.";
const EVIDENCED = { evidence: LINK };
const UNCONFIRMED = { unconfirmed: true };
function floorSection(s, proof = EVIDENCED) {
  const bullets = [...s.bullets ?? []];
  for (let k = bullets.length + 1; bullets.length < 4; k++) bullets.push({ id: `${s.id}-b${k}`, text: sentence(20), ...proof });
  return { ...s, lead: s.lead ?? LEAD, bullets };
}
const startHere = (proof = EVIDENCED, root = "system") => [
  floorSection({ id: "start-what", title: "What it is", question: "What does this system do?", folder: "start-here", role: "what", notOwned: [1, 2].map((k) => ({ id: `not-${k}`, text: sentence(10), ...proof })) }, proof),
  floorSection({ id: "start-parts", title: "The parts", question: "What are its parts?", folder: "start-here", role: "parts", diagrams: [root] }, proof),
  floorSection({ id: "start-request", title: "One request", question: "What happens on a request?", folder: "start-here", role: "request" }, proof),
  floorSection({ id: "start-code", title: "The code", question: "Where is the code?", folder: "start-here", role: "code" }, proof)
];
const turn = () => ({
  id: "turn",
  title: "A visit",
  chapter: "start-request",
  summary: "The client asks the service, which reads the store and sends mail.",
  participants: [["client", "Client", "client"], ["api", "Service", "service"], ["db", "Store", "store"], ["mail", "Mailer", "external"]].map(([id, label, look]) => ({ id, label, look, evidence: LINK })),
  messages: [["client", "api", "The client opens a link."], ["api", "db", "The service reads the row."], ["db", "api", "The store returns the row."], ["api", "mail", "The service sends a mail."], ["mail", "api", "The mailer accepts it."]].map(([from, to, label], i) => ({ n: i + 1, from, to, label, ...i === 4 ? { reply: true } : {}, evidence: LINK }))
});
const TERMS = ["expiry", "store", "service", "client", "mailer", "row", "job", "reply", "page", "chapter", "fragment", "root", "handle"];
const glossary = (proof = EVIDENCED) => [
  { id: "link", term: "Link", aliases: ["links"], tag: "model", meaning: "A short address that points at a long one.", ...proof },
  { id: "short-link", term: "short link", tag: "concept", meaning: "The address a visitor opens.", ...proof },
  ...TERMS.map((t) => ({ id: t, term: t, tag: "concept", meaning: `The ${t} in this system.`, ...proof }))
];
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
    fragment("meta", { schemaVersion: 2, meta: { name: "Fixture", title: "Fixture system", intro: INTRO, roots: [{ id: "backend" }] } });
    fragment("level0", {
      levels: {
        root: "system",
        diagrams: [{
          id: "system",
          level: 0,
          title: "System",
          summary: "The link service reads and writes the database.",
          groups: [],
          nodes: [
            { id: "link", label: "Link", kind: "backend", look: "service", role: "Expires links", evidence: ev("app/x.rb", "1-4", "Link#expired?") },
            { id: "db", label: "Database", kind: "database", look: "store", role: "Stores links", evidence: ev("app/y.rb", "1-2", "Y") }
          ],
          edges: [{ from: "link", to: "db", label: "reads", evidence: ev("app/y.rb", "1-2", "Y") }]
        }]
      }
    });
    fragment("chapters", { sections: [...startHere(), floorSection({ id: "s1", title: "Links", question: "Where do links expire?", lead: S1_LEAD, bullets: [{ id: "b1", text: sentence(20), evidence: ev("app/x.rb", "4", "expired?") }] })] });
    fragment("app", {
      sequences: [turn()],
      stores: { sql: [{ id: "sql-links", table: "links", purpose: "Holds every short link.", evidence: LINK }] },
      catalogue: [{ id: "mailer", kind: "integration", name: "Mailer", evidence: LINK }],
      codeMap: [{ id: "app", root: "backend", path: "app/", owns: "The application code.", evidence: [{ path: "app/" }, ...LINK] }]
    });
    fragment("glossary", { glossary: glossary() });
  };
  const floor = () => {
    const dir = path.join(dirs.host, "docs/system-flow/model/fragments");
    const frags = new Map(fs.readdirSync(dir).filter((n) => n.endsWith(".json") && n !== "floor.json").map((n) => [n.slice(0, -5), (0, import_json.parseJson)(fs.readFileSync(path.join(dir, n), "utf8"))]));
    const all = [...frags.values()];
    const meta = frags.get("meta");
    meta.meta.name ??= "Fixture";
    meta.meta.intro ??= INTRO;
    const root = all.find((f) => f.levels?.root)?.levels.root ?? "system";
    const chapters = frags.get("chapters") ?? { sections: [] };
    frags.set("chapters", chapters);
    if (!chapters.sections.some((x) => x.role === "what")) chapters.sections.unshift(...startHere(UNCONFIRMED, root));
    const parts = chapters.sections.find((x) => x.role === "parts");
    if (parts && !(parts.diagrams ?? []).includes(root)) parts.diagrams = [root];
    for (const sec of chapters.sections) {
      if (sec.role !== void 0) continue;
      const parts2 = all.flatMap((f) => (f.sections ?? []).filter((x) => x.id === sec.id));
      const lead = parts2.find((x) => x.lead !== void 0)?.lead;
      if (lead === void 0) sec.lead = LEAD;
      sec.bullets ??= [];
      let count = parts2.reduce((n, x) => n + (x.bullets?.length ?? 0), 0);
      let w = (0, import_sf_prose.words)(lead ?? LEAD) + parts2.reduce((n, x) => n + (x.bullets ?? []).reduce((m, b) => m + (0, import_sf_prose.words)(b.text), 0), 0);
      for (let k = 1; (count < 4 || w < 120) && count < 8; k++, count++, w += 20) sec.bullets.push({ id: `${sec.id}-f${k}`, text: sentence(20), ...UNCONFIRMED });
    }
    const caption = (o) => {
      if (!o.summary || (0, import_sf_prose.sentences)(o.summary) !== 1 || (0, import_sf_prose.words)(o.summary) < 6 || (0, import_sf_prose.words)(o.summary) > 30) o.summary = `The ${o.id} figure shows how its parts connect.`;
    };
    for (const f of all) [...f.levels?.diagrams ?? [], ...f.sequences ?? [], ...f.storeFlows ?? []].forEach(caption);
    const extra = {};
    if (!all.some((f) => (f.sequences ?? []).some((q) => q.chapter === "start-request"))) {
      extra.sequences = [{
        id: "floor-visit",
        title: "A visit",
        chapter: "start-request",
        summary: "The client asks the service and the service answers it.",
        participants: [{ id: "floor-client", label: "Client", look: "client", ...UNCONFIRMED }, { id: "floor-api", label: "Service", look: "service", ...UNCONFIRMED }],
        messages: [{ n: 1, from: "floor-client", to: "floor-api", label: "The client asks the service.", ...UNCONFIRMED }]
      }];
    }
    if (!all.some((f) => f.glossary)) extra.glossary = glossary(UNCONFIRMED);
    const host = meta.meta.roots[0].id;
    const cited = /* @__PURE__ */ new Set();
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === "object" && v !== null) for (const [k, c] of Object.entries(v)) if (k === "evidence" && Array.isArray(c)) {
        for (const e of c) if (e.path !== void 0) cited.add(e.root ?? host);
      } else walk(c);
    };
    walk(all);
    const mapped = new Set(all.flatMap((f) => (f.codeMap ?? []).map((c) => c.root)));
    const codeMap = [...cited].filter((r) => !mapped.has(r)).map((r) => ({ id: `floor-${r}`, root: r, path: "app/", owns: "Code the fixture cites.", ...UNCONFIRMED }));
    if (codeMap.length) extra.codeMap = codeMap;
    for (const [name, data] of frags) fragment(name, data);
    if (Object.keys(extra).length) fragment("floor", extra);
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
  return { base, ...dirs, home, put, git, commit, fragment, fxJson, goodSet, floor, env, run };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  sentence,
  sfFixture,
  words
});
