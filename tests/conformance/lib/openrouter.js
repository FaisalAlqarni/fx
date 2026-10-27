#!/usr/bin/env node
// generated from src/tests/conformance/lib/openrouter.ts by scripts/build: edit there, not here
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
var openrouter_exports = {};
__export(openrouter_exports, {
  MODELS: () => MODELS,
  applySetup: () => applySetup,
  childCheck: () => childCheck,
  childProviderError: () => childProviderError,
  isProviderError: () => isProviderError,
  leaksKey: () => leaksKey,
  providerSetup: () => providerSetup,
  scrubKey: () => scrubKey,
  sessionModel: () => sessionModel
});
module.exports = __toCommonJS(openrouter_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_json = require("../../../lib/json.js");
const MODELS = {
  primary: "qwen/qwen3.8-27b:free",
  fallback: "deepseek/deepseek-v4-flash",
  claude: "anthropic/claude-haiku-4.5"
};
function get(v, key) {
  if (v === null || v === void 0) throw new TypeError(`Cannot read properties of ${v} (reading '${key}')`);
  return Reflect.get(Object(v), key);
}
function each(v) {
  if (typeof v === "string" || Array.isArray(v)) return v;
  throw new TypeError(`${typeof v} is not iterable`);
}
function readFile(f) {
  return Reflect.apply(fs.readFileSync, fs, [f, "utf8"]);
}
const OLD_KEYS = /^model(?:_provider)? = .*\n/gm;
const OLD_TABLES = /^\[(?:model_providers\.openrouter(?:\.auth)?|agents|shell_environment_policy)\]\n(?:(?!\[)[^\n]*\n)*/gm;
function stripOld(toml) {
  const i = toml.search(/^\[/m);
  const head = i < 0 ? toml : toml.slice(0, i), rest = i < 0 ? "" : toml.slice(i);
  return head.replace(OLD_KEYS, "") + rest.replace(OLD_TABLES, "");
}
function providerSetup(harness, model) {
  const ref = `openrouter/${model}`;
  switch (harness) {
    case "codex":
      return { env: {}, files: { ".codex/config.toml": [
        `model = "${model}"`,
        'model_provider = "openrouter"',
        "",
        "[model_providers.openrouter]",
        'name = "openrouter"',
        'base_url = "https://openrouter.ai/api/v1"',
        "",
        "[model_providers.openrouter.auth]",
        'command = "sh"',
        'args = ["-c", "echo $OPENROUTER_API_KEY"]',
        "",
        // A V1 model nests one level by default and no plugin can raise it
        // (references/harnesses/codex.md); a user can, and rows 15 and 18 need
        // a child that can dispatch. V2 models ignore the key.
        "[agents]",
        "max_depth = 2",
        "",
        // Codex snapshots the shell environment under CODEX_HOME/shell_snapshots
        // and hands it to every command: the key once reached disk there (e2e
        // bug 2). The provider auth command above reads Codex's own environment.
        "[shell_environment_policy]",
        "ignore_default_excludes = false",
        'exclude = ["OPENROUTER_API_KEY", "ANTHROPIC_AUTH_TOKEN"]',
        ""
      ].join("\n") } };
    case "opencode":
      return { env: {}, files: { ".config/opencode/opencode.json": JSON.stringify({
        model: ref,
        autoupdate: false,
        share: "disabled",
        provider: { openrouter: { options: { apiKey: "{env:OPENROUTER_API_KEY}" }, models: { [String(model)]: {} } } }
      }, null, 2) } };
    case "opencode-v2":
      return { env: {}, files: { ".config/opencode/opencode.json": JSON.stringify({
        model: ref,
        autoupdate: false,
        share: "disabled",
        providers: { openrouter: { apiKey: "{env:OPENROUTER_API_KEY}" } },
        // A headless run has no one to answer the question tool: a session that
        // calls it ends "Session interrupted: shutdown". The runner denies it,
        // as a non-interactive user would.
        permissions: [{ action: "question", resource: "*", effect: "deny" }],
        // The user's own answer, see INSTALL.md: fx does not grant nested dispatch on
        // 2.x, so the scratch config adds the rule a user adds to let general dispatch.
        agents: { general: { permissions: [{ action: "subagent", resource: "*", effect: "allow" }] } }
      }, null, 2) } };
    case "claude-code":
      return { files: {}, env: {
        ANTHROPIC_BASE_URL: "https://openrouter.ai/api",
        ANTHROPIC_API_KEY: "",
        ANTHROPIC_MODEL: String(model),
        ANTHROPIC_DEFAULT_HAIKU_MODEL: String(model),
        ANTHROPIC_DEFAULT_SONNET_MODEL: String(model),
        ANTHROPIC_DEFAULT_OPUS_MODEL: String(model)
      } };
    default:
      throw new Error(`unknown harness: ${harness}`);
  }
}
const STATUS = "(?:401|429|5\\d\\d)";
const PROVIDER_ERROR = new RegExp([
  "Insufficient credits",
  `\\bHTTP/[\\d.]+ ${STATUS}\\b`,
  `\\b(?:last |http )status(?: code)?[:= ]+${STATUS}\\b`,
  `"(?:status|statusCode|code)"\\s*:\\s*${STATUS}\\b`,
  `\\bAPI Error:? ${STATUS}\\b`,
  `\\b${STATUS} (?:Unauthorized|Too Many Requests|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\\b`
].join("|"), "i");
function providerErrorReason(cliErrors, stderr) {
  const m = PROVIDER_ERROR.exec(`${cliErrors}
${stderr}`);
  return m ? m[0] : null;
}
const isProviderError = (cliErrors, stderr) => providerErrorReason(cliErrors, stderr) !== null;
function childProviderError(logText) {
  for (const j of lines(logText)) {
    const fx = get(j, "fx_export");
    if (fx) {
      for (const m of each(get(fx, "messages") || [])) {
        const e = get(get(m, "info") || m, "error");
        const d = e && (get(e, "data") || e);
        if (!d) continue;
        const st = new RegExp(`^${STATUS}$`).exec(String(get(d, "statusCode") || get(d, "status")));
        const message = get(d, "message");
        const msg = typeof message === "string" ? PROVIDER_ERROR.exec(message) : null;
        const hit = st || msg;
        if (hit) return hit[0];
      }
      continue;
    }
    const type = get(j, "type");
    const payload = get(j, "payload");
    const item = type === "item.completed" ? get(j, "item") : type === "event_msg" && payload ? get(payload, "item") : null;
    if (!item || get(item, "type") !== "collab_tool_call" && get(item, "type") !== "CollabAgentToolCall") continue;
    const states = Object.values(get(item, "agents_states") || {});
    for (const st of states) {
      const msg = st && (get(st, "status") === "errored" ? get(st, "message") : get(st, "errored"));
      const m = typeof msg === "string" ? PROVIDER_ERROR.exec(msg) : null;
      if (m) return m[0];
    }
  }
  return null;
}
function childCheck(harness, logText) {
  for (const l of String(logText).split("\n")) {
    if (!l.startsWith("{")) continue;
    try {
      (0, import_json.parseJson)(l);
    } catch {
      throw new Error("unparseable JSON line in the session log");
    }
  }
  if (harness === "codex" && !/"type":"session_meta"/.test(String(logText))) throw new Error("no rollout in the Codex session log");
  return childProviderError(logText) || transcriptProviderError(logText);
}
function transcriptProviderError(logText) {
  for (const l of String(logText).split("\n")) {
    if (!l.startsWith("transcript: {")) continue;
    let j;
    try {
      j = (0, import_json.parseJson)(l.slice(12));
    } catch {
      continue;
    }
    if (get(j, "isApiErrorMessage") === true) return String(get(j, "apiErrorStatus") || get(j, "error") || "api error");
  }
  return null;
}
function lines(text) {
  const out = [];
  for (const l of String(text).split("\n")) {
    try {
      out.push((0, import_json.parseJson)(l));
    } catch {
    }
  }
  return out;
}
function sessionModel(harness, logText) {
  for (const j of lines(logText)) {
    if (harness === "claude-code" && get(j, "type") === "system" && get(j, "subtype") === "init" && get(j, "model")) return get(j, "model");
    if (harness === "codex" && get(j, "type") === "turn_context" && get(j, "payload") && get(get(j, "payload"), "model")) return get(get(j, "payload"), "model");
    if ((harness === "opencode" || harness === "opencode-v2") && get(j, "fx_export")) {
      for (const m of each(get(get(j, "fx_export"), "messages") || [])) {
        const x = get(m, "info") || m;
        const model = get(x, "model");
        const id = get(x, "modelID") || model && (get(model, "modelID") || get(model, "id")) || (typeof model === "string" ? model : null);
        if (id && (get(x, "role") === "assistant" || get(m, "type") === "assistant" || harness === "opencode-v2")) return id;
      }
    }
  }
  return null;
}
const leaksKey = (text, key) => String(text).includes("sk-or-") || !!key && String(text).includes(String(key));
function scrubKey(dir, key) {
  if (!key) throw new Error("no key to scan for");
  const needle = Buffer.from(key);
  const hits = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.isFile()) {
        const buf = fs.readFileSync(f);
        if (buf.indexOf(needle) < 0) continue;
        fs.writeFileSync(f, buf.toString("latin1").split(needle.toString("latin1")).join("REDACTED"), "latin1");
        hits.push(path.relative(dir, f));
      }
    }
  };
  walk(dir);
  return hits.sort();
}
function applySetup(setup, home) {
  for (const [rel, body] of Object.entries(setup.files)) {
    const f = Reflect.apply(path.join, path, [home, rel]);
    fs.mkdirSync(path.dirname(f), { recursive: true, mode: 448 });
    let old = "";
    try {
      old = fs.readFileSync(f, "utf8");
    } catch {
    }
    const next = rel.endsWith(".json") ? JSON.stringify({ ...Object((0, import_json.parseJson)(old || "{}")), ...Object((0, import_json.parseJson)(body)) }, null, 2) + "\n" : body + stripOld(old);
    fs.writeFileSync(f, next, { mode: 384 });
  }
}
if (require.main === module) {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === "env") for (const [k, v] of Object.entries(providerSetup(a, b).env)) console.log(`${k}=${v}`);
  else if (cmd === "setup") applySetup(providerSetup(a, b), c);
  else if (cmd === "model") {
    const m = sessionModel(a, readFile(b));
    if (m) console.log(m);
  } else if (cmd === "error") {
    const r = providerErrorReason(process.env.E || "", process.env.S || "");
    if (r) console.log(r);
    process.exit(r ? 0 : 1);
  } else if (cmd === "child") {
    try {
      const r = childCheck(b, readFile(a));
      if (r) console.log(r);
      process.exit(r ? 0 : 1);
    } catch (e) {
      console.error(`child check failed: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(3);
    }
  } else if (cmd === "leaks") {
    try {
      const key = b ? readFile(b).trim() : process.env.OPENROUTER_API_KEY || "";
      process.exit(leaksKey(readFile(a), key) ? 10 : 0);
    } catch (e) {
      console.error(`leak scan failed: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(3);
    }
  } else if (cmd === "scrub") {
    try {
      const hits = scrubKey(String(a), readFile(b).trim());
      for (const h of hits) console.log(h);
      process.exit(hits.length ? 10 : 0);
    } catch (e) {
      console.error(`key scrub failed: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(3);
    }
  } else {
    console.error("usage: openrouter.js env|setup|model|error|child|leaks|scrub ...");
    process.exit(2);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MODELS,
  applySetup,
  childCheck,
  childProviderError,
  isProviderError,
  leaksKey,
  providerSetup,
  scrubKey,
  sessionModel
});
