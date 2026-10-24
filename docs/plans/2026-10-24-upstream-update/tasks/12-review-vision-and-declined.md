# 12: Reviewers judge the spec as a vision and list what they declined

**Status:** ready-for-agent
**Blocked by:** 03, 05, 11
**Phase:** 3: Lane improvements

**What to build:** a crash on an input the task never named is graded by its effect on a user, not deferred as Minor, and nothing a reviewer sets aside disappears silently. Both the per-task reviewer and the branch reviewer read the brief or spec as a vision: where it is silent, a reasonable user's expectation is the requirement, and unrequested behaviour is still an Extra finding (`compare-5` R1). Both write a "Declined to judge" list: every behaviour considered and set aside, with the reason, or "None". The controller rules on each item with one ledger line; a ruled item reaches the final branch review as named input (ADR 0044); an item that touches one of the four stop conditions is parked. fx-review's Standards step searches the repo for standards files and always includes repo.md, CODING_STANDARDS.md, CONTRIBUTING.md and the rule sections of AGENTS.md and CLAUDE.md (C1). fx-review sends every pass in one message and aggregates only after every reply has arrived, naming any pass that has not (C2).

**Design:** Phase 3: Review

**Files:**
- Modify: `skills/fx-implement/task-reviewer-prompt.md` (vision paragraph at the end of Part 1; `### Declined to judge` in the findings file; ledger line; reply suffix)
- Modify: `skills/fx-review/reviewer-prompt.md` (vision paragraph after "Global constraints"; `### Declined to judge`; reply suffix; "Carried findings" also receives the ruled declined lines)
- Modify: `skills/fx-implement/SKILL.md` (step 3, one sentence and a pointer: rule every declined line, read [review-inputs.md](./references/review-inputs.md))
- Modify: `skills/fx-implement/references/review-inputs.md` (the ruling rule and its three outcomes)
- Modify: `skills/fx-implement/references/reading-rules.md` (the ledger-copy count check: the lines appended with `grep '^Task '` must equal the reply's Minor count plus its `declined: <n>` count for a reviewer)
- Modify: `skills/fx-implement/references/final-review.md` (the branch brief names every ruled declined line as input; the branch reviewer's declined items get `Final review: declined:` lines)
- Modify: `skills/fx-implement/fix-loop.md` (a declined item ruled `fix` enters the loop as an Important finding)
- Modify: `skills/fx-review/SKILL.md` (section 4 standards search; section 5 one-message dispatch and wait-for-all)
- Modify: `src/tests/gates/return-contract.test.ts`, `src/tests/gates/ledger-lines.test.ts`, and built `tests/gates/return-contract.test.js`, `tests/gates/ledger-lines.test.js`

**Interfaces:**
- Consumes: `skills/fx-implement/references/review-inputs.md`, `references/reading-rules.md` and `references/final-review.md` (task 03; `final-review.md` holds only what runs before the exit gate).
- Produces, used verbatim by tasks 13, 16 and 17:
  - findings-file heading `### Declined to judge`, one line per item `- <behaviour>: <reason>`, or the single line `None`
  - reviewer ledger line `Task <NN>: declined: <behaviour>: <reason>`, one per item, under `## Ledger lines`
  - reply suffix on the C/I/M line: `, declined: <n>` (always present, `0` when none)
  - controller ruling line `Task <NN>: declined: <behaviour>: <reason>. Ruling: <stands | fix | parked>: <why>`
  - branch pass: `Final review: declined: <behaviour>: <reason>. Ruling: <stands | fix | parked>: <why>`

**Seam:** the format gates that read the prompt and lane files: `return-contract.test.js`, `ledger-lines.test.js`.

**Tests:**
- `return-contract.test.js`: the task reviewer's and branch reviewer's reply contracts both require `, declined: <n>` on the C/I/M line; both findings templates contain `### Declined to judge`; prints its OK line.
- `ledger-lines.test.js`: `references/reading-rules.md` contains ``must equal the reply's Minor count plus its `declined: <n>` count``; `task-reviewer-prompt.md` defines `Task <NN>: declined: <behaviour>: <reason>`; `references/review-inputs.md` defines the ruling line with the three outcomes `stands`, `fix`, `parked`; prints its OK line.
- `review-content.test.js`, `branch-pass.test.js`, `tripwire-table.test.js`, `fix-loop-shape.test.js`: each OK.
- `node tests/gates/skill-size.test.js`: OK; fx-implement SKILL.md grows by at most 350 bytes (expected about 18,190 from task 03's measured 17,836); fx-review SKILL.md about 15,750.

**Risks:** the controller's ledger-copy check in `reading-rules.md` greps every `Task ` line under `## Ledger lines`; without the `plus declined` change every reply with `declined: 1` or more would mismatch. The reviewer's own Minor count stays Minor only. A declined item never becomes a new owner stop: the four stop conditions are unchanged, and only an item that touches one of them is parked.

**Testing:** format gates, offline.

## Acceptance criteria
- [ ] A task reviewer that sets aside "empty organisation list" writes it under `### Declined to judge`, emits one `Task <NN>: declined:` ledger line and replies `C/I/M: 0/0/0, declined: 1`.
- [ ] The controller's ledger then holds the ruling line, and the final branch review brief lists it.
- [ ] fx-review names `repo.md`, `CODING_STANDARDS.md`, `CONTRIBUTING.md`, and the rule sections of `AGENTS.md` and `CLAUDE.md` in its Standards step, and waits for every pass before section 6.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each assertion the Tests field names** in `return-contract.test.ts` and `ledger-lines.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/return-contract.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/ledger-lines.test.js`
Expected: fail on the missing `declined` contract.

- [ ] **4. Edit the prompts, the controller files and fx-review**

- [ ] **5. Run them: verify GREEN**

Run: same commands. Expected: both OK.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-implement/task-reviewer-prompt.md skills/fx-review/reviewer-prompt.md skills/fx-implement/SKILL.md skills/fx-review/SKILL.md`

- [ ] **7. Commit by path**

```
git add skills/fx-implement/task-reviewer-prompt.md skills/fx-review/reviewer-prompt.md skills/fx-implement/SKILL.md skills/fx-implement/references/review-inputs.md skills/fx-implement/references/reading-rules.md skills/fx-implement/references/final-review.md skills/fx-implement/fix-loop.md skills/fx-review/SKILL.md src/tests/gates/return-contract.test.ts src/tests/gates/ledger-lines.test.ts tests/gates/return-contract.test.js tests/gates/ledger-lines.test.js
git commit -m "feat(review): spec as a vision, a declined-to-judge list the controller rules on"
```
