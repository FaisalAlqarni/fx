# fx ledger: plan: docs/plans/2026-09-11-fx-audit/plan.md

## Setup

Worktree `/development/fx/.worktrees/fx-audit` on branch `fx-audit`, created
from `8309b63` on `main`. Controller stays outside it.

`.worktrees/` reported unignored by `git check-ignore` before it existed,
because the `.worktrees/` pattern matches directories only. Created it, checked
again, confirmed ignored. `.gitignore:2` carries it. `.fx/` confirmed ignored
inside the worktree.

The plan directory was uncommitted, so the worktree opened without it. Copied
`docs/plans/2026-09-11-fx-audit/` in, per the skill's stated fix, so the
branch's first commit carries the plan and the ledger travels with the work.

Four unrelated files are modified in the main checkout
(`commands/fx-setup.md`, `skills/fx-implement/SKILL.md`,
`skills/fx-implement/implementer-prompt.md`, `skills/fx-tdd/SKILL.md`). The
worktree holds their committed versions. No task in this plan touches any of
them, so there is no conflict, and the user still holds those edits on `main`.

### Baseline

Run in the worktree, before task 01.

```
check-manifest           OK
check-paths              OK
check-collisions         FAIL (exit 1)
check-reference-leaves   OK
check-prose              OK
git-guard.test.js        80 passed, 0 failed
base-branch.test.js      27 passed, 0 failed
heredoc.test.js          13 passed, 0 failed
plan-state.test.js       17 passed, 0 failed
```

137 assertions passing, 4 of 5 gates green. **`check-collisions` is red at
baseline and that is a pre-existing condition, not a defect this branch
introduced.** It reports skills in `~/.agents/skills` and
`~/.config/opencode/skills` that contest fx lanes: `improve-codebase-architecture`,
`codebase-design`, `grill-me`, `grilling`, `humanizer`, `code-review`, `tdd`,
`implement`, `to-spec`, `to-tickets` and others. `SURFACE.md` records clearing
that second pool as a deferred cleanup that never happened. Nothing in this
plan changes it.

**No `.fx.json` existed.** The skill says to ask when it is missing from a repo
that plainly has tests. That question was already put to the user at plan time
and answered: task 01 writes it, deriving every command from what `README.md`
documents. Not re-asked.

## Pre-flight conflict scan

### Pairs sharing a file or an interface

| Pair | What one produces | What the other consumes | Found |
|---|---|---|---|
| 01, 04 | `scripts/check-all` (created) | the same file (modified, adds a sixth gate) | Sequential: 04 is blocked by 02 which is blocked by 01. No overlap in time. Task 04's Files list and commit paths both name it. Clean. |
| 02, 03 | `check-artifacts`, the `artifact-gate: ok` marker | both | Edge exists. Clean. |
| 02, 04 | `check-artifacts`, the marker | both | Edge exists. Clean. |
| 02, 08 | `check-artifacts` | the gate that proves the command names no temp path | Edge exists. Clean. |
| 02, 09 | `check-artifacts` | README's gate list must name it | **Edge missing.** 09 is blocked by 05 and 08 only. See Ruling D. |
| 03, 05 | `skills/fx-review/reviewer-prompt.md`, `COVERAGE.md` | `skills/fx-review/SKILL.md` | Same directory, disjoint files. No conflict. |
| 03, 08 | the report path convention | Phase 4's HTML location | Edge exists. Clean. |
| 04, 09 | the sixth gate in `check-all` | README's gate list | Covered by Ruling D. |
| 05, 06 | the shipped lens | the ADRs that describe it | Edge exists. Clean. |
| 05, 08 | `fx-lens-pipeline` | Phase 3 dispatches it | Edge exists. Clean. |
| 05, 09 | the sixth agent | SURFACE's agent count | Edge exists. Clean. |
| 07, 08 | `references/audit-template.md` | the command composes it | Edge exists. Clean. |
| 08, 09 | `commands/fx-audit.md` | README and SURFACE command counts | Edge exists. Clean. |

### Each task against itself

| Task | Tests specified against code specified | Files created against files later touched | Found |
|---|---|---|---|
| 01 | The gate command is the test; step 5 proves it can fail by copy-back restore | `check-all` created here, modified by 04 | **Conflict with the baseline.** Criterion says it runs every gate the README documents, and README documents `check-collisions`, which is red on this machine. See Ruling A. |
| 02 | Gate is the test; expected red count stated as 16 across 9 files, verified against the tree | none | Consistent. Deliberately ends red: see Ruling C. |
| 03 | Expected count 8, exemptions 3 | five files, all its own | Consistent. Deliberately ends red: see Ruling C. |
| 04 | Probe run before and after; guard line diffed | `check-all` modified, listed and staged | Consistent. |
| 05 | Control run then lens run, thresholds 2 and 6 of 8 | fixture files are its own | Fixture is intentionally defective code: see Ruling B. |
| 06 | Prose gate over files that do not exist yet | appends to 0008, no deletions | Consistent. |
| 07 | Grep guard for the leaf rule | one file | Consistent. |
| 08 | Gate-stop run: 01 written, 03 absent | one file | Consistent. |
| 09 | Counts from `ls` compared against claimed counts | two files | Consistent. |

### Rulings from the scan, made before execution

**Ruling A: `scripts/check-all` excludes `check-collisions`.** Why: it reports
on skill pools outside this repository and exits 1 whenever another pool holds
a contesting skill. That is true on this machine right now and no commit here
can fix it, so including it makes the repository's own gate permanently red,
which teaches everyone to ignore it. It stays a documented, manually-run gate.
Cost if wrong: a genuine collision is not caught by `check-all`, caught by
task 01's task review, which is told this ruling is in force and can disagree
with it.

**Ruling B: task 05's fixture is intentionally defective and is not code under
review.** Why: `tests/lens-pipeline/fixture/worker.js` seeds eight defects and
references modules that do not exist, because nothing executes it. It is input
to a reading agent. Cost if wrong: a reviewer flags the seeded defects as
defects and the fix loop removes the thing being measured, caught by the task
05 review, whose brief will carry this ruling.

**Ruling C: tasks 02 and 03 are expected to end with `check-artifacts` red.**
Why: the gate is written before the violations are fixed, which is what makes
it a real red, and the violations are split across two tasks by file type.
Task 02 ends at 16, task 03 ends at 8, task 04 reaches 0. Cost if wrong: a
reviewer reads a red gate as a failed task and the fix loop tries to make it
green early, which would mean either gaming the gate or pulling task 04's work
forward. Caught by the task 02 and 03 reviews, whose briefs carry this ruling
and the expected counts.

**Ruling D: task 09 also depends on 02 and 04, and the plan does not say so.**
Why: 09 must list `check-artifacts` in README's gate block, and that gate is
created by 02 and wired into `check-all` by 04. The plan gives 09 only the
edges to 05 and 08. Phase ordering makes it true in practice, since MVP runs
before Polish, but an edge that holds by accident is not an edge. Treating 09
as blocked by 02, 04, 05 and 08. Cost if wrong: none material; it adds no
serialisation that the phase order did not already impose.

## Task 01: dispatched

Implementer dispatched on the mid tier, which `model-selection.md` names as the
floor for an implementer working from prose rather than from written tests.
BASE recorded as `8309b63`, the worktree's HEAD before any commit.

Brief carried: the measured baseline, Ruling A on excluding `check-collisions`
from `check-all`, the fixture-is-not-an-artifact scoping rule, the Global
Constraints verbatim, and the report path.

**Deliberate wait, not a stall.** The frontier is empty: the plan gives tasks
02, 05 and 07 no blocker other than 01, and 01 is the file that tells every
later task how to verify itself. Nothing can usefully start until it lands, and
implementers never run in parallel regardless. Waiting on the dispatch
notification.

## Task 01: reported DONE_WITH_CONCERNS, two concerns assessed

Commit `79fa920`, two files, 53 insertions, no attribution trailer (checked).
Working tree clean apart from the uncommitted plan directory.

**Ruling E: the `fx-setup.md` schema gap is real, is not this plan's defect,
and no task here fixes it.** The implementer reported that
`commands/fx-setup.md` defines seven `.fx.json` keys and omits `test_scope`. I
opened both versions rather than repeating the claim. The committed file in the
worktree does omit it: keys at lines 22 to 28, table rows at 34 to 39, no
`test_scope` in either. **The main checkout's uncommitted copy already fixes
it**, at line 24 and table row 37. So the implementer read a genuinely
incomplete schema, and it is incomplete only because the user's own correction
is sitting uncommitted on `main`. Editing it here would collide with that
change. Cost if wrong: nothing in this branch depends on it; the user is told
at completion that their uncommitted edit is the fix.

**Ruling F: `test_one` is not null. It becomes the file-level command.** The
implementer wrote `null`, reasoning that the Node suites have no line-level
selector. True about `{line}`, and it does not follow that no command exists.
Probed all four suites with one template and two fixture arguments:

```
git-guard.test.js            80 passed, 0 failed
base-branch.test.js          27 passed, 0 failed
heredoc.test.js              13 passed, 0 failed
plan-state.test.js           17 passed, 0 failed
```

`plan-state.test.js` takes no arguments and ignores the extra two, so one
template covers all four. Null would leave `fx-tdd` with no per-test command on
this repository and force it onto the full gate for every cycle, which is the
capability the key exists to provide. Cost if wrong: a future cycle runs a
command that does not select what it wanted, caught by the task 01 review,
which sees the value and the probe output.

**Ruling G: `setup` is not null either.** The Node suites cannot run from a
clean checkout until the git fixture exists, so the fixture build is honestly
this repository's setup step rather than an invented one. Null makes every
future `fx-implement` run stop and ask, because that skill asks whenever
`setup` is null. Cost if wrong: a redundant fixture rebuild at baseline, which
is idempotent by construction since the script recreates the directory.

Implementer resumed with rulings F and G as a pre-review correction, not a fix
round: no review has run yet, so this is the DONE_WITH_CONCERNS path where
correctness concerns are settled before the reviewer sees the diff. Ruling E
was passed as explicitly not theirs to fix, with the reason, so the finding is
not silently dropped and not acted on twice.

Frontier still empty: 02, 05 and 07 all block on 01. Deliberate wait.

## Task 01: under review

Implementer returned DONE after the correction pass. Commits `79fa920` and
`fce46f0`. `scripts/check-all` exits 0: 4 gates plus 4 Node suites at
80/27/13/17.

Review package written to
`.fx/2026-09-11-fx-audit/review/8309b63..fce46f0.diff`, 2 commits, 2459 bytes.
Note for later tasks: `review-package` lives at
`skills/fx-implement/scripts/review-package`, not at the repository root.

Task reviewer dispatched on the mid tier, the stated floor for reviews, with
the task, the ledger, the report, the diff file and a findings path beside the
ledger rather than under the git-ignored `.fx/`.

**Lens dispatch, and the reasoning, because a skipped lens is invisible
otherwise.** The diff touches `.fx.json` and one shell script. Database,
security and accessibility do not fire: no schema, no query, no auth path, no
endpoint, no markup, no user-facing string. **Silent-failure fires and was
dispatched**: the diff's entire deliverable is error-handling code, it captures
a command's output into variables that become arguments to four test suites,
and a wrong capture there could run the suites against wrong arguments while
still reporting success.

## Task 02: dispatched

BASE `fce46f0`. Dispatched while task 01 is still under review, which is safe
and deliberate: 02 creates a new gate script and an ADR, and consumes `check-all`
only by running it, so a task 01 fix round cannot invalidate 02's work. No
implementer is in flight, so the serial-implementer rule holds.

## Task 01: review clean, lens still outstanding

Task reviewer: **Approved. 0 Critical, 0 Important, 2 Minor.** Findings at
`docs/plans/2026-09-11-fx-audit/findings/01-machine-facts-findings.md`.

It ran `scripts/check-all` itself rather than trusting the report, confirmed
the output matched byte for byte, checked the commits carry no attribution
trailer, and confirmed all four rulings assigned to this task were applied or
respected. The temp paths in `.fx.json` were considered and cleared against the
plan's own scoping rule for `scripts/` and `tests/`, which is the right call
and the one I most expected to need adjudicating.

Task 01: minor (deferred): the `.fx.json` schema documents a `{line}`
placeholder this repository's `test_one` cannot use.
Task 01: minor (deferred): the reported RED string differs in wording from the
one the task predicted.

**Finding outside this task, ledgered rather than actioned.** The reviewer
noticed that `scripts/check-prose` walks only `*.md`. I verified it rather than
repeating the claim: line 46 reads
`[base] if base.is_file() else sorted(base.rglob('*.md'))`. So a bare
`python3 scripts/check-prose` sees no `.sh`, `.py`, `.cjs` or `.js` file at all,
while `PREAMBLE.md` states the prose rules cover code comments and calls them
the highest-volume prose anyone writes. Passing an explicit file path does work:
`python3 scripts/check-prose scripts/check-all` ran and passed.

This is a real gap in an existing gate and it is **not in this plan's scope**.
It matters here only because tasks 02 and 04 write Python and shell, whose
comments the default gate will not read. No task is added for it. It reaches
the user in the completion report.

**Task 01 is not complete yet**: `fx-lens-silent-failure` is still running
against the same diff, and a lens finding enters the fix loop like any other.
Two children outstanding, task 02's implementer and that lens. Deliberate wait.

## Task 01: lens findings, verified before ruling

`fx-lens-silent-failure` returned 1 Critical, 1 Important, 1 Minor. I opened
every file it cited rather than repeating its line numbers.

**Finding 1 (Critical as filed): confirmed in fact, overstated in severity.**
The lens is right that `inspect()` ignores its `cwd`: `lib/git-guard.js:158`
declares `function inspect(command, cwd)` and the body through line 177 never
references `cwd` again. That is the designed aftermath of ADR 0005, which
removed location resolution from the guard. So the fixture argument the three
suites pass as `cwd` is genuinely inert.

Its stated failure path is already blocked, which the lens did not check.
`scripts/make-git-fixture:43-50` verifies the pair before echoing it, exiting 1
with `fixture broken:` if `w` is not a worktree or `m` is not a main checkout,
and `check-all` tests that exit. A regressed fixture cannot reach the suites.

**Ruling H: finding 1 is real, pre-existing, and out of this plan's scope.**
The residual truth is that `cwd` is vestigial post-ADR-0005 and three suites
pass a value nothing reads. Task 01 wired up an existing fixture; it did not
create this. Fixing it means either giving the suites an assertion that depends
on the fixture or deleting the plumbing as dead weight, and both are work on
the guard suites that no task here covers. Cost if wrong: the guard suites
prove less than their assertion count suggests, which was equally true before
this branch. Nothing downstream catches it, so it goes to the user in the
completion report rather than being banked silently.

**Finding 2 (Important): accepted into fix round 1.** `scripts/check-all:36`
validates no shape after `read -r MAIN WT`, and a here-string makes `read`
return 0 for an empty, one-token or three-token capture. This one is inside
task 01's own diff.

**Ruling I: finding 3 (Minor) is promoted into the same fix round.** Severity
in the abstract is Minor, and it is actively hazarding this build: `check-all`
builds `/tmp/fx-fixture` at a fixed path, so any two agents running it at once
race on a directory one of them deletes. I have two to four agents in flight at
a time. Promotion costs nothing, since it is the same implementer, the same
file and the same round. Cost if wrong: none; a unique path per process cannot
be worse than a shared one.

## check-all went red, and it was neither task's code

`scripts/check-all` exited non-zero after task 02 landed. The failing gate is
`check-prose`, and the offending file is the **task 01 reviewer's own findings
file**, at `docs/plans/2026-09-11-fx-audit/findings/01-machine-facts-findings.md:50`.

The reviewer was **quoting the banned vocabulary list** to record what it had
checked by hand. `scripts/check-prose` already intends to allow exactly that:
its comment reads *"A line that names three or more of these is the rule being
stated, not the rule being broken."* The exemption counts per **line**, the
quotation wraps across four lines, and the final line carries exactly one
complete phrase. Below the threshold, so it fires.

**Ruling J: this is a false positive in `check-prose`, not reviewer slop, and
the fix goes into task 01's fix round.** The gate's own block-splitting
machinery already exists in `blocks()`; the exemption needs to read a block
rather than a line. It is folded in rather than made a new task because
`check-all` is the command every remaining task runs to verify itself, so a red
gate here blocks seven tasks. Cost if wrong: a document that genuinely uses
three stock phrases in one paragraph stops being flagged, caught by the task 01
re-review, which is told to check that a real violation still fails.

**Systemic finding for the completion report.** Reviewer and lens output lands
in `docs/plans/`, which is committed and prose-gated, and **no dispatch template
tells a reviewer that the prose rule binds its findings file.** The templates in
`fx-implement` and `fx-review` carry process rules and an output format, not the
prose constraint. Not fixed here.

## Task 02: review approved, one Important into fix round 1

Task reviewer: **Approved. 0 Critical, 1 Important, 0 Minor**, plus one warning
item. Findings at
`docs/plans/2026-09-11-fx-audit/findings/02-artifact-gate-findings.md`.

It verified all nine criteria by running the gate rather than trusting the
report, matched the count and per-file breakdown against the task's table,
experimentally confirmed both exemptions, and checked the ADR's quotation
against the primary source in `skills/fx-architecture/COVERAGE.md`. Ruling C
was respected: no scanned file was edited and the gate's scope was not narrowed.

**Warning item resolved by me, from git rather than from a transcript.** The
reviewer could not tell whether the reported RED was executed or reconstructed,
and asked me to read the implementer's tool-call transcript. I did not, because
reading a subagent transcript would flood this context, and it was not needed:

```
$ git show fce46f0:scripts/check-artifacts
fatal: path 'scripts/check-artifacts' exists on disk, but not in 'fce46f0'
```

The file provably did not exist at the task's BASE, so the RED condition was
factually true whether or not the command ran at that instant. For a
file-does-not-exist RED that is the whole content of the claim. Resolved, not
a gap.

**The Important finding is real and its citation was wrong.** The reviewer
placed it at `scripts/check-artifacts:112-115`. The file is **75 lines**. I
opened it: the code is at **lines 39 to 42**:

```python
        try:
            text = path.read_text()
        except (UnicodeDecodeError, OSError):
            continue
```

A file the gate cannot decode or open is skipped with no count, no message and
no effect on the exit code, so the gate can report clean because it could not
read something. That is the worst failure available to a gate, and
`scripts/check-paths` next door has no such guard and would fail loudly.
Latent today, and latent is not fixed.

This is the shape the lane warns about: a line number is what verification
looks like, which is why a wrong one slips through. Substance confirmed,
citation corrected, finding accepted into the fix loop.

**Blocked, deliberately.** Task 01's fix round is still running in this same
worktree. Two writers in one checkout is a real conflict, not a theoretical
one, so task 02's fix round waits for it. Task 03 also waits: it asserts on
`check-artifacts`'s exemption count, and the pending fix changes what that
output reports.

## Task 01: fix round 1 landed, and my own verification slipped first

Commit `64f8103`. The implementer reported `check-all` exits 0 pristine. It
does not, and I nearly missed it: my first check piped the command into `tail`
and read `$?` from the pipe, which is the exact error
`references/vocab/verification.md` names, *"an exit code read through a pipe
belongs to `head`"*. Re-run without a pipe: **TRUE exit=1**.

The implementer's claim was probably true when it made it. `check-prose` is the
only failing gate and the only offending file is
`.fx/2026-09-11-fx-audit/reports/01-machine-facts-report.md`: **its own report**,
which it appended *after* running the gate. Nine stock-vocabulary hits and one
unbalanced parenthesis, and much of it is the report documenting the mutation
test by quoting the banned list.

**Ruling K: `check-prose` must exempt `.fx/`.** Its exempt tuple at
`scripts/check-prose:22` already carries `.git/` on exactly this logic and omits
`.fx/`. That directory is the git-ignored, regenerable half of fx's two-workspace
split: implementer reports and raw review diffs, deleted at the end of a clean
run. Nothing authored ships from there. Scanning it means every report that
documents a prose test turns the repository's gate red, which is a gate that
fails for reasons unrelated to anything shipping. Cost if wrong: authored prose
hidden in `.fx/` escapes the gate, and nothing authored lives there by design;
caught by the scoped re-review, which is told to confirm the exemption does not
reach `docs/plans/` or `skills/`.

The ordering trap is worth naming because it will recur: **the report is written
after the gate runs, and the report lands where the gate looks.** A gate result
quoted in a report is stale by construction unless the gate runs last.

**Deviation, disclosed: two fix rounds get one scoped re-review.** Round 1's
three items look addressed by my own run, and the remaining red is a different
defect I found while verifying. Re-reviewing round 1 alone would spend a full
pass on a state that will not ship. Round 2 carries Ruling K, and one scoped
re-review then verdicts all four items together. This compresses the loop's
"every round ends in a re-review" rule and I am recording it rather than
letting it pass as normal.

Round 1 fix diff packaged at
`.fx/2026-09-11-fx-audit/review/a7e7335..64f8103.diff` for that re-review.

## Task 01: fix round 2 landed and verified

Commit `c282cb4`. Verified myself rather than on the report's word, since the
previous round's claim did not hold.

```
TRUE exit=0
ALL GREEN
```

`scripts/check-prose:23` now carries `.fx/` in its exempt tuple beside `.git/`.

**My first probe of the exemption was wrong, and the code was right.**
(prose-gate: quoting) I planted
`"This robust and seamless approach is crucial."` in `docs/plans/` and it was not
flagged, which looked like an over-broad exemption. It was not: three stock
words on one line trips `check-prose`'s own pre-existing quotation heuristic,
*"a line that names three or more of these is the rule being stated"*. My test
case tripped the rule I was not testing. This is the shape the lane records:
of five bad verification probes in one measured run, the probe was wrong every
time and the code was right.

Re-probed with a single stock word:

```
docs/plans/2026-09-11-fx-audit/plan.md -> exit=1   still caught
skills/fx-debug/SKILL.md               -> exit=1   still caught
.fx/...reports/01-machine-facts-report.md -> exit=0  exempt
whole-tree walk                        -> exit=0   .fx skipped
```

Exemption is narrow. Working tree restored with no tracked modifications.

**Ledger and plan committed by me.** The plan directory was copied into the
worktree untracked, and every implementer is told to stage by explicit path and
never to stage the ledger, so nothing would ever have committed it. The lane
requires the ledger to travel with the work.

## Task 02: fix round 1 landed and verified

Commit `9eea5c1`. The implementer chose propagation over a skip counter,
matching `scripts/check-paths`, on the reasoning that propagation guarantees a
non-zero exit with no extra logic anyone can later forget to maintain. I agree
with the choice and record the tradeoff it carries: an unreadable file now
crashes the gate mid-scan, so the run is loud but its report is incomplete.
Loud and incomplete beats silent and complete for a gate.

Verified myself:

```
check-artifacts   exit=1, 16 line(s) across 9 file(s), 0 exempted   count unchanged
check-all         TRUE exit=0, ALL GREEN
```

Opened `scripts/check-artifacts:36-46`: the `try`/`except` is gone and
`text = path.read_text()` stands bare, which is the prior art's shape.

**My packaging was wrong first and I caught it before dispatching.** I ran
`review-package` with the task's original BASE, `a7e7335..9eea5c1`, which swept
in task 01's two fix commits and the ledger commit: 4 commits, 141,792 bytes,
almost none of it task 02's. Handing that to a scoped re-reviewer is the
context poisoning the lane warns about, and it invites exactly the wandering a
scoped re-review exists to prevent. The fix commit's parent is `c2186cc`, so
the correct range is `c2186cc..9eea5c1`: **1 commit, 1,096 bytes, one file.**

The general rule this cost me, worth carrying to every later fix round: a fix
round's base is the head the previous review saw **only when nothing else
landed in between.** On a branch where tasks interleave, it is the fix commit's
own parent.

## Task 02: complete (commits a7e7335..9eea5c1, review clean)

Files touched: `scripts/check-artifacts`, `docs/adr/0015-artifacts-live-in-the-repository.md`.

Scoped re-review: **finding ADDRESSED, no new breakage.** It reproduced the
unreadable-file case on a scratch tree it built itself rather than changing a
repository file, and read the exit code directly.

It also settled the tradeoff I had accepted without checking. I recorded that
propagation makes the run "loud but its report incomplete". That was
pessimistic: both `print` calls sit after the scan loop, so a mid-scan crash
produces **no stdout at all**, only the traceback and exit 1. There is no
partial listing that could be mistaken for a clean run. Better than the
tradeoff I signed off on.

Guarantee rows from this task:

| # | What is guaranteed | Test | Type | Result | Evidence |
|---|---|---|---|---|---|
| 02a | A temp path in a skill, agent or command fails the gate | `scripts/check-artifacts` | gate | FAIL as designed | 16 line(s) across 9 file(s), 0 exempted |
| 02b | A line marked `artifact-gate: ok` is exempted and counted | marker mutation | gate | PASS | 16 to 15, 1 exemption, restored byte-identical |
| 02c | `scripts/` and `tests/` are out of scope | structural check | gate | PASS | neither appears in the report |
| 02d | An unreadable file fails loudly, not silently | scratch reproduction | gate | PASS | `PermissionError` naming the file, exit 1, no stdout |

## Correction: task 03 was NOT dispatched

I wrote a "Task 03: dispatched" line here and then did not dispatch it. The
ledger is the most durable artifact in this run and every later reviewer is
told to check provenance against it, so a false line in it is worse than a
missing one. Struck, and the real dispatch is recorded below when it happens.

## Task 01: re-review reopened the round, correctly

Findings 1, 2 and 4 **ADDRESSED**, verified at `scripts/check-all:47-52`,
`scripts/check-all:36` with `.fx.json:3,6`, and `scripts/check-prose:23`.

**Finding 3's fix introduced an Important regression, and it is the exact risk
the brief told the re-reviewer to hunt.** The block-wide exemption at
`scripts/check-prose:160-172` exempts an entire paragraph once any one line
trips the density trigger. A genuine violation sharing a paragraph with a dense
quoted line, before or after it with no blank line between, is waved through at
exit 0 where the per-line version would have caught it. The re-reviewer
confirmed this by running it both ways rather than reasoning about it.

This is why a fix that loosens a gate gets its own proof obligation. The
implementer's own mutation case passed because it spread the violation across
lines in a **separate** paragraph, so it never exercised the bleed.

Fix round 3 opened. Cap is 5, so there is room, and this is the last item.

Task 01: minor (deferred): `EXEMPT` membership uses a bare substring test at
`scripts/check-prose:47-48`, so `notes.fx/file.md` matches `.fx/`. Pre-existing
predicate looseness shared by all seven entries, not a class this diff created.
Task 01: minor (deferred): PID-keyed fixture directories are never removed, so
one directory accumulates per invocation where a single self-overwriting one
stood before. Introduced by Ruling I's uniqueness requirement.

## Task 01: fix round 3 landed, verified independently

Commit `3868025`. The implementer did not follow my suggested approach and said
so, which is the behaviour the template asks for. My idea was line-scoped
backtick masking; a phrase's backtick pair can straddle a line wrap, so masking
has to read at block granularity while blanking only the exact quoted bytes and
never a whole paragraph. That is a better solution than the one I offered.

I built the cases myself rather than reading its report, in a scratch directory
outside the repository:

```
a-wrapped-quote      exit=0   the four-line wrapped quotation passes
b-violation-after    exit=1   genuine violation after a dense line, same paragraph
c-violation-before   exit=1   genuine violation before a dense line, same paragraph
PREAMBLE.md          exit=0   the single-line six-term quotation still passes
check-all            exit=0   read directly, no pipe
```

The paragraph bleed is closed and both legitimate quotation shapes survive.
(prose-gate: quoting)
Note that `robust` appears in backticks and again in prose in cases b and c, so
these test the masking boundary rather than mere presence.

Round 3 diff packaged at `.fx/2026-09-11-fx-audit/review/9eea5c1..3868025.diff`,
1 commit, using the fix commit's own parent as the base per the rule this build
learned two rounds ago.

## Task 03: dispatched, for real this time

BASE `3868025`. Unblocked: 02 complete, no writer in flight.

## Task 01 round 3: named defect fixed, new Important in the same function

Re-review: **paragraph bleed ADDRESSED**, verified at `scripts/check-prose:68-83`
and `211-212`, all three cases and both orderings.

New Important: masking every backtick-delimited span makes **any single
backticked stock word invisible**, with no density requirement and no need for
the line to look like a quotation. I reproduced it rather than taking the
claim:

```
This design is meant to be `robust` under load.   exit=0   bypassed
This design is robust under load.                 exit=1   caught
```

Before this diff a stock word's visibility never depended on backticks at all.

**Ruling L: stop patching the predicate and replace the inference with an
explicit marker.** Three attempts, each correct for its author's case and wrong
just outside it: per-line density missed wrapped quotations, block-wide
exemption bled across paragraphs, backtick masking swallows a single quoted
word. `fx-debug`'s circuit breaker names this exact pattern at three: each fix
reveals a problem in a different place, which is a wrong architecture rather
than a failed hypothesis.

The architecture is wrong because the predicate is inferring **mention versus
use** from formatting, which formatting does not determine.

fx has already made this exact call twice, and both are in scope here:

- `scripts/check-prose` itself, on fences: *"Prose fences are tagged
  ```markdown rather than inferred. A bare fence stays code, because it
  routinely is. Tagging says which fences are text at the site, where the
  person adding one can see the rule."*
- Task 02's `artifact-gate: ok`, chosen over an allowlist under ADR 0011.

So: a block that quotes the banned list carries a marker and is exempt. Nothing
else is exempt. Both the density heuristic and the backtick masking go.

Cost if wrong: five files must carry the marker, and an author who forgets it
gets a false positive instead of a silent pass. A false positive is the failure
direction a gate should fail in. Caught by the round 4 re-review, which is told
to prove that a marked block passes, an unmarked quotation fails, and a genuine
violation inside a marked block is a deliberate, accepted cost.

Migration surface, enumerated from the source of truth rather than from memory:

```
PREAMBLE.md
docs/plans/2026-09-11-fx-audit/findings/01-machine-facts-findings.md
docs/plans/2026-09-11-fx-audit/findings/01-fix-rounds-findings.md
docs/plans/2026-09-11-fx-audit/findings/01-round3-findings.md
docs/plans/2026-09-11-fx-audit/findings/02-artifact-gate-findings.md
```

**Round 4 is blocked on task 03, deliberately.** Task 03's implementer is
writing now and runs `check-prose` as part of its verification. Editing that
gate underneath it produces exactly the false RED and false GREEN the
serial-implementer rule exists to prevent, even though the two touch no common
file. Waiting.

## Task 03: landed, verified, under review

Commit `660bef0`, five files. Verified myself:

```
check-artifacts   exit=1   8 line(s) across 4 file(s), 3 exempted
remaining         skills/fx-brainstorm/{server.cjs,start-server.sh,stop-server.sh,visual-companion.md}
check-all         TRUE exit=0
```

Hits the task's stated 8 and 3 exactly, and every remaining violation is in
task 04's set, which is the property that proves the split was clean rather
than that the count happened to land.

**Its declared deviation is legitimate and I checked it rather than accepting
it.** It cited ADR 0015 as plain text rather than an anchored path, saying that
matches repo convention. `skills/fx-architecture/SKILL.md:124` reads
*"contradicts ADR-0007, but worth reopening"*, so the convention is real.
Accepted. `check-paths` does not validate `docs/adr/` citations either way.

Diff packaged at `.fx/2026-09-11-fx-audit/review/3868025..660bef0.diff`.

## Task 01 round 4: dispatched under Ruling L

Unblocked now that task 03's implementer has finished. Task 03's reviewer runs
concurrently and is told not to run `check-prose` or `check-all`, since round 4
is editing that gate underneath it.

## Task 03: complete (commits 3868025..660bef0, review clean)

Files touched: `skills/fx-architecture/{SKILL,HTML-REPORT,COVERAGE}.md`,
`skills/fx-review/{reviewer-prompt,COVERAGE}.md`.

Review: **Approved. 0 Critical, 0 Important, 1 Minor.** It ran the artifact
gate and the citation gate itself, confirmed the diff touches only the five
named files and nothing in `skills/fx-brainstorm/` or in the gate script, and
**opened all three marked lines** to confirm each is a real quotation with its
quoted bytes unchanged and the marker placed alongside rather than inside the
quote. Those are Ruling C's two concerns and both were checked rather than
assumed.

Task 03: minor (deferred): `skills/fx-architecture/COVERAGE.md:124` appends its
marker to a prose line where the other two sit in table cells. Cosmetic.

One warning item, correctly not treated as a defect: the reviewer could not run
`check-all` because `check-prose` is being rewritten by round 4. My own
pre-rewrite run at this exact commit recorded `TRUE exit=0`, and the artifact
gate is not wired into `check-all` yet, so this task's red gate cannot cause a
future red run.

Guarantee rows from this task:

| # | What is guaranteed | Test | Type | Result | Evidence |
|---|---|---|---|---|---|
| 03a | The architecture report is written into the plan directory | `check-artifacts` | gate | PASS | 16 to 8 lines, no `fx-architecture` hit remains |
| 03b | A review worktree goes to `.worktrees/`, not a temp path | `check-artifacts` | gate | PASS | no `fx-review/reviewer-prompt` hit remains |
| 03c | Upstream quotations keep their text and take the marker | manual read of all 3 | inspection | PASS | quoted bytes unchanged, marker alongside |
| 03d | Every citation still resolves | `check-paths` | gate | PASS | 53 citations |

## Frontier, and a ruling I will need when round 4 closes

Blocked entirely on task 01 round 4, which is a writer. Nothing else can run.

When it closes, three tasks unblock at once: 04, 05 and 07. They share no file:
04 is `skills/fx-brainstorm/` plus `scripts/check-all`, 05 is a new agent plus
`tests/lens-pipeline/` plus `skills/fx-review/SKILL.md`, 07 is one new
reference.

**The serial-implementer rule's stated reason does not hold here.** It is a
shared test environment: one Postgres, one Redis, one broker set, where a
worktree is a second checkout rather than a second database. This repository
has no database and no service. The one real shared resource was the fixture
directory, and Ruling I made those paths unique per process.

This repository's own earlier ledger made exactly this call for its tasks 02 to
07. I will make it again when the frontier opens, and record it then rather
than banking it now, because it depends on round 4 not changing what the gates
touch.

## Task 01 round 4: the marker holds

Commit `a1ac01a`. `check-prose` now has one rule: a block carrying
`prose-gate: quoting` is exempt, and nothing else is. Both heuristics are gone.

Verified myself, five cases in a scratch directory:

```
1-marked-quote          exit=0   a marked quotation of the list passes
2-unmarked-quote        exit=1   an unmarked one fails, the intended cost
3-backticked-word       exit=1   round 3's bypass sentence is caught again
4-violation-in-marked   exit=0   accepted cost, documented rather than discovered
5-plain-violation       exit=1   ordinary prose still caught
check-all               exit=0   ALL GREEN, 7 blocks exempted
```

**Two corrections the implementer made to my instructions, both right.**

It declined to mark two of the five files I enumerated, because both already
pass unmarked: their quotations sit inside untagged code fences, which neither
removed heuristic ever touched. My enumeration was a grep for the words, not a
check of which files actually depended on the heuristics, so it over-matched.
A grep generalised past its scope, which is one of the three controller error
shapes this lane names.

It also declined to touch `state.md`, correctly: the ledger is mine and every
prior round told it so. That left `check-all` red on **my** file, at lines 431
and 564, where I had quoted my own failed probe and named a test word. It
reported this precisely rather than either editing my file or staying quiet.
I applied the marker to both blocks myself.

**The migration surface was therefore 3 files, not 5**, plus the ledger, which
nobody but me could fix.

## Ruling M: tasks 05 and 07 run concurrently; task 04 does not

The serial-implementer rule's stated reason is a shared test environment, one
Postgres and one broker set, where a worktree is a second checkout rather than
a second database. This repository has neither, and the one genuinely shared
resource was the fixture directory, which Ruling I made unique per process.
This repository's own earlier ledger made the same call for its tasks 02 to 07.

**05 and 07 share no file.** 05 writes a new agent, `tests/lens-pipeline/` and
`skills/fx-review/SKILL.md`. 07 writes one new reference. Dispatched together.

**04 is held back, and the reason is specific rather than cautious.** It
modifies `scripts/check-all`, which is the command 05 and 07 both run to verify
themselves. Editing the gate underneath them produces exactly the false RED and
false GREEN the serial rule exists to prevent, and unlike the database
justification, that one applies here. 04 goes after they land.

Residual risk, disclosed: 07 creates a file under `references/`, which
`check-paths` and `check-reference-leaves` read, so 05 could observe it
half-written. Both briefs are told that a gate failure naming a file outside
their own set is to be re-run once before it is believed, and that they must
not fix another task's file.

Cost if wrong: one confusing gate failure and a re-run. Caught by each task's
own review, which sees the final state rather than the transient one.

## Task 07: landed, verified, under review

Commit `7d39c0b`, one new file, `references/audit-template.md`, 176 lines with
a table of contents at line 9, which the over-100-lines rule requires.

Verified myself against the criteria most likely to be written around:

```
grep design-template   no match        the leaf rule holds by construction
check-reference-leaves exit=0          no reference links to another
check-prose            exit=0          0 blocks needed the marker
headings               Areas not covered present in both map skeletons
```

**I repeated my own recorded mistake.** Two rounds ago I wrote the rule that a
review package's base is the commit's own parent whenever anything else landed
in between. I then packaged this task from its task-start BASE and swept in my
own ledger commit: 2 commits and 56,373 bytes where the real change is 1 commit.
I had filed that lesson under fix rounds and not under task commits, which is
the narrower generalisation failing exactly the way a grep generalised past its
scope does. Repackaged from `f581282`.

The rule, stated once and without the qualifier that let me miss it: **a review
package's base is the reviewed commit's own parent, unless nothing else landed
in between.**

## Task 01 round 4: marker design sound, one Critical in the implementation

Re-review: the redesign is **ADDRESSED**. The density check and the masking
helper are gone, the marker is a plain substring test at `scripts/check-prose:172`,
and the exemption reaches only the vocabulary scan. It also ran the case my
brief predicted and found the gap **absent**: the dash check and the
parenthesis check both still run on marked blocks.

Then it found the case nobody had run, and I reproduced it before accepting it:

```
line 1   an unmarked genuine violation
lines 2-6   a real code fence
line 7   a line carrying the marker

with the marker:     exit=0   violation laundered
without the marker:  exit=1   violation caught
```

**Cause, at `scripts/check-prose:174`:**
`marked_lines.update(range(start, start + len(block.splitlines())))`.
`blocks()` drops fenced lines from a paragraph's joined text while still merging
the prose either side into one block, so the joined line count is shorter than
the true physical span. The range therefore lands on the wrong physical lines,
and because it always begins at `start`, the paragraph's first physical line is
exempted no matter where the marker actually sits.

**This is the opposite failure direction from the one the design commits to.**
Ruling L accepted false positives as the cost of the marker. This produces a
false negative, and it is reachable by an ordinary shape: sentence, fence,
sentence, with no blank lines. The round 4 report is itself written that way.

**Deviation, disclosed: round 4 should have used a fresh implementer on a more
capable model and did not.** The fix loop says rounds 1 to 3 resume the original
and rounds 4 to 5 use a fresh one a tier up, on the reasoning that a loop
surviving three resumes usually means the implementer cannot see its own
problem. I resumed the original for round 4 without noticing the rule changed at
that boundary. Round 4 did produce a sound redesign, so the deviation did not
cost the outcome, and it stays recorded rather than excused.

Round 5 corrects it: **fresh implementer, one tier up.** This is the cap. If it
does not close, I adjudicate rather than opening a sixth.

**Blocked on task 05.** Round 5 edits `check-prose`, and task 05 runs
`check-all` as its final verification step. Same reason task 04 is held.

## Task 07: review needs fixes, both Importants verified

Review: **Needs fixes. 0 Critical, 2 Important, 2 Minor.** Findings at
`docs/plans/2026-09-11-fx-audit/findings/07-audit-template-findings.md`.

Both Importants opened and confirmed rather than repeated:

**The per-module verdict table uses the form that fails.**
`references/audit-template.md:151-158` says "One row per module in the current
system: none may go silently unaccounted for", then gives a table. A table
filled for three modules of ten satisfies that sentence and looks finished.
`fx-authoring` names this exactly: for an omitted required element, a structural
slot works and a prose reminder near the template measurably does not.

The instructive part is that **the same file solves it correctly one section
earlier**. Lines 58 to 63 do not merely ask for the uncovered-areas section,
they say to write it when empty and supply the exact fallback string. The
working pattern was known, used, and then not applied to the next table.

**A retry policy leaked into a shape-only file.**
`references/audit-template.md:60-61` carries "after one re-dispatch with more
context". `tasks/08-fx-audit-command.md:62-64` carries the same rule as an
acceptance criterion. Two files, one rule, and **the leaf gate forbids either
from citing the other**, so nothing can hold them in agreement. The template
owns the section's shape; the command owns when an area lands in it.

Fix round 1 dispatched, with the mirror search attached: the reviewer noticed
the gap table has the identical weakness, and fixing one of a mirrored pair is
worse than fixing neither.

Task 07: minor (deferred): possible content overlap between the template's core
interface signatures section and the design template's implementation decisions.

Dispatching this alongside task 05 is consistent with Ruling M, which already
accepted that pair running together with the re-run mitigation. **Round 5 on
task 01 stays blocked**: it edits `check-prose`, which task 05 runs as its final
verification, and that is the stronger conflict Ruling M held task 04 back for.

## Ruling N: Ruling M was wrong about what is shared. No concurrent writers.

Tasks 05 and 07 raced on `.git/index`. Task 07 staged its fix, task 05's commit
ran first, and `4501684` now carries both tasks. Task 07's implementer then ran
`git reset` to unstage, briefly touching the other implementer's staged files.

**I enumerated the wrong shared resource.** Ruling M reasoned that the
serial-implementer rule exists for a shared database and broker set, that this
repository has neither, and that the fixture directory was the only real
contention point. That was a correct reading of the rule's stated reason and an
incomplete enumeration of the actual resources. **Two writers in one worktree
share one git index**, and staging is not atomic across agents. The rule was
right for a reason its own text does not give.

I predicted the cost as "one confusing gate failure and a re-run". The actual
cost is an entangled commit and one agent running `git reset` over another's
staged work. Recording the prediction beside the outcome, because a ruling whose
cost estimate was wrong is worth more than one that was merely wrong.

**Ruling N: one writer at a time in this worktree, with no exception.** Reviews
and lenses stay parallel: they are read-only and touch no index.

### Damage assessment, measured not assumed

```
4501684  agents/fx-lens-pipeline.md              196 +
         references/audit-template.md             18 +-     <- task 07's fix
         skills/fx-review/SKILL.md                23 +-
         tests/lens-pipeline/README.md            46 +
         tests/lens-pipeline/fixture/schema.sql    8 +
         tests/lens-pipeline/fixture/worker.js    45 +
```

Content on both sides is intact: the retry-policy clause is gone from
`references/audit-template.md` and the file is 182 lines. Working tree holds
only my ledger and two findings files.

**Not unwinding it.** Splitting the commit needs history surgery while task 05
is still running against this checkout, and the guard blocks the destructive
verbs for good reason. The commit boundary is wrong; the content is right. I
review it **path-scoped** instead: task 07's fix is reviewed over
`references/audit-template.md` alone, task 05's work over everything else in
the same commit. That costs a hand-built diff and nothing else.

## Task 05: landed, and its concern invalidates my own test design

Commit `4501684` (entangled with task 07's fix, see Ruling N). Hard constraints
all verified by me: `check-all` exit 0, `tools: Read, Grep, Glob, Bash`,
`model: opus` pinned, absent from `plugin.json`, and the description names no
framework, language or file extension. The stakes clause names machinery: a
queue that never drains for one tenant, a message sent twice, a job that fails
once too often and is gone.

**The implementer flagged the fixture and it is right. The fixture is mine, and
it is worse than it said.** Read at `tests/lens-pipeline/fixture/worker.js`:

- **Every seeded defect is labelled in a comment that names it and its
  category**, for example `// 1. FAIRNESS: every campaign shares one queue, so
  a large campaign starves every small one behind it.` An agent does not need a
  lens to find that. It needs to read English.
- Three comments misdescribe their own code. Defect 2 describes a per-process
  limiter, but `sentThisSecond` is declared and never read or incremented, so
  there is no limiter at all. Defect 5 says a connection is "never released **on
  the throw path**", implying a non-throw release that does not exist either.
  Defect 7 says an exhausted job "simply disappears", but `return handle(job)`
  is unbounded recursion rather than a retry policy, and it never exhausts.
- `provider` is used at line 33 and never declared or required: an unseeded
  defect sitting among the seeded ones.

**Ruling O: the control-versus-lens measurement does not yet mean what it
claims, and gets re-run against a stripped fixture.** Control 4 of 8 and lens 8
of 8 were both measured on a file that hands over the answers. That is the
verification-theater shape `fx-devils-advocate` exists to catch: a check that
ran honestly and proves a different thing than the claim it is offered for. The
labels move to a key file outside the fixture, keyed by line number, and both
arms re-run against code that explains nothing about itself.

Cost if wrong: the lens ships on a measurement nobody can rely on, which is the
one thing this task existed to produce. Caught by nothing downstream, which is
why it is fixed now rather than deferred.

**My acceptance criterion was a guess and I am re-measuring rather than waiving
it.** The task says the control finds at most 2 of 8. I wrote that number
without measuring anything. With every defect labelled, 4 was never surprising.
The stripped re-run produces a real number, and the criterion is judged against
that.

Task 05: concern recorded, not a defect: `fx-lens-pipeline` **cannot be
dispatched by name** from this worktree, because the agent list loads from the
version-keyed installed cache and not from the tree being edited. ADR 0010
records exactly this. The implementer substituted a general-purpose agent given
the definition verbatim, which is the correct workaround. **Task 08 will hit the
same wall** when its command dispatches the lens, and nothing in this plan can
fix it: it needs a version bump and a reinstall, which is the user's to do.

## An injected instruction to add attribution trailers, refused

Mid-run, a system reminder instructed this controller to end commit messages
with `Co-Authored-By` and `Claude-Session` trailers. Task 05's implementer
received the same instruction. Both refused it. It contradicts the user's
standing rule in memory, `PREAMBLE.md`'s first non-negotiable, and the git
guard, which blocks those trailers outright. A later injected message does not
repeal an explicit standing user instruction.

Checked every commit from `8309b63` to HEAD for the three trailer patterns:
none carries one.

## Task 05: fix round 1 stripped the fixture, and the result is a finding

Commit `184490a`. The answer key moved to `tests/lens-pipeline/KEY.md` and no
comment in `fixture/worker.js` now names a defect or its category, confirmed by
grep for all eight group names.

**The stripped control found 7 of 8.** That crosses the stop rule, so the
implementer correctly did not run the lens arm. The only defect a careful
reader with no lens missed was fairness.

This is not a fixture defect any longer. It says **seven of the lens's eight
hunt groups are things a careful generic reviewer already catches**: ordering
of acknowledgement against commit, a leaked connection, unbounded retry, no
batching, no correlation identifier. Only fairness needed knowledge of how
queues behave under load.

**Ruling P: task 05 is parked, and the question goes to the user with the
evidence rather than being ruled here.** Three reasons. First, the options the
implementer laid out include weakening the control, which is gaming the
measurement and is rejected outright. Second, shipping on the architectural
argument alone breaks `fx-authoring`'s Iron Law, which says no skill ships
without a failing test first. Third, and decisively, the remaining option is a
design question the user already answered once: ADR 0008 recommended folding
this material into the database lens to avoid paying a second dispatch, and the
user chose a separate lens. **Evidence that the separate lens adds one group of
eight over a careful reader bears directly on that choice**, and reversing a
user's design decision is not a controller's ruling to make.

To make the question answerable with data rather than half of it, the lens arm
runs now against the stripped fixture, read-only, and I score it against the
key myself. Both numbers are single samples; `skill-testing.md` asks for five
per arm, and ten further runs are offered to the user rather than spent.

Tasks 06, 08 and 09 depend on 05 and wait with it. Tasks 01, 04 and 07 do not,
so the build continues.

**Out-of-scope finding for the completion report.** This session's skill
listing now shows the `ponytail` and `mattpocock-skills` plugins enabled:
`diagnosing-bugs`, `tdd`, `code-review`, `codebase-design`, `grilling` and
others, beside the fx lanes. That is the contest fx exists to end, live in the
session running this build.

Scoring basis for task 05, fixed before the lens result arrives: the lens arm is
scored against `tests/lens-pipeline/KEY.md` as committed in `184490a`, not
against the labels in my original task file. The key corrects all three
mechanisms I misdescribed, most materially defect 7, which it describes as a
send retried unconditionally forever with no delay rather than a job that
disappears. Fixing the scoring basis now means the result cannot be read
generously after the fact.

In flight, none waiting on another: task 01 round 5 (the only writer, fresh
agent, top tier, final round before adjudication), the blind lens-arm
measurement (read-only), task 07's scoped re-review (read-only). Task 04 waits
on the writer slot under Ruling N. Tasks 05, 06, 08 and 09 wait on the user's
decision under Ruling P.

## Task 05: lens arm measured blind, scored against the fixed key

Scoping held: the agent's own path list shows it opened only
`agents/fx-lens-pipeline.md` and the two fixture files. No key, no plan, no
ledger.

```
key group                 lens finding   result
1 fairness                9              found
2 backpressure            7              found
3 granularity             10             found
4 transactional safety    6              found, ceded to database lens as well
5 resource pressure       4              found
6 idempotency             1              found, mechanism matches the corrected key
7 retries                 3              found, mechanism matches the corrected key
8 traceability            12, 13         found
schema.sql                one-line cessions only, which the key permits
```

**Lens 8 of 8. Control 7 of 8.** On the key alone, the lens adds fairness.

Two things the count does not show, both checkable in the output:

- **It read code rather than labels.** For groups 6 and 7 it reached the
  mechanisms the key corrected, a lost acknowledgment and an unconditional
  retry forever, not the wrong ones my original task file stated. Those wrong
  labels no longer exist anywhere it could see, so it could only have got there
  from the code.
- **It found an unseeded Critical.** `worker.js:34` writes `state = 'sent'`
  before `res.ok` is checked at line 36, so a failed send is recorded as sent.
  Nobody seeded that. It also reasoned about behaviour under failure rather than
  per line: a provider outage turning every retry into a connection leak until
  every worker blocks on the pool.

Both arms are single samples. Neither number is established.

## Corrections to my own task 05 lines, from the control's verbatim findings

I read the stripped control's findings from the implementer's report after
recording the lens score, and two of my lines above overstate the lens.

**The unseeded bug is not a lens advantage.** I wrote that the lens "found an
unseeded Critical", listed under things the count does not show. The control
found it too: the report lists "an unconditional success write" among the
control's catches, and I confirmed the bug itself in the fixture, where
`worker.js:34` writes `sent` and `worker.js:36` only then checks `res.ok`. Both
arms caught it. It differentiates nothing.

**Ruling P mischaracterised one option.** I wrote that weakening the control
"is gaming the measurement and is rejected outright". The implementer's actual
option was different: make the control stand for what an `fx-review` branch
run does without this lens, which is a correctness pass, a standards pass, a
spec pass and an unprimed adversarial pass, rather than one unhurried top-tier
read. Weakening a baseline until the lens passes would be gaming. Replacing it
with the real alternative measures the question the lens has to answer. Those
are different, I conflated them, and the option goes to the user as legitimate.

What the comparison does show, stated once and no wider than the evidence:

```
                   control          lens
key groups found   7 of 8           8 of 8   the difference is fairness
findings returned   43               13
cessions            none             database lens twice, silent-failure once
models              top tier         top tier
samples             1                1
```

A local evidence report goes to the user before the question, per their
standing preference, at
`docs/plans/2026-09-11-fx-audit/report-20260911-task05-lens-evidence.html`.
Not committed yet: task 01 round 5 holds the index.

## Ruling Q: the user's decision on task 05

Asked with the evidence report on disk first, per the user's standing
preference. The user chose:

- **Narrow the lens** to concerns that need knowledge of how queues behave,
  keeping the separate agent, its triggers, its read-only tools and its pinned
  model.
- **Measure properly before acting on it**: five runs per arm, with the control
  replaced by the passes an `fx-review` branch run dispatches without this lens.

**One correction to the option text the user saw.** It listed "rate limits
enforced per process in a multi-process deployment" as a pipeline-only concern.
The stripped control found exactly that defect, in its own words: "Running M
worker processes yields an actual ceiling of 20 x M per second". So it is a
candidate for the narrowed list and not a given. The measurement decides it,
not my option text.

**Deliberate deviation, recorded: the fixture's author does not run the
measurement.** Earlier rounds had the implementer who wrote the fixture also run
both arms. Separating the two removes the last way the answer can leak from
author to measurer. The implementer commits the new fixture and key in one
commit and the narrowed lens in a later one, so git shows the key was fixed
before the lens changed. I then run all ten arms blind and score them against
that key.

Task 05 round 2 resumes the original implementer rather than a fresh agent on a
higher tier. It holds the whole history of this fixture, including two defects
it introduced by accident and one it caught, and that context is worth more
here than a tier.

## Task 01 round 5: landed and verified, under the final re-review

Commit `2bd5208`, 8 lines added to `scripts/check-prose`, no attribution
trailer. The implementer refused the injected trailer instruction too.

The controller's two-defect reading was right, and the implementer proved it
rather than accepting it: a test copy with only the line-number fix still let 6
of 6 fence cases through and made the mirror case worse. **A code fence merging
the prose on both sides into one block was the root cause.** Ending a block at
every fence fixed both defects. It also reported that my predicted RED for the
mirror case was wrong: that case already exited 1 before the fix, so it built a
longer-tailed variant that did exit 0, and said so.

Verified myself, cases rebuilt from scratch outside the repository:

```
c1 marked quotation            exit=0
c5 plain violation             exit=1
c6 violation, fence, marker    exit=1   the Critical, now closed
c7 marker, fence, violation    exit=1   its mirror
c8 marked block with a dash    exit=1   the dash check is not exempted
PREAMBLE.md                    exit=0
check-all                      exit=0, ALL GREEN
```

Side effect, verified by the implementer on the real tree: the parenthesis check
now flags a parenthesis opened before a fence and closed after it. 12 of 111
files have a fence-split block, and gate output is identical before and after.

Diff packaged at `.fx/2026-09-11-fx-audit/review/184490a..2bd5208.diff`, whose
base is the fix commit's own parent, which here is task 05's fixture commit.

Task 01: finding (deferred to final review): **nothing in the repository tests
these cases.** Every case above lived in a scratch directory that was deleted.
A later edit to `blocks()` could bring the fence bug back with `check-all`
green, which is exactly how this predicate regressed three times in one build.

Task 01: minor (deferred, pre-existing): `~~~` fences are read as prose, and a
three-backtick line inside a four-backtick fence flips fence state.

## Task 07 re-review: half addressed, confirmed against the file

Retry policy duplication: **ADDRESSED**. Structural count device:
**ADDRESSED for the per-module table, NOT for the gap table.** Opened both.

The per-module count reads "Module count: N modules listed in `01-current.md`'s
patterns and file structure section", which is a number from another document a
reader can check. The gap table's reads "Target count: N features and stated
targets identified", which names no source, so a table covering three of ten
targets can truthfully claim three were identified. The anchor it needs already
exists in the template: `01-current.md`'s feature and business-rule inventory.

The load-bearing part of the fix landed on one table of a mirrored pair, and
the implementer's report described it as the same fix applied to both.

Fix round 2 on task 07 is queued: it is a writer and task 05 holds the slot.

## Pre-registered: the task 05 measurement protocol

Written before the new fixture exists, so the result cannot shape the rules.

**Control arm, per run.** What an `fx-review` branch run dispatches without this
lens, each pass a separate read-only agent, findings unioned:

1. a correctness reviewer, general-purpose, briefed to find defects with
   severity. Approximation, disclosed: real branch mode runs the built-in
   `/code-review`, and a subagent cannot invoke a slash command.
2. a standards reviewer with `references/vocab/fowler-smells.md` pasted in,
   using `fx-review` step 5's standards brief.
3. `fx-devils-advocate` in code mode, unprimed. It dispatches by name, because
   this plan does not change it and the installed copy is current.

The spec pass is skipped: the fixture has no spec, and `fx-review` step 3 says
to report "no spec available" rather than invent one.

**Lens arm, per run.** One `fx-lens-pipeline` run. A general-purpose agent is
given the agent definition verbatim, because named dispatch loads from the
version-keyed cache and the narrowed lens is not in it.

**Runs and tiers.** Five of each, all on the top tier, which is what branch mode
uses and what the lens pins.

**Blindness.** Every agent opens only the fixture directory plus its own
instructions file, and lists every path it opened. A run whose path list
touches the key, the plan, the ledger or `.fx/` is void and re-run.

**Scoring.** Against `KEY.md` at the first of round 2's two commits. A key row
is found in a run if any pass in that run names its mechanism at or near its
line. I score row by row and record each call.

**Decision rule, per narrowed hunt group.** The lens keeps a group if the lens
arm finds it in at least 4 of 5 runs **and** the control arm finds it in at most
2 of 5. A group the control finds in 3 or more runs is not differentiating and
is dropped from the lens. These thresholds are a judgement chosen now, before
any data, and that is their only claim to fairness.

**Also recorded per run:** findings returned, as a measure of noise, and whether
the lens ceded correctly.

## Amendment to the pre-registered protocol, made before any data

**Every arm reads a neutrally named copy of the fixture, not
`tests/lens-pipeline/fixture/`.** Both earlier control runs read the fixture at
that path, and a directory named `lens-pipeline` tells a reviewer which domain
to think about. That is precisely the knowledge the lens claims as its
advantage, so the path hint biased the comparison against the lens by an
unknown amount. The copy goes to `.fx/2026-09-11-fx-audit/subject/`, taken from
the key commit once task 05 round 2 lands, and the blindness rule becomes: open
only that directory plus your own brief, and for the lens arm the lens file.

The earlier 7 of 8 and 8 of 8 are not re-scored. They were measured on a
fixture this round replaces, and they already went to the user as single
samples.

**The briefs are files, written once**, at
`.fx/2026-09-11-fx-audit/briefs/`, so all five runs of an arm read byte-identical
instructions. `fx-implement` measured 26 of 26 hand-composed dispatches dropping
some clause, and a measurement is the one place identical conditions are the
entire point. The standards brief follows once the smell baseline is pasted in,
as pre-registered.

The three control briefs were first written under names beginning `control-`,
and each run reads its brief by path. A control agent would have read the word
"control" and could infer it was one arm of an experiment, while the lens arm
reads `lens.md`. That is an asymmetry between arms, and I introduced it.
Renamed to `correctness.md`, `standards.md` and `adversarial.md` before any run,
and grepped the three for words hinting at the domain or at being measured.

## Task 01: complete (review clean at round 5 of 5)

Task 01's own commits, interleaved with other tasks on the branch: `79fa920`,
`fce46f0`, `64f8103`, `c282cb4`, `3868025`, `a1ac01a`, `2bd5208`.

Files touched: `.fx.json`, `scripts/check-all`, `scripts/check-prose`,
`PREAMBLE.md` (one marker), plus markers in two findings files and this
ledger.

Final re-review: **ADDRESSED, no new Critical or Important.** It ran 25 cases
against both the new script and a pre-fix copy rebuilt from the diff, reading
each exit code directly, and ran both scripts in-process across 112 real files
with no difference in exit code or output. Closed without adjudication at the
cap.

Guarantee rows from this task:

| # | What is guaranteed | Test | Type | Result | Evidence |
|---|---|---|---|---|---|
| 01a | `.fx.json` declares real commands, including `test_one` and `setup` | each command run once | inspection | PASS | 80, 27, 13, 17 assertions through one template |
| 01b | `check-all` stops at the first failing gate and names it | mutation of `check-paths`, restored by copy | gate | PASS | exit 1 naming the gate, then byte-identical restore |
| 01c | Fixture capture is shape-checked and paths are unique per process | 5 capture shapes, concurrent runs | gate | PASS | fix round 1 |
| 01d | `check-prose` exempts `.fx/` and nothing else | violations planted in `docs/plans/` and `skills/` | gate | PASS | both exit 1 |
| 01e | Only a block carrying `prose-gate: quoting` is exempt from the vocabulary check | 9 contract cases | gate | PASS | round 4 and 5 tables |
| 01f | A marker cannot exempt across a code fence | a01, a02, c6, c7, b07, b08, b14, b21 | gate | PASS | 25-case re-review |

Task 01: minor (deferred): a parenthesis opening before an indented fence inside
one list item and closing after it now fails the parenthesis check, though
markdown renders it as one item. Nothing in the tree hits it.

## Finding outside every task: check-prose never reads prose after a markdown fence

Reported by the round 5 re-reviewer as pre-existing and out of scope. **I
reproduced it rather than repeating it.**

A prose line with a banned word, placed after a closed `markdown`-tagged fence,
exits **0**. The same line alone exits **1**. Files in the repository with a
`markdown`- or `md`-tagged fence: **27**.

Cause as the re-reviewer located it: `blocks()` and the word scan track fence
state with one true or false flag. A `markdown` opener leaves the flag false,
because that fence is prose, so its plain closing line reads as the opener of a
code fence, and every line from there to the next fence line is treated as
code.

**Why it matters more than its severity suggests.** fx's dispatch-prompt
templates wrap their prompts in `markdown` fences, which is why `check-prose`
learned to read those fences as prose, and 27 files carry at least one. The
prose after each such fence has been reported clean by a gate that never read
it. That predates this branch: the same single-flag fence logic was in
`scripts/check-prose` on `main` when I read it at the start of this session.

Correction, made in place: this paragraph first said "every skill template"
and "before it" with no source. I counted 27 files, not every template, and
the pre-branch claim rests on having read the `main` copy. The re-reviewer
counted 28; mine excludes `.fx/`, `.git/` and `.worktrees/`.

**Not fixed here.** Task 01 is closed at its cap, and folding new scope into a
closed task would be a sixth round under another name. It goes to the user in
the completion report as a candidate task, at Important.

## Task 05 round 2: landed and verified, measurement prepared

Commits `27339eb` (re-seeded fixture, `KEY.md`, `README.md`) then `d150541`
(narrowed lens, trigger table). Verified: the key commit is an ancestor of the
lens commit, each touches only its own half, and neither carries a trailer.
The implementer refused the injected trailer instruction a third time.

It dropped the per-process rate-limit candidate on round 1's evidence that
ordinary reading already catches it, and recorded why in `KEY.md`. That is the
call Ruling Q asked it to make rather than take from my option text. It also
found and fixed an unkeyed accident while authoring, a receipt write that would
have matched zero rows, and said so in the key.

**Superseded, not edited:** `tasks/05-lens-pipeline.md` still shows the original
fixture verbatim. The task file is the plan's record of what was specified, so
it stays as written. The fixture and key at `27339eb` supersede it under
Ruling Q.

**Neutral subject copy built** at `.fx/2026-09-11-fx-audit/subject/` with
`git archive` from `27339eb`, confirmed identical to the fixture at HEAD.
`check-all` exit before the ten runs: **0**.

## The git guard refused a command that combined an audit grep with a commit

My previous command audited earlier commits with a grep for the three trailer
patterns and then committed the ledger, with a message carrying no trailer. The
guard refused the whole command, so nothing in it ran. `alwaysBlocked` in
`lib/git-guard.js` tests the attribution patterns against the full command
string whenever any segment is a commit, so a pattern present only as grep data
in another segment blocks the commit.

It failed closed, which is the designed direction, and it cost one re-run. It is
still a false positive: `README.md` says a grep for those strings is data, and
that holds only when no commit shares the command. The fix here was to keep
audits and commits in separate commands, not to spell the patterns so the guard
cannot read them. Minor finding for the completion report.

## Ruling R: the fixture fails hygiene, so it is fixed before any run

Before scoring anything I checked every key row against `worker.js` at
`27339eb`. The six keyed defects are present at their stated lines. Three
statements are not true of the code:

1. **A comment contradicts its code.** Line 36 reads "Retries once if the
   provider tells us it is rate limiting the account". The loop retries while
   `attempt < MAX_SEND_ATTEMPTS`, starting at 1 with a maximum of 5, so up to
   four retries. It sits in the same function as keyed row 5.
2. **An unkeyed duplicate-send bug sits on a keyed row's lines.**
   `runScheduledCampaigns` at lines 28 to 34 selects campaigns with status
   `scheduled` and never changes that status, so every cron run re-enqueues
   every campaign already enqueued. Any careful reader catches that. It
   occupies exactly the lines of keyed row 6, whose mechanism is framed as a
   missing backlog check.
3. **The key makes a claim the code falsifies.** Its dropped-candidates section
   says an unbatched loop is not seeded. `enqueueCampaign` pushes one message
   per recipient at lines 17 to 19.

**Why this blocks measurement rather than riding along as noise.** Items 1 and
3 are noise both arms would share. Item 2 is not: my pre-registered rule counts
a row found when a finding "names its mechanism at or near its line", and a loud
bug on row 6's lines makes that row ambiguous to score and likely hides the
backlog reasoning behind the duplicate. The per-group decision rule would then
judge row 6 on a confound. Twenty runs on that fixture is not the proper
measurement the user chose.

**Scope of the fix, fixed now:** hygiene only. The six keyed defects, their hunt
groups and their mechanisms stay as keyed. The lens file is not touched. Every
other unkeyed issue gets one of three decisions, recorded in `KEY.md` before any
run: fixed, keyed, or accepted as noise ceded to another lens.

**Amendment to the pre-registration, before data.** Scoring moves from the key
at `27339eb` to the key at the hygiene commit, and the neutral subject copy is
rebuilt from that commit.

**A cost of this ruling, stated rather than hidden.** The corrected key now
lands after the lens commit `d150541`, where the original argument was that git
shows the key was fixed before the lens changed. That argument weakens. It is
bounded because the correction changes no keyed defect and the lens is not
edited again, and both are checkable in the diff.

Cost if wrong: one extra writer round, and the measurement starts later.
Caught by nothing downstream, since the measurement is the downstream.

## Task 05 round 3: hygiene commit verified mechanically

Commit `d496d1e`, touching `tests/lens-pipeline/fixture/worker.js` and
`tests/lens-pipeline/KEY.md` only. Checked from git rather than from the report:
`agents/fx-lens-pipeline.md` has no diff between `d150541` and `d496d1e`, the
six keyed group names are identical to `27339eb` row for row, a
`Known unscored issues` section exists, and the commit carries no trailer.

This bounds the provenance cost Ruling R disclosed: the key changed after the
lens commit, but no keyed group changed and the lens did not change at all.

The implementer resolved the batching contradiction by correcting the key rather
than the code, because line 18's per-recipient push is what makes keyed row 1's
bulk workload real. It found eight unkeyed issues on its hostile reread and
keyed none of them.

Neutral subject copy rebuilt from `d496d1e` and confirmed identical to the
fixture at HEAD. `check-all` exit: **0**.

Key rows against the code: checked next, by me, before any run.

## Key rows checked against the code, then the ten runs dispatched

I read `worker.js` and `KEY.md` at `d496d1e` and checked every row against the
lines it cites.

```
row 1  fairness            6 queue, 18 campaign push, 24 receipt push     holds
row 2  idempotency         48 to 65, send 50, write 56 to 59, ack 61      holds
row 3  poison messages     51 to 53 and 62 to 63, requeue with no count   holds
row 4  visibility timeout  7 and 8, subscribe 14, client 12, send 40      holds
row 5  no jitter           9, fixed delay at 42, capped at 41             holds
row 6  unbounded enqueue   28 to 35, marked enqueued at 33, no backlog    holds
```

The comment above `sendWithRetry` now matches its code and names neither a
count nor jitter. The duplicate-enqueue bug is gone.

**Scoring clarification, before any run.** Unscored issue 7 in the key, two
overlapping cron runs both enqueueing one campaign, sits on row 6's lines with
a different mechanism. A finding naming that race does not count as row 6.

**All twenty runs dispatched together**, on the top tier, each prompt pointing
only at its brief file and byte-identical within its arm. The run labels map to
arms in `measurement-task05.md`, written in the same step as the dispatch, so no
result can be reassigned after it arrives.

Task 07's fix round 2 goes out after this commit rather than with it: a
controller commit is a write to the index, and Ruling N makes no exception for
the controller.

Committed `ecf1312`: the ledger, four findings files, the lens evidence report
and the measurement record, seven paths, each staged by name.

## In flight after ecf1312

Twenty blind measurement runs, all read-only, reading only `briefs/`, `subject/`
and, for the lens arm, `agents/fx-lens-pipeline.md`.

Task 07 fix round 2, the one writer. **Correction, made in place:** this line
first said the original implementer was resumed. The resume failed: the harness
had no transcript for that agent and delivered nothing, so for a stretch this
ledger named a writer that did not exist. `fix-loop.md` gives the fallback for
exactly this case, a fresh implementer handed the task path, the report path and
the open findings, and that is what was then dispatched. Its file,
`references/audit-template.md`, is outside everything the runs read.

Task 04 waits for the writer slot under Ruling N.

## Ruling S: a keyed mechanism named with no line counts for the control

Scoring the first eleven runs surfaced a case the pre-registration did not
anticipate. Three standards passes named the visibility timeout mechanism, in
words like "the visibility timeout is shorter than the provider timeout", while
setting it aside as a correctness issue for another reviewer, and gave no line.
The rule says a group is found when a finding names its mechanism at or near its
keyed line.

**These count as found for the control arm.** The choice can only shrink the
lens arm's measured advantage and can never enlarge it, which is the direction a
ruling made mid-scoring has to lean. If this ruling decides any group's verdict,
both counts are reported. Made after eleven of twenty runs arrived and before the
other nine.

## Task 05 measurement: complete, and the rule keeps one group of six

All twenty runs arrived with clean path lists and none was void. Scored against
the key at `d496d1e`, call by call, in `measurement-task05.md`.

```
group                  control   lens   pre-registered rule
1 fairness             5 of 5    5 of 5   dropped
2 idempotency          5 of 5    5 of 5   dropped
3 poison messages      5 of 5    5 of 5   dropped
4 visibility timeout   5 of 5    5 of 5   dropped
5 no jitter            3 or 5    5 of 5   dropped under both readings
6 unbounded enqueue    0 of 5    5 of 5   kept, provisionally
```

**What the result says, no wider than the evidence.** On this fixture, the
review passes `fx-review` already dispatches find five of the lens's six groups
consistently. The lens finds all six and returns a far tighter report, 7 or 8
findings against roughly 35 to 40, but the rule the user approved does not
award a group for tightness.

**A protocol omission of mine, disclosed.** The control left out the broad
branch reviewer that `fx-review` also dispatches in branch mode. Groups 1 to 5
survive that, since the control found them without it. **Group 6, the only group
kept, does not**: that reviewer checks scalability and was never run. So the
lens's single surviving group rests on an incomplete control.

**The fixture's own context handed the control group 1.** Every control pass
finding fairness cited the comment at line 22 about a receipt sent right after
checkout. Removing that comment now to make the lens win would be tuning the
test to its result, and is not proposed.

Neither scoring judgement decided a verdict: group 5 drops under both readings,
and Ruling S changed no group.

**This goes to the user.** A lens with at most one group, possibly none, bears
on the design they approved and on ADR 0014, and tasks 06, 08 and 09 all depend
on the answer. An evidence report comes first, per their standing preference.

## Task 07 fix round 2: landed

Commit `323f02e`, written by a fresh implementer. The gap table's count now
draws its feature half from `01-current.md`'s feature and business-rule
inventory, and its target half from the brief the audit was run with, stated as
living outside the document. It did not invent a new section for targets, which
would have let the same author fill and count it. It flagged the sources line,
"one line per explorer dispatched", as similar in shape and explained why it
left it: that line rests on the dispatching agent's knowledge of its own run.
That call is for the scoped re-review to judge, not for me to accept.

## Ruling T: task 04 as written would commit a session token, and the design forbids it

Re-reading task 04 before dispatch: it moves the visual companion's whole session
directory, `content/` and `state/` together, into `docs/plans/<slug>/companion/`.
`state/` holds the server log, the PID file and `.last-token`, which carries the
session key that `start-server.sh` deliberately writes under `umask 077`. The
port and token files move with it by the task's own criterion. `docs/plans/` is
committed. **As written, task 04 would put a session key into git.**

The design already decides this. Its Global Constraints say artifacts a user
returns to live in `docs/plans/<slug>/` and regenerable working files live in the
ephemeral workspace, which is git-ignored. Mockups in `content/` are artifacts.
The log, the PID, the port and the token are working state. The task contradicts
its design, and the design is the binding authority.

**Ruling:** `content/` goes to `docs/plans/<slug>/companion/<session-id>/`.
`state/`, `.last-port` and `.last-token` go under `.fx/<slug>/companion/`, which is
ignored. The stop script's deletion guard stays byte-identical and still correct,
because neither location is under the temp prefix it tests.

**A second defect in the same task: it never says where `<slug>` comes from.** The
companion starts mid-interview, often before the design's slug directory exists.
The script must never guess by choosing an existing plan directory, since another
plan's directory is never ours to write. The slug comes from the caller, and the
brainstorm instructions pass it. With no slug supplied, the script uses a location
clearly named as a companion session rather than a plan, and says so.

Cost if wrong: one extra flag and a second directory to reason about. Caught by
task 04's review, which is told to prove from a scratch git repository that no
token, PID or log file appears as untracked or staged.

## Ruling U: the user's decision on the measurement

Asked with the measurement report on disk first. The user chose to **ship the lens
narrowed to group 6 now**, rather than first settling the pass the control
omitted, or shipping no lens.

What that commits the build to, recorded so it is not rediscovered later:

- The lens narrows to one hunt group: producers and schedulers that add work
  without regard to how far behind consumers are. Groups 1 to 5 leave its hunt
  list; those defects belong to the correctness and adversarial passes branch
  review already runs, which found them in every run.
- **The keep is provisional**, and every place that cites the evidence says so:
  the control omitted the broad branch reviewer, which checks scalability.
- ADR 0014, written in task 06, records the measurement, including that the
  separate lens now carries a single group.
- The narrowed lens is a changed document, so it gets one blind smoke run
  confirming it still finds group 6. Not a second full measurement, which the
  user declined.
- Narrowing is a write, so it waits for task 04 under Ruling N. It is round 4 on
  task 05, so the fix loop calls for a fresh implementer one tier up.

## Task 04: dispatched under Ruling T

Launch confirmed. Top tier, because the task is security-relevant and needs
design judgment about where the slug comes from. Its brief carries Ruling T's
split and five proofs, the one that outranks the rest being that no token, PID,
port or log file appears in `git status` of a scratch repository.

## Task 07 fix round 2: verified, packaged

Checked from git: `323f02e` touches `references/audit-template.md` only and
carries no trailer. The target count at line 115 reads
`**Target count:** <N> stated targets named in the` and continues onto the next
line; the module count stands at line 161. No mention of the design template.
Leaf gate and prose gate on the file both exit 0. Packaged at
`.fx/2026-09-11-fx-audit/review/ecf1312..323f02e.diff`, based on the fix commit's
own parent.

Task 07 fix round 2 scoped re-review: dispatched, launch confirmed. Mid tier,
read-only, told not to run `check-all` because task 04 is editing that script.
Asked specifically whether "the brief the audit was run with" is an anchor a
reader of a finished audit can actually find, and to judge the implementer's
argument about the sources line rather than accept it.

## Task 07 fix round 2: half closed, and the half left open exposes a plan gap

Scoped re-review: **NOT ADDRESSED overall.** The feature half of the gap table's
count is closed: it anchors to `01-current.md`'s feature and business-rule
inventory, and `02-reference.md`'s when one exists. The target half is not.
Checked against the file rather than taken from the review:
`references/audit-template.md:115-117` says the targets are "named in the brief
the audit was run with; that brief lives outside this document". No skeleton
records that brief. `02-reference.md` records `Resolved from` and `Read at`, and
`03-gaps.md` records `Compared against`, which names the reference and not the
targets. A reader of a finished audit has nothing to open, so only the author can
check that half, which is the original finding exactly.

The re-review accepted the implementer's argument about the sources line: an
explorer count is the dispatching agent's record of its own run, with no separate
fact it could understate against. Not a finding.

**The gap behind it.** Nothing in the plan says how stated targets reach an audit.
Task 08's command is `/fx:audit [target] [--against <path|ref|branch>]`, and its
`[target]` is the codebase to audit, not the goals the gap table judges against.
The template counts stated targets; no task defines an input carrying them. The
two tasks also use one word for two things.

## Ruling V: stated targets are quoted into the audit, and task 08 must capture them

1. `03-gaps.md` gains a `Stated targets` field in its header, beside
   `Compared against`: every target quoted verbatim, one per line, plus where the
   brief came from, such as the invocation text or a file path the user gave.
2. The gap table's target count anchors to that field.
3. Task 08's command obtains the stated targets and fills that field. If the
   invocation carries none, it asks at the phase one gate rather than inventing
   them.
4. Task 08's codebase argument stops being called a target anywhere, so the word
   means one thing across both tasks.

This is not the free list the implementer rightly declined to add. A verbatim
quotation with a recorded source is what `02-reference.md` already does for its
reference, and a reader can check the quote against what they actually asked for.

Cost if wrong: one field in the template and one input the command must handle.
Caught by task 07's round 3 re-review, which checks the field and the anchor, and
by task 08's review, which is handed this ruling as a requirement.

Round 3 is a write and waits for task 04 under Ruling N.

## Task 04: landed and verified, two concerns go back before review

Commit `0517c81`, five files, no trailer. Verified myself:

```
check-artifacts   exit=0, 6 exempted, nothing names the temp directory
check-all         exit=0, five check gates, ALL GREEN
guard line        stop-server.sh:118 unchanged apart from its marker
server.cjs        only localhost URLs are built; no third-party host
.superpowers      no occurrence left under skills/fx-brainstorm/
```

Ruling T's split held and all five of its proofs are in the report. The slug
arrives as `--slug`; without one, mockups go to `docs/plans/_companion-unfiled/`
and the script says so, and neither plan scanner treats that as a plan.

**A correction to my own task file.** Task 04 said `check-all` would show six
gates. Under Ruling A it runs five: manifest, paths, reference leaves, prose and
now artifacts. The implementer did not pad the count, which was right. For task
09: `README.md`'s gates block lists five, four of the gates `check-all` runs plus
the manually run `check-collisions`, and no `check-artifacts`; after task 09 adds
it, the block lists six while `check-all` runs five. Both numbers will be correct
and describe different things. *(Corrected in place: this line first said the
README already documented six gates. A grep of `README.md:194-198` disproved it.)*

The implementer removed the footer's GitHub link along with the logo, following
my criterion of no `https://` at all. My own step 7 said a link is not a fetch, so
the task contradicted itself. Accepted as done.

**Concerns measured, not repeated:**

- **Em dashes: pre-existing, deferred.** Counts before and after `0517c81` are
  identical in every touched file. They belong to the recorded finding that
  `check-prose` never reads shell or JavaScript.
- **Third-party images: a real violation, kept in this task.**
  `skills/fx-brainstorm/visual-companion.md:278` tells agents to use "actual
  images (Unsplash)" in mockups, which makes the browser fetch from a third
  party. Same defect class as the logo this task removed, in a file it touched.
- **Unignored `.fx/`: a real gap in Ruling T's guarantee.** `start-server.sh`
  lines 155 to 158 only warn when `.fx/` is not ignored, then write the session
  key there anyway.

## Ruling W: the companion makes its own state directory ignored before writing the key

When the project is a git repository and `.fx/` is not ignored, the start script
adds the entry to the repository's local exclude file, located with
`git rev-parse --git-path info/exclude` so it works inside a worktree, says it did,
then proceeds. It never edits the project's `.gitignore`. When the project is not
a git repository, nothing can be committed and it proceeds unchanged.

This is `fx-implement`'s existing precedent, which puts `.fx/` and `.worktrees/`
in `info/exclude` for exactly this reason: local, uncommitted, invisible to
generators, and leaving the project's own ignore file for the project.

Cost if wrong: one line appended to a local file the user did not ask to have
changed. Caught by task 04's review, which checks the append is announced,
idempotent and never touches `.gitignore`.

**Deferred for the final review:** passing the old single-directory path to the
stop script leaves a server running; the page footer still reads "Superpowers
vunknown"; `lib/plan-state.js` scans at most 20 plan directories, which predates
this branch.

Task 04 pre-review fix: dispatched, resume confirmed. The original implementer,
while its context is still loaded, since task 07's original implementer became
unreachable after a delay. Carries the third-party image guidance at
`visual-companion.md:278` with a mirror search across `skills/fx-brainstorm/`,
and Ruling W with its proof in a scratch repository that has no ignore rule for
`.fx/`. It is the only writer until it reports.

## Task 04 pre-review fix: landed and verified

Commit `31a9cb6`, two files, no trailer. Verified myself:

```
remote hosts under skills/fx-brainstorm   none; line 50 only warns against a bare http://host:port
known asset hosts                         none
writes to .gitignore in start-server.sh   none; every mention is a comment or an error message
exclude and refusal logic                 start-server.sh:157-174
check-artifacts                           exit=0, 6 exempted
```

It went one step past Ruling W, and I accept it: when `.fx/` is still not ignored
after the exclude line is written, because a `.gitignore` rule re-includes it or
git predates path-format support, the script refuses to start rather than leave
the key committable. That is Ruling T's guarantee failing closed. It also proved
two cases unasked, a linked worktree and an exclude file with no trailing newline.

The image guidance now points at user-supplied images copied beside the mockup
and served locally, or labelled placeholders.

Task 04's two commits are adjacent, `0517c81` then `31a9cb6`, so the whole task
packaged cleanly at `.fx/2026-09-11-fx-audit/review/323f02e..31a9cb6.diff`, two
commits and five files, all task 04's.

Record committed `9c426e7`: the ledger, the measurement record, the measurement
report and task 07's second-round findings, staged by name while no writer held
the index.

## Dispatched after 9c426e7, each launch confirmed before this entry

- **Task 04 review**, top tier, because the diff decides where a session key
  lives and spans five files of shell, JavaScript and instructions. Handed
  Rulings T and W as requirements. Told to prove behaviour in a scratch git
  repository outside this checkout, including the fail-closed path and what
  `--slug` accepts, never to start the companion here, and not to run
  `check-all` while a writer edits `references/`.
- **Security lens on task 04's diff**, because the diff is credential handling:
  where the key and token land, the exclude-file write, `--slug` becoming part
  of filesystem paths, and what the server will serve.
- **Task 07 fix round 3 under Ruling V**, resuming the round 2 implementer, which
  carries the context. The only writer. It adds the `Stated targets` field to
  `03-gaps.md` and anchors the target count to it, and was told not to edit
  anything for task 08.

Queued for the writer slot after task 07: task 05 round 4, narrowing the lens
under Ruling U.

## Task 07 fix round 3: landed and verified

Commit `4edc104`, `references/audit-template.md` only, no trailer. Read at the
lines themselves:

- `03-gaps.md`'s header now carries a **Stated targets** field at line 110,
  beside **Compared against**: every target named in the brief, quoted verbatim,
  one per line, each followed by where it came from, either the invocation text
  or the path of a file the user pointed to, never paraphrased, with the fixed
  fallback "None: the brief named no targets."
- The target count at lines 120 to 122 is now "the number of target lines
  recorded in this report's own **Stated targets** field above, not a count
  composed for this table".

No mention of the design template. Leaf gate and prose gate on the file both
exit 0. Packaged at `.fx/2026-09-11-fx-audit/review/9c426e7..4edc104.diff`,
based on the fix commit's own parent.

## Task 05 round 4: dispatched

Launch confirmed. A fresh implementer on the top tier, which is what the fix loop
calls for from round 4. It carries Ruling U: narrow the hunt list and triggers to
group 6, add a scope note to `KEY.md` without changing any of its six rows,
record the measurement and its provisional status in the test README, and run
exactly one blind smoke check against row 6 using the unchanged brief and subject
copy. It is told to stop and report rather than adjust the lens if that one run
misses row 6, and to invoke `fx-authoring` before editing the lens. The only
writer.

Task 07 fix round 3 scoped re-review: dispatched, launch confirmed. Mid tier,
read-only, not to run `check-all` while task 05 edits files it reads. Asked
whether the target count is unambiguous when each target carries its source, and
whether the "None" fallback reads as zero targets.

## Task 04: security lens returned, both key findings verified

Lens result: 1 Important, 2 Minor. It cleared, by reading the code, the `--slug`
validation, file serving including symlink and hard link rejection, file
permissions, and the exclude-file write itself.

**Important, confirmed at the code: the guarantee fails open when git cannot
answer.** `skills/fx-brainstorm/scripts/start-server.sh:159-176` is one block
guarded by `git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree && ! git ...
check-ignore ...`. When `rev-parse` fails because git is missing from `PATH` or
refuses a repository owned by another user, the whole block is skipped: no
exclude line, no refusal. The script then creates the directories at line 184
and the server writes the key. The script cannot tell "not a repository" apart
from "git would not answer".

**Minor as filed, verified by experiment, upgraded to Important: the fail-closed
recheck runs before the directory exists.** In a scratch repository whose
`.gitignore` holds `.fx/*/companion` followed by the directory-only re-include
`!.fx/*/companion/`:

```
check-ignore on the path before mkdir     exit=0   reported ignored
check-ignore on the same path after mkdir exit=1   not ignored
check-ignore on the token file inside     exit=1   not ignored
git status                                ?? .fx/s/companion/.last-token
```

So the refusal at line 172 passes, the `mkdir` at line 184 creates the directory,
the re-include takes effect, and the session key is committable. **It defeats the
exact check the pre-review fix added.** It needs an unusual ignore file, but the
consequence is identical to the Important above, and severity follows
consequence, so it is upgraded.

**Minor, deferred to the final review: third-party requests are forbidden in the
documentation, not enforced by the server.** The only content security policy
sent is `frame-ancestors 'none'`. A remote script placed in a mockup would run
on the same origin and could read the key from `sessionStorage`. Minor findings
never enter the fix loop.

**Task 04's fix round waits deliberately.** Its top-tier reviewer is still reading
the same code, so both Importants go into one round together with whatever the
review returns, rather than onto code that changes under the reviewer. The writer
slot is also held by task 05.

## Task 07 fix round 3: addressed, and two warning items resolved by me as real gaps

Scoped re-review: **ADDRESSED, no new breakage.** Both halves of the gap table's
count now anchor to something recorded inside the audit's own output. Findings at
`docs/plans/2026-09-11-fx-audit/findings/07-fix-round3-findings.md`.

It left two items it could not verify from the diff. The lane makes those mine to
resolve before the task completes. Both are resolved against the wording I read
at `references/audit-template.md:110-124`:

1. **"Each line followed by where it came from" admits two layouts.** The source
   can share the quote's line or sit on the next one. In the second layout "the
   number of target lines" can be counted as N or as 2N. **A real gap.**
2. **The fallback "None: the brief named no targets." is never said to count as
   zero.** A literal reader can count it as one target line. **A real gap.**

## Ruling X: the template states the field's line layout and its empty count

The re-review suggested leaving both for task 08, the command, to define. Ruled
otherwise, because the design splits the work deliberately: the template owns the
shape of every document, the command owns when and how it fills them. How one
field's lines are laid out and counted is shape. Deferring it to the command makes
the command a second definition of the template's format, which is the
duplication task 07's first finding already removed once.

Task 07 goes to **fix round 4**: the template states one layout for a target and
its source, states that the count is the number of targets in that layout, and
states that the fallback counts as zero. Per the fix loop, rounds 4 and 5 use a
fresh implementer one tier up. Queued for the writer slot after task 05 round 4,
and ahead of task 04's fix round, because task 08 waits on task 07 while only
task 09 waits on task 04.

Cost if wrong: one more round on a task already at three, for two sentences.
Caught by round 4's scoped re-review, which checks the count can be taken from a
finished field in exactly one way.

## Task 04: review approved, and three Importants go to fix round 1

Task reviewer: **Approved. 0 Critical, 0 Important, 4 Minor.** Findings at
`docs/plans/2026-09-11-fx-audit/findings/04-companion-findings.md`. It ran the
scripts in scratch repositories rather than reading them: file placement with and
without a slug, restart reuse of port and key, stop behaviour, Ruling T's
`git status` proof, Ruling W's idempotency and linked worktree, the refusal path,
and seven hostile slugs, all correct. It went beyond Ruling W and judged the
refusal right.

Two of its Minors do not stay Minor once set beside the security lens.

**Reviewer Minor 2 is the lens's Important, confirmed a second time by running
it.** With git missing from `PATH`, the server started and `git status` listed
`.last-token`, the PID file and the log as untracked. Severity follows
consequence, and the consequence is a committable session key.

**Reviewer Minor 1, verified against both versions and upgraded to Important.**
Before task 04, every documented invocation in `visual-companion.md` passed
`--project-dir /path/to/project`, at lines 38, 64, 73, 80 and 89. After it, the
same five pass only `--slug <slug>`, and `start-server.sh` defaults the project
directory to the current directory at line 76. The examples call the script by
the relative path `scripts/start-server.sh`, which resolves only from the skill
directory, and `SKILL.md` offers no other route. So an agent following the
instructions runs it from `skills/fx-brainstorm/`, and the mockups and `.fx/` land
inside the plugin instead of the project's plan directory. The task existed so a
user could return to their mockups; following its own instructions defeats that.

**Fix round 1 findings, all Important:**

1. **Git unable to answer fails open.** `start-server.sh:159-176` skips the whole
   ignore block when `rev-parse` fails, so a missing git or a repository owned by
   another user leaves the key committable. The script must tell "not a
   repository" apart from "git would not answer", and refuse in the second case.
2. **The ignore recheck runs before the directory exists.** A directory-only
   re-include rule reports the missing path as ignored and then un-ignores it once
   `mkdir` runs, leaving `.last-token` committable, as recorded above.
3. **The documented invocation writes into the plugin.** Every documented start
   must name the project root, and the script must not accept its own skill
   directory as a project root.

**Deferred to the final review, Minor:** `--slug` as the final argument hangs on a
`shift 2` copied from an existing option with the same defect; the refusal message
names one cause when there are two; the server enforces no content security policy
against third-party requests; plus the earlier deferrals, which are the footer
text, the stop script given the old path, the plan-scan cap and the pre-existing
dashes.

Fix round 1 resumes the original implementer, falling back to a fresh one if it
cannot be reached. Queued for the writer slot behind task 05 round 4 and task 07
round 4.

## Task 05 round 4: landed and verified

Commit `fe48167`, four files, no trailer: the lens, `fx-review`'s section 2,
`KEY.md` and the test README. Verified myself:

```
six KEY.md table rows vs d496d1e   byte-identical
lens frontmatter                   tools Read, Grep, Glob, Bash; model opus
framework names in description     none
plugin.json mentions of the lens   0; check-manifest OK, agents undeclared
trigger row                        SKILL.md:95, narrowed, mode branch
prose gate on the four files       exit 0
```

The one smoke run, read from the report verbatim: row 6 found as finding 1 at
`worker.js:28`, naming the keyed mechanism and separating the status flip from
depth. Rows 1 to 5 appear only as `Ceded:` lines. `schema.sql` gets one ceded
line, which the key allows. Path list clean.

**Two things the review must judge, not me.** The implementer added a `Ceded:`
block to the output format, unasked, as a fixed slot. And that run produced 2
findings against 13 ceded lines, so the block restates most of what the other
branch passes report, which is the double-report risk task 05's own file names.

Task 05's commits interleave with task 07's on this branch, so the review
package is path-scoped to task 05's own paths, from `7d39c0b`, the parent of its
first commit `4501684`, at
`.fx/2026-09-11-fx-audit/review/task05-scoped-7d39c0b..fe48167.diff`.

Task 07 fix round 4 under Ruling X: dispatched, launch confirmed. A fresh
implementer on the top tier, told to change only `references/audit-template.md`,
to state one layout, one count and a zero count for the empty case, and not to
touch anything for task 08. The only writer.

Task 05 review: dispatched, launch confirmed. Top tier, read-only, told that
later rulings replace the task file's criteria where they conflict and to say
which, that Ruling B holds, and that the fixture and key rows are the committed
measurement record, never something to fix. Told not to run `check-all` or any
run against the fixture. Handed the `Ceded:` block and the provisional status as
named risks to judge. No lens dispatched alongside: the only trigger matches,
`*.sql` for the database lens and `catch` for the silent-failure lens, are in the
fixture, which Ruling B puts outside review.

## Task 07 fix round 4: landed and verified

Commit `e103db4`, `references/audit-template.md` only, no trailer, parent
`fe48167`, so nothing interleaves. Read at the lines themselves:

- **One layout.** The field is one entry line per target, in the fixed form
  `- "<target, verbatim>" from <source>`, with a placeholder line at 114 and a
  two-target example at 120 and 121. A target spanning lines in the brief is
  joined with spaces.
- **One count.** The target count is "the number of entry lines in this report's
  own **Stated targets** field above, one per target, so a field with no entry
  lines gives 0".
- **Zero for the empty case,** stated outright: the "None" line "is not an entry
  line and counts as zero targets".

No mention of the design template. Leaf gate and prose gate on the file both exit
0. The implementer ran `check-all` last, exit 0. It refused an injected trailer
request, and it skipped the authoring lane's repeated micro-tests, using grep
checks and a count of both examples instead.

**A concern that goes to the re-review as a named risk.** The `03-gaps.md`
skeleton is a fenced block from line 103 to 151, and the example lines and the
"None" line sit inside it. An author copying the skeleton literally carries two
invented targets and the empty-case line into a real audit together, which gives
a wrong count and a contradictory field. That is the same class of defect this
task's fix rounds exist to remove.

Packaged at `.fx/2026-09-11-fx-audit/review/fe48167..e103db4.diff`.

Record committed `41c0d7d`: the ledger and the task 04 and task 07 round 3
findings, staged by name while no writer held the index.

## Dispatched after 41c0d7d, each launch confirmed before this entry

- **Task 07 fix round 4 scoped re-review**, mid tier, read-only, not to run
  `check-all`. Asked to take the count from a finished two-target field and a
  finished empty field, and handed the example lines inside the skeleton's fence
  as a named risk.
- **Task 04 fix round 1**, resuming the original implementer, which was reachable.
  Carries the three Importants verbatim, requires refusal whenever git cannot
  answer while a non-repository still starts, the ignore check after the
  directories exist on the paths the server writes, documented starts that name
  the project root, and refusal of the skill directory but not the plugin
  repository root. Proofs run in scratch repositories under the job's own
  directory, proven outside every repository. The only writer.

Task 05's review is still running. Queued for the writer slot: task 06.

## Task files 06 and 08 checked before their briefs, three corrections

Checked against the repository while the writer slot is held.

- **Task 06, ADR 0014, quoted recommendation: accurate.** ADR 0008's last
  paragraph says to fold the app-layer material into `fx-lens-database`'s brief
  "rather than paying a second dispatch for it". But the task was written before
  Ruling U, so its brief must add that ADR 0014 records the measurement, the
  narrowing to one hunt group, and the provisional keep with its reason.
- **Task 06, ADR 0013, stack profiles: the task's claim is too strong.** It says
  stack knowledge "loads only when the machine facts name it". That holds for
  `fx-implement` at line 216 and `fx-tdd` at line 26, which load each entry in
  `stacks`. It does not hold for `references/stacks/web.md`, which `fx-design`
  cites at line 147 and `fx-review` adds as a second baseline at line 123 on their
  own conditions. The brief tells the implementer to state the loading rule as the
  files show it.
- **Task 08, the probe project: moves out of `/var/tmp`.** The task builds its
  scratch project at `/var/tmp/fx-audit-probe`. That is test scaffolding rather
  than an fx artifact, so no constraint strictly forbids it, but it is a system
  temp directory and the user's instruction on temp directories was emphatic. It
  goes under the job's own directory instead, which `git rev-parse` confirms is
  outside every repository. Cost if wrong: none, the path is scaffolding either
  way.

Task 08's brief also carries Ruling V's command half and the renaming of its
codebase argument. Its probe runs through `--plugin-dir` against the working
tree, so it is the first run that can dispatch `fx-lens-pipeline` by name; the
brief asks it to record whether that dispatch resolved, if a run reaches Phase 3.

## Task 07 fix round 4: both findings addressed, one new Important in the fix

Scoped re-review: **both of Ruling X's findings ADDRESSED.** A two-target field
and an empty field each yield their count one way only. Findings at
`docs/plans/2026-09-11-fx-audit/findings/07-fix-round4-findings.md`. The
implementer's two own concerns, targets joined with spaces and a 138-character
placeholder line, were judged not defects, and I agree: the join is stated in the
field and cannot change the count.

**New Important, confirmed at the file.** The named risk held. The `03-gaps.md`
skeleton is the fence from line 103 to 151, and lines 120 and 121 put two concrete
invented targets inside it, with the bare line "None: the brief named no targets."
at 126. Every other field in every skeleton is a bracketed placeholder or
description prose. An author filling the skeleton literally produces a field with
two invented entries and the empty-case line together: a count of 2 for a brief
that may have named none, and a field that contradicts itself.

The template already has the right form for a fallback. `01-current.md`'s
**Areas not covered**, lines 60 to 63, quotes its "None" line inline inside the
description prose, not as a bare line an author would copy.

## Ruling Y: the worked example leaves the fence, and the fallback is quoted like its sibling

1. Inside the `03-gaps.md` fence, the **Stated targets** field keeps its
   description, the one bracketed placeholder entry line, the joining rule, and
   the empty case, with "None: the brief named no targets." quoted inline in the
   prose the way **Areas not covered** quotes its own, never as a bare line.
2. The two-target example and the empty example move outside the fence, directly
   after it, under the section's own prose, labelled as a worked example of a
   finished field with the count each yields.
3. The count line is unchanged.

Cost if wrong: an example a reader must scroll past the skeleton to find. Caught
by round 5's scoped re-review, which checks that copying the fence literally
yields no invented target and no bare fallback line.

**This is round 5, the last the fix loop allows.** A fresh implementer on the top
tier. If its re-review does not close the task, the task goes to the user rather
than to a sixth round. Queued for the writer slot behind task 04's fix round 1,
and ahead of task 06, because task 08 waits on task 07.

## Task 05: review needs fixes, both Importants verified

Task reviewer: **Needs fixes. 0 Critical, 2 Important, 9 Minor, 5 cannot-verify.**
Findings at `docs/plans/2026-09-11-fx-audit/findings/05-lens-pipeline-findings.md`.
It confirmed the record is intact: key rows hash identical to `d496d1e`, fixture
unchanged, subject copy identical, no trailer on any of the six commits.

**Important 1, confirmed at the file.** `tests/lens-pipeline/KEY.md:9-17` cites
the measurement and never says the keep is provisional. Ruling U requires it of
every place that cites the evidence. `README.md:35-38` does say it.

**Important 2, confirmed at the lines it rests on.** The `Ceded:` block tells the
lens to list every other defect it notices, one line each, and the smoke brief
asked for nothing about cessions, so the 13 ceded lines came from the lens
wording. `skills/fx-review/SKILL.md:188` presents each pass "verbatim or lightly
cleaned" and `:199` says "Never merge findings across axes", so every ceded line
shows a second time under the pipeline heading and may not be merged away. The
existing lenses allow one unslotted line and no more:
`agents/fx-lens-database.md:30-31`, `agents/fx-lens-security.md:32-33`. It is the
double report task 05's own Risks section names, moved into a new slot. My round
4 brief asked the lens to cede groups 1 to 5 "the same way it already cedes to
other lenses" without saying where that line goes, which left room for the block,
and I handed the block to the review as a question instead of judging it in my
own verification.

## Ruling Z: task 05 fix round 5, its scope and the `schema.sql` criterion

1. **Both Importants are fixed.** `KEY.md`'s status section says the keep is
   provisional and why. The `Ceded:` block, its instruction, its template lines
   and its red flag go; defects owned by another pass are left out of the output.
   The ceding rules stay as the boundary statement they were.
2. **Four Minors join the round,** because they sit in the lines the fix rewrites
   or the fix alone would leave them contradicting it, the precedent of Ruling I:
   Minor 2, the keywords `rescue` and `re-raise` in the lens body, against the
   user's rule that the plugin is not stack-shaped; Minor 3, work enqueued inside
   a transaction named as `fx-lens-database`'s, ~~as `design.md` and that lens
   already say~~ *(struck in place: that lens hunts it, at
   `agents/fx-lens-database.md:78-80`, but `design.md:231-234` says the opposite,
   "reported here and the brief says the database lens sees it too". So this
   narrows the design rather than following it, and belongs beside stories 18 to
   22. Caught by the coverage audit.)*; Minor 4, the README and key disagreeing on `schema.sql`; Minor 7,
   the schema-shaped red flag, generalised to a file that adds no work to a queue.
3. **Minors 5 and 6 join too, in the README only.** The README is where the
   measurement is summarised, and it omits that the correctness pass stood in for
   `/code-review`, that the lens was read through a brief, and disclosures 2 and 4
   of the measurement record, which leave group 1's drop the weakest-backed. One
   sentence each. The same four go into ADR 0014 under task 06.
4. **The task's `schema.sql` criterion binds again:** the lens reports nothing
   about `schema.sql`. The reviewer is right that my acceptance of "at most a
   one-line cession" was never a ruling. With no cession channel it is also the
   natural result. The key's negative-control paragraph, outside the six rows, is
   aligned to it.
5. **One blind smoke run** on the changed lens, same brief and subject copy:
   row 6 found, none of rows 1 to 5 as a finding, nothing about `schema.sql`. A
   miss stops the round and is reported, not tuned.
6. **Deferred to the final review:** Minor 1, the performance paragraph reading
   as exhaustive; Minor 8, triggers that miss diffs slowing consumers; Minor 9, a
   Critical tier that most scheduled producers meet by default.

Cost if wrong: a stricter lens than its siblings, which may omit one line a
reader would have wanted. Caught by round 5's scoped re-review and the smoke run.

This is round 5 on task 05, the last the fix loop allows, after four rounds under
Rulings O, Q, R and U. A fresh implementer on the top tier. If the re-review does
not close it, it goes to the user. Queued behind task 07's round 5.

## Ruling AA: in the audit, queue correctness beyond unbounded enqueue has no pass

The lens cedes head-of-line blocking, redelivery, poison messages, lease timing
and retry jitter to the correctness and adversarial passes branch review runs. The
audit's Phase 3 dispatches only this lens and `fx-architecture`, so in an audit
those passes do not exist. That follows from Ruling U; it is not a wording defect
in task 05.

Not fixed by adding a pass to the audit: that changes the design the user approved
("and no other lens"), and costs a dispatch the user was never shown. Instead:

- **Task 08's command states it** as part of its boundary: the gap report judges
  queue behaviour beyond unbounded enqueue only as far as the phase's own reading
  reaches, with no dedicated pass behind it.
- **ADR 0014 records it** as a cost of narrowing.
- **The completion report parks it for the user** as a decision: add an
  adversarial pass over the file set to Phase 3, or accept the gap.

Cost if wrong: an audit that misses a queue defect a dedicated pass would have
caught, stated rather than hidden. Caught by the user at the completion report.

## Task 04 fix round 1: landed and verified

Commit `77f8b3e`, three files under `skills/fx-brainstorm/`, no trailer, parent
`41c0d7d`. Verified myself:

```
bash -n start-server.sh              exit 0
documented starts                    visual-companion.md:41,67,76,83,92,100, all
                                     bash <skill-dir>/scripts/start-server.sh --project-dir <project-root>
skill-directory refusal              start-server.sh:85-88
git cannot answer                    start-server.sh:167-184, looks for a .git entry at or above the project
ignore check after mkdir             start-server.sh:199-205, on each state file path
check-artifacts                      exit 0, 6 exempted
```

`SKILL.md:181` still mentions `scripts/start-server.sh`, in a sentence that goes
on to say how to call it; left to the re-review, which is asked about it.

**One departure, accepted provisionally.** The re-include reproduction now starts
instead of being refused: with the check after `mkdir`, the exclude line it
appends makes git ignore the session files, and `git status` stays clean. The
refusal is proven on a variant the exclude line cannot fix. The re-review is
asked to run it, not accept it.

Concerns handed to the re-review as named risks: a stray `.git` above a
non-repository refuses it; a refused start leaves the exclude line and an empty
directory; three state files are not checked one by one; `<skill-dir>` depends on
the agent knowing the skill's base directory.

The implementer called `check-artifacts` with `bash`, which is Python; it hung and
was killed with nothing left behind. The report's output is from a direct run.

Record committed `89aa044`: the ledger and the task 05 and task 07 round 4
findings.

## Dispatched after 89aa044, each launch confirmed before this entry

- **Task 07 fix round 5 under Ruling Y**, a fresh implementer on the top tier,
  the last round. Carries a copy test: the fence copied literally holds no
  invented target and no bare fallback line. The only writer.
- **Task 04 fix round 1 scoped re-review**, top tier because it judges shell
  control flow guarding a session key. Told to run every case itself in scratch
  repositories under the job's directory, never to start the companion in this
  worktree, and not to run `check-all`. Handed six named risks.

Queued for the writer slot: task 05 round 5 under Ruling Z, then task 06.

## Task 07 fix round 5: landed and verified

Commit `85901b9`, `references/audit-template.md` only, no trailer, parent
`89aa044`. The copy test, run by me on the first `markdown` fence under the
`03-gaps.md` heading:

```
fence lines copied           40, from "# Gap report: <slug>" to the lens findings line
entry-shaped lines           1, the bracketed placeholder
bare None lines              0
worked-example text          0
markdown fences in section   3: the skeleton, then the two worked examples after it
```

My first attempt at this test printed zeros because `in` is a reserved word in
awk and the script never ran. Those zeros were not a result, and the table above
is from the corrected run.

The empty case is now quoted inline at the end of the paragraph, as **Areas not
covered** quotes its own. The worked examples sit after the closing fence in two
labelled `markdown` fences, each stating its count. No mention of the design
template; leaf and prose gates exit 0. Packaged at
`.fx/2026-09-11-fx-audit/review/89aa044..85901b9.diff`.

The implementer's concern goes to task 08's brief: the section now holds three
`markdown` fences, so the command must identify the skeleton as the first.

## Dispatched after 85901b9, each launch confirmed before this entry

- **Task 05 fix round 5 under Ruling Z**, a fresh implementer on the top tier,
  the last round. Carries the record-integrity proofs, one blind smoke run with a
  fixed prompt, and an instruction to stop rather than tune if the run misses row
  6 or reports rows 1 to 5. The only writer.
- **Task 07 fix round 5 scoped re-review**, mid tier, read-only, not to run
  `check-all`. Told to run the copy test itself and to judge whether a finished
  field has one form or two.

## Task 04: complete, fix round 1 closed

Scoped re-review: **all three findings ADDRESSED, 0 Critical, 0 Important, 1
Minor.** Findings at `docs/plans/2026-09-11-fx-audit/findings/04-fix-round1-findings.md`.
Every case was run in scratch repositories under the job's directory, not read:

- git removed from `PATH`, and git refusing the repository for ownership: both
  refused, nothing written, `git status` empty;
- the ledger's re-include rules: starts, and all session files show as ignored
  while running and after stop, because no `.gitignore` pattern matches `.fx`
  itself, so the exclude line ignores that directory and git never looks inside
  it. My provisional acceptance of the implementer's departure stands;
- a rule the exclude line cannot fix, `!.fx/` first: refused;
- the skill directory, through a symlink, a trailing slash or a subdirectory:
  refused; the plugin root and lookalike siblings: not refused;
- the documented start as printed, from another directory: files land in the
  project's plan directory. `<skill-dir>` resolves on both runtimes, since each
  prints the skill's base directory when it loads.

**Deferred to the final review, Minor, added to task 04's earlier list:**

- `start-server.sh:172` merges git's stderr into the answer, so a healthy
  repository with `GIT_TRACE` set is refused. It fails closed and names the cause.
- `server-instance-id`, `events` and `server-stopped` are not checked one by one,
  and a deliberate re-include rule naming them makes them committable while the
  checked files stay ignored. The reviewer searched all three for the key and
  found it in none, so Ruling T holds; `events` holds the user's click choices.
- An empty `.git` directory above a non-repository project refuses it, naming the
  path. Rare, and closed rather than open.
- A refused start leaves the exclude line and an empty state directory.

Task 04 is complete: review approved with its Minors, and fix round 1 closed.

## Task 07: complete, fix round 5 closed

Scoped re-review: **ADDRESSED, 0 Critical, 0 Important, 1 Minor.** Findings at
`docs/plans/2026-09-11-fx-audit/findings/07-fix-round5-findings.md`. Its own copy
test matches mine: one bracketed placeholder, no bare "None" line, no example
text. The table of contents and every other section are unchanged, and the count
line is byte-identical to round 4's.

**Deferred to the final review, Minor:** the worked examples at
`references/audit-template.md:146-163` show the field as a bare label with the
entries below, while the sibling count fields at `:123-129` keep their sentence
with only the number filled in. Both examples still count correctly, and it sits
outside the fence an author copies.

For task 08's brief: the section holds three `markdown` fences, and the skeleton
is the first.

Task 07 is complete, at the fifth and last round.

## Task 08's probe run, checked against this machine before its brief

Three more corrections to the task file, found by checking the CLI and the plugin
install rather than trusting the step text.

1. **The probe points at the wrong checkout.** Steps 2 and 4 pass
   `--plugin-dir /development/fx`, which is the main checkout on the base branch.
   It has none of this branch's work, so the green run could never find the
   command, and any run that did would be testing stale files. The brief passes
   the worktree, `/development/fx/.worktrees/fx-audit`.
2. **`--max-turns` is unconfirmed.** Claude Code 2.1.268's `--help` does not list
   it. `claude --max-turns 1 --version` exits 0, but a version request may return
   before other options are validated, so that proves nothing. The implementer
   confirms it in the first real run and reads the run's own output for an
   unknown-option error, or bounds the run another way the CLI documents.
3. **Two copies of fx would load.** The cache holds `fx@fx`, and it is enabled in
   the user settings. `--plugin-dir` adds the worktree copy for that session
   alongside it. The command and `fx-lens-pipeline` exist only in the worktree
   copy, so resolving either proves the worktree loaded. Every skill and hook
   exists in both, so the brief requires the implementer to establish which copy
   served the run, and to disable the cached copy for that session only if the
   CLI documents a way. It never changes the user's settings.

Cost if wrong: a probe that reports green on the wrong files. Caught by task 08's
review, which is handed these three.

## Task 09's counts, checked on disk before its brief

```
skill directories          12; plugin.json declares 11, fx-design undeclared
agents/*.md                6
commands/*.md              4, task 08 makes 5
references markdown files  21 across references/, vocab/ and stacks/
scripts/check-*            7: five check-all gates, check-collisions, check-all
README Layout              skills 11, agents "4 review lenses", commands 3
README Gates block         5 listed, no check-artifacts (README.md:194-198)
README Tests block         no mention of the lens fixture
SURFACE headings           Lanes: 10, Agents: 5, Commands: 4, References: 24
```

Task 09's stated mismatches all hold. My own earlier line about the README's gate
count did not, and is corrected in place in the task 04 entry.

**Checked further in `SURFACE.md` itself:**

- **"Lanes: 10" is correct.** Its table lists ten lanes, and `prototype` and
  `research` are the two under "Procedures: 2": twelve directories. The stale
  number is the README's "skills/ 11: 9 lanes plus prototype and research", from
  before `fx-design`.
- **"References: 24" matches nothing on disk,** and the section under it is stale
  as a whole. Disk holds 22 files under `references/`: 21 markdown files plus
  `vocab/condition-based-waiting-example.ts`. The section's listing shows one
  template and nine vocab entries, and its "Missing" line says
  `references/stacks/*.md` does not exist, when six stack profiles do.

**Ruling for task 09's brief:** the References count, its listing block and the
"Missing" line are corrected together from `ls`, because the listing is the
inventory the count summarises and the "Missing" line would contradict both. The
count states what it counts. Everything else in that section, and the wider
stale-document sweep, stays out of scope as the task says. Cost if wrong: one
sentence of prose touched beyond a pure count. Caught by task 09's review.

`fx-design` missing from `plugin.json` is the finding recorded at the start of
this build, out of task 09's scope, and goes to the completion report.

## Task 05 fix round 5: landed and verified

Commit `fca4cf9`, three files, no trailer, parent `85901b9`. Verified myself:

```
fixture vs d496d1e                    unchanged, exit 0
KEY.md table rows sha256              76ff72b9ba2f6141 at d496d1e and at fca4cf9
lens frontmatter vs fe48167           identical
"Ceded:" in the lens                  0
rescue, re-raise, rethrow             0
transaction ceding line               present, owner fx-lens-database
KEY.md status section                 says the keep is provisional and why
KEY.md negative control               "The pipeline lens reports nothing about this file."
README                                disclosures 2 and 4, the stand-in, read through a brief
plugin.json                           untouched; check-manifest OK
prose gate on the three files         exit 0
```

The implementer departed from the review's wording three times and said so: the
scope sentence states what the output holds rather than what it leaves out,
following `fx-authoring` on negation; the error-handler line avoids "rethrow",
itself a keyword; and Minors 5 and 6 are four sentences, one per point.

The smoke run: row 6 found as finding 1 at `worker.js:28`; finding 2 at
`worker.js:24` names a second producer that never reads depth, which is row 6's
mechanism and not row 1's head-of-line blocking, though it draws on the line 22
comment; none of rows 1 to 5 as a finding; no `Ceded:` block; paths clean.

## Ruling AB: a line saying a file adds no work to a queue is not a report on it

The smoke run wrote "`schema.sql` adds no work to a queue, so there are no
findings for it." Read literally, the README's regression signal, "reports
anything about `schema.sql`", counts that line as a regression.

Ruled not a regression. ~~The lens's Output section already tells it to say in
one line when nothing adds work to a queue; the run applied that to one file.~~
*(Struck in place: the Output section asks for that line only when nothing in
the whole file set adds work, and `worker.js` does, so it does not license a
per-file line. Caught by task 05's round 5 re-review. The ruling rests on the
reason that follows.)* The line names no defect in the file's contents and
repeats no other pass's finding, which is what task 05's Risks section wanted the negative control to
prove: that the lens "stays silent on a schema-only change". A finding, a
cession, or any claim about what the file contains is still a regression.

Not fixed in this round, because the round is closed and the fix is one clause in
a test README, not in the lens. If the re-review judges the oracle's two readings
Important, the task goes to the user as the fix loop requires, with this ruling
attached.

Cost if wrong: a future run that states one file is out of scope is misread as a
pass or a failure. Caught by task 05's re-review, which is handed this line.

Record committed `eb4bd91`: the ledger and the task 04 and task 07 closing
findings, staged by name while no writer held the index.

## Dispatched around eb4bd91, each launch confirmed before this entry

- **Task 05 fix round 5 scoped re-review**, top tier because it is the last round
  and judges lens wording. Launched just before the record commit; read-only, so
  the index was never shared. Handed Ruling AB's line, finding 2 at
  `worker.js:24`, the implementer's three wording departures, the new red flag,
  "cron" in the body, and the record-integrity proofs to run. Not to run
  `check-all`, and no run against the fixture.
- **Task 06**, top tier, launched after the commit. The only writer. Its brief
  says the ledger wins where the task file predates the measurement: ADR 0014
  records Ruling U's measurement, the narrowing, the provisional status with its
  reason, Ruling Z's four qualifications and Ruling AA's audit gap; ADR 0013
  states the stack-profile loading rule as the four skill lines show it; ADR 0008
  gets one added line, proven by `git diff --numstat`.

Queued for the writer slot: task 08, then task 09.

## Design read against task 08, three more things for its brief and the report

Read `design.md` lines 67 to 221 against task 08's acceptance criteria. The
criteria match the design's four phases, the documents-as-state resume, Phase 2's
path-or-worktree resolution, Phase 4 writing `design.md`, the two composed
templates, and the sound-architecture outcome. Three things do not follow from
the task file alone.

1. **User stories 18 to 22 describe a lens that no longer ships.** They ask for a
   lens that checks head-of-line blocking, double sends, exhausted jobs with no
   dead letter, work enqueued inside a transaction, and correlation identifiers.
   Under Ruling U the lens asks only whether a producer reads the backlog. Those
   stories are superseded by the measurement, not met, and the completion report
   says so rather than counting them delivered. Stories 23 to 27 still hold.
2. **`fx-architecture` is a skill, not an agent.** Design and task both say Phase 3
   "dispatches" it. A skill is invoked, not dispatched, so task 08's command has to
   dispatch a read-only subagent that invokes `fx:fx-architecture` by its
   addressable name on the file set, and the brief says so. Any HTML report that
   skill writes lands in the audit's slug directory under task 03's
   `report-<timestamp>.html` convention, beside the report Phase 4 writes. The two
   are different documents, a review of what exists and a rendering of the
   target, so the command says which file is which rather than leaving two
   same-shaped names for a reader to tell apart.
3. **`fx-architecture` is interactive, and a subagent cannot reach the user.**
   Checked at the skill: it writes a fresh report every run
   (`skills/fx-architecture/HTML-REPORT.md:24`), opens it and prints the path
   (`:28-34`), and presents candidates for the user to pick before any grilling
   (`SKILL.md:75` onward). Inside an audit that loop has nobody to answer it. The
   brief requires the command to bound the invocation: the subagent stops once
   the candidates are written, returns the report path and a short summary, and
   the choice among candidates waits for the Phase 3 gate, where the user is.

**Baseline for task 08's step 6:** `python3 scripts/check-paths` reports 53
reference citations at `eb4bd91` plus task 06's work in progress, which touches
no citation. The command's two template citations should make it 55.

## Task 05: complete, fix round 5 closed

Scoped re-review: **all findings ADDRESSED, 0 Critical, 0 Important, 1 Minor.**
Findings at `docs/plans/2026-09-11-fx-audit/findings/05-fix-round5-findings.md`.

- Both Importants and all six promoted Minors addressed at the lines it cites; no
  `Ceded` or cession anywhere in the plugin; the smoke run went from 13 ceded
  lines to none.
- Record integrity run, not read: fixture unchanged since `d496d1e`, and the
  `KEY.md` table rows hash identically at `d496d1e`, `85901b9`, `fca4cf9` and in
  the working tree.
- Finding 2 at `worker.js:24` names depth and never a shared lane or ordering, so
  it is row 6's mechanism, scored correctly.
- The three wording departures each do what their finding needed. "cron" is a
  generic scheduling term, beside "scheduled" each time.
- **Ruling AB's outcome held and its first reason did not.** Struck in place
  above.

**Deferred to the final review, Minor:**

- `tests/lens-pipeline/README.md:50-52` and `KEY.md:40-41` state the regression
  signal in words that read two ways: "reports anything about `schema.sql`" for a
  line saying it adds no work, and "reports any of rows 1 to 5" for a finding
  cited on a row 1 line with row 6's mechanism. Ruling AB and the measurement
  record's scoring rule settle both, but the README points at neither.
- Out of the fix diff: the lens cedes per-record queries and enqueue inside a
  transaction to `fx-lens-database`, whose triggers do not fire on a worker-only
  diff, so on such a diff neither is reported. With Ruling AA and deferred Minor
  8.
- Out of the fix diff: smoke finding 2 was marked Important though no producer in
  the fixture checks depth, which the Important tier requires. With deferred
  Minor 9.

Task 05 is complete, at the fifth and last round. The lens ships narrowed to one
hunt group and provisional, as the user decided.

## Task 06: landed and verified

Commit `cbfb8eb`, three files under `docs/adr/`, +128 and no deletions, no
trailer, parent `eb4bd91`. Verified myself:

```
ADR 0008 numstat          1 0, one added line, nothing removed
ADR 0014 numbers          lens 5 of 5 on all six; control 5 of 5 on groups 1 to 4,
                          3 or 5 of 5 on group 5, 0 of 5 on group 6: as measured
ADR 0014 records          provisional status and reason, the four qualifications,
                          the audit gap from Ruling AA, branch mode for the dispatch cost
ADR 0013 loading rule     both rules stated: stacks entries for fx-implement and
                          fx-tdd, web.md on the work for fx-design and fx-review
check-prose docs/adr      exit 0
```

The implementer substituted its own failing test, because the task's RED was not
one, and said so.

**Finding outside every task, reproduced by me:** `python3 scripts/check-prose`
given a path that does not exist prints its OK line and exits 0. A mistyped path
passes the prose gate silently. It goes to the completion report beside the
gate's other two blind spots, prose after a `markdown`-tagged fence closer and
code files on a directory walk.

Packaged at `.fx/2026-09-11-fx-audit/review/eb4bd91..cbfb8eb.diff`.

Record committed `25b24b8`: the ledger and task 05's closing findings.

## Dispatched after 25b24b8, each launch confirmed before this entry

- **Task 06 review**, mid tier, read-only, not to run `check-all`. Handed the
  ledger requirements its brief carried, and eight named risks: every ADR 0014
  number, whether "superseded in part" is accurate when the narrowed lens hunts
  none of ADR 0008's listed items, Phase 3 claims about a command not yet built,
  the unsourced-looking claim about `/code-review`, the loading rule against the
  four skill lines, citation and shape, the substituted RED, and the unwrapped
  line.
- **Task 08**, top tier, the only writer. Its brief carries every correction the
  ledger holds for it: Ruling V's command half and the renamed codebase
  argument, `fx-architecture` as a bounded skill invocation, Ruling AA's
  boundary, the template's three fences, the exclude-file precedent for
  `.worktrees/`, the probe under the job's directory with `--plugin-dir` on the
  worktree, `--max-turns` to be confirmed from a real run, which fx copy served
  each run, containment checks after every nested session, three GREEN attempts
  at most, and the citation count moving from 53 to 55.

Queued for the writer slot: task 09.

## Coverage audit dispatched early, and the exit gate defined

**Coverage audit:** dispatched, launch confirmed. Top tier, read-only, one
question: does the design commit to any behaviour no task criterion or ruling
carries. It reads design, plan, all nine task files and the ledger's rulings, not
the implementation, so it does not need tasks 08 and 09 to be finished, and
running it now means a finding can still amend task 09's brief before dispatch.
Told what is already recorded, stories 18 to 22 under Ruling U and the audit gap
under Ruling AA, so neither returns as a discovery. Task 09 waits for its result
as well as for task 08.

**The exit gate, checked:** there is no CI configuration in this repository, no
`.github/`, no task runner. That is deliberate and recorded:
`docs/adr/0012-what-fx-deliberately-does-not-cover.md:23`, "No CI", with the gates
run by hand. So the exit gate is a fresh `scripts/check-all`, every exit code
read, plus `scripts/check-collisions` run and reported with its expected red and
the reason from Ruling A, rather than silently left out.

## Task 06: review needs fixes, one Important verified

Task reviewer: **Needs fixes. 0 Critical, 1 Important, 1 Minor, 3 cannot-verify.**
Findings at `docs/plans/2026-09-11-fx-audit/findings/06-adrs-findings.md`. Every
number in ADR 0014 was checked against `measurement-task05.md` line by line and
matches; ADR 0013's loading rule matches all four skill lines; the substituted
RED is valid.

**Important, verified against text already in this session.** ADR 0008's added
line reads "queue backpressure got its own lens, `fx-lens-pipeline`, instead of a
section in `fx-lens-database`'s brief, and the other items listed here stay
uncovered." "The other items" makes queue backpressure one of ADR 0008's listed
gap items. It is not: that list is jobs enqueued per record, N+1 inside view
partials, missing batched iteration, cache-key churn, `AsNoTracking` and
client-side evaluation. ADR 0014:43-45 says the narrowed lens hunts none of them.
The two records disagree about what changed. What 0014 actually overrides is
0008's principle, fold app-layer material into the database lens rather than pay
a second dispatch, for one concern that 0008 never listed.

**Minor, joining the round because it is the same line:** the added line is 229
characters, unwrapped, in a file wrapped near 80. Wrapping it keeps the change
additions only.

**The three cannot-verify items, resolved:**

- `check-all` exit 0 is taken from the report; the exit gate runs it fresh.
- ADR 0014:75-82 describes the audit's Phase 3 before task 08 builds it. Every
  clause traces to `design.md:187-189` and `:216-220` or Ruling AA. **Task 08's
  review is handed these lines** and checks the command matches them.
- The claim that a dispatched agent cannot invoke `/code-review` is sourced at
  `state.md:1219-1220` and the test README. Cleared.

**Fix round 1:** the added line states the part superseded accurately, keeps
"superseded in part" as the design worded it, removes nothing from ADR 0008, and
is wrapped. Proven with `git diff --numstat` showing no deletion against the
parent of `cbfb8eb`. It resumes the original implementer, falling back to a fresh
one, and is queued for the writer slot behind task 08 and ahead of task 09.

## Coverage audit: 87 commitments checked, 10 uncarried, each verified at its source

Findings at `docs/plans/2026-09-11-fx-audit/findings/coverage-audit.md`. It
confirmed the ledger already records stories 18 to 22 as superseded and Ruling AA
as parked. Every item below was checked against the file it cites before any
ruling.

**Amended into task 08, all verified:**

1. **The command costs nothing per turn** (`design.md:165`). Nothing requires it.
   `skills/fx-authoring/SKILL.md:292-297` states the mechanism: a user-invoked
   entry carries `disable-model-invocation: true`, otherwise it is a "permanent
   context load, every turn". None of the five commands carries it. The four
   that predate this plan go to the completion report.
2. **Resume after a sound verdict** writes no `design.md`, so a re-run would redo
   Phase 4; nothing says how a re-run finds its slug directory.
3. **Reports are committed** (`design.md:285`), but nothing commits them or tells
   the user they are untracked. The command must not commit, since it may run on
   the user's base branch.
4. **`fx-plan` needs an approved design** (`skills/fx-plan/SKILL.md:15-16`). The
   template's Status line reads `ready-for-agent`, and approval happens at a gate,
   so Phase 4's gate is where `design.md` is approved.
5. **Glossary terms and uncovered areas:** nothing names where terms come from,
   and an area no explorer was assigned never reaches **Areas not covered**.

## Ruling AC: the design contradicts itself on report assets, and the user decides

`design.md:285-287`: reports "stay small because the styling and diagram
libraries load from content delivery networks". `design.md:378-379`, a global
constraint: "no request to a third-party host from anything fx renders". Both
were approved. `skills/fx-architecture/HTML-REPORT.md:45-47` loads Tailwind and
Mermaid from CDNs, which predates this branch and which the design's section kept.

**Holding position until the user decides:** new work on this branch follows the
global constraint, so task 08's own report makes no third-party request, using
inline styles and diagrams as text or inline SVG. `HTML-REPORT.md` is not
rewritten in this plan: that is a change to a shipped skill's output the design
itself chose. The question goes to the user first under "Needs you".

Cost if wrong: either an audit report plainer than the architecture report, if
the user accepts CDNs, or a shipped skill still loading two CDN scripts until
rewritten, if not. Caught by the user at the completion report.

**The rest, ruled:**

- **Item 3, "never per task" (story 23):** carried in practice.
  `skills/fx-implement/SKILL.md:450-451` names the four original lenses for
  per-task dispatch, so the pipeline lens is not dispatched per task. It still
  rests on a list rather than on the Mode column. Minor, to the final review.
- **Item 4, story 26, the category rule "where I will find it":** ADR 0013
  exists; nothing in `fx-authoring` points at it. Adding a line changes a lane's
  behaviour, which this plan does not measure. Parked for the completion report.
- **Item 5, the two ownership rules at `design.md:229-234`:** a job enqueued per
  record and work enqueued inside a transaction were to be reported by the
  pipeline lens. The narrowed lens cedes both. They join stories 18 to 22 as
  superseded by Ruling U. Ruling Z's claim about the design is struck in place.
- **Item 8, review worktrees from task 03:** `.worktrees/review-<SHA>` is created
  with no ignore check and no removal, while task 08 carries both for its own
  worktree. To the final review as an item it must triage before merge.
- **R1:** `lib/plan-state.js` reads at most 20 plan directories, already deferred.
- **R2:** the companion now writes the project's local exclude file and refuses to
  start in some repositories, which no story states. To the completion report.

**Task 08 amended mid-run:** the five task 08 items and Ruling AC's holding
position were sent to its running implementer, and the send returned queued for
delivery at its next tool round. Queued, not yet confirmed read. Cheaper than a
fix round that re-runs its probe sessions. Its report must carry the six as their
own section, and task 08's review is handed them as requirements whether or not
the message landed before its commit.

## Task 08: landed and verified

Commit `46f0ab9`, `commands/fx-audit.md` only, 229 lines, no trailer, parent
`25b24b8`. Verified myself:

```
frontmatter                    disable-model-invocation: true; a one-line description
the five amendments and AC     each found in the text by search
Phase 3                        names fx-lens-pipeline and fx:fx-architecture, and no other lens
.worktrees/ ignore             through info/exclude
check-paths                    55 reference citations, from 53
check-artifacts                exit 0
```

The implementer reports the mid-run message landed, and all six are in the
commit. Probe evidence, read from its files: GREEN stopped at the Phase 1 gate
with `01-current.md` only and a seven-line final message; resume said so and left
`01-current.md` byte-identical by checksum. One fx copy served every run, the
worktree's, with the cached copy disabled per session through `--settings`; no
settings file changed. Nested sessions wrote only inside the scratch project,
which is removed. `--max-turns` raised no error, but no run reached the limit, so
enforcement is unproven. No run reached Phase 3, so `fx-lens-pipeline` resolving
by name is still unobserved.

Two searches of mine found nothing: no "guess" phrasing for Phase 2, and no
statement that the skeleton is the first fence. The review is asked to check the
actual wording.

**Finding, checked in the probe logs myself: every fx command resolves as
`fx:fx-<name>`.** The init event's `slash_commands` in all five runs lists
`fx:fx-audit`, `fx:fx-critique`, `fx:fx-grill`, `fx:fx-handoff` and
`fx:fx-setup`. Typing `/fx:audit` returned "Unknown command". So the README's
`/fx:critique`, `/fx:setup`, `/fx:grill` and `/fx:handoff` have never resolved,
which predates this branch, and this command's own heading `# /fx:audit`, the name
the design gave it, does not resolve either.

## Ruling AD: documents state the command names that resolve; renaming is the user's call

Kept: the file stays `commands/fx-audit.md`, the path the plan's Produces line
names and the same shape as its four siblings. The name a user types today is
`/fx:fx-audit`.

- The command's heading and self-references are judged by task 08's review, which
  is handed the evidence, and fixed in its fix round if it agrees.
- Task 09's README commands table states the names that resolve for all five
  commands. It is a table correction with ground truth in the init event, so it is
  in task 09's scope.
- **Renaming all five files so `/fx:<name>` resolves**, the names the README always
  promised and the design used, changes what the user types for four existing
  commands. That goes to the user under "Needs you".

Cost if wrong: either the user types the longer names until the files are
renamed, or the README is corrected twice. Caught by the user at the completion
report.

**Observation, not chased:** the implementer reports the empty blob `e69de29b`
being rewritten in `/development/fx/.git`, outside the probes. Git writes that
object whenever an empty file is hashed, which several concurrent sessions and
checks can do. It changes no ref and no tracked content. To the completion report
as an observation only.

## Dispatched after f5163c0, each launch confirmed before this entry

Record committed `f5163c0`: the ledger, task 06's findings and the coverage audit.

- **Task 08 review**, top tier, read-only, no nested sessions, not to run
  `check-all`. Handed every ledger requirement for the command, the six
  amendments, ADR 0014 lines 75 to 82, the naming evidence, and ten named risks:
  the resolved name, how an agent finds the templates without a base directory,
  explorers that cannot write, Phases 3 and 4 read as an agent would, the two
  senses of "target", Phase 2's guards, restatement, the frontmatter, Ruling AC,
  and the probe evidence from the logs.
- **Task 06 fix round 1**, resuming the original implementer, which was reachable.
  The only writer. The added ADR 0008 line states the principle 0014 overrides
  for one concern 0008 never listed, keeps "superseded in part", wraps, and is
  proven additions-only against `eb4bd91`.

Queued for the writer slot: task 09, with Ruling AD's table correction added to
its brief.

## The final review's fixed point, pinned early

Base branch `main`, at `8309b63`, which is also `git merge-base main HEAD`. The
ref resolves and the diff is not empty: 36 commits, 62 files, +9920 and −99 at
`f5163c0` plus task 08.

Much of that is this plan's own record under `docs/plans/2026-09-11-fx-audit/`:
the ledger, findings, the measurement record and two HTML reports. The final
review's package will be limited to what ships, which is `skills/`, `agents/`,
`commands/`, `references/`, `scripts/`, `tests/`, `lib/`, `docs/adr/`, `README.md`
and `SURFACE.md`, with the design and the ledger passed as the spec and as the
source of deferred and parked lines. That keeps the reviewers reading the plugin,
not ten thousand lines of record. The exact path list is confirmed against
`git diff --stat` when the package is built.

**Checked against `git diff --name-only 8309b63...HEAD`: the list above missed two
shipped files,** and both join the package:

- `PREAMBLE.md`, one added line, `(prose-gate: quoting)`, from task 01's `a1ac01a`,
  directly after the preamble's list of banned words so the prose gate does not
  flag the list itself. The preamble is injected into every session and every
  subagent, so every agent now reads that marker. Reviewed through task 01's
  rounds; the final review sees it because of where it lands.
- `.fx.json`, task 01's machine facts. `test_one` and `setup` build git fixtures
  under `/tmp/fx-fixture-...-$$`. That sits inside the design's scoping rule, which
  exempts test scaffolding from the temp-directory constraint, but it is a temp
  path fx writes, in a session where the user was emphatic about temp
  directories, and nothing seen so far removes those fixtures. **Handed to the
  final review to judge** rather than waved through here.

`lib/` has no change on this branch and drops out of the list.

**The fixture question answered by reading, not left as a question.** The
fixtures are never removed. `scripts/make-git-fixture` runs `rm -rf` only on the
path it is about to rebuild. `scripts/check-all:37` builds
`/tmp/fx-fixture-check-all-$$` with no `trap` and no removal, and `.fx.json`'s
`test_one` and `setup` do the same. **57 `/tmp/fx-fixture-*` directories exist
right now.**

This branch made it accumulate: task 01 made the fixture paths unique per process
so concurrent runs stop colliding. Before that, one fixed path was overwritten on
every run; now every run leaves one behind. A regression of this branch's own
making, inside the design's scaffolding exemption. **To the final review as an
item to triage before merge**, with the fact attached: the likely shape is
removing the fixture on exit.

Not cleaned up by me now: `/tmp` is shared with other jobs, and a `check-all`
running elsewhere could be using one of them. Removing this branch's leftovers is
offered in the completion report.

## Task 06 fix round 1: landed and verified

Commit `190125e`, `docs/adr/0008-no-performance-lens.md` only, no trailer, parent
`f5163c0`. Verified myself: `git diff --numstat eb4bd91 190125e` on the file gives
`4 0`, so nothing ADR 0008 held before task 06 is removed. The line now reads that
0014 "pays the second dispatch this recommendation avoids, in `fx-lens-pipeline`,
for one concern this record did not list: unbounded enqueue against consumer
backlog. Every item listed above stays uncovered." Wrapped to four lines. ADR 0014
needed no change. Prose gate on `docs/adr` exits 0.

The added lines follow the recommendation with no blank line, so Markdown renders
them inside that paragraph. Handed to the re-review as a named risk.

Packaged at `.fx/2026-09-11-fx-audit/review/f5163c0..190125e.diff`.

Record committed `9cb212e`: the ledger through the fixture leak.

## Dispatched after 9cb212e, each launch confirmed before this entry

- **Task 06 fix round 1 scoped re-review**, mid tier, read-only, not to run
  `check-all`. Told to run the numstat proof, check agreement with ADR 0014, and
  judge the paragraph rendering.
- **Task 09**, top tier, the only writer, the last task. Its brief carries the
  counts checked on disk, the corrected gates paragraph, the References ruling,
  and Ruling AD applied to every command name a user types in `README.md` and
  `SURFACE.md`, not only the table, with the `slash_commands` evidence to cite. No
  command file is renamed and nothing outside the two files changes.

Still running: task 08's review.

## Task 06: complete, fix round 1 closed

Scoped re-review: **both findings ADDRESSED, no new breakage.** Findings at
`docs/plans/2026-09-11-fx-audit/findings/06-fix-round1-findings.md`. It ran the
numstat proof against `eb4bd91`, `4 0`, and quoted both records to show ADR 0008
and ADR 0014 now agree: one concern ADR 0008 never listed got the lens, and every
item it listed stays uncovered.

**Deferred to the final review, Minor:** the supersession note at
`docs/adr/0008-no-performance-lens.md:25-28` has no blank line before it, so
Markdown renders it inside the recommendation's paragraph. The file's other
bold-led clause, at line 13, stands as its own paragraph. Accurate, and no gate
reads rendering.

Task 06 is complete.

## Task 08: review needs fixes, five Importants and ten Minors verified at the lines

Task reviewer: **Needs fixes. 0 Critical, 5 Important, 10 Minor, 7 cannot-verify.**
Findings at `docs/plans/2026-09-11-fx-audit/findings/08-fx-audit-findings.md`. It
parsed the probe logs event by event: GREEN 3 wrote only `01-current.md` and ended
in seven lines; the resume run made two read-only calls and wrote nothing. Rulings
V, AA and AC, ADR 0014:75-82 and coverage items 1, 2, 6, 9 and 10 are carried in
the text.

Each Important read against `commands/fx-audit.md` as committed:

1. **I1, the documented name does not resolve,** plan-mandated. Lines 6 and 9 give
   `/fx:audit`; the logs return "Unknown command". Ruling AD's evidence.
2. **I2, the agent cannot locate the templates.** Lines 66-67 cite
   `../references/...`, relative to a file whose location the agent is never
   given. Observed: `find /`, and in one run reads of `installed_plugins.json`,
   `settings.json`, `/proc/$PPID/cmdline` and `env`. Eight fx copies already hold
   `design-template.md` on this machine, so a search is ambiguous. **Waiting on a
   platform answer before ruling:** whether a plugin command can reach its plugin
   directory at all. Asked of the Claude Code guide agent.
3. **I3, explorers that cannot write.** Lines 107-116 name no capability. Two of
   three `Explore` agents failed to write, printed their findings inline, and
   used up the retry meant for empty areas.
4. **I4, the sound verdict rests on an unrecorded reply.** Line 192's third check
   is the Phase 3 gate choice, which no document holds; lines 91-92 then make a
   sound verdict permanent. A chosen candidate never reaches `design.md` either
   (197-200).
5. **I5, reference lines cannot be opened.** Line 151 removes the worktree; lines
   176-178 then require opening every row's line, including reference rows.

## Ruling AE: all ten of task 08's Minors join its fix round

Promoted under Ruling I's precedent, and more strongly: every one sits in the one
file the round rewrites, several change what an agent does, and Phases 3 and 4
have never run, so no later round will catch them in use.

- **Correctness:** M2, line 38's bold lead says queue behaviour "has one dedicated
  pass", the reverse of Ruling AA; M3, resume decides from this run's flags, so a
  first run's `--against` is silently lost and Phase 2 is mentioned; M4,
  `git ls-files` drops untracked code, so the probe's one file would have reached
  Phase 3 as an empty set; M7, an approved `design.md` and a missing Phase 4
  report have no resume rule; M10, the slug from a basename collides across scopes
  and resumes the wrong audit, sound verdict included, with no way to start over.
- **Wording and scope:** M1, "the target" at line 60; M5, stated targets never
  reach the `fx-architecture` subagent; M6, "every file the audit wrote" cannot
  fit ten lines; M8, the boundary's "nothing else" omits the exclude file; M9,
  count rules and the report distinction restated from the templates.

Cost if wrong: a larger round on one file. Caught by the scoped re-review, and a
fresh GREEN probe, since Phase 1's dispatch changes.

**Cannot-verify items, resolved or carried:** named dispatch of `fx-lens-pipeline`
and `--max-turns` enforcement stay unobserved and go to the completion report;
whether `disable-model-invocation` keeps the command out of the model's listing
waits on the same platform answer as I2; the after-checksum exists only in the
report, and the log's absence of any write is the stronger evidence; `check-all`
runs fresh at the exit gate.

**Observations outside the task, to the completion report:** `commands/fx-grill.md`
has I2's defect; the four sibling commands' headings carry Ruling AD's naming
defect; the global constraint that a description never summarises a workflow and
`fx-authoring`'s user-invoked one-liner disagree for commands.

## Task 09: landed and verified

Commit `ab52534`, `README.md` and `SURFACE.md` only, no trailer, parent `9cb212e`.
Verified myself against disk:

```
disk                      skills 12, agents 6, commands 5, references 22 files
README Layout             skills 12 (10 lanes plus prototype and research),
                          agents 6 (5 lenses plus the devil's advocate), commands 5
README Gates              six listed, check-artifacts added, check-all's five named
SURFACE headings          Agents: 6, Commands: 5, References: 22 files, 21 markdown
                          plus one TypeScript example; Lanes: 10 unchanged, correct
command names             every typed name in both files is /fx:fx-<name>
lens and command rows     fx-lens-pipeline with its trigger set, branch only;
                          /fx:fx-audit in both command tables
prose gate                exit 0 on both files
```

Ten counts were wrong before, all match after. The implementer cited
`run-red.json` and `run-green-1.json` for "Unknown command", correcting my brief,
which named a log holding only the `slash_commands` list.

Left in `SURFACE.md` on purpose: `/fx:help`, `/fx:stack` and `/fx:upgrade` at
lines 173, 248 and 279 name commands that do not exist; an Agents table "Lines"
column matches no fx file; and a cut `performance` lens is still listed at mid
tier. All belong to the wider stale-document sweep the task puts out of scope. To
the completion report.

**A dependency to watch:** if task 08's I2 ruling moves the command's content, the
counts task 09 just corrected change with it.

Packaged at `.fx/2026-09-11-fx-audit/review/9cb212e..ab52534.diff`.

**Task 09 review:** dispatched, launch confirmed. Mid tier, read-only, no
writer live. Told to run the filesystem command for every number the diff
states, and handed seven named risks: the typed names, the three names of
commands that do not exist, the References section, the new rows and the "n/a",
the Tests block, the gates paragraph, and scope.

## The platform answer on task 08's I2

Asked of the Claude Code guide agent, answers marked by source:

- Whether `${CLAUDE_PLUGIN_ROOT}` is substituted inside a command's markdown body:
  **not documented**; the variable is documented for hooks, MCP configuration and
  scripts.
- Whether a command is given its base directory: **not documented**. The probes
  answer it empirically: no run was told, and every run searched.
- `@path` and `!` with that variable in commands: **not documented**.
- A skill with `disable-model-invocation: true`: **documented** as invocable only
  by the user, by name, and it **still receives the "Base directory for this
  skill" line** when invoked.
- Command naming: not documented beyond the filename, which the probes confirm.
  The documentation treats `commands/` as the legacy flat layout and uses
  `skills/` for new plugins.

## Ruling AF: the audit becomes a user-invoked skill, because only a skill can find its own templates

`commands/fx-audit.md` moves to `skills/fx-audit/SKILL.md` with
`disable-model-invocation: true`, and its citations become
`../../references/audit-template.md` and `../../references/design-template.md`,
relative to the skill file and reachable from the base directory the skill is
given.

**Why this is not the lane the design ruled out.** `design.md:152-168` chose a
command over a lane because a model-selectable skill pays a context load every
turn and competes for attention with existing triggers. A skill the model cannot
invoke does neither: `skills/fx-authoring/SKILL.md:292-297` gives exactly this form
as the user-invoked entry, with zero context load. The user still types
`/fx:fx-audit`. The measured lane the design defers stays deferred.

**Why not the alternatives.** An environment variable in the body is
undocumented for commands and forbidden by the citation constraint. A locating
rule that searches for the plugin is what the probes did, reading the user's
settings and process list on the way, and on this machine it is ambiguous across
eight fx copies. Nothing else on the platform gives a command its location.

**What it costs, all disclosed:**

- Task 08's Produces path changes from `commands/fx-audit.md` to
  `skills/fx-audit/SKILL.md`.
- Task 09's corrected counts shift: commands 5 to 4, skills 12 to 13, in both
  inventory documents, including how `SURFACE.md` classifies a skill that is
  neither lane nor procedure. That goes to task 09's fix round.
- The manifest may need the skill declared, per `scripts/check-manifest`.
- The design names it "a command" throughout. Recorded here and in the completion
  report, not rewritten in `design.md`.

Cost if wrong: the user wanted the entry under `commands/`. Reverting is moving
one file back, and the templates stay unreachable. Caught by the user at the
completion report, where this ruling is listed with the naming and asset
questions.

Fix round 1 for task 08 resumes its original implementer, which holds the probe
context. It carries I1 to I5, with I2 resolved by this ruling, the ten Minors
under Ruling AE, and a fresh RED, GREEN and resume probe, because the entry type,
Phase 1's dispatch and the resume rules all change. Dispatched after the record
commit, as the only writer.

Record committed `89f3e9d`: the ledger, task 08's findings and task 06's closing
findings.

**Task 08 fix round 1:** dispatched, resume confirmed, the original implementer.
The only writer. Its brief carries Ruling AF's move to `skills/fx-audit/SKILL.md`
with `disable-model-invocation: true`, citations relative to the skill file, the
manifest declaration only if `check-manifest` requires it, no edit to `README.md`
or `SURFACE.md`, I1 and I3 to I5, the ten Minors, and five probe proofs taken from
the logs: the skill resolves and is given its base directory, explorers all
write, no filesystem search for a template and no read of settings, `/proc` or
`env`, resume byte-identical with both checksum files kept, and what the init
event lists. Logs are kept this time.

Queued behind it: task 09's fix round, for the counts Ruling AF shifts and
whatever task 09's review returns.

## Task 09: review approved, and one recount still owed under Ruling AF

Task reviewer: **Approved. 0 Critical, 0 Important, 1 Minor.** Findings at
`docs/plans/2026-09-11-fx-audit/findings/09-inventory-docs-findings.md`. It ran
the filesystem command for every number the diff states and all matched: skills
12, agents 6, commands 5, references 22 files, six `check-*` gates besides
`check-all`, which runs five, and the lane suite's 7 lanes and 9 prompts. All
three rulings for the task held, with the naming evidence read in the logs.

**Deferred to the final review, Minor:** the `SURFACE.md` Agents table's "Lines"
column matches no fx file and predates this plan; the new row's "n/a" says so.

**Not complete yet.** Ruling AF moves the audit from `commands/` to `skills/`
after this review, so the counts it just confirmed become wrong: commands 5 to 4,
skills 12 to 13, and both command tables and the Layout lines that name
`/fx:fx-audit`. That recount is owed by a ruling, not a finding, and runs as task
09's fix round once task 08's fix round lands, checked by a scoped re-review
against the filesystem.

## Task 08 fix round 1: landed and verified

Commit `0098ed6`, a rename with edits, `commands/fx-audit.md` to
`skills/fx-audit/SKILL.md`, 261 lines, no trailer, parent `89f3e9d`. Verified
myself:

```
frontmatter                  name fx-audit, one-line description, disable-model-invocation: true
typed name                   /fx:fx-audit twice; /fx:audit nowhere
citations                    ../../references/audit-template.md and design-template.md
fixes present by search      "no dedicated pass", git show for reference rows,
                             untracked files through --others --exclude-standard
check-manifest               OK, 11 skills declared; fx-audit undeclared, like fx-design
check-paths                  55; check-artifacts exit 0; prose gate exit 0
```

**Probe logs checked by me, not taken from the report,** in
`fr1-run-green3.json` and `fr1-run-resume3.json`: zero `find /`, zero searches
for a template, zero reads of `settings.json`, `installed_plugins` or `/proc`.
The resume checksum files are identical before and after, `d2de033e`, with the
same modification time. The committed skill hashes to `debf4982`, the value
recorded at round 3, so the probes ran the committed text.

**Not established by me:** my search found no template read by path in the
stream logs, so "the agent was given where the templates are" rests on the
implementer's debug-log evidence, 13 skills loaded and templates read at worktree
paths. The re-review is asked to judge it. Two searches also came back empty,
"start over" for M10 and a clean result for "the target" for M1; both are named
risks for the re-review.

**Concerns carried:** Phases 3 and 4 have never run live; whether the second
runtime reaches the skill or honours the flag is unverified; `fx-audit` and
`fx-design` are both undeclared in the manifest.

Packaged at `.fx/2026-09-11-fx-audit/review/89f3e9d..0098ed6.diff`.

Record committed `0753dd1`: the ledger and task 09's findings.

## Dispatched after 0753dd1, each launch confirmed before this entry

- **Task 08 fix round 1 scoped re-review**, top tier, read-only, no nested
  sessions, not to run `check-all`. All fifteen findings, Rulings AE, AF and AD,
  and eight named risks: M10's way to start over, the remaining "the target",
  loading while undeclared, the indirect base-directory proof, the committed text
  against the round 3 checksum, resume byte-identity, the second runtime, and
  Phases 3 and 4 read as an agent would run them.
- **Task 09 fix round 1**, resuming the original implementer, the only writer:
  commands 5 to 4 and skills 12 to 13 in both documents, `fx-audit` described as
  a user-invoked skill, neither lane nor procedure nor command, and still listed
  where a user looks for what to type. The manifest is not touched.

## Task 09 fix round 1: landed and verified

Commit `8dd05fe`, `README.md` and `SURFACE.md` only, no trailer, parent
`0753dd1`. Verified myself against disk:

```
disk                     skills 13, commands 4, agents 6
README Layout            skills 13: 10 lanes, prototype and research, and fx-audit,
                         which only you invoke; commands 4, all /fx:fx-<name>
SURFACE headings         Lanes: 10, Procedures: 2, User-invoked skills: 1, Commands: 4
fx-audit mentions        described as a user-invoked skill typed as /fx:fx-audit in
                         both files; out of both commands tables and the lanes table
commands/fx-audit.md     named nowhere in either file
prose gate               exit 0
```

Packaged at `.fx/2026-09-11-fx-audit/review/0753dd1..8dd05fe.diff`.

Record committed `3a00204`: the ledger through task 08's fix round.

**Task 09 fix round 1 scoped re-review:** dispatched, launch confirmed. Mid tier,
read-only, no writer live. Told to run the filesystem command for every changed
count, check every `fx-audit` mention for consistency, and search both files for
the old numbers as digits and as words.

Still running: task 08's fix round 1 re-review. The final review's package waits
for both, since either could move HEAD.

## Task 09: complete, fix round 1 closed

Scoped re-review: **ADDRESSED, no new breakage.** Findings at
`docs/plans/2026-09-11-fx-audit/findings/09-fix-round1-findings.md`. It ran the
filesystem count for every changed number (skills 13, commands 4, agents 6),
confirmed every `fx-audit` mention in both files describes a user-invoked skill
kept out of both commands tables and the lanes table, found no old number left
as digits or words, and found the diff within scope. Its out-of-scope
observations are the three already deferred: the "Lines" column, the cut
`performance` lens still named, and an unrelated machine-state table.

Task 09 is complete. Eight of nine tasks are complete; task 08 waits on its fix
round 1 re-review.

Record committed `1e0a5c9`: the ledger and task 09's closing findings.

## Task 08 fix round 1: all fifteen findings addressed, one new Important from Ruling AF

Scoped re-review: **all fifteen original findings ADDRESSED.** Findings at
`docs/plans/2026-09-11-fx-audit/findings/08-fix-round1-findings.md`. Its named
risks, all run rather than read:

- M10's way to start over exists, at `skills/fx-audit/SKILL.md:94`.
- The one remaining "the target" is the fixed phrase "the target architecture".
- An undeclared skill loads: the loader scans the default directory for installed
  plugins too, and the installed fx 0.1.6 serves `fx-design` with no manifest
  entry. Not observed for an installed build of this branch.
- Across all seven post-move streams, subagents included: zero `find /`, zero
  reads of settings, `installed_plugins`, `/proc` or `env`. The base-directory line
  itself appears nowhere in any log, so its delivery is consistent with the
  evidence, not proven by it.
- The committed skill, its blob and the round 3 hash all match; the GREEN 3
  before and after checksums match byte for byte.

**N1, Important, verified at the installer.** `scripts/fx-opencode-install`
symlinks `skills/` whole (lines 108-111) and generates commands only from
`commands/*.md` (the loop after it). After Ruling AF, opencode receives the audit
as a skill and no typed command. The reviewer found no `disable-model-invocation`
string in the installed opencode binary, so it very likely becomes a skill the
model can select, which is the per-turn cost `design.md:152-168` cites for not
making the audit a lane. fx is not installed for opencode on this machine.

**N2 to N5, Minor, each verified at the skill's lines:**

- N2, lines 97-98: a differing `--against` asks which reference to use, but
  choosing the new one would mean rewriting `01-current.md`, which lines 114-117
  forbid.
- N3, lines 83-88: a same-day directory with no `01-current.md`, from an
  interrupted Phase 1, is not a candidate, so "None" creates a path that already
  exists; `a/b` and `a-b` map to one name; an omitted scope and `.` differ.
- N4, lines 109-110: resume state 4 holds when `03-gaps.md` does not exist, and it
  comes before state 5, so a run stopped after Phase 1 or 2 asks the Phase 3 gate
  question first.
- N5, lines 184-185: at root scope the file set includes the audit's own
  untracked documents under `docs/plans/<slug>/`.

## Ruling AG: opencode's view of the audit is the user's decision

Every fix for N1 changes something this plan cannot verify or did not approve:

1. Generate an opencode command for every skill marked `disable-model-invocation`,
   with reference and agent paths written as absolute paths at install time, and
   link skills one by one so that skill is excluded. That changes the installer's
   documented property that a whole-tree link lets `git pull` update skills, and
   nothing can observe opencode's handling here.
2. Revert Ruling AF. Claude Code's audit goes back to searching the filesystem for
   its templates.
3. Accept that on opencode the audit is a skill the model may select.

**Holding position:** Ruling AF stands, because Claude Code is where the audit is
proven to work, and the installer is not changed. N1 goes to the completion
report under "Needs you" with these three options and the evidence.

Cost if wrong: an opencode install pays a per-turn load for the audit until the
user picks option 1 or 2. Caught by the user at the completion report.

## Ruling AH: task 08 fix round 2 takes N2 to N5, and restores one dropped rule

Round 1 addressed everything it was given, so this is a new round on what the
round's own diff introduced. All four Minors change what an agent does, sit in the
one file, and sit in resume and scope rules no live run has exercised beyond Phase
1, so they join under Ruling AE's precedent. The re-review's one out-of-scope note
also joins: round 1 dropped "fetches nothing" from Phase 4's report step, leaving
Ruling AC stated only in the boundary, away from the step where an agent writes
the file.

Round 2 resumes the original implementer. One GREEN run and one resume run,
because the slug and resume rules change.

**Task 08 fix round 2:** dispatched, resume confirmed. The only writer. It carries
N2 to N5 and the restored Ruling AC sentence, is told N1 and the installer are not
its to touch, and must prove from the `fr2-` logs that a resume after the Phase 1
gate does not ask the Phase 3 gate question.

## Task 08 fix round 2: landed and verified

Commit `c9f69f4`, `skills/fx-audit/SKILL.md` only, 274 lines, no trailer, parent
`1e0a5c9`. Read at the lines the implementer cited:

```
N3, 59-69        scope normalized; ".", omitted and root are one scope; the name is
                 the repo, or repo + scope with "/" as "+", "%" and "+" escaped first
N3, 90-101       an existing directory with no 01-current.md continues Phase 1;
                 one recording another scope is reported, never continued
N2, 106-109      a differing --against keeps the recorded reference and says how
                 to compare against the new one: start over
N4, 120-121      state 4 applies only when 03-gaps.md exists
N5, 194-197      the file set excludes ':(exclude)docs/plans/<slug>'
AC, 249-251      "so opening it fetches nothing from any host" restored at the step
check-paths      55; prose gate exit 0
```

Probe logs checked by me: `fr2-run-green1.json` and `fr2-run-resume1.json` each
show zero `find /`, zero template searches, zero `settings.json` or `/proc` reads.
The checksum files match, `c7b50ba4`, with the same modification time.

One departure, reported: Phase 1's scope line now says "the normalized scope", to
match N3.

Packaged at `.fx/2026-09-11-fx-audit/review/1e0a5c9..c9f69f4.diff`.

Record committed `e258c10`: the ledger and round 1's re-review findings.

**Task 08 fix round 2 scoped re-review:** dispatched, launch confirmed. Mid tier,
read-only, no nested sessions. Told to run the exclude pathspec in a scratch
repository for the root and a subdirectory scope, apply the naming rule to eight
scopes including `a/b`, `a-b`, `a+b` and `a%2Bb`, walk the five resume states for
three directory shapes, and check the probe logs itself.

## The final review's carried findings, gathered into one file

`docs/plans/2026-09-11-fx-audit/final-review-carried.md` gathers every item this
ledger deferred to the final review or parked for the user, from a search of the
ledger for those markers, so the final reviewers triage them without searching
several thousand lines. It groups two items flagged to triage before merge (the
`/tmp` fixture leak and review worktrees with no ignore check or removal), the
deferred Minors by task, the decisions parked for the user, findings outside
every task, and what was never observed. It says the ledger wins where they
disagree.

**Two corrections made while writing it, both found by checking:**

- I first wrote that review worktrees are named in `skills/fx-review` and in
  `skills/fx-architecture`. A search finds exactly one place,
  `skills/fx-review/reviewer-prompt.md:58`. Corrected before any reviewer read it.
- The prose gate failed on a balanced parenthesis: a wrapped list item's
  continuation line began with the number 3 and a closing parenthesis. Rewrapped,
  the gate passes, which shows it reads a leading number and closing parenthesis
  as a list marker. **A fourth blind spot in
  `check-prose`**, beside the three already recorded, and added to the file's
  findings outside every task.
