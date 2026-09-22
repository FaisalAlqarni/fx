# The bootstrap invokes lanes; the lanes carry the rules

Partly supersedes `0002`.

`PREAMBLE.md` grew into a router. `0002` found that the imperative has to come
first, and that finding was also read as "the always-on text must be
self-sufficient": it carried the routing table, the non-negotiables, the
ladder, the prose rules and a table of rationalizations. Every later lesson was
appended with no size budget. By task 24 it was 12,373 characters, had to be
split into parts to fit Claude Code's per-hook limit, and Claude Code delivered
those parts in an unstable order.

The other plugins fx replaced do not do this. superpowers injects a 3.1KB
bootstrap and leaves routing to each skill's own description, which every
runtime already shows the model. caveman's `AGENTS.md` holds pointers only.

## Measured

`docs/plans/2026-09-21-multi-harness/research/bootstrap-spike.md`. Variant S3
is a 2,503-character bootstrap (the intro, the imperative, a pointer to the
lane descriptions, invoke do not read, the subagent clause, announce, and four
always-on rules) plus sharpened `fx-tdd`, `fx-brainstorm` and `fx-humanize`
descriptions. It routed:

- Claude Code: 9 of 9 lane prompts, row 04 5 of 5;
- opencode on the local 27B model: 9 of 9 lane prompts, row 04 at least 7 of 7.

The best cut of the router preamble scored row 04 8 of 10 on opencode. The same
bootstrap with the old descriptions scored 2 of 5, so the descriptions do the
routing work.

## The rule

- **Position stays.** Only the fixed intro sits above the opening imperative,
  and the imperative stays whole, concrete and first. That half of `0002`
  holds, and is what the bootstrap still measures.
- **Self-sufficiency goes.** The always-on text no longer carries the rules. It
  makes the model invoke the lane that carries them.
- **Routing lives in the descriptions.** Where two lanes claim the same work,
  each description names the other. `tests/gates/description-overlap.test.js`
  fails when either side stops doing so.
- **A rule stays in the bootstrap only when it must hold with no lane loaded**:
  the rules about whether to invoke a lane, and the ones any lane or none can
  break (attribution, integration, nothing leaves the machine, evidence before
  claims, the core prose rules in one line, no dashes), plus the per-runtime
  dispatch wording, which only the rendered bootstrap can vary by runtime.

`docs/plans/2026-09-21-multi-harness/bootstrap-no-loss-audit.md` maps every
sentence of the old router to its new home and the moment that home is loaded.
No rule was dropped. Three counter-sentences of the old rationalization table
keep their rule as intent but not their wording, because S3 routed without
that table.

## Consequences

- Two budgets, both pinned by `lib/preamble.test.js`. The bootstrap alone
  stays under 3,000 characters: the design target, and the pressure that keeps
  it a bootstrap. The worst case, with the repo.md note and three plans, stays
  under 9,000: Claude Code's per-hook limit of 10,000, with margin. With one
  part there is no split and no ordering problem.
- A rule added to the bootstrap needs the reason no lane can carry it. The
  default home for a rule is the lane that is loaded when it applies.
- A lane that is never invoked now takes its rules with it. The imperative and
  the descriptions are what make lanes fire, so they are the thing to measure:
  live row 04 and the lane-triggering prompts, on every runtime.
