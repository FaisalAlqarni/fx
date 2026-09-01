# Verification Before Completion

**Evidence before claims, always.**

The Iron Law and the gate function live inline in `fx-implement` — they fire
on every task. This file holds what is consulted on demand: the failures
table, the rationalizations, the per-domain patterns, and the scope of the
rule.

**Violating the letter of this rule is violating its spirit.**

## The failures table

| Claim | Requires | NOT sufficient |
|---|---|---|
| Tests pass | test output, 0 failures | a previous run · "should pass" |
| Linter clean | linter output, 0 errors | a partial check · extrapolation |
| Build succeeds | exit 0 | the linter passed · logs look fine |
| Bug fixed | the original symptom retested | the code changed |
| Regression test works | **red-green cycle verified** | it passes once |
| Subagent completed | **the diff** | the agent's success report |
| Requirements met | line-by-line checklist | tests passing |

## Rationalizations

| Excuse | Reality |
|---|---|
| "Should work now" | **RUN** the verification. |
| "I'm confident" | Confidence ≠ evidence. |
| "Just this once" | No exceptions. |
| "Linter passed" | Linter ≠ compiler. |
| "The agent said success" | Verify independently. |
| "I'm tired" | Exhaustion ≠ excuse. |
| "A partial check is enough" | Partial proves nothing. |
| "Different words, so the rule doesn't apply" | Spirit over letter. |

## Key patterns

**Tests**

```
✅ [run the test command] [see: 34/34 pass] → "All tests pass"
❌ "Should pass now" · "Looks correct"
```

**Regression tests — the red-green proof**

```
✅ Write → run (passes) → REVERT the fix → run (MUST FAIL) → restore → run (passes)
❌ "I've written a regression test"  — without the red-green cycle
```

A regression test never seen failing is not a regression test. This one is also
inlined in `fx-tdd`, because that is where regression tests get written.

**Build**

```
✅ [run the build] [see: exit 0] → "Build passes"
❌ "The linter passed"  — the linter doesn't check compilation
```

**Requirements**

```
✅ Re-read the plan → build a checklist → verify each → report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation**

```
✅ Agent reports success → check the VCS diff → verify the changes → report actual state
❌ Trust the agent's report
```

## When to apply

**ALWAYS before:**

- Any variation of a success or completion claim
- **Any expression of satisfaction**
- Any positive statement about the state of the work
- Committing, or marking a task complete
- Moving to the next task
- Delegating to an agent

## What the rule covers

It applies to **exact phrases, paraphrases, synonyms, implications of success,
and any communication suggesting completion or correctness.**

Rewording is not an exemption. If a sentence would leave the reader believing
the work passes, it is a claim, and it needs evidence run in that same message.
