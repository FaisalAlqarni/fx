### Spec Compliance

I read the diff 43e21a6..d7ce641 in passes: hooks, parser and types first, then the gate, then the fixtures through a per-case summary of input, meta and exit. For the old hooks I read `git show 43e21a6:hooks/<file>`.

❌ Two items do not match the brief or the design.
- Malformed input. The design says "On malformed input each parser reproduces today's behaviour." For stdin `null`, fx-pretooluse no longer refuses. Important 2 below.
- Missing: the brief's Files list says `src/lib/types.ts` gains a "hook decision type". No `HookDecision` was added. The report states this under "Not done as instructed" and gives the reason (`GuardVerdict` already covers it). Minor 3.

✅ Matches the brief, verified:
- Files: the three hook sources, `src/lib/hook-input.ts` with both parsers, `src/lib/hook-input.test.ts`, the gate source and its build, the fixtures and the `scripts/check-all` lines (scripts/check-all:100-101) are all present. Generated hooks keep the shebang and the header. Modes are unchanged (100644 before and after).
- Golden cases: 39 of them. They cover every case the brief names: Claude SessionStart and SubagentStart, Bash allow, Bash deny in the worktree fixture, Agent routing, Write lane check, the Codex events with allow and deny, `not json`, `{}`, PreToolUse with no `tool_name`, and the three wrongly typed fields for each hook. The four failed loads are there too: git-guard, lane-check and dispatch-route on Claude, and git-guard on Codex. The lane-check failed-load case uses the same input as `claude-write-lane`, which is denied, so its exit 0 proves the fail-open path.
- Commit order: I extracted both commits with `git archive` and ran the gate in each tree. 772df2d, where the hooks are still hand-written JavaScript: `ok (39 cases)`. d7ce641: `ok (39 cases)`. `git diff 772df2d d7ce641 -- tests/gates/fixtures` is empty.
- `--record` exists for the golden gate (src/tests/gates/hook-output-golden.test.ts:29,101-104) and for the preamble-equivalence snapshot (src/lib/preamble-equivalence.test.ts:13-18), as the task 04 ruling requires. Both landed in commit 1, and the commit message says `--record` was used for recording.
- Parser failure text: both parsers return exactly `{ ok: false, reason: 'hook input is not an object' }` (src/lib/hook-input.ts:148,164,179), and the tests cover `"x"`, `null`, `7` and an array.
- Output types per harness: `ClaudeContextOutput`, `ClaudePreToolUseOutput`, `CodexHookOutput` (src/lib/types.ts:99-113). Each is used at its hook's single write.
- Ruling "a load that sits inside a try today stays a runtime require inside that try, typed as typeof import": holds in both PreToolUse sources and in the generated JavaScript. Every guarded load in hooks/fx-pretooluse.js and hooks/fx-codex.js is an inline `require` inside its `try`. No guarded lib is imported at the top.
- RED validity: the parser-load test in src/lib/hook-input.test.ts:56-77 fails on the old hooks, because they never load the parser and would allow `ls`. That RED is real. The hoisting probe in the report matches what the failed-load cases check.

⚠️ Not verified by me: `scripts/check-all` printing ALL GREEN. I was told not to rerun the suite. I ran only the golden gate in both commits and `node lib/hook-input.test.js` in d7ce641, and both passed.

Implementer's three listed behaviour changes, judged:
1. A failed load of the parser or lib/json is a real change. No golden case covers it, and it cannot have one because the old hooks never loaded these libraries. A throwing file fails closed, which is safe. An empty or export-less lib/json.js fails open in fx-pretooluse: Important 1. In fx-context the same failure is a silent crash: Minor 1. In Codex it refuses SessionStart: Minor 2.
2. A non-string `cwd` is a real change with no golden case. It is safe. The git guard ignores `cwd` (src/lib/git-guard.ts:234). I ran the old and new hooks with a force push and `"cwd":5`: both exit 2 with the same reason. For the lane check, the old hook threw and allowed the write, and the new one can deny it, which is the stricter direction. Minor 5.
3. Stdin `null` is a real change. In fx-context it is an improvement (a crash with exit 1 becomes the preamble). In fx-pretooluse it is unsafe in direction: a refusal became an allow, and the old output can be recorded. Important 2.

### Strengths
- The gate runs the hook as a whole process and compares stdout, stderr and exit code. It does this from scratch HOME, CODEX_HOME and TMPDIR, with an env of PATH only. Normalisation lives in one documented function (src/tests/gates/hook-output-golden.test.ts:52-61).
- The cases go past the brief where byte identity needed them: falsy and string `tool_input` for routing, a numeric `agent_id`, a numeric `tool_name`. These pinned the `tool_input || {}` semantics, which the parser reproduces (src/lib/hook-input.ts:158-161).
- The `message(e)` helper removes a latent crash in the old code. `deny(\`...${e.message}\`)` on a thrown `null` would have crashed at load and failed open.
- Codex now reads plant-roles functions off the module at call time, so the existing test that patches `isWritingToolCall` keeps working without a writable-export workaround.
- The report is candid about what it did not do and why, and it lists its own behaviour changes.

### Issues

#### Critical
None.

#### Important
- src/hooks/fx-pretooluse.ts:46-53,86 · The parser and lib/json load is not checked the way the guard load is. If lib/json.js loads but has no `parseJson` (an empty or truncated file), `parseJson(raw)` throws a TypeError inside a `try` whose `catch` exits 0, before the Bash branch. I reproduced this: with an empty lib/json.js, `git push --force origin main` exits 0. The old hook used the builtin JSON.parse and could not reach this state. Its guard load checks `typeof inspect !== 'function'` (line 40) for exactly this kind of partial install. The comment at lines 21-22 says the parser "fails closed like the guard", and here it does not. The security lens raised the same finding. · An empty lib file switches off the git guard for every command. · Fix: inside the load `try`, throw when `typeof parseJson !== 'function' || typeof parseClaudeHookInput !== 'function'`, as line 40 does. Add an "empty file" variant next to the throwing file in src/lib/hook-input.test.ts:63-74, for both libraries and both hooks.
- src/hooks/fx-pretooluse.ts:87-88 · Stdin `null` used to be refused. The old hook printed `[fx] hook crashed (Cannot read properties of null (reading 'tool_name')). Denying rather than assuming this is safe.` and exited 2. I ran 43e21a6's hook to confirm. Now the parse is not ok and the hook exits 0. The report says no golden case was possible because "the old output was a stack trace with JS line numbers". That is true for fx-context only. The PreToolUse output is a fixed line with no line numbers and can be recorded. The design requires today's behaviour on malformed input, and this flips a refusal to an allow. Practical exposure is small, because Claude Code sends an object, but the gate exists to catch exactly this kind of change. · Fix: either deny when `parsed === null`, reproducing the recorded line, and add a `pretooluse-null` golden case recorded from 43e21a6's hook; or get an owner ruling that accepts the allow and record the case as the new pinned behaviour, with `--record` named in the commit message.

#### Minor
- src/hooks/fx-context.ts:18-19 · lib/hook-input and lib/json are hoisted imports with no `try`. If either fails to load, the hook exits 1 and the session starts with no preamble. The "PREAMBLE.md could not be read" warning (lines 60-62), which exists so a session never silently lacks the rules, is skipped. The old hook had this risk only through lib/preamble. · Two new silent-failure points. · Fix: require both inside the existing render `try`, or in a `try` of their own that falls through to the warning text.
- src/hooks/fx-codex.ts:226-228 · A failed parser load refuses every event, SessionStart and SubagentStart included, so Codex gets no preamble and no role planting. The same file says a broken require "must not stop SessionStart from rendering the preamble" (lines 47-49). Refusing is the safe choice for PreToolUse. src/lib/hook-input.test.ts sends only a PreToolUse payload, so the SessionStart effect is not tested. · Fix: state the trade-off in the comment at lines 104-105, and add a SessionStart payload to the parser-load test so the behaviour is pinned.
- src/lib/types.ts · The "hook decision type" named in the brief's Files list was not added. The report states the omission and the reason. · Sub-project 2 may expect the name. · Fix: add `export type HookDecision = GuardVerdict`, or get the controller to drop it from the plan.
- src/lib/types.ts:99-113 · `ClaudeContextOutput` and `CodexHookOutput` have the same structure, apart from an optional `systemMessage`. A Claude value is assignable to the Codex type, which undercuts the design's "an adapter cannot return another harness's shape". · Fix: give each type a type-only brand, or accept it and note it in the type comment.
- src/hooks/fx-pretooluse.ts:93 and src/hooks/fx-codex.ts:157 · The non-string `cwd` fallback changes the lane-check result for a payload that could be recorded. A Write with `"cwd":5` exited 0 before, because laneCheck threw and allowed, and can now be denied. It is stricter and advice-class, but no golden case pins it. · Fix: add a `pretooluse-cwd-number` Write case so the decision is visible, with the controller accepting the new output.
- src/tests/gates/hook-output-golden.test.ts:69,86 · `spawnSync` has no `timeout`. A hook that hangs on stdin hangs check-all instead of failing a case. · Fix: pass `timeout: 10000` and report a null exit as a failure.

### Assessment
The gate is well built. It was green on the JavaScript before the port and is still green after it, with no fixture touched. The guarded-load ruling holds. Two points cannot be trusted yet. An empty lib/json.js turns off the git guard in Claude PreToolUse, because the new guarded load lacks the function check the guard load has. And stdin `null` changed from refused to allowed, on a stated rationale that is wrong for this hook. Both fixes are a few lines each, plus one test variant and one golden case.

## Ledger lines
Task 06: minor (deferred): fx-context imports lib/hook-input and lib/json outside any try, so a failed load skips the no-preamble warning.
Task 06: minor (deferred): Codex refuses SessionStart and SubagentStart when the parser fails to load; untested and against its own comment.
Task 06: minor (deferred): the hook decision type named in the brief was not added to src/lib/types.ts.
Task 06: minor (deferred): ClaudeContextOutput and CodexHookOutput are structurally interchangeable.
Task 06: minor (deferred): non-string cwd changes the lane-check result for a recordable Write payload with no golden case.
Task 06: minor (deferred): golden gate spawnSync has no timeout, so a hanging hook hangs check-all.
