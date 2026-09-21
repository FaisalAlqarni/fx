'use strict';
// The single converter from a Claude Code agent definition (agents/*.md) to
// opencode's agent dialect.
//
// `plugins/fx.js` calls this to register fx's read-only lenses in the
// `config` hook's `config.agent`. `scripts/fx-opencode-install` (task 09)
// calls this same module instead of keeping its own `convert_agent`: one
// converter per dialect, never two that can drift apart on what "read-only"
// means on opencode.
//
// Measured against opencode 1.18.25: `tools: { apply_patch: false }` is a
// silent no-op, the permission key is `edit`, and `write`/`patch` collapse
// onto it (references/harnesses/opencode.md). So the write restriction is
// expressed as `permission.edit`, never `permission.write` or `tools`.

const WRITE_TOOLS = /\b(Write|Edit|NotebookEdit)\b/;
const BASH_TOOL = /\bBash\b/;

function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('agent definition has no frontmatter');
  return { fm: m[1], body: m[2] };
}

// A scalar `key: value` line, or a YAML '>' folded block — the two shapes
// agents/*.md frontmatter uses. Mirrors scripts/gen-codex-agents' own
// `field()`, the other reader of this same frontmatter, so the two agree on
// what a field means without sharing code across a Python/JS boundary.
function field(fm, key) {
  let m = fm.match(new RegExp(`^${key}:\\s*>\\s*\\n((?:[ \\t]+.*\\n?)+)`, 'm'));
  if (m) return m[1].split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
  m = fm.match(new RegExp(`^${key}:[ \\t]*(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

/**
 * Convert one Claude Code agent definition (the full text of an
 * `agents/*.md` file) into opencode's agent dialect: a plain object usable
 * directly as `config.agent[name]`.
 */
function toOpencodeAgent(mdText) {
  const { fm, body } = splitFrontmatter(mdText);
  const description = field(fm, 'description') || '';
  const tools = field(fm, 'tools') || '';
  const permission = {
    edit: WRITE_TOOLS.test(tools) ? 'allow' : 'deny',
    bash: BASH_TOOL.test(tools) ? 'allow' : 'deny',
  };
  // A `tools:` line is an allowlist on Claude Code, so it grants no MCP tool.
  // Same here: an opencode MCP tool's id is always `<server>_<tool>`
  // (1.18.31 packages/opencode/src/mcp/catalog.ts:117-119), and
  // Permission.disabled() wildcard-matches every tool id against each rule's
  // key (permission/index.ts:204-214), so `*_*` hides all of them. It also
  // turns the `external_directory` and `doom_loop` asks into denies, which a
  // read-only agent can live with.
  if (tools) permission['*_*'] = 'deny';
  return { mode: 'subagent', description, prompt: body.trim(), permission };
}

module.exports = { toOpencodeAgent };
