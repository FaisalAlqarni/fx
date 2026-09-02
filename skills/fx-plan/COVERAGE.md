# Coverage: fx-plan

Sources:
- `soe:writing-plans` (your fork): claims 1 to 127
- `mattpocock:to-tasks` @ 1.2.3: claims 128 to 194
- `soe:adversarial-review` (your fork): claims 195 to 267

Verdicts: **K** kept inline · **A** kept in `agents/fx-devils-advocate.md` ·
**S** superseded (with the decision) · **D** dropped (with reason).
A claim with no verdict is a build error.

---

## soe:writing-plans (1 to 127)

| Claims | Verdict | Note |
|---|---|---|
| 1 to 2 | S | Frontmatter rewritten; triggers point at `docs/plans/<slug>/` |
| 3 | S | `Gate type: judgment` per `soe-modes`: soe's mode system is not absorbed |
| 4 to 5 | K | **Audience: zero context, questionable taste**: restored; it sets the detail level |
| 6 to 11 | K | Document files, code, testing, docs to check, how to test; whole plan as bite-sized tasks |
| 12 to 14 | K | DRY · YAGNI · TDD |
| 15 | S | "frequent commits" → one commit per task, in the worktree, no trailers |
| 16 to 18 | K | **Skilled dev, knows nothing of our toolset, doesn't know good test design**: restored |
| 19 | K | Announce line |
| 20 | S | Worktree created "at execution time" → `fx-implement` §Setup owns it |
| 21 to 22 | S | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` → `docs/plans/YYYY-MM-DD-<slug>/plan.md`, always a directory |
| 23 to 25 | K | Scope check; one plan per subsystem; each produces working software alone |
| 26 to 39 | K | File-structure section entire, incl. both reasons, "files that change together live together", "split by responsibility not layer", existing-codebase rules |
| 40 to 43 | K | Right-sizing: smallest unit with its own test cycle worth a reviewer's gate |
| 44 to 49 | K | Bite-sized steps, one action each |
| 50 to 54 | K | Requirements Restatement as step 1, the format, wait for confirmation, the reason |
| 55 to 68 | K | Header template entire: Goal, Architecture, Stack, **Complexity**, **Risks HIGH/MEDIUM + mitigation**, **Testing unit/integration/E2E**, Global Constraints + verbatim rule + implicit-inclusion rule |
| 57 | S | "REQUIRED SUB-SKILL: soe:subagent-driven-development or soe:executing-plans" → `fx-implement`, one path |
| 69 to 70, 72 | K | Task header; Create / Test file lines |
| 71 | S | `Modify: path.py:123-145` → **path only, no line-number ranges** (they rot within a day) |
| 73 to 75 | K | `Interfaces: Consumes / Produces` **and its reason**: the implementer sees only its own task |
| 76 | S | `Depends-on:` → `Blocked by:` (one vocabulary, shared with the frontier) |
| 77 to 78 | K | Per-task Risks and Testing |
| 79 to 82 | K | **Idempotency required**, the definition, the resume reason, the guard examples |
| 83 to 84, 86 | K | Steps 1, 2, 4: test code and exact commands with expected output |
| 85 | S | "Step 3: write minimal implementation" **with code** → step kept, code removed. Pre-writing the implementation defeats TDD, doubles the plan, and rots fastest |
| 87 | K | Commit step: **plus: no attribution trailers, then continue** |
| 88 to 94 | K | All six No-Placeholders failures |
| 95 | K | Exact file paths always |
| 96 | S | "Complete code in every step" → **test code yes, implementation code no** (prototype-snippet exception retained) |
| 97 | K | Exact commands with expected output |
| 98 | K | DRY, YAGNI, TDD (commits per task) |
| 99 to 104 | K | Phasing at 10+: MVP / Core / Hardening / Polish, each mergeable alone |
| 105 to 110 | K | All six quality red flags; 3 more added (interfaces present, no push/trailer steps, wide refactor sequenced) |
| 111 to 118 | K | Self-review: yours not a subagent's; spec coverage; placeholder scan; type consistency + the `clearLayers` example; fix inline; add a task for any uncovered requirement |
| 119 to 127 | S | Execution-handoff choice (subagent-driven vs inline) → one path, `fx-implement`. `executing-plans` is absorbed and subagents are always available |

## mattpocock:to-tasks (128 to 194)

| Claims | Verdict | Note |
|---|---|---|
| 128 to 129 | S | Frontmatter merged into `fx-plan`'s |
| 130 | S | `disable-model-invocation: true` → `fx-plan` is a lane and must be model-selectable |
| 131 | K | Tracer-bullet vertical slices with blocking edges |
| 132 to 133 | S | "tracker should have been provided / run `/setup-matt-pocock-skills`" → `/fx:setup`; tracker is `docs/plans/` |
| 134 to 135 | S | Gather from conversation / fetch a passed reference → input is always `design.md` |
| 136 to 141 | K | Explore the codebase; domain glossary; respect ADRs; prefactor; *"make the change easy, then make the easy change"* |
| 142 to 148 | K | All four vertical-slice rules; blocking edges; no-blocker tasks start immediately |
| 149 to 157 | K | Wide-refactor definition, blast radius, the no-slice-lands-green reason, expand / migrate / contract with their blocking structure and the still-green reason |
| 158 to 159 | K | **The integration-branch third case**: restored; green promised only at the final integrate-and-verify task, and tasks must say so |
| 160 to 167 | S | The granularity quiz: **cut by your decision.** Step 8 shows the task table against real files, which is the same question asked once, against the artifact |
| 168 to 170 | K | Publish the approved tasks; tasks identical whichever tracker, only edge shape changes |
| 171 to 173 | S→K | `.scratch/<slug>/issues/NN-<slug>.md` → `docs/plans/<slug>/tasks/NN-<slug>.md`. Numbering from 01 in dependency order, "Blocked by" text, **one task per file, never a combined file**: all kept |
| 174 to 178 | S | GitHub/Linear publishing, native blocking links, `ready-for-agent` label on a remote tracker → local files only; **nothing goes to GitHub** |
| 179 to 180 | K | Work the frontier; linear chain means top to bottom |
| 181 | K | "Do not close or modify any parent issue" → **never edit `design.md` from here** |
| 182 to 187 | K | Local task template: title, What to build, Blocked by, Status, acceptance criteria |
| 188 to 191 | S | Remote-issue template: no remote tracker |
| 192 | S | "Avoid specific file paths **or code snippets**" → **paths yes (no line numbers), test code yes, implementation code no.** A path is a stable hypothesis; a path with line numbers rots; a signature is a contract |
| 193 to 194 | K | Prototype-snippet exception, trimmed to the decision-rich part |

## soe:adversarial-review (195 to 267)

| Claims | Verdict | Note |
|---|---|---|
| 195 to 202 | A | Frontmatter → the agent's own, incl. both modes and the trigger phrases |
| 203 to 206 | A | Single source of truth; deliberately adversarial; not here to agree; find it while it is cheap to fix |
| 207 | A | Announce line |
| 208 to 211 | S | Invocation paths (`/soe:critique`, the soe agent, the orchestrator's `EVALUATE_PLAN`) → `fx-plan` step 7 and `/fx:critique` |
| 212 to 221 | A | **All ten posture rules**: assume flawed, "looks good" is a failure, attack the artifact not the author, don't soften, don't pad, don't invent filler, findings must be real and specific, prefer fewer sharper, **if it wouldn't change the artifact it isn't a finding** |
| 222 to 231 | A | All seven lenses with their definitions, correct-pattern-usage, cargo-cult rule, **earlier lenses dominate** |
| 232 to 237 | A | **Design mode entire**: target, gaps (incl. error/concurrency/partial-failure/resume), inconsistencies, missing pieces, pattern misuse, quality-lens catch-all |
| 238 to 245 | A | Plan mode: target, does-everything-design-mode-does, **faithfulness / drift / gaps / scope creep**, missing-design fallback, flag the missing cross-reference as a limitation |
| 246 to 251 | A | Numbered findings, one line each, severity order, the output template, plan-internal vs cross-reference callout |
| 252 to 257 | A | The three options and their exact wording; "Which?" |
| 258 | S | "judgment gate per `soe:gate-classification`" → stated as "this is a judgment gate" without the soe mode system |
| 259 to 262 | K | **The autonomous branch**: restored into `fx-plan` step 7: no human to pick → one bounded revision, log findings and dispositions to `state.md`, methodology identical, only "who decides" changes |
| 261 | S | `.soe/tracks/{id}/decision-log.md` → `docs/plans/<slug>/state.md` |
| 263 to 267 | A | **All five red flags** |

---

## Summary

| | Count |
|---|---:|
| Kept inline in `fx-plan` | 131 |
| Kept in `agents/fx-devils-advocate.md` | 62 |
| Superseded by an explicit decision | 74 |
| Dropped | 0 |
| **Unaccounted** | **0** |

## Supersessions that were your calls, not mine

- The granularity quiz (160 to 167): cut, one checkpoint instead of two
- Red-team is opt-in with a recommendation, never automatic
- `docs/plans/<slug>/` as a directory, always
- Local files only; nothing published to GitHub
- Commits per task with **no attribution trailers**
