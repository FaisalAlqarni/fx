# 14: Codex loads its own hooks, with output Codex accepts

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** A Codex session runs `hooks/fx-codex.js` for SessionStart,
SubagentStart and PreToolUse, not the Claude Code hooks. Everything that
script prints is JSON Codex accepts, so no refusal can fail open. The Codex
context handlers never truncate the preamble. A read-only agent cannot get
around the read-only rule by spawning a child or calling an MCP tool. Design
amendment A1, A2, the Codex half of A3, and the Codex half of A5.

Today Codex reads `hooks/hooks.json`, which is Claude Code's wiring, because
the Codex manifest declares no `hooks` key and Codex falls back to that path.
The root `hooks.json`, which wires `fx-codex.js`, is never loaded.
Source: `research/codex.md`, section 1.

**Prior art, copy it.** Do not invent these shapes.
- Output shaping per host: ponytail's `hooks/ponytail-runtime.js`
  `writeHookOutput()` gives Codex `{ systemMessage, hookSpecificOutput: {
  hookEventName, additionalContext } }` (ponytail sections 2 and 4 of
  `research/prior-art-multi-harness.md`). Copy that shape for the context events. fx needs
  no host detection, because the root `hooks.json` only ever runs on Codex.
- Hook tests: ponytail's `tests/hooks.test.js` spawns the real hook scripts
  with `spawnSync` and a real, scrubbed environment, and asserts on the JSON
  each branch prints (ponytail section 7 of the same file). The test below follows
  it.
- No prior art for refusing `spawn_agent` or `mcp__*` to a read-only agent:
  neither project ships read-only agents.

**Files:**
- Modify: `.codex-plugin/plugin.json`
- Modify: `hooks.json`  (the root file, Codex only)
- Modify: `hooks/fx-codex.js`
- Modify: `tests/gates/codex-manifest.test.js`
- Create: `tests/gates/codex-hook-output.test.js`
- Modify: `scripts/check-all`  (one line, appended directly after the `codex-manifest.test.js` line)

**Interfaces:**
- Consumes: `render({ harness: 'codex', cwd })` from `lib/preamble.js`
- Consumes: `lookupAgentIdentity`, `isReadOnlyAgent` and `isWritingToolCall`
  from `lib/plant-roles.js`, unchanged
- Produces: `.codex-plugin/plugin.json` key `"hooks": "./hooks.json"`
- Produces: the root `hooks.json` SessionStart matcher includes `fork`, since
  Codex sends `source: "fork"` and the docs omit it (section 2 of
  `research/codex.md`, around line 91 of that file)
- Produces: the Codex output contract, which task 16 relies on. `fx-codex.js`
  prints only these shapes:
  - SessionStart: `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":<text>}}`,
    optionally with a top-level `"systemMessage":<text>` beside it. This is
    ponytail's Codex shape. `systemMessage` is a universal Codex output key
    (section 2 of `research/codex.md`)
  - SubagentStart: `{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":<text>}}`, nothing else
  - a PreToolUse refusal: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":<text>}}`,
    or exit code 2 with the reason on stderr
  - a PreToolUse allow: no stdout at all
- Produces: for a subagent whose recorded identity is read-only, or that was
  never recorded (the same identities the write refusal already covers),
  PreToolUse refuses `tool_name: "spawn_agent"` and any `tool_name` starting
  with `mcp__`. A `default` agent's `spawn_agent` and `apply_patch` are not
  refused by this rule.

**Seam:** the hook's stdin-to-stdout contract, spawned as a child process
with each event's real payload. This is the seam `tests/gates/codex-manifest.test.js`
already uses, and the one ponytail's `tests/hooks.test.js` uses.

**Risks:**
- HIGH: the original design says a bundled Codex validator rejects a manifest
  `hooks` key. The runtime honours the key (`research/codex.md`), and the CLI
  has no validate command. Step 1 measures a real marketplace install with the
  key present, which makes no model call. **If the install refuses the key, stop
  and report BLOCKED with the output.** The fallback is a design change: one
  shared hooks file with runtime detection, ponytail's `PLUGIN_DATA` check in
  `hooks/ponytail-runtime.js`. The controller decides it, not the implementer.
- MEDIUM: changing a handler's settings makes Codex ask the user to re-trust
  the hooks in `/hooks`. ponytail's README documents the same step. Task 13
  documents it for fx, and task 22 proves it live.
- MEDIUM: identity records live under `os.tmpdir()` (`identityDir` in
  `lib/plant-roles.js`). The test sets `TMPDIR` to its scratch directory in the
  spawned environment, so its records never land in the shared `/tmp`.
- MEDIUM: the `spawn_agent` refusal blocks a lens from dispatching anything.
  No fx lens dispatches today, so nothing legitimate is lost.

**Idempotency:** file edits and read-only tests only. The install measurement
runs in a `mktemp -d` Codex home under `/tmp`, and only that exact directory is
removed.

**Testing:** a free gate test at the hook seam, plus the scratch install
measurement. Live verification is task 22.

## Acceptance criteria
- [ ] A marketplace install of the working tree into a scratch `CODEX_HOME` succeeds with the `hooks` key present, and the command and its output are in the report
- [ ] `.codex-plugin/plugin.json` declares `"hooks": "./hooks.json"`
- [ ] `tests/gates/codex-manifest.test.js` no longer asserts the key is absent. It asserts the key names the file that wires `hooks/fx-codex.js` for all three events
- [ ] The root `hooks.json` SessionStart matcher includes `fork`, and the manifest test asserts it
- [ ] The root `hooks.json` SessionStart and SubagentStart handlers set `"additionalContextLimit": 0`
- [ ] `hooks/hooks.json` is unchanged, so Claude Code keeps its own wiring
- [ ] For SessionStart, SubagentStart, a refused PreToolUse Bash call, a refused PreToolUse `apply_patch` call, and an allowed PreToolUse call, `fx-codex.js` prints only keys in the contract above. `systemMessage` is accepted at the top level on SessionStart only
- [ ] A refusal is a refusal: the refused cases print `permissionDecision: "deny"`, or exit 2 with the reason on stderr
- [ ] A read-only agent's `spawn_agent` and `mcp__*` calls are refused, and both cases are in `codex-hook-output.test.js`
- [ ] Control: a recorded `default` agent's `apply_patch` and `spawn_agent` are NOT refused
- [ ] The spawned test environment sets `TMPDIR`, `HOME` and `CODEX_HOME` to the test's scratch directory
- [ ] The new test is registered in `scripts/check-all`, directly after `codex-manifest.test.js`

## Steps

- [ ] **1. Measure the install with the key present, before changing anything else**

Run, from the worktree:
```bash
set -euo pipefail
S="$(mktemp -d)" || exit 1
case "$S" in /tmp/?*) ;; *) echo refusing; exit 1;; esac
trap 'rm -rf -- "$S"' EXIT
echo "scratch: $S"
cp -a . "$S/fx"
node -e '
const f=process.argv[1], j=JSON.parse(require("fs").readFileSync(f));
j.hooks="./hooks.json"; require("fs").writeFileSync(f, JSON.stringify(j,null,2));
' "$S/fx/.codex-plugin/plugin.json"
rc=0; HOME="$S/home" CODEX_HOME="$S/home/.codex" codex plugin marketplace add "$S/fx" || rc=$?; echo "add=$rc"
rc=0; HOME="$S/home" CODEX_HOME="$S/home/.codex" codex plugin add fx@fx || rc=$?; echo "plugin-add=$rc"
find "$S/home/.codex/plugins" -name hooks.json -print
```
Expected: both exit 0, and the installed copy contains `hooks.json`. The trap
removes only `$S`. Record the full output in the report. If either command
refuses the manifest, stop and report BLOCKED.

- [ ] **2. Write the failing tests**

In `tests/gates/codex-manifest.test.js`, replace the assertion
`assert.ok(!('hooks' in codex), 'the Codex validator rejects a hooks key');`
with:

```js
// Amendment A1: Codex uses the manifest `hooks` key when present and falls
// back to hooks/hooks.json (Claude Code's wiring) otherwise. research/codex.md.
assert.strictEqual(codex.hooks, './hooks.json', 'the Codex manifest names its own hooks file');
const cxHooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks.json'), 'utf8')).hooks;
for (const ev of ['SessionStart', 'SubagentStart', 'PreToolUse']) {
  const cmds = cxHooks[ev].flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(cmds.every((c) => c.includes('hooks/fx-codex.js')), `${ev} runs fx-codex.js`);
}
for (const ev of ['SessionStart', 'SubagentStart']) {
  for (const g of cxHooks[ev]) for (const h of g.hooks) {
    assert.strictEqual(h.additionalContextLimit, 0, `${ev} never truncates the preamble`);
  }
}
// Codex sends source "fork" on SessionStart; the docs omit it (research/codex.md, section 2).
for (const g of cxHooks.SessionStart) {
  assert.ok(String(g.matcher).split('|').includes('fork'), 'SessionStart fires on fork');
}
```

Create `tests/gates/codex-hook-output.test.js`:

```js
'use strict';
// Amendment A2. Codex rejects hook output carrying a key it does not know, and
// the rejection fails OPEN: the run is marked failed and nothing is blocked.
// So every shape fx-codex.js prints is pinned here, at the process seam.
// Pattern copied from ponytail's tests/hooks.test.js: spawn the real script
// with a real, scrubbed environment and assert on the JSON it prints.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const hook = path.join(root, 'hooks', 'fx-codex.js');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-output-home-'));
// TMPDIR too: identity records go under os.tmpdir() (lib/plant-roles.js
// identityDir), and they must stay inside this scratch directory.
const env = { ...process.env, CODEX_HOME: home, HOME: home, TMPDIR: home };

// ponytail's Codex shape: systemMessage beside hookSpecificOutput, on SessionStart.
const TOP_SESSION = new Set(['hookSpecificOutput', 'systemMessage']);
const TOP = new Set(['hookSpecificOutput']);
const INNER = new Set(['hookEventName', 'additionalContext', 'permissionDecision', 'permissionDecisionReason']);

function run(payload) {
  const r = spawnSync('node', [hook], { input: JSON.stringify(payload), env, encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr };
}
function keysOk(out, label, top = TOP) {
  if (!out) return;
  const j = JSON.parse(out);
  for (const k of Object.keys(j)) assert.ok(top.has(k), `${label}: unknown top-level key ${k}`);
  for (const k of Object.keys(j.hookSpecificOutput || {})) assert.ok(INNER.has(k), `${label}: unknown key ${k}`);
}
function denied(r) {
  return r.code === 2 || (r.out !== '' && JSON.parse(r.out).hookSpecificOutput.permissionDecision === 'deny');
}

const base = { session_id: 's', turn_id: 't', cwd: root, transcript_path: null };
const PATCH = '*** Begin Patch\n*** Add File: x.txt\n+hi\n*** End Patch\n';

let r = run({ ...base, hook_event_name: 'SessionStart', source: 'startup' });
assert.strictEqual(r.code, 0); keysOk(r.out, 'SessionStart', TOP_SESSION);
assert.ok(JSON.parse(r.out).hookSpecificOutput.additionalContext.includes('$fx-tdd'), 'Codex addressing');

r = run({ ...base, hook_event_name: 'SubagentStart', agent_id: 'a1', agent_type: 'default' });
assert.strictEqual(r.code, 0); keysOk(r.out, 'SubagentStart');

r = run({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git branch -D fx-guard-probe' } });
keysOk(r.out, 'refused Bash');
assert.ok(denied(r), 'guard refuses');

r = run({ ...base, hook_event_name: 'SubagentStart', agent_id: 'lens1', agent_type: 'fx-lens-security' });
assert.strictEqual(r.code, 0);
r = run({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens1', agent_type: 'fx-lens-security',
  tool_name: 'apply_patch', tool_input: { command: PATCH } });
keysOk(r.out, 'refused apply_patch');
assert.ok(denied(r), 'read-only agent cannot patch');

// Amendment A5: a lens must not hand the write to a child or to an MCP server.
r = run({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens1', agent_type: 'fx-lens-security',
  tool_name: 'spawn_agent', tool_input: { message: 'create x.txt', agent_type: 'default' } });
keysOk(r.out, 'refused spawn_agent');
assert.ok(denied(r), 'read-only agent cannot spawn a child');

r = run({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens1', agent_type: 'fx-lens-security',
  tool_name: 'mcp__filesystem__write_file', tool_input: { path: 'x.txt', content: 'hi' } });
keysOk(r.out, 'refused mcp tool');
assert.ok(denied(r), 'read-only agent cannot call an MCP tool');

// Control: the same calls from a recorded default agent are not refused by the
// read-only rule. cwd is the scratch dir, which holds no plan, so the lane
// check has nothing to refuse and this measures the identity rule alone.
r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'a1', agent_type: 'default',
  tool_name: 'apply_patch', tool_input: { command: PATCH } });
assert.strictEqual(r.code, 0, `a default agent can patch: ${r.err}`);
assert.strictEqual(r.out, '', 'an allowed patch prints nothing');

r = run({ ...base, cwd: home, hook_event_name: 'PreToolUse', agent_id: 'a1', agent_type: 'default',
  tool_name: 'spawn_agent', tool_input: { message: 'reply ok' } });
assert.strictEqual(r.code, 0, `a default agent can spawn: ${r.err}`);
assert.strictEqual(r.out, '', 'an allowed spawn prints nothing');

r = run({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } });
assert.strictEqual(r.code, 0); assert.strictEqual(r.out, '', 'an allow prints nothing');

fs.rmSync(home, { recursive: true, force: true });
console.log('codex-hook-output: all passed');
```

The payload field names come from `research/codex.md`, section 2. If a field
there differs from this test, the research wins: fix the test and say so in
the report. If the control fails because the lane check refused, the control's
`cwd` is wrong: move it to a directory with no plan, never weaken the
assertion.

- [ ] **3. Run them: verify RED**

Run: `node tests/gates/codex-manifest.test.js; node tests/gates/codex-hook-output.test.js`
Expected: the manifest test fails with "the Codex manifest names its own hooks
file". The output test fails on "read-only agent cannot spawn a child", or
earlier on whichever shape `fx-codex.js` prints today that is outside the
contract.

- [ ] **4. Implement the minimum that passes**

No code here: `fx-tdd` drives it. Add the manifest key, add `fork` to the
root `hooks.json` SessionStart matcher, add `"additionalContextLimit": 0` to
the two context handlers there, bring `fx-codex.js` output inside the
contract, and extend the read-only branch of `handlePreToolUse` to refuse
`spawn_agent` and `mcp__*` for the identities it already refuses writes to.

- [ ] **5. Run them: verify GREEN**

Run: same command. Expected: both pass, output pristine.

- [ ] **6. Register the test**

Append to `scripts/check-all`, on the line directly after
`run codex-manifest.test.js ...`:
```
run codex-hook-output.test.js node tests/gates/codex-hook-output.test.js
```
Tasks 16, 19 and 20 also add one line each to this file, each beside a
different neighbour, so the merges stay trivial.

- [ ] **7. Run the full gate**

Run: `HOME="$(mktemp -d)" scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **8. Commit**

```
git add .codex-plugin/plugin.json hooks.json hooks/fx-codex.js tests/gates/codex-manifest.test.js tests/gates/codex-hook-output.test.js scripts/check-all
git commit -m "fix(codex): load fx-codex.js through the manifest hooks key, print only keys Codex accepts, and keep read-only agents from spawning or calling MCP"
```

No attribution trailers. Then continue to the next task: never stop and wait.
