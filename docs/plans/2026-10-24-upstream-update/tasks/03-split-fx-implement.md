# 03: Split fx-implement under the gate

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** 1: Room and fixes

**What to build:** a controller that compacts mid-build keeps its fix-loop cap, final review and exit gate. Today `skills/fx-implement/SKILL.md` is 49,175 bytes and the 20,000-character re-attach cut lands inside "Controller reading rules". Move whole paragraphs, byte for byte, into `skills/fx-implement/references/`, and replace each moved run with one pointer line that says when to read the file and to read it every time. The dispatch loop, the four stop conditions and the ledger rules (all of section 4, "The ledger", including the resume bullets and standing rulings) stay inline, as the design says. In the same change: delete the four worktree rationalization rows that repeat `worktree-setup.md` (`compare-3` F27), and remove the baseline-run wording in `references/vocab/worktree-setup.md` that contradicts ADR 0030 (F26).

**Measured result:** the move set below was built in a scratch copy and measured with `wc -c`: SKILL.md is **17,836 bytes** (373 lines), with pointer lines of the form `**<trigger>**: read [x.md](./references/x.md), every time.` The cap for this task is 17,900 bytes. Later inline additions are budgeted against it: task 12 about 350 bytes, task 17 about 450 bytes (its status and park text live in a reference behind one pointer).

**Design:** Phase 1: Skill splits; Phase 1: Fixes

**Files:**
- Modify: `skills/fx-implement/SKILL.md`
- Create, each holding the moved paragraphs in their original order (line ranges measured at dd99986; confirm each by its opening words before moving):

| New file | Moved from SKILL.md | Opening words |
|---|---|---|
| `references/why-this-lane.md` | 22 to 40 | "**If the task files look complete enough to just execute, read this.**" through "never a reason to skip the lane." |
| `references/setup.md` | 41 to 44, then 189 to 272 | "**Legacy plans:**"; then "### 1. Workspace" through the end of "### 3. Two workspaces, split by lifetime" |
| `references/rulings.md` | 72 to 105 | "**Name the checkpoint that would catch it.**" through "Why: checks applied only to other agents' work leave your own claims unverified." |
| `references/waiting.md` | 116 to 178, then 374 to 380 | "### Waiting on a child is not one of them" and "### A long command is not a child..."; then "**Waiting on dispatched subagents.**" |
| `references/preflight.md` | 327 to 347 | the body of "### 6. Pre-flight conflict scan" (the heading stays) |
| `references/batching.md` | 362 to 368 | "**Batch same-shape work.**" |
| `references/reading-rules.md` | 410 to 424 | the bullets "**A reply longer than five lines**", "**A reply with no report or findings file at the named path**", "**Check the ledger copy against the reply's own counts.**" |
| `references/handling-reports.md` | 489 to 527 | "**DONE_WITH_CONCERNS**" through "**If the implementer asks questions**" |
| `references/cost.md` | 546 to 555, then 677 to 687 | "**Measure the task before you dispatch the task reviewer.**"; then "(Write the line without the backticks.) It reads the transcript path" |
| `references/lens-dispatch.md` | 564 to 594 | "**Lens dispatch.**" through "**Route the lens's own findings by the severity...**" |
| `references/review-inputs.md` | 599 to 635 | "**Verify a constraint before you copy it.**" through "**⚠️ Cannot-verify-from-diff items.**" |
| `references/coverage-audit.md` | 714 to 749 | the body of "## Before the final review: one coverage audit" |
| `references/final-review.md` | 752 to 784 | the body of "## Final review" (everything before the exit gate) |
| `references/exit-gate.md` | 787 to 853 | the body of "## Exit gate: the Iron Law" with "### Run what the repository's own gate runs" and "### Classify every failing test" |
| `references/completion.md` | 854 to 925 | "## Write the plan-complete line", "## Completion report", "### Then ask, and stop" and the cleanup paragraph (everything after the exit gate) |
| `references/rationalizations.md` | 928 to 948 | the "Common rationalizations" table, minus the four F27 rows |

- Stays inline, unchanged: frontmatter; the intro except the moved block, including "**Narration:**"; "Rulings, not stalls" up to and including "If nothing would catch it, say that." and from "**Four things stop you, and only these:**" on; "When this skill applies"; "## Setup" heading; all of "### 4. The ledger" and "### 5. Read the plan, once"; "Model selection"; the task loop's "Context hygiene", "Serial implementers" and "At most one task review is outstanding" paragraphs; "### Controller reading rules" with its first paragraph and these four bullets verbatim: `- **Append to the ledger, never rewrite it.**`, `- **Git output stays one line per fact.**`, `- **Never read a diff yourself**, except`, `- **The five-line reply decides the next move.**`; all of "### 1. Dispatch the implementer"; step 2's first three lines through "**DONE**"; step 3's remaining paragraphs (gates, "Hand the reviewer its diff as a file", BASE, "Recompile the brief", "The reviewer gets four paths", findings path, brief path, template link); "### 4. The fix loop"; step 5 except the cost detail; "## Commits". Section headings of moved sections stay, each followed by its pointer, in the original order.
- Modify, path fixes inside moved text (a pointer change, not a rewording): in `references/setup.md` and `references/exit-gate.md`, every backticked `../../references/` becomes `../../../references/`; in `references/lens-dispatch.md`, `` `../fx-review/SKILL.md` `` becomes `` `../../fx-review/SKILL.md` ``. `references/cost.md` keeps `<skill base directory>/../../scripts/build-cost`, which is stated from the skill base directory and stays correct.
- Modify: `skills/fx-review/SKILL.md` (the sentence ending "see `fx-implement` §3's Lens dispatch for the exact command" points instead at [lens-dispatch.md](../fx-implement/references/lens-dispatch.md))
- Modify: `skills/fx-implement/COVERAGE.md`: table rows whose text moved change from K to R with the new file name, and each `**Rule:** ... (`skills/fx-implement/SKILL.md`)` line in the Incident record names the file that now holds the rule
- Modify: `references/vocab/worktree-setup.md` (line 74 "then run setup and baseline in place" becomes "then run setup in place"; the row "The workspace is fresh: baseline tests can wait" becomes "The exit gate classifies failures against the merge base; a baseline run is not part of setup (ADR 0030).")
- Modify: `src/tests/gates/skill-size.test.ts` and built copy (delete `'fx-implement'` from `PENDING`)
- Modify: `src/tests/gates/no-stories-in-loaded-lanes.test.ts` and built copy: every `skills/fx-implement/references/*.md` is a loaded file whose stories belong in `skills/fx-implement/COVERAGE.md`
- Modify the gate assertions below, each pointed at exactly one file (no concatenating helper), with built copies in `tests/gates/`:

| Test | Pinned string or check | New file or form |
|---|---|---|
| `fix-loop-shape.test.ts` | `` `test_all` runs once in a run, at the exit gate. `` | `references/setup.md` |
| `fix-loop-shape.test.ts` | `ran test_all (rule)` | `references/handling-reports.md` |
| `fix-loop-shape.test.ts` | ``**A `test_all` that stops at its first failure**``, `Order-dependent blocks the completion claim like introduced` | `references/exit-gate.md` |
| `fix-loop-shape.test.ts` | Classify after `### Run what the repository's own gate runs`, and the 1,800-character slice from `### Classify every failing test` | both inside `references/exit-gate.md` |
| `fix-loop-shape.test.ts` | Classify before `## Write the plan-complete line` | the order of pointers in SKILL.md: `[exit-gate.md](./references/exit-gate.md)` before `[completion.md](./references/completion.md)` |
| `fix-loop-shape.test.ts` | `serial fixers grouped by file` | `references/final-review.md` |
| `fix-loop-shape.test.ts` | `**Never read a diff yourself**, except`, `then a `## Log` heading`, `or you reading the fix diff when it qualifies as small` | stay on SKILL.md |
| `return-contract.test.ts` | five-line contract located by `one coverage audit` | `references/coverage-audit.md`, located from its start |
| `return-contract.test.ts` | slice from `**Lens dispatch.**` to `The reviewer gets three paths` (that end string is absent today) and the 2,000-character `[Minor]` slice | the whole of `references/lens-dispatch.md` |
| `return-contract.test.ts` | `confirmed ⚠️:` | `references/review-inputs.md` |
| `return-contract.test.ts` | `### Controller reading rules` before `### 1. Dispatch the implementer` | stays on SKILL.md |
| `return-contract.test.ts` | the 3,500-character rules slice and its needles | needles `>>`, `tail`, `git log --oneline`, `review-package`, `five lines`, `Concerns` on the SKILL.md slice; needles `report contract breached`, `BLOCKED`, `appended line count` on `references/reading-rules.md` |
| `return-contract.test.ts` | plan-complete section before `## Completion report`, with `git commit` and `git add .*state.md` inside it | both inside `references/completion.md` |
| `tripwire-table.test.ts` | span from `**Lens dispatch.**` to `The reviewer gets four paths` | the whole of `references/lens-dispatch.md` |
| `ledger-lines.test.ts` | `` `Task <NN>: parked: <one-line reason>` ``, `at most twice`, `Each re-dispatch appends its own `dispatched` line, so the count is the number of those lines.` | `references/handling-reports.md` |
| `ledger-lines.test.ts` | `../../scripts/build-cost`, `fx-tdd 0/` | `references/cost.md` |
| `ledger-lines.test.ts` | section 3 slice: `build-cost --task`, `before you dispatch the task reviewer`, `fx-tdd 0/` after `build-cost --task`, `[COST_LINE]` | on `references/cost.md`; plus the SKILL.md section 3 slice contains `[cost.md](./references/cost.md)` |
| `ledger-lines.test.ts` | section 5 slice (`build-cost --task`, `` `Task <NN>: cost ``), dispatch and cost line definitions, `git log <BASE>..HEAD`, `At most one task review is outstanding`, the parked-task resume sentence, the compile-brief sentence | stay on SKILL.md |
| `branch-pass.test.ts` | `never fired on any task`, `Capable because: final branch review, auth change`, the branch-pass cap sentence, the absent `dispatch \`fx-lens-security\` and \`fx-devils-advocate\`` | `references/final-review.md` |
| `brief-size.test.ts` | `compile-brief --worktree` | stays on SKILL.md |

**Interfaces:**
- Consumes: `PENDING` in `src/tests/gates/skill-size.test.ts`; the link and reachability checks in `scripts/check-paths` (task 02).
- Produces: the sixteen file names above. Tasks 12, 13, 15, 16, 17 and 19 edit `references/final-review.md`, `references/completion.md`, `references/review-inputs.md`, `references/reading-rules.md` and `references/handling-reports.md` by these names. `final-review.md` holds only what runs before the exit gate; `completion.md` holds what runs after it.
- Every new file is linked from SKILL.md and from nowhere else under `references/` (one level deep). None exceeds 100 lines in the scratch build (largest: `setup.md`, 88 lines); any that later passes 100 lines gets a `## Contents` block.

**Seam:** the gate suite: `tests/gates/skill-size.test.js`, the six gate tests that pin fx-implement sentences, and `scripts/check-paths`.

**Tests:**
- `node tests/gates/skill-size.test.js` with `'fx-implement'` deleted from `PENDING`, before the split: exit 1, `skill-size: skills/fx-implement/SKILL.md is 49175 bytes, at or over the 20000-byte limit. Move what only some steps need into a file beside it.`; after: `skill-size: OK`.
- `wc -c skills/fx-implement/SKILL.md`: at most 17,900 (17,836 in the scratch build).
- Each of `return-contract`, `branch-pass`, `fix-loop-shape`, `ledger-lines`, `tripwire-table`, `brief-size` prints its OK line with the rewrites in the table above.
- `no-stories-in-loaded-lanes`: a line containing `Measured` added to any `skills/fx-implement/references/*.md` makes it fail naming that file and line.
- `python3 -I scripts/check-paths`: exit 0 (every pointer resolves; every new file is linked; the three-level `../../../references/` citations resolve).
- `git diff --color-moved=zebra -- skills/fx-implement/`: every removed block reappears as moved; the only new lines in SKILL.md are the pointer lines.

**Risks:** `scripts/check-paths` fails any backticked path that starts with `references/` as unanchored, so a skill-local file is always named by a markdown link. Never weaken an assertion; move it to the file its sentence now lives in. The "see 'Waiting on a child is not one of them' above" sentence moves into `waiting.md` after that section, so "above" stays true.

**Testing:** gate suite, offline.

## Acceptance criteria
- [ ] SKILL.md is at most 17,900 bytes and still contains the dispatch loop, the four stop conditions, all of section 4, and the four reading-rule bullets named above.
- [ ] Every moved file is reached by following a link from SKILL.md at the step that needs it, and each pointer says to read it every time.
- [ ] The four duplicate worktree rows are gone; `worktree-setup.md` no longer asks for a baseline run.

## Steps

- [ ] **1. Invoke `fx-tdd`** (the RED here is the size gate with the pending entry removed)

- [ ] **2. Delete `'fx-implement'` from `PENDING`** in `src/tests/gates/skill-size.test.ts`

- [ ] **3. Run it: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/skill-size.test.js`
Expected: exit 1 with the 49175-byte message.

- [ ] **4. Move the paragraphs per the table and leave the pointers**

- [ ] **5. Rewrite the gate assertions per the table; fix the moved paths, the fx-review pointer and COVERAGE**

- [ ] **6. Run them: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/skill-size.test.js` and `wc -c skills/fx-implement/SKILL.md`. Expected: `skill-size: OK`; at most 17,900.

- [ ] **7. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-implement/SKILL.md skills/fx-review/SKILL.md references/vocab/worktree-setup.md src/tests/gates/skill-size.test.ts`

- [ ] **8. Commit by path**

```
git add skills/fx-implement/SKILL.md skills/fx-implement/references skills/fx-implement/COVERAGE.md skills/fx-review/SKILL.md references/vocab/worktree-setup.md src/tests/gates/skill-size.test.ts src/tests/gates/return-contract.test.ts src/tests/gates/branch-pass.test.ts src/tests/gates/fix-loop-shape.test.ts src/tests/gates/ledger-lines.test.ts src/tests/gates/tripwire-table.test.ts src/tests/gates/brief-size.test.ts src/tests/gates/no-stories-in-loaded-lanes.test.ts tests/gates/skill-size.test.js tests/gates/return-contract.test.js tests/gates/branch-pass.test.js tests/gates/fix-loop-shape.test.js tests/gates/ledger-lines.test.js tests/gates/tripwire-table.test.js tests/gates/brief-size.test.js tests/gates/no-stories-in-loaded-lanes.test.js
git commit -m "refactor(fx-implement): move step rules into references so SKILL.md survives compaction"
```
