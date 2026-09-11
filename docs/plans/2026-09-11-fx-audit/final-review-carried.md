# Carried findings for the final review

Every item the build deferred to the final review or parked for the user,
gathered from `state.md` so the reviewers do not have to search a ledger of
several thousand lines. Each line cites where the ledger records it and its
ruling. The ledger is the source; where this file and the ledger disagree, the
ledger wins.

Triage each as **must fix before merge** or **confirmed deferred**, with a
one-line reason.

## Flagged by the controller to triage before merge

1. **Test fixtures accumulate in the OS temp directory.** `scripts/check-all:37`
   builds `/tmp/fx-fixture-check-all-$$` with no `trap` and no removal, and
   `.fx.json`'s `test_one` and `setup` do the same. 57 such directories existed
   when checked. Task 01 made the paths unique per process, which is what made
   them accumulate. Inside the design's scaffolding exemption, but a regression
   of this branch. `state.md`, "The fixture question answered by reading".
2. **Review worktrees get no ignore check and no removal.** Task 03 moved them to
   `.worktrees/review-<SHA>` at `skills/fx-review/reviewer-prompt.md:58`, the
   one place fx names one, while the audit skill carries both for its own
   worktree. Coverage audit item 8, `state.md`, "Coverage audit: 87 commitments".

## Deferred Minors, by task

**Task 03 and 04, the visual companion and reports** (`state.md`, task 04 entries
and Ruling W):

- The server sends no content security policy beyond `frame-ancestors 'none'`,
  so third-party requests are forbidden in the documentation only.
- `--slug` as the final argument hangs on a `shift 2`.
- The refusal message names one cause where there are two.
- The page footer reads "Superpowers vunknown".
- The stop script given the old single-directory path leaves a server running.
- `lib/plan-state.js` scans at most 20 plan directories (also coverage R1).
- Em dashes in shell and JavaScript files predate the branch and are unread by
  the prose gate.
- `skills/fx-brainstorm/scripts/start-server.sh:172` merges git's stderr into the
  answer, so a healthy repository with `GIT_TRACE` set is refused.
- `server-instance-id`, `events` and `server-stopped` are not checked one by one;
  a deliberate re-include rule can make them committable. None holds the key.
- An empty `.git` directory above a non-repository project refuses it.
- A refused start leaves the exclude line and an empty state directory.

**Task 05, the pipeline lens** (`state.md`, Ruling Z item 6 and "Task 05:
complete"):

- `skills/fx-review/SKILL.md`'s performance paragraph reads as an exhaustive
  coverage map after narrowing.
- The lens's triggers miss diffs that slow consumers.
- Its Critical tier fits most scheduled producers by default.
- `tests/lens-pipeline/README.md:50-52` and `KEY.md:40-41` state the regression
  signal in words that read two ways; Ruling AB and the measurement record's
  scoring rule settle it, and the README points at neither.
- The lens cedes per-record queries and enqueue inside a transaction to
  `fx-lens-database`, whose triggers do not fire on a worker-only diff.
- `skills/fx-implement/SKILL.md:450-451` keeps the pipeline lens out of per-task
  dispatch by a list of four names rather than by the Mode column
  (coverage item 3).

**Task 06, the ADRs:** the supersession note at
`docs/adr/0008-no-performance-lens.md:25-28` has no blank line before it and
renders inside the recommendation's paragraph.

**Task 07, the audit template:** the worked examples at
`references/audit-template.md:146-163` show the field as a bare label, unlike the
sibling count fields at `:123-129`.

**Task 08, the audit skill** (`state.md`, "Task 08: complete, fix round 2
closed"):

- At root scope the file set excludes only this audit's slug directory, so another
  audit's untracked documents under `docs/plans/` are still read.
- A slug directory created under round 1's naming rule is not found by round 2's.
- N1 is parked for the user under Ruling AG, below.

**Task 09, the inventory documents:** `SURFACE.md`'s Agents table "Lines" column
matches no fx file; `SURFACE.md:173`, `:248` and `:279` name `/fx:help`,
`/fx:stack` and `/fx:upgrade`, which do not exist; the cut `performance` lens is
still named.

## Parked for the user, not for the reviewers to decide

Reviewers may comment on consequence; the decision is the user's.

- **Ruling AA:** in an audit, queue behaviour beyond unbounded enqueue has no
  dedicated pass.
- **Ruling AC:** `design.md:285-287` lets reports load libraries from CDNs, and a
  global constraint forbids any third-party request.
  `skills/fx-architecture/HTML-REPORT.md:45-47` still loads two.
- **Ruling AD:** every fx command resolves as `/fx:fx-<name>`; renaming files so
  `/fx:<name>` resolves changes what the user types.
- **Rulings AF and AG:** the audit became a user-invoked skill so it can find its
  templates; on opencode the installer gives it no typed command and the model
  may select it.
- Nothing in `fx-authoring` points at ADR 0013 (coverage item 4).
- The four older commands carry no `disable-model-invocation`, and
  `commands/fx-grill.md` cites a reference it cannot locate, the defect Ruling AF
  fixed for the audit.

## Findings outside every task, for the completion report

- `scripts/check-prose` exits 0 on a path that does not exist, reads no shell,
  Python or JavaScript file on a directory walk, reads no prose after a
  `markdown`-tagged fence closer, and reports a false unclosed parenthesis when a
  wrapped list item's continuation line starts with a number followed by a
  closing parenthesis, which it appears to read as a list marker.
- `fx-design` and `fx-audit` are both undeclared in `.claude-plugin/plugin.json`;
  both load from the default directory.
- The global constraint that a description never summarises a workflow and
  `fx-authoring`'s user-invoked one-liner disagree for commands and user-invoked
  skills.
- The companion now writes the project's local exclude file and refuses to start
  in some repositories, which no story states (coverage R2).
- Design stories 18 to 22, and the two ownership rules at `design.md:229-234`, are
  superseded by Ruling U rather than delivered.
- The git guard refuses a command that combines a trailer-word search with a
  commit.
- `~/.agents/skills` holds skills that contest fx lanes; `check-collisions` is red
  for that reason (Ruling A).
- Earlier rulings recorded pre-existing defects outside this plan: Ruling E, the
  `fx-setup` schema gap, and Ruling H.

## Never observed

- `fx-lens-pipeline` dispatched by its name.
- `--max-turns` enforcement in a nested session.
- The "Base directory for this skill" line in any log; its delivery is consistent
  with the evidence, not proven.
- Whether `disable-model-invocation` keeps the audit out of the model's listing.
- Phases 3 and 4 of the audit, live.
- Anything on opencode.
