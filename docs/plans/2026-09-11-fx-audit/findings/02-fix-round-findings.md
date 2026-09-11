# Fix round findings: task 02, artifact gate

Fix base: c2186cc
Head: 9eea5c1
Diff: scripts/check-artifacts, 1 file changed, 1 insertion, 4 deletions

## Finding verdict

**A file the gate cannot read is skipped in silence: ADDRESSED.**

The four line try/except block that wrapped `path.read_text()` and caught
`(UnicodeDecodeError, OSError)` with a bare `continue` is fully removed. The
current file at `scripts/check-artifacts:39` reads:

```
        text = path.read_text()
```

with no surrounding exception handler anywhere in the file (confirmed by
reading the complete 73 line file; the only try/except that ever existed in
this script was the one deleted by this diff).

Verification performed, not assumed:

1. Read the full current file (`scripts/check-artifacts`, 73 lines) and
   confirmed no `try`/`except` remains anywhere in it.
2. Confirmed the exit path. `main()` is invoked as `sys.exit(main())` at the
   bottom of the file. If `path.read_text()` raises inside `main()`, the
   exception propagates out of `main()` before `sys.exit` ever runs, so
   Python's own top level handler takes over: it prints a traceback to
   stderr and terminates the process with exit status 1. I did not take this
   on faith. I reproduced it independently on a scratch copy under the
   scratchpad (never touching a real repository file): built a throwaway
   `skills/agents/commands` tree with one file containing `/tmp`, ran
   `chmod 000` on it, ran an extracted copy of the same scan logic, and read
   the exit code directly with `echo $?` (no pipe). Result: a `PermissionError`
   traceback naming the exact file, and `EXITCODE:1`. This matches the
   implementer's reported `chmod 000` test on `skills/fx-review/COVERAGE.md`
   in the fix report, which also got a named `PermissionError` and exit 1,
   and which was restored by copying a backup rather than `git checkout`
   (I did not repeat that step on a real file; I did not need to, since the
   mechanism is generic Python behavior and the scratch reproduction already
   proves it).
3. Confirmed the count did not change shape. The diff touches only the four
   lines of the try/except; it does not touch `PATTERNS`, `AREAS`, the walk
   in `files()`, or the hit collection logic. The fix report's rerun after
   the change shows the same 16 lines across 9 files as before the fix, and
   I additionally verified this claim is structurally guaranteed rather than
   coincidental, since nothing that produces `hits` or `by_file` was edited.

The specific defect (an unreadable file silently reducing the finding count
with no message and exit 0) can no longer occur: the only two outcomes left
are a clean scan of every file that exists, or a crash naming the file that
could not be read, with exit 1 either way something goes wrong.

## New breakage in the fix diff

None.

Points checked and cleared:

- **Report completeness under a mid-scan crash.** The `print` statements for
  the exemption count and the `FAIL`/`OK` summary sit after the entire `for
  path in files()` loop completes (lines 37 to 46 are the loop, the first
  `print` is line 48). This means a crash partway through the scan produces
  no `FAIL: N line(s)` message at all, partial or otherwise, only the
  traceback on stderr and a nonzero exit. There is no way to mistake the
  output for a complete clean report, because no report is printed before
  the crash. This is the strongest version of the tradeoff the controller
  accepted: loud and empty, never loud and half right.
- **UnicodeDecodeError is covered too.** The removed handler caught both
  `UnicodeDecodeError` and `OSError`; the diff deletes the whole block, so
  both now propagate identically. The fix is not narrower than the original
  guard.
- **No other exception handling exists to reintroduce the same class of
  bug.** Confirmed by reading the whole file: one function does the file
  walk, one function does the scan, no other `try` appears.
- **The diffstat matches the content.** One insertion, four deletions,
  exactly the collapse of a five line guarded read into a one line bare
  read.

## Out-of-scope observations

The fix report notes three environment changes made by other work in the
same tree during this round (`check-prose` gaining a `.fx/` exemption and a
block wide stock vocabulary exemption; `check-all` and `.fx.json` building
fixtures at a per-process-unique path). None of these touch
`scripts/check-artifacts` or the ADR, and none are part of this diff, so
they are noted here only for the record and do not affect this verdict.

## Verdict

**Fix round:** Finding addressed, no new Critical/Important breakage.
