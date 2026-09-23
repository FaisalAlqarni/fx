# Task 02, re-review of fix round 1 (security, item 1), 2026-09-23

Fix base: bcfcc86. Head: df4c5af. Diff inspected:
.fx/02/review/bcfcc86..df4c5af.diff (5 files, 168 insertions, 61 deletions).

### Finding verdicts

- Item 1 (Important, run-test.sh and run-reps.sh ran unjailed and exported
  FX_REAL_HOME into the session; the comment claimed an isolation the
  scripts did not give): ADDRESSED.
  Evidence: `tests/lane-triggering/run-test.sh:70-90` and
  `tests/lane-triggering/run-reps.sh:48-68` now source
  `tests/conformance/lib/jail.sh` (the same file `live.sh` sources at
  `tests/conformance/lib/live.sh:79`) and run `claude` as
  `"${JAIL[@]}" claude -p "$PROMPT" ...` (`run-test.sh:114`,
  `run-reps.sh:84`). `FX_REAL_HOME` is assigned as a plain shell variable
  (`run-test.sh:82`, `run-reps.sh:60`), never `export`ed; confirmed by
  reading both full files that no `export` statement touches it anywhere.
  `jail.sh`'s own `--setenv` allowlist (`tests/conformance/lib/jail.sh:99-102`)
  does not include `FX_REAL_HOME`, and its `--clearenv`
  (`tests/conformance/lib/jail.sh:98`) rebuilds the child's environment from
  that allowlist regardless of export state, so the variable cannot reach
  the `claude` child by any route this diff touches. The updated comments
  (`run-test.sh:55-69`, `run-reps.sh:37-47`) now state the actual boundary:
  the jail is what stops reading the real home or another repo by absolute
  path, the scratch HOME and CLAUDE_CONFIG_DIR only stop the owner's plugins,
  CLAUDE.md and memory from loading. That matches what the code does.

  RED confirmed independently (without checking out or mutating anything):
  `git show bcfcc86:tests/lane-triggering/run-test.sh` and
  `...run-reps.sh` both still `export FX_REAL_HOME` and never source
  `jail.sh` or reference `${JAIL[@]}`, so the three structural checks in the
  new `jail-isolation.test.sh` would fail against the pre-fix scripts, as
  the fix report's RED transcript claims.

  GREEN reproduced directly: ran
  `bash tests/lane-triggering/jail-isolation.test.sh` against the current
  tree (permitted as a focused run for a specific doubt). All twelve checks
  passed, including the dynamic bwrap run: `jail-isolation: all passed`.

### New breakage in the fix diff

- Minor, test-quality gap, not a security regression. In
  `tests/lane-triggering/jail-isolation.test.sh`, the dynamic check labelled
  "FX_REAL_HOME did not reach the claude process" (lines ~154 and ~155 for
  the two rows) is `! grep -qF "FX_REAL_HOME" "$logfile"`. The stand-in
  `claude` binary the test writes (lines ~125 to 133) only ever echoes a
  system event, a readability sentinel line and a Skill tool_use; it never
  dumps its own environment. So the string "FX_REAL_HOME" can never appear
  in the log for any reason, whether or not the variable actually reaches
  the child's environment. The check passes vacuously and would keep
  passing even if a future edit added `FX_REAL_HOME` back into `jail.sh`'s
  `--setenv` allowlist. The real protection against that regression is the
  static check two lines above it ("never exports FX_REAL_HOME") plus
  `jail.sh`'s allowlist itself, so nothing is left actually unguarded, but
  the dynamic check's name overstates what it proves. Suggest the stand-in
  `claude` print `env` (or just `${FX_REAL_HOME:-unset}`) into the stream so
  this assertion tests something real.

### Out-of-scope observations, non-blocking

- `run-test.sh` and `run-reps.sh` call `"${JAIL[@]}" claude ...` directly,
  where `live.sh` calls `"${JAIL[@]}" env TMPDIR="$tmp" claude ...`
  (`tests/conformance/lib/live.sh:206`). The two scripts under this task
  never set `TMPDIR` for the child, so this is a smaller footprint than
  `live.sh`, not a bigger one; not a security gap, just a divergence worth
  noting if the two are ever expected to behave identically.
- Neither script chmods the scratch `HOME`/`LIVE_SCRATCH` to 0700 the way
  `live.sh:33-34` does (only `scratch_home_claude` chmods the
  `.claude` directory it writes into, at 0700). This is exactly finding
  item 2 (umask, deferred minor) and was correctly left untouched by this
  fix round.
- `run-reps.sh` moved each rep's log to `$OUT/rep$i.stream.json`, outside
  `LIVE_SCRATCH`, mirroring `live.sh`'s practice of keeping `LOGDIR` outside
  the jailed scratch dir. Good change, not required by item 1, and correctly
  called out as a judgement call in the fix report. Neither script adopts
  `live.sh`'s named-pipe technique (`live.sh:200-203`) for the log, so a
  session inside the jail still holds a direct, inheritable file descriptor
  to its own log rather than a pipe; that predates this diff (the pre-fix
  files already used plain `> "$LOG" 2>&1`) and was never part of item 1's
  remedy, so it is not new breakage, just an existing gap that becomes
  slightly more relevant now that the process is otherwise properly jailed.
- Items 2 to 4 of the findings file were explicitly deferred and confirmed
  untouched by this diff: no umask change, `scratch_home_claude` still
  trusts its directory argument, and the OAuth-rotation concern is
  unaddressed. Consistent with the task's instruction to fix item 1 only.

### Tests

The fix report names its covering tests and shows output for each:
`jail-isolation.test.sh` RED (against restored pre-fix blobs, via `git show
<rev>:<path>`, never a checkout or stash) and GREEN; `bash -n` on all five
touched shell files; `node tests/lane-triggering/verdict.test.js`; `bash
tests/conformance/runner-isolation.test.sh`; `bash
tests/conformance/jail-probe.test.sh`; and a full `scripts/check-all` run
ending `ALL GREEN`, including the newly wired `lane-triggering-jail-isolation`
step. This re-review reproduced the `jail-isolation.test.sh` GREEN result
directly and separately confirmed, via `git show` on the base commit rather
than any tree mutation, that the pre-fix scripts fail the new test's static
checks.

### Verdict

**Fix round:** All findings addressed, no new Critical or Important
breakage. One Minor, non-blocking note: the "FX_REAL_HOME did not reach the
claude process" dynamic check in the new `jail-isolation.test.sh` is
vacuous (the stand-in `claude` never prints its environment), so it proves
nothing beyond what the static "never exports FX_REAL_HOME" check already
covers. Worth a follow-up line in the stand-in binary, not a blocker.
