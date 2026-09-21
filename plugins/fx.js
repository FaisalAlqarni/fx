// opencode plugin — parity with Claude Code, corrected against the shipped
// opencode 1.18.25 binary (strings-read against
// /home/faisal/.opencode/bin/opencode, 2026-09-21; see the task and the
// commit message for what was measured and how).
//
// MEASURED, not assumed:
//
//   - `experimental.chat.system.transform` is invoked from TWO call sites in
//     the shipped binary, both as `trigger("experimental.chat.system.
//     transform", input, output)` — an (input, output) pair, `system` on
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
//     carries under `command` — see hooks/fx-codex.js's own
//     `extractPatchPaths`, which this mirrors locally rather than sharing:
//     that file is Codex's, out of this task's file list, and not exported).
//   - Refusing a call is done by THROWING. There is no deny return value, and
//     `permission.ask` is declared in the public type but has zero call sites
//     in the binary, so nothing here registers a handler for it or depends
//     on it firing.
//   - `config.subagent_depth ?? 1` is the shipped default (confirmed:
//     `subagent_depth??1` appears at the enforcement site), so a plugin that
//     never raises it caps an implementer at zero nested dispatches — no
//     reviewer from an implementer. Raised here, never lowered.
//   - `config.skills.paths` and `config.permission.skill` are the real
//     fields (confirmed: `skills:t.skills&&[...t.skills.paths??[],...]` and
//     a `skill:` entry in the permission ruleset struct).
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

const require = createRequire(import.meta.url);
const { inspect } = require('../lib/git-guard.js');
const { laneCheck } = require('../lib/lane-check.js');
const { render } = require('../lib/preamble.js');
const { READ_ONLY_AGENTS } = require('../lib/plant-roles.js');
const { toOpencodeAgent } = require('../lib/agent-dialects.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));   // .../plugins
const ROOT = path.join(HERE, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');
// Both paths a read-only agent may be handed for a reference: through the
// path this plugin was loaded from, and the checkout it resolves to.
const REFERENCES = path.join(ROOT, 'references');
const REFERENCES_DIRS = [...new Set([REFERENCES, fs.realpathSync(REFERENCES)])];

// The five lanes a person must type, never a model auto-selection.
// tests/gates/user-invoked.test.js pins the same set for Claude Code
// (`disable-model-invocation: true`) and Codex (`allow_implicit_invocation:
// false`). A lane hidden on one runtime and exposed on another is the
// failure task 07's fix round closed; this is opencode's mechanism for the
// same guarantee.
const HIDDEN_SKILLS = ['fx-audit', 'fx-critique', 'fx-grill', 'fx-handoff', 'fx-setup'];

// apply_patch's own V4A envelope (opencode's LOCAL tool, confirmed against
// the binary: `patchText` field, `Vo.parsePatch`, same header vocabulary as
// Codex's). Mirrors hooks/fx-codex.js's `extractPatchPaths` exactly; kept
// local rather than required from that file, which is Codex's and not in
// this task's file list.
function extractPatchPaths(text) {
  if (typeof text !== 'string') return [];
  const paths = [];
  for (const line of text.split('\n')) {
    // `Move to:` cannot see live traffic today: the shipped binary refuses
    // any apply_patch containing a move outright ("apply_patch moves are
    // not supported yet"). Parsed anyway, for parity with Codex's identical
    // header vocabulary and in case that restriction lifts; harmless to
    // keep, and not something a test here can ever exercise against a real
    // opencode call.
    const m = line.match(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/)
      || line.match(/^\*\*\* Move to: (.+)$/);
    if (m) paths.push(m[1].trim());
  }
  return paths;
}

export const fx = async ({ directory } = {}) => {
  const cwd = directory || process.cwd();

  // Computed once, at plugin construction, mirroring the previously-shipped
  // form: one session's worth of context does not change mid-session.
  // `render` does the whole assembly — rendered PREAMBLE.md, the repo.md
  // note, the plan-state block — in one place (docs/adr/0020); this file
  // never reassembles any of it.
  let preamble;
  try {
    preamble = render({ harness: 'opencode', cwd });
  } catch {
    preamble = '[fx] PREAMBLE.md could not be read. The fx routing table and '
             + 'non-negotiables are NOT loaded. Do not commit, and tell the '
             + 'user the plugin is misinstalled.';
  }

  return {
    config: async (config) => {
      // Skills: append idempotently. The config hook may run more than
      // once; appending the same path twice registers every skill twice,
      // and opencode keeps the first and logs the rest as duplicates.
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(SKILLS_DIR)) {
        config.skills.paths.push(SKILLS_DIR);
      }

      // Agents: every read-only role, from the same set Codex's roles are
      // derived from (lib/plant-roles.js) — never a `fx-lens-` prefix match,
      // which would leave fx-devils-advocate writable here while it is
      // read-only on Claude Code and Codex.
      config.agent = config.agent || {};
      for (const name of READ_ONLY_AGENTS) {
        if (config.agent[name]) continue;   // idempotent across repeat config() calls
        const mdText = fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), 'utf8');
        config.agent[name] = toOpencodeAgent(mdText, { referencesDirs: REFERENCES_DIRS });
      }

      // Nested dispatch (amendment A6): opencode gives a subagent the task
      // tool only when its own permission block has a rule keyed exactly
      // `task`; `"*": "allow"` does not count (subagent-permissions.ts,
      // canTask). `general` is the built-in subagent's key: opencode 1.18.31
      // packages/opencode/src/agent/agent.ts:182-195, and `opencode agent
      // list` on 1.18.25 prints `general (subagent)`. opencode merges this
      // block over the native agent. Merge only when `task` is absent, so a
      // user's own value and a repeat config() call are both left alone. A
      // bare action string is a whole permission block, and the user's too.
      const general = (config.agent.general = config.agent.general || {});
      general.permission = general.permission || {};
      if (typeof general.permission === 'object' && !('task' in general.permission)) {
        general.permission.task = 'allow';
      }

      // Depth: `subagent_depth` defaults to 1, which stops an implementer
      // dispatching a reviewer. Raise it, but never lower a value already
      // set higher than what fx needs.
      config.subagent_depth = Math.max(config.subagent_depth || 1, 2);

      // Hide the five user-invoked lanes from the model via permission.skill
      // deny. The last matching rule wins, so the broad allow goes first —
      // and only once, so a repeat config() call does not reorder it behind
      // whatever else has since been added.
      config.permission = config.permission || {};
      config.permission.skill = config.permission.skill || {};
      if (!('*' in config.permission.skill)) config.permission.skill['*'] = 'allow';
      for (const name of HIDDEN_SKILLS) config.permission.skill[name] = 'deny';
    },

    'experimental.chat.system.transform': async (input, output) => {
      // `input.sessionID` is undefined at the agent-generation call site;
      // nothing here reads it, so there is nothing to guard.
      output.system.push(preamble);
    },

    'tool.execute.before': async (input, output) => {
      const tool = input && input.tool;
      const args = (output && output.args) || {};

      if (tool === 'bash') {
        const command = args.command;
        if (!command) return;
        let verdict;
        try {
          verdict = inspect(command, cwd);
        } catch (e) {
          // Fail CLOSED: a broken guard must refuse, not assume safety.
          verdict = { allow: false, reason: `git guard failed to evaluate this command (${e.message}). Denying rather than assuming it is safe.` };
        }
        // Throwing is how this API refuses a tool call; there is no deny
        // return value.
        if (!verdict.allow) throw new Error(`[fx] ${verdict.reason}`);
        return;
      }

      // Write paths. `edit` and `write` share `filePath`; the local
      // `apply_patch` carries a multi-file patch under `patchText`. All
      // three collapse onto opencode's own `edit` permission key, and which
      // one is live depends on the model (apply_patch replaces edit/write on
      // GPT-family models).
      let filePaths;
      if (tool === 'edit' || tool === 'write') {
        filePaths = args.filePath ? [args.filePath] : [];
      } else if (tool === 'apply_patch') {
        filePaths = extractPatchPaths(args.patchText).map((p) => path.resolve(cwd, p));
      } else {
        return;
      }

      for (const filePath of filePaths) {
        // Fail OPEN: the lane check is advice, so a broken one must not
        // wedge a write.
        let reason = null;
        try {
          reason = laneCheck(filePath, cwd);
        } catch {
          reason = null;
        }
        if (reason) throw new Error(`[fx] ${reason}`);
      }
    },
  };
};
