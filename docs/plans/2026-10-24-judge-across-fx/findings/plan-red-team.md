# Plan red-team, 2026-10-24

Red-teaming this plan.

**Adversarial review (plan mode): `/development/fx/docs/plans/2026-10-24-judge-across-fx/plan.md`**

**Critical**

1. **Edit rules judge the whole file or a fragment, not what changed.** Task 06, `changedTexts`: "`Write` `content`, `Edit` `new_string`". When a `Write` rewrites an existing file, the judge sees the whole file, so an em dash or `=======` already in it gets the edit refused. No stamp exists, so the agent can only work around it. An `Edit` fragment has the opposite problem: it hides context that file-level rules need. `rails-fk-index` refuses a migration whose `add_index` sits in unchanged lines. This fails integrity, the plan's own top HIGH risk. Fix: for `Write`, compare against the file on disk and send only the added lines. Mark context-dependent rules as file-scope and send the post-edit file, capped. Add a test: a `Write` to a file with an existing em dash plus a clean addition is allowed.

2. **Repository and catalogue rules refuse edits without ever being measured.** Task 08 Risks: "the edit-rule gate from task 01 governs all rules alike". That gate was earned on three lexical rules. Semantic rules like `dotnet-no-blocking-async` and `react-key-not-index` would refuse edits at `enabled` with zero labelled items. Design decision 1 says "Each judge question gets a labelled set". This is a faithfulness gap. Fix: non-built-in rules only advise until a set for them clears 95%, or task 01 adds catalogue items to `edit-rules.json`.

**Important**

3. **Departure 1 (two one-question requests) is sound, but its latency claim is false.** Plan Risks: "assert hook wall time under 2,500 ms". Case 10 only delays the first request. If the first answers at 1.4 s and the second times out, the hook takes about 2.9 s. Fix: one overall deadline for the hint, and skip the second request when less than one budget remains. Add a test with the first request answering at 1,200 ms and the second delayed. A better fix: send `{ kind, build_lane }` in one request, which is two questions within the limit and honours decision 3 for `build`, the commonest kind with several lanes.

4. **Departure 2 (`other` = research or none) is unsound as built.** Plain questions are probably the commonest prompt class. They now pay a second call only to learn `none` and print nothing. Fix: put a noul `research` question beside `kind` in the first request, so `other` needs no second call.

5. **Concurrency and the shared breaker tie the shell guard to the new features.** Task 06 sends rule requests "all sent at once", up to 3. A single-slot local Ollama serves them one at a time, so the later ones time out. Task 02's `askJudgeWithBreaker` counts those timeouts, and after three of them the shell guard loses its judge for 60 s. Task 01 measures latency on sequential calls only. Fix: send requests one at a time, or measure concurrent latency in task 01. Count only shell-guard failures toward the guard's breaker.

6. **Advisory noise has no bar.** `FEATURE_BARS` scores refusal precision only. The benchmark's "ask 0.56 on every masked commit" shows the local judge hedges. A hedging judge lands inside the unsure band, so nearly every edit gets the "may be broken" line. Fix: add a ceiling on the unsure rate over clean items (for example 10%) to the edit-rules gate.

7. **Sizing is scored on the wrong metric.** Task 01 scores `dispatch-sizing` on accuracy. A wrong `lower` silently costs quality, while a wrong `keep` costs only money. Fix: score precision on `lower`, as edit rules do.

8. **The bars rest on too few items.** Edit rules can be `enabled` at `minConfident: 10`, which is 10/10 correct. Tripwires get 30 items in total. Neither supports a 95% or 85% claim. Fix: at least 30 confident breaches, and 20 or more items per lens.

9. **Two of the three built-ins need no judge, and the third is the redactor's call.** Plain code decides `no-dashes` and `no-conflict-markers` exactly. `no-secrets` reads `[REDACTED]`, which the redactor has already decided. Judging all three adds latency and false refusals. This re-opens decision 5's list. Fix: check the built-ins in code and keep the judge for repository rules.

10. **The agent can write `.fx.json`, which breaks decision 6.** Task 06 Risks: "`.fx.json`, which the agent can write". Design decision 6: "only the owner's `/fx-setup` run writes them". The agent can add rules or set `edit_rules: false`. Fix: treat top-level `.fx.json` like fx state, or record this as an accepted gap in ADR 0048.

11. **The task 01 probe breaks owner safety rules.** It runs opencode headless "through OpenRouter with a key the owner supplies", which sends data off the machine. It also runs an unspecified "shell tool call", while the same task says of the binaries: "never run them". Fix: the owner runs the probe, with a fixed harmless command such as `true` written in the task. Otherwise record UNVERIFIED.

**Minor**

12. **Task 10 has no breaker, and false positives add up on large diffs.** It calls bare `askJudge`, so a dead judge costs every chunk 1.5 s. "In `add` when any chunk answers `yes`" means even a small per-chunk false-positive rate adds every lens to a large diff. Fix: use `askJudgeWithBreaker`, and add a lens only when a chunk answers `yes` above a higher threshold.

13. **The Codex fact is decided in advance.** Task 01 says "Not settled from the binary text: record UNVERIFIED" without looking. The repo already cites the Codex hooks docs ("Add context: hookSpecificOutput.additionalContext") in `codex-hook-output.test.ts`. Fix: read the docs and source first.

14. **Story 19 is only partly met.** Task 12 admits the review bench "measures fx's task reviewer, which the review helpers do not feed". Fix: say so in the design, or add a lens-level bench case.

15. **The departures are not recorded in the design.** They live only in the plan and ADR 0048, while `design.md` decision 3 still says "Two questions in one request" and lists seven kinds. Fix: amend `design.md`.

16. **Task 01 is too big.** It covers harness facts, `scratch-env`, six modules, about 250 labelled items and live calibration. Fix: split it into facts plus tooling, then sets plus calibration.

17. **One test lacks an exact count.** Task 10 says "at least 3 requests". 5,000 characters in 1,800-character chunks is exactly 3, so assert 3.

## Red-team resolutions

Resolved 2026-10-24. Tasks were renumbered when task 01 was split (finding 16): old 02 to 12 are now 03 to 13. `design.md` carries a dated note, "amended 2026-10-24 by plan red-team", at each place the plan departs from it.

| # | Disposition | Owning task(s) |
|---|---|---|
| 1 | Fixed (owner ruling). Judged rules see the lines an edit adds: a `Write` is diffed against the file on disk, an `Edit` or `MultiEdit` gives its added lines. A rule marked `scope: "file"` also receives the post-edit file, capped at 4,000 characters. Test added: a `Write` to a file that already holds an em dash, adding a clean line, is allowed. | 07 (`addedLines`, `changedFiles`, `checkEdit`), 08 (opencode), 01 (`editRuleState`, `editRuleQuestion` by scope) |
| 2 | Fixed (owner ruling). Only a rule whose own labelled items cleared 95% precision may refuse (`REFUSING_RULES`); every other repository or catalogue rule only advises. Task 02 adds 40 labelled items for each of the eight catalogue rules. | 02 (sets, measured list), 07 (refuse or advise), 09 (catalogue tied to the set) |
| 3 | Fixed. One request carries `kind` and `research`; a second goes out only for `build`, `review` or `writing`, and only while one 1,500 ms budget remains of a 2,500 ms deadline. Tests added for a first answer at 1,200 ms and at 600 ms. | 01 (`LANE_FIRST_QUESTIONS`, `laneAfterFirst`), 03 (deadline, tests) |
| 4 | Fixed. A plain question resolves from the first request's `research` answer and costs exactly one request. | 01, 03 (case 4) |
| 5 | Fixed (owner ruling). Task 02 measures concurrent against one-at-a-time latency on the owner's judge and commits `JUDGE_CONCURRENCY`; edit rules follow it under one 2,500 ms per-edit deadline, and `judge-review` uses it for its in-flight limit. The new features use a breaker of their own (`askJudgeWithBreaker` with `'features'`), so their failures never disable the shell guard's judge, and the reverse. With no judge none of them sends anything. | 01 (tooling), 02 (measurement), 03 (breakers), 07, 11 |
| 6 | Fixed. The edit-rule bar adds a 10% ceiling on unsure answers over clean items, at the feature level and per rule. | 01 (`FEATURE_BARS`, `scoreFeature`, `scoreRules`), 02 |
| 7 | Fixed. Sizing is scored as precision on `lower`. | 01 (`FEATURE_BARS`), 02, 06 |
| 8 | Fixed. Edit rules need at least 30 confident breaches (feature and per rule); tripwire and search sets hold at least 20 items per lens. | 01 (`FEATURE_BARS`), 02 (set counts) |
| 9 | Fixed. `no-dashes` and `no-conflict-markers` are exact code checks and `no-secrets` is the redactor's decision; all three refuse with or without a judge. The judge checks repository rules only. | 07 (`builtinBreach`), 08 (`checkBuiltins`, synchronous on 2.x) |
| 10 | Accepted gap (owner ruling). Agent edits to `.fx.json` stay allowed, since fx-setup runs as the agent. The health line and the Stop check print a one-line notice when `rules` or `hooks` changed during the session; ADR 0048 records the gap. | 07 (`fx-json-watch`, Claude Code and Codex), 08 (opencode 1.x; GAP on 2.x), 13 (ADR 0048) |
| 11 | Resolved by the owner, 2026-10-24. The probe runs against the owner's local OpenAI-compatible server at `http://127.0.0.1:8899/v1`, model `qwen3.8-27b`, key `<redacted>` (a fixed launcher value), inside fx's bwrap jail with a scratch HOME; the only command the probe plugin lets run is `true`, and other outbound traffic is sent to a dead local proxy. If the probe cannot run the fact is UNVERIFIED and judged edit-rule refusals on opencode 2.x only advise. | 01 (fact 4), 04, 08 |
| 12 | Fixed. `judge-review` sends every request through a per-run breaker (`createRunBreaker`), and `tripwires` adds a lens only at `p >= 0.9`. | 03 (`createRunBreaker`), 11 |
| 13 | Fixed. Task 01 reads the repository's quote of the Codex hooks documentation, ADR 0023 and the installed binary before recording MEASURED or UNVERIFIED; no web request. | 01 (fact 5) |
| 14 | Fixed in the design. Testing Decisions now says the review bench is a no-regression check and the helpers' accuracy is their labelled-set scores; `benchmark.md` and ADR 0048 carry the same sentence. | 13 |
| 15 | Fixed. `design.md` decisions 1, 2, 3, 5, 6, 7 and 9, story 1, Testing Decisions and Global Constraints each carry a dated amendment note; the rest of the design and its Approved line are unchanged. | plan.md "Design points this plan settles" lists them |
| 16 | Fixed. Task 01 is split into 01 (harness facts, questions and calibration tooling) and 02 (labelled sets and calibration); the later tasks, their Blocked by lines, Interfaces references and the plan table are renumbered. | 01, 02 |
| 17 | Fixed. The test asserts exactly 3 requests. | 11 |
