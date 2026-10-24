# Preflight conflict scan: judge across fx

Scope: plan.md, design.md, tasks 01 to 13, read-only. Verified against the worktree where a task names an existing symbol (decision-log.ts, preamble.ts, the fx-review lens table, tests/lane-triggering/prompts, references/stacks).

Notation: "P:" is what task A produces, "C:" is what task B consumes. A union written in the source is shown with "or" so the table stays valid.

## 1. Pair table (shared file or interface)

Universal files, one grouped row: `scripts/check-all` and `src/scripts/test-scope.ts` (and the generated `scripts/test-scope`) are edited by almost every task (01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 13; 04 conditionally). plan.md states the tasks run as one chain in number order, so no pair is listed for these two files alone. Only anchored risk: any task run out of order conflicts on these two.

| # | A | B | Shared file or symbol | A produces vs B consumes | Finding |
|---|---|---|---|---|---|
| 1 | 01 | 02 | `src/lib/judge-features.ts` and `.test.ts`; `parseLabelledSet`; `scoreFeature` | P: `FEATURE_GATE` all `log-only`, `REFUSING_RULES` `[]`, `JUDGE_CONCURRENCY` `sequential`; C: "the measured values of `FEATURE_GATE`, `REFUSING_RULES` and `JUDGE_CONCURRENCY`" | Match. 01's "task 02 replaces this assertion with the tie to `scores.md`" matches 02's Files line. Set shape detail: 01's `parseLabelledSet('edit-rules', [{ id, rule, path, added, breach: 'yes' }])` expects `entry 0 has no boolean breach`, but 02's shape also requires `scope` ("line" or "file"); the entry has no `scope`, so the reported reason depends on check order (see C14). |
| 2 | 01 | 03 | `src/lib/types.ts`, `decision-log.ts`, `judge-features.ts` (`gateOf`), `judge-questions.ts`, `references/harnesses/codex.md`, `hook-env.ts` | P: `UnavailableReason` gains `'circuit-open'` and `'deadline'`; `LANE_FIRST_QUESTIONS`, `laneAfterFirst`, `laneHintState`, `KIND_LANES`; event `lane-hint`, field `answer`. C: same names | Match. 03 test 1 `state` `{ prompt, cwd: <repo base name>, harness: 'claude-code' }` equals 01 `laneHintState` `{ prompt, cwd: path.basename(cwd), harness }`. `criteria` key order build, change, failure, review, writing, other equals 01 option order. |
| 3 | 01 | 04 | `references/harnesses/opencode-v2.md` "Shell guard" | P: paragraph `^(MEASURED or UNVERIFIED) 2026-10-dd on <tool> <ver>:` about await; C: `V2_AWAITS_BEFORE` "equals whether the 'Shell guard' section ... holds a paragraph starting `MEASURED` that says the promise is awaited" | Mismatch risk: a MEASURED "not awaited" paragraph also contains the word "awaited". 01 fixes no exact phrase for either outcome. See C6. |
| 4 | 01 | 05 | `references/harnesses/opencode.md`, `opencode-v2.md` | P: "Subagent dispatch" (opencode.md), "Subagent dispatch" and "Shell guard" (opencode-v2.md); C: 05 adds to "Plugin events fx reads" and "Turn boundary and health line" | Match (different sections of the same files). 01's gate pins only the sections it names. |
| 5 | 01 | 06 | `DispatchKind`, `DISPATCH_KIND_QUESTION`, `dispatchState`; harness reference "Subagent dispatch" | P: `dispatchState(ti)` gives `{ subagent_type, description, prompt }`, default `general-purpose`; C: 06 test 1 `state` `{ subagent_type: 'general-purpose', description: 'find callers', prompt: <prompt> }` | Match. 06's reference sentence `fx does not size dispatches here:` goes under 01's "Subagent dispatch" paragraph; 01's gate regex only checks the first paragraph, so both can coexist. |
| 6 | 01 | 07 | `EditRule`, `editRuleQuestion`, `editRuleState`, `noulVerdict`, thresholds, `refusingRule`, `concurrencyOf` | P: `editRuleState(relPath, added, file?)`; `EDIT_TEXT_CHARS` 2000, `EDIT_FILE_CHARS` 4000. C: `editRuleState(rel, added, after ?? ...)`; test 16 expects 2,000 and 4,000 | Match on signatures. Key-name mismatch: 01 calibrates with `{ breach: editRuleQuestion(...) }`, 07 sends `r0`, `r1` (see C1). |
| 7 | 01 | 08 | `references/harnesses/opencode-v2.md` | P: "Subagent dispatch", "Shell guard"; C: 08 adds "Tool vocabulary" and an "Edit rules" paragraph under "Shell guard" | Match, but 01's regex for "Shell guard" requires the first paragraph to be the dated fact; 08's new "Edit rules" paragraph must come after it. Not stated in 08. |
| 8 | 01 | 09 | `EditRule`, `REFUSING_RULES` | P: `EditRule { id; glob; rule; scope?: 'file' }`, `REFUSING_RULES: readonly string[]`; C: same | Match. |
| 9 | 01 | 11 | `focusQuestion`, `AUTHORED_QUESTION`, `lensFocus`, `diffState`, `authoredState`, `unitState`, `noulVerdict`, `choiceVerdict`, `gateOf`, `concurrencyOf`, `REVIEW_*` | P: `diffState(chunk)` gives `{ change: chunk }`; `authoredState(relPath, head)`; `unitState(relPath, name, text)`. C: 11 uses all with the same names | Match. 11 test 52 `state.function` is `show` equals `unitState` field `function`. Keys differ from calibration: 01 uses `hit`, `origin`, `flag`; 11 uses `q0`, `q1` for tripwires and search (C1). |
| 10 | 01 | 12 | `skills/fx-review/SKILL.md` lens table | P: `lensFocus` parses the table rows whose first cell starts with `fx-lens-`; C: 12 "the lens table rows are unchanged" | Match. Verified in the repo: five rows, `fx-lens-a11y` and `fx-lens-pipeline` read `no`, three have `tripwire:` text; 11 test 47 lists exactly those three. |
| 11 | 01 | 13 | `FEATURE_BARS`, harness facts | P: `FEATURE_BARS[f].bar`; C: 13 gate "its bar equals `FEATURE_BARS[feature].bar * 100` followed by `%`" | Mismatch in the table format 13 reads: see pair 18 and C4. |
| 12 | 02 | 03 | `judge-features.ts`, `judge-features.test.ts` | P: measured `FEATURE_GATE['lane-hint']`; C: `featureMode` calls `gateOf` | Match. Both tasks edit `judge-features.test.ts`; 03's `featureMode` cases use `FX_FEATURE_GATE` overrides so they hold for any measured value. |
| 13 | 02 | 06 | `FEATURE_GATE['dispatch-sizing']`; `sets/dispatch-sizing.json` `kind` | P: `kind` is a `DispatchKind`; C: 06 asks `DISPATCH_KIND_QUESTION` | Match. 06 Blocked by lists only 03 but consumes 02 (transitive through 03). |
| 14 | 02 | 07 | `REFUSING_RULES`, `JUDGE_CONCURRENCY`, edit-rules gate | P: "`REFUSING_RULES` ... `[]` when the `edit-rules` feature row is `log-only`"; C: 07 step 6 "gate `log-only` allows. Else a breach of a rule for which `refusingRule(id)` is true refuses" | Consistent but see C2: a rule that cleared its own bar cannot refuse if the aggregate row fails, which conflicts with plan.md's "a judged rule refuses only when its own labelled items cleared". |
| 15 | 02 | 09 | `sets/edit-rules.json` and `RULE_CATALOGUE` | P: eight ids and rule texts; C: 09 test "ids of `RULE_CATALOGUE` are exactly the ids in `sets/edit-rules.json`" | Match: rails-fk-index, rails-no-rescue-nil, dotnet-no-blocking-async, dotnet-no-empty-catch, react-no-raw-html, react-key-not-index, docker-pinned-base, web-img-alt equal 09's eight entries and texts. Scope: set uses "line" or "file", catalogue uses absent or `'file'`; mapping unstated but testable. |
| 16 | 02 | 10 | `languageOf` | P (10): `languageOf(filePath)`; C (02): "in at least 5 of the 13 language families" for `review-search.json` | Mismatch: 02 runs before 10 and does not list `languageOf` as consumed or 10 as a blocker. See C10. |
| 17 | 02 | 11 | `FEATURE_GATE` rows for review-*, `JUDGE_CONCURRENCY`, set shapes | P: `review-tripwires` rows with `lens` among security, database, silent-failure; C: 11 asks only lenses with a non-null tripwire | Match (three lenses). `review-search` has five lenses, 11 `search` accepts any `lensFocus` key. |
| 18 | 02 | 13 | `scores.md` rows and ADR 0048 table | P: scoreRow format `\| f \| accuracy \| 88% \| confident 25/25 \| unsure-clean n/a \| bar 85% \| enabled \| median 100 ms \| max 100 ms \|` (9 cells); C: ADR header `\| feature \| metric \| value \| confident \| unsure-clean \| bar \| gate \|` (7 cells) "copied from `scores.md`", and gate "bar equals ... `85%`" | Mismatch: 9 cells vs 7, and cell text `bar 85%` vs `85%`; a `not measured` row has an empty bar cell, which fails the bar check. See C4. |
| 19 | 03 | 04 | `src/lib/shell-guard.ts`, `shell-guard.test.ts`; `askJudgeWithBreaker` `'guard'` | P (03): breaker moved out of `shell-guard.ts`; C (04): modifies the judge-deny text in the same file; Risks cite "`askJudgeWithBreaker` with `'guard'`, task 03" | Mismatch: 04 Blocked by is only 01, yet it edits a file 03 restructures and cites 03's function; 04 Tests say `node lib/shell-guard.test.js` "gains" cases but its Files and `git add` omit `src/lib/shell-guard.test.ts` and `lib/shell-guard.test.js`. See C8. |
| 20 | 03 | 05 | `decideLaneHint`, `LaneHintInput` | P: `decideLaneHint(input: LaneHintInput, judge?: JudgeHandle): Promise<string or null>`, `LaneHintInput { harness; sessionId; cwd; prompt; now }`; C: `decideLaneHint({ harness: 'opencode', sessionId, cwd, prompt, now })` | Match. 05's expected line `[fx] lane hint: fx-brainstorm` (opencode) vs 03's `fx:fx-brainstorm` (Claude) and `$fx:fx-brainstorm` (Codex) depends on `laneAddress`, which is per harness (verified in preamble.ts line 79). |
| 21 | 03 | 06 | `featureMode`, `askJudgeWithBreaker` `'features'`, `hooks.dispatch_sizing`, `types.ts` | P: `featureMode(feature, cwd)` returns off, log-only or enabled; C: 06 rule 2 "`featureMode('dispatch-sizing', cwd) === 'off'`" | Match. |
| 22 | 03 | 07 | `types.ts`, `fx-json.ts`, `repo-config.ts`, `fx-turn.ts`, `fx-codex.ts`, `codex-hook-output.test.ts`, `commands/fx-setup.md`, `judge-features.test.ts` | P: `readRepoConfig` returns `{ hooks, checks }` with `HookSwitches` six booleans; C: `readRepoConfig(cwd): { hooks: HookSwitches; checks: CheckCommands; rules: EditRule[] }` | Match (plan.md lists the widening as 03 then 07). 07 says it consumes `featureMode` but its algorithm reads `readRepoConfig(cwd).hooks.editRules` and the gate separately; equivalent, not a defect. |
| 23 | 03 | 09 | `commands/fx-setup.md`, generated `skills/fx-setup/SKILL.md` | P: `hooks` row mentions `lane_hint`, `dispatch_sizing`, `edit_rules`; C: 09 adds `## 8.` before `## What setup deliberately does not create` | Match. Three tasks (03, 07, 09) regenerate the skill; each must run `python3 -I scripts/gen-command-skills`; all three say so. |
| 24 | 03 | 11 | `createRunBreaker` | P: `createRunBreaker(handle: JudgeHandle): (state, questions) => Promise<JudgeResult>`; C: "every request this command makes goes through one run breaker" | Match. |
| 25 | 04 | 05 | `fx-opencode-v2.ts`, `V2_AWAITS_BEFORE`, `opencode-v2.md` | P: `const V2_AWAITS_BEFORE: boolean`; C: 05 tests branch "when `V2_AWAITS_BEFORE` is true" | Interface gap: a build-time `const` has no `FX_TEST` override (unlike gate, rules, concurrency), so the branch not matching the measured fact cannot be tested. See C6. |
| 26 | 04 | 06 | `references/harnesses/opencode-v2.md` | P: edits "Shell guard"; C: edits "Subagent dispatch" | Match (different sections). |
| 27 | 04 | 08 | `fx-opencode-v2.ts`, `V2_AWAITS_BEFORE`, `execute.before` | P: branch A makes `execute.before` do `await guardShell(...)`; C: 08 "the callback throws synchronously with the no-dashes message" | Mismatch: an `async` callback cannot throw synchronously; the edit branch must run before the first await in a non-async function. See C7. |
| 28 | 05 | 06 | `references/harnesses/opencode.md`, `opencode-v2.md` | P: 05 edits other sections; C: 06 "Subagent dispatch" | Match (different sections). |
| 29 | 05 | 08 | `fx-opencode-v1.ts` (`chat.message` vs `tool.execute.before`), `fx-opencode-v2.ts` (prompt hook vs `execute.before`), queue, `opencode.md`, `opencode-v2.md`, `opencode-input.ts` | P: `queue.enqueue(session, line)`; C: 08 `advise` "enqueues the reason for the session" | Match. Both tests read the queue through `experimental.chat.system.transform` (1.x) and `context` (2.x). |
| 30 | 06 | 07 | `src/hooks/fx-pretooluse.ts`, `types.ts` `ClaudePreToolUseOutput` | P: `hookSpecificOutput` may carry `updatedInput?` and `additionalContext?`; C: 07 advise prints `{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"<reason>"}}` | Match. Different tool names (Agent vs Write family); the write branch must not clash with 06's async Agent branch handlers. 06 installs `uncaughtException` handlers "in this branch"; 07 installs its own after the lane check; neither says how two handlers coexist. Low risk. |
| 31 | 06 | 08 | `references/harnesses/opencode.md`, `opencode-v2.md` | P: "Subagent dispatch"; C: "Plugin events fx reads", "Tool vocabulary", "Shell guard" | Match (different sections). |
| 32 | 06 | 13 | `docs/adr/0031-model-routing-is-held-by-a-hook.md` | P: sizing rule in claude-code.md "Model tiers"; C: 13 adds `Amended by ADR 0048: a judged sizing step can lower a general sonnet dispatch to haiku.` | Match. |
| 33 | 07 | 08 | `src/lib/edit-rules.ts`, `.test.ts`; `checkEdit`, `changedFiles`, `decideStop` `notice` | P: `checkEdit(input: EditCheckInput, judge?): Promise<EditRuleDecision>`; `decideStop` returns `{ text; notice }`; C: 08 `checkEdit({ harness: 'opencode', sessionId, cwd, toolName: tool, toolInput: args, now })`; adds sync `checkBuiltins` | Match. Verified callers of `decideStop` destructure `{ text }` (fx-turn.ts line 80, fx-codex.ts line 413, fx-opencode-v1.ts line 492), so the widened result compiles. 07's `changedFiles` already lists opencode names (`filePath`, `oldString`, `newString`, `patchText`) which 08's 1.x tests use; for 2.x 08 says "if they differ". |
| 34 | 07 | 09 | `BUILTIN_RULES`, `.fx.json` `rules` parser, `commands/fx-setup.md`, generated skill | P: id regex `/^[a-z0-9][a-z0-9-]{0,39}$/`, glob at most 200, rule at most 300; C: every `RULE_CATALOGUE` entry passes the parser | Match: longest id `dotnet-no-blocking-async` is 24 characters, longest rule 82. 07 adds a `rules` row, 09 adds section 8; both edit the same file in order. |
| 35 | 07 | 13 | `FX_JSON_NOTICE` | P: `FX_JSON_NOTICE` string; C: 13 Interfaces "Consumes (task 07): `FX_JSON_NOTICE`" | Orphan: nothing in 13's Tests or produced text uses it (the gap sentence is a different string). Harmless. |
| 36 | 08 | 13 | `INSTALL.md` "### The guard" under opencode 2.x | P: 2.x edit-rule behaviour and GAP text; C: 13 "what runs on 2.x per task 04, 05 and 08" | Match, no gate pins the INSTALL text for 2.x (13's gate checks only the switches and `judge-cli.js" rules` string). |
| 37 | 09 | 13 | `judge-cli.js" rules` | P: 09 fx-setup text contains `lib/judge-cli.js" rules`; C: 13 INSTALL contains `judge-cli.js" rules` | Match. |
| 38 | 10 | 11 | `reviewUnits`, `ReviewUnit` | P: `reviewUnits(filePath: string, source: string, changedLines: number[]): ReviewUnit[]`; C: `reviewUnits(path, source, <all added lines>)` | Match. `ReviewUnit.name` is `string or null`; 11's `search` output uses `name: string or null`. |
| 39 | 11 | 12 | `lib/judge-review.js` CLI and JSON | P: `tripwires` `{ judge, named, add, unchecked }`; `authored` `{ judge, generated, authored, unchecked }`; `search` `{ judge, lenses }`; flags `--package --root --report --lens --harness`; C: same flags and fields, `--harness <this harness>` | Match. 12's "`"judge": "none"`, `"invalid"` or `"log-only"`" equals 11's four `judge` values minus `enabled`. |
| 40 | 11 | 12 | `skills/fx-review/SKILL.md` | P: 11 reads the lens table at `path.join(__dirname, '..', 'skills', 'fx-review', 'SKILL.md')`; C: 12 edits the same file | Match provided 12 leaves the table rows byte-identical (12 test says so). |
| 41 | 11 | 13 | `judge-review` mention in `README.md` | P: command exists; C: 13 README names `judge-review` | Match. |
| 42 | 12 | 13 | `README.md` "What the lenses are, and when they fire" | P: skills text; C: 13 one sentence | Match. |
| 43 | 05 | 13 | `INSTALL.md` 2.x text | P: 05's "no lane hint on 2.x" or the hint; C: 13 | Match, unpinned by a gate. |
| 44 | 04 | 13 | `INSTALL.md` 2.x text | P: rules-only or judged guard; C: 13 | Match, unpinned. |
| 45 | 03 | 13 | `README.md`, `INSTALL.md` switches | P: switches `lane_hint`, `dispatch_sizing`, `edit_rules`; C: 13 gate names all three | Match. |
| 46 | 01 | 10 | `scripts/scratch-env` | P: scratch-env; C: 10 "its `scripts/scratch-env` runs every test here" | Match (nominal dependency; 10 needs nothing else). |
| 47 | 02 | 12 | none | no shared file or symbol | Not a pair; listed to show it was checked. |

Pair rows with a real shared file or interface: 46 (row 47 is a negative check). Grouped universal row: 1.

## 2. Self-consistency per task

| Task | Agrees with itself? | What disagrees or is missing |
|---|---|---|
| 01 | Mostly | (a) `src/lib/judge-set-input.ts` has no test file in Files, though Tests specify two `parseLabelledSet` cases. (b) Second `parseLabelledSet` case lacks `scope`, which 02's shape requires; reason depends on check order. (c) Set `scope` is "line" or "file", `EditRule.scope` is absent or `'file'`; calibrate's mapping is unstated. (d) Calibration sends one question per request under keys `breach`, `hit`, `flag`, `origin`; hooks send pairs under `r0 r1` and `q0 q1`. (e) `laneHintState` needs `cwd` and `harness` in calibration; the script does not say which. (f) Test line "none is in `USER_INVOKED_LANES`" is ambiguous next to the lane named `none`. Everything else (Files, Interfaces, Tests, commit list) lines up. |
| 02 | Mostly | (a) Needs `languageOf` (task 10) for the "5 of 13 language families" count, not listed in Interfaces. (b) Step 5 runs `node scripts/judge-calibrate.js` with the owner's configured judge, outside `scratch-env`; under `scratch-env` there is no `judge.json` unless `--base-url` and `--model` are passed, and Global Constraints say every run goes through scratch-env. (c) 30 breaches per rule against `minConfident: 30` leaves no room for a missed breach (C2). (d) Aggregate `edit-rules` row can disable all per-rule refusals. |
| 03 | Mostly | (a) "This departs from design decision 3 as amended there" is stale: the amendment already says the same. (b) `skipsLaneHint` re-implements the Stop sentence regex that already exists as `STOP_SENTENCE` at `src/hooks/fx-codex.ts` line 351 and the text at `stop-check.ts` lines 43 and 44. (c) `createRunBreaker` restates the breaker rule `askJudgeWithBreaker` already holds. (d) Codex parts are conditional on task 01's fact, but Files and `git add` always list `fx-codex.ts`. (e) Blocked by 01, 02: 02 is needed only for the measured value; every test uses `FX_FEATURE_GATE`. |
| 04 | No | (a) Tests (branch A) change `shell-guard.test`, absent from Files and `git add`. (b) Blocked by 01 only; Risks cite task 03's `askJudgeWithBreaker` and it edits the file 03 restructures. (c) "paragraph starting `MEASURED` that says the promise is awaited" also matches "is not awaited". (d) The 200-entry cap in Risks has no test. (e) `V2_AWAITS_BEFORE` has no test override that 05 and 08 need. |
| 05 | Mostly | (a) 2.x tests are conditional on both V2_AWAITS_BEFORE and a recorded field; with the unfavourable fact only the "no hint" path is tested. (b) `parseOpencodeV2PromptText` has no unit test (only a conditional integration one). (c) Needs a way to flip `V2_AWAITS_BEFORE` for tests (C6). |
| 06 | Mostly | (a) Last Test says a harness with a model field "gets the rewrite with its own process or in-process test", but Files lists no `fx-codex.ts`, plugin or test file for it. (b) "Typed agents ... are never judged" vs `isGeneralType` treating `Plan` as general. (c) "Blocked by 03" while consuming 02 (transitive). |
| 07 | Mostly | (a) Interfaces say it consumes `featureMode`; the algorithm uses `hooks.editRules` and `gateOf` directly. (b) Built-ins refuse while `FEATURE_GATE['edit-rules']` is `log-only` (the state after task 01), against Global Constraint "A feature whose question has not cleared its bar logs only and acts on nothing" (C3). (c) `EDIT_RULE_MAX_REQUESTS` 3 caps at six rules per edit; rules beyond that are dropped with no log line or `unavailable` value. (d) Codex PreToolUse `additionalContext` is called "already allowed"; not measured in this plan. (e) Hook seam names `hooks/fx-context.js` but `src/hooks/fx-context.ts` is not in Files (health goes through `judge-health.ts`). |
| 08 | Mostly | (a) "throws synchronously" vs task 04's async callback (C7). (b) Tests need both values of `V2_AWAITS_BEFORE` (C6). (c) "Tool vocabulary" fields come from the binary at step 2, but Tests refer to `<recorded edit tool name>` so cases cannot be written before step 2; ordering is stated, fine. (d) Files and commit list agree. |
| 09 | Mostly | (a) fx-setup section 8 tells the user "ADR 0048 lists them", an ADR that task 13 creates later. (b) Catalogue globs have no test against the set `path` values (only ids, texts, scope are tied). (c) `scripts/check-all` modified but no `test-scope` rule for the new gate; covered only by check-all. |
| 10 | Yes | Every expected span re-derived by hand against the stated body rules and matches (ruby 2..6 and 8..8; typescript 1..4, 6..8, 10..12; python 2..5 and 7..8; go 1..4 and 6..6; others likewise). Only issue: the `'{'.repeat(200000)` test asserts a 1,000 ms wall clock, which can flake on a loaded machine. |
| 11 | Mostly | (a) Test "8 requests against a server that refuses connections: exactly 3 requests are attempted" holds only for sequential; with `JUDGE_CONCURRENCY` measured `concurrent` up to 4 start at once (C5). (b) Exit code when the lens table cannot be read (`lensFocus` throws) is unspecified. (c) `search` flags on any single `yes` chunk while `tripwires` needs `p >= 0.9`; intentional per the text. |
| 12 | Yes, one nit | "keep the added text to the command lines and the five sentences": fx-implement carries four, fx-review five. The fx-review branch pass never runs `tripwires` (no implementer line), consistent but design stories 12 and 13 say "fx-implement or fx-review". |
| 13 | No | (a) `judge-adr` gate reads ADR rows "copied from `scores.md`" but formats differ (C4). (b) `not measured` rows fail the bar check. (c) Consumes `FX_JSON_NOTICE` without using it. (d) Blocked by 05, 06, 08, 09, 12; it also reads 02's `scores.md` and 07 (transitive through 08, 09). |

## 3. Contradictions and defects

Each: side A, side B, one-line ruling.

C1. Calibration does not measure what ships.
- Task 01: "`edit-rules` asks `{ breach: editRuleQuestion(<the entry's rule>) }`", "`review-search` asks `{ flag: focusQuestion(...) }`", and "a change after task 02 measured it means measuring again".
- Task 07: "questions `r0`, `r1` from `editRuleQuestion`", two per request; task 11: "questions `q0`, `q1`".
- Ruling: `judge-calibrate` pairs items two per request under the same key names the hooks use (`r0 r1`, `q0 q1`), or the hooks send one question per request.

C2. The edit-rules bar is nearly unreachable at the minimum set size, and the aggregate row can veto every per-rule refusal.
- Task 02: "at least 30 breaches and 10 clean entries per rule"; task 01: `minConfident: 30`, precision 0.95. Task 02: "`REFUSING_RULES` ... is `[]` when the `edit-rules` feature row is `log-only`". plan.md: "a judged rule refuses only when its own labelled items cleared 95% precision".
- With exactly 30 breaches the judge must confidently flag at least 29 of 30 (about 97% recall) and a custom rule only advises when the aggregate gate is enabled.
- Ruling: require at least 45 breaches per rule (or `minConfident` 25 per rule), and set `REFUSING_RULES` from the per-rule rows alone, with the feature gate meaning "at least one rule refuses or advises".

C3. Built-ins act at a log-only gate.
- plan.md Global Constraints: "A feature whose question has not cleared its bar logs only and acts on nothing."
- Task 07 and plan.md Core text: built-in rules "run with or without a judge", and `FEATURE_GATE['edit-rules']` is `log-only` after task 01.
- Ruling: amend the constraint to "a feature whose judge question has not cleared its bar".

C4. Task 13's gate cannot read `scores.md` rows.
- Task 01/02: `scoreRow` has nine cells, `bar 85%`, `confident 25/25`, and the not-measured row is `| <feature> | not measured | | | | | log-only | | |`.
- Task 13: ADR header has seven cells, bar compared to `FEATURE_BARS[feature].bar * 100` followed by `%`.
- Ruling: the ADR table uses the nine-column header verbatim; the gate extracts digits from the bar cell and skips the bar check when the metric cell is `not measured`.

C5. Task 11 breaker test depends on a measured constant.
- Task 11: "A package needing 8 requests against a server that refuses connections: exactly 3 requests are attempted"; and "at most `REVIEW_MAX_IN_FLIGHT` requests at once when `concurrencyOf()` is `concurrent`".
- Under `concurrent` four are in flight before the first failure returns.
- Ruling: set `FX_JUDGE_CONCURRENCY=sequential` in that test, and say so.

C6. `V2_AWAITS_BEFORE` cannot be flipped in tests.
- Task 04: "`const V2_AWAITS_BEFORE: boolean`, `true` only when task 01 recorded MEASURED awaiting"; tasks 05 and 08 test "`V2_AWAITS_BEFORE` true" and "`V2_AWAITS_BEFORE` false" in the same file. Its tie test also matches the word "awaited" in "not awaited".
- Ruling: task 04 adds an `FX_TEST=1` override (`FX_V2_AWAITS_BEFORE`) read through a function, and task 01 fixes the two exact phrases `execute.before is awaited` and `execute.before is not awaited`.

C7. Synchronous throw versus async callback.
- Task 08: "the callback throws synchronously with the no-dashes message" (built-ins, 2.x).
- Task 04 branch A: `execute.before` does `await guardShell(...)`, which makes the callback `async`, so it can only reject.
- Ruling: task 04 makes `execute.before` a plain function that runs `checkBuiltins` first and returns a promise only for the shell path.

C8. Task 04 edits a file it does not own in its Files list.
- Task 04 Tests: "`node lib/shell-guard.test.js` gains: `guardShell` on `opencode` and on `opencode-v2` ...". Files and `git add` omit `src/lib/shell-guard.test.ts` and `lib/shell-guard.test.js`; Blocked by is 01 only while task 03 moves the breaker out of `shell-guard.ts`.
- Ruling: add both test files to Files and `git add`, and Blocked by 01, 03.

C9. Task 06 promises a rewrite for harnesses it gives no files for.
- Task 06: "in which case that harness gets the rewrite with its own process or in-process test mirroring cases 1, 6 and 12"; Files: only `fx-pretooluse.ts` and reference files. plan.md Risks: unfavourable fact means "Claude-Code-only branch".
- Ruling: delete the conditional rewrite; if task 01 finds a model field, stop and add a task.

C10. Task 02 consumes a task that runs after it.
- Task 02: "in at least 5 of the 13 language families of design story 16"; `languageOf` is produced by task 10 and is not in 02's Interfaces or Blocked by.
- Ruling: move that count check into task 11's gate (blocked by 10), or inline an extension list.

C11. Duplicated logic a reviewer would flag.
- Task 03 `skipsLaneHint`: "matches the Stop sentence `/edited files and no check (?:has )?passed (?:since|after) the last edit/`" copies `STOP_SENTENCE` in `src/hooks/fx-codex.ts` (line 351) and the text in `stop-check.ts`. `createRunBreaker` restates the breaker rule of `askJudgeWithBreaker`.
- Ruling: export one `STOP_SENTENCE` from `stop-check.ts` and have both breakers call one pure `breakerOpen(events, now)`.

C12. Stale statement in task 03.
- Task 03: "This departs from design decision 3 as amended there"; design.md amendment: "only while at least one 1,500 ms budget remains of an overall 2,500 ms deadline".
- Ruling: change to "This implements design decision 3 as amended".

C13. Shipped text points at an ADR that does not exist yet.
- Task 09: fx-setup section 8 says "(ADR 0048 lists them)"; ADR 0048 is created in task 13.
- Ruling: say "the README lists them" or move the sentence into task 13.

C14. Labelled-set parser contract is under-specified.
- Task 01: `parseLabelledSet('edit-rules', [{ id, rule, path, added, breach: 'yes' }])` gives `entry 0 has no boolean breach`; task 02 shape requires `scope` as well.
- Ruling: validate fields in the order listed in task 02's shape and add `scope` to task 01's example, so the first bad field is `breach`.

C15. Task 12 sentence count.
- Task 12: "the five sentences"; fx-implement is given four, fx-review five.
- Ruling: "the four shared sentences, plus the fx-review one".

C16. Wall-clock assertions in unit tests.
- Task 10: "returns within 1,000 ms"; tasks 03, 05, 06, 07 assert `ms` under 2,500 against a 3,000 ms delay.
- Ruling: keep the 2,500 ms hook checks (the behaviour under test); replace task 10's with a work counter or a 5,000 ms bound.

C17. Task 06 wording on typed agents.
- Task 06: "Typed agents (`fx:` lenses, other plugins' agents, `fork`, `Explore`) are never judged"; `isGeneralType` is true for `Plan`, so a `Plan` dispatch is judged and can be lowered.
- Ruling: drop `Plan` from the judged set or list it in the sentence.

C18. Calibration run versus the scratch rule.
- plan.md: "every test or scope command in a task runs through `scripts/scratch-env`"; task 02 step 5 runs `node scripts/judge-calibrate.js <feature>` "on the owner's configured judge".
- Ruling: run it through `scratch-env` with `--base-url` and `--model` from the owner, and record the flags in `scores.md`.

Totals: 46 pair rows plus one grouped universal row; 18 contradictions.
