// generated from src/plugins/fx-opencode-v2.ts by scripts/build: edit there, not here
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let render;
let loadError;
try {
  const pre = require2("../lib/preamble.js");
  if (typeof pre.render !== "function") throw new Error("render is not a function");
  render = pre.render;
} catch (e) {
  loadError = e;
}
let inspect;
let guardError;
try {
  const guard = require2("../lib/git-guard.js");
  if (typeof guard.inspect !== "function") throw new Error("inspect is not a function");
  inspect = guard.inspect;
} catch (e) {
  guardError = e;
}
let parseEvent;
let parseError;
try {
  const input = require2("../lib/opencode-input.js");
  if (typeof input.parseOpencodeToolEvent !== "function") throw new Error("parseOpencodeToolEvent is not a function");
  parseEvent = input.parseOpencodeToolEvent;
} catch (e) {
  parseError = e;
}
let classifyShell;
let namesFxState;
let hardReason;
let rulesError;
try {
  const rules = require2("../lib/shell-rules.js");
  if (typeof rules.classifyShell !== "function") throw new Error("classifyShell is not a function");
  classifyShell = rules.classifyShell;
  if (typeof rules.namesFxState !== "function" || typeof rules.hardReason !== "function") throw new Error("shell-rules is missing an export");
  ({ namesFxState, hardReason } = rules);
} catch (e) {
  rulesError = e;
}
let guardShellCodeOnly;
let shellGuardError;
try {
  const shell = require2("../lib/shell-guard.js");
  if (typeof shell.guardShellCodeOnly !== "function") throw new Error("guardShellCodeOnly is not a function");
  guardShellCodeOnly = shell.guardShellCodeOnly;
} catch (e) {
  shellGuardError = e;
}
let checkBuiltins;
let logEditRuleError;
let editRulesError;
try {
  const rules = require2("../lib/edit-rules.js");
  if (typeof rules.logEditRuleError === "function") logEditRuleError = rules.logEditRuleError;
  if (typeof rules.checkBuiltins !== "function") throw new Error("checkBuiltins is not a function");
  ({ checkBuiltins } = rules);
} catch (e) {
  editRulesError = e;
}
const EDIT_TOOLS = ["edit", "write", "patch"];
let parseResult;
let recordToolResult;
let decideStop;
let makeQueue;
let parseAgent;
let turnError;
try {
  const input = require2("../lib/opencode-input.js");
  const tracker = require2("../lib/loop-tracker.js");
  const stop = require2("../lib/stop-check.js");
  const q = require2("../lib/opencode-queue.js");
  if (typeof q.createQueue !== "function" || typeof input.parseOpencodeAgent !== "function") throw new Error("a turn module is missing an export");
  makeQueue = q.createQueue;
  parseAgent = input.parseOpencodeAgent;
  if (typeof input.parseOpencodeV2Result !== "function" || typeof tracker.recordToolResult !== "function" || typeof stop.decideStop !== "function") {
    throw new Error("a turn module is missing an export");
  }
  parseResult = input.parseOpencodeV2Result;
  recordToolResult = tracker.recordToolResult;
  decideStop = stop.decideStop;
} catch (e) {
  turnError = e;
}
let journal;
try {
  journal = require2("../lib/journal.js");
} catch {
}
let machinePaths;
try {
  const paths = require2("../lib/fx-paths.js");
  if (typeof paths.machinePaths === "function") machinePaths = paths.machinePaths;
} catch {
}
function shellGuardOff(e, session, cwd) {
  const m = `[fx] shell guard off: ${messageOf(e)}`;
  console.error(m);
  writeGuardLine("guard-error", m, e instanceof Error ? e.name : typeof e, session, cwd);
}
function writeGuardLine(source, unavailable, error, session, cwd) {
  appendDecision({ ts: (/* @__PURE__ */ new Date()).toISOString(), harness: "opencode-v2", event: "guard", session, cwd, text: "", source, action: "allow", unavailable: unavailable.slice(0, 200), error });
}
function editRulesOff(message, session, cwd) {
  const now = Date.now();
  if (logEditRuleError) return logEditRuleError({ harness: "opencode-v2", sessionId: session, cwd, now }, message);
  appendDecision({ ts: new Date(now).toISOString(), harness: "opencode-v2", event: "edit-rule", session, cwd, text: "", source: "error", action: "allow", unavailable: message.slice(0, 200) });
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
function shellGuard(ev, command, cwd) {
  const refuse = (message) => {
    ev.effect = "deny";
    ev.message = message;
  };
  if (!classifyShell) return refuse(`[fx] shell rules failed to load (${messageOf(rulesError)}). Denying every shell command until the plugin is repaired.`);
  const posix = process.platform !== "win32";
  let hardDeny;
  try {
    const hard = classifyShell(command, posix);
    hardDeny = hard.kind === "hard-deny" ? hard.reason : null;
  } catch (e) {
    return refuse(`[fx] shell rules failed to evaluate this command (${messageOf(e)}). Denying rather than assuming it is safe.`);
  }
  const sessionId = typeof ev.sessionID === "string" ? ev.sessionID : null;
  let d;
  try {
    if (!guardShellCodeOnly) throw shellGuardError;
    d = guardShellCodeOnly({ command, cwd, harness: "opencode-v2", sessionId, posix });
  } catch (e) {
    if (hardDeny === null) shellGuardOff(e, sessionId, cwd);
  }
  const reason = hardDeny ?? (d?.action === "deny" ? d.reason : null);
  if (reason !== null) return refuse(reason);
}
const commands = /* @__PURE__ */ new Map();
const callKey = (sessionID, messageID, id) => {
  const parts = [sessionID, messageID, id];
  return parts.every((p) => typeof p === "string" && p) ? parts.join("\0") : void 0;
};
let HIDDEN = [];
let hiddenError;
try {
  const lanes = require2("../lib/user-invoked-lanes.js");
  if (!Array.isArray(lanes.USER_INVOKED_LANES)) throw new Error("USER_INVOKED_LANES is not a list");
  HIDDEN = lanes.USER_INVOKED_LANES;
} catch (e) {
  hiddenError = e;
}
const hideRule = (lane) => ({ action: "skill", resource: lane, effect: "deny" });
const list = (v) => Array.isArray(v) ? v : v ? [v] : [];
const promptText = (input) => input.prompt && input.prompt.text || "";
const isIterable = (v) => typeof v === "string" || typeof v === "object" && v !== null && Symbol.iterator in v;
const iterate = (v) => {
  if (!v) return [];
  if (isIterable(v)) return v;
  throw new TypeError("ev.resources is not iterable");
};
const isThenable = (r) => (typeof r === "object" || typeof r === "function") && r !== null && "then" in r && typeof r.then === "function";
const messageOf = (e) => String(e instanceof Error && e.message || e);
const sessionOf = (ev) => {
  const parsed = parseEvent?.(ev);
  return parsed?.ok ? parsed.value.sessionID : void 0;
};
const READ_ACTIONS = ["read", "grep", "glob", "list"];
let READ_ONLY = [];
try {
  const roles = require2("../lib/plant-roles.js");
  if (!Array.isArray(roles.READ_ONLY_AGENTS)) throw new Error("READ_ONLY_AGENTS is not a list");
  READ_ONLY = roles.READ_ONLY_AGENTS;
} catch {
}
function readsOnlyReferences(ev) {
  if (ev.action !== "external_directory") return false;
  const resources = ev.resources;
  if (!Array.isArray(resources) || resources.length === 0) return false;
  const refs = path.join(ROOT, "references");
  const dirs = [refs, fs.realpathSync(refs)];
  return resources.every((r) => {
    const p = path.resolve(String(r));
    return dirs.some((d) => p.startsWith(`${d}/`));
  });
}
var fx_opencode_v2_default = {
  id: "fx",
  async setup(ctx) {
    const failures = [];
    const attempt = (what, fn) => {
      const report = (e) => {
        failures.push(`fx: ${what} failed: ${messageOf(e)}`);
        console.error(`[fx] ${what} failed: ${messageOf(e)}`);
      };
      try {
        const r = fn();
        return isThenable(r) ? Promise.resolve(r).catch(report) : r;
      } catch (e) {
        report(e);
      }
    };
    if (shellGuardError !== void 0) failures.push(`fx: shell guard off: ${messageOf(shellGuardError)}`);
    attempt("pruning old session journals", () => journal?.pruneJournals(Date.now()));
    if (hiddenError) {
      failures.push(`fx: the hidden-lane list failed to load: ${messageOf(hiddenError)}`);
      console.error(`[fx] the hidden-lane list failed to load: ${messageOf(hiddenError)}`);
    }
    const hidden = /* @__PURE__ */ new Set();
    const notice = () => failures.length ? ` [${failures.join("; ")}]` : "";
    const deny = (ev, message) => {
      ev.effect = "deny";
      ev.message = `[fx] ${message}${notice()}`;
    };
    let evaluateError;
    await attempt("permission.evaluate", async () => {
      try {
        await ctx.permission.hook("evaluate", (ev) => {
          if (READ_ONLY.some((n) => n === ev.agent) && !READ_ACTIONS.some((a) => a === ev.action)) {
            try {
              if (!readsOnlyReferences(ev)) return deny(ev, `${ev.agent} is read-only: ${ev.action} is refused.`);
            } catch (e) {
              return deny(ev, `${ev.agent} is read-only and its check failed, so ${ev.action} is refused: ${messageOf(e)}`);
            }
          }
          if (ev.action === "shell") {
            let allowed;
            try {
              if (guardError || !inspect) throw guardError;
              const key = ev.source ? callKey(ev.sessionID, ev.source.messageID, ev.source.id) : void 0;
              const command = key === void 0 ? void 0 : commands.get(key);
              if (command === void 0) {
                deny(ev, "fx could not see this command's full text, so the git guard cannot check it.");
                return;
              }
              const verdict = inspect(command, ctx.location.directory);
              if (!verdict.allow) return deny(ev, verdict.reason);
              for (const piece of list(ev.resources)) {
                const v = inspect(String(piece), ctx.location.directory);
                if (!v.allow) return deny(ev, v.reason);
              }
              allowed = command;
            } catch (e) {
              deny(ev, `the fx git guard failed, so the command is refused: ${messageOf(e)}`);
            }
            if (allowed !== void 0) shellGuard(ev, allowed, ctx.location.directory);
            return;
          }
          if (ev.action === "edit") {
            const refuse = (message) => {
              ev.effect = "deny";
              ev.message = message;
            };
            if (!namesFxState || !hardReason) return refuse(`[fx] shell rules failed to load (${messageOf(rulesError)}). Denying every file write until the plugin is repaired.`);
            try {
              for (const r of iterate(ev.resources)) {
                if (typeof r === "string" && namesFxState(path.resolve(ctx.location.directory, r))) return refuse(hardReason("fx-state"));
              }
            } catch {
            }
          }
          try {
            if (ev.action === "edit") {
              const { laneCheck } = require2("../lib/lane-check.js");
              for (const r of iterate(ev.resources)) {
                if (typeof r !== "string") throw new TypeError("an edit resource is not a string");
                const reason = laneCheck(path.resolve(ctx.location.directory, r), ctx.location.directory);
                if (reason) {
                  ev.effect = "deny";
                  ev.message = `[fx] ${reason}`;
                  return;
                }
              }
              return;
            }
            if (ev.action !== "skill") return;
            if (ev.resources && !Array.isArray(ev.resources)) throw new TypeError("ev.resources is not a list");
            const lane = HIDDEN.find((l) => list(ev.resources).some((r) => r === l));
            if (!lane) return;
            if (ev.effect === "allow" && hidden.has(ev.agent)) return;
            deny(ev, `${lane} is typed by the user, not picked by the model: ask them to run /${lane}.`);
          } catch (e) {
            failures.push(`fx: evaluate failed: ${messageOf(e)}`);
            console.error(`[fx] evaluate failed: ${messageOf(e)}`);
            const lane = ev.action === "skill" && HIDDEN.find((l) => list(ev.resources).some((r) => r === l));
            if (lane) deny(ev, `${lane} is typed by the user: ask them to run /${lane}.`);
          }
        });
      } catch (e) {
        evaluateError = e;
        throw e;
      }
    });
    const queue = makeQueue?.("opencode-v2", ctx.location.directory);
    const warned = /* @__PURE__ */ new Set();
    const warnOnce = (line) => {
      if (warned.has(line)) return;
      warned.add(line);
      console.error(line);
    };
    const editRules = (toolName, toolInput, sessionId) => {
      const cwd = ctx.location.directory;
      if (!checkBuiltins) {
        warnOnce(`[fx] edit rules off: ${messageOf(editRulesError)}`);
        editRulesOff(messageOf(editRulesError), sessionId, cwd);
        return;
      }
      const d = checkBuiltins({ harness: "opencode-v2", sessionId, cwd, toolName, toolInput, now: Date.now() });
      if (d.action === "refuse" && d.reason !== null) throw new Error(d.reason);
    };
    let beforeRegistered = false;
    await attempt("tool.execute.before", async () => {
      await ctx.tool.hook("execute.before", (raw) => {
        if (!parseEvent) throw new Error(`fx could not load the opencode input parser: ${messageOf(parseError)}`);
        const parsed = parseEvent(raw);
        if (!parsed.ok) {
          if (raw == null) throw new TypeError("fx got no tool event, so the call is refused.");
          return;
        }
        const ev = parsed.value;
        if (EDIT_TOOLS.some((t) => t === ev.tool)) return editRules(ev.tool ?? "", ev.input, ev.sessionID ?? null);
        if (ev.tool !== "shell") return;
        if (evaluateError) throw new Error(`fx git guard is not installed (permission.evaluate failed to register: ${messageOf(evaluateError)}), so shell commands are refused.`);
        const key = callKey(ev.sessionID, ev.messageID, ev.id);
        const command = ev.input.command;
        attempt("record command", () => {
          if (key !== void 0 && typeof command === "string") commands.set(key, command);
        });
      });
      beforeRegistered = true;
    });
    const blind = /* @__PURE__ */ new Set();
    await attempt("tool.execute.after", () => ctx.tool.hook("execute.after", (raw) => {
      try {
        if (!parseResult || !recordToolResult) throw turnError;
        const r = parseResult(raw);
        if (r.sessionID === void 0 || r.tool === void 0) {
          warnOnce("[fx] a tool.execute.after event carried no session id or tool name, so fx did not record it (the event shape may have changed).");
        } else {
          const parsed = parseEvent?.(raw);
          const key = parsed?.ok ? callKey(parsed.value.sessionID, parsed.value.messageID, parsed.value.id) : void 0;
          const recorded = key === void 0 ? void 0 : commands.get(key);
          const command = typeof r.args.command === "string" ? r.args.command : recorded ?? null;
          if (r.tool === "shell" && r.outcome === "unknown" && r.output === "") {
            warnOnce("[fx] a completed shell call arrived with no exit status and no output, so fx cannot tell whether it passed: repeat-failure nudges and the Stop reminder are unreliable on this opencode 2.x.");
            blind.add(r.sessionID);
          }
          const line = recordToolResult({
            harness: "opencode-v2",
            sessionId: r.sessionID,
            agentId: null,
            cwd: ctx.location.directory,
            toolName: r.tool,
            toolInput: r.args,
            command,
            outcome: r.outcome,
            output: r.output
          });
          if (line !== null) queue?.enqueue(r.sessionID, line);
        }
      } catch (e) {
        warnOnce(`[fx] the loop tracker is off: ${messageOf(e)}`);
      }
      attempt("forget command", () => {
        if (raw == null) throw new TypeError("got no tool event");
        const parsed = parseEvent?.(raw);
        const key = parsed?.ok ? callKey(parsed.value.sessionID, parsed.value.messageID, parsed.value.id) : void 0;
        if (key !== void 0) commands.delete(key);
      });
    }));
    try {
      await ctx.session.hook("prompt", async (ev) => {
        try {
          if (!journal) throw new Error("the journal module did not load");
          const key = journal.journalKey(sessionOf(ev));
          if (key === null) return warnOnce("[fx] the prompt hook carried no session id, so fx did not mark this turn in the session journal.");
          try {
            if (!decideStop || !queue) throw turnError;
            const session = sessionOf(ev);
            if (session === void 0) throw new Error("the prompt event carried no session id");
            queue.startTurn(session);
            const unseen = blind.delete(session);
            if (!unseen) {
              const { text } = await decideStop({ harness: "opencode-v2", sessionId: session, agentId: null, cwd: ctx.location.directory, stopHookActive: false, mode: "reminder" });
              if (text !== null) queue.enqueue(session, text);
            }
          } catch (e) {
            warnOnce(`[fx] the Stop reminder is off: ${messageOf(e)}`);
          }
          if (!journal.appendEvent(key, { t: Date.now(), kind: "prompt", text: null, agentType: parseAgent?.(ev) ?? null })) {
            warnOnce("[fx] the session journal could not be written, so fx did not mark this turn.");
          }
        } catch (e) {
          warnOnce(`[fx] the prompt hook failed, so fx did not mark this turn: ${messageOf(e)}`);
        }
      });
    } catch (e) {
      console.error(`[fx] the prompt hook is unavailable: ${messageOf(e)}; the Stop reminder cannot work on this opencode.`);
    }
    await attempt("session.context", () => ctx.session.hook("context", (ev) => attempt("context hook", () => {
      let text;
      try {
        if (!render) throw loadError;
        text = render({ harness: "opencode-v2", cwd: ctx.location.directory });
      } catch (e) {
        text = `[fx] fx failed to load: ${messageOf(e)}. The fx bootstrap and its always-on rules are NOT loaded. Tell the user the plugin is misinstalled.`;
      }
      if (failures.length) text += `
${failures.join("\n")}
Some fx parts are missing. Tell the user the plugin is misinstalled.`;
      ev.system.push({ type: "text", text });
      const session = sessionOf(ev);
      if (session !== void 0 && queue !== void 0) {
        for (const line of queue.drain(session)) ev.system.push({ type: "text", text: line });
      }
    })));
    await attempt("agent.transform", () => ctx.agent.transform((editor) => attempt("agent transform body", () => {
      attempt("fx agents", () => {
        const { READ_ONLY_AGENTS } = require2("../lib/plant-roles.js");
        const { toOpencodeV2Agent } = require2("../lib/agent-dialects.js");
        const refs = path.join(ROOT, "references");
        const referencesDirs = [.../* @__PURE__ */ new Set([refs, fs.realpathSync(refs)])];
        for (const name of READ_ONLY_AGENTS) {
          attempt(name, () => {
            const def = toOpencodeV2Agent(fs.readFileSync(path.join(ROOT, "agents", `${name}.md`), "utf8"), { referencesDirs });
            editor.update(name, (a) => {
              if (a.system && a.system !== def.system) return;
              Object.assign(a, def);
            });
          });
        }
      });
      attempt("hide lanes", () => {
        for (const agent of editor.list()) {
          attempt(`hide lanes for ${agent.id}`, () => editor.update(agent.id, (a) => {
            for (const lane of HIDDEN) {
              if (!a.permissions.some((r) => r.action === "skill" && r.resource === lane)) a.permissions.push(hideRule(lane));
            }
            hidden.add(agent.id);
          }));
        }
      });
    })));
    await attempt("command registration (fx commands are unavailable)", async () => {
      const { opencodeCommands } = require2("../lib/opencode-commands.js");
      await ctx.command.transform((editor) => {
        for (const [name, cmd] of Object.entries(opencodeCommands(ROOT, ROOT))) {
          editor.add({
            name,
            description: cmd.description,
            execute: async (input) => {
              try {
                await ctx.session.prompt({
                  sessionID: input.sessionID,
                  text: cmd.template.split("$ARGUMENTS").join(promptText(input))
                });
              } catch (e) {
                throw new Error(`fx: /${name} was not delivered: ${messageOf(e)}`);
              }
            }
          });
        }
      });
    });
    if (evaluateError && !beforeRegistered) {
      failures.push("fx: the git guard is off: no hook could be registered, so every shell call is unguarded and only the installed policy layer stands.");
    }
  }
};
export {
  fx_opencode_v2_default as default
};
