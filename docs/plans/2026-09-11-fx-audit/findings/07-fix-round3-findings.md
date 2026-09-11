# Task 07 fix round 3: verification findings

Scope: the one item Ruling V opened, the gap table's target count, and the
fix diff `.fx/2026-09-11-fx-audit/review/9c426e7..4edc104.diff`
(`9c426e7` to `4edc104`, one commit, `references/audit-template.md` only).
Nothing else was reviewed.

## Finding: gap table target count anchors to a checkable field

**Verdict: ADDRESSED.** `references/audit-template.md:110-114` and
`:120-124`.

`03-gaps.md`'s header block now carries a `Stated targets` field beside
`Compared against`, at line 110:

> **Stated targets:** every target named in the brief the audit was invoked
> with, quoted verbatim, one per line, each line followed by where it came
> from: the invocation text itself, or the path of a file the user pointed
> to. Quoted, never paraphrased or summarized. A brief that named no targets
> still gets this field, written as: "None: the brief named no targets."

And the target half of the count line now points at it, line 120:

> **Target count:** <N>, the number of target lines recorded in this
> report's own **Stated targets** field above, not a count composed for this
> table.

This closes the gap the two prior rounds left open. Round 2 named "the
brief the audit was run with" as the source of truth but recorded its
content nowhere, so a reader holding only the finished audit had no place
to go check it and only the author who wrote the count could verify it.
This diff moves the brief's content into the document itself: a reader of
the finished `03-gaps.md` now finds the targets quoted verbatim, with their
source, on the same page as the count, and can compare that list against
what they themselves asked for when they invoked the audit. That is a
document a later reader can check against, the same standing `02-reference.md`'s
`Resolved from` field already has for the comparison tree (verified at
`references/audit-template.md:75-76`): a verbatim record of an external
input, not a summary composed by the section it feeds.

Point by point:

**Is the count unambiguous.** Mostly. The field states the format (quoted
target, one per line, with a source) and the count line ties itself to that
field rather than to a number composed for the table. Whether "each line
followed by where it came from" places the source on the same physical line
as the quote, or on a line beneath it, is not settled by the wording, and
that has a real effect on what "the number of target lines" means if the
two ever end up on separate lines. See Cannot verify below; the instruction
directs this exact question there rather than into this verdict, since it
is a question about how the future filling command will interpret the
field, not about whether the anchor itself exists.

**The empty case.** The fallback string, "None: the brief named no
targets," follows the same shape "Areas not covered" already uses
successfully (`references/audit-template.md:60-63`), including the
requirement to write the field even when empty rather than omit it. Whether
a filler reads that single sentence as zero target lines or as one is again
a filling question, not a defect visible in the template's structure; see
Cannot verify.

**Is it checkable.** Yes. "Quoted verbatim" appears twice in three
sentences, paired with an explicit ban: "never paraphrased or summarized."
A paraphrase would visibly fail that instruction on a plain reading, the
same way `02-reference.md`'s "exactly as it was given" already works for
`Resolved from`. There is nothing hedged about the wording.

**Consistency.** `grep -n -i "brief\|target" references/audit-template.md`
finds every occurrence: the new field and its two neighbors at lines 110,
113 to 114; the count line at 120 to 123; the table's own description at
126; the column header at 131; and four unrelated uses of "target" in the
Phase 4 section (lines 143, 146, 151, 162) meaning the system's intended
future shape, not the audit's stated targets, exactly as the report
describes. Round 2's old phrasing, "the brief the audit was run with; that
brief lives outside this document, never inside the table," is gone. No
stale wording remains anywhere in the file.

**The leaf rule.** `grep -n design-template references/audit-template.md`
finds nothing (exit 1, confirmed directly, not through the guard). The diff
adds no reference to the design template.

## Cannot verify from this diff

**Same line or separate line for the source.** "Each line followed by
where it came from" can be read as the source sitting on the same physical
line as its quoted target, or as its own line beneath it. If the command
that fills this field (task 08, not yet written) puts sources on their own
lines, "the number of target lines" becomes ambiguous: does it count only
the lines holding a quoted target, or every physical line in the field,
sources included. Nothing in this diff forces one reading over the other.
This is exactly the case the task asked me to route here rather than treat
as a defect in this diff, since the wording is what a future filling
command has to interpret correctly, and that command does not exist yet.

**Whether the fallback string reads as zero.** The field's fallback,
"None: the brief named no targets," is one physical line of text. Whether
the command that fills this field treats that line as contributing zero to
"the number of target lines," or miscounts it as one, again depends on how
that command is written. The wording does not state the exclusion outright.
Same routing as above: a command-authoring question, not a defect visible
in this diff.

Both items would be closed by a small addition to whichever field
description or acceptance criteria task 08 writes: state plainly that the
source sits on the same line as its quote, and that the fallback sentence
counts as zero target lines. Neither requires touching this file again;
task 08 can supply the missing precision when it defines how the field gets
filled.

## New breakage in the fix diff

None. The diff touches only the `03-gaps.md` header block (`Stated
targets` added) and the target half of the count-reconciliation sentence
in the `## Verdict table` section. The feature half of the count line, the
row-count reconciliation, the table itself, and every other section of the
file are untouched. Both tests below pass on the current file.

## Tests run

- `bash scripts/check-reference-leaves`: OK, no reference links to another
  reference, exit 0.
- `python3 scripts/check-prose references/audit-template.md`: OK, no
  dashes, no stock vocabulary, parentheses balanced, 0 blocks exempted by
  the quoting marker, exit 0.
- `scripts/check-all` was not run, per instruction.

## Out-of-scope observations

None.

## Verdict

**Fix round:** Finding addressed, no new Critical or Important breakage.
The gap table's target count now anchors to a field recorded inside
`03-gaps.md` itself, quoted verbatim with its source, closing both halves
of the original count (features and targets) against something a reader
can check without needing to be the audit's own author. Two points of
wording precision remain for whoever writes task 08's command, listed above
under Cannot verify, and neither is a defect in this diff.
