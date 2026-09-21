# 06: Read-only agents on Codex

**Status:** ready-for-agent
**Blocked by:** 04, 05
**Phase:** Core

**What to build:** Every read-only review agent exists on Codex and cannot
write to the repository. Each role is generated from its Claude Code
definition, planted into the user's Codex home by any of three callers, and
enforced by the guard hook, which **fails closed**.

**There are six read-only agents and only five are named `fx-lens-*`.**
`agents/fx-devils-advocate.md` carries the same `tools: Read, Grep, Glob, Bash`
restriction for the same reason. A prefix match on `fx-lens-` would leave it
writable on Codex while read-only on Claude Code. Derive the set from
`agents/*.md` by reading the `tools:` line; never hardcode a count and never
match a prefix.

**Files:**
- Create: `scripts/gen-codex-agents`
- Create: `codex/agents/fx-lens-*.toml`  (generated, committed)
- Create: `lib/plant-roles.js`
- Create: `lib/plant-roles.test.js`
- Create: `scripts/check-generated`
- Modify: `hooks/fx-codex.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `agents/*.md` whose frontmatter `tools:` grants no write tool
  (five `fx-lens-*` plus `fx-devils-advocate`)
- Produces: `plantRoles({ home, source }) -> { written: string[], skipped: string[], stale: string[] }`
  - `home` defaults to `$CODEX_HOME` or `~/.codex`
  - writes only files matching `fx-lens-*.toml`
  - idempotent: identical content is `skipped`, changed content is rewritten
    and reported in `stale`
- Produces: `READ_ONLY_AGENTS -> string[]`, generated alongside the TOMLs and
  exported from `lib/plant-roles.js`
- Produces: `isReadOnlyAgent(agentType) -> boolean`, membership of that list.
  Not a prefix test.

**Seam:** `lib/plant-roles.test.js` for the planter, plain node. Enforcement at
the hook's stdin-to-exit-code contract, in
`tests/gates/codex-manifest.test.js`. End-to-end in task 10.

**Measured facts this depends on.** Codex 0.155.1, probed directly:

- A custom role in `~/.codex/agents/<name>.toml` **resolves**: `spawn_agent`
  accepted `agent_type: "fx-lens-probe"`. It resolves from a repository's
  `.codex/agents/` too; user scope is chosen because a lens is a fact about fx,
  not about any repository.
- `sandbox_mode = "read-only"` in a role file **did not prevent the write**.
  The spawned subagent created the file. The role file is identity and
  instructions; **the hook is the enforcement**. ADR 0019.
- `agent_type` carries the custom role name into `PreToolUse` on the subagent's
  own tool calls. **It is undocumented for that event**, and documented for
  `SubagentStart` and `SubagentStop`.

**Therefore enforcement fails closed.** Relying on the tool event alone fails
open: a release that stops sending the field turns every read-only agent back
into prose, silently. Instead, record the identity at `SubagentStart`, where the
field is documented, into a session-scoped file keyed by `agent_id`. At
`PreToolUse`, a call carrying an `agent_id` that is not classifiable is refused
if it writes. A subagent fx cannot identify does not get to edit.
- `spawn_agent`'s `message` argument reaches the hook **encrypted**, so no
  content-based routing is possible. Identity is the only discriminator.

**The generated TOML shape.** Matches what ships in production today:

```toml
name = "fx-lens-security"
description = "<the description field from the Claude Code definition>"
sandbox_mode = "read-only"

developer_instructions = """
<the body of the Claude Code definition>
"""
```

`sandbox_mode` is written even though it does not enforce: it is correct
intent, it is what the documentation asks for, and it costs nothing if a later
release starts honouring it.

**Risks:** This task writes into the user's Codex home. Confine every write to
the `fx-lens-` prefix, never delete a file the planter did not write, and make
re-running safe. A planter that clobbers an unrelated role is worse than one
that does nothing.

**Idempotency:** `plantRoles` compares content before writing and reports
rather than rewriting blindly. Running it a hundred times leaves the same six
files. The generator rewrites `codex/agents/` deterministically, so
regeneration produces a byte-identical tree and `scripts/check-generated`
compares the two.

**Testing:** Unit for the planter against a temporary home. Hook-contract test
for enforcement. Drift gate for the generator.

## Acceptance criteria
- [ ] `scripts/gen-codex-agents` produces one TOML per read-only agent in `agents/`, derived from the `tools:` line
- [ ] `fx-devils-advocate` is among them
- [ ] No test or script hardcodes the number of agents
- [ ] Each generated file carries a generated-file header naming its source
- [ ] Each generated file sets `sandbox_mode = "read-only"`
- [ ] Running the generator twice produces identical bytes
- [ ] `scripts/check-generated` fails when a committed TOML differs from a fresh generation
- [ ] `plantRoles` into an empty temporary home writes one file per generated role
- [ ] Running `plantRoles` again reports them all as `skipped` and writes nothing
- [ ] Changing one planted file and re-running reports it as `stale` and restores it
- [ ] `plantRoles` only writes names present in `READ_ONLY_AGENTS`
- [ ] A `PreToolUse` payload with `agent_type: "fx-lens-security"` and a writing command exits 2
- [ ] A `PreToolUse` payload with `agent_type: "fx-devils-advocate"` and a writing command exits 2
- [ ] A payload with no `agent_id` at all exits 0: the controller is not a subagent
- [ ] A payload carrying an `agent_id` never seen at `SubagentStart`, with a writing command, exits 2: unclassifiable means refused
- [ ] `SubagentStart` records `agent_id` to `agent_type` in a session-scoped file
- [ ] That file is written under the runtime's own temporary area, never in the user's repository
- [ ] A `PreToolUse` payload with `agent_type: "fx-lens-security"` and a read-only command exits 0
- [ ] `hooks/fx-codex.js` calls `plantRoles` on `SessionStart` and never lets a planting failure stop the session

## Steps

- [ ] **1. Write the failing test**

```js
// lib/plant-roles.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { plantRoles, isLensAgent } = require('./plant-roles');

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

const { READ_ONLY_AGENTS, isReadOnlyAgent } = require('./plant-roles');
assert.ok(READ_ONLY_AGENTS.includes('fx-lens-security'));
assert.ok(READ_ONLY_AGENTS.includes('fx-devils-advocate'),
  'the devils advocate is read-only on Claude Code and must be here too');
assert.strictEqual(isReadOnlyAgent('fx-lens-security'), true);
assert.strictEqual(isReadOnlyAgent('fx-devils-advocate'), true);
assert.strictEqual(isReadOnlyAgent('default'), false);
assert.strictEqual(isReadOnlyAgent(undefined), false);

fs.rmSync(home, { recursive: true, force: true });
console.log('plant-roles.test.js: OK');
```

And append the enforcement cases to `tests/gates/codex-manifest.test.js`:

```js
const lensWrite = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  agent_id: 'a1', agent_type: 'fx-lens-security',
  tool_name: 'Bash', tool_input: { command: 'echo x > evidence.txt' },
});
assert.strictEqual(lensWrite.status, 2, 'a lens must not be able to write');

const lensRead = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  agent_id: 'a1', agent_type: 'fx-lens-security',
  tool_name: 'Bash', tool_input: { command: 'grep -rn TODO .' },
});
assert.strictEqual(lensRead.status, 0, 'a lens must still be able to read');

const controllerWrite = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  tool_name: 'Bash', tool_input: { command: 'echo x > evidence.txt' },
});
assert.strictEqual(controllerWrite.status, 0, 'the controller is not a lens');

const lensPatch = fire({
  hook_event_name: 'PreToolUse', cwd: root,
  agent_id: 'a1', agent_type: 'fx-lens-security',
  tool_name: 'apply_patch', tool_input: {},
});
assert.strictEqual(lensPatch.status, 2, 'apply_patch from a lens must be refused');

console.log('codex lens enforcement: OK');
```

- [ ] **2. Run it: verify RED**

Run: `node lib/plant-roles.test.js`
Expected: FAIL, `Cannot find module './plant-roles'`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing tests. Write
`scripts/gen-codex-agents` first, run it to produce `codex/agents/`, then the
planter, then the hook branch.

- [ ] **4. Run it: verify GREEN**

Run: `node lib/plant-roles.test.js && node tests/gates/codex-manifest.test.js`
Expected: both PASS.

- [ ] **5. Prove the generator is deterministic**

Run:
```
scripts/gen-codex-agents && git diff --exit-code -- codex/agents
```
Expected: exit 0, no diff.

- [ ] **6. Add the drift gate**

`scripts/check-generated` regenerates into a temporary directory and compares
against `codex/agents/`, failing with the differing paths.

Run: `scripts/check-generated`
Expected: `check-generated: OK`.

- [ ] **7. Register both tests and the gate**

Add to `scripts/check-all`:
```
run plant-roles.test.js    node lib/plant-roles.test.js
run check-generated        scripts/check-generated
```

- [ ] **8. Run the full gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **9. Commit**

```
git add scripts/gen-codex-agents scripts/check-generated codex/agents lib/plant-roles.js lib/plant-roles.test.js hooks/fx-codex.js tests/gates/codex-manifest.test.js scripts/check-all
git commit -m "feat(codex): generate, plant and enforce read-only review lenses"
```

No attribution trailers. Then continue to the next task: never stop and wait.
