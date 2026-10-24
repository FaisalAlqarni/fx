### Spec Compliance

- ❌ Issues found. Two Important findings below are plan-mandated: the refusal key at src/lib/edit-rules.ts:223,247 and the crash path at src/lib/edit-rules.ts:156-158. Everything else matches the brief: every listed file has its hunk, and `src/tests/gates/codex-hook-output.test.ts` is rightly unchanged because no new key is printed. The files touched outside the list (session-input, judge.ts, test-scope.test, the two narrowed gates) are each needed by the task.
- ⚠️ Cannot verify from diff: `decideStop` computes the notice only when `mode === 'block'` (src/lib/stop-check.ts:3219 in the diff). The brief says "for the root session, before any early return". The opencode reminder path gets no notice, so task 08 must wire it. The controller should carry this to task 08's brief.
- ⚠️ Cannot verify from diff: whether Claude Code's `Write` tool_input carries LF content for a CRLF file on disk. Important 3 depends on it. Check it on a Windows checkout with `core.autocrlf=true`.

Checks you asked for:

- **Concern 1, narrowed assertions: meaning kept.**
  - judge-health prune (src/tests/gates/judge-health.test.ts:96-100): the aged files are `old.jsonl` and `new.jsonl`. Filtering out `s1.jsonl` cannot hide a missed prune.
  - turn-journal "Stop adds nothing" (diff 3861-3863): still pins 3 turn events and adds exactly 1 `fx-json` line.
  - turn-journal "SessionStart records nothing" (diff 3889): now pins the journal to exactly `['fx-json']`, which is stricter than before.
- **F1: holds for Edit, MultiEdit and patches; not for every Write.**
  - `addedLines` consumes each old line once (src/lib/edit-rules.ts:40).
  - `written` diffs a Write against `readText(file) ?? ''`.
  - Process case 2 (diff 3505-3512) proves "an existing em dash plus a clean addition is allowed" with a judge configured and zero requests.
  - Exception: a Write against a file with different line endings loses F1 (Important 3).
- **Who can refuse.** Built-ins refuse from code (src/lib/edit-rules.ts, the loop over `BUILTIN_RULES`). A judged refusal needs `answer === 'breach' && refusingRule(id)`. A failed request leaves `answer` undefined, so `answered.find` skips it and the edit is allowed. Unsure and unmeasured breaches advise. `log-only` returns ALLOW before any decision. All of this is correct, but `refusingRule` keys on the id alone (Important 2).
- **Guard outcomes.**
  - Git guard: Codex `inspect(raw)` and its deny still run first and are unchanged (src/hooks/fx-codex.ts:298-311). The Claude Code Bash branch is untouched.
  - fx-state refusal: `checkPatchPaths` runs synchronously before `checkEdit` on both Codex paths. On Claude Code, `namesFxState` and the lane check still precede it (src/hooks/fx-pretooluse.ts:243-250). The deny-on-crash `crashed` handler is removed only after those pass.
  - Shell guard: a non-patch command calls `shellGuard`, whose body is the old code moved unchanged. A shell-run patch now reaches the hard rules only after `checkEdit` resolves. A refusal there still denies, with a different message. The only change in fail-closed behaviour is in Minor 3.

### Strengths

- Making `shellGuard` its own function keeps the non-patch shell path the same code as before. The Codex shell-run patch keeps `crashed` armed through the edit check, which is the right reading of fail-closed (report item 5).
- `replaced` uses a function replacer, so `$&` in `new_string` is taken literally, and there is a test for it (diff 746-750).
- Process cases 13 to 15 really measure the deadline and the separate breaker against a delaying fake server, including the shell guard still asking after the features' breaker opens.
- The parser drops bad entries one by one and pins every reason string, including the length caps.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **src/lib/edit-rules.ts:54-66, `globMatch` (lib/edit-rules.js:442-461): a rule glob can hang the hook through regex backtracking.**
   - **What is wrong:** each `*` becomes `[^/]*` and each `**/` becomes `(?:[^/]*/)*`, and runs of them are never collapsed. `.fx.json` allows a 200-character glob, and the agent can write that file. A glob like `'*'.repeat(150) + 'x'` that fails to match a 30 to 40 character path forces V8's backtracking engine through on the order of C(m+k, k) paths. Repeated `**/` against a deep path behaves the same way.
   - **Why it matters:** this runs synchronously in PreToolUse on every write, before and outside `EDIT_DEADLINE_MS`. One bad rule stalls every edit until the harness's hook timeout.
   - **How to fix:** collapse consecutive `*` and `**/` in `globMatch`, or better, match with a linear wildcard matcher instead of a regex. Add a unit test that `globMatch('*'.repeat(150) + 'x', 'a'.repeat(40))` returns false in milliseconds. I could not run this here.
2. **src/lib/edit-rules.ts:223 and :247: `refusingRule(a.rule.id)` decides refusal by id alone (plan-mandated: the brief's interface names `refusingRule(id)`).**
   - **What is wrong:** `.fx.json` rules are free text and agent-writable. Any rule named `web-img-alt` or `dotnet-no-blocking-async` refuses with whatever `glob` and `rule` text it carries.
   - **Why it matters:** the measurement that earned refusal (task 02) was for a specific rule sentence on specific files. Ruling F2, "only a rule with its own measured bar may refuse", is not enforced. The fx-setup row (commands/fx-setup.md, the `rules` row) makes the same promise.
   - **How to fix:** key the refusal on `id` plus the measured rule text, for example a `REFUSING_RULES` entry holding `{ id, rule }` that is compared exactly. Advise when the text differs.
3. **src/lib/edit-rules.ts:40, `addedLines` (via `written`): splits on `\n` only.**
   - **What is wrong:** when the file on disk is CRLF and the Write content is LF, or the reverse, no old line matches. The whole file then counts as added.
   - **Why it matters:** an old em dash, conflict marker or fixture secret anywhere in the file refuses the Write. That is exactly what F1 forbids, and the only way out is turning every edit rule off. fx supports Windows (PowerShell paths, `LOCALAPPDATA`). See the ⚠️ above for the open question.
   - **How to fix:** strip a trailing `\r` from both sides before comparing. Add a unit case `addedLines('a\r\nb', 'a\nb\nc') === 'c'`.
4. **src/lib/edit-rules.ts:156-158, `checkEdit` catch (plan-mandated: the brief says a throw writes to stderr only).**
   - **What is wrong:** an exception inside `decide` returns ALLOW and writes only to stderr. The hooks' `off` handlers do the same (src/hooks/fx-pretooluse.ts:1999, src/hooks/fx-codex.ts:1856 in the diff).
   - **Why it matters:** Claude Code does not normally show stderr from a PreToolUse hook that exits 0. A bug that throws on every call would silently switch off the built-in no-secrets and no-dashes refusals, with nothing in `decisions.jsonl` to show it. `stopText` in src/lib/stop-check.ts already logs `source: 'stop-error', action: 'allow', unavailable: <message>` for the same situation.
   - **How to fix:** log one `edit-rule` line with `source: 'rule-error'` and `unavailable` in the catch, wrapped in its own try. Add a process test where `decide` throws (today only the load failure is tested, diff 3685-3696).

#### Minor (Nice to Have)

1. **src/tests/gates/edit-rules.test.ts, case 4 (diff 3531): the assertion that the log holds no `sk-proj` passes by construction.** The log `text` is always `<rel> <id>` and never holds content, so the test proves nothing about redaction.
2. **src/tests/gates/edit-rules.test.ts, Codex blocks (diff 3697-3722): no case for a shell-run patch that passes the edit rules and is then denied by a shell hard rule.** For example, a heredoc patch followed by a hard-deny command. The hard-rule outcome for patch commands now depends on the new `.then` path and is untested.
3. **src/hooks/fx-codex.ts:1849 in the diff: `shellGuard` now runs inside a `.then` callback.** A synchronous throw from `classifyShell` becomes an unhandled rejection, not an uncaught exception. It still reaches `crashed`, and so denies, only under Node's default `--unhandled-rejections=throw`. With `NODE_OPTIONS=--unhandled-rejections=warn` the hook exits 0 with no output, so the command is allowed and the hard rule is skipped. Before this change the throw was synchronous and always denied.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The refusal paths, fail-open handling and guard ordering are correct, and so are the narrowed assertions. But a user glob can hang every PreToolUse call, a refusal is granted by id rather than by the measured rule, and CRLF files break F1 for Write. A crash inside the rule check leaves no trace in the decision log.

## Ledger lines

Task 07: minor (deferred): edit-rules gate case 4 asserts the log has no sk-proj, which holds by construction since text is path plus id.
Task 07: minor (deferred): no process test that a Codex shell-run patch passing the edit rules is still denied by a shell hard rule.
Task 07: minor (deferred): Codex shellGuard runs inside a promise callback, so a classifyShell throw denies only under Node's default unhandled-rejections=throw.
