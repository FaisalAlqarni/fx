'use strict';
// Seam: the planter, tested directly against a temporary home (task 06).
// Enforcement is tested at the hook's stdin-to-exit-code contract instead,
// in tests/gates/codex-manifest.test.js — see that file for why.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Fixed from the task-supplied version: it destructured `plantRoles` and
// `isLensAgent` here, then required `READ_ONLY_AGENTS`/`isReadOnlyAgent` in a
// SECOND `require('./plant-roles')` lower in the file while already using
// `READ_ONLY_AGENTS` inside the loop above it. `const` is block-scoped with a
// temporal dead zone: referencing it before its own declaration line throws
// `ReferenceError: Cannot access 'READ_ONLY_AGENTS' before initialization`,
// regardless of where in the file the later `const` sits. `isLensAgent` was
// also never the real export (`isReadOnlyAgent` is, per the task's own
// Interfaces section) and was never called. One `require` up top, correct
// names, fixes both.
const { plantRoles, READ_ONLY_AGENTS, isReadOnlyAgent } = require('./plant-roles');

const source = path.join(__dirname, '..', 'codex', 'agents');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-home-'));

const expected = fs.readdirSync(source).filter((f) => f.endsWith('.toml')).length;
assert.ok(expected >= 5, 'the generator must have produced roles');

const first = plantRoles({ home, source });
assert.strictEqual(first.written.length, expected, 'every generated role is planted');
assert.strictEqual(first.skipped.length, 0);
for (const p of first.written) {
  const base = path.basename(p, '.toml');
  assert.ok(READ_ONLY_AGENTS.includes(base), `wrote a name fx does not generate: ${p}`);
  assert.ok(fs.readFileSync(p, 'utf8').includes('sandbox_mode = "read-only"'));
}

const second = plantRoles({ home, source });
assert.strictEqual(second.written.length, 0, 'planting is idempotent');
assert.strictEqual(second.skipped.length, expected);

const victim = first.written[0];
fs.writeFileSync(victim, 'name = "tampered"\n');
const third = plantRoles({ home, source });
assert.deepStrictEqual(third.stale, [victim], 'a changed file is reported');
assert.ok(fs.readFileSync(victim, 'utf8').includes('sandbox_mode'), 'and restored');

// An unrelated role is never touched.
const bystander = path.join(home, 'agents', 'my-own-role.toml');
fs.writeFileSync(bystander, 'name = "mine"\n');
plantRoles({ home, source });
assert.strictEqual(fs.readFileSync(bystander, 'utf8'), 'name = "mine"\n');

assert.ok(READ_ONLY_AGENTS.includes('fx-lens-security'));
assert.ok(READ_ONLY_AGENTS.includes('fx-devils-advocate'),
  'the devils advocate is read-only on Claude Code and must be here too');
assert.strictEqual(isReadOnlyAgent('fx-lens-security'), true);
assert.strictEqual(isReadOnlyAgent('fx-devils-advocate'), true);
assert.strictEqual(isReadOnlyAgent('default'), false);
assert.strictEqual(isReadOnlyAgent(undefined), false);

fs.rmSync(home, { recursive: true, force: true });

// --- Subagent identity: session-scoped, under the OS temp area, keyed by
// agent_id. Never in the user's repository.
const { recordAgentIdentity, lookupAgentIdentity, identityDir } = require('./plant-roles');

const scope = `test-${process.pid}-${Date.now()}`;
const dir = identityDir(scope);
assert.ok(
  path.resolve(dir).startsWith(path.resolve(os.tmpdir())),
  'the identity store must live under the OS temp area, never the repository'
);
assert.strictEqual(lookupAgentIdentity('never-recorded', scope), null,
  'an id never recorded classifies as null, not a crash');

recordAgentIdentity({ agentId: 'sub-1', agentType: 'fx-lens-security', scope });
assert.strictEqual(lookupAgentIdentity('sub-1', scope), 'fx-lens-security');

// Concurrent subagents: each write lands at its own path, so two recordings
// for different ids cannot race each other destructively.
recordAgentIdentity({ agentId: 'sub-2', agentType: 'default', scope });
assert.strictEqual(lookupAgentIdentity('sub-1', scope), 'fx-lens-security',
  'recording a second id must not disturb the first');
assert.strictEqual(lookupAgentIdentity('sub-2', scope), 'default');

fs.rmSync(dir, { recursive: true, force: true });

// --- Write detection: every way a Bash command or apply_patch call writes.
const { isWritingToolCall } = require('./plant-roles');

assert.strictEqual(isWritingToolCall('Bash', { command: 'grep -rn TODO .' }), false,
  'a read must not be flagged as a write');
assert.strictEqual(isWritingToolCall('Bash', { command: 'echo x > evidence.txt' }), true,
  'shell redirection is a write');
assert.strictEqual(isWritingToolCall('Bash', { command: 'rm -rf build/' }), true,
  'a write binary is a write even with no redirection');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git commit -m x' }), true,
  'a mutating git subcommand is a write');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git status' }), true,
  'task 14 round 5: a read-only agent runs no git at all on Codex');
assert.strictEqual(isWritingToolCall('apply_patch', {}), true,
  'apply_patch is Codex\'s only edit tool: every call writes, unconditionally');

// `2>&1` duplicates a file descriptor and never touches the filesystem, but
// task 14 fix round 4 refuses every unquoted `>` and `&` (a character
// allowlist, not a list of safe operators). Codex returns stderr with the
// output anyway, so a lens loses nothing by dropping it.
assert.strictEqual(isWritingToolCall('Bash', { command: 'echo hi 2>&1' }), true,
  'fd duplication is refused: `>` and `&` are outside the token grammar');
assert.strictEqual(isWritingToolCall('Bash', { command: 'grep -c TODO file.txt 2>&1 | cat' }), true,
  'fd duplication ahead of a pipe is refused the same way');
assert.strictEqual(isWritingToolCall('Bash', { command: 'cd /tmp && echo x > f.txt' }), true,
  'a real redirect after && must still be caught');

// A `>` inside a QUOTED argument is data — a search pattern, a grep target —
// not a shell redirect operator. Every lens greps for arbitrary strings in
// someone else's code; a security or pipeline lens grepping for `=>` or `a >
// b` must not be refused for a write it never asked to do.
assert.strictEqual(isWritingToolCall('Bash', { command: 'grep -rn "a > b" file.js' }), false,
  'a > inside a quoted grep pattern is not a redirect');
assert.strictEqual(isWritingToolCall('Bash', { command: 'grep -rn "=>" file.js' }), false,
  'an arrow inside a quoted grep pattern is not a redirect');
assert.strictEqual(isWritingToolCall('Bash', { command: 'echo "no redirect here" > real.txt' }), true,
  'a real redirect outside the quotes must still be caught' );

// --- Fix round 1: a denylist over shell text is unwinnable. bash -c, sh -c,
// python3 -c, node -e, curl -o, wget, eval and command substitution all
// wrote to disk with NO listed write binary and NO top-level redirect in
// the outer command, so the round-1 denylist never saw any of them. The fix
// is an ALLOWLIST: a lens may only run a small, known set of read/search/
// inspect binaries (lib/plant-roles.js's ALLOWED_BINARIES, enumerated from
// what agents/fx-lens-*.md and agents/fx-devils-advocate.md actually say
// they do). Anything else is refused for not being on the list, which is
// what closes every interpreter and wrapper below WITHOUT naming any of
// them individually.
assert.strictEqual(isWritingToolCall('Bash', { command: 'bash -c "echo pwned > evidence.txt"' }), true,
  'bash -c is not on the allowlist, whatever its argument does');
assert.strictEqual(isWritingToolCall('Bash', { command: 'sh -c "echo pwned > evidence.txt"' }), true,
  'sh -c is not on the allowlist either');
assert.strictEqual(isWritingToolCall('Bash', { command: 'python3 -c "open(1)"' }), true,
  'no general-purpose interpreter is on the allowlist');
assert.strictEqual(isWritingToolCall('Bash', { command: 'node -e "1"' }), true,
  'node -e is refused the same way, without node ever being named as bad');
assert.strictEqual(isWritingToolCall('Bash', { command: 'bash -c "rm evidence.txt"' }), true,
  'bash -c wrapping an already-denylisted command is still refused');
assert.strictEqual(isWritingToolCall('Bash', { command: 'curl -o out.txt https://example.com' }), true,
  'curl -o writes a file; curl is not on the allowlist');
assert.strictEqual(isWritingToolCall('Bash', { command: 'curl -O https://example.com/file' }), true,
  'curl -O writes a file named from the URL');
assert.strictEqual(isWritingToolCall('Bash', { command: 'wget https://example.com/file' }), true,
  'wget is not on the allowlist');
assert.strictEqual(isWritingToolCall('Bash', { command: 'eval "echo pwned > evidence.txt"' }), true,
  'eval is not on the allowlist, whatever string it is given');

// Command substitution: the write is not the first word of any top-level
// segment, it is buried inside `$(...)`. The allowlist walk must recurse
// into a substitution body the same way it recurses into a bash -c payload.
assert.strictEqual(isWritingToolCall('Bash', { command: 'echo $(rm -rf /tmp/x)' }), true,
  '$(...) command substitution is walked, not just the outer command');
assert.strictEqual(isWritingToolCall('Bash', { command: 'echo `rm -rf /tmp/x`' }), true,
  'backtick substitution is walked the same way');
assert.strictEqual(isWritingToolCall('Bash', { command: 'echo "$(cat file.txt > evidence.txt)"' }), true,
  'a substitution body still hides a real redirect even when the whole thing sits inside quotes');

// The suite must not pass by refusing everything: git status and a plain
// grep are the same "must stay allowed" cases as above, repeated here next
// to the bypass cases so an over-tight allowlist (e.g. one that also
// swallowed `git`) fails this file instead of passing it silently.
assert.strictEqual(isWritingToolCall('Bash', { command: 'git status' }), true,
  'task 14 round 5: git is no longer an allowed binary');
assert.strictEqual(isWritingToolCall('Bash', { command: 'find . -name "*.rb"' }), false,
  'find without -exec/-delete is a read and must still be allowed');
assert.strictEqual(isWritingToolCall('Bash', { command: 'find . -exec rm {} \\;' }), true,
  'find -exec is find\'s own write side channel: a second gate, same idea as git\'s');

// --- Fix round 2: the allowlist over BINARIES held; the gates INSIDE two
// allowlisted binaries (git, find) were still denylists, and denylists over
// a subcommand/action space this large are the identical mistake one level
// down. `git` alone has well over a hundred subcommands; enumerating the
// writing ones is incomplete the day it's written. Both are now allowlists
// too: GIT_ALLOWED_SUBCOMMANDS and FIND_ALLOWED_FLAGS. `tree` is dropped
// from ALLOWED_BINARIES entirely rather than given a third gate — no agent
// body calls for it, and a lens that can't run `tree` can still use `find`
// or `ls`.
assert.strictEqual(isWritingToolCall('Bash', { command: 'git config user.name pwned' }), true,
  'git config can rewrite repo config; config is not a read subcommand');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git clone /tmp/x /tmp/pwned' }), true,
  'git clone writes a whole new working tree');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git archive --output=/tmp/o.tar HEAD' }), true,
  'git archive writes a file via --output');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git worktree add /tmp/wt HEAD' }), true,
  'git worktree add writes a new worktree directory');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git am /tmp/patch' }), true,
  'git am applies a patch to the repo');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git bundle create /tmp/b.bundle HEAD' }), true,
  'git bundle create writes a file');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git format-patch -1' }), true,
  'git format-patch writes .patch files to disk');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git hash-object -w file.txt' }), true,
  'git hash-object -w writes a new object into .git');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git update-ref refs/heads/x HEAD' }), true,
  'git update-ref writes a ref');
assert.strictEqual(isWritingToolCall('Bash', { command: 'find . -fprint /tmp/o.txt' }), true,
  '-fprint writes matches to a file; not on the find allowlist');
assert.strictEqual(isWritingToolCall('Bash', { command: 'find . -fls /tmp/o.txt' }), true,
  '-fls writes ls -l style output to a file; not on the find allowlist');
assert.strictEqual(isWritingToolCall('Bash', { command: 'tree -o /tmp/o.txt' }), true,
  'tree is not on ALLOWED_BINARIES at all anymore: dropped, not gated');

// Reads that must stay allowed, spanning the specific subcommands/flags a
// lens actually needs, so a too-narrow allowlist fails this file too.
assert.strictEqual(isWritingToolCall('Bash', { command: 'git log --oneline -5' }), true,
  'task 14 round 5: git log --oneline -5 is refused, git is not an allowed binary');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git diff' }), true,
  'task 14 round 5: git diff is refused, git is not an allowed binary');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git show HEAD' }), true,
  'task 14 round 5: git show HEAD is refused, git is not an allowed binary');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git blame file.js' }), true,
  'task 14 round 5: git blame file.js is refused, git is not an allowed binary');
assert.strictEqual(isWritingToolCall('Bash', { command: 'cat README.md' }), false,
  'cat must stay allowed');

// --- Fix round 3: `diff`, `log` and `show` are legitimately read-only
// git subcommands; the FLAG is what writes. `--output`/`--output=<path>`
// write the command's own output to a file instead of stdout, on log,
// show and diff alike.
assert.strictEqual(isWritingToolCall('Bash', { command: 'git diff --output=/tmp/pwned.diff' }), true,
  '--output= writes a file even on an allowed subcommand');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git diff --output /tmp/x' }), true,
  '--output (space form) is the same flag');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git show --output=/tmp/x' }), true,
  '--output= on git show writes a file too');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git log --output=/tmp/x' }), true,
  '--output= on git log writes a file too');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git log --oneline -5' }), true,
  'task 14 round 5: git is refused whatever its flags');

// --- Task 14 fix round 2: git's parse-options accepts any unambiguous
// prefix of a long option, and a short option's value attached. So the rule
// is git's, not a list of spellings: any `--` prefix of `--output` at least
// `--out` long, with or without `=value`, and `-o` with its value attached.
for (const command of [
  'git diff --out=/tmp/evil HEAD~1',
  'git diff --outp=/tmp/e',
  'git diff --outpu=/tmp/e',
  'git diff -o/tmp/e',
  'git diff --out /tmp/e',
]) {
  assert.strictEqual(isWritingToolCall('Bash', { command }), true, `an abbreviated --output writes: ${command}`);
}
assert.strictEqual(isWritingToolCall('Bash', { command: 'git log --oneline' }), true,
  'task 14 round 5: git is refused whatever its flags');

// --- Task 14 fix round 3: a per-binary FLAG allowlist. Every path below was
// measured (or is named by the coordinator's ruling) as running a command or
// writing a file while the round-2 classifier cleared it. Each must be
// refused, and each is pinned here by name so widening a list cannot quietly
// re-open it.
for (const command of [
  // measured: each ran a marker command in a scratch repo
  'git -c diff.external=touch diff',
  'git grep -Otouch x',
  'rg --pre touch x .',
  // git config injection, in every global-option position
  'git -c core.pager=touch log',
  'git -C . -c diff.external=touch diff',
  'git --config-env=diff.external=X diff',
  'git --config-env diff.external=X diff',
  'git -cdiff.external=touch diff',
  // git flags that run commands
  'git diff --ext-diff',
  'git log --textconv',
  'git show --textconv HEAD',
  'git grep -O touch x',
  'git grep --open-files-in-pager=touch x',
  'git grep --open-files-in-pager touch x',
  // rg preprocessors
  'rg --pre=touch x',
  "rg --pre-glob '*' --pre touch x",
  'rg --pre-glob=* x',
  // file compiles a magic database, which writes a .mgc file
  'file -C -m foo',
  'file -C',
  // the environment is config too: a leading assignment reaches git/rg
  'GIT_EXTERNAL_DIFF=touch git diff',
  'RIPGREP_CONFIG_PATH=/tmp/x rg foo',
  // a flag hidden from the tokenizer by quoting or expansion
  "rg '--pre=touch' x",
  "rg $'--pre=touch' x",
  'rg \\--pre=touch x',
  'rg $(echo --pre=touch) x',
  'rg `echo --pre=touch` x',
  'rg {--pre=touch,x} y',
  // abbreviations of long flags are refused, not resolved
  'git diff --stat=1 --ext',
  'git diff --sta',
  // a flag on no list
  'cat --unknown f',
  'sed -i s/a/b/ f',
  "sed -n '1w /tmp/x' f",
  'sed -n 1,40w/tmp/x f',
]) {
  assert.strictEqual(isWritingToolCall('Bash', { command }), true, `must be refused: ${command}`);
}

// ...and the ordinary read-only review vocabulary stays cleared.
for (const command of [
  'rg -n pattern',
  'rg -n -g "*.js" pattern lib',
  'grep -rn x .',
  "grep -rn --include='*.rb' x .",
  'grep -A3 -n x f',
  'sed -n 1,40p f',
  "sed -n '10,$p' f",
  'cat f',
  'head -n 40 f',
  'tail -20 f',
  'wc -l f',
  "find . -name '*.js'",
  'ls -la',
  'file f',
]) {
  assert.strictEqual(isWritingToolCall('Bash', { command }), false, `must stay cleared: ${command}`);
}

// --- Task 14 fix round 4: a token CHARACTER allowlist. Four review passes
// each found one more bash feature that ran a command or wrote a file
// through a cleared command. The ruling: allowlist safe syntax instead of
// enumerating dangerous syntax. Every token must be an unquoted word of
// [A-Za-z0-9._/:@=,+%^-] (plus `~` mid-word), a single-quoted literal, or a
// double-quoted string with no `$`, backtick or backslash. Only `|`, `&&`
// and `||` separate commands. Nothing may change which repository git reads.
for (const command of [
  // live-confirmed in earlier passes
  'cat <(touch pwned)',
  'git -C nested.git diff',
  'git log --grep {x,--output=/tmp/p}',
  'rg needle *',
  // process substitution, both directions
  'diff <(touch x) <(echo y)',
  'cat >(touch x)',
  // brace expansion in a value-flag position
  'rg -g {x,--pre=touch} y',
  'git -C {x,-cfoo} log',
  // globs and tilde
  'grep -rn --include=*.rb x .',
  'rg -g *.js foo',
  'cat f?',
  'cat [a]',
  'cat ~/x',
  'git log --since=~/x',
  // separators other than | && ||
  'echo a; touch x',
  'cat f & touch x',
  'cat f\ntouch x',
  // ...even when every command in it is cleared: the grammar has no `;`
  'cat a; cat b',
  'cat a & cat b',
  'cat a\ncat b',
  // anything that changes which repository git reads
  'cd sub && git log',
  'pushd sub',
  'popd',
  'git --git-dir=x log',
  'git --git-dir x log',
  'git --work-tree=x status',
  'git --namespace=x log',
  'git -C . status --short',
  'GIT_DIR=x git log',
  // expansions, quoted or not
  'find . -name "*$(touch x)*"',
  'cat "$HOME"',
  'cat "`touch x`"',
  'cat "a\\"b"',
  'cat $HOME',
  // backslash escapes and other metacharacters
  'cat \\>x',
  'cat f\\ g',
  'cat !x',
  'cat f#',
  'cat "unterminated',
  "cat 'unterminated",
  'cat\tf',
  // a relative path runs a file from the reviewed tree, not the allowed binary
  './cat f',
  'bin/rg x',
  // zsh extended glob: a leading ^ negates a pattern and can expand to files
  'cat ^x',
  'cat dir/^x',
  // the value-skip is exactly one token: the flag after a value is checked
  'git log --grep x --ext-diff',
  // git's -U/--unified take an OPTIONAL value, attached only: the next word
  // is a flag to git, so it must be checked as one (measured: ran diff.external)
  'git diff -U --ext-diff',
  'git diff --unified --ext-diff',
  'git log -p -U --ext-diff',
  'git show --unified --ext-diff',
]) {
  assert.strictEqual(isWritingToolCall('Bash', { command }), true, `round 4 must refuse: ${command}`);
}

for (const command of [
  "grep -E 'a|b' f",
  'rg "a|b" src',
  "rg -g '*.js' foo",
  "find . -name '*.test.js'",
  'rg -p foo',
  'sed -n 1,40p f',
  'cat f | grep x',
  'rg "a;b" src',
  "cat 'a'\"b\"c",
  'cat a~1 b^2 c^^',
]) {
  assert.strictEqual(isWritingToolCall('Bash', { command }), false, `round 4 must stay cleared: ${command}`);
}
assert.strictEqual(isWritingToolCall('Bash', { command: 'cat f || cat g' }), false,
  '|| separates two cleared segments');
assert.strictEqual(isWritingToolCall('Bash', { command: 'cat f || touch g' }), true,
  'each segment after || is checked on its own');

// --- Task 14 fix round 5: git is taken away from read-only agents on Codex.
// Every exec path left was git reading config it does not control
// (diff.external, textconv, core.fsmonitor, a nested repo reached through the
// shell tool's `workdir`, which the hook never sees). A lens reviews from the
// diff it is handed. Every git case that was cleared before is refused now.
for (const command of [
  'git diff',
  'git log --oneline',
  'git status',
  '/usr/bin/git show x',
  'git --no-pager log',
  'cat f | git log',
  'git diff HEAD~1',
  'git diff --stat',
  'git diff --name-only HEAD~1 -- lib/',
  'git log --oneline -20',
  'git log -n 5 --format=%H',
  'git show 4ed9223',
  'git status --short',
  'git grep -n foo',
  'git diff -W HEAD~1',
  'git diff --function-context HEAD~1',
  'git diff --color-words HEAD~1',
  'git log --no-walk HEAD',
  "git log --format='%h %s' -5",
  'git diff -U5 HEAD~1',
  'git diff --unified=5 HEAD~1',
  'git diff -U HEAD~1',
  "git log -p 'HEAD@{1}'",
  'git log HEAD^..HEAD',
  'git diff HEAD~1 HEAD~2',
  'git status && git log -1',
  "git log --grep 'a b' --oneline",
]) {
  assert.strictEqual(isWritingToolCall('Bash', { command }), true, `round 5 must refuse git: ${command}`);
}

// --- Task 10: auditRoles reports, never repairs; hooksTrusted never guesses.
const { auditRoles, hooksTrusted } = require('./plant-roles');

const home2 = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-audit-'));
const empty = auditRoles({ home: home2, source });
assert.strictEqual(empty.present.length, 0);
assert.strictEqual(empty.missing.length, expected, 'an empty home is all missing');
assert.strictEqual(empty.stale.length, 0);

plantRoles({ home: home2, source });
const full = auditRoles({ home: home2, source });
assert.strictEqual(full.present.length, expected);
assert.strictEqual(full.missing.length, 0);
assert.strictEqual(full.stale.length, 0);

// Reporting must not repair.
const target = path.join(home2, 'agents', `${READ_ONLY_AGENTS[0]}.toml`);
fs.writeFileSync(target, 'name = "tampered"\n');
const drifted = auditRoles({ home: home2, source });
assert.deepStrictEqual(drifted.stale.map((p) => path.basename(p, '.toml')), [READ_ONLY_AGENTS[0]]);
assert.strictEqual(fs.readFileSync(target, 'utf8'), 'name = "tampered"\n',
  'auditRoles must report, never repair');

// An unrelated role belongs to none of the three lists.
fs.writeFileSync(path.join(home2, 'agents', 'someone-elses.toml'), 'name = "theirs"\n');
const after = auditRoles({ home: home2, source });
const all = [...after.present, ...after.missing, ...after.stale].map((p) => path.basename(p, '.toml'));
assert.ok(!all.includes('someone-elses'), 'fx reports only on what it generates');

// auditRoles writes NOTHING: every path under the home, its type (file/dir),
// and every file's content, is identical before and after a run -- not just
// the one tampered file above. A snapshot taken over the WHOLE tree is what
// catches a repair hiding anywhere else in it (a stray mkdir, a second file
// touched, a permission changed), which asserting on one path never would.
function snapshotHome(dir) {
  const rows = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) { rows.push(`D ${p}`); walk(p); }
      else rows.push(`F ${p} ${fs.readFileSync(p, 'utf8')}`);
    }
  };
  walk(dir);
  return rows.join('\n');
}
const before = snapshotHome(home2);
auditRoles({ home: home2, source });
const afterSnapshot = snapshotHome(home2);
assert.strictEqual(afterSnapshot, before, 'auditRoles must leave the home byte-identical');

assert.strictEqual(hooksTrusted({ home: fs.mkdtempSync(path.join(os.tmpdir(), 'fx-notrust-')) }), null,
  'an unknown shape is null, never a confident false');

fs.rmSync(home2, { recursive: true, force: true });

console.log('audit-roles: OK');

console.log('plant-roles.test.js: OK');

// Task 17 (amendment A5): on Codex a read-only role KEEPS the shell. Codex has
// no Read, Grep or Glob tool, so a role with shell_tool off could not read the
// diff it was given. The PreToolUse hook's classifier is the enforcement.
{
  const rolesDir = path.join(__dirname, '..', 'codex', 'agents');
  for (const f of fs.readdirSync(rolesDir).filter((n) => n.endsWith('.toml'))) {
    const t = fs.readFileSync(path.join(rolesDir, f), 'utf8');
    assert.ok(!/^\[features\]/m.test(t) && !/shell_tool/.test(t), `${f} keeps the shell`);
    for (const k of ['name', 'description', 'developer_instructions']) {
      assert.match(t, new RegExp(`^${k} = `, 'm'), `${f} keeps ${k} at top level`);
    }
  }
  // The read-only set by name, not every agent file: a writable agent added
  // later must not have to drop its shell to pass this.
  const agentsDir = path.join(__dirname, '..', 'agents');
  for (const name of READ_ONLY_AGENTS) {
    const t = fs.readFileSync(path.join(agentsDir, `${name}.md`), 'utf8');
    assert.match(t, /^tools: Read, Grep, Glob$/m, `${name} has no shell on Claude Code`);
  }
  // The Codex enforcement: the classifier refuses a shell write and the patch tool.
  const { isWritingToolCall } = require('./plant-roles');
  assert.strictEqual(isWritingToolCall('Bash', { command: 'echo probe > lens-shell.txt' }), true, 'shell redirect refused');
  assert.strictEqual(isWritingToolCall('Bash', { command: 'touch lens-shell.txt' }), true, 'unlisted binary refused');
  assert.strictEqual(isWritingToolCall('apply_patch', { command: '*** Begin Patch\n*** End Patch\n' }), true, 'patch refused');
  assert.strictEqual(isWritingToolCall('Bash', { command: 'cat review.diff' }), false, 'reading the diff file is allowed');
  console.log('read-only role shape: passed');
}

// Carried from task 14. A value-taking flag skips exactly one word, its
// value. These pin both skip sites in flagsMustBeRefused (the long form and
// the short cluster): if either skipped two words, `--pre=touch` would be
// read as the value of `--glob`/`-g` and cleared.
{
  const { isWritingToolCall } = require('./plant-roles');
  assert.strictEqual(isWritingToolCall('Bash', { command: 'rg --glob x --pre=touch a .' }), true,
    'the word after a long value is a flag again');
  assert.strictEqual(isWritingToolCall('Bash', { command: 'rg -g x --pre=touch a .' }), true,
    'the word after a short value is a flag again');
  // zsh expands an unquoted word starting with `=` to a path on $PATH
  // (`=cat` becomes `/usr/bin/cat`), so the binary would see a word this
  // classifier never read. Quoted, it is a literal in every shell.
  assert.strictEqual(isWritingToolCall('Bash', { command: 'cat =x' }), true, 'zsh =name refused');
  assert.strictEqual(isWritingToolCall('Bash', { command: 'grep -e =x a' }), true, 'zsh =name refused as a value too');
  assert.strictEqual(isWritingToolCall('Bash', { command: "cat '=x'" }), false, 'a quoted = is a literal');
  assert.strictEqual(isWritingToolCall('Bash', { command: 'grep --include=a.js x .' }), false,
    'an = inside a word is not a word starting with =');
  console.log('value skip and zsh =name: passed');
}
