// generated from src/lib/fx-json.ts by scripts/build: edit there, not here
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var fx_json_exports = {};
__export(fx_json_exports, {
  parseFxJson: () => parseFxJson
});
module.exports = __toCommonJS(fx_json_exports);
const COMMANDS = ["test_one", "test_scope", "test_all", "setup", "lint", "coverage"];
const SWITCHES = ["stop_check", "loop_nudge", "edit_rules"];
function parseFxJson(raw) {
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: ".fx.json is not an object" };
  const input = new Map(Object.entries(raw));
  const value = {};
  const problems = [];
  const stacks = input.get("stacks");
  if (stacks !== void 0) {
    if (Array.isArray(stacks) && stacks.every((s) => typeof s === "string")) value.stacks = stacks;
    else problems.push({ key: "stacks", reason: "stacks must be an array of strings" });
  }
  for (const key of COMMANDS) {
    const v = input.get(key);
    if (v === void 0) continue;
    if (typeof v === "string" || v === null) value[key] = v;
    else problems.push({ key, reason: `${key} must be a string or null` });
  }
  const floor = input.get("coverage_floor");
  if (floor !== void 0) {
    if (typeof floor === "number" || floor === null) value.coverage_floor = floor;
    else problems.push({ key: "coverage_floor", reason: "coverage_floor must be a number or null" });
  }
  const companions = input.get("companions");
  if (companions !== void 0) {
    if (typeof companions === "string") value.companions = companions;
    else problems.push({ key: "companions", reason: "companions must be a string" });
  }
  const rename = input.get("glossary_rename");
  if (rename !== void 0) {
    if (rename === "declined") value.glossary_rename = rename;
    else problems.push({ key: "glossary_rename", reason: 'glossary_rename must be "declined"' });
  }
  const scratch = input.get("scratch_migrate");
  if (scratch !== void 0) {
    if (scratch === "declined") value.scratch_migrate = scratch;
    else problems.push({ key: "scratch_migrate", reason: 'scratch_migrate must be "declined"' });
  }
  const firstRun = input.get("docs_first_run");
  if (firstRun !== void 0) {
    if (firstRun === "declined") value.docs_first_run = firstRun;
    else problems.push({ key: "docs_first_run", reason: 'docs_first_run must be "declined"' });
  }
  const hooks = input.get("hooks");
  if (hooks !== void 0) {
    if (typeof hooks === "object" && hooks !== null && !Array.isArray(hooks)) {
      const switches = new Map(Object.entries(hooks));
      const out = {};
      for (const name of SWITCHES) {
        const v = switches.get(name);
        if (v === void 0) continue;
        if (typeof v === "boolean") out[name] = v;
        else problems.push({ key: `hooks.${name}`, reason: `hooks.${name} must be a boolean` });
      }
      value.hooks = out;
    } else problems.push({ key: "hooks", reason: "hooks must be an object" });
  }
  const sf = input.get("system_flow");
  if (sf !== void 0) {
    const parsed = parseSystemFlow(sf, problems);
    if (parsed) value.system_flow = parsed;
  }
  return { ok: true, value, problems };
}
const THEME_KINDS = ["docs-css", "mkdocs-material", "tailwind", "app-css", "brand", "fx"];
const themeKind = (v) => THEME_KINDS.find((k) => k === v);
const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function parseSystemFlow(sf, problems) {
  if (!isObj(sf)) {
    problems.push({ key: "system_flow", reason: "system_flow must be an object with output, theme, roots and diagrams" });
    return null;
  }
  const out = {};
  const bad = (key, reason) => {
    problems.push({ key: `system_flow.${key}`, reason });
  };
  const { output, theme, roots, diagrams } = sf;
  if (output !== void 0) {
    if (isObj(output) && typeof output.site === "string" && typeof output.markdown === "string") out.output = { site: output.site, markdown: output.markdown };
    else bad("output", "output must have site and markdown strings");
  }
  if (theme !== void 0) {
    const kind = isObj(theme) ? themeKind(theme.kind) : void 0;
    if (isObj(theme) && typeof theme.source === "string" && kind) out.theme = { source: theme.source, kind };
    else bad("theme", `theme must have a source string and a kind of ${THEME_KINDS.join(", ")}`);
  }
  if (roots !== void 0) {
    if (isObj(roots)) {
      out.roots = {};
      for (const [id, p] of Object.entries(roots)) {
        if (typeof p === "string") out.roots[id] = p;
        else bad(`roots.${id}`, "a root path must be a string");
      }
    } else bad("roots", "roots must be an object");
  }
  if (diagrams !== void 0) {
    if (isObj(diagrams)) {
      const d = {};
      if (diagrams.prefer !== void 0) {
        if (diagrams.prefer === "cheap" || diagrams.prefer === "fast" || diagrams.prefer === "detailed") d.prefer = diagrams.prefer;
        else bad("diagrams.prefer", "prefer must be cheap, fast or detailed");
      }
      if (diagrams.archify !== void 0) bad("diagrams.archify", "archify is not read from .fx.json; pass --archify <dir> or install it in $CLAUDE_CONFIG_DIR/skills/archify or ~/.claude/skills/archify");
      if (diagrams.svg !== void 0) {
        if (Array.isArray(diagrams.svg) && diagrams.svg.every((s) => typeof s === "string")) d.svg = diagrams.svg;
        else bad("diagrams.svg", "svg must be an array of strings");
      }
      if (diagrams.pageLimits !== void 0) {
        if (isObj(diagrams.pageLimits)) {
          d.pageLimits = {};
          for (const [name, n] of Object.entries(diagrams.pageLimits)) {
            if (typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 8) d.pageLimits[name] = n;
            else bad(`diagrams.pageLimits.${name}`, "a page limit must be an integer from 1 to 8");
          }
        } else bad("diagrams.pageLimits", "pageLimits must be an object");
      }
      out.diagrams = d;
    } else bad("diagrams", "diagrams must be an object");
  }
  return out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseFxJson
});
