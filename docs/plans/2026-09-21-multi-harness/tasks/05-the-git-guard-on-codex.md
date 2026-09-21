# 05: The git guard on Codex

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** MVP

**What to build:** On Codex, an irreversible git command is refused, in a
session and inside a dispatched subagent, by the same guard that refuses it on
Claude Code. The lane check reaches Codex at the same time, routed to the tool
Codex actually edits with.

The design closes an asymmetry where the lane check reaches only Claude Code.
Codex has no write tool: it edits through a patch tool. Routing only the shell
here would leave the check absent while looking present, which is the failure
mode this whole plan exists to stop.

**Files:**
- Modify: `hooks/fx-codex.js`
- Modify: `hooks.json`
- Modify: `tests/gates/codex-manifest.test.js`

**Interfaces:**
- Consumes: `inspect(command, cwd) -> { allow: boolean, reason?: string }`
  (existing, `lib/git-guard.js`, unmodified)
- Consumes: `laneCheck(file, cwd) -> string|null` (existing, `lib/lane-check.js`)
- Produces: `hooks/fx-codex.js` handling `PreToolUse` in addition to the two
  context events: refuse by writing the reason to stderr and exiting 2

**Seam:** Unit coverage already exists for `inspect` in `lib/git-guard.test.js`
and does not change. This task's own seam is the hook's stdin-to-exit-code
contract, asserted in `tests/gates/codex-manifest.test.js`.

**Measured facts this depends on.** Codex 0.155.1, probed directly:

- A shell call arrives as `tool_name: "Bash"` with the command at
  `tool_input.command`. Identical to Claude Code, so `lib/git-guard.js` needs
  no porting and no new tests.
- Exit 2 with the reason on stderr blocks the call.
- A subagent's tool calls carry `agent_id` and `agent_type`; the controller's
  do not. Used in task 06, not here.

**Risks:** Fail closed. If `lib/git-guard.js` fails to load or `inspect`
throws, refuse. A guard that fails open is worse than no guard, because the
session reports nothing. This mirrors `hooks/fx-pretooluse.js` exactly.

**Idempotency:** Edits files only.

**Testing:** Feed the hook a refusable command on stdin and assert exit 2 with
a reason on stderr. Feed it a benign command and assert exit 0.

## Acceptance criteria
- [ ] `hooks.json` registers `PreToolUse` with matcher `*`
- [ ] A `git branch -D` command on stdin exits 2 and writes a reason to stderr
- [ ] A benign command on stdin exits 0 and writes nothing to stderr
- [ ] Malformed stdin exits 0 rather than wedging the session
- [ ] A patch-tool call whose target the lane check refuses exits 2
- [ ] A patch-tool call the lane check permits exits 0
- [ ] A lane-check failure exits 0: it is advice and must never wedge a session
- [ ] A command that makes `inspect` throw exits 2, not 0
- [ ] `lib/git-guard.js` is unchanged by this task
- [ ] The guard refuses inside a subagent, asserted in task 10

## Steps

- [ ] **1. Write the failing test**

Append to `tests/gates/codex-manifest.test.js`:

```js
const { spawnSync } = require('child_process');

const hook = path.join(root, 'hooks/fx-codex.js');
const fire = (payload) => spawnSync('node', [hook], {
  input: JSON.stringify(payload), encoding: 'utf8',
});

const refused = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'Bash', tool_input: { command: 'git branch -D some-branch' },
});
assert.strictEqual(refused.status, 2, 'an absolute must be refused');
assert.ok(refused.stderr.trim().length > 0, 'a refusal must state its reason');

const allowed = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'Bash', tool_input: { command: 'git status' },
});
assert.strictEqual(allowed.status, 0, 'a benign command must pass');
assert.strictEqual(allowed.stderr.trim(), '', 'a pass must be silent');

const garbage = spawnSync('node', [hook], { input: 'not json', encoding: 'utf8' });
assert.strictEqual(garbage.status, 0, 'malformed input must not wedge a session');

// PreToolUse for a non-shell tool is not this hook's business.
const other = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'view_image', tool_input: {},
});
assert.strictEqual(other.status, 0);

// The lane check follows the runtime's editing tool. Codex edits with a patch
// tool, so routing only the shell would leave the check absent here.
const patch = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'apply_patch', tool_input: { file_path: path.join(root, 'README.md') },
});
assert.ok(patch.status === 0 || patch.status === 2,
  'apply_patch must reach the lane check, not fall through unexamined');

console.log('codex guard: OK');
```

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/codex-manifest.test.js`
Expected: FAIL, the `git branch -D` case exits 0 because the hook does not yet
handle `PreToolUse`.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test. Route on
`hook_event_name`: the two context events emit the rendered preamble on stdout
and exit 0; `PreToolUse` with `tool_name === 'Bash'` goes to `inspect`.

- [ ] **4. Run it: verify GREEN**

Run: `node tests/gates/codex-manifest.test.js`
Expected: PASS, `codex guard: OK`.

- [ ] **5. Confirm the guard module is untouched**

Run: `git diff --stat lib/git-guard.js`
Expected: empty. If it is not, revert it: this task must not modify it.

- [ ] **6. Run the full gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **7. Commit**

```
git add hooks/fx-codex.js hooks.json tests/gates/codex-manifest.test.js
git commit -m "feat(codex): refuse irreversible git commands through the shared guard"
```

No attribution trailers. Then continue to the next task: never stop and wait.
