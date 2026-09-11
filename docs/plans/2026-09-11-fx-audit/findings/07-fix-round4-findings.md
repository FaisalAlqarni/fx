# Task 07 fix round 4 findings

**Fix base:** fe48167
**Head:** e103db4
**Diff:** `.fx/2026-09-11-fx-audit/review/fe48167..e103db4.diff`

## Finding verdicts

### Finding: "Each line followed by where it came from" admits two layouts

**ADDRESSED.** `references/audit-template.md:110-126`. The field no longer
describes a quote line with a source that can float onto its own line. It now
defines one fixed shape: "An entry line holds one target and its source
together on a single line, in this form and no other:" followed by the
literal form `- "<the target, quoted verbatim, never paraphrased or
summarized>" from <the invocation text, or the path of the file the user
pointed to>` (line 114). "In this form and no other" forecloses the
two-line layout the finding named. The two-target worked example
(lines 120-121) shows both entries on their own single line, matching the
stated form.

Concrete test, field with two targets:

```
- "Adding a payment provider touches one module" from the invocation text
- "Refunds settle within one business day" from docs/payments-brief.md
```

Two lines match the entry form. Target count reads as 2 one way only: there
is no second layout where the source could instead sit on a line of its own,
so there is no route to reading this as 4 (2 targets plus 2 sources each
counted) or any other number.

### Finding: the "None" fallback is never said to count as zero

**ADDRESSED.** `references/audit-template.md:123-126`: "A brief that named no
targets gives no entry lines. The field then holds this one line, which is
not an entry line and counts as zero targets: None: the brief named no
targets." The target-count line at `references/audit-template.md:132-134`
restates it: "the number of entry lines in this report's own Stated targets
field above, one per target, so a field with no entry lines gives 0."

Concrete test, field with none:

```
None: the brief named no targets.
```

The line does not start with `- "`, so it is not an entry line by the stated
form, and the field says outright it counts as zero. Target count reads as 0
one way only: there is no reading under which the fallback sentence itself
counts as a first target.

## New breakage in the fix diff

**Important**, `references/audit-template.md:110-126`, inside the fenced
markdown block that runs from line 103 to line 151, the literal 03-gaps.md
skeleton.

The fix put four things inside the same fenced skeleton, back to back: the
generic placeholder entry line (line 114), the sentence "A brief naming two
targets gives exactly two entry lines:" (117-118), two concrete invented
example entries (120-121), and the empty-case fallback line (126). Every
other field in this skeleton is a bracketed placeholder an author overwrites
(`<N>`, `YYYY-MM-DD`, `<slug>`, `<name>`, `<path:line>`), visibly not real
content. The two example entries are different: they carry no bracket syntax
and read exactly like a real, correctly-formed pair of entries, sitting
directly inside the block that defines what a real 03-gaps.md must contain.

An author filling the skeleton literally, i.e. keeping the block's structure
and replacing only the obviously-bracketed placeholders, has no textual
signal telling them the two example entries are illustration rather than
content to keep. If they are carried into a real audit together with the
"None" line (which an author might also leave in place for the same reason:
it is not bracketed either), the finished Stated targets field would then
contain both populated entry lines and the "None: the brief named no
targets" sentence at once. Read against the count rule ("the number of
entry lines ... so a field with no entry lines gives 0"), that field has 2
entry lines, so **Target count would read as 2**, flatly contradicting the
"None" sentence sitting right below it, and contradicting whatever the real
brief actually named. The count would be mechanically well-defined (still
exactly one number, not the N-vs-2N ambiguity the original findings named)
but would be the wrong number, silently, because the report would swear "no
targets" while carrying two.

This does not reopen either finding under verification: both are about
whether a correctly-composed field can be read only one way, and a
correctly-composed field still can be. This is a new risk the diff itself
introduces, about whether the skeleton invites a mis-composed field.

**Smallest correct form:** move the introducing sentence and the two example
entry lines (117-121) outside the ```markdown fence, as a plainly-labelled
worked example (for instance "For example, a filled field with two targets
looks like:" followed by its own small snippet, placed after the skeleton's
closing fence) rather than inside the literal skeleton content. That leaves
the fence holding only the field description, the one bracketed placeholder
entry line, the multi-line-join sentence, and the "None" fallback, matching
how every other field in this skeleton is a single placeholder rather than a
worked pair of invented examples plus its own contradiction.

## Judged: the implementer's two flagged concerns

**Multi-line target joined with spaces, no longer strictly verbatim.**
Not a defect. The join is stated in the field itself
(`references/audit-template.md:116-117`: "A target that runs across several
lines in the brief is joined onto its one entry line with spaces"), so a
reader of a finished field is told the whitespace was normalized; only
interior line breaks are collapsed, not words. This does not touch the
count: entry lines are still exactly one per target regardless of whether
the source brief wrapped that target's text. Documented, bounded tradeoff,
correctly traded for the single-line form the two findings needed. No
severity assigned.

**Placeholder line left unwrapped at 138 characters.** Not a defect. No
acceptance criterion or gate in `tasks/07-audit-template.md` constrains
individual line length inside a fenced skeleton (the task's only length rule,
step 7, is a 100-line threshold for the whole file needing a table of
contents, already satisfied). `python3 scripts/check-prose
references/audit-template.md`, re-run directly: "OK: no dashes, no stock
vocabulary, parentheses balanced", clean. Wrapping the line would either
break inside the quoted placeholder text or force a line continuation that
is not part of the stated single-line form, which would undercut the fix's
own "on a single line, in this form and no other" rule. Cosmetic only.

## Verification run

```
$ bash scripts/check-reference-leaves
OK: no reference links to another reference
$ python3 scripts/check-prose references/audit-template.md
0 block(s) exempted by `prose-gate: quoting`
OK: no dashes, no stock vocabulary, parentheses balanced
```

Both match the report's claims for this round. `scripts/check-all` was not
re-run per instruction (a writer is live on other files in this checkout);
the report's own pre-commit run (all five gates plus the four test suites,
`FINAL_EXIT` / `check-all exit:0`) and the diff's shape (`references/audit-template.md`
only, 21 insertions, 9 deletions, matching `git diff --cached
--name-only` and `1 file changed, 21 insertions(+), 9 deletions(-)` in the
diff header) are consistent with each other; nothing in the diff contradicts
the report's grep-based RED/GREEN evidence for the entry-line form or the
zero-count rule.

## Out-of-scope observations

None.

## Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage
except: one Important finding in the fix diff itself (the worked examples
and the "None" fallback sharing the fenced skeleton with no signal
distinguishing illustration from literal content, risking a self-contradictory,
wrongly-counted field if an author copies the skeleton literally). Both
findings under verification are resolved on their own terms; the new
Important item is a defect in how the fix presents its own worked examples,
not a reopening of either original finding.
