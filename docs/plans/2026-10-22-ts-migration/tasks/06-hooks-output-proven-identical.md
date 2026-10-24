# 06: Hooks in TypeScript, output proven identical

**Status:** ready-for-agent
**Blocked by:** 05
**Phase:** Core

**What to build:** the three hooks the harnesses run (Claude Code SessionStart/SubagentStart context, Claude Code PreToolUse, and the Codex hook for SessionStart, SubagentStart and PreToolUse) are written in TypeScript. Hook stdin is parsed from `unknown` by one parser per harness, and each harness's output has its own type. Before anything is ported, a new gate records what each hook prints for a fixed payload set on the current JavaScript, including runs where a guarded library fails to load; after the port, the output must be byte-identical. Loads that sit inside a `try` today stay runtime `require` calls inside that `try`, typed as `typeof import('<path>')` (plan.md ruling), so a broken guard still fails the way it does today.

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Create: `src/tests/gates/hook-output-golden.test.ts` (new gate; generated to `tests/gates/hook-output-golden.test.js`)
- Create: `tests/gates/fixtures/hook-golden/` (one `<case>.input.json` and `<case>.expected.txt` per case, plus `<case>.meta.json` naming the hook and its environment)
- Create: `src/hooks/fx-context.ts`, `src/hooks/fx-pretooluse.ts`, `src/hooks/fx-codex.ts`
- Create: `src/lib/hook-input.ts` (`parseClaudeHookInput`, `parseCodexHookInput`)
- Create: `src/lib/hook-input.test.ts`
- Modify: `hooks/fx-context.js`, `hooks/fx-pretooluse.js`, `hooks/fx-codex.js` (now generated; shebangs kept)
- Modify: `src/lib/types.ts` (Claude Code and Codex output types, hook decision type), `lib/types.js` (generated)
- Modify: `scripts/check-all` (run the golden gate and `node lib/hook-input.test.js`)

**Interfaces:**
- Consumes: `route` (task 02), `laneCheck` (task 02), `inspect` (task 03), `render` (task 04), plant-roles exports (task 05).
- Produces: `parseClaudeHookInput(raw: unknown) -> { ok: true, value: ClaudeHookInput } | { ok: false, reason: string }` and `parseCodexHookInput(raw: unknown)` of the same shape, holding only the fields the hooks read (`hook_event_name`, `tool_name`, `tool_input`, `cwd`, `session_id`, `transcript_path`, and any other field today's hooks read: read the hooks to list them).
- Produces: output types `ClaudePreToolUseOutput`, `ClaudeContextOutput`, `CodexHookOutput`, exported for sub-project 2.
- Produces: the golden gate's two modes: `node tests/gates/hook-output-golden.test.js` compares; `node tests/gates/hook-output-golden.test.js --record` rewrites every `<case>.expected.txt` and `<case>.meta.json` from the hooks as they are now. `--record` is for an intended change (for example a `PREAMBLE.md` edit) and its use is stated in the commit message; never used to make a migration pass.

**Seam:** the new golden gate (whole hook process: stdin in, stdout and exit code out), the existing `tests/gates/codex-hook-output.test.js` and `tests/gates/codex-manifest.test.js`, unchanged.

**Tests:**
- Golden gate, recorded from the current JavaScript before any port, at least these cases; each asserts stdout byte-identical to `<case>.expected.txt` and the exit code in `<case>.meta.json`:
  - Claude SessionStart, startup, in a fixture repo with no plans.
  - Claude SubagentStart.
  - Claude PreToolUse, `Bash` with `git status`: allowed (record today's exact stdout and exit).
  - Claude PreToolUse, `Bash` with `git push --force origin main` in a fixture worktree: denied by the git guard (record the exact reason text).
  - Claude PreToolUse, `Agent` dispatch with no `model`: today's routing output.
  - Claude PreToolUse, `Write` that trips the lane check: today's output.
  - Codex SessionStart, Codex SubagentStart, Codex PreToolUse allow and deny (same commands as above).
  - Malformed: stdin `not json`; stdin `{}`; stdin `{"hook_event_name":"PreToolUse"}` with no `tool_name`. Record today's behaviour for each hook, whatever it is.
  - Wrongly typed fields, for each hook: `tool_input.command` equal to `42`; `tool_input` equal to `"x"`; `hook_event_name` equal to `7`. Record today's behaviour.
  - Failed loads: the gate copies the repo's `hooks/` and `lib/` into a scratch tree, replaces one library with a file containing only `throw new Error('load')`, and runs the hook from the copy. Cases: Claude PreToolUse `Bash` with `git push --force origin main` and `lib/git-guard.js` replaced; Claude PreToolUse with `lib/lane-check.js` replaced; Claude PreToolUse `Agent` dispatch with `lib/dispatch-route.js` replaced; Codex PreToolUse with `lib/git-guard.js` replaced. Record today's exit code, stdout and stderr for each.
- `parseClaudeHookInput`: input `{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"ls"}}` returns `ok: true` with `value.tool_name` equal to `"Bash"`; input `"x"` returns `{ ok: false, reason: "hook input is not an object" }`.
- `parseCodexHookInput`: the same two cases with Codex's field names (read `hooks/fx-codex.js` for them) and the same failure reason text.
- Existing, unchanged: `node tests/gates/codex-hook-output.test.js`, `node tests/gates/codex-manifest.test.js`, `node lib/preamble.test.js`: exit 0.

**Risks:** a hoisted `import` of a guarded library moves its load outside the `try`; the failed-load cases catch that. The golden gate must be committed and green on the current JavaScript in this task's first commit, before any hook source exists, or it proves nothing. Recorded outputs that contain machine-specific values (paths, PIDs, temp names) are normalised by the gate in one documented place, never by editing the expected files. The Codex hook plants roles into `$CODEX_HOME`: the gate sets `CODEX_HOME` to a scratch directory.

**Idempotency:** the gate writes only under scratch directories it creates and removes; re-running is safe.

**Testing:** golden gate, unit parsers, existing gates, install and free conformance runs through `scripts/check-all`.

## Acceptance criteria
- [ ] Commit 1 of this task adds the golden gate and fixtures, green against the unported JavaScript hooks.
- [ ] Commit 2 ports the hooks; the golden gate stays green with no fixture changed.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write the golden gate and record every case from the current JavaScript hooks**
- [ ] **3. Run it: verify GREEN on the unported hooks**

Run: `scripts/build && node tests/gates/hook-output-golden.test.js`
Expected: PASS.

- [ ] **4. Commit the gate and fixtures by path**

```
git add src/tests/gates/hook-output-golden.test.ts tests/gates/hook-output-golden.test.js tests/gates/fixtures/hook-golden scripts/check-all
git commit -m "test(hooks): record hook outputs before the TypeScript port"
```

- [ ] **5. Write the parser tests**
- [ ] **6. Run them: verify RED**

Run: `scripts/build && node lib/hook-input.test.js`
Expected: fails because the parsers do not exist.

- [ ] **7. Implement the parsers, then port the three hooks**
- [ ] **8. Run: verify GREEN**

Run: `scripts/build && node lib/hook-input.test.js && node tests/gates/hook-output-golden.test.js && node tests/gates/codex-hook-output.test.js && node tests/gates/codex-manifest.test.js`
Expected: PASS, no fixture changed.

- [ ] **9. Run the scope**

Run: `scripts/check-all` (tracked background command)

- [ ] **10. Commit by path**

```
git add src/hooks/fx-context.ts src/hooks/fx-pretooluse.ts src/hooks/fx-codex.ts src/lib/hook-input.ts src/lib/hook-input.test.ts src/lib/types.ts lib/types.js hooks/fx-context.js hooks/fx-pretooluse.js hooks/fx-codex.js lib/hook-input.js lib/hook-input.test.js scripts/check-all
git commit -m "refactor(hooks): hooks in TypeScript with typed harness input and output"
```
