# fx ledger: plan: docs/plans/2026-10-28-codex-model-catalog/plan.md

## Standing rulings

None: docs/plans/rulings.md does not exist.

## Log

Workspace: /development/fx/.worktrees/codex-catalog on codex-catalog (base main ce1fb19); the owner named it as the worktree. scripts/setup ran under scripts/scratch-env (npm ci ok). .fx/ is git-ignored.
Ruling: plan handoff took "Start implementing" without the red-team pass that fx-plan section 7 recommends for the HIGH risk (profile replaces the model list). Why: the owner pre-selected "Start implementing" and is away. Cost if wrong: a plan defect found later, caught by the per-task reviews and the final branch review with devil's advocate.
Ruling: an unknown slug's fallback clone takes Codex's instructions from a vendored copy of rust-v0.164.0 models-manager/prompt.md (task 01), non-ASCII escaped. Why: no Codex command prints the fallback instructions and Codex rejects an entry without them (protocol/src/openai_models.rs deserialize_model_infos_with_legacy_base). Cost if wrong: a stale copy on a later Codex, caught by nothing automatic; the design pins 0.164.0.

Pre-flight scan:
| Pair or task | Produces / Consumes | Found |
|---|---|---|
| 01 / 02 | 01 produces buildCatalog, loadFallback, CATALOG_MARKER in src/lib/codex-catalog.ts; 02 consumes them, same file and test file | consistent names; 02 edits after 01, serial |
| 02 / 04 | 02 produces setupCatalog(): SetupReport; 04 requires lib/codex-catalog and reads skipped, profile, command | consistent |
| 02 / 05 | 02 CLI exit 0 written, 3 nothing written, 1 error; 05 fails the row on non-zero | consistent; under OpenRouter the config model is always third-party |
| 03 / 06 | 06 cites src/lib/preamble.ts ADDRESSING and PREAMBLE.md | consistent |
| 04 / 06, 05 / 06 | 06 cites fx-setup report and live.sh | consistent |
| 01 | tests vs files: test in check-all, fallback json, notices | agrees |
| 02 | live check needs no key (catalog replaces the fetch) | agrees |
| 03 | only codex fixtures re-recorded; equivalence test gains root normalisation | agrees |
| 04 | one fenced plant-roles block kept, as fx-setup-root-check requires | agrees |
| 05 | key only via with-key.sh inside the jail | agrees |
| 06 | Amended-by form, per ADR 0045 and 0063 | agrees |
Task 01: dispatched b267e47 2026-10-27T23:11:10Z
Waiting on task 01 implementer (dispatched agent); the frontier holds 03, but implementers run serially.
Task 01: review dispatched (standard tier)
Task 03: dispatched 264f806 2026-10-27T23:13:58Z
Task 01: confirmed ⚠️ resolved: the two check-prose failures were in plan-dir files; the controller fixed them in 264f806 (check-prose OK). RED evidence read at report line 7: module-absent RED, valid.
Task 01: minor (deferred): codex-catalog.test.ts:94 holds literal em and en dash characters in a shipped source file; use escapes.
Task 01: minor (deferred): THIRD_PARTY_NOTICES.md Codex row lacks copyright line and licence file reference for Apache-2.0.
Task 01: minor (deferred): the `# Skills` heading regex misses CRLF or trailing-space headings, so a skill contract could be overwritten.
Task 01: cost unavailable (no transcript recorded)
Task 01: complete (commits b267e47..38e07c4, review clean) files: src/lib/codex-catalog.ts, lib/codex-catalog.js, its test, codex/fallback-model-info.json, scripts/check-all, THIRD_PARTY_NOTICES.md
Ruling: task 03 raised the bootstrap-alone budget in src/lib/preamble.test.ts from 3,400 to 3,700 chars because the Codex render with two absolute paths is 3,531 in this checkout. Why: the design requires the absolute paths, and the spike measured that wording 3/3. Cost if wrong: a longer Codex bootstrap and a budget that a long install path could exceed, caught by the task 03 review and the final branch review.
Controller: removed a dash from findings/01-review.md:27 that the prose gate flagged.
Task 03: review dispatched (standard tier)
Task 02: dispatched 229af75 2026-10-27T23:16:16Z
Task 03: confirmed ⚠️ resolved: the findings/01-review.md dash was fixed by the controller before review (check-prose OK).
Task 03: minor (deferred): new Codex ordering and path assertions sit after the preamble.test.js OK log line; move above it.
Task 03: minor (deferred): the 3,700 bootstrap cap now loosens the guard for non-Codex harnesses; make it per harness.
Task 03: minor (deferred): RED run stopped at the first failing assertion, so the new ordering and path assertions were never seen failing.
Task 03: minor (deferred): Codex bootstrap cap has little margin for a long install path; note the assumption in the test.
Task 03: cost unavailable (no transcript recorded)
Task 03: complete (commits 264f806..229af75, review clean) files: PREAMBLE.md, src/lib/preamble.ts, preamble tests, codex render and hook-golden fixtures
Controller resumed 2026-10-28T02:19+03 after the previous controller was stopped. Task 02 had no commits past 229af75 and no report file; its implementer was stopped too, leaving an uncommitted diff in src/lib/codex-catalog.ts, its test and their lib builds (saved to .fx/<slug>/review/02-wip.diff), last written 02:17.
Ruling: task 02's uncommitted diff is finished by a fresh implementer briefed with it as a draft, not reviewed as is. Why: it has no report, no RED evidence, no live check and no commit, so a review would have nothing to check it against; discarding it would waste the work. Cost if wrong: the fresh implementer inherits a flawed draft, caught by the task 02 review against the task file.
Task 02: dispatched 229af75 2026-10-27T23:19:30Z
Task 02: implementer agent a4483f837564c9499 (fresh, sonnet)
Waiting on task 02 implementer; 04 and 05 block on 02, 06 on 04 and 05: frontier empty.
Task 02: implementer DONE_WITH_CONCERNS, commit 60a2fd1; RED obtained against the HEAD build in /tmp/claude-1000/fx-codex/notes/red02 (setupCatalog is not a function).
Ruling: task 02's live check stands on two substitutes, because Codex 0.164 rejects `codex --profile fx-openrouter debug models` ("--profile only applies to runtime commands"): `--profile fx-openrouter debug prompt-input` (exit 0, shows "### How to use skills") and `-c model_catalog_json=<catalog> debug models` (one Haiku entry, skills true, freeform; fx_generated accepted). Why: together they show Codex accepts both generated files; tasks 04 and 05 call only `codex debug models` without --profile. Cost if wrong: docs citing the rejected command, caught by the task 06 review (carried in its context) and the final review.
Ruling: the release-version gate (tests/gates/release-version.test.js, last step of test-scope and in check-all) fails because shipped files changed and .claude-plugin/plugin.json is still 0.7.0; the version bump is done once, after the final review fix wave and before the exit gate, by a dispatched implementer, not per task. Why: a version bump is a release step for the whole branch, and per-task bumps would conflict. Cost if wrong: the exit gate fails on that gate, caught by the exit gate itself.
Task 02: review dispatched (standard tier)
Task 04: dispatched 60a2fd1 2026-10-27T23:22:08Z
Task 04: implementer agent a948db777ac15b3a4 (sonnet). Waiting on task 02 review and task 04 implementer.
Task 02: minor (deferred): profile marker check fails on CRLF-saved profile files, which are then kept forever
Task 02: minor (deferred): rewrite path, 0600 mode on rewrite and two-run idempotency are not asserted in tests
Task 02: minor (deferred): new tests leave temp dirs behind
Task 02: minor (deferred): CLI calls process.exit right after stdout.write instead of setting exitCode
Task 02: ⚠️ release-version gate: covered by the version-bump ruling above; resolved at the exit gate.
Task 02: cost unavailable (no transcript recorded)
Task 02: complete (commits 229af75..60a2fd1, review clean) files: src/lib/codex-catalog.ts, lib/codex-catalog.js, src/lib/codex-catalog.test.ts, lib/codex-catalog.test.js; draft from the stopped implementer finished and kept
Task 04: implementer DONE, commit e5ae11d, SKILL.md 19701 bytes. Task 04: review dispatched (standard tier)
Ruling: no silent-failure lens on task 04. Why: the report's tripwire names a catch that puts the message into catalog.error in the printed JSON, which is neither empty nor log-only, so the lens table's tripwire cell does not match. Cost if wrong: a swallowed setup failure, caught by the task 04 reviewer (told to check it) and the final branch review.
Task 05: dispatched e5ae11d 2026-10-27T23:23:25Z
Task 04 reviewer a2008b6e952c7a32f; Task 05 implementer a60d09842430d07d3 (sonnet). Waiting on both; 06 blocks on 05.
Task 04: minor (deferred): setupCatalog is called with no slugs, so user-named slugs cannot reach it through the section 6 command.
Task 04: minor (deferred): no root-check test for catalog kept or refused output.
Task 04: ⚠️ resolved: controller ran skill-size (OK, SKILL.md 19701 bytes); check-generated, check-prose and user-invoked run again in check-all at the exit gate.
Task 04: cost unavailable (no transcript recorded)
Task 04: complete (commits 60a2fd1..e5ae11d, review clean) files: commands/fx-setup.md, skills/fx-setup/SKILL.md, fx-setup-root-check test (ts and js)
Task 05: implementer DONE, commit 320f88e. Task 05: review dispatched (standard tier) with fx-lens-security (mode: task; tripwire: key material crosses into the jail, shell). No silent-failure lens: the generator failure fails the row, which the tripwire cell does not match; the reviewer checks it.
Task 06: dispatched 320f88e 2026-10-27T23:28:20Z (task 05 review outstanding; 06 touches docs only)
Task 05 reviewer a785f4b4f67ebdccf, security lens a85f88fd66f87b4eb; Task 06 implementer a174ba2dfe1d306db (sonnet).
Task 05: minor (deferred): generator output is embedded verbatim in the fail message (live.sh:261); confirm with the security lens that it cannot carry the key.
Task 05: minor (deferred): openrouter.test.ts:34 substring check for "profile" is brittle; match a `profile =` line.
Task 05: minor (deferred): lens security: no scrub of the scratch home after a failed catalog setup (live.sh:258-263).
Task 05: minor (deferred): lens security: live_workdir replaces the EXIT trap set at live.sh:72; fragile, no leak.
Task 05: ⚠️ resolved: scope runs run again in check-all at the exit gate.
Task 05: lens security Important confirmed at live.sh:261 (quoted: || fail "codex catalog setup failed: $cat_out"; cat_out holds generator stdout+stderr, unscanned). Fix round 1 dispatched to the task 05 implementer (resume).
Ruling: task 05 fix round 1 runs while the task 06 implementer works. Why: 06 edits only docs (ADR, references, harness facts) and 05's fix edits only tests/conformance; their tests share no database, and each stages by path. Cost if wrong: a git index.lock collision or a stray staged file, caught by the task 06 review package (commit list and stat) and the round 1 re-review.
Task 06: implementer DONE_WITH_CONCERNS, commit d518bd0; report file not written: re-dispatched once (resume) to write it.
Task 04: confirmed ⚠️: scripts/check-tool-names fails on skills/fx-setup/SKILL.md:277-278 ("the `apply_patch` tool and fx sees its edits ... fx sees only `apply_patch` run in the shell"): 2 lines name a runtime tool in a skill body. Introduced by task 04 (e5ae11d), missed by its review. Task 04 reopened: fix round 1 to the task 04 implementer (resume); the owner's limit must still be stated in the fx-setup report.
Task 06: ran test_all (rule). Report written on resume. Ruling: the ADR 0020 and 0039 index rows read "current, amended by 0065"; left to the task 06 review. Why: no gate checks the status words and the row says what changed. Cost if wrong: an inconsistent index, caught by the task 06 review. Task 06: review dispatched (standard tier)
Task 04: fix round 1/5: controller re-review (14 lines): 1 addressed, 0 open (commit 93444e8)
Task 04: complete (commits 60a2fd1..93444e8 excluding 05 and 06 commits, review clean after fix round 1) files: commands/fx-setup.md, skills/fx-setup/SKILL.md
Task 06: minor (deferred): index rows 0020 and 0039 use "current, amended by 0065", a form the index does not use for 0045/0058; align later or keep.
Task 06: minor (deferred): codex.md Tool vocabulary states the heredoc limit without the owner's acceptance date, which only ADR 0065 carries.
Task 06: ⚠️ CX: line numbers come from research/codex-integration.md, not checked against Codex source; accepted as cited research.
Task 06: cost unavailable (no transcript recorded)
Task 06: complete (commits 320f88e..d518bd0, review clean) files: ADR 0065, ADR 0020 and 0039 amendments, ADR index, references/harnesses/codex.md, harness-facts test
Task 05: fix round 1 implementer DONE, commit 8ef0ec2; re-review dispatched (lens finding, so dispatched not controller). Coverage audit dispatched (standard tier).
Task 05: fix round 1/5 (1 addressed, 0 open: none; commits 93444e8..8ef0ec2)
Task 05: minor (deferred): live.sh:265 the scrub exit status on the setup-failure path is ignored, so a key redacted from the scratch home there is not named
Task 05: cost unavailable (no transcript recorded)
Task 05: complete (commits e5ae11d..8ef0ec2 excluding 04 and 06 commits, review clean after fix round 1) files: tests/conformance/lib/live.sh, live-openrouter.test.sh, openrouter test (ts and js)
Coverage audit: 6 gaps (findings/coverage-audit.md). Rulings:
Ruling: G1 (user-named slugs never reach setupCatalog from fx-setup; commands/fx-setup.md:290 calls setupCatalog({})), G2 (stale fx profile after a model change is not named), G3 (report wording unasserted) and G4 (design.md still lists the write-visibility decision as open; the owner accepted the limit 2026-10-28, per the owner's resume instructions) go to a new task 07. Why: each is a design commitment (stories 2, 10, 3 and 5, Open Questions) with no carrier, and each is a few lines. Cost if wrong: SKILL.md byte budget (19752 of 20000) overrun, caught by skill-size in task 07 and the exit gate.
Ruling: G5 (codex debug models from fx-setup needs the provider key in the user's shell; an unreachable provider yields Codex's cached view) is parked. Why: Codex itself needs that key to run the model, so a user with a working Codex has it; detecting staleness needs a provider call fx does not make. Cost if wrong: a catalog built from a stale cache, caught by nothing automatic; stated in the completion report.
Ruling: G6 (no check that Codex is 0.164.0 or that the field set matches) is parked. Why: the design pins 0.164.0 and ADR 0065 and codex.md name it; the earlier fallback ruling already records the cost. Cost if wrong: a later Codex rejects or misreads the catalog, which Codex reports at startup.
