# Verification Before Completion

**Evidence before claims, always.**

The Iron Law and the gate function live inline in `fx-implement`: they fire
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
| "I ran the command and read the output" | In which environment? Same command, different context, different truth. |

## Context is a dimension, not a detail

A command run in the wrong environment answers a **different question**, not a
wrong one: that is what makes it dangerous. It exits 0, it prints real
output, and none of the five steps (IDENTIFY / RUN / READ / VERIFY / claim)
catches it, because all five can be followed correctly and the environment
can still be wrong. Add a sixth check before you claim anything
version-dependent, dependency-dependent, or environment-dependent: **is this
the environment the project actually runs in?**

| Ran this | Not this | Because |
|---|---|---|
| `bundle exec ruby -e "require 'rack'"` | `ruby -e "require 'rack'"` | Bare Ruby resolves whatever gem is installed globally; the bundle resolves what the Gemfile.lock actually pins. Two different Rack versions, two different answers. |
| `docker compose exec app rspec` | `rspec` on the host | The container has its own Ruby, gems, and env vars. A host run can pass or fail for reasons that don't exist inside the container. |
| `RAILS_ENV=test bin/rails runner '...'` | `bin/rails runner '...'` (defaults to development) | Different env, different database, different feature flags, different loaded initializers. |
| a command in the engine that owns the file | the same command from repo root, or another engine | Multi-engine repos resolve dependencies and routes per engine; running from the wrong one silently answers for the wrong app. |

**The rule:** for anything version-, dependency-, or environment-dependent,
run it the way the project runs it: `bundle exec`, inside the container,
with the app's env loaded, in the right engine. Otherwise the answer is about
your machine, not about the code, and reporting it as verification is the
same failure as not running the command at all: you just get to feel worse
about it, later, when it's found by someone else.

### An exit code is not a result

**Read the first line of output before you believe the exit code.** A test
runner given no arguments prints `usage:` and exits non-zero. A command that
did not run at all is indistinguishable from a failing one if you only look at
`$?`, and the direction of the mistake is always toward alarm: nothing ran, and
you report a red gate.

Measured: three fx guard suites were recorded as broken at HEAD. They take a
main checkout and a worktree as arguments, documented in the README two lines
above the command. Run correctly they pass 87, 27 and 13.

**Re-running is not a second opinion.** That claim was "confirmed" by stashing
every local change, re-running, and seeing the same failures, which proved only
that the breakage predated the change. **A wrong method returns the same wrong
answer before and after, and the stability of a wrong answer reads exactly like
confirmation.** Repeating a measurement tests whether it is stable; it never
tests whether it is the right measurement. Those need different checks, and only
the second one is worth doing before you report.

Before recording any check as failing: read its first line, and check how the
project says to invoke it.

**And a pipe eats the status you meant to read.** `cmd | head -6` followed by
`echo $?` reports `head`'s exit, which is almost always 0. So the shape people
reach for when a command is chatty, pipe it somewhere short and print the
status, is the shape that silently replaces the answer with a constant.

Measured: a check was briefed to a subagent as "exits 0, so read the output
rather than the code". It exits 1. The 0 came from `head`. The subagent ran the
command straight and reported the real code, which is the only reason the brief
was corrected rather than propagated.

Use `${PIPESTATUS[0]}`, or `set -o pipefail`, or run the command unpiped when
the status is the thing you are claiming. **The two rules pair: read the first
line of output, and make sure the status you quote belongs to the command you
are talking about.**

### A report you have not received is not a report

If you delegate a check, its result is evidence when it **arrives and you read
it**, and not before. An in-flight check is a plan. Writing up its expected
conclusion, in the same voice as the things you measured, converts a plan into a
claim without anyone deciding to.

Measured: a branch review dispatched two checks, received one, and presented
items from both as verified. Asked about it afterwards it ran the mutations
itself, and **one of the three claims was false**: the test it said would stay
green failed, because the test enforced exactly what its name said. The other
two held. So the honest disclosure cost one finding and saved the credibility of
the rest.

Two habits fix it. Keep delegated results in a different column from things you
ran, and never merge the columns while one is empty. And if a result has not
arrived by the time you report, **say that**: "dispatched, no result yet" is a
sentence a reader can act on, where a confident paragraph about what it probably
found is not.

## Key patterns

**Tests**

```
✅ [run the test command] [see: 34/34 pass] → "All tests pass"
❌ "Should pass now" · "Looks correct"
```

**Regression tests: the red-green proof**

```markdown
✅ Write → run (passes) → REVERT the fix → run (MUST FAIL) → restore → run (passes)
❌ "I've written a regression test" : without the red-green cycle
```

A regression test never seen failing is not a regression test. This one is also
inlined in `fx-tdd`, because that is where regression tests get written.

**Build**

```markdown
✅ [run the build] [see: exit 0] → "Build passes"
❌ "The linter passed" : the linter doesn't check compilation
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
