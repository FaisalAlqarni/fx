# Bootstrap no-loss audit (task 25)

Source: the pre-trim preamble, `git show d7aae89:PREAMBLE.md` (231 lines).
Every sentence and every table row has one row here. "Line" is its line in
that file. Each row is either **kept** in the bootstrap (`PREAMBLE.md`, the S3
text) with the reason it cannot live in a lane, or **moved** to the lane that
applies it, with the moment that lane is loaded. Nothing is dropped.

A rule is kept only when it must hold before or without any lane: the decision
to invoke a lane happens before any lane is loaded, so the rules about that
decision cannot live in a lane, and a commit or a push can happen from any lane
or from none.

Several rules were already moved by task 24 (commit b09f5ac, trim proposal
section 4). Those rows name the home task 24 gave them; this task keeps them.

## Counts

| Status | Rows |
|---|---|
| Kept in bootstrap | 40 |
| Kept in bootstrap in a one-line form, detail in a lane | 12 |
| Kept as intent (the counter-sentence's wording dropped on purpose) | 3 |
| Moved to a lane, a description, a reference or the guard | 80 |
| Split: the decision kept in bootstrap, the discipline moved to a lane | 5 |
| Dropped | 0 |
| Total | 140 |

"Dropped" counts rules. Three rows keep their rule as intent but not their
words: the counter-sentences of rows 23, 28 and 31 ("Lanes tell you HOW to
look", "Skills change; your memory of one does not", "You cannot tell from
outside") were left out on purpose, because S3 routed without the
rationalization table (`research/bootstrap-spike.md`).

## Intro and title

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 1 | 1 | `# fx` title | kept | `PREAMBLE.md`, title | The title the tests anchor on |
| 2 | 3-4 | "The single canonical preamble. Injected into every session and every dispatched subagent..." | kept | `PREAMBLE.md`, intro | B5: the fixed intro is the one text allowed above the imperative. It tells a subagent why this text binds it |
| 3 | 6-7 | "Subagents read neither `CLAUDE.md` nor memory. Anything that must hold for a subagent has to be here" | kept | `PREAMBLE.md`, intro | Same. It is the reason the text reaches subagents at all (ADR 0002) |
| 4 | 7-8 | "that is the whole reason this file exists, and the reason it stays short" | kept | `PREAMBLE.md`, intro | Same |

## Invoking a lane is not optional

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 5 | 12 | Heading "Invoking a lane is not optional" | kept | `PREAMBLE.md` | ADR 0002: the imperative leads |
| 6 | 15-17 | "If there is even a 1% chance a lane applies... MUST invoke it... before any response, including before a clarifying question and before reading a single file" | kept | `PREAMBLE.md`, imperative | Governs the decision to invoke, which precedes every lane |
| 7 | 19 | "A lane that applies is not a suggestion." | kept | `PREAMBLE.md`, imperative | Same |
| 8 | 19-21 | "You do not get to decide it is unnecessary because the work looks small, because you remember roughly what it says, or because you are already most of the way through." | kept | `PREAMBLE.md`, imperative | Same |
| 9 | 24-25 | "Invoke, do not read. {{SKILL_TOOL}} with the addressable name: fx-tdd, fx-implement, fx-review." | kept | `PREAMBLE.md` | How to invoke; needed before a lane can load |
| 10 | 25 | `{{RESOLUTION}}`: which name form fails on this runtime | kept | `PREAMBLE.md` | Per-runtime text; only the rendered bootstrap can carry it |
| 11 | 26-27 | "Never Read a SKILL.md instead of invoking it: reading gives you the text without the obligation" | kept | `PREAMBLE.md` | Governs how a lane is loaded |
| 12 | 29 | "This binds subagents exactly as it binds a controller." | kept | `PREAMBLE.md` | Subagents read nothing else (ADR 0002) |
| 13 | 29-31 | "You are reading this because it was injected into your context, whether you are running a session or a single dispatched task." | kept | `PREAMBLE.md` | Same |
| 14 | 31-32 | "An implementer writing code invokes fx-tdd first, every time, whatever the dispatching prompt did or did not say." | kept | `PREAMBLE.md` | Same. Also restated in `skills/fx-implement/implementer-prompt.md` |
| 15 | 34 | Heading "Announce it" | kept | `PREAMBLE.md` | The announcement is what makes a skipped lane visible, so it precedes the lane |
| 16 | 36 | "'Using fx-tdd to drive this from a failing test.' One line, then work." | kept | `PREAMBLE.md`, Announce it | Same |
| 17 | 36-38 | "The announcement is not decoration: it is the thing that makes a skipped lane visible" | kept | `PREAMBLE.md`, Announce it | Same |

## The rationalizations, measured

Every row counters a reason for not invoking a lane. That decision is made
before any lane loads, so no lane can carry these. Each is kept in the
bootstrap in the sentence that already answers it; task 24's trim proposal
(section 4) mapped the same coverage for six of them.

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 18 | 40 | Heading "The rationalizations, measured" | kept | `PREAMBLE.md`, subagent paragraph | The heading's content is the measured fact, row 19 |
| 19 | 42-44 | "one twelve-task build in which fx-tdd was never invoked once across 111 subagents" | kept | `PREAMBLE.md`, end of the subagent paragraph | The measured reason for the imperative; also the marker rows 01, 02 and 16 probe |
| 20 | 46-47 | Table header "Thought / Reality" | kept | `PREAMBLE.md` | Structure of rows 21-34 |
| 21 | 48 | "This is just a simple question" / "Questions are tasks. Check for a lane." | kept | `PREAMBLE.md`, imperative: "before any response, including before a clarifying question" | Decision to invoke |
| 22 | 49 | "I need more context first" / "The lane check comes BEFORE clarifying questions." | kept | `PREAMBLE.md`, imperative: "before a clarifying question" | Decision to invoke |
| 23 | 50 | "Let me look at the code first" / "Lanes tell you HOW to look." | kept as intent | `PREAMBLE.md`, imperative: "before reading a single file" | Decision to invoke. The row's counter-sentence was dropped on purpose: S3 routed 9/9 lanes and row 04 10/10 on opencode without the rationalization table (`research/bootstrap-spike.md`) |
| 24 | 51 | "I know what that means" / "Knowing the concept is not using the lane." | kept | `PREAMBLE.md`, imperative: "because you remember roughly what it says" | Decision to invoke |
| 25 | 52 | "This does not need a formal process" / "If a lane exists for it, use it." | kept | `PREAMBLE.md`, imperative: "A lane that applies is not a suggestion" | Decision to invoke |
| 26 | 53 | "Method is test-first and a hook enforces it" / "the summary is not a substitute" | moved | `skills/fx-implement/implementer-prompt.md`: "the TDD rules below are the summary, not a substitute" | Read by every implementer, at dispatch, before it writes code |
| 27 | 54 | "The task file is detailed enough to just execute" / "Detail in a task is a reason to trust the task, never a reason to skip the lane." | moved | Plan-state block (`lib/plan-state.js`), appended to every render when a plan exists: "A task file detailed enough to execute is not a reason to skip the lane" | Rendered with the bootstrap exactly when task files exist |
| 28 | 55 | "I know what the skill says" / "Then invoking it costs you nothing... Skills change; your memory of one does not." | kept as intent | `PREAMBLE.md`, imperative: "because you remember roughly what it says" | Decision to invoke. The row's counter-sentence was dropped on purpose: S3 routed 9/9 lanes and row 04 10/10 on opencode without the rationalization table (`research/bootstrap-spike.md`) |
| 29 | 56 | "This is a one-line fix" / "One line of logic is logic. The ladder shortens the solution, never the discipline." | kept + moved | `PREAMBLE.md`, imperative: "because the work looks small"; `skills/fx-tdd/SKILL.md`, GREEN, "The ladder": "one line of logic is still logic, and it gets its test" | The decision is in the bootstrap; the discipline applies at GREEN |
| 30 | 57 | "I am a subagent, the controller already handled that" / "The controller cannot invoke a lane on your behalf." | kept | `PREAMBLE.md`, subagent paragraph | Subagents read nothing else |
| 31 | 58 | "I will invoke it if it turns out to be needed" / "You cannot tell from outside." | kept as intent | `PREAMBLE.md`, imperative: "even a 1% chance" | Decision to invoke. The row's counter-sentence was dropped on purpose: S3 routed 9/9 lanes and row 04 10/10 on opencode without the rationalization table (`research/bootstrap-spike.md`) |
| 32 | 59 | "I can do this directly, and do it well" / measured: a model reviewed a diff competently and invoked nothing | kept + moved | `PREAMBLE.md`, imperative: "You do not get to decide it is unnecessary"; the measured instance to `skills/fx-authoring/SKILL.md`, "PREAMBLE.md" | The decision is in the bootstrap; the measurement is rationale for whoever edits the bootstrap |
| 33 | 60 | "The prompt did not tell me to" / "A dispatch that omits a clause does not repeal it." | kept | `PREAMBLE.md`, subagent paragraph: "whatever the dispatching prompt did or did not say" | Subagents read nothing else |
| 34 | 61 | "I already started, it is too late" / "Delete what you wrote without a failing test and start again." | kept + moved | `PREAMBLE.md`, imperative: "already most of the way through"; `skills/fx-tdd/SKILL.md`, The Iron Law: "Wrote code before the test? Delete it. Start over." | The decision is in the bootstrap; deletion is fx-tdd's rule |

## Order, when more than one applies

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 35 | 63 | Heading "Order, when more than one applies" | moved | Descriptions of the lanes in rows 36-40 | Routing lives in descriptions (B2) |
| 36 | 65 | "Process lanes first, then the ones that touch code." | moved | `fx-brainstorm` description: "Entry point for any new work. Use BEFORE..."; `fx-debug` description: "BEFORE proposing fixes"; `fx-tdd` description: "For a bug not yet diagnosed, use fx-debug first" | The runtime lists every description with the lanes, before the first action |
| 37 | 65-67 | "The process lane decides how the work is approached, so invoking it second means redoing what the first one already produced." | moved | `skills/fx-authoring/SKILL.md`, "PREAMBLE.md", as the rationale for writing order into descriptions | Editing a description or the bootstrap |
| 38 | 69 | "'Let's build X' is fx-brainstorm, then fx-plan, then fx-implement, and fx-tdd inside it." | moved | `fx-brainstorm` description ("let's build"); `fx-plan` description ("Requires an approved design; if there is none, use fx-brainstorm"); `fx-implement` description ("Requires an approved plan; if there is none, use fx-plan"); `skills/fx-implement/implementer-prompt.md` (the implementer invokes fx-tdd) | Descriptions before the first action; the implementer prompt at dispatch |
| 39 | 70-71 | "'Fix this bug' is fx-debug first, then fx-tdd for the fix." | moved | `fx-tdd` description: "For a bug not yet diagnosed, use fx-debug first"; `fx-debug` description: "Once diagnosed, the fix goes through fx-tdd"; `skills/fx-debug/SKILL.md` Phase 5 ("Invoke fx-tdd for the RED/GREEN mechanics") | Descriptions before the first action; Phase 5 at the fix |
| 40 | 71-72 | "Reaching for fx-tdd on a bug you have not diagnosed writes a test for the symptom." | moved | `fx-tdd` description: "For a bug not yet diagnosed, use fx-debug first" | Before the first action |

## An instruction says what, not how

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 41 | 74 | Heading "An instruction says what, not how" | moved | `skills/fx-tdd/SKILL.md`, "When this applies" | fx-tdd is where a terse "just make it work" gets read as leave to skip the discipline |
| 42 | 76-77 | "'Add X', 'fix Y', 'just make it work' tell you the goal. None of them repeals a lane." | kept + moved | `PREAMBLE.md`, imperative: "because the work looks small"; `skills/fx-tdd/SKILL.md`, "When this applies" | The decision is in the bootstrap; the lane-internal skip is refused in fx-tdd |
| 43 | 77-78 | "A user who wanted the lane skipped will say so in those words, and asking is cheap; inferring it from brevity is not." | moved | `skills/fx-tdd/SKILL.md`, "When this applies" | Same |

## Non-negotiables

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 44 | 80 | Heading "Non-negotiables" | kept | `PREAMBLE.md`, "Always, lane or no lane" | The rules below that must hold with no lane loaded |
| 45 | 82-83 | "No attribution trailers. Never Co-Authored-By, Claude-Session, or 'Generated with' in a commit message, PR body, or anywhere else." | kept | `PREAMBLE.md`, Always | A commit can happen from any lane or none. The guard also enforces it (`lib/git-guard.js`), and `implementer-prompt.md` repeats it |
| 46 | 84-85 | "Work happens in a worktree. Set one up before you start" | moved | `skills/fx-implement/SKILL.md`, Setup, "1. Workspace"; `references/vocab/worktree-setup.md`; enforced always-on by `lib/git-guard.js`, which refuses every git mutation (commit, merge, push and the rest) on the main checkout | fx-implement owns every build and its Setup creates the worktree before any task. The guard runs in every session and subagent, lane or no lane. Edits made before a commit are not guarded: a file written in the main checkout is caught only when it is committed |
| 47 | 85-86 | "so the branch you are building on is never the one the user is standing in" | moved | `skills/fx-implement/SKILL.md`: "A worktree, so the main checkout is never written to"; `lib/git-guard.js` (main checkout: every mutation refused) | Same. The guard protects the branch the user stands in from commits, not the working files from edits |
| 48 | 86-87 | "This is a workflow, not a wall: commits belong wherever the work is, and the work belongs in a worktree." | moved | `references/vocab/worktree-setup.md`, intro (task 24) | fx-implement Setup reads it before creating a worktree |
| 49 | 88 | "Integration is the user's decision, and you ask for it." | kept | `PREAMBLE.md`, Always: "Integration is the user's decision." | A merge or PR can be proposed from any lane or none |
| 50 | 88-89 | "Merging, opening a PR, or moving the base branch are not steps you take at the end of a task." | kept | `PREAMBLE.md`, Always: "Never merge, open a PR, or move the base branch as the end of a task." | Same |
| 51 | 90 | "Present the options and wait." | moved | `skills/fx-implement/SKILL.md`, "Then ask, and stop": "Present exactly these, and wait for an answer" | End of a build, where the question is asked |
| 52 | 90 | "The base branch is theirs to move." | kept + moved | `PREAMBLE.md`, Always ("move the base branch"); `lib/git-guard.js` refuses a push to the base branch ("the base branch is the user's to move") | Holds with no lane loaded; the guard enforces it |
| 53 | 91 | "Nothing leaves the machine." | kept | `PREAMBLE.md`, Always | A publish or upload can happen from any lane or none |
| 54 | 91-92 | "No publishing, uploading or posting unless the user initiates it." | kept | `PREAMBLE.md`, Always: "unless the user initiates it" | Same |
| 55 | 92 | "Reports are local files." | moved | `skills/fx-implement/implementer-prompt.md`, "Nothing leaves the machine": "Reports are local files." | Every dispatched implementer, the one writing reports |
| 56 | 92-93 | "Pushing a feature branch is the one exception, and it names its target: never force-push, never a bare push." | moved | `lib/git-guard.js`: force push refused (line 137), a bare push refused (line 154), a push to the base branch refused (line 147) | The guard runs on every git command in every session and subagent, lane or no lane |
| 57 | 94 | "Arabic is the default locale; RTL support throughout." | moved | `skills/fx-plan/SKILL.md`, Global Constraints template, as an explicit default line; `skills/fx-design/SKILL.md`, "7. The quality floor"; `agents/fx-lens-a11y.md` (already: "Arabic as the default locale with RTL throughout") | fx-plan writes it into every plan's constraints, which every implementer prompt copies verbatim; fx-design loads for any screen; the a11y lens reviews every UI diff |
| 58 | 95-96 | "Evidence before claims. 'Tests pass' means you ran them and read the output." | kept | `PREAMBLE.md`, Always | A claim of done can be made from any lane or none. Also `references/vocab/verification.md` and fx-implement's Iron Law |
| 59 | 96 | "If a step was skipped, say so." | kept | `PREAMBLE.md`, Always | Same |

## The ladder

The ladder applies at the moment code is written, which is fx-tdd's GREEN step:
fx-tdd is routed for any code with logic, and every implementer invokes it.

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 60 | 98 | Heading "The ladder" | moved | `skills/fx-tdd/SKILL.md`, GREEN, "The ladder" | GREEN, where the code is written |
| 61 | 100 | "You are a lazy senior developer. Lazy means efficient, not careless." | moved | Same | Same |
| 62 | 100-101 | "The best code is the code never written." | moved | Same | Same |
| 63 | 103 | "Stop at the first rung that holds:" | moved | Same | Same |
| 64 | 105 | Rung 1: "Does this need to exist at all? Speculative need: skip it, say so in one line." | moved | Same | Same |
| 65 | 106 | Rung 2: "Already in this codebase? ... reuse it. Re-implementing what sits a few files over is the most common slop." | moved | Same | Same |
| 66 | 107 | Rung 3: "Standard library does it? Use it." | moved | Same | Same |
| 67 | 108 | Rung 4: "Native platform feature covers it? DB constraint over app code, CSS over JS, `<input type="date">` over a picker library." | moved | Same | Same |
| 68 | 109 | Rung 5: "An already-installed dependency solves it? Use it. Never add a new one for what a few lines can do." | moved | Same | Same |
| 69 | 110 | Rung 6: "Can it be one line? One line." | moved | Same | Same |
| 70 | 111 | Rung 7: "Only then: the minimum code that works." | moved | Same | Same |
| 71 | 113-114 | "The ladder runs after you understand the problem, never instead of it." | moved | Same | Same |
| 72 | 114-115 | "Read the task and the code it touches, trace the real flow end to end, then climb." | moved | Same | Same |
| 73 | 115 | "Two rungs work: take the higher one and move on." | moved | Same | Same |
| 74 | 117 | "A bug report names a symptom." | moved | `skills/fx-debug/SKILL.md`, Phase 5 (task 24) | fx-debug is routed for every bug; Phase 5 is the edit |
| 75 | 117-118 | "Before editing, find every caller of the function you are about to touch." | moved | Same | Same |
| 76 | 118-120 | "One guard in the shared function is a smaller diff than a guard in every caller, and patching only the path the task names leaves every sibling caller broken." | moved | Same | Same |
| 77 | 122-123 | "Rules: no interface with one implementation, no factory for one product, no config for a value that never changes." | moved | `skills/fx-tdd/SKILL.md`, GREEN (task 24) | GREEN |
| 78 | 123 | "No scaffolding 'for later'." | moved | Same | Same |
| 79 | 123-124 | "Deletion over addition." | moved | Same | Same |
| 80 | 124 | "Boring over clever: clever is what someone decodes at 3am." | moved | Same | Same |
| 81 | 125 | "Fewest files, shortest working diff." | moved | Same | Same |
| 82 | 127 | Heading "When NOT to be lazy" | moved | `skills/fx-tdd/SKILL.md`, GREEN, "The ladder" | GREEN |
| 83 | 129-131 | "Never simplify away: input validation at trust boundaries, error handling that prevents data loss, security measures, accessibility basics, anything explicitly requested." | moved | Same | Same |
| 84 | 131-132 | "If the user insists on the full version, build it without re-arguing." | moved | `skills/fx-tdd/SKILL.md`, GREEN (task 24) | GREEN |
| 85 | 134-135 | "Never be lazy about understanding. The ladder shortens the solution, never the reading." | moved | `skills/fx-tdd/SKILL.md`, GREEN, "The ladder" | GREEN |
| 86 | 135-136 | "Laziness that skips comprehension ships a confident wrong fix dressed as efficiency." | moved | Same | Same |
| 87 | 136-137 | "The smallest change in the wrong place is not lazy, it is a second bug." | moved | `skills/fx-debug/SKILL.md`, Phase 5 (task 24) | The fix edit |
| 88 | 139-140 | "Non-trivial logic (a branch, a loop, a parser, a money or security path) leaves one runnable check behind: the smallest thing that fails if the logic breaks." | moved | `skills/fx-tdd/SKILL.md`, GREEN, "The ladder" | GREEN. In fx-tdd that check is the test |
| 89 | 140 | "Trivial one-liners need none." | moved | `skills/fx-tdd/SKILL.md`, GREEN, "The ladder", stated with its scope: fx-tdd's own rule ("Too simple to test" is a rationalization) governs logic, so the exemption covers a one-liner with no logic | GREEN. The two rules co-existed in the pre-trim preamble in the same way; the stricter one wins inside the lane |

## Routing

The routing table's job is done by the runtime's native lane list: every
runtime shows the model each lane with its description (B2). Each row lands in
the description of its lane.

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 90 | 142 | Heading "Routing" | kept | `PREAMBLE.md`: "Each lane's description says when it applies. The runtime lists every lane with its description; read that list against the task before anything else." | Points at the routing before any lane loads |
| 91 | 144 | "Match the trigger, then invoke the lane." | kept | Same | Same |
| 92 | 144-145 | "The table names lanes; it does not excuse you from calling them." | kept | `PREAMBLE.md`, imperative and "Invoke, do not read" | Same |
| 93 | 147-148 | Table header "Trigger / Lane" | moved | The runtime's lane list | Before the first action |
| 94 | 149 | new feature, "let's build", any creative work: fx-brainstorm | moved | `fx-brainstorm` description | Before the first action |
| 95 | 150 | an approved design exists: fx-plan | moved | `fx-plan` description | Same |
| 96 | 151 | tasks exist, build them: fx-implement | moved | `fx-implement` description; the plan-state block when task files exist | Same |
| 97 | 152 | writing or changing code with logic: fx-tdd | moved | `fx-tdd` description | Same |
| 98 | 153 | review a diff, branch or PR: fx-review | moved | `fx-review` description | Same |
| 99 | 154 | structure of existing code is the problem: fx-architecture | moved | `fx-architecture` description | Same |
| 100 | 155 | bug, test failure, unexpected behavior: fx-debug | moved | `fx-debug` description | Same |
| 101 | 156 | a prose document needs fixing: fx-humanize | moved | `fx-humanize` description | Same |
| 102 | 157 | over-engineering, "is this too much", what can we delete: fx-architecture | moved | `fx-architecture` description ("is this over-engineered", "what can we delete") | Same |
| 103 | 158 | editing a SKILL.md / CLAUDE.md / AGENTS.md: fx-authoring | moved | `fx-authoring` description | Same |
| 104 | 159 | any chart or dashboard: dataviz | moved | The `dataviz` skill's own description. It is not an fx lane; the runtime lists it wherever it is installed | Same |
| 105 | 160 | library / framework / API docs: context7 | moved | The context7 MCP server's own instructions, which the runtime shows the model at session start | Same |
| 106 | 161 | a screen or component, and how it looks: fx-design | moved | `fx-design` description | Same |
| 107 | 163 | "Dispatching an fx review agent. {{DISPATCH}}" | kept | `PREAMBLE.md`, last paragraph | Per-runtime wording (Codex must pass `agent_type`). Skill files are one static text for every runtime and must name actions, never tools, so only the rendered bootstrap can carry it |
| 108 | 165-166 | "Project facts (structure, patterns, test commands) are in repo.md and .fx.json at the repo root." | moved | The repo.md note appended to every render when a `repo.md` exists; `skills/fx-tdd/SKILL.md` ("Take test_one, test_scope and test_all from .fx.json"; "read repo.md"); `skills/fx-implement/implementer-prompt.md`, Stack | The note renders with the bootstrap; fx-tdd and the implementer prompt load when tests are run |
| 109 | 166 | "Never guess a test command." | moved | `skills/fx-tdd/SKILL.md`: "Never assume the runner"; `skills/fx-implement/SKILL.md`: "never guess them"; `implementer-prompt.md`: "Never guess one" | When a test is about to be run |

## Prose

The prose rules apply to every output, including chat, commits, reviews and
plans, which are often written with no prose lane loaded. So the core list
stays in the bootstrap in a one-line form (fix round 1), beside the dash rule.
The detail lives where prose is written: fx-humanize for a document, fx-tdd for
code comments and test names, and the implementer prompt for everything a
dispatched implementer writes. fx-brainstorm's design review also checks its
document against the list and invokes fx-humanize.

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 110 | 168 | Heading "Prose" | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in `skills/fx-humanize/SKILL.md`, "What to do", scope paragraph | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 111 | 170-171 | "Applies to every output, without exception: chat, code comments, commit messages, ADRs, design docs, subagent reports, ledger entries, PR bodies." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in `skills/fx-humanize/SKILL.md`, "What to do"; `implementer-prompt.md`, "Prose" | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 112 | 172 | "Comments are the highest-volume prose you write: they are covered." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in `skills/fx-tdd/SKILL.md`, GREEN, comment paragraph | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 113 | 174 | "No inflated claims." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize pattern 1; `implementer-prompt.md`, "Prose" | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 114 | 174 | "No 'it's not X, it's Y'." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize pattern 9; `implementer-prompt.md`, "Prose" | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 115 | 174-175 | "No stock AI vocabulary (delve, leverage, robust, seamless, comprehensive, crucial)." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize pattern 7 (the word list); `implementer-prompt.md`, "Prose" | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 116 | 175-176 | "No vague attribution ('experts say', 'studies show')." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize pattern 5; `implementer-prompt.md`, "Prose" | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 117 | 176 | "No sales register." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize pattern 4; `implementer-prompt.md`, "Prose" | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 118 | 177 | `(prose-gate: quoting)` marker | moved | `implementer-prompt.md`, "Prose", which quotes the list | The marker exempts the block that quotes the words |
| 119 | 179 | "No em dashes or en dashes. Not 'sparingly': none." | kept | `PREAMBLE.md`, Always: "No em dashes or en dashes in any output, chat and commit messages included." | Applies to every line of output, lane or no lane; `scripts/check-prose` checks it mechanically |
| 120 | 179-180 | "Use a period, a comma, a colon, or parentheses, or rewrite the sentence." | moved | `skills/fx-humanize/SKILL.md` pattern 14, Rule | Editing prose |
| 121 | 180-182 | "stated as an absolute because the softer version is unmeasurable, and an unmeasurable rule is one nobody checks" | moved | `skills/fx-authoring/SKILL.md`, "PREAMBLE.md" (task 24) | Writing a rule for agents |
| 122 | 182-183 | "`scripts/check-prose` greps for it." | moved | Same | Same |
| 123 | 185-186 | "Write plainly, which is a positive instruction and not the absence of the ones above." | moved | `skills/fx-humanize/SKILL.md`, "What to do", scope paragraph | Editing prose |
| 124 | 186 | "Lead with the main point." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize, "What to do", scope paragraph; `implementer-prompt.md`, "Prose" | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 125 | 186-187 | "Say who acts: active voice, not 'it was decided'." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize, scope paragraph and pattern 13 | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 126 | 187 | "Use one term for one thing and keep using it." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize, scope paragraph and pattern 11 | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 127 | 187 | "Prefer the common word." | kept (one-line form) | `PREAMBLE.md`, Always, the prose bullet (one-line form); detail in fx-humanize, "What to do", scope paragraph | Applies to every output, chat, commits, reviews and plans included, with or without a lane loaded (B3) |
| 128 | 189-190 | "Never rewrite an identifier, a command, a path, a schema field or a quotation." | moved | `skills/fx-humanize/SKILL.md`, "What to do" step 5 (task 24) | A prose pass, where the failure happened |
| 129 | 190 | "Plain language governs the prose around them, never them." | moved | Same | Same |
| 130 | 190-193 | The `let x = a - b` story | moved | Same | Same |
| 131 | 195-196 | "fx-humanize carries the full treatment, 35 patterns with examples" | kept | `PREAMBLE.md`, last line of "Always" | The pointer to the lane; also the marker rows 01, 02 and 16 probe |
| 132 | 198-200 | "A comment says why, not what. The code already says what... Write the reason, the constraint, or the thing that bit someone, or write nothing." | moved | `skills/fx-tdd/SKILL.md`, GREEN (task 24) | Writing code and its comments |
| 133 | 202-205 | "And never claim more than the thing claims... a test's name, a comment above a guard, a summary in a report" | moved | `skills/fx-tdd/SKILL.md`, "What a good test is" (task 24); `implementer-prompt.md`, "Prose" | Naming a test; every implementer report |
| 134 | 205-206 | "A description that overstates is worse than a narrow one, because the next reader believes it and stops looking." | moved | `skills/fx-tdd/SKILL.md`, "What a good test is" (task 24) | Same |
| 135 | 206-211 | The four measured overclaims | moved | Same (task 24) | Same |
| 136 | 213-214 | "The check is cheap and mechanical: read the claim, then ask what would have to break for it to fail. If nothing would, narrow the words until something would." | moved | `skills/fx-tdd/SKILL.md`, "What a good test is"; `implementer-prompt.md`, "Prose" | Same |
| 137 | 216-226 | "Precision is not accuracy..." and the `0640` runbook story, "When you sharpen a claim, measure the sharpened version" | moved | `skills/fx-humanize/SKILL.md`, "What to do" step 2 (task 24) | Editing a document, where the runbook instance happened |

The last paragraph of the pre-trim preamble (lines 228-231) is covered in these
rows:

| # | Line | Rule | Status | New home | Loaded when / reason |
|---|---|---|---|---|---|
| 138 | 228 | "Code first, then at most three short lines: what was skipped, when to add it." | moved | `skills/fx-tdd/SKILL.md`, GREEN, "Reporting the change" | Right after GREEN, when the change is reported |
| 139 | 229-230 | "If the explanation is longer than the code, delete the explanation: every paragraph defending a simplification is complexity smuggled back as prose." | moved | Same | Same |
| 140 | 230-231 | "Explanation the user actually asked for is not debt; give it in full." | moved | Same | Same |

## Kept rows, and why no lane can carry them

- Rows 1-25, 28, 30-31, 33 and the bootstrap half of 29, 32, 34 and 42: the
  intro, the imperative and the rules about whether to invoke a lane. That
  decision is made before any lane is loaded.
- Rows 44-45, 49-50, 52-54, 58-59: attribution, integration, nothing leaves
  the machine, evidence before claims. Each can be broken from any lane or
  from none. The guard also enforces attribution and the base-branch rule.
- Row 107: the per-runtime dispatch wording. Only the rendered bootstrap is
  per-runtime.
- Rows 90-92, 119, 131: the pointer to the descriptions, the dash rule
  (checked in every output), and the pointer to fx-humanize.
- Rows 110-117 and 124-127: the core prose rules in a one-line form. They
  apply to every output, lane or no lane.

## Lane-overlap audit (B2)

Pairs of model-visible lanes that claim the same work, and the redirect each
side carries. `tests/gates/description-overlap.test.js` holds the declared
pairs and fails when either side stops naming the other. It also finds any
quoted trigger phrase two descriptions share; today there is none.

| Pair | Shared trigger | Redirect in the first | Redirect in the second | Source |
|---|---|---|---|---|
| fx-tdd / fx-brainstorm | "add a helper", a feature | "For a helper or function whose behavior the request already states, use this lane, not fx-brainstorm." | "For one helper or function whose behavior the request already states, use fx-tdd." | S3 diffs |
| fx-tdd / fx-debug | a bug fix | "For a bug not yet diagnosed, use fx-debug first." | "Once diagnosed, the fix goes through fx-tdd." | S3 diff; new clause |
| fx-humanize / fx-authoring | editing a document | "For a document an agent consumes (SKILL.md, CLAUDE.md, AGENTS.md), use fx-authoring." | "Prose for humans is fx-humanize." | S3 diff; new clause |
| fx-brainstorm / fx-design | a new page or component | "For how a screen looks, use fx-design." | "For a page whose content the request already states, use this lane, not fx-brainstorm." | S3 diff; new clause, measured below |
| fx-review / fx-architecture | checking code | "For EXISTING code with no diff, use fx-architecture instead." | "For a DIFF, use fx-review." | existing |

The fx-design clause was added after the live gate: the pricing-page prompt
("We need a pricing page... Make it look good") loaded fx-brainstorm instead of
fx-design in 3 of 6 opencode runs on this tree. An A/B, five runs each on
opencode: S3 exactly as measured, applied to HEAD, loaded fx-design 3 of 5
(so the miss predates this task's other changes); the same tree plus the
clause loaded fx-design 5 of 5, and fx-brainstorm in none.

Pairs considered and not declared:

- fx-design / fx-review and fx-design / fx-architecture: fx-design already
  names both, and neither claims how a screen looks.
- fx-brainstorm / prototype, fx-plan / fx-brainstorm, fx-implement / fx-plan:
  sequential lanes. The later lane's description names the earlier one, which
  is the order rows 36-38 require.
- fx-grill, fx-critique, fx-audit, fx-handoff, fx-setup: hidden from the model,
  so they never compete for a prompt.
