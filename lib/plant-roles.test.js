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
assert.strictEqual(isWritingToolCall('Bash', { command: 'git status' }), false,
  'a read-only git subcommand is not a write');
assert.strictEqual(isWritingToolCall('apply_patch', {}), true,
  'apply_patch is Codex\'s only edit tool: every call writes, unconditionally');

// `2>&1` (and `1>&2`, `&>`-adjacent forms) duplicate a file descriptor; they
// never touch the filesystem. git-guard's splitSegments treats a bare `&` as
// a command separator (for backgrounding), which — if redirection were
// tested per split segment — severs `2>&1` into `2>` (now falsely looking
// like a real redirect) and `1`. Testing redirection against the
// heredoc-stripped WHOLE command, before any segment split, is what avoids
// this: the `(?!&)` lookahead only works if the `&` is still there to see.
assert.strictEqual(isWritingToolCall('Bash', { command: 'echo hi 2>&1' }), false,
  'fd duplication is not a write');
assert.strictEqual(isWritingToolCall('Bash', { command: 'grep -c TODO file.txt 2>&1 | cat' }), false,
  'fd duplication ahead of a pipe is still not a write');
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
assert.strictEqual(isWritingToolCall('Bash', { command: 'git status' }), false,
  'a read-only git subcommand must still be allowed after the allowlist inversion');
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
assert.strictEqual(isWritingToolCall('Bash', { command: 'git log --oneline -5' }), false,
  'git log must stay allowed');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git diff' }), false,
  'git diff must stay allowed — named explicitly in agents/fx-lens-database.md');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git show HEAD' }), false,
  'git show must stay allowed');
assert.strictEqual(isWritingToolCall('Bash', { command: 'git blame file.js' }), false,
  'git blame must stay allowed');
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
assert.strictEqual(isWritingToolCall('Bash', { command: 'git log --oneline -5' }), false,
  '--oneline is not --output: an allowed subcommand with an unrelated flag must stay allowed');

console.log('plant-roles.test.js: OK');
