// generated from src/scripts/system-flow-corrections.test.ts by scripts/build: edit there, not here
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
var import_sf_fixture = require("../tests/helpers/sf-fixture.js");
const F = "docs/system-flow/model/fragments";
const ev = [{ path: "app/x.rb", lines: "1-4", symbol: "Link" }];
const level0 = (label = "API", purpose = "Links", extra = {}) => ({
  levels: { root: "system", diagrams: [{
    id: "system",
    level: 0,
    title: "System",
    summary: "S",
    groups: [],
    nodes: [{ id: "api", label, kind: "backend", role: "R", evidence: ev }, { id: "db", label: "Db", kind: "database", role: "R", evidence: ev }],
    edges: [{ from: "api", to: "db", label: "reads", evidence: ev }]
  }] },
  stores: { sql: [{ id: "sql-links", table: "links", purpose, evidence: ev }] },
  storeFlows: [{ id: "first", trigger: "T", chapter: "s1", steps: [{ n: 1, actor: "api", op: "read", store: "sql", key: "k", when: "always", evidence: ev, ...extra }] }]
});
const bullet = (text = "A link expires after 30 days.", more = {}) => ({ id: "b1", text, evidence: ev, ...more });
const chapters = (bullets) => ({ sections: [{ id: "s1", title: "Links", question: "Q?", bullets }] });
const corr = { id: "c1", date: "2026-10-28", item: "bullet:b1", before: "A link expires after 30 days.", after: "A link expires after 60 days.", reason: "stale", evidence: [{ owner: "2026-10-28" }] };
const committed = (extra) => {
  const f = (0, import_sf_fixture.sfFixture)();
  f.fragment("meta", { schemaVersion: 1, meta: { roots: [{ id: "backend" }] } });
  f.fragment("level0", level0());
  f.fragment("chapters", chapters([bullet()]));
  extra?.(f);
  f.commit("host", "fragments");
  return f;
};
const verdict = (why, f, status, line) => {
  const r = f.run(["check"]);
  assert.strictEqual(r.status, status, `${why}
${r.stdout}${r.stderr}`);
  if (line) assert.match(r.stderr, line, why);
};
verdict("no change", committed(), 0);
{
  const f = committed();
  f.fragment("chapters", chapters([bullet("A link expires after 60 days.")]));
  verdict("changed fact", f, 1, new RegExp(`^${F}/chapters\\.json:/sections/0/bullets/0: bullet:b1 changed since HEAD with no corrections entry$`, "m"));
  f.fragment("corrections", { corrections: [corr] });
  verdict("corrected", f, 0);
}
{
  const f = committed((g) => g.fragment("corrections", { corrections: [corr] }));
  f.fragment("chapters", chapters([bullet("A link expires after 60 days.")]));
  verdict("a correction already at HEAD does not count", f, 1, /bullet:b1 changed since HEAD/);
}
{
  const f = committed();
  const l = level0();
  const d = l.levels.diagrams[0];
  if (d) {
    d.nodes.shift();
    d.edges.length = 0;
  }
  f.fragment("level0", { ...l, levels: { ...l.levels, diagrams: [{ ...d, nodes: [...d?.nodes ?? [], { id: "q", label: "Q", kind: "backend", role: "R", evidence: ev }], edges: [{ from: "q", to: "db", label: "x", evidence: ev }] }] } });
  verdict("removed node", f, 1, new RegExp(`^${F}/level0\\.json:/levels/diagrams/0/nodes/0: node:api removed since HEAD with no corrections entry$`, "m"));
}
{
  const f = committed();
  f.fragment("chapters", { sections: [{ id: "s1", title: "Links", question: "Q?" }] });
  f.fragment("engine", { sections: [{ id: "s2", title: "Engine", question: "Q?", bullets: [bullet()] }] });
  verdict("moved, unchanged", f, 0);
  f.fragment("engine", { sections: [{ id: "s2", title: "Engine", question: "Q?", bullets: [bullet("A link expires after 60 days.")] }] });
  verdict("moved and changed", f, 1, new RegExp(`^${F}/engine\\.json:/sections/0/bullets/0: bullet:b1 changed since HEAD`, "m"));
}
{
  const turnSeq = { id: "turn", title: "Turn", chapter: "s1", participants: [], messages: [] };
  const withTurn = (label) => {
    const l = level0();
    l.levels.diagrams[0]?.nodes.push({ id: "turn", label, kind: "backend", role: "R", evidence: ev });
    l.levels.diagrams[0]?.edges.push({ from: "api", to: "turn", label: "x", evidence: ev });
    return { ...l, sequences: [turnSeq] };
  };
  const f = committed((g) => g.fragment("level0", withTurn("Turn")));
  f.fragment("level0", withTurn("Turn two"));
  verdict("node turn changed, same id as a sequence", f, 1, /node:turn changed since HEAD/);
  f.fragment("corrections", { corrections: [{ ...corr, id: "c2", item: "node:turn" }] });
  verdict("node turn corrected", f, 0);
}
{
  const f = committed();
  f.fragment("level0", level0("Public API"));
  verdict("label", f, 1, /node:api changed since HEAD with no corrections entry/);
}
{
  const f = committed();
  f.fragment("level0", level0("API", "Other"));
  verdict("store row", f, 1, /store:sql-links changed since HEAD/);
}
{
  const f = committed();
  f.fragment("level0", level0("API", "Links", { when: "never" }));
  verdict("step", f, 1, /step:first#1 changed since HEAD/);
}
{
  const f = committed();
  f.fragment("chapters", chapters([bullet("A link expires after 30 days.", { verified: { backend: "a".repeat(40) }, evidence: [{ path: "app/y.rb", lines: "1", symbol: "Y" }] })]));
  verdict("verified and evidence are not text", f, 0);
}
{
  const f = committed();
  f.fragment("extra", { sections: [{ id: "s9", title: "New", question: "Q?", bullets: [{ id: "b9", text: "New fact.", evidence: ev }] }] });
  verdict("untracked fragment", f, 0);
}
{
  const f = committed((g) => g.fragment("corrections", { corrections: [corr] }));
  f.put("host", `${F}/corrections.json`, "{}\n");
  f.fragment("extra", { corrections: [corr] });
  f.fragment("chapters", chapters([bullet("A link expires after 60 days.")]));
  verdict("a correction moved to another fragment is still old", f, 1, /bullet:b1 changed since HEAD/);
}
{
  const f = committed();
  f.fragment("corrections", { corrections: [{ ...corr, reason: "whim" }] });
  verdict("bad reason", f, 1, /value "whim" not in enum/);
}
process.stdout.write("system-flow-corrections.test.js: OK\n");
