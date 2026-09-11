# 01-machine-facts: fix rounds re-review

Fix base a7e7335, head c282cb4. Two fix commits: 64f8103 (fixture shape,
fixture path uniqueness, prose exemption widened to the block) and c282cb4
(`.fx/` exempted in `check-prose`).

## Finding verdicts

### 1. `scripts/check-all` fixture capture had no shape validation

ADDRESSED. `scripts/check-all:47` now reads a third variable
(`read -r MAIN WT EXTRA <<<"$FIX"`) and `scripts/check-all:48-52` rejects the
capture unless `MAIN` and `WT` are both non-empty, `EXTRA` is empty, and both
paths are real directories. I confirmed by hand that every malformed shape
(zero tokens, one token, three or more tokens, two tokens pointing at
non-existent paths) fails one of those five conditions, and only the
well-formed two-directory case passes. The original defect, a `read` that
returns success regardless of shape because a here-string always supplies a
terminating newline, no longer has anywhere to hide: the exit code no longer
carries the check, the explicit `-z`/`-d` tests do.

### 2. `scripts/check-all` and `.fx.json` fixture paths raced under concurrency

ADDRESSED. `scripts/check-all:36` builds the fixture at
`/tmp/fx-fixture-check-all-$$`, keyed on the script's own PID.
`.fx.json:3` (`test_one`) and `.fx.json:6` (`setup`) do the same, each inside
its own `bash -c '...'` wrapper so `$$` expands to that subshell's PID rather
than to the PID of whatever process is composing the command line. Since
`make-git-fixture` opens with `rm -rf` on the path it is handed
(`scripts/make-git-fixture:27`), two concurrent invocations now get distinct
paths and can no longer delete each other's fixture mid-run.

### 3. `scripts/check-prose` stock-vocabulary exemption was per line, not per block

ADDRESSED for the specific defect named. I built a file where a quoted list
opens on one line, naming five of the listed phrases, and the tail of the
same sentence wraps onto a second line naming only one:

```
The banned list includes delve, seamless, robust, comprehensive, crucial,
utilize, pivotal, testament to, in the realm of, it is important to note,
and plays a vital role, which is the tail of the same quoted list.
```

`scripts/check-prose` on that file now exits 0 (`OK: no dashes, no stock
vocabulary, parentheses balanced`). Before this fix the second line alone
would have tripped the gate, exactly the false positive the finding names.
The mechanism, `scripts/check-prose:160-172`, computes a per-line density
trigger inside the block loop and, once any line in a paragraph trips it,
marks every line of that paragraph exempt (`scripts/check-prose:187` checks
membership before the stock-word scan runs).

I also re-ran the implementer's own mutation case, a paragraph with one
stock phrase per line and no single line reaching the threshold of three:
`scripts/check-prose` still flags all three lines individually and exits 1.
So the specific concern raised in the brief, that a naive whole-block sum
would swallow genuine misuse spread across lines, does not reproduce against
this implementation. See New breakage below for a different way the same
change opens the gate wider than intended.

### 4. `scripts/check-prose` must exempt `.fx/`

ADDRESSED for the specific defect named. `.fx/` is now a member of `EXEMPT`
at `scripts/check-prose:23`, and running the gate against this task's own
report file, which lives under `.fx/`, now exits 0 where it previously
failed on the report's own quotation of the banned list. See New breakage
below for how far the membership test actually reaches.

## New breakage in the fix diff

### Important: the per-block exemption also hides real violations sharing the same paragraph as a dense line

The widened exemption in `scripts/check-prose:160-172` marks every line of a
paragraph exempt once any one line in it trips the three-phrase density
trigger. `blocks()` groups lines into a paragraph by blank-line boundaries
only, so any prose that shares a paragraph with a dense line, whether before
it or after it and with no blank line between, is swept into the same
exemption even when it has nothing to do with the quoted list.

I confirmed this two ways. First, a violation placed after the dense line in
the same paragraph:

```
The banned list includes delve, seamless, robust, comprehensive, crucial,
and this same paragraph continues with an unrelated sentence that says the
new pipeline is a [robust] and [pivotal] upgrade nobody asked for.
```

(brackets added here only so this sentence itself does not retrigger the
gate on this findings file; the actual test file used the bare words.)
`scripts/check-prose` on that file exits 0. Second, the same result with the
violation placed before the dense line instead of after it. Both cases pass
when they should fail.

Before this fix the per-line version of the same trigger would have caught
both: the old code tested and exempted one line at a time, so a second line
in the same paragraph with its own stock-word hits was still scored on its
own merits. The block-wide version introduced by this fix regresses that:
two words on an otherwise-ordinary line are enough to fail on their own, but
once that line sits in the same paragraph as an unrelated dense line, both
are waved through.

The fix as shipped answers the false positive the finding named, but the
scope of the exemption is wider than the finding asked for: the finding
describes a single quotation whose own text wraps across lines, not an
arbitrary paragraph that happens to contain a dense line plus other content.
Recommend scoping the exemption to the contiguous run of lines that are
actually dense or adjacent to a dense line via a shared list-like shape,
rather than to the whole paragraph, or requiring a blank line to reset the
exemption the way it already resets a block boundary.

### Minor: `.fx/` membership is a bare substring test, inherited from the existing six exemptions

`scripts/check-prose:47-48` (`files()`) tests membership with
`any(e in rel for e in EXEMPT)`, plain substring containment against the
whole relative path string, no anchoring to a path segment boundary. This
predicate already existed for `.git/`, `upstream/`, and the other five
entries before this fix; `.fx/` simply joins the same tuple. I confirmed
with a direct string check that a path such as `notes.fx/file.md` contains
the four characters `.fx/` as a substring and would be wrongly exempted by
this test, even though it is not the `.fx/` workspace. No such path exists
in this repository today, and the same weakness already applied to `.git/`
and the other entries before this change, so this is not a new class of bug
introduced by the diff, only one more literal added to an already-loose
predicate. Worth a follow-up (segment-anchored matching, e.g. `rel == '.fx'
or rel.startswith('.fx/')`) but not blocking on its own.

### Minor: per-process fixture directories are never removed

`scripts/check-all:36` and the two `.fx.json` commands now key their fixture
directory on `$$`, which fixes the concurrency race, but nothing deletes the
directory afterward. The previous fixed-path design self-limited to one
leftover directory, overwritten by `make-git-fixture`'s own `rm -rf` on the
next run. The new design accumulates one leftover directory under `/tmp` per
invocation indefinitely. Not a correctness problem for the gate itself, and
`/tmp` is typically cleared on reboot, but worth a follow-up trap/cleanup if
`check-all` or `test_one` run often in a long-lived environment.

## Out-of-scope observations

The implementer's report flags that `commands/fx-setup.md`'s schema table is
missing `test_scope` as one of its eight keys, and says this is already
being addressed in the user's uncommitted working copy on the base branch.
That file is untouched by this fix diff and is not something this re-review
covers.

## Verdict

**Fix rounds:** Findings remain open. Findings 1, 2, and 4's named defects
are fixed and verified. Finding 3's named defect is also fixed and verified,
but the fix that closes it introduces a new Important-severity regression
(paragraph-wide exemption bleed, detailed above) that itself needs a fix
before this round can close. Finding 4 additionally carries a Minor,
pre-existing-pattern substring-reach caveat that is worth a follow-up but
does not block on its own.
