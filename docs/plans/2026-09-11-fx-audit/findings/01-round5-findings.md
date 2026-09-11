# Task 01, fix round 5 re-review

Fix base 184490a, head 2bd5208. One commit, 8 lines added to `scripts/check-prose`
at lines 128 to 135: a code fence line now flushes the current block in `blocks()`
before the fence state toggles.

## Finding verdict

**Marker exempts across a code fence: ADDRESSED.** `scripts/check-prose:127-136`.

Why it holds, from reading the code: after the flush, every block `blocks()` yields
is a contiguous run of non-blank physical lines. A blank line flushes, a fence line
flushes, and while inside a fence nothing is appended. So `len(block.splitlines())`
equals the physical span and `marked_lines.update(range(start, ...))` at line 182 is
exact. The stock-vocabulary loop at lines 187 to 203 uses the same fence predicate
as `blocks()`, so the marked line numbers and the scanned line numbers agree. The
flush happens at every triple-backtick line whatever its tag or the current fence
state, so marker containment does not depend on fence parity being right.

Method: every case built in a scratch directory under `/tmp`, run with
`python3 scripts/check-prose <file>` and, for comparison, a copy of the pre-fix
script rebuilt by reverse-applying the diff file. Exit codes read with `$?`
directly after each command, never through a pipe. The banned word used in every
violating case is one entry from the stock list. Scratch files deleted afterwards.

Cases, as new exit then pre-fix exit:

- a01, the previous re-reviewer's repro: violation, python fence, marker line after. New 1, old 0. Flagged at line 1.
- a02, the mirror with a four-line tail: marker, bare fence, violation. New 1, old 0.
- a03, a marked quotation wrapped over two lines. New 0, old 0.
- a04, a plain violation. New 1, old 1.
- b01, fence opener never closed, violation after it. New 0, old 0. Unchanged, see observations.
- b02, marker, then an unclosed python fence holding the word. New 0, old 0. Same shape as b01.
- b03, fence on line 1, violation after the closer. New 1, old 1.
- b04, marker paragraph, then a fence whose closer is the last line with no trailing newline. New 0, old 0.
- b05, violation, then a fence at end of file holding the marker. New 1, old 1: a marker inside code exempts nothing.
- b06, list item carrying the marker, indented fence, next item with the violation. New 1, old 1.
- b07, the reverse: violating item, indented `sh` fence, marked item. New 1, old 0. This is the finding reproduced inside a list.
- b08, violation, then a `markdown` fence whose content carries the marker. New 1, old 0. A marker inside a prose fence stops at the fence boundary.
- b09, marker in one paragraph of a `markdown` fence, violation in a second paragraph inside the same fence. New 1, old 1.
- b10, marker before a `markdown` fence, violation inside it. New 1, old 1.
- b11, a `markdown` fence, then a violation after its closer. New 0, old 0. Pre-existing, see observations.
- b12, marker inside a bare code fence, violation after it. New 1, old 1.
- b13, fence, marked prose, fence, violation, no blank lines anywhere. New 1, old 1.
- b14, fence, violation, fence, marker, no blank lines anywhere. New 1, old 0.
- b15, fence, marked prose, fence, nothing else. New 0, old 0.
- b16, a parenthesis opened before a fence and closed after it. New 1 with two unclosed-parenthesis reports at lines 1 and 5, old 0. Confirms the implementer's claim.
- b17, parentheses balanced on each side, plus an unbalanced one inside the code. New 0, old 0.
- b18, two marked paragraphs either side of a fence. New 0, old 1. The old false positive is gone.
- b19, marker written on the fence info line, violation before it. New 1, old 1.
- b20, a marked block containing an em dash. New 1, old 1: the marker never exempts dashes.
- b21, violation on the second of three lines, fence, three filler lines, marker. New 1, old 0.
- b22 and b23, probes for the observation below, identical output on both scripts.

Cases the controller did not run include b02, b04, b05, b07, b08, b09, b11, b13,
b14, b16, b18, b19 and b21.

Real tree: an in-process harness ran `main()` from both scripts on each of the 112
files `files()` selects, one file at a time, comparing exit code and full stdout.
Zero files differ. The implementer's "real-tree output unchanged" holds. I did not
run `scripts/check-all`.

## New breakage in the fix diff

None at Critical or Important.

Minor, `scripts/check-prose:133-135`: a parenthesis that legitimately spans a
fenced block inside one list item now fails the parenthesis check. Example: a list
item reading "run this (the output follows", an indented fence, then "and ends
here)". In rendered markdown that is one list item, so the prose is well formed.
It is rare, nothing in the real tree hits it, and the error message points at the
right place, so this is not worth another round. Recording it so nobody is
surprised later.

## Out-of-scope observations

**The closer of a `markdown`-tagged fence opens a code block.** Pre-existing, not
touched by this diff, and not one of the two recorded limitations. Line 136 and line
190 both do `infence = code_fence(line) if not infence else False`. A `markdown`
opener leaves `infence` False, so its bare closer is read as an opener, and
`code_fence` on a bare fence returns True. From there fence state is inverted until
the next triple-backtick line.

Evidence: b11 exits 0 with a banned word on the line after a `markdown` fence
closes. b22 puts a `markdown` fence, a prose line with the banned word, a `bash`
fence holding an em dash and the banned word, then prose with the banned word
again. Only line 6, the code inside the `bash` fence, is reported. Both prose lines
pass. The pre-fix script produces identical output. 28 checked markdown files in
the tree contain at least one `markdown`-tagged fence, so prose after each one is
currently unscanned and the code after that is scanned as prose. The real tree
passing today says nothing about that prose. The fix is to track which kind of
fence is open rather than one boolean, in both loops.

Suggested severity for a separate task: Important, since it is a silent hole in
the same gate this task built.

**An unclosed fence hides the rest of the file** (b01, b02). Unchanged by this diff,
and CommonMark renders an unclosed fence to end of document as code too, so it
matches the renderer. Noted only because the brief asked.

## Verdict

**Fix round:** Finding addressed, no new Critical/Important breakage.
