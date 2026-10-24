// generated from src/lib/preamble.ts by scripts/build: edit there, not here
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
var preamble_exports = {};
__export(preamble_exports, {
  HARNESSES: () => HARNESSES,
  laneAddress: () => laneAddress,
  render: () => render
});
module.exports = __toCommonJS(preamble_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_plan_state = require("./plan-state");
var import_fx_json = require("./fx-json");
var import_json = require("./json");
const PREAMBLE_PATH = path.join(__dirname, "..", "PREAMBLE.md");
const HARNESSES = ["claude-code", "opencode", "codex", "opencode-v2"];
const NEVER_READ = "Never `Read` a `SKILL.md` instead of invoking it: reading gives you the text without the obligation, which is the failure this section exists to stop.";
const ADDRESSING = {
  "claude-code": {
    lane: (name) => `fx:${name}`,
    skillTool: "the `Skill` tool",
    resolution: "A plugin skill resolves as `plugin:skill`, so a bare `fx-tdd` may not resolve at all",
    readRule: NEVER_READ,
    dispatch: "Name the agent with the plugin prefix, such as `fx:fx-lens-security`, as the subagent type."
  },
  opencode: {
    lane: (name) => name,
    skillTool: "the `Skill` tool",
    resolution: "The name carries no plugin prefix here, so the plugin-prefixed form will not resolve",
    readRule: NEVER_READ,
    dispatch: "Name the agent without a plugin prefix, such as `fx-lens-security`, as the subagent type."
  },
  "opencode-v2": {
    lane: (name) => name,
    skillTool: "the `skill` tool",
    resolution: "The name carries no plugin prefix here, so the plugin-prefixed form will not resolve",
    readRule: NEVER_READ,
    dispatch: "Call the `subagent` tool with `agent` set to the agent's name without a plugin prefix, such as `fx-lens-security`."
  },
  codex: {
    lane: (name) => `$fx:${name}`,
    // Codex has no Skill tool: its model loads a skill by reading SKILL.md
    // through the shell, and `$name` is the user's syntax, not the model's
    // (research/codex.md, section 4, catalog_prompt.rs L1-L40).
    skillTool: "your shell to read the lane's `SKILL.md` in full",
    resolution: "Lanes are addressed as `$fx:fx-tdd`, with the plugin prefix. The runtime lists each lane's `SKILL.md` path",
    readRule: "Reading that file is how a lane is invoked here: read all of it, and treat it as binding.",
    dispatch: "Call `spawn_agent` with `agent_type` set to the role's name, such as `fx-lens-security`. Always pass `agent_type`: without it the role is not applied, and the child runs as a copy of you."
  }
};
const laneAddress = (harness, name) => ADDRESSING[harness].lane(name);
function companions(cwd, lane) {
  let unread = "";
  try {
    const raw = (0, import_json.parseJson)(fs.readFileSync(path.join(cwd, ".fx.json"), "utf8"));
    const parsed = (0, import_fx_json.parseFxJson)(raw);
    if (!parsed.ok) {
      if (raw === null) throw new TypeError(parsed.reason);
    } else {
      const custom = parsed.value.companions;
      if (typeof custom === "string") {
        if (!custom) return null;
        const capped = custom.length > 300 ? `${custom.slice(0, 299)}\u2026` : custom;
        return `This repository's .fx.json adds: ${capped}`;
      }
    }
  } catch (err) {
    if ((0, import_plan_state.errCode)(err) !== "ENOENT") {
      unread = ` (.fx.json could not be read: ${err instanceof SyntaxError ? "not valid JSON" : (0, import_plan_state.errCode)(err) || "error"}; this is the default companions line, and any override there is not applied.)`;
    }
  }
  return `Companion tools. Use each one this runtime has, and skip silently any it lacks: semble for codebase search before reading or grepping files, falling back to repowise, or to any other code-search tool present, when semble is missing or comes up empty; the ponytail skill at full; the caveman skill at full; \`${lane("fx-humanize")}\` on prose written for people.` + unread;
}
function render({ harness, cwd = process.cwd(), subagent = false } = {}) {
  const known = HARNESSES.find((h) => h === harness);
  if (!known) throw new Error(`unknown harness: ${harness}`);
  const addressing = ADDRESSING[known];
  let text = fs.readFileSync(PREAMBLE_PATH, "utf8");
  text = text.replace(/\{\{SKILL_TOOL\}\}/g, () => addressing.skillTool);
  text = text.replace(/\{\{LANE:([a-z0-9-]+)\}\}/g, (_, name) => addressing.lane(name));
  text = text.replace(/\{\{RESOLUTION\}\}/g, () => addressing.resolution);
  text = text.replace(/\{\{DISPATCH\}\}/g, () => addressing.dispatch);
  text = text.replace(/\{\{READ_RULE\}\}/g, () => addressing.readRule);
  if (fs.existsSync(path.join(cwd, "repo.md"))) {
    text += `

This repository has a \`repo.md\` describing its structure, patterns and local decisions. Read it before changing code here.
`;
  }
  const line = companions(cwd, addressing.lane);
  if (line) text += `

${line}`;
  if (!subagent) {
    try {
      const plans = (0, import_plan_state.describePlans)(cwd, { lane: addressing.lane });
      if (plans) text += `

${plans}`;
    } catch {
    }
  }
  return text;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  HARNESSES,
  laneAddress,
  render
});
