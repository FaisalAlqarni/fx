// generated from src/scripts/system-flow-migrate.test.ts by scripts/build: edit there, not here
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
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const F = "docs/system-flow/model/fragments";
const NAMES = ["meta", "level0", "turns", "chapters"];
const U = { unconfirmed: true };
const node = (id, kind) => ({ id, label: id, kind, role: "Does a job", ...U });
const v1 = (change = () => void 0) => {
  const f2 = (0, import_sf_fixture.sfFixture)();
  f2.fragment("meta", { schemaVersion: 1, meta: { title: "Shop", roots: [{ id: "backend" }] } });
  f2.fragment("level0", { levels: { root: "system", diagrams: [{
    id: "system",
    level: 0,
    title: "System",
    summary: "The shop keeps its data in a database.",
    groups: [],
    nodes: [node("db", "Database"), node("web", "browser"), node("pay", "third-party"), node("login", "auth"), node("api", "backend")],
    edges: [["web", "api"], ["api", "db"], ["api", "pay"], ["api", "login"]].map(([from, to]) => ({ from, to, label: "calls", ...U }))
  }] } });
  f2.fragment("turns", { sequences: [{
    id: "turn",
    title: "A visit",
    chapter: "s1",
    summary: "The client asks the service for a page.",
    participants: [{ id: "cache", label: "Cache", kind: "cache", ...U }, { id: "svc", label: "Service", ...U }],
    messages: [{ n: 1, from: "svc", to: "cache", label: "The service reads the cache.", ...U }]
  }] });
  f2.fragment("chapters", { sections: [{ id: "s1", title: "Pages", question: "How is a page served?" }] });
  change(f2);
  return f2;
};
const path_ = (f2, name) => path.join(f2.host, F, `${name}.json`);
const read = (f2, name) => (0, import_json.parseJson)(fs.readFileSync(path_(f2, name), "utf8"));
const bytes = (f2) => Object.fromEntries(NAMES.map((n) => [n, fs.readFileSync(path_(f2, n), "utf8")]));
const mtimes = (f2) => NAMES.map((n) => fs.statSync(path_(f2, n)).mtimeMs);
const stripped = (v) => (0, import_json.parseJson)(JSON.stringify(v, (k, x) => k === "look" || k === "schemaVersion" ? void 0 : x));
const f = v1();
const before = Object.fromEntries(NAMES.map((n) => [n, read(f, n)]));
const old = bytes(f);
const oldTimes = mtimes(f);
const hint = f.run(["check"]);
assert.match(hint.stderr, /schemaVersion 1: run system-flow migrate/, "check on version 1 gives the hint");
const r = f.run(["migrate"]);
assert.strictEqual(r.status, 0, `migrate exits 0
${r.stdout}${r.stderr}`);
const out = (0, import_json.parseJson)(r.stdout);
assert.deepStrictEqual(out.rewritten, [...NAMES].sort().map((n) => `${F}/${n}.json`), "the four files, sorted");
assert.deepStrictEqual(read(f, "level0").levels.diagrams[0].nodes.map((n) => n.look), ["store", "client", "external", "security", "service"]);
assert.deepStrictEqual(read(f, "turns").sequences[0].participants.map((p) => p.look), ["store", "service"]);
assert.strictEqual(read(f, "meta").schemaVersion, 2);
assert.strictEqual(read(f, "meta").meta.name, "Shop");
const named = v1((g) => g.fragment("meta", { schemaVersion: 1, meta: { title: "Shop", name: "Own name", roots: [{ id: "backend" }] } }));
named.run(["migrate"]);
assert.strictEqual(read(named, "meta").meta.name, "Own name", "a name already present is kept");
for (const n of NAMES) assert.deepStrictEqual(stripped(read(f, n)), stripped(n === "meta" ? { ...before[n], meta: { ...before[n]?.meta, name: "Shop" } } : before[n]), `${n} differs only by look, schemaVersion and name`);
assert.ok(out.owed.includes(`${F}/meta.json:/meta: meta.intro missing`), out.owed.join("\n"));
assert.ok(out.owed.includes(`${F}/chapters.json:/sections: Start here role what missing`), out.owed.join("\n"));
const checked = f.run(["check"]);
assert.strictEqual(checked.status, 1);
assert.doesNotMatch(checked.stderr, /run system-flow migrate/, "the hint is gone");
assert.deepStrictEqual([...out.owed].sort(), checked.stderr.split("\n").filter((l) => l !== "").sort(), "owed equals the error lines check prints");
const again = v1();
again.run(["migrate"]);
const done = bytes(again);
const doneTimes = mtimes(again);
const second = again.run(["migrate"]);
assert.strictEqual(second.status, 0, second.stderr);
assert.deepStrictEqual((0, import_json.parseJson)(second.stdout).rewritten, []);
assert.deepStrictEqual(bytes(again), done);
assert.deepStrictEqual(mtimes(again), doneTimes);
assert.notDeepStrictEqual(old, done, "the first run did change the files");
assert.ok(oldTimes.length > 0);
const mixed = v1((g) => g.fragment("meta", { schemaVersion: 2, meta: { name: "Shop", roots: [{ id: "backend" }] } }));
mixed.fragment("chapters", { schemaVersion: 1, sections: [{ id: "s1", title: "Pages", question: "How is a page served?" }] });
fs.writeFileSync(path_(mixed, "level0"), JSON.stringify({ schemaVersion: 2, levels: { root: "system", diagrams: [] } }));
fs.writeFileSync(path_(mixed, "turns"), JSON.stringify({ schemaVersion: 2, sequences: [] }));
const mixedOut = mixed.run(["migrate"]);
assert.strictEqual(mixedOut.status, 0, mixedOut.stderr);
assert.deepStrictEqual((0, import_json.parseJson)(mixedOut.stdout).rewritten, [`${F}/chapters.json`]);
const bad = v1((g) => g.fragment("level0", { levels: { root: "system", diagrams: [{ id: "system", level: 0, title: "System", summary: "The shop keeps its data in a database.", groups: [], nodes: [node("db", 42)], edges: [] }] } }));
const badBytes = bytes(bad);
const failed = bad.run(["migrate"]);
assert.strictEqual(failed.status, 1, failed.stdout);
assert.match(failed.stderr, new RegExp(`^${F}/level0.json:/levels/diagrams/0/nodes/0/kind: `, "m"));
assert.deepStrictEqual(bytes(bad), badBytes, "every fragment is unchanged");
const none = (0, import_sf_fixture.sfFixture)().run(["--site", "nowhere", "migrate"]);
assert.strictEqual(none.status, 1);
assert.strictEqual(none.stderr.trim(), "system-flow: migrate: no fragments folder at nowhere/model/fragments");
const extra = (0, import_sf_fixture.sfFixture)().run(["migrate", "extra"]);
assert.strictEqual(extra.status, 2);
assert.match(extra.stderr, /^system-flow: usage: .*\| migrate/);
console.log("system-flow-migrate.test.js: OK");
