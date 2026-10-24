### Finding verdicts

- **Lens 1 (Important): a sizing module that fails to load leaves no decision-log line**: ADDRESSED. The load-failure stub at `src/hooks/fx-pretooluse.ts:101-107` now calls `sizingOff('sizing module failed to load', i.sessionId, i.cwd)`. `sizingOff` (`:85-90`) writes a `judge-error` / `keep` / `dispatch` line with `unavailable` set. Gate case 15 (`src/tests/gates/dispatch-sizing.test.ts`, diff hunk at +340) dispatches twice and asserts `log.length === 2`, `event` dispatch, `source` judge-error and `unavailable` 'sizing module failed to load'. This is one line per dispatch, as the ruling says.
- **Lens 2 (Important): `fallBack` is silent and a logged haiku lowering can go unretracted**: ADDRESSED. `fallBack` (`:269-275`) now writes the stderr line, then `sizingOff(m, ...)`, then `print(routed, null)`. Gate case 16 (a `sizeDispatch` that rejects) asserts output equals today's routing, the stderr text, and one log line with `source` judge-error, `action` keep and `unavailable` 'boom'. Case 18 (an unserializable result) asserts the fall back to `route()` and a `judge-error` line.
- **Lens 3 / review minor 1: `sizeDispatch`'s catch calls `route()` unguarded**: ADDRESSED. `src/lib/dispatch-sizing.ts:35` wraps the call and returns `{ input: null, context: null }` if it throws. The lib test adds a hostile `subagent_type` getter. `route()` and `decide` both read it, so `decide` throws, the catch's `route()` throws too, and the test asserts `{ input: null, context: null }`.
- **Review minor 4: `fallBack` stays live after `print` starts, so a second stdout document is possible**: ADDRESSED. `print` returns early once `done` is set. `done` is set after `JSON.stringify` and before the write (`:262-264`), and `fallBack` returns early on `done` (`:270`). The ordering is right. A stringify throw happens before `done`, the `.then(onOk, ...)` form turns it into an unhandled rejection, and `fallBack` then prints `routed`. Case 18 covers that. Case 17 fires a late `Promise.reject` while 4 MB drains and asserts exactly one document. The report says case 17 failed with the `done` guards disabled. I did not re-run it.

### New breakage in the fix diff

- **Minor: the load-failure log line is skipped when `dispatch-route` itself failed to load.** `src/hooks/fx-pretooluse.ts:102` only logs when `routingOffMsg === null`. Judgement: acceptable. In that case sizing fails only because it imports `route`, so there is one root cause. The user already sees it through `systemMessage` plus stderr (`:69-73`), and `failed-load-claude-dispatch-route` pins the stderr as exactly the routing line. The cost is that the decision log has no line for those dispatches, so a log-only reader cannot tell this from "judge never ran". Not blocking.
- **Removed test lines (6): no assertion was weakened.** The six removed lines in the `.ts` test are the old case-15 comment, `copy`, two `cpSync`, `writeFileSync` and the `dispatch(...)` call. They moved into the shared `withSizing` helper. The case-15 assertions on `r.out === today`, `r.sent.length === 0` and the stderr text are unchanged, and the log assertions are added.
- **Guard outcomes: unchanged.** `sizingOff` is a top-level function declaration with no load-time side effects and is called only from the stub and from `fallBack`, both in the Agent/Task path. The Bash branch (`:195-226`) and the Write/Edit branch (`:228-242`) are untouched and return or exit before the Agent branch. The `done` flag is local to the Agent branch.
- No new warnings or noise in the reported output. The report names the covering commands and their results.
- Not checked: I did not run any test. I read the elided hunks of `fx-pretooluse.ts` and `dispatch-sizing.ts` from the source files, since the diff file elides context.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 06: fix round 1/5 (4 addressed, 0 open: none; commits ad76f7b..baebc7c)
Task 06: minor (deferred): the load-failure decision-log line is skipped when dispatch-route also failed to load, so the log has no trace there (the systemMessage and stderr carry it).
