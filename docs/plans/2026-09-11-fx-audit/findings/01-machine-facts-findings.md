# Task 01 review: machine facts (`.fx.json` and `scripts/check-all`)

**Base:** 8309b63 **Head:** fce46f0
**Commits:** 79fa920 (chore: declare machine facts and add the combined gate),
fce46f0 (fix: set test_one and setup per ledger rulings, not null)

## What I ran

- `./scripts/check-all` on the clean tree (from the worktree root). Output:

```
== check-manifest ==
convention: ./hooks/ holds 0 file(s), correctly undeclared
convention: ./agents/ holds 5 file(s), correctly undeclared
OK: manifest valid: 11 skills declared, 1 command path(s), hooks wired
== check-paths ==
OK: 53 reference citations, all anchored and resolvable
== check-reference-leaves ==
OK: no reference links to another reference
== check-prose ==
OK: no dashes, no stock vocabulary, parentheses balanced
== make-git-fixture ==
== git-guard.test.js ==

80 passed, 0 failed
== base-branch.test.js ==

27 passed, 0 failed
== heredoc.test.js ==

13 passed, 0 failed
== plan-state.test.js ==

17 passed, 0 failed
ALL GREEN
EXIT:0
```

  Matches the report byte for byte. Output is pristine, no warnings.

- `git log --format=... 8309b63..fce46f0`: two commits, neither carries an
  attribution trailer. Confirmed.

- Grepped both new files for em/en dash characters (`grep -nP
  '[\x{2013}\x{2014}]'`): no matches.

- Grepped `scripts/check-all` for the `check-prose` stock-vocabulary list
  (`delve`, `leverag*`, `seamless`, `robust`, `comprehensive`, `crucial`,
  `utilize`, `pivotal`, `testament to`, `in the realm of`, `it is important to
  note`, `plays a vital role`): no matches. Necessary to check by hand because
  `check-prose` only walks `*.md` files (`scripts/check-prose:46`), so a
  `.sh`/`.json` file is invisible to the gate; the global constraint still
  binds it.

- Read `README.md:164-199` (the `## Tests` section) to confirm every gate and
  suite name the script runs is one the README actually documents, and that
  the excluded ones (`check-collisions`, the `tests/lane-triggering/` suite)
  are excluded by the task's own acceptance criterion 1, not invented by the
  implementer.

- Read `commands/fx-setup.md:15-44` to independently confirm Ruling E: the
  schema's JSON example and key table both stop at seven keys and never
  mention `test_scope`. Matches the ledger's claim exactly.

I did not reproduce the mutation test (breaking `scripts/check-paths` and
restoring it) myself, since doing so would mutate the working tree, which
this review must not do. I evaluated it as described in the report instead:
copy-to-scratchpad backup, append `sys.exit(1)`, run `check-all`, observe it
stop at `check-paths` and name it, restore by `cp` (not `git checkout`),
verify byte-identical with `diff`. The procedure matches the task's step 5
exactly, including the explicit prohibition on `git checkout`.

## Ledger rulings assigned to this task

- **Ruling A** (exclude `check-collisions` from `check-all`): applied. The
  script (`scripts/check-all:39-47`) has a header comment naming the ruling by
  file path and explaining why, and the gate list omits it. The task's own
  acceptance criterion 1 lists exactly the gates the script runs, and
  `check-collisions` is not among them, so the exclusion is also spec
  compliant, not just ruling compliant.
- **Ruling E** (`fx-setup.md`'s schema gap is real, not this task's to fix,
  do not act): complied. `commands/fx-setup.md` was not touched by this diff
  (confirmed against the diff stat: only `.fx.json` and `scripts/check-all`
  changed). The report's "Anything I did not do as instructed" section
  states this plainly and flags it rather than silently dropping or
  unilaterally fixing it.
- **Ruling F** (`test_one` is not `null`; becomes the file-level command):
  applied in the fix commit. `.fx.json` line 4:
  `"test_one": "bash -c 'F=$(scripts/make-git-fixture /tmp/fx-fixture-test-one) && node {file} $F'"`.
  The report shows this exact template run, with `{file}` substituted, against
  all four suite files, all green.
- **Ruling G** (`setup` is not `null`; the fixture build is the setup step):
  applied. `.fx.json` line 6: `"setup": "scripts/make-git-fixture
  /tmp/fx-fixture-setup"`. Report shows it run once, observed to work.

No ruling assigned to this task was violated.

## Global constraints checked

- **No em/en dashes, including in prose fences**: verified by direct grep on
  both new files. Clean. Neither file contains a markdown fence, so the
  fence-tagging convention does not apply here.
- **No stock vocabulary**: verified by direct grep on `scripts/check-all`
  (the only new file with prose comments) since `check-prose` does not scan
  `.sh` files. Clean.
- **Nothing fx creates is written to the OS temp directory**: `.fx.json`'s
  `test_one` and `setup`, and `scripts/check-all` itself, all target paths
  under `/tmp`. This looked like a violation at first read, but the task's own
  "Risks" section requires exactly this ("The fixture path must be under a
  temp directory and must never be a path inside this repository... a temp
  path is correct here and `scripts/` is outside the artifact gate's scan"),
  and the plan's scoping rule (quoted verbatim in the brief) says the same:
  "the existing suites legitimately build them under a temp directory."
  `check-artifacts` (task 02) only scans `skills/`, `agents/`, `commands/`;
  `.fx.json` and `scripts/check-all` sit outside that scan by file location.
  Not a violation.
- **No attribution trailers**: verified via `git log`. Clean.
- **`scripts/` and `tests/` exempt from the artifact scan**: consistent,
  `check-artifacts` does not exist yet in this diff (task 02), and nothing
  here depends on it.

## Part 1: Spec compliance

Walking the seven acceptance criteria:

1. **`check-all` runs every gate and suite the README documents** (the five
   named: `check-manifest`, `check-paths`, `check-reference-leaves`,
   `check-prose`, four Node suites against a fresh fixture): ✅. Verified by
   running it and by reading `scripts/check-all:60-75` against
   `README.md:173-198`. Order and argument shape (`$MAIN $WT` split from
   `make-git-fixture`'s stdout) match the README's documented invocation.
2. **Exits 0 on the current tree**: ✅. Confirmed by my own run above (`EXIT:0`).
3. **Exits non-zero and names the failing gate, proven by a mutation test with
   restore-by-copy**: ⚠️ cannot independently reproduce without mutating the
   working tree (out of scope for a read-only review). The report's described
   procedure matches the task's step 5 precisely, including the explicit
   `git checkout` prohibition, and the script's `run()` helper
   (`scripts/check-all:51-58`) plainly does what's claimed: echoes `FAIL:
   $name` and `exit 1` on the first non-zero command. I read this as
   satisfied on the strength of the code plus the report's specific,
   falsifiable detail (byte-identical diff after restore), not blind trust.
4. **`.fx.json` parses, carries all eight keys**: ✅. Confirmed independently
   with `cat .fx.json` and by inspection; matches the report's own
   `python3 -c "import json..."` check.
5. **Every command run once and observed; undetermined commands are `null`,
   not guessed**: ✅. `test_one`, `setup`, `test_all` all have derivation and
   run evidence in the report. `stacks`, `lint`, `coverage`,
   `coverage_floor` are `null` with a stated absence-of-tooling survey
   (`find` for Makefile/Taskfile/package.json/linter configs/coverage
   configs, all empty).
6. **`test_scope` is `null`**: ✅. `.fx.json` line 3.
7. **`scripts/check-all` is executable**: ✅. Diff shows mode `100755`;
   confirmed with `ls -la` (`-rwxr-xr-x`).

No missing, extra, or misunderstood requirements found.

## Part 2: Code quality

**Should this code exist?** Yes: nothing in the repository combined these
gates and suites into one command before this task, and every later task's
verification is specified to run through this seam (per the task's own "Seam"
line and per the ledger's pre-flight scan table, which lists 01→04 as the only
edge on `check-all`).

**Stops at first failure and names it**: yes, `run()` (`scripts/check-all:51-
58`) and the explicit `make-git-fixture` failure branch
(`scripts/check-all:65-69`) both echo `FAIL: <name>` and `exit 1` immediately.

**Handles a gate that exits non-zero vs. one that crashes**: the `if ! "$@";
then` construct captures any non-zero exit status uniformly, whatever the
underlying cause (assertion failure, missing binary, segfault). This is the
right level of granularity for a gate script: distinguishing failure *causes*
is the underlying tool's job, not the runner's.

**Exit codes**: correct. 0 on all-pass, 1 on first failure, matching
acceptance criteria 2 and 3.

**Nothing guessed in `.fx.json`**: verified above (Part 1, criterion 5). Every
non-null value has matching run evidence in the report; every null has a
stated survey.

**Structure**: `scripts/check-all` is one file with one responsibility (run
the gates and suites in order, stop and name the first failure). The `run()`
helper avoids repeating the "print name, check exit, fail loud" pattern five
times. `.fx.json` is flat, exactly the eight keys the schema in
`commands/fx-setup.md` covers (seven) plus the one the task adds
(`test_scope`).

## Strengths

- The `check-collisions` exclusion is explained in the script itself
  (`scripts/check-all:37-47`), not only in a task file a future reader may
  never open. It names the ruling and the file path.
- The three-way fixture path isolation (`/tmp/fx-fixture`,
  `/tmp/fx-fixture-test-one`, `/tmp/fx-fixture-setup`) is a genuinely careful
  touch given the task's own stated risk that `make-git-fixture` does `rm -rf`
  on its target: three call sites now can never delete each other's fixture
  out from under a concurrent run.
- The report's derivation table for every `.fx.json` key cites what was read
  and what running it printed, which is exactly what acceptance criterion 5
  asks for and made this review fast to verify.
- Restore-by-copy discipline (never `git checkout`) is followed and the report
  states the byte-identical check explicitly, matching the task's stated
  reasoning for why `git checkout` would be wrong (it would discard anything
  else in the working tree).

## Issues

### Critical (Must Fix)
None.

### Important (Should Fix)
None. No ruling assigned to this task (A, E, F, G) was violated.

### Minor (Nice to Have)

- `commands/fx-setup.md:23` describes `test_one` as a template where
  "`{file}` and `{line}` are substituted," but `.fx.json`'s `test_one` value
  contains only `{file}`; there is no `{line}` token anywhere in the string.
  The report addresses this directly and the reasoning is sound (these suites
  have no line-level selector), but a consumer that always tries to
  substitute `{line}` (e.g. `skills/fx-tdd/SKILL.md:160`: "Run `test_one`
  from `.fx.json`, with `{file}` and `{line}` substituted") will simply find
  nothing to replace, which is harmless but was never explicitly reconciled
  against the schema doc. Not this task's file to fix (that's the
  `fx-setup.md` schema, already flagged under Ruling E's umbrella), but worth
  a note for whichever task or follow-up touches that schema next.
- The RED evidence in the report reads `bash: line 1: scripts/check-all: No
  such file or directory` where the task's own text predicts `bash:
  scripts/check-all: No such file or directory` (no `line 1:` prefix). This
  is just a shell-invocation-shape difference (`bash -c` vs. direct exec) and
  not a defect, but it's worth noting for anyone diffing the report against
  the task text expecting an exact string match.

## Assessment

**Task quality:** Approved

**Reasoning:** All seven acceptance criteria are met and independently
verified (six directly, one by code inspection plus the report's specific
falsifiable detail since reproducing it would require mutating the tree).
All four rulings assigned to this task (A, E, F, G) were applied or respected
exactly as instructed, and none were violated. No global constraint is
broken. The two Minor notes are pre-existing schema-documentation gaps
outside this task's two-file scope, already correctly flagged rather than
silently patched.
