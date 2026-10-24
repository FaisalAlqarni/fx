// generated from src/skills/fx-implement/scripts/compile-brief.test.ts by scripts/build: edit there, not here
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
var assert = __toESM(require("node:assert"));
var fs = __toESM(require("fs"));
var os = __toESM(require("os"));
var path = __toESM(require("path"));
var import_child_process = require("child_process");
const BIN = path.join(__dirname, "compile-brief");
const TMP = os.tmpdir(), GATE_EXEMPT = "artifact-gate: ok (scratch fixture)";
const wt = fs.mkdtempSync(path.join(TMP, "fx-brief-"));
const plan = path.join(wt, "docs", "plans", "x");
fs.mkdirSync(path.join(plan, "tasks"), { recursive: true });
fs.writeFileSync(path.join(wt, ".fx.json"), JSON.stringify({ stacks: ["rails"] }));
fs.writeFileSync(path.join(plan, "plan.md"), "# P\n\n## Global Constraints\n\n- Locale: ar.\n\n## Tasks\n");
fs.writeFileSync(
  path.join(plan, "design.md"),
  "# D\n\n## Implementation Decisions\n\n**1. First.** D1 body.\n\n**2. Second.** D2 body.\n\n## Out of Scope\n\nO1.\n"
);
fs.writeFileSync(path.join(plan, "state.md"), "# fx ledger: plan: docs/plans/x/plan.md\n## Log\nRuling: task 01 uses UTC.\nRuling: task 07 uses local time.\n");
const ctx = path.join(wt, "ctx.md");
fs.writeFileSync(ctx, "Task 00 produced Store#get(id).\n");
const runRaw = (taskText) => {
  const task = path.join(plan, "tasks", "01-a.md");
  fs.writeFileSync(task, taskText);
  const out = path.join(wt, "brief.md");
  return { out, r: (0, import_child_process.spawnSync)(process.execPath, [BIN, "--worktree", wt, "--context", ctx, "x", task, out], { encoding: "utf8", cwd: TMP }) };
};
const run = (taskText) => {
  const { out, r } = runRaw(taskText);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout.trim(), out);
  return fs.readFileSync(out, "utf8");
};
const brief = run("# 01: a\n\n**Design:** Implementation Decisions > 2\n**Stack:** rails/The traps\n");
const heads = ["## Task", "## Global constraints", "## Context", "## Rulings", "## Design excerpt", "## Stack"];
const at = heads.map((h) => brief.indexOf(h));
assert.ok(at.every((i, k) => i >= 0 && (k === 0 || i > (at[k - 1] ?? -1))), `six sections in order: ${at}`);
assert.ok(brief.includes("- Locale: ar."), "global constraints carried");
assert.ok(brief.includes("Task 00 produced Store#get(id)."), "controller context carried");
assert.ok(brief.includes("Ruling: task 01 uses UTC."), "rulings carried");
assert.ok(brief.includes("D2 body.") && !brief.includes("D1 body.") && !brief.includes("O1."), "only decision 2");
assert.ok(!brief.includes("task 07 uses local time"), "a ruling naming only another task is dropped");
for (const [line, name] of [["**Design:** Implementation Decisions > 2; Nope", "Nope"], ["**Stack:** rails/No such section", "rails/No such section"]]) {
  const bad = runRaw(`# 01: a

${line}
`).r;
  assert.ok(bad.status !== 0 && bad.stderr.includes(name), `an entry that resolves to nothing fails, naming it: ${name}`);
}
const traps = fs.readFileSync(path.join(__dirname, "..", "..", "..", "references", "stacks", "rails.md"), "utf8");
assert.ok(brief.includes(traps.slice(traps.indexOf("## The traps"), traps.indexOf("## The traps") + 200)), "the named stack section, from the plugin");
assert.ok(!brief.includes("## Engines"), "other stack sections left out");
const whole = run("# 01: a\n");
assert.ok(whole.includes("## Engines"), "no Stack line: the whole stack file, as today");
const fx = path.join(wt, ".fx.json");
const failsNaming = (r, name, label) => assert.ok(r.status !== 0 && r.stderr.includes(name), `${label}: exit non-zero naming ${name}; got ${r.status} ${r.stderr}`);
const withFile = (file, text, fn) => {
  const keep = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, text);
  try {
    return fn();
  } finally {
    fs.writeFileSync(file, keep);
  }
};
failsNaming(runRaw("# 01: a\n\n**Design:** Implementation Decisions > 9\n").r, "Implementation Decisions > 9", "a numbered paragraph that does not exist");
withFile(fx, JSON.stringify({ stacks: ["nosuchstack"] }), () => failsNaming(runRaw("# 01: a\n").r, "nosuchstack", "a .fx.json stack with no file"));
withFile(fx, "{ not json", () => failsNaming(runRaw("# 01: a\n").r, ".fx.json", "an unparseable .fx.json"));
{
  const task = path.join(plan, "tasks", "01-a.md");
  const r = (0, import_child_process.spawnSync)(process.execPath, [BIN, "--worktree", wt, "no-such-slug", task, path.join(wt, "o.md")], { encoding: "utf8", cwd: TMP });
  failsNaming(r, "plan.md", "a plan.md that cannot be read");
}
const designMd = path.join(plan, "design.md");
const keepDesign = fs.readFileSync(designMd, "utf8");
fs.unlinkSync(designMd);
try {
  failsNaming(runRaw("# 01: a\n\n**Design:** Implementation Decisions > 2\n").r, "design.md", "design.md missing while the task names a Design entry");
  assert.ok(runRaw("# 01: a\n").r.status === 0, "design.md missing is fine when the task names no Design entry");
} finally {
  fs.writeFileSync(designMd, keepDesign);
}
for (const bad of ["abc", {}, 5]) {
  withFile(fx, JSON.stringify({ stacks: bad }), () => {
    const r = runRaw("# 01: a\n").r;
    assert.strictEqual(r.status, 1, `stacks ${JSON.stringify(bad)} exits 1`);
    assert.ok(r.stderr.includes("names.map is not a function"), r.stderr);
  });
}
withFile(fx, JSON.stringify({ stacks: null }), () => assert.strictEqual(runRaw("# 01: a\n").r.status, 0, "null stacks means none"));
console.log("compile-brief: OK");
