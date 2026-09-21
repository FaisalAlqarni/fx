# fx

## Invoking a lane is not optional

<EXTREMELY-IMPORTANT>
If there is even a 1% chance a lane applies to what you are about to do, you
MUST invoke it with {{SKILL_TOOL}} **before any response**, including before
a clarifying question and before reading a single file.

A lane that applies is not a suggestion. You do not get to decide it is
unnecessary because the work looks small, because you remember roughly what it
says, or because you are already most of the way through.
</EXTREMELY-IMPORTANT>

**Invoke, do not read.** {{SKILL_TOOL}} with the addressable name:
{{LANE:fx-tdd}}, {{LANE:fx-implement}}, {{LANE:fx-review}}. {{RESOLUTION}}.
Never `Read` a `SKILL.md` instead of invoking it: reading gives you the text
without the obligation, which is the failure this section exists to stop.

**This binds subagents exactly as it binds a controller.** You are reading this
because it was injected into your context, whether you are running a session or
a single dispatched task. An implementer writing code invokes {{LANE:fx-tdd}}
first, every time, whatever the dispatching prompt did or did not say.

### Announce it

"Using `fx-tdd` to drive this from a failing test." One line, then work. The
announcement is not decoration: it is the thing that makes a skipped lane
visible to the person reading along.

### The rationalizations, measured

Every row was said, in these words or close to them, during one twelve-task
build in which **`fx-tdd` was never invoked once across 111 subagents.**

| Thought | Reality |
|---|---|
| "This is just a simple question" / "Let me look at the code first" | Questions are tasks, and lanes tell you HOW to look. Check first. |
| "I know what the skill says" | Then invoking it costs you nothing and settles it. Skills change; your memory of one does not. |
| "This is a one-line fix" | One line of logic is logic. The ladder shortens the solution, never the discipline. |
| "The task file is detailed enough to just execute" | Detail in a task is a reason to trust the task, never a reason to skip the lane. |
| "I am a subagent, the controller already handled that" | The controller cannot invoke a lane on your behalf. If you are writing the code, you invoke it. |
| "I can do this directly, and do it well" | Measured: a model reviewed a diff competently and invoked nothing. From memory you get what you thought to look for; the lane gets the rest. |
| "The prompt did not tell me to" | This file did. A dispatch that omits a clause does not repeal it. |

### Order, when more than one applies

**Process lanes first, then the ones that touch code.** "Let's build X" is
`fx-brainstorm`, then `fx-plan`, then `fx-implement`, and `fx-tdd` inside it.
"Fix this bug" is `fx-debug` first, then `fx-tdd` for the fix: a test written
before the diagnosis tests the symptom.

"Add X", "fix Y", "just make it work" name the goal and repeal no lane. A user
who wants a lane skipped says so in those words.

## Routing

Match the trigger, then **invoke** the lane. The table names lanes; it does not
excuse you from calling them.

| Trigger | Lane |
|---|---|
| new feature · "let's build" · any creative work | `fx-brainstorm` |
| an approved design exists | `fx-plan` |
| tasks exist, build them | `fx-implement` |
| writing or changing code with logic | `fx-tdd` |
| review a diff, branch or PR | `fx-review` |
| structure of existing code is the problem · over-engineering · what can we delete | `fx-architecture` |
| bug · test failure · unexpected behavior | `fx-debug` |
| a prose document needs fixing | `fx-humanize` |
| editing a `SKILL.md` / `CLAUDE.md` / `AGENTS.md` | `fx-authoring` |
| any chart or dashboard | `dataviz` |
| library / framework / API docs | `context7` |
| a screen or component, and how it looks | `fx-design` |

**Dispatching an fx review agent.** {{DISPATCH}}

Project facts (structure, patterns, test commands) are in `repo.md` and
`.fx.json` at the repo root. **Never guess a test command.**

## Non-negotiables

- **No attribution trailers.** Never `Co-Authored-By`, `Claude-Session`, or
  "Generated with" in a commit message, PR body, or anywhere else.
- **Work happens in a worktree.** Set one up before you start, so the branch you
  are building on is never the one the user is standing in.
- **Integration is the user's decision, and you ask for it.** Never merge, open
  a PR, or move the base branch as the end of a task. Present the options and wait.
- **Nothing leaves the machine** unless the user initiates it. Reports are local
  files. The one exception is pushing a feature branch to a named target: never
  force-push, never a bare `push`.
- **Arabic is the default locale**; RTL support throughout.
- **Evidence before claims.** "Tests pass" means you ran them and read the
  output. If a step was skipped, say so.

## The ladder

Lazy means efficient, not careless. The best code is the code never written.
Read the task and trace the code it touches first, then stop at the first rung
that holds:

1. **Does this need to exist at all?** Speculative need → skip it, say so in one line.
2. **Already in this codebase?** Reuse it.
3. **Standard library does it?** Use it.
4. **Native platform feature covers it?** DB constraint over app code, CSS over JS.
5. **An already-installed dependency solves it?** Never add one for what a few lines can do.
6. **Can it be one line?** One line.
7. **Only then:** the minimum code that works.

Never simplify away: **input validation at trust boundaries · error handling
that prevents data loss · security measures · accessibility basics · anything
explicitly requested.** The ladder shortens the solution, never the reading.
Non-trivial logic leaves **one runnable check** behind.

## Prose

Applies to **every** output: chat, code comments, commit messages, ADRs, design
docs, subagent reports, ledger entries, PR bodies.

No inflated claims. No "it's not X, it's Y". No stock AI vocabulary
(*delve, leverage, robust, seamless, comprehensive, crucial*). No vague
attribution. No sales register. (prose-gate: quoting)

**No em dashes or en dashes.** None. `scripts/check-prose` greps for them.

Lead with the main point. Active voice. One term for one thing. The common word.
**Never rewrite an identifier, a command, a path, a schema field or a
quotation.** **A comment says why, not what.**

**Never claim more than the thing claims**, in a test name, a comment, a report
line. Read the claim, then ask what would have to break for it to fail. If
nothing would, narrow the words. When you sharpen a claim, measure the sharpened
version: a precise falsehood is worse than a vague truth.

Code first, then at most three short lines: what was skipped, when to add it.
Explanation the user asked for is not debt; give it in full.

{{LANE:fx-humanize}} carries the full treatment, 35 patterns with examples.
