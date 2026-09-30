# Coverage audit: lean-review design vs tasks vs branch

Inputs: design.md, tasks 01 to 11, state.md, `git log main..HEAD` (9a313f6). Read-only audit.
Verdict: **gaps**. No Critical. Six gaps, all Low or Medium, none blocks the build. Every design section has a task owner; every task criterion I checked has code or text behind it on the branch.

## Gaps

### G1 (Medium). Silent-failure tripwire: "broad triggers run at the end only" has no dispatch half
- What: design §1 says the silent-failure lens's broad triggers (`.presence ||`, `||=`, `??`, `find_by`, unchecked `save`, dropped `valid?`, HTTP clients) run at the branch pass only. Task 01 owns the table half: the per-task cell carries the tripwire text, and `fx-implement` dispatches the lens on a match.
- Missing half: once dispatched on a tripwire, the lens reviews the whole diff. `agents/fx-lens-silent-failure.md` and `fx-lens-database.md` have no task-mode scoping. Task 08's `mode: branch` line gates only the two security items, and a brief with no mode is "task mode" with no narrowing.
- Effect: per-task silent-failure findings on broad patterns can enter the fix loop. This is the fix-round cost the design set out to cut (fix rounds are 13.3% of minutes).
- Fix: one sentence in fx-review's lens brief (SKILL.md:186 area): "in task mode, report only the tripwire class" for silent-failure and database; one assertion in `tests/gates/tripwire-table.test.js` or `lens-content.test.js`. Owner: task 01 (table) or 08 (brief).

### G2 (Low). Controller re-review condition 3 loosened
- Design §3: the finding "came from the task reviewer, not a tripwire lens".
- `fix-loop.md:98` and ADR-0030: "none from a tripwire lens". Findings from devil's advocate, the branch reviewer or a broad lens pass that test.
- Effect is small: the final wave is its own section and says "exactly one scoped re-review", so the path is unlikely. The wording still allows the controller to skip a dispatched re-review on a branch-pass finding.
- Fix: reword to "every open finding came from the task reviewer"; update `fix-loop-shape.test.js` if it pins the old text. Owner: task 02.

### G3 (Low). ADR-0031 claim with no code behind it
- ADR-0031 "Standing rulings": `standingRulings()` "reads both places at every session start". `lib/plan-state.js` reads `docs/plans/rulings.md` only inside the unfinished-plan block, so with no unfinished plan nothing is injected.
- state.md defers this as a minor twice (task 04, two lines) and never resolves it. Design §5b itself says the block covers "a plan with a ledger", so the code matches the design and the ADR text is the overclaim.
- Related: `plugins/fx.js:194-200` computes the preamble once at plugin construction, so on OpenCode a ruling written mid-session reaches the block only at the next session. The "after compaction" re-injection is a Claude Code SessionStart (`compact` matcher) behaviour; neither the ADR nor the README says so.
- Fix: amend ADR-0031 to "while an unfinished plan exists" and "Claude Code re-reads on compaction; OpenCode reads at startup". Owner: task 04.

### G4 (Low). Design text is stale against three delivered narrowings, and only one is ledgered
- (a) Design §5a: rewrite "with `permissionDecision: "allow"`". Delivered: omitted, recorded in ADR-0031 "Probe result". No ledger Ruling line.
- (b) Design §5a: no model and "a subagent_type whose definition pins none" becomes sonnet. Delivered: three general types only; Explore, other plugins' agents and forks keep inheriting. Recorded in ADR-0031 and task 03, but no ledger Ruling, and the design's stated leak ("a subagent with no model otherwise inherits the parent's") stays open for those types.
- (c) Design §5b: "at most 15 lines". Delivered: 10 rulings, 160 characters each, plus a "...and N more" line (task 04 criterion, ADR-0031). No ledger Ruling.
- Also unledgered: explicit `model: fable` or a full model id bypasses the Opus rule (`route()` tests `=== 'opus'` only). This is listed as a task 03 minor, but ADR-0031 does not say so.
- Fix: one ledger Ruling line per item, or amend design.md to match. Owner: tasks 03, 04.

### G5 (Low). Criteria that are refusals or escapes only
- Task 10 criteria 2 to 4 all accept "pending": the live matrix passing on either version is never required. Ledgered, since the server was down (task 10 non-blocking). Nothing in the tasks says what a passing live run must show, so a later rerun has no bar. Design §11 also says OpenCode "measured on both", which this branch does not deliver at the live level.
- Task 08 criterion 2 states only when the branch-only items are withheld. The positive path (fx-review emits `mode: branch` and the lens then reports them) is carried by criterion 3 and SKILL.md:186, which is enough. No gap.
- Task 03: the positive path (rewrite output JSON) is tested. No gap.

### G6 (Low). Design §11 build-measurement targets have no owner
- "Non-tripwire tasks run exactly two agents", "no subagent on Opus without a `Capable because:` line", "no ruling repeated" are measured on the next real build, after this one. No task or ledger line reminds the owner, and `measure/fx-cost.py` is not checked for whether it can test those targets (for example a per-task agent count, or an Opus without-reason count).
- README already says the defaults are unmeasured. Suggest one "Needs you" line in the completion report. Not a blocker.

## Reverse: what tasks assume that no design section states
All have an ADR or task record, none has a design section.
- Fork exemption (no `subagent_type` left alone); the `Task` tool name is routed too (design says "Agent").
- Merge-base worktree procedure; "failing on the merge base another way counts as introduced"; "introduced blocks completion"; binary files count as over the cap (tasks 02 and ADR-0030).
- Per-task `test_all` is ledgered, not rejected (already ruled).
- Standing-rulings caps (10 and 160) and the "rulings.md also read when the ledger lacks it" rule.
- Completion report "Rulings I made" lists only `Ruling:` lines outside `## Standing rulings` (task 04).
- `.fx.json` unreadable produces a visible warning in the companions slot, with up to 80 characters of the error (design says only "default, never a crash"). The lens flagged that message as a minor (it can quote file content).
- Spike path exempt from the confidence check (task 06; design §7 lists only bounded and architectural, so this matches).
Suggest folding these into design.md in one edit, or leaving them in the ADRs; either is fine.

## Checked and landed
- Lens table column and text for all five lenses; `fx-implement` Lens dispatch points at it and drops a11y; devil's advocate "never per task" is in fx-review SKILL.md:108 (criteria do not require it, the text and ADR-0029 have it).
- Branch mode: `mode: branch` line, most-capable tier with `Capable because: final branch review`, serial-fixer split, one re-review.
- Routing: hook branch for `Agent` and `Task`, fail-open, tests, live probe ids in ADR-0031 and the commit message.
- Standing rulings: `rulings.md` copy and ask in SKILL.md:296-300, `describePlans` block, re-invoke instruction, budget fixture.
- Companions line in `lib/preamble.js` with override and `""`.
- README: cost table, method, caveats, sources cited, unmeasured sentence.
- ADRs 0029 to 0034 each have an owning task.
