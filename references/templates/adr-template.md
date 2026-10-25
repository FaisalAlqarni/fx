# ADR template

An ADR records that a decision was made and why. A few sentences per section is
enough; the value is the record, not the form. Write one only when the decision
is hard to reverse, surprising without context and the result of a real
trade-off. Number every decision so a later ADR can name "decisions 2 and 4".

```markdown
# NNNN: <decision in a few words>

Status: accepted, YYYY-MM-DD.
Supersedes: NNNN (decisions 2, 4)

## Context

<What forced the decision: the situation, the constraint, what was tried.>

## Decision

1. <The first decision, in one or two sentences.>
   Evidence: <path or symbol the decision governs>
2. <The second decision.>

## Still in force

3. <A decision of the superseded ADR that still holds, restated as this ADR's
   own. Numbering continues from the Decision section.>

## Consequences

<What becomes easier, what becomes harder, what to watch.>

## Alternatives

<Only when the rejected options are worth remembering, and why each lost.>
```

Leave out the `Supersedes:` line and `## Still in force` unless this ADR
replaces another. Leave out `Evidence:` lines when no code is governed.
