# Task 06, fix round 1: re-review findings

Base `f5163c0`, head `190125e`. One commit, one file touched:
`docs/adr/0008-no-performance-lens.md`, 4 insertions, 1 deletion (the deleted
line is round 1's own added line, being replaced).

## Finding verdicts

- **Important 1, the added line implied queue backpressure was one of ADR
  0008's six named items: ADDRESSED.** `docs/adr/0008-no-performance-lens.md:25-28`
  now reads: "Superseded in part by `0014-the-app-layer-gap-gets-its-own-lens.md`:
  it pays the second dispatch this recommendation avoids, in `fx-lens-pipeline`,
  for one concern this record did not list: unbounded enqueue against consumer
  backlog. Every item listed above stays uncovered." It no longer names "queue
  backpressure" as if it were one of the six items at `0008:19`, states plainly
  that the covered concern is one the record "did not list", and states that
  every listed item stays uncovered.

- **Minor 1, the single unwrapped 229-character line: ADDRESSED.**
  `docs/adr/0008-no-performance-lens.md:25-28` is now four lines of width 75,
  79, 72 and 49 characters, inside the file's existing 47 to 81 character wrap
  range (measured directly with `awk '{print NR": "length}'`).

## New breakage in the fix diff

None. The diff touches only `docs/adr/0008-no-performance-lens.md`, replacing
the one line round 1 added with four. No other file, no other line.

## Checks 1 to 3

**1. No deletions against the pre-task-06 file.**

```
$ git diff --numstat eb4bd91 190125e -- docs/adr/0008-no-performance-lens.md
4	0	docs/adr/0008-no-performance-lens.md
```

Four insertions, zero deletions, against ADR 0008 as it stood before task 06.
Confirmed: nothing removed from the body across the whole task plus its fix
round.

**2. Agreement with ADR 0014: agree.**

New line (`0008:25-28`): "Superseded in part by
`0014-the-app-layer-gap-gets-its-own-lens.md`: it pays the second dispatch
this recommendation avoids, in `fx-lens-pipeline`, for one concern this record
did not list: unbounded enqueue against consumer backlog. Every item listed
above stays uncovered."

ADR 0014 (`0014:43-45`): "The narrowed lens hunts none of the items
`0008-no-performance-lens.md` listed by name: a job enqueued per record is an
unbatched loop, which it cedes, and the rest stay where that record left
them."

Both records now say the same two things: the lens covers a concern (unbounded
enqueue, called "backpressure" nowhere in either quoted span) that ADR 0008
never named, and every item ADR 0008 did name by name stays uncovered. Neither
record needed further changes to agree; ADR 0014 was not touched by this fix
round, and a direct read confirms it did not need to be.

**3. Rendering, the named risk: real, and it survives the fix, severity
Minor by consequence.**

The added line still directly follows the recommendation paragraph's last
line (`0008:24`, "dispatch for it.") with no blank line before `0008:25`. This
was true of round 1's version and is unchanged by this fix; the fix rewrote
the line's content, not its placement.

CommonMark treats a run of non-blank lines with no blank line between them as
one paragraph, and bold text (`**Superseded in part...**`) is not a
block-level construct that would split it. So a renderer joins the
recommendation paragraph (`0008:19-24`) and the supersession note
(`0008:25-28`) into a single paragraph, with only the bold lead-in marking
where the new clause starts. Read side by side with the file's own
convention: the file's other bold-lead clause, "**Why not ship the 15%
anyway:**" at `0008:13`, is preceded by a blank line (`0008:12`) and stands as
its own paragraph. The supersession note does not follow that convention,
inside the same file.

Consequence: a reader of the rendered page sees one continuous block of
prose, the original recommendation running straight into a later amendment,
with no visual break marking that the second half describes a different
document written after the first half. `scripts/check-prose` has no
line-length or blank-line check, so nothing in the gate suite catches this,
and no acceptance criterion in the task named it. This is a genuine
readability and convention break, not a correctness problem: check 2 above
confirms the content itself is accurate and agrees with ADR 0014. Minor,
matching the severity the original findings gave the sibling wrap-width issue
this fix round already resolved.

## Out-of-scope observations

- The task's report (`06-adrs-report.md`, "Concerns" under "Fix round 1")
  carries two items outside this round's scope: `check-prose` still passing
  vacuously on a nonexistent path, and ADR 0014 describing the lens as of an
  earlier commit than task 05's later close. Neither touches
  `docs/adr/0008-no-performance-lens.md`, both are already ledgered by the
  controller, and neither is re-litigated here.
- ADR 0014 lines 1 to 46 were read in full per the review brief and found
  internally consistent with the fixed line; nothing in that read surfaced a
  new problem in ADR 0014 itself, and ADR 0014 is unchanged by this fix
  round's diff.

## Verdict

**Fix round:** All findings addressed, no new Critical or Important breakage.
The rendering risk named in check 3 is real and unresolved, but it is Minor
by consequence and was not among the findings this round was dispatched to
fix.
