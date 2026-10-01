# Final re-review: fix wave 068f3f8..e9f6243

Scope: W1 to W16 of `final-fix-wave.md`, checked against the code at HEAD (e9f6243). Read-only; no live rows run.

## Verdicts

| Item | Verdict | Note |
|---|---|---|
| W1 child provider errors | issue | opencode 1.x shape matches the real log; the opencode-v2 branch can never match (I1); claude-code misses status-less API errors (I3) |
| W2 failed export fails the row | issue | does what was asked, but the session-id scrape now turns a real PASS into a FAIL (I2) |
| W3 `sm` crash visible | ok | `sm="$(...)" \|\| fail` sits after a separate `local`, so node's exit status is the one tested |
| W4 read-only fails closed | ok | see below |
| W4 reindent c957a1d | ok | `git show -w c957a1d` shows no change; one file, 52/52 lines |
| W5 plantRoles stderr | ok | |
| W6 one hidden-lane list | ok | v1 loads its config step with the module present; test derives the set from frontmatter (M6) |
| W7 free-mode SKIP | ok | cannot fire on the right major; can fire on a non-1/2 reading (M1) |
| W8 row 15 comment | ok | wording slightly overstated (M5) |
| W9 lane check docs | ok | v1 and v2 claims match `plugins/fx-opencode-v1.js:261-285` and `plugins/fx-opencode-v2.js:141-154`; row 17 v2 log shows `write` denied with fx's reason |
| W10 Claude Code 18 of 18 | issue | citation does not carry the claim (M3) |
| W11 timeout wording | ok | ADR-0038:16 matches `tests/conformance/lib/live.sh:398` |
| W12 not built | ok | one dangling "as above" (M4) |
| W13 one major per dir | ok | INSTALL.md, ADR-0036:7 and :16 agree with design.md:117 and task 06's 1.18.25 refusal |
| W14 removal and upgrade | issue | 1.x depth key missing from the removal steps (M2); upgrade line correct (link is `<dest>/plugins/fx.js`, target renamed in d1c04d2) |
| W15 ADR-0039, ADR-0020 | ok | `SHELL_APPLY_PATCH` (hooks/fx-codex.js:127), `checkPatchPaths` (:105), stderr text (:108), `$fx:` form (lib/preamble.js:55) all as stated; diagram aligned |
| W16 ADR-0026 exception | ok | six read-only agents (`codex/agents` has 6), five lanes; code overrides an incoming allow |

### W4 in detail

`plugins/fx-opencode-v2.js:112-118`: the read-only branch is outside `attempt()`, wraps `readsOnlyReferences` in its own try, and every throw returns a deny with the reason. `readsOnlyReferences` (:73-80) returns false (deny) for any action other than `external_directory`, for a missing or non-array or empty resource list, and runs `path.resolve` on each resource before the prefix test against `references/` and its realpath. A `subagent`, `edit`, `shell` or `skill` action from a read-only agent is denied, because none is in `READ_ACTIONS`. On the passing path the hook sets nothing, so the agent's own rules still apply. I found no path in the hook body where a read-only agent's non-read action is left allowed. The one remaining route is at load time (M6, pre-existing).

## Issues

### Critical

None.

### Important

**I1. W1 opencode-v2 detector reads a shape 2.x never writes.** `tests/conformance/lib/openrouter.js:118-124` reads `m.info.error.data`. Every 2.0.18 export in `/tmp/fxlogs-opencode-v2-final/*opencode-v2.log` has flat messages (`id, time, type, agent, model, content, snapshot, finish, rawFinish, cost, tokens`) with no `info` key, so `d` is always undefined and the branch returns null on v2. The real log the wave cited (`/tmp/fxlogs-opencode-v2/18-...-opencode.log` line 21) is a 1.18.25 export (`"version":"1.18.25"`); it matches the 1.x branch correctly (`statusCode: 429`). The v2 fixture at `tests/conformance/openrouter.test.js:87-92` feeds the 1.x shape to `opencode-v2`, so the test passes without proving anything for v2. `sessionModel` in the same file already handles both (`m.info || m`), and `live-openrouter.test.sh`'s own v2 stub export uses the flat shape. Why it matters: on v2 a subagent that dies on a 429 still leaves the row free to PASS, which is the false pass W1 was meant to close. The report's "both paths are implemented as asked" is wrong for v2. Fix: read `(m.info || m).error`, and find where 2.0.18 puts an assistant error (no export in the logs carries one; the v2 stream line is `{"type":"error","error":{"type":"provider.rate-limit","status":429}}`, so the export probably carries a similar `error` object). Without a real sample, match `error.status`/`error.statusCode` and `error.message` on the flat message and say in the test that the v2 shape is inferred.

**I2. W2 turns a real PASS into a FAIL through a loose session-id scrape.** `tests/conformance/lib/live.sh:435` and `:448` collect ids with `grep -oE 'ses_[A-Za-z0-9]+'`, which matches inside any word, and W2's new check (`live.sh:457-458`) fails the row on any `export failed:` line. Evidence: `/tmp/fxlogs-opencode-v2-final/04-naive-prompt-invokes-lane-opencode-v2.log` holds `export failed: ses_valueerror: Unexpected end of JSON input`, scraped from the model's `test_invalid_raises_valueerror`. That row passed in the final matrix (INSTALL.md 2.0.18: 18 pass); at HEAD it would FAIL with "child session export failed: ses_valueerror", and a FAIL is not re-run. Any model that writes a Python test named `*raises_*` triggers it, on both opencode harnesses. Fix: anchor the id, e.g. `grep -oE '(^|[^A-Za-z0-9_])ses_[A-Za-z0-9]{20,}'` then strip the prefix, or read ids only from `sessionID`/`parentID`/`metadata.sessionID` fields. Add a fixture with `raises_valueerror` in the stub run text to `live-openrouter.test.sh`.

**I3. W1 claude-code detector misses API errors that carry no status.** `tests/conformance/lib/openrouter.js:160` requires `apiErrorStatus` to match `STATUS`. In the real transcripts under `~/.claude/projects`, 89 entries have `isApiErrorMessage: true`; 14 have no `apiErrorStatus` (`error: "authentication_failed"` 10, `error: "server_error"` 4). A sidechain that dies on one of those is not seen, so the row can still PASS. `isApiErrorMessage` is the CLI's own flag, never model text, so matching on it alone keeps the "never read model output" rule. Fix: return `String(j.apiErrorStatus || j.error || 'api error')` when `isApiErrorMessage === true`; add a status-less fixture.

### Minor

**M1. W7 SKIP fires on any reading that is not this harness's major.** `tests/conformance/run.sh:37-41` skips when the first integer is not `want`, so a 3.x binary, a banner line with digits, or a nonzero `--version` exit with digits skips both harnesses with exit 0. The installer (`scripts/fx-opencode-install:360-364`) errors on those cases instead. It cannot skip the right major, so no real run is hidden on 1.x or 2.x. Fix: skip only when `have` is the other supported major (`[ "$have" = "$((3 - want))" ]`).

**M2. W14 removal steps omit the 1.x depth key.** `INSTALL.md:495-499` says the record lists `experimental.subagent_depth`. On 1.x the installer writes top-level `subagent_depth` and records it as `subagent_depth`; on 2.x the record key is `experimental_subagent_depth` (`scripts/fx-opencode-install:434-437`, `:456-468`). A 1.x user following the steps leaves `subagent_depth: 2` behind. Fix: name both keys and which major writes each.

**M3. W10 citation does not carry "18 of 18".** `INSTALL.md:594` says the other twelve rows "were proven 18 of 18 in `78ff5b3`". That commit only turns rows 13 and 14 into live checks (4 files, rows and events.js). The 16 other passes come from the task 21 final2 run (`docs/plans/2026-09-21-multi-harness/state.md:2530`) and the two from 78ff5b3 (`state.md:2543`). No record shows one 18 of 18 run. Fix: "proven across the task 21 run (16 pass) and `78ff5b3` (rows 13 and 14)".

**M4. Dangling "as above".** `tests/conformance/README.md:194`: "re-run once by hand on the same model, as above" points at nothing above that describes a hand re-run. Drop "as above" or point at ADR-0038.

**M5. Row 15 comment overstates.** `tests/conformance/rows/15-subagent-dispatches-subagent.sh:22`: "proves that config and the runtime's nesting, not fx". Nesting on v2 also needs the installer's `experimental.subagent_depth: 2`, which is fx. Say "not fx's plugin".

**M6. Load-time failures still widen a read-only agent or skip the config step (one pre-existing, one new).** Pre-existing, outside the diff: `plugins/fx-opencode-v2.js:66-69` leaves `READ_ONLY = []` if `lib/plant-roles.js` fails to load (it reads `codex/agents` at require time), and then the evaluate hook re-denies nothing for the installer's agents. New with W6: `plugins/fx-opencode-v1.js:131` throws when `lib/user-invoked-lanes.js` fails to load, which now skips the whole config step (skills, agents, commands), not only the lane hiding. Both are reported, and both need a broken checkout. Note only.

**M7. A crash of the export parser leaves no line.** `tests/conformance/lib/live.sh:271-275`: if the inline `node -e` itself dies, nothing is appended for that session, so W2's check cannot see the lost export. Fix: `|| echo "export failed: $id: parser exited $?" >> "$LOG"`.

## Test results (run at HEAD)

```
node tests/gates/opencode-v2-plugin.test.js     opencode-v2-plugin.test.js: OK   (exit 0)
node tests/gates/opencode-plugin.test.js        opencode-plugin.test.js: OK      (exit 0)
node tests/conformance/openrouter.test.js       openrouter.test.js: OK           (exit 0)
node tests/gates/user-invoked.test.js           user-invoked.test.js: OK
node tests/gates/codex-hook-output.test.js      codex-hook-output: all passed
node lib/preamble.test.js                       preamble.test.js: OK
bash tests/conformance/live-openrouter.test.sh  live-openrouter: all passed
bash tests/conformance/runner-isolation.test.sh runner-isolation: all passed
  ok   major: opencode-v2 on a 2.x binary runs its rows (rc=0)
  ok   major: opencode on a 1.x binary runs its rows (rc=0)
bash tests/conformance/live-exit-code.test.sh   live-exit-code: all passed
bash tests/install/run.sh opencode-v2           install (opencode-v2): all passed
```

All pass. None of them covers I1 (the v2 fixture uses the 1.x shape), I2 (no fixture with an id-like word in model text) or I3.
