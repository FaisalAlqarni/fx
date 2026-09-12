# fx ledger: plan: docs/plans/2026-09-12-fx-audit-followups/plan.md

## Setup

- Worktree `/development/fx/.worktrees/fx-audit-followups` on branch
  `fx-audit-followups`, from `main` at `be4cf7f`. The main checkout is a normal
  checkout, not a submodule. `.worktrees/` is ignored by `.gitignore:2`.
- The plan directory was untracked in the main checkout. It was moved into the
  worktree and committed as the branch's first commit, `26394fa`. No copy is left
  in the main checkout: `git status --porcelain` on that path printed nothing.
- `.fx/2026-09-12-fx-audit-followups/` created and confirmed ignored.
- `setup` from `.fx.json`: exit 0. Baseline `scripts/check-all`: exit 0, ALL GREEN,
  five gates passed, suites 80, 27, 13 and 17 passed, 0 failed.
- `.fx.json` has no `test_scope`, so every gate uses `test_all`, which is
  `scripts/check-all`. `stacks` is empty.

Ruling: the worktree is created with `git worktree add` from the main checkout, not
the harness's native worktree tool. Why: the native tool moves the whole session
into the worktree, and `fx-implement` requires the controller to create the
worktree without entering it; the fx-audit build did the same. Cost if wrong: a
worktree the harness does not list as its own, removed by hand later. Caught by the
user at integration, when the worktree is cleaned up.

## Pre-flight conflict scan

Every pair of tasks sharing a file or an interface:

| Tasks | Shared | Produces against consumes | Found |
|---|---|---|---|
| 02, 03, 07 | `skills/fx-audit/SKILL.md` | 02 edits Phase 4's report step and the Boundary bullet about the two reports; 03 edits the Boundary bullet about queue behaviour and Phase 4's soundness check; 07 edits Phase 2's worktree steps and its gate | Separate sections; serial writers, so no textual conflict |
| 01, 05, 07 | `scripts/check-all` | each adds one `run` line at a different point | No overlap |
| 04, 07 | `skills/fx-brainstorm/scripts/start-server.sh` | 04 removes the exclude-file block; 07 edits the usage comment, the `--slug` description and the no-slug message | No overlap |
| 01, 02 | `references/report-assets.md` | 01 produces it; 02 cites it | 02 is blocked by 01 |
| 02, 05 | the audit skill's citations | 05 rewrites every `../../references/` and `../../agents/` path in the generated command | Holds whether or not 02 has landed, since each cited file exists when cited |
| 03, 05 | `agents/fx-lens-pipeline.md` | 03 edits it; 05's generated audit command cites its generated opencode copy | The path exists in both states |
| 01, 03 | ADRs | 01 edits ADR 0015; 03 edits ADR 0014 | Separate files |
| 08 and 01, 04, 05, 07 | the four new test scripts | 08 names them in `README.md` | 08 is blocked by all four |
| 09 and every other task | the whole change | 09 exercises it live | 09 is blocked by 01 to 08 |

Every task against itself:

| Task | Tests specified against code specified | Found |
|---|---|---|
| 01 | the gate test calls `scripts/check-artifacts <root>`, which the interface defines; the vendored-code case needs the `references/vendor/` skip that step 3 specifies | Consistent. Step 13 stages the Mermaid file through a shell variable set in step 6 |
| 02 | RED expects `0`, `1`, `1` from three searches; read against the current skill: no `report-assets.md`, one "preformatted text or inline SVG", one "differ in what they fetch" | Consistent |
| 03 | RED expects `head-of-line` only in the ceding rules and no "no `Unread:` line"; read against the current lens and skill | Consistent |
| 04 | RED expects only the exclude-file check to fail; the other four cases hold before and after, since `.fx/.gitignore` is already written | Consistent |
| 05 | RED expects the installer to refuse the real `skills` folder and keep the whole-folder link; the test tolerates a failed install and still reports | Consistent |
| 06 | RED expects matches in eleven files, found by an earlier search of the plugin | Consistent |
| 07 | RED expects exit 0 for an explicitly named file under `.worktrees/`, matching today's exemption logic | Consistent |
| 08 | RED expects three zeros against today's version, heading and README | Consistent |
| 09 | a verification run with no code change | Consistent |

Nothing a task mandates is a defect under the review rubric.

Ruling: in task 01's commit step, the implementer stages the vendored Mermaid file by
its actual name rather than through `${MERMAID_VERSION}`, which does not survive
between separate shell commands. Why: the variable is set in step 6 and used in step
13. Cost if wrong: none; the name is the same. Caught by task 01's review, which sees
the committed file list.

Ruling: tasks run in numeric order, 01 to 09, one implementer at a time. Why: the
order respects every blocking edge, and implementers never run in parallel. Cost if
wrong: no parallel speed-up for independent tasks, which serial implementers forbid
anyway. Caught by nothing; it only affects wall-clock time.

Ruling: task 09's scratch directory is this job's own directory,
`/home/faisal/.claude/jobs/6d844eaa/tmp`, which the fx-audit build proved is outside
every git repository and is not the OS temp directory. Why: task 09 asks the
controller to name one. Cost if wrong: a probe inside a repository, which step 1's
check refuses before anything is built. Caught by task 09's own step 1.

Ledger committed `41259d3`.

## Task 01: dispatched

BASE `41259d3`. Implementer on the standard tier: multi-file integration from a
complete spec with written tests, per the model table. Launch confirmed; fix rounds
1 to 3 resume this same implementer. Its brief carries the rulings above plus four
things the task file cannot know: the two downloads are the one network use the user
approved; `<slug>` is `2026-09-12-fx-audit-followups`; `.fx.json` has no
`test_scope`, so `scripts/check-all` is the only pre-commit run; step 10's offline
render uses the local Chrome DevTools tools, and is left undone and reported if they
are unavailable. Report due at
`.fx/2026-09-12-fx-audit-followups/reports/01-offline-report-libraries-report.md`.
The only writer.

## Ruling: review cost scaled down, at the user's request

The user asked, mid-build, to skip the lenses these simple tasks do not need, to
finish faster and save quota.

Ruling: no lens is dispatched for any task in this plan. Each task keeps its one task
review, on the mid tier, because `fx-implement` never skips it. Scoped re-reviews of
fix rounds run on the cheapest tier. The final review is one broad whole-branch
reviewer on the top tier, not the full `fx-review` branch-mode fan-out of separate
passes and lenses. Task 09's live audit run stays, since the user approved it as a
seam. Why: the user's instruction; the tasks are documentation, script and
installer changes with written tests and explicit acceptance criteria. Cost if wrong:
a defect a lens would have caught, most plausibly in task 05's installer, which
deletes links in a user's configuration directory, or task 04's companion guarantees.
Caught by each task's reviewer, whose brief names those risks, and by the broad final
reviewer.

## Ruling: task 09 is dropped, at the user's request

The user said, mid-build: "drop task 09 too, we don't need it".

Ruling: task 09, the live four-phase audit run, is not dispatched. The plan's task
table still lists it, as the record of what was planned. Task 02's report step and
task 03's soundness check are verified by their own reviews only. Why: the user's
instruction. Cost if wrong: the audit's Phases 3 and 4, the lens and
`fx-architecture` dispatched by name, and the offline Phase 4 report stay unexercised
live, as they were after the fx-audit build. Caught by nothing in this build; the
completion report states it as not verified.

## Task 01: implementer reported DONE_WITH_CONCERNS, commit `8b0fef4`

Verified by the controller: the two library checksums match the table in
`references/report-assets.md`; no remote `<script src>` outside `references/vendor/`;
check-paths passes; no trailers in the commit. Concerns carried into the review: a
possibly stale "local temp file" line in `skills/fx-architecture/COVERAGE.md`, and the
Tailwind Play script's console warning.

Review package `.fx/2026-09-12-fx-audit-followups/review/41259d3..8b0fef4-scoped.diff`.

Ruling: the review package excludes the two vendored JavaScript files, which are
verified by checksum instead of read. Why: the full package is about 4MB, almost all
upstream minified code, which a reviewer cannot judge and which would crowd out the
30KB that matters. Cost if wrong: a vendored file altered after download. Caught by the
reviewer's own `sha256sum` against the reference table, which its brief requires.

Task 01 review dispatched: mid tier, no lens, per the scaling ruling. Findings due at
`docs/plans/2026-09-12-fx-audit-followups/findings/01-offline-report-libraries-findings.md`.

## Task 03: dispatched

BASE `3609a9b`. Implementer on the standard tier: the task gives the lens edits, the
check commands and the smoke-run scoring in full. Its two blind smoke runs are part of
the task's seam and run on the top tier as the task says; the brief allows exactly
those two read-only dispatches. Report due at
`.fx/2026-09-12-fx-audit-followups/reports/03-lens-file-set-mode-report.md`. The only
writer.

Ruling: task 03 runs before task 02. Why: task 02 cites `references/report-assets.md`,
which task 01's review may still change, while task 03 shares no file with task 01, and
its section of `skills/fx-audit/SKILL.md` is separate from task 02's (pre-flight table).
Implementers stay serial. Cost if wrong: none beyond order, since neither blocks the
other. Caught by task 02's review if an edit to the audit skill collides.

Ruling: the test scripts of tasks 01, 04 and 05 keep their `mktemp -d` scratch
directories in the OS temp directory. Why: the constraint covers what fx creates when it
runs; `scripts/check-artifacts` enforces it only over `skills`, `agents` and `commands`,
and the existing `tests/lane-triggering` scripts already use the temp directory. Task
04's no-`.git` case also needs a directory outside every repository, which a scratch
directory inside the worktree is not. Each test removes its directory on exit and writes
no HTML. Cost if wrong: test fixtures briefly in the temp directory, against the user's
wish. Caught by the final review, whose brief will name it.

Waiting on: task 03's implementer and task 01's review. Task 02 waits on that review
(ruling above). Tasks 04 to 08 wait on task 03, since implementers are serial.

## Task 01: review returned Needs fixes (0 Critical, 2 Important, 3 Minor)

Findings: `docs/plans/2026-09-12-fx-audit-followups/findings/01-offline-report-libraries-findings.md`.

Both Important findings reproduced by the controller in a scratch tree under the job
directory. The review's line numbers point into the diff file, not the script. In the
script, the remote rule scans `text.splitlines()` one line at a time
(`scripts/check-artifacts:97-98`), and `main` resolves `sys.argv[1]` without checking it
exists (`scripts/check-artifacts:125`).
- A `<script` tag whose `src="https://..."` sits on the next line: gate printed OK, exit 0.
- `scripts/check-artifacts <missing directory>`: gate printed both OK lines, exit 0.

Ruling: fix round 1 resumes task 01's implementer with both Important findings, each
proven RED by a new case in `tests/gates/check-artifacts-remote.sh` first, plus the Minor
stale "local temp file" line at `skills/fx-architecture/COVERAGE.md:133`, since that file
is in task 01's Files section and no other task owns it. The other two Minors (the
table's row wording, a redundant `as_posix()`) are not taken. Why: the gate is the one
guard that keeps remote scripts out, and a missing root reporting success is a false
pass. Cost if wrong: one extra round. Caught by the scoped re-review on the cheapest tier.

Ruling: the fix round is dispatched only after task 03's implementer reports. Why:
`scripts/check-all` runs `scripts/check-artifacts`, and editing the gate while task 03
runs the suite could turn its verification red for no reason of its own. Cost if
wrong: minutes of wait. Caught by nothing; order only.

Waiting on: task 03's implementer.

## Task 03: implementer reported BLOCKED, nothing committed

Its five files are ready in the working tree and both blind smoke runs passed, per its
report. `scripts/check-all` was red for one reason only: the prose gate failed three
dash lines in task 01's findings file, which the controller had placed in
`docs/plans/<slug>/findings/`, a directory the gate scans. The controller's placement,
not task 03's defect; confirmed with `scripts/check-prose` on that file.

Ruling: the controller replaced the three dash separators in that findings file with
`: `, changing no finding, and every later review and fix brief says its findings file
must pass `scripts/check-prose`. Why: the findings are a committed record, and a record
the gate rejects blocks every writer in the shared worktree. Cost if wrong: none to the
findings' content. Caught by `scripts/check-all`, which task 03's implementer re-runs
before committing.

Task 01: minor (deferred): `references/report-assets.md` table reads one row per library, with the licence file as a column, rather than one row per file on disk.
Task 01: minor (deferred): redundant `PurePosixPath(rel).as_posix()` in `remote_hits` in `scripts/check-artifacts`.

Task 03 was blocked a second time by the controller: the ruling above first quoted the
separator character itself, and the prose gate failed the ledger. Reworded; the
whole-repository prose gate then passed.

Ruling: the controller runs `python3 scripts/check-prose` on the ledger and every
findings file after each write, and writes nothing into the worktree while a writer is
running `scripts/check-all`. Why: two writer round trips were spent on controller
prose. Cost if wrong: another blocked round. Caught by `scripts/check-all`.

## Task 03: implementer reported DONE, commit `7f965bf`

Five files, as the task names: `agents/fx-lens-pipeline.md`, `tests/lens-pipeline/KEY.md`,
`tests/lens-pipeline/README.md`, `docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md`,
`skills/fx-audit/SKILL.md`. Both blind smoke runs passed, per its report. Review package
`.fx/2026-09-12-fx-audit-followups/review/3609a9b..7f965bf.diff`.

Task 03 review dispatched: mid tier, no lens. Findings due at
`.fx/2026-09-12-fx-audit-followups/findings/03-lens-file-set-mode-findings.md`.

Ruling: findings from here on are written under `.fx/<slug>/findings/`, not
`docs/plans/<slug>/findings/`. Why: a reviewer writing into the tracked tree while a
writer runs `scripts/check-all` can turn that run red, which is what blocked task 03
twice. Task 01's findings file stays where it is, committed. Cost if wrong: later
findings are not committed with the branch; the ledger records each verdict and the
findings it acted on. Caught by nothing; a record-keeping choice.

## Task 01: fix round 1 dispatched

Resumes task 01's implementer with the two Important findings verbatim and the
`COVERAGE.md:133` Minor. Covering test: `tests/gates/check-artifacts-remote.sh`. Fix base
`8b0fef4`, the head task 01's review saw; task 03's commit `7f965bf` sits between them
and is excluded from the re-review package by building it from the fix commits only.
The only writer.

Task 01: fix round 1/5 (implementer reports all three fixed, re-review pending; commits 491ab68..381cf68)

Verified by the controller: `381cf68` changes only `scripts/check-artifacts`,
`tests/gates/check-artifacts-remote.sh` and `skills/fx-architecture/COVERAGE.md`, has no
trailers, and in a scratch tree a split `<script` tag now exits 1 naming the tag's line,
and a missing root exits 1 with `FAIL: no such directory`. The fix report names the
covering test, the command, and RED and GREEN output for each finding. Re-review package
`.fx/2026-09-12-fx-audit-followups/review/491ab68..381cf68.diff`, the fix commit alone.
Re-review dispatched on the cheapest tier.

## Task 02: dispatched

BASE `381cf68`. Implementer on the standard tier. The fix round left
`references/report-assets.md` unchanged, which lifts the reason task 02 waited. The brief
tells it that task 03 has already edited the audit skill's queue Boundary bullet and
Phase 4 soundness check, and that task 09 is dropped, so its seam is its checks and its
review. Report due at
`.fx/2026-09-12-fx-audit-followups/reports/02-audit-report-libraries-report.md`. The only
writer.

## Task 03: review returned Needs fixes (0 Critical, 1 Important, 1 Minor)

Findings: `.fx/2026-09-12-fx-audit-followups/findings/03-lens-file-set-mode-findings.md`.
The review confirmed diff-mode text unchanged apart from `Given a diff,` qualifiers, the
six KEY rows hash-matching `d496d1e`, the Phase 4 soundness check failing a return with
no `Unread:` line, and both smoke runs given only the one-line prompt.

Important, checked by the controller against the files: task 03 restated the lens's
ceding rule (per-record query and enqueue inside a transaction to `fx-lens-database`,
swallowed error to `fx-lens-silent-failure`) in `skills/fx-audit/SKILL.md:54-56` and
`docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md:83-86`; the lens holds it at
`agents/fx-lens-pipeline.md:133-137`. The task's criteria 45 and 46 ask neither file for
it, so it is not plan-mandated.

Task 03: minor (deferred): the report's diff-run scoring collapses rows 1 to 5 into one line rather than one line per row.

Ruling: task 03 enters fix round 1, resuming its implementer after task 02's writer
commits. The fix removes the restated ceding sentence from both files, leaving each
pointing at the lens for what it cedes, and changes nothing else. Why: three copies of
one rule drift, and the fix loop does not adjudicate before the cap. Queued behind task
02 because both edit neighbouring Boundary bullets of the audit skill. Cost if wrong: one
small round. Caught by the scoped re-review.

Task 01: fix round 1/5 (3 addressed, 0 open; commits 491ab68..381cf68). Re-review:
`.fx/2026-09-12-fx-audit-followups/findings/01-offline-report-libraries-rereview-1.md`,
no new breakage; it probed a `<script` with no `src` followed by an `https://` link in text
and found no false hit.

Task 01: complete (commits `8b0fef4`, `381cf68`)

## Task 02: implementer reported DONE, commit `c8b47d8`

One file, `skills/fx-audit/SKILL.md`. Verified by the controller: the skill now names
`report-assets.md`, no longer says "preformatted text or inline SVG" or "differ in what
they fetch", and its commit message is clean. Review package
`.fx/2026-09-12-fx-audit-followups/review/9c8451a..c8b47d8.diff`, built from the ledger
commit just before it so the package holds only task 02's change. Review dispatched on
the mid tier, findings due at
`.fx/2026-09-12-fx-audit-followups/findings/02-audit-report-libraries-findings.md`.

Task 03: fix round 1 dispatched, resuming its implementer with the Important finding
verbatim. Fix base `c8b47d8`. Covering checks: the task's own searches on the lens, and
`python3 scripts/check-prose` on the two files. The only writer.
