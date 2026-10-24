# fx ledger: plan: docs/plans/2026-10-22-ts-migration/plan.md

## Standing rulings

(none: docs/plans/rulings.md does not exist)

## Log

Setup: worktree /development/fx/.worktrees/ts-migration on ts-migration from main a3c7ac6; .fx.json setup ran OK; .fx/ ignored. Harness CLIs present: claude 2.1.306, codex 0.155.1, opencode v2.0.18; node v20.20.0, npm 10.8.2.
Context: owner approved design, plan and red-team fold-in (2026-10-22) and asked for unattended execution, one sub-project after another.

Pre-flight scan (pairs sharing a file or interface):
| Tasks | Shared | Produces vs consumes | Found |
|---|---|---|---|
| 01 / 02 to 07 | src/lib/types.ts, lib/types.js | 01 creates (export {}), 02 to 07 append | serialized by edges 01>02>03>04>05>06>07: no overlap |
| 01, 04, 05, 06, 07, 10, 13 | scripts/check-all | each appends its new test lines | serialized (10 after 07, 13 after 12 after 10): no overlap |
| 01 / 08 | scripts/test-scope | 01 adds src mapping and --built-path in JS; 08 ports to TS | 08 blocked by 01: ok |
| 01 / 11 | scripts/test-scope.test.js | 01 adds cases; 11 ports file | 11 after 08 after 01: ok |
| 04 / 08 | parseFxJson | 08 no longer consumes it (red-team 7) | ok |
| 05 / 07 | src/lib/env.ts | 07 no longer extends it (red-team 5) | ok |
| 06 / 12 | tests/gates | 06 adds golden gate in TS; 12 ports the 26 existing | disjoint files: ok |
| 09 / 13 | fixture list | 09 leaves fixtures; 13 allowlists the same set plus Tailwind | consistent |
| 06 / 07 | guarded-load ruling | both keep try-wrapped typed require | consistent |
Per-task self-consistency: 01 to 13 read; files created match files committed; 06 plan row lists 02,03,04,05 while the task file says 05: equivalent through the chain.
Ruling: implementers run one at a time (shared /tmp fixtures and harness homes). Why: fx-implement serial rule. Cost if wrong: slower build only.
Task 01: dispatched d3c343a 2026-10-21T22:06:30Z
Task 01: implementer dispatched (opus, Capable because: toolchain spike). Waiting on it and on three planning agents for sub-projects 2 to 4 (main checkout, docs/plans/2026-10-22-{fx-judge-hooks,browser-agent,ts-tooling}); frontier has no other task (02 blocks on 01).
Ruling: owner forbids commits on main (2026-10-22). Main's a3c7ac6 (plan docs) was reset off main; it stays as the first commit of ts-migration. Sub-projects 2 to 4 get their plan docs committed in their own worktree branches, never on main.
Task 01 spike (scratch dir, esbuild 0.28.2, typescript 7.0.2, @types/node 20.19.43, node v20.20.0): (a) CONFIRMED: cjs build of `export const a = 1` imported by name from an .mjs file printed `a= 1`; (b) CONFIRMED: esm build using import.meta.url and top-level await ran, printed `esm 1 true` (run as .mjs); (c) CONFIRMED: tsc --noEmit with the task tsconfig exit 0 on (b) and on `import { a } from './x.js'` resolving to x.ts, exit 1 with TS2322 on a planted type error; (d) CONFIRMED: shebang source built with line 1 `#!/usr/bin/env node`, line 2 the banner, runs.

| # | What is guaranteed | Test | Type | Result | Evidence |
|---|---|---|---|---|---|
| 01 | build header, shebang order, missing-esbuild message, drift and mode comparisons, escape gate cases, type check pass and fail | `tests/gates/ts-toolchain.test.sh` | gate | PASS | `bash tests/gates/ts-toolchain.test.sh` |
| 01 | src/ paths route to the TypeScript gates plus the built file's commands; --built-path mapping | `scripts/test-scope.test.js` | gate | PASS | `node scripts/test-scope.test.js` |
| 01 | USER_INVOKED_LANES unchanged through the generated CommonJS | `tests/gates/user-invoked.test.js` | gate | PASS | `node tests/gates/user-invoked.test.js` |
Task 01: implementer DONE_WITH_CONCERNS (d3c343a..a57f18f); also bumped .agents/plugins/marketplace.json to 0.3.0 (codex-manifest gate requires it).
Ruling: TypeScript 7.0.2 (what "exact current" resolved to) is accepted. Why: spike and all gates pass on it. Cost if wrong: a 7.x-specific behaviour surprises a later task; caught by check-types in every scope run.
Ruling: check-ts-escapes line-by-line string/comment stripping is accepted as a marked shortcut. Why: false findings are clearable with ts-gate-ok; a missed finding needs a multi-line construct hiding `: any`, which tsc strict still types. Cost if wrong: one false gate failure; caught when it fires.
Ruling: stale generated output after a source is deleted is a real gap; task 13's hand-written JS gate also fails any file carrying the generated header whose named src/ source does not exist. Why: drift gate compares only files the build produced. Cost if wrong: a stale .js ships; caught by task 13's gate test.
Task 02: dispatched a57f18f 2026-10-21T22:14:44Z
Task 01: reviewer dispatched (sonnet); Task 02 implementer dispatched alongside (one review outstanding allowed). Waiting on both plus the three sub-project planners.
Task 01: minor (deferred): check-ts-escapes `any` rule misses `Map<string, any>`, `Record<string, any>`, `| any` and non-first parameters.
Task 01: minor (deferred): boundary ` as ` rule false-flags `import { a as b }` and `export { a as b }`.
Task 01: minor (deferred): check-generated does not flag orphaned generated files whose `src/` was deleted.
Task 01: minor (deferred): scripts/build target array uses a bare `&&` list under `set -e`; use an `if`.
Task 01: minor (deferred): ts-toolchain.test.sh runs `scripts/build` into the real repo root.
Task 01: ⚠️ resolved: spike (a) to (d) evidence is in this ledger (line written by the implementer) and the report's Spike section; reviewer ran npm ci and the clean-clone check itself (empty porcelain).
Task 01: cost unavailable (no transcript recorded)
Task 01: complete (commits d3c343a..a57f18f, review clean, 5 minor deferred)
Task 02: implementer DONE_WITH_CONCERNS (a57f18f..249e212); concern was the untracked task 01 findings file failing check-prose; fixed and committed by the controller (ebc464f, regex quote reworded).
Ruling: every reviewer and lens writes findings that pass `python3 scripts/check-prose <findings>`; reviewer dispatches say so. Why: findings files are committed and check-all runs check-prose over docs. Cost if wrong: a red check-all on an untracked findings file; caught by the next check-all.
Task 03: dispatched ebc464f 2026-10-21T22:18:50Z
Task 02: reviewer dispatched (sonnet). Task 03: implementer dispatched (opus, Capable because: security-critical guard). Waiting on both plus the three planners.
Task 02: minor (deferred): laneCheck is typed string-or-null for `file` but still throws on a truthy non-string; parse at the hook boundary in task 04.
Task 02: minor (deferred): DispatchInput is a plain Record, so arrays pass the guard; matches old runtime, note for tasks 06 and 07.
Task 02: minor (deferred): opencode-commands catch prints String(e) for a non-Error throw where the old code printed undefined.
Task 02: minor (deferred): toOpencodeAgent and toOpencodeV2Agent return types are inferred, not named; name them when the plugins migrate.
Task 02: cost unavailable (no transcript recorded)
Task 02: complete (commits a57f18f..249e212, review clean, 4 minor deferred)
Sub-project 3 plan written (main checkout docs/plans/2026-10-22-browser-agent, 7 tasks, uncommitted). Ruling: red-team SP3 together with SP2 once SP2's plan lands, so the assumed judge-client interface (askJudge, machineConfigSection, judgeEndpoint, escalate) is checked against SP2's real one. Cost if wrong: a later red-team pass; caught by that combined pass.
Ruling: task 03 gets fx-lens-security (mode: task) although the report says Tripwires: none. Why: the git guard parses shell commands to refuse unsafe git, which is the lens's shell-string trigger. Cost if wrong: one extra lens run.
Task 04: dispatched 3edac0a 2026-10-21T22:23:28Z
Task 03: reviewer (opus) and fx-lens-security (opus) dispatched; Task 04: implementer dispatched (sonnet). SP4 plan landed (17 tasks, main checkout, uncommitted); SP4 red-team dispatched. Waiting on those and the SP2 planner.
Task 03: review: spec ⚠️3, changes requested, C/I/M 0/1/2. Security lens: 0 findings (findings/03-lens-security.md).
Task 03: ⚠️ resolved: export-shape change breaks no caller (lens checked all seven require sites); build and check-all evidence is in the implementer report (ALL GREEN).
Task 03: fix round 1: Important: String(command) at src/lib/git-guard.ts lines 235 and 248 turns a throw on a Symbol input into an allow; restore the throwing conversion (template literal).
Ruling: when a fix round overlaps the next task in shared files (scripts/check-all here: task 03 fix adds its symbol test, task 04 adds fx-json), each writer stages only its own hunk. Why: the serial-edge assumption does not cover fix rounds. Cost if wrong: a hunk lands in the wrong commit; caught by the task reviewer's file list check.
SP2 plan landed (12 tasks, main checkout, uncommitted). Red-teams running for SP2, SP3 (with interface reconciliation) and SP4. Waiting on those, task 03 fix round 1 (check-all) and task 04 implementer.
Task 03: fix round 1 re-review (controller, 6 production lines): fixed, no new issues (findings/03-rereview.md)
Task 03: minor (deferred): RED used throwing stubs, not one broken rule as the brief asked.
Task 03: minor (deferred): src/lib/types.ts GuardVerdict comment names lib/git-guard.ts instead of src/lib/git-guard.ts.
Task 03: cost unavailable (no transcript recorded)
Task 03: complete (commits 0943f94..9b31c47, review clean after fix round 1, 2 minor deferred)
Task 04: implementer DONE_WITH_CONCERNS (9b31c47..fc6ece4). Concern 2: baseline comparison script lived outside the repo and fixture (d) mode 000 is applied at test time only; passed to reviewer to judge.
Task 05: dispatched 0fbd23c 2026-10-21T22:28:02Z
Task 04: review: spec ⚠️1, changes requested, C/I/M 0/2/2. Important: (1) no committed test reads tests/gates/fixtures/plan-state (equivalence unprovable from the repo); (2) fixture (d) has no mode 000 in git, so it exercises nothing.
Task 04: fix round 1 dispatched (resume implementer): commit the recorded outputs and a test comparing them, applying mode 000 at run time (skipped as root), wired into scripts/check-all.
Task 04: fix round 1 re-review (controller): fixed, no new issues (findings/04-rereview.md)
Ruling: the preamble-equivalence snapshot gets the same --record mode as task 06's golden gate, added by task 06 (same pattern, one place to learn it). Why: a PREAMBLE.md edit otherwise breaks check-all with no documented way to refresh. Cost if wrong: one red check-all after a preamble edit; caught by task 06's review.
Task 04: minor (deferred): preamble.ts replace callback `name` is an implicit any; annotate the parameters.
Task 04: minor (deferred): preamble.ts has a doubled blank line after the imports.
Task 04: cost unavailable (no transcript recorded)
Task 04: complete (commits 9b31c47..fb0eacf, review clean after fix round 1, 2 minor fixed in round)
Task 05: implementer DONE (fb0eacf..af521fb). Note: plant-roles uses export = {...} because esbuild named exports are getter-only and tests/gates/codex-hook-output.test.js overwrites isWritingToolCall on the cached module.
Task 06: dispatched cf3edb7 2026-10-21T22:32:15Z
Task 05: reviewer dispatched (sonnet). Task 06: implementer dispatched (opus, Capable because: guarded loads and golden gate).
SP4 red-team: 4 Critical, 11 Important, 10 Minor; all folded in by the SP4 planner (findings at scratchpad/redteam/sp4.md; Windows claim narrowed per I8).
SP3 red-team: 4 Critical (SP2 interface mismatches), 21 Important, 7 Minor; folded in by the SP3 planner except finding 32. Ruling: keep three browser backends. Why: owner's explicit decision to reuse installed Playwright/puppeteer. Cost if wrong: more backend code to keep equal; caught by SP3 task 03's contract tests.
Ruling: sub-projects 1 to 3 ship as one v1 on the single 0.3.0 bump from task 01; SP2 and SP3 do not bump again unless release-version fails, in which case the controller bumps the patch level in that plan's first task. Why: avoids the SP2 plan's stop-and-ask on the release gate. Cost if wrong: an extra version number; caught by release-version.
Task 05: ⚠️ resolved: check-all, install and conformance evidence is in the implementer report (ALL GREEN).
Task 05: minor (deferred): plant-roles.ts keeps 23 em dashes in comments inherited from the JavaScript; no gate scans src.
Task 05: minor (deferred): plant-roles.ts header comment still says Task 06 and names lib/plant-roles.js as the tested file.
Task 05: minor (deferred): CodexRole in types.ts is unused until task 06 and plantRoles does not use typed role definitions.
Task 05: minor (deferred): recordAgentIdentity takes agentType as string or null; the hooks migration must narrow the hook payload before calling.
Task 05: cost unavailable (no transcript recorded)
Task 05: complete (commits fb0eacf..af521fb, review clean, 4 minor deferred)
SP2 red-team: 3 Critical, 17 Important, 8 Minor; all folded in by the SP2 planner (scratchpad/redteam/sp2.md).
Ruling: SP2's .fx.json switch now disables only the judge step (hard rules always run), and the override stamp is honoured only after a later user prompt for the same command and never skips the harness ask. Why: as written, an agent or hostile repo could switch off or step around the guard. Cost if wrong: the owner wanted a stronger switch; reversible by design edit; caught by the owner reading the completion report.
SP4 fold-in done: 25/25 findings applied, 17 tasks, briefs compile. Ruling: each later sub-project gets its own worktree branched from the previous sub-project's branch head when it starts, with its plan dir copied in and committed there (never on main). Why: owner forbids main commits; SP2 to SP4 depend on the earlier branches' code.
Task 06: implementer DONE_WITH_CONCERNS (43e21a6..d7ce641): concerns: parser-lib load failure refuses; non-string cwd falls back to process.cwd(); stdin null treated as {} in Claude hooks. Sent to reviewer and fx-lens-security (hook behaviour change at a trust boundary).
Task 07: dispatched d7ce641 2026-10-21T22:43:05Z
Task 06: fx-lens-security: 1 Important (parseJson missing export fails open), 2 Minor (findings/06-lens-security.md); held for one combined fix round with the task review.
SP2 fold-in done: 28/28 findings, now 11 tasks (live rows moved to SP4 task 14). SP3/SP2 reconciliation (controller): every SP2 symbol SP3 consumes (loadJudge, askJudge, machinePaths, JudgeHandle, JudgeQuestion, JudgeAnswer, JudgeResult, EscalateReason, UnavailableReason, JUDGE_BUDGET_MS, startFakeSystemOne, scratchHookEnv, writeJudgeConfig, runHook, RawAnswer, FakeReply) is in SP2's export table; judgeEndpoint is SP3's own helper; SP3's remaining timeoutMs belongs to its driver and text model. No mismatch.
Task 06: review: spec ❌2, changes requested, C/I/M 0/2/6; reviewer reproduced the empty lib/json.js fail-open (force push exits 0), same as the lens Important.
Task 06: fix round 1 dispatched (resume implementer) with: lens Important 1 (export check on parseJson and parseClaudeHookInput), reviewer Important items, lens Minors 2 and 3 folded in as cheap.
Task 07: implementer DONE_WITH_CONCERNS (d7ce641..af9e3b6): four uncovered edge-case behaviour changes (failed parser load, non-string v1 filePath, non-object agent.general, v2 resource coercion). Reviewer and fx-lens-security dispatched.
Task 07: fx-lens-security: 5 Minor, 0 Important (findings/07-lens-security.md).
Task 06: fix round 1 DONE_WITH_CONCERNS (..2ada692): golden 40 cases; check-all ALL GREEN; RED reproduced the empty lib/json.js force-push allow.
Ruling: the four empty-export cases need only refuse (exit 2), not reproduce the git guard's message: the old hooks never loaded lib/json.js or lib/hook-input.js, so no old message exists for them; pinned in src/lib/hook-input.test.ts instead of the golden gate. Why: the invariant that matters is fail-closed. Cost if wrong: a refusal message changes unseen; caught by nobody (message text is not a safety property).
Ruling: fx-context loading lib/preamble inside the try (broken preamble now warns and exits 0 instead of crashing silently) is accepted. Why: it is the direction the review asked for and matches fx-codex. Cost if wrong: none to safety.
Task 07: review: spec ❌1 ⚠️2, changes requested, C/I/M 0/2/7 (reviewer rates v1 general grant and v2 string-resource/null-event as Important). Fix round 1 dispatched with both Importants plus lens Minors 1 to 5.
Task 06: minor (deferred): fx-context imports lib/hook-input and lib/json outside any try, so a failed load skips the no-preamble warning.
Task 06: minor (deferred): Codex refuses SessionStart and SubagentStart when the parser fails to load; untested and against its own comment.
Task 06: minor (deferred): the hook decision type named in the brief was not added to src/lib/types.ts.
Task 06: minor (deferred): ClaudeContextOutput and CodexHookOutput are structurally interchangeable.
Task 06: minor (deferred): non-string cwd changes the lane-check result for a recordable Write payload with no golden case.
Task 06: minor (deferred): golden gate spawnSync has no timeout, so a hanging hook hangs check-all.
Task 06: fix round 1/5 (5 addressed, 0 open: none; commits af9e3b6..2ada692)
Task 06: minor (deferred): golden gate meta field `stub` has no committed case using it.
Task 06: minor (deferred): src/lib/hook-input.test.ts spawns hooks without a timeout, so a hanging hook hangs check-all.
Task 06: minor (deferred): fx-context with a broken parser reports hookEventName SessionStart on a SubagentStart event, so the warning may not reach the subagent.
Task 06: cost unavailable (no transcript recorded)
Task 06: complete (commits 43e21a6..2ada692, review clean after fix round 1)
Task 07: fix round 1 DONE_WITH_CONCERNS (..6300bb5), check-all ALL GREEN; review Minors 1 and 6 left deferred.
Task 08: dispatched 6300bb5 2026-10-21T22:57:03Z
Task 07: minor (deferred): no test pins the fail-closed refusal when lib/opencode-input.js throws or loads without exports.
Task 07: minor (deferred): v2 lost the evaluate and forget-command failure notices for non-string edit resources and null after-events.
Task 07: minor (deferred): v2 comment at fx-opencode-v2.ts:47-48 says only shell is denied without the parser; every tool is refused.
Task 07: minor (deferred): an export-less lib makes plugin denial and preamble messages read "undefined".
Task 07: minor (deferred): v2 attempt() catches only native Promise rejections; old code caught any thenable.
Task 07: minor (deferred): v1 config, v2 ctx and permission events are typed by annotation, not parsed from unknown.
Task 07: minor (deferred): check-all ran in the foreground and was not rerun after the comment amendment.
Task 07: fix round 1/5 (7 addressed, 0 open: v1 malformed config throws into the config catch, v2 string skill resource denied and null before-event refused, thenable attempt, comment, export checks; commits ae1ef55..6300bb5)
Task 07: minor (deferred): v1 loads parseOpencodeV1Call with no type check, so an export-less parser still gives an "(undefined)" refusal message; the fix report claims it is checked.
Task 07: minor (deferred): an export-less or throwing lib/plant-roles.js leaves v2 READ_ONLY empty, so evaluate skips the read-only re-imposition (pre-existing on the throw path).
Task 07: cost unavailable (no transcript recorded)
Task 07: complete (commits d7ce641..6300bb5, review clean after fix round 1)
Task 08: implementer DONE (8fa500b..f9e5c22); report says no RED captured before porting and three malformed-input behaviour changes uncovered by tests.
Task 09: dispatched f9e5c22 2026-10-21T23:00:56Z
Task 08: review: spec ⚠️2, changes requested, C/I/M 0/2/3: non-array stacks now compiles a brief with None. and exits 0 (old exit 1); null timestamp now NaN (old 0), wallClockMs and --task window shift. Fix round 1 dispatched (resume implementer).
Task 08: minor (deferred): non-object JSONL line now exits 2 with a malformed-JSON message instead of crashing; no test pins it.
Task 08: minor (deferred): no RED captured for the port; add an old-versus-new malformed-input comparison when the tests migrate.
Task 08: minor (deferred): unused `catch (e)` bindings in build-cost.ts.
Task 08: fix round 1/5 (2 addressed, 0 open; commits f9e5c22..9741696)
Task 08: cost unavailable (no transcript recorded)
Task 08: complete (commits 8fa500b..9741696, review clean after fix round 1)
Task 09: implementer DONE_WITH_CONCERNS (779fa33..134edbe): 1660-input old-versus-new differential, 0 mismatches; check-all ALL GREEN. Concern: mcp-probe-server.js, merge-opencode-provider.js, verdict.js went 755 to 644.
Ruling: accept the 755 to 644 change on those three .js files. Why: controller grep found no caller that executes them directly; all run as `node <path>`; scripts/build sets 755 only for the extensionless trio by design. Cost if wrong: a direct ./x.js invocation fails with permission denied; caught by the conformance shell suites in check-all.
Task 10: dispatched 134edbe 2026-10-21T23:15:40Z
Task 09: review: spec ✅ ⚠️1 (paid rows), changes requested, C/I/M 0/1/4: nothing committed pins malformed-input behaviour (differential only in scratchpad). Fix round 1 dispatched: commit a recorded old-versus-new test.
Task 09: minor (deferred): `get()` helper copied into five scripts; move to `src/lib/json.ts` if a shared import is acceptable.
Task 09: minor (deferred): hand-built TypeError messages differ from Node's on stderr for malformed input; exit codes equal.
Task 09: minor (deferred): silent catch in `merge-opencode-provider.ts` and silent return in `mcp-probe-server.ts` kept without a shortcut comment.
Task 09: minor (deferred): `mcp-probe-server.ts` writes to any caller-named path; add a header note that it is not confined.
Task 09: fix round 1/5 (1 addressed, 0 open; commits 004b469..0b50f3d)
Task 09: cost unavailable (no transcript recorded)
Task 09: complete (commits 779fa33..0b50f3d excluding 004b469, review clean after fix round 1)
Task 10: implementer DONE_WITH_CONCERNS (gate 004b469, port 43b92d4): BRAINSTORM_OPEN=0 still opens (pre-existing; gate sets BRAINSTORM_OPEN_CMD=true); helper.js unused module.exports dropped; one user-visible message reworded to drop a dash. Reviewer and fx-lens-security dispatched.
Task 11: dispatched 43b92d4 2026-10-21T23:25:19Z
Task 10: fx-lens-security: 0 findings (findings/10-lens-security.md).
Task 10: review: spec ⚠️1, changes requested, C/I/M 0/1/3: gate does not assert the keyed response's Set-Cookie attributes. Fix round 1 dispatched.
Ruling: BRAINSTORM_OPEN=0 still enabling browser opening is pre-existing behaviour and stays as is in this migration (today's behaviour wins); listed for the owner as a follow-up fix outside this plan. Cost if wrong: a user who sets 0 still gets a browser; caught by the owner reading the completion report.
Task 11: implementer DONE (43b92d4..ec00468); nine tests ported, output identical to JS baseline, mutation checks fail, check-all ALL GREEN.
Task 11: ledger count check: findings list 5 Minor bullets, 3 ledger lines; read directly: the other 2 are no-action notes (dash edits in comments; plan-state check() argument type), not deferred work.
Task 11: minor (deferred): compile-brief.test.ts keeps `GATE_EXEMPT` string only to preserve the artifact-gate marker through esbuild.
Task 11: minor (deferred): plant-roles.test.ts calls `hooksTrusted()` with no argument; the old ignored argument was dropped.
Task 11: minor (deferred): four tests use `as [string, string][]` casts on literal tables instead of typed consts.
Task 11: cost unavailable (no transcript recorded)
Task 11: complete (commits 43b92d4..ec00468, review clean)
Task 10: minor (deferred): gate never runs with BRAINSTORM_HOST unset, so the 127.0.0.1 default bind is unpinned
Task 10: minor (deferred): server.cts and helper.ts keep raw JSON.parse with ts-gate-ok (standalone and browser); record as a parseJson carve-out
Task 10: minor (deferred): skills/fx-brainstorm/COVERAGE.md row 122 still calls server.cjs and helper.js copied verbatim
Task 10: fix round 1/5 (1 addressed, 0 open; commits ec00468..bf59b66)
Task 10: cost unavailable (no transcript recorded)
Task 10: complete (commits 004b469, 43b92d4, bf59b66; review clean after fix round 1)
Task 12: dispatched f336974 2026-10-21T23:32:19Z
Task 12: implementer DONE (f336974..68b77c1); 26 gates, equal assert counts, 26/26 mutations caught, check-all ALL GREEN.
Task 13: dispatched 68b77c1 2026-10-21T23:41:53Z
Task 12: ⚠️ resolved: mutation checks are in the implementer report (26/26 caught); reviewer ran every old and new gate under an assert-logging preload: identical first two arguments on every assert call.
Task 12: cost unavailable (no transcript recorded)
Task 12: complete (commits f336974..68b77c1, review clean)
Coverage audit: 8 gaps (3 Important, 5 Minor), findings/coverage-audit.md.
Ruling: gap 1 (24 em or en dashes in src/, check-prose scans only .md) goes to the final review fix wave: rewrite the dashes and extend a gate to scan src/ for them. Why: Global Constraint says no dashes in any file or comment. Cost if wrong: dash rule drifts on sources; caught by the extended gate.
Ruling: gap 2 (environment parser covers only CODEX_HOME) is accepted as amended by the red-team fold-in (tmpDir dropped as invented, index.ts self-contained). Cost if wrong: a later env read bypasses the parser; caught by review of the code that adds it.
Ruling: gap 3 (task 13 criteria omit check-all wiring and the stale-output rule) is checked by the controller against task 13's diff before review; both are in task 13's brief context. Cost if wrong: an unwired gate; caught by the task 13 review.
The audit's check-ts-escapes misses (generic and union any) duplicate task 01's deferred minor; they go to the final review fix wave.
Task 13: implementer DONE (ab2afb3..0624601); controller verified gap 3: gate and its test wired in scripts/check-all lines 40 and 41; stale-output rule at scripts/check-handwritten-js line 37 with test case at tests/gates/check-handwritten-js.test.sh line 56; gate OK on 115 files.
Task 13: minor (deferred): check-handwritten-js header comment ends in a dangling ADR path fragment.
Task 13: minor (deferred): ADR 0046 status line is at the end, ADR 0033 puts it at line 3.
Task 13: minor (deferred): gate test greps the loose substring 'tool' to prove a bash script is not reported.
Task 13: minor (deferred): gate test has no case for the vendored Mermaid or Tailwind allowlist globs.
Task 13: minor (deferred): build-case.test.ts adds an up-front throw that changes the failure mode on a missing test file.
Task 13: cost unavailable (no transcript recorded)
Task 13: complete (commits ab2afb3..0624601, review clean)
Final review: broad 0/2/9 With fixes, 6 carried must-fix; security lens 4 Minor; silent-failure lens 3 Important 3 Minor; devil's advocate 3 Important 5 Minor. Findings in findings/final-*.md.
Ruling: one fix wave with items A to I (.fx/2026-10-22-ts-migration/final-fix-list.md). Not in the wave: a CI job running check-all (owner's nightly workflow, needs harness CLIs); the stale-generated risk is closed locally by item H instead. Cost if wrong: a stale committed JS slips past a contributor who skips check-all; caught by check-generated in every scoped run after item H.
Ruling: bash 3.2 portability (item I) is fixed now, not deferred. Why: the owner uses macOS for portable work and stock macOS bash is 3.2.
Final fix wave: DONE_WITH_CONCERNS (92536d3..f032c61), 9 items, check-all reported ALL GREEN; concerns: any matched as any standalone token, bash 3.2 not run, {file} still spliced raw by the harness, --compare needs a git work tree.
Exit gate: scripts/check-all run by the controller on HEAD f032c61: ALL GREEN, EXIT=0, 87 steps (log scratchpad/sp1-exit-gate.log). CI (.github/workflows/conformance-nightly.yml) runs tests/conformance/run.sh <harness> --free, which check-all runs for all four harnesses. No failing test to classify.
Task 06: minor (deferred): fx-codex.ts:45 requires lib/plant-roles untyped with no export check, unlike every other fail-closed load.
Task 07: minor (deferred): v1 plugin checks neither USER_INVOKED_LANES nor parseOpencodeV1Call exports, while v2 checks both.
Task 13: minor (deferred): check-handwritten-js accepts a header naming any existing src/ file without checking it builds to that path.
Task 11: minor (deferred): seven test-file require calls are untyped, so those tests call module APIs through any.
Task 12: minor (deferred): about 40 test lines use JSON.parse with ts-gate-ok as a blanket pass, walking any by field name.
Task 01: minor (deferred): env.ts header claims it is the only environment read; index.ts, server.cts and fill-template.ts read process.env directly.
Task 07: minor (deferred): isRecord and str are copied across three parsers, with three result shapes where one generic would do.
Task 13: minor (deferred): README layout and Development section omit src/, npm ci and scripts/build.
Task 13: minor (deferred): ADR 0046 names only Mermaid as vendored, not the allowlisted Tailwind play files.
Plan: final review fix wave (9 addressed, 0 open: none; commits 92536d3..f032c61)
Task final: minor (deferred): check-ts-escapes opens block-comment tracking on a `/*` inside a regex or multi-line template literal, so later lines go unchecked until a `*/`.
Task final: minor (deferred): .fx.json test_one keeps going after a failed check-generated and fails only because make-git-fixture refuses an empty B; an exported B would let the test run and pass.
Plan complete: tasks 01 to 13 complete, 0 parked, final review fixed
