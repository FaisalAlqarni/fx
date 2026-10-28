// generated from src/lib/opencode-commands.ts by scripts/build: edit there, not here
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
var opencode_commands_exports = {};
__export(opencode_commands_exports, {
  opencodeCommands: () => opencodeCommands
});
module.exports = __toCommonJS(opencode_commands_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_agent_dialects = require("./agent-dialects.js");
const PLUGIN_PREFIX_RE = /\bfx:(?=fx-)/g;
const SKILL_PATH_RE = /`(\.\.\/\.\.\/(?:references|agents|skills)\/[^`]+|\.\.\/\.\.\/)`/g;
const BASE_DIR_SENTENCE_RE = /Every path below that starts `\.\.\/\.\.\/`[^.]*\./g;
function command(desc, body) {
  const strip = (s) => s.replace(PLUGIN_PREFIX_RE, "");
  return {
    description: strip(desc),
    template: strip(body).replace(/^\n+|\n+$/g, "") + "\n\nArguments, if any: $ARGUMENTS"
  };
}
function frontmatter(file) {
  try {
    return (0, import_agent_dialects.splitFrontmatter)(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
function opencodeCommands(root, destAbs) {
  const out = {};
  const commandsDir = path.join(root, "commands");
  for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md")).sort()) {
    const parsed = frontmatter(path.join(commandsDir, file));
    const name = file.slice(0, -3);
    out[name] = command((0, import_agent_dialects.field)(parsed.fm, "description") || name, parsed.body);
  }
  const skillsDir = path.join(root, "skills");
  for (const name of fs.readdirSync(skillsDir).sort()) {
    const skillMd = path.join(skillsDir, name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const parsed = frontmatter(skillMd);
    if (((0, import_agent_dialects.field)(parsed.fm, "disable-model-invocation") || "") !== "true") continue;
    if (fs.existsSync(path.join(commandsDir, `${name}.md`))) continue;
    const missing = [];
    const body = parsed.body.replace(BASE_DIR_SENTENCE_RE, () => `Every path below that starts \`${destAbs}\` is an absolute path into the fx install, never into the user's repository.`).replace(SKILL_PATH_RE, (_m, rel) => {
      const tail = rel.slice("../../".length);
      const source = path.resolve(skillsDir, name, rel);
      if (!fs.existsSync(source)) missing.push(source);
      return tail ? `\`${destAbs}/${tail}\`` : `\`${destAbs}\``;
    });
    if (missing.length) throw new Error(`rewritten path does not exist: ${missing.join(", ")}`);
    out[name] = command((0, import_agent_dialects.field)(parsed.fm, "description") || name, body);
  }
  return out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  opencodeCommands
});
