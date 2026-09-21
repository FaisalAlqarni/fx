'use strict';
// Task 06: fx's read-only review agents, made read-only on Codex.
//
// Three jobs live here, all "new logic" for this task, per the instruction
// to keep hooks/fx-codex.js a thin router:
//
//   1. PLANTING  — copy codex/agents/*.toml into the user's Codex home.
//      Tested directly against a temporary home: lib/plant-roles.test.js.
//   2. IDENTITY  — remember, per subagent, which role SubagentStart said it
//      was. Session-scoped, under the OS temp area, never the repository.
//   3. WRITE DETECTION — recognise a write across every tool Codex offers
//      one through: apply_patch (always) and Bash (heuristically).
//
// (2) and (3) are exercised at the hook's stdin-to-exit-code contract in
// tests/gates/codex-manifest.test.js, because that is the seam the actual
// guarantee — "a lens cannot write" — lives at.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { splitSegments, expandShellC, stripHeredocs } = require('./git-guard');

// ---------------------------------------------------------------------------
// 1. Planting
// ---------------------------------------------------------------------------

const DEFAULT_SOURCE = path.join(__dirname, '..', 'codex', 'agents');

// The read-only set is derived from what scripts/gen-codex-agents already
// generated, not re-derived here from agents/*.md `tools:` lines. One
// implementation of "which agents are read-only" — the generator — and this
// just reads its output, so the two can never drift apart in what they count
// as read-only (they CAN drift in content, which is exactly what
// scripts/check-generated exists to catch).
function deriveReadOnlyAgents(source = DEFAULT_SOURCE) {
  return fs.readdirSync(source)
    .filter((f) => f.endsWith('.toml'))
    .map((f) => path.basename(f, '.toml'))
    .sort();
}

const READ_ONLY_AGENTS = deriveReadOnlyAgents();

function isReadOnlyAgent(agentType) {
  return typeof agentType === 'string' && READ_ONLY_AGENTS.includes(agentType);
}

/**
 * Copy every generated read-only role into `home/agents/`.
 *
 * Confined to names `deriveReadOnlyAgents` produces — never a prefix match,
 * never a file the planter did not itself write on some earlier run. Content
 * is compared before writing: identical content is reported `skipped`,
 * changed content is rewritten and reported `stale` (a role file tampered
 * with, or drifted from an older fx version, is repaired rather than left).
 *
 * @returns {{written: string[], skipped: string[], stale: string[]}}
 */
function plantRoles({ home, source = DEFAULT_SOURCE } = {}) {
  const resolvedHome = home || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const destDir = path.join(resolvedHome, 'agents');
  fs.mkdirSync(destDir, { recursive: true });

  const written = [];
  const skipped = [];
  const stale = [];

  for (const name of deriveReadOnlyAgents(source)) {
    const content = fs.readFileSync(path.join(source, `${name}.toml`), 'utf8');
    const destPath = path.join(destDir, `${name}.toml`);

    let existing = null;
    try { existing = fs.readFileSync(destPath, 'utf8'); } catch { /* not planted yet */ }

    if (existing === null) {
      fs.writeFileSync(destPath, content);
      written.push(destPath);
    } else if (existing === content) {
      skipped.push(destPath);
    } else {
      fs.writeFileSync(destPath, content);
      stale.push(destPath);
    }
  }

  return { written, skipped, stale };
}

// ---------------------------------------------------------------------------
// 2. Identity: SubagentStart records it, PreToolUse looks it up
// ---------------------------------------------------------------------------
//
// `agent_type` is documented for SubagentStart/SubagentStop and undocumented
// for PreToolUse (ADR 0019). So PreToolUse never trusts the field on its own
// payload: it looks up what SubagentStart already recorded for that
// `agent_id`, in a store keyed by agent_id, scoped to this Codex session.
//
// Session scope: `process.ppid`. Every hook invocation for one running Codex
// session is a fresh `node` process, but all of them share the same PARENT
// process — the Codex CLI itself — so its pid is stable for the life of one
// session and distinct across concurrent ones. No `session_id` field is
// documented on any hook event, so this is the discriminator available.
//
// One file per agent_id, not one shared file: two subagents starting at once
// write to two different paths, so there is no read-modify-write window to
// race. `ponytail: os.tmpdir() accumulates one small directory per Codex
// process across the machine's lifetime; add a prune-on-write if that ever
// matters, most systems already reap /tmp periodically.`

function identityDir(scope) {
  return path.join(os.tmpdir(), 'fx-codex-agents', scope || String(process.ppid));
}

function recordAgentIdentity({ agentId, agentType, scope } = {}) {
  if (!agentId) return;
  const dir = identityDir(scope);
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${agentId}.json`), JSON.stringify({ agentType: agentType || null }));
  } catch { /* best effort: a recording failure must not break the session */ }
}

function lookupAgentIdentity(agentId, scope) {
  if (!agentId) return null;
  try {
    const raw = fs.readFileSync(path.join(identityDir(scope), `${agentId}.json`), 'utf8');
    return JSON.parse(raw).agentType || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. Write detection
// ---------------------------------------------------------------------------
//
// apply_patch is Codex's only edit tool (references/harnesses/codex.md):
// every call writes, unconditionally, whatever its payload looks like.
//
// Bash is everything else, so a write there is a heuristic over shell text —
// same ceiling as lib/git-guard.js, which this reuses (`splitSegments`,
// `expandShellC`) rather than re-parsing shell a second way.
//
// ponytail: this is pattern matching, not a shell parser. It misses
// obfuscation (base64 | sh, indirection through a variable, an unlisted
// write binary). Add to WRITE_BINARIES or the regexes below as real gaps
// turn up; a full shell AST is not worth building to close a threat model
// this task does not claim to cover (a hostile lens prompt, not a hostile
// user).

const REDIRECT = />>?(?!&)/; // `>`, `>>`, `2>`; not `2>&1`/`1>&2` fd-dup
const WRITE_BINARIES = new Set([
  'rm', 'mv', 'cp', 'touch', 'mkdir', 'rmdir', 'chmod', 'chown', 'chgrp',
  'ln', 'dd', 'truncate', 'tee', 'shred', 'install', 'rsync', 'patch',
]);
const WRITE_INPLACE = /\b(?:sed|perl)\s+(?:-\w*i\w*|--in-place)\b/;
const GIT_WRITE_SUB = /\bgit\s+(?:add|commit|apply|checkout|reset|stash|merge|rebase|rm|mv|cherry-pick|revert|clean|restore|tag|branch|push|pull|fetch|init|switch)\b/;
const PKG_WRITE = /\b(?:npm|yarn|pnpm)\s+(?:install|ci|add|remove|uninstall|update|upgrade)\b/;

function firstWord(segment) {
  const m = segment.trim().match(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*(\S+)/);
  return m ? path.basename(m[1]) : '';
}

function isWritingBashCommand(command) {
  if (typeof command !== 'string' || !command.trim()) return false;

  // Redirection is tested against the whole heredoc-stripped command, NOT
  // per split segment. splitSegments treats a bare `&` as a command
  // separator (backgrounding), which would sever `2>&1` into `2>` + `1` and
  // make the `(?!&)` lookahead below blind to the very `&` it exists to see
  // — turning the ordinary fd-duplication idiom into a false positive.
  if (REDIRECT.test(stripHeredocs(command))) return true;

  const segments = [];
  for (const seg of splitSegments(command)) {
    segments.push(seg);
    const inner = expandShellC(seg);
    if (inner) segments.push(...splitSegments(inner));
  }

  return segments.some((seg) => WRITE_INPLACE.test(seg)
    || GIT_WRITE_SUB.test(seg)
    || PKG_WRITE.test(seg)
    || WRITE_BINARIES.has(firstWord(seg)));
}

function isWritingToolCall(toolName, toolInput) {
  if (toolName === 'apply_patch') return true;
  if (toolName === 'Bash') return isWritingBashCommand((toolInput || {}).command);
  return false;
}

module.exports = {
  plantRoles,
  deriveReadOnlyAgents,
  READ_ONLY_AGENTS,
  isReadOnlyAgent,
  identityDir,
  recordAgentIdentity,
  lookupAgentIdentity,
  isWritingBashCommand,
  isWritingToolCall,
};
