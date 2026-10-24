### Finding verdicts

- **Review I1 / security 2: a rule glob can hang the hook through regex backtracking (ruling: linear matcher plus a 150-star unit test)**: ADDRESSED.
  - `globMatch` (src/lib/edit-rules.ts:72) now splits the glob into tokens and sweeps a reachable-positions array once per token. No regex is built from the glob. The cost is O(tokens × path length × brace options).
  - `dirs`, `star`, `any` and `text` keep the old regex meaning: `**/` is `(?:[^/]*/)*`, empty names included.
  - src/lib/edit-rules.test.ts (diff 1191-1196) has a 150-star glob and a 60-segment `**/` glob, each under 100 ms. The report says the RED run of the old code stalled for 94193 ms.
- **Review I2 / security minor 4: refusal keyed on id alone (ruling: id plus exact measured text)**: ADDRESSED.
  - `refusesRule` (src/lib/judge-features.ts:79) requires `refusingRule(id)`. It also requires the `MEASURED_RULES` entry (looked up with `Object.hasOwn`) to match the glob and rule text exactly, with no `scope`. That is stricter than the ruling, which asked for the text only; security minor 4 asked for the glob as well.
  - Both the per-pair log (edit-rules.ts:301) and the decision (edit-rules.ts:332) use it.
  - The test ties each `MEASURED_RULES` text to sets/edit-rules.json and its keys to `REFUSING_RULES`.
  - The gate's web-img-alt case would fail against the old code: the reworded rule and the `**/*` glob both exited 2 there.
  - The test override (`FX_REFUSING_RULES` under `testing()`) is the only path that still keys on the id alone.
- **Review I3: `addedLines` splits on `\n` only, so CRLF breaks F1**: ADDRESSED. src/lib/edit-rules.ts:40-41 strips one trailing `\r` per line on both sides. The ruling's unit case and its reverse are at diff 1207-1208. Both fail against the old code (it returned `a\nc`).
- **Review I4 / silent-failure 1, 3, 4: failures allow with stderr only, nothing in the decision log**: ADDRESSED.
  - The checkEdit catch, and both new inner catches in `decide`, go through `failed` → `logEditRuleError` (edit-rules.ts:188-199). That writes `event: edit-rule`, `source: judge-error`, `action: allow`, with `unavailable` set and its own try.
  - In both hooks, `editRulesOff` (src/hooks/fx-pretooluse.ts:191, src/hooks/fx-codex.ts:208) covers the load failure, the `off` crash handlers and the Codex shell `rulesOff`. Each writes one builtins-only line in its own try.
  - A `judge.json` that exists but cannot be used logs `judge-config`/`bad-config` once per rule (edit-rules.ts:275-277). With no `judge.json` nothing is logged (edit-rules.ts:273).
  - Gate cases would all fail against the old code, which logged nothing: load failure on both hooks, `boom`, and an invalid `judge.json` with two lines.
- **Silent-failure 2: a throw in one pair discards the other pairs' answers, so a logged refusal can be followed by an allow**: ADDRESSED.
  - `ask` wraps its whole body in a try (edit-rules.ts:289-311).
  - Each rule is logged first and `a.answer` is set right after, with nothing between them that can throw (lines 302-305).
  - The catch logs `judge-error` only for rules with no answer. `logDecision` never throws (src/lib/decision-log.ts:57-79), so `ask` cannot reject. `Promise.all` and the sequential loop therefore always finish.
  - The decision step (lines 327-342) calls the same `refusesRule` on the same `answer`. A rule whose `refusesRule` threw inside `ask` has `answer` undefined and is skipped. No path logs `action: refuse` and then returns allow.
  - The `pairThrows` unit test would fail against the old code: its rejection reached the outer catch, which allowed.
- **Security 3 (in part): a judge-side throw can skip the built-ins**: ADDRESSED.
  - edit-rules.ts no longer imports judge, judge-call, judge-features, judge-questions or journal at load time. They are `require`d inside `judged` (lines 270, 279-282), after the built-ins.
  - The built-ins run in their own try (lines 226-242), and `judged` runs in a separate one (lines 243-247).
  - Gate case: with `lib/judge-call.js` replaced by a throw, the em dash write is refused with exact text and exit 2. Against the old code, the static import broke edit-rules loading and the write exited 0.
  - Only judge-call was swapped in a test. The other four lazily required modules are covered by the same structure, not by a test.
- **Security minor 5: file-scope reads ship whole dotenv and key files**: ADDRESSED. `SECRET_FILE` (edit-rules.ts:211) matches exactly the ruling's list. Those pairs get `editRuleState(rel, added)` and the line wording (line 290-294, accepted by ruling 211). A gate case covers six files, plus `notes.txt` still sending the file. A mutation run confirmed it catches the change.
- **Controller concern 2: file-scope requests send 4,000 file characters where task 02 measured 2,000**: ADDRESSED. `EDIT_FILE_CHARS = 2000` (src/lib/judge-thresholds.ts:41). The judge.ts cap is back to the base text (`CAP_COMMAND` for `file`, diff 1938). judge-questions.test and gate case 16 now pin 2,000, and both were seen failing.
- **Controller concern 3: `trimJournal` can drop the fx-json baseline**: ADDRESSED. src/lib/journal.ts:67-68 keeps `findLastIndex` of the `fx-json` lines in the head, sorted, and only when it is below `keep`; otherwise the tail already holds it. journal.test asserts that exactly the newest baseline survives 3,000 large edits. It was seen failing.
- **Review minor 3: Codex `shellGuard` runs inside a `.then`, so a `classifyShell` throw denies only under the default unhandled-rejections mode**: ADDRESSED.
  - `shellHardRules` (src/hooks/fx-codex.ts:367) now runs synchronously in `handlePreToolUse`, at fx-codex.ts:330. That is after `checkPatchPaths` and before `checkEdit`, with `crashed` still armed.
  - A hard deny skips `checkEdit` and goes to `shellGuard(..., hardDeny)`. `classifyShell` is no longer called twice.
  - The patch path is now at parity with the non-patch path. The remaining caveat is in the stdin `end` handler, which predates task 07 (see Out-of-scope).

### New breakage in the fix diff

- Minor: the Codex check for item 10 does not test what it claims.
  - The only Codex case added for it (src/tests/gates/edit-rules.test.ts, diff 2178-2182, a heredoc patch then `rm -rf ~`) passes against the old code too. The implementer says so.
  - No case makes `classifyShell` throw on the shell-run patch path. So "hard rules before checkEdit" and "a throw still denies" at fx-codex.ts:328-331 are shown by reading only.
- RED evidence: of the new gate and unit cases not seen failing, only this Codex case could pass against the old code. Each of the others would fail against it, as noted per finding above:
  - the load failure on both hooks
  - `boom`
  - `judge load`
  - the invalid `judge.json`
  - web-img-alt reworded and moved
  - dotenv
  - `pairThrows`
  - both CRLF cases

  The new glob unit cases (`{a`, zero-directory `**/`, `*/x`) also pass on the old code. They are regression pins for the rewrite, not RED cases, which is fine.

### Out-of-scope observations

- `process.stdin.on('end', async () => ...)` (src/hooks/fx-codex.ts:504) predates task 07. It turns every synchronous throw in `handlePreToolUse` into an unhandled rejection, and that includes the new `shellHardRules` call. `crashed` is registered only on `uncaughtException` (fx-codex.ts:265), so every deny-on-crash there, the git guard's included, holds only under Node's default `--unhandled-rejections=throw`. The comment at fx-codex.ts:328-329 ("a throw still reaches crashed") is true only in that mode.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 07: fix round 1/5 (10 addressed, 0 open: none; commits 3e28e1d..ffddcff)
Task 07: minor (deferred): the Codex gate case for shell hard rules before checkEdit (heredoc patch then rm -rf ~) also passes on the old code, and no case makes classifyShell throw on the shell-run patch path.
Task 07: minor (deferred): fx-codex's stdin end handler is async, so every deny-on-crash in handlePreToolUse (git guard, shell hard rules) reaches crashed only under Node's default unhandled-rejections=throw; the comment at fx-codex.ts:328 assumes that mode.
