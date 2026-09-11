# Task 07 fix round 5 findings

**Fix base:** 89aa044
**Head:** 85901b9
**Diff:** `.fx/2026-09-11-fx-audit/review/89aa044..85901b9.diff`

## Finding verdict

- **The fenced `03-gaps.md` skeleton mixed a placeholder, an introducing
  sentence, two invented worked examples and the "None" fallback in one
  literal block, so a literal copy could carry 2 entries plus "None" into a
  real report and read as 2 while claiming zero**: **ADDRESSED**.
  `references/audit-template.md:110-119` now keeps, inside the fence, only
  the field description, the one bracketed placeholder entry line
  (line 114), the joining rule, and the empty case quoted inline in the
  prose ("...counts as zero targets: \"None: the brief named no targets.\"",
  line 119). The two worked examples (a two-target one and an empty one)
  moved to `references/audit-template.md:146-163`, outside the fence,
  labelled "Worked example of a finished **Stated targets** field."

  Copy test, run against the current file, extracting the first `markdown`
  fence under `## \`03-gaps.md\`` (the actual skeleton, not the examples):

  ```
  $ awk '/^## `03-gaps.md`/{f=1} f && /^```markdown$/{c++; if(c==1){s=1; next}} s==1 && /^```$/{exit} s==1{print}' references/audit-template.md > /home/faisal/.claude/jobs/6d844eaa/tmp/r5-copy-fence.md
  $ wc -l /home/faisal/.claude/jobs/6d844eaa/tmp/r5-copy-fence.md
  40 .../r5-copy-fence.md
  $ grep -c '^- "' /home/faisal/.claude/jobs/6d844eaa/tmp/r5-copy-fence.md
  1
  $ grep -c '^None:' /home/faisal/.claude/jobs/6d844eaa/tmp/r5-copy-fence.md
  0
  $ grep -c -E 'payment provider|Refunds settle' /home/faisal/.claude/jobs/6d844eaa/tmp/r5-copy-fence.md
  0
  ```

  The copied skeleton holds exactly one entry-shaped line, the bracketed
  placeholder (`- "<the target, quoted verbatim...>" from <...>`), zero bare
  "None" lines, and zero words from either invented example. An author who
  copies the skeleton literally can no longer carry an example entry or the
  "None" line into a real report: neither exists inside the fence any more.

## New breakage in the fix diff

**Minor**, `references/audit-template.md:146-163` (the two worked examples
added outside the fence). Each example shows the field as a bare label
(`**Stated targets:**`) followed directly by its entries or fallback, with
the description sentence dropped entirely. That is a different visual form
from every sibling field in the same fence: `**Feature count:**`,
`**Target count:**` and `**Row count:**` (`references/audit-template.md:123-129`)
keep their descriptive sentence in the finished document, with only the
`<N>` placeholder replaced, because that sentence is the reconciliation text
a later reader checks the count against (the same device fix round 1
introduced and justified on exactly that ground: a stated total that a
reader can verify without re-deriving it). `**Stated targets:**` itself ends
its own description in a colon that grammatically introduces the entries
("...in this form and no other:"), the same shape as an introducing clause
that stays attached to what follows. By that established convention inside
this very skeleton, a field an author actually finishes by following the
fence would most naturally read:

```
**Stated targets:** every target named in the brief the audit was invoked
with, one entry line per target. An entry line holds one target and its
source together on a single line, in this form and no other:

- "Adding a payment provider touches one module" from the invocation text
- "Refunds settle within one business day" from docs/payments-brief.md
```

not the bare-label form the worked examples show. This does not reopen the
round-4 finding: it is outside the fence, it does not add an entry line or a
bare "None" line back into the copyable skeleton, and it does not change
what the target count reads as (both examples still count correctly, see
Checks below). It also matches a trade-off the implementer flagged
unprompted in the report's Concerns section ("The fence does not say in
words that the description prose is removed when the field is filled").
Worth a one-line fix in a later pass (show the description sentence in at
least one of the two examples), not severe enough to extend this loop.

## Checks 2 to 5

**Check 2, worked examples match the skeleton's form**: partial. Both
examples yield the count they state (verified below), so the counting
mechanism they teach is correct. The visual form does not match the
skeleton's own convention for a finished field, per the Minor item above:
the label stands alone instead of carrying the description sentence the way
`Feature count` / `Target count` / `Row count` do. Mechanical count check:

```
$ printf '%s\n' '**Stated targets:**' '' '- "Adding a payment provider touches one module" from the invocation text' '- "Refunds settle within one business day" from docs/payments-brief.md' > /tmp/r5v-two.txt
$ printf '%s\n' '**Stated targets:**' '' 'None: the brief named no targets.' > /tmp/r5v-none.txt
$ grep -c '^- "' /tmp/r5v-two.txt
2
$ grep -c '^- "' /tmp/r5v-none.txt
0
```

Two-target example: 2 entry lines, matches its stated "target count is 2"
(`references/audit-template.md:146-147`). Empty example: 0 entry lines,
matches its stated "target count is 0" (`references/audit-template.md:159-160`).

**Check 3, the empty case inside the fence**: addressed. The fence reads "A
brief that named no targets gives no entry lines, and the field holds one
line in their place, which is not an entry line and counts as zero targets:
\"None: the brief named no targets.\"" (`references/audit-template.md:116-119`).
A reader is told the finished field holds exactly that one line and that it
counts as zero. The quote marks around the fallback read as typographic
delimiters, not literal characters: the empty worked example
(`references/audit-template.md:159-163`) reproduces the fallback with no
quote marks around it, resolving that ambiguity by direct demonstration
rather than leaving it to inference. This mirrors `01-current.md`'s **Areas
not covered** convention, which quotes its own fallback ("None: every area
returned findings.") the same way.

**Check 4, three `markdown` fences under `03-gaps.md`**: no breakage found in
this file. Independently re-extracted the fence and heading positions:

```
$ awk 'f && /^## Sections Phase 4/{exit} /^## `03-gaps.md`/{f=1} f{print NR": "$0}' references/audit-template.md | grep -E ': ```|: ##'
98: ## `03-gaps.md`
103: ```markdown
121: ## Verdict table
140: ## Lens findings
144: ```
149: ```markdown
154: ```
159: ```markdown
163: ```
```

Three fences confirmed: 103-144 is the skeleton (the only one carrying the
document's own headings and table, and the first and largest fence under the
section), 149-154 and 159-163 are the two worked-example snippets, each
directly preceded by a plain-prose sentence naming it as a worked example
("Worked example of a finished **Stated targets** field...",
`references/audit-template.md:146`; "A brief naming no targets gives...",
`references/audit-template.md:156`). Neither introducing sentence is a
heading, so the document's heading structure is untouched: `## \`03-gaps.md\``
at line 98 is followed only by `## Verdict table` (121) and `## Lens
findings` (140), both inside the skeleton fence as before, then
`## Sections Phase 4 appends to \`design.md\`` at line 165, unchanged.
Table of contents (`references/audit-template.md:9-14`) still lists exactly
the same four sections with the same anchors; nothing was added for the
examples. A human author reading top to bottom can tell the skeleton from
the examples by position and content (first, largest, and carrying the full
document shape, versus two short labelled snippets after it). Whether
task 08's audit command, not yet built as a command, correctly extracts
"the first fence" is a concern about that future file, not about this one;
the implementer flagged it as a note for task 08 rather than fixing it here,
correctly, since task 08 is out of this task's scope.

**Check 5, the count line**: unchanged. The diff hunk
(`.fx/2026-09-11-fx-audit/review/89aa044..85901b9.diff`) shows the
`**Feature count:**` / `**Target count:**` / `**Row count:**` paragraph
(now at `references/audit-template.md:123-129`) entirely as context lines,
no `+`/`-` markers on or around it. Confirmed byte for byte against the
current file: identical wording to round 4's fix, still "**Target count:**
<N>, the number of entry lines in this report's own **Stated targets** field
above, one per target, so a field with no entry lines gives 0."

## Out-of-scope observations

None.

## Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.
One Minor item: the two worked examples drop the field's description
sentence, a visual form that does not match the skeleton's own convention
for a finished field (used by the immediately adjacent `Feature count` /
`Target count` / `Row count` fields), though both examples still yield the
target count they state and neither reopens the round-4 defect.
