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

const HIDDEN = ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup'];
const hideRule = (lane) => ({ action: 'skill', resource: lane, effect: 'deny' });
const attempt = (what, fn) => {
  const report = (e) => console.error(`[fx] ${what} failed: ${e && e.message}`);
  try {
    const r = fn();
    return r && typeof r.then === 'function' ? r.catch(report) : r;
  } catch (e) { report(e); }
};

export default {
  id: 'fx',
  async setup(ctx) {
    await attempt('session.context', () => ctx.session.hook('context', (ev) => {
      let text;
      try {
        if (loadError) throw loadError;
        text = render({ harness: 'opencode-v2', cwd: ctx.location.directory });
      } catch (e) {
        text = `[fx] fx failed to load: ${e.message}. The fx bootstrap and its always-on rules are NOT loaded. Tell the user the plugin is misinstalled.`;
      }
      ev.system.push({ type: 'text', text });
    }));

    await attempt('agent.transform', () => ctx.agent.transform((editor) => {
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
      for (const agent of editor.list()) {
        attempt(`hide lanes for ${agent.id}`, () => editor.update(agent.id, (a) => {
          for (const lane of HIDDEN) {
            if (!a.permissions.some((r) => r.action === 'skill' && r.resource === lane)) a.permissions.push(hideRule(lane));
          }
        }));
      }
    }));

    await attempt('command.transform', async () => {
      const { opencodeCommands } = require('../lib/opencode-commands.js');
      const held = new Set((await ctx.command.list()).map((c) => c.name));
      await ctx.command.transform((editor) => {
        for (const [name, cmd] of Object.entries(opencodeCommands(ROOT, ROOT))) {
          if (held.has(name)) continue;
          editor.add({
            name,
            description: cmd.description,
            execute: async (input) => {
              await attempt(`${name} execute`, () => ctx.session.prompt({
                sessionID: input.sessionID,
                text: cmd.template.split('$ARGUMENTS').join((input.prompt && input.prompt.text) || ''),
              }));
            },
          });
        }
      });
    });

    await attempt('tool.execute.before', () => ctx.tool.hook('execute.before', (ev) => {
      attempt('record command', () => {
        if (ev.tool === 'shell') commands.set(ev.id, String(ev.input.command));
      });
    }));
    await attempt('tool.execute.after', () => ctx.tool.hook('execute.after', (ev) => {
      attempt('forget command', () => { commands.delete(ev.id); });
    }));

    await attempt('permission.evaluate', () => ctx.permission.hook('evaluate', (ev) => {
      if (ev.action === 'shell') {
        // The git guard fails closed: any error below denies the call.
        try {
          if (guardError) throw guardError;
          const command = ev.source && commands.get(ev.source.id);
          if (command === undefined) {
            ev.effect = 'deny';
            ev.message = "fx could not see this command's full text, so the git guard cannot check it.";
            return;
          }
          const verdict = inspect(command, ctx.location.directory);
          if (!verdict.allow) {
            ev.effect = 'deny';
            ev.message = verdict.reason;
          }
        } catch (e) {
          ev.effect = 'deny';
          ev.message = `the fx git guard failed, so the command is refused: ${e && e.message}`;
        }
        return;
      }
      attempt('evaluate', () => {
        if (ev.action === 'edit') {
          // Advice only: a failed load or a throw leaves the edit alone.
          const { laneCheck } = require('../lib/lane-check.js');
          for (const r of ev.resources || []) {
            const reason = laneCheck(path.resolve(ctx.location.directory, r), ctx.location.directory);
            if (reason) {
              ev.effect = 'deny';
              ev.message = reason;
              return;
            }
          }
          return;
        }
        if (ev.action !== 'skill') return;
        const lane = (ev.resources || []).find((r) => HIDDEN.includes(r));
        if (!lane) return;
        ev.effect = 'deny';
        ev.message = `${lane} is typed by the user, not picked by the model: ask them to run /${lane}.`;
      });
    }));
  },
};
