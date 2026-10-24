# Coverage: fx-implement

Source: `superpowers:subagent-driven-development` @ 6.3.0: 289 claims
Plus: `superpowers:verification-before-completion` @ 6.3.0 (claims V1:V58)
Plus: `superpowers:using-git-worktrees` @ 6.3.0 (claims W59:W141)

Verdicts: **K** kept inline · **R** kept in a reference file · **S** superseded
(with the decision that supersedes it) · **D** dropped (with reason).
A claim with no verdict is a build error.

---

## subagent-driven-development (289)

| Claims | Verdict | Note |
|---|---|---|
| 1 to 2 | S | Frontmatter replaced by `fx-implement`'s own; triggers rewritten for `docs/plans/<slug>/tasks/` |
| 3 to 8 | K | Intro, why-subagents, the three reasons, core principle |
| 9 | K | Narration: at most one short line between tool calls |
| 10 to 13 | K | Continuous execution + the reason |
| 14 to 18 | K | Rulings-not-stalls, the format, the reason |
| 19 to 20, 22 to 23 | K | Stop conditions 1, 2, 4 |
| 21 | S | "side effect outside this worktree… a merge, a push, a publish" → broadened to "leaves the machine", per the offline rule |
| 24 to 33 | S | Decision-graph edges → the "When this skill applies" table; `executing-plans` branch removed (that skill is absorbed, subagents always available) |
| 34 to 61 | S | Process-graph nodes/edges → restated as prose in §1:§5. Every decision point is covered by prose; verified edge by edge |
| 62 | R | `skills/fx-implement/references/setup.md`: isolated workspace |
| 63 | R | `skills/fx-implement/references/setup.md`: never start on main/master without explicit consent |
| 64 to 66 | K | Compaction fact, the re-dispatch anecdote, ledger-not-todos |
| 67 to 68 | S | `scripts/sdd-workspace` derived a path (`dirname plan.md` here), it did no work. Deleted. The workspace **splits by lifetime**: durable `docs/plans/<slug>/` (design, plan, tasks, state.md: committed) and ephemeral `.fx/<slug>/` (reports, review packages: git-ignored, `check-ignore` verified before use) |
| 69 | R | `skills/fx-implement/references/setup.md`: another slug's directory is never yours to read or write |
| 70 to 74 | K | Ledger check, resume rules, mid-loop rule, foreign-ledger rule, identity first line |
| 75 to 76 | K | Ledger as recovery map; trust it over recollection after compaction |
| 77 | S | `git clean -fdx` destroys the workspace → n/a, the plan dir is committed, not git-ignored scratch |
| 78 to 81 | K | Read plan once, Global Constraints, read the design, provisional-rulings note |
| 82 to 93 | R | `skills/fx-implement/references/preflight.md`: pre-flight scan: both row types, "not a scan you ran", write to ledger, rule before execution, proceed silently if clean, review loop as net |
| 94 to 113 | K | Model selection entire section incl. turn-count-beats-token-price and the 3 complexity signals |
| 114 to 117 | R | `skills/fx-implement/references/batching.md`: batch same-shape work |
| 118 to 119 | K | Context-residency fact; artifacts as files |
| 120 to 123 | R | `skills/fx-implement/references/waiting.md`: waiting on subagents: no polling, no open-ended wait, bounded 5 to 10 min stretches, reconcile children, the reason |
| 124 | K | Record BASE before dispatching |
| 125 to 126 | S | `scripts/task-brief` → the task file **is** the brief (one file per task already). Script deleted |
| 127 to 133 | K | The five dispatch contents; exact values only in the brief; never make a subagent read the whole plan |
| 134 to 135 | K | Report file naming + the short return contract |
| 136 to 139 | K | One task not session history; the 42k-char anecdote; what a fresh subagent needs |
| 140 to 142 | S | "implementer never dispatches subagents" → narrowed: read-only `Explore` allowed; **no reviewer, no writer**. Both original reasons kept verbatim |
| 143 | K | Carry a pointer to parked findings in the area |
| 144 | K | Record agent identity for rounds 1 to 3 |
| 145 | K | Never parallel implementers: **reason replaced**: shared test environment, not file conflicts (worktrees solve files; they don't give a second Postgres) |
| 146 | K | implementer-prompt.md |
| 147 to 162 | R | `skills/fx-implement/references/handling-reports.md`: all four statuses (DONE stays inline), all BLOCKED sub-rules incl. "plan itself is wrong", never-ignore-an-escalation, answer questions properly. **Added**: BLOCKED-5 skip-and-continue, per the never-stall-the-queue decision |
| 163 to 166 | K | Task-scoped gates; never skip; never accept a missing verdict; self-review never replaces |
| 167 to 171 | K | review-package as a file; the bash-less fallback; the "never enters your context" reason; never `HEAD~1`; never dispatch without a diff file |
| 172 to 180 | R | `skills/fx-implement/references/review-inputs.md`: (the reviewer's paths stay inline) three paths + constraints; attention-lens framing; verbatim copying; no open-ended directives; no re-running tests; **the anti-pre-judging rule and its four trigger phrases** |
| 181 to 183 | R | `skills/fx-implement/references/review-inputs.md`: ⚠️ Cannot-verify items: don't block, you resolve each, confirmed gap enters the loop |
| 184 | K | task-reviewer-prompt.md |
| 185 to 192 | K | Loop triggers; the two exit routes; Minor never enters; deferred-minor ledger format + "a roll-up nobody reads is a silent discard"; plan-mandated findings are yours to rule on |
| 193 to 199 | K | Round definition; 5-round cap; resume 1 to 3 + reason; harness fallback; fresh+capable 4 to 5 with the exact framing text; the three-resumes reasoning |
| 200 to 208 | K | Per-round contract; covering-tests-command-output precondition; name the covering tests; scoped re-review with FIX_BASE; ADDRESSED/NOT ADDRESSED; new breakage joins; out-of-scope → deferred minors; ledger format |
| 209 to 210 | K | Never fix findings in the controller session + reason |
| 211 to 220 | K | The breaker; three adjudication categories with formats; the structural-failure reason; stop only when every path is a guess; adjudicate only at the cap; "pre-judging with a different name"; silent discard forbidden |
| 221 to 225 | K | Completion lines, both formats; mark todo; never advance with open Critical/Important |
| 226 to 229 | R | `skills/fx-implement/references/final-review.md`: final package with MERGE_BASE + reason; most capable model; point at deferred/parked |
| 230 to 232 | R | `skills/fx-implement/references/final-review.md`: ONE fix subagent; the rebuild-context reason; the cost anecdote |
| 233 to 236 | R | `skills/fx-implement/references/final-review.md`: exactly one scoped re-review; adjudicate residuals; four stop classes; no second fix wave |
| 237 to 240 | R | `skills/fx-implement/references/completion.md`: "Rulings I made" exhaustive; the reason; "a ruling that dies… was a decision made in secret" (reworded from "dies with the workspace") |
| 241 to 242 | R | `skills/fx-implement/references/completion.md`: delete the workspace at the end, but **only the ephemeral half** (`.fx/<slug>/`). `docs/plans/<slug>/` is committed and durable and is never deleted. Sibling-directories rule kept verbatim |
| 243 | S | `finishing-a-development-branch` → completion report only; merge/PR/push are the user's |
| 244 to 252 | R | `skills/fx-implement/references/rationalizations.md`: all 9 rationalization rows verbatim; 5 more added for this project's failure modes |
| 253 to 289 | D | Example Workflow. Illustrative only; every rule it demonstrates is stated normatively above. **Reinstate if the skill proves hard to follow without a worked example.** |

## verification-before-completion (58)

| Claims | Verdict | Note |
|---|---|---|
| V1:V2 | S | Frontmatter; absorbed into `fx-implement` |
| V3:V6 | R | `skills/fx-implement/references/exit-gate.md`: evidence before claims; letter-vs-spirit; Iron Law; "in this message" |
| V7:V15 | R | `skills/fx-implement/references/exit-gate.md`: gate function, all five steps, "skip any step = lying, not verifying" |
| V16:V22 | K | All 7 rows of the failures table, incl. the regression-test row |
| V23:V30 | R | `skills/fx-implement/references/exit-gate.md`: all 8 red flags |
| V31:V38 | R | 8-row rationalization table → `../../references/vocab/verification.md` |
| V39:V48 | R | Key patterns (tests, regression red-green, build, requirements, agent delegation) → reference. **Regression red-green pattern also inlined into `fx-tdd`** |
| V49:V58 | R | `skills/fx-implement/references/exit-gate.md`: when-to-apply list; "the rule applies to paraphrases, synonyms, implications" |

## using-git-worktrees (83)

| Claims | Verdict | Note |
|---|---|---|
| W59:W60 | S | Frontmatter; absorbed into `fx-implement` §Setup |
| W61:W67 | K | Isolated workspace; native-first; detect-first; never fight the harness |
| W68 | S | Its own announce line → `fx-implement` announces once for the run |
| W69:W78 | K | Detection commands; submodule guard; already-in-worktree → skip |
| W79 | K | On-branch report |
| W80 | K | **Detached-HEAD report**: extended: do not commit on a detached HEAD, those commits become unreachable |
| W81 | K | Normal-checkout branch |
| W82:W85 | S | Ask consent → the user's standing instruction *is* the declared preference; upstream's own rule W84 says honor it without asking |
| W86:W94 | K | Two mechanisms in order; native tool names; phantom-state reason; fallback condition |
| W95:W102 | K | Directory priority; explicit preference beats filesystem state; `.worktrees` wins |
| W103:W106 | K | `git check-ignore` MUST + the whole-tree-committed reason |
| W107:W109 | K | The create commands |
| W110:W111 | K | Sandbox fallback |
| W112:W117 | S | npm/cargo/pip/poetry/go setup → `../../references/stacks/*.md`. **None of upstream's five match this user's stacks** |
| W118:W121 | S | Baseline before work; failures → report and ask. Superseded by ADR-0030: no baseline run, the exit gate classifies failures against the merge base |
| W119 | S | npm/cargo/pytest/go test → stack profile |
| W122:W124 | K | Report template |
| W125:W136 | S | 12 Quick Reference rows: each restates a rule kept inline |
| W137:W141 | K | All 5 rationalizations |

---

## Summary

| | Count |
|---|---:|
| Kept inline | 95 |
| Kept in a reference | 126 |
| Superseded by an explicit decision | 71 |
| Dropped | 37 (all of them the Example Workflow, claims 253 to 289) |
| **Unaccounted** | **0** |

## Incident record

Incidents moved out of the lane files that every session loads. Each is filed under the rule it supports, which stays in the lane file with one line of why. Text is as it was in the lane file.

**Rule:** A task file that looks complete still needs the worktree, ledger, per-task review and lenses (`skills/fx-implement/references/why-this-lane.md`)

Measured: a 13-task
plan handed to a capable agent produced a working, well-tested build with no
worktree, no ledger, no per-task review and no lens dispatch.

**Rule:** A ruling whose cost lands on a later task names the checkpoint that catches it (`skills/fx-implement/references/rulings.md`)

Measured on a twelve-task build: a task 02 ruling recorded
"a dead controller survives until 09, which the task review would catch". It
did survive, and **that review caught it, eight tasks later**, because the
ruling had told it to look.

**Rule:** Check a ledger claim the way you check an implementer claim (`skills/fx-implement/references/rulings.md`)

Measured: a controller verified about forty implementer claims by executing
something, several found wanting, and made four false claims of its own, every
one self-generated. It ran the forty expensive checks and skipped the cheap
ones on itself. Its own summary: "none of them went through the check I applied
to everyone else's work." Of five bad verification probes in the same run, the
probe was wrong every time and the code was right.

**Rule:** Wait only on a process the harness tracks (`skills/fx-implement/references/waiting.md`)

Measured on one build: an implementer launched its suite this way and stopped
seven times in a row, each time reporting that it was waiting. Nothing was ever
going to wake it. The controller spent the afternoon force-resuming it.

**Rule:** Fill the implementer template rather than composing a dispatch from memory (`skills/fx-implement/SKILL.md`)

Measured over one
twelve-task build: 26 of 26 dispatches were written in the tool call, and each
dropped whichever clause was not in mind that minute. The fx-tdd lane was never
invoked once across 111 subagents.

**Rule:** Tell the plan reviewer to look for a story that must land in two places (`skills/fx-implement/references/coverage-audit.md`)

Measured: a marker written
  to a CSV, tested at two seams, rendered in no view. Found nine tasks late, by
  an implementer working on something else.

**Rule:** Tell the plan reviewer to look for a criterion satisfied by requesting a URL directly (`skills/fx-implement/references/coverage-audit.md`)

Measured: a rejected claim's reason and resubmit
  control, both tested, on a page nothing linked to.

**Rule:** Tell the plan reviewer to look for criteria that are all refusals (`skills/fx-implement/references/coverage-audit.md`)

Measured on a task caught *before* dispatch: every criterion refused
  something, none said the successful action happens through the screen.

**Rule:** Run every command the CI configuration runs before declaring the branch ready (`skills/fx-implement/references/exit-gate.md`)

Measured: a twelve-task build ran its suite after every task and every fix
round, green each time. **Nobody opened `.github/workflows/ci.yml` once.** The
final review found the linter exiting 1 on four offences that had been reported
as pre-existing at task 09 and owned by nobody, and the scanner exiting 3. Both
had been red the entire build, and the item that made them visible was a
reviewer running the file rather than the tests.

The offences themselves were two spaces. The cost was that a branch reported
ready for twelve tasks was not.

**Rule:** Run a procedure in the order the document prints it (`skills/fx-implement/implementer-prompt.md`)

Measured: a guide put `bin/rails secret` at step 4 and `bundle install` at
step 5. Every command was executed and reported with real output. On a fresh
host step 4 fails, because booting the app needs the gems step 5 installs.
The implementer's own summary listed the order it had actually used, and it
was the reverse of the printed one.

**Rule:** Enumerate a rule from the source of truth, and fix the mirror of a fix (`skills/fx-implement/implementer-prompt.md`)

Measured on one twelve-task build, all three found by the final review after
every task had passed its own: a visibility gate applied to five routes and
missing from a sixth, with the test's own comment naming "the fifth
per-record route" so the enumeration had never been done; a parameter shape
guard added in two controllers and absent from the third and busiest; and a
privilege wrapper present in five runbook blocks and missing from the sixth.
**Each was declared general in the round that added it.**

Measured: a round hardened a refusal flash so a failed action could not
render as success, and added, in the same commit, a second action whose
return value was dropped exactly the way the first one's had been. The
reviewer found it and named it as the mirror of the fix beside it.

**Rule:** An instruction from the controller that is wrong is satisfied by its intent (`skills/fx-implement/implementer-prompt.md`)

Measured: a fix round specified a root route whose redirect would have made
a manager's own claims list unreachable, and would have bounced a manager who
had just filed a claim away from the claim they filed. The implementer
satisfied the underlying ruling a different way and said so. **The evidence
it was right is a test that went away:** the specified version required
amending an unrelated task's test to follow an extra redirect, and the
alternative made that amendment unnecessary.

**Rule:** Put a finding about another task's files under a heading in the report (`skills/fx-implement/implementer-prompt.md`)

Measured: an implementer found that two documents gave contradicting
restore procedures, one of which deleted the SQLite `-wal` file and
destroyed committed transactions. It correctly declined to edit another
task's file, then had nowhere to put the finding: it tried to message the
controller, could not resolve an address, and fell back to the top-level
session. Three other subagents in the same run did exactly the same thing.
**Four agents independently reaching for a channel the template never gave
them is what says the channel was missing.

**Rule:** A ruling in the ledger is inherited by the reviewer (`skills/fx-implement/task-reviewer-prompt.md`)

Measured: a ruling recorded at task 02 said a placeholder
controller "survives until 09, which the task review would catch". It did
survive, and the task 09 review caught it, because it had read the ledger.
Nothing in the task file mentioned it.

**Rule:** Never write "walked it" about something you read (`skills/fx-implement/task-reviewer-prompt.md`)

Measured: a review reported walking an install guide "as an installer",
specifically hunting for steps that would fail, and passed it. Five steps
were broken. **Every miss was in a shell command and the prose was reviewed
well.** Three of the five needed no `sudo` to catch.

**Rule:** Running the commands is not running the document (`skills/fx-implement/task-reviewer-prompt.md`)

Measured: an implementer ran every privilege-free command in an install
guide and reported real output for each. The guide still failed at step 4 on
a fresh host, because step 4 booted the app and step 5 installed the gems.
Its own disclosure listed the executed order as install-then-secret, the
reverse of the printed order, and it passed on a machine where the gems were
already present. **The command was honestly run and the document was still
broken.**

**Rule:** Write the findings file first, then send the message (`skills/fx-implement/task-reviewer-prompt.md`)

Measured: a whole-branch review ran twenty minutes across a hundred tool
calls, then used its final message to correct one of its own claims. The
correction was right and worth making. **The findings never reached the
controller at all**, and two further exchanges asking for them produced two
more messages that were not them.

**Rule:** Write the findings file first, then send the message (`skills/fx-implement/re-review-prompt.md`)

Measured: a whole-branch review ran twenty minutes across a hundred tool
calls, then used its final message to correct one of its own claims. The
correction was right and worth making. **The findings never reached the
controller at all**, and two further exchanges asking for them produced two
more messages that were not them.
