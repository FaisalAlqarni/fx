### Finding verdicts

**Important 1 (`scripts/test-one` masked the built-path lookup and checked its argument late): ADDRESSED.**
- `scripts/test-one:7` checks `[ $# -eq 1 ]` first. If the check fails, it prints usage to stderr and exits 2. This runs before `cd`, `mktemp` and the trap, so a bad call builds nothing.
- `scripts/test-one:13` is now `BUILT="$(scripts/test-scope --built-path "$1")"`, a plain assignment of its own. Under `set -euo pipefail` a non-zero `test-scope` stops the script there.
- Traces under `set -euo pipefail`:
  - **No argument or two arguments:** line 7 exits 2 with usage on stderr.
  - **Unmapped path:** `builtPath` in `src/scripts/test-scope.ts:37-42` is a pure string mapping with no existence check. A path with no `src/` prefix passes through unchanged. The script then reaches line 17 with a path node cannot load, and node exits non-zero. That status is the script's status.
  - **Failing test:** node is the last command at line 17. The EXIT trap's `rm -rf` succeeds, so it does not change the status.
  - **`test-scope` itself fails:** line 13 aborts the script and the trap fires.
- `$F` is still unquoted at `scripts/test-one:17`, with the shellcheck disable and the explanatory comment at lines 15-16.
- Cleanup still targets only the `mktemp` directory. `scripts/test-one:9-10` sets `D="$(mktemp -d)"` and then `trap 'rm -rf "$D"' EXIT`. The fixture goes to `"$D/fixture"` at line 14, and nothing else is removed.

**Important 2 (no test could fail if `$F` were quoted or node's status dropped): ADDRESSED, with one gap in the evidence (see Tests evidence).**
- `src/tests/gates/no-rm-in-shell-c.test.ts` (fix diff lines 354-374) now runs the script three ways:
  - **Pass case:** `src/lib/git-guard.test.ts`, which the review named as consuming both fixture paths. It asserts exit 0. A quoted `$F` hands it one argument, and the implementer's observed RED for the quoted copy was exit 2.
  - **Fail case:** `src/lib/no-such-test.test.ts`, asserting a non-zero status.
  - **No-argument case:** asserts exit 2 and a usage message on stderr.
- The scratch `TMPDIR` is asserted empty after all three runs. Each run has a 600 s timeout, which also covers one of the deferred Minors.
- The built `tests/gates/no-rm-in-shell-c.test.js` matches the TypeScript source (diff lines 761-777).

**Minor 1 (preamble bullet placement): ADDRESSED.**
- `PREAMBLE.md` (fix diff lines 56-61): the rm bullet now sits before the em-dash bullet. The humanize paragraph follows the prose bullet again.
- The re-recorded `render-claude-code-session.txt` (diff lines 509-516) shows the same order. I read only the Claude Code session render, not the others.

**Minor 2 (stale 3,000 quotes): ADDRESSED.**
- The current files say 3,400 at `src/hooks/fx-context.ts:10`, `skills/fx-authoring/SKILL.md:348` and `docs/adr/0032-the-preamble-carries-a-companion-tools-line.md:17`.
- A repo-wide search outside `docs/plans`, `.fx` and the fixtures found no other bootstrap-budget quote of 3,000.
- `hooks/fx-context.js` exists but has no hits for either number, so its comment is not carried into the bundle. There is nothing stale there.
- `hooks/fx-context.js` is not in the fix diff. The change is comment-only, so this is consistent either way.

### New breakage in the fix diff

No Critical and no Important.

1. **Minor: the missing-test case does not show why it failed.**
   - `src/tests/gates/no-rm-in-shell-c.test.ts` (diff line 368) only asserts a non-zero status.
   - The same status would come from a `check-generated` failure or from a `test-scope` failure, and neither is distinguished. The case still bites when node's status is dropped, so this weakens the diagnosis, not the guard.
2. **Minor: runtime cost.**
   - Each of the pass and fail cases repeats a full `check-generated` build, inside a gate that `check-all` already runs after its own build.
   - The 600 s timeout per spawn bounds a hang but allows up to 20 minutes in the worst case.
   - The review's deferred note about the repeated build still stands.
3. **Minor: scratch directory still leaks on a failed assertion.**
   - The assertions run before `fs.rmdirSync(scratch)`, so any early failure leaves the directory behind.
   - This is the already-deferred Minor 6 from the review, now with three more assertion points.
4. **Minor: `process.argv[2]` override is undocumented outside the test.**
   - It lets the gate target another script, which the broken-copy RED runs rely on. If `check-all` ever passes an argument to the gate, it would silently test the wrong script.
   - It is a testing aid with no current caller beyond the implementer's RED runs.

### Tests evidence

I had no shell and ran nothing. Everything below is from reading the diff, the report's "Fix round 1" section (the implementer's claim) and the source files.

- **Quoted `$F`:**
  - The report claims a copy with `"$F"` quoted failed with `test-one on git-guard.test.ts: 2`.
  - By reading, the pass case would catch it, since `git-guard.test.ts` needs two arguments.
- **Pre-fix masking:** The report claims the unchanged script failed with `test-one with no argument: 0`. That matches the review's finding and the new `exit 2` assertion.
- **Node's status dropped:** the implementer says the "status dropped" copy was caught by the no-argument case, and the missing-test case was not run in isolation.
  - **A test that can fail on a dropped node status does exist.** It is the fail case at diff lines 366-368. `builtPath` does no existence check, so `src/lib/no-such-test.test.ts` maps to `lib/no-such-test.test.js`. node then fails to load it and exits non-zero. A script that ended with `|| true` or a bare `true` would turn that into 0 and trip the assertion.
  - **That case was never observed red.** The fail case runs second, ahead of the no-argument case. If the broken copy really dropped node's status, the assertion at diff line 368 should have tripped first, not the no-argument one at diff line 371. The report's account cannot be reconciled with the test order, and the report does not say how the broken copy was built.
  - **The likeliest explanation is that the copy was derived from the pre-fix script and had a different shape from what the review described.** I cannot confirm it. The conclusion that the status-dropped property is guarded rests on reading, not on a live RED.
- **GREEN claimed:** the report says the gate passes against the repo script and fails against both broken copies. Its `test_scope` exit 0 shows zero FAIL lines. The final raw lines are `user-invoked.test.js: OK`, `release-version.test.js: OK` and `exit 0`. I cannot verify these.
- **Scope of that run:** it passed `src/tests/gates/no-rm-in-shell-c.test.ts`, `src/hooks/fx-context.ts` and `PREAMBLE.md`. That is enough to trigger `check-generated` and the golden checks for the preamble.

## Ledger lines
Task 12: fix round 1/5 (4 addressed, 0 open: review I1, I2, minor 1 and minor 2 all addressed; commits d1c5227..60d015f)
Task 12: minor (deferred): the missing-test case in no-rm-in-shell-c.test.ts asserts only a non-zero status, so a check-generated or test-scope failure would satisfy it as well as node failing to load the test.
Task 12: minor (deferred): the dropped-node-status guard rests on reading; the report's account of which assertion tripped is not consistent with the test order, and the missing-test case was never observed red in isolation.
Task 12: minor (deferred): the gate now runs check-generated twice more inside check-all, with a 600 s timeout per spawn, and still leaks its scratch directory if an assertion fails first.
Fixed ledger number: 3
