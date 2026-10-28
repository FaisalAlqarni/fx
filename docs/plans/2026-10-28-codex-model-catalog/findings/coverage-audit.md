# Coverage audit: design commitments vs task acceptance criteria

Scope: design.md (10 stories, Implementation Decisions, Testing Decisions, Global Constraints, anti-goals) against tasks 01 to 06 and state.md. Branch code checked at 8ef0ec2. Read-only; the proof protocol is excluded as instructed.

Result: 6 gaps. Stories 6, 8 and 9 and the core of 1, 2, 3, 4 are carried. The gaps are at the seams between pieces.

## G1. User-named slugs never reach setupCatalog from fx-setup (stories 2, "Which slugs")
Design: slugs are the config model "plus any slugs the user names to fx-setup". Task 02 tests `setupCatalog({ slugs })` directly. Task 04 specifies the section 6 command as `setupCatalog()` with no arguments and has no criterion that a user-named slug is passed. This is the "satisfied by calling it directly" pattern.
Landed: `commands/fx-setup.md:290` calls `setupCatalog({})`. state.md logs it as a deferred minor for task 04. A user whose config model is first-party but who wants a catalog for `anthropic/claude-haiku-4.5` gets `skipped` and no way to name the slug. The CLI accepts `[slug...]` but fx-setup never uses it.
Tasks: 04 (needs an input path for slugs plus a root-check test), 02 (CLI exists, fine).

## G2. A re-run after a model change can leave a stale entry, silently (story 10)
Design: "a re-run of fx-setup rewrites the entry it generated, so a stale entry does not silently describe the old model." Task 02 tests the rewrite only when the new model is still third-party. When the user moves to a first-party model or removes the provider, `setupCatalog` returns `skipped`; the old `fx-<provider>.*` files stay, and the report says only "no catalog was needed". Nothing tells the user an fx profile for the old model still exists, and nothing says a model change requires re-running fx-setup (no story or criterion owns that trigger).
Tasks: 02 (stale-file case), 04 (report line).

## G3. Report wording is a criterion with no assertion (stories 3, 5; anti-goal on dropped metadata)
Story 5 and the anti-goal need the report to say: the profile replaces the remote model list, a cloned context window is a guess, the Anthropic-on-OpenRouter write limit, and that kept or refused files were left alone. The codex.md half is tested (task 06, `Tool vocabulary` contains `anthropic/`). The report half is agent prose from `commands/fx-setup.md`; task 04's tests assert JSON keys only, and acceptance criteria 2 ("report states the replaced model list and the write limit") has no check. state.md records "no root-check test for catalog kept or refused output" as deferred. A rule and its surfacing: the rule is tested, the surfacing is not. Cheapest carrier: a gate test that greps the section 6 text for the four statements.
Tasks: 04.

## G4. Task 06 asserts an owner decision the design says is open
Design Open Questions: write visibility for Anthropic models is "Deferred to the owner"; "without a decision, the design ships with that limit stated". Task 06 and ADR 0065 (line 19) state "The owner accepted shipping with this limit on 2026-10-28" and make that an acceptance criterion. No design story states the acceptance. Either the date is fabricated from the ship-by-default clause, or a decision happened that the design was never updated to record. Also codex.md omits the acceptance (deferred minor), so the two documents differ.
Tasks: 06 (reword to "shipped with this limit by default, owner decision pending" or update design.md with the actual decision).

## G5. Assumption no story states: `codex debug models` sees the provider's list from inside fx-setup
Design: fx-setup runs `codex debug models`, which "refreshes from the provider as Codex does at every start". That needs `codex` on PATH, the provider key in the environment of the shell fx-setup runs in, and network and write access under Codex's sandbox. Tasks 02 and 04 only test stubbed `listModels`/`codex`. If the key is absent, Codex returns its cached or fallback view; the result is a catalog with the wrong context window and no `cloned` flag when the slug is merely missing from a stale cache, or a clone (272000) when absent. No criterion covers an unreachable provider, and the report cannot tell the user why. The conformance runner (task 05) does handle the key through with-key.sh, so only the user path is open.
Tasks: 02 (detect and report), 04 (report text, sandbox note).

## G6. "A field rename shows up as a refusal or startup error" has no owner
Out of Scope claims drift in other Codex versions surfaces loudly. No task checks `codex --version` against 0.164.0 or validates the field set; `buildCatalog` copies whatever Codex reports and flips two keys. The vendored fallback (state.md ruling) is stale on a later Codex with "nothing automatic" catching it. The claim is a design commitment with no carrier.
Tasks: 01 or 02 (version note in the report), or drop the claim from design.md.

## Checked and carried
- Story 1/4: flags set, freeform tool type (task 01 test); delivery is proof protocol.
- Story 2: files plus printed `codex --profile` line (tasks 02, 04 tests).
- Story 3: config.toml byte-identical, kept/symlink cases (tasks 02, 04).
- Story 6, 7, 8: task 03 (absolute path exists on disk, byte-identical other renders, codex session and subagent fixtures).
- Story 9: task 05 (profile flag, per-row generation, failure case).
- Refusal criteria in task 01 and 02 have positive counterparts (flip, clone, rewrite).
- Hooks trust instruction retained: kept in text, untested, but unchanged prior behaviour.
