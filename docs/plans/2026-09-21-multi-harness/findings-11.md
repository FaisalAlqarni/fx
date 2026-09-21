# Task 11 review: conformance runner and free rows (4b219ce..da83759)

Saved by the controller. The reviewer's harness refused its write to this path,
so the text below is the reviewer's returned findings, transcribed.

**Verdict:** Needs fixes. 0 Critical, 4 Important, 8 Minor.

The reviewer ran every runner invocation from a `git archive` copy of da83759
in a scratch `mktemp -d`, always with `HOME` set to a fake home. The fake home
was empty after each run, and every runner scratch directory was gone.

## Spec compliance

- ✅ The runner refuses an all-zero run. It exits 2 when there are no rows,
  see `run.sh:27-32`, and when nothing ran, see `run.sh:71-74`.
- ✅ `--free` selects on each row's declared kind (`run.sh:59`).
- ✅ `FX` and `HARNESS` reach every row (`run.sh:61`).
- ✅ Every row runs in a scratch home: `HOME`, `CODEX_HOME`, `XDG_CONFIG_HOME`
  and `CLAUDE_CONFIG_DIR` are set under one `mktemp -d`, and `FX_REAL_HOME` is
  set too (`run.sh:44-51`). All are exported before the first `--describe`.
- ✅ The runner has one `rm`, and its target is `$SCRATCH` (`run.sh:47`). There
  is no `cp` and no `mv`. Every redirect goes to stderr.
- ✅ The isolation test uses a fake home with sentinel files, kills the runner
  with SIGINT mid-row, and fingerprints the fake home
  (`runner-isolation.test.sh:22-28, 42-46, 83-94`).
- ✅ The probe row's write does not reach the fake home
  (`runner-isolation.test.sh:57,62`).
- ✅ The scratch directory is removed on exit and on interrupt. Measured:
  SIGINT to the process group exits 130, and SIGTERM exits 143.
- ❌ A row that cannot answer `--describe` is skipped silently under `--free`
  (Important 1).
- ⚠️ Each row prints PASS, FAIL or GAP, but the runner prints no reason
  (Minor 3).
- ✅ A GAP never counts as a pass. The summary reports three separate counts.
- ✅ The free rows are in `scripts/check-all`, and the behavioural rows are
  not.
- ✅ Every free row passes on all three harnesses under a fake HOME: 6 pass,
  0 fail, 0 gap each.
- ❌ Rows 9 and 13 do not assert their guarantee per runtime. See Important 2
  and Important 3.
- ✅ The step 5 breakage check works: an emptied `PREAMBLE.md` makes row 3 fail
  and the runner exit 1.
- ⚠️ Commits 0d0fcab, 0df5afb and 0807827 have no TDD evidence, because they
  have no report. The delta's two RED runs are valid.
- ⚠️ Step 8 was not run, because it reads the real `~/.codex`.

### Ledger rulings

- `state.md:1069`, which dropped the INT and TERM traps: **correct, measured.**
  With an EXIT-only trap, SIGINT to the process group gives rc 130 and removes
  the scratch directory before the next row runs. The plan's
  `trap 'rm …' EXIT INT TERM` would run `rm` and then return to the loop, so
  the next row would run with `HOME` deleted.
- ❌ `state.md:121-131` says the cost is "caught by conformance row 3 … which
  runs on all three runtimes". Row 3 does not catch it (Important 4).

## Important

1. **A row with no `--describe` guard is skipped under `--free`, and its body
   runs during the describe call.**
   - Where: `run.sh:56-59`. The check `desc=$(…) || FAIL` catches only a
     non-zero exit.
   - What happens: a row with no guard runs its body and exits 0, which
     leaves `kind` empty, so `--free` skips the row. Without `--free`, the
     runner prints `PASS` with a blank number and name.
   - Why it matters for task 12: a live row missing the guard spends quota
     during the describe call.
   - Fix: match `desc` against `^[0-9]+\|[^|]+\|(free|live)$`, and FAIL the
     row when it does not match.
2. **Row 9 asserts nothing about discovery.**
   - Where: `rows/09-every-skill-discovered.sh:7-25`.
   - What happens: the row ignores `HARNESS` and requires at least 13 skills,
     but 17 exist.
   - Mutations that still pass: removing 4 skills, or deleting opencode's
     `config.skills.paths.push`.
   - Fix: pin the exact count, derived from `skills/`, and add a free check
     for each harness. Report a GAP where no free check exists.
3. **Row 13 passes on opencode without checking opencode.**
   - Where: `rows/13-audit-lane-not-model-facing.sh:17-35`.
   - What happens: changing `plugins/fx.js:141` from `'deny'` to `'allow'`
     still passes.
   - Rows 13 and 14 copy `tests/gates/user-invoked.test.js:16-56`, which
     already runs in check-all. Row 14 is identical on every harness.
   - Fix: branch on `HARNESS`. For opencode, call the plugin's config hook on
     a synthetic config and assert that the hidden names are `deny`.
     Otherwise, report a GAP with a reason.
4. **The ruling at `state.md:121-131` is violated.**
   - Row 3 calls `lib/preamble.render()` directly
     (`rows/03-no-placeholder-survives.sh:12-16`), below every delivery path.
   - Mutation: changing `plugins/fx.js:100` to push the raw `PREAMBLE.md`
     still passes row 3. `tests/gates/opencode-plugin.test.js:98` catches it
     instead, so the cost is covered today, but not by the row the ruling
     names.
   - For Claude Code and Codex, row 3 never runs `hooks/fx-context.js:21` or
     `hooks/fx-codex.js:195`.
   - Fix: take the text from each runtime's entry point, then apply row 3's
     assertions. For opencode, that is the plugin's system hook. For the other
     two, spawn the hook script with a SessionStart payload.

## Minor

1. `run.sh:20-21` accepts any second argument, so `--fre` runs the live rows
   and spends quota. Reject anything other than `--free`.
2. If `FX_CONFORMANCE_ROWS` stays exported and points at passing rows, the
   `check-all` conformance gates pass falsely. Use `env -u` in `check-all`, or
   print the overridden rows directory.
3. The runner does not require a reason for a GAP (`run.sh:63-67`). Require a
   line on stderr when a row exits 77, before task 12 adds GAP-capable rows.
4. Row 9 writes a fixed `/tmp/fx-row09.$$` outside scratch. Use
   `COUNT=$(node -e …)` with no file.
5. The hidden-lane list is copied into `rows/13:17`, `rows/14:9`,
   `tests/gates/user-invoked.test.js:7` and `scripts/gen-command-skills:42`.
6. Some interrupts do not stop the matrix, and none of them reach the real
   home:
   - SIGINT sent only to the runner's PID is ignored because of bash's
     cooperative exit.
   - A row that traps INT lets the matrix continue.
   - An orphan left after SIGTERM can recreate `$SCRATCH/home` in `/tmp`.
   - SIGKILL skips the trap.
   The README should say that ^C stops the matrix only when the row dies.
7. `runner-isolation.test.sh:43` uses `find -printf`, which is GNU-only.
8. Process: the implementer ran `rm -rf /tmp/tmp.*`. This is already in the
   ledger at `state.md:1076`.

## Strengths

- The runner fails closed on no rows, no rows run, an unknown harness, and a
  bad mktemp path.
- There is one scratch directory and one `rm`, and every export happens before
  any row runs.
- Row 11 checks each runtime properly. Row 3 checks each runtime's own
  addressing.
- The isolation test sends SIGINT to the whole process group, which matches a
  real ^C.
