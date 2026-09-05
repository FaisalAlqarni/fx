---
name: fx-authoring
description: >
  Use when creating or editing a skill, an agent definition, a subagent dispatch
  prompt, CLAUDE.md, or AGENTS.md: any document an agent consumes. Also on
  "write a skill", "improve this skill", "the agent keeps ignoring", "the agent
  does X instead of Y", "this prompt isn't working". Covers wording that changes
  agent behavior, not prose for humans. Skip it and the wording gets changed by
  feel, which is how an edit ships having changed nothing measurable.
---

# fx-authoring

Writing for agents is **test-driven development applied to documentation.**

You write test cases (pressure scenarios), watch them fail (baseline behavior
without the document), write the document, watch them pass, then refactor to
close loopholes.

**Core principle: if you didn't watch an agent fail without the document, you
don't know it teaches the right thing.**

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

Applies to **new documents and to edits.** Wrote it before testing? **Delete
it. Start over.** Not for "simple additions", not for "just adding a section",
not for "documentation updates". Don't keep the untested version as reference,
don't adapt it while running tests. **Delete means delete.**

## When a document is the answer

**Write one when:** the technique wasn't intuitively obvious · you'd reference
it again across projects · the pattern applies broadly · someone else would
benefit.

**Don't when:** it's a one-off · it's a standard practice documented elsewhere ·
it's project-specific (that belongs in CLAUDE.md) · **it's mechanically
enforceable.** If a regex, a linter or a hook can enforce it, automate it: documentation is for judgment calls.

## The information hierarchy

Three tiers, ranked by how immediately the agent needs the material:

1. **In-file step**: what the agent does, in order. The primary tier.
2. **In-file reference**: definitions, rules and facts consulted on demand.
   Often a legitimately flat peer-set (every rule of a review on one rung).
   That's a fine arrangement, not a smell.
3. **Disclosed reference**: pushed into a separate file behind a **context
   pointer**, loaded only when the pointer fires.

**Push too little down and the top bloats; push too much and you hide material
the agent needs. That tension is the whole decision.**

**Branching is the cleanest disclosure test:** inline what every branch needs,
push behind a pointer what only some branches reach.

When a document has steps, in-file reference that should have been disclosed
**buries them and turns attending to them into a coin-flip**: a variance
lever, not just a legibility one.

**Co-location** is the within-file companion: keep a concept's definition,
rules and caveats **under one heading** rather than scattered, so reading one
part brings its neighbours. The test: does it read like documentation written
for the agent?

**Sprawl** is the failure mode: a document simply too long, even when every
line is live and unique. Attention thins across the excess.

### Hard limits

- **SKILL.md body under 500 lines.** Approaching it → split.
- **References exactly one level deep from SKILL.md.** Agents partially read
  nested files (`head -100`), producing incomplete information. Never
  SKILL.md → a.md → b.md.
- **Reference files over 100 lines get a table of contents**, so a partial read
  still shows the full scope.
- **Forward slashes always**, even on Windows.

## Context pointers

A **context pointer** names out-of-context material and encodes the condition
for reaching it. A skill's `description` is one; a line in CLAUDE.md naming a
doc is the same object.

**The pointer's wording, not its target, decides when the agent reaches the
material.** A must-have target behind a weakly worded pointer is a **variance
bug**: sharpen the wording first; inline the material only if that fails.

A pointer does two jobs: **state what the material is**, and **list the
branches that should trigger reaching it.**

- **Front-load the leading word.**
- **One trigger per branch.** Synonyms renaming a single branch are one branch
  written twice.
- **Cut identity the body already carries.**
- Every word of an always-loaded pointer costs **every turn**, so it earns
  harder pruning than the body.

### The description field

This is the highest-leverage text in the whole document.

- **Third person.** It is injected into the system prompt.
- **Start with "Use when…"**: triggering conditions.
- **Concrete triggers, symptoms, situations.** Error messages, symptom words,
  synonyms, tool and file-type names: what an agent would search for.
- Describe **the problem** ("race conditions, inconsistent behavior"), not
  language-specific symptoms ("setTimeout, sleep"): unless the skill really is
  technology-specific, in which case say so explicitly.
- **Under 500 characters** where possible; frontmatter max 1024.
- `name`: letters, numbers and hyphens only.

**NEVER summarize the skill's process or workflow.**

This is not style. Testing showed that when a description summarizes the
workflow, **the agent follows the description instead of reading the skill.** A
description reading "code review between tasks" caused an agent to run ONE
review when the skill's body specified TWO. Changing it to "Use when executing
implementation plans with independent tasks" (no workflow) made the agent
read the body and run both.

**The trap: a description that summarizes workflow creates a shortcut agents
take. The body becomes documentation they skip.**

| | |
|---|---|
| ❌ | `Use when executing plans - dispatches subagent per task with code review between tasks` |
| ❌ | `Use for TDD - write test first, watch it fail, write minimal code, refactor` |
| ✅ | `Use when executing implementation plans with independent tasks in the current session` |
| ✅ | `Use when implementing any feature or bugfix, before writing implementation code` |

### Widening a description, and when to stop

A lane may legitimately claim a second intent when the two are species of one
genus. `fx-architecture` owns code that is the wrong shape, and code there is
simply too much of is a wrong shape, so both belong to it.

**Widening is not free and the cost is invisible.** New triggers compete with
the existing ones for the same attention, so a lane can gain an intent and
quietly lose the one it already had. Nothing in the frontmatter shows this.

**So measure it, do not reason about it.** Keep a prompt per intent in
`tests/lane-triggering/prompts/`, named `<lane>.txt` and
`<lane>__<variant>.txt`, and require both to pass. When `fx-architecture` took
on over-engineering, the new prompt went 1/5 to 5/5 and the original held at
3/3. **The second number is the one that decides whether the widening was
allowed to stand.**

**Stop at two, and split instead when either is true:** a third intent wants in,
or the skill's name no longer describes what it claims. A name that has to be
explained is the tell that the lane became a bucket.

## Match the form to the failure

**Before writing guidance, classify the baseline failure. The form that
bulletproofs one failure type measurably backfires on another.**

| Failure | Right form | Wrong form |
|---|---|---|
| Skips or violates a rule under pressure | Prohibition + rationalization table + red flags | Soft guidance ("prefer…", "consider…") |
| Complies but produces the **wrong shape** (bloated prompt, buried verdict, restated spec) | **Positive recipe** or a contract stating the output parts in order | Prohibition list ("don't restate", "never narrate") |
| **Omits a required element** from something already produced | A structural **REQUIRED field or slot in the template** | Prose reminders near the template |
| Behavior should depend on a condition | A **conditional keyed to an observable predicate** | Unconditional rule + exemption clauses |

Under a competing incentive, **agents negotiate with "don't X".** In
head-to-head wording tests on dispatch-prompt guidance, the prohibition arm
produced clearly more of the unwanted content than the recipe arm: fully
separated distributions, and trended worse than the no-guidance control.

**A recipe leaves nothing to negotiate: the output matches the stated shape or
it doesn't.**

- **No nuance clauses.** "Don't X unless it matters" reopens the negotiation.
  Appending one nuance clause to a winning recipe degraded it from consistent
  to noisy. Express a real exception as its own conditional on an observable
  predicate.
- **Exemption clauses don't scope.** "This limit doesn't apply to code blocks"
  still suppresses code blocks. Restructure so the rule can't reach the exempt
  part.

### Negation

**Steering by prohibition drags the forbidden behavior into context and makes
it more available, not less.** Don't think of an elephant. The negation is a
weak modifier the strongly-activated concept overruns, so the ban half-reads as
an instruction.

**Prompt the positive**: state the target behavior so the banned one is never
spoken. A prohibition earns its place **only as a hard guardrail you cannot
phrase positively**, and even then, pair it with the positive target.

*This and the prohibition row above are not in conflict: prohibition is for a
**discipline** failure, where the agent knows the rule and skips it under
pressure. For shaping output, the recipe wins.*

## Leading words

A **leading word** is a compact concept already living in the model's
pretraining that the agent thinks with while running the document: *lesson*,
*fog of war*, *tracer bullets*, *red*, *tight*.

**Repeated as a token, never as a sentence**, it accumulates a distributed
definition and anchors a whole region of behavior in the fewest tokens, by
recruiting priors the model already holds.

It anchors twice: **in the body** (the agent reaches for the same behavior
every time the word appears) and **in a pointer** (when the same word lives in
your prompts, docs and codebase, the agent links them and reaches the material
more reliably).

Coining your own works if you define it clearly, but **a made-up word recruits
no priors**: you pay in definition tokens what a pretrained word gives free.
Reach for an existing word first.

**Hunt for refactors.** A triad spelled out at three sites; a pointer spending
a sentence to gesture at one idea. Each begs to collapse into a token.

> "fast, deterministic, low-overhead" → **tight** (a tight loop)
> "a loop you believe in" → **red**: turning a fuzzy gate into a binary
> observable state: the loop goes red on the bug, or it doesn't.

**Assume every document is carrying restatements that leading words retire. Go
find them.**

## Completion criteria

Every step ends on a **completion criterion**: the condition telling the agent
the work is done. Two properties:

**Clarity: can the agent tell done from not-done?** A vague bound
("understanding reached") invites **premature completion**: ending the step
early, attention slipping to being done. The visible steps still ahead supply
the pull; the criterion's clarity is the resistance.

Defend in order: **sharpen the bound first** (local and cheap). Only if it is
irreducibly fuzzy *and* you observe the rush, hide the later steps by splitting
the sequence, and that only works across a **real context boundary** (a
hand-off or subagent dispatch; an inline call leaves them in context).

**Demand: how much it requires.** "Every modified model accounted for" forces
thorough work where "produce a change list" does not. Demand drives **legwork**,
and it is not step-bound: "every rule applied" binds flat reference just as
"every step done" binds a sequence.

**The strongest criteria are both checkable and exhaustive.**

## Pruning

1. **One source of truth per meaning.** Duplication costs maintenance and
   tokens, and inflates a meaning's rank on the ladder past its real one. (The
   accidental inverse of a leading word, which repeats a *token* on purpose,
   never the meaning.)
2. **The environment is a source of truth too**: `package.json` scripts,
   config files, the directory layout, `--help`. A document restating it is a
   **cache**, earning its load only when the lookup is expensive. **Cache what
   the agent cannot find by looking:** the unwritten convention, the reason
   behind a choice, the gotcha no config confesses.
3. **Check every line for relevance.** A line loses it by never bearing on the
   task, or by going stale. Without pruning, the default fate is **sediment**:
   stale layers that settle because adding feels safe and removing feels risky.
4. **Hunt no-ops sentence by sentence.** An instruction the model already obeys
   by default pays load to say nothing. The test (*does it change behavior
   versus the default?*) is **model-relative, not reader-relative**: two people
   disagreeing about a no-op disagree about the default, and settle it by
   running the document, not by debate. When a sentence fails, **delete the
   whole sentence** rather than trim words. The test also grades leading words:
   a word too weak to beat the default (*be thorough*) is a no-op, and the fix
   is a stronger word (*relentless*), not a different technique.

## Degrees of freedom

Match specificity to the task's fragility:

| Freedom | Use when | Form |
|---|---|---|
| **High** | multiple approaches valid, decisions context-dependent | text instructions |
| **Medium** | a preferred pattern exists, some variation acceptable | pseudocode, parameterised script |
| **Low** | operations fragile, consistency critical, exact sequence required | a specific script, few or no parameters |

A narrow bridge with cliffs both sides is low freedom (a migration sequence).
An open field is high freedom (a code review, where context decides).

**Avoid offering too many options.** Give a default with an escape hatch, not a
menu.

## Invocation

| | Model-invoked | User-invoked |
|---|---|---|
| Frontmatter | omit `disable-model-invocation` | `disable-model-invocation: true` |
| Description | model-facing, carries trigger branches | human-facing one-liner, triggers stripped |
| Reach | agent fires it; other skills can too; **you can still type its name** | only the human typing its name |
| Cost | **permanent context load**, every turn | zero context load; spends **cognitive load**: you are the index |

**Pick model-invocation only when the agent must reach it on its own, or
another skill must.** If it only ever fires by hand, make it user-invoked and
pay no context load.

Shared reference that two **user-invoked** skills both need can live in
neither: with no descriptions, neither can fire the other. Push it to a plain
file outside the skill system.

When user-invoked skills multiply past what you can remember, that cognitive
load is cured by a **router skill**: one user-invoked skill naming the others
and when to reach for each. It can only hint, never fire them.

## Writing a subagent dispatch prompt

Structure as **ordered facets**: more reliable than freeform constraint prose.
Constraints last, for recency.

1. **Persona**: role, expertise, operating principles.
2. **Knowledge**: the specific context and references it needs. Nothing more.
3. **Instruction**: the one concrete task.
4. **Policy**: split into **rules** (MUST), **prohibitions** (NEVER), and
   **standards** (quality bars). Splitting one "constraints" blob into these
   three catches far more.
5. **Output contract**: the exact return shape: a greppable verdict line, a
   JSON schema, or a bounded artifact handle (path + summary + confidence).
   **Never "return your findings": name the format.**

Keep each facet minimal. Add only what the agent lacks.

## Cross-references

```
**REQUIRED SUB-SKILL:** Use fx-tdd
**REQUIRED BACKGROUND:** You MUST understand fx-debug
```

Name only, with an explicit requirement marker. **Never `@path/to/file`**: it
force-loads immediately, burning context before you need it. Never a bare
"See …", which leaves it unclear whether it's required.

## Testing

Full methodology: `../../references/vocab/skill-testing.md`.

**Micro-test wording before full scenarios.** Pressure scenarios are the final
gate but are slow per iteration.

- One fresh-context sample per call. System prompt = realistic context (the
  full skill, not the guidance in isolation). User message = a task that tempts
  the failure.
- **Always include a no-guidance control.** If the control doesn't exhibit the
  failure, **there is nothing to fix: stop, don't author the guidance.**
- **5+ reps per variant.** Single samples lie.
- **Read every flagged match manually.** Automated counts overstate both
  failure and success: template echoes and quoted counter-examples masquerade
  as hits.
- **Variance is a metric.** When guidance lands, reps converge on one shape.
  Five different interpretations across five reps means the wording isn't
  binding: **tighten the form before adding words.**

Micro-tests verify wording; they do not replace pressure scenarios for
discipline skills.

**Don't test** pure reference documents, or anything with no rule to violate.

## Anti-patterns

| Anti-pattern | Why |
|---|---|
| Narrative example ("In session 2025-10-03, we found…") | Too specific, not reusable |
| Multi-language dilution (`example-js.js`, `example-py.py`, …) | Mediocre quality, maintenance burden. **One excellent example beats many mediocre ones** |
| Code inside flowchart nodes | Can't copy-paste, hard to read |
| Generic labels (`helper1`, `step3`) | Labels should carry semantic meaning |
| Flowchart for reference material or linear instructions | Use tables, lists, numbered steps. Flowcharts are for **non-obvious decisions and process loops only** |
| Time-sensitive content ("before August 2025, use…") | Goes stale. Use a "Current method" section with a collapsed legacy note |
| Inconsistent terminology | Pick one term (*seam*, not *boundary*/*interface*/*edge*) and hold it |

## Checklist

**RED**
- [ ] Pressure scenarios written (3+ combined pressures for a discipline document)
- [ ] Ran **without** the document: baseline behavior captured **verbatim**
- [ ] Patterns identified in the rationalizations

**GREEN**
- [ ] `name` is letters, numbers, hyphens
- [ ] `description` is third person, starts with "Use when…", carries concrete
      triggers, and **summarizes no workflow**
- [ ] Guidance **form matches the failure type**
- [ ] Wording micro-tested against a no-guidance control (5+ reps): N/A for
      pure reference
- [ ] Addresses the **specific** baseline failures, not hypothetical ones
- [ ] Body under 500 lines; references one level deep
- [ ] One excellent example
- [ ] Ran **with** the document: the agent now complies

**REFACTOR**
- [ ] New rationalizations captured verbatim
- [ ] Explicit counter added for each
- [ ] Rationalization table and red-flags list updated
- [ ] Re-tested until no new rationalizations appear

**Do not batch.** One document, tested, before the next. Deploying an untested
document is deploying untested code.
