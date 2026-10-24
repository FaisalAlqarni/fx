# The judge acts only where it was measured

Status: superseded by 0049.

The files this ADR names were removed by ADR 0049; docs/plans/ keeps their history.

## Context

ADR 0047 made the judge optional and let it help the shell guard and the Stop check. This plan (`docs/plans/2026-10-24-judge-across-fx`) lets it help in more places: a lane hint on each prompt, a cheaper model for simple subagent dispatches, edit rules checked on each write, and three helpers for the review lenses. A judge that is wrong in these places costs more than a judge that is wrong about a shell command. A wrong edit refusal blocks work, a wrong sizing step lowers the quality of a subagent, and a wrong lane hint steers the model.

## Decision

**Each judge question was measured on a labelled set before its feature was allowed to act.** A feature whose question did not clear its bar logs what it would have done and acts on nothing. The gate lives in `src/lib/judge-features.ts` (`FEATURE_BARS`, `FEATURE_GATE`, `REFUSING_RULES`, `JUDGE_CONCURRENCY`), and `src/tests/gates/judge-adr.test.ts` fails when this page and that file disagree.

Bars:

- Lane hint, review helpers: 85% accuracy.
- Subagent sizing: 85% precision on `lower`. A wrong `lower` costs quality, a wrong keep costs only money, so accuracy would hide the error that matters.
- Edit rules: 95% precision on breaches, at least 25 confident answers per rule (ruling C2 of the plan: each rule needs at least 30 breaches and 10 clean items in its set), and at most 10% unsure answers on clean items. A rule's own row decides whether that rule may refuse; the aggregate row does not veto a rule that cleared its bar.

Judge: nimble:9b at http://127.0.0.1:11434, measured 2026-10-24.

Scores, copied from `docs/plans/2026-10-24-judge-across-fx/scores.md` (each run is `node scripts/judge-calibrate.js <feature>` against that judge):

| feature | metric | value | confident | unsure-clean | bar | gate | median | max |
|---|---|---|---|---|---|---|---|---|
| lane-hint | accuracy | 85% | confident 54/64, unavailable 0 | unsure-clean n/a | bar 85% | enabled | median 89 ms | max 169 ms |
| dispatch-sizing | precision | 94% | confident 34/52, unavailable 0 | unsure-clean n/a | bar 85% | enabled | median 41 ms | max 52 ms |
| edit-rules | precision | 97% | confident 169/323, unavailable 0 | unsure-clean 22% | bar 95% | log-only | median 33 ms | max 98 ms |
| review-tripwires | accuracy | 100% | confident 59/60, unavailable 0 | unsure-clean n/a | bar 85% | enabled | median 38 ms | max 54 ms |
| review-authored | accuracy | 83% | confident 30/32, unavailable 0 | unsure-clean n/a | bar 85% | log-only | median 39 ms | max 48 ms |
| review-search | accuracy | 97% | confident 99/100, unavailable 0 | unsure-clean n/a | bar 85% | enabled | median 35 ms | max 49 ms |

The `edit-rules` row is the aggregate of all rules and reads `log-only`, because its unsure-clean rate is 22% against a ceiling of 10%. The feature is still enabled: ruling C2 of the plan lets the per-rule rows alone decide, and two rules cleared their own bar. So `edit-rules` is enabled when some `| rule <id> |` row below reads `refuses`, whatever the aggregate row says, and `judge-adr.test.ts` checks it that way.

Per rule:

| rule rails-fk-index | precision | 93% | confident 29/42, unavailable 0 | unsure-clean 25% | bar 95% | advises |
| rule rails-no-rescue-nil | precision | 100% | confident 14/41, unavailable 0 | unsure-clean 0% | bar 95% | advises |
| rule dotnet-no-blocking-async | precision | 100% | confident 30/40, unavailable 0 | unsure-clean 10% | bar 95% | refuses |
| rule dotnet-no-empty-catch | precision | 100% | confident 15/40, unavailable 0 | unsure-clean 0% | bar 95% | advises |
| rule react-no-raw-html | precision | 90% | confident 31/40, unavailable 0 | unsure-clean 40% | bar 95% | advises |
| rule react-key-not-index | precision | 100% | confident 5/40, unavailable 0 | unsure-clean 90% | bar 95% | advises |
| rule docker-pinned-base | precision | 100% | confident 15/40, unavailable 0 | unsure-clean 10% | bar 95% | advises |
| rule web-img-alt | precision | 100% | confident 30/40, unavailable 0 | unsure-clean 0% | bar 95% | refuses |

Request concurrency:

| concurrency | sequential | sequential median 31 ms | concurrent max 89 ms | failures 0 sequential, 0 concurrent |

The measured mode is `sequential`: edit rules and the review helpers send their requests one after another. The concurrent run also had no failures; sequential is what the gate records.

Only `dotnet-no-blocking-async` and `web-img-alt` may refuse. Every other catalogue rule, and every rule a repository writes, only advises. Refusal is keyed on the rule id and its exact measured text and glob: a repository rule that reuses a refusing id with other text or another glob advises. Editing a catalogue sentence or glob therefore drops that rule's refusal until it is measured again. `MEASURED_RULES` in `judge-features.ts` holds the exact text and glob.

A judged edit is refused only at p >= 0.85 with no escalation, and only for a rule measured on its own labelled items.

**How far to trust the scores.** The labelled sets were written by the build agent, not taken from real use. It wrote the sets (`docs/plans/2026-10-24-judge-across-fx/sets/`), so the scores may overstate how the judge does on real work. Two results pass exactly at their bar: `lane-hint` at 85% and `dotnet-no-blocking-async` at 100% precision on 30 of 40 confident answers, the minimum for a rule is 25. Re-label from your own repositories and rerun `scripts/judge-calibrate.js` to check. The live benches in `docs/plans/2026-10-24-judge-across-fx/benchmark.md` are the second check; they are run by the owner and had not run when this page was written.

**What the plan settled.**

- One lane request carries two questions, the lane (`kind`) and `research`. A second request goes out only when `kind` is `build`, `review` or `writing`, to pick the exact lane. Both fit one 2,500 ms deadline, so a prompt waits at most that long for a hint. The lane kinds are grouped into 6 options, the most a choice question takes.
- Three edit rules are built into fx and checked in code with no judge: no em or en dash in Markdown, no private key block or API key with a known vendor prefix, no merge-conflict marker. They refuse from a plain check on every harness that has edit hooks.
- Judged rules read the added lines of an edit. File-scope rules read the file after the edit, capped at 2,000 characters (`EDIT_FILE_CHARS`), the size they were measured with. The plan first said 4,000; the cap stays at 2,000 until a new measurement supports more.
- Only a measured rule refuses. An unsure answer, a judge failure or a rule without its own measurement allows the edit, with at most one advisory line.
- The shell guard and the new features have separate circuit breakers, so a judge that is slow for edit rules does not switch off the shell guard's judge step, and the reverse.
- Subagent sizing never lowers a dispatch that carries `Capable because:`, only adds a note. It judges only general dispatches (no `subagent_type`, `general-purpose` or `claude`). `Plan`, `Explore`, `fork` and `fx:` agents are not judged.
- The review helpers (`lib/judge-review.js`: `tripwires`, `authored`, `search`) only add. A lens the judge cannot answer for is unchecked, never clean, and no output removes a lens. `review-authored` scored 83% against an 85% bar, so it is at `log-only` and logs what it would have said.

**Harness facts** (`references/harnesses/`, each marked there with its evidence: MEASURED, or READ when it comes from the binary's text and no recorded run):

- Claude Code: the `Agent` tool takes a `model` per dispatch and a hook's `updatedInput` changes it. Sizing acts on Claude Code only, and the design's "every harness whose dispatch takes a model" no longer holds. Codex and opencode 2.x get no sizing. Codex has no cheap-tier model recorded, its `PreToolUse` cannot rewrite a tool input (ADR 0023), and its spawn message reaches hooks encrypted. Whether an opencode 2.x plugin may change a call's input is not measured, and opencode 1.x has no model argument on its task tool. A task to add sizing there was drafted and dropped for those reasons.
- Codex: `UserPromptSubmit` accepts `additionalContext`, so the lane hint is shown to the model only. Nothing is printed inside a subagent.
- opencode 1.x: the lane hint runs for primary agents only, by `input.agent`. A slash command reaches `chat.message` as its expanded text, so 1.x cannot skip the hint for it.
- opencode 2.x: no lane hint. The 2.1.4 prompt event carries the text and no agent field, so fx cannot tell a user's message from a parent agent's message to a child session, and a hint sent to child sessions would steer subagents.
- On opencode 2.x the shell guard asks the judge too: `execute.before` runs the whole guard, which 2.1.4 awaits, and `permission.evaluate` applies its decision.
- opencode 2.x edit rules: on 2.1.4 `execute.before` is awaited, so the built-in rules and a measured rule's refusal block the edit. If a later opencode stops awaiting it, the plugin falls back to advice only.

**Switches.** `.fx.json` `hooks` gains `lane_hint`, `dispatch_sizing` and `edit_rules`, each on by default. `edit_rules: false` turns off every edit rule, the built-in ones too.

**What acts now.** The three built-in edit rules act at any gate, with no judge. Of the judged edit rules, only `dotnet-no-blocking-async` and `web-img-alt` refuse; the other six advise. For generated files, lock files and marked files are dropped by plain code; the judge's authored-versus-generated call (`review-authored`) is at `log-only`, so it does nothing yet. The design's rule that a feature below its bar "logs only and acts on nothing" holds per rule for edit rules, and built-ins are code checks that act at any gate.

**Failure handling and the decision log.** Every judged feature fails open. A crash inside the built-in checks allows the edit and logs `judge-error`; fx does not fail closed on its own crash, so a crash in the redactor can let a secret through, with a log line. Each decision writes one line to `decisions.jsonl` with a `source`:

| source | written when |
|---|---|
| judge | the judge answered and fx acted on, or logged, its answer |
| judge-error | a feature threw, or an edit-rule request failed; the feature then does nothing |
| judge-config | `judge.json` exists but cannot be used; once per prompt. No `judge.json` writes nothing |
| no-session | the harness gave no session id, so the lane hint skips the judge and no hint is given |
| judge-off | a judge config exists but opencode 2.x cannot use it, because `execute.before` is not awaited or `shell-guard` has no `guardShell` export; once per plugin load |
| judge-down | the feature breaker is open after repeated timeouts or connection failures, or every request of a run failed |

A failed write to the decision log goes to stderr and nothing else. Lane hints, sizing notes and advisory lines are context for the model, never terminal output.

**Smaller facts.** One secret-file list decides what the judge never reads: `secretFile` in `src/lib/shell-rules.ts`, built from the shell guard's own list. A file-scope edit rule gets only the added lines of such a file, and `judge-review` never reads or sends it. On Codex a hook crash on the PreToolUse path denies under any Node unhandled-rejections mode, `--unhandled-rejections=warn` included, because the handler listens for unhandled rejections as well as uncaught exceptions. The edit rules check the edit tools only. On Claude Code a shell write through the Bash tool, such as `cat > file` or `sed -i`, skips the edit rules; on Codex only an `apply_patch` inside a shell call is checked.

**Accepted gap.** Accepted gap: an agent can edit .fx.json; fx shows a notice when its rules or hook switches change during a session and does not stop the change. `edit_rules: false` turns off the built-in rules too, `no-secrets` included, so a prompt-injected agent can set it and then write a secret before the notice appears. The notice comes at the next Stop or resume, not at once. Claude Code shows it as a `systemMessage`. opencode 1.x prints it on stderr and queues it for the model. On Codex the notice goes to stderr at Stop; whether Codex shows a Stop hook's stderr to the user is not measured. opencode 2.x shows no notice. opencode 1.x keeps its baseline in plugin memory, so a plugin reload sets a new baseline. The owner accepted this on 2026-10-24 rather than make `.fx.json` read-only to the agent. The git guard, the hard shell rules and the refusal to write fx's own state directory do not depend on `.fx.json` and stay on.

**What the benches show.** `tests/lane-triggering` (17 prompts) and `tests/review-bench` (9 cases) accept `FX_BENCH_JUDGE=<judge.json>` and run before and after. The review bench measures fx's task reviewer, which the review helpers do not feed (they feed lenses), so its after-run is a no-regression check. The helpers' accuracy is the `review-*` rows above.

## Consequences

- With no judge, nothing in this ADR runs except the three built-in edit rules, which send nothing.
- Two rules refuse edits on the strength of sets written by the build agent. If a real repository shows a wrong refusal, set that rule to advise by removing its id from `REFUSING_RULES` and rerun the gate, or switch `edit_rules` off for the repository.
- A different judge needs a new run of `scripts/judge-calibrate.js` and an edit to `judge-features.ts` and `scores.md` together; the gate fails when this page is not updated with them.
- This ADR amends ADR 0031: a judged sizing step can lower a general `sonnet` dispatch to `haiku`.
