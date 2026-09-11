# fx-audit: completion report

**Branch:** `fx-audit`, in the worktree `/development/fx/.worktrees/fx-audit`
**Base branch:** `main` at `8309b63`, which is also the merge-base
**Plan:** `docs/plans/2026-09-11-fx-audit/`, ledger `state.md`
**Decisions page:** `report-20260912-decisions.html` in this directory, a local
file with no external requests

This report is written for the user. The ledger holds the full record; every
claim here cites where it is recorded.

## Landed

All nine tasks are complete, each closed by a task review or a scoped
re-review.

| Task | What shipped | Closed by |
|---|---|---|
| 01 | `.fx.json` machine facts, `scripts/check-all`, `check-prose` fixes including the explicit quoting marker | review clean at round 5 of 5 |
| 02 | `scripts/check-artifacts` and ADR 0015 | review, fix round |
| 03 | `fx-architecture` and `fx-review` reports and review worktrees moved out of the OS temp directory | review clean, commits `3868025..660bef0` |
| 04 | the visual companion's mockups under `docs/plans/<slug>/companion/`, its session state under the ignored `.fx/`, fail-closed ignore guarantees | review, fix round 1 |
| 05 | `agents/fx-lens-pipeline.md`, narrowed to one hunt group and kept provisionally, with its fixture, key and measurement | round 5 of 5 |
| 06 | ADRs 0013 and 0014, one line on ADR 0008 | review, fix round 1 |
| 07 | `references/audit-template.md` | round 5 of 5 |
| 08 | `/fx:fx-audit`, a user-invoked skill at `skills/fx-audit/SKILL.md` | review, fix rounds 1 and 2 |
| 09 | `README.md` and `SURFACE.md` counts, tables and command names | review, recount round |

Test evidence per task is in its findings files under `findings/` and its
implementer report under `.fx/2026-09-11-fx-audit/reports/`. The lens
measurement is `measurement-task05.md`, with the two reports shown before the
user's decisions: `report-20260911-task05-lens-evidence.html` and
`report-20260911-task05-measurement.html`.

## Final review

Seven passes read the branch scoped to what ships: a broad reviewer, correctness,
spec, standards, an unprimed adversarial pass, and the security and silent-failure
lenses. Findings: the seven `findings/final-*.md` files, with what the build had
already deferred in `final-review-carried.md`. Every finding was checked at the
code before the fix wave.

**One fix wave**, Ruling AJ, took 23 items in five commits, `91084e6` to
`85de0ee`, none with a trailer. The most consequential:

- `check-prose` no longer reads other worktrees, which would have turned
  `check-all` red in the main checkout after merge.
- A reference read from a saved audit document is confirmed with the user and
  passed to git where the shell cannot expand it. A value holding `$(touch pwned)`
  created a file before the fix and does not after.
- The audit calls a system sound only when both of its checks ran and the lens
  read every file it needed.
- No phase document appears in the audit's directory until the phase is done.
- The companion's session key stays ignored even before `git init`, and a
  symbolic link anywhere in its state path is refused.
- Test fixtures no longer accumulate in `/tmp`, and review worktrees are confirmed
  ignored before they are created and removed after.

**The one scoped re-review** found all 23 addressed and no new Critical or Important
breakage, most of it by running the checks: `findings/final-fix-wave-rereview.md`.
Its Minor residuals are parked under Ruling AL.

## Exit gate

Run fresh after the re-review:

- `scripts/check-all`: **exit 0, ALL GREEN.** Manifest, 55 reference citations,
  reference leaves, prose and artifacts all pass; the four guard suites pass 80,
  27, 13 and 17 tests with none failing; the `/tmp` fixture count was the same
  before and after.
- `scripts/check-collisions`: **exit 1, expected under Ruling A.** It lists
  candidate skills in `~/.agents/skills`, outside this repository, that may contest
  fx lanes, including `postgres`, `tdd`, `to-spec`, `to-tickets`, `ui-ux-pro-max`,
  `wayfinder` and `writing-for-agents`. The script calls them candidates for
  judgment, not verdicts.
- There is no CI configuration to run, by ADR 0012.

## Deviations from `fx-implement`

Every step skipped, compressed or reordered, each with its reason.

- **Correctness in the final review ran without `/code-review`.** No skill of that
  name was in any listing available, and a guessed name is not invoked. A top-tier
  general reviewer stood in, the same substitution the task 05 measurement
  disclosed.
- **The coverage audit ran before tasks 08 and 09 finished.** It reads design and
  task files rather than code, so its findings could amend task 08 mid-run and
  task 09 before dispatch.
- **Task 08 was amended while running**, by message, with five coverage items and
  Ruling AC, instead of a later fix round that would have re-run its probes.
- **The final review's package excluded this plan's own record** under
  `docs/plans/`, about ten thousand lines, so reviewers read what ships. The
  design, ledger and carried list were passed to them separately.
- **Tasks ran concurrently once, wrongly.** Ruling M let two writers share one
  worktree; the shared git index raced, and Ruling N restored one writer at a
  time.
- **Task 05's written tests were replaced** by a pre-registered blind measurement,
  five runs per arm at the user's choice, after the original fixture proved to
  label its own answers (Rulings O, Q, R). The narrowed lens then got single smoke
  runs rather than a second measurement, as the user chose (Ruling U).
- **Fix rounds on tasks 05 and 07 reached the five-round limit**, and task 05's
  first four rounds were driven by rulings rather than by a task review.
- **Two task files were corrected before dispatch:** task 08's probes pointed at
  the main checkout and at `/var/tmp`; task 06's RED could not fail, because
  `check-prose` passes a missing path.
- **Task 08's Produces path changed** from `commands/fx-audit.md` to
  `skills/fx-audit/SKILL.md` (Ruling AF), and task 09 recounted after it.
- **The fix wave stalled** waiting for its own background probe, whose completion
  never reaches a subagent. I checked that the probe had finished and messaged it
  to continue; it did, and ran its resume probe in the foreground.
- **Ledger commits were batched** at moments no writer held the index.
- **My own errors, each corrected in place in the ledger with who caught it:** a
  dispatch recorded before its launch was confirmed; a claim that `README.md`
  already listed six gates; a claim that the design gave enqueue inside a
  transaction to the database lens (Ruling Z); the first reason given for Ruling
  AB; the precedent Ruling W cited from `fx-implement`; review worktrees said to be
  named in two skills; my first copy test for task 07, which never ran; and a
  round 4 brief for task 05 that left room for the block its review removed.

## Rulings I made

Every ruling in the ledger, in the order made, with what it costs if wrong.

- **A.** `check-all` excludes `check-collisions`, which is red on this machine for
  skills outside the repository. *Cost:* a real collision is not caught by
  `check-all`.
- **B.** Task 05's fixture is intentionally defective and not code under review.
  *Cost:* a reviewer fixes the thing being measured.
- **C.** Tasks 02 and 03 end with `check-artifacts` red by design. *Cost:* a red
  gate misread as a failed task.
- **D.** Task 09 also depends on tasks 02 and 04. *Cost:* none material.
- **E.** The `fx-setup.md` schema gap is real and not this plan's defect. *Cost:*
  nothing here depends on it; the user's own uncommitted edit is the fix.
- **F.** `test_one` becomes a file-level command, not null. *Cost:* a future cycle
  runs a command that selects the wrong thing.
- **G.** `setup` is not null either. *Cost:* a redundant fixture rebuild.
- **H.** A pre-existing gap in the guard suites stays out of scope. *Cost:* the
  suites prove less than their assertion count, as before this branch.
- **I.** A Minor promoted into the same fix round. *Cost:* none.
- **J.** A `check-prose` false positive, not reviewer error. *Cost:* a paragraph
  genuinely full of stock phrases stops being flagged.
- **K.** `check-prose` exempts `.fx/`. *Cost:* prose placed in `.fx/` escapes the
  gate; nothing authored lives there.
- **L.** An explicit quoting marker replaces inferred exemptions. *Cost:* an
  author who forgets it gets a false positive, never a silent pass.
- **M.** Tasks 05 and 07 run concurrently. *Cost:* stated as one confusing
  failure; it was wrong about the shared index.
- **N.** One writer at a time, correcting M. *Cost:* a slower build, which was the
  price of a correct index.
- **O.** The first control-versus-lens measurement did not mean what it claimed.
  *Cost:* a lens shipped on evidence nobody can rely on.
- **P.** Task 05 parked and the question taken to the user with evidence. A
  question, not a decision, so no cost of its own.
- **Q.** The user's decision on task 05: five blind runs per arm. Recorded.
- **R.** The fixture fails hygiene and is fixed before any run. *Cost:* one more
  writer round and a later measurement.
- **S.** A keyed mechanism named with no line counts for the control. It decided
  no verdict, per the measurement's third disclosure.
- **T.** Task 04 as written would have committed a session token; state splits
  from mockups. *Cost:* one more flag and a second directory.
- **U.** The user's decision on the measurement: ship the lens narrowed to one
  group, provisionally. Recorded.
- **V.** Stated targets are quoted into the audit and captured by the command.
  *Cost:* one template field and one input.
- **W.** The companion makes its state directory ignored through the local exclude
  file before writing the key. *Cost:* one line added to a local file the user did
  not ask to change. Its cited precedent is struck in place.
- **X.** The template states one layout and a zero count for stated targets.
  *Cost:* one more round for two sentences.
- **Y.** The worked example leaves the copyable skeleton. *Cost:* an example
  placed after the skeleton.
- **Z.** Task 05's last round: the ceded block removed, four Minors in, the
  `schema.sql` criterion restored. *Cost:* a lens stricter than its siblings.
- **AA.** In an audit, queue behaviour beyond unbounded enqueue has no dedicated
  pass. *Cost:* an audit that misses such a defect, stated rather than hidden.
- **AB.** A line saying a file adds no work to a queue is not a report on it.
  *Cost:* a future run misread as a pass or a failure.
- **AC.** The design contradicts itself on report assets; the user decides.
  *Cost:* a plainer audit report, or a shipped skill still loading two CDN scripts.
- **AD.** Documents state the command names that resolve; renaming is the user's
  call. *Cost:* longer typed names until renamed, or the README corrected twice.
- **AE.** All ten of task 08's Minors join its fix round. *Cost:* a larger round on
  one file.
- **AF.** The audit becomes a user-invoked skill, because only a skill can find its
  templates. *Cost:* the user wanted it under `commands/`.
- **AG.** opencode's view of the audit is the user's decision. *Cost:* an opencode
  install pays a per-turn load for the audit until decided.
- **AH.** Task 08's second round takes four Minors its first round introduced. A
  scope decision, whose cost is one more round on one file.
- **AI.** Phase 1's explorers write a file, a change the design did not make.
  *Cost:* an explorer with write tools edits code it was told only to read.
- **AJ.** The one fix wave takes 23 items; everything else is parked with its
  reason. *Cost:* an item left for the user that a fix would have closed.
- **AK.** The companion's older exclude-file step is parked, not rewritten, now that
  `.fx/.gitignore` covers it. *Cost:* a user with an unwritable `.git` is refused a
  start that was safe.
- **AL.** The fix wave's residuals are parked. *Cost:* each is a Minor gap a user
  may hit before a later change closes it.

## Parked

- Every deferred Minor from the build, and every final-review item the fix wave did
  not take, with its reason: `final-review-carried.md` and Ruling AJ's parked list.
- **Ruling AK:** the companion's exclude-file step, redundant beside `.fx/.gitignore`,
  can refuse a safe start when `.git` cannot be written.
- **Ruling AL, from the re-review, each Minor:**
  - `check-prose` given an explicit relative path containing `.worktrees/` skips
    the file.
  - The audit's soundness check does not say that a missing `Unread:` line fails
    it.
  - A reference worktree deleted by hand matches the reuse rule, and the Phase 2
    gate's plain `git worktree remove` fails when a stray file is left inside.
  - The review prompt's plain `git worktree remove` fails the same way, with no
    next step.
  - Phase 3's architecture report reaches the audit's directory before
    `03-gaps.md` is finished; with `--separate-git-dir` the audit's repository
    name is the git directory's parent; `start-server.sh` still says
    `<plan-slug>` in three comments; "draft" names both a directory and a Status.
- **Kept on purpose:** the ephemeral `.fx/2026-09-11-fx-audit/` holds the
  implementer reports and review packages the findings cite. It is deleted only
  after the user's decisions, since it is the evidence behind them.

## Skipped

No task is blocked or skipped.

## Needs you

These are laid out with their evidence in `report-20260912-decisions.html`.

1. **Report assets (Ruling AC).** May HTML reports load Tailwind and Mermaid from
   CDNs, as `design.md:285-287` decided, or must they make no third-party request,
   as the design's global constraint says? The audit's own report already fetches
   nothing; `fx-architecture`'s still loads two scripts.
2. **Command names (Ruling AD).** Every fx command resolves as `/fx:fx-<name>`.
   Rename the files so `/fx:<name>` resolves, as the README long promised, or keep
   the longer names every document now states?
3. **The audit as a skill, and opencode (Rulings AF and AG).** Keep the audit as a
   user-invoked skill, the only way it finds its templates on Claude Code? On
   opencode the installer gives it no typed command and the model may select it:
   change the installer, revert the skill, or accept it.
4. **Queue checks inside an audit (Ruling AA).** Add a dedicated pass for queue
   behaviour beyond unbounded enqueue, or accept the gap the audit states.
5. **The companion's exclude-file step (Ruling AK, coverage R2).** Remove it now that
   `.fx/.gitignore` covers it, which also stops the companion writing to the
   repository's local exclude file, or keep it.
6. **The plugin version.** Still 0.1.6. Installs are cached by version, so existing
   users get none of this branch until it is bumped.
7. **Leftover fixtures.** 66 `/tmp/fx-fixture-*` directories remain from runs
   before the fix, some possibly from other jobs. They can be removed with your
   say-so.

**Recorded so they are not mistaken for delivered:** design stories 18 to 22, and
the two ownership rules at `design.md:229-234`, are superseded by Ruling U. The
lens has never been dispatched by its name, and Phases 3 and 4 of the audit have
never run live.

## Findings outside this plan

- `scripts/check-prose` exits 0 on a missing path, reads no code files on a
  directory walk, reads no prose after a `markdown`-tagged fence closer, misreads
  a continuation line beginning with a number and a closing parenthesis, and lets
  a paragraph that names its quoting marker skip the stock-word check.
- `fx-design` and `fx-audit` are both undeclared in `.claude-plugin/plugin.json`;
  both load from the default directory.
- `fx-review`, `fx-implement` and `/fx:critique` name dispatched agents by bare
  name, where the plugin resolves them with the `fx:` prefix.
- The four older commands carry no `disable-model-invocation`, and
  `commands/fx-grill.md` cites a reference it has no way to locate.
- The global constraint that a description never summarises a workflow disagrees
  with `fx-authoring`'s one-line description for user-invoked entries.
- `~/.agents/skills` holds skills that contest fx lanes, which is why
  `check-collisions` is red.
- The git guard refuses a command that combines a search for trailer words with a
  commit.
- An observation only: the empty git object in `/development/fx/.git` is rewritten
  from outside the probes, which changes no ref or tracked content.

## What next

The work is on `fx-audit` in `/development/fx/.worktrees/fx-audit`. The base
branch `main` does not move until the user chooses:

1. Merge it into `main` locally
2. Push the branch and open a pull request
3. Leave it as it is, I will handle it
4. Discard it
