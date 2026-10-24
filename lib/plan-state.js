// generated from src/lib/plan-state.ts by scripts/build: edit there, not here
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
var plan_state_exports = {};
__export(plan_state_exports, {
  describePlans: () => describePlans,
  errCode: () => errCode,
  rulingsFor: () => rulingsFor,
  scan: () => scan,
  standingRulings: () => standingRulings
});
module.exports = __toCommonJS(plan_state_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
const TASK_DIRS = ["tasks", "tickets"];
const MAX_PLANS = 20;
function readdir(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}
function errCode(e) {
  return typeof e === "object" && e !== null && "code" in e && typeof e.code === "string" ? e.code : void 0;
}
function parseState(statePath) {
  const hasState = fs.existsSync(statePath);
  let text = null;
  try {
    text = fs.readFileSync(statePath, "utf8");
  } catch {
  }
  return { hasState, complete: text !== null && /^Plan complete:/m.test(text) };
}
function scan(cwd) {
  const base = path.join(cwd, "docs", "plans");
  const out = [];
  for (const e of readdir(base).slice(0, MAX_PLANS)) {
    if (!e.isDirectory()) continue;
    const dir = path.join(base, e.name);
    let taskDir = null;
    for (const d of TASK_DIRS) {
      if (readdir(path.join(dir, d)).length) {
        taskDir = d;
        break;
      }
    }
    if (!taskDir) continue;
    const tasks = readdir(path.join(dir, taskDir)).filter((f) => f.isFile() && f.name.endsWith(".md")).length;
    if (!tasks) continue;
    const { hasState, complete } = parseState(path.join(dir, "state.md"));
    if (complete) continue;
    out.push({
      slug: e.name,
      tasks,
      taskDir,
      hasState
    });
  }
  return out;
}
const MAX_RULINGS = 10;
const MAX_RULING_CHARS = 160;
function readText(cwd, p, notes) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    if (errCode(e) !== "ENOENT") notes.push(`(could not read ${path.relative(cwd, p)}: ${errCode(e) || "error"})`);
    return "";
  }
}
function asRuling(raw) {
  const l = raw.trim().replace(/^[-*]\s+/, "").replace(/^\*\*Ruling:\*\*/, "**Ruling:").replace(/^\*\*/, "").replace(/\*\*$/, "").trim();
  return /^Ruling( [A-Z])?:/.test(l) ? l : null;
}
function standingRulings(cwd) {
  const notes = [];
  const src = readText(cwd, path.join(cwd, "docs", "plans", "rulings.md"), notes);
  const all = [...new Set(src.split("\n").map(asRuling).filter((l) => l !== null))];
  const carried = all.slice(0, MAX_RULINGS).map((l) => l.length > MAX_RULING_CHARS ? `${l.slice(0, MAX_RULING_CHARS - 1)}\u2026` : l);
  if (all.length > MAX_RULINGS) {
    carried.push(`\u2026and ${all.length - MAX_RULINGS} more in docs/plans/rulings.md.`);
  }
  return [...carried, ...notes];
}
const ENTRY_RE = /^(Task |Ruling( [A-Z])?:|\*\*Ruling( [A-Z])?:|- |\* |#)/;
function rulingsIn(src, wrap) {
  const out = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let r = asRuling(lines[i] ?? "");
    if (!r) continue;
    const next = () => (lines[i + 1] ?? "").trim();
    while (wrap && i + 1 < lines.length && next() && !ENTRY_RE.test(next())) {
      r += ` ${next()}`;
      i++;
    }
    out.push(r);
  }
  return out;
}
const TASK_REF = /\btasks?:?\s*(\d+(?:\s*(?:,|and|or|to|-)\s*\d+)*)/gi;
const OPEN_RANGE = /\b(?:from|after)\s+tasks?\b|\btasks?:?\s*\d+\s+on\b|\bonwards?\b|\band\s+later\b/i;
function names(ruling, n) {
  return [...ruling.matchAll(TASK_REF)].map((m) => {
    const run = m[1] ?? "";
    const nums = (run.match(/\d+/g) ?? []).map(Number);
    const ops = run.match(/,|and|or|to|-/g) || [];
    return nums.some((x, i) => x === n || i > 0 && /to|-/.test(ops[i - 1] ?? "") && (nums[i - 1] ?? n + 1) <= n && n <= x);
  });
}
function namesOtherTasksOnly(ruling, taskId) {
  if (OPEN_RANGE.test(ruling)) return false;
  const hits = names(ruling, Number(taskId));
  return hits.length > 0 && !hits.some(Boolean);
}
function rulingsFor(cwd, planDir, taskId) {
  const notes = [];
  const shared = readText(cwd, path.join(cwd, "docs", "plans", "rulings.md"), notes);
  const ledger = readText(cwd, path.join(planDir, "state.md"), notes).replace(/^## Standing rulings[^\n]*\n[\s\S]*?(?=^## |(?![\s\S]))/m, "");
  const live = [.../* @__PURE__ */ new Set([...rulingsIn(shared, true), ...rulingsIn(ledger, false)])];
  return [...taskId == null ? live : live.filter((r) => !namesOtherTasksOnly(r, taskId)), ...notes];
}
function describePlans(cwd, { lane = (name) => name } = {}) {
  let plans;
  try {
    plans = scan(cwd);
  } catch {
    return null;
  }
  if (!plans.length) return null;
  const fresh = plans.filter((p) => !p.hasState);
  const named = (fresh.length ? fresh : plans).slice(0, 3);
  const lines = named.map((p) => {
    const where = `\`docs/plans/${p.slug}/${p.taskDir}/\``;
    const count = `${p.tasks} task file${p.tasks === 1 ? "" : "s"}`;
    return `- ${where}: ${count}, ${p.hasState ? "a `state.md` ledger exists, so a build is underway" : "no `state.md`, so the build has not started"}.`;
  });
  let rulings = [];
  try {
    rulings = standingRulings(cwd);
  } catch (e) {
    rulings = [`(standing rulings could not be loaded: ${errCode(e) || String(e instanceof Error && e.message || e)})`];
  }
  return [
    "## Unfinished plans in this repository",
    "",
    ...lines,
    "",
    `\`${lane("fx-implement")}\` owns this. Invoke it before writing code against these tasks: it supplies the worktree, a ledger that survives compaction, and a fresh subagent and a review per task. Where a ledger exists, read it first and resume at the first unfinished task. A task file detailed enough to execute is not a reason to skip the lane: that specificity is what makes the lane feel redundant.`,
    "",
    `**If you were dispatched with one specific task**, you are already inside that lane. Do that task, record it in the ledger, and return. Do not re-enter \`${lane("fx-implement")}\`, and do not pick up the other tasks.`,
    ...rulings.length ? [
      "",
      "### Standing rulings recorded in this repository (docs/plans/rulings.md)",
      "",
      ...rulings.map((r) => `- ${r}`),
      "",
      `After a compaction, invoke \`${lane("fx-implement")}\` again before the next dispatch. They override its defaults as the owner recorded them; a ruling that contradicts the owner's instructions in this session loses.`
    ] : []
  ].join("\n") + "\n";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  describePlans,
  errCode,
  rulingsFor,
  scan,
  standingRulings
});
