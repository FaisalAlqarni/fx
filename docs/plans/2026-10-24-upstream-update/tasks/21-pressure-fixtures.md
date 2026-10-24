# 21: Pressure-scenario fixtures for fx-tdd and fx-debug; Phase 4 gate

**Status:** ready-for-agent
**Blocked by:** 19, 20
**Phase:** 4: New commands

**What to build:** the next edit to fx-tdd or fx-debug can be measured for discipline under pressure, not only for whether the lane fires. Port upstream's scenarios as compliance fixtures (`compare-4` D11, M8, B9): for fx-debug, superpowers' `test-pressure-1.md` (production outage, cost per minute), `test-pressure-2.md` (sunk cost plus sleep-based timeouts) and `test-pressure-3.md` (authority on a call), reworded for fx and a Rails app; for fx-tdd, two scenarios: "I stubbed it out and put it back" and "the task says skip the tests". Each fixture is a prompt file the existing live runner takes, plus a criteria file listing its "It's working if" signs: mattpocock tdd's six signs for fx-tdd (stops to name seams; one test then code; names read as capabilities; literal expectations; renaming an internal breaks nothing; mocks only at boundaries) and diagnosing-bugs' signs for fx-debug (command plus red output before any theory; the reported bug, not a nearby one; repro shrunk; 3 to 5 hypotheses shown; tagged logs removed; commit names the hypothesis; says so when it has no seam). They run only on request, through `tests/lane-triggering/run-test.sh <lane> <prompt-file> 30`, which writes its log under TMPDIR; the owner scores the log against the criteria. Nothing is added to `check-all`. Phase 4 closes with `scripts/check-all`.

**Design:** Phase 4: New commands

**Files:**
- Create: `tests/compliance/fx-debug/01-production-outage.txt` and `.md`, `02-sunk-cost.txt` and `.md`, `03-authority.txt` and `.md`
- Create: `tests/compliance/fx-tdd/01-stubbed-and-restored.txt` and `.md`, `02-skip-tests.txt` and `.md`
- Each `.md` has exactly three headings: `## Scenario`, `## Pressure`, `## It's working if` (a checklist), and its last line is the run command, for example `` `tests/lane-triggering/run-test.sh fx-debug tests/compliance/fx-debug/01-production-outage.txt 30` ``

**Interfaces:**
- Consumes: `tests/lane-triggering/run-test.sh <lane> <prompt-file> [max-turns]`, unchanged.
- Upstream sources, read only: `<SCRATCH>/upstream/superpowers/skills/systematic-debugging/test-pressure-{1,2,3}.md`, and mattpocock-skills `docs/engineering/tdd.md` and `docs/engineering/diagnosing-bugs.md` in the clone beside it; if gone, re-clone superpowers at `2ce8aa1` and mattpocock-skills at `5beb35b` into `<SCRATCH>/upstream`.

**Seam:** the text gates; the fixtures themselves are exercised only by a live run.

**Tests:**
- `python3 -I scripts/check-prose tests/compliance tests/compliance/fx-debug/01-production-outage.txt tests/compliance/fx-debug/02-sunk-cost.txt tests/compliance/fx-debug/03-authority.txt tests/compliance/fx-tdd/01-stubbed-and-restored.txt tests/compliance/fx-tdd/02-skip-tests.txt`: OK line. The directory walk reads only `*.md`, so each `.txt` prompt is named explicitly.
- `grep -c "^## " tests/compliance/*/*.md`: 3 for each file.
- `grep -n "compliance" scripts/check-all`: no output (never part of the offline gate).
- `scripts/check-all`: `ALL GREEN`.

**Risks:** upstream's scenario text uses dashes and dollar figures; reword, keep the pressure. A live run costs model time and is the owner's call; record in the report that none ran unless asked.

**Testing:** text gates; live compliance on request; then the full gate as the Phase 4 boundary.

## Acceptance criteria
- [ ] Five fixtures exist, each runnable with the one command on its last line, each with observable pass criteria.
- [ ] `scripts/check-all` prints `ALL GREEN` and does not run them.

## Steps

- [ ] **1. Write the five prompt files and five criteria files**

- [ ] **2. Run the gates the Tests field names**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env python3 -I scripts/check-prose tests/compliance tests/compliance/fx-debug/01-production-outage.txt tests/compliance/fx-debug/02-sunk-cost.txt tests/compliance/fx-debug/03-authority.txt tests/compliance/fx-tdd/01-stubbed-and-restored.txt tests/compliance/fx-tdd/02-skip-tests.txt`, then `grep -c "^## " tests/compliance/*/*.md`
Expected: OK line; 3 per file.

- [ ] **3. Commit by path**

```
git add tests/compliance
git commit -m "test(compliance): pressure fixtures for fx-tdd and fx-debug"
```

- [ ] **4. Phase 4 gate** (a plan-mandated phase gate, standing ruling S3: ledgered as `Task <NN>: ran test_all (plan-mandated phase gate)`)

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`
Expected: `ALL GREEN`.
