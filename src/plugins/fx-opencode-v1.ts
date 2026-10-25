// opencode plugin, parity with Claude Code, corrected against the shipped
// opencode 1.18.25 binary (strings-read against
// ~/.opencode/bin/opencode, 2026-09-21; see the task and the
// commit message for what was measured and how).
//
// MEASURED, not assumed:
//
//   - `experimental.chat.system.transform` is invoked from TWO call sites in
//     the shipped binary, both as `trigger("experimental.chat.system.
//     transform", input, output)`: an (input, output) pair, `system` on
//     OUTPUT. One call site (Agent.generate, used for agent *authoring*, not
//     an ordinary chat turn) never sets `input.sessionID` at all. The
//     previously-shipped form here, `async ({ system }) => {...}`, destructured
//     a single argument and would have silently pushed nothing at both call
//     sites: `system` is not a property of `input`.
//   - `tool.execute.before` is likewise `(input, output)`, with the tool's
//     wire name at `input.tool` and its raw call arguments at `output.args`
//     (confirmed at the `i.trigger("tool.execute.before", {tool,...}, {args})`
//     call sites). Confirmed wire names: `bash` (arg `command`), `edit` and
//     `write` (arg `filePath`), and the local `apply_patch` tool (arg
//     `patchText`, the same V4A patch-header format Codex's apply_patch
//     carries under `command`: see hooks/fx-codex.js's own
//     `extractPatchPaths`, which this mirrors locally rather than sharing:
//     that file is Codex's, out of this task's file list, and not exported).
//   - Refusing a call is done by THROWING. There is no deny return value, and
//     `permission.ask` is declared in the public type but has zero call sites
//     in the binary, so nothing here registers a handler for it or depends
//     on it firing.
//   - `config.subagent_depth ?? 1` is the shipped default (confirmed:
//     `subagent_depth??1` appears at the enforcement site), so a plugin that
//     never raises it caps an implementer at zero nested dispatches: no
//     reviewer from an implementer. Raised here, never lowered.
//   - `config.skills.paths` and `config.permission.skill` are the real
//     fields (confirmed: `skills:t.skills&&[...t.skills.paths??[],...]` and
//     a `skill:` entry in the permission ruleset struct).
//
// MEASURED for the shell guard (sub-project 2, task 06 fix round 1, strings
// read from the same binary, read-only, 2026-10-23):
//
//   - `chat.message` fires once per `SessionPrompt.createUserMessage`, as
//     `trigger("chat.message", {sessionID, agent, model, messageID, variant},
//     {message, parts})`: the session id at `input.sessionID`.
//   - `SessionPrompt.prompt` is its only caller, and three paths reach it: a
//     user's prompt, a slash command (`SessionPrompt.command`), and the task
//     tool (`TaskTool.runTask` prompts the CHILD session, a new one or the one
//     a `task_id` resumes). So `chat.message` cannot tell the user from a
//     parent agent, and opencode 1.x honours no `# fx-ok` stamp.
//   - Two synthetic user messages are written directly and fire no
//     `chat.message`: "Summarize the task tool output above and continue
//     with your task." and "The following tool was executed by the user".
//     Compaction was not traced.
//   - `experimental.chat.system.transform` gets `{sessionID, model}` at the
//     chat call site; Agent.generate passes `{model}` alone.
//
// MEASURED for the tracker (sub-project 2, task 10, same binary, read-only,
// 2026-10-23):
//
//   - `tool.execute.after` is `trigger("tool.execute.after", {tool, sessionID,
//     callID, args}, result)`: the call's arguments are on INPUT as `args`, the
//     result is OUTPUT `{title, output, metadata}`. The output text is
//     `output.output` (a string). A bash call carries its exit status at
//     `output.metadata.exit` (a number, or null when the process was killed):
//     0 is ok, any other number fail, none unknown. Other tools carry none.
//   - Neither major can block a turn from ending, so nudges and the Stop
//     reminder are queued per session in the plugin's memory and pushed once
//     into the system text of that session's next request. The queue is lost
//     on a restart: it is advice.
//
// Subagents are covered by the SAME transform path: opencode implements them
// as child sessions (a `task` tool call that creates a session with
// `parentID` and prompts it), so `experimental.chat.system.transform` runs
// for them too. Claude Code needs two separate hook events (SessionStart,
// SubagentStart) for what this does with one.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { GuardDecision, GuardVerdict, OpencodeV1Config } from '../lib/types.js';

const require = createRequire(import.meta.url);

// No require runs at module load unguarded: a throw here fails the import,
// and a plugin that fails to import has no guard at all (final review I3).
// The guard's own require failing makes every bash call refuse; the lane
// check and the preamble degrade; everything config() needs is required
// inside config(), behind a catch that reports.
const messageOf = (e: unknown): string => String((e instanceof Error && e.message) || e);
// A module that loads but lacks the export fails exactly like one that does not load.
const fnExport = <T>(fn: T, name: string): T => {
  if (typeof fn !== 'function') throw new Error(`${name} is not a function`);
  return fn;
};

let inspect: typeof import('../lib/git-guard.js').inspect | undefined;
let guardLoadError: unknown;
try {
  const guard: typeof import('../lib/git-guard.js') = require('../lib/git-guard.js');
  inspect = fnExport(guard.inspect, 'inspect');
} catch (e) {
  guardLoadError = e;
}
// Without the parser the plugin cannot tell a bash call from any other, so
// every call is refused (see tool.execute.before).
let parseCall: typeof import('../lib/opencode-input.js').parseOpencodeV1Call | undefined;
let parseLoadError: unknown;
try {
  const input: typeof import('../lib/opencode-input.js') = require('../lib/opencode-input.js');
  parseCall = fnExport(input.parseOpencodeV1Call, 'parseOpencodeV1Call');
} catch (e) {
  parseLoadError = e;
}
// The hard shell rules fail closed like the git guard; they load apart from
// the rest of the shell guard, so a broken guard module cannot drop them.
let classifyShell: typeof import('../lib/shell-rules.js').classifyShell | undefined;
let namesFxState: typeof import('../lib/shell-rules.js').namesFxState | undefined;
let hardReason: typeof import('../lib/shell-rules.js').hardReason | undefined;
let rulesLoadError: unknown;
try {
  const rules: typeof import('../lib/shell-rules.js') = require('../lib/shell-rules.js');
  classifyShell = fnExport(rules.classifyShell, 'classifyShell');
  namesFxState = fnExport(rules.namesFxState, 'namesFxState');
  hardReason = fnExport(rules.hardReason, 'hardReason');
} catch (e) {
  rulesLoadError = e;
}
// The rest of the shell guard and the turn boundary fail
// open (design 5, Failure): a load failure leaves bash to the git guard and
// the hard rules.
let guardShell: typeof import('../lib/shell-guard.js').guardShell | undefined;
let shellGuardError: unknown;
try {
  const shell: typeof import('../lib/shell-guard.js') = require('../lib/shell-guard.js');
  guardShell = fnExport(shell.guardShell, 'guardShell');
} catch (e) {
  shellGuardError = e;
}
// The tracker and the Stop check fail open: a load failure costs the nudges and the reminder.
let parseResult: typeof import('../lib/opencode-input.js').parseOpencodeV1Result | undefined;
let recordToolResult: typeof import('../lib/loop-tracker.js').recordToolResult | undefined;
let decideStop: typeof import('../lib/stop-check.js').decideStop | undefined;
let makeQueue: typeof import('../lib/opencode-queue.js').createQueue | undefined;
let parseAgent: typeof import('../lib/opencode-input.js').parseOpencodeAgent | undefined;
let turnLoadError: unknown;
try {
  const input: typeof import('../lib/opencode-input.js') = require('../lib/opencode-input.js');
  const tracker: typeof import('../lib/loop-tracker.js') = require('../lib/loop-tracker.js');
  const stop: typeof import('../lib/stop-check.js') = require('../lib/stop-check.js');
  const q: typeof import('../lib/opencode-queue.js') = require('../lib/opencode-queue.js');
  parseResult = fnExport(input.parseOpencodeV1Result, 'parseOpencodeV1Result');
  parseAgent = fnExport(input.parseOpencodeAgent, 'parseOpencodeAgent');
  makeQueue = fnExport(q.createQueue, 'createQueue');
  recordToolResult = fnExport(tracker.recordToolResult, 'recordToolResult');
  decideStop = fnExport(stop.decideStop, 'decideStop');
} catch (e) {
  turnLoadError = e;
}
// The edit rules fail open: a load failure costs the rules, said once.
let checkEdit: typeof import('../lib/edit-rules.js').checkEdit | undefined;
let logEditRuleError: typeof import('../lib/edit-rules.js').logEditRuleError | undefined;
let editRulesError: unknown;
try {
  const rules: typeof import('../lib/edit-rules.js') = require('../lib/edit-rules.js');
  if (typeof rules.logEditRuleError === 'function') logEditRuleError = rules.logEditRuleError;
  checkEdit = fnExport(rules.checkEdit, 'checkEdit');
} catch (e) {
  editRulesError = e;
}
// The .fx.json change notice at Stop; decideStop computes it only for a blocking Stop.
let fxJsonNotice: typeof import('../lib/fx-json-watch.js').fxJsonNotice | undefined;
let fxJsonError: unknown;
try {
  const watch: typeof import('../lib/fx-json-watch.js') = require('../lib/fx-json-watch.js');
  fxJsonNotice = fnExport(watch.fxJsonNotice, 'fxJsonNotice');
} catch (e) {
  fxJsonError = e;
}
let journal: Pick<typeof import('../lib/journal.js'), 'appendEvent' | 'journalKey' | 'pruneJournals'> | undefined;
try {
  const j: typeof import('../lib/journal.js') = require('../lib/journal.js');
  journal = { appendEvent: fnExport(j.appendEvent, 'appendEvent'), journalKey: fnExport(j.journalKey, 'journalKey'), pruneJournals: fnExport(j.pruneJournals, 'pruneJournals') };
} catch (e) {
  console.error(`[fx] the session journal module failed to load (${e instanceof Error ? e.message : String(e)}), so fx cannot mark turns or remind at Stop on opencode 1.x.`);
}
let machinePaths: typeof import('../lib/fx-paths.js').machinePaths | undefined;
try {
  const paths: typeof import('../lib/fx-paths.js') = require('../lib/fx-paths.js');
  machinePaths = fnExport(paths.machinePaths, 'machinePaths');
} catch { /* a guard crash then leaves only the warning */ }

// Twin of shellGuardOff in hooks/fx-codex.js: a fail-open allow still leaves a
// decision-log line, written with builtins only, since the module that failed
// may be the logger. The command is left out: nothing here can redact it.
function shellGuardOff(e: unknown, session: string | null, cwd: string): void {
  const m = `[fx] shell guard off: ${messageOf(e)}`;
  console.error(m);
  appendDecision({ ts: new Date().toISOString(), harness: 'opencode', event: 'guard', session, cwd, text: '', source: 'guard-error', action: 'allow', unavailable: m.slice(0, 200) });
}

// An edit allowed because the rules could not run: one error line, through
// logEditRuleError when the module loaded, else with builtins only.
function editRulesOff(e: unknown, session: string | null, cwd: string): void {
  const m = messageOf(e);
  const now = Date.now();
  if (logEditRuleError) return logEditRuleError({ harness: 'opencode', sessionId: session, cwd, now }, m);
  appendDecision({ ts: new Date(now).toISOString(), harness: 'opencode', event: 'edit-rule', session, cwd, text: '', source: 'error', action: 'allow', unavailable: m.slice(0, 200) });
}

function appendDecision(entry: Record<string, unknown>): void {
  try {
    if (!machinePaths) throw new Error('no state directory');
    const dir = machinePaths().stateDir;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.appendFileSync(path.join(dir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* the caller's stderr line is the trace */ }
}

let laneCheck: typeof import('../lib/lane-check.js').laneCheck;
try {
  const lane: typeof import('../lib/lane-check.js') = require('../lib/lane-check.js');
  laneCheck = fnExport(lane.laneCheck, 'laneCheck');
} catch {
  laneCheck = () => null;            // advice only; never block because it is missing
}
let render: typeof import('../lib/preamble.js').render;
try {
  const pre: typeof import('../lib/preamble.js') = require('../lib/preamble.js');
  render = fnExport(pre.render, 'render');
} catch {
  render = () => { throw new Error('lib/preamble.js failed to load'); };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const HERE = path.dirname(fileURLToPath(import.meta.url));   // .../plugins
const ROOT = path.join(HERE, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');
const REFERENCES = path.join(ROOT, 'references');

// The lanes a person must type, never a model auto-selection: one list for
// both opencode plugins (lib/user-invoked-lanes.js, pinned to the skills'
// frontmatter by tests/gates/user-invoked.test.js).
let HIDDEN_SKILLS: string[] = [];
let hiddenLoadError: unknown;
try {
  const lanes: typeof import('../lib/user-invoked-lanes.js') = require('../lib/user-invoked-lanes.js');
  HIDDEN_SKILLS = lanes.USER_INVOKED_LANES;
} catch (e) {
  hiddenLoadError = e;
}

// apply_patch's own V4A envelope (opencode's LOCAL tool, confirmed against
// the binary: `patchText` field, `Vo.parsePatch`, same header vocabulary as
// Codex's). Mirrors hooks/fx-codex.js's `extractPatchPaths` exactly; kept
// local rather than required from that file, which is Codex's and not in
// this task's file list.
function extractPatchPaths(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  const paths: string[] = [];
  for (const line of text.split('\n')) {
    // `Move to:` cannot see live traffic today: the shipped binary refuses
    // any apply_patch containing a move outright ("apply_patch moves are
    // not supported yet"). Parsed anyway, for parity with Codex's identical
    // header vocabulary and in case that restriction lifts; harmless to
    // keep, and not something a test here can ever exercise against a real
    // opencode call.
    const m = line.match(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/)
      || line.match(/^\*\*\* Move to: (.+)$/);
    if (m?.[1]) paths.push(m[1].trim());
  }
  return paths;
}

// Everything config() does, with its requires inside it: a missing module
// or a missing references directory throws here, where config() catches and
// reports it, and never at module load, where it would take the guard down.
function applyConfig(config: OpencodeV1Config): void {
  // Hide the eight user-invoked lanes from the model via permission.skill
  // deny. The last matching rule wins, so the broad allow goes first,
  // and only once, so a repeat config() call does not reorder it behind
  // whatever else has since been added. First, before any require or file
  // read below can throw: a config step that fails partway must still leave
  // these lanes hidden (security re-review Minor 8).
  // A bare action string is the user's rule for everything under it, the
  // same rewrite opencode itself makes (`"ask"` becomes `{"*": "ask"}`), so
  // it is kept as the "*" rule rather than thrown on (security re-check
  // Minor 5). A skill block with no "*" of its own inherits the block's.
  // A truthy value that is not an object stays in the config and throws on the
  // first write into it, as it always has: the config step reports it.
  const asRules = (v: unknown): unknown => (typeof v === 'string' ? { '*': v } : (v || {}));
  const permission = asRules(config.permission);
  config.permission = permission;
  if (!isObj(permission)) throw new TypeError('config.permission is not an object');
  const skillRules = asRules(permission.skill);
  permission.skill = skillRules;
  if (!isObj(skillRules)) throw new TypeError('config.permission.skill is not an object');
  if (!('*' in skillRules)) skillRules['*'] = permission['*'] || 'allow';
  if (hiddenLoadError) throw hiddenLoadError;   // reported by the config step's catch: the lanes cannot be hidden
  for (const name of HIDDEN_SKILLS) skillRules[name] = 'deny';

  const { READ_ONLY_AGENTS }: typeof import('../lib/plant-roles.js') = require('../lib/plant-roles.js');
  const { toOpencodeAgent }: typeof import('../lib/agent-dialects.js') = require('../lib/agent-dialects.js');
  const { opencodeCommands }: typeof import('../lib/opencode-commands.js') = require('../lib/opencode-commands.js');
  // Both paths a read-only agent may be handed for a reference: through the
  // path this plugin was loaded from, and the checkout it resolves to.
  const REFERENCES_DIRS = [...new Set([REFERENCES, fs.realpathSync(REFERENCES)])];

  // Skills: append idempotently. The config hook may run more than
  // once; appending the same path twice registers every skill twice,
  // and opencode keeps the first and logs the rest as duplicates.
  const skills = config.skills || (config.skills = {});
  const skillPaths = skills.paths || (skills.paths = []);
  if (!skillPaths.includes(SKILLS_DIR)) {
    skillPaths.push(SKILLS_DIR);
  }

  // Agents: every read-only role, from the same set Codex's roles are
  // derived from (lib/plant-roles.js): never a `fx-lens-` prefix match,
  // which would leave fx-devils-advocate writable here while it is
  // read-only on Claude Code and Codex.
  const agents = config.agent || (config.agent = {});
  for (const name of READ_ONLY_AGENTS) {
    if (agents[name]) continue;   // idempotent across repeat config() calls
    const mdText = fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), 'utf8');
    agents[name] = toOpencodeAgent(mdText, { referencesDirs: REFERENCES_DIRS });
  }

  // Nested dispatch (amendment A6): opencode gives a subagent the task
  // tool only when its own permission block has a rule keyed exactly
  // `task`; `"*": "allow"` does not count (subagent-permissions.ts,
  // canTask). `general` is the built-in subagent's key: opencode 1.18.31
  // packages/opencode/src/agent/agent.ts:182-195, and `opencode agent
  // list` on 1.18.25 prints `general (subagent)`. opencode merges this
  // block over the native agent. Merge only when `task` and `*` are both
  // absent, so a user's own value and a repeat config() call are both
  // left alone. A user's `*` key is their answer for task too: 1.18.25
  // rewrites `permission: "ask"` to `{"*": "ask"}` before this hook, and
  // a task rule added after it would win. A bare action string is the
  // user's too.
  const general = agents.general || (agents.general = {});
  if (!isObj(general)) throw new TypeError('config.agent.general is not an object');
  const generalPermission = general.permission || (general.permission = {});
  if (isObj(generalPermission) && !('task' in generalPermission)
      && !('*' in generalPermission)) {
    generalPermission.task = 'allow';
  }

  // Depth: `subagent_depth` defaults to 1, which stops an implementer
  // dispatching a reviewer. Raise it, but never lower a value already
  // set higher than what fx needs.
  config.subagent_depth = Math.max(config.subagent_depth || 1, 2);

  // Commands: a hidden lane is typeable only as a command, and with no
  // installer run nothing else registers one (task 23, PD2). The text is
  // the installer's, from the one generator both call, with fx's
  // references cited under the checkout this plugin was loaded from.
  // A command already present (an installer's file, or the user's own)
  // is left alone, so neither route registers it twice.
  const commands = config.command || (config.command = {});
  for (const [name, cmd] of Object.entries(opencodeCommands(ROOT, ROOT))) {
    if (!commands[name]) commands[name] = cmd;
  }
}

export const fx = async ({ directory }: { directory?: string } = {}) => {
  const cwd = directory || process.cwd();
  // opencode has no SessionStart hook, so construction is where journals older than seven days go (design decision 3).
  journal?.pruneJournals(Date.now());

  // After the git guard allows. A throw refuses the call: opencode 1.x has no ask.
  async function shellGuard(command: string, sessionId: string | null): Promise<void> {
    if (!classifyShell) {
      throw new Error(`[fx] shell rules failed to load (${messageOf(rulesLoadError)}). Denying every shell command until the plugin is repaired.`);
    }
    // Which shell runs a bash call on Windows is unsourced (references/harnesses/opencode.md):
    // posix false checks the bash and the PowerShell readings, and either hard rule refuses.
    const posix = process.platform !== 'win32';
    // A hard rule stands whatever the rest of the guard does. Fail CLOSED here, like the git guard.
    let hardDeny: string | null;
    try {
      const hard = classifyShell(command, posix);
      hardDeny = hard.kind === 'hard-deny' ? hard.reason : null;
    } catch (e) {
      throw new Error(`[fx] shell rules failed to evaluate this command (${messageOf(e)}). Denying rather than assuming it is safe.`);
    }
    let d: GuardDecision;
    try {
      if (!guardShell) throw shellGuardError;
      d = await guardShell({ command, cwd, harness: 'opencode', sessionId, now: Date.now(), posix });
    } catch (e) {
      if (hardDeny !== null) throw new Error(hardDeny);
      shellGuardOff(e, sessionId, cwd);
      return;
    }
    if (hardDeny !== null) throw new Error(hardDeny);
    if (d.action === 'deny') throw new Error(`${d.reason}`);
    // The texts carry no stamp advice on opencode (shell-guard.ts, references/harnesses/opencode.md).
    if (d.action === 'ask') throw new Error(`${d.reason}`);
    if (d.action === 'warn') console.error(d.reason);
  }

  // Computed once, at plugin construction, mirroring the previously-shipped
  // form: one session's worth of context does not change mid-session.
  // `render` does the whole assembly: rendered PREAMBLE.md, the repo.md
  // note, the plan-state block: in one place (docs/adr/0020); this file
  // never reassembles any of it.
  let preamble: string;
  try {
    preamble = render({ harness: 'opencode', cwd });
  } catch {
    preamble = '[fx] PREAMBLE.md could not be read. The fx bootstrap and its always-on '
             + 'rules are NOT loaded. Do not commit, and tell the '
             + 'user the plugin is misinstalled.';
  }

  let configError: unknown = null;

  // Each fail-open gap is said once per plugin instance (lens SF I1).
  const warned = new Set<string>();
  const warnOnce = (line: string): void => {
    if (warned.has(line)) return;
    warned.add(line);
    console.error(line);
  };
  let guardOffShown = false;
  const sessionOf = (input: unknown): string | undefined => {
    const ev = parseCall?.(input, undefined);
    return ev?.ok ? ev.value.sessionID : undefined;
  };

  // Nudges and reminders by session id, pushed once by the next transform for that session.
  // Bounded, with a decision-log line per push and per drop (lib/opencode-queue.ts).
  const queue = makeQueue?.('opencode', cwd);

  // .fx.json as each session's last Stop saw it.
  // shortcut: kept in memory, not the journal, so a restart loses the baseline like the queue; move it to the journal if the notice must survive one.
  const fxJsonSeen = new Map<string, string>();

  // The turn boundary: the Stop check for the turn that just ended, then the journal mark.
  const markTurn = async (j: NonNullable<typeof journal>, session: string | undefined, input: unknown): Promise<void> => {
    const key = j.journalKey(session);
    if (key === null) {
      warnOnce('[fx] chat.message carried no session id, so fx did not mark this turn in the session journal.');
      return;
    }
    try {
      if (!decideStop || !queue) throw turnLoadError;
      if (session === undefined) throw new Error('the chat.message event carried no session id');
      queue.startTurn(session);
      const { text } = await decideStop({ harness: 'opencode', sessionId: session, agentId: null, cwd, stopHookActive: false, mode: 'reminder' });
      if (text !== null) queue.enqueue(session, text);
      const notice = fxJsonNotice?.(session, cwd, Date.now(), 'opencode', fxJsonSeen) ?? null;
      if (notice !== null) {
        queue.enqueue(session, notice);
        // The queue reaches only the model, which may be the agent that made the change; stderr reaches the user.
        console.error(notice);
      }
    } catch (e) {
      warnOnce(`[fx] the Stop reminder is off: ${messageOf(e)}`);
    }
    if (!fxJsonNotice) warnOnce(`[fx] the .fx.json change notice is off: ${messageOf(fxJsonError)}`);
    // The agent name lets the tracker exempt a read-only review agent's child session (design 8). Whether
    // a prompt came from a child session is not in this input, so agentId stays null on 1.x.
    if (!j.appendEvent(key, { t: Date.now(), kind: 'prompt', text: null, agentType: parseAgent?.(input) ?? null })) {
      warnOnce('[fx] the session journal could not be written, so fx did not mark this turn.');
    }
  };

  return {
    config: async (config: OpencodeV1Config) => {
      try {
        applyConfig(config);
      } catch (e) {
        // Reported, never thrown: a throw here would stop opencode loading
        // the plugin, guard included.
        configError = e;
        console.error(`[fx] the plugin's config step failed (${messageOf(e)}); fx's skills, review agents or commands may be missing. The git guard still runs.`);
      }
    },

    'experimental.chat.system.transform': async (input: unknown, output: { system: string[] }) => {
      output.system.push(preamble);
      if (configError) {
        output.system.push(`[fx] The fx plugin failed to configure (${messageOf(configError)}). `
          + 'Its review agents may be missing. Tell the user the plugin is misinstalled.');
      }
      if (shellGuardError !== undefined && !guardOffShown) {
        guardOffShown = true;
        output.system.push(`[fx] shell guard off: ${messageOf(shellGuardError)}`);
      }
      // `input.sessionID` is undefined at the agent-generation call site by design (measured).
      const session = sessionOf(input);
      // After the preamble. No session id (Agent.generate): the queue stays.
      if (session !== undefined && queue !== undefined) output.system.push(...queue.drain(session));
    },

    // Records the call and queues the tracker's line, if any. Fail open.
    'tool.execute.after': async (input: unknown, output: unknown) => {
      try {
        if (!parseResult || !recordToolResult) throw turnLoadError;
        const r = parseResult(input, output);
        if (r.sessionID === undefined || r.tool === undefined) {
          warnOnce('[fx] a tool.execute.after event carried no session id or tool name, so fx did not record it (the event shape may have changed).');
          return;
        }
        const command = typeof r.args.command === 'string' ? r.args.command : null;
        const line = recordToolResult({
          harness: 'opencode', sessionId: r.sessionID, agentId: null, cwd, toolName: r.tool,
          toolInput: r.args, command, outcome: r.outcome, output: r.output, interrupted: r.interrupted,
        });
        if (line !== null) queue?.enqueue(r.sessionID, line);
      } catch (e) {
        warnOnce(`[fx] the loop tracker is off: ${messageOf(e)}`);
      }
    },

    // A new user message marks a turn boundary. Its text is never recorded:
    // fx cannot tell the user's prompt from a parent agent's prompt to a child session (design 6).
    'chat.message': async (input: unknown) => {
      const session = sessionOf(input);
      if (journal) await markTurn(journal, session, input);
    },

    'tool.execute.before': async (input: unknown, output: unknown) => {
      if (!parseCall) {
        throw new Error(`[fx] opencode input parser failed to load (${messageOf(parseLoadError)}). Denying every tool call until the plugin is repaired.`);
      }
      const event = parseCall(input, output);
      if (!event.ok) return;
      const { tool, args } = event.value;

      if (tool === 'bash') {
        const command = args.command;
        if (!command) return;
        if (!inspect) {
          throw new Error(`[fx] git guard failed to load (${messageOf(guardLoadError)}). Denying every command until the plugin is repaired.`);
        }
        let verdict: GuardVerdict;
        try {
          verdict = inspect(command, cwd);
        } catch (e) {
          // Fail CLOSED: a broken guard must refuse, not assume safety.
          verdict = { allow: false, reason: `git guard failed to evaluate this command (${messageOf(e)}). Denying rather than assuming it is safe.` };
        }
        // Throwing is how this API refuses a tool call; there is no deny
        // return value.
        if (!verdict.allow) throw new Error(`[fx] ${verdict.reason}`);
        // The shell guard reads only a string; Codex refuses the same shape (lens SEC I2).
        if (typeof command !== 'string') {
          throw new Error(`[fx] the shell command is not a string (${typeof command}), so the guards cannot read it. Denying rather than assuming it is safe.`);
        }
        await shellGuard(command, event.value.sessionID ?? null);
        return;
      }

      // Write paths. `edit` and `write` share `filePath`; the local
      // `apply_patch` carries a multi-file patch under `patchText`. All
      // three collapse onto opencode's own `edit` permission key, and which
      // one is live depends on the model (apply_patch replaces edit/write on
      // GPT-family models).
      let filePaths: string[];
      if (tool === 'edit' || tool === 'write') {
        filePaths = typeof args.filePath === 'string' && args.filePath ? [args.filePath] : [];
      } else if (tool === 'apply_patch') {
        filePaths = extractPatchPaths(args.patchText).map((p) => path.resolve(cwd, p));
      } else {
        return;
      }

      // fx's own state and config steer the shell guard; fail CLOSED like Claude Code and Codex (final review I3).
      if (!namesFxState || !hardReason) {
        throw new Error(`[fx] shell rules failed to load (${messageOf(rulesLoadError)}). Denying every file write until the plugin is repaired.`);
      }
      for (const filePath of filePaths) {
        if (namesFxState(path.resolve(cwd, filePath))) throw new Error(hardReason('fx-state'));
      }
      for (const filePath of filePaths) {
        // Fail OPEN: the lane check is advice, so a broken one must not
        // wedge a write.
        let reason: string | null = null;
        try {
          reason = laneCheck(filePath, cwd);
        } catch {
          reason = null;
        }
        if (reason) throw new Error(`[fx] ${reason}`);
      }

      // The edit rules: a refusal throws like the guards; checkEdit never rejects.
      const sessionId = event.value.sessionID ?? null;
      if (!checkEdit) {
        warnOnce(`[fx] edit rules off: ${messageOf(editRulesError)}`);
        editRulesOff(editRulesError, sessionId, cwd);
        return;
      }
      const d = await checkEdit({ harness: 'opencode', sessionId, cwd, toolName: tool, toolInput: args, now: Date.now() });
      if (d.action === 'refuse' && d.reason !== null) throw new Error(d.reason);
    },
  };
};
