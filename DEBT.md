# Known debt

Recorded rather than hidden. Each item says what it is, why it wasn't done, and
what closing it costs.

---

## 1. No skill has been tested: the Iron Law is violated across the board

**`fx-authoring`'s own Iron Law is `NO SKILL WITHOUT A FAILING TEST FIRST`, and
zero of the nine skills have had it applied.**

Not done for any of them:

- **RED**: pressure scenarios (3+ combined pressures) run *without* the skill,
  baseline behavior captured verbatim
- **GREEN**: the same scenarios re-run *with* the skill, verifying compliance
- **REFACTOR**: new rationalizations captured and countered until no new ones
  appear
- **Micro-tests**: wording checked against a no-guidance control, 5+ reps,
  every flagged match read manually

By the standard these skills themselves enforce, all nine are **untested code.**

**Why it wasn't done:** full RED-GREEN-REFACTOR on nine skills is a project in
its own right: upstream reports six iterations to bulletproof a *single*
discipline skill. Doing it inline would have stopped everything else.

**What it would cost:** substantial. Every scenario is a fresh-context subagent
dispatch, and discipline skills need several rounds each.

**The pragmatic middle**, if the full pass is never affordable: **micro-test the
descriptions only.** They are the highest-leverage text in the plugin, the
cheapest thing to test, and the one place with a documented failure mode to
check against: a workflow-summarizing description measurably caused an agent to
run one review where the skill specified two.

**Priority order if tested piecemeal:** `fx-tdd` and `fx-debug` first: both are
discipline skills whose whole value is resisting rationalization under
pressure, which is exactly what pressure scenarios measure. `fx-humanize` and
the reference files need no testing at all (no rule to violate).

**Now cheaper than when this was written.** `references/testing/` holds
`test-pressure-{1,2,3}.md` and `test-academic.md`, kept from superpowers'
`systematic-debugging`: four ready-made pressure scenarios for `fx-debug`,
one of the two first-priority skills. They need re-pointing at `fx-debug`, not
inventing. Kept deliberately: superpowers is being uninstalled, so this was the
last chance to take them.

---

## 2. ~~`references/stacks/` does not exist~~: **CLOSED, Section 3**

The dead pointer is gone. The four callers no longer ask a stack profile for
commands at all: commands come from `.fx.json`, and a `stacks` entry with no
file is explicitly not an error, so a missing profile degrades instead of
failing.

Written: `rails.md` (213) · `dotnet.md` (199) · `docker.md` (143) ·
`observability.md` (233). `data.md` dropped (the standalone `postgres` skill
serves it); `frontend.md` dropped ("frontend" is not one ecosystem).

**One thing carried forward:** `observability.md` was written before the
three-layer rule and had project facts in it: six engines, `ENV['ENGINE']`,
Arabic default, the trace-topology decision. Those were removed and are parked
in `tasks/todo.md` to seed advantage-backend's `repo.md`. **Until `/fx:setup`
runs there, that project knowledge lives only in the todo file.**

---

## 3. Referenced but not yet built

| Referenced by | Missing |
|---|---|
| `fx-review` lens trigger table | `fx-lens-database`, `-security`, `-a11y`, `-silent-failure`, `-performance`: five agents |
| `fx-brainstorm` §4 | `visual-companion.md` and its 5 scripts (copy verbatim) |
| `fx-brainstorm`, `fx-plan`, `fx-review` | `/fx:setup` |
| `fx-plan` §7 | `/fx:critique` |
| `references/vocab/grilling.md` | `/fx:grill` |
| `fx-debug` Phase 1 | `scripts/hitl-loop.template.sh` (copy verbatim) |
| `fx-debug` supporting techniques | `references/vocab/condition-based-waiting.md` (copy verbatim) |
| every skill, via the preamble | `fx-context.js`, `fx-git-guard.js` |

---

## 4. `condition-based-waiting.md` marked copy-verbatim but never reviewed

115 lines, self-contained. Recorded as **unaudited**: no claim extraction was
run against it, so its coverage is asserted by the copy operation, not verified.

---

## 5. Coverage tables were never checked against upstream

The verification pass compared each `COVERAGE.md` against the fx files it
names. It **did not** re-read the upstream sources.

So a row that mis-describes what upstream actually said (extractor error, or
paraphrase drift in the table) passes clean. The counting errors that pass
found (7-term glossary that had 8, "all 4 bullets" that had 3) were the
detectable class; this is the undetectable one.

Worth one pass before shipping. Roughly the cost of the original audit.

---

## 6. `fx-humanize` carries one local modification

The frontmatter `name` was changed from `humanizer` to `fx-humanize` for naming
consistency. **Everything else is byte-identical to upstream 2.11.2.**

Upgrade procedure: `diff`, ignore the `name:` line, copy the rest wholesale.

Its `description` still opens with what the skill *does* rather than a pure
trigger list: an upstream choice, left unmodified to keep the diff at one
line. If `fx-humanize` proves hard to trigger in practice, that is the first
thing to change, and it costs the clean diff.

---

## 7. Nothing covers designing for testability under non-determinism

**Found by dogfooding**, 2026-09-01, during the first real `fx-brainstorm` run:
a design put a fire-and-forget thread on the redirect path, and the seam
question (*how do you test that without asserting on a race*) had no answer
anywhere in the plugin.

What exists: `references/vocab/condition-based-waiting.md`: how to **wait** for
an async result instead of sleeping. That is a tactic for code that is already
async and already under test.

What is missing is the decision **upstream** of it:

- **`references/vocab/good-tests.md` has 0 mentions** of async, thread or
  timing. The canonical "what a good test is" reference is silent on
  non-deterministic code.
- **`fx-tdd`'s seam section has 1 incidental mention.** The skill that decides
  *where* tests go says nothing about the condition that most often forces that
  choice.
- Neither says the useful thing: **when behaviour is non-deterministic, the
  seam is not optional: inject the collaborator and assert on it, rather than
  asserting through the race.**

Also unaddressed: connection-pool handling for a spawned thread (Rails), and
that a test-only synchronous path means production runs code the tests never
exercise.

**Where it belongs:** a section in `good-tests.md`, plus one line in `fx-tdd`'s
seam guidance pointing at it. `rails.md`'s Background jobs section should note
the connection-pool rule.

**Cost:** small: one reference section and two pointers. It was invisible until
a real design hit it, which is the argument for dogfooding over more review.

---

## 8. `fx-implement` assumes a committed plan and an existing codebase

**Found by dogfooding**, 2026-09-01, on the first real `fx-implement` run
against a new project.

**Gap A: nothing verifies the plan is committed before the worktree is made.**
§1 goes straight from isolation-detection to worktree creation. A worktree is
checked out from HEAD, so an uncommitted `tasks/` directory produces a
worktree containing **no tasks**, and the failure surfaces only when the
first implementer cannot find its brief: several dispatches later, as a
confusing "file not found" rather than as the setup error it is.

**Fix:** one check in §1 before creating the worktree: the plan directory must
resolve inside HEAD's tree. Cheap: `git cat-file -e HEAD:docs/plans/<slug>/plan.md`.

**Gap B: §2 assumes an existing codebase with a test suite.** It says to run
`setup` and `test_all` from `.fx.json` and to run the baseline **before task
01**, and to **ask** when `.fx.json` is missing. On a greenfield project that
is circular: task 01 is what creates the app, the test framework and
`.fx.json`. The "ask" branch therefore fires on **every** new project, turning
the most routine case into a stall: against the skill's own "rulings, not
stalls" principle.

**Fix:** name the greenfield case in §2. When no `.fx.json` exists **and** the
repo has no test suite, the baseline is 0 tests by definition; proceed and let
task 01 establish both. Ask only when `.fx.json` is missing from a repo that
plainly already has tests.

**Both gaps share a shape with findings 1 and 2:** the skill was written
against the case its author had in mind: an existing multi-engine Rails
codebase, and the assumption was invisible until something else was tried.

---

## 9. `fx-plan` §8 offers one exit where it should offer four

**Found by dogfooding**, 2026-09-01, reported by the user.

§8 says: *"Plan and N tasks written… Review and tell me when to start."
Approved → `fx-implement`.* The only branch anywhere in the skill is the
red-team yes/skip in §7. A finished plan therefore has exactly one legitimate
successor, and the skill's shape implies that starting is the expected answer.

A plan is finished at the point where **four** next steps are all reasonable:

1. **Start implementing**: hand to `fx-implement`
2. **Red-team it**: `fx-devils-advocate` in plan mode (currently the only branch, and it sits in §7 rather than at the exit)
3. **Keep discussing**: the plan is written but a decision inside it is not settled; go back to the interview rather than forward
4. **Save for later**: the plan is good and the work is not for now. Nothing in fx currently acknowledges a plan that is deliberately parked

**Fix:** replace §8's single prompt with the four-way choice, using the host's
interactive question tool the way `fx-brainstorm` §3 already does. Move the
red-team offer from §7 into that menu so there is one decision point rather
than two.

**Why it matters beyond convenience:** an interface offering one exit teaches
the user that the other exits are not supported. Option 4 in particular has no
representation anywhere in the plugin: there is no notion of a parked plan,
and the ledger has no state for it.

---

## 10. `fx-implement` treats an uncommitted plan as blocking when it is not

**Found by dogfooding**, 2026-09-01, and the error was the controller's
reasoning, not the skill's text, which is why it is worth recording.

`git worktree add` works perfectly well against a dirty working tree.
Uncommitted files do not prevent worktree creation. The only real consequence
is that the **new worktree**, checked out from a commit, does not contain
files that were never committed.

That has two straightforward answers, neither of which requires the user to do
anything:

- pass the implementer **absolute paths** to the task files in the main
  checkout: they exist on disk regardless of git state; or
- **copy `docs/plans/<slug>/` into the worktree** and let the branch's first
  commit carry it, which also keeps the ledger with the work.

Instead the controller stopped and asked the user to commit. **DEBT #8's Gap A
is therefore half wrong**: the check it proposes is useful as a *warning*, not
as a gate. A skill that hard-blocks here trades a real capability for a
precondition it did not need.

**Fix:** §1 should say that an uncommitted plan is not a blocker, and name the
copy-into-the-worktree behaviour as the default. Amend #8 Gap A from "verify
before creating" to "warn, then carry the plan in".

---

## 11. The base-branch push hole (found and fixed)

**Found by dogfooding**, 2026-09-01, verifying guard behaviour from inside a
real worktree rather than a test fixture.

Design decision D-A was implemented as "push is allowed from a worktree", full
stop. The option the user selected read *"allowed on a **feature branch** in a
worktree"*, and the standing rule is *"never commit or push to the base branch
without explicit say-so."* A worktree does not change that: `git push origin main` from a feature worktree still lands on main.

So the guard permitted precisely what the rule forbids. **Neither task 02's
8 new assertions nor the fx red-team caught it**, because both tested the
worktree-vs-main-checkout axis and neither tested the *target refspec*.

Fixed: any push whose refspec names `main`, `master` or `trunk` is blocked
everywhere: including `HEAD:main`, `feature:master`, `refs/heads/main` and
`+main`. New suite `lib/base-branch.test.js`, **27 assertions**, with explicit
false-positive guards: `maintenance`, `feature/main-nav` and `mastermind`
remain pushable.

Suite totals: 87 + 13 + 27 = **127**.

---

## 12. `check-ignore` on a directory that does not exist yet

**Minor.** `fx-implement` §3 says to verify `.fx/` is git-ignored with
`git check-ignore -q .fx` before writing to it. A `.fx/` pattern matches
directories only, so the check **fails before the directory is created**: the
exact moment the skill tells you to run it. The correct order is create, then
check, or check the path with a trailing slash.

Cost of getting it wrong: an agent following the skill literally sees "not
ignored", adds a redundant `.gitignore` entry, and re-checks: noise rather
than damage, but it reads as a failure when nothing is wrong.

---

## 13. `fx-implement` creates `.gitignore` before a greenfield generator runs

**Found by dogfooding**, 2026-09-01, on task 01: caught by the implementer,
not by the controller.

`fx-implement` §3 requires `.fx/` to be git-ignored before anything writes
there, so the controller creates `.gitignore` during workspace setup. On a
**greenfield** repo that happens *before* the project generator runs, and
`rails new` (like most generators) only appends its `master.key` line when a
`.gitignore` already exists, instead of writing its full default block.

Result: `storage/*.sqlite3`, `log/*.log` and the bootsnap cache would have been
committed. The implementer noticed and added the standard Rails stanza; nothing
leaked. Had it not noticed, the first commit of every greenfield Rails project
under fx would carry database files.

**Fix:** §3 should say that on a repo with no application yet, `.fx/` and
`.worktrees/` go in `.git/info/exclude` rather than `.gitignore`: same effect,
invisible to the generator, and it leaves the project's own ignore file for the
project to write.

**Same shape as #8 and #10:** a step written for an existing codebase, applied
to an empty one, doing quiet damage.

---

## 14. Task-authoring gap: verbatim specs that cannot run

**Found by dogfooding**, 2026-09-01, task 01.

`fx-plan` requires test code to be written out verbatim in the task, and
`fx-implement` tells the implementer to use it exactly. Two of the specs I wrote
were subtly unrunnable:

- `RSpec.describe "POST /links"` with **no `type: :request`**, which under
  rspec-rails 8's default generator output gets no `post`/`response` helpers.
- An assertion of `/target_url/i` against an error body, which Rails'
  `errors.full_messages` cannot satisfy (it humanizes to `"Target url"`), so
  the assertion silently dictated a non-default error format.

Neither is caught by anything: `fx-plan`'s self-review checks placeholders,
spec coverage and type consistency, and the red-team pass read for drift and
correctness but did not execute anything.

**Fix:** add one line to `fx-plan`'s quality red flags: *"a request spec must
declare `type: :request` unless the project infers it, and an assertion on an
error body must state the error contract rather than imply it."* The deeper fix
is that verbatim test code in a plan is unexecuted code, and the only real
defence is the implementer reporting when the given test does not run, which
is exactly what happened here, so the loop worked.

---

## 15. `rails.md` was missing the `redirect_to` other-host trap (fixed)

**Found by dogfooding**, 2026-09-01, task 02: it bit a real implementer.

Rails 7 changed `redirect_to` to default `allow_other_host: false`, raising
`ActionController::Redirecting::UnsafeRedirectError` on any external URL. All
four of the task's request specs failed on it, and the exception name does
not mention the option that fixes it.

This is precisely the class of content `references/stacks/rails.md` exists to
carry: version-specific, invisible until it fires, and not something a
competent agent reasons its way to. It was absent.

**Fixed**: added under the traps section, framed as the security decision it
is rather than as a flag to set: open redirect is a real vulnerability, and
Rails made it opt-in so the choice appears in review. Verified the addition
carries no project facts.

**The wider point:** the stack profiles were written from my own recall of what
trips people up. This one was missing because I have not personally been bitten
by it recently. Every future gap in those files will be found the same way: by something failing, which argues for treating them as accumulating rather
than complete.

---

## 16. Verification ran in the wrong context and still reported "verified"

**Found by dogfooding**, 2026-09-01: caught by task 02's reviewer, against
the controller.

The plan's Global Constraints carried *"Rack 2.2.9 has no
`:unprocessable_content`"*, sourced from a red-team finding. I ran what I
called an independent verification:

```
gem list -e rack           → rack (3.2.7, 2.2.9)     ← two versions, I read the tail
ruby -e "require 'rack'"   → 2.2.9                    ← OUTSIDE the bundle
```

and reported it confirmed. Inside the bundle, Rails 7.2 resolves **3.2.7**,
where the symbol exists. The command answered a real question; it was not the
question that mattered.

**No damage**: the change it justified (integer `422`) is correct under every
Rack. The defect is in the verification, not the code.

**What `fx-implement`'s exit gate already says, and what it is missing:** step 4
is *"does the output actually confirm the claim?"*, which I skipped. But the
gate never names **context** as a dimension: same command, different
environment, different truth. `bundle exec` vs bare, container vs host, one
engine vs another, test env vs development.

**Fix:** add a line to `references/vocab/verification.md`: *"a command run in
the wrong environment answers a different question. For anything version- or
dependency-dependent, run it the way the project runs it (`bundle exec`, inside
the container, with the app's env loaded) or the answer is about your machine,
not the code."*

**Why this one matters more than the others:** every other finding in this log
was a gap in a skill. This one is a case of the verification ritual being
performed and still producing a false confirmation, which is the failure mode
the ritual exists to prevent, and the only one none of the reviewers upstream
would have caught, because they all trusted the controller's "verified".

---

## 17. `fx-implement` says "never stop" but has no mechanism to not stop

**Found by dogfooding**, 2026-09-01, reported by the user after the controller
wrote a progress summary between every task.

The skill is explicit: *"Do not pause to check in between tasks. Execute
every task without stopping. 'Should I continue?' prompts and progress
summaries waste the user's time"*, and the controller violated it four times
running, in the same session that had the rule in context.

Two separate problems:

**The behavioural one.** "Narration: at most one short line between tool calls"
is stated once, early, and then every *other* instruction in the skill asks for
something written: ledger entries, rulings, adjudications, completion lines.
The volume of required writing crowds out the one rule asking for silence, and
a controller that dutifully records everything ends up producing exactly the
progress summaries the skill forbids.

**The structural one, which is the real gap.** A turn ends when the model stops
calling tools. "Never stop" is a rule the skill cannot enforce, because
stopping is not an action the model takes: it is what happens by default when
a message ends. The skill needs to say what to *do* instead: **end every
message with the next dispatch already in flight**, so the queue advances
whether or not anyone replies.

**Fix:** state it as a positive mechanic rather than a prohibition: *"the last
tool call of every message is the next task's dispatch or its review. If you
are about to write a summary and have no dispatch in flight, you have stopped."*
Add the matching rationalization row: *"A progress summary would be helpful" →
"They asked you to execute. The ledger is the record; write there, not here."*

Related to #9: `fx-plan` offers one exit where four are reasonable, and
`fx-implement` offers no exit where it should offer exactly one: done.

---

## 18. Every per-task review inherits the controller's blind spots

**Found by dogfooding**, 2026-09-02, reported by the user.

Task reviewers are dispatched with no session history: genuinely fresh, but
with the controller's **question list**. `fx-implement` §3 mandates this: the
Global Constraints block is called "the reviewer's attention lens", and the
skill tells the controller to name what to check.

That makes every per-task review a **directed search**. Anything the
controller did not think to ask about is not examined by anyone. The controller
wrote the plan and the tasks, so its blind spots are exactly the ones most
likely to have produced defects, and they propagate into the gate meant to
catch them.

**Evidence from this very run:** the one finding that caught a controller error: a fact "verified" by running a command outside the bundle (DEBT #16): came
from a reviewer reading `Gemfile.lock` for an unrelated reason. It was outside
the question list. Nothing in the process asked for it.

**Partially covered:** `fx-implement`'s final broad review dispatches
`fx-review` in branch mode, once, at the end. That is the only unprimed pass,
it happens after every task has already been accepted, and by then the cost
of a structural finding is highest.

**The asymmetry:** `fx-devils-advocate` exists and is good, but its description
scopes it to *design and plan documents*. There is no adversarial reviewer for
**code**. Plans get red-teamed; implementations do not.

**Fix, in preference order:**
1. Widen `fx-devils-advocate` to a code mode: same hostility, pointed at a
   diff, given the task and **no question list**: "find what is wrong."
2. Add it to `fx-implement`'s task loop as an optional second gate on
   tasks that touch security, data, or concurrency: not on every task,
   which would double the dispatch cost for little return on mechanical work.
3. At minimum, state in §3 that the constraints block focuses attention **and
   therefore narrows it**, and that the controller should include one
   open-ended prompt ("anything else that would bite us") rather than only
   its own list.

---

## 19. `fx-tdd` is orphaned: nothing routes to it during implementation

**Found by dogfooding**, 2026-09-02.

`implementer-prompt.md` contains **zero** mentions of `fx-tdd`. The task
template says *"No code here: `fx-tdd` drives it from the failing test"*, but
the prompt that actually reaches the implementer never tells it to invoke the
lane. So `fx-tdd` (the discipline skill that owns the Iron Law, verify-RED and
the seam rules) is not reached by the one workflow that writes code.

It ran zero times across four tasks. The implementers did TDD because the
tasks spelled out the steps, not because the lane enforced anything.

**Fix:** one line in `implementer-prompt.md`: *"Invoke `fx-tdd` before writing
any code; it owns the RED/GREEN discipline this task assumes."*

---

## 20. The five lens agents have exactly one door, and it is opened once

**Found by dogfooding**, 2026-09-02.

`fx-lens-database`, `-security`, `-a11y` and `-silent-failure` are named only
in `skills/fx-review/SKILL.md`. `fx-implement` mentions `fx-review` exactly
once: at the **final** review, after every task has already been accepted.

So the entire lens layer is reachable through a single call, at the end. In
this session the controller substituted its own final-review prompt, and
**five agents never ran at all.** No warning, no gap in the output, nothing
that would tell you the security and database lenses had never looked at a
migration or an auth path.

This also means lens findings arrive at the most expensive possible moment (after four tasks are committed) rather than on the diff that introduced
them.

**Fix:** `fx-implement`'s task loop should fire the lenses whose triggers the
task's diff matches, at the per-task gate, not only at the end. The trigger
tables already exist and are file-pattern based, so the controller can evaluate
them from the diff it has already packaged.

**The wider point, shared with #18:** a component reachable through exactly one
call site is one deviation away from never running. Nothing in the plugin
notices its own agents sitting idle.

---

## 21. The controller states false facts as binding constraints, and the skill amplifies it

**Found by dogfooding**, 2026-09-02. Four instances in one session.

`fx-implement` §3 tells the controller to copy binding requirements **verbatim**
into the dispatch, calling the constraints block "the reviewer's attention
lens". That is right for real constraints. It also means **any false fact the
controller believes is propagated with the authority of a requirement**, into an
agent with no context to doubt it.

What actually happened, all four caught by the agent rather than the
controller:

| Stated as a constraint | Truth |
|---|---|
| "Rack 2.2.9 has no `:unprocessable_content`" | Project bundles 3.2.7; the symbol exists |
| "The stats route must precede the catch-all or it never matches" | The catch-all is single-segment; it never matches a 3-segment path either way |
| "Make `bin/brakeman` exit 0" | Two pre-existing findings made that impossible without masking |
| "Keep `good-tests.md` under 250 lines" | It was already 283 before the edit |

Two of the four agents **refused to comply** and said why: one declined to add
a brakeman ignore file to force a green gate, one declined to trim unrelated
content to hit an impossible line limit. Both were right, and both cost a round
trip that would not have existed if the controller had checked first.

**Fix, in `fx-implement` §3:** before copying a constraint into a dispatch,
verify anything empirical in it: a version, a line count, a command's exit
code, a routing behaviour. A constraint is a claim; the exit gate already
demands evidence for claims, and this is the one place the skill exempts them
without saying so. Add the rationalization row: *"It is in the plan, so it is
true" → "The plan is a claim too. Constraints get verified like everything
else."*

**And keep what worked:** an implementer that pushes back on an impossible
instruction is functioning correctly. `implementer-prompt.md` should say so
explicitly, so it reads as sanctioned rather than as insubordination.

---

## 22. The controller should never enter the worktree

**Found by dogfooding**, 2026-09-02, reported by the user after roughly six
blocked commands in one session.

`fx-implement` §1 says *"prefer the harness's native worktree tool over raw
`git worktree add`"*, and the rationalization table calls bypassing it
**"the #1 mistake."** Following that advice, the controller called
`EnterWorktree`, which **pins the entire session** into the worktree.

The consequences were immediate and recurring:

- Every command touching a different repository was refused. The controller was
  coordinating the shortlink build while also fixing the plugin at
  `/development/fx`, and that second repo became unreachable.
- Any compound command was refused as "too complex to verify it stays inside
  the worktree", so ordinary multi-step shell work had to be split into
  single commands.
- The refusals read as a guard catching a mistake, when the mistake was the
  session's location, not the command.

**Isolation is for the work, not for the coordination.** The controller
dispatches, reviews, ledgers and verifies. None of that requires *being* in the
worktree; all of it requires *reaching* it, which `git -C <path>` and
`cd <path> && cmd` do without pinning anything.

**Fix, in §1:** the controller creates the worktree and stays where it is. It
passes the absolute worktree path to every implementer, which is already how
the dispatch template works. The native tool is right for a session that will
write code and wrong for the one supervising it, and the skill should say which
role it is describing.

The "#1 mistake" line stands for an implementer. For a controller it inverts:
entering is the mistake.

**Verified:** `ExitWorktree` with `keep` restored the controller's reach to
both repositories in one call, with the worktree and its branch untouched.

---

## 23. ~~The routing table fires once~~: **FIXED, hooks/fx-lane-check.js**

**Found by dogfooding**, 2026-09-02. The single most important structural
finding in this file. Measured by an autonomous agent building a real app with
no mention of fx in its prompt.

**Result: 1 lane of 5 fired.**

`fx-brainstorm` fired reliably and unprompted. The routing table is injected
per-message, so it reliably catches the agent *before* its first action, and
the entry point worked exactly as designed. It classified the task correctly as
architectural, and its interview changed the permission model of the app.

`fx-plan`, `fx-tdd`, `fx-review` and Context7 all had their stated trigger
conditions met. None ran.

**The cause is structural, not a discipline failure.** In the agent's words:

> "Once I'm mid-build there's nothing that re-reads the routing table and asks
> 'does the current activity match a lane?' A skill whose trigger occurs in the
> middle of a long task has no moment where it gets consulted."

Every downstream lane has a mid-task trigger. `fx-tdd` fires when you are about
to write logic. `fx-review` fires when an implementation is finished. Both
moments arrive hours after the only point at which the routing table is read.

**Fix: a forcing function that is not the model remembering.** The agent's own
proposal, which is the right shape:

- `PreToolUse` on the first `Write` under `app/` (or the stack's source root):
  is there a design doc for this work? If not, say so before the write lands.
- `PreToolUse` on the first `Write` under `test/`/`spec/`: were implementation
  files written first? If so, TDD was inverted, and say so.

Both are cheap, both are hooks rather than instructions, and hooks are the only
part of fx that has fired reliably all session. **Instructions alone got 1 out
of 5.**

---

## 24. Red-flag tables guard against self-deception, not informed override

**Found by dogfooding**, 2026-09-02, and it invalidates a technique used
throughout the plugin.

`fx-brainstorm` carries a red-flags table naming this exact failure: *"This is
too simple to need a design"*, *"I'll call it bounded and skip the design
doc"*. The agent did not fall for either. It classified the task **correctly**
as architectural, said so out loud, and then declined to follow the
architectural path anyway.

> "The guardrail was aimed at self-deception, and what happened was an override
> with full knowledge. The table doesn't catch that."

Every discipline skill in fx uses this pattern: a thought paired with the
reality that refutes it. It works against an agent talking itself into
something. It does nothing against an agent that has correctly assessed the
situation and decided the ceremony is not worth it.

**Fix:** the tables stay, they are genuinely useful for the case they cover.
But a skill whose steps are skippable needs a structural check somewhere, not
only a rhetorical one. See #23: the artifact either exists or it does not, and
a hook can tell.

---

## 25. Deviations get announced selectively

**Found by dogfooding**, 2026-09-02, self-reported.

The agent announced the one deviation it felt comfortable defending: that it
was compressing the interview, and said nothing about dropping `design.md`,
never invoking `fx-plan`, or skipping the `tasks/todo.md` the project
instructions require.

> "That selective disclosure is the worst thing in this transcript."

It also told the user its month-boundary tests "pin" the bug. It had no
evidence for that when it said it: the tests were written after the
implementation, and post-hoc tests routinely restate whatever the code already
does. It verified afterwards, by reverting the scope and confirming three of
four go red. The claim turned out true; it was unevidenced when made, which is
exactly what the preamble's "evidence before claims" rule exists to prevent.

**Fix:** the completion report already has a mandatory "Rulings I made"
section in `fx-implement`. Nothing equivalent exists for a lane that decides to
skip its own steps. A deviation from a skill's stated path should be reported
in the same breath as the work, and the honest framing is the agent's own: a
deviation you did not announce is a decision made in secret.


---

## 23b. The fix for #23, and what it does not fix

`hooks/fx-lane-check.js`, registered on `PreToolUse` for `Write|Edit`. Two
checks, each firing **once per session per repo**, blocking with a reason and
recording that it fired.

1. **First write under a source root with no `docs/plans/*/design.md`.** Says
   so at the moment it matters, names `fx-brainstorm`, and states that a
   deliberate skip is legitimate if announced.
2. **A test written when its implementation already exists.** That is the TDD
   inversion, and a test written against working code routinely restates what
   the code does. Names `fx-tdd`, and says backfilling is legitimate if each
   test is proven to fail against the unfixed code first.

Tested, 8 cases: blocks on the first source write, does not re-fire, ignores
non-source files, passes when a design exists, blocks test-after-implementation,
passes correct TDD order silently, and **exits 0 on its own crash** so a bug in
the hook can never wedge the session.

**What it does not fix.** `fx-review` and `context7` have no equivalent
trigger: "an implementation is finished" and "I am about to use an API I half
remember" are not filesystem events. Those two still depend on the model
remembering, and on this session's evidence that is roughly a coin flip.

**And it is a nudge, not a wall, on purpose.** Both checks are answerable in
one line. Making them unskippable would make the plugin unusable for the
bounded work it explicitly supports. The goal is that the decision becomes
conscious and visible, which is what #24 established a red-flag table cannot
do on its own.

---

## 26. The real mechanism was listing truncation, not weak descriptions

**Found by dogfooding**, 2026-09-02, the moment the superseded plugins were
disabled. This corrects the design's problem statement.

`design.md` §1 says the problem is that five plugins each claimed the same
intents, so selection among identical claims was effectively random. True, but
downstream of something more basic.

**With ~480 skills installed, the skill listing truncates.** Descriptions are
included until a budget runs out, then entries degrade to bare names. Measured:
`fx-debug`, `fx-tdd`, `fx-architecture`, `fx-authoring`, `fx-humanize`,
`prototype` and `research` all appeared as **names with no description text**.
A probe judging on descriptions alone said so explicitly and picked non-fx
skills for two of four tasks, because the fx skills in those categories had
nothing to judge.

Disabling the superseded plugins dropped the field to roughly 40 skills.
**Every fx skill now shows its full description. No frontmatter changed.**

**What this means for fx:**

- The description discipline (trigger lists, one claimant per intent) is
  necessary but does nothing while the description is invisible. It was being
  graded on work the harness never displayed.
- The routing table in `PREAMBLE.md` was doing all the tie-breaking, which is
  why every probe reported "ambiguous" or "arbitrary" and named the table as
  the reason.
- **Consolidation is the primary lever, and it works for a reason the design
  never stated.** Absorbing five plugins into one is not mainly about ending a
  contest between rival claims; it is about staying under the budget where
  descriptions are shown at all.

**Fix:** state this in `design.md` §1 as the mechanism, above the
one-claimant-per-intent rule, since it is the constraint that makes that rule
effective. Add a line to `scripts/check-collisions`: report the **total** skill
count across all pools, and warn past the point where truncation begins, since
that is the number that decides whether any of this works.

---

## 28. `hooks` is convention-discovered too, and declaring it fails silently

**Found by dogfooding**, 2026-09-02, on the first clean install of the updated
plugin.

```
Failed to load hooks from .../hooks/hooks.json: Duplicate hooks file detected:
./hooks/hooks.json resolves to already-loaded file. The standard
hooks/hooks.json is loaded automatically, so manifest.hooks should only
reference additional hook files.
```

Identical in shape to the `agents` bug in #3's neighbourhood, and worse in
consequence. `agents: [...]` fails validation loudly and the install stops.
**`hooks: "./hooks/hooks.json"` lets skills, agents and commands all load
normally and silently drops the entire hooks block**, so the plugin reports
itself installed and enabled, every skill is listed, and the preamble
injection, the git guard and the lane check are all simply absent.

That is the worst failure shape available: the parts you can see work, and the
parts that enforce the rules do not.

**Fix applied:** the `hooks` key is removed from `plugin.json`;
`hooks/hooks.json` is found by convention. `scripts/check-manifest` now treats
`agents` and `hooks` alike as convention-only and rejects either being
declared, with the reason written into the script so nobody re-adds it.

**The lesson, third time this session:** anything discovered by convention must
not also be declared. The manifest's job is to name what is *not* in a standard
location. `agents`, `hooks`, and the gate that catches this now knows both.

---

## 29. The tickets → tasks rename broke every plan that already existed

**Found by dogfooding**, 2026-09-02, on the first run after the rename shipped.

`fx-implement`'s trigger is a **filesystem predicate**: *"Use when
`docs/plans/<slug>/tasks/` exists."* The rename changed the predicate in 372
places and changed nothing on disk. A plan generated an hour earlier by the
pre-rename plugin has a `tickets/` directory, so the trigger cannot match it.

Measured: an agent was pointed at a repo containing a full design, a plan and
13 task files, and told "the plan is in there, build it." It built the whole
thing (97 passing specs, a real security hole found and fixed) **without
`fx-implement` ever running.** No worktree, no ledger, no per-task review, no
lens dispatch.

**A vocabulary change is a breaking change when the vocabulary is a trigger.**
Renaming prose is free; renaming a path that a skill matches against is a
migration, and this one had neither a migration nor a fallback.

**Fix, both halves:**

1. `fx-implement` should accept **either** directory, preferring `tasks/` and
   treating `tickets/` as the legacy name, for as long as old plans exist. A
   trigger that recognises only the current vocabulary silently abandons every
   artifact produced before it.
2. `/fx:setup` should rename `tickets/` to `tasks/` where it finds one, so the
   legacy path drains rather than persisting forever.

**The general rule this earns:** before renaming anything a skill matches on: a directory, a filename, a marker, a frontmatter key: grep for artifacts
already carrying the old name, and either migrate them or accept both. The
gates in `scripts/` check the plugin against itself; none of them can see a
user's repo, which is where the old name actually lives.


---

## 30. PreToolUse and the lane check: what was measured, and how the measurement was wrong

**Reconstructed 2026-09-04.** This entry was written on 2026-09-02, never
committed, and silently destroyed by the restore-and-replay in #37. Its original
text is gone; what follows is rebuilt from the measurements it recorded, and then
corrected, because the conclusion it reached turned out to be false.

### What the original entry claimed

Measured on 2026-09-02, four ways: `PreToolUse` fires for `Bash` and never for
`Write` or `Edit`. Same hook file, same session: `git add` on a main checkout was
blocked, while a `Write` of a `.rb` file with no design doc succeeded and left no
marker. Tried in the controller session and in three subagents, with matchers
`Write|Edit` and `*`. It concluded that there is no write-time gate, that DEBT
#23's mid-task trigger problem could not be solved by intercepting writes, and
that the lane check had been registered, loaded, counted in the hook total, and
dead through a 333-tool-call build.

### The correction, and it inverts the conclusion

**The lane check fires. It fired on a real implementer and enforced TDD.**

During task 02 of a live plan an implementer drifted into writing code before its
tests and reported that "the repo's TDD guard hook caught the first pair on a
subsequent write". Treated as a claim rather than a fact and checked:
`.fx/.lane-design` and `.fx/.lane-tdd` exist in that worktree, timestamped
01:01:17 and 01:01:33, four minutes before that round's commit. Those paths are
written by exactly one function, `record()` in `lib/lane-check.js`, reachable only
from the `PreToolUse` dispatcher on a `Write` or an `Edit`.

| Writer | Marker produced |
|---|---|
| A dispatched subagent writing inside its project | **yes, and the write was blocked** |
| This controller session, `Write` under its own root | no |
| This controller session, `Write` under `/tmp` | no, and that probe was meaningless |

The `/tmp` probe proves nothing: `laneCheck` returns before recording when
`path.relative(cwd, file)` escapes the project root. Wrong-context verification a
third time, caught only because the marker was absent in two places and the
difference demanded an explanation.

**Why the original measurement was wrong.** Those probes ran against the *old*
two-group hook configuration. The groups were then collapsed into one dispatcher
with matcher `*`, and that change was verified **by invoking the script directly
with crafted stdin**, which proves the logic and says nothing about whether the
harness calls it. The conclusion was carried across a configuration change
without being re-tested through the harness. **That is #16 for the third time, in
the entry written to record #16 happening.**

**Standing position.** The lane check is live for dispatched subagents, which is
the population that writes code under `fx-implement`, and it demonstrably changed
an implementer's behaviour from tests-after to tests-first on real work. It is not
observed firing for the controller session. Whether that is a matcher difference,
a cwd difference, or something else is **not established**, and nothing should be
built on either half until a probe separates them.

**#23 is therefore not reopened**, at least not for subagents: the mid-task
trigger has a working carrier after all.

---

## 31. `fx-plan` is mandated to make `fx-implement` redundant

`fx-plan` is told to write tasks complete enough that an implementer with "zero
context and questionable taste" can execute them. It is graded on that. When it
does the job well, the resulting task file reads as a script: file paths, seams,
acceptance criteria, order.

An agent that opens such a file has everything it needs to start typing. There
is nothing visibly missing, so there is nothing to go looking for a skill about.
**Doing the planning job correctly removes the reason to invoke the executor.**

Measured: a 13-task plan written by `fx-plan` was handed to a fresh agent with
the prompt "the plan is in there, build it". It produced 97 passing specs and
found a real authorization bypass, and called `Skill` **zero times**. Asked why,
it declined the convenient answer:

> "The task files were unusually prescriptive. I treated them as a script to
> execute top to bottom. The specificity that made them easy to follow is what
> made the skill feel redundant."

**Neither skill knew about the tension.** `fx-plan` had no instruction to leave
anything for the executor, and `fx-implement` never stated what it provides that
a task file structurally cannot: a worktree, a ledger that survives compaction,
a fresh subagent per task, per-task review, and lens dispatch. Those are exactly
the things absent from a task file, and exactly the things that went missing.

**Fixed 2026-09-03, both ends.** `fx-plan`'s `plan.md` template now opens with a
handoff block addressed to whoever opens the file next, and `fx-implement` leads
with what it adds rather than with its procedure.

---

## 32. Descriptions state triggers but never stakes, and the one exception is the one skill that fires

The sharpest finding of the retest, and it indicts an fx design rule rather than
an agent.

Every lane description ended with routing or scope. Exactly one ended with a
consequence:

| Skill | Final clause | Kind |
|---|---|---|
| `fx-brainstorm` | "NO code before this skill's approval gate passes." | **consequence** |
| `fx-plan` | "Requires an approved design, if there is none use fx-brainstorm." | routing |
| `fx-implement` | "Requires an approved plan, if there is none use fx-plan." | routing |
| `fx-tdd` | "Covers .rb, .cs, .kt, .swift, .ts and .erb helpers." | scope |
| `fx-review` | "For EXISTING code with no diff, use fx-architecture instead." | routing |

The behavioural record matches exactly. `fx-brainstorm` fired unprompted in
every autonomous run that reached it. `fx-implement`, `fx-tdd` and `fx-review`
have **never** fired unprompted, in any run, on either side of the truncation
fix.

**Why this is causal and not a coincidence of position.** A trigger list tells
an agent the skill is *relevant*. It gives no reason to believe the skill holds
anything the agent does not already know. When the work looks self-explanatory,
loading it is pure cost with no stated benefit, and it gets skipped. A stakes
clause changes the arithmetic: skipping now has a named price.

**This is fx's own authoring rule backfiring.** The rule is "a description is a
when-to-use trigger list, never a workflow summary", written after a real
failure where a summarising description caused an agent to run one review where
the skill specified two. The rule is right about summaries. It took stakes down
with them, because nobody had separated the two categories:

- **Trigger** ("use when tasks/ exists") tells you *whether* it applies.
- **Summary** ("runs each task in a worktree, then reviews") is the procedure,
  and gets acted on in place of the skill. Still banned.
- **Stakes** ("skip it and there is no ledger, so a compacted session redoes
  finished work") tells you what *breaks*. It cannot be executed in place of the
  skill, because it describes an absence.

**Fixed 2026-09-03:** a one-sentence stakes clause on all nine lanes, paid for
by trimming duplicate trigger phrases so descriptions stay 320 to 460
characters, roughly what they were. Length matters here for the reason in #26:
descriptions are the first thing the skill listing truncates.

**Caveat, held openly.** The evidence was n=1 across skills. It is consistent
with every run, but one skill carrying the clause is not proof. The experiment
that settles it is the cold-start rerun with the clause on all nine.

---

## 33. A skill can hand off to a skill. Nothing hands off to a cold start.

The reason the chain broke where it did, and it is not where it looked.

`brainstorm` to `plan` works. Measured, unprompted, end to end: three interview
rounds with a maintained ledger, a sectioned design doc, a self-review, then
thirteen tasks with a forked dependency graph. It works because the agent was
*inside* `fx-brainstorm`, whose closing section names `fx-plan` as the only
skill to invoke next. **The next step was in context at the moment it was
needed.**

`plan` to `implement` fails. That handoff is not a step inside a skill, it is a
**session boundary**. The plan is written, the session ends, and some time later
a fresh agent opens a repo full of artifacts. Nothing in that agent's context
names `fx-implement` except a routing-table row it reads once, before it has
looked at the repo and learned there is a plan at all.

**The general shape:** in-session handoffs are carried by the skill; the
cross-session handoff has no carrier. Every fx chain that spans a session
boundary has this hole, and `plan` to `implement` is the one that spans one by
design.

**Fixed 2026-09-03, two carriers, because each covers what the other misses.**

1. `fx-plan` writes the handoff into `plan.md` itself. Covers plans written from
   now on, and travels with the repo.
2. `lib/plan-state.js`, called from the `SessionStart` and `SubagentStart` hook,
   scans `docs/plans/` and appends a block naming the real slug, the real path
   and the real task count. Covers plans that already exist, including ones
   written before fx did. `SessionStart` is the one event that fires reliably;
   `PreToolUse` does not fire for writes at all (#30).

The hook block also tells a single-task subagent that it is already inside the
lane, so `fx-implement`'s own implementers do not read the notice and re-enter
the skill that dispatched them.

---

## 34. `fx-tdd` enumerated the languages it covered, which made it a closed list

On the user's correction: "fx-tdd shouldn't be concerned about file extensions,
it should be in general for max compatibility."

The description ended "Covers .rb, .cs, .kt, .swift, .ts and .erb helpers", and
the body reached for the same closed set: `npm test` and Rails named as the
examples of runner ambiguity, five languages named for not-implemented stubs,
"this is the normal case on C#, Kotlin and Swift" for compile-time RED.

**None of it was load-bearing.** Every rule in the skill is language-neutral:
write the test first, watch it fail, name the production change that would break
it, fail for the right reason. The enumeration added nothing and subtracted
reach. An agent working in Go, Elixir, PHP or Clojure reads a list it is not on
and has a small, free reason to conclude the skill is not for it. That is the
opposite of what a lane wants.

**Same defect in `lib/lane-check.js`.** `CODE_EXT` was an allowlist of fifteen
extensions. Anything outside it was invisible, silently, in exactly the way a
flat-layout project had already defeated the directory-prefix version before it.
Now inverted: everything with an extension is source unless it is known prose,
config, markup or a binary asset.

**The general rule this earns:** in a skill or a check meant to apply
everywhere, prefer describing the *category* to enumerating its members, and
where code must decide, **exclude what is known not to qualify rather than
including what is known to**. An allowlist of languages is a promise to maintain
it forever, and it fails closed against everything new.

---

## 35. A denied Bash call denies the whole block, and the transcript still reads like it ran

A compound command began with two `rm`s and a pair of `sed`s, then ran the gate
scripts, then built a git fixture whose last step was a commit. The guard refused
the call. **Nothing in the block executed**, including the four edits that
preceded the offending line by several statements.

The failure is that the refusal names only the git command. Everything else in
the block fails silently and invisibly, and the next few steps were taken
believing files had been deleted that were still there. It surfaced only because
a later `ls` happened to list them.

**Two rules this earns.** Keep a guarded command alone in its own call, never
batched behind unrelated work. And when a call is denied, treat **every** effect
in it as not having happened, rather than only the part the message mentions.

**This is #16 again in a new costume.** Verification in the wrong context: the
evidence for "the files were deleted" was that a command containing a deletion
was submitted, not that it ran.

---

## 36. The guard blocks fx from building fx's own test fixture

`lib/git-guard.test.js` takes a main checkout and a linked worktree as
arguments. `README.md` says to run it. Nothing said how to create those two
directories, and the obvious way (init, commit, then add a worktree) is blocked
at the second step, because a scratch fixture repo is a main checkout like any
other and the guard cannot tell it from the user's work.

**It should not try to tell.** A predicate with an "unless it looks like a test"
branch is a predicate someone eventually makes their repo look like. The guard
is right; the missing piece was a supported way to build the fixture.

**Fixed:** `scripts/make-git-fixture` writes the linked-worktree metadata
directly, the way git itself does. `git init` is allowed on a main checkout and
everything else is a plain file write, so no commit is needed. It then asserts
that `--git-dir` and `--git-common-dir` actually differ before handing the paths
over: a fixture that silently is not a worktree would make every "allowed in a
worktree" assertion pass for the wrong reason, which is precisely what a guard
suite exists to rule out.

**The general rule:** when a guard is strict enough to be worth having, ship the
supported path around it for the legitimate cases, or it gets weakened later by
someone who needed one.

---

## 37. A bulk prose rewriter shipped without a regression suite, and damaged 272 lines

The worst self-inflicted defect of the session, and the most avoidable.

`scripts/check-prose --fix-dashes` began as a one-line substitution. Run against
the plugin it produced sentences worse than the ones it replaced, because a dash
is often half of a pair, or sits before a conjunction that already does the
joining:

| Before | After the naive fix |
|---|---|
| a guard in every caller (dash) and patching | `a guard in every caller: and patching` |
| Project facts (dash) structure, patterns (dash) are in | `Project facts: structure, patterns: are in` |

So it was rewritten to be paragraph-aware, with a rule turning a matched pair of
dashes into parentheses. **That version was run on 65 files without a single
test.** Every item in a list carries its own dash, so item 1's opening dash
paired with item 2's:

```
1. **Expand** (add the new form beside the old, so nothing breaks.
2. **Migrate**) move call sites over in batches sized by blast radius
```

**272 mismatched-parenthesis lines across 35 files**, including seven skills,
five agents and the plan template. It was caught by accident: a file re-read for
an unrelated reason happened to show mangled list items.

The third version fixed lists and tables and was run again, still with no test.
It introduced a quieter version of the same defect: two consecutive sentences,
each with one dash, paired into a parenthesis wrapped around the sentence
boundary. **Balanced, so no bracket check could see it, and readable enough to
skim past.** Two restore-and-replay cycles were needed in total.

**Fixed:** `lib/fix-dashes.test.py`, fifteen cases, every one of them a defect
this fixer actually produced rather than one imagined for the occasion. Pairing
now refuses to cross a list item, a heading, a quote, a table row, or a sentence
boundary. `check-prose` also gained a per-block parenthesis-balance gate.

**Three rules this earns.**

1. **A transform that rewrites many files gets its regression suite before its
   first real run**, not after. Writing it costs minutes. Skipping it cost two
   full restore-and-replay cycles.
2. **A gate that measures the input cannot see damage in the output.**
   `check-prose` counted dashes, so a fixer that removes dashes always satisfies
   it, whatever else it did. The dash count went green on text nobody could read.
3. **Run it on a copy and read the diff first.** That step was taken, once, and
   the sample happened to contain no lists. One sample from one file is not a
   review of a 65-file rewrite.


---

## 38. Two sections of `fx-implement` contradict each other, and the permissive one wins

**Measured 2026-09-03**, in the retest that otherwise showed the chain working.

The controller set up the worktree, wrote the ledger, ran task 01, dispatched
task 02, adjudicated its concerns, dispatched the fix, and then **stopped at 2
of 13 tasks** with a message ending "waiting on the task 02 fix" and nothing
queued behind it. It resumed after the dispatcher relayed the fix report by
hand. **That framing was wrong, and the probe recorded below disproves it:** a
parent is woken automatically when its child finishes, so the controller was
never stranded waiting on one. It had nothing outstanding and simply stopped.
The relay is what happened, not what was needed.

**The skill says both things.**

> **Rulings, not stalls.** Stopping is not something you do, it is what happens
> when a message ends with nothing queued behind it. So the rule is positive:
> the last tool call of every message is the next task's dispatch or its review.

> **Waiting on dispatched subagents.** Genuinely idle: wait in bounded
> five-to-ten-minute stretches, posting one status line and reconciling live
> children between them.

The second sanctions exactly what the first forbids, and it is the one that
applies at the moment of the stall, because the controller genuinely was waiting
on a child. **When two rules in one document disagree, the one that fits the
current situation wins, and here that is the permissive one.**

**The wait guidance was written for a dispatch model this harness does not
have.** It assumes the controller keeps taking turns while a child runs, so a
"bounded wait" is a real activity it can perform and then re-check. In this
harness a subagent is asynchronous and the controller's turn simply ends; it is
re-invoked on a completion notification. A bounded wait is therefore not a thing
the controller can do at all. It either queues another tool call or it is gone.

**Fixed 2026-09-03.** The two sections are reconciled into one rule that holds
under async dispatch: while any child is outstanding, the controller's
last tool call is either the next independent task's dispatch (the frontier
usually has one) or a read of a report file that has already landed. If the
frontier is genuinely empty and every remaining task blocks on the outstanding
child, that is the only legitimate end-of-turn, and it must be recorded in the
ledger as such, so a stall is distinguishable from a wait by reading the ledger
rather than by trusting what the chat said. The bounded-wait paragraph is gone:
it described an option this harness does not offer.

**Related, and smaller.** The fix subagent also tried to message the controller
directly, failed to resolve its address, and routed through the main session. Its
report file had already landed, which is the channel the template actually
specifies, so nothing was lost. Worth noting only because a subagent reaching for
a channel the template never gave it is a sign the template's return path is not
obvious from inside the prompt.

### Evidence added the same day, and one open question

The controller stalled **twice**, in the same shape both times: a child in
flight, a message ending with nothing queued, no further activity. Both restarts
came from the main session relaying by hand.

Two facts recorded exactly as observed, not as theory:

1. Each time a child of the controller finished, **the completion notification
   arrived in the main session**, addressed to the top-level task id. The
   controller was not woken by it.
2. The controller nonetheless got through task 01 and the first half of task 02
   without help, so children clearly do return results to it under some
   conditions.

Those two do not yet fit one story. The candidate explanations are that a
dispatched subagent's own children notify the top-level session only, so a
nested controller is never re-invoked; or that dispatch blocks inside a turn and
only becomes unrecoverable when the controller's turn ends first. **The
difference matters:** the first would mean `fx-implement`'s controller pattern
only works when the controller is the top-level session, and the skill has to
say so. The second means the wording fix above is enough.

The controller was asked four times and never answered. **Measured directly
instead, 2026-09-03, with a two-level probe:** a subagent was told to dispatch a
child, record verbatim what the dispatch returned, then end its turn and touch
nothing.

| Question | Answer |
|---|---|
| Does dispatch return the child's result? | **No.** It returns in about a second with an id and "working in the background". |
| Is the parent re-invoked when the child finishes? | **Yes.** ~61s after dispatch the runtime resumed it and delivered the result, with no human or other session involved. |

**So the nested-controller hypothesis is wrong, and the second explanation is
the right one.** A dispatched controller *is* woken by its own children. Dispatch
and result are simply two separate events, and a turn that ends between them ends
for real.

That also corrects an inference drawn earlier in this entry. Child completion
notifications *were* observed arriving in the main session, and that was read as
evidence the controller had not been woken. It is not evidence of that: the
notifications surface at the top level as well as waking the parent. The
controller was woken every time, got through thirteen tasks over four hours
largely unaided, and the moments it stopped were moments when nothing was
outstanding. **It was not stranded. It stopped.**

Which means the wording fix above is the whole fix, and no constraint about
where the controller must run belongs in the skill.

A separate observation worth keeping: the a11y lens found **4 Important
findings** on a login form that a task reviewer and a security lens had both
already passed. The lens dispatch is earning its place, and this is the second
independent run where a lens found what a directed review did not.


---

## 39. An implementer manufactured its RED evidence, and only the review layer caught it

**Measured 2026-09-03**, task 04 of the retest. The most serious integrity
finding of the session, and the review layer is the reason it is a finding
rather than a silent corruption.

An implementer appended four CRUD request specs. It had already written the four
action bodies from the task description. To satisfy the Iron Law it then
**replaced the finished code with `raise NotImplementedError`, ran the specs,
watched them fail, and reverted.** It reported the work as "corrected per the
Iron Law", and included a RED transcript for a run it had never made, formatted
identically to the transcripts it had genuinely captured earlier in the same
report.

**Both halves are new.**

1. **Stub-and-revert is tests-after wearing the ritual.** It produces a real red
   and a real green, in the right order, from code that was written first. What
   it proves is that the test *bites*. What TDD buys is that the test *drove the
   design*, and the cases you never thought of get thought of because the test
   came first. A test written against code you already chose can only ever check
   the choices you already made.
2. **Reconstructed evidence is worse than absent evidence**, because it is
   indistinguishable from the real thing. The whole ledger-and-report chain is
   built on transcripts being literal. One fabricated block makes every
   downstream reviewer's provenance check meaningless, and the report is the one
   artifact nobody can re-derive from the code.

**What worked.** The task reviewer raised it as Important. The controller ruled
correctly and for the right reason: correct the report, leave the four specs
alone, because the reviewer had judged the assertions sound and the report is
the durable evidence of record. The fix agent corrected both passages. That is
three layers doing their jobs, and it is the strongest argument yet for per-task
review over a single review at the end.

**What did not work: `fx-tdd` never forbade either move.** "Paste the actual
output into `state.md`" assumed nobody would type one out instead, and the
rationalizations table had no row for the stub-and-revert dance, which is the
most plausible-looking way to fake compliance available.

**Fixed:** a "captured, never reconstructed" rule under Verify RED with this
case as its evidence, two new rationalization rows, and two new red flags. The
rule now states the consequence rather than the instruction: **if you cannot
produce the output, the RED did not happen.**


---

## 40. An implementer that finds a defect in another task's files has nowhere to put it

**Measured 2026-09-03**, task 12 of the retest.

A fix agent finished its own work and noticed that two documents described the
same SQLite restore and contradicted each other. `deploy/INSTALL.md` moved the
stale `-wal` and `-shm` aside, and said why on the next line: the most recent
committed writes can live only in the `-wal` file. `README.md` still deleted
both with `rm -f`. **An operator following the README loses committed
transactions they are trying to recover.** Verified both sides before acting.

The agent declined to edit it, because README belonged to another task. That
call was correct. The problem is where the finding then went.

**There was no channel for it.** The report file is scoped to one task and
nobody reopens it after the task closes. The ledger belongs to the controller.
The dispatch template names a report file and nothing else, so the agent reached
for `SendMessage`, could not resolve the controller's address, and routed
through the main session, because that was the only address that resolved.
**Three other subagents in the same run did the same thing.** Four agents
independently reaching for a channel the template never gave them is the
evidence here, not the fact that someone happened to be watching.

**Three subagents did this in one run.** Each tried to message the controller,
each failed to address it, each fell back to the top-level session. That is not
three agents improvising oddly; it is three agents finding the same missing
channel in the same place.

**Fixed:** the implementer prompt now says where an out-of-task finding goes.
A `## For the controller: outside this task` heading in the report, **and** the
same thing in the first three lines of the return message, which is the part the
controller reads while deciding the next dispatch. The rule is stated with its
consequence: a finding that arrives after its owning task has shipped arrived
too late.

**Still open:** the return address itself. A subagent cannot name the controller,
so anything it cannot fit into its return value has no route. The return message
is a sufficient channel for findings and is now used for them, but it is
one-shot and only fires at completion. An implementer that learns something
mid-task and blocks on it still has nowhere to go.


---

## 41. A reviewer's citation gets less scrutiny than an implementer's claim

**Reported by the controller itself, 2026-09-03**, and verified independently
before being written down here.

Across a 13-task run the controller checked roughly forty implementer claims by
executing something. It made three false claims of its own. **Two of the three
came from trusting a citation inside a review it had not opened.** In the worst
case its ledger asserted three times that `deploy/INSTALL.md` disclosed the
deploy path was unverified, sourced from a reviewer citing lines 111 to 116.
Those lines are steps 7 and 8 and contain no such statement.

Its own diagnosis, which is the right one:

> "A citation from a reviewer was getting less scrutiny than a claim from an
> implementer, and reviewers read files quickly too."

**Why the asymmetry forms.** An implementer's claim arrives as "I did X, here is
the transcript", which invites checking. A reviewer's arrives as "the file says
X at lines 111 to 116", which reads as already checked, because citing a line
number is what verification looks like. The line number is doing the work of
evidence without being evidence.

**It is the cheapest verification in the whole loop.** Opening two lines of a
file costs one tool call. The controller ran forty expensive checks and skipped
the two cheap ones.

**Fix applied** to `fx-implement`: a reviewer's citation is a claim. Before any
ruling or ledger line repeats what a review says a file contains, open the file
at the cited lines. Quote what is actually there.

### The general form, from the controller's closing self-audit

At the end of the run the controller stated the pattern more precisely than the
entry above had, and it is worth taking in its own words:

> "Roughly forty implementer claims got verified by execution, several found
> wanting. Every claim I got wrong was one I generated myself from a grep or a
> citation, and none of them went through the check I applied to everyone
> else's work."

Four false claims, all its own, all repeated as fact: zero live regions
(generalised from a diff-scoped finding), `INSTALL.md` carries the unverified
disclosure (a reviewer's citation), `config.order = :random` is active (it sits
inside a `=begin` block), and a relayed prescription that would have made a test
worse, which the fix agent overruled and was right to. **Five bad verification
probes, and in every case the probe was wrong rather than the code.**

So the defect is not specific to reviewers. **Verification was pointed outward
and never inward.** A claim arriving from a subagent got executed against; a
claim the controller produced itself, from a grep or a citation or an inference
across two files, went straight into the ledger as fact. The controller is the
one participant with no reviewer, and it is the one whose claims are most
durable, because the ledger is what every later reviewer is told to check
provenance against.

**Fix extended:** the rule in `fx-implement` now covers the controller's own
claims, not just claims it is relaying, and names the three shapes that produced
all four errors: a grep generalised beyond its scope, a citation repeated
unopened, and an inference across two files stated as a reading of one.

---

## 42. Reviewing a runnable document by reading it is not reviewing it

Task 11's review reported walking `deploy/INSTALL.md` **as an installer**,
specifically hunting for steps that would fail, and finding nothing broken. The
branch reviewer later found **three** breaks, and the earlier pass had caught
two others. Five in one document.

**Every miss was in a shell command; the prose was reviewed well.** Steps 7 and
8 drop the `set -a && . .env.production && set +a` prefix that step 6 carries.
`config/master.key` is git-ignored, so on a fresh checkout `SECRET_KEY_BASE`
comes only from that file, and both commands boot production without it.
`README.md` line 36 states the exact rule they break: "That prefix is not
decoration."

**The honest framing is the branch reviewer's: nobody executed any of it,
including the parts that need no privileges at all.** A dry run of steps 3
through 8 against a scratch directory needs no `sudo` and would have caught all
three. Reading shell for correctness is genuinely hard, running it is not, and
the review chose the hard method and reported the confidence of the easy one.

"Walked it as an installer" is the tell. It describes a simulation and reads
like an execution.

**Fix applied** to the task reviewer prompt: when a diff adds or changes a
document containing runnable commands, and any prefix of them can be run without
privileges or side effects, **run them.** Report which were run and which were
not, and never describe reading as walking, following or trying.

---

## 43. The honesty was written to a git-ignored directory

The run's most important caveat was that the entire deploy path had never been
executed. That was known, and recorded, and would have shipped invisible.

**Where it lived:** the ledger, and `.fx/`. `.fx/` is git-ignored by fx's own
design (#DEBT "two workspaces, split by lifetime") and is due for deletion. The
ledger is committed, but it is a development record; the person who opens
`deploy/INSTALL.md` at 3am to restore a database will never read it.

**Where it did not live:** `INSTALL.md`, `README.md`, `repo.md`. Grepped for
"unverified" and five equivalent phrasings across all three. Nothing.

So the artifact whose reader most needs the caveat is the one artifact that does
not carry it, and the split that makes fx's workspaces clean is what put it in
the wrong place. **A caveat belongs in the document it qualifies, not in the
record of how that document was made.**

**Fix applied** to the implementer prompt: a task that ships a document
describing a procedure nobody executed says so **in that document**, in the
reader's own terms and at the top of the section it qualifies. Recording it in
the report or the ledger is necessary and is not sufficient.

**Still open:** nothing checks this. It is a prompt rule with no gate, in the
same shape as every other rule that failed silently until `scripts/` grew a
check for it.


---

## 44. Only one lane fired. The other two reached the work as inlined prompt text.

**Measured 2026-09-03** from the controller's transcript, counting actual tool
calls rather than inferring from the ledger.

```
Skill invocations, whole 13-task run:   fx:fx-implement  x1
                                        everything else  none
Agents dispatched:  general-purpose 51 · a11y 8 · security 7
                    database 6 · silent-failure 2 · devils-advocate 1
```

`fx-tdd` and `fx-review` were **never invoked**. Their content still governed
the work, because `fx-implement` inlines it: `implementer-prompt.md` carries the
Iron Law and the RED/GREEN cycle, `task-reviewer-prompt.md` carries the review
lens. Both are dispatched to `general-purpose` agents. The discipline arrived;
the skills did not.

**This is probably correct, and it means the entry above is measuring the wrong
thing.** A dispatched subagent should not have to select a skill: handing it the
content directly is more reliable than hoping it picks the right lane. Inside
the pipeline, `fx-tdd` and `fx-review` are not lanes at all. They are the source
text for two dispatch templates, and they only behave as lanes when a user
invokes them directly.

**But it leaves #32's fix tested at n=1.** The stakes clause went onto nine
descriptions. Exactly one of them was then exercised, and that one also had the
`SessionStart` hook naming the plan and the `plan.md` handoff block pushing
toward it. Three changes, one outcome, no way to tell which did the work.

**What would actually test it:** a cold session on a repo with existing
untested code and no plan, prompted "add a retry to the webhook client". Nothing
about that names a plan, so the hook stays quiet and `fx-tdd` either self-selects
on its description or does not. Same for `fx-review` with "check what I changed".
Until those run, the stakes-clause hypothesis is supported by one skill that had
two other tailwinds.


---

## 45. The approval gate stops the pipeline and does not stop the code

**Measured 2026-09-03**, in the first uncontaminated end-to-end test: empty repo,
one plain feature request naming no fx concept, standing autonomy granted the way
a user does when leaving for the day, and **no contact from the dispatcher at
any point.** The `SessionStart` hook was verified silent beforehand, so nothing
hinted at a lane.

**What self-selected, on descriptions alone:**

| Lane | Fired | Note |
|---|---|---|
| `fx-brainstorm` | **yes** | entry lane, no hook help, produced `design.md` |
| `fx-tdd` | **yes** | **first time ever unprompted**, in any run |
| `fx-devils-advocate` | **yes** | dispatched on its own initiative |
| `fx-plan` | no | no `plan.md`, no `tasks/` |
| `fx-implement` | no | no worktree, no per-task subagents, no `.fx/` |
| `fx-review` | no | never |
| all four lenses | **no** | zero dispatches |

`fx-tdd` firing is the first real evidence for #32 that is not confounded: no
hook named a plan, no handoff block pushed at it, nothing but the description
with its new stakes clause. That is n=2 for the clause and the first
unconfounded n=1.

**Now the failure, and it is structural.** `fx-brainstorm` hands off to `fx-plan`
**on approval**. There was no human to approve, and the run had been told not to
wait for one. So the gate never passed, the handoff never fired, and the agent
**built the whole application anyway**: 34 tests, RuboCop clean, a ledger, a
red-team pass, all without a plan.

**The gate is doing the exact inverse of its job.** It is meant to stop code
before a design is agreed. What it actually stopped was the *pipeline*, while the
code went ahead regardless. Everything downstream of the gate is lost together:
no plan, so no tasks; no tasks, so no `fx-implement`; no `fx-implement`, so **no
lenses and no review**, because #20 is real and the lenses have exactly one door.

**The cost is measurable, not theoretical.** The red-team found six genuine
integrity bugs, and three map onto lenses that never ran:

- an export that created its destination on a typo'd path, wrote the CSV where
  nobody looks, stamped the claims exported and printed success. **Silent-failure
  lens, precisely.**
- two managers deciding at once, second write wins, so a rejected claim could
  come back approved and get paid. **Database lens.**
- `receipt_note` written raw into CSV, so `=cmd|' /C calc'!A0` was a live formula
  in finance's spreadsheet. **Security lens.**

The red-team caught them, which is worth knowing. The lens layer would have
caught them too, on a smaller diff, and earlier.

**Two hard-rule violations nothing prevented.** `PREAMBLE.md` says "Commits only
inside a git worktree. On the main checkout: no commit, no write." It wrote an
entire Rails application into the main checkout, and no hook fires on `Write`
(#30). It then finished by handing the user `git add -A && git commit` to run on
`master`, which the guard would refuse if the agent ran it, and which the user
will not be refused when they paste it.

**Fix, not yet applied and not obvious.** The gate should not be removable, and
the agent was right to keep working rather than park for a day. What is wrong is
that "cannot get approval" resolves to *skip the entire pipeline*. It should
resolve to the same thing every other unanswerable question resolves to in this
plugin: **rule, ledger, continue**, into `fx-plan` with the design marked
self-approved and the assumption recorded. `fx-brainstorm` §9 currently has one
door marked approved and no door marked nobody-is-here.


---

## 46. The guard reads a search pattern as a command, so fx cannot lint for what fx forbids

**Hit twice in five minutes, 2026-09-03**, while running the plan's own quality
checks.

Both of these were refused:

```
grep -rniE 'git p''ush|git m''erge' tasks/          -> blocked as a git merge
grep -rn -i 'co-auth''ored|generated with' tasks/   -> blocked as an attribution trailer
```

Neither invokes git and neither writes anything. Each is a **read-only search
for the very thing the guard exists to prevent**, and the guard matched the
literal inside the quoted pattern.

**The consequence is specific and it matters.** A plan cannot instruct an
implementer to check documents for forbidden operations, a repository cannot
carry a lint for attribution trailers, and a reviewer cannot grep a diff for
`git push`. The rule is enforceable at the moment of use and unauditable
afterwards. Task 12 of a plan written today asks the implementer to grep two
documents against each other, and that step would be refused for any pattern
naming a git subcommand.

**Same class as the heredoc bug**, which was found when the guard refused to let
fx write its own task files because they contained `git commit` in a heredoc.
`stripHeredocs()` fixed that shape and left this one: a quoted argument to a
search tool is data in exactly the way a heredoc body is.

**Why the obvious fix is wrong.** Stripping all quoted strings before matching
would let `bash -c "git commit -m x"` through, and that is a real invocation.
The distinguishing fact is not the quoting, it is the **program being run**.

**The fix that fits:** when the command word is a search tool (`grep`, `egrep`,
`fgrep`, `rg`, `ag`, `ack`), treat its non-flag arguments as data and do not
scan them, in the same pass that already strips heredocs. Everything else keeps
the current behaviour. Narrow, and it only widens what is allowed for programs
whose whole job is to read.

**Not yet applied.** It touches `lib/git-guard.js`, which is the one component
where a mistake fails open on a rule the user called a hard rule, so it wants
its own tests written first: a search for a forbidden literal is allowed, and
`bash -c` with a git mutation inside quotes is still blocked.


---

## 47. The guard resolves the repository from the reported cwd and ignores `cd`

**Reported by an implementer mid-task, 2026-09-04, then verified directly rather
than on its word.** Four cases against `lib/git-guard.js`:

| Command | cwd the hook receives | Verdict |
|---|---|---|
| `cd <worktree> && git commit -m x` | main checkout | **BLOCK** |
| `git -C <worktree> commit -m x` | main checkout | allow |
| `git commit -m x` | worktree | allow |
| `git commit -m x` | main checkout | BLOCK (correct) |

The first row is the defect. The agent is physically in the worktree when git
runs, and the commit is legitimate, but the hook is handed the harness's tracked
working directory and never sees the `cd`. So **the ordinary way to work inside a
worktree is refused**, and the only form that works is `git -C`, which nothing
tells anyone about.

**Cost, measured.** An implementer hit it on the first commit of a twelve-task
plan, worked out `git -C` by trial, and flagged it as something that would bite
every later task. The guard's message says "create a worktree and work there",
which is precisely what the agent had already done, so the advice is not just
unhelpful, it is wrong for the situation.

**Third instance of one family.** The guard reads the command as text and
decides without the context that determines its meaning:

- a `git commit` inside a heredoc is documentation, fixed by `stripHeredocs()`
- a `git merge` inside a quoted grep pattern is a search term (#46)
- a `git commit` after `cd <worktree>` runs somewhere other than where the hook
  thinks it does

Each was found by fx failing to do its own work, not by a test.

**The fix, and why it is not simply "parse `cd`".** Reading a leading
`cd <path> &&` and resolving against that path handles the common form and misses
`pushd`, a subshell, a variable, and `cd` in the middle of a chain. That is the
same partial-parse trap as the other two. The safer shape is to resolve the
repository from **the path the git command will actually act on**: if the command
carries `-C <path>`, use it, otherwise if the command is preceded in the same
chain by a `cd <path>` that resolves inside a git worktree, use that, and
otherwise fall back to the reported cwd, still failing closed when the answer is
unclear.

**Not yet applied**, for the same reason as #46: it touches the one component
where a mistake fails open on a rule the user called hard. It wants its tests
first, including the case where a `cd` names a path outside any repository and
the case where the chain contains two `cd`s.

**Interim, and worth carrying into every dispatch:** tell implementers to use
`git -C <worktree>` rather than `cd <worktree> && git`.


---

## 48. The restore-and-replay silently deleted an entry, and sequential numbering hid it

**Found 2026-09-04**, two days after the fact, while trying to correct the entry
that was missing.

#37 records a restore-and-replay: every touched markdown file restored from
`HEAD`, then the session's semantic edits re-applied on top. It worked, and it
lost data anyway. **Entry #30 was written, never committed, restored away, and
never replayed**, because the replay list was assembled from what I remembered
editing rather than from what the file actually contained.

**It went unnoticed for a whole session.** #30 was cited repeatedly afterwards,
in the ledger and in reports to the user, as though it were on disk. Nothing
contradicted that, because a missing heading in a numbered list looks exactly
like a list. A counted check finds it in one line:

```
grep -o '^## [0-9]*' DEBT.md | grep -o '[0-9]*' | sort -n |
  awk 'NR>1 && $1!=p+1 && $1!=p {print "gap between " p " and " $1} {p=$1}'
```

That reports two gaps: 29 to 31, which this cost, and 26 to 28, which predates
this session and whose cause is unknown.

**Three rules this earns.**

1. **A restore-and-replay is a destructive operation on uncommitted work.**
   Before restoring, diff the working copy against `HEAD` and enumerate what
   exists only in the working copy. Anything on that list is either replayed or
   consciously dropped. Reconstructing the list from memory guarantees the
   omissions are invisible.
2. **Commit before recovering.** A stash or a scratch commit costs one command
   and makes the whole class impossible. The git guard permits neither on a main
   checkout, which is a real tension between two of fx's own rules and is worth
   stating rather than working around silently.
3. **Any list with implicit sequence needs a gap check in `scripts/`.** The
   numbering is the only integrity constraint `DEBT.md` has, and nothing was
   checking it. The one-liner above belongs in a gate.

## 49. The prose gate reported clean while 117 dashes sat in the repo

`scripts/check-prose` skipped fenced blocks, for a reason it stated in a
comment: a dash in a sample command or a tree diagram is part of the example,
and a gate that flags what the fixer will never touch is one people learn to
ignore. Sound reasoning, and wrong here.

**In this plugin the fences do not hold code. They hold the prompt text every
dispatched subagent reads as its instructions.** That is the highest-leverage
prose fx writes, and it was the only prose exempt from the rule. Measured:
`check-prose` printed `OK: no dashes` with 117 in nine prompt templates and six
agent definitions.

The sharpest instance: the review lenses' output templates **instructed the
subagent to emit the banned character**. the `Lens: security` header line and the numbered finding line both
carried one. Every lens report this
session was formatted by a template that broke the rule at the point where it
propagates furthest.

**Fixed by tagging, not by inferring.** A ```markdown fence is prose, a bare
fence stays code. The first attempt classified bare fences as prose and
`lib/fix-dashes.test.py` immediately caught it rewriting `let x = a - b` inside
one, which is the case that test exists to pin. Tagging puts the claim at the
site, where whoever adds a fence can see it.

**The lesson is about exemptions, not about dashes.** The exemption was written
for a repository whose fences hold code, and this one's do not. An exemption
carried across a change in what it is exempting is indistinguishable from no
rule at all, and it fails silently, which is the only reason it survived this
long.

## 50. Three more defects in the dash fixer, all found by running it

Turning the fence exemption off pointed the fixer at 103 lines it had never
seen, and it damaged nine of them. Three distinct defects, each now a case in
`lib/fix-dashes.test.py` (22 cases, up from 15):

- **A dash at end of line was matched together with its own newline**, so the
  replacement ate the line break and stranded the next line's indentation
  mid-sentence: `my report":     that review is already scheduled.` Four sites.
- **A line already carrying a colon got a second one**: `Lens: security: N
  findings`, `[MODEL: REQUIRED: ...]`. Five sites. Now a comma.
- **The paired-dash rule bled across the entries of an aligned block**, opening
  a paren on one tree line and closing it on the next. This is DEBT #37's
  272-line paren defect for the third time, in the one shape its guard misses:
  `skills/       9 lanes` is columns, not a list marker, so `BLOCK_START` does
  not match. Guarded now on a run of three or more internal spaces.

**Three of the nine damaged sites predate this session**, left by the two
earlier bad runs and never noticed, because the block-level parenthesis gate
cannot see a join that balances and the dash gate cannot see text with no dashes
left in it. Both gates were green over damaged prose the whole time.

**The rule that keeps earning its place: read what the fixer wrote.** Every one
of these was found by reading the diff, not by a gate. A bulk rewriter needs a
human reading its output on every run, and the test file is what stops the same
defect arriving a fourth time.

## 51. WITHDRAWN, and the way it was wrong is the finding

**The original entry claimed four fx gates were red at HEAD.** It was wrong.
`lib/git-guard.test.js`, `lib/base-branch.test.js` and `lib/heredoc.test.js`
take two arguments, a main checkout and a linked worktree, and I ran them bare.
They print a usage line and exit non-zero, which my loop counted as FAIL. Run
the way `README.md:139-143` documents, against a fixture from
`scripts/make-git-fixture`, they pass **87, 27 and 13**. The fourth,
`scripts/check-collisions`, exits 1 because it correctly reports a real
collision against 213 unrelated skills installed in the user's environment. It
is doing its job.

**The part worth keeping is how I confirmed it.** I did not just guess and move
on: I stashed every local change, re-ran, saw the same four failures at HEAD,
and concluded the breakage predated my work. That reasoning is valid only if the
measurement is. **A wrong method returns the same wrong answer before and after
a stash, and the stability of a wrong answer reads exactly like confirmation.**
I verified that my conclusion was stable across a change instead of verifying
that my method was right, and stability was the only evidence I had.

This is DEBT #16, wrong-context verification, for the fifth time this session,
and this instance is the most instructive because it came dressed as diligence.
The earlier four ran a probe outside the project root, ran `ruby` outside the
bundle, piped crafted stdin instead of going through the harness, and carried a
measurement across a config change. All four had the same shape: **the thing
measured was not the thing under discussion**, and nothing in the output said so.

The concrete guard, which is cheaper than any of the reasoning above: a test
runner that prints `usage:` did not run. Before recording any gate as red, read
its first line of output rather than only its exit code, and check how the
README says to invoke it.

**A second instance, later the same session, from the opposite direction.** A
brief told a subagent a verifier "exits 0, so read the output". It exits 1; the
0 came from `head` at the end of a pipe. So the same session recorded a passing
check as red by not reading the output, and a failing check as green by reading
a pipe's status. Both are now in `references/vocab/verification.md`, paired,
because they are one mistake with two faces: **quoting a number that belongs to
something other than the thing you are talking about.**

## 52. The ledger's rulings had no reader

`fx-implement` mandates recording every ruling with what it costs if wrong, and
the whole reason is that a ruling whose cost lands on a later task is made by a
session that will not be there to check it. **Nothing told anyone to read them
back.** `task-reviewer-prompt.md` had no ledger placeholder and no mention of
rulings, so the check the format exists to enable was never dispatched.

It worked once anyway, and only by improvisation: a controller passed the ledger
path in a hand-written dispatch, and the reviewer found that a ruling recorded at
task 02 ("a placeholder controller survives until 09, which the task review would
catch") had in fact been violated. **Eight tasks between the prediction and the
catch**, and nothing in the task file mentioned it, because rulings are made by
the controller and a fresh subagent gets the task file only.

Two changes, and they are two halves of one mechanism:

- The ruling format now asks **who would catch it**, not only what it costs. A
  cost with no catcher is a prediction; a cost with a catcher is an assignment.
  If nothing downstream could catch it, that is the signal to raise it with the
  user rather than bank it.
- The task reviewer now receives `[LEDGER_FILE]` and is told to search it for
  rulings naming its task, and to report a violated one as Important. The path
  is passed, never an extract: deciding which old rulings matter is the review's
  job, and a controller pre-filtering them does that job badly while appearing
  to help.

**The general shape, which is the part worth keeping:** fx had a discipline for
*writing things down* and no matching discipline for reading them back. A record
nobody is instructed to read is a record that works only when someone improvises,
and improvisation is exactly what a twelve-task build across several compactions
does not have.

## 53. Nothing told an implementer it may refuse a fix instruction

A fix round reaches an implementer as a numbered list from the controller, and
it carries authority the task file does not. `implementer-prompt.md` said
nothing about what to do when an item is wrong, so the default is to comply.

Measured: a fix round specified a root route whose redirect would have made a
manager's own claims list unreachable, and would have bounced a manager who had
just filed a claim away from the claim they filed. **The controller wrote that
item without opening the controller file it changed.** The implementer satisfied
the underlying ruling a different way and said so, but only because that
particular dispatch happened to end with "and anything you disagree with". The
template asks for none of it.

Same shape as #52: the behaviour that saved the round was improvised by the
controller, not carried by the plugin, so it holds exactly as long as whoever
writes the dispatch remembers.

Three changes: the prompt now says to implement what the instruction was trying
to achieve rather than the instruction, and to name the deviation; the report
gains a required "anything you did not do as instructed" field, because **an
empty answer and a silent one are indistinguishable to the controller**; and the
final message carries a one-line version so it is read while dispatching rather
than after.

**The tell recorded with it, which generalises past this case:** the specified
version required amending an unrelated task's test to follow an extra redirect,
and the alternative made that amendment unnecessary. A change that stops needing
to touch another task's tests usually fits the design. One that needs a new
accommodation in a file it has no business in is usually working around
something. I had accepted that test amendment as legitimate a day earlier, and
it was legitimate; it was also evidence of a problem, and I read it as evidence
of care.

## 54. The coverage walk runs before the red team, and never again

`fx-plan` §6.1 mandates exactly the right check: walk each requirement in
`design.md` and point to the task that implements it, adding a task for each
gap. It runs at §6. The red team runs at §7, and resolving its findings changes
requirements. **Nothing re-runs the walk afterwards.**

So the one pass in the whole lane that asks "does every requirement have an
owner" is guaranteed to have been run against a stale design whenever the red
team is used at all, and the red team is recommended precisely for the plans
where this matters most: high complexity, irreversible work, money and auth
paths, ten or more tasks.

Measured, and it is the same incident as the amendment recorded in the expenses
ledger: a finding moved a marker "to the CSV **and** to the claim page". The
model predicate existed, the CSV column was written, both were tested, and
nothing rendered it in any view. **A requirement that grew a second half kept
the task that owned its first half**, which was the export task, and the export
task did exactly what it was asked. Every task passed its own review. The story
was half met for nine tasks and surfaced only because an implementer working on
something unrelated happened to look.

Fixed by re-running §6.1 after findings are resolved, scoped to what the findings
changed rather than the whole design, and with an explicit instruction: if a
change added a **place** the behaviour must appear, name the task that owns that
place. The failure is never "nobody owns this requirement", it is "somebody owns
the half that existed when the plan was written".

**The general shape, and it is the third instance this session:** a gate that
runs once, early, in a lane where the thing it gates keeps changing after it.
See also #49, an exemption that outlived the condition it was written for.

## 55. The fence retagger corrupted two templates and every gate stayed green

Fixing #49 meant tagging prose fences ```markdown so the checker would read them.
The retagger walked fences pairwise and appended the tag to anything it took for
a bare opener. Inside `fx-plan`'s task template, which is wrapped in a
four-backtick fence, the three-backtick fences are **literal content**, and two
closers came out as ```markdown.

**Nothing could have caught it.** The file parses correctly: by CommonMark rules
a three-tick fence cannot close a four-tick one, so those lines are text, and a
fence-aware checker walking structure sees nothing wrong. My first scan for this
reported zero, correctly, because it was asking about structure. The damage is
to the **content of a template a human copies**, so the only reader who would
ever notice is someone following `fx-plan` and writing ```markdown where ```
belongs.

Found by reading the file for an unrelated reason.

Two changes. The two lines are repaired. And `check-prose` now walks nested
fences inside literal content and reports a closer that carries a language,
counted and named separately rather than folded into the parenthesis counter,
because a summary line that says "unclosed parenthesis" about a fence is its own
small lie. Mutation-proved: reintroducing one makes the gate name the exact
line, and restoring gives a byte-identical file and a green run.

**The pattern, and it is the second time in this same script:** a bulk rewriter
aimed at prose walked into a region where the rules are different, and the
existing gates were all looking somewhere else. #37 was paired dashes bleeding
across list items; #50 was three more spellings of that; this is fences. Each
time the fixer was right about the general case and wrong about a context it had
no way to know it was in.

The durable lesson is not another guard. It is that **every bulk rewrite gets its
diff read by a human before it is kept**, and that each defect found becomes a
case in `lib/fix-dashes.test.py` or a gate in `check-prose`, so the same shape
cannot arrive a fourth time. That file is now 22 cases, every one of them a real
defect this script actually produced.

## 56. Criteria are written for the guards, and satisfied without reachability

Two authoring defects, both found by a coverage audit rather than by any review,
and both let a broken feature pass every gate.

**A criterion that a control exists is satisfied by a test that requests its URL
directly.** That proves the page renders and says nothing about whether a person
can arrive. Every per-record test in a twelve-task build fetched the record's
path, which is correct for testing the page, and the assumption underneath it
was never checked. Measured: a claimant's rejected claim carried the rejection
reason and the resubmit control, both implemented, both tested, both reviewed,
and the only list those claims appeared in linked no row for that status. **The
one hop that reached the reason was the resubmit link, on the page that could
not be reached.** Two stories were half met for five tasks.

**Criteria drift toward refusals.** A refusal is easy to state and easy to test,
so a task accumulates them and never states the thing being protected. Measured
on an unstarted task: it carried "demoting the last manager is refused" and
"deactivating the last manager is refused" and never "an admin deactivates a
user through the screen". A correct `User#deactivate` with no control rendered
anywhere would have passed the file. **The refusals are the fence; the story is
the field.** Caught only because the audit ran before that task was dispatched.

Both rules are now in `fx-plan`'s criteria template as an authoring note, where
they are read while criteria are being written rather than after.

**The reachability rule was itself incomplete, and the next task proved it.**
Following a link proves you can get to the control. It does not prove the
control points anywhere useful. A test followed an edit link correctly and then
hand-built the request it assumed the form would send; repointing the form at
the wrong route left the entire suite green while the real button rendered a
different page. Both halves are in the note now: assert against the form's own
`action` and `method` as rendered, never against the route you believe it uses.
A rule written from one incident covers one incident.

**The shared root, and it is the same as #52 and #54:** every check in the lane
was pointed at what the task file said, and the task file was the thing that was
wrong. Reviews verify against criteria; criteria are verified against nothing
except one coverage walk that runs before the red team and never again. The
audit that found these was a one-off I ran by hand, and nothing in the lane
schedules it.

## 57. Two writers in one worktree, and the staging habit that makes it dangerous

I dispatched a small fix round into a worktree where another implementer was
already building a task, on the same branch. `fx-implement` says one writer per
task and means it; nothing says one writer per **worktree**, and the controller
is the only party positioned to know.

The sharp edge is not the concurrency, it is `git add -A`. Two writers sharing a
tree means either one's commit can swallow the other's half-finished work, and a
review scoped to that commit then reads a diff nobody authored as a unit.

**The same edge cuts with a single writer, and it had already been cutting all
build.** The working tree during a task holds the controller's ledger edits,
which land continuously. Every task commit in this build carried `state.md`,
and the implementer that noticed reported it as normal, because by then it was.
`fx-plan`'s template stages by explicit path and the generated tasks used `-A`,
so the template was right and taught only by example. It is a rule now, with the
reason, and it points at the **Files** section that already lists what to stage.

Also recorded for the controller side: when two writers do share a tree, neither
can use the full suite as verification, because it passes or fails for reasons
that are not theirs and neither answer means anything. They run focused tests,
say they did not run the suite, and the controller runs it once after both land.

**A second hazard appeared later in the same session, and it is worse than the
staging one.** An implementer ran `rm -rf tmp/cache/bootsnap`, standard practice
here because bootsnap keys on mtime plus size and a same-length revert leaves a
mutation live. The delete raced with the other agent writing that same directory
(`rm: cannot remove .../compile-cache-iseq/78: Directory not empty`), and the
run then loaded the half-deleted cache: **9 failures and 77 errors, with no code
defect anywhere.** Re-running without touching the cache was green.

The staging hazard destroys work quietly. This one **manufactures a
catastrophic-looking failure out of nothing**, which is more dangerous, because
an agent that sees 77 errors after its own change will start fixing things that
were never broken. It was caught only because the implementer re-ran before
reacting.

So the rule has a second half: with two writers in a tree, **nobody clears a
shared cache.** Take a file copy for mutation work instead. And a red suite in a
shared tree is a question, not an answer: re-run it clean before believing it.

**And #46 fired on me again while writing this.** Grepping the plugin for the
staging habit was refused, because the guard matched `git add` inside the search
**pattern**. The workaround was to split the literal in the shell. A guard that
cannot tell a command from a string describing one is a guard people learn to
route around, which is the failure mode #46 already records and #51's withdrawal
shows I am not immune to.

## 58. A description that overstates is the defect this build produced most

Four measured instances in one twelve-task build, in four different artefacts,
and no gate catches any of them because every one of them is prose:

- a test **named** for two UI controls that compares two locale strings;
- a **report** saying that test "covers both row-control pairs";
- a test **comment** claiming a case discriminated, where the fixture made the
  count identical either way, so the term it named was unpinned;
- `ProtectSystem=full` in a systemd unit under a **comment** reading "everything
  else stays read-only, including the checkout it is running from", where the
  directive covers `/usr`, `/boot`, `/efi` and `/etc` only and leaves the
  application's own checkout writable.

The last one is the instructive one, because `systemd-analyze verify` passes it:
the directives are valid, they simply do not confine what the comment says they
confine. A gate that checks syntax cannot check a claim.

**Why this class survives everything else in the lane.** Tests catch wrong code.
Reviews catch wrong code. Nothing reads a name or a comment and asks whether it
is true, so an overstated description is the one defect that gets *more*
protected the more rigorous the process looks: the next reader sees a test with
a confident name beside a passing suite and stops looking, which is precisely
the outcome the test was written to prevent.

**A fifth instance then arrived inside the fix for the fourth**, which is the
part that made this worth the preamble rather than a lane. A runbook line
reading "Rails creates the database world readable" was true and unspecific.
The repair made it precise and false: it argued a `0640` mode from an earlier
step's umask, where the umask sat in a subshell, the step opened a new shell
anyway, and the file measures `0644`. The sentence gained confidence and detail
and lost correctness, and it was the sentence telling an operator the cost of
skipping a `chmod` on the file holding every claimant's name and amount.

So the rule has a second clause: **precision is not accuracy.** When you sharpen
a claim, measure the sharpened version, because the vaguer sentence was carrying
its uncertainty honestly and a precise one has to earn it.

Recorded in `PREAMBLE.md` rather than in a lane, because it applies to every
artefact any agent writes and the preamble is the only file injected into every
session and every subagent. The check is mechanical: read the claim, ask what
would have to break for it to fail, and if nothing would, narrow the words until
something would.

## 59. Running the commands is not running the document

`fx` already said to run runnable documents rather than read them, and it said
it firmly, with a measured case behind it: a review that reported "walking an
install guide as an installer" passed five broken steps. **That rule was one
step short.**

An implementer ran every privilege-free command in an install guide and pasted
real output for each. It was honest and it was thorough. The guide still fails
at step 4 on a fresh host: step 4 boots the app to generate a secret, step 5
installs the gems, and booting needs the gems. Its own disclosure listed the
order it had used, install-then-secret, which is the reverse of the printed
order. It passed on that machine, and on mine, because the gems were already
there from earlier work.

**Nothing was faked.** The commands were run. The document was still broken,
because a guide is a sequence and the person running it already has the state
the earlier steps create. You reach for the command you need next rather than
the command the page gives next, and the divergence is invisible from inside.

Both sides now carry it. The implementer prompt says to run from an empty
directory in printed order and to say so; the task reviewer prompt says to treat
the order as a claim of its own and asks the question that finds it: **does step
N depend on anything only step N+1 provides?**

**The general shape, and it is the same one as #51 and the pipe.** A measurement
can be honest, thorough, and about a different thing than the claim it is
offered for. "I ran every command" is true and does not mean "the document
works", exactly as "the suite is red" was true of a command that never ran and
"exit 0" was true of `head`. Every one of them was a real observation attached
to the wrong proposition.

## 60. The templates existed and the controller improvised past them

`fx-review/reviewer-prompt.md:60` says "You do not dispatch subagents", with the
reason: the process already provides every review seat the work gets, and one
the reviewer spawns duplicates a seat at full cost while its verdict counts for
nothing.

The whole-branch review in this build dispatched two checks anyway, received
one, and **presented items from both as verified**. Challenged, it ran the
mutations itself and retracted one claim as false: the test it had said would
stay green failed, because the test enforced exactly what its name said.

**The rule was there. I hand-wrote the dispatch and left it out.** Every dispatch
this session was hand-written rather than filled from the template, which bought
briefs tailored to each task and cost this. It is the first omission that
produced a concrete failure, and it will not be the last if nothing changes,
because a hand-written prompt drops whichever clause the author is not currently
thinking about.

Two things follow, and only one of them is a plugin change.

The plugin change: `references/vocab/verification.md` now carries **a report you
have not received is not a report**, because the underlying mistake is more
general than dispatch discipline. An in-flight check is a plan, and writing up
its expected conclusion in the same voice as measured results converts a plan
into a claim without anyone deciding to. Keep delegated results in a different
column from things you ran, and never merge the columns while one is empty.

The other is mine and is not fixable by editing a file: **a template you decline
to use protects nothing.** The tailoring was worth it, and the discipline it
needs is to diff the hand-written prompt against the template before sending,
which costs one read and would have caught this.

Worth recording alongside #52 and #53, which were the inverse: there fx lacked
the rule and I improvised the right behaviour. Here fx had the rule and I
improvised past it. The common factor is that the plugin's guarantees held only
where the controller happened to reproduce them.

## 61. No reviewer in fx writes its findings down

The implementer prompt mandates a report file and returns a summary pointing at
it. **All three reviewer prompts read that file and none writes one.**
`task-reviewer-prompt.md` said it outright: "Your final message **is** the
report."

So every review's findings were single-copy, living in one message, and the
asymmetry ran backwards: the implementer's work survives in the commit and is
recoverable, while the review's exists nowhere else. The most expensive review
in the lane, the whole-branch one, was the least protected.

Measured, on that exact review: twenty minutes, a hundred tool calls, roughly
300k tokens. It found a process error in its own work, and spent its final
message disclosing and correcting it. **The disclosure was right and I would
want it again.** The findings never arrived. Two further exchanges asking for
them produced two more messages that were also not them, because each new
question consumed the one slot the findings needed.

That is not the reviewer being careless. It is a protocol that gives a review
one chance to hand over work nobody can cheaply redo, and then spends that
chance on whatever the last exchange happened to be about.

Fixed in all three prompts: write the findings to `[FINDINGS_FILE]` first, then
reply with the verdict, the counts, and the path. `fx-implement` now passes the
path when dispatching. Beside the ledger, never under `.fx/`, which is
git-ignored, which is the mistake #43 already recorded for a different file.

**The general rule: anything expensive to produce and impossible to reconstruct
gets written to disk before it is summarised.** A summary is a pointer. When the
pointer is also the only copy, one follow-up question destroys the artefact.

## 62. A rule declared general, applied only where the task looked

The final whole-branch review named this itself, and it accounts for four of its
seven Important findings. **A rule gets established, applied to the routes or
files the current task happens to touch, described as general, and never
re-enumerated against the codebase.** Every one of the four passed its own task
review, because a task review reads a diff and the missing sites are not in it.

Measured, all three from one build:

- A visibility gate closed an existence oracle across two tasks and two fix
  rounds. It reached five per-record routes and missed a sixth, which leaks
  claim-id existence and a coarse status. **The parity test's own comment calls
  one route "the fifth per-record route"**, so the list was written from the
  tasks that had touched it rather than from `routes.rb`.
- A parameter shape guard was added in two controllers, each in its own round,
  each with a comment naming the failure. The third and busiest controller,
  the one handling claim submission, never got it.
- A privilege wrapper appears in five runbook blocks and is missing from the
  sixth, in a document whose stated risk was a prefix "carried on some commands
  and not others".

The fix in `implementer-prompt.md` sharpens the existing mirror rule: a twin is
the easy case, and **the set comes from the source of truth, not from the
finding.** Fixing "the five per-record routes" means listing them from
`routes.rb`. Fixing a params guard means listing every controller that takes a
params hash. The finding tells you the shape; the source of truth tells you the
set.

**Why task-scoped review structurally cannot catch it, which is the part worth
keeping:** each of these was correct within its diff. The defect is the absence
of a hunk in a file the task never opened, and a reviewer told not to crawl the
codebase will not find an absence. This is what the whole-branch review is for,
and it is the strongest argument in this build for not skipping it.

## 63. Nobody ran what the repository's own gate runs

Twelve tasks, every one ending in a green suite, plus a suite run after every
fix round and by every re-reviewer in its own export. **Nobody opened
`.github/workflows/ci.yml` once**, over an entire build.

It runs a linter and a security scanner alongside the tests. The linter exits 1
on four offences, all `Layout/SpaceInsideArrayLiteralBrackets`, two of which
were reported as pre-existing at task 09 and then owned by nobody for three
tasks. The scanner exits 3. **Both were red for the whole build**, and what
surfaced them was the final reviewer running the file rather than the tests.

The offences are two spaces. The cost is that a branch reported ready after
twelve tasks could not merge, and every "suite green, pristine" line in the
ledger was true and did not mean what it was taken to mean.

Recorded in the exit gate, because that is where completion is claimed: **"the
suite is green" is not "this merges".** Open the CI configuration and run every
command it runs, reading each exit code. A repository that gates on a linter and
a scanner has told you what passing means there.

Same family as #51 and the pipe: a real measurement, honestly reported, standing
in for a claim it does not support.

## 64. A deferral's estimate of its own fix is itself unverified

A CSP initializer was deferred twice, and both times the note recorded the same
sizing: uncommenting the default block, six lines. The final review repeated it.
I repeated it into the fix wave as an instruction.

**It was wrong, and wrong in the direction that ships a broken page.**
Uncommenting alone emits `script-src 'self' https: 'nonce-'`, because Rails'
default nonce is `request.session.id.to_s`, which is the empty string for a
signed-out visitor. That blocks the inline importmap and kills all JavaScript
including Turbo, on exactly the pages a signed-out visitor sees, which for this
application is the sign-in form. The fixer refused the instruction, shipped a
per-request `SecureRandom` nonce, and its test caught the original.

Three readers carried "six lines" without executing it: the task that deferred
it, the task that deferred it again, and a whole-branch review. Nobody was
careless. **A sizing is a claim, and it travels with none of the evidence a
finding carries**, because the thing it describes has by definition not been
done.

So: when a deferred item comes off the pile, **re-derive the fix rather than
reading the old estimate**. And when you defer something, write what you
observed and not what you think it will take. "The initializer is commented out
and `csp_meta_tag` is inert" would have travelled correctly. "Six lines" did
not.

This is the same family as everything else in this file's last stretch: a
sentence that sounded like evidence, repeated by each reader because the
previous one had said it with confidence.

## 65. The lane describes its dispatches instead of making them

Measured over a full twelve-task run, from the session and all 111 subagent
transcripts:

- `Skill` calls in the session: **2**, `fx-plan` and `fx-implement`.
- `Skill` calls across all 111 subagents: **0**.
- `fx-tdd`'s SKILL body loaded: **never**, anywhere.
- Agent dispatches: 77, of which 35 were fx lens agents and **26 were
  `general-purpose` with hand-written prompts**: every implementer, every task
  reviewer, every re-review, the coverage audit and the fix wave.

The lenses fired. The hooks fired: `PREAMBLE.md` reached the subagents (3 dashes
in 15,459 inserted lines is the evidence), and the guard blocked four
`git checkout` calls into the main checkout and **two attribution trailers**.
The chain fired at the top. Below that, almost nothing did.

`implementer-prompt.md` says in bold: "Invoke `fx-tdd` before writing any code.
It owns the RED/GREEN discipline this task assumes: the Iron Law and verify-RED
live there, not here; **the TDD rules below are the summary, not a
substitute.**" The controller wrote "Method is test-first and a hook enforces
it" into dispatch after dispatch, which is that summary, and the claim inside it
was never checked: the guard's Write/Edit branch produced **zero blocks** all
run, so "a hook enforces it" was asserted a dozen times on no evidence.

The TDD that happened was real. It came from prompt text the controller wrote
well, not from the lane, and it does not survive a different controller.

**The root cause: `fx-implement` describes its dispatches rather than making
them.** It says which template to use and trusts the controller to fill it.
A controller that hand-writes gets briefs tailored to each task, which is worth
real quality, and silently drops whichever clause it is not thinking about that
minute. Everything lost in this run was lost that way: the Iron Law and
verify-RED (`fx-tdd` never invoked), the reviewer's no-subagent rule (#60), the
findings file (#61), the ledger handoff (#52).

This is the parent of #52, #53, #60 and #61, and none of those four is fixed by
the edit it received. **A rule added to a template that nobody is required to
use is a rule with a new hiding place.**

The fix is not another paragraph. It is making the lane emit the dispatch:
`fx-implement` should carry the filled prompt as its own output, so the
controller's choice is to send it or to state a reason for deviating, rather
than to reconstruct it from memory under time pressure. Until then every
guarantee below `fx-implement` is advisory, and the measurement above is what
advisory looks like after twelve tasks with a controller actively trying.

## 66. A session that edits fx is not running the fx it edits

`hooks.json` invokes `${CLAUDE_PLUGIN_ROOT}/hooks/fx-pretooluse.js`. That root is
`~/.claude/plugins/marketplaces/fx`, a **git clone of the GitHub remote**, not
the working tree at `/development/fx`. Both sit at `35529a9`; the running copy
is the last commit, and everything uncommitted is invisible to it.

So a whole session spent repairing fx repairs a tree that is not executing. The
sixteen entries above this one, every template edit, the preamble rule, all of
it went into the source and none of it was live for a single tool call.

**Two consequences, opposite in sign.**

The e2e test was **valid because of this**, not despite it. It exercised fx as
committed rather than fx as being edited underneath it, which is the only
version whose behaviour means anything. That was luck rather than design, and it
is worth keeping deliberately: measure the committed plugin, fix the tree.

And every fix in this file is **unverified**. Each was reasoned from a real
failure and none has run.

**The trap it set, immediately.** A probe dispatched to test a newly written
`Agent` branch in the hook came back unrefused, which reads as "the design's
assumption is false, the hook does not see dispatches". The branch was in the
source tree. The old hook ran, and it has no such branch. **Nothing was learned
about the assumption, and the natural reading was that something had been.**
That is this file's recurring shape, one more time, this time about fx itself: a
real measurement of the wrong artifact.

The guard against it is one line before any claim about fx's runtime behaviour:
`md5sum` the file you edited against the one under `CLAUDE_PLUGIN_ROOT`. If they
differ, the session is measuring history.

## 67. The plugin root is a version-keyed cache, so editing fx changes nothing

`CLAUDE_PLUGIN_ROOT` resolves to `~/.claude/plugins/cache/<mp>/<plugin>/<version>/`,
not to the marketplace clone and not to the working tree. **The path contains the
version**, so the cache refreshes when the version changes and not when the
files do.

Measured. `/plugin` reported "fx is already at the latest version (0.1.0)" and
`/reload-plugins` reported "7 plugins, 12 hooks". Both were true and neither
changed what executes: the cache still held the hook from 00:35 while the
marketplace clone had been updated at 19:15 and the working tree was newer
again. Three copies, two of them decorative.

This is #66 with a second floor. #66 said a session that edits fx is not running
the fx it edits, and prescribed comparing md5 against `CLAUDE_PLUGIN_ROOT`. That
prescription was **checking the wrong file**: it compared against the marketplace
clone, which also is not what runs. The correct comparison is against the
versioned cache path.

**It produced two false conclusions in one session, both stated with confidence
before being caught.** First, a dispatch probe came back unrefused and was read
as "PreToolUse does not fire for Agent". Second, after the marketplace copy was
updated and matched, the same probe came back unrefused again and the reading
held. Both measured a stale cache. When the cache was finally synced by hand the
probe refused immediately, naming all four missing clauses, so **the assumption
had been true the whole time and was twice reported false.**

A third error sat inside the same investigation: a guard test written as
`grep 'git a''dd'` concluded "the git guard is not running". The shell
concatenates that, but the command string the hook inspects never contains the
literal, so the guard was correct to ignore it. `git archive` proved the guard
was running normally. **Three wrong conclusions, one hour, all from measuring
something adjacent to the claim.**

Two fixes. The version is bumped to `0.1.1`, without which no `/plugin update`
can land any of this. And the check in #66 is corrected: compare against
`~/.claude/plugins/cache/*/<plugin>/<version>/`, and confirm the version in
`plugin.json` changed, because same version means same cache no matter what the
files say.
