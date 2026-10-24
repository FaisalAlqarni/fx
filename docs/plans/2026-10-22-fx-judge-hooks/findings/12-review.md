### Spec Compliance (✅ / ❌ with file:line; ⚠️ cannot verify)

Missing:
- ❌ `src/hooks/fx-context.ts:10` still says "the bootstrap alone under 3,000". `skills/fx-authoring/SKILL.md:348` says "stays under 3,000 characters". `docs/adr/0032-the-preamble-carries-a-companion-tools-line.md:17` says "3,000-character bootstrap". The raise to 3,400 was applied only in `src/lib/preamble.test.ts`, `lib/preamble.test.js` and ADR 0021. The raise itself is a settled ruling, but these quotes of the old number were not updated.
- ⚠️ The task asks for `test_one` and `setup` to "behave as before". `scripts/setup` was never run (the report says so). `scripts/test-one` was only run on a test that ignores its arguments (`src/lib/evidence.test.ts:1-20`), so the unquoted fixture argument and node's exit status are unproven.

Extra:
- ❌ `docs/plans/2026-10-22-fx-judge-hooks/state.md` (+9 lines) is in this commit (diff lines 104-127). It holds the controller's task 11 ledger lines and a Ruling, not task 12 work, and the brief's Files list does not name it.

Misunderstood: none found.

File by file:
- ✅ `.fx.json:3,6`: `"test_one": "scripts/test-one {file}"`, `"setup": "scripts/setup"`. No `bash -c`, `trap` or `rm` remains. Key names are unchanged.
- ✅ `scripts/test-one:1-15`:
  - It runs `check-generated`, then the git fixture, then `node` on the built path with `$F` unquoted. The inline comment names the reason.
  - The fixture sits under `mktemp -d`, which honours `TMPDIR`. The EXIT trap deletes only `$D`.
  - `D` is assigned under `set -e` before the trap is installed, so a failed `mktemp` aborts before any `rm`. `D` is never empty or unset when `rm` runs, and `make-git-fixture`'s own `rm -rf "$base"` gets `$D/fixture`.
  - `node` is the last command, so its status is the script's status, and an EXIT trap does not change it.
  - The file mode is 100755.
- ✅ `scripts/setup:1-9`: same pattern (`npm ci`, then one fixture smoke run under `mktemp -d`), mode 100755.
- ✅ `PREAMBLE.md:56`: the bullet is character-for-character the brief's text, inside the existing section. The counted occurrence in `claude-session-start.expected.txt` confirms it reaches the generated output.
- ✅ Generated copies: 24 files carry "Invoking a lane is not optional", and all of them are in the diff (13 golden, 8 plan-state render, `lib/preamble.test.js`, `src/lib/preamble.test.ts`, `PREAMBLE.md`). No embedded copy is missed. The spot-checked render copy matches the source bullet.
- ✅ `scripts/check-all`: the gate is added at the end of the gate list.
- ✅ Callers of the old string: a grep for the old fixture names and the `B=` pattern finds only historical audit and findings docs under `docs/plans`. `tests/gates/ts-toolchain.test.sh:99-102` reads `test_one` from `.fx.json` at run time and now runs `scripts/test-one` inside its stale copy, which still fails on drift as expected. `README.md`, `AGENTS.md` and the skills never quoted the string.
- ✅ Gate, `.fx.json` check: it matches both old strings after JSON decoding, since `-c '` and `rm -rf` and `trap` are all present.

### Strengths
- The cleanup lives in a script file, with a trap that expands `$D` at trap time and a `mktemp` failure that aborts before the trap exists. The deletion scope is tight.
- `scripts/test-one:13-14` keeps the unquoted `$F` and documents why, with a shellcheck disable.
- The process test (`src/tests/gates/no-rm-in-shell-c.test.ts:298-305`) runs the real script with `HOME` and `TMPDIR` in scratch and asserts both exit 0 and an empty scratch directory. A missing trap would fail it.
- The report states honestly that only the first RED assertion was observed live.

### Issues

#### Critical
None.

#### Important

1. `scripts/test-one:15`: the usage guard and a failing `test-scope --built-path` are both masked.
   - Both sit inside `$(...)` in an argument of `node`. A `${1:?}` failure or a non-zero `test-scope` only ends that subshell. The outer simple command continues, so `set -e` never fires, and `node` is called with an empty first argument.
   - With a non-tty stdin, node is likely to evaluate stdin as a script and exit 0. I could not run it, so ⚠️ that is unverified. The old string had the same masking, but this script now looks fail-closed through `set -euo pipefail`, and a mistyped or unmapped test path could report green.
   - It also means the `${1:?usage...}` message appears only after `check-generated` has run and the fixture is built.
   - Fix: check the argument first (`[ $# -eq 1 ] || { echo usage >&2; exit 2; }`), then `B="$(scripts/test-scope --built-path "$1")"` as its own assignment so `set -e` catches a failure, then `node "$B" $F`. The success path is unchanged.

2. `src/tests/gates/no-rm-in-shell-c.test.ts:301-302` with `src/lib/evidence.test.ts:1-20`: the two properties the brief names as exact behaviour have no test that can fail.
   - The only process run uses a test that never reads its arguments and always exits 0.
   - Quoting `$F` (so `make-git-fixture`'s two paths become one argument) would still pass the suite. So would dropping node's status, for example by ending the script with `|| true`.
   - Fix: run `scripts/test-one` on a test that really consumes both fixture paths, such as `src/lib/git-guard.test.ts` (it is in `NEEDS_GIT_FIXTURE`). Add a second run on a deliberately failing or unknown path in the scratch area, asserting a non-zero status and an empty `TMPDIR`.

#### Minor

1. `PREAMBLE.md:56-58`: the new bullet sits between the prose bullet and its follow-on paragraph `{{LANE:fx-humanize}} carries the full prose treatment...`. That sentence now reads as belonging to the rm rule, in every rendered preamble (for example `render-claude-code-session.txt`). Fix: put the bullet before the em dash bullet, or after the humanize paragraph.
2. `src/hooks/fx-context.ts:10`, `skills/fx-authoring/SKILL.md:348`, `docs/adr/0032-...:17`: they still quote the 3,000 budget (see Spec Compliance). Fix: update the numbers and regenerate the hook JavaScript.
3. `src/tests/gates/no-rm-in-shell-c.test.ts:292`: the rule matches the brief but has gaps and false positives.
   - A combined flag such as `bash -lc '...'` or `sh -ec "..."` never matches `-c\s+['"]`, so `rm` in it passes.
   - `\brm\s` also matches `--rm ` and `git rm`.
   - Any `-c "x"` anywhere in the value, such as `grep -c "x" && git rm y`, arms the check even when the `rm` is outside the quoted script.
   - Only top-level string values are scanned, so a command nested under `stacks` is not checked.
    - Fix: match a combined short-flag cluster ending in c followed by a quote, match rm only where a command word starts (start of text, whitespace, a separator or an opening bracket before it), and walk nested values.
4. `src/tests/gates/no-rm-in-shell-c.test.ts:289`: the gate parses `.fx.json` with its own `JSON.parse` under a `ts-gate-ok` exemption, though the global constraint sends `.fx.json` through one parser (`src/lib/repo-config.ts`). It is a test, so low stakes, but it adds a second reading of the file.
5. `scripts/test-one:12,15`: the unquoted `$F` splits on spaces, and the fixture now sits under `$TMPDIR` instead of `/tmp`. A `TMPDIR` with a space (for example a Windows-style temp path under Git Bash) breaks the argument split. A relative `TMPDIR` is resolved after the `cd` at line 8. Fix: print the two paths on separate lines, or document the limit as a `shortcut:` comment.
6. `src/tests/gates/no-rm-in-shell-c.test.ts:301-305`: `spawnSync` has no timeout, so a hang stalls `check-all`. On a failed assertion the scratch directory leaks. The nested `check-generated` inside `test-one` runs a full build again inside `check-all`.
7. The commit carries `docs/plans/2026-10-22-fx-judge-hooks/state.md` (see Spec Compliance, Extra). That is the controller's file, and task 11's fix round 2 will commit on top of the same file.
8. RED: only the `.fx.json` assertion was seen failing. The bullet check and the process test were never observed red (the report admits this). That is acceptable for the bullet, since the golden fixtures cover it, but it is a thin RED for the process test.

### Assessment

**Task quality:** Needs fixes

**Reasoning:** The cleanup moves, the `.fx.json` change, the bullet and the generated copies are all correct, and nothing deletes outside its own fixture. Two trust gaps remain. `scripts/test-one:15` hides a failing built-path lookup behind a command substitution, which can turn a bad path into a pass. And no test could fail if `$F` were quoted or node's status dropped, the two behaviours the brief singles out. The rest is placement and stale-number polish.

## Ledger lines
Task 12: minor (deferred): the new preamble bullet sits between the prose bullet and its humanize follow-on paragraph (PREAMBLE.md:56-58), so that sentence now reads as part of the rm rule.
Task 12: minor (deferred): the old 3,000-character bootstrap budget is still quoted in src/hooks/fx-context.ts:10, skills/fx-authoring/SKILL.md:348 and ADR 0032:17.
Task 12: minor (deferred): the no-rm gate regex misses combined flags (`-lc`), flags `--rm` and `git rm`, arms on any `-c` quote in the value, and scans only top-level strings (no-rm-in-shell-c.test.ts:292).
Task 12: minor (deferred): the gate reads `.fx.json` with its own `JSON.parse` under `ts-gate-ok` instead of the repo-config parser (no-rm-in-shell-c.test.ts:289).
Task 12: minor (deferred): `scripts/test-one` splits the unquoted `$F` on spaces, so a `TMPDIR` containing a space breaks it; a relative `TMPDIR` resolves after the `cd` (test-one:8-15).
Task 12: minor (deferred): the process test has no spawn timeout, leaks its scratch directory on a failed assertion, and repeats a full `check-generated` build inside `check-all`.
Task 12: minor (deferred): the commit swept in the controller's `state.md` ledger lines (task 11 and a Ruling), which are outside the brief's Files list.
Task 12: minor (deferred): RED was observed only for the `.fx.json` assertion; the process test and bullet check were never seen failing.
