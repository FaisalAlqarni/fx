// generated from src/plugins/fx-opencode-v1.ts by scripts/build: edit there, not here
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const messageOf = (e) => String(e instanceof Error && e.message || e);
const fnExport = (fn, name) => {
  if (typeof fn !== "function") throw new Error(`${name} is not a function`);
  return fn;
};
let inspect;
let guardLoadError;
try {
  const guard = require2("../lib/git-guard.js");
  inspect = fnExport(guard.inspect, "inspect");
} catch (e) {
  guardLoadError = e;
}
let parseCall;
let parseLoadError;
try {
  const input = require2("../lib/opencode-input.js");
  parseCall = fnExport(input.parseOpencodeV1Call, "parseOpencodeV1Call");
} catch (e) {
  parseLoadError = e;
}
let classifyShell;
let namesFxState;
let hardReason;
let rulesLoadError;
try {
  const rules = require2("../lib/shell-rules.js");
  classifyShell = fnExport(rules.classifyShell, "classifyShell");
  namesFxState = fnExport(rules.namesFxState, "namesFxState");
  hardReason = fnExport(rules.hardReason, "hardReason");
} catch (e) {
  rulesLoadError = e;
}
let guardShell;
let shellGuardError;
try {
  const shell = require2("../lib/shell-guard.js");
  guardShell = fnExport(shell.guardShell, "guardShell");
} catch (e) {
  shellGuardError = e;
}
let parseResult;
let recordToolResult;
let decideStop;
let makeQueue;
let parseAgent;
let turnLoadError;
try {
  const input = require2("../lib/opencode-input.js");
  const tracker = require2("../lib/loop-tracker.js");
  const stop = require2("../lib/stop-check.js");
  const q = require2("../lib/opencode-queue.js");
  parseResult = fnExport(input.parseOpencodeV1Result, "parseOpencodeV1Result");
  parseAgent = fnExport(input.parseOpencodeAgent, "parseOpencodeAgent");
  makeQueue = fnExport(q.createQueue, "createQueue");
  recordToolResult = fnExport(tracker.recordToolResult, "recordToolResult");
  decideStop = fnExport(stop.decideStop, "decideStop");
} catch (e) {
  turnLoadError = e;
}
let checkEdit;
let logEditRuleError;
let editRulesError;
try {
  const rules = require2("../lib/edit-rules.js");
  if (typeof rules.logEditRuleError === "function") logEditRuleError = rules.logEditRuleError;
  checkEdit = fnExport(rules.checkEdit, "checkEdit");
} catch (e) {
  editRulesError = e;
}
let fxJsonNotice;
let fxJsonError;
try {
  const watch = require2("../lib/fx-json-watch.js");
  fxJsonNotice = fnExport(watch.fxJsonNotice, "fxJsonNotice");
} catch (e) {
  fxJsonError = e;
}
let journal;
try {
  const j = require2("../lib/journal.js");
  journal = { appendEvent: fnExport(j.appendEvent, "appendEvent"), journalKey: fnExport(j.journalKey, "journalKey"), pruneJournals: fnExport(j.pruneJournals, "pruneJournals") };
} catch (e) {
  console.error(`[fx] the session journal module failed to load (${e instanceof Error ? e.message : String(e)}), so fx cannot mark turns or remind at Stop on opencode 1.x.`);
}
let machinePaths;
try {
  const paths = require2("../lib/fx-paths.js");
  machinePaths = fnExport(paths.machinePaths, "machinePaths");
} catch {
}
function shellGuardOff(e, session, cwd) {
  const m = `[fx] shell guard off: ${messageOf(e)}`;
  console.error(m);
  appendDecision({ ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "opencode", event: "guard", session, cwd, text: "", source: "guard-error", action: "allow", unavailable: m.slice(0, 200) });
}
function editRulesOff(e, session, cwd) {
  const m = messageOf(e);
  const now = Date.now();
  if (logEditRuleError) return logEditRuleError({ harness: "opencode", sessionId: session, cwd, now }, m);
  appendDecision({ ts: new Date(now).toISOString(), harness: "opencode", event: "edit-rule", session, cwd, text: "", source: "error", action: "allow", unavailable: m.slice(0, 200) });
}
function appendDecision(entry) {
  try {
    if (!machinePaths) throw new Error("no state directory");
    const dir = machinePaths().stateDir;
    fs.mkdirSync(dir, { recursive: true, mode: 448 });
    fs.appendFileSync(path.join(dir, "decisions.jsonl"), `${JSON.stringify(entry)}
`, { mode: 384 });
  } catch {
  }
}
let laneCheck;
try {
  const lane = require2("../lib/lane-check.js");
  laneCheck = fnExport(lane.laneCheck, "laneCheck");
} catch {
  laneCheck = () => null;
}
let render;
try {
  const pre = require2("../lib/preamble.js");
  render = fnExport(pre.render, "render");
} catch {
  render = () => {
    throw new Error("lib/preamble.js failed to load");
  };
}
const isObj = (v) => typeof v === "object" && v !== null;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const AGENTS_DIR = path.join(ROOT, "agents");
const SKILLS_DIR = path.join(ROOT, "skills");
const REFERENCES = path.join(ROOT, "references");
let HIDDEN_SKILLS = [];
let hiddenLoadError;
try {
  const lanes = require2("../lib/user-invoked-lanes.js");
  HIDDEN_SKILLS = lanes.USER_INVOKED_LANES;
} catch (e) {
  hiddenLoadError = e;
}
function extractPatchPaths(text) {
  if (typeof text !== "string") return [];
  const paths = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/) || line.match(/^\*\*\* Move to: (.+)$/);
    if (m?.[1]) paths.push(m[1].trim());
  }
  return paths;
}
function applyConfig(config) {
  const asRules = (v) => typeof v === "string" ? { "*": v } : v || {};
  const permission = asRules(config.permission);
  config.permission = permission;
  if (!isObj(permission)) throw new TypeError("config.permission is not an object");
  const skillRules = asRules(permission.skill);
  permission.skill = skillRules;
  if (!isObj(skillRules)) throw new TypeError("config.permission.skill is not an object");
  if (!("*" in skillRules)) skillRules["*"] = permission["*"] || "allow";
  if (hiddenLoadError) throw hiddenLoadError;
  for (const name of HIDDEN_SKILLS) skillRules[name] = "deny";
  const { READ_ONLY_AGENTS } = require2("../lib/plant-roles.js");
  const { toOpencodeAgent } = require2("../lib/agent-dialects.js");
  const { opencodeCommands } = require2("../lib/opencode-commands.js");
  const REFERENCES_DIRS = [.../* @__PURE__ */ new Set([REFERENCES, fs.realpathSync(REFERENCES)])];
  const skills = config.skills || (config.skills = {});
  const skillPaths = skills.paths || (skills.paths = []);
  if (!skillPaths.includes(SKILLS_DIR)) {
    skillPaths.push(SKILLS_DIR);
  }
  const agents = config.agent || (config.agent = {});
  for (const name of READ_ONLY_AGENTS) {
    if (agents[name]) continue;
    const mdText = fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), "utf8");
    agents[name] = toOpencodeAgent(mdText, { referencesDirs: REFERENCES_DIRS });
  }
  const general = agents.general || (agents.general = {});
  if (!isObj(general)) throw new TypeError("config.agent.general is not an object");
  const generalPermission = general.permission || (general.permission = {});
  if (isObj(generalPermission) && !("task" in generalPermission) && !("*" in generalPermission)) {
    generalPermission.task = "allow";
  }
  config.subagent_depth = Math.max(config.subagent_depth || 1, 2);
  const commands = config.command || (config.command = {});
  for (const [name, cmd] of Object.entries(opencodeCommands(ROOT, ROOT))) {
    if (!commands[name]) commands[name] = cmd;
  }
}
const fx = async ({ directory } = {}) => {
  const cwd = directory || process.cwd();
  journal?.pruneJournals(Date.now());
  async function shellGuard(command, sessionId) {
    if (!classifyShell) {
      throw new Error(`[fx] shell rules failed to load (${messageOf(rulesLoadError)}). Denying every shell command until the plugin is repaired.`);
    }
    const posix = process.platform !== "win32";
    let hardDeny;
    try {
      const hard = classifyShell(command, posix);
      hardDeny = hard.kind === "hard-deny" ? hard.reason : null;
    } catch (e) {
      throw new Error(`[fx] shell rules failed to evaluate this command (${messageOf(e)}). Denying rather than assuming it is safe.`);
    }
    let d;
    try {
      if (!guardShell) throw shellGuardError;
      d = await guardShell({ command, cwd, harness: "opencode", sessionId, now: Date.now(), posix });
    } catch (e) {
      if (hardDeny !== null) throw new Error(hardDeny);
      shellGuardOff(e, sessionId, cwd);
      return;
    }
    if (hardDeny !== null) throw new Error(hardDeny);
    if (d.action === "deny") throw new Error(`${d.reason}`);
    if (d.action === "ask") throw new Error(`${d.reason}`);
    if (d.action === "warn") console.error(d.reason);
  }
  let preamble;
  try {
    preamble = render({ harness: "opencode", cwd });
  } catch {
    preamble = "[fx] PREAMBLE.md could not be read. The fx bootstrap and its always-on rules are NOT loaded. Do not commit, and tell the user the plugin is misinstalled.";
  }
  let configError = null;
  const warned = /* @__PURE__ */ new Set();
  const warnOnce = (line) => {
    if (warned.has(line)) return;
    warned.add(line);
    console.error(line);
  };
  let guardOffShown = false;
  const sessionOf = (input) => {
    const ev = parseCall?.(input, void 0);
    return ev?.ok ? ev.value.sessionID : void 0;
  };
  const queue = makeQueue?.("opencode", cwd);
  const fxJsonSeen = /* @__PURE__ */ new Map();
  const markTurn = async (j, session, input) => {
    const key = j.journalKey(session);
    if (key === null) {
      warnOnce("[fx] chat.message carried no session id, so fx did not mark this turn in the session journal.");
      return;
    }
    try {
      if (!decideStop || !queue) throw turnLoadError;
      if (session === void 0) throw new Error("the chat.message event carried no session id");
      queue.startTurn(session);
      const { text } = await decideStop({ harness: "opencode", sessionId: session, agentId: null, cwd, stopHookActive: false, mode: "reminder" });
      if (text !== null) queue.enqueue(session, text);
      const notice = fxJsonNotice?.(session, cwd, Date.now(), "opencode", fxJsonSeen) ?? null;
      if (notice !== null) {
        queue.enqueue(session, notice);
        console.error(notice);
      }
    } catch (e) {
      warnOnce(`[fx] the Stop reminder is off: ${messageOf(e)}`);
    }
    if (!fxJsonNotice) warnOnce(`[fx] the .fx.json change notice is off: ${messageOf(fxJsonError)}`);
    if (!j.appendEvent(key, { t: Date.now(), kind: "prompt", text: null, agentType: parseAgent?.(input) ?? null })) {
      warnOnce("[fx] the session journal could not be written, so fx did not mark this turn.");
    }
  };
  return {
    config: async (config) => {
      try {
        applyConfig(config);
      } catch (e) {
        configError = e;
        console.error(`[fx] the plugin's config step failed (${messageOf(e)}); fx's skills, review agents or commands may be missing. The git guard still runs.`);
      }
    },
    "experimental.chat.system.transform": async (input, output) => {
      output.system.push(preamble);
      if (configError) {
        output.system.push(`[fx] The fx plugin failed to configure (${messageOf(configError)}). Its review agents may be missing. Tell the user the plugin is misinstalled.`);
      }
      if (shellGuardError !== void 0 && !guardOffShown) {
        guardOffShown = true;
        output.system.push(`[fx] shell guard off: ${messageOf(shellGuardError)}`);
      }
      const session = sessionOf(input);
      if (session !== void 0 && queue !== void 0) output.system.push(...queue.drain(session));
    },
    // Records the call and queues the tracker's line, if any. Fail open.
    "tool.execute.after": async (input, output) => {
      try {
        if (!parseResult || !recordToolResult) throw turnLoadError;
        const r = parseResult(input, output);
        if (r.sessionID === void 0 || r.tool === void 0) {
          warnOnce("[fx] a tool.execute.after event carried no session id or tool name, so fx did not record it (the event shape may have changed).");
          return;
        }
        const command = typeof r.args.command === "string" ? r.args.command : null;
        const line = recordToolResult({
          harness: "opencode",
          sessionId: r.sessionID,
          agentId: null,
          cwd,
          toolName: r.tool,
          toolInput: r.args,
          command,
          outcome: r.outcome,
          output: r.output,
          interrupted: r.interrupted
        });
        if (line !== null) queue?.enqueue(r.sessionID, line);
      } catch (e) {
        warnOnce(`[fx] the loop tracker is off: ${messageOf(e)}`);
      }
    },
    // A new user message marks a turn boundary. Its text is never recorded:
    // fx cannot tell the user's prompt from a parent agent's prompt to a child session (design 6).
    "chat.message": async (input) => {
      const session = sessionOf(input);
      if (journal) await markTurn(journal, session, input);
    },
    "tool.execute.before": async (input, output) => {
      if (!parseCall) {
        throw new Error(`[fx] opencode input parser failed to load (${messageOf(parseLoadError)}). Denying every tool call until the plugin is repaired.`);
      }
      const event = parseCall(input, output);
      if (!event.ok) return;
      const { tool, args } = event.value;
      if (tool === "bash") {
        const command = args.command;
        if (!command) return;
        if (!inspect) {
          throw new Error(`[fx] git guard failed to load (${messageOf(guardLoadError)}). Denying every command until the plugin is repaired.`);
        }
        let verdict;
        try {
          verdict = inspect(command, cwd);
        } catch (e) {
          verdict = { allow: false, reason: `git guard failed to evaluate this command (${messageOf(e)}). Denying rather than assuming it is safe.` };
        }
        if (!verdict.allow) throw new Error(`[fx] ${verdict.reason}`);
        if (typeof command !== "string") {
          throw new Error(`[fx] the shell command is not a string (${typeof command}), so the guards cannot read it. Denying rather than assuming it is safe.`);
        }
        await shellGuard(command, event.value.sessionID ?? null);
        return;
      }
      let filePaths;
      if (tool === "edit" || tool === "write") {
        filePaths = typeof args.filePath === "string" && args.filePath ? [args.filePath] : [];
      } else if (tool === "apply_patch") {
        filePaths = extractPatchPaths(args.patchText).map((p) => path.resolve(cwd, p));
      } else {
        return;
      }
      if (!namesFxState || !hardReason) {
        throw new Error(`[fx] shell rules failed to load (${messageOf(rulesLoadError)}). Denying every file write until the plugin is repaired.`);
      }
      for (const filePath of filePaths) {
        if (namesFxState(path.resolve(cwd, filePath))) throw new Error(hardReason("fx-state"));
      }
      for (const filePath of filePaths) {
        let reason = null;
        try {
          reason = laneCheck(filePath, cwd);
        } catch {
          reason = null;
        }
        if (reason) throw new Error(`[fx] ${reason}`);
      }
      const sessionId = event.value.sessionID ?? null;
      if (!checkEdit) {
        warnOnce(`[fx] edit rules off: ${messageOf(editRulesError)}`);
        editRulesOff(editRulesError, sessionId, cwd);
        return;
      }
      const d = await checkEdit({ harness: "opencode", sessionId, cwd, toolName: tool, toolInput: args, now: Date.now() });
      if (d.action === "refuse" && d.reason !== null) throw new Error(d.reason);
    }
  };
};
export {
  fx
};
