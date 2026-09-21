# 14: Codex loads its own hooks, with output Codex accepts

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** A Codex session runs `hooks/fx-codex.js` for SessionStart,
SubagentStart and PreToolUse, not the Claude Code hooks. Everything that
script prints is JSON Codex accepts, so no refusal can fail open. The Codex
context handlers never truncate the preamble. Design amendment A1, A2, and the
Codex half of A3.

Today Codex reads `hooks/hooks.json`, which is Claude Code's wiring, because
the Codex manifest declares no `hooks` key and Codex falls back to that path.
The root `hooks.json`, which wires `fx-codex.js`, is never loaded.
Source: `research/codex.md`, section 1.

**Files:**
- Modify: `.codex-plugin/plugin.json`
- Modify: `hooks.json`  (the root file, Codex only)
- Modify: `hooks/fx-codex.js`
- Modify: `tests/gates/codex-manifest.test.js`
- Create: `tests/gates/codex-hook-output.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `render({ harness: 'codex', cwd })` from `lib/preamble.js`
- Produces: `.codex-plugin/plugin.json` key `"hooks": "./hooks.json"`
- Produces: the Codex output contract, which task 16 relies on. `fx-codex.js`
  prints only these shapes:
  - context events: `{"hookSpecificOutput":{"hookEventName":<event>,"additionalContext":<text>}}`
  - a PreToolUse refusal: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":<text>}}`,
    or exit code 2 with the reason on stderr
  - a PreToolUse allow: no stdout at all

**Seam:** the hook's stdin-to-stdout contract, spawned as a child process
with each event's real payload. This is the seam `tests/gates/codex-manifest.test.js`
already uses.

**Risks:**
- HIGH: the original design says a bundled Codex validator rejects a manifest
  `hooks` key. The runtime honours the key (`research/codex.md`), and the CLI
  has no validate command. Step 1 measures a real marketplace install with the
  key present, which makes no model call. **If the install refuses the key, stop
  and report BLOCKED with the output.** The fallback is a design change: one
  shared hooks file with runtime detection. The controller decides it, not the
  implementer.
- MEDIUM: changing a handler's settings makes Codex ask the user to re-trust
  the hooks in `/hooks`. Task 13 documents this.

**Idempotency:** file edits and read-only tests only. The install measurement
runs in a `mktemp -d` Codex home, and only that exact directory is removed.

**Testing:** a free gate test at the hook seam, plus the scratch install
measurement. Live verification is task 22.

## Acceptance criteria
- [ ] A marketplace install of the working tree into a scratch `CODEX_HOME` succeeds with the `hooks` key present, and the command and its output are in the report
- [ ] `.codex-plugin/plugin.json` declares `"hooks": "./hooks.json"`
- [ ] `tests/gates/codex-manifest.test.js` no longer asserts the key is absent. It asserts the key names the file that wires `hooks/fx-codex.js` for all three events
- [ ] The root `hooks.json` SessionStart and SubagentStart handlers set `"additionalContextLimit": 0`
- [ ] `hooks/hooks.json` is unchanged, so Claude Code keeps its own wiring
- [ ] For SessionStart, SubagentStart, a refused PreToolUse Bash call, a refused PreToolUse `apply_patch` call, and an allowed PreToolUse call, `fx-codex.js` prints only keys in the contract above
- [ ] A refusal is a refusal: the refused cases print `permissionDecision: "deny"`, or exit 2 with the reason on stderr
- [ ] The new test is registered in `scripts/check-all`

## Steps

- [ ] **1. Measure the install with the key present, before changing anything else**

Run, from the worktree:
```bash
S="$(mktemp -d)"; echo "scratch: $S"
cp -a . "$S/fx"
node -e '
const f=process.argv[1], j=JSON.parse(require("fs").readFileSync(f));
j.hooks="./hooks.json"; require("fs").writeFileSync(f, JSON.stringify(j,null,2));
' "$S/fx/.codex-plugin/plugin.json"
HOME="$S/home" CODEX_HOME="$S/home/.codex" codex plugin marketplace add "$S/fx"; echo "add=$?"
HOME="$S/home" CODEX_HOME="$S/home/.codex" codex plugin add fx@fx; echo "plugin-add=$?"
ls "$S/home/.codex/plugins" -R | grep -n 'hooks.json' | head
ls -d "$S" && rm -rf -- "$S"
```
Expected: both exit 0, and the installed copy contains `hooks.json`. Record
the full output in the report. If either command refuses the manifest, stop
and report BLOCKED.

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
```

Create `tests/gates/codex-hook-output.test.js`:

```js
'use strict';
// Amendment A2. Codex rejects hook output carrying a key it does not know, and
// the rejection fails OPEN: the run is marked failed and nothing is blocked.
// So every shape fx-codex.js prints is pinned here, at the process seam.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const hook = path.join(root, 'hooks', 'fx-codex.js');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-output-home-'));
const env = { ...process.env, CODEX_HOME: home, HOME: home };

const TOP = new Set(['hookSpecificOutput']);
const INNER = new Set(['hookEventName', 'additionalContext', 'permissionDecision', 'permissionDecisionReason']);

function run(payload) {
  const r = spawnSync('node', [hook], { input: JSON.stringify(payload), env, encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr };
}
function keysOk(out, label) {
  if (!out) return;
  const j = JSON.parse(out);
  for (const k of Object.keys(j)) assert.ok(TOP.has(k), `${label}: unknown top-level key ${k}`);
  for (const k of Object.keys(j.hookSpecificOutput || {})) assert.ok(INNER.has(k), `${label}: unknown key ${k}`);
}

const base = { session_id: 's', turn_id: 't', cwd: root, transcript_path: null };

let r = run({ ...base, hook_event_name: 'SessionStart', source: 'startup' });
assert.strictEqual(r.code, 0); keysOk(r.out, 'SessionStart');
assert.ok(JSON.parse(r.out).hookSpecificOutput.additionalContext.includes('$fx-tdd'), 'Codex addressing');

r = run({ ...base, hook_event_name: 'SubagentStart', agent_id: 'a1', agent_type: 'default' });
assert.strictEqual(r.code, 0); keysOk(r.out, 'SubagentStart');

r = run({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git branch -D fx-guard-probe' } });
keysOk(r.out, 'refused Bash');
assert.ok(r.code === 2 || JSON.parse(r.out).hookSpecificOutput.permissionDecision === 'deny', 'guard refuses');

r = run({ ...base, hook_event_name: 'SubagentStart', agent_id: 'lens1', agent_type: 'fx-lens-security' });
r = run({ ...base, hook_event_name: 'PreToolUse', agent_id: 'lens1', agent_type: 'fx-lens-security',
  tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Add File: x.txt\n+hi\n*** End Patch\n' } });
keysOk(r.out, 'refused apply_patch');
assert.ok(r.code === 2 || JSON.parse(r.out).hookSpecificOutput.permissionDecision === 'deny', 'read-only agent cannot patch');

r = run({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } });
assert.strictEqual(r.code, 0); assert.strictEqual(r.out, '', 'an allow prints nothing');

fs.rmSync(home, { recursive: true, force: true });
console.log('codex-hook-output: all passed');
```

The payload field names come from `research/codex.md`, section 2. If a field
there differs from this test, the research wins: fix the test and say so in
the report.

- [ ] **3. Run them: verify RED**

Run: `node tests/gates/codex-manifest.test.js; node tests/gates/codex-hook-output.test.js`
Expected: the manifest test fails with "the Codex manifest names its own hooks
file". The output test fails on whichever shape `fx-codex.js` prints today
that is outside the contract. If it passes, say so: the shapes already match.

- [ ] **4. Implement the minimum that passes**

No code here: `fx-tdd` drives it. Add the manifest key, add
`"additionalContextLimit": 0` to the two context handlers in the root
`hooks.json`, and bring `fx-codex.js` output inside the contract.

- [ ] **5. Run them: verify GREEN**

Run: same command. Expected: both pass, output pristine.

- [ ] **6. Register the test**

Add to `scripts/check-all`, beside `codex-manifest.test.js`:
```
run codex-hook-output.test.js node tests/gates/codex-hook-output.test.js
```

- [ ] **7. Run the full gate**

Run: `HOME="$(mktemp -d)" scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **8. Commit**

```
git add .codex-plugin/plugin.json hooks.json hooks/fx-codex.js tests/gates/codex-manifest.test.js tests/gates/codex-hook-output.test.js scripts/check-all
git commit -m "fix(codex): load fx-codex.js through the manifest hooks key, and print only keys Codex accepts"
```

No attribution trailers. Then continue to the next task: never stop and wait.
