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

// Claude Code's read tools, and the opencode permission keys that are pure
// reads, from the 1.18.31 source (the commit research/opencode-subagents.md
// cites): `read` (tool/read.ts:256), `grep` (tool/grep.ts:40), `glob`
// (tool/glob.ts:29). `list` asks nothing in 1.18.31, but the config schema
// still declares it (core/src/v1/config/permission.ts), so a list tool is
// a read wherever it exists.
const READ_KEYS = { Read: ['read'], Grep: ['grep'], Glob: ['glob', 'list'] };

/**
 * Convert one Claude Code agent definition (the full text of an
 * `agents/*.md` file) into opencode's agent dialect: a plain object usable
 * directly as `config.agent[name]`.
 *
 * `referencesDirs`: absolute paths of fx's references directory. They sit
 * outside the user's project, so reading them needs `external_directory`.
 */
function toOpencodeAgent(mdText, { referencesDirs = [] } = {}) {
  const { fm, body } = splitFrontmatter(mdText);
  const description = field(fm, 'description') || '';
  const tools = field(fm, 'tools') || '';
  // A `tools:` line is an allowlist on Claude Code, so the permission block is
  // one here: deny everything, then allow back what the line names. opencode
  // lets the LAST matching rule win (permission/index.ts:28-32 and 204-214,
  // in key order: fromConfig, index.ts:186-198), so `*` goes first. A denylist
  // missed webfetch, and would miss every tool opencode adds next; this
  // denies webfetch, websearch, task, todowrite, skill and every MCP tool
  // without naming them.
  const permission = { '*': 'deny' };
  for (const [tool, keys] of Object.entries(READ_KEYS)) {
    if (new RegExp(`\\b${tool}\\b`).test(tools)) for (const k of keys) permission[k] = 'allow';
  }
  permission.edit = WRITE_TOOLS.test(tools) ? 'allow' : 'deny';
  permission.bash = BASH_TOOL.test(tools) ? 'allow' : 'deny';
  // A read outside the project asks `external_directory` with the pattern
  // `<parent dir>/*` (tool/external-directory.ts:28-37), and `*` in a rule
  // pattern crosses `/` (core/src/util/wildcard.ts), so `<dir>/*` covers
  // every file under it. Everything else outside the project stays denied.
  if (referencesDirs.length) {
    permission.external_directory = Object.fromEntries(referencesDirs.map((d) => [`${d}/*`, 'allow']));
  }
  return { mode: 'subagent', description, prompt: body.trim(), permission };
}

module.exports = { toOpencodeAgent, splitFrontmatter, field };
