# Task 04, fix round 1: re-review findings

Fix base `41c0d7d`, head `77f8b3e`, one commit, three files. The working tree's
`skills/fx-brainstorm/` matched `77f8b3e` (`git diff --quiet 77f8b3e -- skills/fx-brainstorm/`
exit 0). I read `start-server.sh` in full.

All runs used a copy of `skills/fx-brainstorm/` under
`<job-scratch>/rr1/plugin/skills/fx-brainstorm`, which
`cmp` showed identical to the worktree for `start-server.sh`, `stop-server.sh`,
`server.cjs` and `visual-companion.md`. The scratch root was outside every
repository: `git rev-parse` exit 128, and no `.git` entry at or above it. The
only runs of the worktree's own script exited at a check before any write.
Afterwards the scratch tree was removed and no `server.cjs` process remained
(`ps` count 0).

## Finding verdicts

### 1. Git unable to answer fails open: ADDRESSED

`start-server.sh:171-190` decides before anything is written. It sets
`IN_GIT_REPO` only when `rev-parse` prints `true` (172). Otherwise it walks up
from the physical project path, and it refuses at 184 when it finds a `.git`
entry. The first `mkdir` is now at 199, after this block.

Ran:

- Real repository, `PATH` set to a shim holding every binary except `git*`
  (`command -v git` exit 1, `node` exit 0): start exit 1, error
  `.../repo-nogit/.git exists but git is not on PATH`. `git status --porcelain -uall --ignored`
  printed nothing, and neither `.fx` nor `docs` exists.
- Ownership refused (`GIT_TEST_ASSUME_DIFFERENT_OWNER=1`, rev-parse exit 128,
  `detected dubious ownership`): start exit 1, error names the dubious
  ownership. `git status` printed nothing, and neither `.fx` nor `docs` exists.

### 2. The ignore recheck runs before the directory exists: ADDRESSED

`mkdir -p "$STATE_DIR"` is at `start-server.sh:199`, before both calls to
`session_files_ignored` (212, 225). That function checks the token, port, PID,
log and `server-info` paths one by one (204-205). The content directory is
created after the check, at 232.

Ran the ledger's rules (`.fx/*/companion` then `!.fx/*/companion/`) through the
script: start exit 0, and it announced the append to `.git/info/exclude`.
`git status --porcelain -uall` listed only `?? .gitignore`, both while running and
after stop. With `--ignored`, all seven session files were `!!`: `.last-port`,
`.last-token`, `events` (which I appended the way `server.cjs:494-496` does),
`server-info`, `server-instance-id`, `server.log` and `server.pid`. After stop,
`server-stopped` was `!!` too. `git add -A` staged only `.gitignore`, and
`git add .fx/s/companion/.last-token` was refused with exit 1.

A variant the exclude line cannot fix, `!.fx/` then the two ledger lines: start
exit 1 with the refusal at 226, and `git status` listed only `.gitignore`. Plain
`!.fx/`: also refused, and `git status` listed only `.gitignore`.

### 3. The documented invocation writes into the plugin: ADDRESSED

The refusal is at `start-server.sh:85-90`. Every documented start now names
`--project-dir <project-root>` and calls the script by its absolute path under
`<skill-dir>`: `visual-companion.md:41, 67, 76, 83, 92, 100`. The stop command is
at 294. `SKILL.md:181-184` says the same.

Ran:

- Worktree script, `--project-dir /development/fx/.worktrees/fx-audit/skills/fx-brainstorm --slug .bad`:
  exit 1 with the skill-directory error.
- Worktree script, `--project-dir /development/fx/.worktrees/fx-audit --slug .bad`:
  exit 1 with the `--slug` error from line 94. Slug validation runs after the
  skill-directory check, so the plugin repository root passed that check.
- The old relative form, run from the worktree skill directory with no
  `--project-dir`: exit 1 with the skill-directory error. A `find` for companion
  leftovers in the worktree counted 0, and `git status --porcelain --ignored -- skills/fx-brainstorm`
  printed nothing.
- `visual-companion.md:41`, taken with `grep -m1` from the copied file,
  placeholders substituted, run from a cwd other than the project: exit 0.
  `screen_dir` was `.../docproj/docs/plans/s7/companion/<id>/content`, and the
  state files sat under `.../docproj/.fx/s7/`, all `!!`. The documented stop
  command at 294 exited 0, and `content/` was still there afterwards.
- Non-repository project (rev-parse exit 128): start exit 0 with empty stderr,
  files in `docs/plans/s/companion/<id>/content` and `.fx/s/companion/`. Stop
  exit 0, and `content/` was kept.

## New breakage in the fix diff

**Minor, `start-server.sh:172`: git's stderr is merged into `GIT_ANSWER`, so any
stderr output from a working git refuses a healthy repository.** Ran it in a
fresh repository with `GIT_TRACE=1`: start exit 1, error
`.../repo-trace/.git exists but git would not answer: 22:02:43.068303 git.c:463 trace: built-in: git rev-parse --is-inside-work-tree`.
Before the fix, stderr went to `/dev/null`, so this case started. It fails
closed and the message shows the cause, so it is Minor. The fix is to capture
stdout only and keep stderr separately for the message.

No other new breakage found.

## Named risks

1. **The re-include case starts instead of refusing: correct.** A control
   repository with the ledger's rules and the directory present, but no exclude
   line: `check-ignore` on the token exit 1. After appending `.fx/`,
   `check-ignore -v` attributes `.fx`, `.fx/s`, `.fx/s/companion` and the token to
   `.git/info/exclude:7:.fx/`, and `ls-files --others --ignored --exclude-standard --directory`
   lists the single entry `.fx/`. The reason: no `.gitignore` pattern matches the
   name `.fx` itself, so the exclude line ignores that directory, and git does not
   descend into an ignored directory. `!.fx/*/companion/` therefore has nothing
   to re-include. The script run under finding 2 confirms every session file is
   ignored and none can be staged without `-f`.
2. **Unchecked files: not a finding.** `server-instance-id` holds a per-start id
   of 48 hex characters (read: it was `f71004fa...`), which is also passed on the
   server's command line at `start-server.sh:271, 280`, so the process list
   already shows it. `events` holds the user's click choices as JSON
   (`server.cjs:494-496`). `server-stopped` holds a reason and a timestamp
   (`{"reason":"stop-server.sh","timestamp":...}`). Ran the rules `.fx/**`,
   `!.fx/**/`, `!.fx/**/events`, `!.fx/**/server-instance-id` and
   `!.fx/**/server-stopped`: the script started without appending, the checked
   files stayed `!!`, and `events`, `server-instance-id` and later
   `server-stopped` showed `??`. A rule can re-include them while the checked
   files stay ignored. `grep -F` for the key in each of the three found nothing,
   so Ruling T still holds.
3. **Stray `.git` above a non-repository project: fails closed, mostly for the
   right reason, and rarely hit.** Ran three cases. An empty `.git` directory
   above the project was refused: a false refusal, but the message names the
   path. A real repository above, hidden by `GIT_CEILING_DIRECTORIES`, was
   refused: right, because git run at that repository's root would list the
   session files. A stale linked-worktree `.git` file (`gitdir: /nonexistent/...`)
   was refused: right, because git cannot vouch for it. A real project needs a
   broken or empty `.git` above it to hit this.
4. **A refused start leaves the exclude line and an empty state directory: no
   consequence beyond clutter.** After the `!.fx/` refusal, `find` shows the empty
   `.fx/s/companion/<id>/state` and no files, one `.fx/` line is in the exclude
   file, and `git status` lists only `.gitignore`, because git does not list
   empty directories. After removing the rule, a retry started, the exclude file
   still had exactly one `.fx/` line, and stderr was empty. The line is the one
   Ruling W adds in any case.
5. **`<skill-dir>` resolves on both runtimes.** `SKILL.md:181-184` tells the
   agent to use the absolute path under the skill's base directory, and
   `visual-companion.md:36-40` defines `<skill-dir>` as that directory. Claude
   Code prints "Base directory for this skill:" when a skill loads; this session
   received that line. `plugins/fx.js` (read, 61 lines) registers no skills: it
   injects the preamble and runs the git guard. opencode gets the skills as links
   under `~/.config/opencode/skills` (`INSTALL.md:55`). The installed opencode
   1.18.25 binary contains the template `Base directory for this skill: ${...}`
   three times (grep on the binary; I did not run an opencode session). A
   symlinked base directory still works, because the check compares physical
   paths (risk 6).
6. **Prefix comparison: correct against every variant run.** Both sides are
   `pwd -P`, both get a trailing `/`, and the right-hand side is quoted, so it
   matches literally. Refused: a symlink to the skill directory, a trailing
   slash, the `scripts/` subdirectory, a relative path with a trailing slash, the
   script called through a symlinked plugin root, and a skill path containing
   `[a]`. Not refused (they reached the `--slug` error): the siblings
   `fx-brainstorm-x` and `fx-brainstormx`, and the lookalike path `gla` beside
   `gl[a]`. Boundary by design (`start-server.sh:82-84`): only the skill
   directory is refused, and a plugin root is accepted.

## Tests the report claims

The report shows RED exit 22 and GREEN `FAILURES=0` (report lines 852, 1172). The
saved captures agree: `fix1-red.txt:189` reads `FAILURES=22` and
`fix1-green.txt:178` reads `FAILURES=0`. The Ruling W regression capture has 15
PASS lines and ends `FAILURES=0`. The report shows `check-artifacts` exit 0 with 6
exempted, and `check-all exit=0` (line 1287). My own runs, on the files in the
diff: `check-prose` on `SKILL.md` and `visual-companion.md` exit 0,
`check-artifacts` exit 0 with 6 exempted, and `bash -n start-server.sh` exit 0.

## Out-of-scope observations

None.

## Verdict

**Fix round:** all findings addressed, no new Critical or Important breakage.
One new Minor, at `start-server.sh:172`.
