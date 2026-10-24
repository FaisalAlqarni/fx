### Finding verdicts

1. **Review Important 2, failed health check shown as healthy: ADDRESSED.**
   - `src/plugins/fx-opencode-v2.ts:94-102` keeps the load error in `healthError` instead of an empty catch.
   - `:104-108` loads `lib/health-failure.js` in its own `try`, as 1.x does.
   - `:388-395` runs `(judgeHealth ? judgeHealth(healthInput) : Promise.reject(healthError)).catch(healthFailed).then(print and store).catch(stderr line)`.
   - This matches the 1.x shape at `src/plugins/fx-opencode-v1.ts:359-365`, except that a `judge-health.js` load failure also reaches `healthFailed`. 1.x gives `Promise.resolve(null)` there, so no line.
   - `src/lib/health-failure.ts:12` loads no judge-side module, as the comment at `:1-4` says.
   - The final `.catch` at `:395` closes the throw-in-`onFulfilled` hole that lens Minor 3 raised.
   - `judgeHealth` is `async` (`src/lib/judge-health.ts:10`), so it cannot throw synchronously out of `setup`.
   - Tests: `src/tests/gates/opencode-v2-shell-guard.test.ts:231-232` cover a rejecting probe and a throwing module load. Both assert the `is unavailable (health-check-failed)` line in the context text and exactly one copy on stderr.

2. **Lens silent-failure Important 1, the prompt hook fails silently: ADDRESSED.**
   - `fx-opencode-v2.ts:360-375` adds `warnOnce` and covers three cases.
   - A null session key gives the "carried no session id" line at `:371`.
   - `appendEvent` returning false gives the "could not be written" line at `:373`. I confirmed `journal.ts:36-46` returns a boolean.
   - A `journal` module that did not load throws into the catch at `:375` and gives the "hook failed" line.
   - The test at `opencode-v2-shell-guard.test.ts:~162-175` covers a missing id and a non-string id, then an unwritable journal. It asserts one line each.
   - The journal-not-loaded branch has no test (see ledger).

3. **Lens silent-failure Important 2, health line dropped without trace: ADDRESSED.**
   - `fx-opencode-v2.ts:410-412` writes one stderr trace when `healthLine !== null` and there is no session id. The comment at `:408-409` gives the reason for a trace instead of a push: the context hook fires on every request.
   - This is a valid reading of the finding's "or print a stderr line" fix option. The test adds `stderr.length = 0`, calls the hook twice with no id, and asserts a single line and no second copy of the health line.
   - One caveat. In the session text, a dead judge still looks healthy for an event with no id. This is the option the finding allowed, so I am not re-opening it.

4. **Review Minor 4, stale "and stamp" wording: ADDRESSED.**
   - `fx-opencode-v2.ts:378` now reads "the Stop reminder cannot work on this opencode".
   - `references/harnesses/opencode-v2.md:49-53` states the design 6 reason: a stamp after the prompt hook would let an agent approve its own command.
   - It also says the rule stays if the judge later runs. The "no stamp from branch B" framing is gone.
   - The `PROMPT_GAP` constant in the test matches the new text.
   - `src/plugins/fx-opencode-v2.ts` and the reference no longer say "and stamp". The task file does (see ledger).

### New breakage in the fix diff

1. **Minor. A failed `health-failure.js` load makes a failed check silent again.**
   - `:107-108` has an empty catch, and `:389` returns null when `healthFailed` is undefined.
   - If `judge-health.js` also failed to load, `healthError` is dropped with no line.
   - This needs two modules broken at once. It is the same empty-catch shape as the deferred 06 SF 4 item.

2. **Minor. `warnOnce` is not "once per instance" when the message varies.**
   - `:375` keys the set on text that includes `messageOf(e)`.
   - A failure whose text changes (a path, an errno) prints a new line each time.
   - It is bounded by distinct messages, not unbounded.

3. **Minor. The "journal did not load" branch has no test.**
   - The report claims three cases fixed. `opencode-v2-shell-guard.test.ts` has no `journal.js` break.
   - Nothing fails if the branch at `:369` is removed. The null-key and false-return cases are covered.

4. **Stderr traces on a normal path: none.**
   - The prompt traces fire only on a missing id, a write failure or a throw.
   - The context trace needs `healthLine !== null` and no id.
   - `healthFailed` writes stderr only when a check actually failed.
   - Hard rules still final: the diff has no hunk in the `permission.hook('evaluate')` region (about `:255-330`) or in `shellGuard`, so `hardDeny` precedence is unchanged.

5. **Prompt registration order is unchanged: not new.**
   - `ctx.session.hook('prompt')` is still awaited at `:367`, before `session.context` at `:397`. This is the existing review Minor 3, already in the ledger. The diff did not move it or make it worse.

### Tests evidence

- **Reported (implementer, not re-run by me):**
  - Four REDs came from the gate `opencode-v2-shell-guard.test.ts`: the prompt trace, the old mirror text, the context trace, and the health-rejects case.
  - GREEN: `opencode-v2-shell-guard tests passed`, with the stderr lines `[fx] judge health: probe` and `[fx] judge health: health load`.
  - Also reported green: `opencode-v2-plugin`, `opencode-malformed`, `check-types`, `check-ts-escapes` (126 files) and check-prose on the reference.
  - `test_scope` reported exit 0 over the three touched paths, ending at `release-version.test.js: OK`.
- **Gap:** the `health-load` case never failed on its own before the fix, which the report admits. Because `health-rejects` runs first and shares the fix, the RED for the load path is inferred, not seen.
- **Real runtime (review I1, handled by the controller, not re-opened):**
  - `tests/install/run.sh opencode-v2` passed (`a 2.0.18 stub installs v2`).
  - Conformance printed `SKIP opencode-v2: opencode 1.19.4 on PATH is not this harness's major`.
  - `brainstorm-server` passed alone.
  - A skip proves nothing about real `session.hook('prompt')` registration.
- **Flake exposure:** the `ownLines()` filter excludes only lines containing " is unavailable" followed by an opening parenthesis. Any other late stderr from an earlier plugin instance would break the exact-array asserts. I saw no such line in the reported output, so I do not rate it a finding.

## Ledger lines
Task 07: fix round 1/5 (4 addressed, 0 open: review I2 health failure now reaches health-failure.js in its own try, SF I1 and I2 traces once per instance, "and stamp" wording and no-stamp reason fixed; commits 795a770..d0025ad)
Task 07: minor (deferred): a health-failure.js load failure still leaves a failed check silent, and healthError is dropped if judge-health also failed to load (fx-opencode-v2.ts:107-108, :389).
Task 07: minor (deferred): warnOnce keys on text that includes the error message, so a varying message repeats past once per instance (fx-opencode-v2.ts:375).
Task 07: minor (deferred): the prompt hook's journal-did-not-load branch has no test, so the report's three-case claim covers two (opencode-v2-shell-guard.test.ts, fx-opencode-v2.ts:369).
Task 07: minor (deferred): out of scope, src/plugins/fx-opencode-v1.ts:360 gives no health line when judge-health.js fails to load while 2.x now does; the two plugins give different outcomes (task 06 files).
Fixed ledger number: 4
