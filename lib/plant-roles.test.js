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
assert.strictEqual(isWritingToolCall('Bash', { command: 'cmd 2>&1 | grep x' }), false,
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

console.log('plant-roles.test.js: OK');
