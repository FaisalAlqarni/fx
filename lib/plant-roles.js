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

/**
 * Report the same three states `plantRoles` classifies — `present`,
 * `missing`, `stale` — without ever writing. `plantRoles` already repairs;
 * this is the read-only counterpart the setup lane calls so a user can see
 * what is wrong before anything changes it. Never calls `mkdirSync` or
 * `writeFileSync`: a missing destination directory is read as "every role
 * missing" via the same try/catch a missing file already goes through,
 * never created to make the read succeed.
 *
 * @returns {{present: string[], missing: string[], stale: string[]}}
 */
function auditRoles({ home, source = DEFAULT_SOURCE } = {}) {
  const resolvedHome = home || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const destDir = path.join(resolvedHome, 'agents');

  const present = [];
  const missing = [];
  const stale = [];

  for (const name of deriveReadOnlyAgents(source)) {
    const content = fs.readFileSync(path.join(source, `${name}.toml`), 'utf8');
    const destPath = path.join(destDir, `${name}.toml`);

    let existing = null;
    try { existing = fs.readFileSync(destPath, 'utf8'); } catch { /* not planted, and never created here */ }

    if (existing === null) missing.push(destPath);
    else if (existing === content) present.push(destPath);
    else stale.push(destPath);
  }

  return { present, missing, stale };
}

// ---------------------------------------------------------------------------
// Hook trust — Codex only
// ---------------------------------------------------------------------------
//
// Codex skips a plugin's hooks until the user reviews and trusts them
// (design.md, "As an fx user on Codex, I want fx to work before I have
// trusted its hooks"). An untrusted hook is indistinguishable from a working
// one from inside a session — it just silently never fires — so the setup
// lane is the only place this can be surfaced at all.
//
// What this function does NOT do: guess. A live `~/.codex/config.toml`
// (measured 2026-09-21, Codex CLI 0.155.1) carries
// `[projects."<path>"] trust_level = "trusted"` — but that is WORKSPACE
// trust, whether a command in that directory runs without an approval
// prompt, not plugin HOOK trust. design.md's Open Questions section leaves
// the actual hook-trust storage as an unresolved contradiction between the
// documentation and one measured install, to be settled by task 12's live
// conformance run. Treating workspace trust as a stand-in for hook trust
// would be exactly the guessing this function exists to refuse: a confident
// wrong answer about whether the guard is running is worse than no answer.
// So: read-only, and `null` until a real signal is measured.
function hooksTrusted({ home } = {}) {
  const resolvedHome = home || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  try {
    fs.readFileSync(path.join(resolvedHome, 'config.toml'), 'utf8');
  } catch { /* nothing to read: still null, same as an unfamiliar shape */ }
  return null;
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
// 3. Write detection — ALLOWLIST, all the way down
// ---------------------------------------------------------------------------
//
// *** THE CEILING — READ THIS BEFORE TOUCHING ANYTHING BELOW ***
//
// This gate prevents ACCIDENTS, not an adversary. The threat model is a
// well-behaved lens that writes because nothing told it not to — that is
// what every real finding against this module has been: an ordinary
// command that happens to write (`find -fprint`, a flag that names an
// output file), not an attempt to evade detection. It is NOT a sandbox. A
// determined prompt injection arriving through a reviewed diff — one that
// tries to encode a write past this pattern-matcher on purpose — is out of
// scope, and nothing in this
// module should be described as if it covers that.
//
// Why fx cannot do better than this on Codex today: a role file's
// `sandbox_mode = "read-only"` does NOT enforce (measured directly against
// Codex CLI 0.155.1, docs/adr/0019) — a spawned subagent with that setting
// still wrote a file when told to. Codex offers no per-subagent tool
// restriction the way Claude Code's `tools:` allowlist or opencode's
// `permission:` block do. The only discriminator that reaches a hook at
// all is identity (`agent_id`/`agent_type`, recorded at SubagentStart), and
// once identity says "this is a lens," the only thing left to inspect is
// the shell text of what it's about to run. This module IS that
// inspection, and pattern-matching shell text has a ceiling no amount of
// additional pattern-matching removes.
//
// *** THE RULE: EVERY GATE IN THIS DETECTOR IS AN ALLOWLIST. *** If you are
// about to add a set of things to REFUSE, that is the bug, not the fix —
// write the set of things PERMITTED instead, and refuse everything else.
// This applies at every level this module has needed one: which binaries
// may run, which action a many-surfaced binary like `find` may be given,
// which FLAG an allowed binary may carry, which shell syntax a command may
// use, and any level added after this comment. Where a surface is too large
// to enumerate safely, DROP it rather than gate it — `tree`, and later
// `git`, were dropped rather than given their own allowlists. A lens
// that cannot run one convenience tool, or one flag, is mildly
// inconvenienced; a lens that can write is the failure this whole task
// exists to prevent.
//
// Every gap found here is weighed against dropping the affected binary or
// flag before it is patched. docs/adr/0019 records the standing guarantee
// and the limits this ceiling leaves.
//
// apply_patch is Codex's only edit tool (references/harnesses/codex.md):
// every call writes, unconditionally, whatever its payload looks like.
//
// Bash is everything else, and passes only if every level below clears it:
// the shell syntax (parseCommand), the binary (ALLOWED_BINARIES), and that
// binary's flags (BINARY_FLAGS, or find's and sed's own gates).
//
// ponytail: parseCommand is a tokenizer for a deliberately tiny subset of
// POSIX shell, not a shell parser. It is its own splitter, not
// lib/git-guard.js's splitSegments (which is quote-blind and frozen): the
// two implement "split a command into segments" twice, on purpose.

// Every binary a lens is known to need, derived from agents/fx-lens-*.md and
// agents/fx-devils-advocate.md (2026-09-21):
//   - Read (Codex has no Read tool; this is how a lens views a file):
//     "Read the diff", "Read the changed templates" — every lens body.
//   - Grep (Codex has no Grep tool): "Grep for callers", "Grep the design
//     system's token file", "Grep both locale files", "Grep for every..."
//   - Glob / file discovery (Codex has no Glob tool): "find every place
//     work enters a queue" (fx-lens-pipeline).
//   - The diff itself: a lens reads the packaged diff file it is handed
//     (design amendment A5). `git` is not on the list: it runs commands from
//     repository config the review does not control (diff.external,
//     textconv, core.fsmonitor, and a nested repo's config reached through
//     the shell tool's `workdir`, which the hook never sees). None of the
//     binaries below reads repository config.
//   - Orientation/comparison utilities with no write mode in standard use.
// `sed` is allowed only in its pager form, `sed -n <range>p`, gated by
// sedMustBeRefused below. Deliberately excluded
// despite looking harmless: `awk`/`perl` (each has its own scripting syntax
// that can write a file — `awk '{print > "f"}'` — with no shell
// redirection at all) and `xargs` (its argument names an arbitrary command to run, which
// re-opens exactly the "wrapper" hole the binary allowlist closes). `tree` is
// excluded too: no agent body calls for it, its own write surface
// (`-o FILE`) was never gated, and a lens can list a
// directory with `find`/`ls` instead — the smaller surface, per the DROP
// principle above. None of the six agent bodies require any of the three.
const ALLOWED_BINARIES = new Set([
  'cat', 'head', 'tail', 'wc', 'nl',
  'grep', 'egrep', 'fgrep', 'rg',
  'find', 'ls',
  'diff', 'pwd', 'file', 'basename', 'dirname', 'realpath', 'stat',
  'echo', 'printf',
  'sed',
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

// A per-binary FLAG allowlist: `rg --pre <cmd>` runs a command, and so do
// flags nobody has tried yet on any binary. Same shape as
// FIND_ALLOWED_FLAGS, one list per binary: a flag not on its list is
// refused. The lists hold what a reviewer needs to read a
// diff, search and page; nothing else.
//
// Spec syntax: `-x` / `--long` take no value. `-x=` / `--long=` take a
// required value: attached (`-A3`, `--glob=*.js`) or as the next token,
// which is then skipped as data. `-x[=]` / `--long[=]` take an optional
// value, attached only (`--color=never`): the next word is never theirs, so
// it is checked as a flag. A short cluster (`-rn`) is read left to right; a
// value-taking letter swallows the rest of the token. `-<digits>` (`-20`) is
// a count everywhere and is allowed. `--` ends the flags.
//
// Abbreviations: refused, never resolved. GNU getopt accepts an
// unambiguous prefix of a long flag (`--recur` for `--recursive`); matching is
// exact here, so every abbreviation fails the lookup and is refused, the
// allowlisted ones included. One rule, applied to every binary.
function flagSpec(text) {
  const spec = new Map();
  for (const f of text.split(/\s+/).filter(Boolean)) {
    if (f.endsWith('[=]')) spec.set(f.slice(0, -3), 'opt');
    else if (f.endsWith('=')) spec.set(f.slice(0, -1), 'val');
    else spec.set(f, 'bool');
  }
  return spec;
}

const GREP_FLAGS = flagSpec('-n -i -r -R -l -L -c -w -x -v -E -F -P -o -h -H -s -q -I '
  + '-e= -A= -B= -C= -m= --include= --exclude= --exclude-dir= --color[=] --colour[=] '
  + '--line-number --recursive --ignore-case --files-with-matches --files-without-match '
  + '--count --word-regexp --fixed-strings --extended-regexp --perl-regexp --only-matching '
  + '--context= --after-context= --before-context= --max-count= --binary-files= '
  + '--no-filename --with-filename --invert-match');
const HEAD_TAIL_FLAGS = flagSpec('-n= -c= -q -v --lines= --bytes=');

// binary -> its flags. find and sed have their own gates below.
const BINARY_FLAGS = new Map(Object.entries({
  cat: flagSpec('-n -b -s -A -v -e -E -t -T --number --show-all'),
  head: HEAD_TAIL_FLAGS,
  tail: HEAD_TAIL_FLAGS,
  wc: flagSpec('-l -w -c -m -L --lines --words --bytes --chars'),
  nl: flagSpec('-b= -n= -w= -s='),
  grep: GREP_FLAGS,
  egrep: GREP_FLAGS,
  fgrep: GREP_FLAGS,
  // No --pre/--pre-glob (run a command per file) and no -z/--search-zip
  // (runs decompression binaries).
  rg: flagSpec('-n -N -i -S -s -w -x -v -l -c -F -o -u -H -I -U -p -e= -g= -t= -T= -A= -B= -C= '
    + '-m= --glob= --iglob= --type= --type-not= --line-number --no-line-number --ignore-case '
    + '--smart-case --case-sensitive --word-regexp --fixed-strings --files-with-matches '
    + '--files-without-match --count --only-matching --hidden --no-ignore --files --context= '
    + '--after-context= --before-context= --max-count= --no-heading --heading --color= --json '
    + '--vimgrep --sort= --max-depth= --multiline --no-config --stats --invert-match'),
  ls: flagSpec('-l -a -A -h -R -1 -d -t -r -S -F -i -n --color[=] --all --almost-all '
    + '--human-readable --recursive'),
  diff: flagSpec('-u -U= -r -N -q -w -b -B -i -y -a -p -x= --brief --unified= --recursive '
    + '--new-file --ignore-all-space --ignore-space-change --color[=] --side-by-side --exclude='),
  pwd: flagSpec('-L -P'),
  // No -C (compiles a magic database: writes a .mgc file), no -m, no -z.
  file: flagSpec('-b -i -L -h -k -E --brief --mime --mime-type --mime-encoding --keep-going'),
  basename: flagSpec('-a -s= -z --multiple --suffix='),
  dirname: flagSpec('-z'),
  realpath: flagSpec('-e -m -s -q --relative-to= --relative-base= --canonicalize-existing '
    + '--canonicalize-missing --no-symlinks'),
  stat: flagSpec('-c= -L -f -t --format= --printf= --terse'),
  echo: flagSpec('-n -e -E'),
  printf: flagSpec(''),
}));

// The shell syntax a read-only agent may use, as an allowlist. Each bash
// feature left open ran a command or wrote a file through a cleared command
// (`<(...)`, `{a,--flag}`, `*` matching a file named like a flag). So the
// grammar is fixed, and anything outside it is refused before any flag is
// read. A command is segments separated by `|`, `&&` or `||` (never `;`, `&`
// or a newline). A segment is words separated by spaces. A word is one or
// more adjacent parts, as in bash:
//   - unquoted characters from [A-Za-z0-9._/:@=,+%^~-], where `~` and `^`
//     may not start a word or follow `/`, `=` or `:` (tilde expansion in
//     bash; zsh's extended-glob `^` negation), and `=` may not start a word
//     (zsh expands `=name` to the path of `name` on $PATH);
//   - a single-quoted literal whose body does not end in a backslash (fish
//     reads `\'` as an escaped quote, which would move the closing quote);
//   - a double-quoted string with no `$`, backtick, backslash or `!`.
// Returns the segments as arrays of the literal words the binary will see,
// or null (refuse). No expansion can happen on this grammar, so the words
// ARE what the binary receives.
const UNQUOTED = /[A-Za-z0-9._/:@=,+%^~-]/;
const BEFORE_TILDE_OR_CARET = /[A-Za-z0-9._@,+%^~-]/;

function parseCommand(text) {
  const segments = [];
  let words = [];
  let word = null;   // null: between words
  let prev = '';     // last character of this word: '' at its start, the quote after a quoted part
  const endWord = () => { if (word !== null) words.push(word); word = null; prev = ''; };
  const endSegment = () => {
    endWord();
    if (!words.length) return false;   // `| cat`, `cat ||`: an empty command
    segments.push(words);
    words = [];
    return true;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === ' ') { endWord(); continue; }
    if (c === '|' || (c === '&' && text[i + 1] === '&')) {
      if (text[i + 1] === c) i++;       // `||` or `&&`
      if (!endSegment()) return null;
      continue;
    }
    if (c === "'" || c === '"') {
      const close = text.indexOf(c, i + 1);
      if (close === -1) return null;
      const body = text.slice(i + 1, close);
      if (c === "'" ? body.endsWith('\\') : /[$`\\!]/.test(body)) return null;
      word = (word || '') + body;
      prev = c;
      i = close;
      continue;
    }
    if (!UNQUOTED.test(c)) return null;
    if ((c === '~' || c === '^') && !BEFORE_TILDE_OR_CARET.test(prev)) return null;
    if (c === '=' && prev === '') return null;   // zsh: `=cat` expands to /usr/bin/cat
    word = (word || '') + c;
    prev = c;
  }
  return endSegment() ? segments : null;
}

// Walk `words` (the arguments after the binary or subcommand) against
// `spec`. Returns true (refuse) on the first flag not on it.
function flagsMustBeRefused(words, spec) {
  for (let i = 0; i < words.length; i++) {
    const t = words[i];
    if (t === '--') return false;                    // the rest is data
    if (!t.startsWith('-') || t === '-' || /^-\d+$/.test(t)) continue;
    if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      const kind = spec.get(eq === -1 ? t : t.slice(0, eq));
      if (!kind) return true;
      if (eq !== -1 && kind === 'bool') return true;
      if (eq === -1 && kind === 'val') i++;          // value is the next word
      continue;
    }
    for (let j = 1; j < t.length; j++) {             // a short cluster
      const kind = spec.get(`-${t[j]}`);
      if (!kind) return true;
      if (kind !== 'bool') {                         // the rest is the value;
        if (kind === 'val' && j === t.length - 1) i++;  // or, required, the next word
        break;
      }
    }
  }
  return false;
}

// `find`: every dash word must be on FIND_ALLOWED_FLAGS; values pass.
function findMustBeRefused(words) {
  return words.slice(1).some((t) => t.startsWith('-') && !FIND_ALLOWED_FLAGS.has(t));
}

// `sed`: only `sed -n <line range>p [files]`, the pager form a reviewer
// uses. The script is gated too, because sed's own language writes (`w`).
const SED_PRINT_RANGE = /^(?:(?:\d+|\$)(?:,(?:\d+|\$))?)?p$/;
function sedMustBeRefused(words) {
  let script = null;
  for (const t of words.slice(1)) {
    if (t.startsWith('-')) {
      if (!['-n', '--quiet', '--silent'].includes(t)) return true;
    } else if (script === null) {
      script = t;
    }
  }
  return script === null || !SED_PRINT_RANGE.test(script);
}

// The binary is words[0] exactly: `./cat` or `bin/rg` would run a file from
// the reviewed tree, and `FOO=x cat` (the environment is config) is not a
// name on the list either.
function segmentMustBeRefused(words) {
  const bin = words[0];
  if (!ALLOWED_BINARIES.has(bin)) return true;
  if (bin === 'find') return findMustBeRefused(words);
  if (bin === 'sed') return sedMustBeRefused(words);
  const spec = BINARY_FLAGS.get(bin);
  return !spec || flagsMustBeRefused(words.slice(1), spec);
}

function isWritingBashCommand(command) {
  if (typeof command !== 'string' || !command.trim()) return false;
  const segments = parseCommand(command);
  return !segments || segments.some(segmentMustBeRefused);
}

function isWritingToolCall(toolName, toolInput) {
  if (toolName === 'apply_patch') return true;
  if (toolName === 'Bash') return isWritingBashCommand((toolInput || {}).command);
  return false;
}
module.exports = {
  plantRoles,
  auditRoles,
  hooksTrusted,
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
