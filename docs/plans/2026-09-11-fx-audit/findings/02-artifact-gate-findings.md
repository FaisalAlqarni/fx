# Task 02 review: the artifact gate, red, plus ADR 0015

## Commands run and their output

```
$ python3 scripts/check-artifacts
0 line(s) exempted by `artifact-gate: ok`
FAIL: 16 line(s) across 9 file(s) name the OS temp directory
  skills/fx-brainstorm/scripts/stop-server.sh:6
  skills/fx-brainstorm/scripts/stop-server.sh:112
  skills/fx-brainstorm/scripts/stop-server.sh:113
  skills/fx-architecture/COVERAGE.md:32
  skills/fx-architecture/COVERAGE.md:123
  skills/fx-architecture/HTML-REPORT.md:24
  skills/fx-architecture/HTML-REPORT.md:25
  skills/fx-architecture/SKILL.md:78
  skills/fx-architecture/SKILL.md:79
  skills/fx-brainstorm/scripts/start-server.sh:10
  skills/fx-brainstorm/scripts/start-server.sh:123
  skills/fx-brainstorm/visual-companion.md:57
  skills/fx-brainstorm/visual-companion.md:293
  skills/fx-brainstorm/scripts/server.cjs:102
  skills/fx-review/COVERAGE.md:75
  skills/fx-review/reviewer-prompt.md:58
exit 1
```

This is the intended red per ledger Ruling C, matched exactly against the
per-file table in `docs/plans/2026-09-11-fx-audit/tasks/02-artifact-gate.md`
(lines 86 to 95). All nine files and all sixteen line counts agree.

## Independent marker verification (not trusting the report)

Backed up `skills/fx-review/COVERAGE.md`, appended `artifact-gate: ok` as an
HTML comment to line 75 (the `git worktree add /tmp/review-<SHA>` line),
re-ran the gate:

```
1 line(s) exempted by `artifact-gate: ok`
FAIL: 15 line(s) across 8 file(s) name the OS temp directory
```

Count dropped 16 to 15, files 9 to 8, exemption count 0 to 1. Restored the
file by copying the backup over it, then confirmed with `diff` against the
backup: no output, byte identical. Never used `git checkout`.

## Independent exemption-scope verification

Confirmed both named files contain a temp path and neither is reported:

```
scripts/make-git-fixture:22       #   node lib/git-guard.test.js $(scripts/make-git-fixture /tmp/fx-fixture)
tests/lane-triggering/run-test.sh:51   OUT="${TMPDIR:-/tmp}/fx-lane-triggering/$$/${LANE}"
```

`python3 scripts/check-artifacts | grep -E '^\s+(scripts|tests)/'` returned
nothing. Reading `scripts/check-artifacts:93` to `104`, the exemption is
structural: `AREAS = ('skills', 'agents', 'commands')` and `files()` never
visits `scripts/` or `tests/` at all, matching the ledger's scoping rule and
the report's own explanation.

## check-all is not touched by this task

`grep -n "check-artifacts" scripts/check-all` returned no match, grep exit
code 1, confirming the new gate is not wired into the combined command, which
is the explicit acceptance criterion.

## ADR content check

Read `skills/fx-architecture/COVERAGE.md:31` and `:32` directly rather than
trusting the ADR's quotation. The source lines read:

```
| **"Write to the OS temp directory so nothing lands in the repo"** | K/H | **Restored**: the reason, not just the rule. Two prior runs left files in `/development` |
| **`$TMPDIR` -> `%TEMP%` (Windows) -> `/tmp`** | K/H | **Restored**: cross-platform |
```

The ADR's two block quotes match this source verbatim. The ADR states the
rule (paragraph one), names the inherited rule it reverses and quotes the
original reason (the two block quotes), explains why a plan directory is not
the repository root that reason was about (the paragraph starting "fx is not
in that position"), and has a dedicated section, "Consequence a future reader
will be surprised by," recording that reports become committed files. All
four ADR-specific acceptance criteria are met.

`python3 scripts/check-prose docs/adr/0015-artifacts-live-in-the-repository.md`
printed `OK: no dashes, no stock vocabulary, parentheses balanced`, exit 0.

Checked both new files by hand for the global constraints this review
carries independently of check-prose: `grep -n` for the em dash and en dash
characters found none in either file, and a case-insensitive grep for the
banned list found none either. For the record, the list checked in one
fenced block:

```
delve, leveraging, leverages, leveraged, seamless, robust, comprehensive,
crucial, utilize, pivotal, testament to, in the realm of,
it is important to note, plays a vital role
```

## Commit check

`git log -1 --format='%B' a7e7335` is exactly `feat: add the artifact-location
gate and record the rule`, one line, no attribution trailer. `git show --stat`
confirms only the two intended files, 125 insertions, no deletions.

## Should this code exist (prior art check)

Compared against `scripts/check-prose` and `scripts/check-paths`, the two
adjacent gates named in the review brief. `check-paths` already walks
`skills/`, `agents/`, `commands/` with the same three-directory convention
(`scripts/check-paths:23`), but restricts to `*.md`; `check-artifacts` needs
every file extension because a shell script or a `.cjs` helper can carry a
temp path too, so the broader `rglob('*')` is a real requirement, not
duplicated scope. Neither existing gate detects a temp-directory literal.
There is no shared walker module across the existing gates (`check-prose` and
`check-paths` each define their own `ROOT` and their own loop), so a
freestanding `files()` function in `check-artifacts` matches the codebase's
existing convention rather than skipping a reuse opportunity that already
exists elsewhere.

## Under-report risk (named risk from the review brief, checked directly)

`scripts/check-artifacts:112` to `115`:

```python
        try:
            text = path.read_text()
        except (UnicodeDecodeError, OSError):
            continue
```

A file that cannot be decoded or cannot be opened is skipped with no count,
no message, and no effect on the exit code. Confirmed no file under
`skills/`, `agents/`, `commands/` currently triggers this path (a script that
attempts `path.read_text()` on every file in those three directories raised
no exception). So today's count of 16 across 9 files is not affected. The
defect is latent, not currently manifesting: the moment a binary asset, an
image, or a file in a non-UTF-8 encoding lands under `skills/`, `agents/` or
`commands/`, the gate silently stops looking at it and would under-report
without any signal that a file was skipped. `scripts/check-paths` (its own
`path.read_text()` at line 25) has no such guard at all, so a decode failure
there would raise and fail loudly instead of passing silently. This gate is
the only one of the three that converts a read failure into silence, which is
exactly the failure mode this review was asked to check for by name.

## TDD evidence

The reported RED, `python3: can't open file '.../scripts/check-artifacts':
[Errno 2] No such file or directory`, matches the real error Python 3 prints
for a missing script and is caused by the missing behavior itself (the file
did not exist), not by an unrelated problem. Only one commit exists on this
task (`a7e7335`), so the RED state was never committed, which is expected
since there is no file to commit before the gate exists. I cannot re-run the
historical RED state without deleting the committed file, which would mutate
the working tree, so I did not attempt it. Flagging this as unverifiable
rather than confirmed:

- Cannot verify from the diff alone: whether the RED run shown in the report
  was actually executed at the time or reconstructed after the fact. What
  the controller should check: whether the implementer's session transcript
  or tool log shows the actual failing invocation before the file was
  written.

## Part 1: spec compliance walk

1. Scans `skills/`, `agents/`, `commands/`, every extension, excludes
   `scripts/` and `tests/`. Verified. `scripts/check-artifacts:93`.
2. Matches all six patterns. Verified. `scripts/check-artifacts:92`.
3. `artifact-gate: ok` exempts a line and the count is reported, including
   when zero. Verified by direct run and by the marker experiment above.
4. Exits 1, reports 16 lines across 9 files. Verified, exact match.
5. Marker drops count to 15, restored by copy. Verified independently.
6. `scripts/` and `tests/` excluded despite containing temp paths. Verified
   independently with named files in both directories.
7. ADR states the rule, names the inherited rule, quotes the reason, explains
   the plan directory versus repository root distinction. Verified against
   the primary source in `skills/fx-architecture/COVERAGE.md`.
8. ADR records reports become committed files. Verified, dedicated section.
9. `scripts/check-prose` passes on the ADR. Verified by running it.
10. `check-all` still exits 0 and does not gain this gate in this task.
    Verified the gate is absent from `scripts/check-all` by grep. Did not run
    `check-all` itself per the reviewing instructions (another process is
    running it against a shared fixture path right now).

All nine acceptance criteria are met. No criterion was missing, added beyond
scope, or misunderstood.

## Ruling C check

Ledger Ruling C states this task is expected to end with `check-artifacts`
red at 16, and that a reviewer reading a red gate as a failure, or a fix loop
trying to force it green early, would be the actual defect. Confirmed no
scanned file (`skills/`, `agents/`, `commands/`) was edited to reduce the
count: `git show --stat a7e7335` lists only the two new files, neither of
which is a scanned artifact whose content changed the count. The gate's
scope was not narrowed relative to the task's own specification (same three
directories, same six patterns, same file-extension breadth). Ruling C is
respected.
