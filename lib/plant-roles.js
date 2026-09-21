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
const { splitSegments, expandShellC, stripHeredocs, parseGit } = require('./git-guard');

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
// UNVERIFIED against a live session (no Codex CLI was available to this
// task) — task 12's conformance runner, which does drive one, is where this
// gets measured. What breaks if `ppid` turns out NOT to be stable across a
// session's hook invocations: `lookupAgentIdentity` misses the record
// `SubagentStart` made (wrong directory), which is exactly "unclassified",
// which is refused on a write already. Wrong in this direction fails
// CLOSED — a real lens loses nothing it's allowed to do wrong (writing),
// only availability of the correct read/refuse distinction inside its
// allowed surface — never silently open.
//
// One file per agent_id, not one shared file: two subagents starting at once
// write to two different paths, so there is no read-modify-write window to
// race. Mode 0600/0700: `os.tmpdir()` is shared across every local user on
// the machine, and default umask permissions would let another local user
// on a shared machine read or tamper with a session's identity records.
// Single-developer use makes this unrealistic today, but the fix was one
// line each, so it's taken rather than deferred.
// `ponytail: os.tmpdir() accumulates one small directory per Codex process
// across the machine's lifetime; add a prune-on-write if that ever matters,
// most systems already reap /tmp periodically.`

function identityDir(scope) {
  return path.join(os.tmpdir(), 'fx-codex-agents', scope || String(process.ppid));
}

function recordAgentIdentity({ agentId, agentType, scope } = {}) {
  if (!agentId) return;
  const dir = identityDir(scope);
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(dir, `${agentId}.json`), JSON.stringify({ agentType: agentType || null }), { mode: 0o600 });
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
// 3. Write detection — ALLOWLIST, all the way down (fix round 2)
// ---------------------------------------------------------------------------
//
// *** EVERY GATE IN THIS DETECTOR IS AN ALLOWLIST. If you are about to add a
// *** set of things to REFUSE, that is the bug, not the fix — write the set
// *** of things PERMITTED instead, and refuse everything else. This applies
// *** at every level: which binaries may run, which subcommand/action a
// *** many-surfaced binary like `git` or `find` may be given, and any level
// *** added after this comment. Where a binary's surface is too large to
// *** enumerate safely (case in point: `tree`, dropped below rather than
// *** gated), DROP the binary. A lens that cannot run one convenience tool
// *** is mildly inconvenienced; a lens that can write is the failure this
// *** whole task exists to prevent.
//
// apply_patch is Codex's only edit tool (references/harnesses/codex.md):
// every call writes, unconditionally, whatever its payload looks like.
//
// Bash is everything else, and this detector has been wrong twice on it,
// both times the identical mistake at a different depth:
//
//   Round 1 denied shell TEXT that looked like a write (a redirect, a
//   listed write binary). `bash -c`, `sh -c`, `python3 -c`, `node -e` — any
//   interpreter — writes a file with no redirect and no write binary
//   anywhere in the OUTER command, so the denylist never saw any of them.
//   Fixed by allowlisting BINARIES: ALLOWED_BINARIES below is the small,
//   knowable set a read-only review agent actually needs (search, read,
//   list, inspect history), enumerated from what agents/fx-lens-*.md and
//   agents/fx-devils-advocate.md actually say they do — never from
//   imagination. Not on the list -> refused outright, whatever the
//   arguments are. This is what closes `bash -c`, every interpreter,
//   `curl`, `wget`, `eval` WITHOUT naming any of them.
//
//   Round 1 ALSO left a denylist one level down: `git`'s and `find`'s own
//   subcommands/actions were still tested against a list of ones to REFUSE
//   (`git commit`, `find -exec`, ...). `git` alone has well over a hundred
//   subcommands (`config`, `clone`, `archive --output=`, `worktree add`,
//   `am`, `bundle create`, `format-patch`, `hash-object -w`, `update-ref`,
//   and more nobody has tried yet all write); `find` has `-fprint`/`-fls`
//   alongside `-exec`/`-delete`. The identical argument that killed the
//   round-1 binary denylist applies one level down: an enumeration of
//   EVERY writing git subcommand or find action is incomplete the day it's
//   written. GIT_ALLOWED_SUBCOMMANDS and FIND_ALLOWED_FLAGS below invert
//   both the same way round 1 inverted the outer gate.
//
// ponytail: this is pattern matching over shell text, not a shell parser —
// same ceiling as lib/git-guard.js, whose `splitSegments`/`expandShellC`
// this reuses. Every allowlist here closes its whole class outright
// (nothing unenumerated can run AT ALL, at any level), which a denylist at
// that same level could never do regardless of how many entries it grew.

// Every binary a lens is known to need, derived from agents/fx-lens-*.md and
// agents/fx-devils-advocate.md (2026-09-21):
//   - Read (Codex has no Read tool; this is how a lens views a file):
//     "Read the diff", "Read the changed templates" — every lens body.
//   - Grep (Codex has no Grep tool): "Grep for callers", "Grep the design
//     system's token file", "Grep both locale files", "Grep for every..."
//   - Glob / file discovery (Codex has no Glob tool): "find every place
//     work enters a queue" (fx-lens-pipeline).
//   - History and the diff itself: "git diff" (fx-lens-database, named
//     explicitly); "the diff (or a command to produce it)"
//     (fx-devils-advocate). git subcommand-gated below.
//   - Orientation/comparison utilities with no write mode in standard use.
// Deliberately excluded despite looking harmless: `sed`/`awk`/`perl` (each
// has its own scripting syntax that can write a file — `sed '...w file'`,
// `awk '{print > "f"}'` — with no `-i` flag and no shell redirection at
// all) and `xargs` (its argument names an arbitrary command to run, which
// re-opens exactly the "wrapper" hole round 1 closed). `tree` was here in
// round 1 and is dropped in round 2: no agent body calls for it, its own
// write surface (`-o FILE`) was never gated, and a lens can list a
// directory with `find`/`ls` instead — the smaller surface, per the DROP
// principle above. None of the six agent bodies require any of the four.
const ALLOWED_BINARIES = new Set([
  'cat', 'head', 'tail', 'wc', 'nl',
  'grep', 'egrep', 'fgrep', 'rg',
  'find', 'ls',
  'git',
  'diff', 'pwd', 'file', 'basename', 'dirname', 'realpath', 'stat',
  'echo', 'printf',
]);

const REDIRECT = />/; // `>`, `>>`, `2>`. Fd-dup (`2>&1`) is blanked before this ever runs.

// `git`'s read-only surface a lens is known to need, plus read-only
// siblings obviously safe to add alongside them (2026-09-21): `diff` is
// named explicitly (agents/fx-lens-database.md: "git diff"); `log`/`show`
// are how "the diff (or a command to produce it)" (agents/fx-devils-
// advocate.md) gets produced from history; `status`/`blame` are ordinary
// review orientation. `rev-parse`, `ls-files`, `ls-tree`, `cat-file`,
// `describe`, `shortlog`, `grep`, `for-each-ref`, `merge-base`, `name-rev`
// and `rev-list` are git's own read-only plumbing/porcelain — none of them
// has a write mode in any git version. Anything else (`config`, `clone`,
// `archive`, `worktree`, `am`, `bundle`, `format-patch`, `hash-object -w`,
// `update-ref`, `commit`, `checkout`, `push`, and the hundred-plus git
// subcommands nobody has tried against this list yet) is refused for not
// being on it — never enumerated as bad.
const GIT_ALLOWED_SUBCOMMANDS = new Set([
  'log', 'diff', 'show', 'blame', 'status', 'rev-parse', 'ls-files',
  'ls-tree', 'cat-file', 'describe', 'shortlog', 'grep', 'for-each-ref',
  'merge-base', 'name-rev', 'rev-list',
]);

// `find`'s read-only surface: path matching and printing to stdout. Any
// ACTION that names a file to write results into, or executes anything, is
// simply not on this list — that covers `-fprint`/`-fls`/`-fprintf`
// (write), `-exec`/`-execdir`/`-ok`/`-okdir` (execute), `-delete`, and
// every other find primitive nobody has tried yet, without enumerating any
// of them as bad.
const FIND_ALLOWED_FLAGS = new Set([
  '-name', '-iname', '-path', '-type', '-maxdepth', '-mindepth',
  '-print', '-print0', '-newer', '-size', '-not', '-o', '-a', '-prune',
]);

// git-guard's splitSegments treats a bare `&` as a command separator (for
// backgrounding), which corrupts `N>&M` fd-duplication (`2>&1`, `1>&2`,
// `&>`): that `&` is part of the operator, not a separator, and splitting
// on it produces a phantom segment (`1`) that is not a real command at all.
// Blanking the whole fd-dup token — BEFORE any segment-splitting happens —
// removes the bare `&` that confuses splitSegments and the `>` that would
// otherwise look like a real redirect, in one step.
function blankFdDup(text) {
  return text.replace(/\d*>&\d+/g, (m) => ' '.repeat(m.length));
}

// Quoted text is DATA — a grep pattern, a commit message, a string literal —
// never shell syntax. Every lens greps arbitrary strings out of someone
// else's code, and `>` or `=>` inside the pattern it is searching FOR is not
// a redirect it is asking the shell to perform. Blank quoted spans (keeping
// their length, so nothing downstream needs re-indexing) before testing for
// write-shaped punctuation or words.
function blankQuoted(text) {
  return text.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, (m) => ' '.repeat(m.length));
}

function firstWord(segment) {
  const m = segment.trim().match(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*(\S+)/);
  return m ? path.basename(m[1]) : '';
}

function tokenize(segment) {
  return segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
}

// `git <subcommand>`: reuses git-guard's own `parseGit` (global-flag-aware:
// `-C dir`, `--git-dir=`, `-c key=val`) rather than a second regex-based
// subcommand reader, so the two never disagree about what the subcommand
// IS. Unparseable (parseGit returns null although firstWord already said
// this segment starts with `git`) is refused, same as an unrecognised
// subcommand: fails closed on the shape it cannot classify.
function gitMustBeRefused(segment) {
  const g = parseGit(segment);
  return !g || !GIT_ALLOWED_SUBCOMMANDS.has(g.sub);
}

// `find`: every token that is itself a flag/action (starts with `-`) must
// be on FIND_ALLOWED_FLAGS. A bare value (a path, a glob pattern, `(`/`)`)
// never starts with `-` and passes through unrestricted; only the
// dash-prefixed vocabulary find understands is gated.
function findMustBeRefused(segment) {
  return tokenize(segment).some((t) => t.startsWith('-') && !FIND_ALLOWED_FLAGS.has(t));
}

// Command substitution — `$(...)` and `` `...` `` — runs its body as its own
// command whose OUTPUT is captured; the body still executes as a real
// command in the meantime, including any write it performs. Extracted from
// the RAW segment text (quotes intact): `"$(cmd)"` still substitutes inside
// double quotes in real shell semantics, so the quoting must not hide it
// from this walk the way it correctly hides a grep pattern from REDIRECT.
function extractSubstitutions(text) {
  const bodies = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '$' && text[i + 1] === '(') {
      let depth = 1;
      let j = i + 2;
      while (j < text.length && depth > 0) {
        if (text[j] === '(') depth++;
        else if (text[j] === ')') depth--;
        j++;
      }
      bodies.push(text.slice(i + 2, Math.max(i + 2, j - 1)));
      i = j - 1;
    }
  }
  const backtickRe = /`([^`]*)`/g;
  let m;
  while ((m = backtickRe.exec(text))) bodies.push(m[1]);
  return bodies;
}

// Pattern matching over shell text has no natural termination bound the way
// a real parser would; a depth cap makes recursion finite and, hit or not,
// fails CLOSED rather than open (an unresolvable nesting depth is refused,
// not allowed through).
const MAX_EXPANSION_DEPTH = 8;

/**
 * Walk every scope reachable from `text`: its own top-level command
 * segments, each `bash -c`/`sh -c` payload unwrapped from one, and each
 * `$(...)`/backtick substitution body found in one — recursively. Returns
 * true (refuse) the moment ANY scope fails either gate.
 */
function scopeMustBeRefused(text, depth) {
  if (depth > MAX_EXPANSION_DEPTH) return true; // fails closed, not open

  const safe = blankFdDup(stripHeredocs(text));
  for (const seg of splitSegments(safe)) {
    const blanked = blankQuoted(seg);

    // Gate 1: allowlist. Not one of the binaries a lens is known to need ->
    // refused outright, whatever its arguments are.
    const bin = firstWord(seg);
    if (!ALLOWED_BINARIES.has(bin)) return true;

    // Gate 2: a second allowlist, for a binary whose OWN surface is too
    // large to trust wholesale — never a denylist at this level either.
    if (REDIRECT.test(blanked)) return true;
    if (bin === 'git' && gitMustBeRefused(seg)) return true;
    if (bin === 'find' && findMustBeRefused(seg)) return true;

    // Recurse into every nested scope this segment unwraps to.
    const inner = expandShellC(seg);
    if (inner && scopeMustBeRefused(inner, depth + 1)) return true;
    for (const sub of extractSubstitutions(seg)) {
      if (scopeMustBeRefused(sub, depth + 1)) return true;
    }
  }
  return false;
}

function isWritingBashCommand(command) {
  if (typeof command !== 'string' || !command.trim()) return false;
  return scopeMustBeRefused(command, 0);
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
  ALLOWED_BINARIES,
};
