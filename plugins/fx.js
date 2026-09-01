// opencode plugin — the same two jobs as the Claude Code hooks, over the same
// two files. `lib/git-guard.js` is shared verbatim; `PREAMBLE.md` is the same
// text. Neither is reimplemented here.
//
//   experimental.chat.system.transform  -> inject the preamble
//   tool.execute.before                 -> block by throwing
//
// Subagents are covered by the same path: opencode implements them as child
// sessions (TaskTool calls Session.create({ parentID }) then
// SessionPrompt.prompt()), so prompt construction runs for them too. Claude
// Code needs two separate events for what this does with one.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { inspect } = require('../lib/git-guard.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));   // .../plugins
const PREAMBLE = path.join(HERE, '..', 'PREAMBLE.md');

export const fx = async ({ directory }) => {
  let preamble;
  try {
    preamble = fs.readFileSync(PREAMBLE, 'utf8');
  } catch {
    preamble = '[fx] PREAMBLE.md could not be read. The fx routing table and '
             + 'non-negotiables are NOT loaded. Do not commit, and tell the '
             + 'user the plugin is misinstalled.';
  }

  const repoMd = path.join(directory || process.cwd(), 'repo.md');
  if (fs.existsSync(repoMd)) {
    preamble += '\n\nThis repository has a `repo.md` describing its structure, '
              + 'patterns and local decisions. Read it before changing code here.\n';
  }

  return {
    'experimental.chat.system.transform': async ({ system }) => {
      system.push(preamble);
    },

    'tool.execute.before': async (input, output) => {
      if (input.tool !== 'bash') return;
      const command = output?.args?.command;
      if (!command) return;

      let verdict;
      try {
        verdict = inspect(command, directory || process.cwd());
      } catch (e) {
        verdict = { allow: false, reason: `git guard failed to evaluate this command (${e.message}). Denying rather than assuming it is safe.` };
      }

      // Throwing is how this API refuses a tool call.
      if (!verdict.allow) throw new Error(`[fx] ${verdict.reason}`);
    },
  };
};
