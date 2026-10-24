# fx ledger: plan: docs/plans/2026-10-24-judge-across-fx/plan.md

## Standing rulings

(none: docs/plans/rulings.md does not exist)

Ruling: the version in package.json, .claude-plugin/plugin.json, .codex-plugin/plugin.json, .agents/plugins/marketplace.json and package-lock.json is bumped once, in the last task that changes shipped files, so release-version passes. Why: the same standing ruling held in the judge-hooks plan. Cost if wrong: one red gate, caught by scripts/check-all at the exit gate.
Ruling: the branch judge-across-fx is cut from fx-judge-hooks at 402e983, never from main; nothing is committed to main and nothing is pushed. Why: owner, 2026-10-24. Cost if wrong: owner's main moves without consent, caught by nothing automatic.

## Log

Setup: worktree /development/fx/.worktrees/judge-across-fx on judge-across-fx from 402e983; scripts/setup exit 0 with scratch HOME and TMPDIR; .fx ignored.
Pre-flight scan: tables and 18 contradictions in findings/preflight.md (46 pair rows, 13 task rows). Rulings below, one per contradiction.
Ruling: C1, judge-calibrate pairs items two per request under the key names the hooks send (edit rules r0 r1, review search q0 q1), so the measured gate describes what ships. Why: a gate measured on another request shape proves nothing. Cost if wrong: re-calibration, caught by task 02 review.
Ruling: C2, each judged rule needs at least 30 breaches and 10 clean items, minConfident is 25 per rule, and REFUSING_RULES is set from the per-rule rows alone; the edit-rules feature gate means at least one rule acts. Why: the aggregate row must not veto a rule that cleared its own bar. Cost if wrong: a rule refuses on a thinner sample, caught by task 02 review and the task 13 bench.
Ruling: C3, the Global Constraint reads "a feature whose judge question has not cleared its bar logs only"; the built-in code checks act at any gate. Why: plan amendment F9 made built-ins judge-free. Cost if wrong: none beyond wording, caught by task 07 review.
Ruling: C4, the ADR scores table uses the nine-column scores.md header verbatim; the task 13 gate takes the digits of the bar cell and skips the bar check when the metric cell reads not measured. Why: one row format. Cost if wrong: a red gate, caught by task 13 tests.
Ruling: C5, task 11's breaker test sets FX_JUDGE_CONCURRENCY=sequential and says so. Why: under concurrent mode four requests are in flight before the first failure. Cost if wrong: a flaky test, caught by task 11 review.
Ruling: C6, task 04 reads V2_AWAITS_BEFORE through a function with an FX_TEST=1 override FX_V2_AWAITS_BEFORE; task 01 records the fact with the exact phrase "execute.before is awaited" or "execute.before is not awaited". Why: tasks 05 and 08 test both values. Cost if wrong: untestable branch, caught by task 05 review.
Ruling: C7, task 04 makes the opencode 2.x execute.before a plain function that runs checkBuiltins first (throwing synchronously) and returns a promise only for the shell path. Why: task 08 needs a synchronous throw. Cost if wrong: task 08 rework, caught by task 08 review.
Ruling: C8, task 04 also owns src/lib/shell-guard.test.ts and lib/shell-guard.test.js, and is blocked by 01 and 03. Why: its tests edit them and task 03 moves the breaker. Cost if wrong: an unreviewed file change, caught by task 04 review.
Ruling: C9, task 06 ships the Claude Code branch only; if task 01 measures a model field on another harness, the controller adds a task for it. Why: task 06 names no files for other harnesses. Cost if wrong: one harness without sizing, caught by the coverage audit.
Ruling: C10, the "5 of the 13 language families" count check moves from task 02 to task 11's tests (task 11 is blocked by 10). Why: task 02 runs before languageOf exists. Cost if wrong: a gap in labelled-set coverage, caught by task 11 review.
Ruling: C11, task 03 exports one STOP_SENTENCE from stop-check.ts used by fx-codex.ts and skipsLaneHint, and both breakers call one pure breakerOpen(events, now). Why: no duplicated logic. Cost if wrong: drift between copies, caught by task 03 review.
Ruling: C12, task 03's text "departs from design decision 3" reads as "implements design decision 3 as amended". Why: the design was amended 2026-10-24. Cost if wrong: none.
Ruling: C13, task 09's fx-setup text says "the README lists them", not ADR 0048, which task 13 creates. Why: no dangling reference in shipped text. Cost if wrong: none.
Ruling: C14, parseLabelledSet validates fields in task 02's shape order and task 01's example includes scope, so the first bad field reported is breach. Why: one contract. Cost if wrong: a test mismatch, caught by task 01 review.
Ruling: C15, task 12 inserts the four shared sentences in both skills plus the one fx-review sentence. Why: matches the counts given. Cost if wrong: none.
Ruling: C16, task 10 replaces "returns within 1,000 ms" with a 5,000 ms bound; the hook tests keep ms under 2,500 against a 3,000 ms delay. Why: wall-clock unit asserts flake. Cost if wrong: a flaky test, caught by task 10 review.
Ruling: C17, Plan is not a judged type in task 06; only general-purpose dispatches are judged for sizing. Why: lowering an architect agent risks quality and the sentence lists only typed exclusions. Cost if wrong: fewer savings, caught by task 06 bench in task 13.
Ruling: C18, task 02 runs judge-calibrate through scripts/scratch-env with --base-url and --model for the owner's judge (Ollama nimble:9b at http://127.0.0.1:11434) and records the flags in scores.md. Why: owner scratch rule. Cost if wrong: none.
Task 01: dispatched b9a5640 2026-10-23T23:29:12Z
Task 01: implementer running (opus, Capable because: harness probes and contracts every later task consumes); every other task blocks on 01, so the controller waits on it.
Ruling: task 10 runs in parallel with task 02 in its own worktree /development/fx/.worktrees/judge-across-fx-t10 on branch judge-across-fx-t10, cut from judge-across-fx after task 01; the controller cherry-picks its commits onto judge-across-fx and resolves the one scripts/check-all line by hand; every other task runs in number order. Why: owner asked for safe parallelism; task 10 creates only its own files plus one check-all line, needs only scratch-env from 01, and fx tests share no database (each run has its own scratch dirs). Cost if wrong: a cherry-pick conflict or a missed check-all line, caught by test_scope after the pick and by check-all at the exit gate.
Task 01: implementer DONE_WITH_CONCERNS b9a5640..63f6aee, 3 concerns plus 1 outside-task note.
Ruling: task 01 concern 1, C9 is triggered (Codex 0.164.0 spawn_agent and opencode 2.1.4 subagent take a model field, recorded in references/harnesses by task 01): the controller adds task 14, subagent sizing on Codex and opencode 2.x, blocked by 06, and writes its file before task 06 completes. Why: ruling C9. Cost if wrong: one extra task, caught by its own review.
Ruling: task 01 concern 2, fact 4 stays MEASURED from the bundled opencode 2.1.4 code (references/harnesses/opencode-v2.md, "execute.before is awaited"); the probe is not run. Why: task 01 step 4 runs the probe only when the binary text does not settle it. Cost if wrong: a refusal path on 2.x that does not block, caught by task 08's process tests and the task 13 bench.
Ruling: task 01 concern 3, judge-calibrate sends review-tripwires questions in pairs under q0 q1. Why: task 11 sends the asked lenses "in pairs, questions q0, q1", so this is C1's intent. Cost if wrong: none.
Ruling: task 01 outside note, every later test writes mock noul answers in the form parseJudgeConfig accepts, not the { type: 'noul', p } form in task 01's Tests text. Why: the parser refuses that form. Cost if wrong: refused test configs, caught by each task's own RED run.
Task 02: dispatched 63f6aee 2026-10-23T23:48:55Z
Task 10: dispatched 63f6aee 2026-10-23T23:48:55Z (parallel worktree judge-across-fx-t10)
Task 01: minor (deferred): judge-calibrate warm-up fetch ignores its own failure with no stderr note, and the comment says no budget while a 120 s timeout applies (judge-calibrate.ts:225-230; lens silent-failure)
Task 01: review: spec compliant with 3 warnings; quality changes requested; C/I/M 0/1/4 (findings/01-review.md). Lens silent-failure: 3 Important, 1 Minor (findings/01-lens-silent-failure.md).
Task 01: minor (deferred): lane-hint process test covers only kind change, not the second-request or research paths of askLanes
Task 01: minor (deferred): concurrency mode counts failed sequential requests as latencies, which can lower the sequential median
Task 01: minor (deferred): claude-code.md Agent model fact is versioned 2.1.278 though ADR 0031 records no version
Task 01: minor (deferred): codex --version was run outside the brief's read-only rule (disclosed in the report)
Task 01: warning 1 (parseLabelledSet shapes against task 02's shape list) is not a gap now; task 02's own tests and review exercise the parser on the real sets.
Task 01: warning 2 (opencode 2.1.4 before-hook ordering points 3 and 4 not re-checked) is not confirmed as a gap; task 05 and task 08 process tests catch a wrong reading.
Task 01: warning 3 checked by the controller: ls of /home/faisal/.codex shows the codex --version run created /home/faisal/.codex/tmp/arg0-linux/codex-arg0896v3M at 2026-10-24T02:31:22 (codex's own per-run temp dir); nothing else under /home/faisal/.codex changed after 01:54. Left in place (owner rule: nothing deleted outside the repository); reported to the owner.
Ruling: the task 01 fix round runs in the shared worktree while the task 02 implementer works there; task 02 was told not to edit judge-score.ts or judge-calibrate.ts. Why: the fixes touch only task 01's files and both writers stage by path. Cost if wrong: a mixed commit, caught by the task 01 re-review diff and task 02 review.
Task 01: fix round 1/5 dispatched 63f6aee (resume implementer; open: review I1, lens I1, lens I2, lens I3)
Task 01: fix round 1 committed 63f6aee..3e86e83; controller reworded two code needles in findings/01-review.md so check-prose passes; dispatched re-review (diff over 20 lines)
Task 10: implementer DONE 63f6aee..9f89547 on judge-across-fx-t10, Tripwires: none; task review dispatched
Task 01: fix round 1/5 (4 addressed, 0 open: none; commits 63f6aee..3e86e83)
Task 01: cost unavailable (no transcript recorded)
Task 01: complete (commits b9a5640..3e86e83, review clean after fix round 1; 5 minors deferred). Files: scripts/scratch-env, src/lib/judge-features.ts, the judge questions and score modules, src/scripts/judge-calibrate.ts, src/scripts/guard-calibrate.ts (shared warm-up helper), references/harnesses/*.md, scripts/check-all, test-scope, hook-env TMPDIR. Test evidence: implementer ran the judge suites one by one, exit 0; full check-all deferred to the exit gate because task 02 edits the same worktree.
Task 10: review: spec issues 2, quality changes requested, C/I/M 0/2/5, plan-mandated 1 (findings/10-review.md).
Task 10: minor (deferred): plain-call rule (rule 4) reads a semicolon-less call followed by a `{` within 4 lines as a definition (`render(x)` / `const y = {` gives `render 1..4`)
Task 10: minor (deferred): `=>` in a return type gives a one-line unit, and a body-less signature followed by a braced one swallows the next function (Kotlin interface, Swift protocol)
Task 10: minor (deferred): hunk grouping gap is measured from the previous orphan line, not the previous changed line as the brief words it
Task 10: minor (deferred): the 200 KB size test has no signature lines, so it does not bound `bodyEnd`/`matchParen` on a large real file
Task 10: minor (deferred): tests cover only the spec sources; no guard clause, wrapped signature or multi-line expression-body cases
Ruling: task 10 Important 2 is plan-mandated (the brief's literal indent rule ends a Python or F# unit at a wrapped signature's last line); the fix implements the rule's intent: an indent-bodied unit's body starts after the line that closes the signature (the line ending the open parenthesis, then the colon or equals), and the indent comparison uses the def line. Why: a unit with its body outside it defeats task 11's per-function search. Cost if wrong: different spans than the task text, caught by the task 10 re-review and task 11's fixtures.
Task 10: warning (check-all line after cherry-pick) is the controller's step after completion; not a gap in the task.
Task 10: fix round 1/5 dispatched 9f89547 (resume implementer; open: I1 Ruby guard clause, I2 wrapped signature)
Task 10: fix round 1 committed 9f89547..eca039c (26 production lines); dispatched re-review
Task 10: fix round 1/5 (2 addressed, 0 open: none; commits 9f89547..eca039c)
Task 10: review clean after fix round 1 (commits 63f6aee..eca039c on judge-across-fx-t10); cherry-pick onto judge-across-fx waits until task 02 commits, since task 02 has uncommitted edits to scripts/check-all in that worktree.
Task 02: implementer DONE_WITH_CONCERNS f613098..1258378; 4 concerns.
Ruling: task 02 concern 1, edit-rules is enabled with REFUSING_RULES dotnet-no-blocking-async and web-img-alt while its aggregate row reads log-only. Why: ruling C2 (per-rule rows alone decide). Cost if wrong: two rules refuse edits, caught by the task 07 tests and the task 13 bench.
Ruling: task 02 concerns 2 and 3, lane-hint (85%) and dotnet-no-blocking-async (precision 100% with confident 30/40) pass at their bars on sets the implementer wrote; accepted as measured, and task 13's ADR states that the sets were written by the build agent, so their scores may overstate real use. Why: the design's bar is met; the owner can re-label later. Cost if wrong: a feature acts below its real bar, caught by the task 13 live bench.
Task 02: concern 4 (findings/10-*.md broke check-prose) was fixed by the controller before the report arrived.
Task 10: cherry-picked onto judge-across-fx as a04980b and dfea7b9 with no conflict; scripts/scratch-env scripts/check-all ALL GREEN at dfea7b9.
Task 10: cost unavailable (no transcript recorded)
Task 10: complete (commits a04980b..dfea7b9 on judge-across-fx, from 63f6aee..eca039c on judge-across-fx-t10; review clean after fix round 1; 5 minors deferred). Branch judge-across-fx-t10 kept (fx guard refuses branch -D).
Ruling: task 02's reported tripwires (security and silent-failure on judge-features.ts) do not match the per-task lens tripwires: no auth, secret, route, URL or string-built SQL or shell; no swallowing handler, job or loop past a failed record. No lens dispatched; the gate change itself is reviewed by the task reviewer. Cost if wrong: a missed lens, caught by the branch pass.
Task 02: task review dispatched (no lens)
Task 03: dispatched ccfa048 2026-10-24T00:07:36Z
Task 02: minor (deferred): judge-features.test.ts does not assert a scores.md rule row exists for each of the eight catalogue ids, or that each refuses id is a catalogue id.
Task 02: minor (deferred): scores.md per-rule rows have no table header or separator and render as loose text.
Task 02: minor (deferred): review-tripwires and review-search misses are mostly unrelated files with almost no near-miss negatives, so 100% and 97% overstate; extend the task 13 ADR caveat to all six sets.
Task 02: minor (deferred): dotnet-no-blocking-async clean items lack sync-context .Result and Wait(ct) cases while the rule can refuse; edit-rules.json:897 labels Wait(ct) a breach against a rule text that names Wait().
Task 02: review: spec 3 warnings, quality approved, C/I/M 0/0/4 (findings/02-review.md).
Task 02: warning 1 checked: scripts/scratch-env scripts/check-all printed ALL GREEN at dfea7b9, which contains 1258378.
Task 02: warning 2 checked: the controller re-ran scripts/scratch-env node scripts/judge-calibrate.js edit-rules against nimble:9b; the aggregate row and both refusing rule rows match scores.md (97%, confident 169/323; dotnet-no-blocking-async and web-img-alt 100%, confident 30/40).
Task 02: warning 3 (edit-rules gate follows C2, not the task's Tests line) is the ruling working as made.
Task 02: cost unavailable (no transcript recorded)
Task 02: complete (commits f613098..1258378, review clean; 4 minors deferred)
Ruling: task 14 (subagent sizing on Codex and opencode 2.x) is dropped, not added. Why: the drafted task (kept at .fx/2026-10-24-judge-across-fx/dropped-task-14.md) found no cheap-tier model recorded for either harness, Codex PreToolUse cannot rewrite a tool input under ADR 0023 and its spawn message reaches hooks encrypted, and whether opencode 2.x may change a call's input is unmeasured; so it could only log, at the cost of an implementer and a review. Task 13's ADR 0048 records the gap: sizing acts on Claude Code only, with the reasons above. Cost if wrong: Codex and opencode 2.x users get no sizing, caught by the owner reading ADR 0048.
Task 03: implementer DONE_WITH_CONCERNS (task commit 7d55fec; range ccfa048..7d55fec also holds the controller's docs commit cf94b79); check-all ALL GREEN per report.
Ruling: task 03 concern 1, the edits to session-input.ts (reads feature-judge journal events back), stop-check.ts (exports STOP_SENTENCE, ruling C11) and test-scope.test.ts (pins the hooks/ command list) are in scope. Why: each is required for the task's own behaviour or an existing gate. Cost if wrong: none beyond review surface, caught by the task 03 review.
Task 03: concern 2 (case 10b has the least margin under 2,500 ms) noted; the task 03 review judges whether it is flaky.
Task 03: lens silent-failure dispatched (tripwire: lane-hint.ts and judge-call.ts catch a throw and log one stderr line); task review dispatched.
Task 04: dispatched 7d55fec 2026-10-24T00:22:13Z
Task 03: minor (deferred): case 10b has about 200 to 350 ms of margin under its 2,500 ms limit (600 ms first delay plus 1,500 ms timer plus process start-up); lower the first delay to 300 ms, and note that 2,500 ms bounds judge time, since a 999 ms first answer still sends the second request.
Task 03: minor (deferred): fx-turn.ts and fx-codex.ts now load lib/stop-check before journaling the prompt, so a broken stop-check module loses the journal record; load it in its own try or from an import-free module.
Task 03: minor (deferred): fx-turn.ts uses `input.cwd ?? process.cwd()` while fx-codex.ts uses `||`; an empty cwd behaves differently on the two harnesses.
Task 03: review: spec compliant with 2 warnings, quality approved, C/I/M 0/0/3 (findings/03-review.md). Lens silent-failure: 4 Important (findings/03-lens-silent-failure.md).
Task 03: warning 1 checked: hooks.json in the worktree says no timeout is set for Codex hooks, so Codex's 600 s default applies; the lane hint's own 2,500 ms deadline is the bound there.
Task 03: warning 2 (check-all ALL GREEN) is re-run by the controller after the fix round.
Ruling: task 03 lens 1 is confirmed: the catch in decideLaneHint must also write one decision-log line (source judge-error with the error message, redacted) and still fail open; a logDecision failure inside that path stays stderr-only. Why: a bug that fires on every prompt must show in the log the gate is judged from. Cost if wrong: none.
Ruling: task 03 lens 2 is confirmed only for a judge.json that exists but is not usable: log one decision-log line (source judge-config) per prompt; with no judge.json, nothing is logged. Why: design Global Constraint "no judge.json means no work at all, not even a log line". Cost if wrong: one log line per prompt on a broken config, caught by the task 03 re-review.
Ruling: task 03 lens 3 is not a gap: the features breaker counts timeout and network failures, the same rule as the shell guard's breaker, by design (plan red-team F5 kept the rule and split only the state). Cost if wrong: a judge answering errors quickly costs one fast call per prompt, no timeout; caught by the task 13 bench.
Ruling: task 03 lens 4 is confirmed: with no session id the lane hint skips the judge and logs one line (source no-session), since no journal can bound a down judge's cost. Why: each hook run is a fresh process. Cost if wrong: no hint on harnesses that omit session ids, caught by the task 13 bench.
Ruling: task 03 review minor on case 10b is fixed in this round: lower its first delay to 300 ms so the 2,500 ms bound keeps margin under load. Why: a timing test that fails under load blocks every later gate. Cost if wrong: none.
Task 03: fix round 1/5 dispatched 7d55fec (resume implementer; open: lens 1, lens 2 partial, lens 4, case 10b delay)
Task 03: fix round 1 committed 7d55fec..03e0a00; dispatched re-review
Task 03: fix round 1/5 (4 addressed, 0 open: none; commits 7d55fec..03e0a00)
Task 03: cost unavailable (no transcript recorded)
Task 03: complete (commits ccfa048..03e0a00, review clean after fix round 1; 3 minors deferred). Full check-all re-run waits until task 04 commits, since task 04 has uncommitted edits in this worktree.
Task 04: implementer DONE_WITH_CONCERNS 743fd55..ffd11da (dispatch base 7d55fec; the range between holds only task 03's fix and controller docs commits); check-all ALL GREEN per report.
Ruling: task 04 concern 1, V2_AWAITS_BEFORE stays a module constant read through awaitsBefore() rather than a named export. Why: a named export on an opencode 2.x plugin module may be read as a second plugin; ruling C6 asked for a function with an FX_TEST override, which awaitsBefore() is. Cost if wrong: tasks 05 and 08 cannot import the constant, caught by their own tests.
Ruling: task 04 touches the shell guard, so its task reviewer runs as a read-only agent with no shell (owner rule: reviewers of guard code get no shell); it returns its findings as its reply and the controller saves them verbatim. Cost if wrong: the reviewer cannot run probes, caught by nothing; acceptable because the implementer's check-all output is the test evidence.
Task 04: lens silent-failure dispatched (execute.before fails open on a judged-step failure); task review dispatched (no shell).
Task 05: dispatched ffd11da 2026-10-24T00:30:08Z
Task 04: minor (deferred): remember() evicts the oldest stored judge decision past 200 with no log line, so a deny or ask can become an allow untraced (fx-opencode-v2.ts:229-232; lens silent-failure)
Task 04: minor (deferred): case 7 tests the flag-off path, not an `evaluate` with no stored decision for the key.
Task 04: minor (deferred): hard-rule-over-stored precedence, the warn-to-stderr branch and the 200-entry eviction have no test that could fail.
Task 04: minor (deferred): git-guard-denied calls leave their stored decision in the map until `execute.after`; delete it before the git checks.
Task 04: minor (deferred): a rewritten command gets the judge verdict of the original recorded command; the reference does not say so.
Task 04: review (no shell, saved verbatim by the controller): spec compliant, quality approved, C/I/M 0/0/4 (findings/04-review.md). Lens silent-failure: 3 Important, 1 Minor (findings/04-lens-silent-failure.md).
Task 04: warning checked by the controller: references/harnesses/opencode-v2.md holds "execute.before is awaited"; scripts/scratch-env node tests/gates/opencode-v2-shell-guard.test.js printed "opencode-v2-shell-guard tests passed", and harness-facts.test.js ran (output above in the controller session). Full check-all re-runs after task 05 commits.
Ruling: task 04 lens 1 is confirmed in part: when the plugin loads without guardShell, or when awaitsBefore() is false, it writes one stderr line and one decision-log line (source judge-off, with the reason) once per plugin construction, not per call. Why: an operator must be able to tell the judge is off; once per construction keeps the log small. Cost if wrong: none.
Ruling: task 04 lens 2 is confirmed in part: the guard-error entry records the error's name or reason (timeout, network, or the exception class) beside the message; text stays empty (redaction by design). Why: a code bug and a down judge must look different in the log. Cost if wrong: none.
Ruling: task 04 lens 3 is not a gap: when the decision log itself cannot be written, the stderr line is the trace by design (the same rule the shell guard follows on other harnesses). Cost if wrong: a lost log line on a broken state directory, caught by nothing; acceptable.
Task 04: fix round 1/5 dispatched ffd11da (resume implementer; open: lens 1 part, lens 2 part)
Task 04: fix round 1/5: controller re-review (12 lines): 2 addressed, 0 open; findings/04-rereview-r1.md
Task 04: cost unavailable (no transcript recorded)
Task 04: complete (commits 743fd55..5e2d79b, review clean after fix round 1; 5 minors deferred). check-all re-run waits for task 05's commit.
Task 05: implementer DONE_WITH_CONCERNS 22e2a65..620039d (dispatch base ffd11da; between them only task 04's fix and controller docs commits).
Exit check: TMPDIR=<scratchpad> scripts/scratch-env scripts/check-all printed ALL GREEN at 620039d (covers tasks 01 to 05 and 10).
Ruling: task 05 concern 1, opencode 2.x gets no lane hint: the 2.1.4 prompt event carries prompt.text but no agent field, so the plugin cannot tell a primary agent from a child session (references/harnesses/opencode-v2.md records the measured evidence). Accepted as a gap; task 13's ADR 0048 lists it. Why: a hint sent to child sessions would steer subagents, which the design forbids. Cost if wrong: no hint on opencode 2.x, caught by the owner reading ADR 0048.
Ruling: task 05's edit to src/scripts/test-scope.test.ts (pins the plugins/ rule) is in scope. Cost if wrong: none.
Task 05: lens silent-failure dispatched (fx-opencode-v1.ts lane hint block catches and warns once on stderr); task review dispatched.
Task 06: dispatched 620039d 2026-10-24T00:42:55Z
Task 05: minor (deferred): chat.message returns on missing journal or session id before the lane hint block, so a journal failure also drops the hint.
Task 05: minor (deferred): warnOnce dedupes by full message, so "lane hint off" can print more than once per plugin instance.
Task 05: minor (deferred): no test covers the "[fx] lane hint off: <message>" failure path.
Task 05: review: spec compliant (the reviewer confirmed with a read-only strings check that the opencode 2.1.4 session prompt event has no agent field), quality approved, C/I/M 0/0/3 (findings/05-review.md). Lens silent-failure: 3 Important, 1 Minor (findings/05-lens-silent-failure.md).
Task 05: minor (deferred): an unreadable chat.message output drops the hint with no trace (fx-opencode-v1.ts:524-525; lens silent-failure)
Ruling: task 05 lens 1 is confirmed: on opencode 1.x the lane hint calls decideLaneHint even with no session id, so it writes the no-session line like Claude Code and Codex. Why: the same ruling as task 03 lens 4. Cost if wrong: none.
Ruling: task 05 lens 2 is confirmed: the lane hint no longer depends on journal.js loading; a journal load failure prints one stderr line. Why: decideLaneHint resolves its own key, and a broken module must not be invisible. Cost if wrong: none.
Ruling: task 05 lens 3 is confirmed: a throw in the code around decideLaneHint (prompt parsing, primary-agent check, queueing) writes one decision-log line with source judge-error, through the same helper lane-hint uses. Why: the same ruling as task 03 lens 1. Cost if wrong: none.
Task 05: fix round 1/5 dispatched 620039d (resume implementer; open: lens 1, lens 2, lens 3)
Task 05: fix round 1 committed 620039d..3eaca24 (71 production lines, 2 removed test lines); dispatched re-review. Implementer's test-scope stopped at check-types on task 06's uncommitted files; covering tests passed one by one.
Task 05: fix round 1/5 (3 addressed, 0 open: none; commits 620039d..3eaca24)
Task 05: cost unavailable (no transcript recorded)
Task 05: complete (commits 22e2a65..3eaca24, review clean after fix round 1; 4 minors deferred). check-all re-run waits for task 06's commit.
Task 06: implementer DONE d87578a..ad76f7b (dispatch base 620039d; between them only task 05's fix and controller docs); check-all ALL GREEN per report.
Task 06: no-shell task review and lens silent-failure dispatched (fx-pretooluse.ts hosts the guards)
Task 07: dispatched ad76f7b 2026-10-24T00:57:00Z
Task 06: minor (deferred): sizeDispatch's catch calls route() unguarded, so a throw from route() rejects despite the never-rejects comment (dispatch-sizing.ts:34; lens silent-failure)
Task 06: minor (deferred): dispatch-sizing.ts duplicates isRecord and hard-codes the 'Plan' literal instead of one exported judged-type helper beside GENERAL.
Task 06: minor (deferred): no test for a justified dispatch with a small-edit answer, a justified dispatch with no model, the claude alias, or judge-config/no-session at process level.
Task 06: minor (deferred): fx-pretooluse Agent branch leaves fallBack registered after print starts, so a late rejection could emit a second stdout document.
Task 06: review (no shell, saved by the controller): spec compliant, guard isolation confirmed, quality approved, C/I/M 0/0/4 (findings/06-review.md; the unguarded route() minor duplicates the lens minor already ledgered). Lens silent-failure: 2 Important, 1 Minor (findings/06-lens-silent-failure.md).
Task 06: warning 1 checked: the codex.md and opencode-v2.md "fx does not size dispatches here" reasons come from the controller's ruling dropping task 14 (state.md), which cites task 01's references; opencode 2.1.4 has a model field, and whether a plugin may change a call's input is unmeasured, so the two sentences agree. Warning 4 (judge-config and no-session lines) follows the controller context for this task.
Ruling: task 06 lens 1 and lens 2 are confirmed: a sizing module that fails to load writes one decision-log line (source judge-error, reason "sizing module failed to load") per dispatch it falls back on, and fallBack writes a judge-error decision-log line before printing route()'s result, so a logged haiku lowering that never happened is followed by a line that says so. Why: the same rule as tasks 03 and 05. Cost if wrong: none.
Ruling: task 06 fix round also takes two review minors in the same lines: guard the catch's route() call (lens minor 3, review minor 1), and make fallBack one-shot so a late rejection cannot print a second stdout document (review minor 4). Why: same code, one review surface. Cost if wrong: none.
Task 06: fix round 1/5 dispatched ad76f7b (resume implementer; open: lens 1, lens 2, route guard, one-shot fallBack)
Task 06: fix round 1 committed ad76f7b..baebc7c (31 production lines, 6 removed test lines); dispatched re-review (no shell)
Task 06: fix round 1/5 (4 addressed, 0 open: none; commits ad76f7b..baebc7c)
Task 06: minor (deferred): the load-failure decision-log line is skipped when dispatch-route also failed to load, so the log has no trace there (the systemMessage and stderr carry it).
Task 06: cost unavailable (no transcript recorded)
Task 06: complete (commits ad76f7b..baebc7c plus task commit d87578a..ad76f7b, review clean after fix round 1; 6 minors deferred). check-all re-run waits for task 07's commit.
Task 07: implementer DONE_WITH_CONCERNS becb806..2185a09; check-all ALL GREEN per report; 4 concerns.
Task 07: concern 1 (judge-health and turn-journal gate assertions narrowed to exclude and pin the new fx-json baseline line) goes to the task reviewer to confirm no assertion lost its meaning.
Ruling: task 07 concern 2 is confirmed as a defect: file-scope rule requests send at most the 2,000 file characters task 02 measured with, not 4,000, until a re-measurement says otherwise. Why: a gate measured on one input size does not describe another. Cost if wrong: file-scope rules see less context, caught by the task 13 bench.
Ruling: task 07 concern 3 is confirmed as a defect: trimJournal keeps the newest fx-json baseline line, so a long session cannot lose it and silently re-baseline. Why: ruling F10's notice must not miss a change. Cost if wrong: none.
Task 07: minor (deferred): repository-relative paths use git rev-parse --show-toplevel without resolving symlinks, so on a symlinked temp or home path a repository file may get no rules (concern 4; not seen on Linux).
Ruling: task 07 touches the hooks that host the git and shell guards and adds a refusal path, so its task reviewer runs with no shell, and both lenses whose tripwires the report names run: security (the no-secrets rule and a refusal path that blocks writes) and silent-failure (checkEdit allows on any throw with no decision-log line). Fixes for concerns 2 and 3 join the fix round with the review's findings.
Ruling: task 11 (review judge command) is dispatched while task 07 is in review, since it is blocked only by 02, 03 and 10, all complete; tasks 08 and 09 wait for task 07's review because both build on its edit-rules module. Why: keeps one implementer running without building on unreviewed code. Cost if wrong: task 11 and a task 07 fix round both edit check-all or test-scope, caught by staging by path and the next check-all.
Task 07: no-shell review, security lens and silent-failure lens dispatched
Task 11: dispatched 2185a09 2026-10-24T01:22:33Z
Task 07: minor (deferred): edit-rules gate case 4 asserts the log has no sk-proj, which holds by construction since text is path plus id.
Task 07: minor (deferred): no process test that a Codex shell-run patch passing the edit rules is still denied by a shell hard rule.
Task 07: minor (deferred): Codex shellGuard runs inside a promise callback, so a classifyShell throw denies only under Node's default unhandled-rejections=throw.
Task 07: review (no shell, opus, saved by the controller): spec issues with 2 plan-mandated, quality changes requested, C/I/M 0/4/3 (findings/07-review.md). Lens security: 3 Important, 2 Minor (findings/07-lens-security.md). Lens silent-failure: 4 Important (findings/07-lens-silent-failure.md).
Task 07: review concern-1 check: the narrowed judge-health and turn-journal assertions keep their meaning (one is stricter).
Ruling: task 07 glob matching uses a linear wildcard matcher, not a regex built from the glob, with a unit test that a 150-star glob against a 40-character path returns false at once (review I1, security 2). Why: an agent-writable .fx.json glob must not stall every PreToolUse call. Cost if wrong: none.
Ruling: plan-mandated, task 07 refusal power is keyed on the rule id plus the exact measured rule text from the catalogue; a repository rule that reuses a refusing id with other text or another glob only advises (review I2, security minor 4). Why: ruling F2, only a rule with its own measured bar refuses. Cost if wrong: a reworded catalogue rule loses its refusal until re-measured, caught by task 09 and task 13.
Ruling: task 07 addedLines ignores a trailing carriage return on both sides, with the unit case addedLines('a\r\nb', 'a\nb\nc') giving 'c' (review I3). Why: F1 must hold on CRLF files. Cost if wrong: none.
Ruling: plan-mandated, task 07 logs its failures: the checkEdit catch, the hooks' off handlers and a failed edit-rules load each write one decision-log line (event edit-rule, source judge-error, unavailable set), wrapped in their own try; a judge.json that exists but is unusable logs judge-config; with no judge.json nothing is logged for judged rules (review I4, silent-failure 1, 3, 4). Why: the same rule as tasks 03, 05 and 06. Cost if wrong: none.
Ruling: task 07 asks each judged pair inside its own try: a pair that throws is logged judge-error and counted unchecked, and every other pair's answer still decides, so a logged refusal is never followed by an allow (silent-failure 2). Why: the log must match what happened. Cost if wrong: none.
Ruling: task 07 runs the built-in code checks in their own try before any judged work, so a judge-side throw cannot skip no-secrets, no-dashes or no-conflict-markers; a throw inside the built-ins still allows the edit and logs judge-error (security 3, in part). Why: built-ins are code checks and should not share the judge's failure modes; failing closed on a crash is not in the design. Cost if wrong: a crashing redactor allows a secret write, logged, caught by the task 13 bench.
Ruling: on the Codex shell-run apply_patch path the shell hard rules run before checkEdit, synchronously, so a slow or failing edit check cannot skip or delay them, and a classifyShell throw denies on that path as before (security 2, review minor 3). Why: the shell guard is fail-closed and must not depend on promise handling. Cost if wrong: none.
Ruling: task 07 file-scope reads skip dotenv and key files (.env, .env.*, *.pem, *.key, id_rsa*, id_ed25519*): those rules get added lines only (security minor 5). Why: a whole-file read should not ship secrets the redactor may miss. Cost if wrong: file-scope rules on those files see less, caught by nothing; acceptable.
Ruling: task 07 security 1 (the agent can set hooks.edit_rules false in .fx.json, which also turns off the built-in checks) stays as the owner decided on 2026-10-24 (finding F10: warn on change, recorded as an accepted gap in ADR 0048); task 13's ADR names this case explicitly, including no-secrets. Cost if wrong: a prompt-injected agent can write one secret before the notice, caught by the owner reading ADR 0048.
Ruling: task 07 warning 1 (the .fx.json change notice is computed only in decideStop's block mode, so opencode's reminder path gets none) is carried to task 08's brief: task 08 wires the notice on opencode 1.x's reminder path. Cost if wrong: no notice on opencode 1.x, caught by task 08 review.
Task 07: fix round 1/5 dispatched 2185a09 (resume implementer; open: review I1 to I4, security 2, 3 part, minor 4 and 5, silent-failure 1 to 4, controller concerns 2 and 3, review minor 3)
Task 11: implementer DONE_WITH_CONCERNS 2185a09..0ea1187; test-scope passed; check-all not green only because of the task 07 fixer's uncommitted files (controller re-runs it after that commit).
Task 11: task review and security lens dispatched (judge-review reads files named in a package). Waiting: tasks 08 and 09 wait for task 07's fix round, task 12 for task 11's review; no implementer dispatched until one lands.
Task 11: minor (deferred): package file paths and function names go unescaped into judge-review output read by the reviewing agent; it can only add lines (judge-review.ts:236,289; lens security)
Task 11: minor (deferred): tripwires with an enabled judge and a package that parses to no diff reports empty unchecked instead of listing every asked lens.
Task 11: minor (deferred): search drops a file whose reviewUnits result is empty (split threw, or added lines past the file end) instead of listing it unchecked.
Task 11: review: spec compliant with 1 warning (check-all and the C10 language-family check over sets/review-search.json; the controller re-runs check-all after the task 07 fix round), quality approved, C/I/M 0/0/2 (findings/11-review.md). Lens security: 1 Important, 1 Minor (findings/11-lens-security.md).
Ruling: task 11 security 1 is confirmed: judge-review never reads dotenv or key files (.env, .env.*, *.pem, *.key, id_rsa*, id_ed25519*, .npmrc, .git/ and config/master.key) even when a package names them; such files are reported unchecked. Why: a hostile package must not make fx ship secret files to a judge, which may be remote. Cost if wrong: a reviewer gets no judge help on those files; acceptable.
Ruling: the skip list is defined here and in task 07's fix round separately because both fixers run at once; the final review triages merging them into one helper. Cost if wrong: two lists drift, caught by the branch review.
Task 11: fix round 1/5 dispatched 0ea1187 (resume implementer; open: security 1)
Task 11: fix round 1 committed 0ea1187..136276d (24 production lines); dispatched re-review
Task 11: fix round 1/5 (0 addressed, 1 open: security 1 tripwires silently drops secret files, not reported unchecked; commits 0ea1187..136276d)
Task 11: minor (deferred): lens-security finding 2, unescaped file paths and function names in judge-review output
Task 11: fix round 2/5 dispatched 136276d (resume implementer; open: tripwires drops secret files without reporting them)
Task 11: fix round 2/5: controller re-review (4 lines): 1 addressed, 0 open; findings/11-rereview-r2.md
Task 11: cost unavailable (no transcript recorded)
Task 11: complete (commits 2185a09..13ce400, review clean after fix round 2; 4 minors deferred). check-all re-run waits for the task 07 fix commit.
Task 12: dispatched 3e28e1d 2026-10-24T01:35:50Z
Task 07: fix round 1 committed as ffddcff (fix diff 3e28e1d..ffddcff; the commits between 2185a09 and 3e28e1d are task 11's and controller docs); test-scope on 8 paths passed per report; dispatched re-review (no shell, opus).
Ruling: task 07 fix concern 1, MEASURED_RULES takes the catalogue rule globs from task 09's brief because the catalogue file does not exist yet; task 09 must ship the same id, text and glob for each measured rule or the refusal stops matching. Why: ruling F2 keys refusal on id plus exact text. Cost if wrong: a measured rule silently advises, caught by task 09's review and tests.
Ruling: task 07 fix concern 2, dotenv and key files under a file-scope rule get the line-scope question with added lines only; accepted as the price of not reading them. Cost if wrong: weaker checks on those files; acceptable.
Task 07: fix round 1/5 (10 addressed, 0 open: none; commits 3e28e1d..ffddcff)
Task 07: minor (deferred): the Codex gate case for shell hard rules before checkEdit (heredoc patch then rm -rf ~) also passes on the old code, and no case makes classifyShell throw on the shell-run patch path.
Task 07: minor (deferred): fx-codex's stdin end handler is async, so every deny-on-crash in handlePreToolUse (git guard, shell hard rules) reaches crashed only under Node's default unhandled-rejections=throw; the comment at fx-codex.ts:328 assumes that mode.
Exit check: TMPDIR=<scratchpad> scripts/scratch-env scripts/check-all printed ALL GREEN at c590d1a (covers tasks 01 to 07, 10, 11 and task 12's commit).
Ruling: the out-of-scope observation in findings/07-rereview-r1.md (fx-codex's async stdin end handler turns every synchronous throw in handlePreToolUse, git guard included, into an unhandled rejection, so deny-on-crash holds only under Node's default unhandled-rejections=throw) predates this plan; it is carried to the final branch review as a must-triage item, not fixed inside task 07. Why: it changes the git guard, outside task 07's scope. Cost if wrong: a Codex user with NODE_OPTIONS=--unhandled-rejections=warn gets fail-open guards on a crash, caught by the final review.
Task 07: cost unavailable (no transcript recorded)
Task 07: complete (commits becb806..2185a09 and 3e28e1d..ffddcff, review clean after fix round 1; 6 minors deferred)
Task 12: implementer DONE ffddcff..c590d1a; check-all ALL GREEN (controller run at c590d1a); task review dispatched, no lens (skill text and tests only).
Task 08: dispatched c0c7a47 2026-10-24T01:45:43Z
Task 12: minor (deferred): fx-review sentence "A lens in `unchecked`" has no lens-level referent in authored or search output; pinned verbatim, reword with the brief.
Task 12: minor (deferred): `--harness <this harness>` does not list the valid harness names; an unknown name turns the judge off silently.
Task 12: minor (deferred): fx-implement does not say to skip `search` when no lens is dispatched (exit 2) or to run it for a lens the task reviewer adds later.
Task 12: minor (deferred): fx-review search sentence shares a bullet with the branch-pass-only authored step, so its scope is ambiguous.
Task 12: review: spec compliant with 1 warning, quality approved, C/I/M 0/0/4 (findings/12-review.md).
Ruling: task 12 warning (an unchecked lens the report did not name stays undispatched) is not a gap: the judge only adds lenses, and an unchecked answer adds nothing, so the lens falls back to the controller's own tripwire reading as before this plan; the controller's brief to the reviewer overstated this. Cost if wrong: a lens the judge could not check is skipped when the controller also misses its tripwire, caught by the branch pass.
Task 12: cost unavailable (no transcript recorded)
Task 12: complete (commits ffddcff..c590d1a, review clean; 4 minors deferred)
Ruling: task 09 runs at the same time as task 08 in the shared worktree; their only shared file is scripts/check-all (one line each), and each stages its own hunks by path. Why: owner asked for safe parallelism; the file lists are otherwise disjoint. Cost if wrong: generated-file drift or a check-all collision during a run, caught by staging by path and the controller's check-all after both commit.
Task 09: dispatched d80e760 2026-10-24T01:47:09Z
Task 09: implementer DONE_WITH_CONCERNS d80e760..23bfe2a; covering tests pass one by one; check-all re-run waits for task 08's commit (its uncommitted edits drift a generated file).
Task 09: minor (deferred): picker options do not mark each rule as refusing or advising; owner sees one general sentence and a README pointer.
Task 09: minor (deferred): fx-setup-rules gate does not pin "the README lists them" or the absence of "ADR 0048" (ruling C13).
Task 09: minor (deferred): judge-cli test `nonsense` case duplicates the existing `bogus` case.
Task 09: review: spec compliant with 3 warnings, quality approved, C/I/M 0/0/3 (findings/09-review.md). Catalogue entries for the two measured refusing rules match MEASURED_RULES exactly, pinned by a test.
Ruling: task 09 warning 2 (fx-setup says "the README lists them", but no README list exists yet) is carried to task 13: task 13 adds the edit-rule catalogue list (id, rule text, glob, refuses or advises) to the README. Cost if wrong: a dangling pointer in fx-setup, caught by task 13 review.
Task 09: warnings 1 and 3 (check-all; task 08's check-all lines) are covered by the controller's check-all after task 08 commits.
Task 09: cost unavailable (no transcript recorded)
Task 09: complete (commits d80e760..23bfe2a, review clean; 3 minors deferred)
Task 08: implementer DONE_WITH_CONCERNS 3cc5f75..aa4e77d (dispatch base c0c7a47; between them only task 09 and controller docs commits).
Exit check: TMPDIR=<scratchpad> scripts/scratch-env scripts/check-all printed ALL GREEN at aa4e77d (tasks 01 to 12 except 13).
Ruling: task 08 concern 1, the opencode 1.x .fx.json baseline lives in plugin memory, not the journal, because writing it to the journal broke an existing 1.x test that must pass unchanged; accepted: a plugin lives for the whole opencode session. Cost if wrong: a plugin reload re-baselines and misses a change made before it, caught by the task 08 review.
Ruling: task 08 concern 3, checking the 2.x write and patch tools (fields read from the 2.1.4 binary) and editing test-scope.test.ts are in scope. Why: an edit rule that skips two of three write tools fails its purpose. Cost if wrong: none.
Task 08: concern 2 (RED seen only for the gate's first case) goes to the reviewer.
Task 08: no-shell task review, security lens and silent-failure lens dispatched (plugins host the git guard and fx-state refusal).
Waiting: task 13 is blocked by task 08, whose review is in flight; no implementer dispatched until it lands.
Task 08: minor (deferred): on 2.x the edit check runs in execute.before ahead of the fx-state refusal in evaluate, so an fx-state edit reaches the judge before it is refused (fx-opencode-v2.ts:475; lens security)
Task 08: minor (deferred): SECRET_FILE tests the path as written, so a symlink with an ordinary name to a key file is read; the list also misses .p12, .pfx, .netrc, .npmrc and id_ecdsa (edit-rules.ts:304; lens security; shared with task 07)
Task 08: minor (deferred): an opencode 2.x edit tool outside edit, write and patch gets no check and no warning (fx-opencode-v2.ts:132; lens security)
Task 08: minor (deferred): checkBuiltins then checkEdit both run builtinStep, so one builtin crash logs two judge-error lines (fx-opencode-v2.ts:445-450; lens silent-failure)
Task 08: minor (deferred): slow-judge gate case never asserts a rule request was sent, and the clean-addition case's zero-request assert is vacuous with the gate off (opencode-edit-rules.test.ts:166-172, 216-224)
Task 08: minor (deferred): opencode-v2.md:76-77 says V2_AWAITS_BEFORE "turns false" and states "only advise" flatly, contradicting the 2.1.4 measurement
Task 08: review (no shell, opus, saved by the controller): spec compliant with 1 warning (the 2.1.4 tool and field names rest on the implementer's strings reading; task 13's bench is the check), quality approved, C/I/M 0/0/6 (findings/08-review.md). Lens silent-failure: 2 Important, 1 Minor. Lens security: 3 Minor.
Ruling: task 08 silent-failure 1 and 2 are confirmed: a failed edit-rules load, or a missing checkBuiltins or checkEdit export, writes one decision-log line through logEditRuleError (source judge-error) per edit it falls back on, on both majors; the 2.x detached promise's catch logs through logEditRuleError with a message that says the result could not be applied. Why: the same rule as tasks 03 to 07. Cost if wrong: none.
Ruling: task 08 fix round also takes four review minors in the same code: declare queue and warnOnce before execute.before registers so a call during setup cannot throw and refuse (review minor 3); run builtinStep once per 2.x edit by handing checkBuiltins's result to the judged path (review minor 2, silent-failure minor 3); the 1.x fx-json-watch load failure is reported once like the other loaders (review minor 4); the 1.x notice reuses fxJsonNotice and writes the same health fx-json decision-log line as Claude Code and Codex (review minor 6). Why: same lines, and minor 3 turns a fail-open path into a refusal. Cost if wrong: none.
Task 08: fix round 1/5 dispatched aa4e77d (resume implementer; open: silent-failure 1, 2; review minors 2, 3, 4, 6)
Task 08: fix round 1 committed fda5518 (fix diff aa4e77d..fda5518); dispatched re-review (no shell). Implementer notes plugins no longer call checkBuiltins and fx-json-watch.ts changed (outside the file list).
Task 08: fix round 1/5 (6 addressed, 0 open; commits aa4e77d..fda5518)
Task 08: minor (deferred): 1.x .fx.json notice now goes through fxJsonNotice's bare catch, so a crash there is silent where it used to reach markTurn's warnOnce (fx-json-watch.ts:45, fx-opencode-v1.ts:496)
Task 08: minor (deferred): checkBuiltins has no production caller after the fix; its comment and ruling C7's wording still name it as the 2.x path (edit-rules.ts:248-253, state.md:20)
Task 08: minor (deferred): check-all not re-run after fix round 1, which changed the shared src/lib/fx-json-watch.ts; acceptance criterion 4 rests on the earlier run
Exit check: TMPDIR=<scratchpad> scripts/scratch-env scripts/check-all printed ALL GREEN at fda5518 (answers the re-review's stale-check-all minor).
Ruling: pre-flight ruling C7 now holds through builtinStep, not checkBuiltins: opencode 2.x execute.before runs builtinStep first and throws synchronously on a built-in breach (re-review verified for edit, write and patch under both FX_V2_AWAITS_BEFORE values); checkBuiltins stays exported for its unit test. Cost if wrong: none.
Task 08: cost unavailable (no transcript recorded)
Task 08: complete (commits 3cc5f75..aa4e77d and aa4e77d..fda5518, review clean after fix round 1; 9 minors deferred)
Task 13: dispatched c63fb77 2026-10-24T02:25:52Z
Coverage audit: 12 gaps (findings/coverage-audit.md); tasks 03 to 12 each own the code half of every story and none is refusals-only.
Ruling: coverage gaps 1 to 10 are folded into task 13 while it runs: its gate compares the edit-rules row against the per-rule rows (gap 3), ADR 0048 and README state each narrowed decision (sizing on Claude Code only, no lane hint on opencode 2.x, refusal keyed on id plus exact text and glob, failure-logging and secret-file skip rules, the 2,000-character cap, the self-written labelled sets, the full .fx.json gap including no-secrets), the README gets the edit-rule catalogue list, and design.md and plan.md get dated amendment notes for gaps 1, 4, 5 and 10. Why: they are documentation of rulings task 13 already owns. Cost if wrong: stale design text, caught by the final review.
Ruling: coverage gap 11: ADR 0048 states that a crash inside the built-in checks allows the edit and logs judge-error; the timing assertion for the no-judge path is deferred. Task 07: minor (deferred): no process test bounds the time of a no-judge built-in edit check (coverage gap 11).
Ruling: coverage gap 12: ADR 0048 gets one line each for the Codex unhandled-rejection caveat and the two secret-file skip lists; both stay must-triage items for the final branch review.
Task 13: implementer DONE_WITH_CONCERNS c63fb77..5a3b49c; check-all ALL GREEN per report; version 0.4.0.
Ruling: task 13 concern 1, tests/lane-triggering/run-test.sh ignores FX_LIVE_PROVIDER, so that live bench runs on the owner's Claude login, not Haiku through OpenRouter; benchmark.md says so; accepted for the owner to choose when running it. Cost if wrong: before and after differ only if the owner's model changes between runs, caught by the owner.
Task 13: minor (deferred): run-test.sh does not set XDG_CONFIG_HOME, so an exported value sends the judge config to the wrong place (and the real one into the before run).
Task 13: minor (deferred): INSTALL Judge section lacks the decision-log troubleshooting promised by coverage gap 8; only the ADR has the source table.
Task 13: minor (deferred): ADR 0048 per-rule and concurrency rows have no table header, so they render as plain text.
Task 13: minor (deferred): the judge-adr gate pins the opencode 2.x statements only by loose substrings and does not assert INSTALL's 2.x paragraph.
Task 13: review: spec issue 1 (plan.md:104 still says EDIT_FILE_CHARS 4000; code is 2000; coverage gap 10), quality changes requested, C/I/M 0/1/4 (findings/13-review.md); reviewer ran bench-judge.test.sh, judge-adr, release-version and check-prose: pass.
Task 13: fix round 1/5 dispatched 5a3b49c (resume implementer; open: plan.md EDIT_FILE_CHARS row)
Task 13: fix round 1/5: controller re-review (1 docs line): 1 addressed, 0 open; findings/13-rereview-r1.md
Exit check: TMPDIR=<scratchpad> scripts/scratch-env scripts/check-all printed ALL GREEN at 6fe1162 (all 13 tasks).
Ruling: the task 13 review minor on tests/lane-triggering/run-test.sh not setting XDG_CONFIG_HOME (a before run may read the owner's real judge config where XDG_CONFIG_HOME is exported) is a must-triage item for the final branch review, since it can make the before and after runs the same. Cost if wrong: a meaningless live comparison, caught by the final review or the owner's pilot step.
Task 13: cost unavailable (no transcript recorded)
Task 13: complete (commits c63fb77..6fe1162, review clean after fix round 1; 4 minors deferred)
Final review: coverage audit done (12 gaps, folded into task 13); branch packaged 402e983..6719212 (authored-only package for reviewers); dispatching broad pass (no shell, opus) and unprimed devil's advocate (opus); no lens qualifies for the branch pass (security and silent-failure fired on every task whose files they cover; database, a11y and pipeline triggers match no authored file).
Final review: unprimed adversarial pass returned 1 Critical, 5 Important, 3 Minor (findings/final-unprimed.md).
Final review: controller verified finding 1 with scripts/scratch-env node and lib/edit-rules.js builtinBreach('no-secrets', ...): true for `<li key={item.id}>`, `password: "Password"`, a 40-character git SHA in prose and `app/controllers/admin/organizations/subscriptions/controller`; false for `const x = 1` and `cache_key: x`. The built-in no-secrets rule refuses ordinary code with no judge configured. Confirmed Critical.
Final review: controller probed finding 2: addedLines("a\n/>\nb\n", "a\n<img\n/>\nb\n/>\n") returns "<img\n/>": each old line is consumed once (a multiset), not a line diff; confirmed as a weaker form of the finding.
Task 04: minor (deferred): opencode 2.x runs the shell judge in execute.before ahead of the git guard in evaluate, so a git-guard-refused command is still sent to the judge and journaled (fx-opencode-v2.ts:526-536)
Task 07: minor (deferred): test-scope maps lib/judge-call.js, lib/stop-check.js and lib/edit-rules.js only to their sibling unit tests though the shell guard, both turn hooks and four harness gates now depend on them (src/scripts/test-scope.ts:55-75)
Task 07: minor (deferred): the Codex Stop .fx.json notice goes only to stderr on an exit-0 Stop hook; that Codex shows it is unmeasured while ADR 0048:93 and README say it does (fx-codex.ts:481)
Task 07: minor (deferred): edit-rule and sizing deadlines exclude the pre-judge git spawns (2 s timeout each), so the worst case can pass Claude Code's 5 s hook timeout and drop a built-in refusal or route()'s model; sizing also spawns git with no judge.json (edit-rules.ts:226-229, dispatch-sizing.ts:45)
Final review: broad pass returned 4 Important, 4 Minor (findings/final-review.md); its carried-minor triage names must-fix items 35, 41, 42, 51, 55, 60, 61, 65 and confirms the rest deferred.
Ruling: one fix agent takes the complete list in .fx/2026-10-24-judge-across-fx/context/final-fix-list.md: unprimed 1 to 9 (1 Critical, 5 Important, 3 Minor) and broad Important 1 to 4 plus broad minor 3; the remaining broad minors stay deferred. Why: the lane allows one fix wave; the unprimed minors 7 to 9 are small and sit in files the wave already edits. Cost if wrong: a larger single round, caught by the one scoped re-review.
Ruling: the .fx.json notice on Codex stays on stderr at Stop (whether Codex shows it is unmeasured), documented as such; opencode 1.x also writes it to stderr. Why: the owner chose a notice over a refusal; the docs must not promise what is unmeasured. Cost if wrong: the owner never sees the notice on Codex, caught by the owner reading ADR 0048.
Final review: fix wave dispatched 6719212 2026-10-24T02:53:44Z (one fixer, opus, 13 items)
Final review: fix wave DONE_WITH_CONCERNS c363933..e028c3f (12 commits); controller check-all ALL GREEN at e028c3f.
Final review: controller re-probed no-secrets at e028c3f with builtinBreach (output above in session): the four ordinary lines no longer refuse; a PEM private key block and an sk-proj key still refuse.
Final review: fix wave (13 addressed, 0 open; commits c363933..e028c3f)
Final review: minor (deferred): ADR 0048:72 says the 2.x plugin "falls back to advice only" by itself; V2_AWAITS_BEFORE is a constant someone must set to false
Final review: minor (deferred): lineDiff past 4,000,000 cells counts the whole middle as added, so no-secrets and no-conflict-markers refuse on content already on disk in a large-file Write (edit-rules.ts:56)
Final review: minor (deferred): secretFile matches credentials.* and *.env code files, and one such file marks every tripwire lens unchecked (judge-review.ts:223)
Final review: minor (deferred): edit-rules now imports shell-rules, so a shell-rules load failure turns off the built-in edit rules
Final review: minor (deferred): tripwires and search skip lockfiles and marker files without listing them unchecked; a hand-written DO NOT EDIT header hides a file from the lens hints
Final review: minor (deferred): rules skipped by the request cap now add an advisory line on every such edit (noise)
Exit gate: TMPDIR=<scratchpad> scripts/scratch-env scripts/check-all exit 0, ALL GREEN, 0 FAIL lines at e028c3f. The only CI workflow (.github/workflows/conformance-nightly.yml) runs live conformance against model providers, which the owner's rules keep off this machine's automated runs; not run.
Plan complete: tasks 01 to 13 complete, 0 parked (task 14 dropped by ruling), final review fixed
