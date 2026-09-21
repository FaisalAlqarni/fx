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
// itself (ADR 0002: position and self-sufficiency decide whether lanes fire)
// is never reordered or extended, only its names are substituted.

const fs = require('fs');
const path = require('path');
const { describePlans } = require('./plan-state');

const PREAMBLE_PATH = path.join(__dirname, '..', 'PREAMBLE.md');

const HARNESSES = ['claude-code', 'opencode', 'codex'];

// Per harness: how a lane name is addressed, what names the invoking action,
// and the resolution clause naming the form that fails on THAT runtime
// (PREAMBLE.md's former lines 25-26, which were backwards on every runtime
// but claude-code).
const ADDRESSING = {
  'claude-code': {
    lane: (name) => `fx:${name}`,
    skillTool: 'the `Skill` tool',
    resolution: 'A plugin skill resolves as `plugin:skill`, so a bare `fx-tdd` may not resolve at all',
    dispatch: 'Name the agent with the plugin prefix, such as `fx:fx-lens-security`, as the subagent type.',
  },
  opencode: {
    lane: (name) => name,
    skillTool: 'the `Skill` tool',
    resolution: 'The name carries no plugin prefix here, so the plugin-prefixed form will not resolve',
    dispatch: 'Name the agent without a plugin prefix, such as `fx-lens-security`, as the subagent type.',
  },
  codex: {
    lane: (name) => `$${name}`,
    skillTool: 'the `$name` form',
    resolution: 'Lanes are addressed with a leading `$`, and a bare `fx-tdd` is not a lane reference',
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

  // A repo may add its own context; the plugin never writes to it.
  if (fs.existsSync(path.join(cwd, 'repo.md'))) {
    text += `\n\nThis repository has a \`repo.md\` describing its structure, `
          + `patterns and local decisions. Read it before changing code here.\n`;
  }

  // Best effort: a bug here must never stop a session from starting.
  try {
    const plans = describePlans(cwd);
    if (plans) text += `\n\n${plans}`;
  } catch { /* the preamble alone is still worth emitting */ }

  return text;
}

// Claude Code keeps any single hook's context over 10,000 characters as a file
// and shows the model a 2,000-character preview, so the render is split into
// parts, one per hook handler (design amendment A3,
// research/claude-code-context-limit.md). Cuts fall only before a `## ` or
// `### ` line; a section longer than the budget is cut at blank lines instead.
// The label goes at the END of each part: nothing may sit above the opening
// imperative (ADR 0002).
const label = (i, n) => `\n[fx preamble: part ${i} of ${n}]\n`;
const LABEL_RESERVE = label(999, 999).length;

function renderParts({ harness, cwd, max = 9000 } = {}) {
  const budget = max - LABEL_RESERVE;
  const units = render({ harness, cwd })
    .split(/(?=^#{2,3} )/m)
    .flatMap((section) => (section.length > budget ? section.split(/(?<=\n\n)/) : [section]));

  const chunks = [];
  for (const unit of units) {
    const last = chunks.length - 1;
    if (last >= 0 && chunks[last].length + unit.length <= budget) chunks[last] += unit;
    else chunks.push(unit);
  }
  return chunks.map((c, i) => c + label(i + 1, chunks.length));
}

// Which text hook handler `n` of `handlers` emits. The last handler carries
// every remaining part: past the limit it arrives as a file preview, which is
// better than the tail vanishing.
function partForHandler(parts, n, handlers = 3) {
  if (n < handlers) return parts[n - 1] || '';
  if (n === handlers) return parts.slice(n - 1).join('');
  return '';
}

module.exports = { render, renderParts, partForHandler, HARNESSES };
