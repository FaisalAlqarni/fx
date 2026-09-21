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
// 3. Write detection — ALLOWLIST, all the way down (fix round 3)
// ---------------------------------------------------------------------------
//
// *** THE CEILING — READ THIS BEFORE TOUCHING ANYTHING BELOW ***
//
// This gate prevents ACCIDENTS, not an adversary. The threat model is a
// well-behaved lens that writes because nothing told it not to — that is
// what round 1 identified, and every real finding since (round 2's `git
// config`/`find -fprint`, round 3's `git diff --output=`) has been exactly
// that shape: an ordinary command that happens to write, not an attempt to
// evade detection. It is NOT a sandbox. A determined prompt injection
// arriving through a reviewed diff — one that tries to encode a write past
// this pattern-matcher on purpose — is out of scope, and nothing in this
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
// may run, which subcommand/action a many-surfaced binary like `git` or
// `find` may be given, which FLAG an allowed subcommand may carry, and any
// level added after this comment. Where a surface is too large to
// enumerate safely, DROP it rather than gate it — `tree` was dropped
// entirely in round 2 rather than given its own flag allowlist. A lens
// that cannot run one convenience tool, or one flag, is mildly
// inconvenienced; a lens that can write is the failure this whole task
// exists to prevent.
//
// *** WHY THIS ROUND IS THE LAST ONE. *** Three rounds have now found the
// identical flaw at three granularities: round 1 at the level of BINARIES
// (`bash -c`, `python3 -c` — any interpreter could write with nothing on
// any denylist); round 2 at the level of SUBCOMMANDS/ACTIONS (`git
// config`, `find -fprint` — an allowed binary's own surface was still
// denylisted); round 3 at the level of FLAGS (`git diff --output=` — an
// allowed subcommand's own flag was still unchecked). A fourth round would
// find it at argument VALUES, and a fifth somewhere past that. A
// shell-parsing gate cannot be made complete, and each round that closes
// one level makes the guarantee LOOK stronger than it is — that appearance
// is a bigger risk than the remaining holes, because it invites trusting
// this module for something it was never built to survive. So: the
// `--output` fix below is the last level this module chases. The next gap
// found here gets logged and weighed against dropping the affected
// binary/subcommand, not automatically patched — see docs/adr/0019 for the
// standing guarantee this ceiling now qualifies.
//
// apply_patch is Codex's only edit tool (references/harnesses/codex.md):
// every call writes, unconditionally, whatever its payload looks like.
//
// Bash is everything else. History, briefly (full detail in each round's
// fix-report):
//
//   Round 1: ALLOWED_BINARIES — the small, knowable set a read-only review
//   agent actually needs (search, read, list, inspect history), enumerated
//   from what agents/fx-lens-*.md and agents/fx-devils-advocate.md actually
//   say they do, never from imagination. Not on the list -> refused
//   outright, whatever the arguments are. Closes `bash -c`, every
//   interpreter, `curl`, `wget`, `eval` WITHOUT naming any of them.
//
//   Round 2: GIT_ALLOWED_SUBCOMMANDS and FIND_ALLOWED_FLAGS — `git` alone
//   has well over a hundred subcommands; enumerating the writing ones
//   (round 1's approach, one level down) is incomplete the day it's
//   written. Inverted the same way round 1 inverted the outer gate. `tree`
//   dropped entirely: no agent body needs it, and its own surface was
//   never examined.
//
//   Round 3: GIT_OUTPUT_FLAG — `git diff`/`log`/`show` are legitimately
//   read-only subcommands; `--output=<path>` (or the space form) is the
//   flag that writes. Same allowlist-violation shape, one level further in.
//
//   Task 14 (coordinator's ruling, past the ceiling below): GIT_OUTPUT_FLAG
//   was a denylist, and git -c, git grep -O and rg --pre ran commands past
//   it. Replaced by a per-binary flag allowlist (BINARY_FLAGS, GIT_FLAGS),
//   plus refusal of leading env assignments and shell-expanded tokens.
//
//   Task 14 round 4: four review passes each found one more SHELL feature
//   (process substitution, brace expansion, globs, git -C into a nested
//   repo) that ran a command through a cleared command. The shell syntax
//   itself is now an allowlist too: parseCommand below accepts a small
//   grammar and refuses everything else, so no expansion ever happens.
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
//   - History and the diff itself: "git diff" (fx-lens-database, named
//     explicitly); "the diff (or a command to produce it)"
//     (fx-devils-advocate). git subcommand-gated below.
//   - Orientation/comparison utilities with no write mode in standard use.
// `sed` is allowed only in its pager form, `sed -n <range>p`, gated by
// sedMustBeRefused below (task 14 fix round 3). Deliberately excluded
// despite looking harmless: `awk`/`perl` (each has its own scripting syntax
// that can write a file — `awk '{print > "f"}'` — with no shell
// redirection at all) and `xargs` (its argument names an arbitrary command to run, which
// re-opens exactly the "wrapper" hole round 1 closed). `tree` was here in
// round 1 and is dropped in round 2: no agent body calls for it, its own
// write surface (`-o FILE`) was never gated, and a lens can list a
// directory with `find`/`ls` instead — the smaller surface, per the DROP
// principle above. None of the six agent bodies require any of the three.
const ALLOWED_BINARIES = new Set([
  'cat', 'head', 'tail', 'wc', 'nl',
  'grep', 'egrep', 'fgrep', 'rg',
  'find', 'ls',
  'git',
  'diff', 'pwd', 'file', 'basename', 'dirname', 'realpath', 'stat',
  'echo', 'printf',
  'sed',
]);

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
// The subcommands themselves are the keys of GIT_FLAGS, below.

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

// Task 14 fix round 3 (coordinator's ruling, overriding "the last level"
// above): a per-binary FLAG allowlist. Round 2's mirror search measured
// `git -c diff.external=<cmd> diff`, `git grep -O<cmd>` and `rg --pre <cmd>`
// each running a command while this classifier cleared them. Same shape as
// FIND_ALLOWED_FLAGS, one list per binary (and per git subcommand): a flag
// not on its list is refused. The lists hold what a reviewer needs to read a
// diff, search and page; nothing else.
//
// Spec syntax: `-x` / `--long` take no value. `-x=` / `--long=` take a
// required value: attached (`-A3`, `--glob=*.js`) or as the next token,
// which is then skipped as data. `-x[=]` / `--long[=]` take an optional
// value, attached only (`-U5`, `--unified=5`): the next word is never theirs,
// so it is checked as a flag (`git diff -U --ext-diff` ran diff.external,
// measured). A short cluster (`-rn`) is read left to right; a value-taking
// letter swallows the rest of the token. `-<digits>` (`-20`) is
// a count everywhere and is allowed. `--` ends the flags.
//
// Abbreviations: refused, never resolved. git and GNU getopt accept an
// unambiguous prefix of a long flag (`--ext` for `--ext-diff`); matching is
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

const GIT_DIFF_FLAGS = '--stat[=] --numstat --shortstat --name-only --name-status --summary '
  + '-p --patch -u -s --no-patch -U[=] --unified[=] --no-color --color[=] --word-diff[=] '
  + '-w --ignore-all-space -b --ignore-space-change --ignore-blank-lines -M --find-renames[=] '
  + '--no-renames --diff-filter= -R --relative[=] --minimal --patience --histogram '
  + '--no-ext-diff --no-textconv --full-index --abbrev[=] --check --dirstat[=] -z '
  + '-W --function-context --color-words[=] ';
const GIT_LOG_FLAGS = '--oneline -n= --max-count= --skip= --since= --until= --after= --before= '
  + '--author= --committer= --grep= -i --regexp-ignore-case -S= -G= --all --branches[=] '
  + '--graph --decorate[=] --no-decorate --format= --pretty[=] --follow --reverse '
  + '--no-merges --merges --first-parent --abbrev-commit --date= -L= --left-right '
  + '--topo-order --date-order --no-walk[=] ';

// git subcommand -> its flags. The keys are the allowed subcommands (the
// rationale for which ones is above FIND_ALLOWED_FLAGS): a
// subcommand with no entry here is refused.
const GIT_FLAGS = new Map(Object.entries({
  diff: GIT_DIFF_FLAGS + '--cached --staged --merge-base',
  log: GIT_DIFF_FLAGS + GIT_LOG_FLAGS,
  show: GIT_DIFF_FLAGS + '--oneline --format= --pretty[=] --abbrev-commit --date=',
  blame: '-L= -w -M -C -e -s -l --porcelain --line-porcelain --date=',
  status: '-s --short -b --branch --porcelain[=] -u --untracked-files[=] -z',
  'rev-parse': '--abbrev-ref[=] --short[=] --verify -q --quiet --show-toplevel --show-prefix '
    + '--show-cdup --git-dir --git-common-dir --absolute-git-dir --is-inside-work-tree '
    + '--symbolic-full-name',
  'ls-files': '-c --cached -o --others -m --modified -d --deleted -s --stage -t -z '
    + '--exclude-standard --full-name --error-unmatch',
  'ls-tree': '-r -d -t -l --long -z --name-only --name-status --full-name --full-tree --abbrev[=]',
  'cat-file': '-p -t -s -e',
  describe: '--tags --all --always --long --abbrev= --contains --exact-match',
  shortlog: '-s --summary -n --numbered -e --email --all --since= --until=',
  grep: '-n --line-number -i --ignore-case -w --word-regexp -v --invert-match -l '
    + '--files-with-matches -L --files-without-match -c --count -h -H -o --only-matching '
    + '-E --extended-regexp -F --fixed-strings -P --perl-regexp -e= -A= -B= -C= --context= '
    + '--after-context= --before-context= --cached --untracked -I --max-depth= -q --quiet '
    + '--all-match --and --or --not -p --show-function -W --function-context --heading '
    + '--break --full-name --name-only --color[=] --no-color',
  'for-each-ref': '--format= --sort= --count= --contains[=] --no-contains[=] --points-at= '
    + '--merged[=] --no-merged[=]',
  'merge-base': '--is-ancestor --all --fork-point --octopus --independent',
  'name-rev': '--name-only --tags --always',
  'rev-list': '--count --all -n= --max-count= --reverse --first-parent --no-merges --merges '
    + '--since= --until= --left-right',
}).map(([sub, text]) => [sub, flagSpec(text)]));

// The global options git may carry before its subcommand: the pager
// switches only. `-c`/`--config-env` (config injection, and diff.external is
// config), `-C`, `--git-dir`, `--work-tree`, `--namespace` (each changes
// which repository, and so which config, git reads), `--exec-path` and the
// rest are not on it.
const GIT_GLOBAL_FLAGS = new Set(['--no-pager', '-P']);

const GREP_FLAGS = flagSpec('-n -i -r -R -l -L -c -w -x -v -E -F -P -o -h -H -s -q -I '
  + '-e= -A= -B= -C= -m= --include= --exclude= --exclude-dir= --color[=] --colour[=] '
  + '--line-number --recursive --ignore-case --files-with-matches --files-without-match '
  + '--count --word-regexp --fixed-strings --extended-regexp --perl-regexp --only-matching '
  + '--context= --after-context= --before-context= --max-count= --binary-files= '
  + '--no-filename --with-filename --invert-match');
const HEAD_TAIL_FLAGS = flagSpec('-n= -c= -q -v --lines= --bytes=');

// binary -> its flags. git, find and sed have their own gates below.
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

// Task 14 fix round 4: the shell syntax a read-only agent may use, as an
// allowlist. Four review passes each found one more bash feature that ran a
// command or wrote a file through a cleared command (`<(...)`, `{a,--flag}`,
// `*` matching a file named like a flag, git -C into a nested repo). So the
// grammar is fixed, and anything outside it is refused before any flag is
// read. A command is segments separated by `|`, `&&` or `||` (never `;`, `&`
// or a newline). A segment is words separated by spaces. A word is one or
// more adjacent parts, as in bash:
//   - unquoted characters from [A-Za-z0-9._/:@=,+%^~-], where `~` and `^`
//     may not start a word or follow `/`, `=` or `:` (tilde expansion in
//     bash; zsh's extended-glob `^` negation);
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

// `git [--no-pager|-P] <subcommand> <flags>`. Nothing may change which
// repository git reads: `-C`, `--git-dir`, `--work-tree` and `--namespace`
// are not on GIT_GLOBAL_FLAGS, `cd`/`pushd`/`popd` are not allowed binaries,
// and a `GIT_DIR=` prefix is not an allowed binary either. A nested bare repo
// in the reviewed tree carries its own config (diff.external), measured.
function gitMustBeRefused(words) {
  let i = 1;
  while (i < words.length && GIT_GLOBAL_FLAGS.has(words[i])) i++;
  const spec = GIT_FLAGS.get(words[i]);
  return !spec || flagsMustBeRefused(words.slice(i + 1), spec);
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
  if (bin === 'git') return gitMustBeRefused(words);
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
