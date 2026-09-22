'use strict';
// Renders PREAMBLE.md for one runtime, and assembles the full text a session
// receives: the rendered preamble, the repo.md note, and the describePlans
// block. One function so all three runtimes agree by construction instead of
// each hook re-assembling the pieces its own way. docs/adr/0020.
//
// WHY PLACEHOLDERS: PREAMBLE.md hardcoded Claude Code's lane addressing
// (`fx:fx-tdd`, invoked with the `Skill` tool) and shipped that text verbatim
// to every runtime. On opencode a lane has no plugin prefix; on Codex lanes
// are addressed with a leading `$` and there is no `Skill` tool at all. Each
// runtime gets its own addressing substituted in; the opening imperative
// itself (ADR 0002: position decides whether lanes fire) is never reordered
// or extended, only its names are substituted. The text is a bootstrap that
// makes the model invoke a lane; the rules live in the lanes (ADR 0021).

const fs = require('fs');
const path = require('path');
const { describePlans } = require('./plan-state');

const PREAMBLE_PATH = path.join(__dirname, '..', 'PREAMBLE.md');

const HARNESSES = ['claude-code', 'opencode', 'codex'];

// Per harness: how a lane name is addressed, what names the invoking action,
// and the resolution clause naming the form that fails on THAT runtime
// (PREAMBLE.md's former lines 25-26, which were backwards on every runtime
// but claude-code).
const NEVER_READ = 'Never `Read` a `SKILL.md` instead of invoking it: reading gives you the text '
  + 'without the obligation, which is the failure this section exists to stop.';

const ADDRESSING = {
  'claude-code': {
    lane: (name) => `fx:${name}`,
    skillTool: 'the `Skill` tool',
    resolution: 'A plugin skill resolves as `plugin:skill`, so a bare `fx-tdd` may not resolve at all',
    readRule: NEVER_READ,
    dispatch: 'Name the agent with the plugin prefix, such as `fx:fx-lens-security`, as the subagent type.',
  },
  opencode: {
    lane: (name) => name,
    skillTool: 'the `Skill` tool',
    resolution: 'The name carries no plugin prefix here, so the plugin-prefixed form will not resolve',
    readRule: NEVER_READ,
    dispatch: 'Name the agent without a plugin prefix, such as `fx-lens-security`, as the subagent type.',
  },
  codex: {
    lane: (name) => `$${name}`,
    // Codex has no Skill tool: its model loads a skill by reading SKILL.md
    // through the shell, and `$name` is the user's syntax, not the model's
    // (research/codex.md, section 4, catalog_prompt.rs L1-L40).
    skillTool: 'your shell to read the lane\'s `SKILL.md` in full',
    resolution: 'Lanes are addressed with a leading `$`, and the runtime lists each lane\'s `SKILL.md` path',
    readRule: 'Reading that file is how a lane is invoked here: read all of it, and treat it as binding.',
    dispatch: 'Call `spawn_agent` with `agent_type` set to the role\'s name, such as `fx-lens-security`. '
            + 'Always pass `agent_type`: without it the role is not applied, and the child runs as a copy of you.',
  },
};

function render({ harness, cwd = process.cwd() } = {}) {
  const addressing = ADDRESSING[harness];
  if (!addressing) throw new Error(`unknown harness: ${harness}`);

  let text = fs.readFileSync(PREAMBLE_PATH, 'utf8');
  // Function replacements only: a replacement STRING treats `$` specially
  // (`$\`` inserts the text before the match), and Codex's wording is full of `$`.
  text = text.replace(/\{\{SKILL_TOOL\}\}/g, () => addressing.skillTool);
  text = text.replace(/\{\{LANE:([a-z0-9-]+)\}\}/g, (_, name) => addressing.lane(name));
  text = text.replace(/\{\{RESOLUTION\}\}/g, () => addressing.resolution);
  text = text.replace(/\{\{DISPATCH\}\}/g, () => addressing.dispatch);
  text = text.replace(/\{\{READ_RULE\}\}/g, () => addressing.readRule);

  // A repo may add its own context; the plugin never writes to it.
  if (fs.existsSync(path.join(cwd, 'repo.md'))) {
    text += `\n\nThis repository has a \`repo.md\` describing its structure, `
          + `patterns and local decisions. Read it before changing code here.\n`;
  }

  // Best effort: a bug here must never stop a session from starting.
  try {
    const plans = describePlans(cwd, { lane: addressing.lane });
    if (plans) text += `\n\n${plans}`;
  } catch { /* the preamble alone is still worth emitting */ }

  return text;
}

module.exports = { render, HARNESSES };
