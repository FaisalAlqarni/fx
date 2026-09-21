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
// ponytail: this is pattern matching over shell text, not a shell parser —
// same ceiling as lib/git-guard.js, whose `splitSegments`/`expandShellC`
// this reuses. Every allowlist here closes its whole class outright
// (nothing unenumerated can run AT ALL, at any level), which a denylist at
// that same level could never do regardless of how many entries it grew —
// and per THE CEILING above, that is where this module's ambition stops:
// enumerated classes, not arbitrary shell semantics.

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
// which is then skipped as data. `--long[=]` takes an optional value, in the
// `=` form only. A short cluster (`-rn`) is read left to right; a
// value-taking letter swallows the rest of the token. `-<digits>` (`-20`) is
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
  + '-p --patch -u -s --no-patch -U= --unified= --no-color --color[=] --word-diff[=] '
  + '-w --ignore-all-space -b --ignore-space-change --ignore-blank-lines -M --find-renames[=] '
  + '--no-renames --diff-filter= -R --relative[=] --minimal --patience --histogram '
  + '--no-ext-diff --no-textconv --full-index --abbrev[=] --check --dirstat[=] -z ';
const GIT_LOG_FLAGS = '--oneline -n= --max-count= --skip= --since= --until= --after= --before= '
  + '--author= --committer= --grep= -i --regexp-ignore-case -S= -G= --all --branches[=] '
  + '--graph --decorate[=] --no-decorate --format= --pretty[=] --follow --reverse '
  + '--no-merges --merges --first-parent --abbrev-commit --date= -L= --left-right '
  + '--topo-order --date-order ';

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

// The global options git may carry before its subcommand: `-C <dir>` and the
// pager switches. `-c`/`--config-env` (config injection, and diff.external
// is config), `--exec-path`, `--git-dir` and the rest are not on it.
const GIT_GLOBAL_FLAGS = flagSpec('-C= --no-pager -P');

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
  rg: flagSpec('-n -N -i -S -s -w -x -v -l -c -F -o -u -H -I -U -e= -g= -t= -T= -A= -B= -C= '
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

// A token the shell rewrites before the binary sees it cannot be classified
// by reading it: `$'--pre'`, `"$X"`, `$(echo --pre=x)`, `{--pre=x,y}` and
// `\--pre` all become a flag this gate never saw. Refuse them. `$` and a
// backtick expand inside double quotes too; only single quotes hold them.
function hiddenFromTokenizer(raw) {
  if (/[$`]/.test(raw.replace(/'[^']*'/g, ''))) return true;
  return /[{\\]/.test(raw.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, ''));
}
const unquote = (raw) => raw.replace(/["']/g, '');

// Walk `tokens` (the arguments after the binary or subcommand) against
// `spec`. Returns true (refuse) on the first flag not on it.
function flagsMustBeRefused(tokens, spec) {
  for (let i = 0; i < tokens.length; i++) {
    if (hiddenFromTokenizer(tokens[i])) return true;
    const t = unquote(tokens[i]);
    if (t === '--') return tokens.slice(i + 1).some(hiddenFromTokenizer);
    if (!t.startsWith('-') || t === '-' || /^-\d+$/.test(t)) continue;
    if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      const kind = spec.get(eq === -1 ? t : t.slice(0, eq));
      if (!kind) return true;
      if (eq !== -1 && kind === 'bool') return true;
      if (eq === -1 && kind === 'val') i++;          // value is the next token
      continue;
    }
    for (let j = 1; j < t.length; j++) {             // a short cluster
      const kind = spec.get(`-${t[j]}`);
      if (!kind || kind === 'opt') return true;
      if (kind === 'val') {
        if (j === t.length - 1) i++;                 // value is the next token
        break;                                       // else the rest is the value
      }
    }
  }
  return false;
}

// `git [-C dir] [--no-pager|-P] <subcommand> <flags>`. The global walk is
// this gate's own, so `-c` and `--config-env` are refused in every position;
// parseGit (git-guard's reader) must still agree on the subcommand, so the
// two never disagree about what the subcommand IS.
function gitMustBeRefused(tokens, segment) {
  let i = 1;
  for (; i < tokens.length; i++) {
    if (hiddenFromTokenizer(tokens[i])) return true;
    const t = unquote(tokens[i]);
    if (!t.startsWith('-')) break;
    const kind = GIT_GLOBAL_FLAGS.get(t);
    if (!kind) return true;
    if (kind === 'val') i++;
  }
  const sub = i < tokens.length ? unquote(tokens[i]) : null;
  const spec = GIT_FLAGS.get(sub);
  const g = parseGit(segment);
  if (!spec || !g || g.sub !== sub) return true;
  return flagsMustBeRefused(tokens.slice(i + 1), spec);
}

// `find`: every dash token must be on FIND_ALLOWED_FLAGS; values pass.
function findMustBeRefused(tokens) {
  return tokens.slice(1).some((raw) => hiddenFromTokenizer(raw)
    || (unquote(raw).startsWith('-') && !FIND_ALLOWED_FLAGS.has(unquote(raw))));
}

// `sed`: only `sed -n <line range>p [files]`, the pager form a reviewer
// uses. The script is gated too, because sed's own language writes (`w`).
const SED_PRINT_RANGE = /^(?:(?:\d+|\$)(?:,(?:\d+|\$))?)?p$/;
function sedMustBeRefused(tokens) {
  let script = null;
  for (const raw of tokens.slice(1)) {
    if (hiddenFromTokenizer(raw)) return true;
    const t = unquote(raw);
    if (t.startsWith('-')) {
      if (!['-n', '--quiet', '--silent'].includes(t)) return true;
    } else if (script === null) {
      script = t;
    }
  }
  return script === null || !SED_PRINT_RANGE.test(script);
}

function argsMustBeRefused(bin, segment) {
  const tokens = tokenize(segment);
  if (bin === 'git') return gitMustBeRefused(tokens, segment);
  if (bin === 'find') return findMustBeRefused(tokens);
  if (bin === 'sed') return sedMustBeRefused(tokens);
  const spec = BINARY_FLAGS.get(bin);
  return !spec || flagsMustBeRefused(tokens.slice(1), spec);
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
    if (/^\s*[A-Za-z_][A-Za-z0-9_]*=/.test(seg)) return true; // env is config too
    if (argsMustBeRefused(bin, seg)) return true;

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
