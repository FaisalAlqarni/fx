# Design document template

Written by `fx-brainstorm` to `docs/plans/YYYY-MM-DD-<slug>/design.md`.

Use the project's domain vocabulary (`CONTEXT.md`) throughout, and respect the
ADRs in the area being touched.

---

```markdown
# <Feature>

**Date:** YYYY-MM-DD
**Status:** ready-for-agent
**Glossary:** <path to the relevant CONTEXT.md: note if terms were added or
sharpened during this session>

## Problem Statement

The problem the user is facing, from the user's perspective.

## Solution

The solution to that problem, from the user's perspective.

## User Stories

A LONG, numbered list. Each in the form:

1. As a <actor>, I want <feature>, so that <benefit>

Example: "As a mobile bank customer, I want to see the balance on my accounts,
so that I can make better-informed decisions about my spending."

**This list should be extremely extensive and cover all aspects of the
feature.**

## Implementation Decisions

The decisions that were made. May include:

- The modules that will be built or modified
- The interfaces of those modules that will change
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

**Do NOT include specific file paths or code snippets: they go stale very
quickly.**

*Exception:* a snippet that encodes a decision more precisely than prose can
(a state machine, a reducer, a schema, a type shape) inlined within the
relevant decision, noted as coming from a prototype, and **trimmed to the
decision-rich part**, not a working demo.

## Testing Decisions

- The **confirmed seams** this will be tested at
- What makes a good test here: **only external behavior, never implementation
  details**
- Which modules will be tested
- **Prior art**: similar types of tests already in this codebase

## Global Constraints

Project-wide requirements that bind every task: version floors, dependency
limits, naming and copy rules, platform requirements, locale/RTL rules. One
line each, exact values. `fx-plan` copies this section **verbatim** into
`plan.md`, and `fx-review` hands it to reviewers as their attention lens.

## Out of Scope

What this design deliberately does not cover.

## Open Questions

Empty by the time the design is published. If anything remains, it is a
decision the user deferred: say so explicitly and record what happens without
it.

## Further Notes
```
