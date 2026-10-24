### Finding verdicts

**Review Important 1 (ignored `appendEvent` result): ADDRESSED.**
- `appendEvent` returns false on any throw (`src/lib/journal.ts:36-47`).
- `decideStop` now routes every block through a `block()` helper (`src/lib/stop-check.ts:~55-62`). It logs `action: block` only if the write succeeded.
- On a failed write it logs `source: journal-error, action: allow` (`stop-check.ts:60`) and returns `{ text: null }`.
- All three block exits use the helper: judge-failed or judge-ok, no-message, and no-judge. No path appends the event bare any more.
- Block-once can no longer degrade to block-always.

**Review Important 2 = lens SF Important 1 (a throw, load failure or non-function `decideStop` left no log line): ADDRESSED.**
- `decideStop` catch (`stop-check.ts:~80-86`) writes one `stop-error, allow` line. It sits in its own try and caps the message at 200 characters. `decideStop` still never rejects.
- Hook level has twin builtins-only writers:
  - Claude: `fx-turn.ts:56-66`, wrapped by `stop()` at `:68-83`. It covers the load failure, the non-function check and any throw.
  - Codex: `fx-codex.ts:420-429`, called from the `stopCheck` catch at `:413-416`.
- No double logging. `decideStop` handles its own throws, so the hook catch fires only for load failures and non-function exports.

**Is "allow" the right fail-open, and is it logged? Yes, with one caveat.**
- Allow is logged, as the `journal-error` line.
- Caveat: on Claude Code, `stop_hook_active` already bounds the repeat, so a block with an unwritable journal would still have been shown once. The fix gives that up. On Codex it is correct, because continuation behaviour is unconfirmed (`references/harnesses/codex.md`).
- I am not reopening the call. It matches the fix the review recommended. Recorded as a Minor.
- Edge case: a journal that is unwritable from the start has no edit events either, so no block would have fired anyway. The realistic case is a journal that became unwritable mid-session, which is what the test builds.

**Can the builtins-only error line throw out of the hook or exit 2? No, in practice.**
- Codex:
  - `describe()` is documented never-throws and wrapped in try (`fx-codex.ts:174-176`).
  - A null `crashLogDir` is handled inside the try (`:424`).
  - Both `emit(..., '', 0)` call sites (`:463`) are exit 0.
  - Pre-routing `deny` exits (`:435`, `:446`) are unchanged and already a deferred Minor.
- Claude:
  - `stopOff` is called inside `stop()`'s catch and under the handler's outer try (`fx-turn.ts:87-113`). The hook only ever writes stderr or exits 0.
  - One theoretical hole: `String(e)` runs outside the inner try in `stopOff` (`:57`) and in the outer catch (`:112`). A null-prototype throwable would reject the handler. Node would then exit 1, which Claude treats as non-blocking, so it cannot exit 2.

### New breakage in the fix diff

1. **Minor: the unit test depends on file permissions.**
   - `src/lib/stop-check.test.ts` cases w1 and w2 rely on `chmod 0444` making the append fail.
   - Run as root, such as a CI container, the append succeeds and the test fails with a block. It is red for the wrong reason. There is no skip guard.
2. **Minor: the "builtins only" claim is untested and partly untrue.**
   - The gate stubs only `lib/stop-check.js`, leaving `decision-log`, `fx-paths` and `journal` intact. A broken `decision-log` is never exercised, which is the stated reason for the twin writers.
   - `fx-turn.ts:60` requires `../lib/fx-paths`, a lib module. The comment at `:54-55` says builtins only. If `fx-paths` is the broken module, the Claude line is silently lost. The Codex twin resolves the path at load time (`fx-codex.ts:167-171`), so the two differ.
3. **Minor: the `journal-error` line loses judge detail.**
   - In case w2 the judge already ran. The `journal-error` line (`stop-check.ts:60`) drops `model`, `latencyMs`, `p` and `escalate`, so a 3am reader cannot see what the judge said.
4. **Minor: `String(e)` at `stop-check.ts:~80` and `fx-turn.ts:57` can throw before the try.** This is the same edge as above and is theoretical. The Codex path guards it through `describe()`.

Not breakage: the `source` and `action` fields are plain strings (`decision-log.ts:19-20`), so the new values need no union change. `GuardSource` at `types.ts:260-262` is guard-only and correctly untouched.

### Tests evidence

**Does the 0444 file test cover the finding? Yes.**
- A read-only directory does not fail an append to an existing file. Appending needs write permission on the file, and the directory matters only for creating one. The implementer's reasoning is correct.
- A directory that blocks creation also blocks the edit events, so there is nothing left to block.
- The 0444 file exercises the same `appendEvent` false branch that ENOSPC, EIO and EACCES would hit.
- Cases w1 (no judge, null message) and w2 (judge at 0.9, with message) cover the two block call sites that the test can reach. The `no-message` source with a ready judge goes through the same helper.
- Each case asserts three things: text is null, there is exactly one log line for the session, and that line is `allow` with `journal-error`.

**Other tests:**
- The unit test t1 uses a judge handle whose `config` getter throws. It asserts the result is null and that there is one `stop-error` line with `event: stop` and the message "boom in judge".
- The gate covers 2 stubs (non-function export, load throw) × 4 hook and event pairs (`fx-turn.js` and `fx-codex.js`, each with Stop and SubagentStop). Each case asserts:
  - exit 0
  - empty stdout
  - exactly one log line
  - the fields `event: stop`, `action: allow`, `source: stop-error`, and a non-empty `unavailable`
- RED outputs in the report show the exact failing assertions, so the cycle is real.
- Claimed GREEN (not re-run by me):
  - `stop-check.test.js: ok` for both unit and gate
  - `loop-nudge.test.js: ok`
  - `codex-hook-output: all passed`
  - `check-types: OK`
  - `check-ts-escapes: OK (134 files)`
  - scope run `rc=0`
- I did not verify the end-of-test assertions elided from the diff, such as "one line per decision". The added log lines under new session names could affect them, but the claimed GREEN says otherwise.

Files:
- `/development/fx/.worktrees/fx-judge-hooks-b/src/lib/stop-check.ts`
- `/development/fx/.worktrees/fx-judge-hooks-b/src/lib/journal.ts`
- `/development/fx/.worktrees/fx-judge-hooks-b/src/hooks/fx-turn.ts`
- `/development/fx/.worktrees/fx-judge-hooks-b/src/hooks/fx-codex.ts`
- `/development/fx/.worktrees/fx-judge-hooks-b/src/lib/stop-check.test.ts`
- `/development/fx/.worktrees/fx-judge-hooks-b/src/tests/gates/stop-check.test.ts`

## Ledger lines
Task 09: fix round 1/5 (2 addressed, 0 open: none; commits edc96e0..5216ca0)
Task 09: minor (deferred): unit cases w1/w2 rely on chmod 0444 blocking a write, so they fail as root and have no skip guard (src/lib/stop-check.test.ts).
Task 09: minor (deferred): the builtins-only Stop error writer is untested against a broken decision-log, and fx-turn.ts:60 requires lib/fx-paths despite the comment saying builtins only.
Task 09: minor (deferred): the journal-error log line drops the judge's model, latency, p and escalate, so a lifted-or-blocked judge result is invisible (stop-check.ts:60).
Task 09: minor (deferred): on Claude Code stop_hook_active already bounds a repeat, so allowing on a failed journal write gives up a block that was safe there; harness-specific allow is an option.
Task 09: minor (deferred): String(e) before the try in stop-check.ts catch and fx-turn.ts stopOff can throw for a null-prototype throwable; fx-codex.ts uses describe().
Fixed ledger number: 5
