# Loaded lane files carry rules; incident stories live in COVERAGE.md

## Context

The audit of 2026-10-21 found that "Measured:" incident stories were about 30% of the most-loaded lane files (`docs/plans/2026-10-21-audit-fx/01-current.md`). Every session and every dispatched subagent that loads a lane paid for them, and none of them needs the story to follow the rule.

## Decision

- **A lane file that every build loads holds no line matching `\bMeasured\b`.** The five files are `skills/fx-implement/SKILL.md`, `skills/fx-implement/implementer-prompt.md`, `skills/fx-implement/task-reviewer-prompt.md`, `skills/fx-plan/SKILL.md` and `skills/fx-tdd/SKILL.md`.
- **Each removed story moves, unchanged, to `## Incident record` at the end of that lane's `COVERAGE.md`,** preceded by one line naming the rule it supports. No session loads `COVERAGE.md`.
- **Each rule keeps at most one line of why**, never the story.
- **`tests/gates/no-stories-in-loaded-lanes.test.js` enforces it,** and `scripts/check-all` runs it.

## Consequences

A maintainer who wants the evidence for a rule finds it in `COVERAGE.md`. `skills/fx-implement/re-review-prompt.md` still carries one story; it loads only on a re-review and is outside the five files this decision covers.

## Supersedes

Nothing.
