# Bootstrap spike: tiny preamble plus skill descriptions versus the router preamble

Measurement only, run 2026-09-22. Nothing was committed and the worktree was not touched. The variant trees live in a scratch directory that the controller removes after reading this file.

## Question

fx injects `PREAMBLE.md` into every session and every subagent. Before the trim it was a 12.4KB router, and Claude Code keeps only 10,000 characters per hook. Does a superpowers-style tiny bootstrap, with routing moved into skill descriptions, route as well as the router preamble on Claude Code and opencode?

## Result in one paragraph

Yes, but only with the sharpened descriptions. S3 (tiny bootstrap plus three sharpened descriptions) scored row 04 10/10 on opencode and 5/5 on Claude Code, and loaded the right lane for 9 of 9 lane-triggering prompts on both runtimes. The pre-trim baseline S1 scored 9/10 and 7 of 9 on opencode. S2 (the same bootstrap with unchanged descriptions) fell to 2/5 on opencode row 04. The descriptions carry the routing, and the bootstrap only has to send the model to them.

## Variants

| Variant | What it is |
|---|---|
| S1 | pre-trim baseline, the whole tree at commit `d7aae89` (`git show d7aae89:PREAMBLE.md`) |
| Y | task 24's winning cut: `b09f5ac` plus the intro and most of the old ladder (report 24, "Fix round 3") |
| S2 | tiny bootstrap: Y's tree with `PREAMBLE.md` replaced by the text below |
| S3 | S2 plus sharpened descriptions for `fx-brainstorm`, `fx-tdd` and `fx-humanize` |
| S4 | Y plus the same sharpened descriptions |

Apart from `PREAMBLE.md` and the three `SKILL.md` descriptions, S2, S3, S4 and Y are identical trees (checked with `diff -rq`). S1 is an older commit and also differs in hooks, `lib/plan-state.js`, `lib/preamble.js` and a few lanes.

### S2 and S3 `PREAMBLE.md`, full text (source form, before per-harness rendering)

```text
# fx

The single canonical preamble. Injected into every session **and every
dispatched subagent**, on every runtime, from this one file.

Subagents read neither `CLAUDE.md` nor memory. Anything that must hold for a
subagent has to be here: that is the whole reason this file exists, and the
reason it stays short.

---

## Invoking a lane is not optional

<EXTREMELY-IMPORTANT>
If there is even a 1% chance a lane applies to what you are about to do, you
MUST invoke it with {{SKILL_TOOL}} **before any response**, including before
a clarifying question and before reading a single file.

A lane that applies is not a suggestion. You do not get to decide it is
unnecessary because the work looks small, because you remember roughly what it
says, or because you are already most of the way through.
</EXTREMELY-IMPORTANT>

**Each lane's description says when it applies.** The runtime lists every lane
with its description; read that list against the task before anything else.

**Invoke, do not read.** {{SKILL_TOOL}} with the addressable name:
{{LANE:fx-tdd}}, {{LANE:fx-implement}}, {{LANE:fx-review}}. {{RESOLUTION}}.
Never `Read` a `SKILL.md` instead of invoking it: reading gives you the text
without the obligation, which is the failure this section exists to stop.

**This binds subagents exactly as it binds a controller.** You are reading this
because it was injected into your context, whether you are running a session or
a single dispatched task. An implementer writing code invokes {{LANE:fx-tdd}}
first, every time, whatever the dispatching prompt did or did not say. In one
twelve-task build, **`fx-tdd` was never invoked once across 111 subagents.**

### Announce it

"Using `fx-tdd` to drive this from a failing test." One line, then work. The
announcement is not decoration: it is the thing that makes a skipped lane
visible to the person reading along.

## Always, lane or no lane

- **No attribution trailers.** Never `Co-Authored-By`, `Claude-Session`, or
  "Generated with" in a commit message, PR body, or anywhere else.
- **Integration is the user's decision.** Never merge, open a PR, or move the
  base branch as the end of a task. **Nothing leaves the machine** unless the
  user initiates it.
- **Evidence before claims.** "Tests pass" means you ran them and read the
  output. If a step was skipped, say so.
- **No em dashes or en dashes** in any output, chat and commit messages included.

{{LANE:fx-humanize}} carries the full prose treatment, 35 patterns with examples.
```

### Y `PREAMBLE.md`, as a diff against S2

Every `+` line below is text Y carries and S2 dropped. S4's preamble is identical to Y's.

```diff
--- S2/PREAMBLE.md
+++ Y/PREAMBLE.md
@@ -21,9 +21,6 @@
 says, or because you are already most of the way through.
 </EXTREMELY-IMPORTANT>
 
-**Each lane's description says when it applies.** The runtime lists every lane
-with its description; read that list against the task before anything else.
-
 **Invoke, do not read.** {{SKILL_TOOL}} with the addressable name:
 {{LANE:fx-tdd}}, {{LANE:fx-implement}}, {{LANE:fx-review}}. {{RESOLUTION}}.
 Never `Read` a `SKILL.md` instead of invoking it: reading gives you the text
@@ -32,8 +29,7 @@
 **This binds subagents exactly as it binds a controller.** You are reading this
 because it was injected into your context, whether you are running a session or
 a single dispatched task. An implementer writing code invokes {{LANE:fx-tdd}}
-first, every time, whatever the dispatching prompt did or did not say. In one
-twelve-task build, **`fx-tdd` was never invoked once across 111 subagents.**
+first, every time, whatever the dispatching prompt did or did not say.
 
 ### Announce it
 
@@ -41,15 +37,121 @@
 announcement is not decoration: it is the thing that makes a skipped lane
 visible to the person reading along.
 
-## Always, lane or no lane
+### The rationalizations, measured
+
+Every row was said, in these words or close to them, during one twelve-task
+build in which **`fx-tdd` was never invoked once across 111 subagents.**
+
+| Thought | Reality |
+|---|---|
+| "This is just a simple question" / "Let me look at the code first" | Questions are tasks, and lanes tell you HOW to look. Check first. |
+| "I know what the skill says" | Then invoking it costs you nothing and settles it. Skills change; your memory of one does not. |
+| "This is a one-line fix" | One line of logic is logic. The ladder shortens the solution, never the discipline. |
+| "The task file is detailed enough to just execute" | Detail in a task is a reason to trust the task, never a reason to skip the lane. |
+| "I am a subagent, the controller already handled that" | The controller cannot invoke a lane on your behalf. If you are writing the code, you invoke it. |
+| "I can do this directly, and do it well" | Measured: a model reviewed a diff competently and invoked nothing. From memory you get what you thought to look for; the lane gets the rest. |
+| "The prompt did not tell me to" | This file did. A dispatch that omits a clause does not repeal it. |
+
+### Order, when more than one applies
+
+**Process lanes first, then the ones that touch code.** "Let's build X" is
+`fx-brainstorm`, then `fx-plan`, then `fx-implement`, and `fx-tdd` inside it.
+"Fix this bug" is `fx-debug` first, then `fx-tdd` for the fix: a test written
+before the diagnosis tests the symptom.
+
+## Routing
+
+Match the trigger, then **invoke** the lane. The table names lanes; it does not
+excuse you from calling them.
+
+| Trigger | Lane |
+|---|---|
+| new feature · "let's build" · any creative work | `fx-brainstorm` |
+| an approved design exists | `fx-plan` |
+| tasks exist, build them | `fx-implement` |
+| writing or changing code with logic | `fx-tdd` |
+| review a diff, branch or PR | `fx-review` |
+| structure of existing code is the problem · over-engineering · what can we delete | `fx-architecture` |
+| bug · test failure · unexpected behavior | `fx-debug` |
+| a prose document needs fixing | `fx-humanize` |
+| editing a `SKILL.md` / `CLAUDE.md` / `AGENTS.md` | `fx-authoring` |
+| any chart or dashboard | `dataviz` |
+| library / framework / API docs | `context7` |
+| a screen or component, and how it looks | `fx-design` |
+
+**Dispatching an fx review agent.** {{DISPATCH}}
+
+Project facts (structure, patterns, test commands) are in `repo.md` and
+`.fx.json` at the repo root. **Never guess a test command.**
+
+## Non-negotiables
 
 - **No attribution trailers.** Never `Co-Authored-By`, `Claude-Session`, or
   "Generated with" in a commit message, PR body, or anywhere else.
-- **Integration is the user's decision.** Never merge, open a PR, or move the
-  base branch as the end of a task. **Nothing leaves the machine** unless the
-  user initiates it.
+- **Work happens in a worktree.** Set one up before you start, so the branch you
+  are building on is never the one the user is standing in.
+- **Integration is the user's decision, and you ask for it.** Never merge, open
+  a PR, or move the base branch as the end of a task. Present the options and wait.
+- **Nothing leaves the machine** unless the user initiates it. Reports are local
+  files. The one exception is pushing a feature branch to a named target: never
+  force-push, never a bare `push`.
+- **Arabic is the default locale**; RTL support throughout.
 - **Evidence before claims.** "Tests pass" means you ran them and read the
   output. If a step was skipped, say so.
-- **No em dashes or en dashes** in any output, chat and commit messages included.
 
-{{LANE:fx-humanize}} carries the full prose treatment, 35 patterns with examples.
+## The ladder
+
+You are a lazy senior developer. Lazy means efficient, not careless. The best
+code is the code never written.
+
+Stop at the first rung that holds:
+
+1. **Does this need to exist at all?** Speculative need → skip it, say so in one line.
+2. **Already in this codebase?** A helper, util, type or pattern that already lives here → reuse it. Re-implementing what sits a few files over is the most common slop.
+3. **Standard library does it?** Use it.
+4. **Native platform feature covers it?** DB constraint over app code, CSS over JS.
+5. **An already-installed dependency solves it?** Use it. Never add a new one for what a few lines can do.
+6. **Can it be one line?** One line.
+7. **Only then:** the minimum code that works.
+
+The ladder runs *after* you understand the problem, never instead of it. Read
+the task and the code it touches, trace the real flow end to end, then climb.
+Two rungs work → take the higher one and move on.
+
+**Rules:** no interface with one implementation, no factory for one product, no
+config for a value that never changes. No scaffolding "for later". Deletion
+over addition. Boring over clever: clever is what someone decodes at 3am.
+Fewest files, shortest working diff.
+
+### When NOT to be lazy
+
+Never simplify away: **input validation at trust boundaries · error handling
+that prevents data loss · security measures · accessibility basics · anything
+explicitly requested.**
+
+Non-trivial logic leaves **one runnable check** behind.
+
+## Prose
+
+Applies to **every** output: chat, code comments, commit messages, ADRs, design
+docs, subagent reports, ledger entries, PR bodies.
+
+No inflated claims. No "it's not X, it's Y". No stock AI vocabulary
+(*delve, leverage, robust, seamless, comprehensive, crucial*). No vague
+attribution. No sales register. (prose-gate: quoting)
+
+**No em dashes or en dashes.** None. `scripts/check-prose` greps for them.
+
+Lead with the main point. Active voice. One term for one thing. The common word.
+**Never rewrite an identifier, a command, a path, a schema field or a
+quotation.** **A comment says why, not what.**
+
+**Never claim more than the thing claims**, in a test name, a comment, a report
+line. Read the claim, then ask what would have to break for it to fail. If
+nothing would, narrow the words. When you sharpen a claim, measure the sharpened
+version: a precise falsehood is worse than a vague truth.
+
+Code first, then at most three short lines: what was skipped, when to add it.
+Explanation the user asked for is not debt; give it in full.
+
+{{LANE:fx-humanize}} carries the full treatment, 35 patterns with examples.
```

### Sharpened descriptions, S3 against S2 (S4 against Y is byte-identical)

```diff
diff -ru S2/skills/fx-brainstorm/SKILL.md S3/skills/fx-brainstorm/SKILL.md
--- S2/skills/fx-brainstorm/SKILL.md
+++ S3/skills/fx-brainstorm/SKILL.md
@@ -6,7 +6,8 @@
   or any request that would touch code whose design is not yet settled. Also on
   "let's build", "I want to add", "can we make", "new feature", "brainstorm",
   "design this", "grill me", "stress-test this", "what do you think about".
-  NO code before this skill's approval gate passes.
+  For one helper or function whose behavior the request already states, use
+  fx-tdd. For how a screen looks, use fx-design. NO code before this skill's approval gate passes.
 ---
 
 # fx-brainstorm
diff -ru S2/skills/fx-humanize/SKILL.md S3/skills/fx-humanize/SKILL.md
--- S2/skills/fx-humanize/SKILL.md
+++ S3/skills/fx-humanize/SKILL.md
@@ -5,6 +5,8 @@
   Use when editing or reviewing prose for inflated claims,
   sales language, vague sources, repetitive structure, stock AI words, passive
   voice, filler, or chatbot artifacts. Based on Wikipedia's "Signs of AI writing."
+  For a document an agent consumes (SKILL.md, CLAUDE.md, AGENTS.md), use
+  fx-authoring.
 license: MIT
 metadata:
   version: "2.11.2"
diff -ru S2/skills/fx-tdd/SKILL.md S3/skills/fx-tdd/SKILL.md
--- S2/skills/fx-tdd/SKILL.md
+++ S3/skills/fx-tdd/SKILL.md
@@ -4,7 +4,9 @@
   Use when writing or changing any code with logic: a feature, a bug fix, a
   behavior change, a new method, an endpoint, a job, a query. Also on "write a
   test", "TDD this", "red-green-refactor", "test first", "add coverage for",
-  "this has no tests". Any language, any test runner. Skip it and the tests get
+  "this has no tests". Any language, any test runner. For a helper or
+  function whose behavior the request already states, use this lane, not
+  fx-brainstorm. For a bug not yet diagnosed, use fx-debug first. Skip it and the tests get
   written afterwards, where they pass on the first run and prove nothing.
 ---
 
```

These three clauses come from the plugin-validator's finding 2: `fx-tdd` and `fx-brainstorm` overlapped on "add a helper" with no clause to split them. The `fx-design` pointer in `fx-brainstorm` and the `fx-authoring` pointer in `fx-humanize` apply the same "for X, use Y" pattern that `fx-review` and `fx-architecture` already use.

## Sizes, worst case per harness

Rendered by each variant's own `lib/preamble.js`. The worst-case fixture is the one in `lib/preamble.test.js`: `repo.md` plus three plans with ledgers and 12 tasks each, longest slug 41 characters. Characters, not bytes.

| Variant | Claude Code | opencode | Codex | Bare, Claude Code |
|---|---|---|---|---|
| S1 | 14,197 | 14,183 | 14,284 | 14,024 |
| Y, S4 | 8,855 | 8,838 | 8,940 | 8,682 |
| S2, S3 | 3,688 | 3,673 | 3,677 | 3,515 |

S1 is over Claude Code's 10,000 limit. Y and S4 are 60 characters under the 9,000 test bound on Codex. S2 and S3 leave about 5,300 characters of headroom on every harness.

## Results

Row 04 is the naive "Add a helper that turns a duration string like 5m or 90s into a number of seconds" prompt, which must load `fx-tdd`. Lane-triggering is one run of each of the nine prompts in `tests/lane-triggering/prompts/`. "not run" means the job was not in this spike. Figures marked "report 24" come from the task 24 report rather than from this spike.

| Variant | Runtime | Row 04 | Rows 01 / 02 / 16 | Lane hits |
|---|---|---|---|---|
| S1 | Claude Code | earlier single runs all PASS, per report 24 | not run | 8/9 |
| S1 | opencode | 9/10, per report 24 | not run | 7/9 |
| Y | Claude Code | 5/5 | PASS / PASS / PASS | 8/9 |
| Y | opencode | 8/10, per report 24 | PASS / PASS / PASS, per report 24 | not run |
| S2 | Claude Code | 5/5 | PASS / PASS / PASS | 9/9 |
| S2 | opencode | 2/5 | PASS / PASS / PASS | 7/9 |
| S3 | Claude Code | 5/5 | PASS / PASS / PASS | 9/9 |
| S3 | opencode | **10/10** | PASS / PASS / PASS | **9/9** |
| S4 | Claude Code | 5/5 | PASS / PASS / PASS | 9/9 |
| S4 | opencode | not run | not run | not run |

Lane loaded per prompt, for each run with a miss (every other prompt loaded its own lane):

| Variant, runtime | `fx-design` prompt | `fx-tdd` prompt | Other extra loads |
|---|---|---|---|
| S1, Claude Code | `fx-brainstorm` (FAIL) | `fx-tdd` | `dataviz` beside `fx-design` on `fx-design__existing` |
| S1, opencode | `fx-brainstorm` (FAIL) | `fx-brainstorm` (FAIL) | none |
| Y, Claude Code | `fx-brainstorm` (FAIL) | `fx-tdd` | `dataviz` on `fx-design__existing`, `code-review` beside `fx-review` |
| S2, opencode | `fx-brainstorm` (FAIL) | `fx-brainstorm` (FAIL) | none |

S4 on Claude Code loaded `dataviz` beside `fx-design` on `fx-design__existing`, which still passes. S2 and S3 on Claude Code, and S3 on opencode, loaded exactly the expected lane for all nine prompts.

Every row 04 failure in this spike, like every one in report 24, has the same shape: `fx-tdd never loaded (skills loaded: fx-brainstorm )`.

### How the runs went

The opencode runs use the local llama-server (Qwen 3.8 27B, one slot, serial). Claude Code ran in parallel with it. Every run went through the variant's own `tests/conformance/run.sh` under a fresh `mktemp -d` HOME with `FX_REAL_HOME` set, and the runner moves HOME, `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME` and `CODEX_HOME` into its own scratch directory.

- Claude Code: 13 jobs, 9 finished in the first attempt and 4 were run in this pass (S4 lanes, core and row 04, and S1 lanes). No session limit was hit, so there is no GAP.
- opencode: the first attempt finished S2 lanes and core. In this pass S2 row 04 ran once to completion and scored 2/5. A second S2 row 04 batch was stopped seconds in when the user approved a shorter queue, and its partial log is not counted. The short queue ran S3 lanes, core and row 04 twice, then S1 lanes. Y and S4 on opencode were dropped by that decision.
- Two earlier attempts were killed partway through (`*.partial1`). Their partial results, including one S2 row 04 PASS and one FAIL, are not counted.

## What S2 kept inline, and why

S2 keeps only what has to hold when no lane is loaded, or what gets a lane loaded in the first place:

- **The intro** ("injected into every session and every dispatched subagent", subagents read neither `CLAUDE.md` nor memory). It tells a subagent why the text binds it, and report 24 found that removing it cost row 04.
- **The 1% imperative, "Invoke, do not read", the subagent clause and "Announce it".** These are the bootstrap itself, the same four parts superpowers' `using-superpowers` carries.
- **One pointer sentence**, "Each lane's description says when it applies". This replaces the routing table: it sends the model to the runtime's skill list instead of carrying the list.
- **The 111-subagent fact**, as one sentence instead of the rationalization table it used to head.
- **"Always, lane or no lane"**: no attribution trailers, integration is the user's decision, nothing leaves the machine, evidence before claims, and no em or en dashes. Each of these fires in commit messages, chat or the end of a task, where no lane description would ever trigger. A subagent writing a commit message needs them without invoking anything.
- **The `fx-humanize` pointer** for the rest of the prose rules.

S2 dropped these, and the spike did not move them anywhere:

- the rationalization table, the Order section and the routing table (the descriptions now route);
- the `{{DISPATCH}}` clause for dispatching fx review agents, and the `repo.md` / `.fx.json` / "never guess a test command" pointer;
- the worktree rule and the Arabic-locale rule from the non-negotiables;
- the whole ladder, including "When NOT to be lazy" and "one runnable check";
- the rest of the Prose section.

Row 16 still passed without the `repo.md` pointer because the project note is appended by the plan-state render, not by the preamble text. The spike measured routing only. It says nothing about whether the dropped rules still hold, because nothing in rows 01, 02, 04, 16 or the lane suite checks them.

## What the numbers say

1. **The descriptions do the routing work.** S2 and S3 differ only in three descriptions. On opencode row 04 that difference is 2/5 against 10/10, and on the lane suite it is 7/9 against 9/9. Report 24 found the old preamble's ladder was the only text that pulled the helper prompt toward `fx-tdd`, and no single sentence of it did. One disambiguating clause in the right description does it directly.
2. **The router preamble can work against a description.** On Claude Code, S1 and Y send the `fx-design` prompt to `fx-brainstorm`, while S2 (tiny bootstrap, old descriptions) routes it correctly. The routing table's "new feature, any creative work" row is the likely pull. S2 removed it along with the rest of the router text, so this is a suspicion, not an isolated cause.
3. **Claude Code is not the discriminating runtime.** Every variant scored 5/5 on row 04 there, so the local 27B model on opencode decides the comparison.
4. **Sample sizes are small.** Row 04 is ten runs on opencode and five on Claude Code, and the lane suite is one run per prompt. 10/10 against 9/10 is "matches or beats", which is the spike's gate, not a proven improvement.

## Recommendation

Adopt the S3 shape: the tiny bootstrap, with routing in the lane descriptions, each carrying a "for X, use Y" clause wherever two lanes overlap. It met the gate on both runtimes and cut the worst-case render from 14,284 to 3,688 characters, which ends the fight with Claude Code's per-hook limit.

The redesign still has to do three things the spike did not:

- **Home every dropped rule.** Move the ladder into the lanes that write code (`fx-tdd`, `fx-implement`, `fx-architecture`), the worktree rule into `fx-implement`, the dispatch clause into `fx-review`, and the `repo.md` / test-command pointer into the lanes that run tests. Put the locale rule in `repo.md`, since it is project-specific. Nothing should be dropped silently.
- **Audit the other description pairs** for overlap the same way, because the lane suite covers only nine prompts.
- **Re-measure the final tree**, not S3: row 04 ten times on opencode and five on Claude Code, plus the lane suite on both, because moving the ladder into lanes changes their text.

Keep Y as the fallback if the final tree loses on opencode. S4 (Y plus the descriptions) looked the same as S3 on Claude Code but was never run on opencode. If Y ever has to ship, run S4 on opencode first, because the descriptions may fix Y's 8/10 too.
