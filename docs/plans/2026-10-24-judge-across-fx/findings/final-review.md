# Final branch review: judge-across-fx (402e983..6719212)

Reviewed in one pass. I read `branch-authored.diff` once and the HEAD sources of the files several tasks touched: `fx-pretooluse.ts`, `fx-codex.ts`, both opencode plugins, `shell-guard.ts`, `edit-rules.ts`, `judge-call.ts`, `test-scope.ts`, `run-test.sh`, ADR 0048, INSTALL.md and README.md. I had no shell, so I ran no tests and created no worktree.

### Strengths

- **The fail-closed and fail-open edges hold where tasks meet.** On Claude Code, Codex and opencode 1.x, the edit rules run only after the fx-state refusal and the lane check (`fx-pretooluse.ts:257-266`, `fx-codex.ts:326-331`, `fx-opencode-v1.ts:630-646`). The `crashed` handler is swapped for the allow handler only after those checks.
- **The Codex shell guard's hard rules still run synchronously before the async edit check** (`fx-codex.ts:330`), so a slow or broken edit rule cannot skip them.
- **Moving the shell guard's circuit breaker into `judge-call.ts` changes nothing.** I compared the old `breakerOpen` and append logic with `askJudgeWithBreaker`: same filter, same cooldown, and the same "append on failure or on the first call after a failure" rule. The guard's breaker (`judge` events) and the features' breaker (`feature-judge` events) are kept apart as ADR 0048 says.
- **Refusal is keyed on exact text.** `refusesRule` requires the id, text and glob to match exactly, and `rule-catalogue.test.ts:38` plus `judge-adr.test.ts:58-63` tie `MEASURED_RULES`, the catalogue and the README table together.
- **The Agent branch prints exactly one document.** The `done` flag in `fx-pretooluse.ts:294-316` stops a late rejection from printing a second one (this closes carried item 30).
- **Journal trimming keeps the newest `.fx.json` baseline** (`journal.ts`), so the change notice cannot re-baseline silently.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. **INSTALL.md:243-245, INSTALL.md:409-411, README.md:238-239, docs/adr/0048-the-judge-acts-only-where-measured.md:71: the user docs and the ADR say the opencode 2.x shell guard runs no judge. The code runs one.**
   - Task 04 set `V2_AWAITS_BEFORE = true` (`fx-opencode-v2.ts:249`) and runs the full `guardShell` in `execute.before` (`:532`). `evaluate` then applies the stored ask or deny (`:399`), and the loop guard now asks on 2.x.
   - `references/harnesses/opencode-v2.md` "Shell guard" and design decision 9 agree with the code. Task 13 wrote the opposite into the ADR, and two older INSTALL and README sentences were never updated.
   - Why it matters: this is a guard whose behaviour changed on this branch, and the docs owners and users read deny that it changed. A user on 2.x with a remote judge is now sending grey commands to it, and README says this does not happen.
   - Fix:
     - Rewrite the four passages to match opencode-v2.md "Shell guard".
     - Fix the ADR's `judge-off` row (`:86`). It is written when a judge config exists but the plugin cannot use it (not awaited, or no `guardShell` export), not "started with no usable judge".
     - Reword `opencode-v2.md:76-77` (carried item 55) in the same pass.
     - Have `judge-adr.test.ts` assert that the 2.x judge sentence is present and that "the judge step is not used" is absent.
   - Cross-task: tasks 04 and 13.

2. **edit-rules.ts:212, judge-review.ts:70-71, shell-rules.ts:607-608: three secret-file lists that disagree.**
   - `edit-rules.ts` withholds the whole file only for `.env*`, `*.pem`, `*.key`, `id_rsa*` and `id_ed25519*`.
   - `judge-review.ts` adds `.npmrc` and `.git`.
   - `shell-rules` already lists `id_ecdsa`, `id_dsa`, `.p12`, `.pfx`, `credentials`, `.aws/`, `.kube/config`, `.netrc`, `.pgpass` and `.git-credentials`.
   - Why it matters: a repository file-scope rule with a broad glob sends the first 2,000 characters of `~/.netrc`-style files, `.p12` files or `id_ecdsa` to the judge, which may be remote. README.md says "SSH key files" are protected, and the code does not cover `id_ecdsa` or `id_dsa`. ADR 0048:91 leaves the decision to this review.
   - Decision: merge them before merge. Export one predicate built from the `SECRETS` list in `shell-rules`, and use it in both `edit-rules` and `judge-review`. Carried items 51 and 60.
   - Cross-task: tasks 07, 08, 11 and 13.

3. **fx-codex.ts:265 and :328: on Codex, a crash denies only under Node's default unhandled-rejections mode.**
   - `handlePreToolUse` runs inside the `async` stdin `end` handler. A synchronous throw there (git guard, hard rules, read-only role check) becomes a rejected promise, not an `uncaughtException`, and only `uncaughtException` is wired to `crashed`.
   - This existed before the branch. The branch adds a new comment at `:328` claiming "a throw still reaches `crashed`", and a new async stretch (`checkEdit`) on the shell-run patch path during which no `unhandledRejection` handler is registered.
   - With `NODE_OPTIONS=--unhandled-rejections=warn`, a crashing git guard on Codex fails open.
   - Fix: add `process.on('unhandledRejection', crashed)` at `:265`, and remove it wherever `crashed` is removed (`:347`, `:377`).
   - This is a few lines and restores the fail-closed rule the git guard is defined by. Carried items 41 and 42 (and 35): must fix before merge.

4. **tests/lane-triggering/run-test.sh:81-93: the bench overrides `HOME` but not `XDG_CONFIG_HOME` or `XDG_STATE_HOME`, and `jail.sh:100` passes `XDG_CONFIG_HOME` into the jail.**
   - When the owner's shell exports either variable, the judge config and the state directory resolve outside the scratch home. Then:
     - the "before" run can use the real judge;
     - the copied `FX_BENCH_JUDGE` file is ignored;
     - decision logs and journals can land in the owner's real state directory.
   - ADR 0048:53 names this bench as the second check on the scores.
   - Fix: next to the `HOME=` line, set `XDG_CONFIG_HOME="$HOME/.config"` and `XDG_STATE_HOME="$HOME/.local/state"`, as `tests/conformance/run.sh:74` already does.
   - Carried items 61 and 65: must fix before merge.

#### Minor (Nice to Have)

1. **fx-opencode-v2.ts:526-536: on 2.x the shell judge runs in `execute.before`, before the git guard (which runs in `evaluate`).**
   - A command the git guard will refuse is still sent to the judge and journaled as a deny or ask.
   - Claude Code and Codex run the git guard first, so there a refused command never reaches the judge.
   - The outcome does not change (the git guard's refusal still wins), but it costs judge latency and sends the command off the machine for nothing.
   - Fix: run `inspect` on the recorded command before calling the judge.
   - Task 04.

2. **src/scripts/test-scope.ts:55-75: some shared modules run only their own unit test when changed.**
   - A change to `lib/judge-call.js`, `lib/stop-check.js` or `lib/edit-rules.js` runs only its sibling unit test.
   - On this branch the shell guard (via `askJudgeWithBreaker`), both turn hooks (via `STOP_SENTENCE`) and four harness gates came to depend on them.
   - A scoped run can be green while `shell-guard-claude`, `turn-journal` or `opencode-edit-rules` is red. Only `check-all` catches it.
   - Tasks 03 and 07.

3. **fx-codex.ts:481: on Codex the `.fx.json` change notice at Stop goes only to stderr, on an exit-0 Stop hook.**
   - No harness fact records whether Codex shows that stderr to the user.
   - ADR 0048:93 and README say Codex shows the notice.
   - Fix: measure it, or say "at resume" for Codex.
   - Task 07.

4. **edit-rules.ts:226-229, dispatch-sizing.ts:45: the 2,500 ms edit deadline and the sizing budget start only when the first judge request goes out.**
   - Before that, `readRepoConfig` and `repoRoot` each run `spawnSync git` with a 2 s timeout.
   - In the worst case a write or an Agent dispatch goes past Claude Code's 5 s hook timeout. A timed-out hook is non-blocking, so a built-in refusal, or the model that `route()` picked, is lost.
   - Sizing also spawns git on every general dispatch even with no `judge.json`, because `featureMode` runs before `loadJudge`.
   - Tasks 06 and 07.

### Where a guard's outcome can now differ from before this branch

- **opencode 2.x shell guard (intended, but documented wrongly; Important 1).** Grey commands can now get ask or deny from the judge, and a repeat within 10 minutes asks. Before, every grey command was allowed. The stored decision replaces `guardShellCodeOnly`, and hard rules still win in `evaluate`. If more than 200 stored decisions build up, the oldest is evicted, and that call falls back to code rules with no log line (carried item 18).
- **Codex shell-run `apply_patch`.** A built-in or measured edit-rule refusal now exits 2 before the shell guard's judge runs. That is stricter, and the hard rules still run first. A missing edit-rules module or a crashing edit check still reaches the shell guard (`rulesOff`).
- **Codex, any guard crash.** Fails open under `--unhandled-rejections=warn`. This existed before, the branch widens the window, and the comment at `:328` is now wrong (Important 3).
- **Claude Code and Codex with a broken `lib/stop-check`.** The UserPromptSubmit hook now loads it before journaling the prompt (`fx-turn.ts:112`, `fx-codex.ts:411`). The prompt is then lost, so a `# fx-ok` stamp is never honoured and the shell judge gets no `user_request`. This only happens on a broken install and fails toward stricter. Carried item 16, confirmed deferred.
- **fx-state refusal.** Order unchanged on Claude Code, Codex and 1.x. On 2.x the edit check runs in `execute.before`, before the refusal in `evaluate`. The refusal still holds, and the state directory normally sits outside the repository, so no rule fires on it (carried item 50).
- **Claude Code Bash path and git guard code.** Unchanged. The shell guard's breaker refactor behaves the same as before.

### Spec compliance

- ⚠️ **Plan aligned, with deviations that are recorded and justified:**
  - Sizing runs on Claude Code only, and the 2.x lane hint was dropped (ADR 0048:67, :70; dropped-task-14.md). Both rest on measured harness facts.
  - `edit-rules` is enabled while its aggregate row reads `log-only`, per ruling C2 (ADR 0048:30).
- ❌ **Docs contradict design decision 9 and the code on the 2.x shell judge** (Important 1).
- ⚠️ **Cannot verify from the diff:**
  - Test results. state.md:280 records `scratch-env check-all` ALL GREEN at 6fe1162, and 6719212 adds only docs. The controller should confirm that line.
  - Whether Codex shows a Stop hook's stderr (Minor 3).
  - That the built `lib/` files match `src/` (covered by `check-generated` inside check-all).

### Carried findings triage

**Must fix before merge:**

| Item | Reason |
|---|---|
| 35, 41, 42 (Codex unhandled rejection) | Git guard fail-closed; a few-line fix (Important 3). |
| 51, 60 (secret-file lists) | Merge the lists; README's SSH-key promise is false today (Important 2). |
| 55 (opencode-v2.md:76-77) | Fold into the Important 1 docs pass. |
| 61, 65 (run-test.sh XDG) | Otherwise the before and after bench runs can be identical (Important 4). |

**Resolved at HEAD:**

| Item | Reason |
|---|---|
| 27 | `route()` in the sizing catch is now inside its own try (`dispatch-sizing.ts`). |
| 30 | The `done` flag blocks a second document. |
| 58 | state.md:262 records ALL GREEN at fda5518. |

**Confirmed deferred:**

| Items | Reason |
|---|---|
| 1-5 (task 01) | Calibration tooling only; no runtime path. |
| 6-10 (task 10) | Splitter errors only narrow a lens brief; the lens still reviews the whole diff. |
| 11, 12, 13 (task 02) | Test and doc polish; the build-agent caveat is already in ADR 0048:53. |
| 14 (task 02) | Relabelling `Wait(ct)` as clean would give 29/30 ≈ 97% precision, still at or above 95%. Re-label at the next calibration. |
| 15 (task 03) | Timing margin in a test, not runtime. |
| 16 (task 03) | Broken-install path only; fails toward stricter (see above). |
| 17 (task 03) | An empty cwd only changes which `.fx.json` is read; no guard effect. |
| 18-22 (task 04) | Rare (200 in-flight cancelled calls, rewritten commands); the git guard and hard rules still run in `evaluate`. |
| 23-26 (task 05) | Lane hint is advice. |
| 28, 29, 31 (task 06) | Duplication and test gaps on an advice path. |
| 32 (task 07) | A symlinked repo path silently skips the edit rules, built-ins included. Nothing regressed (they are new), but `fs.realpathSync` on both sides is a cheap follow-up. |
| 33, 34, 40 (task 07) | Test-strength gaps; behaviour checked by reading. |
| 36-39 (task 11) | Unescaped paths and names in judge-review output reach only the controller agent, which already reads the diff. |
| 43-46 (task 12) | Skill wording; an unknown harness turns the judge off, which is safe. |
| 47-49 (task 09) | Picker UX and a duplicate test. |
| 50, 52, 53, 54, 56, 57 (task 08) | Advice paths, duplicate log lines, dead `checkBuiltins` kept for its unit test. |
| 59 (coverage gap 11) | Timing assertion only. |
| 62, 63, 64 (task 13) | Doc polish. |

### Recommendations

- Make the 2.x shell-judge statement one sentence, owned by `references/harnesses/opencode-v2.md`, and gate INSTALL, README and the ADR against it the way `judge-adr.test.ts` already gates the catalogue table.
- Add a test-scope rule mapping `lib/judge-call.js` and `lib/stop-check.js` to the shell-guard and turn gates.
- Start the edit and sizing deadlines when the hook is entered, not when the first judge request goes out.

### Assessment

**Ready to merge?** With fixes.

**Reasoning:** Each guard's order and fail-closed edges hold at every cross-task seam except two. The Codex crash path fails open in a non-default Node mode, and the docs and ADR misstate the new 2.x shell judge. Both fixes are small, as are the secret-list merge and the bench XDG fix.

## Ledger lines

Task 04: minor (deferred): opencode 2.x runs the shell judge in execute.before ahead of the git guard in evaluate, so a git-guard-refused command is still sent to the judge and journaled (fx-opencode-v2.ts:526-536)
Task 07: minor (deferred): test-scope maps lib/judge-call.js, lib/stop-check.js and lib/edit-rules.js only to their sibling unit tests though the shell guard, both turn hooks and four harness gates now depend on them (src/scripts/test-scope.ts:55-75)
Task 07: minor (deferred): the Codex Stop .fx.json notice goes only to stderr on an exit-0 Stop hook; that Codex shows it is unmeasured while ADR 0048:93 and README say it does (fx-codex.ts:481)
Task 07: minor (deferred): edit-rule and sizing deadlines exclude the pre-judge git spawns (2 s timeout each), so the worst case can pass Claude Code's 5 s hook timeout and drop a built-in refusal or route()'s model; sizing also spawns git with no judge.json (edit-rules.ts:226-229, dispatch-sizing.ts:45)
