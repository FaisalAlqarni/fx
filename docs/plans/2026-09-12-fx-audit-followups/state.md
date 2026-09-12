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
