# 17: Controller status, park-and-continue, completion menu; Phase 3 gate

**Status:** ready-for-agent
**Blocked by:** 13, 14, 15, 16
**Phase:** 3: Lane improvements

**What to build:** a build keeps running while the owner is away, and the owner can see where it stands at a glance (`compare-3` F32, F33, F36).
- **Status summary.** On request, and after each task completes or parks, the controller prints four lines in the same message that dispatches the next task: done, running (task and step), left, needs you. The rationalization row "A progress summary would be helpful" changes to say the four-line status is the only summary.
- **Park, don't block.** One of the four stop conditions no longer stops the build: the controller parks that task with a `needs you` line, never runs the destructive or security-related step, and continues with tasks the parked one does not block. The completion report lists every needs-you item.
- **Completion menu.** Three options: merge locally, push and open a PR, or leave as is. Discard is never offered; it happens only when the owner asks for it, after the controller lists the branch, its commits and the worktree path, and the owner types the word `discard`.
- **Finishing reference.** New `references/finishing.md`, read only after the owner answers: upstream finishing-a-development-branch steps 2, 3, 5 and 6 and its rationalization table, with two fx edits: no `git pull` or push unless the owner chose it, and nothing removed with `--force`.
- **Parallel implementers.** New `references/parallel.md`, read only when `.fx.json` sets `isolated_test_execution: true`: mattpocock implement-spec steps 4 to 6 and 9, keeping per-task review (the review range is the implementer branch's BASE..HEAD before merge), merges serial through one merger, the ledger written only by the controller, and never `git stash`.
The status block and the park procedure live in a new `references/status.md`; SKILL.md gains only one pointer line and a one-sentence change to the stop list, so the inline growth stays near 450 bytes. Phase 3 closes with `scripts/check-all`.

**Design:** Phase 3: Implement

**Files:**
- Modify: `skills/fx-implement/SKILL.md` (after the four stop conditions, the line `For those, stop and ask.` becomes `For those, park the task and continue: read [status.md](./references/status.md), every time.`; one pointer `**After each task completes or parks, or when the owner asks for status**: read [status.md](./references/status.md), every time.`; the pointer to [parallel.md](./references/parallel.md) replacing the sentence that says `isolated_test_execution: true` relaxes serial implementers; the pointer "After the owner answers the completion menu, read [finishing.md](./references/finishing.md)", in SKILL.md so references stay one level deep; the rationalization row)
- Modify: `skills/fx-implement/references/completion.md` (the menu; the discard procedure; the needs-you list in the completion report; it names no other file under `references/`)
- Modify: `skills/fx-implement/references/rationalizations.md` (the row "A progress summary would be helpful" says the four-line status is the only summary)
- Create: `skills/fx-implement/references/status.md` (the status block and the park procedure), `skills/fx-implement/references/finishing.md`, `skills/fx-implement/references/parallel.md`
- Modify: `skills/fx-implement/COVERAGE.md` (rows for finishing-a-development-branch and implement-spec)
- Modify: `src/tests/gates/ledger-lines.test.ts`, built `tests/gates/ledger-lines.test.js`

**Interfaces:**
- Consumes: `references/completion.md` and `references/rationalizations.md` (task 03; `completion.md` holds what runs after the exit gate); the parked line `Task <NN>: parked: <one-line reason>` already defined in `references/handling-reports.md` (task 03); the declined ruling `parked` outcome (task 12).
- Produces: `Task <NN>: parked: needs you: <stop condition>: <what unblocks it>`.
- Produces: the status block, exactly four lines:
  `Done: <n> of <total> (<NN, NN>)`
  `Running: Task <NN>, <dispatch | review | fix round <R> | final review>`
  `Left: <NN, NN> or none`
  `Needs you: <NN: what unblocks it; ...> or none`
- Produces: the menu, three numbered options `1. Merge it into <base branch> locally`, `2. Push the branch and open a pull request`, `3. Leave it as it is, I will handle it`. Task 18 edits `finishing.md` (option 2 points at `/fx:fx-pr`); task 19 adds one line to the completion report in `completion.md`.
- Upstream sources, read only: `<SCRATCH>/upstream/superpowers/skills/finishing-a-development-branch/SKILL.md` and `.../upstream/mattpocock-skills/skills/engineering/implement-spec/SKILL.md`; if gone, re-clone at superpowers `2ce8aa1` and mattpocock-skills `5beb35b` into `<SCRATCH>/upstream`.

**Seam:** `ledger-lines.test.js` and the size and path gates.

**Tests:**
- `ledger-lines.test.js`: `references/status.md` defines `Task <NN>: parked: needs you: <stop condition>: <what unblocks it>` and the four status lines starting `Done: `, `Running: Task `, `Left: `, `Needs you: `; SKILL.md contains `For those, park the task and continue: read [status.md](./references/status.md), every time.`; in `references/completion.md` the menu block contains `1. Merge it into`, `2. Push the branch and open a pull request` and `3. Leave it as it is, I will handle it` and does not contain `4. `, and `completion.md` contains the exact sentence `Discard only when the owner asks for it: list the branch, its commits and the worktree path, and act only after the owner types the word discard.`; prints its OK line.
- `node tests/gates/skill-size.test.js`: OK; fx-implement SKILL.md under 19,000 bytes (expected about 18,650: task 03's measured 17,836, task 12's about 350, this task's about 450).
- `python3 -I scripts/check-paths`: exit 0 (the three new references reachable from SKILL.md).
- `scripts/check-all`: `ALL GREEN`.

**Risks:** "Rulings, not stalls" says the last tool call of every message is the next dispatch; the status block rides in that same message and never replaces the dispatch. Parking never runs the step it parks on: an irreversible, security-sensitive or outward step stays unrun until the owner answers.

**Testing:** format and size gates; then the full gate as the Phase 3 boundary.

## Acceptance criteria
- [ ] After each completed or parked task the owner sees the four-line status, and the build keeps going.
- [ ] A stop condition produces a needs-you line, and later unblocked tasks still run.
- [ ] The completion menu has three options; discard happens only after the listing and the typed word.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write the assertions the Tests field names** in `ledger-lines.test.ts`

- [ ] **3. Run it: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/ledger-lines.test.js`
Expected: fails on the missing needs-you line and the four-option menu.

- [ ] **4. Edit SKILL.md, completion.md and rationalizations.md; write status.md, finishing.md and parallel.md; add the COVERAGE rows**

- [ ] **5. Run it: verify GREEN**

Run: same commands. Expected: OK.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-implement/SKILL.md skills/fx-implement/references/completion.md skills/fx-implement/references/status.md skills/fx-implement/references/finishing.md skills/fx-implement/references/parallel.md`

- [ ] **7. Commit by path**

```
git add skills/fx-implement/SKILL.md skills/fx-implement/references/completion.md skills/fx-implement/references/rationalizations.md skills/fx-implement/references/status.md skills/fx-implement/references/finishing.md skills/fx-implement/references/parallel.md skills/fx-implement/COVERAGE.md src/tests/gates/ledger-lines.test.ts tests/gates/ledger-lines.test.js
git commit -m "feat(fx-implement): status block, park and continue, three-option menu, finishing and parallel references"
```

- [ ] **8. Phase 3 gate** (a plan-mandated phase gate, standing ruling S3: ledgered as `Task <NN>: ran test_all (plan-mandated phase gate)`)

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`
Expected: `ALL GREEN`.
