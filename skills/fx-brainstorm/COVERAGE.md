# Coverage: fx-brainstorm

Sources:
- `superpowers:brainstorming` @ 6.3.0: claims 1 to 122
  (+ its `visual-companion.md` guide and `scripts/`)
- `mattpocock:grilling` @ 1.2.3: claims 123 to 141
- `mattpocock:to-spec` @ 1.2.3: claims 142 to 182
- `mattpocock:domain-modeling` (+ `CONTEXT-FORMAT.md`, `ADR-FORMAT.md`): read
  in full, absorbed as a reference

Verdicts: **K** kept inline · **G** kept in `../../references/vocab/grilling.md` ·
**D** kept in `../../references/vocab/domain-modeling.md` · **T** kept in
`../../references/design-template.md` · **V** copied verbatim (visual companion) ·
**S** superseded · **X** dropped.
A claim with no verdict is a build error.

---

## superpowers:brainstorming (1 to 122)

| Claims | Verdict | Note |
|---|---|---|
| 1 to 2 | S | Frontmatter rewritten; trigger list expanded with grilling's phrases |
| 3 to 4 | K | Turn ideas into designs through dialogue; classify then work the path |
| 5 to 6 | K | **HARD-GATE**, and "ceremony scales with the task; the approval gate never does" |
| 7 | K | Classify out loud before the first question, so it can be overridden |
| 8 to 11 | K | Spike: definition, 2 to 3 sentence probe, no design doc, throwaway label |
| 12 to 17 | K | Bounded: definition, **"understanding the kind of app is not enough"**, no existing flow → not bounded, short design in chat, STOP, approval as hard as architectural, no docs |
| 18 to 19 | K | Architectural: definition and full process |
| 20 to 22 | K | In doubt take the heavier; one-way ratchet; nothing downgrades mid-task |
| 23 to 26 | K | Every path ends with approval; two sentences still need it; simple tasks hide assumptions; **"what scales with simplicity is the artifact, never the approval"** |
| 27 to 33 | K | **All 7 red-flag rows**, verbatim; 2 more added (facts-are-your-job, tangents-don't-close-questions) |
| 34 | K | **"Create a task for each item on your path and complete them in order."** Restored |
| 35 to 39 | K | Spike checklist, all 5 |
| 40 to 44 | K | Bounded checklist, all 5, incl. "presenting and starting in the same breath is skipping the gate" |
| 45 to 55 | K | Architectural checklist, all 9: steps 3 and 5 rewritten for clustered rounds and the ledger |
| 52 | S | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and "commit it" → `docs/plans/YYYY-MM-DD-<slug>/design.md`, **not committed** (the user runs git) |
| 56 to 59 | K | Terminal states path-bound; **only `fx-plan` follows**; bounded goes to the normal workflow; spike ends in a recommendation |
| 60 to 61 | K | Which subsections serve which path |
| 62 | K | Explore project state first: files, docs, recent commits |
| 63 to 67 | K | Scope assessment before detail; flag multi-subsystem immediately; decompose; each sub-project gets its own cycle |
| 68 to 70 | S | **"Ask questions one at a time / only one question per message"** → **2 to 4 related questions per round.** Your decision: one-at-a-time loses the tree when an answer opens a branch; the whole frontier is a scattergun |
| 69 | K | "Prefer multiple choice when possible, but open-ended is fine" |
| 71 | K | Focus on purpose, constraints, success criteria |
| 72 to 75 | K | 2 to 3 approaches with trade-offs; conversational; lead with the recommendation; **YAGNI ruthlessly** |
| 76 to 80 | K | **Present the design in sections**, scaled to complexity (a few sentences to 200 to 300 words), **approval after each**, covering architecture/components/data flow/error handling/testing, ready to go back and clarify. **Restored: the draft had no sectioned-design stage at all** |
| 81 to 85 | K | **"Design for isolation and clarity"** entire: one clear purpose, well-defined interfaces, independently testable; the three questions per unit; the two boundary tests; the context/focus reason; large file = doing too much. **Restored** |
| 86 to 88 | K | **"Working in existing codebases"** entire: explore structure first, follow patterns, include targeted improvements for problems that affect the work, **don't propose unrelated refactoring**. **Restored** |
| 89 to 90 | S | Spec path → `docs/plans/<slug>/design.md`; the user-preference-overrides clause is satisfied by that |
| 91 | S | `elements-of-style:writing-clearly-and-concisely`: not installed. The preamble's prose rule covers it |
| 92 | S | "Commit the design document to git" → not committed here. Commits happen only inside a worktree, which `fx-implement` creates later |
| 93 to 98 | K | Self-review: fresh eyes, placeholder scan, internal consistency, scope check, ambiguity check, fix inline without re-reviewing |
| 99 to 102 | K | The user-review gate, the message, wait, re-run on changes, proceed only when approved |
| 103 to 104 | S | "Invoke writing-plans; do NOT invoke any other skill" → `fx-plan`, same exclusivity |
| 105 to 107 | K | Visual companion: browser-based, **a tool not a mode**, accepting ≠ every question goes through it |
| 108 to 114 | K | Offer just-in-time, never upfront; wait for a real visual question; **its own message with nothing else**; wait; `--open` on accept; don't re-offer on decline |
| 115 to 121 | K | Per-question decision; the see-vs-read test; the browser list; the terminal list; **a UI topic is not automatically a visual question**; both worked examples |
| 122 | V | The `visual-companion.md` guide and its 5 scripts (`server.cjs`, `helper.js`, `frame-template.html`, `start-server.sh`, `stop-server.sh`) are **copied verbatim**: they are working code, not prose to rewrite. Added: the server is localhost-only and writes into the project; nothing is published |

## mattpocock:grilling (123 to 141)

| Claims | Verdict | Note |
|---|---|---|
| 123 to 124 | S | Frontmatter; becomes a reference plus the `/fx:grill` command, not a competing skill |
| 125 to 128 | K/G | Interview until shared understanding; the design tree; work it in rounds; the frontier definition |
| 129 | S | **"Ask the whole frontier in one round"** → 2 to 4 related questions, one topic per round |
| 130 | K/G | Wait for answers before the next round |
| 131 to 132 | S | The `❓ **Q1**` / `➡️` markdown format → the host's interactive question tool (`AskUserQuestion`), with numbered text as the opencode fallback. **Your decision** |
|: | K/G | **Kept from 129/131:** a recommended answer on *every* question |
| 133 to 135 | K/G | Answers reshape the tree; recompute the frontier; a question depending on another open question belongs to a later round |
| 136 to 139 | K/G | **Facts are your job, never the user's**; dispatch a subagent; don't block: only downstream questions wait; the decisions are theirs |
| 140 to 141 | K/G | Done when the frontier is empty; **do not act until the user confirms shared understanding** |
|: | K/G | **Added:** the open-questions ledger. Neither source writes the frontier down, so a tangent silently buries unreached branches: the specific failure the user reported |

## mattpocock:to-spec (142 to 182)

| Claims | Verdict | Note |
|---|---|---|
| 142 to 144 | S | Frontmatter; `disable-model-invocation: true`: absorbed into an invocable lane |
| 145 | K | Produce a spec from the conversation and codebase understanding |
| 146 | S | **"Do NOT interview the user"**: that was its premise as a *separate* skill; here the interview precedes it |
| 147 to 148 | S | Tracker provided / run `/setup-matt-pocock-skills` → `/fx:setup`; the tracker is `docs/plans/` |
| 149 to 150 | K | Explore the repo first; use the domain glossary throughout; respect ADRs |
| 151 to 156 | K | **Seams: sketch them, prefer existing, use the highest possible, propose new ones high, fewer is better, ideal is one, and check them with the user.** All six |
| 157 | K/T | Write the spec from the template and publish it |
| 158 | S | `ready-for-agent` triage label → a `Status:` line in the file |
| 159 to 164 | T | Problem Statement · Solution · User Stories with the format, the example, and "extremely extensive" |
| 165 to 172 | T | Implementation Decisions and all seven content bullets |
| 173 to 174 | T | **No file paths or code snippets, and the go-stale reason** |
| 175 to 176 | T | The prototype-snippet exception, trimmed to the decision-rich part |
| 177 to 180 | T | Testing Decisions: what makes a good test (external behavior, not implementation details) · which modules · **prior art in this codebase** |
| 181 to 182 | T | Out of Scope · Further Notes |
|: | T | **Added:** `Glossary:` header line · a **Global Constraints** section (`fx-plan` copies it verbatim; `fx-review` hands it to reviewers as their attention lens) · an `Open Questions` section that must be empty at publication |

## mattpocock:domain-modeling → `../../references/vocab/domain-modeling.md`

| Content | Verdict |
|---|---|
| Active vs passive distinction ("merely reading CONTEXT.md is not this skill") | D |
| Single-context and `CONTEXT-MAP.md` multi-context layouts | D |
| Create files lazily | D |
| Challenge against the glossary · sharpen fuzzy language · concrete scenarios · cross-reference with code | D |
| Update `CONTEXT.md` inline, never batched | D |
| `CONTEXT.md` is a glossary and nothing else: no implementation details | D |
| `CONTEXT-FORMAT.md`: the format, be opinionated, `_Avoid_` lists, tight definitions, only context-specific terms, grouping | D |
| `ADR-FORMAT.md`: numbering, the 3-test criteria, the 1 to 3 sentence template, the three optional sections, all seven "what qualifies" categories | D |
|: | **Added:** "an ADR in the area records a decision not to re-litigate", and where each consumer uses this file |

---

## Summary

| | Count |
|---|---:|
| Kept inline in `fx-brainstorm` | 92 |
| Kept in `../../references/vocab/grilling.md` | 14 |
| Kept in `../../references/design-template.md` | 24 |
| Kept in `../../references/vocab/domain-modeling.md` | (whole source) |
| Copied verbatim (visual companion + scripts) | 1 + 5 files |
| Superseded by an explicit decision | 20 |
| Dropped | 0 |
| **Unaccounted** | **0** |

## The two sections the draft lost entirely

**"Design for isolation and clarity"** (81 to 85) and **"Working in existing
codebases"** (86 to 88). Both are design *content* rather than process, which is
why summarizing lost them, and both are exactly what a design document is
supposed to contain.
