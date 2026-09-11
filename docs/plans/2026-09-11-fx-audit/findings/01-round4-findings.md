# Task 01, round 4 (final) re-review: `scripts/check-prose`'s marker fix

**Fix base:** 660bef0
**Head:** a1ac01a
**Diff:** `.fx/2026-09-11-fx-audit/review/660bef0..a1ac01a.diff`

## Finding verdict

**Inference replaced by an explicit marker: ADDRESSED**, with one new defect
found in the block to physical line mapping the fix introduces (see below).

`scripts/check-prose` at a1ac01a removes both prior heuristics. `INLINE_CODE`,
`mask_inline_code()`, and the per-line `sum(...) >= 3` density check are gone
(confirmed absent by reading the full file, `scripts/check-prose:1-217`).
`MARKER = 'prose-gate: quoting'` is a plain string (`scripts/check-prose:52`),
checked by substring presence in a block's joined text
(`scripts/check-prose:172`, `if MARKER in block:`), and the exemption is
applied per physical line via a `marked_lines` set built from that block
(`scripts/check-prose:166-174`), consumed later only by the stock and hedge
scan (`scripts/check-prose:189-195`), never by the dash check or the
parenthesis check.

All four required properties hold on fresh cases, worded differently from
every prior round's proofs, run in a scratch directory outside the repo,
every exit code read directly:

1. **Marked quote passes.** A fresh quotation of the full banned list with
   `(prose-gate: quoting)` appended: `1 block(s) exempted`, `OK`, exit 0.
2. **Unmarked quote fails.** The identical sentence with the marker removed:
   `0 block(s) exempted`, `FAIL: ... 2 stock-vocabulary hits`, exit 1.
3. **A single backticked stock word in ordinary prose is caught.** Verified
   indirectly: the fix deletes `mask_inline_code` entirely, so no code path
   remains that treats backticks specially. Also directly, in test G below:
   backticks are irrelevant now, only the marker matters.
4. **A genuine violation inside a marked block is exempt, and it is visible.**
   A one-line paragraph combining `(prose-gate: quoting)` with a real,
   unquoted claim: `1 block(s) exempted`, `OK`, exit 0. The `N block(s)
   exempted by \`prose-gate: quoting\`` line prints unconditionally, on every
   run, including when `N` is 0 (confirmed with a clean file: `0 block(s)
   exempted`, then `OK`), so the exemption is never silent, closing the exact
   gap the task called out ("a number that appears only when non-zero is one
   nobody learns to look for").

**Two cases nobody has run before, both new territory:**

- **The dash and parenthesis checks still run inside a marked block, exactly
  as intended.** One block, marked, quoting four stock words, one unbalanced
  paren, and one em dash: `1 block(s) exempted`, then `FAIL: 1 lines with a
  dash, 0 stock-vocabulary hits, 1 block(s) with an unclosed parenthesis`,
  naming the exact line for both the paren and the dash, exit 1. The marker
  suppresses vocabulary only. This was the specific gap the review brief
  named as most likely; it is not present. `scripts/check-prose:186-188` (the
  dash check) runs unconditionally before the `if n in marked_lines: continue`
  guard on line 189, and the paren check at lines 168-171 runs inside the
  `blocks()` loop with no marker condition at all.
- **A code fence embedded inside a markdown "paragraph" (no blank line on
  either side) breaks the block-to-physical-line mapping that `marked_lines`
  relies on, and can silently exempt a genuine, unmarked violation that has
  nothing to do with the marker.** This is the new defect, detailed next.

## New breakage in the fix diff

**Severity: Critical.** `scripts/check-prose:166-174` builds `marked_lines`
like this:

```
marked_lines = set()
for start, block in blocks(text):
    ...
    if MARKER in block:
        exempted_blocks += 1
        marked_lines.update(range(start, start + len(block.splitlines())))
```

`block` is the text `blocks()` joins from the physical lines it kept, and
`blocks()` drops every line inside a real (non `markdown`-tagged) fence from
that join while continuing to accumulate the surrounding prose into the same
paragraph, because a fence line never resets `buf` and a blank line inside a
fence is skipped without triggering the yield. So when a fence with no blank
line on either side sits inside what `blocks()` treats as one paragraph, the
joined block's line count is smaller than the paragraph's true physical
height, and `range(start, start + len(block.splitlines()))` lands on the
wrong physical lines. Because the range always starts at `start`, the very
first physical line of such a paragraph is always inside `marked_lines`
regardless of where the marker actually sits, and it stays exempt from the
stock and hedge scan even when it carries the real violation and the marker
is far below it, separated by an arbitrarily long fenced block.

Minimal reproduction, built outside the repo, deleted after
(`/tmp/.../scratchpad/prose-round-final/testJ-fence-drift-hides-violation.md`,
seven lines):

````
This first line already claims the system is robust in production.
```python
x = 1
y = 2
z = 3
```
This line after the fence carries the marker on purpose (prose-gate: quoting).
````

Run: `python3 scripts/check-prose testJ-fence-drift-hides-violation.md`.
Output:

```
1 block(s) exempted by `prose-gate: quoting`
OK: no dashes, no stock vocabulary, parentheses balanced
```

Exit 0. Line 1's quoted claim (naming the same word the reproduction file
uses to describe a system as dependable) is a genuine, unmarked violation,
five lines above the marker, separated by a fenced code block, and it passes
silently, no different in the report from a legitimately quoted paragraph
(prose-gate: quoting). This is not the accepted cost in property 4 (a
violation sharing a paragraph with its own marker): the marker text never
shares a markdown paragraph with line 1 in any reading a person would
recognize, a fence sits visibly between them, and the exemption exists only
because `marked_lines` is computed from an offset that assumes the block's
joined line count equals its physical line span, which a fence violates. The
same file with the fence's three body lines deleted (no fence at all, same
two sentences four lines total) does not exhibit the bug, because then the
joined block genuinely spans exactly those physical lines.

This directly defeats property 2 as stated in the task: "An unmarked
quotation fails. This is the deliberate cost: a forgotten marker is a false
positive, which is the direction a gate should fail in." Here a marker
present anywhere later in a fence-interrupted paragraph launders an unmarked
violation, the opposite direction from the one the design commits to. It is
also a realistic shape for this exact repository: multiple files already read
during this review (`.fx/2026-09-11-fx-audit/reports/01-machine-facts-report.md`,
throughout) place a sentence, an unlabelled or output-only fence, and a
following sentence back to back with no blank line, which is the precise
adjacency this bug needs. It does not require the fence's content itself to
contain the marker, and it does not require the marker and the violation to
be visually close.

**File/line: `scripts/check-prose:166-174`, specifically the `range(start,
start + len(block.splitlines()))` on line 174.**

## Out-of-scope observations

- `PREAMBLE.md:167-176` (the block into which this round appended the
  marker) is now the running example of a marked block in the tree, and its
  wording ("This one is stated as an absolute...") for the dash rule sits in
  the following, separate, unmarked paragraph, correctly outside the marked
  block's reach. No issue, noted only because it was the first thing checked.
- `state.md:431` and `state.md:564` are reported by the fix's own author as
  the sole remaining cause of a non-zero `check-all`, left unmarked on
  purpose because the file is described as outside this round's scope and
  concurrently written. That is a real, acknowledged gap in migration
  completeness, not a defect in the mechanism under review, and it is already
  fully disclosed in the fix report. Not re-litigated here.
- The two files the ruling named but the fix's author did not mark
  (`01-fix-rounds-findings.md`, `02-artifact-gate-findings.md`) were checked
  by the author against the live gate and shown to already pass unmarked,
  because their quotations sit inside untagged triple-backtick fences (code,
  not prose, under `code_fence()`). Spot checked here by re-reading
  `scripts/check-prose:79-83`: an untagged fence is code by default, so this
  holds independent of anything in this diff. No issue.
- `MARKER` is matched by plain substring, not a word-boundary or exact-phrase
  regex, so any prose that quotes the marker string itself (to explain the
  feature, as this very document does) trivially exempts its own block. This
  is consistent with, not a bug in, a presence-based design, and mirrors the
  already-known, already-deferred Minor on `EXEMPT`'s bare substring match
  from an earlier round. Left as-is.

## Verdict

**Fix round: Finding remains open.** The explicit-marker redesign itself is
sound and addresses the finding: presence-of-a-string is checked, not
inferred, and the four required properties hold, including the specific
dash and paren independence the review brief predicted as the likely gap
(confirmed NOT present). But the fix diff introduces one new Critical defect,
the fence-interrupted block line count mismatch in
`scripts/check-prose:166-174`, which lets a genuine, unmarked
stock-vocabulary violation pass silently whenever a real code fence with no
surrounding blank lines sits between it and a marker anywhere later in the
same paragraph. That is new breakage from this round's own code, not a
pre-existing or accepted cost, and it defeats property 2's core guarantee in
a shape this repository's own documents plausibly produce. This needs one
more fix: computing `marked_lines` from the block's actual physical line
numbers (for example, tracking which physical line numbers were appended to
`buf` while building each block in `blocks()`, rather than assuming
`range(start, start + len(block.splitlines()))`) so the count matches skips
over fenced content, not their absence.
