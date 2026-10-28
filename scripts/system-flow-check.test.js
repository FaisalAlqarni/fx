// generated from src/scripts/system-flow-check.test.ts by scripts/build: edit there, not here
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
var import_child_process = require("child_process");
var import_json = require("../lib/json.js");
var import_sf_model = require("../lib/sf-model.js");
var import_sf_schema = require("../lib/sf-schema.js");
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const out = (stdout) => (0, import_json.parseJson)(stdout);
const F = "docs/system-flow/model/fragments";
const ev = [{ path: "app/x.rb", lines: "1-4", symbol: "Link" }];
{
  const f = (0, import_sf_fixture.sfFixture)();
  assert.ok(!fs.existsSync(path.join(f.plain, ".git")), "plain has no .git");
  assert.strictEqual(f.git("host", "log", "--format=%s").split("\n").length, 1, "host has one commit");
  const saved = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = "/nowhere";
  const e = f.env();
  assert.strictEqual(e.HOME, f.home);
  assert.ok(!("CLAUDE_CONFIG_DIR" in e), "env drops CLAUDE_CONFIG_DIR");
  assert.strictEqual(f.env({ CLAUDE_CONFIG_DIR: "x" }).CLAUDE_CONFIG_DIR, "x");
  if (saved === void 0) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = saved;
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(out(r.stdout), { ok: true, fragments: 3, items: 4, warnings: [] });
}
const fails = (why, change, line) => {
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  change(f);
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, `${why}: exits 1
${r.stdout}${r.stderr}`);
  assert.match(r.stderr, line, why);
};
const level0 = (node, edge = {}) => ({
  levels: { root: "system", diagrams: [{ id: "system", level: 0, title: "System", summary: "S", groups: [], nodes: [{ id: "link", label: "Link", kind: "backend", look: "service", role: "R", evidence: ev, ...node }, { id: "db", label: "Db", kind: "database", look: "service", role: "R", evidence: ev }], edges: [{ from: "link", to: "db", label: "reads", evidence: ev, ...edge }] }] }
});
fails(
  "an unknown key",
  (f) => f.fragment("level0", level0({ colour: "red" })),
  /^docs\/system-flow\/model\/fragments\/level0\.json:\/levels\/diagrams\/0\/nodes\/0: property colour not allowed$/m
);
fails(
  "a section with no question",
  (f) => f.fragment("chapters", { sections: [{ id: "s1", title: "Links" }] }),
  /chapters\.json:\/sections\/0: section s1: question missing$/m
);
fails(
  "an edge mode out of the enum",
  (f) => f.fragment("level0", level0({}, { mode: "maybe" })),
  /\/levels\/diagrams\/0\/edges\/0\/mode: value "maybe" not in enum$/m
);
fails(
  "an edge short label of 27 characters",
  (f) => f.fragment("level0", level0({}, { short: "x".repeat(27) })),
  /\/levels\/diagrams\/0\/edges\/0\/short: longer than 26 characters$/m
);
fails(
  "a node id with a capital",
  (f) => f.fragment("level0", level0({ id: "Api" }, { from: "Api" })),
  /\/levels\/diagrams\/0\/nodes\/0\/id: does not match \^\[a-z0-9\]\[a-z0-9-\]\*\$$/m
);
fails(
  "a section folder that climbs out",
  (f) => f.fragment("chapters", { sections: [{ id: "s1", title: "Links", question: "Q?", folder: "../x" }] }),
  /\/sections\/0\/folder: does not match \^\[a-z0-9\]\[a-z0-9-\]\*\$$/m
);
fails(
  "a root id with a capital",
  (f) => f.fragment("meta", { schemaVersion: 2, meta: { roots: [{ id: "Guide" }] } }),
  /meta\.json:\/meta\/roots\/0\/id: does not match \^\[a-z0-9\]\[a-z0-9-\]\*\$$/m
);
fails(
  "a boolean field given a string",
  (f) => f.fragment("level0", level0({ primary: "yes" })),
  /\/levels\/diagrams\/0\/nodes\/0\/primary: expected boolean$/m
);
fails(
  "an integer field given a fraction",
  (f) => f.fragment("meta", { schemaVersion: 1.5, meta: { roots: [{ id: "backend" }] } }),
  /meta\.json:\/schemaVersion: expected integer$/m
);
fails("a fragment that is an array", (f) => f.fragment("x", []), /x\.json:: expected object$/m);
fails("a fragment that is null", (f) => f.fragment("x", null), /x\.json:: expected object$/m);
fails(
  "a schemaVersion newer than the CLI",
  (f) => f.fragment("meta", { schemaVersion: 3, meta: { roots: [{ id: "backend" }] } }),
  /^docs\/system-flow\/model\/fragments\/meta\.json:\/schemaVersion: schemaVersion 3 is newer than this CLI \(2\)$/m
);
fails(
  "meta.json with no schemaVersion",
  (f) => f.fragment("meta", { meta: { roots: [{ id: "backend" }] } }),
  /meta\.json:: required property schemaVersion missing$/m
);
fails(
  "a fragment that is not JSON",
  (f) => f.put("host", `${F}/x.json`, "{"),
  /^docs\/system-flow\/model\/fragments\/x\.json:: invalid JSON/m
);
{
  const f = (0, import_sf_fixture.sfFixture)();
  for (const args of [["frobnicate"], [], ["check", "extra"], ["--site"]]) {
    const r = f.run(args);
    assert.strictEqual(r.status, 2, `${args.join(" ")}: exits 2
${r.stderr}`);
    assert.match(r.stderr, /^system-flow: usage:/, args.join(" "));
  }
}
const engine = (extra, ...ids) => ({
  levels: { diagrams: [{ id: "engine", level: 1, title: "Engine", summary: "E", groups: [], nodes: [...ids, "src"].map((id) => ({ id, label: id, kind: "backend", look: "service", role: "R", evidence: ev })), edges: ids.map((id) => ({ from: "src", to: id, label: "calls", evidence: ev })) }] },
  ...extra
});
fails(
  "node api in two fragments",
  (f) => {
    f.fragment("level0", level0({ id: "api" }, { from: "api" }));
    f.fragment("engine", engine({}, "api"));
  },
  /^docs\/system-flow\/model\/fragments\/engine\.json:\/levels\/diagrams\/0\/nodes\/0: node api is also defined in docs\/system-flow\/model\/fragments\/level0\.json$/m
);
const passes = (why, change, items) => {
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  change(f);
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 0, `${why}: exits 0
${r.stderr}`);
  assert.strictEqual(out(r.stdout).items, items, `${why}: items`);
};
const turnSeq = { id: "turn", title: "Turn", chapter: "s1", participants: [], messages: [] };
passes("node turn and sequence turn", (f) => f.fragment("engine", engine({ sequences: [turnSeq] }, "turn")), 7);
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  const twin = level0({});
  const d = twin.levels.diagrams[0];
  if (d) d.edges.push({ from: "link", to: "db", label: "writes", evidence: ev });
  f.fragment("level0", twin);
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 0, `a second link to db edge is not a duplicate
${r.stderr}`);
  assert.strictEqual(out(r.stdout).items, 5, "both edges are items");
}
const withGroup = (group) => {
  const l = level0({});
  const d = l.levels.diagrams[0];
  if (d) d.groups.push({ id: "g1", label: "Group", members: ["link", "db"], evidence: ev, unconfirmed: true, ...group });
  return l;
};
passes("a group with evidence and unconfirmed", (f) => f.fragment("level0", withGroup({})), 5);
fails(
  "a group with an unknown key",
  (f) => f.fragment("level0", withGroup({ colour: "red" })),
  /level0\.json:\/levels\/diagrams\/0\/groups\/0: property colour not allowed$/m
);
passes("stores tables from two fragments", (f) => {
  f.fragment("a", { stores: { sql: [{ id: "sql-links", table: "links", evidence: ev }] } });
  f.fragment("b", { stores: { sql: [{ id: "sql-users", table: "users", evidence: ev }], cache: [{ id: "cache-links", pattern: "link:{id}", evidence: ev }] } });
}, 7);
fails(
  "one store id in two tables",
  (f) => f.fragment("a", { stores: { sql: [{ id: "links", evidence: ev }], cache: [{ id: "links", evidence: ev }] } }),
  /^docs\/system-flow\/model\/fragments\/a\.json:\/stores\/cache\/0: store links is also defined in docs\/system-flow\/model\/fragments\/a\.json$/m
);
const api = { id: "api", label: "API", look: "service", evidence: ev };
passes("a participant, message, flow step, catalogue, inventory and rule entry", (f) => f.fragment("engine", {
  sequences: [{ ...turnSeq, participants: [api], messages: [{ n: 1, from: "api", to: "api", label: "loops", evidence: ev }] }],
  storeFlows: [{ id: "save", trigger: "A save", chapter: "s1", steps: [{ n: 1, actor: "api", op: "write", store: "sql", evidence: ev }] }],
  catalogue: [{ id: "bus", kind: "queue", name: "Bus", evidence: ev }],
  inventory: [{ id: "links", kind: "engine", name: "Links", evidence: ev }],
  rules: [{ id: "expiry", text: "Links expire.", evidence: ev }]
}), 10);
fails(
  "one participant twice in a sequence",
  (f) => f.fragment("engine", { sequences: [{ ...turnSeq, participants: [api, api] }] }),
  /engine\.json:\/sequences\/0\/participants\/1: participant turn\.api is also defined in docs\/system-flow\/model\/fragments\/engine\.json$/m
);
{
  const f = (0, import_sf_fixture.sfFixture)();
  const meta = `${JSON.stringify({ schemaVersion: 2, meta: { roots: [{ id: "backend" }] } })}
`;
  f.put("host", "site/model/fragments/meta.json", meta);
  f.fxJson({ system_flow: { output: { site: "site", markdown: "docs/system" } } });
  let r = f.run(["check"]);
  assert.strictEqual(r.status, 0, `.fx.json site
${r.stderr}`);
  assert.strictEqual(out(r.stdout).fragments, 1, ".fx.json site: one fragment");
  f.put("host", "flag/model/fragments/meta.json", meta);
  f.put("host", "flag/model/fragments/more.json", "{}\n");
  r = f.run(["--site", "flag", "check"]);
  assert.strictEqual(r.status, 0, `--site
${r.stderr}`);
  assert.strictEqual(out(r.stdout).fragments, 2, "--site wins over .fx.json");
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  const r = (0, import_child_process.spawnSync)(process.execPath, [path.join(__dirname, "system-flow"), "check"], { cwd: path.join(f.host, "app"), encoding: "utf8", env: f.env() });
  assert.strictEqual(r.status, 0, `no --root, run from app/
${r.stderr}`);
  assert.strictEqual(out(r.stdout).fragments, 3);
}
{
  const r = (0, import_sf_fixture.sfFixture)().run(["check"]);
  assert.strictEqual(r.status, 1, r.stderr);
  assert.strictEqual(r.stderr, "system-flow: check: no fragments folder at docs/system-flow/model/fragments\n");
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.fragment("engine", {});
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, r.stderr);
  assert.match(r.stderr, /^docs\/system-flow\/model\/fragments\/meta\.json:: file not found$/m);
}
assert.strictEqual((0, import_sf_model.handleOf)("cache", "sql-links"), "store:sql-links");
assert.strictEqual((0, import_sf_model.handleOf)("step", "first#2"), "step:first#2");
assert.deepStrictEqual((0, import_sf_model.parseHandle)("edge:engine:api>db"), { prefix: "edge", id: "engine:api>db" });
assert.deepStrictEqual((0, import_sf_model.parseHandle)("seq:turn"), { prefix: "seq", id: "turn" });
assert.strictEqual((0, import_sf_model.parseHandle)("sql:links"), null, "sql is a kind, not a handle prefix");
assert.strictEqual((0, import_sf_model.parseHandle)("node"), null, "no colon");
assert.strictEqual((0, import_sf_model.parseHandle)("node:"), null, "no id");
assert.deepStrictEqual(
  (0, import_sf_schema.validate)({ $schema: "s", $id: "i", title: "t", description: "d", $defs: { a: { type: "string" } }, $ref: "#/$defs/a" }, 1),
  [{ pointer: "", message: "expected string" }]
);
assert.deepStrictEqual((0, import_sf_schema.validate)({ type: "string", format: "email" }, "x"), [{ pointer: "", message: "unsupported keyword format" }]);
assert.throws(() => (0, import_sf_schema.validate)({ $ref: "#/$defs/missing" }, "x"), /cannot resolve \$ref #\/\$defs\/missing/);
fails(
  "a node carrying constructor",
  (f) => f.fragment("level0", level0({ constructor: 1 })),
  /level0\.json:\/levels\/diagrams\/0\/nodes\/0: property constructor not allowed$/m
);
fails(
  "a node carrying toString",
  (f) => f.fragment("level0", level0({ toString: "x" })),
  /level0\.json:\/levels\/diagrams\/0\/nodes\/0: property toString not allowed$/m
);
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.put("host", `${F}/x.json`, '{ "__proto__": { "polluted": "yes" } }\n');
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, `a top-level __proto__ key: exits 1
${r.stderr}`);
  assert.match(r.stderr, /^docs\/system-flow\/model\/fragments\/x\.json:: property __proto__ not allowed$/m);
}
assert.deepStrictEqual((0, import_sf_schema.validate)({ required: ["toString"] }, {}), [{ pointer: "", message: "required property toString missing" }]);
assert.throws(() => (0, import_sf_schema.validate)({ $ref: "#/$defs/constructor", $defs: {} }, "x"), /cannot resolve \$ref #\/\$defs\/constructor/);
{
  const data = (0, import_json.parseJson)('{ "__proto__": { "polluted": "yes" } }');
  (0, import_sf_model.mergeFragments)([{ file: "x.json", data }]);
  assert.strictEqual({}.polluted, void 0, "Object.prototype is untouched");
}
{
  for (const [hint, msg] of [[{ col: -1, row: 0 }, "/layout/link/col: less than 0"], [{ col: 1.5, row: 0 }, "/layout/link/col: expected integer"], [{ col: 0 }, "/layout/link: required property row missing"], [{ col: 0, row: 0, x: 1 }, "/layout/link: property x not allowed"]]) {
    const f = (0, import_sf_fixture.sfFixture)();
    f.goodSet();
    const l0 = (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, F, "level0.json"), "utf8"));
    l0.levels.diagrams[0].layout = { link: hint, db: { col: 1, row: 0 } };
    f.fragment("level0", l0);
    const r = f.run(["check"]);
    assert.strictEqual(r.status, 1, `${JSON.stringify(hint)}
${r.stdout}`);
    assert.ok(r.stderr.includes(`level0.json:/levels/diagrams/0${msg}`), r.stderr);
  }
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.commit("host", "model");
  const shim = path.join(f.base, "elk.js");
  const vendor = path.join(__dirname, "..", "references", "vendor", "elkjs-0.9.3.bundled.js");
  fs.writeFileSync(shim, `require.cache[${JSON.stringify(vendor)}] = { id: 'elk', loaded: true, exports: function () { return { layout: async () => { throw new Error('elk says no'); } }; } };
`);
  const r = (0, import_child_process.spawnSync)(process.execPath, ["--require", shim, path.join(__dirname, "system-flow"), "--root", f.host, "build"], { encoding: "utf8", env: f.env() });
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.includes(": figure level-system: ELK error: ELK laid out no variant: elk says no"), r.stderr);
  assert.ok(!r.stderr.includes("split it"), r.stderr);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  const shim = path.join(f.base, "boom.js");
  fs.writeFileSync(shim, "require('fs').readdirSync = () => { throw new TypeError('boom'); };\n");
  const r = (0, import_child_process.spawnSync)(process.execPath, ["--require", shim, path.join(__dirname, "system-flow"), "--root", f.host, "check"], { encoding: "utf8", env: f.env() });
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(r.stderr.startsWith("system-flow: check: boom\nTypeError: boom\n    at "), r.stderr);
  const own = f.run(["check", "--fragment", "nope.json"]);
  assert.strictEqual(own.stderr, "system-flow: check: no fragment nope.json\n");
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.put("host", ".fx.json", '{"system_flow": ');
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.ok(/^system-flow: check: \.fx\.json is not valid JSON: [^\n]+\n$/.test(r.stderr), r.stderr);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  const bare = (name) => {
    const l = (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, F, `${name}.json`), "utf8"));
    for (const n of l.levels.diagrams[0]?.nodes ?? []) delete n.look;
    return l;
  };
  f.fragment("meta", { schemaVersion: 1, meta: { roots: [{ id: "backend" }] } });
  f.fragment("level0", bare("level0"));
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.strictEqual(r.stderr, [
    `${F}/meta.json:/schemaVersion: schemaVersion 1: run system-flow migrate`,
    `${F}/level0.json:: schemaVersion 1: run system-flow migrate`,
    `${F}/chapters.json:: schemaVersion 1: run system-flow migrate`
  ].join("\n") + "\n", "a version-1 set: one hint per fragment and no look problem");
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("chapters", { schemaVersion: 1, sections: [] });
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1, r.stdout);
  assert.strictEqual(r.stderr, `${F}/chapters.json:/schemaVersion: schemaVersion 1: run system-flow migrate
`, "one stale fragment");
}
const L0 = "docs/system-flow/model/fragments/level0.json:/levels/diagrams/0";
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  const l = level0({});
  delete (l.levels.diagrams[0]?.nodes[1]).look;
  f.fragment("level0", l);
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.split("\n").includes(`${L0}/nodes/1: required property look missing`), r.stderr);
}
fails(
  "a look out of the enum",
  (f) => f.fragment("level0", level0({ look: "database" })),
  /\/levels\/diagrams\/0\/nodes\/0\/look: value "database" not in enum$/m
);
fails(
  "a participant with no look",
  (f) => f.fragment("engine", { sequences: [{ ...turnSeq, participants: [{ id: "api", label: "API", evidence: ev }] }] }),
  /engine\.json:\/sequences\/0\/participants\/0: required property look missing$/m
);
fails(
  "a message short label of 27 characters",
  (f) => f.fragment("engine", { sequences: [{ ...turnSeq, participants: [api], messages: [{ n: 1, from: "api", to: "api", label: "l", short: "x".repeat(27), evidence: ev }] }] }),
  /\/sequences\/0\/messages\/0\/short: longer than 26 characters$/m
);
const term = { id: "link", term: "Link", tag: "model", meaning: "A short link.", evidence: ev };
const codeEntry = { id: "app", root: "backend", path: "app/", owns: "The app.", evidence: [{ path: "app/" }, { path: "app/x.rb", lines: "1-4", symbol: "Link" }] };
fails(
  "a glossary tag out of the enum",
  (f) => f.fragment("glossary", { glossary: [{ ...term, tag: "thing" }] }),
  /\/glossary\/0\/tag: value "thing" not in enum$/m
);
fails(
  "a code map path with no trailing slash",
  (f) => f.fragment("glossary", { codeMap: [{ ...codeEntry, path: "app" }] }),
  /\/codeMap\/0\/path: does not match \^\(\?!\/\)\(\?:\[\^\/\]\+\/\)\+\$$/m
);
passes("a term and a code map entry", (f) => f.fragment("glossary", { glossary: [term], codeMap: [codeEntry] }), 6);
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("glossary", { glossary: [term], codeMap: [codeEntry] });
  const r = f.run(["query", "app/x.rb"]);
  assert.strictEqual(r.status, 0, r.stderr);
  const handles = (0, import_json.parseJson)(r.stdout).items.map((i) => i.handle);
  assert.ok(handles.includes("term:link") && handles.includes("code:app"), handles.join());
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("glossary", { glossary: [{ ...term, evidence: [{ path: "app/x.rb", lines: "40-41", symbol: "Link" }] }] });
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.split("\n").includes(`${F}/glossary.json:/glossary/0/evidence/0: term:link: backend/app/x.rb:40-41 Link: range outside file (10 lines)`), r.stderr);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("glossary", { glossary: [{ ...term, evidence: [{ path: "app/" }] }] });
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.split("\n").includes(`${F}/glossary.json:/glossary/0/evidence/0: glossary term link: a folder entry is allowed only on catalogue and inventory entries`), r.stderr);
}
const b2 = { id: "b2", text: "Expired links answer 410.", evidence: [{ path: "app/x.rb", lines: "4", symbol: "expired?" }] };
const area = (f, section) => f.fragment("links", { sections: [{ id: "s1", ...section }] });
const stderrOf = (f, args = ["check"]) => f.run(args);
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  area(f, { lead: "Links expire. The job checks them.", bullets: [b2] });
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 0, r.stderr);
  const m = (0, import_sf_model.mergeFragments)(["meta", "level0", "chapters", "links"].map((n) => ({ file: `${F}/${n}.json`, data: (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, F, `${n}.json`), "utf8")) }))).model;
  assert.strictEqual(m.sections.length, 1);
  assert.strictEqual((0, import_sf_model.fieldOrigin)(m.sections[0], "lead")?.file, `${F}/links.json`);
  assert.strictEqual((0, import_sf_model.originOf)(m.sections[0]).file, `${F}/chapters.json`);
  assert.strictEqual((0, import_sf_model.originOf)(m.sections[0].bullets[1]).file, `${F}/links.json`);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("chapters", { sections: [{ id: "s1", title: "Links", question: "Q?" }, { id: "s2", title: "More", question: "Q2?" }] });
  f.fragment("links", { sections: [{ id: "s2", lead: "Two." }, { id: "s1", lead: "One." }] });
  const r = f.run(["check"]);
  assert.strictEqual(r.status, 0, r.stderr);
  const m = (0, import_sf_model.mergeFragments)(["chapters", "links"].map((n) => ({ file: `${F}/${n}.json`, data: (0, import_json.parseJson)(fs.readFileSync(path.join(f.host, F, `${n}.json`), "utf8")) }))).model;
  assert.deepStrictEqual(m.sections.map((s) => [s.id, s.lead]), [["s1", "One."], ["s2", "Two."]]);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("chapters", { sections: [{ id: "s1", title: "Links", question: "Q?", lead: "First." }] });
  area(f, { lead: "Second." });
  const r = stderrOf(f);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr, `${F}/links.json:/sections/0/lead: section s1 lead is also set in ${F}/chapters.json
`);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("links", { sections: [{ id: "s9", lead: "X." }] });
  const r = stderrOf(f);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr, `${F}/links.json:/sections/0: section s9 is not declared in chapters.json
`);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("chapters", { sections: [{ id: "s1", title: "Links", question: "Q?" }, { id: "s3", question: "Why?" }] });
  const r = stderrOf(f);
  assert.strictEqual(r.status, 1);
  assert.strictEqual(r.stderr, `${F}/chapters.json:/sections/1: section s3: title missing
`);
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  f.fragment("links", level0({ id: "link" }));
  const r = stderrOf(f);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, new RegExp(`links\\.json:.*: node link is also defined in ${F}/level0\\.json`));
}
{
  const f = (0, import_sf_fixture.sfFixture)();
  f.goodSet();
  area(f, { lead: "Links expire.", bullets: [b2] });
  const r = f.run(["check", "--fragment", `${F}/links.json`]);
  assert.strictEqual(r.status, 0, r.stderr);
  area(f, { lead: "Links expire.", bullets: [{ ...b2, evidence: [{ path: "app/x.rb", lines: "40-50", symbol: "expired?" }] }] });
  f.fragment("level0", level0({}, {}));
  const bad = f.run(["check", "--fragment", `${F}/links.json`]);
  assert.strictEqual(bad.status, 1);
  assert.ok(bad.stderr.split("\n").filter((l) => l !== "").every((l) => l.startsWith(`${F}/links.json:`)), bad.stderr);
}
process.stdout.write("system-flow-check.test.js: OK\n");
