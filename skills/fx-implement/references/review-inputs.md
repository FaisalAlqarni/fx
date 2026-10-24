**Verify a constraint before you copy it.** This block carries the authority
of a requirement into an agent with no context to doubt it, so a false belief
of yours becomes a false rule for them. **A constraint is a claim, and the exit
gate already demands evidence for claims**: this is the one place the skill
silently exempted them. Check anything empirical: a version, a line count, an
exit code, a routing behaviour. In one measured session four constraints were
false, and two agents refused to comply rather than obey them.

**An agent that pushes back on an impossible instruction is working
correctly.** Treat it as a signal about your dispatch, not as insubordination.

**The brief's Global Constraints are the reviewer's attention lens.** They are
copied verbatim from the plan by `compile-brief`: exact values, formats, and
stated relationships between components. The reviewer's template already
carries process rules (YAGNI, test hygiene, review method); the brief is for
what THIS project's design demands. Add task-specific review directives to the
context file, not to the dispatch.

- Do not add open-ended directives ("check all uses", "run race tests if
  useful") without a concrete, task-specific reason.
- Do not ask a reviewer to re-run tests the implementer already ran on the same
  code: the report carries the test evidence.
- **Do not pre-judge findings.** Never instruct a reviewer to ignore or not flag
  a specific issue. If you believe something would be a false positive, let the
  reviewer raise it and adjudicate it in the loop.
- **If the prompt you are writing contains "do not flag", "don't treat X as a
  defect", "at most Minor", or "the plan chose": stop. You are pre-judging,
  usually to spare yourself a review loop.**

**⚠️ Cannot-verify-from-diff items.** The reviewer may flag requirements living
in unchanged code or spanning tasks. These don't block the rest of the review,
but **you must resolve each one yourself before marking the task complete**: you hold context the reviewer lacks. Confirm one is a real gap and it enters
the fix loop like any other. **Ledger it with the finding's exact text**:
`Task <NN>: confirmed ⚠️: <exact finding text>`. The reviewer's own file has
no confirmed/unconfirmed marker, so this ledger line, not the findings file,
is what the fixer and re-reviewer read for it.

**Rule every declined item.** The reviewer's `### Declined to judge` list
holds behaviours it set aside, and its `## Ledger lines` carries one
`Task <NN>: declined: <behaviour>: <reason>` line per item. Append them with
the Minor lines, then add one ruling line per item:
`Task <NN>: declined: <behaviour>: <reason>. Ruling: <stands | fix | parked>: <why>`.

- **stands**: the reviewer was right to set it aside. The ruling is kept as
  named input for the final branch review.
- **fix**: a reasonable user would expect it. It enters the fix loop as an
  Important finding.
- **parked**: the item touches one of the four stop conditions. Write
  `Task <NN>: needs you: declined: <item text>`; the task still completes.
  A declined item never adds a stop condition.
