# 18: opencode subagents can dispatch a subagent

**Status:** ready-for-agent
**Blocked by:** 17
**Phase:** Amendment

**What to build:** On opencode, a subagent can dispatch a further subagent.
An implementer subagent dispatching its own lookup agent works as it does on
Claude Code. fx's read-only agents still cannot dispatch anything. Design
amendment A6.

Today conformance row 15 FAILs on opencode. The built-in `general` subagent's
tools are `bash, edit, glob, grep, read, skill, webfetch, write`, with no
`task`. opencode grants `task` only through an exact `permission.task` entry
on the agent's own config, and a wildcard `"*": "allow"` does not satisfy it.
`subagent_depth`, which `plugins/fx.js` already raises to 2, only limits
nesting once `task` is granted (`research/opencode-subagents.md`, verified
against opencode source at 1.18.31, installed 1.18.25).

**Prior art:** none. Neither ponytail nor caveman touches opencode's
permission or agent configuration (ponytail section 5 and caveman section 5 of
`research/prior-art-multi-harness.md`), so `permission.task` has nothing to
copy.

**Files:**
- Modify: `plugins/fx.js`  (the `config` hook)
- Modify: `lib/agent-dialects.js`  (only if read-only agents' `task` denial belongs in `toOpencodeAgent`)
- Modify: `tests/gates/opencode-plugin.test.js`
- Modify: `tests/conformance/rows/15-subagent-dispatches-subagent.sh`  (the opencode prompt only)

**Interfaces:**
- Consumes: the read-only agent config from task 17 (`edit: 'deny'`, `bash: 'deny'`)
- Produces: after the `config` hook runs:
  - `config.agent.general.permission.task === 'allow'`
  - every read-only agent's `permission.task === 'deny'`
  - `config.subagent_depth >= 2`, unchanged from today
- The hook never overwrites a `general` agent setting the user already has.
  It merges `task: 'allow'` into `general.permission`, only when `task` is
  absent there.

**Seam:** the plugin's `config` hook, called directly as the existing test
already does. Live row 15 in task 21 is the proof.

**What the unit test cannot prove.** The config-object test shows the hook
writes `agent.general.permission.task = 'allow'` into the config. It cannot
show that opencode merges a plugin-supplied `general` entry over its native
built-in `general` agent, so the child session really gets `task`. Only live
row 15 on opencode proves that. So row 15's opencode prompt must name
`general` as the agent type at both levels: a prompt that lets the model pick
another agent could pass or fail without touching the override.

**Risks:**
- MEDIUM: shared file. Task 16 may edit row 15's Codex branch, if its depth
  research rules a GAP. This task edits only the opencode prompt. Implementers
  run serially.
- MEDIUM: the key for the built-in agent may not be `general` in every
  opencode version. Confirm the name from the installed binary's agent list,
  or from the source the research cites, and write the source into a code
  comment.
- The v2 docs rename `task` to `subagent`. 1.18.x runs the v1 engine, so use
  `task` (`research/opencode-subagents.md`, v2 section).

**Idempotency:** the `config` hook may run more than once. Merge only when the
key is absent, so a second run changes nothing.

**Testing:** config hook unit test, then live row 15 on opencode in task 21.

## Acceptance criteria
- [ ] (Moved to task 17 fix round 1: the external-directory restore is folded into the opencode read-only permission allowlist.)
- [ ] Carried from the task 17 review, Minor 2: row 12 requires at least two dispatches of the lens, so the row cannot pass when the shell probe never ran
- [ ] Carried from the task 17 review, Minor 3: the tools-line and `*_*` assertions loop over `READ_ONLY_AGENTS`, not over every agent file
- [ ] After the config hook, `general` has `permission.task` of `'allow'`
- [ ] A `general.permission.task` the user already set, of any value, is left as it was
- [ ] Every read-only agent has `permission.task` of `'deny'`
- [ ] Running the config hook twice leaves the same config as running it once
- [ ] `subagent_depth` is still at least 2
- [ ] Row 15's opencode prompt names `general` as the agent type for both the first and the nested dispatch, and its Claude Code and Codex prompts are unchanged
- [ ] The report states that the config-object test cannot prove the native `general` override works, and that live row 15 is the proof
- [ ] Live row 15 passes on opencode (verified in task 21)

## Steps

- [ ] **1. Write the failing test**

In `tests/gates/opencode-plugin.test.js`:

```js
// Task 18 (amendment A6): the task tool needs an exact permission.task entry.
assert.strictEqual(config.agent.general.permission.task, 'allow', 'general can dispatch');
for (const name of ['fx-devils-advocate', 'fx-lens-a11y', 'fx-lens-database', 'fx-lens-pipeline', 'fx-lens-security', 'fx-lens-silent-failure']) {
  assert.strictEqual(config.agent[name].permission.task, 'deny', `${name} cannot dispatch`);
}
{
  // A user's own choice survives.
  const user = { agent: { general: { permission: { task: 'ask' } } } };
  await hooks.config(user);
  assert.strictEqual(user.agent.general.permission.task, 'ask', 'user setting kept');
  // Idempotent.
  const again = JSON.parse(JSON.stringify(config));
  await hooks.config(again);
  assert.deepStrictEqual(again, config, 'a second config() run changes nothing');
}
```

Use the names the file already uses for the plugin's hooks object and the
config it mutated.

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/opencode-plugin.test.js`
Expected: FAIL on "general can dispatch".

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it.

- [ ] **4. Run it: verify GREEN**

Run: same. Expected: PASS, output pristine.

- [ ] **5. Name `general` in row 15's opencode prompt**

In `tests/conformance/rows/15-subagent-dispatches-subagent.sh`, after
`live_workdir`, add:

```bash
# opencode: name the built-in general agent at both levels, so a PASS proves
# the plugin's permission.task override reached it (task 18). A prompt that
# let the model pick another agent could pass without touching the override.
AS=""
[ "$HARNESS" = opencode ] && AS=" as agent type general"
```

Then change the two dispatch phrases in the `live_run` prompt from
`Dispatch one subagent ($SUBAGENT_TOOL)` and
`Dispatch one subagent of your own ($SUBAGENT_TOOL)` to
`Dispatch one subagent ($SUBAGENT_TOOL)$AS` and
`Dispatch one subagent of your own ($SUBAGENT_TOOL)$AS`. On Claude Code and
Codex `$AS` is empty, so their prompts are byte-identical to today's. Run
`bash tests/conformance/rows/15-subagent-dispatches-subagent.sh --describe`
and `bash tests/conformance/run.sh opencode --free` to confirm nothing broke.

- [ ] **6. Run the full gate**

Run: `HOME="$(mktemp -d)" scripts/check-all`. Expected: `ALL GREEN`.

- [ ] **7. Commit**

```
git add plugins/fx.js tests/gates/opencode-plugin.test.js tests/conformance/rows/15-subagent-dispatches-subagent.sh
git commit -m "fix(opencode): grant the general subagent the task tool, deny it to read-only agents"
```

Stage `lib/agent-dialects.js` too if you changed it. No attribution trailers.
Then continue to the next task: never stop and wait.
