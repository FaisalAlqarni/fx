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
// A rejected Promise in a v2 hook is a defect, so every body catches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Nothing is required unguarded at load: a failed import loses the plugin.
let render, loadError;
try {
  ({ render } = require('../lib/preamble.js'));
} catch (e) {
  loadError = e;
}

let inspect, guardError;
try {
  ({ inspect } = require('../lib/git-guard.js'));
} catch (e) {
  guardError = e;
}

// Full shell command text by tool call id: recorded in execute.before,
// read in evaluate, dropped in execute.after.
const commands = new Map();
// Scoped by session, message and call id: a provider can repeat a call id
// across sessions. Any missing part gives no key, and no key is a miss.
const callKey = (sessionID, messageID, id) => {
  const parts = [sessionID, messageID, id];
  return parts.every((p) => typeof p === 'string' && p) ? parts.join('\u0000') : undefined;
};

const HIDDEN = ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup'];
const hideRule = (lane) => ({ action: 'skill', resource: lane, effect: 'deny' });
const messageOf = (e) => String((e && e.message) || e);

// The four-line read-only set: the actions an fx review agent may use. A
// session's own rules are merged after the agent's and can widen them
// (core/src/permission.ts:162), so the evaluate hook re-imposes this.
const READ_ACTIONS = ['read', 'grep', 'glob', 'list'];
let READ_ONLY = [];
try {
  ({ READ_ONLY_AGENTS: READ_ONLY } = require('../lib/plant-roles.js'));
} catch { /* the agent step reports the same failure */ }

// True only for an external_directory request whose every resource, resolved
// (so `references/../x` is not one), lies under fx's references directory.
function readsOnlyReferences(ev) {
  if (ev.action !== 'external_directory') return false;
  const resources = ev.resources;
  if (!Array.isArray(resources) || resources.length === 0) return false;
  const refs = path.join(ROOT, 'references');
  const dirs = [refs, fs.realpathSync(refs)];
  return resources.every((r) => { const p = path.resolve(String(r)); return dirs.some((d) => p.startsWith(`${d}/`)); });
}

export default {
  id: 'fx',
  async setup(ctx) {
    // Every failed step lands here and is shown in the session: in the
    // preamble, and in the message of any denial the evaluate hook makes.
    const failures = [];
    const attempt = (what, fn) => {
      const report = (e) => {
        failures.push(`fx: ${what} failed: ${messageOf(e)}`);
        console.error(`[fx] ${what} failed: ${messageOf(e)}`);
      };
      try {
        const r = fn();
        return r && typeof r.then === 'function' ? r.catch(report) : r;
      } catch (e) { report(e); }
    };
    const notice = () => (failures.length ? ` [${failures.join('; ')}]` : '');
    const deny = (ev, message) => { ev.effect = 'deny'; ev.message = `[fx] ${message}${notice()}`; };

    // Registered first: nothing before the git guard waits on the runtime.
    // The guard lives in this hook. If it never registers, execute.before below
    // refuses every shell call instead (a throw there refuses cleanly, probe Q4).
    let evaluateError;
    await attempt('permission.evaluate', async () => {
      try {
        await ctx.permission.hook('evaluate', (ev) => {
      // fx's read-only agents: anything but a read, or a read of fx's own
      // references, is denied whatever the session's rules said. Fails closed
      // like the shell guard: not inside attempt(), any throw denies.
      if (READ_ONLY.includes(ev.agent) && !READ_ACTIONS.includes(ev.action)) {
        try {
          if (!readsOnlyReferences(ev)) return deny(ev, `${ev.agent} is read-only: ${ev.action} is refused.`);
        } catch (e) {
          return deny(ev, `${ev.agent} is read-only and its check failed, so ${ev.action} is refused: ${messageOf(e)}`);
        }
      }
      if (ev.action === 'shell') {
        // The git guard fails closed: any error below denies the call.
        try {
          if (guardError) throw guardError;
          const key = ev.source ? callKey(ev.sessionID, ev.source.messageID, ev.source.id) : undefined;
          const command = key === undefined ? undefined : commands.get(key);
          if (command === undefined) {
            deny(ev, "fx could not see this command's full text, so the git guard cannot check it.");
            return;
          }
          const verdict = inspect(command, ctx.location.directory);
          if (!verdict.allow) return deny(ev, verdict.reason);
          // The pieces as they stand now, after any other plugin's rewrite.
          for (const piece of [].concat(ev.resources || [])) {
            const v = inspect(String(piece), ctx.location.directory);
            if (!v.allow) return deny(ev, v.reason);
          }
        } catch (e) {
          deny(ev, `the fx git guard failed, so the command is refused: ${messageOf(e)}`);
        }
        return;
      }
      try {
        if (ev.action === 'edit') {
          // Advice only: a failed load or a throw leaves the edit alone.
          const { laneCheck } = require('../lib/lane-check.js');
          for (const r of ev.resources || []) {
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
        const lane = (ev.resources || []).find((r) => HIDDEN.includes(r));
        if (!lane) return;
        deny(ev, `${lane} is typed by the user, not picked by the model: ask them to run /${lane}.`);
      } catch (e) {
        failures.push(`fx: evaluate failed: ${messageOf(e)}`);
        console.error(`[fx] evaluate failed: ${messageOf(e)}`);
        // Fail closed for the hidden lanes; an edit is advice and stays open.
        const lane = ev.action === 'skill' && [].concat(ev.resources || []).find((r) => HIDDEN.includes(r));
        if (lane) deny(ev, `${lane} is typed by the user: ask them to run /${lane}.`);
      }
        });
      } catch (e) { evaluateError = e; throw e; }
    });

    let beforeRegistered = false;
    await attempt('tool.execute.before', async () => {
      await ctx.tool.hook('execute.before', (ev) => {
        if (ev.tool !== 'shell') return;
        // Not inside attempt(): this throw is the refusal.
        if (evaluateError) throw new Error(`fx git guard is not installed (permission.evaluate failed to register: ${messageOf(evaluateError)}), so shell commands are refused.`);
        // Only a string is recorded; anything else misses in evaluate and is denied.
        attempt('record command', () => {
          const key = callKey(ev.sessionID, ev.messageID, ev.id);
          if (key !== undefined && ev.input && typeof ev.input.command === 'string') commands.set(key, ev.input.command);
        });
      });
      beforeRegistered = true;
    });
    await attempt('tool.execute.after', () => ctx.tool.hook('execute.after', (ev) => {
      attempt('forget command', () => { commands.delete(callKey(ev.sessionID, ev.messageID, ev.id)); });
    }));
    await attempt('session.context', () => ctx.session.hook('context', (ev) => attempt('context hook', () => {
      let text;
      try {
        if (loadError) throw loadError;
        text = render({ harness: 'opencode-v2', cwd: ctx.location.directory });
      } catch (e) {
        text = `[fx] fx failed to load: ${messageOf(e)}. The fx bootstrap and its always-on rules are NOT loaded. Tell the user the plugin is misinstalled.`;
      }
      if (failures.length) text += `\n${failures.join('\n')}\nSome fx parts are missing. Tell the user the plugin is misinstalled.`;
      ev.system.push({ type: 'text', text });
    })));

    await attempt('agent.transform', () => ctx.agent.transform((editor) => attempt('agent transform body', () => {
      attempt('fx agents', () => {
        const { READ_ONLY_AGENTS } = require('../lib/plant-roles.js');
        const { toOpencodeV2Agent } = require('../lib/agent-dialects.js');
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
          }));
        }
      });
    })));

    // ctx.command.list() is never called: on 2.0.18 it does not answer inside
    // setup and stalls everything after it. The runtime keeps commands in a Map
    // keyed by name (core/src/command.ts:57-61), so the later add of a name wins.
    await attempt('command registration (fx commands are unavailable)', async () => {
      const { opencodeCommands } = require('../lib/opencode-commands.js');
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
                  text: cmd.template.split('$ARGUMENTS').join((input.prompt && input.prompt.text) || ''),
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
