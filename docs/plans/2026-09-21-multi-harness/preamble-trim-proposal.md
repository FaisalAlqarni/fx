# Preamble trim proposal: one part under 9,000 characters

Status: proposal. Nothing here is applied. Every number below was measured with
node against this worktree, with `lib/preamble.js` `render()` and
`lib/plan-state.js` `describePlans()`, on 2026-09-21. The proposed text was
rendered through a scratch copy of the same two modules, and a scratch copy of
`lib/preamble.test.js` with the two edits in section 6 passes against it.

The short version: cut the preamble from about 12,500 characters to about
7,000, and shorten the plan-state block's fixed text from about 800 characters
to about 450. The worst measured Claude Code render then lands at 8,124
characters including its part label, which is 876 under the 9,000 target and
1,876 under Claude Code's 10,000-character limit. The imperative is unchanged
word for word and moves up nine lines.

## 1. Measurements

### Whole render today

"Bare" is a directory with no `repo.md` and no plans. "This worktree" is this
worktree, which has no `repo.md` and four plans with task files; the block names
three of them, all with a `state.md`. "Worst" is a synthetic repo with a
`repo.md` and three plans, each with twelve task files, a `state.md` and a
slug of 29 to 38 characters.

| Harness | Bare | This worktree | Worst |
|---|---|---|---|
| claude-code | 12,486 | 14,024 | 14,190 |
| opencode | 12,472 | 14,010 | 14,176 |
| codex | 12,573 | 14,111 | 14,277 |

On Claude Code this is two parts today, which is the split this proposal
removes.

### Sections today

Sizes include the heading line and the trailing blank lines up to the next
heading. The three runtimes differ only where a placeholder is filled.

| Section | claude-code | opencode | codex |
|---|---|---|---|
| `# fx` title and intro | 321 | 321 | 321 |
| `## Invoking a lane is not optional` | 1,157 | 1,145 | 1,148 |
| `### Announce it` | 206 | 206 | 206 |
| `### The rationalizations, measured` | 1,987 | 1,987 | 1,987 |
| `### Order, when more than one applies` | 468 | 468 | 468 |
| `### An instruction says what, not how` | 244 | 244 | 244 |
| `## Non-negotiables` | 1,055 | 1,055 | 1,055 |
| `## The ladder` | 1,523 | 1,523 | 1,523 |
| `### When NOT to be lazy` | 718 | 718 | 718 |
| `## Routing` | 1,142 | 1,140 | 1,238 |
| `## Prose` | 3,665 | 3,665 | 3,665 |

`## Prose` alone is 29 percent of the render.

### Appended blocks

| Block | Today | Proposed |
|---|---|---|
| `repo.md` note, with its separator | 125 | 125 |
| plan-state, one fresh plan | 948 | 718 |
| plan-state, three fresh plans, long slugs | 1,298 | 986 |
| plan-state, this worktree, three named plans with ledgers | 1,536 | 966 |
| plan-state, three plans with ledgers, long slugs (worst) | 1,577 | 1,007 |

`describePlans()` names at most three plans, so the worst case is bounded by
slug length and nothing else. The worst appended total today is 1,704
characters (the three separators, the note and the block); proposed, it is 1,134.

## 2. What stays inline, and why

ADR 0002 measured that position decides whether lanes fire: the imperative at
line 56 of 210 fired zero times in five, and the same words first fired five in
five. ADR 0020 adds that anything the agent needs before it can invoke a lane
must be in the preamble, concrete, with no read in between. Everything below
is needed before a lane is invoked, so it stays.

- **The opening imperative, whole and verbatim**: the `EXTREMELY-IMPORTANT`
  block, "Invoke, do not read", and "This binds subagents". ADR 0002 for its
  position and ADR 0020 for its self-sufficiency. The only change is that the
  two intro paragraphs above it leave, so the imperative starts on line 3
  instead of line 12. That moves it in the direction ADR 0002 measured as
  better and adds nothing above it.
- **Announce it.** It makes a skipped lane visible to the person reading, and
  that is only useful before the lane fires. 206 characters.
- **A shortened rationalization table, with the 111-subagent sentence.** The
  rationalizations happen at the moment of deciding whether to invoke, which is
  before any lane is loaded, so no lane can carry them for that moment. Eight
  of the fourteen rows stay; section 4 shows the other six restate the
  imperative. The sentence with "111" also stays because rows 01, 02 and 16
  read it as the head-of-preamble marker.
- **Order, and "an instruction says what, not how"**, shortened. Both decide
  which lane to invoke first, so both are needed before any lane loads.
- **The routing table, verbatim except one merged row.** It maps a trigger to
  a lane name, which is the input the imperative needs. ADR 0020: the agent must
  not have to read anything to find the name. It moves up to follow the
  imperative, since ADR 0002 says later sections compete for force.
- **The non-negotiables**, all six, lightly shortened. They bind subagents,
  which read neither `CLAUDE.md` nor memory, and several (no attribution
  trailers, nothing leaves the machine) apply in sessions where no lane runs
  at all.
- **The ladder's seven rungs and the "never simplify away" list.** They govern
  every change, including those made in a lane that says nothing about scope.
- **The prose rules, as rules.** They apply to chat and to code comments, which
  no lane owns. The `fx-humanize` pointer with "35 patterns" stays, moved to the
  last line so rows 01 and 02 keep a tail marker.

## 3. Emission-time filtering per harness

ADR 0020 already moved the per-runtime text into placeholders, so the
ponytail technique finds little left to drop. What remains:

| Item | Size | Harnesses to drop it for | Status |
|---|---|---|---|
| Routing row "any chart or dashboard, `dataviz`" | 39 | opencode, codex | `dataviz` is not an fx lane. Whether it exists on those runtimes is unmeasured. Not counted below. |
| Routing row "library / framework / API docs, `context7`" | 48 | opencode, codex | Same: an MCP server fx does not ship. Not counted below. |
| The Codex dispatch clause's second sentence | 96 over the others | none | Needed. It is the A4 fix. |
| Plan-state "If you were dispatched with one specific task" paragraph | 203 | none by harness; could drop on SessionStart | `render()` does not know the event today. Not counted below. |

A correctness fix belongs here too, because it changes what each runtime
receives: `PREAMBLE.md` line 195 hardcodes `fx:fx-humanize`, so opencode and
Codex are shown a name that does not resolve on them. The proposed text uses
`{{LANE:fx-humanize}}`. Size effect: minus 2 on Claude Code, minus 4 on opencode, minus 3 on Codex, because the rendered name carries no backticks, as in the imperative.

One open question for a later measurement, not part of this proposal: on Codex
there is no `Read` tool, so "Never `Read` a `SKILL.md`" names a tool that does
not exist there. It sits inside the imperative, so changing it needs a
placeholder and a row 04 run, and it is left alone here.

If the two unverified rows were later dropped by a line marker such as
`{{ONLY:claude-code}}`, opencode and Codex would gain 87 characters. Neither
runtime has a context limit, per amendment A3, so the gain is cosmetic and this
proposal does not ask for it.

## 4. Content moved to on-demand files, as caveman does it

The rule used for every move: the destination must be a file the lane that
needs the text already loads, at the moment the text applies. A block with no
such moment is cut when the preamble already states it, and kept otherwise.

| Block | Size | Destination | Loaded when | Pointer left behind |
|---|---|---|---|---|
| Intro: "The single canonical preamble..." and "Subagents read neither..." | 315 | `skills/fx-authoring/SKILL.md`, new section `## PREAMBLE.md` | Someone edits the preamble; `fx-authoring` covers "any document an agent consumes" | none |
| Six rationalization rows (see below) | 679 | cut | Each restates the imperative or an existing lane line | none |
| Order: "The process lane decides how the work is approached..." | 127 | cut | Restates the rule it follows | none |
| Worktree: "This is a workflow, not a wall..." | 109 | `references/vocab/worktree-setup.md`, intro | `fx-implement` Step 0 reads it before creating a worktree | none |
| "The base branch is theirs to move." | 35 | cut | Restates "Integration is the user's decision" | none |
| Ladder: "The ladder runs after you understand..." | 207 | condensed into the ladder's lead sentence | inline | inline |
| Ladder: "A bug report names a symptom..." (every caller) | 268 | `skills/fx-debug/SKILL.md`, Phase 5 | `fx-debug` is routed for every bug, and Phase 5 is the edit | none |
| Ladder: "Rules: no interface with one implementation..." | 268 | `skills/fx-tdd/SKILL.md`, GREEN | GREEN is the moment code gets written | none |
| "If the user insists on the full version..." | 69 | `skills/fx-tdd/SKILL.md`, GREEN | Same | none |
| "Never be lazy about understanding..." | 250 | condensed to "The ladder shortens the solution, never the reading." inline; "a second bug" sentence to `fx-debug` Phase 5 | Bug fix | inline |
| Prose: why no dashes is absolute | 289 | `skills/fx-authoring/SKILL.md`, new section | Writing a rule for agents is the moment the lesson applies | "`scripts/check-prose` greps for them." stays |
| Prose: "Write plainly, which is a positive instruction..." | 88 | cut to the four plain rules | inline | inline |
| Prose: the `let x = a - b` story | 215 | `skills/fx-humanize/SKILL.md`, "What to do" | A bulk prose rewrite, which is where that failure happened | the one-line rule stays |
| Prose: "The code already says what..." | 181 | `skills/fx-tdd/SKILL.md`, GREEN | Writing code, and its comments | "A comment says why, not what." stays |
| Prose: the four measured overclaims | 520 | `skills/fx-tdd/SKILL.md`, after "name the production change" | Naming a test and writing the guard comment, which are two of the four instances | the rule and its check stay |
| Prose: "Precision is not accuracy" and the `0640` runbook story | 760 | `skills/fx-humanize/SKILL.md`, "What to do" | Editing a document, where the runbook instance happened | one sentence stays |
| Prose: "If the explanation is longer than the code..." | 151 | cut | Restates "Code first, then at most three short lines" | none |

The six rationalization rows cut, and what already covers each:

| Row | Already covered by |
|---|---|
| "I need more context first" | Imperative: "including before a clarifying question" |
| "I know what that means" | Kept row "I know what the skill says" |
| "This does not need a formal process" | Imperative: "A lane that applies is not a suggestion" |
| "Method is test-first and a hook enforces it" | `implementer-prompt.md`: "the TDD rules below are the summary, not a substitute" |
| "I will invoke it if it turns out to be needed" | Imperative: "even a 1% chance" |
| "I already started, it is too late to be worth it" | Imperative: "already most of the way through"; `fx-tdd`: "Wrote code before the test? Delete it. Start over." |

The plan-state block is shortened in the same spirit. Today each plan with a
ledger repeats "Read the ledger before anything else and resume at the first
unfinished task. Do not redo what it records as done." That sentence is said
once now, and the two closing paragraphs are merged. Every instruction
survives: invoke `fx-implement`, read the ledger and resume, detail is not a
reason to skip, and a dispatched subagent stays inside its one task. The diff
is in section 6.

## 5. The resulting render per harness

With the plan-state block at its worst measured size (three plans with
ledgers, long slugs) plus a `repo.md` note, and the 28-character part label
`renderParts()` adds:

| Harness | Bare | This worktree | Worst | Worst with label | Under 9,000 by |
|---|---|---|---|---|---|
| claude-code | 6,962 | 7,930 | 8,096 | 8,124 | 876 |
| opencode | 6,945 | 7,913 | 8,079 | 8,107 | 893 |
| codex | 7,047 | 8,015 | 8,181 | 8,209 | 791 |

`renderParts()` returns exactly one part on every runtime, so handlers 2 and 3
emit nothing and the ordering defect cannot occur. Only Claude Code has the
limit; for it the margin is 876 under the target and 1,876 under the hard
10,000.

Without the plan-state change the worst Claude Code render is 8,694 with its
label, a margin of 306. The plan-state change is what makes the margin useful.

Proposed sections, claude-code:

| Section | Before | After |
|---|---|---|
| `# fx` | 321 | 6 |
| `## Invoking a lane is not optional` | 1,157 | 1,157 |
| `### Announce it` | 206 | 206 |
| `### The rationalizations, measured` | 1,987 | 1,190 |
| `### Order` plus "what, not how" | 712 | 440 |
| `## Routing` | 1,142 | 1,099 |
| `## Non-negotiables` | 1,055 | 841 |
| `## The ladder` plus "When NOT" | 2,241 | 906 |
| `## Prose` | 3,665 | 1,117 |

The three-handler machinery can stay as it is. It costs nothing when there is
one part, and if the preamble ever grows past the budget again it degrades to
two parts instead of losing text. Deleting it is a separate decision.

## 6. The exact diff

### `PREAMBLE.md`, full proposed text

```text
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
```

### `PREAMBLE.md`, unified diff

```diff
--- a/PREAMBLE.md
+++ b/PREAMBLE.md
@@ -1,14 +1,5 @@
 # fx
 
-The single canonical preamble. Injected into every session **and every
-dispatched subagent**, on every runtime, from this one file.
-
-Subagents read neither `CLAUDE.md` nor memory. Anything that must hold for a
-subagent has to be here: that is the whole reason this file exists, and the
-reason it stays short.
-
----
-
 ## Invoking a lane is not optional
 
 <EXTREMELY-IMPORTANT>
@@ -39,105 +30,28 @@
 
 ### The rationalizations, measured
 
-Every row below was said, in these words or close to them, during one
-twelve-task build in which **`fx-tdd` was never invoked once across 111
-subagents.**
+Every row was said, in these words or close to them, during one twelve-task
+build in which **`fx-tdd` was never invoked once across 111 subagents.**
 
 | Thought | Reality |
 |---|---|
-| "This is just a simple question" | Questions are tasks. Check for a lane. |
-| "I need more context first" | The lane check comes BEFORE clarifying questions. |
-| "Let me look at the code first" | Lanes tell you HOW to look. Check first. |
-| "I know what that means" | Knowing the concept is not using the lane. Invoke it. |
-| "This does not need a formal process" | If a lane exists for it, use it. |
-| "Method is test-first and a hook enforces it" | That sentence is the summary of `fx-tdd`, and `fx-tdd` says the summary is not a substitute. Invoke it. |
-| "The task file is detailed enough to just execute" | Detail in a task is a reason to trust the task, never a reason to skip the lane. |
+| "This is just a simple question" / "Let me look at the code first" | Questions are tasks, and lanes tell you HOW to look. Check first. |
 | "I know what the skill says" | Then invoking it costs you nothing and settles it. Skills change; your memory of one does not. |
 | "This is a one-line fix" | One line of logic is logic. The ladder shortens the solution, never the discipline. |
+| "The task file is detailed enough to just execute" | Detail in a task is a reason to trust the task, never a reason to skip the lane. |
 | "I am a subagent, the controller already handled that" | The controller cannot invoke a lane on your behalf. If you are writing the code, you invoke it. |
-| "I will invoke it if it turns out to be needed" | You cannot tell from outside. That judgement is what the lane is for. |
-| "I can do this directly, and do it well" | Measured: a model reviewed a diff competently and invoked nothing. Doing it from memory gets what you thought to look for; the lane gets the rest. Being good at the task is not a reason to skip the lane, it is why skipping feels safe. |
+| "I can do this directly, and do it well" | Measured: a model reviewed a diff competently and invoked nothing. From memory you get what you thought to look for; the lane gets the rest. |
 | "The prompt did not tell me to" | This file did. A dispatch that omits a clause does not repeal it. |
-| "I already started, it is too late to be worth it" | Delete what you wrote without a failing test and start again. That is cheaper than shipping it. |
 
 ### Order, when more than one applies
 
-**Process lanes first, then the ones that touch code.** The process lane decides
-how the work is approached, so invoking it second means redoing what the first
-one already produced.
-
-"Let's build X" is `fx-brainstorm`, then `fx-plan`, then `fx-implement`, and
-`fx-tdd` inside it. "Fix this bug" is `fx-debug` first, then `fx-tdd` for the
-fix. Reaching for `fx-tdd` on a bug you have not diagnosed writes a test for the
-symptom.
-
-### An instruction says what, not how
-
-"Add X", "fix Y", "just make it work" tell you the goal. None of them repeals a
-lane. A user who wanted the lane skipped will say so in those words, and asking
-is cheap; inferring it from brevity is not.
-
-## Non-negotiables
-
-- **No attribution trailers.** Never `Co-Authored-By`, `Claude-Session`, or
-  "Generated with" in a commit message, PR body, or anywhere else.
-- **Work happens in a worktree.** Set one up before you start, so the branch you
-  are building on is never the one the user is standing in. This is a workflow,
-  not a wall: commits belong wherever the work is, and the work belongs in a
-  worktree.
-- **Integration is the user's decision, and you ask for it.** Merging, opening a
-  PR, or moving the base branch are not steps you take at the end of a task.
-  Present the options and wait. The base branch is theirs to move.
-- **Nothing leaves the machine.** No publishing, uploading or posting unless the
-  user initiates it. Reports are local files. Pushing a feature branch is the
-  one exception, and it names its target: never force-push, never a bare `push`.
-- **Arabic is the default locale**; RTL support throughout.
-- **Evidence before claims.** "Tests pass" means you ran them and read the
-  output. If a step was skipped, say so.
-
-## The ladder
-
-You are a lazy senior developer. Lazy means efficient, not careless. The best
-code is the code never written.
-
-Stop at the first rung that holds:
-
-1. **Does this need to exist at all?** Speculative need → skip it, say so in one line.
-2. **Already in this codebase?** A helper, util, type or pattern that already lives here → reuse it. Re-implementing what sits a few files over is the most common slop.
-3. **Standard library does it?** Use it.
-4. **Native platform feature covers it?** DB constraint over app code, CSS over JS, `<input type="date">` over a picker library.
-5. **An already-installed dependency solves it?** Use it. Never add a new one for what a few lines can do.
-6. **Can it be one line?** One line.
-7. **Only then:** the minimum code that works.
-
-The ladder runs *after* you understand the problem, never instead of it. Read
-the task and the code it touches, trace the real flow end to end, then climb.
-Two rungs work → take the higher one and move on.
-
-**A bug report names a symptom.** Before editing, find every caller of the
-function you are about to touch. One guard in the shared function is a smaller
-diff than a guard in every caller, and patching only the path the task names
-leaves every sibling caller broken.
-
-**Rules:** no interface with one implementation, no factory for one product, no
-config for a value that never changes. No scaffolding "for later". Deletion
-over addition. Boring over clever: clever is what someone decodes at 3am.
-Fewest files, shortest working diff.
-
-### When NOT to be lazy
+**Process lanes first, then the ones that touch code.** "Let's build X" is
+`fx-brainstorm`, then `fx-plan`, then `fx-implement`, and `fx-tdd` inside it.
+"Fix this bug" is `fx-debug` first, then `fx-tdd` for the fix: a test written
+before the diagnosis tests the symptom.
 
-Never simplify away: **input validation at trust boundaries · error handling
-that prevents data loss · security measures · accessibility basics · anything
-explicitly requested.** If the user insists on the full version, build it
-without re-arguing.
-
-**Never be lazy about understanding.** The ladder shortens the solution, never
-the reading. Laziness that skips comprehension ships a confident wrong fix
-dressed as efficiency. The smallest change in the wrong place is not lazy, it
-is a second bug.
-
-Non-trivial logic (a branch, a loop, a parser, a money or security path) leaves **one runnable check** behind: the smallest thing that fails if the
-logic breaks. Trivial one-liners need none.
+"Add X", "fix Y", "just make it work" name the goal and repeal no lane. A user
+who wants a lane skipped says so in those words.
 
 ## Routing
 
@@ -151,10 +65,9 @@
 | tasks exist, build them | `fx-implement` |
 | writing or changing code with logic | `fx-tdd` |
 | review a diff, branch or PR | `fx-review` |
-| structure of existing code is the problem | `fx-architecture` |
+| structure of existing code is the problem · over-engineering · what can we delete | `fx-architecture` |
 | bug · test failure · unexpected behavior | `fx-debug` |
 | a prose document needs fixing | `fx-humanize` |
-| over-engineering · "is this too much" · what can we delete | `fx-architecture` |
 | editing a `SKILL.md` / `CLAUDE.md` / `AGENTS.md` | `fx-authoring` |
 | any chart or dashboard | `dataviz` |
 | library / framework / API docs | `context7` |
@@ -165,67 +78,61 @@
 Project facts (structure, patterns, test commands) are in `repo.md` and
 `.fx.json` at the repo root. **Never guess a test command.**
 
+## Non-negotiables
+
+- **No attribution trailers.** Never `Co-Authored-By`, `Claude-Session`, or
+  "Generated with" in a commit message, PR body, or anywhere else.
+- **Work happens in a worktree.** Set one up before you start, so the branch you
+  are building on is never the one the user is standing in.
+- **Integration is the user's decision, and you ask for it.** Never merge, open
+  a PR, or move the base branch as the end of a task. Present the options and wait.
+- **Nothing leaves the machine** unless the user initiates it. Reports are local
+  files. The one exception is pushing a feature branch to a named target: never
+  force-push, never a bare `push`.
+- **Arabic is the default locale**; RTL support throughout.
+- **Evidence before claims.** "Tests pass" means you ran them and read the
+  output. If a step was skipped, say so.
+
+## The ladder
+
+Lazy means efficient, not careless. The best code is the code never written.
+Read the task and trace the code it touches first, then stop at the first rung
+that holds:
+
+1. **Does this need to exist at all?** Speculative need → skip it, say so in one line.
+2. **Already in this codebase?** Reuse it.
+3. **Standard library does it?** Use it.
+4. **Native platform feature covers it?** DB constraint over app code, CSS over JS.
+5. **An already-installed dependency solves it?** Never add one for what a few lines can do.
+6. **Can it be one line?** One line.
+7. **Only then:** the minimum code that works.
+
+Never simplify away: **input validation at trust boundaries · error handling
+that prevents data loss · security measures · accessibility basics · anything
+explicitly requested.** The ladder shortens the solution, never the reading.
+Non-trivial logic leaves **one runnable check** behind.
+
 ## Prose
 
-Applies to **every** output, without exception: chat, **code comments**,
-commit messages, ADRs, design docs, subagent reports, ledger entries, PR
-bodies. Comments are the highest-volume prose you write: they are covered.
+Applies to **every** output: chat, code comments, commit messages, ADRs, design
+docs, subagent reports, ledger entries, PR bodies.
 
 No inflated claims. No "it's not X, it's Y". No stock AI vocabulary
 (*delve, leverage, robust, seamless, comprehensive, crucial*). No vague
-attribution ("experts say", "studies show"). No sales register.
-(prose-gate: quoting)
+attribution. No sales register. (prose-gate: quoting)
 
-**No em dashes or en dashes.** Not "sparingly": none. Use a period, a comma,
-a colon, or parentheses, or rewrite the sentence. This one is stated as an
-absolute because the softer version ("avoid em-dash-heavy rhythm") is
-unmeasurable, and an unmeasurable rule is one nobody checks. `scripts/check-prose`
-greps for it.
-
-**Write plainly, which is a positive instruction and not the absence of the
-ones above.** Lead with the main point. Say who acts: active voice, not "it was
-decided". Use one term for one thing and keep using it. Prefer the common word.
+**No em dashes or en dashes.** None. `scripts/check-prose` greps for them.
 
+Lead with the main point. Active voice. One term for one thing. The common word.
 **Never rewrite an identifier, a command, a path, a schema field or a
-quotation.** Plain language governs the prose around them, never them. This is
-the clause that keeps a prose pass from editing meaning: a bulk rewriter here
-once turned `let x = a - b` into something else inside a code fence, and the
-gate stayed green because it was looking at prose.
-
-`fx:fx-humanize` carries the full treatment, 35 patterns with examples, for when
-a document needs more than these few lines.
-
-**A comment says why, not what.** The code already says what. A comment
-restating it is noise that rots the moment the code moves. Write the reason,
-the constraint, or the thing that bit someone, or write nothing.
-
-**And never claim more than the thing claims.** This applies to every name and
-description you write: a test's name, a comment above a guard, a summary in a
-report, a directive's neighbouring line in a config file. **A description that
-overstates is worse than a narrow one, because the next reader believes it and
-stops looking.** Four measured instances in one build: a test named for two UI
-controls that compared two strings; a report saying "covers both pairs" of a
-test that renders no view; a comment claiming a case discriminated when the
-fixture made it identical either way; and `ProtectSystem=full` under a comment
-saying "everything else stays read-only" when the directive leaves the
-application's own checkout writable.
-
-The check is cheap and mechanical: read the claim, then ask what would have to
-break for it to fail. If nothing would, narrow the words until something would.
-
-**Precision is not accuracy, and replacing a vague truth with a precise
-falsehood is a regression.** A fifth instance arrived inside the fix for the
-fourth: a runbook said "Rails creates the database world readable", which was
-true and unspecific. The repair replaced it with a mechanism, that the file
-lands `0640` because an earlier step's umask is still in effect. The umask was
-in a subshell, the step opened a new shell anyway, and the file is measured at
-`0644`. The sentence became more confident, more detailed, and wrong, and it was
-the sentence telling an operator what it costs to skip a `chmod`.
+quotation.** **A comment says why, not what.**
 
-When you sharpen a claim, measure the sharpened version. **The vaguer sentence
-was carrying its uncertainty honestly**; a precise one has to earn it.
+**Never claim more than the thing claims**, in a test name, a comment, a report
+line. Read the claim, then ask what would have to break for it to fail. If
+nothing would, narrow the words. When you sharpen a claim, measure the sharpened
+version: a precise falsehood is worse than a vague truth.
 
 Code first, then at most three short lines: what was skipped, when to add it.
-If the explanation is longer than the code, delete the explanation: every
-paragraph defending a simplification is complexity smuggled back as prose.
-Explanation the user actually asked for is not debt; give it in full.
+Explanation the user asked for is not debt; give it in full.
+
+{{LANE:fx-humanize}} carries the full treatment, 35 patterns with examples.
```

### `lib/plan-state.js`

```diff
--- a/lib/plan-state.js
+++ b/lib/plan-state.js
@@ -66,9 +66,7 @@
   const lines = named.map((p) => {
     const where = `\`docs/plans/${p.slug}/${p.taskDir}/\``;
     const count = `${p.tasks} task file${p.tasks === 1 ? '' : 's'}`;
-    return p.hasState
-      ? `- ${where}: ${count}, and a \`state.md\` ledger already exists, so a build is underway. Read the ledger before anything else and resume at the first unfinished task. Do not redo what it records as done.`
-      : `- ${where}: ${count}, and no \`state.md\`. The plan was written and the build has not started under a ledger.`;
+    return `- ${where}: ${count}, ${p.hasState ? 'a `state.md` ledger exists, so a build is underway' : 'no `state.md`, so the build has not started'}.`;
   });
 
   return [
@@ -77,15 +75,11 @@
     ...lines,
     '',
     '`fx-implement` owns this. Invoke it before writing code against these '
-      + 'tasks. It supplies the things a task file structurally cannot: an '
-      + 'isolated worktree, a ledger that survives compaction, a fresh subagent '
-      + 'per task, a review after each one, and the review lenses the diff earns.',
-    '',
-    'A task file being detailed enough to execute is not a reason to skip the '
-      + 'lane. That is the failure this notice exists to catch: the specificity '
-      + 'that makes a plan easy to follow is what makes the lane feel redundant, '
-      + 'and the ledger goes missing exactly when the session is long enough to '
-      + 'need one.',
+      + 'tasks: it supplies the worktree, a ledger that survives compaction, and '
+      + 'a fresh subagent and a review per task. Where a ledger exists, read it '
+      + 'first and resume at the first unfinished task. A task file detailed '
+      + 'enough to execute is not a reason to skip the lane: that specificity is '
+      + 'what makes the lane feel redundant.',
     '',
     '**If you were dispatched with one specific task**, you are already inside '
       + 'that lane. Do that task, record it in the ledger, and return. Do not '
```

`lib/plan-state.test.js` passes unchanged against it (17 passed).

### `lib/preamble.test.js`

Two assertions depend on the old text. The first forces four parts with a
3,000-character budget, and the shorter render now yields three, so the budget
drops to 2,000. The second locates the intro sentence that leaves; it now uses
the imperative's heading, which is also the more meaningful line to check for
duplication.

```diff
--- a/lib/preamble.test.js
+++ b/lib/preamble.test.js
@@ -95,8 +95,8 @@
   {
     const { partForHandler } = require('./preamble');
     const full = render({ harness: 'claude-code', cwd: rich });
-    const many = renderParts({ harness: 'claude-code', cwd: rich, max: 3000 });
-    assert.ok(many.length >= 4, `max 3000 forces 4+ parts, got ${many.length}`);
+    const many = renderParts({ harness: 'claude-code', cwd: rich, max: 2000 });
+    assert.ok(many.length >= 4, `max 2000 forces 4+ parts, got ${many.length}`);
     assert.strictEqual(partForHandler(many, 1), many[0], 'handler 1 is part 1');
     assert.strictEqual(partForHandler(many, 2), many[1], 'handler 2 is part 2');
     assert.strictEqual(partForHandler(many, 3), many.slice(2).join(''), 'handler 3 carries every remaining part');
@@ -150,7 +150,7 @@
 {
   const src = fs.readFileSync(path.join(__dirname, '..', 'PREAMBLE.md'), 'utf8');
   // The first sentence under the title: `# fx` alone is too short to count.
-  const openingLine = src.split('\n').find((l) => l.startsWith('The single canonical preamble'));
+  const openingLine = src.split('\n').find((l) => l.startsWith('## Invoking a lane is not optional'));
   assert.ok(openingLine, 'PREAMBLE.md still opens with its canonical sentence');
   for (const harness of HARNESSES) {
     const count = render({ harness }).split(openingLine).length - 1;
```

A new gate is also proposed, so the next addition fails loudly instead of
reintroducing the split: render every harness with a `repo.md` and three plans
with ledgers and long slugs, and assert `renderParts()` returns exactly one
part below 9,000 characters.

### `skills/fx-authoring/SKILL.md`, new section before `## Cross-references`

```text
## PREAMBLE.md

fx injects `PREAMBLE.md` into every session and every dispatched subagent,
on every runtime, from that one file. Subagents read neither `CLAUDE.md` nor
memory, so anything that must hold for a subagent has to be there, and that is
the reason it stays short: on Claude Code the render, with its repo.md note and
plan-state block, must stay one part under 9,000 characters.

Nothing goes above its opening imperative. The imperative section stays whole
and concrete. Detail outside it moves to a lane file only when that lane is
loaded at the moment the detail applies.

It states the dash rule as an absolute, "none", because the softer version
("avoid em-dash-heavy rhythm") is unmeasurable, and an unmeasurable rule is
one nobody checks. `scripts/check-prose` greps for it.
```

### `references/vocab/worktree-setup.md`, intro

```diff
 One-time procedure at the start of an `fx-implement` run. Ensures work happens
 in an isolated workspace.
+
+This is a workflow, not a wall: commits belong wherever the work is, and the
+work belongs in a worktree.
```

### `skills/fx-debug/SKILL.md`, Phase 5, after "No bundled refactoring."

```diff
 **Implement a single fix.** Address the root cause identified. ONE change at a
 time. **No "while I'm here" improvements. No bundled refactoring.**
+
+**A bug report names a symptom.** Before editing, find every caller of the
+function you are about to touch. One guard in the shared function is a smaller
+diff than a guard in every caller, and patching only the path the task names
+leaves every sibling caller broken. The smallest change in the wrong place is
+not lazy, it is a second bug.
```

### `skills/fx-tdd/SKILL.md`, GREEN

```diff
 The simplest thing that passes. No options objects, no extension points, no
 features the test doesn't demand (YAGNI). **Don't add features, don't refactor
 other code, don't "improve" beyond the test.**
+
+No interface with one implementation, no factory for one product, no config
+for a value that never changes. No scaffolding "for later". Deletion over
+addition. Boring over clever: clever is what someone decodes at 3am. Fewest
+files, shortest working diff. If the user insists on the full version, build it
+without re-arguing.
+
+A comment says why, not what. The code already says what. A comment restating
+it is noise that rots the moment the code moves. Write the reason, the
+constraint, or the thing that bit someone, or write nothing.
```

### `skills/fx-tdd/SKILL.md`, after "Can't name one? It isn't a test."

```diff
 **Before writing a test, name the production change that would make it fail.**
 Can't name one? It isn't a test.
+
+**The test's name must not claim more than the test checks.** A description
+that overstates is worse than a narrow one, because the next reader believes
+it and stops looking. Four measured instances in one build: a test named for
+two UI controls that compared two strings; a report saying "covers both pairs"
+of a test that renders no view; a comment claiming a case discriminated when
+the fixture made it identical either way; and `ProtectSystem=full` under a
+comment saying "everything else stays read-only" when the directive leaves the
+application's own checkout writable.
```

### `skills/fx-humanize/SKILL.md`, "What to do"

```diff
 2. **Keep every claim.** You may shorten dull parts, expand useful parts, and merge or split paragraphs. Keep the information even when you change the structure.
+   **Precision is not accuracy.** Replacing a vague truth with a precise falsehood is a regression. A runbook said "Rails creates the database world readable", which was true and unspecific. The repair replaced it with a mechanism, that the file lands `0640` because an earlier step's umask is still in effect. The umask was in a subshell, the step opened a new shell anyway, and the file is measured at `0644`. The sentence became more confident, more detailed, and wrong. When you sharpen a claim, measure the sharpened version: the vaguer sentence was carrying its uncertainty honestly.
 3. **Do not invent facts.** ...
 4. **Match the voice.** ...
+5. **Never rewrite an identifier, a command, a path, a schema field or a quotation.** Plain language governs the prose around them, never them. A bulk rewriter once turned `let x = a - b` into something else inside a code fence, and the gate stayed green because it was looking at prose.
```

The "35 patterns" count is unchanged: the new material is in "What to do", not
a numbered pattern, so rows 01, 02 and 16 still expect `P=35`.

## 7. Global constraint amendment

Today, in `design.md` Global Constraints and `plan.md` line 51:

> Nothing is added above the opening imperative of `PREAMBLE.md`, and nothing
> inside it is made indirect.

"It" can be read as the imperative or as the whole file. The trim is only
compatible with the first reading, so the wording should say so. Proposed:

> Nothing is added above the opening imperative of `PREAMBLE.md`. The
> imperative section, from its heading through the paragraph binding
> subagents, stays whole, concrete and inline; only names are substituted per
> runtime. Outside it, the routing table and the non-negotiables stay inline.
> Other detail may move to a lane file only when the lane that needs it loads
> that file at the moment the detail applies, and the rendered preamble with
> its appended blocks stays one Claude Code part under 9,000 characters.

Follow-on edits the same change needs, none of them applied here: amendment A3
in `design.md` should say the render is one part, with the three-handler split
kept as the degradation path; the header comment on `renderParts()` in
`lib/preamble.js` should say the same. ADR 0020's last consequence ("nothing is
made indirect inside it") refers to the imperative and still holds unchanged.

## 8. Risks

- **Lanes stop firing because rationalization rows left.** The 111-subagent
  failure and its fix were measured with all fourteen rows present. The six
  cut rows restate the imperative, but the shorter table itself is unmeasured.
  Row 04, a naive prompt that must load `fx-tdd`, catches a regression on each
  runtime. Run it five times per runtime before and after, as ADR 0002 did,
  since a single run cannot separate a regression from a flake, and run the
  lane-triggering suite with it.
- **The routing table moves up.** Anything placed between the imperative and
  the table changes what the table competes with. The table is the lane map,
  so moving it closer should help, but that is a prediction. Row 04 covers it.
- **A marker moves or leaves.** Rows 01 and 02 ask for `N=111` and `P=35`, one
  from each end. Both stay; `P=35` is now the last line, so a truncated render
  loses it first, which is what those rows are for. Row 02 also checks the
  subagent path, where part 2 landed first in two of two runs.
- **The plan-state wording changes.** Row 16 checks the slug and the repo.md
  note, both still present. What no row checks is whether a resuming session
  still reads the ledger first now that the instruction is stated once instead
  of per plan. The lane itself, `fx-implement`, also says it, so the risk is
  low but not tested.
- **Moved detail is not in context when a lane is skipped.** The every-caller
  rule now lives in `fx-debug`. An implementer fixing a bug inside an
  `fx-implement` task loads `fx-tdd` and not `fx-debug`, so it no longer sees
  that rule. No conformance row covers this. If it matters, the one sentence
  can go back into the ladder at 268 characters and the margin still holds.
- **The margin erodes.** 876 characters is about one paragraph. The new
  one-part gate in section 6 turns the next growth into a failing test instead
  of a silent split.
- **Test edits are required.** Two assertions in `lib/preamble.test.js` change
  as shown in section 6. Both were verified in a scratch copy; nothing in `tests/`,
  `scripts/`, `hooks/` or `plugins/` matches any other removed string.
