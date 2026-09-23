# Task 01, build-cost report: re-review of fix round 1

Fix diff reviewed: 9480f52..bcfcc86 (scripts/build-cost and scripts/build-cost.test.js only).

### Finding verdicts

- Finding 1 (critical, no call key silently dropped): ADDRESSED. scripts/build-cost:69 now calls `fail(...)` naming file and line (`readRecords` attaches `__line` at scripts/build-cost:39) instead of `continue`. Covered by scripts/build-cost.test.js lines 186 to 195 (badkey.jsonl), asserts exit 2 and stderr includes `file:2`. Ran `node scripts/build-cost.test.js` directly: passes clean, single line `build-cost: ok`.

- Finding 2 (critical, EACCES on subagents dir treated as ENOENT): ADDRESSED. scripts/build-cost:223 now checks `if (e.code !== 'ENOENT') fail(...)`, so only a genuinely missing directory is swallowed. Covered by test lines 200 to 211 (chmod 0o000 on a real subagents dir), asserts exit 2 and stderr names the directory. ENOENT stays a legitimate empty-subagents case, exercised implicitly by every fixture directory that has no subagents folder at all (s3, s4) still succeeding.

- Finding 3 (important, usage taken from literal first record only): ADDRESSED as the controller specified ("takes usage from the first record of the call that carries it"). scripts/build-cost:76 to 78: `else if (!call.usage && u) call.usage = u;`. Covered by test lines 216 to 225 (ctl3, a content-only record followed by the usage-carrying one), asserts tokens equal 510, the value from the record that carries usage, not zero.

- Finding 4 (important, unguarded JSON.parse crashes instead of exit 2): ADDRESSED. scripts/build-cost:34 to 38 wraps `JSON.parse` and calls `fail` naming file and line. Covered by test lines 229 to 239 (ctl4, one malformed line), asserts exit 2 and stderr includes `file:2`.

- Finding 5 (important, unreadable and empty subagent files both silently skipped): ADDRESSED. scripts/build-cost:232 to 233 splits the two cases: `subRecords === null` (unreadable) now exits 2 naming the file, `subRecords.length === 0` (empty, readable) still `continue`s as a legitimate skip. Covered by test lines 243 to 257 (unreadable case) and lines 260 to 269 (empty-only case, asserts `r6.subagents` is `{}` with no error).

All five findings addressed exactly as the controller's intended remedy specified: 1, 2 (non-ENOENT), 4, 5 (unreadable file) exit 2 naming the file and line where known; ENOENT on the subagents directory and an empty subagent file stay legitimate; 3 takes usage from the first record of the call that carries it.

### New breakage in the fix diff

None found. Checked specifically:
- `process.exit(2)` inside `fail()` is synchronous in Node, so the line after a caught `JSON.parse` throw (`rec.__line = i + 1`) never executes on the malformed path; no crash-after-exit.
- The backfill branch (`else if (!call.usage && u)`) only fires once per call (guarded by `!call.usage`), so a later record without usage cannot clobber an already-set usage; matches "first record that carries it," not "last."
- Well-formed transcripts are unaffected: every existing assertion in the original test block (calls, tokens, tasksCompleted, ctxGrowthPerTask, fixRounds, subagent counts, wallClockMs) still passes, and the fix report's byte-identical diff against the real transcript's `--json` output before and after the round is consistent with that.
- Ran `node scripts/build-cost.test.js` directly (the one focused check this task allows): exits 0, output is exactly `build-cost: ok`, no extra noise.

### Out-of-scope observations (non-blocking)

- The plugin version bump (`.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json`, 0.2.2 to 0.2.3) mentioned in the fix report belongs to the original implementation commit 4bd8448, not to this fix round's diff (9480f52..bcfcc86 touches only scripts/build-cost and scripts/build-cost.test.js). Nothing to verdict here since it is outside the diff under review.
- The two new permission-based tests (chmod 0o000 on a directory and on a file, at test lines around 205 and 251) will silently stop testing what they claim if the suite ever runs as root, since root ignores directory and file permission bits on most filesystems. Confirmed the current environment runs as a non-root user (uid 1000), so this does not affect this review's verdicts, but it is a latent flakiness risk if CI ever runs the suite as root.

### Verdict

**Fix round:** All findings addressed, no new Critical or Important breakage.
