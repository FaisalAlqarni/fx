# 16: Codex roles are dispatchable

**Status:** ready-for-agent
**Blocked by:** 14
**Phase:** Amendment

**What to build:** On Codex, a controller can dispatch `fx-lens-security` or
any other fx read-only role by name, and the role is applied. A user who
installs fx is told, once, to restart Codex so the roles take effect.
`fx-setup` can plant the roles, not only audit them. Design amendment A4.

Facts this rests on, from `research/codex.md` sections 3 and "Follow-up: role
visibility timing":
- `spawn_agent` exposes `agent_type` only while user-defined roles exist.
- Roles are read once per session, when the config loads, before any hook
  runs. Nothing reloads them. So roles planted by a SessionStart hook are
  visible from the next session only.
- By default a spawn copies the parent's history, and in that mode a role
  applies only when `agent_type` is passed explicitly.
- A role file's `sandbox_mode` is ignored. Read-only enforcement stays in the
  PreToolUse hook keyed on `agent_type` (task 06), which runs once task 14
  lands.

**Files:**
- Modify: `hooks/fx-codex.js`
- Modify: `lib/plant-roles.js`  (only if the notice text belongs beside `plantRoles`)
- Modify: `lib/plant-roles.test.js`
- Modify: `tests/gates/codex-hook-output.test.js`  (from task 14)
- Modify: `references/harnesses/codex.md`
- Modify: `skills/fx-setup/SKILL.md`

**Interfaces:**
- Consumes: `plantRoles({ home, source }) -> { written: string[], skipped: string[], stale: string[] }`
  from `lib/plant-roles.js`
- Consumes: the Codex output contract from task 14. Only `additionalContext`
  may carry the notice, with no new keys.
- Produces: when `plantRoles` returns a non-empty `written` or `stale`, the
  SessionStart `additionalContext` ends with exactly this paragraph:
  `fx installed or updated its review roles (<names>). Codex reads roles when a session starts, so restart Codex once before dispatching an fx review agent.`
  Here `<names>` is the comma-separated `written` plus `stale`, in the order
  returned.
- Produces: `references/harnesses/codex.md` "Subagent dispatch" states that a
  role is dispatched with `spawn_agent` and an explicit `agent_type` naming
  the role. Without `agent_type` the role is not applied.

**Seam:** the hook's process seam, as in task 14, with a throwaway `CODEX_HOME`.

**Risks:**
- MEDIUM: a notice on every session would be noise. It appears only in a
  session that actually wrote or repaired a role. The second session is
  silent.
- The global constraint "Skills name actions, never tools" binds the skills.
  The tool name `spawn_agent` belongs in `references/harnesses/codex.md`, the
  harness knowledge layer, never in a skill body. `scripts/check-tool-names`
  enforces it.

**Idempotency:** `plantRoles` is already idempotent. The test uses a
`mktemp -d` Codex home and removes only that directory.

**Testing:** process tests on the hook. Live verification is task 22: a first
session plants and prints the notice, and a second session dispatches a lens
with `agent_type`.

## Acceptance criteria
- [ ] On a fresh `CODEX_HOME`, SessionStart output ends with the restart notice naming all six roles
- [ ] A second SessionStart on the same `CODEX_HOME` prints no notice
- [ ] After a role file is edited so it differs, the next SessionStart names only that role
- [ ] The notice arrives inside `additionalContext`, and the task 14 key-set test still passes
- [ ] `references/harnesses/codex.md` says to pass `agent_type` explicitly, and why
- [ ] `fx-setup` on Codex plants the roles when any are missing or stale. It then reports the three states and tells the user to restart Codex
- [ ] `scripts/check-tool-names` still passes

## Steps

- [ ] **1. Write the failing test**

Append to `tests/gates/codex-hook-output.test.js`, before its final cleanup:

```js
// ---- Task 16: the restart notice appears once, when roles were written ----
{
  const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-codex-notice-home-'));
  const env2 = { ...process.env, CODEX_HOME: fresh, HOME: fresh };
  const start = () => JSON.parse(spawnSync('node', [hook], {
    input: JSON.stringify({ ...base, hook_event_name: 'SessionStart', source: 'startup' }),
    env: env2, encoding: 'utf8' }).stdout).hookSpecificOutput.additionalContext;
  const first = start();
  assert.match(first, /restart Codex once before dispatching an fx review agent\.\s*$/, 'first session tells the user');
  for (const r of ['fx-devils-advocate', 'fx-lens-a11y', 'fx-lens-database', 'fx-lens-pipeline', 'fx-lens-security', 'fx-lens-silent-failure']) {
    assert.ok(first.includes(r), `notice names ${r}`);
  }
  assert.ok(!/restart Codex once/.test(start()), 'second session is silent');
  fs.appendFileSync(path.join(fresh, 'agents', 'fx-lens-a11y.toml'), '\n# drift\n');
  const third = start();
  assert.ok(third.includes('fx-lens-a11y') && !third.includes('fx-lens-security ('), 'only the repaired role');
  fs.rmSync(fresh, { recursive: true, force: true });
}
```

The last assertion is weak on purpose: the names only have to appear in the
notice. Tighten it to the exact notice line once the notice exists.

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/codex-hook-output.test.js`
Expected: FAIL on "first session tells the user".

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it.

- [ ] **4. Run it: verify GREEN**

Run: same. Expected: PASS, output pristine.

- [ ] **5. Update the reference and the setup lane**

In `references/harnesses/codex.md`, replace the "Subagent dispatch" paragraph
with one stating:
- dispatch is `spawn_agent`;
- a role is applied only when `agent_type` names it;
- roles are read when a session starts, so newly planted roles need a restart.

In `skills/fx-setup/SKILL.md`, change the Codex role step to plant before
auditing. The plant command names its interpreter and resolves the module
from the plugin root, not the user's repo. Then report as before, and add the
restart instruction when anything was written. Skill text names actions, not
tools.

- [ ] **6. Run the full gate**

Run: `HOME="$(mktemp -d)" scripts/check-all`. Expected: `ALL GREEN`.

- [ ] **7. Commit**

```
git add hooks/fx-codex.js lib/plant-roles.js lib/plant-roles.test.js tests/gates/codex-hook-output.test.js references/harnesses/codex.md skills/fx-setup/SKILL.md
git commit -m "feat(codex): tell the user to restart once when roles are planted, and dispatch roles by agent_type"
```

Stage only the files you changed. No attribution trailers. Then continue to
the next task: never stop and wait.
