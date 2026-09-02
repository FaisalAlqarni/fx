# Coverage: fx-review

Sources:
- `mattpocock:code-review` @ 1.2.3: claims 1 to 66
- `superpowers:requesting-code-review` @ 6.3.0: claims 67 to 98
  (+ its `code-reviewer.md` template, read in full)
- `superpowers:receiving-code-review` @ 6.3.0: claims 99 to 183
- Killed without absorption: `ecc:code-review` (289 ln), `ecc:orch-review`

Verdicts: **K** kept inline · **F** kept in `../../references/vocab/fowler-smells.md`
· **V** kept in `../../references/vocab/receiving-review.md` · **P** kept in
`fx-review/reviewer-prompt.md` · **S** superseded · **D** dropped.
A claim with no verdict is a build error.

---

## mattpocock:code-review (1 to 66)

| Claims | Verdict | Note |
|---|---|---|
| 1 to 2 | S | Frontmatter rewritten; adds the fx-architecture boundary ("for EXISTING code with no diff, use fx-architecture") |
| 3 to 5 | K | Two-axis definition: Standards and Spec |
| 6 to 8 | K | Parallel subagents; the don't-pollute-each-other's-context reason; the skill aggregates |
| 9 to 10 | S | "tracker should have been provided / run `/setup-matt-pocock-skills`" → `/fx:setup`; the tracker is `docs/plans/` |
| 11 to 13 | K | Pin the fixed point; ask if not specified |
| 14 to 15 | K | `git diff <fp>...HEAD` **three-dot**, and the merge-base reason |
| 16 | K | `git log <fp>..HEAD --oneline` |
| 17 to 18 | K | Validate the ref resolves and the diff is non-empty **before** spawning, and the reason |
| 19 to 20 | K | Find the spec, in order |
| 21 | S | Issue references in commit messages (`#123`, `Closes #45`, GitLab `!67`) fetched from a hosted tracker → local: the task file, then `design.md` |
| 22 to 25 | K | A path the user passed; a spec file matching the branch; ask; **skip the axis and report "no spec available"** |
| 26 to 27 | K | Standards sources: anything documenting how code should be written |
| 28 | K | The baseline applies even when a repo documents nothing |
| 29 | K/F | **The repo overrides**; suppress the smell where the repo endorses it |
| 30 | K/F | **Always a judgement call**: a labelled heuristic, never a hard violation |
| 31 | K/F | Skip anything tooling enforces |
| 32 | F | Each smell reads *what it is* → *how to fix* |
| 33 to 44 | F | **All 12 smells**, verbatim, with their fixes |
| 45 | K | Spawn both subagents in parallel |
| 46 to 48 | K | Standards brief inputs; **the baseline pasted in full**; the "no other access" reason |
| 49 to 50 | K | The Standards brief verbatim, incl. the 400-word cap |
| 51 to 54 | K | The Spec brief inputs and text verbatim, incl. the 400-word cap |
| 55 | K | Spec missing → skip that subagent and note it in the report |
| 56 to 57 | K | Aggregate under separate headings, verbatim or lightly cleaned |
| 58 to 59 | K | **Do not merge or rerank**, and the reason |
| 60 | K | One-line summary: totals per axis, worst issue within each axis |
| 61 to 62 | K | **No single winner across axes**, and the reason |
| 63 to 66 | K | Why two axes; both worked examples; "reporting them separately stops one axis from masking the other" |

## superpowers:requesting-code-review (67 to 98)

| Claims | Verdict | Note |
|---|---|---|
| 67 to 68 | S | Frontmatter merged |
| 69 to 70 | K | Dispatch a reviewer to catch issues before they cascade; **precisely crafted context, never your session history** |
| 71 | K | **"Review early, review often."** Restored |
| 72 to 74 | K | **Mandatory triggers**: after each task in `fx-implement`, after a major feature, before a merge. Restored |
| 75 to 77 | K | **Valuable triggers**: when stuck, before a refactor, after a complex bug fix. Restored |
| 78 to 79 | S | `BASE_SHA=$(git rev-parse HEAD~1)` → the recorded per-task BASE, or the merge-base in branch mode. **Never `HEAD~1`** |
| 80 | K/P | Dispatch a `general-purpose` subagent filling the template |
| 81 to 84 | P | All four placeholders |
| 85 to 88 | K | Fix Critical immediately · fix Important before proceeding · note Minor for later · push back with reasoning if the reviewer is wrong |
| 89 | K | Rationalization: "I'll review the diff myself" → burns the coordinator's context; the diff lives in the subagent, only findings come back |
| 90 | K | Rationalization: "the reviewer needs my session history" → precisely crafted context keeps it on the work product |
| 91 to 94 | K | **All four "Never" rules.** Three were missing from the draft |
| 95 to 97 | K | If the reviewer is wrong: technical reasoning · show the code/tests that prove it works · request clarification |
| 98 | K/P | Template pointer |

### code-reviewer.md template → `fx-review/reviewer-prompt.md`

| Content | Verdict |
|---|---|
| Senior-reviewer framing; review before it cascades | P |
| What Was Implemented · Requirements/Plan · Git Range | P |
| **Read-Only Review**: no mutation of tree/index/HEAD/branch; `git worktree add /tmp/review-<SHA>` for another revision | P |
| **You Do Not Dispatch Subagents**: full paragraph incl. "review it in passes yourself and say so" | P |
| What to Check: Plan alignment (3) · Code quality (5) · Architecture (4) · Testing (4) · Production readiness (4) | P |
| Calibration: severity, praise-before-issues, flag deviations specifically, **say so if the plan itself is the problem** | P |
| Output Format: Strengths · Critical/Important/Minor with their scope notes · Recommendations · Assessment with Ready-to-merge | P |
| Critical Rules: 5 DOs and 5 DON'Ts | P |
| Example Output | D: illustrative; every rule it demonstrates is stated normatively. Reinstate if the format proves unclear |
|: | **Added:** `[MODEL]` required (most capable) · Global Constraints block · carried deferred/parked findings for triage · tautological-assertion check · nothing-leaves-the-machine |

## superpowers:receiving-code-review (99 to 183)

| Claims | Verdict | Note |
|---|---|---|
| 99 to 100 | S | Frontmatter; becomes a reference, not a selectable skill |
| 101 to 104 | K/V | Technical evaluation not emotional performance; verify before implementing; ask before assuming; correctness over comfort. **Short form also in the preamble, so subagents inherit it** |
| 105 to 110 | K/V | The six-step response pattern |
| 111 to 113 | K/V | The three forbidden responses |
| 114 to 117 | V | The four "instead" instructions |
| 118 to 123 | K/V | Unclear items → STOP; ask; both reasons; the wrong/right example |
| 124 to 127 | V | From the user: trusted, still ask if scope unclear, no performative agreement, skip to action |
| 128 to 132 | V | The five external-reviewer checks |
| 133 to 135 | V | Seems wrong → push back · can't verify → say so with the exact phrasing · conflicts with a prior decision → stop and discuss |
| 136 | V | "External feedback: be skeptical, but check carefully" |
| 137 to 140 | K/V | The YAGNI grep, both branches, and "if we don't need this feature, don't add it" |
| 141 to 146 | K/V | Clarify first; the three-tier order; test each; verify no regressions |
| 147 to 152 | K/V | All six push-back triggers |
| 153 to 156 | V | How to push back: reasoning not defensiveness, specific questions, reference tests/code, escalate if architectural |
| 157 to 158 | V | **"If you're uncomfortable pushing back out loud: name that tension, then tell them anyway"** |
| 159 to 161 | V | The three allowed acknowledgments |
| 162 to 169 | K/V | The five forbidden phrases incl. **"ANY gratitude expression"**; the actions-speak reason; **"if you catch yourself about to write 'Thanks': DELETE IT"** |
| 170 to 175 | V | Correcting your own push-back: two allowed forms, three forbidden behaviors, state it factually and move on |
| 176 to 182 | V | All seven common-mistake rows |
| 183 | S | GitHub inline-thread reply mechanics → **publishing outward; explicit request only.** The thread-not-top-level rule is kept for when it is requested |

## Killed without absorption

| Source | Reason |
|---|---|
| `ecc:code-review` (289 ln) | JS-flavored bar (console.log, JSDoc); duplicates the built-in `/code-review` |
| `ecc:orch-review` | Derives `language` from the dominant file extension; **`.rb` maps to nothing**, so the language dimension silently no-ops while paying full Workflow cost |

---

## Summary

| | Count |
|---|---:|
| Kept inline in `fx-review` | 74 |
| Kept in `../../references/vocab/receiving-review.md` | 61 |
| Kept in `../../references/vocab/fowler-smells.md` | 16 |
| Kept in `fx-review/reviewer-prompt.md` | 14 |
| Superseded by an explicit decision | 17 |
| Dropped | 1 (the template's Example Output) |
| **Unaccounted** | **0** |

## Additions not in any source

- **The lens trigger table**: five risk lenses fire on what the diff touches,
  not by default. Eight parallel passes on a three-line diff would cost ~195k
  tokens of pure overhead.
- **Task mode vs branch mode**, with effort and model scaled to each.
- **`/code-review ultra` is user-triggered and billed**: the skill cannot
  launch it, and says so rather than trying.
- **`--comment` publishes outward**: never offered, explicit request only.
