# Compare 5: code review and architecture

Area: superpowers `requesting-code-review` and `receiving-code-review` at v7.0.1 (base v6.3.0); mattpocock `code-review`, `codebase-design`, `improve-codebase-architecture` at master 5beb35b (base 1.2.3 = 30204e6); fx at main dd99986.

Labels for mattpocock ideas: "1.3.x" = released in v1.3.0 or v1.3.1; "master" = commit 3da8c01, not in any tag.

## 1. Files read

Every file below was read in full unless marked partial.

### Upstream

| File | Lines | Changed since base |
|---|---:|---|
| superpowers `skills/requesting-code-review/SKILL.md` | 95 | 6.4.1: merge-base BASE_SHA comment; 7.0.0: `cut -d' ' -f1` instead of awk `$1` |
| superpowers `skills/requesting-code-review/code-reviewer.md` | 198 | 6.4.1 (5bf4e78, #2319): new "The spec is a vision document" and "Declined to judge" sections (+17 lines) |
| superpowers `skills/receiving-code-review/SKILL.md` | 205 | unchanged |
| superpowers `skills/executing-plans/SKILL.md` | partial, 259 to 274 | read for how the controller consumes the two new reviewer sections |
| superpowers `skills/using-superpowers/references/claude-code-tools.md` | partial, 1 to 30 | read for the nested-controller decision's effect on review |
| superpowers `RELEASE-NOTES.md` | line 127 | the stated reason for the vision-document change |
| mattpocock `skills/engineering/code-review/SKILL.md` | 89 | 1.3.x: punctuation, quoted description, tracker wording; master: standards-file search, foreground sub-agents |
| mattpocock `skills/engineering/code-review/agents/openai.yaml` | 3 | |
| mattpocock `skills/engineering/codebase-design/SKILL.md` | 114 | 1.3.x: punctuation only |
| mattpocock `skills/engineering/codebase-design/DEEPENING.md` | 37 | 1.3.x: punctuation only |
| mattpocock `skills/engineering/codebase-design/DESIGN-IT-TWICE.md` | 44 | 1.3.x: punctuation; CONTEXT.md to GLOSSARY.md |
| mattpocock `skills/engineering/codebase-design/agents/openai.yaml` | 3 | |
| mattpocock `skills/engineering/improve-codebase-architecture/SKILL.md` | 71 | 1.3.x: GLOSSARY.md; "Call the Skill tool with" wording; punctuation |
| mattpocock `skills/engineering/improve-codebase-architecture/HTML-REPORT.md` | 123 | 1.3.x: title "Architecture review for {{repo name}}"; punctuation |
| mattpocock `skills/engineering/improve-codebase-architecture/agents/openai.yaml` | 5 | `allow_implicit_invocation: false` |
| `git diff 30204e6 HEAD` over the three mattpocock skills | 467 | saved at `upstream/c5_mp.diff` |
| `git diff v6.3.0 HEAD` over the two superpowers skills | 2 files, +19/-2 | |
| `superpowers-since-6.3.0.md`, `mattpocock-skills-since-1.2.3.md` | relevant lines | |

### fx

| File | Lines |
|---|---:|
| `skills/fx-review/SKILL.md` | 317 (16,736 bytes) |
| `skills/fx-review/reviewer-prompt.md` | 229 |
| `skills/fx-review/COVERAGE.md` | 138 |
| `skills/fx-implement/task-reviewer-prompt.md` | 321 |
| `skills/fx-implement/re-review-prompt.md` | 189 |
| `skills/fx-implement/SKILL.md` | partial, 750 to 789 (Final review) |
| `agents/fx-lens-a11y.md` | 141 |
| `agents/fx-lens-database.md` | 123 |
| `agents/fx-lens-pipeline.md` | 222 |
| `agents/fx-lens-security.md` | 161 |
| `agents/fx-lens-silent-failure.md` | 121 |
| `agents/fx-devils-advocate.md` | 196 |
| `skills/fx-architecture/SKILL.md` | 183 (8,961 bytes) |
| `skills/fx-architecture/HTML-REPORT.md` | 197 |
| `skills/fx-architecture/COVERAGE.md` | 135 |
| `references/vocab/codebase-design.md` | 308 |
| `references/vocab/fowler-smells.md` | 68 |
| `references/vocab/receiving-review.md` | 156 |
| `docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md` | 100 |
| `docs/adr/0029-per-task-review-is-the-reviewer-plus-tripwires.md` | 21 |
| `docs/adr/0044-the-branch-pass-reviews-what-per-task-review-missed.md` | 21 |

Also checked with grep: which fx files reference `codebase-design.md` and `fowler-smells.md`; `$N` positional strings in fx skill bodies (none); "foreground" or wait rules in fx-review (none); `git log -S"Under 400 words"` on fx-review (removed in ac5a592, 2026-10-21).

## 2. Findings per upstream skill

Size: S = a few lines in one or two files; M = several files or a gate test; L = new mechanism.

### 2.1 superpowers `requesting-code-review` (SKILL.md + code-reviewer.md)

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| R1 | code-reviewer.md:33 to 41 (6.4.1): "The spec is a vision document... For behavior the spec is silent on, judge by what a reasonable person using this software would expect: a reasonable person's expectation is a requirement, and a spec's silence is not permission. Grade such findings by their effect on that person, not by whether the spec mentions the trigger." Release note: "a crash on an unnamed input no longer slides through as Minor." | Absent. `reviewer-prompt.md:117 to 125` calibrates by "actual severity"; `task-reviewer-prompt.md:146 to 162` checks Missing / Extra / Misunderstood against the brief only; Calibration 214 to 228 says nothing about spec silence. | **fx gap** | fx task reviewers review against a compiled brief with acceptance criteria. An input the task never names (empty list, Arabic-only string, nil tenant) that crashes is today either not judged (it is not "Missing") or graded Minor ("coverage could be broader", task-reviewer:223). That is the exact failure upstream fixed. | Add to `task-reviewer-prompt.md` at the end of Part 1, and to `reviewer-prompt.md` after "Global constraints": "**The brief is a vision document.** It says what the software must do; it does not list every input or condition it will meet. Where it is silent, a reasonable user's expectation is the requirement: grade a finding there by its effect on that user, not by whether the brief names the trigger. Silence licenses no new feature either: unrequested behaviour stays an Extra finding." | S |
| R2 | code-reviewer.md:43 to 48: "Before your verdict, list every behavior you considered and set aside as outside the plan or spec, one line each, with the reason. The executor rules on each line; nothing you set aside is dropped silently. An empty list means you set nothing aside." executing-plans/SKILL.md:261 to 264 makes each line a ledgered `Ruling:`. | Absent. The nearest thing, the ⚠️ "Cannot verify from diff" item (task-reviewer:160 to 162, 256 to 258), records what the reviewer *could not* check, not what it *chose not to judge*. | **fx gap** | A set-aside behaviour vanishes today. ADR 0044 makes the branch pass review "what per-task review missed", but the only record of what was missed is lens lines in the ledger; a reviewer's own scoping decisions are invisible. A declined list gives the branch pass an explicit input instead of an inference, and it makes R1 auditable. | (a) Both prompts gain a `### Declined to judge` section in the findings file, one line per behaviour with its reason, "None" when empty. (b) task-reviewer `## Ledger lines` gains `Task <NN>: declined: <behaviour>: <reason>`; the five-line reply keeps five lines by appending `, declined: <n>` to the C/I/M line, as plan-mandated already does. (c) `fx-implement` (per-task step and `fix-loop.md`) rules each declined line: a `Ruling:` when it stands, or a finding that enters the fix loop. (d) `reviewer-prompt.md` "Carried findings" (44 to 50) also receives the ruled declined lines for triage. (e) Extend the ledger-count gate test that already checks Minor counts. | M |
| R3 | executing-plans/SKILL.md:260 to 269: "The reviewer's severity labels are advice; the gate is yours... a reviewer who set a finding at Minor because the spec was silent has graded the spec, not the effect." | `receiving-review.md:58 to 71` checks whether a finding is correct, never whether its *grade* is. `fx-review/SKILL.md:253 to 255` defines severities but not who owns the grade. | **fx gap** (follows R1) | Without it the controller trusts a reviewer's Minor and defers a crash to the branch pass or past it. | Add to `receiving-review.md` under "Source-specific handling": "**A reviewer's severity is advice; the grade is yours.** Re-grade by what a user gets if it ships. A finding graded Minor because the spec was silent graded the spec, not the effect." | S |
| R4 | SKILL.md:28: `BASE_SHA=$(git rev-parse HEAD~1)  # or: git merge-base origin/main HEAD` | `fx-review/SKILL.md:43 to 66`: merge-base by default, recorded per-task BASE, "**Never `HEAD~1`**: it silently drops all but the last commit of a multi-commit task." | **fx better** | Upstream still offers `HEAD~1` first. | None. | |
| R5 | SKILL.md:55 (7.0.0): awk `$1` replaced by `cut` because Claude Code substitutes `$1` in skill bodies. | No `$N` string in any fx `SKILL.md` (grep). | **equivalent** | Worth knowing as a rule for future edits. | Optional: add "never write `$1`..`$9` in a SKILL.md body; Claude Code substitutes them" to `fx-authoring`'s rules (outside this area). | S |
| R6 | code-reviewer.md:52: read-only; another revision goes in `git worktree add /tmp/review-[SHA]`. | `reviewer-prompt.md:52 to 68`: worktree under `<root>/.worktrees/`, ignore check via `info/exclude`, removal at the end. | **fx better** | Keeps scratch inside the repo and cleans up; matches the owner's never-delete-outside-repos rule. | None. | |
| R7 | code-reviewer.md:54 to 61: "You do not dispatch subagents". | Same paragraph in all three fx prompts (reviewer 70 to 76, task-reviewer 77 to 83, re-review 64 to 70). | **equivalent** | | None. But see N1 on the nested controller: this text must never be copied into the orchestrator's brief. | |
| R8 | code-reviewer.md:63 to 151: What to check, Calibration, Output format, Critical rules. | `reviewer-prompt.md:82 to 218`: all kept, plus tautological-assertion and stale-docs checks, carried-findings triage, findings file written first, five-line reply, ledger lines. | **fx better** | The findings-file-first rule (reviewer 127 to 144) answers a measured loss upstream has no guard for. | None. | |
| R9 | SKILL.md:48 to 73 and code-reviewer.md:162 to 198: worked examples. | Dropped (`fx-review/COVERAGE.md:81`). | **equivalent** | Every rule the examples show is stated normatively. | None. | |
| R10 | SKILL.md:12 to 22, 75 to 95: mandatory/optional triggers, two rationalizations, red flags. | `fx-review/SKILL.md:16, 27 to 30, 172 to 178, 293 to 294, 307 to 317`. | **equivalent** | | None. | |

### 2.2 superpowers `receiving-code-review` (unchanged since 6.3.0)

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| V1 | SKILL.md:8 to 174: response pattern, forbidden responses, unclear items, source-specific handling, YAGNI grep, order, push-back triggers, acknowledgments, correcting push-back, common mistakes. | `receiving-review.md:1 to 150` keeps all of it. It widens scope to "any correction from the user" (line 3), treats automated reviewers as external (58), and adds ADRs and `design.md` as prior decisions (70). | **fx better** | fx's reviewers are subagents, so "external reviewer" must cover them; upstream's wording only names humans. | None. | |
| V2 | SKILL.md:176 to 201 "Real Examples": the "Remove legacy code" reply that checks the build target before agreeing; the YAGNI metrics reply. | Absent, and `fx-review/COVERAGE.md:84 to 107` has no row for them (claims 176 to 182 are the common-mistakes table). | **upstream slightly better**; COVERAGE gap | The legacy-code example is the only place either side shows VERIFY applied to a *deletion* suggestion, which is the case a model most readily agrees with. | Add one example to `receiving-review.md` under "When to push back", Rails-flavoured: `Reviewer: "Remove the legacy v1 serializer." Reply: "Checked: the mobile SDK 2.x still calls /v1. Keep it, or set a sunset date?"`. Add a COVERAGE row recording Real Examples as kept (one) or dropped (rest). | S |
| V3 | SKILL.md:203 to 205: reply in the GitHub comment thread via `gh api`. | `receiving-review.md:152 to 156`: replying "sends content outward"; only on an explicit request; thread not top-level. | **fx better** | Owner rule: nothing leaves the machine unless he starts it. | None. | |
| V4 | Receiving review is its own skill; requesting-code-review only says "push back if reviewer is wrong". | `fx-review/SKILL.md:257 to 298` (about 2.3 KB) restates most of `receiving-review.md` after pointing at it. | **upstream better structure** | fx-review is at 16,736 of 20,000 bytes. R1, R2, C1 to C3 and N1 all want lines in it. The restatement is the cheapest place to recover room, and two copies drift. | Cut §7 to: the pointer to `receiving-review.md`; "Fix Critical immediately. Fix Important before proceeding. Record Minor where the final branch review will see it"; the four "Never" rules. Delete the six-step list, order, YAGNI, push-back and forbidden-phrase paragraphs (all in the reference, which §7 already says to read first). Frees about 1.5 KB. | S |

### 2.3 mattpocock `code-review`

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| C1 | SKILL.md:36 (master): "Search the repo for every file that documents how code should be written. When `CODING_STANDARDS.md` or `CONTRIBUTING.md` exists, it must be on the list." (issue 1065: the agent skipped them.) | `fx-review/SKILL.md:145 to 148`: "Whatever the repo documents (`CONTRIBUTING.md`, `docs/DESIGN/*`, `.rubocop.yml`, `.editorconfig`)". No search instruction. `repo.md` is not named, although fx's own preamble says every repo with one keeps "structure, patterns and local decisions" there; advantage-backend's rules live in `repo.md` "Rules". | **fx gap** | The Standards reviewer is handed whatever the controller happened to list. In this repo that list misses the one file that holds the rules. | Replace line 145 to 148 with: "**Search the repo** for every file that documents how code should be written. When they exist these must be on the list: `repo.md` (its Rules), `CODING_STANDARDS.md`, `CONTRIBUTING.md`, `AGENTS.md` / `CLAUDE.md` rule sections, `docs/DESIGN/*`. Linter configs (`.rubocop.yml`, `.editorconfig`) only tell you what to skip." | S |
| C2 | SKILL.md:60 (master): "Issue both sub-agent calls together, in the foreground, and aggregate the reports they return." (issue 1073: background agents, controller aggregated before they returned.) | `fx-review/SKILL.md:166 to 175`: "run concurrently" in separate subagents. No rule to wait. On Claude Code a dispatched agent runs in the background and reports by notification. | **fx gap** | §6 says "present each pass under its own heading". A controller that aggregates early reports a pass as clean that has not answered. | Add to §5, one line: "Send every dispatch in one message, then wait for every reply before §6. Never aggregate a partial set: name any pass that has not returned." | S |
| C3 | SKILL.md:27 to 32: spec sources in order: commit issue refs, a passed path, "a spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature", then ask. | `fx-review/SKILL.md:134 to 138`: task file, `docs/plans/<slug>/design.md`, a passed path, ask. COVERAGE:31 claims "a spec file matching the branch" was kept; only the `docs/plans` form was. | **fx gap** (small) | advantage-backend keeps issues as markdown under `.scratch/<feature-slug>/` (its CLAUDE.md). A standalone branch review there finds no spec and asks, or skips the Spec axis. | §3: insert "a spec or issue file under `.scratch/<slug>/` or `specs/` matching the branch" after `design.md`. Correct COVERAGE:31. | S |
| C4 | SKILL.md:66, 72: each sub-agent brief ends "Under 400 words." | Removed in fx commit ac5a592 (2026-10-21) and replaced by "Keep to findings the diff supports." (SKILL.md:189, 197). `COVERAGE.md:41 to 42` still says the cap was kept verbatim. | **upstream better**; COVERAGE stale | Standards and Spec replies are the only fx passes that return findings inline (lenses are recorded to files; reviewers write findings files). §6 pastes them verbatim into the controller's context, so an uncapped Standards reply on a wide branch lands in full. | Reinstate "Under 400 words." in both briefs, or have both write a findings file like every other pass. Either way, fix COVERAGE:41 to 42. | S |
| C5 | SKILL.md:38 to 56: Fowler smell baseline, repo overrides, judgement call, skip tooling. | `fowler-smells.md:1 to 68`, Ruby-adapted (`case`/`if`, `a.b.c.d`). | **equivalent** | | None. | |
| C6 | SKILL.md:76 to 89: never merge or rerank axes; worst issue within each axis. | `fx-review/SKILL.md:228 to 255`, plus severities within an axis and lens headings. | **equivalent** | | None. | |
| C7 | SKILL.md:11: Standards always runs. | `fx-review/SKILL.md:81 to 82`: Standards only above about 3 files or 150 lines. | **fx better** (cost) | | None. | |
| C8 | SKILL.md:13, 29 (1.3.x): tracker resolved through the setup skill's tracker doc; user told to run setup. | `fx-review/SKILL.md:140 to 141`: point at `/fx:fx-setup`. | **equivalent** | | None. | |

### 2.4 mattpocock `codebase-design` (SKILL.md, DEEPENING.md, DESIGN-IT-TWICE.md)

Only punctuation and the GLOSSARY rename changed since 1.2.3 (1.3.x). Content comparison against `references/vocab/codebase-design.md`:

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| D1 | SKILL.md:10 to 110: seven-term glossary, deep vs shallow, principles, testability, relationships, rejected framings. | `codebase-design.md:16 to 166`, Ruby examples, plus "Four more tests" (replacement, new hire, scale, resume) and "requirements first". | **fx better** | The four tests let fx-architecture treat over-building as a finding, which upstream cannot. | None. | |
| D2 | SKILL.md frontmatter: a skill "when another skill needs the deep-module vocabulary". | A reference, "to consult, not a session to run" (`codebase-design.md:12 to 14`). | **fx better** | One claimant per intent; no lane competes with fx-architecture for "deepen this". | None. | |
| D3 | (Upstream has no consumer list.) | `codebase-design.md:12 to 13` says `fx-review` consults it "for structure findings". No fx-review file references it (grep). The fx structure check, `task-reviewer-prompt.md:199 to 204`, says "Are **units** decomposed", and "unit" is on this reference's *Avoid* list (line 23). | **fx internal gap** | The review side never applies the deletion test or the one-adapter rule to new code, so a pass-through module or a single-adapter seam added by a task is only caught if the reviewer thinks of it. | `task-reviewer-prompt.md:199 to 204`: replace "units" with "modules" and add: "Does any new module fail the deletion test (a pass-through whose complexity would vanish if deleted), or add a seam with only one adapter?" Add the same question to `reviewer-prompt.md` "Architecture" (96 to 100). The reviewer gets the two questions inline, not a reference path. | S |
| D4 | DEEPENING.md:17 to 21: remote but owned = "your own services across a network boundary (microservices, internal APIs)". | `codebase-design.md:193 to 196`: "another engine over gRPC, an internal API, a queue consumer". | **upstream neutral, fx example misleads** | The owner's anti-goals rule out gRPC and microservices; Advantage engines share one process. An example of "another engine over gRPC" invites a ports-and-adapters recommendation between engines that should be in-process. | Change the example to "an internal HTTP API, a queue consumer, a service another team deploys". Engines in one Rails process are category 1 or 2. | S |
| D5 | DESIGN-IT-TWICE.md:1 to 44 (1.3.x: GLOSSARY.md). | `codebase-design.md:235 to 302`, same content; says `CONTEXT.md` (line 278). | **equivalent**, rename pending | Owner decided the rename. | Rename at line 278 (see A4). | S |
| D6 | DEEPENING.md:27 to 37: seam discipline, replace don't layer. | `codebase-design.md:214 to 233` and again `fx-architecture/SKILL.md:172 to 183`. | **equivalent** | The fx-architecture copy duplicates the reference it already loads. | Optional: delete `fx-architecture/SKILL.md:172 to 183` and point at the reference. Saves 0.8 KB; not needed for size. | S |

### 2.5 mattpocock `improve-codebase-architecture` (SKILL.md, HTML-REPORT.md)

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| A1 | SKILL.md:4 `disable-model-invocation: true`; openai.yaml `allow_implicit_invocation: false`. 1.3.x (1dab982) also removed `diagnosing-bugs`' hand-off to it because "the bug-fix flow is often unattended". | fx-architecture is model-invocable (COVERAGE:18, deliberate). `fx-debug/SKILL.md:299` and `:316` route a three-failed-fixes bug to fx-architecture, whose §2 ends by asking "Which of these would you like to explore?" and has no unattended rule. | **fx gap** (unattended path) | Inside an `fx-implement` run a debug escalation can land in a lane that waits for a human who is not there. `fx-devils-advocate.md:183 to 186` already solved this for its own gate. | Add to fx-architecture §2, after the question: "**Unattended** (no human to answer): write the report, record its path in the ledger as `parked: architecture candidate <title>`, and return. Never start the grilling loop without a human." | S |
| A2 | SKILL.md:39: write to the OS temp dir "so nothing lands in the repo". | `fx-architecture/SKILL.md:77 to 93`: `docs/plans/<slug>/report-<timestamp>.html` per ADR-0015. | **fx better** (owner decision) | Report can be reopened and committed with the plan. | None. | |
| A3 | SKILL.md:41, HTML-REPORT.md:13 to 16: Tailwind and Mermaid from CDNs. | `HTML-REPORT.md:13 to 52`: vendored, pinned, offline. | **fx better** | Nothing about the repo leaves the machine. | None. | |
| A4 | 1.3.x (006a52b): every read and write of `CONTEXT.md` is now `GLOSSARY.md`; skills look only for GLOSSARY.md. | `CONTEXT.md` / `CONTEXT-MAP.md` at `fx-architecture/SKILL.md:28, 44, 56, 118, 119, 154, 156` and `codebase-design.md:278` (13 hits). | **decided** | Owner already chose the rename. | Rename at those lines; add a fallback "read `CONTEXT.md` if no `GLOSSARY.md` exists yet" only if the rename lands before repos are migrated. Same for `COVERAGE.md` mentions. | S |
| A5 | SKILL.md:25: read the glossary and area ADRs first. | `fx-architecture/SKILL.md:44 to 45` says it; the sentence that refines it, "On a multi-engine repo, that means the engine's own `CONTEXT.md`; the root map points the way. Never scan every engine at once." sits at 56 to 57, after the five-tests paragraph, where "that" has no referent. | **fx editing defect** | A reader reaches "that means the engine's own" with "excess complexity" as the nearest noun. | Move lines 56 to 57 to directly after line 45. | S |
| A6 | SKILL.md:18 to 35: scope before you scan, hot spots, sub-agent walk, five friction questions, deletion test. | `fx-architecture/SKILL.md:31 to 73`, plus "Anchor the requirements before you scan" (47 to 55). | **fx better** | Requirements first stops taste being reported as a finding. | None. | |
| A7 | SKILL.md:43 to 60, HTML-REPORT.md:36 to 123: card fields, diagrams, style, tone, Top recommendation, "Do NOT propose interfaces yet". | `fx-architecture/SKILL.md:97 to 131`, `HTML-REPORT.md:71 to 197`: same, Benefits merged into Wins with the glossary-terms rule kept. | **equivalent** | | None. | |
| A8 | SKILL.md:62 to 71: grilling loop; GLOSSARY and ADR side effects; design-it-twice. Ends there. | `fx-architecture/SKILL.md:133 to 164`, ADR three-part test added, plus §4 handoff to `fx-plan` with expand:contract. | **fx better** | Upstream has no route from a chosen candidate to implementation. | None. | |

### 2.6 Owner decision interaction: the nested controller

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| N1 | claude-code-tools.md:18 to 29: ONE mid-tier orchestrator subagent runs the whole build loop and "dispatches its own implementers and reviewers"; the release keeps "one final review on the most capable model". | `fx-review/SKILL.md:73 to 76`: the Correctness axis is `/code-review`. ADR 0014:59 to 61: `/code-review` is something "a dispatched agent cannot invoke". `fx-implement/SKILL.md:757` invokes fx-review branch mode from the controller. | **conflict to design for** | Once the controller is a subagent, the final branch review loses the Correctness axis silently, and the "most capable" final reviewer is dispatched by a mid-tier model that must remember the `Capable because:` line (ADR 0044 risk line already flags that this is checked only by phrase). | When fx adopts the nested controller: the orchestrator runs tasks and per-task review only, stops at "Before the final review", and returns its ledger path and "Rulings I made". The top-level session runs the coverage audit and fx-review branch mode, so `/code-review` and the top-tier dispatch stay where they work. State this in the nested-controller text and one line in fx-review §2 Correctness: "Inside a dispatched agent `/code-review` is unavailable: the branch review runs in the top-level session." Never copy the reviewers' "You do not dispatch subagents" paragraph into the orchestrator brief. | M |

### 2.7 fx review agents with no upstream counterpart

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| L1 | Nothing: upstream has one reviewer (superpowers) or two axes (mattpocock). | Five trigger-gated lenses (`agents/fx-lens-*.md`), per-task tripwires (ADR 0029), limited branch pass (ADR 0044), measured narrowing of the pipeline lens (ADR 0014). | **fx better** | Domain checks upstream reviewers do not know to make (tenant scope, RTL, Sidekiq commit races, unbounded enqueue). | None. | |
| L2 | n/a | `fx-devils-advocate.md:34` "The target is the document" and `:40` "If it would not change the design or the plan, it is not a finding": both predate code mode (102 to 149). | **fx internal inconsistency** | In code mode a literal reading drops every code-only finding. | Line 34: "The target is the artifact: the document or the diff." Line 40: "If it would not change the design, the plan or the code, it is not a finding." | S |
| L3 | code-reviewer.md:33 to 41 (R1) | Devil's advocate code mode (114 to 149) is unprimed and already judges the whole quality lens. | **equivalent** | It does not need R1; it has no spec scope to hide behind. | None. | |

## 3. Ideas fx has that upstream lacks (keep them)

- Task mode vs branch mode, with model tier and effort scaled to each, and the limited branch pass that subtracts what per-task review already covered (ADR 0029, 0044).
- Trigger-gated risk lenses, matched on authored content rather than file extension, with ceding rules between lenses.
- The unprimed adversarial pass: a reviewer given no question list, with accepted-risks context so settled calls are not re-reported.
- Findings written to a file before the reply, a five-line reply contract, and ledger lines whose count the controller checks: guards against a measured loss of a whole review.
- "Do not trust the report" and "a stated rationale never downgrades a finding's severity" (task-reviewer:85 to 94).
- "Should this code exist?" reuse check before correctness (task-reviewer:166 to 178), callers-and-variants check, runnable-documents-are-run rule, valid-RED check.
- Plan-mandated defects reported as Important, labelled, for the human to decide.
- Scoped re-review that verdicts each finding and cannot extend the loop with out-of-scope observations.
- `--comment` and thread replies treated as publishing outward; `/code-review ultra` named as user-triggered and billed.
- In architecture: requirements anchored before the scan, the four extra tests (replacement, new hire, scale, resume), excess complexity as a deepening candidate, the ADR three-part test, the handoff to `fx-plan`, a committed offline report with vendored assets.

## 4. Top recommendations (ranked)

1. Add "the brief is a vision document" to `task-reviewer-prompt.md` and `reviewer-prompt.md`, so a crash on an input the task never names is graded by its effect, not deferred as Minor. (R1)
2. Add a "Declined to judge" list to both reviewer prompts, ledger it as `Task <NN>: declined:` lines the controller rules on, and feed the ruled lines to the branch pass; this gives ADR 0044's "what per-task review missed" an explicit input. (R2, R3)
3. Make fx-review's Standards step search for standards files and always include `repo.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md` and `AGENTS.md`/`CLAUDE.md` rules; today the file holding this repo's rules is not on the list. (C1)
4. Before adopting the nested controller, keep the final branch review in the top-level session, because `/code-review` cannot run inside a dispatched agent and the Correctness axis would vanish silently. (N1)
5. Add one wait rule to fx-review §5: dispatch every pass together and aggregate only after every reply arrives. (C2)
6. Cut fx-review §7 to a pointer plus the fx-specific lines, freeing about 1.5 KB of the 3.2 KB left under the 20,000-byte limit for items 1 to 5. (V4)
7. Give fx-architecture an unattended rule (write the report, park the candidate, return) so a debug escalation inside `fx-implement` cannot stall on "Which would you like to explore?". (A1)
8. Bring the deletion test and the one-adapter rule into the per-task and branch reviewer structure checks, and stop the task reviewer using "units". (D3)
9. Reinstate the 400-word cap on the Standards and Spec briefs (or route them through findings files) and correct `fx-review/COVERAGE.md` rows 31, 41 and 42, which describe text fx no longer has. (C4, C3)
10. Apply the decided GLOSSARY rename across fx-architecture and `codebase-design.md`, and in the same edit move the misplaced multi-engine sentence and replace the "another engine over gRPC" example. (A4, A5, D4)
