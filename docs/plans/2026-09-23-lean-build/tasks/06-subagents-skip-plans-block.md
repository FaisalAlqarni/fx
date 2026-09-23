# 06: Subagents do not receive the plans block

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** a dispatched subagent gets the bootstrap and its task, not
the repository's list of plans. The plans block exists to route a fresh
**session** into `fx-implement` (`lib/plan-state.js` header comment). A
subagent already has its task in its dispatch prompt; the block only adds
tokens to every dispatch and a list of other work to be pulled toward.

The bootstrap still reaches every subagent unchanged. That is what row 02 and
row 04 depend on, and nothing in this task touches it.

**Files:**
- Modify: `lib/preamble.js` (`render` accepts `subagent`)
- Modify: `lib/preamble.test.js`
- Modify: `hooks/fx-context.js` (pass `subagent: true` on `SubagentStart`)
- Modify: `hooks/fx-codex.js` (same, if its handler receives the event name; see step 6)

**Interfaces:**
- Consumes: Claude Code hook input JSON on stdin with `hook_event_name`
  (`"SessionStart"` or `"SubagentStart"`) and `cwd`.
- Produces: `render({ harness, cwd, subagent = false })`. With `subagent: true`
  the plans block is omitted; the bootstrap and the `repo.md` note are
  unchanged. Every existing caller that passes no `subagent` gets today's
  output byte for byte.

**Seam:** unit, `lib/preamble.test.js` (existing); the hook is exercised by piping JSON into it.

**Idempotency:** no state; pure render.

**Testing:** `node lib/preamble.test.js`, the hook pipe check in step 5, `scripts/check-all`.

**Reference:** `plugin-dev:hook-development` describes the `SubagentStart`
input shape; read it if the hook's input is unclear.

## Acceptance criteria
- [ ] `render({ harness, cwd, subagent: true })` in a repo with an unfinished plan contains no `Unfinished plans` heading, for every harness in `HARNESSES`.
- [ ] The same call without `subagent` still contains it.
- [ ] The existing hook assertion in `lib/preamble.test.js` (the `SubagentStart` payload whose `additionalContext` must equal a render) is changed to compare against `render({ harness: 'claude-code', cwd: worst, subagent: true })`, and a matching `SessionStart` assertion is added against the render without `subagent`.
- [ ] The subagent render still starts with the fixed intro and carries the 111-subagents and 35-patterns markers.
- [ ] Piping `{"hook_event_name":"SubagentStart","cwd":"<repo with a plan>"}` into `hooks/fx-context.js` yields `additionalContext` without the plans block; `SessionStart` yields it with.
- [ ] Codex: done the same way if `hooks/fx-codex.js` sees the event name; otherwise unchanged, with one line in the task report saying why. opencode: unchanged unless `plugins/fx.js` already distinguishes a subagent session; report which.

## Steps

- [ ] **1. Write the failing test** (append to `lib/preamble.test.js` before its summary)

```js
// ---- a subagent gets the bootstrap, not the plan list ----
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-preamble-sub-'));
  fs.mkdirSync(path.join(dir, 'docs', 'plans', 'p1', 'tasks'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'plans', 'p1', 'tasks', '01-a.md'), '# a\n');
  try {
    for (const harness of HARNESSES) {
      const session = render({ harness, cwd: dir });
      const sub = render({ harness, cwd: dir, subagent: true });
      assert.match(session, /Unfinished plans in this repository/, `${harness}: a session still gets the plans block`);
      assert.doesNotMatch(sub, /Unfinished plans in this repository/, `${harness}: a subagent does not`);
      assert.ok(sub.startsWith(`# fx\n\n${INTRO}\n\n---\n\n## Invoking a lane is not optional\n`), `${harness}: subagent bootstrap intact`);
      assert.match(sub, /across 111 subagents/, `${harness}: subagent keeps the 111 marker`);
      assert.strictEqual(sub, render({ harness, cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'fx-empty-')) }),
        `${harness}: a subagent render equals the no-plans render`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
```

Check the file's existing imports first (`fs`, `os`, `path`, `assert`, `render`, `HARNESSES`, `INTRO`) and reuse them; add only what is missing.

Also change the existing `SubagentStart` hook assertion as the criteria say; it will fail once step 5 lands otherwise.

- [ ] **2. Run it: verify RED**

Run: `node lib/preamble.test.js`
Expected: FAIL, `a subagent does not`.

- [ ] **3. Implement the minimum that passes** in `render` (`fx-tdd` drives it).

- [ ] **4. Run it: verify GREEN.** Run: `node lib/preamble.test.js`.

- [ ] **5. Pass the flag from the Claude Code hook, and check it**

In `hooks/fx-context.js`: `render({ harness: 'claude-code', cwd, subagent: input.hook_event_name === 'SubagentStart' })`. Then, with `D` a temp repo holding `docs/plans/p1/tasks/01-a.md`:

```
echo "{\"hook_event_name\":\"SubagentStart\",\"cwd\":\"$D\"}" | node hooks/fx-context.js | grep -c 'Unfinished plans'   # expect 0
echo "{\"hook_event_name\":\"SessionStart\",\"cwd\":\"$D\"}"  | node hooks/fx-context.js | grep -c 'Unfinished plans'   # expect 1
```

- [ ] **6. Codex and opencode.** Read `hooks/fx-codex.js` around its `render` call and `plugins/fx.js` around its `render` call. Apply the same flag only where the code already knows it is serving a subagent. Run `node tests/gates/codex-hook-output.test.js` and `node tests/gates/opencode-plugin.test.js`.

- [ ] **7. Run the suite**: `scripts/check-all`. Bump the version if `release-version.test.js` asks.

- [ ] **8. Commit**

```
git add lib/preamble.js lib/preamble.test.js hooks/fx-context.js
git commit -m "feat(preamble): subagents get the bootstrap without the plan list"
```

Add `hooks/fx-codex.js`, `plugins/fx.js` and the version files to `git add` only if this task changed them.
