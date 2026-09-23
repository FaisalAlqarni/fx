# Scoped Re-Review Prompt Template

Dispatched after a fix round. The re-reviewer verdicts each finding and checks
the fix diff for new breakage. **It is not a fresh review**: the full review
already happened.

**Purpose:** verify each finding was addressed, and that the fix broke nothing.

```markdown
Subagent (general-purpose):
  description: "Re-review task NN fix round R"
  model: [MODEL, REQUIRED: default: standard tier; the most capable tier only
         with a stated reason (see model-selection.md).]
  prompt: |
    You are re-reviewing one task's fix round. A previous review produced
    findings; an implementer has attempted to fix them. Your job is to verdict
    each finding and inspect the fix diff: nothing else.

    ## The task

    Read it: [TASK_FILE]

    ## The findings under verification

    The open findings live in the findings file(s) as a whole:
    [PRIOR_FINDINGS_FILES], plus any confirmed ⚠️ the controller quotes
    directly below (its ledger line reads `Task <NN>: confirmed ⚠️: <exact
    text>`; a findings file carries no confirmed/unconfirmed marker of its
    own). What counts as open, per file:

    - **A first-round findings file** (the task or branch reviewer's): every
      item under `### Issues` → `#### Critical (Must Fix)` and `#### Important
      (Should Fix)`, and every ❌ under `### Spec Compliance`.
    - **A lens findings file**: the entire reply, verbatim; a lens has no
      severity split of its own to filter by.
    - **A later-round findings file** (a previous re-review's): every item
      under `### Finding verdicts` marked NOT ADDRESSED, plus anything under
      `### New breakage in the fix diff` rated Critical or Important.

    Minor is never open, in any of them. Read the file(s) yourself: they are
    not pasted here.

    ## The fix

    Read the implementer's report; fix reports are appended at the end:
    [REPORT_FILE]

    **Fix base:** [FIX_BASE_SHA] (the head the previous review saw)
    **Head:** [HEAD_SHA]
    **Diff file:** [DIFF_FILE]

    Read the diff file once: it contains the fix commits, a stat summary, and
    the fix diff with surrounding context. Do not re-run git commands. If the
    diff file is missing, fetch it yourself:
    `git diff --stat [FIX_BASE_SHA]..[HEAD_SHA]` and
    `git diff [FIX_BASE_SHA]..[HEAD_SHA]`.

    Your review is **read-only** on this checkout. Do not mutate the working
    tree, the index, HEAD, or branch state in any way.

    ## You do not dispatch subagents

    Do all of this review yourself. Never spawn a subagent to review part of
    the diff, and never spawn another reviewer for a second opinion. This
    process already provides every review seat the work gets; one you spawn
    duplicates a seat at full cost and its verdict counts for nothing. If the
    diff feels too large for one pass, review it in passes yourself and say so.

    ## Scope

    Your scope is **the findings list and the fix diff.** Verdict every
    finding. Inspect the fix diff for new problems the fix itself introduced.

    **Do NOT re-review code the fix did not touch.** If you notice an issue
    entirely outside the fix diff, report it under Out-of-Scope Observations:
    it does not block this task and **does not extend the loop.** A broad
    whole-branch review happens after every task is complete.

    ## Tests

    The implementer re-ran the tests covering the amended code and appended the
    results to the report file. Treat the report as **unverified claims**:
    confirm the fix report names the covering tests and shows their output, and
    verify the claims against the diff. **Do not re-run the suite to confirm
    their report.** Run a test only when reading the code raises a specific
    doubt no existing run answers, and then a focused test, never a
    package-wide suite.

    Warnings or noise in the reported output are findings.

    ## Write your findings to a file, then summarise

    **Write the full findings to [FINDINGS_FILE] before your final message.**
    Then reply with the five-line contract in Output format below.

    Your findings are the only copy of work nobody can redo cheaply. An
    implementer's work survives in the commit; a review's exists in one message
    and nowhere else. Spend that message on a correction, a clarification, or an
    answer to a follow-up, and the findings go with it.

    Measured: a whole-branch review ran twenty minutes across a hundred tool
    calls, then used its final message to correct one of its own claims. The
    correction was right and worth making. **The findings never reached the
    controller at all**, and two further exchanges asking for them produced two
    more messages that were not them.

    So the file is written first and the message points at it. Then a follow-up
    can be answered freely, because the findings are already safe.

    ## Output format

    Write this to [FINDINGS_FILE]: begin directly with the first finding's
    verdict. Every line is a verdict, a finding with file:line, or a check you
    ran. No preamble, no process narration.

    ### Finding verdicts

    For each finding in order:

    - **[finding one-liner]**: ADDRESSED | NOT ADDRESSED, with file:line
      evidence. **"Attempted" is not addressed**: the specific defect must no
      longer exist.

    ### New breakage in the fix diff

    Anything the fix itself broke or introduced, with severity
    (Critical/Important/Minor) and file:line. "None" if clean.

    ### Out-of-scope observations

    Issues entirely outside the fix diff. Non-blocking; the controller ledgers
    these for the final review. "None" if none.

    ### Verdict

    **Fix round:** [All findings addressed, no new Critical/Important breakage |
    Findings remain open]: list the open ones.

    ### Ledger lines

    Add a heading that reads exactly `## Ledger lines`: two `#` characters,
    not three (this section's own `###` above is this document's structure,
    not what you write). Under it, write these as plain text with no bullet
    and no backticks, one finding per line, starting with the word `Task`:

    - The round line, exactly one:

    Task <NN>: fix round <R>/5 (<X> addressed, <Y> open: <one-liners>; commits <FIX_BASE_SHA short>..<HEAD_SHA short>)

    - One line per out-of-scope observation and per Minor item under New
      breakage:

    Task <NN>: minor (deferred): <one-liner>

    Use the task number named in [TASK_FILE]'s filename and round [ROUND].
    The controller greps these lines and checks their count against 1 (the
    round line) plus your out-of-scope and Minor-breakage counts.

    ### Reply

    Reply with at most five lines:

    - **Verdict:** all addressed, no new breakage | findings remain open
    - **Open:** count (NOT ADDRESSED findings, plus new Critical or Important
      breakage; new Minor breakage is not open, it is ledgered instead)
    - **Fixed:** count
    - **Findings:** [FINDINGS_FILE]
    - **New breakage:** none | Minor | Important | Critical, the highest
      severity found
```

**Placeholders:**
- `[FINDINGS_FILE]`: REQUIRED, the per-finding verdicts, written before the
  summary
- `[MODEL]`: REQUIRED; default: standard tier, most capable only with a
  stated reason (see model-selection.md)
- `[TASK_FILE]`: the same file the implementer worked from
- `[PRIOR_FINDINGS_FILES]`: REQUIRED, one or more paths: the previous review's
  (or previous round's) findings file, and any lens findings file from the
  same dispatch. Pass the path(s), never a copied extract
- `[ROUND]`: REQUIRED, this fix round's number (1 to 5), for the ledger line
- `[REPORT_FILE]`: the implementer's report file, fix reports appended
- `[FIX_BASE_SHA]`: the head the previous review saw
- `[HEAD_SHA]`
- `[DIFF_FILE]`: the path `scripts/review-package <slug> FIX_BASE HEAD` printed

**Re-reviewer returns:** Verdict · Open (count) · Fixed (count) · Findings
(path) · New breakage (none/Minor/Important/Critical), in the five-line
reply. Per-finding verdicts, out-of-scope observations and ledger lines live
in the findings file.
