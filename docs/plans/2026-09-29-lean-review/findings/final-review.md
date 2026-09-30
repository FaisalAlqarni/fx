# Final branch review: lean-review

Range 68ba929..ee13f92 (17 commits), diff package `.fx/lean-review/review/68ba929..ee13f92.diff`. Read-only review, one pass over the whole package plus spot reads at HEAD.

Checks I ran at HEAD (ee13f92): `tripwire-table`, `fix-loop-shape`, `dispatch-route`, `brainstorm-confidence`, `review-content`, `lens-content`, `return-contract`, `no-runtime-addressing`, `lib/plan-state.test.js` (41/41), `lib/preamble.test.js` all pass; `scripts/check-generated` passes; `scripts/check-prose` passes on every Markdown file the branch changed (AGENTS.md excluded, pre-existing). `tests/gates/release-version.test.js` fails.

## Strengths

- The routing hook is small and correct. `lib/dispatch-route.js` is a pure 25-line function; the hook branch fails open on load and on throw, with a stderr trace, and `tests/gates/dispatch-route.test.js` proves both failure modes by running a copy of the hook against a throwing and an unloadable module. The live probe settled the `permissionDecision` question before later tasks built on it, and ADR-0031 records the result.
- Forks and `fx:` agents are left alone, which closes the two ways the design's first draft could have broken dispatches (fork model inheritance, pinned lens tiers).
- `standingRulings()` is well isolated: a missing file is silent, any other read failure is named in the block, a rulings bug loses only the rulings (tested by forcing `path.relative` to throw), and the budget fixture now carries 10 long rulings per plan.
- The companions line fails visibly: a broken `.fx.json` renders the default plus a sentence saying the override was not applied, instead of silently ignoring it.
- The tripwire rule lives in one table that `fx-implement` points at, and `tripwire-table.test.js` pins its shape. README cost numbers are internally consistent (agents sum to 728, minute shares recompute from the minute column).
- The exit-gate classification closes the hole the plan named as a MEDIUM risk: a test absent on the merge base is introduced, and a merge-base failure for another reason is treated as introduced.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

1. **Exit gate not passed: `release-version.test.js` fails and every gate after it has never run on this branch.** `.claude-plugin/plugin.json` is still `0.2.3`, same as main, while shipped files changed. The ledger (uncommitted line) classifies it as introduced. `scripts/check-all:92` onward was never reached: the three install tests, the conformance tests and `conformance-free-claude-code`, which is the only automated check that runs the changed `hooks/fx-pretooluse.js` inside a real Claude Code, plus `ci-pins`. Why it matters: the plan's single `test_all` (task 11) has not actually completed, so "check-all green" in the plan's task 11 criteria is unmet. Fix: bump the version in all three manifests the test syncs, then run the tail of `check-all` from `release-version.test.js` down (with the two known pre-existing lines removed, per the ledger ruling) and ledger each result.

2. **`skills/fx-review/SKILL.md:186` (lens brief) and `agents/fx-lens-silent-failure.md`, `agents/fx-lens-database.md`: a per-task lens reviews the whole diff on its broad triggers.** Design §1 says silent-failure's broad triggers (`.presence ||`, `||=`, `??`, `find_by`, unchecked `save`, dropped `valid?`, HTTP clients) "run at the end only". The tripwire decides whether the lens is dispatched, but once dispatched nothing narrows what it reports; the `mode: branch` line gates only the two security items. Why it matters: broad-pattern Important findings enter the per-task fix loop, the cost (fix rounds, 13.3% of minutes) this plan set out to cut. Coverage audit G1. Fix: one sentence in the lens brief ("with no `mode: branch` line, silent-failure and database report only their tripwire class; broad-trigger findings are for the branch pass") and one assertion in `lens-content.test.js`.

3. **`skills/fx-implement/SKILL.md:296-302` with `lib/plan-state.js` `standingRulings()`: the `## Standing rulings` section has no end marker.** The parser ends the section at the next `#`, `##` or `###` heading (the test fixture uses `## Log`), but SKILL.md prescribes no heading after the section, and the pre-flight table and log lines are appended with no heading of their own. In a ledger shaped the way SKILL.md describes, every later plan-only `Ruling:` line (pre-flight rulings, mid-run rulings) is carried as a standing ruling that "overrides its defaults", fills the 10-slot cap, and blurs the boundary the completion report depends on ("every `Ruling:` line outside the `## Standing rulings` section"). A controller that reads the section as running to the next heading reports no rulings at all, which is the "decision made in secret" failure the report section exists to stop. Fix: SKILL.md tells the controller to close the section with a `## Log` heading before the first log line (one sentence), and a plan-state test with a ledger whose log follows with no heading.

### Minor (Nice to Have)

1. `skills/fx-implement/fix-loop.md:94` excludes `**/*.md` from the production-line count, per design §3. In fx itself, and in any repo where Markdown is the product (skills, prompts), every fix counts as 0 production lines, so every fix round qualifies for controller re-review whatever its size. This is an issue with the plan rather than the implementation. Fix when it bites: let `repo.md` re-include a path, or note the exception in fix-loop.md.
2. `lib/preamble.js` `companions()`: a custom `companions` string from `.fx.json` has no length cap, and it is appended to every session and subagent. A long override silently breaks the 9,000-character worst-case budget that the tests pin only for the default. Fix: cap it (for example 400 characters) or document that the budget assumes the default.
3. `docs/adr/0031-defaults-are-held-by-mechanism.md` "Decision": "Any load failure or throw in the routing module passes the call unchanged: exit 0, no output." Since fix round 809d811 the hook writes `[fx] dispatch routing off: ...` to stderr. Say "no stdout, a one-line trace on stderr".

## Spec compliance

- ❌ Issues found: exit gate incomplete (Important 1, plan task 11 "check-all green"); design §1 "broad triggers run at the end only" has no enforcement (Important 2).
- ✅ Everything else in plan tasks 01 to 11 is present: tripwire column and dispatch rule; controller re-review with the four conditions and ledger line; no baseline run, exit-gate classification; routing hook with the probe; standing rulings in the session block with the re-invoke line; companions line with override and `""`; confidence check as a numbered step on both paths; review, security, a11y and design content; ADRs 0029 to 0034; README cost section and routing evidence; INSTALL.md rows for both OpenCode versions.
- Deviations from design, all ruled in the ledger (state.md lines under "Ruling:" at the end): `permissionDecision` omitted (probe evidence), routing limited to three general types, rulings capped at 10 not 15, per-task `test_all` ledgered not rejected. All four are justified.
- ⚠️ Cannot verify from diff: (a) that the routing hook behaves in a real Claude Code session beyond the task 03 probe; `conformance-free-claude-code` is the check and it has not run (Important 1). (b) OpenCode live rows on either version; the server was down, so they are pending by plan. (c) The design §11 build-measurement targets; they need the next real build (audit G6).

## Carried findings triage

Must fix before merge (all small, one fix wave):

- Task 01: fx-review/SKILL.md:292 red flag "Firing all four lenses" is stale. Must fix: it contradicts the new five-lens tripwire rule two sections above it; one line.
- Task 02: COVERAGE.md:102 maps W118:W121 to the deleted baseline rule (ledgered twice). Must fix: the coverage map now points at a rule the skill no longer has.
- Task 02: SKILL.md:247 greenfield paragraph "the baseline is 0 tests" (ledgered twice). Must fix: the only remaining mention of a baseline run the skill no longer does; drop the phrase.
- Task 03: `route()` checks only `model === 'opus'`. Must fix: `fable` is in the Agent tool's model enum on the current harness, so the most-capable rule has a live bypass today. Treat any model other than `sonnet` and `haiku` as needing the reason line, add a test, and say so in ADR-0031. This also closes coverage audit G4's unledgered item.
- Task 03: claude-code.md routing paragraph says `Agent` only; the hook also routes `Task`. Must fix: harness reference is the doc a reader trusts for exact behaviour; one word plus the line break.
- Task 04: ADR-0031 "reads both places at every session start" (ledgered twice, also silent-failure lens, audit G3). Must fix: the rulings are read only while an unfinished plan exists, and on OpenCode only at plugin construction. Amend to "while an unfinished plan exists; Claude Code re-reads on compaction, OpenCode at startup".
- Task 04: the worst-case preamble fixture does not assert that rulings render. Must fix: ADR-0031 cites that fixture as proof of the budget with 10 rulings present, and it passes vacuously if they vanish; one assertion.
- Task 10: INSTALL.md paragraph under the verified table still says the opencode final-tree run "waits for free memory". Must fix: it contradicts the rows directly above it.

Confirmed deferred:

- Task 01: fx-review/SKILL.md:82 does not say which column applies per mode. The paragraph added under the table states it.
- Task 02: fix-loop-shape.test.js fixed 1800-character slice. Works today; tighten when the section is next edited.
- Task 03: an opus-to-sonnet rewrite is not surfaced to the dispatcher. Design accepted a silent default; the probe shows the result in the transcript's model id. Revisit if owners report surprise.
- Task 03: reviewer-prompt.md placeholder leaves the "final whole-branch review" sentence outside the bracket. Cosmetic; the meaning is clear.
- Task 03: `updatedInput` carries the full tool input and may overwrite another hook's rewrite. Unverified multi-hook ordering; fx is the only Agent rewriter in the owner's setup.
- Task 03: catch blocks use `e.message`; a thrown `null` would crash to the deny handler. `route()` is local pure code that cannot throw a non-Error; cheap to harden if the file is touched anyway.
- Task 04: dedupe before the 160-character cut; a ruling over 160 characters loses its Why (two lines); a Standing rulings section with zero rulings is not reported. All follow from the ruled caps.
- Task 05: SURFACE.md does not document `companions`. SURFACE.md documents no `.fx.json` key at all; README does document it.
- Task 05: `false`, `null` or `0` yields the default line. Matches ADR-0032's stated rule.
- Task 05: warning embeds up to 80 characters of `err.message`, which can quote file content or a newline. Low impact (the repo's own file, shown to that repo's session); normalise whitespace if touched.
- Task 05: ENOTDIR shows the warning. Correct behaviour.
- Task 06: three items (spike exemption lives in ADR-0033 and the checklists, ADR sub-headings, red-flag row position). Harmless.
- Task 07, 08, 09: unwrapped long lines; web-polish.md at 55 lines; ADR-0034 "this task" and commit hashes. Cosmetic.
- Task 10: INSTALL.md:398 attribution, the nightly note for `@latest` row 09, free-row log paths. Record-keeping; the 2.x decision is the owner's (ruled).
- Coverage audit G2: not a gap. fix-loop.md:98 and ADR-0030 already say "every open finding came from the task reviewer"; "none from a tripwire lens" only repeats it.
- Coverage audit G4 (a) to (c): now ledgered as Rulings (the three lines at the end of state.md). (d) is the `fable` fix above.
- Coverage audit G5, G6: Needs you in the completion report, as ledgered.

## Recommendations

- Run the fix wave as one fixer: Important 1 to 3 plus the eight carried must-fix items touch about ten files, mostly one line each. Then one scoped re-review, then the `check-all` tail.
- Put the `## Log` heading convention into the ledger's first-line description in SKILL.md §4, so every ledger has a predictable shape for parsers and humans alike.
- For fx's own builds, consider a `repo.md` note that Markdown under `skills/` and `agents/` is production code, so the controller re-review cap means something here.

## Assessment

**Ready to merge?** With fixes

**Reasoning:** The code is sound and well tested, but the exit gate has not completed (a failing version gate and every install and conformance gate after it unrun), and two design rules (task-mode lens scoping, the standing-rulings boundary) are not enforced by what shipped.

## Ledger lines

Task 02: minor (deferred): fix-loop.md excludes **/*.md from the production-line count, so in Markdown-first repos such as fx every fix qualifies for controller re-review
Task 05: minor (deferred): a custom companions string in .fx.json is uncapped and can break the 9,000-character preamble budget the tests pin only for the default
Task 03: minor (deferred): ADR-0031 says a routing failure produces no output; since 809d811 the hook writes a trace to stderr
