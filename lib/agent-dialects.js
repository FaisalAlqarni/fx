// generated from src/lib/agent-dialects.ts by scripts/build: edit there, not here
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
var agent_dialects_exports = {};
__export(agent_dialects_exports, {
  field: () => field,
  splitFrontmatter: () => splitFrontmatter,
  toOpencodeAgent: () => toOpencodeAgent,
  toOpencodeV2Agent: () => toOpencodeV2Agent
});
module.exports = __toCommonJS(agent_dialects_exports);
const WRITE_TOOLS = /\b(Write|Edit|NotebookEdit)\b/;
const BASH_TOOL = /\bBash\b/;
function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("agent definition has no frontmatter");
  return { fm: m[1] ?? "", body: m[2] ?? "" };
}
function field(fm, key) {
  let m = fm.match(new RegExp(`^${key}:\\s*>\\s*\\n((?:[ \\t]+.*\\n?)+)`, "m"));
  if (m) return (m[1] ?? "").split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
  m = fm.match(new RegExp(`^${key}:[ \\t]*(.+)$`, "m"));
  return m ? (m[1] ?? "").trim() : null;
}
const READ_KEYS = { Read: ["read"], Grep: ["grep"], Glob: ["glob", "list"] };
function toOpencodeAgent(mdText, { referencesDirs = [] } = {}) {
  const { fm, body } = splitFrontmatter(mdText);
  const description = field(fm, "description") || "";
  const tools = field(fm, "tools") || "";
  const permission = { "*": "deny" };
  for (const [tool, keys] of Object.entries(READ_KEYS)) {
    if (new RegExp(`\\b${tool}\\b`).test(tools)) for (const k of keys) permission[k] = "allow";
  }
  permission.edit = WRITE_TOOLS.test(tools) ? "allow" : "deny";
  permission.bash = BASH_TOOL.test(tools) ? "allow" : "deny";
  if (referencesDirs.length) {
    permission.external_directory = Object.fromEntries(referencesDirs.map((d) => [`${d}/*`, "allow"]));
  }
  return { mode: "subagent", description, prompt: body.trim(), permission };
}
function toOpencodeV2Agent(mdText, { referencesDirs = [] } = {}) {
  const { fm, body } = splitFrontmatter(mdText);
  const tools = field(fm, "tools") || "";
  const rule = (action, effect, resource = "*") => ({ action, resource, effect });
  const permissions = [rule("*", "deny")];
  for (const [tool, keys] of Object.entries(READ_KEYS)) {
    if (new RegExp(`\\b${tool}\\b`).test(tools)) for (const k of keys) permissions.push(rule(k, "allow"));
  }
  permissions.push(rule("edit", WRITE_TOOLS.test(tools) ? "allow" : "deny"));
  permissions.push(rule("shell", BASH_TOOL.test(tools) ? "allow" : "deny"));
  for (const d of referencesDirs) permissions.push(rule("external_directory", "allow", `${d}/*`));
  return { mode: "subagent", description: field(fm, "description") || "", system: body.trim(), permissions };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  field,
  splitFrontmatter,
  toOpencodeAgent,
  toOpencodeV2Agent
});
