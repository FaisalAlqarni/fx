# Compare 4: TDD and debugging (upstream vs fx)

fx at `/development/fx` main dd99986. superpowers at v7.0.1 (base v6.3.0). mattpocock-skills at master 5beb35b (base 1.2.3 = 30204e6). Release labels for mattpocock: "1.3.0", "1.3.1", or "master, unreleased".

Byte budget that binds every proposal below: `skills/fx-tdd/SKILL.md` is 18,675 bytes and `skills/fx-debug/SKILL.md` is 18,540 bytes, against the 20,000 cap. Headroom is about 1,300 and 1,450 bytes. Each inline proposal states its rough size; anything longer goes to a reference.

## 1. Files read

Read in full unless marked.

**superpowers v7.0.1, `skills/test-driven-development/`**
- `SKILL.md` 330
- `writing-good-tests.md` 198
- `git diff v6.3.0 HEAD` for both skill dirs (TDD +10 lines; debugging 2 example lines; root-cause-tracing 1 line)

**superpowers v7.0.1, `skills/systematic-debugging/`**
- `SKILL.md` 283
- `root-cause-tracing.md` 169
- `defense-in-depth.md` 122
- `condition-based-waiting.md` 115
- `condition-based-waiting-example.ts` 158
- `find-polluter.sh` 72
- `CREATION-LOG.md` 119
- `test-academic.md` 14
- `test-pressure-1.md` 58, `test-pressure-2.md` 68, `test-pressure-3.md` 69

**mattpocock-skills 5beb35b, `skills/engineering/tdd/`**
- `SKILL.md` 38, `tests.md` 77, `mocking.md` 59, `agents/openai.yaml` 3
- `docs/engineering/tdd.md` 94 (user doc page, read as "any other file")

**mattpocock-skills 5beb35b, `skills/engineering/diagnosing-bugs/`**
- `SKILL.md` 138, `scripts/hitl-loop.template.sh` 44, `agents/openai.yaml` 3
- `docs/engineering/diagnosing-bugs.md` 94
- `git diff 30204e6 HEAD` for both skills and both doc pages; commit-to-tag mapping for f3fc563, 3f59913 (no tag, so master only), d80fa0f and 1dab982 (v1.3.0)

**fx dd99986**
- `skills/fx-tdd/SKILL.md` 385, `skills/fx-tdd/COVERAGE.md` 141
- `skills/fx-debug/SKILL.md` 444, `skills/fx-debug/COVERAGE.md` 141, `skills/fx-debug/scripts/hitl-loop.template.sh` 44
- `references/vocab/good-tests.md` 226
- `references/vocab/good-tests-examples.md` 207
- `references/vocab/codebase-design.md` 308
- `references/vocab/root-cause-tracing.md` 118
- `references/vocab/defense-in-depth.md` 121
- `references/vocab/condition-based-waiting.md` 107
- `references/vocab/condition-based-waiting-example.ts` 158 (diffed: byte-identical to upstream)
- Partial reads, for cross-checks only: `references/vocab/verification.md` lines 1 to 40 of 177; `skills/fx-implement/SKILL.md` lines 820 to 850 plus greps for `test_all`/Iron Law; `skills/fx-plan/SKILL.md` grep for `Seam:`; `references/vocab/skill-testing.md` grep; `tests/lane-triggering/` listing
- Not read: `references/stacks/*.md`. fx-tdd loads these per stack, but they hold ecosystem traps, not TDD or debug method.

## 2. Findings per upstream skill

Verdict key: **gap** (fx lacks it), **upstream better**, **fx better**, **equivalent**, **n/a**. Size: S under an hour, M a few hours, L a day or more.

### 2.1 superpowers `test-driven-development` (SKILL.md + writing-good-tests.md)

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| T1 | `SKILL.md:185-193` (new in 6.4.1): "Other tests" means the project's suite. Run it before calling the change done, even when the task named one file. Any failure, "including one you didn't cause", goes in the report by name. "A red test you watched scroll past and didn't mention is a report falsified by omission." | `fx-tdd/SKILL.md:29-32`: widen to `test_scope` once when done; `test_all` belongs to a gate. `:266` "Other tests still pass", with no rule for reporting failures. `fx-implement/SKILL.md:829-844` classifies failures at the exit gate, but only inside an fx-implement run. | **gap** (reporting half). fx is right to keep `test_all` out of the cycle, so the "run the whole suite" half does not apply. | Outside fx-implement (a standalone fx-tdd or fx-debug fix), nothing tells the agent to report an unrelated red it saw. Silent omission is the failure this paragraph targets. | `fx-tdd/SKILL.md:266`, replace the bullet with: "**Other tests still pass**: run `test_scope` once the change is done, even when the task named one test file. Name every failure it shows in the report, including ones you did not cause. A red you saw and left out of the report falsifies it." | S, about 230 B |
| T2 | `SKILL.md:121-128`: "Confirm: Test fails (not errors)". | `fx-tdd/SKILL.md:186-198`: runtime RED **or** compile-time RED. | **fx better** | Upstream still rejects a correct compile-time RED in C#, Kotlin and Swift (fx COVERAGE "would have shipped as a bug"). | Keep. | none |
| T3 | `SKILL.md:75-105, 134-164, 256-291`: TypeScript Good/Bad examples for RED, GREEN, plus a worked bug-fix example. | Prose only (`fx-tdd:156`, `:216-218`). `fx-tdd/COVERAGE.md:26` says the "good/bad annotations" were kept, but SKILL.md carries none. | **equivalent** on method. COVERAGE overstates. | The examples cost bytes fx does not have, and the Ruby `good-tests-examples.md` covers the same ground. | `fx-tdd/COVERAGE.md:26`, change K to S: "examples superseded by prose plus `good-tests-examples.md`". | S |
| T4 | `SKILL.md:208-220`: points to writing-good-tests for four rules. | `fx-tdd:104-105` points to good-tests + examples. | **equivalent** | | none | |
| T5 | `writing-good-tests.md:114-117` "Make doubles specific: when arguments, call counts, or ordering are part of the contract, assert them." | `good-tests.md:112-114` keeps this, **and** `good-tests.md:173-175` (taken from mattpocock `tests.md:38-45`) lists "asserting call counts or ordering" as a red flag. | **fx defect** created by the merge. The two sources say this in different skills; fx put both in one file without reconciling them. | An agent reading the red flag deletes a call-count assertion that is the contract (for example "SMS sent exactly once"), and an agent reading the other rule keeps `receive(:process)` on an internal collaborator. | `good-tests.md:174`: change "asserting call counts or ordering" to "asserting call counts or ordering on **internal** collaborators (at a boundary where count or order is the contract, assert it: see Make doubles specific)". | S |
| T6 | `writing-good-tests.md:47-52`: documents that instruct agents are tested by the consuming agent's behavior "(superpowers:writing-skills)". | `good-tests.md:40-41`: same rule, but no pointer. | **upstream better** (has a pointer) | An agent asked to "add a test" for a SKILL.md change has nowhere to go and greps the text instead. | `good-tests.md:41`: append "(method: `fx-authoring`, pressure scenarios in `skill-testing.md`)". This is a lane name, not a reference link, so it keeps fx's leaves-only rule. | S |
| T7 | `writing-good-tests.md:27-39, 83-112`: inline TS examples (mirror assertion, mock existence, swallowed write). | Moved to `good-tests-examples.md` in Ruby. `good-tests.md:82` is now a heading, "Verify through the interface, not around it", **with no body**. | **fx defect** | The rule exists only as a heading. An agent that loads good-tests.md and not the examples file gets no rule. | `good-tests.md:82`: add one sentence under the heading: "Assert through the public interface (create, then read back through the API), never by querying the database or another side channel." | S |
| T8 | `writing-good-tests.md:157-169`: the mutation check. | `good-tests.md:186-212` adds: never revert a mutation with VCS; check the mutation is in the same layer as the claim. | **fx better** | Two measured incidents back these rules (`good-tests-examples.md:145-177`). | Keep. | none |
| T9 | Upstream text uses em dashes (`writing-good-tests.md:23, 26, 59`...). | fx removed them, but the removal left broken punctuation: `good-tests.md:26` "or its helpers: passes no matter"; `good-tests-examples.md:9` "both sides: always true", `:85-86` "the caller, and the test: can join:"; `codebase-design.md:159-160` a line that starts with " :". | **fx defect** (incidental, found during the read) | Reads as garbled. The dash-removal sweep turned paired dashes into colons. | Re-punctuate those four places with commas or parentheses. | S |

### 2.2 superpowers `systematic-debugging` (SKILL.md + sidecars)

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| D1 | `SKILL.md:87-104` IDENTITY example rewritten (6.4.1/7.0.0) so it no longer prints the secret. | `fx-debug:247-255`: the example was replaced by the general procedure, and `:50-62` adds a redaction section. | **fx better** | fx never carried the leaking example. | none | |
| D2 | `SKILL.md:189` "Use verification-before-completion before claiming success". | `fx-debug:341-342`: "Apply `fx-implement`'s Iron Law". `verification.md:5` says the Iron Law lives inline in fx-implement. | **upstream better** | In a standalone debug session fx-implement is not loaded, so the pointer leads to text the agent does not have. | `fx-debug:341-342`: replace with "Before saying it is fixed, re-run the Phase 1 loop and the test command now and read the output: evidence before claims (`../../references/vocab/verification.md`)." | S, about +60 B |
| D3 | `SKILL.md:147-150` "Form single hypothesis". | 3 to 5 ranked, then test one at a time (`fx-debug:194-203, 228-235`). | **fx better** | Merge reasoning in `fx-debug/COVERAGE.md:120-124` still holds. | none | |
| D4 | `SKILL.md:191-212`: 3-fix circuit breaker. | `fx-debug:278-299`, routes to fx-architecture. | **equivalent**, plus routing | | none | |
| D5 | `root-cause-tracing.md:11-24` (fix at the symptom point on a dead end) vs `:132-152` (on "no", NEVER fix just the symptom). Upstream contradicts itself. | fx copied both: `root-cause-tracing.md:18-19` "fix at the symptom point, and say why" vs `:105` "no → NEVER fix just the symptom. Say why you stopped." | **shared defect** | An agent at a real dead end gets two opposite instructions. | `fx root-cause-tracing.md:105`: "no → you are at a dead end: fix at the symptom only if you say so and why, and add the Layer 4 instrumentation from defense-in-depth so the next occurrence traces further." | S |
| D6 | `root-cause-tracing.md:97-107` plus `find-polluter.sh`: run test files one by one and stop at the first one that creates the artifact. | `fx root-cause-tracing.md:94-98`: "Bisect the suite... `rspec --seed` plus a narrowing file list". `fx-debug/COVERAGE.md:62-64` dropped the script as JS-only. | **upstream better** in practice; fx's reason for dropping the script still holds. | fx gives no runnable procedure, and `--seed` does not find a polluter. RSpec has `--bisect` for order-dependent failures, which fx omits, and fx-implement already classifies tests as "order-dependent" (`fx-implement:832-833`) without saying how to find the cause. | `fx root-cause-tracing.md:94-98`: replace with a stack-neutral 5-line loop over test files using `.fx.json` `test_one` (`for f in <files>; do [ -e "$ARTIFACT" ] && break; <test_one $f>; [ -e "$ARTIFACT" ] && { echo "$f"; break; }; done`). Add: "order-dependent failure: `rspec --bisect` (RSpec), or halve the file list by hand." | S |
| D7 | `root-cause-tracing.md:85-89` uses `npm test` in its example. | `fx root-cause-tracing.md:86-88` hardcodes `docker compose exec shared bundle exec rspec ...`, which is the Advantage repo's runner. | **fx defect** | It contradicts fx-tdd:24-27 ("Never assume the runner") and puts one project's container name into a plugin-wide reference. | Replace with "`<test_one from .fx.json> 2>&1 \| grep 'DEBUG-a4f2'`". | S |
| D8 | `defense-in-depth.md:52-70`, Layer 3: in tests, refuse `git init` outside tmpdir. This is the guard that actually caught the incident. | `fx defense-in-depth.md:47-65`: Layer 3 examples are production guards (truncate in production, destructive migration). `:115-121` reconciles with the ladder. | **equivalent**, and the ladder note makes fx better | fx's environment examples fit the stack. Upstream's test-env guard matters for agents whose tests touch the real filesystem, but it is an example, not a rule. | Optional: add one line to Layer 3: "the same guard in reverse: in test, refuse destructive work outside the test's temp dir or DB." | S |
| D9 | `condition-based-waiting.md` (+ `-example.ts`): replace sleeps with condition polling and a timeout. | Copied verbatim minus "Real-World Impact" (`fx condition-based-waiting.md`, 107 lines). `fx-debug/COVERAGE.md:55` says "copy verbatim, **not yet reviewed**". `fx-debug:443-444` lists it as a supporting technique. **`good-tests.md:142-144` says "Polling with a deadline is not the fix... Inject the collaborator."** | **fx defect: the two references contradict each other**, and the file is TypeScript-only in a Rails/.NET-first plugin | An agent fixing a flaky spec gets "poll for the condition" from fx-debug and "polling is not the fix" from fx-tdd. Upstream's own core example is also wrong: `waitFor(() => getResult() !== undefined)` omits the required `description` argument (`:43` vs `:62-66`). | Rewrite `fx condition-based-waiting.md` stack-neutral (M). Add a "Which one" section at the top: (a) the test drives the system from outside (system/e2e spec, CLI, external process) and cannot inject the timing collaborator → wait on a condition; (b) the code under test is yours at a unit or request seam → inject the collaborator (good-tests). Stack idioms: Capybara matchers already wait (`expect(page).to have_content`), so `sleep` in a system spec is the bug; ActiveJob `have_enqueued_job` / `perform_enqueued_jobs` instead of waiting on a worker. Fix the `description` argument. Mark it reviewed in COVERAGE. Add one clause to `good-tests.md:142`: "(for black-box system tests see condition-based-waiting.md)". | M |
| D10 | `condition-based-waiting-example.ts`: Lace-specific helpers that import `~/threads/thread-manager`. | Shipped byte-identical at `references/vocab/condition-based-waiting-example.ts`, referenced from `condition-based-waiting.md:82` "in this directory". `fx-debug/COVERAGE.md:59-61` says it was **D**ropped. | **fx defect** (COVERAGE drift plus dead weight) | The ledger is wrong, and the file imports modules that do not exist in any fx user's repo. | Delete the .ts file and line 82 as part of D9, or change COVERAGE to K. Recommend delete. | S |
| D11 | `test-pressure-1..3.md`, `test-academic.md`, `CREATION-LOG.md`: three pressure scenarios (production outage with $15k/min, sunk cost plus sleep-timeouts, authority on a Zoom call) and how they were run. | Dropped as dev artifacts (`fx-debug/COVERAGE.md:59-61`). fx has the method (`references/vocab/skill-testing.md:49-58`), but `tests/lane-triggering/` only tests whether a lane fires, not whether the agent complies with it under pressure. | **gap** (no compliance fixtures for fx-debug or fx-tdd) | These scenarios are free regression fixtures for the next edit to either lane. fx-authoring tells you to pressure-test, but there is nothing on disk to rerun. Pressure-2 also exercises D9 directly (sleep 100 → 5000). | Port the three scenarios, with fx wording and Rails context, to `tests/compliance/fx-debug/` and two TDD ones ("I stubbed it out and put it back"; "task says skip tests") to `tests/compliance/fx-tdd/`. Run them per `skill-testing.md`. | M |
| D12 | `SKILL.md:44` "four phases"; `CREATION-LOG.md:84-87`: a note that TDD's "simplest code" is not debugging's "root cause". | fx-debug Phase 5 hands off to fx-tdd for RED/GREEN only (`:325-326`), and `:334-338` "find every caller... smallest change in the wrong place is a second bug". | **fx better** | fx says outright that the minimal-code ladder does not override fixing at the source. | none | |

### 2.3 mattpocock `tdd` (SKILL.md, tests.md, mocking.md, docs page)

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| M1 | `SKILL.md:24` (master, unreleased, 3f59913, issue 607): "Give each proposed seam a one-line note on what it catches and what it misses." The doc page calls the missing version "the most-reported friction" (`docs/engineering/tdd.md:58`). | `fx-tdd:112-115`: ask "What's the public interface, and which seam...?" with no note. `fx-plan/SKILL.md:317` `**Seam:**` line, same. | **gap** | When the user is asked to confirm a seam, they choose between labels unless each seam says what it catches and misses. fx makes seam confirmation mandatory, so fx feels this friction more than upstream does. | `fx-tdd:115`: append "Give each proposed seam one line: what it catches, what it misses." (about 80 B). Optional, for the plan area: `fx-plan:317` template `**Seam:** <seam> (catches: ...; misses: ...)`. | S |
| M2 | `SKILL.md:10` reads `GLOSSARY.md` (1.3.0). | `fx-tdd:131` `CONTEXT.md`. | **gap** (owner decision) | Owner already decided the rename. | `fx-tdd:131`, `fx-debug:85`, `codebase-design.md:278` → `GLOSSARY.md` (`GLOSSARY-MAP.md` in multi-context repos); update both COVERAGE rows. | S |
| M3 | `SKILL.md:38` "Refactoring is not part of the loop", moved to code-review. The doc gives the reason: "agents almost never performed it". | `fx-tdd:272-279`: refactor kept, but only on code this task wrote; anything wider goes to fx-review/fx-architecture. | **fx better**, with a caution | Upstream's evidence (the step gets skipped) holds for fx too, but a bounded optional step costs nothing when skipped. fx's rationale in `COVERAGE.md:85` still holds. | none | |
| M4 | `docs/engineering/tdd.md:64-66` (doc, master): "Should it write browser or end-to-end tests first? Usually not": an agent wrote a Playwright test first and then looped, concluding the *test* was broken. | `fx-tdd:121` "Use the **highest** seam available", and nothing about slow seams. | **gap**, and fx's wording pushes toward the failure | For an Advantage-style stack (Capybara + axe system specs), "highest seam" reads as "system spec first". That makes each RED/GREEN cycle slow, and a missing feature looks like a broken test. | `fx-tdd:123`, after "the ideal number is one", add: "A browser or system test is rarely the right RED: it is slow, and a missing feature looks like a broken test. Drive the behavior at the request or service seam; add the system test once it works." (about 210 B) | S |
| M5 | `docs/engineering/tdd.md:22-24` (doc, master): open gap issue 746, nothing decides whether a change is worth the loop (config, glue, CRUD), so the agent produces tautological tests. | `fx-tdd:45-46` exceptions (ask first); `:243-245` "Only a one-liner with no logic needs none"; `good-tests.md:179-184` "trivial code earns none". | **fx better** | fx already answers the open upstream issue. | none | |
| M6 | `mocking.md:16-59` dependency injection, SDK-style interfaces. `tests.md`: good/bad, verify through the interface, tautological. | `good-tests.md:84-108`, `good-tests-examples.md:6-51, 111-134`, in Ruby. | **equivalent** | | none (T7 covers the empty heading) | |
| M7 | `SKILL.md:26` "call the Skill tool with codebase-design" (1.3.0). | `fx-tdd:125-129` reads `references/vocab/codebase-design.md`. | **fx better** for fx | One claimant per intent, and a reference is not a session. | none | |
| M8 | `docs/engineering/tdd.md:80-87` "It's working if": six observable signs (stops to name seams; one test then code; names read as capabilities; literal expectations; renaming an internal breaks nothing; mocks only at boundaries). | Absent as an observable list; fx's checklist (`fx-tdd:360-376`) is agent-facing. | **upstream better** as eval criteria | These signs can be checked in a transcript, so they make good pass criteria for the D11 compliance fixtures. | Use them as the pass criteria in `tests/compliance/fx-tdd/` (D11). No lane text. | S, within D11 |

### 2.4 mattpocock `diagnosing-bugs` (SKILL.md, hitl-loop, docs page)

| # | Upstream says | fx says | Verdict | Why it matters | Proposed change | Size |
|---|---|---|---|---|---|---|
| B1 | `SKILL.md:125` (master, unreleased, f3fc563, issue 955): "If you forced the red by mutating code or a fixture, `diff` against a pristine copy to prove the mutation landed before you trust it." | `fx-debug:325-326` "Watch it fail", with nothing on forced reds. `fx-tdd:308-310` regression proof "revert the fix → run (MUST FAIL) → restore" never says *how* to revert. `good-tests.md:200-205` says never revert with VCS and diff after restoring, but that file is loaded for writing tests, not for this step. | **gap**, and fx-tdd's wording invites the measured incident | "Revert the fix" makes an agent reach for `git checkout`/`git stash`, which is the exact data-loss incident in `good-tests-examples.md:145-151`. Upstream adds the other half: a red from a mutation that never landed is a false red. | `fx-tdd:309-310`: "write → run (passes) → **copy the fixed file aside, undo the fix by hand, `diff` to prove the undo landed** → run (MUST FAIL) → copy it back, `diff` against the copy → run (passes). Never `git checkout`/`restore`/`stash` for this." (about +170 B). `fx-debug:325-326`: append "Forced the red by mutating code or a fixture? `diff` against a pristine copy first." (about +90 B) | S |
| B2 | 1.3.0 (1dab982) removed the Phase 6 post-mortem hand-off ("what would have prevented this bug?" → improve-codebase-architecture), because the target is user-invoked and the bug-fix flow often runs unattended. 1.3.1 doc (`docs/engineering/diagnosing-bugs.md:118, 191`): run `retro` afterwards in the same session; diagnosing-bugs never invokes it. | `fx-debug:354-364`: Phase 6 has no prevention question. `:314-316` already flags a missing seam for fx-architecture. | **gap**, given the owner's decision to adopt `retro` | The session that just fixed the bug knows the most about why it got in. fx drops that knowledge unless the user thinks to ask. | `fx-debug:364`, add a Phase 6 line: "Name what would have prevented this bug, after the fix is in. A missing seam goes to `fx-architecture`; a process or lane gap goes to `<retro lane>`. Say it in the report; do not start either lane unattended." (about 230 B) | S |
| B3 | `SKILL.md:22` "Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**" | `fx-debug:75-76` keeps the effort line and drops the second sentence. `fx-debug/COVERAGE.md:74` claims it was kept. | **equivalent** on behavior; COVERAGE is wrong | "Refuse to give up" sits awkwardly next to "When you genuinely cannot build a loop, stop" (`:126-135`). Dropping it is defensible, but the ledger should say so. | `fx-debug/COVERAGE.md:74`: mark "be aggressive... refuse to give up" as S (superseded by the effort line and the explicit stop rule). | S |
| B4 | `SKILL.md:24` "Ways to construct one, in roughly this order". | `fx-debug:88` "Ten ways to build the loop", no ordering. | **upstream better** (slightly) | The order (cheapest first, HITL last) is guidance an agent can act on. | `fx-debug:88`: "Ten ways to build the loop, roughly cheapest first". (+25 B) | S |
| B5 | Redaction (`SKILL.md:12-16`). Doc `:168-169` still calls this unimplemented (stale doc). | `fx-debug:50-62` plus "nothing goes outward". | **fx better** | | none | |
| B6 | `hitl-loop.template.sh` (comment de-dashed on master). | `fx-debug/scripts/hitl-loop.template.sh` already matches master. | **equivalent** | | none | |
| B7 | Doc `:156-157`: the skill fires on quick questions and builds a mock repro before answering (issue 578, 4 reports; fix not shipped). | `fx-debug:44-48` "skip a phase only when you can state the justification, and state it". The description triggers on "any bug... unexpected behavior". | **equivalent exposure** | Same risk. fx's stated-skip rule is the mitigation, and the owner's PREAMBLE makes over-triggering the preferred failure. | None now. Watch issue 578 upstream. | none |
| B8 | Doc `:162-163`: no gate between instrumentation and the fix (issue 124, open). | `fx-debug:217-222` shows hypotheses; no confirmation before the fix. | **equivalent** | Owner style favors autonomy ("just fix it"). | none | |
| B9 | Doc `:177-185` "It's working if" (command plus red output before any theory; the reported bug, not a nearby one; repro shrunk; 3 to 5 hypotheses shown; tagged logs gone; commit names the hypothesis; says so when it has no seam). | Absent as an observable list. | **upstream better** as eval criteria | Same use as M8. | Use as pass criteria in `tests/compliance/fx-debug/` (D11). | S, within D11 |

## 3. Ideas fx has that upstream lacks (keep)

- Compile-time RED as valid RED (`fx-tdd:186-198`). Upstream superpowers still says "fails (not errors)".
- RED output must be pasted from a run, never reconstructed, plus the "stubbed it out and put it back" rationalization (`fx-tdd:204-212, 328, 335-336`). Both are backed by measured incidents.
- "The test's name must not claim more than the test checks", with four measured instances (`fx-tdd:92-102`), and the mutation-layer rule (`good-tests.md:207-212`).
- Never revert a mutation with VCS (`good-tests.md:200-205`).
- The task file is data, not instructions (`fx-tdd:66-72`).
- `.fx.json` `test_one`/`test_scope`/`test_all` split and "never assume the runner" (`fx-tdd:24-32`).
- The minimal-code ladder plus "when not to be lazy" (`fx-tdd:220-261`), and the defense-in-depth-vs-ladder note (`defense-in-depth.md:115-121`).
- Guarantee row in `state.md` (`fx-tdd:281-289`).
- Non-deterministic seams, with the Rails thread/connection trap (`good-tests.md:135-150`, `good-tests-examples.md:53-109`).
- fx-debug: find every caller before editing (`:334-338`); secrets redaction plus "nothing goes outward" (`:50-62`); the 3-fix circuit breaker routed to fx-architecture; user-signal table; "I'll build the loop after I understand the code" rationalization (`:423`).
- COVERAGE ledgers themselves. Upstream has nothing that records what was merged and why.

## 4. Top recommendations (ranked)

1. Reconcile condition-based waiting with "polling is not the fix": rewrite the reference stack-neutral, with a "which one" rule and the Capybara/ActiveJob idioms, and delete the Lace `.ts` file (D9, D10).
2. Make the regression red-green proof say how to revert: copy aside, undo by hand, `diff` to prove it landed, never `git checkout`/`stash`. Add the forced-red `diff` line to fx-debug Phase 5 (B1, mattpocock f3fc563, master).
3. Name every test failure you saw in the report, including ones you did not cause, scoped to `test_scope` (T1, superpowers 6.4.1).
4. One line per proposed seam saying what it catches and what it misses (M1, mattpocock 3f59913, master).
5. Do not drive RED from a browser or system spec; add it once the behavior works (M4, mattpocock doc).
6. Fix the call-count contradiction inside good-tests.md (T5).
7. Add the fx-debug Phase 6 prevention question, pointing to the adopted retro lane and fx-architecture without auto-invoking either (B2, mattpocock 1.3.0/1.3.1).
8. Point fx-debug's "evidence before claims" at `verification.md` instead of fx-implement's inline Iron Law (D2).
9. Root-cause-tracing clean-up: resolve the dead-end contradiction, replace the hardcoded `docker compose ... rspec` with `test_one`, and add a runnable polluter loop plus `rspec --bisect` (D5, D6, D7).
10. Port the pressure scenarios as compliance fixtures for fx-debug and fx-tdd, using upstream's "It's working if" lists as pass criteria (D11, M8, B9). Also apply the small ledger and text fixes: GLOSSARY rename (M2), empty heading (T7), dash artifacts (T9), and COVERAGE drift (T3, B3, D10).

Inline byte cost of 2, 3, 4, 5, 7 and 8 together: about 1,000 B for fx-tdd (T1 230, B1 170, M1 80, M4 210, plus margin) and about 400 B for fx-debug (B1 90, B2 230, D2 60, B4 25). Both stay under 20,000 with roughly 300 B and 1,000 B to spare. Any further fx-tdd growth needs a move-out first.

Not checked: `references/stacks/*.md` (could already carry the Capybara waiting idiom; check before writing D9), the remaining 137 lines of `verification.md`, and whether a `tests/compliance/` convention already exists elsewhere in fx under another name.
