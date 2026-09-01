---
name: fx-debug
description: >
  Use when encountering any bug, test failure, or unexpected behavior, BEFORE
  proposing fixes. Also on "debug this", "diagnose", "why is this failing",
  "this is broken", "it throws", "it's slow", "flaky test", "regression",
  "build failure", "why is this happening". Covers correctness bugs,
  performance regressions and non-deterministic failures.
---

# fx-debug

**Core principle: ALWAYS find the root cause before attempting fixes. Symptom
fixes are failure.**

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

**If you haven't completed Phase 1, you cannot propose fixes.**

Random fixes waste time and create new bugs. Quick patches mask underlying
issues.

## When to use

Test failures · bugs in production · unexpected behavior · performance
problems · build failures · integration issues.

**ESPECIALLY when:** under time pressure (emergencies make guessing tempting) ·
"just one quick fix" seems obvious · you've already tried multiple fixes · the
previous fix didn't work · you don't fully understand the issue.

**Don't skip when:** the issue seems simple (**simple bugs have root causes
too**) · you're in a hurry (**rushing guarantees rework**) · it's wanted fixed
NOW (**systematic is faster than thrashing**).

**Complete each phase before proceeding to the next.** This is a discipline for
hard bugs — **skip a phase only when you can state the justification, and state
it.** ("A minimal repro already exists from the bug report, so Phase 2 is
done.") An unstated skip is not a justified one, and no justification reaches
the Iron Law: root cause always precedes a fix.

## Showing your work, safely

This skill has you show commands, outputs and captured artifacts.

**Redact every secret first** — write `<REDACTED>` in its place. Build loops
against environment variables, so the credential stays in the environment
rather than in what you show. **Captured artifacts carry auth headers:** quote
only the lines that carry the signal.

If the redacted output is not enough to diagnose the bug, **say so and ask.**

Nothing goes outward: no uploading a HAR file, a log dump, or a core dump
anywhere.

---

## Phase 1 — Build a feedback loop

**This is the skill. Everything else is mechanical.**

If you have a tight pass/fail signal that goes **red on this bug**, you will
find the cause — bisection, hypothesis testing and instrumentation all just
consume it. **If you don't have one, no amount of staring at code will save
you.**

**Spend disproportionate effort here. Be aggressive. Be creative. Refuse to
give up.**

### Inputs that shape the loop

- **Read the error message carefully.** Don't skip past errors or warnings —
  they often contain the exact solution. Read stack traces **completely**. Note
  line numbers, file paths, error codes.
- **Check recent changes.** What changed that could cause this? `git diff`,
  recent commits, new dependencies, config changes, environmental differences.
- Read `CONTEXT.md` for a mental model of the modules involved, and check the
  ADRs in the area.

### Ten ways to build the loop

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **HTTP script** (curl) against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good
   snapshot.
4. **Headless browser script** driving the UI, asserting on DOM/console/network.
5. **Replay a captured trace** — save a real request, payload or event log to
   disk and replay it through the code path in isolation.
6. **Throwaway harness** — a minimal subset of the system (one service, mocked
   deps) that exercises the bug path with a single function call.
7. **Property / fuzz loop** — "sometimes wrong output" → run 1000 random inputs
   and look for the failure mode.
8. **Bisection harness** — appeared between two known states (commit, dataset,
   version)? Automate "boot at state X, check, repeat" so `git bisect run` can
   drive it.
9. **Differential loop** — same input through old vs new (or two configs), diff
   the outputs.
10. **HITL bash script — last resort.** If a human must click, drive *them*
    with `scripts/hitl-loop.template.sh` so the loop is still structured.
    Captured output feeds back to you.

**Build the right feedback loop and the bug is 90% fixed.**

### Tighten it — treat the loop as a product

- **Faster?** Cache setup, skip unrelated init, narrow the test scope.
- **Sharper signal?** Assert on the specific symptom, not "didn't crash".
- **More deterministic?** Pin time, seed the RNG, isolate the filesystem,
  freeze the network.

**A 30-second flaky loop is barely better than no loop; a 2-second
deterministic one is a debugging superpower.**

**Non-deterministic bugs:** the goal is not a clean repro but a **higher
reproduction rate.** Loop the trigger 100×, parallelise, add stress, narrow
timing windows, inject sleeps. **A 50%-flake bug is debuggable; 1% is not** —
keep raising the rate until it is.

### When you genuinely cannot build a loop

**Stop and say so explicitly.** List what you tried. Ask for:

- access to whatever environment reproduces it,
- a **redacted** captured artifact (HAR, log dump, core dump, screen recording
  with timestamps),
- permission to add temporary production instrumentation.

**Do not proceed to hypothesise without a loop.**

### Phase 1 is done when

You can name **one command you have already run at least once** — show the
invocation and its output, redacted — and it is:

- [ ] **Red-capable** — drives the actual bug code path and asserts the user's
      exact symptom, so it goes red on this bug and green once fixed. Not "runs
      without erroring": it must catch **this** bug.
- [ ] **Deterministic** — same verdict every run (flaky bugs: a pinned, high
      reproduction rate).
- [ ] **Fast** — seconds, not minutes.
- [ ] **Agent-runnable** — you can run it unattended; a human in the loop only
      via `scripts/hitl-loop.template.sh`.

**If you catch yourself reading code to build a theory before this command
exists, stop.** Jumping straight to a hypothesis is the exact failure this
skill prevents.

**No red-capable command, no Phase 2.**

---

## Phase 2 — Reproduce and minimise

Run the loop. Watch it go red.

Confirm:

- The loop produces **the failure mode the user described**, not a different
  failure that happens to be nearby. **Wrong bug = wrong fix.**
- The failure is reproducible across multiple runs (or, for non-deterministic
  bugs, at a high enough rate to debug against).
- You have **captured the exact symptom** — error message, wrong output, slow
  timing — so later phases can verify the fix actually addresses it.
- **Can you trigger it reliably, and what are the exact steps?** Write the
  steps down — the command, the input, the state, the sequence. They are what
  the regression test is built from in Phase 5, and what the user needs if you
  have to hand the bug back.
- **Not reproducible at all? Gather more data — don't guess.** An
  unreproducible bug is a Phase 1 failure, not a licence to hypothesise.

**Minimise.** Shrink the repro to the smallest scenario that still goes red.
Cut inputs, callers, config, data and steps **one at a time**, re-running after
each cut. Keep only what is load-bearing.

**Why:** a minimal repro shrinks the hypothesis space in Phase 3 — fewer moving
parts left to suspect — and becomes the clean regression test in Phase 5.

**Done when every remaining element is load-bearing:** removing any one of them
makes the loop go green.

**Do not proceed until you have reproduced and minimised.**

---

## Phase 3 — Hypothesise

**Generate 3–5 ranked hypotheses before testing any of them.** Single-hypothesis
generation **anchors on the first plausible idea.**

**Each must be falsifiable — state the prediction it makes:**

> "If `<X>` is the cause, then `<changing Y>` will make the bug disappear /
> `<changing Z>` will make it worse."

**If you cannot state the prediction, the hypothesis is a vibe. Discard or
sharpen it.**

### Generating candidates — pattern analysis

- **Find working examples.** Locate similar *working* code in the same
  codebase. What works that's similar to what's broken?
- **Compare against references.** Implementing a pattern? Read the reference
  implementation **COMPLETELY** — don't skim, read every line. Understand it
  fully before applying it.
- **Identify differences.** What differs between working and broken? **List
  every difference, however small. Don't assume "that can't matter".**
- **Understand dependencies.** What other components does this need? What
  settings, config, environment? What assumptions does it make?

### Show the ranked list before testing

The user often has domain knowledge that re-ranks it instantly ("we just
deployed a change to #3"), or knows which ones they've already ruled out.
**Cheap checkpoint, big time saver. Don't block on it** — proceed with your
ranking if they're away.

---

## Phase 4 — Instrument and test

**Each probe must map to a specific prediction from Phase 3. Change one
variable at a time.**

**Test minimally:** make the SMALLEST possible change that tests the
hypothesis. One variable. **Don't fix multiple things at once.**

Worked? → Phase 5. Didn't? → **form a NEW hypothesis. DON'T add more fixes on
top.**

### Tool preference

1. **Debugger / REPL inspection** if the environment supports it. **One
   breakpoint beats ten logs.**
2. **Targeted logs at the boundaries that distinguish hypotheses.**
3. **Never "log everything and grep".**

**Tag every debug log with a unique prefix** — `[DEBUG-a4f2]`. Cleanup becomes
a single grep. **Untagged logs survive; tagged logs die.**

### Multi-component systems

When the system has multiple components (request → service → database, CI →
build → sign), **add diagnostic instrumentation at each boundary before
proposing fixes.** For each boundary: log what data enters, log what data
exits, verify environment/config propagation, check state at each layer.

Run **once** to gather evidence showing **WHERE** it breaks → analyse to
identify the failing component → then investigate **that** component.

### Deep in the call stack

Error deep in the stack? Trace **backward** to the original trigger:
where does the bad value originate → what called this with the bad value →
keep tracing up until you find the source → **fix at the source, not at the
symptom.**

Full technique: `../../references/vocab/root-cause-tracing.md`.

### Performance regressions

**For performance, logs are usually wrong.** Establish a **baseline
measurement** — timing harness, profiler, query plan — then bisect.
**Measure first, fix second.**

### When you don't know

Say **"I don't understand X."** Don't pretend to know. Ask. Research more.

---

## Phase 4.5 — The circuit breaker

**If a fix doesn't work: STOP. Count how many you have tried.**

- **Fewer than 3** → return to Phase 1 and re-analyse with the new information.
- **3 or more** → **STOP and question the architecture.**

**DON'T attempt fix #4 without an architectural discussion.**

Three failed fixes is a pattern, and the pattern means something:

- each fix reveals new shared state, coupling, or a problem **in a different
  place**;
- fixes require "massive refactoring" to implement;
- each fix creates **new symptoms elsewhere**.

Then ask: is this pattern fundamentally sound? Are we sticking with it through
sheer inertia? Should we refactor the architecture rather than continue fixing
symptoms?

**Discuss with the user before attempting more fixes. This is NOT a failed
hypothesis — this is a wrong architecture.** Route it to `fx-architecture`.

---

## Phase 5 — Fix and regression test

**Write the regression test before the fix — but only if there is a correct
seam for it.**

A **correct seam** is one where the test exercises the real bug pattern **as it
occurs at the call site.** If the only available seam is too shallow — a
single-caller test when the bug needs multiple callers, a unit test that can't
replicate the chain that triggered it — **a regression test there gives false
confidence.**

**If no correct seam exists, that itself is the finding.** Note it: the
codebase architecture is preventing the bug from being locked down. Flag it for
Phase 6 and consider `fx-architecture`.

With a correct seam:

1. Turn the **minimised repro** into a failing test at that seam. **An
   automated test in the project's framework where one exists** (rspec, xUnit,
   JUnit, XCTest — `.fx.json` names the runner); **a one-off test script if
   there is no framework at that seam.** A script that reproduces and asserts
   is worth more than no test at all, and it can be promoted later.
2. **Watch it fail.** Use `fx-tdd` for the RED/GREEN mechanics — including
   which RED is valid (runtime vs compile-time) and the anti-tautology rules.
3. Apply the fix.
4. Watch it pass.
5. **Re-run the Phase 1 loop against the original, un-minimised scenario.**

**Implement a single fix.** Address the root cause identified. ONE change at a
time. **No "while I'm here" improvements. No bundled refactoring.**

Verify: the test passes · no other tests broken · the issue is actually
resolved. Apply `fx-implement`'s Iron Law before claiming success — **evidence
before claims.**

### Defense in depth — optional, after the root cause is found

When the bug was caused by invalid data flowing through layers, **one
validation can be bypassed** by a different code path, a refactor, or a mock.
Adding checks at every layer the data passes through makes the bug
*structurally impossible* rather than merely fixed.
See `../../references/vocab/defense-in-depth.md`.

---

## Phase 6 — Cleanup

**Required before declaring done.**

- [ ] The original repro no longer reproduces — **re-run the Phase 1 loop**
- [ ] The regression test passes (**or the absence of a correct seam is
      documented**)
- [ ] **All `[DEBUG-...]` instrumentation removed** — grep the prefix
- [ ] Throwaway prototypes deleted, or moved to a clearly-marked debug location
- [ ] **The hypothesis that turned out correct is stated in the commit message,
      so the next debugger learns**

---

## When there is genuinely no root cause

If systematic investigation shows the issue is truly environmental,
timing-dependent, or external:

1. You've completed the process.
2. Document what you investigated.
3. Implement appropriate handling — retry, timeout, a clear error message.
4. Add monitoring/logging for future investigation.

**But: 95% of "no root cause" cases are incomplete investigation.**

---

## Red flags — STOP, return to Phase 1

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Pattern says X but I'll adapt it differently"
- "Here are the main problems:" — listing fixes without investigation
- Proposing solutions before tracing the data flow
- "One more fix attempt" — when you've already tried 2+
- Each fix reveals a new problem in a different place
- Reading code to build a theory before a red-capable command exists

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes have failed: question the architecture (Phase 4.5).**

## Signals from the user — STOP, return to Phase 1

| They say | It means |
|---|---|
| "Is that not happening?" | You assumed without verifying |
| "Will it show us…?" | You should have added evidence gathering |
| "Stop guessing" | You're proposing fixes without understanding |
| "Ultra-think this" | Question fundamentals, not just symptoms |
| "We're stuck?" (frustrated) | Your approach isn't working |

## Rationalizations

| Excuse | Reality |
|---|---|
| "The issue is simple, I don't need the process" | Simple issues have root causes too. The process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is **faster** than guess-and-check thrashing. |
| "Just try this first, then investigate" | The first fix sets the pattern. Do it right from the start. |
| "I'll write the test after confirming the fix works" | Untested fixes don't stick. The test first is what proves it. |
| "Multiple fixes at once saves time" | You can't isolate what worked, and it causes new bugs. |
| "The reference is too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding the root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = an architectural problem. Question the pattern, don't fix again. |
| "I'll build the loop after I understand the code" | Backwards. The loop is how you come to understand the code. |

## Quick reference

| Phase | Do | Output |
|---|---|---|
| 1. Feedback loop | Build a red-capable, deterministic, fast, agent-runnable command | One command, already run |
| 2. Reproduce + minimise | Watch it go red; cut until every element is load-bearing | A minimal repro |
| 3. Hypothesise | 3–5 ranked, falsifiable, each with a prediction | A ranked list, shown |
| 4. Instrument | One probe per prediction, one variable at a time | Confirmed cause, or a new hypothesis |
| 4.5 Circuit breaker | 3 failed fixes → question the architecture | An architectural discussion |
| 5. Fix + test | Regression test at a correct seam, then the fix | Bug resolved, loop green |
| 6. Cleanup | Re-run the loop, grep the debug prefix, record the hypothesis | Done |

## Supporting techniques

- `../../references/vocab/root-cause-tracing.md` — trace backward through the call
  stack to the original trigger
- `../../references/vocab/defense-in-depth.md` — validate at every layer after
  finding the root cause
- `../../references/vocab/condition-based-waiting.md` — replace arbitrary timeouts
  with condition polling
