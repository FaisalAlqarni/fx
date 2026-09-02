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
