# Task 03 review: move the architecture report

Base 3868025, head 660bef0. Commit `660bef0` touches exactly the five files
named in the task: `skills/fx-architecture/SKILL.md`,
`skills/fx-architecture/HTML-REPORT.md`, `skills/fx-architecture/COVERAGE.md`,
`skills/fx-review/reviewer-prompt.md`, `skills/fx-review/COVERAGE.md`. Nothing
else changed.

## Gate verification (run myself, not taken from the report)

```
python3 scripts/check-artifacts
3 line(s) exempted by `artifact-gate: ok`
FAIL: 8 line(s) across 4 file(s) name the OS temp directory
  skills/fx-brainstorm/scripts/stop-server.sh:6
  skills/fx-brainstorm/scripts/stop-server.sh:112
  skills/fx-brainstorm/scripts/stop-server.sh:113
  skills/fx-brainstorm/scripts/start-server.sh:10
  skills/fx-brainstorm/scripts/start-server.sh:123
  skills/fx-brainstorm/visual-companion.md:57
  skills/fx-brainstorm/visual-companion.md:293
  skills/fx-brainstorm/scripts/server.cjs:102
EXIT:1
```

Exactly 8 lines, all under `skills/fx-brainstorm/` (task 04's set), exactly 3
exempted. Matches the task's required end state and matches Ruling C: this
gate is meant to stay red here.

```
python3 scripts/check-paths
OK: 53 reference citations, all anchored and resolvable
EXIT:0
```

I did not run `check-prose` or `check-all`, per instruction, since
`check-prose` is being rewritten in a parallel round. The ledger's own entry
for this task ("Task 03: landed, verified, under review") independently ran
`check-all` before round 4 touched `check-prose` and recorded `TRUE exit=0`,
so acceptance criterion "`scripts/check-all` still exits 0" is corroborated by
the ledger rather than by me directly. Flagged below as unable to verify
first-hand under this review's constraint, not as a defect.

## Ruling C: did the count reach 8 honestly

Yes. The diff stat is five files, all in the task's own list, zero touches to
`scripts/check-artifacts` or to any file in `skills/fx-brainstorm/`. I traced
the gate's own pattern list (`/tmp`, `$TMPDIR`, `${TMPDIR`, `%TEMP%`,
`os.tmpdir`, `tmpdir`, from `scripts/check-artifacts:19`) against the pre-edit
text at the exact reported line numbers and confirmed each of the 16 starting
hits by hand. The 8 that remain after this task's edits are the 8 that were
never in this task's five files to begin with. The gate was not narrowed and
no file outside the task's list was touched to dodge a count.

## Are the three exemptions the right three

Yes, checked by opening what each marked line actually says, not by trusting
the label.

```
grep -rn "artifact-gate: ok" skills/
skills/fx-review/COVERAGE.md:75
skills/fx-architecture/COVERAGE.md:32
skills/fx-architecture/COVERAGE.md:124
```

- `fx-architecture/COVERAGE.md:32`: a table row recording what the upstream
  skill said about resolving a cross-platform temp path. The marker sits in
  the Note cell; the quoted Claim cell (backticked `$TMPDIR`, `%TEMP%`,
  `/tmp`) is byte-identical to the pre-edit text.
- `fx-architecture/COVERAGE.md:124`: a numbered summary line under "The six
  the hand-audit caught, all restored," recording the same upstream claim in
  prose form rather than a table. No separate cell exists here, so the marker
  is appended after the quoted phrase rather than inside it; the quoted words
  themselves (`%TEMP%`, `start`, "the timestamped filename", "cross-platform")
  are unchanged from the pre-edit text.
- `fx-review/COVERAGE.md:75`: a table row recording what the superpowers
  template's read-only-review paragraph said, including its example
  `git worktree add /tmp/review-<SHA>`. The marker sits in the Verdict cell;
  the quoted Content cell is byte-identical to the pre-edit text.

All three are records of what a prior source said, not live instructions
telling an agent where to write anything today. The live instructions are in
`SKILL.md`, `HTML-REPORT.md`, and `reviewer-prompt.md`, and none of those three
carry a marker, none of the three need one after the edit (verified: none of
their current text matches the gate's pattern list), and the gate confirms
this by finding zero hits in those three files. Diffing before and after
confirms the quoted text in all three marked lines was not rewritten, only
annotated, which is the one thing the task said not to do wrong.

## Acceptance criteria

1. `fx-architecture/SKILL.md` names `docs/plans/<slug>/report-<timestamp>.html`
   and no longer resolves a temp directory. Spec compliant.
   `SKILL.md:77-81` drops the `$TMPDIR` to `%TEMP%` to `/tmp` resolution chain
   entirely and states the new path.

2. `SKILL.md` says what happens with no active plan directory. Spec compliant.
   `SKILL.md:79-81`: "Invoked standalone, with no plan directory yet, create
   one: `docs/plans/YYYY-MM-DD-architecture-review/`, and write the report
   there under the same name."

3. The open-command table and the "print the absolute path regardless" rule
   survive unchanged. Spec compliant. The diff hunk for `SKILL.md` does not
   touch the table (`SKILL.md:86-91` in the current file); it is untouched
   line for line against BASE.

4. `HTML-REPORT.md` names the same path and its opening paragraph no longer
   claims the OS temp directory. Spec compliant. `HTML-REPORT.md:1-4` and the
   "Path and opening" block at `HTML-REPORT.md:23-25`.

5. `HTML-REPORT.md` still says the report is local and never published. Spec
   compliant. `HTML-REPORT.md:10`: "The file is local and stays local. Never
   publish it." Unchanged text, confirmed against BASE.

6. `fx-architecture/COVERAGE.md` gains a supersession row citing ADR 0015.
   Spec compliant. `COVERAGE.md:34`, placed directly beneath the three
   temp-directory rows as the task instructed, reading "Superseded locally by
   ADR-0015: the report now writes to `docs/plans/<slug>/report-<timestamp>.html`,
   never the OS temp directory."

7. The two quoted upstream lines in `fx-architecture/COVERAGE.md` keep their
   temp paths and carry the marker. Spec compliant, see the exemption section
   above.

8. `fx-review/reviewer-prompt.md` redirects the throwaway worktree to
   `.worktrees/review-<SHA>` and still forbids moving HEAD. Spec compliant.
   `reviewer-prompt.md:56-58`: "check it out into the ignored worktrees
   directory (`git worktree add .worktrees/review-[SHA] [SHA]`): never move
   HEAD here."

9. The quoted line in `fx-review/COVERAGE.md` carries the marker. Spec
   compliant, `COVERAGE.md:75`.

10. `check-artifacts` reports exactly 8 lines, all under `fx-brainstorm/`. Spec
    compliant, run myself, shown above.

⚠️ Cannot verify from this diff alone: "`scripts/check-all` still exits 0."
I was instructed not to run `check-all` or `check-prose` because a parallel
round is rewriting `check-prose`. The ledger records an independent run of
`check-all` for this exact commit, before that rewrite started, showing
`TRUE exit=0`. A controller re-check after round 4 of the `check-prose` work
lands is the right place to close this out, since `check-artifacts` is not
wired into `check-all` yet (that is task 04's job), so this task's own red
gate cannot be the cause of any future red `check-all`.

## The declared deviation

The implementer cited ADR 0015 as `ADR-0015`, plain text, rather than as an
anchored path. I confirmed the stated precedent myself: `SKILL.md:124` reads
"contradicts ADR-0007, but worth reopening," using the same bare, hyphenated
form with no path. I also confirmed `scripts/check-paths` only validates
backticked `references/...` citations (`check-paths:17-18`); it has no pattern
for `docs/adr/...` at all, so an anchored ADR link would not be validated by
any gate either. The citation in `COVERAGE.md:34` is consistent with how the
rest of the file cites ADRs.

## Strengths

- The report path convention is stated once in `SKILL.md` and once in
  `HTML-REPORT.md`, and the two statements agree on both the normal case and
  the no-plan-directory fallback, in the same wording pattern
  (`docs/plans/<slug>/report-<timestamp>.html` and
  `docs/plans/YYYY-MM-DD-architecture-review/report-<timestamp>.html`). An
  agent reading either file gets the same answer.
- The exemption markers were placed with real discipline: every one sits
  beside a quotation rather than inside it where a column exists (the two
  table rows), and the one place with no column (the numbered list line) still
  leaves the quoted phrase byte-for-byte untouched.
- The mirror search in the report is genuine work, not padding: it checked for
  a second live instance of both moved rules elsewhere in the repository
  (`git worktree add`, `architecture-review-<timestamp>.html`) and correctly
  distinguished a coverage quotation from a second live instruction that would
  have needed the same fix.
- Before and after gate counts were recorded and both match the ledger's
  independently reproduced numbers exactly.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

None. I did not find a defect that reaches the bar the ledger's Ruling C
describes (a count of 8 reached by touching a file outside this task's list,
or by narrowing the gate). Ruling C's cost-if-wrong condition is not present:
the diff is confined to the five named files, and the split between this task
and task 04 lines up exactly with what the ledger predicted.

### Minor (Nice to Have)

- `COVERAGE.md:124`'s marker sits appended directly onto a prose line with no
  separating punctuation before the closing content of the sentence
  ("cross-platform (artifact-gate: ok)"). It reads fine, but the table rows in
  the same file put the marker in a dedicated cell instead. Since this file
  mixes both formats (table rows and a numbered summary list) for what is
  conceptually the same record, a reader skimming for markers has to check two
  different visual positions. Not worth a fix round on its own; worth folding
  into task 04 if that task touches this file's format again.

## Assessment

**Task quality:** Approved

**Reasoning:** Every acceptance criterion is met and independently verified
against the working tree, not the report. The gate count of 8, the file of
4, and the exemption count of 3 all reproduce exactly, every remaining
violation sits in task 04's file set, and the diff touches no file outside
the task's own list, which is the specific failure Ruling C exists to catch.
The three exemption markers were checked individually and each sits on a
genuine quotation of prior text, with the quoted bytes unchanged in every
case. The one open item is the `check-all` exit code, which this review could
not run directly under its own constraint; the ledger already carries an
independent, pre-rewrite confirmation of green, so this is a follow-up for
the controller to close rather than a doubt about the task itself.
