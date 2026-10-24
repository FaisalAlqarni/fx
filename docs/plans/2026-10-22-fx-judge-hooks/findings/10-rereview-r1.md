### Finding verdicts

**1. Review I1 = lens SF I1 (2.x tracker silently off, false reminders): ADDRESSED.**
- Both plugins now warn once when `tool.execute.after` carries no session id or tool name. The warnings are at `src/plugins/fx-opencode-v1.ts:457` and `src/plugins/fx-opencode-v2.ts:408`. The v1 case was also in the lens finding.
- On 2.x, a completed `shell` call with outcome `unknown` and empty output warns once (`fx-opencode-v2.ts:415`). It also adds the session to `blind` (`:416`).
- At the next prompt (`:449`), a blind session skips `decideStop`, so no "no check passed" reminder is sent. This closes the false-reminder half that review I1 raised and the implementer's self-review had missed.
- The gate drives the exact shape: `completed` with no exit and no output, after an edit. It expects zero `REMINDER_MAKE` and one stderr line.

**2. Review I2 (a killed 1.x run must never verify): ADDRESSED.**
- `src/lib/opencode-input.ts:56` sets `interrupted: true` when `metadata.exit === null`. The type field is at `src/lib/types.ts:160`.
- `fx-opencode-v1.ts:463` passes it on, and `loop-tracker.ts:82` gates `verified` on it.
- The plugin gate runs edit, then `make test` with exit null and the output `Tests: 3 passed`, then a prompt. It expects the reminder to fire. Without the fix, the pass summary would verify and the reminder would be suppressed.
- Parser units cover both the null case and the missing-exit case. A missing exit is not an interruption.

**3. Review I3 (read-only agent exemption on opencode): ADDRESSED for 1.x, conditional on 2.x.**
- Both plugins now record `agentType` on the prompt event (`fx-opencode-v1.ts:493`, `fx-opencode-v2.ts:455`). The tracker's exemption at `loop-tracker.ts:98` keys on the first prompt's `agentType`, so it applies.
- On 1.x the source field is `chat.message` `input.agent`, which task 06 measured. The gate checks a read-only agent with 12 reads gets no nudge, and an ordinary agent in the same setup still does.
- On 2.x the field is `ev.agent`, which is not measured. The 2.x test fabricates `{ agent: 'fx-lens-security' }`. The v2 header (`:40-44`) says the exemption does not apply without it. This is disclosed, but it is unverified, not proven.
- `agentId` stays null, so passive-stall is not root-only on opencode. See the judgment on that below.

**4. Lens SF I2 (a record when queued lines are pushed): ADDRESSED.**
- `drain` writes a `queue-pushed` decision-log line when it returns any lines (`src/lib/opencode-queue.ts`, drain). Both transforms go through it (`fx-opencode-v1.ts:448`, `fx-opencode-v2.ts:502`).
- The 1.x gate asserts the log contains `queue-pushed`. The 2.x push path is not asserted at the plugin level, but it uses the same module.

**5. Lens SF I3 (bounded queue, stale lines dropped, a log line on drop): ADDRESSED.**
- The cap is 5 lines per session and 50 sessions. The oldest session is evicted, and each drop is logged as `queue-dropped`.
- `startTurn` runs at each prompt (`fx-opencode-v1.ts:485`, `fx-opencode-v2.ts:447`) and drops that session's leftover lines with a logged count.
- The ordering is correct. `startTurn` runs before the Stop reminder is enqueued, so the new reminder survives.
- The queue unit test covers the line cap, the session cap, eviction of `t0`, and the drop log. The 1.x gate covers the stale-line drop.

**The implementer's choices**

- **A 2.x turn with an unreadable shell result skips the reminder. Is that silent?**
  - It is not silent, but the trace is thin. There is one stderr line per plugin instance, and the line says the reminder is "unreliable", not that it is skipped.
  - The skip itself writes no decision-log line. `decideStop` is not called, so it logs nothing either.
  - A reader of the decision log sees an edit turn with no stop decision and cannot tell why. A TUI host may not show stderr at all.
  - Skipping is the right call, because the reminder text asserts "no check passed", which fx cannot know. The remaining gap is the missing log line (Minor 1).
- **agentId stays null. Is that acceptable, and is it documented?**
  - It is acceptable as a residual. Neither input tells a child session from a root one, and inventing a signal would be worse.
  - The effect is that passive-stall can fire in a non-read-only child session, such as a general or explore subagent. That is a known gap against design 8's "root session only".
  - The v2 header documents it (`fx-opencode-v2.ts:40-44`). On v1 it is only an inline comment at `fx-opencode-v1.ts:491-492`. The v1 header at `:69-73` still says subagents are covered by the same path, with no caveat. The report's claim "stated in both headers" is wrong for v1 (Minor 2).

### New breakage in the fix diff

No Critical and no Important.

1. **Minor, trace:** the blind-turn skip on 2.x writes no decision-log line (`fx-opencode-v2.ts:449-452`). A "reminder skipped, shell result unreadable" record would let a debugger tell the skip from "nothing to remind".
2. **Minor, doc drift:** the v1 header does not record that `agentId` is null or that passive-stall is not root-only (`fx-opencode-v1.ts:69-73`). Only an inline comment does, and the report overstates this.
3. **Minor, coverage of the blind rule:** the guard needs `output === ''` (`fx-opencode-v2.ts:414`). A 2.x event that has output text but no exit status is still `unknown`. It still never counts as a failure, so repeat-failure is still disabled for it with no warning. That is the same gap, one step narrower.
4. **Minor, dead code:** `sessionId: session ?? null` survives at `fx-opencode-v1.ts:486`, but the `session === undefined` throw at `:484` makes it unreachable. `:477` already returns when there is no session id, so the throw is dead too. This is harmless, but the diff added a check that cannot fire.
5. **Minor, log schema:** `queue-pushed` and `queue-dropped` are logged as `event: 'nudge'` with `action: 'none'`. Nothing in `src` reads the log back, so nothing breaks today. A later consumer counting `event === 'nudge'` would count pushes and drops as nudges.
6. **Minor, test fragility:** `opencode-malformed.test.ts` expects `reported: 2` for a null after-event, then `0` for a number after-event. The second `0` holds only because `warnOnce` already fired in the previous call, so the cases depend on order.

### Tests evidence

- **What I checked:** the diff has the new cases at the listed locations, and the built `tests/gates/opencode-turn.test.js` mirrors the source. I could not run anything.
- **Implementer's claims, not verified by me:**
  - `node lib/opencode-input.test.js` gave `opencode-input tests passed`.
  - `node tests/gates/opencode-turn.test.js` gave `opencode-turn tests passed`.
  - `test_scope` ended `ALL GREEN` with `exit=0`.
- **RED:** only two cases were seen failing. The parser case "a null exit is a killed process" failed, and so did the plugin case "a killed check is no evidence" (`0 !== 1`). The report admits the gate stops at the first failure.
- **Not seen red:** these new cases went green once the implementation landed, so their discriminating power rests on reading the code:
  - read-only agent
  - push log
  - drop log
  - queue caps
  - 2.x blind
  - the two no-session warnings
- **Reasoning checks:**
  - The blind case would fail without the skip, since an unverified edit produces `REMINDER_MAKE`.
  - The stale-drop case would fail without `startTurn`.
  - The agent case would fail without `agentType`, since 12 reads fire the stall line.
- **Gap:** no plugin-level 2.x case asserts `queue-pushed`, and 2.x `agentType` is tested only against a fabricated field.

## Ledger lines
Task 10: fix round 1/5 (5 addressed, 0 open: review I1 = lens SF I1, review I2, review I3 (2.x leg rests on an unmeasured `agent` field), lens SF I2, lens SF I3 all closed; commits 7858921..f1d76ef)
Task 10: minor (deferred): the 2.x blind-turn skip of the Stop check leaves no decision-log line, only one stderr line per instance that says "unreliable" and not "skipped".
Task 10: minor (deferred): the v1 header lacks the agentId-null and passive-stall-not-root-only caveat that the v2 header has; the report's "both headers" claim is wrong.
Task 10: minor (deferred): on 2.x a shell event with output but no exit status stays `unknown` without a warning, so repeat-failure is still silently off for it; the blind rule needs empty output.
Task 10: minor (deferred): `sessionId: session ?? null` at fx-opencode-v1.ts:486 and the `session === undefined` throw at :484 are unreachable after the :477 early return.
Task 10: minor (deferred): `queue-pushed` and `queue-dropped` are logged as event `nudge` with action `none`, so any future log consumer counting nudges will overcount.
Task 10: minor (deferred): opencode-malformed.test.ts relies on order, because the number after-event reports 0 only after the null case has used the once-only warning.
Task 10: minor (deferred): passive-stall is not root-only on opencode (design 8): a non-read-only child session such as general or explore can be nudged; the inputs give no child-session signal and the 2.x agent exemption rests on an unmeasured field.
Fixed ledger number: 7
