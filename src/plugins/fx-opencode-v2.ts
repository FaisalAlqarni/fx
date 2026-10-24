// fx plugin for OpenCode 2.x, written against the 2.0.18 source and
// docs/plans/2026-10-01-opencode-v2/probe-findings.md:
//   - Q1: a default export `{ id, setup }` loads; nothing else is exported.
//   - Q2: a `session.hook('context')` text part reaches sessions and subagents.
//   - Q6: `agent.transform` editor.update() creates a missing id from
//     Info.default and replaces (not merges) the permissions it is given.
//   - Q7: the model's skill list is filtered only by static skill rules, so
//     the hidden lanes are denied per agent here; skill.list stays unfiltered.
//   - Q8: a plugin command's execute gets { sessionID, prompt: { text } };
//     ctx.session.prompt({ sessionID, text }) delivers in the same session.
//   - Q11 (disproven): an agent defined in opencode.json is applied after
//     plugin transforms and misses the deny rules; only the evaluate hook
//     below stands in front of it (it rejects a call, it hides nothing).
//   - Q3 (proven): `tool.execute.before` runs before the shell permission
//     check and `ev.source.id` equals the tool hook's `ev.id`, so the guard
//     reads the full command text recorded there; `ev.resources` for shell is
//     only the parsed pieces and never holds a heredoc body.
//   - Shell guard: `evaluate` runs the git guard, then the hard rules and the
//     read-only allowlist on the command text recorded in `execute.before`.
//   - NOT MEASURED: `session.hook('prompt')` and `session.hook('context')`
//     are read with the session id at `ev.sessionID`, the field every other
//     2.x event carries. A different shape costs the turn boundary or the
//     queued lines, never a refusal.
//   - Tracker (task 10): `execute.after` carries `status` ("completed", or
//     "error" for a failed or refused call: measured, probe Q3) and the ids
//     the `before` event carried. NOT MEASURED: whether it also carries the
//     tool's `input`, the output text or an exit status. It is read from
//     `input`, `output`, `metadata.exit` and `exit` when present; a shell
//     command missing from the event is taken from the text recorded in
//     `execute.before`. A status other than "error" without an exit status is
//     outcome unknown, which never counts as a pass.
//   - A completed shell call with no exit status and no output is a call fx
//     could not see into. It is said once on stderr, and the Stop reminder is
//     skipped for that turn: the reminder must not claim no check passed when
//     fx simply could not read the result.
//   - Subagents: nothing in the 2.x events measured here tells a child session
//     from a root one, so agentId stays null. The prompt event's agent name is
//     recorded when it carries `agent` (the 2.1.4 event does not), which would let the tracker
//     exempt a read-only review agent (design 8); without it that exemption
//     does not apply on 2.x.
//   - Neither major can block a turn from ending: nudges and the Stop
//     reminder are queued per session in the plugin's memory and pushed once
//     by the `context` hook. A restart loses the queue: it is advice.
// A rejected Promise in a v2 hook is a defect, so every body catches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { GuardDecision, OpencodePermissionEvent, OpencodeV2Ctx } from '../lib/types.js';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Nothing is required unguarded at load: a failed import loses the plugin.
let render: typeof import('../lib/preamble.js').render | undefined;
let loadError: unknown;
try {
  const pre: typeof import('../lib/preamble.js') = require('../lib/preamble.js');
  if (typeof pre.render !== 'function') throw new Error('render is not a function');
  render = pre.render;
} catch (e) {
  loadError = e;
}

let inspect: typeof import('../lib/git-guard.js').inspect | undefined;
let guardError: unknown;
try {
  const guard: typeof import('../lib/git-guard.js') = require('../lib/git-guard.js');
  if (typeof guard.inspect !== 'function') throw new Error('inspect is not a function');
  inspect = guard.inspect;
} catch (e) {
  guardError = e;
}

// Without the parser no tool event can be read: execute.before then refuses
// every tool call, and execute.after cannot forget what was recorded.
let parseEvent: typeof import('../lib/opencode-input.js').parseOpencodeToolEvent | undefined;
let parseError: unknown;
try {
  const input: typeof import('../lib/opencode-input.js') = require('../lib/opencode-input.js');
  if (typeof input.parseOpencodeToolEvent !== 'function') throw new Error('parseOpencodeToolEvent is not a function');
  parseEvent = input.parseOpencodeToolEvent;
} catch (e) {
  parseError = e;
}

// The hard shell rules fail closed like the git guard; they load apart from
// the rest of the shell guard, so a broken guard module cannot drop them.
let classifyShell: typeof import('../lib/shell-rules.js').classifyShell | undefined;
let namesFxState: typeof import('../lib/shell-rules.js').namesFxState | undefined;
let hardReason: typeof import('../lib/shell-rules.js').hardReason | undefined;
let rulesError: unknown;
try {
  const rules: typeof import('../lib/shell-rules.js') = require('../lib/shell-rules.js');
  if (typeof rules.classifyShell !== 'function') throw new Error('classifyShell is not a function');
  classifyShell = rules.classifyShell;
  if (typeof rules.namesFxState !== 'function' || typeof rules.hardReason !== 'function') throw new Error('shell-rules is missing an export');
  ({ namesFxState, hardReason } = rules);
} catch (e) {
  rulesError = e;
}
// The rest of the shell guard and the turn boundary fail
// open (design 5, Failure): a load failure leaves shell to the git guard and
// the hard rules.
let guardShellCodeOnly: typeof import('../lib/shell-guard.js').guardShellCodeOnly | undefined;
let shellGuardError: unknown;
try {
  const shell: typeof import('../lib/shell-guard.js') = require('../lib/shell-guard.js');
  if (typeof shell.guardShellCodeOnly !== 'function') throw new Error('guardShellCodeOnly is not a function');
  guardShellCodeOnly = shell.guardShellCodeOnly;
} catch (e) {
  shellGuardError = e;
}
// The edit rules fail open: a load failure costs the rules, said once.
let checkBuiltins: typeof import('../lib/edit-rules.js').checkBuiltins | undefined;
let logEditRuleError: typeof import('../lib/edit-rules.js').logEditRuleError | undefined;
let editRulesError: unknown;
try {
  const rules: typeof import('../lib/edit-rules.js') = require('../lib/edit-rules.js');
  if (typeof rules.logEditRuleError === 'function') logEditRuleError = rules.logEditRuleError;
  if (typeof rules.checkBuiltins !== 'function') throw new Error('checkBuiltins is not a function');
  ({ checkBuiltins } = rules);
} catch (e) {
  editRulesError = e;
}
// The 2.1.4 tools that write a file (references/harnesses/opencode-v2.md "Tool vocabulary").
const EDIT_TOOLS = ['edit', 'write', 'patch'];
// The tracker and the Stop check fail open: a load failure costs the nudges and the reminder.
let parseResult: typeof import('../lib/opencode-input.js').parseOpencodeV2Result | undefined;
let recordToolResult: typeof import('../lib/loop-tracker.js').recordToolResult | undefined;
let decideStop: typeof import('../lib/stop-check.js').decideStop | undefined;
let makeQueue: typeof import('../lib/opencode-queue.js').createQueue | undefined;
let parseAgent: typeof import('../lib/opencode-input.js').parseOpencodeAgent | undefined;
let turnError: unknown;
try {
  const input: typeof import('../lib/opencode-input.js') = require('../lib/opencode-input.js');
  const tracker: typeof import('../lib/loop-tracker.js') = require('../lib/loop-tracker.js');
  const stop: typeof import('../lib/stop-check.js') = require('../lib/stop-check.js');
  const q: typeof import('../lib/opencode-queue.js') = require('../lib/opencode-queue.js');
  if (typeof q.createQueue !== 'function' || typeof input.parseOpencodeAgent !== 'function') throw new Error('a turn module is missing an export');
  makeQueue = q.createQueue;
  parseAgent = input.parseOpencodeAgent;
  if (typeof input.parseOpencodeV2Result !== 'function' || typeof tracker.recordToolResult !== 'function' || typeof stop.decideStop !== 'function') {
    throw new Error('a turn module is missing an export');
  }
  parseResult = input.parseOpencodeV2Result;
  recordToolResult = tracker.recordToolResult;
  decideStop = stop.decideStop;
} catch (e) {
  turnError = e;
}
let journal: typeof import('../lib/journal.js') | undefined;
try {
  journal = require('../lib/journal.js');
} catch { /* no turn boundary */ }
let machinePaths: typeof import('../lib/fx-paths.js').machinePaths | undefined;
try {
  const paths: typeof import('../lib/fx-paths.js') = require('../lib/fx-paths.js');
  if (typeof paths.machinePaths === 'function') machinePaths = paths.machinePaths;
} catch { /* a guard crash then leaves only the warning */ }

// Twin of shellGuardOff in plugins/fx-opencode-v1.js: a fail-open allow still
// leaves a decision-log line, written with builtins only, since the module that
// failed may be the logger. The command is left out: nothing here can redact it.
function shellGuardOff(e: unknown, session: string | null, cwd: string): void {
  const m = `[fx] shell guard off: ${messageOf(e)}`;
  console.error(m);
  // The class name tells a code bug from a bad input; the message alone does not.
  writeGuardLine('guard-error', m, e instanceof Error ? e.name : typeof e, session, cwd);
}

function writeGuardLine(source: string, unavailable: string, error: string, session: string | null, cwd: string): void {
  appendDecision({ ts: new Date().toISOString(), harness: 'opencode-v2', event: 'guard', session, cwd, text: '', source, action: 'allow', unavailable: unavailable.slice(0, 200), error });
}

// An edit allowed because the rules could not run or their result could not be
// applied: one error line, through logEditRuleError when the module
// loaded, else with builtins only.
function editRulesOff(message: string, session: string | null, cwd: string): void {
  const now = Date.now();
  if (logEditRuleError) return logEditRuleError({ harness: 'opencode-v2', sessionId: session, cwd, now }, message);
  appendDecision({ ts: new Date(now).toISOString(), harness: 'opencode-v2', event: 'edit-rule', session, cwd, text: '', source: 'error', action: 'allow', unavailable: message.slice(0, 200) });
}

function appendDecision(entry: Record<string, unknown>): void {
  try {
    if (!machinePaths) throw new Error('no state directory');
    const dir = machinePaths().stateDir;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.appendFileSync(path.join(dir, 'decisions.jsonl'), `${JSON.stringify(entry)}\n`, { mode: 0o600 });
  } catch { /* the caller's stderr line is the trace */ }
}

// After the git guard allows: the hard rules and the read-only allowlist.
// A hard deny sets deny; a grey command is allowed and logged.
function shellGuard(ev: OpencodePermissionEvent, command: string, cwd: string): void {
  const refuse = (message: string) => { ev.effect = 'deny'; ev.message = message; };
  if (!classifyShell) return refuse(`[fx] shell rules failed to load (${messageOf(rulesError)}). Denying every shell command until the plugin is repaired.`);
  // Which shell runs a shell call on Windows is unsourced (references/harnesses/opencode-v2.md):
  // posix false checks the bash and the PowerShell readings, and either hard rule refuses.
  const posix = process.platform !== 'win32';
  let hardDeny: string | null;
  try {
    const hard = classifyShell(command, posix);
    hardDeny = hard.kind === 'hard-deny' ? hard.reason : null;
  } catch (e) {
    return refuse(`[fx] shell rules failed to evaluate this command (${messageOf(e)}). Denying rather than assuming it is safe.`);
  }
  const sessionId = typeof ev.sessionID === 'string' ? ev.sessionID : null;
  let d: GuardDecision | undefined;
  try {
    if (!guardShellCodeOnly) throw shellGuardError;
    d = guardShellCodeOnly({ command, cwd, harness: 'opencode-v2', sessionId, posix });
  } catch (e) {
    if (hardDeny === null) shellGuardOff(e, sessionId, cwd);
  }
  const reason = hardDeny ?? (d?.action === 'deny' ? d.reason : null);
  if (reason !== null) return refuse(reason);
}

// Full shell command text by tool call id: recorded in execute.before,
// read in evaluate, dropped in execute.after.
const commands = new Map<string, string>();
// Scoped by session, message and call id: a provider can repeat a call id
// across sessions. Any missing part gives no key, and no key is a miss.
const callKey = (sessionID: unknown, messageID: unknown, id: unknown): string | undefined => {
  const parts = [sessionID, messageID, id];
  return parts.every((p) => typeof p === 'string' && p) ? parts.join('\u0000') : undefined;
};

// One list for both opencode plugins (lib/user-invoked-lanes.js).
let HIDDEN: string[] = [];
let hiddenError: unknown;
try {
  const lanes: typeof import('../lib/user-invoked-lanes.js') = require('../lib/user-invoked-lanes.js');
  if (!Array.isArray(lanes.USER_INVOKED_LANES)) throw new Error('USER_INVOKED_LANES is not a list');
  HIDDEN = lanes.USER_INVOKED_LANES;
} catch (e) {
  hiddenError = e;
}
const hideRule = (lane: string) => ({ action: 'skill', resource: lane, effect: 'deny' });
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : v ? [v] : []);
const promptText = (input: { prompt?: { text?: string } }): string => (input.prompt && input.prompt.text) || '';
// What `for (const r of ev.resources || [])` accepted: a falsy value is empty,
// a string yields its characters, anything not iterable throws.
const isIterable = (v: unknown): v is Iterable<unknown> =>
  typeof v === 'string' || (typeof v === 'object' && v !== null && Symbol.iterator in v);
const iterate = (v: unknown): Iterable<unknown> => {
  if (!v) return [];
  if (isIterable(v)) return v;
  throw new TypeError('ev.resources is not iterable');
};
const isThenable = (r: unknown): r is PromiseLike<unknown> =>
  (typeof r === 'object' || typeof r === 'function') && r !== null && 'then' in r && typeof r.then === 'function';
const messageOf = (e: unknown): string => String((e instanceof Error && e.message) || e);
// The session id an event carries, through the same parser as the tool events.
const sessionOf = (ev: unknown): string | undefined => {
  const parsed = parseEvent?.(ev);
  return parsed?.ok ? parsed.value.sessionID : undefined;
};

// The four-line read-only set: the actions an fx review agent may use. A
// session's own rules are merged after the agent's and can widen them
// (core/src/permission.ts:162), so the evaluate hook re-imposes this.
const READ_ACTIONS = ['read', 'grep', 'glob', 'list'];
let READ_ONLY: string[] = [];
try {
  const roles: typeof import('../lib/plant-roles.js') = require('../lib/plant-roles.js');
  if (!Array.isArray(roles.READ_ONLY_AGENTS)) throw new Error('READ_ONLY_AGENTS is not a list');
  READ_ONLY = roles.READ_ONLY_AGENTS;
} catch { /* the agent step reports the same failure */ }

// True only for an external_directory request whose every resource, resolved
// (so `references/../x` is not one), lies under fx's references directory.
function readsOnlyReferences(ev: OpencodePermissionEvent): boolean {
  if (ev.action !== 'external_directory') return false;
  const resources: unknown = ev.resources;
  if (!Array.isArray(resources) || resources.length === 0) return false;
  const refs = path.join(ROOT, 'references');
  const dirs = [refs, fs.realpathSync(refs)];
  return resources.every((r: unknown) => { const p = path.resolve(String(r)); return dirs.some((d) => p.startsWith(`${d}/`)); });
}

export default {
  id: 'fx',
  async setup(ctx: OpencodeV2Ctx) {
    // Every failed step lands here and is shown in the session: in the
    // preamble, and in the message of any denial the evaluate hook makes.
    const failures: string[] = [];
    const attempt = (what: string, fn: () => unknown): unknown => {
      const report = (e: unknown) => {
        failures.push(`fx: ${what} failed: ${messageOf(e)}`);
        console.error(`[fx] ${what} failed: ${messageOf(e)}`);
      };
      try {
        const r = fn();
        return isThenable(r) ? Promise.resolve(r).catch(report) : r;
      } catch (e) { report(e); }
    };
    if (shellGuardError !== undefined) failures.push(`fx: shell guard off: ${messageOf(shellGuardError)}`);
    // opencode has no SessionStart hook, so construction is where journals older than seven days go (design decision 3).
    attempt('pruning old session journals', () => journal?.pruneJournals(Date.now()));
    if (hiddenError) { failures.push(`fx: the hidden-lane list failed to load: ${messageOf(hiddenError)}`); console.error(`[fx] the hidden-lane list failed to load: ${messageOf(hiddenError)}`); }
    // Agents the hide-lanes step finished. Their incoming skill allow can only be
    // the user's rule (it beat fx's deny); for any other agent it is the runtime
    // default. A missing record must never read as permission, so it denies.
    const hidden = new Set<unknown>();
    const notice = () => (failures.length ? ` [${failures.join('; ')}]` : '');
    const deny = (ev: OpencodePermissionEvent, message: string) => { ev.effect = 'deny'; ev.message = `[fx] ${message}${notice()}`; };

    // Registered first: nothing before the git guard waits on the runtime.
    // The guard lives in this hook. If it never registers, execute.before below
    // refuses every shell call instead (a throw there refuses cleanly, probe Q4).
    let evaluateError: unknown;
    await attempt('permission.evaluate', async () => {
      try {
        await ctx.permission.hook('evaluate', (ev) => {
          // fx's read-only agents: anything but a read, or a read of fx's own
          // references, is denied whatever the session's rules said. Fails closed
          // like the shell guard: not inside attempt(), any throw denies.
          if (READ_ONLY.some((n) => n === ev.agent) && !READ_ACTIONS.some((a) => a === ev.action)) {
            try {
              if (!readsOnlyReferences(ev)) return deny(ev, `${ev.agent} is read-only: ${ev.action} is refused.`);
            } catch (e) {
              return deny(ev, `${ev.agent} is read-only and its check failed, so ${ev.action} is refused: ${messageOf(e)}`);
            }
          }
          if (ev.action === 'shell') {
            // The git guard fails closed: any error below denies the call.
            let allowed: string | undefined;
            try {
              if (guardError || !inspect) throw guardError;
              const key = ev.source ? callKey(ev.sessionID, ev.source.messageID, ev.source.id) : undefined;
              const command = key === undefined ? undefined : commands.get(key);
              if (command === undefined) {
                deny(ev, "fx could not see this command's full text, so the git guard cannot check it.");
                return;
              }
              const verdict = inspect(command, ctx.location.directory);
              if (!verdict.allow) return deny(ev, verdict.reason);
              // The pieces as they stand now, after any other plugin's rewrite.
              for (const piece of list(ev.resources)) {
                const v = inspect(String(piece), ctx.location.directory);
                if (!v.allow) return deny(ev, v.reason);
              }
              allowed = command;
            } catch (e) {
              deny(ev, `the fx git guard failed, so the command is refused: ${messageOf(e)}`);
            }
            if (allowed !== undefined) shellGuard(ev, allowed, ctx.location.directory);
            return;
          }
          // fx's own state and config steer the shell guard; fail CLOSED like Claude Code and Codex (final review I3).
          if (ev.action === 'edit') {
            const refuse = (message: string) => { ev.effect = 'deny'; ev.message = message; };
            if (!namesFxState || !hardReason) return refuse(`[fx] shell rules failed to load (${messageOf(rulesError)}). Denying every file write until the plugin is repaired.`);
            try {
              for (const r of iterate(ev.resources)) {
                if (typeof r === 'string' && namesFxState(path.resolve(ctx.location.directory, r))) return refuse(hardReason('fx-state'));
              }
            } catch { /* resources that are not a list name no path; the lane check below reports them, as Claude Code skips a non-string path */ }
          }
          try {
            if (ev.action === 'edit') {
              // Advice only: a failed load or a throw leaves the edit alone.
              const { laneCheck }: typeof import('../lib/lane-check.js') = require('../lib/lane-check.js');
              for (const r of iterate(ev.resources)) {
                if (typeof r !== 'string') throw new TypeError('an edit resource is not a string');
                const reason = laneCheck(path.resolve(ctx.location.directory, r), ctx.location.directory);
                if (reason) {
                  ev.effect = 'deny';
                  ev.message = `[fx] ${reason}`;
                  return;
                }
              }
              return;
            }
            if (ev.action !== 'skill') return;
            // A resources value that is not a list is a malformed request: the catch below denies a hidden lane.
            if (ev.resources && !Array.isArray(ev.resources)) throw new TypeError('ev.resources is not a list');
            const lane = HIDDEN.find((l) => list(ev.resources).some((r) => r === l));
            if (!lane) return;
            if (ev.effect === 'allow' && hidden.has(ev.agent)) return;
            deny(ev, `${lane} is typed by the user, not picked by the model: ask them to run /${lane}.`);
          } catch (e) {
            failures.push(`fx: evaluate failed: ${messageOf(e)}`);
            console.error(`[fx] evaluate failed: ${messageOf(e)}`);
            // Fail closed for the hidden lanes; an edit is advice and stays open.
            const lane = ev.action === 'skill' && HIDDEN.find((l) => list(ev.resources).some((r) => r === l));
            if (lane) deny(ev, `${lane} is typed by the user: ask them to run /${lane}.`);
          }
        });
      } catch (e) { evaluateError = e; throw e; }
    });

    // Declared before execute.before registers: a call during setup uses both.
    // Nudges and reminders by session id, pushed once by the next context call for that session.
    // Bounded, with a decision-log line per push and per drop (lib/opencode-queue.ts).
    const queue = makeQueue?.('opencode-v2', ctx.location.directory);
    // Each fail-open gap is said once per plugin instance (lens SF I1).
    const warned = new Set<string>();
    const warnOnce = (line: string): void => {
      if (warned.has(line)) return;
      warned.add(line);
      console.error(line);
    };
    // The built-in edit rules refuse by a synchronous throw (probe Q4) whatever
    // the runtime awaits. A failed load or a crash allows the edit.
    const editRules = (toolName: string, toolInput: unknown, sessionId: string | null): void => {
      const cwd = ctx.location.directory;
      if (!checkBuiltins) {
        warnOnce(`[fx] edit rules off: ${messageOf(editRulesError)}`);
        editRulesOff(messageOf(editRulesError), sessionId, cwd);
        return;
      }
      const d = checkBuiltins({ harness: 'opencode-v2', sessionId, cwd, toolName, toolInput, now: Date.now() });
      if (d.action === 'refuse' && d.reason !== null) throw new Error(d.reason);
    };

    let beforeRegistered = false;
    await attempt('tool.execute.before', async () => {
      await ctx.tool.hook('execute.before', (raw) => {
        if (!parseEvent) throw new Error(`fx could not load the opencode input parser: ${messageOf(parseError)}`);
        const parsed = parseEvent(raw);
        if (!parsed.ok) {
          // A missing event used to throw on its first read, which refused the call; other non-objects read as no tool.
          if (raw == null) throw new TypeError('fx got no tool event, so the call is refused.');
          return;
        }
        const ev = parsed.value;
        if (EDIT_TOOLS.some((t) => t === ev.tool)) return editRules(ev.tool ?? '', ev.input, ev.sessionID ?? null);
        if (ev.tool !== 'shell') return;
        // Not inside attempt(): this throw is the refusal.
        if (evaluateError) throw new Error(`fx git guard is not installed (permission.evaluate failed to register: ${messageOf(evaluateError)}), so shell commands are refused.`);
        // Only a string is recorded; anything else misses in evaluate and is denied.
        const key = callKey(ev.sessionID, ev.messageID, ev.id);
        const command = ev.input.command;
        attempt('record command', () => {
          if (key !== undefined && typeof command === 'string') commands.set(key, command);
        });
      });
      beforeRegistered = true;
    });
    // Sessions whose current turn had a shell call fx could not read (see the header).
    const blind = new Set<string>();
    await attempt('tool.execute.after', () => ctx.tool.hook('execute.after', (raw) => {
      try {
        if (!parseResult || !recordToolResult) throw turnError;
        const r = parseResult(raw);
        if (r.sessionID === undefined || r.tool === undefined) {
          warnOnce('[fx] a tool.execute.after event carried no session id or tool name, so fx did not record it (the event shape may have changed).');
        } else {
          const parsed = parseEvent?.(raw);
          const key = parsed?.ok ? callKey(parsed.value.sessionID, parsed.value.messageID, parsed.value.id) : undefined;
          const recorded = key === undefined ? undefined : commands.get(key);
          const command = typeof r.args.command === 'string' ? r.args.command : recorded ?? null;
          if (r.tool === 'shell' && r.outcome === 'unknown' && r.output === '') {
            warnOnce('[fx] a completed shell call arrived with no exit status and no output, so fx cannot tell whether it passed: repeat-failure nudges and the Stop reminder are unreliable on this opencode 2.x.');
            blind.add(r.sessionID);
          }
          const line = recordToolResult({
            harness: 'opencode-v2', sessionId: r.sessionID, agentId: null, cwd: ctx.location.directory, toolName: r.tool,
            toolInput: r.args, command, outcome: r.outcome, output: r.output,
          });
          if (line !== null) queue?.enqueue(r.sessionID, line);
        }
      } catch (e) { warnOnce(`[fx] the loop tracker is off: ${messageOf(e)}`); }
      attempt('forget command', () => {
        if (raw == null) throw new TypeError('got no tool event');
        const parsed = parseEvent?.(raw);
        const key = parsed?.ok ? callKey(parsed.value.sessionID, parsed.value.messageID, parsed.value.id) : undefined;
        if (key !== undefined) commands.delete(key);
      });
    }));
    // A new user prompt marks a turn boundary. Its text is never recorded: fx
    // cannot tell the user's prompt from a parent agent's prompt to a child
    // session (design 6). Outside attempt(): a missing hook is a gap of this
    // opencode, not a broken install (red team I19).
    try {
      await ctx.session.hook('prompt', async (ev) => {
        try {
          if (!journal) throw new Error('the journal module did not load');
          const key = journal.journalKey(sessionOf(ev));
          if (key === null) return warnOnce('[fx] the prompt hook carried no session id, so fx did not mark this turn in the session journal.');
          // The turn that just ended is checked before the boundary is marked.
          try {
            if (!decideStop || !queue) throw turnError;
            const session = sessionOf(ev);
            if (session === undefined) throw new Error('the prompt event carried no session id');
            queue.startTurn(session);
            // Skipped, not sent: a reminder must not say no check passed when fx could not read the result.
            const unseen = blind.delete(session);
            if (!unseen) {
              const { text } = await decideStop({ harness: 'opencode-v2', sessionId: session, agentId: null, cwd: ctx.location.directory, stopHookActive: false, mode: 'reminder' });
              if (text !== null) queue.enqueue(session, text);
            }
          } catch (e) { warnOnce(`[fx] the Stop reminder is off: ${messageOf(e)}`); }
          if (!journal.appendEvent(key, { t: Date.now(), kind: 'prompt', text: null, agentType: parseAgent?.(ev) ?? null })) {
            warnOnce('[fx] the session journal could not be written, so fx did not mark this turn.');
          }
        } catch (e) { warnOnce(`[fx] the prompt hook failed, so fx did not mark this turn: ${messageOf(e)}`); }
      });
    } catch (e) {
      console.error(`[fx] the prompt hook is unavailable: ${messageOf(e)}; the Stop reminder cannot work on this opencode.`);
    }

    await attempt('session.context', () => ctx.session.hook('context', (ev) => attempt('context hook', () => {
      let text: string;
      try {
        if (!render) throw loadError;
        text = render({ harness: 'opencode-v2', cwd: ctx.location.directory });
      } catch (e) {
        text = `[fx] fx failed to load: ${messageOf(e)}. The fx bootstrap and its always-on rules are NOT loaded. Tell the user the plugin is misinstalled.`;
      }
      if (failures.length) text += `\n${failures.join('\n')}\nSome fx parts are missing. Tell the user the plugin is misinstalled.`;
      ev.system.push({ type: 'text', text });
      const session = sessionOf(ev);
      // After the preamble. No session id: the queue stays.
      if (session !== undefined && queue !== undefined) {
        for (const line of queue.drain(session)) ev.system.push({ type: 'text', text: line });
      }
    })));

    await attempt('agent.transform', () => ctx.agent.transform((editor) => attempt('agent transform body', () => {
      attempt('fx agents', () => {
        const { READ_ONLY_AGENTS }: typeof import('../lib/plant-roles.js') = require('../lib/plant-roles.js');
        const { toOpencodeV2Agent }: typeof import('../lib/agent-dialects.js') = require('../lib/agent-dialects.js');
        const refs = path.join(ROOT, 'references');
        const referencesDirs = [...new Set([refs, fs.realpathSync(refs)])];
        for (const name of READ_ONLY_AGENTS) {
          attempt(name, () => {
            const def = toOpencodeV2Agent(fs.readFileSync(path.join(ROOT, 'agents', `${name}.md`), 'utf8'), { referencesDirs });
            editor.update(name, (a) => {
              if (a.system && a.system !== def.system) return;   // ADR-0026: the user's definition wins
              Object.assign(a, def);
            });
          });
        }
      });
      // No grant of nested dispatch here (ADR-0026): the built-in general denies
      // the subagent tool, and a user who wants it adds the rule (INSTALL.md).
      attempt('hide lanes', () => {
        for (const agent of editor.list()) {
          attempt(`hide lanes for ${agent.id}`, () => editor.update(agent.id, (a) => {
            for (const lane of HIDDEN) {
              if (!a.permissions.some((r) => r.action === 'skill' && r.resource === lane)) a.permissions.push(hideRule(lane));
            }
            hidden.add(agent.id);
          }));
        }
      });
    })));

    // ctx.command.list() is never called: on 2.0.18 it does not answer inside
    // setup and stalls everything after it. The runtime keeps commands in a Map
    // keyed by name (core/src/command.ts:57-61), so the later add of a name wins.
    await attempt('command registration (fx commands are unavailable)', async () => {
      const { opencodeCommands }: typeof import('../lib/opencode-commands.js') = require('../lib/opencode-commands.js');
      await ctx.command.transform((editor) => {
        for (const [name, cmd] of Object.entries(opencodeCommands(ROOT, ROOT))) {
          editor.add({
            name,
            description: cmd.description,
            execute: async (input) => {
              // Rethrown: a command that delivered nothing must not look done.
              try {
                await ctx.session.prompt({
                  sessionID: input.sessionID,
                  text: cmd.template.split('$ARGUMENTS').join(promptText(input)),
                });
              } catch (e) {
                throw new Error(`fx: /${name} was not delivered: ${messageOf(e)}`);
              }
            },
          });
        }
      });
    });

    if (evaluateError && !beforeRegistered) {
      failures.push('fx: the git guard is off: no hook could be registered, so every shell call is unguarded and only the installed policy layer stands.');
    }
  },
};
