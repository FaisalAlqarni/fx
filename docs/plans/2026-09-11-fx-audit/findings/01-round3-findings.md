# 01: machine facts, round 3 re-review findings

Scope: verdict the paragraph-wide exemption bleed finding and inspect the fix
diff `9eea5c1..3868025` (`scripts/check-prose` only) for anything the fix
itself introduced. No other code was reviewed.

## Finding verdict

**Paragraph-wide exemption bleed: ADDRESSED.**

The fix replaces the block-wide exemption with two exemptions, each scoped
narrower than a paragraph:

1. `mask_inline_code()` (`scripts/check-prose:68-83`) blanks every
   backtick-delimited span across a whole block's text, preserving newlines,
   so a phrase whose backtick pair straddles a line wrap is still found and
   removed. Masking is keyed per physical line into `masked_line`
   (`scripts/check-prose:174-181`) and only that occurrence's bytes are
   blanked, nothing else on the line or in the paragraph.
2. The per-line density check (`scripts/check-prose:211-212`,
   `sum(...) >= 3`) still exempts only the one line it fires on; nothing
   widens it to the block anymore. `PREAMBLE.md`'s italic quotation
   (unquoted by backticks) relies on this path.

Evidence, all read directly (no pipes), all in a scratch directory outside
the repository, deleted after each run:

- Real live case: `python3 scripts/check-prose
  docs/plans/2026-09-11-fx-audit/findings/01-machine-facts-findings.md` -
  `OK`, exit 0.
- Real `PREAMBLE.md`: `python3 scripts/check-prose PREAMBLE.md` - `OK`, exit
  0.
- Reconstructed case 3, backtick-quoted-list variant, violation line placed
  before and after the dense quote line in the same paragraph (no blank
  line): both orderings flagged `"robust"` at the correct line number, exit
  1.
- Reconstructed case 3, `PREAMBLE`-style italic-list variant, same two
  orderings: both flagged `"robust"`, exit 1. (prose-gate: quoting)

All three required cases hold, in both position variants of case 3.

## New breakage in the fix diff

**Important: `mask_inline_code` exempts any single stock word wrapped in one
backtick pair, unconditionally, with no density gate.** `scripts/check-prose:68-83`
plus its unconditional use at `scripts/check-prose:210` (`low =
masked_line.get(n, line).lower()`, fed straight into the final hit search at
line 213-216, not only into the density-trigger computation). Before this
diff, a stock word's visibility to the stock/hedge search never depended on
backticks at all: a single word wrapped in backticks was still plain text to
the regex and was caught unless its line also hit the old block-wide density
trigger. This diff makes ANY backtick pair around ANY stock word invisible
to the whole check, on its own, with no minimum count and no requirement
that the surrounding text look like a quotation of the rule.

Reproduced, scratch file outside the repository, deleted after:

```
This design is meant to be `robust` under load, and the team is proud of it.
```

`python3 scripts/check-prose <file>` -> `OK: no dashes, no stock vocabulary,
parentheses balanced`, exit 0. Confirmed again with two backtick-wrapped
words in one ordinary sentence (`` `robust` `` and `` `comprehensive` ``,
still under the old density floor of three) with the same result: exit 0.
(prose-gate: quoting)

This is exactly the probe the task called out ("A stock phrase inside
backticks that is genuinely being used rather than named") and it holds:
wrapping the offending word in a single backtick pair defeats the entire
stock-vocabulary gate, silently, with no signal in the output. It also
triggers by accident, not only by intent: writing `` `robust` `` because a
term is being formatted as code-ish, while still meaning it as ordinary
praise-adjective prose, now escapes detection. (prose-gate: quoting)

Severity: Important. The finding under review was specifically about this
gate's stock-vocabulary detection being too permissive across a shared
paragraph; this diff closes that hole and opens a different, arguably wider
one in the same function, in the same commit. It does not corrupt data or
break other gates, so it is not Critical, but it materially weakens the
prose gate this task exists to provide.

### Checked and found clean

- **Unbalanced/stray backticks masking too much:** tried a block with an
  odd backtick count meant to pair across unrelated text; did not manage to
  make a stray pairing swallow a genuine violation in a reproducible way
  once the parenthesis-balance check (unrelated to this diff) was kept out
  of the picture. Not pursued further as a distinct finding.
- **Phrase spanning a fenced code block boundary / paragraph merging across
  a no-blank-line-adjacent fence:** `blocks()` (unchanged by this diff) can
  merge a pre-fence line and a post-fence line into one internal block
  string without preserving the true physical-line gap, which in principle
  could misalign `masked_line`'s `start + i` keys. Built a direct test
  (prose immediately before a fence, immediately after with no blank
  lines) and the genuine violation on the far side was still flagged at its
  correct line number; the arithmetic in this case always lands the
  misaligned keys on physical positions that the fence-tracking in the main
  loop also skips, so no discrepancy surfaced. This is a pre-existing
  property of `blocks()` (used identically for line-numbering by the
  parenthesis-balance check before this diff), not something the diff
  introduced, and it did not reproduce under test. Left as an out-of-scope
  observation, not a diff-introduced defect.
- **Heading, table cell, list item:** genuine unquoted violations in all
  three positions were flagged normally at the correct line.

## Out-of-scope observations

None beyond the `blocks()` paragraph-merge property noted above, which
predates this diff and is not part of the changed predicate.

## Verdict

**Fix round:** Finding remains open pending the new Important item. The
paragraph-wide bleed itself is fixed and proven three ways, but the fix
introduces a distinct Important gap in the same function: a single
backtick-wrapped stock word bypasses the stock-vocabulary check entirely,
regardless of density or context.
