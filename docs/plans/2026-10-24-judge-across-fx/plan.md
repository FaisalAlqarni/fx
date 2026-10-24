# The judge across fx: implementation plan

> **Build this with `fx-implement`. Do not execute the tasks directly.**
>
> The tasks below are deliberately detailed. That makes them easy to follow and
> it is exactly why the lane gets skipped: nothing looks missing. What is
> missing is everything a task file cannot hold, and it is what `fx-implement`
> supplies: a worktree so the main checkout is never written to, a ledger that
> survives compaction, a fresh subagent per task, a review while each diff is
> still small, and lens dispatch on what the diff actually touched.
>
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** use the judge in four more places (lane hint, subagent sizing, edit rules, review helpers), each switched on only after its question cleared a measured bar on the owner's local judge, on every harness that can wait for it.
**Architecture:** Task 01 settles the harness facts, defines every new judge question and the state it reads in one module (`src/lib/judge-questions.ts`), and builds the scoring tooling (`scripts/judge-calibrate.js`, with a concurrency measurement); task 02 writes the labelled sets, scores them and commits the per-feature gate, the catalogue rules that may refuse, and the measured request concurrency (`src/lib/judge-features.ts`). Tasks 03 to 09 add the three hook features as thin adapters over shared deciders (`lane-hint`, `dispatch-sizing`, `edit-rules`), Claude Code and Codex first, then opencode 1.x and 2.x, then the rule picker in `/fx-setup`; the new features count their judge failures on a breaker of their own, separate from the shell guard's. Tasks 10 to 12 add the function splitter, the `judge-review` command and its wiring into fx-implement and fx-review; task 13 runs nothing live but leaves the before/after bench instructions, ADR 0048 and the user docs.
**Stack:** TypeScript (strict) under `src/`, compiled file by file by `scripts/build` to committed CommonJS (hooks, `lib/`, scripts, tests) and ESM (opencode plugins); Node 20 built-in `fetch`; Bash gates; Markdown skills.
**Complexity:** High
**Risks:**
- HIGH: an edit-rule refusal blocks real work (a wrong refusal stops the agent mid-task): judged rules see only the lines an edit adds (a `Write` is diffed against the file on disk), so old breaches never block an edit, and a file-scope rule sees the post-edit file, capped; the built-ins (dashes, conflict markers, redactor-detected secrets) are exact code checks; a judged rule refuses only when its own labelled items cleared 95% precision with at least 30 confident breaches and at most 10% unsure answers on clean items, and needs a noul answer at or above `EDIT_BREACH_MIN_P` (0.85) with no escalation; every other judged rule only advises; any judge failure allows silently; `.fx.json` `hooks.edit_rules: false` turns it all off per repository (tasks 02, 07, 08).
- HIGH: judge latency on every prompt and every edit, under hooks with a 5 s timeout: each call keeps the 1,500 ms budget; the lane hint sends one request carrying `kind` and `research`, a second only for `build`, `review` or `writing` and only while at least one budget remains of `LANE_HINT_DEADLINE_MS` (2,500 ms), so a plain question costs one request; one edit's rule requests go out together or one at a time as task 02 measured, inside `EDIT_DEADLINE_MS` (2,500 ms); the new features use their own breaker (`askJudgeWithBreaker` with `'features'`, task 03), so their timeouts never take the shell guard's judge away; no `judge.json` means no request at all. Tasks 03 and 07 test slow judges and assert hook wall time under 2,500 ms.
- HIGH: review helpers hide a lens (a judge mistake skipping a review): `judge-review tripwires` only ever returns lenses to add, never a removal, and adds one only at `p >= 0.9`; the skills text says the lenses the `Tripwires:` line named always run; `authored` drops a file from branch-pass triggers only, never from a lens the report named; a chunk the judge could not answer is reported as unchecked, never as clean (tasks 11, 12).
- MEDIUM: the harness facts come out unfavourable (no model field outside Claude Code; opencode 2.1.4 does not await `execute.before`, or the probe cannot run): tasks 04, 05, 06 and 08 each take the stated rules-only, advisory-only or Claude-Code-only branch and record it in `references/harnesses/`.
- MEDIUM: Codex rejects an unknown key on `UserPromptSubmit` output and fails the hook run (ADR 0023): task 01 reads the repository's quote of the Codex hooks documentation and the installed binary; task 03 prints the hint on Codex only if that was MEASURED and adds it to `tests/gates/codex-hook-output` allowed sets in the same commit.
- MEDIUM: the agent can write `.fx.json` (fx-setup runs as the agent), so it can add a rule or switch one off: an unmeasured rule can only advise, the health line and the Stop check print a notice when `rules` or `hooks` changed during the session (task 07, 1.x in task 08), and ADR 0048 records the remaining gap (task 13).
- MEDIUM: an unmeasured opencode field (the `agent` on a 2.x prompt event, the 2.x edit tool's input fields) reads differently than assumed: tasks 05 and 08 fail toward no hint and no rule check, never toward a refusal.
**Testing:** Unit: question builders and state builders, scoring (accuracy, precision, unsure-on-clean, per rule, concurrency), feature gate and overrides, glob and rule matching, added lines, built-in checks, changed files, function splitter, review-package parsing (`src/lib/*.test.ts`) · Process: `hooks/fx-turn.js`, `hooks/fx-context.js`, `hooks/fx-pretooluse.js`, `hooks/fx-codex.js` and `lib/judge-review.js` with stdin payloads or arguments and the fake `/v1/systemone` server (`src/tests/gates/*.test.ts`); opencode plugins in-process · Integration: `scripts/check-all` · Measurement: six labelled sets and one concurrency run scored once on the owner's configured judge (task 02); `tests/lane-triggering` and `tests/review-bench` before and after, live, run by the owner from the instructions task 13 writes.

## Global Constraints

Copied from design.md:

- The judge-hooks rules stand: no judge means no network call; nothing leaves the machine unless the user configured a remote judge; redaction before every request and log line; 1,500 ms budget per call; logs and journals 0600.
- At most 2 questions per judge request and at most 6 options per choice question.
- A feature whose question has not cleared its bar logs only and acts on nothing.
- Lane hints and sizing notes are context lines for the model, never user-visible output.
- An edit refusal needs a confident judge answer; any judge failure allows the edit. (Amended 2026-10-24 by plan red-team: the built-in rules refuse from plain code checks, with no judge.)
- The judge never removes a review lens and never lowers a dispatch that carries `Capable because:`.
- Every test that runs a hook or plugin sets HOME, XDG_CONFIG_HOME, XDG_STATE_HOME, APPDATA, LOCALAPPDATA and TMPDIR to scratch directories.
- No command string from a test or a labelled set is ever executed; dangerous strings live only as data.
- TypeScript under `src/`, compiled by `scripts/build`; no runtime dependencies; no em or en dashes; no attribution trailers; nothing is pushed or merged by the agent.

The owner's safety rules for this build (every task respects them):

- Every test run sets HOME, XDG_CONFIG_HOME, XDG_STATE_HOME, APPDATA, LOCALAPPDATA and TMPDIR to scratch: every test or scope command in a task runs through `scripts/scratch-env` (task 01), which makes one `mktemp -d` directory and runs its arguments with those six variables pointing inside it.
- No `rm`, `trap` or `bash -c` in a command the agent types. Scripts that already hold them (`scripts/test-one`, `scripts/check-all`) are run as files.
- Dangerous command strings appear only as data in tests and labelled sets, never as a command.
- Python only as `python3 -I`.
- No whole-disk searches: every search names its directories (`grep -rn <pattern> src skills`, never a bare `grep -rn <pattern>` or a search from `/`).
- Nothing is deleted outside the worktree.
- Nothing leaves the machine: the judge and the opencode probe server are on `127.0.0.1`; no task makes a web request; the live benches through OpenRouter are the owner's to run (task 13).
- No commit to `main` and no push: every commit lands on the worktree's branch.

Carried from the judge-hooks plan, binding here:

- Locale: English only; fx has no localized text.
- A load guarded by `try` stays a typed `require` inside its `try`; never a hoisted `import`. The git guard and the fx-state refusal stay fail-closed; every feature in this plan fails open, except a built-in or measured edit-rule refusal, which is the feature's purpose.
- External input (hook stdin, opencode events, `.fx.json`, judge responses, review packages, labelled sets) enters as `unknown` and is parsed by one function each; no `as` casts at trust boundaries; a new parser lives in a file named `src/lib/*-input.ts` or carries a `ts-gate-ok:` reason.
- A generated file is committed in the same commit as its source; run `scripts/build` before every test run.
- Most tasks edit `scripts/check-all`, `src/scripts/test-scope.ts`, `src/lib/types.ts` or a hook entry point, so the tasks form one chain: run one task at a time, in number order. The blocking edges below are the real dependencies, kept so a reviewer can see them; they are not permission to run two tasks at once.
- In a task's Tests field, `judge answers <name>: <choice> <p>` means the fake server (or a `mock` judge) replies to question `<name>` with that choice at probability `<p>` and the other asked options sharing `1 - <p>` equally (a choice answer must cover every asked option and sum to 1); `<name>: p=<x>` is a noul answer. `gate <feature>=<value>` means the process runs with `FX_TEST=1` and `FX_FEATURE_GATE=<feature>=<value>`; `FX_REFUSING_RULES` and `FX_JUDGE_CONCURRENCY` work the same way (task 01's test overrides).
- Hook and plugin tests go through `src/tests/helpers/hook-env.ts` and the fake server in `src/tests/helpers/fake-systemone.ts`, and spawn asynchronously whenever the fake server runs in the same process.
- Codex prints only keys Codex knows (ADR 0023): a new output key goes into `src/tests/gates/codex-hook-output.test.ts` allowed sets in the task that prints it.
- `scripts/build` in a worktree reads `../../package.json` from the parent checkout: nothing in this plan edits the main checkout while tasks run.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Harness facts, questions and calibration tooling | none | harness facts recorded (dispatch model fields, opencode 2.1.4 await by local probe, Codex `UserPromptSubmit` context), `scripts/scratch-env`, every new question and state builder in `judge-questions.ts`, `scripts/judge-calibrate.js` with per-rule and concurrency rows, bars and an all-`log-only` gate | MVP |
| 02 | Labelled sets and calibration | 01 | six labelled sets (catalogue rules included), `scores.md`, the measured `FEATURE_GATE`, `REFUSING_RULES` and `JUDGE_CONCURRENCY` | MVP |
| 03 | Lane hint on Claude Code and Codex | 01, 02 | `.fx.json` `hooks.lane_hint`, `dispatch_sizing`, `edit_rules`; `featureMode`; `askJudgeWithBreaker` with separate guard and features breakers, `createRunBreaker`; `UserPromptSubmit` lane hint on both under one deadline | MVP |
| 04 | Judge on opencode 2.x | 01 | the shell guard's judge step on 2.x when 2.1.4 awaits `execute.before`, or the rules-only statement with the measured evidence | Core |
| 05 | Lane hint on opencode 1.x and 2.x | 03, 04 | the hint queued from `chat.message` (1.x) and the prompt hook (2.x) for primary agents only | Core |
| 06 | Subagent sizing | 03 | the judge's dispatch kind on the ADR 0031 rule: haiku for a confident lookup or small edit, a note on a justified dispatch, on Claude Code only (amended 2026-10-24 by coverage audit: Codex and opencode 2.x get no sizing; task 14 dropped) | Core |
| 07 | Edit rules on Claude Code and Codex | 02, 03 | built-in rules in code, judged repository rules over added lines (file-scope over the post-edit file), refusal only for measured rules, `.fx.json` `rules`, the `.fx.json` change notice on the health line and Stop | Core |
| 08 | Edit rules on opencode 1.x and 2.x | 04, 07 | refusals in `tool.execute.before` on both majors (judged refusals on 2.x only where it awaits, advice otherwise), the 1.x notice | Core |
| 09 | Rule picker in `/fx-setup` | 02, 07 | the per-stack catalogue tied to its labelled items, `judge-cli rules`, the fx-setup section that asks and writes `rules` | Core |
| 10 | Function splitter | 01 | `splitFunctions` and `reviewUnits` for the 13 language families, hunk fallback | Review |
| 11 | Review judge command | 02, 03, 10 | `lib/judge-review.js` with `tripwires`, `authored` and `search`, chunked, run breaker, unchecked never clean | Review |
| 12 | Review command in fx-implement and fx-review | 11 | skills text: the controller runs the command, adds lenses, names generated files, passes flagged functions into lens briefs | Review |
| 13 | Before/after benchmarks, ADR and docs | 05, 06, 08, 09, 12 | `FX_BENCH_JUDGE` in both benches with an offline test, `benchmark.md` run instructions, ADR 0048 with the accepted `.fx.json` gap, offline gate tying the measured values to ADR 0048, README and INSTALL | Polish |

Each phase is mergeable on its own and ends with `scripts/check-all` green:

- **MVP (01 to 03):** Claude Code and Codex get the lane hint, enabled or log-only as task 02 measured; the switches exist for all three hook features. Nothing else changes, and with no `judge.json` nothing changes at all.
- **Core (04 to 09):** needs MVP. opencode gets the hint (and the shell judge on 2.x if measured), sizing and edit rules run on every harness that supports them, `/fx-setup` proposes rules. The built-in edit rules run with or without a judge from here on.
- **Review (10 to 12):** needs only MVP, so it can merge after MVP with or without Core. fx-implement and fx-review gain the review command.
- **Polish (13):** needs every other phase. It changes no runtime behaviour: bench plumbing, ADR, docs.

## Exported symbols

Every new or changed symbol, its exact signature and its owning task. Generated files keep the names at the paths `scripts/build` gives them (`src/lib/x.ts` to `lib/x.js`, `src/scripts/x.ts` to `scripts/x.js`).

| Module | Symbol | Signature | Task |
|---|---|---|---|
| `src/lib/types.ts` | `UnavailableReason` (widened) | adds `'circuit-open' \| 'deadline'` | 01 |
| `src/lib/types.ts` | `EditRule` | `{ id: string; glob: string; rule: string; scope?: 'file' }` | 01 |
| `src/lib/types.ts` | `JournalEvent` (widened) | adds `{ t: number; kind: 'feature-judge'; ok: boolean }` (03) and `{ t: number; kind: 'fx-json'; hash: string }` (07) | 03, 07 |
| `src/lib/types.ts` | `FxJson.hooks` (widened) | adds `lane_hint?: boolean; dispatch_sizing?: boolean; edit_rules?: boolean` | 03 |
| `src/lib/types.ts` | `FxJson.rules` | `EditRule[]` | 07 |
| `src/lib/decision-log.ts` | `DecisionLogEntry.event` (widened) | adds `'lane-hint' \| 'dispatch' \| 'edit-rule' \| 'review'` | 01 |
| `src/lib/decision-log.ts` | `DecisionLogEntry.answer` | `answer?: string` | 01 |
| `src/lib/judge-thresholds.ts` | `EDIT_BREACH_MIN_P`, `EDIT_RULE_MAX_REQUESTS`, `EDIT_TEXT_CHARS`, `EDIT_FILE_CHARS`, `EDIT_DEADLINE_MS`, `LANE_HINT_DEADLINE_MS`, `REVIEW_CHUNK_CHARS`, `REVIEW_MAX_IN_FLIGHT`, `REVIEW_ADD_MIN_P`, `UNSURE_CLEAN_MAX`, `LANE_MIN_WORDS` | `number` (0.85, 3, 2000, 2000, 2500, 2500, 1800, 4, 0.9, 0.1, 3) (EDIT_FILE_CHARS amended 2026-10-24 by coverage audit: 2000, the value task 02 measured with) | 01 |
| `src/lib/judge-questions.ts` | `LaneKind` | `'build' \| 'change' \| 'failure' \| 'review' \| 'writing' \| 'other'` | 01 |
| `src/lib/judge-questions.ts` | `LANE_KIND_QUESTION`, `RESEARCH_QUESTION`, `LANE_FIRST_QUESTIONS` | `JudgeQuestion` (choice, 6 options); `JudgeQuestion` (noul); `Record<string, JudgeQuestion>` (`kind`, `research`) | 01 |
| `src/lib/judge-questions.ts` | `KIND_LANES` | `Record<LaneKind, string[]>` | 01 |
| `src/lib/judge-questions.ts` | `laneQuestion` | `(kind: LaneKind) => JudgeQuestion \| null` (null for `change`, `failure`, `other`) | 01 |
| `src/lib/judge-questions.ts` | `laneAfterFirst` | `(answers: Record<string, JudgeAnswer> \| undefined) => { lane: string } \| { kind: LaneKind } \| 'unsure'` | 01 |
| `src/lib/judge-questions.ts` | `DispatchKind` | `'lookup' \| 'small-edit' \| 'implementation' \| 'design-review' \| 'security' \| 'side-effect'` | 01 |
| `src/lib/judge-questions.ts` | `DISPATCH_KIND_QUESTION` | `JudgeQuestion` (choice, 6 options in `DispatchKind` order) | 01 |
| `src/lib/judge-questions.ts` | `editRuleQuestion` | `(rule: EditRule) => JudgeQuestion` (noul; wording by `scope`) | 01 |
| `src/lib/judge-questions.ts` | `focusQuestion` | `(focus: string, unit: 'change' \| 'function') => JudgeQuestion` (noul) | 01 |
| `src/lib/judge-questions.ts` | `AUTHORED_QUESTION` | `JudgeQuestion` (choice: `authored`, `generated`) | 01 |
| `src/lib/judge-questions.ts` | `lensFocus` | `(reviewSkill: string) => Record<string, { tripwire: string \| null; focus: string }>` | 01 |
| `src/lib/judge-questions.ts` | `laneHintState`, `dispatchState`, `editRuleState`, `diffState`, `authoredState`, `unitState` | see task 01 Interfaces (`editRuleState(relPath, added, file?)`) | 01 |
| `src/lib/judge-questions.ts` | `choiceVerdict` | `(a: JudgeAnswer \| undefined) => string \| 'unsure'` | 01 |
| `src/lib/judge-questions.ts` | `noulVerdict` | `(a: JudgeAnswer \| undefined, yesAt?: number) => 'yes' \| 'no' \| 'unsure'` | 01 |
| `src/lib/judge-features.ts` | `JudgeFeature` | `'lane-hint' \| 'dispatch-sizing' \| 'edit-rules' \| 'review-tripwires' \| 'review-authored' \| 'review-search'` | 01 |
| `src/lib/judge-features.ts` | `FeatureGate`, `FeatureBar`, `FEATURE_BARS`, `gateOf`, `refusingRule`, `concurrencyOf` | see task 01 Interfaces | 01 |
| `src/lib/judge-features.ts` | `FEATURE_GATE`, `REFUSING_RULES`, `JUDGE_CONCURRENCY` | declared in 01 (`log-only`, `[]`, `sequential`); measured values in 02 | 01, 02 |
| `src/lib/judge-features.ts` | `featureMode` | `(feature: 'lane-hint' \| 'dispatch-sizing' \| 'edit-rules', cwd: string) => 'off' \| 'log-only' \| 'enabled'` | 03 |
| `src/lib/judge-score.ts` | `ScoredItem`, `FeatureScore`, `scoreFeature`, `scoreRow`, `RuleScore`, `scoreRules`, `ruleRow`, `ConcurrencyScore`, `scoreConcurrency`, `concurrencyRow` | see task 01 Interfaces | 01 |
| `src/lib/judge-set-input.ts` | `parseLabelledSet` | `(feature: JudgeFeature, raw: unknown) => { ok: true; items: Record<string, unknown>[] } \| { ok: false; reason: string }` | 01 |
| `scripts/judge-calibrate.js` (CLI) | | `<feature> [--set <file>] [--base-url <url> --model <id>]`; `concurrency [--set <file>] [--base-url <url> --model <id>]` | 01 |
| `scripts/scratch-env` (CLI) | | `<command> [args...]`, runs it with HOME, USERPROFILE, XDG_CONFIG_HOME, XDG_STATE_HOME, APPDATA, LOCALAPPDATA, TMPDIR in one fresh scratch directory | 01 |
| `src/lib/repo-config.ts` | `HookSwitches` (widened) | adds `laneHint: boolean; dispatchSizing: boolean; editRules: boolean` | 03 |
| `src/lib/repo-config.ts` | `readRepoConfig` (widened) | `(cwd: string) => { hooks: HookSwitches; checks: CheckCommands; rules: EditRule[] }` (`rules` from task 07) | 03, 07 |
| `src/lib/judge-call.ts` | `Breaker`, `askJudgeWithBreaker` | `'guard' \| 'features'`; `(handle: JudgeHandle, key: string \| null, now: number, state: Record<string, string>, questions: Record<string, JudgeQuestion>, breaker: Breaker) => Promise<JudgeResult>` | 03 |
| `src/lib/judge-call.ts` | `createRunBreaker` | `(handle: JudgeHandle) => (state: Record<string, string>, questions: Record<string, JudgeQuestion>) => Promise<JudgeResult>` | 03 |
| `src/lib/lane-hint.ts` | `LaneHintInput`, `decideLaneHint` | `(input: LaneHintInput, judge?: JudgeHandle) => Promise<string \| null>` | 03 |
| `src/lib/lane-hint.ts` | `skipsLaneHint` | `(prompt: string) => boolean` | 03 |
| `src/plugins/fx-opencode-v2.ts` | `V2_AWAITS_BEFORE` | `boolean` (from task 01's measured fact) | 04 |
| `src/lib/opencode-input.ts` | `parseOpencodeV1PromptText`, `parseOpencodeV2PromptText` | `(output: unknown) => string \| undefined`; `(ev: unknown) => string \| undefined` | 05 |
| `src/lib/opencode-agents.ts` | `isPrimaryAgent` | `(agent: string \| undefined, configured: Record<string, unknown> \| undefined) => boolean` | 05 |
| `src/lib/types.ts` | `ClaudePreToolUseOutput` (widened) | `hookSpecificOutput` may carry `updatedInput?` and `additionalContext?` | 06 |
| `src/lib/dispatch-route.ts` | `isGeneralType`, `hasCapableLine` | `(ti: DispatchInput) => boolean`; `(prompt: unknown) => boolean` | 06 |
| `src/lib/dispatch-sizing.ts` | `SizingInput`, `SizingResult`, `sizeDispatch` | `(input: SizingInput, judge?: JudgeHandle) => Promise<SizingResult>` | 06 |
| `src/lib/patch-paths.ts` | `extractPatchAdditions` | `(command: unknown) => { path: string; text: string }[]` | 07 |
| `src/lib/edit-rules.ts` | `BUILTIN_RULES`, `builtinBreach`, `addedLines`, `globMatch`, `matchingRules`, `ChangedFile`, `changedFiles`, `EditCheckInput`, `EditRuleDecision`, `checkEdit` | see task 07 Interfaces | 07 |
| `src/lib/edit-rules.ts` | `checkBuiltins` | `(input: EditCheckInput) => EditRuleDecision` (synchronous) | 08 |
| `src/lib/fx-json-watch.ts` | `FX_JSON_NOTICE`, `fxJsonFingerprint`, `fxJsonNotice` | `string`; `(cwd: string) => string`; `(sessionId: string \| null, cwd: string, now: number) => string \| null` | 07 |
| `src/lib/stop-check.ts` | `decideStop` (widened) | returns `Promise<{ text: string \| null; notice: string \| null }>` | 07 |
| `src/lib/rule-catalogue.ts` | `RULE_CATALOGUE`, `catalogueFor` | `Record<string, EditRule[]>`; `(stacks: string[]) => EditRule[]` | 09 |
| `lib/judge-cli.js` (CLI) | `rules` | `rules [<stack>...]` prints a JSON array of `EditRule` | 09 |
| `src/lib/function-split.ts` | `LanguageFamily`, `FunctionUnit`, `ReviewUnit`, `languageOf`, `splitFunctions`, `reviewUnits` | see task 10 Interfaces | 10 |
| `src/lib/review-input.ts` | `DiffHunk`, `DiffFile`, `parseReviewPackage`, `parseTripwiresLine` | see task 11 Interfaces | 11 |
| `lib/judge-review.js` (CLI) | `tripwires`, `authored`, `search` | see task 11 Interfaces | 11 |
| `tests/conformance/lib/bench-judge.sh` | `place_bench_judge` | `<scratch-home>`; copies `$FX_BENCH_JUDGE` to `<scratch-home>/.config/fx/judge.json` | 13 |

## Design points this plan settles

Each is also recorded in `design.md` as an amendment dated 2026-10-24 (plan red-team), and in ADR 0048 (task 13).

- **One lane request carrying `kind` and `research`.** The lane question depends on the kind answer, so one request cannot carry it. The first request asks `kind` and a noul `research` question: `change` and `failure` have one lane, and `other` resolves to `research` or `none` from the same answer, so a plain question costs one request. Only `build`, `review` and `writing` send a second request, and only while one budget remains of the 2,500 ms deadline (task 03).
- **Six kinds, not seven.** Outside research and none share kind `other` to stay inside the 6-option limit.
- **No slash-command skip on opencode 1.x.** A slash command reaches `chat.message` as its expanded text, so task 05 cannot skip it there; recorded as a GAP in `references/harnesses/opencode.md`.
- **Built-in edit rules are code.** `no-dashes` and `no-conflict-markers` are exact text checks and `no-secrets` is the redactor's decision; none asks the judge, and all three work with no judge (task 07).
- **Judged rules read the added lines.** A `Write` is diffed against the file on disk; a file-scope rule also receives the post-edit file, capped at 2,000 characters (task 07; amended 2026-10-24 by coverage audit, the plan said 4,000).
- **Only measured rules refuse.** A catalogue rule refuses only when its own labelled items cleared the refusal bar (task 02); every other judged rule only advises (tasks 07, 08, 09).
- **Two breakers.** The shell guard keeps its own breaker; the lane hint, sizing and edit rules share a second one; `judge-review` keeps one in memory per run (tasks 03, 11).
- **Concurrency is measured.** Task 02 measures whether the owner's judge serves concurrent requests and commits `concurrent` or `sequential`; edit rules and `judge-review` follow it (tasks 07, 11).
- **Bars.** Sizing is scored as precision on `lower`; edit rules also need at most 10% unsure answers on clean items and at least 30 confident breaches; tripwire and search sets hold at least 20 items per lens (tasks 01, 02).
- **`.fx.json` stays agent-writable.** fx-setup runs as the agent, so the agent can edit rules and switches; the health line and the Stop check print a notice when they change during a session, and ADR 0048 records the gap (tasks 07, 08, 13).

## Coverage

| Design item | Owning task(s) |
|---|---|
| Story 1 (no judge, no work) | 03, 06, 07, 08, 11 (each tests zero requests with no `judge.json`; the built-in edit rules run in code and send nothing) |
| Story 2 (measured gate) | 01 (bars, gate shape), 02 (measured gate), 03 (`featureMode`), 11 (`gateOf`) |
| Stories 3, 4, 5 (lane hint, skips, model-only) | 03 (Claude Code, Codex), 05 (opencode) |
| Stories 6, 7 (sizing, `Capable because:`) | 06 |
| Stories 8, 10, 11 (built-in rules, refusal, advisory) | 07 (Claude Code, Codex), 08 (opencode) |
| Story 9 (rule picker) | 09 |
| Stories 12, 13 (added lens, never removed) | 11, 12 |
| Story 14 (generated files) | 11, 12 |
| Story 15 (functions per lens) | 11, 12 |
| Story 16 (13 language families) | 10 |
| Story 17 (opencode 2.x) | 01 (fact), 04, 05, 08 |
| Story 18 (per-repository switches) | 03 |
| Story 19 (labelled sets, benches) | 02 (sets), 13 (benches; the review bench is a no-regression check, as amended) |
| Decision 1 (measure first) | 01 (tooling, bars), 02 (sets, scores), 13 (ADR 0048) |
| Decision 2 (question shape, breaker) | 01 (questions), 03 (two breakers) |
| Decision 3 (lane hint) | 01 (questions), 03, 05 |
| Decision 4 (subagent sizing) | 01 (fact), 06 |
| Decision 5 (edit rules) | 07, 08 |
| Decision 6 (rule picker, who writes `.fx.json`) | 09; the notice in 07 and 08; the accepted gap in 13 |
| Decision 7 (review helpers) | 11, 12 |
| Decision 8 (function splitter) | 10 |
| Decision 9 (opencode 2.x) | 01 (fact), 04, 08 |
| Decision 10 (switches and logs) | 01 (log events), 03 (switches) |
