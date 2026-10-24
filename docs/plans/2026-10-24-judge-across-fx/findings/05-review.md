### Spec Compliance

- ✅ Spec compliant for 1.x and for the 2.x fallback. Ruling "task 05 concern 1" (2.x gets no hint, accepted if evidence supports it): the evidence holds. Read-only check, a strings read of the opencode binary filtered on the trigger call for the session prompt event (one hit, line 708347): the event is built as `{sessionID, messageID, prompt: structuredClone({text, files, agents, skills}), metadata, delivery}`. No `agent` field; `prompt.agents` is the mentioned-agents list. The cited quote in `references/harnesses/opencode-v2.md` matches the binary text. The opencode binary was not run.
- Ruling C6 (both `V2_AWAITS_BEFORE` values testable): the reference states execute.before is awaited and names the missing agent field as the only blocker; the test makes zero requests with `agent: 'build'` in the event (opencode-lane-hint.test.ts case 7). The reference phrase `fx gives no lane hint on 2.x:` plus a reason is present (opencode-v2.md, checked by case 8 regex).
- Ruling on test-scope.test.ts in scope: followed (src/scripts/test-scope.test.ts and generated scripts/test-scope.test.js updated).
- Brief file list: every listed file has a hunk. `src/plugins/fx-opencode-v2.ts` is comment-only, correct for the no-hint branch. `parseOpencodeV2PromptText` is delivered and tested as the brief's interface requires.
- Acceptance: primary agent gets one line (case 1, 3); child session makes zero requests (case 2); 2.x measured and documented; ALL GREEN reported by the controller.
- ⚠️ Cannot verify from diff: `decideLaneHint` internals (skips, breaker, log line) are task 03's and unchanged; the slow-judge bound in case 6 relies on its budget.

### Strengths

- `isPrimaryAgent` (src/lib/opencode-agents.ts:8-13) is tiny, handles non-object config entries and the `mode: subagent` override of `build`, and its test covers every brief case plus three extra edges.
- Hint is enqueued after `queue.startTurn` and the journal mark (fx-opencode-v1.ts chat.message), so `startTurn` cannot clear it; case 1 proves one delivery and none on a second transform.
- Load of the new modules sits in its own `try` with a typed `require`, so a load failure costs only the hint; the Stop reminder and journal mark are untouched (opencode-turn gate passes unchanged per report).
- Text parser never records or logs the prompt; 1.x parser returns `undefined` for empty, non-text and null input.
- Real RED evidence for all three tests (missing module, absent parsers, `0 !== 2`), and the 2.x slice is covered by an in-process test with the hook event built from the measured fields.

### Issues

#### Critical (Must Fix)
none

#### Important (Should Fix)
none

#### Minor (Nice to Have)

- src/plugins/fx-opencode-v1.ts (chat.message, `if (!journal) return;` at its top, before the hint block): the hint is skipped whenever the session journal failed to load or the session id is missing, though the hint needs neither. A journal failure thus silently costs the hint, with only the journal's own warning. Move the hint block ahead of the journal early returns, or accept and note it.
- src/plugins/fx-opencode-v1.ts (hint catch, `warnOnce(\`[fx] lane hint off: ${messageOf(e)}\`)`): `warnOnce` dedupes by full line, so two different error messages print twice; the brief says once per plugin instance. Use a fixed key or a boolean if strict.
- src/tests/gates/opencode-lane-hint.test.ts (case 1 and others): `hints()` counts exact-line equality, so a hint pushed with different framing would read as zero; fine today, but no case asserts the failure path (`lane hint off` warning after a throw), which the brief's interface names. A load-failure or throwing-judge test would pin it.

### Assessment

**Task quality:** Approved
**Reasoning:** 1.x behaviour matches every brief case with valid RED evidence, and the 2.x no-hint ruling is supported by the binary text (the prompt event has no agent field). Remaining items are polish.

## Ledger lines

Task 05: minor (deferred): chat.message returns on missing journal or session id before the lane hint block, so a journal failure also drops the hint.
Task 05: minor (deferred): warnOnce dedupes by full message, so "lane hint off" can print more than once per plugin instance.
Task 05: minor (deferred): no test covers the "[fx] lane hint off: <message>" failure path.
