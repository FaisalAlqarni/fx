# 01: Machine facts: `.fx.json` and `scripts/check-all`

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** every later task needs a command that proves it worked, and
this repository has never told fx what its commands are. After this task, an
agent opening fx can read its test and setup commands instead of guessing them,
and one command runs everything the repository gates on.

**Files:**
- Create: `.fx.json`
- Create: `scripts/check-all`

**Interfaces:**
- Produces: `.fx.json` with keys `stacks`, `test_one`, `test_scope`,
  `test_all`, `setup`, `lint`, `coverage`, `coverage_floor`. The schema is
  defined in `commands/fx-setup.md` and is the only definition.
- Produces: `scripts/check-all`, exit 0 when every gate and suite passes,
  non-zero naming the first failure otherwise.

**Seam:** `scripts/check-all` exiting non-zero. It is the repository's own gate
command, so it is the seam every later task's verification runs through.

**Risks:** `make-git-fixture` runs `rm -rf` on the directory it is given. The
fixture path must be under a temp directory and must never be a path inside
this repository. This is test scaffolding, not an artifact, so a temp path is
correct here and `scripts/` is outside the artifact gate's scan.

**Idempotency:** both files are created with fixed content. Re-running the task
rewrites the same bytes. `check-all` itself is read-only apart from the fixture
directory, which it recreates from scratch on every run.

**Testing:** run `scripts/check-all` and read its exit code.

## Acceptance criteria

- [ ] `scripts/check-all` runs every gate and every suite the README documents:
      `check-manifest`, `check-paths`, `check-reference-leaves`, `check-prose`,
      and the four Node suites against a fresh fixture.
- [ ] `scripts/check-all` exits 0 on the current tree.
- [ ] `scripts/check-all` exits non-zero and names the failing gate when any one
      of them fails, proven by running it with a deliberately broken gate and
      restoring the file afterwards by copying it back.
- [ ] `.fx.json` parses as JSON and carries all eight keys.
- [ ] Every command in `.fx.json` was run once and observed to work. A command
      that cannot be determined is written as `null`, not guessed.
- [ ] `.fx.json` names `test_scope` as `null`, because this repository's suites
      do not partition and the README documents no subset command.
- [ ] `scripts/check-all` is executable.

## Steps

- [ ] **1. Write the failing test**

There is no test framework here. The test is the gate command itself, which
does not yet exist:

```bash
scripts/check-all
```

- [ ] **2. Run it: verify RED**

Run: `scripts/check-all`
Expected: FAIL, `bash: scripts/check-all: No such file or directory`

- [ ] **3. Implement the minimum that passes**

Write `scripts/check-all`. It runs each gate in turn, stops at the first
failure, and names it. It builds the Node fixture once and reuses it for all
four suites. No code here: `fx-tdd` drives it from the failing command.

- [ ] **4. Run it: verify GREEN**

Run: `scripts/check-all`
Expected: PASS, exit 0, every gate reported.

- [ ] **5. Prove the gate can fail**

Copy `scripts/check-paths` to a backup path outside the repository, break it by
appending a line that exits 1, run `scripts/check-all`, confirm it exits
non-zero and names `check-paths`, then restore by copying the backup back.
**Copy the file back. Never `git checkout` the path**, which would also discard
anything else in the working tree.

- [ ] **6. Write `.fx.json`**

Derive every command from what the README already documents and run each one
once before writing it down.

- [ ] **7. Verify `.fx.json` parses**

Run: `python3 -c "import json;d=json.load(open('.fx.json'));print(sorted(d))"`
Expected: the eight key names printed, no exception.

- [ ] **8. Run the full gate**

Run: `scripts/check-all`
Expected: PASS, output pristine.

- [ ] **9. Commit**

```
git add .fx.json scripts/check-all
git commit -m "chore: declare machine facts and add the combined gate"
```

No attribution trailers. Then continue to the next task: never stop and wait.
