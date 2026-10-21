### Spec Compliance

- ❌ Issues found: G4 half-landed (SKILL gives the controller no instruction for a non-zero compile-brief exit), and the G3 task filter drops rulings that do name the task (list form). All seven items are otherwise present with a gate or test row.
- ⚠️ Cannot verify from diff: the brief I was given has no `## Rulings` section, so I checked ruling behaviour by running `rulingsFor` directly in a scratch dir (below).

Item by item:
- G1 ✅ slot `[COST_LINE]` + fixed sentence (task-reviewer-prompt.md), placeholder list, SKILL §3 (SKILL.md ~552), fill-template.js KEYS, score.test.js, bench row; pinned by its own sentence at tests/gates/ledger-lines.test.js:+633.
- G2 ✅ parked bullet and "count is the number of those lines" in SKILL.md; both pinned (ledger-lines.test.js:+637, +639).
- Lettered ✅ for plain `Ruling A:` (plan-state.js:68, test row at plan-state.test.js:+159). Bold form fails, see I2.
- G3 ❌ partial, see I2. Callers: grep over the whole repo (excluding .git, docs/plans, .fx) finds one production caller, skills/fx-implement/scripts/compile-brief:67, updated. Other hits are plan-state.test.js (old 2-arg call, valid as "no filter"), the ADR, and `standingRulings` (separate function, unchanged signature). Caller complete.
- G4 ❌ partial, see I1. Script and test done (compile-brief:75, :87; test rows for Design and Stack). fx-plan self-review step 4 added.
- G5 ✅ same sentence in fx-review and fx-implement, old "dispatch fx-lens-security and fx-devils-advocate" rule removed, gate pins the sentence and the removal (branch-pass.test.js:+576, +577).
- G6 ✅ three dashes replaced; no dash in any added line (grepped the diff).

### Strengths

- RED evidence is real and per item: 4 failing plan-state rows, an AssertionError in compile-brief and in the ledger-lines and branch-pass gates, each from a missing behaviour.
- `compile-brief` dies with the entry name on both Design and Stack branches; the test asserts non-zero status and the name in stderr (compile-brief.test.js:+430).
- Gate pins a verbatim cap sentence in both lanes, so the two cannot drift.
- brief-size fixture copies the repo fixture into a tmpdir rather than mutating it, and asserts exactly 4 rulings reach the brief.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

I1. skills/fx-implement/SKILL.md:~444 (step 1 "Compile one brief") and ~561 (reviewer recompile) · compile-brief now exits 2 on an unresolved `**Design:**` or `**Stack:**` entry, but neither place says what the controller does then. Grep of the SKILL for exit/non-zero/fails finds nothing about it. A controller that ignores the status dispatches with no brief file or a stale one from the last task, which is the failure G4 exists to stop. Fix: add one sentence after the command: on a non-zero exit, do not dispatch; read stderr, fix the heading in the task file (or design.md) or return to fx-plan, recompile. Pin it in a gate.

I2. lib/plan-state.js:107-112 (`TASK_REF`, `namesOtherTasksOnly`) and :93 (`ENTRY_RE`) · two defects, both reproduced by running `rulingsFor` on a scratch rulings.md:
- A list form captures only the first number. `Ruling: tasks 03 and 05 keep UTC.` and `Ruling: tasks 03, 04, 05 share it.` are dropped for task 05 though they name it (result `[]` for 05). The spec covers `task NN`, `task: NN`, `tasks NN to MM`, but a ruling naming this task being dropped is the costly direction of error (the ADR's own reason for "no filter" was this). Fix: collect every number following `tasks?` through a `(\d+)(?:\s*(?:,|and|to|-)\s*(\d+))*` run, or treat any ruling with a comma/and list as naming all its numbers; add a row.
- `ENTRY_RE` knows `**Ruling:` but not `**Ruling A:`, so a bold lettered ruling after another ruling is joined onto it as a wrapped line (`'Ruling: tasks 03, 04, 05 share it. **Ruling A:** bold lettered.'`) and then filtered by the first ruling's task refs, losing it. Fix: `\*\*Ruling( [A-Z])?:` in ENTRY_RE.

#### Minor (Nice to Have)

M1. tests/gates/brief-size.test.js:+596-611 · the fixture brief is 4,102 B filtered and about 8 KB unfiltered (report's own numbers), so the 12,000 B ceiling still does not bite even without the filter; the new count assertion is what bites. Raise rulings or pad the task so unfiltered exceeds 12,000 B, or say the count row is the gate.

M2. skills/fx-implement/SKILL.md:~552 · says pass `[COST_LINE]` "in every case" but never says to pass `unavailable` when build-cost prints nothing; only the template placeholder list does. The `unavailable` fallback is a sound choice (the sentence triggers only on the literal `fx-tdd 0/<i>`), but the controller reads the SKILL, so add three words there.

M3. skills/fx-plan/SKILL.md:+511 · new self-review step 4 has no gate row; a later edit can drop it unseen.

M4. tests/gates/ledger-lines.test.js:+635 · `s3.includes('[COST_LINE]')` would also pass on a mention in prose rather than in the dispatch; low risk.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** Five of seven items are solid and well tested, but the filter can silently remove a ruling that names the task being reviewed (list form, bold lettered), and the SKILL leaves the controller with no instruction for the new compile-brief failure, so G3 and G4 are not fully closed.

## Ledger lines

Task 09: minor (deferred): brief-size fixture is about 8 KB even unfiltered, so the 12,000 B ceiling still does not bite; the ruling-count row is the real gate.
Task 09: minor (deferred): SKILL step 3 says pass COST_LINE in every case but not to pass `unavailable` when build-cost prints no line.
Task 09: minor (deferred): fx-plan self-review step 4 (Design headings resolve) has no gate row.
Task 09: minor (deferred): ledger-lines gate for `[COST_LINE]` in section 3 matches any mention, not the dispatch itself.
