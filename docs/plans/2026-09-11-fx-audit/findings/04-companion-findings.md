# Task 04 review: move the companion session directory, and cut the remote logo

**Range:** 323f02e..31a9cb6, commits `0517c81` and `31a9cb6`, five files.
**Verdict:** Approved. Critical 0, Important 0, Minor 4.

## How this was checked

- **Diff:** read once from the package file.
- **Runs:** every script behaviour below was run, not read, against copies of `skills/fx-brainstorm/scripts/` in a scratch area under `/var/tmp/fx-rev04`. No companion was started inside `/development/fx`.
- **Cleanup:** after the runs, every server was stopped, `pgrep -af "[b]rainstorm-server-id"` exited 1, and the scratch area plus the probe files were deleted and confirmed absent with `ls`.
- **Leftover listeners:** the three that remain on 127.0.0.1 are pids 6893 and 7219. `ps` shows both are Cursor editor node processes started Sep 5.
- **Gates:** `python3 scripts/check-artifacts` was run. `scripts/check-all` was not run, as the brief required.

## Spec Compliance

**Spec compliant**, against the criteria as corrected by Rulings T and W and the ledger's gate count correction.

1. **Default location.** Met, by run.
   - No slug, non git project: `screen_dir` was `docs/plans/_companion-unfiled/companion/<id>/content` and `state_dir` was `.fx/_companion-unfiled/companion/<id>/state`, with the fallback announced on stderr.
   - `--slug 2026-09-11-rev`: the same shape under that slug.
   - No temp path appeared in either run.
   - Code: `start-server.sh:143` to `153`.
2. **Port and token files, restart reuse.** Met, by run.
   - `.last-port` and `.last-token` sit in `.fx/<slug>/companion/`, mode 600.
   - A second start with the same slug reused port 54022 and the same key.
3. **No temp default in the server.** Met, by read.
   - `server.cjs:106` to `108` default to empty.
   - `server.cjs:694` to `697` exit 1 when either directory variable is unset.
   - The bare server was not run in this review; the implementer's probe ran it.
4. **Guard line byte identical apart from the marker.** Met, by byte comparison.
   - Both lines were extracted from the diff file.
   - Stripping `  # artifact-gate: ok` from the new line gives a string equal to the old one.
   - The line is `stop-server.sh:118`, and the `rm -rf` beneath it is unchanged.
5. **Session directory and `content/` survive stop.** Met, by run and listing.
   - After `stop-server.sh "$(dirname "$STATE_DIR")"`, the `docs/plans` session directory, its `content/` and the mockup were all present.
   - The `.fx` state directory also remained, holding only `server-stopped` at mode 600.
6. **`visual-companion.md` drops the temp and cleanup wording and `.superpowers/`.** Met.
   - `grep -rn "/tmp" skills/fx-brainstorm/` hits only `stop-server.sh:7`, `117` and `118`, all marked.
   - Lines 58 and 293 were read.
7. **No `.superpowers` under the skill.** Met: the grep exited 1.
8. **No third party URL in `server.cjs`, and the footer still renders.** Met.
   - `grep -n "https://"` exited 1.
   - Rendered through a cookie jar, both the waiting page and a framed fragment carry `<div class="brand"><span class="brand-copy">Superpowers vunknown</span></div>`, with no `http` or `https` URL in either body.
   - The version text is on the ledger's deferred list.
9. **`check-artifacts` exits 0 with 6 exemptions.** Met, by run.
10. **`check-artifacts` wired into `check-all`.** Met, by read at `scripts/check-all:30`.
11. **`check-all` exits 0 with five gates**, as corrected by the ledger. See below: not run here.

**Ruling T.** Met, by run.

- In a scratch repository with no ignore rule, `git status --porcelain -uall` listed only the mockup, both while the server ran and after stop.
- With `--ignored`, the key, port, PID, log, info and instance id files showed as `!!`.
- The slug comes from the caller. Without one, the location is named as not a plan and announced.

**Ruling W.** Met, by run.

- **Announced:** the first start printed `fx companion: added .fx/ to .../.git/info/exclude`.
- **Idempotent:** after two starts `grep -cxF '.fx/'` printed 1, and the second start's stderr was empty.
- **`.gitignore` untouched:** it was still absent after both starts.
- **Linked worktree:** the start wrote to the main repository's `info/exclude`, and the worktree's `git status -uall` was empty.

**Beyond Ruling W, judged right.** The refusal at `start-server.sh:172` to `175` fails closed.

- With a `.gitignore` of `!.fx/`: exit 1, a JSON error on stdout, no server, and nothing created in the project except the `.gitignore` the probe wrote.
- The only trace left is the appended `.fx/` line in `info/exclude`.
- Ruling T's guarantee outranks the ruling's "then proceed", so refusing is correct.
- Two more ignore shapes were run to test that `check-ignore` before `mkdir` agrees with `git status` after it:
  - `.fx/*` plus `!.fx/2026-09-11-rev/`
  - a directory only `.fx/*/companion/`

  Both started, and status listed no `.fx` file in either.

**Other additions, judged right.**

- **`umask 077` in `stop-server.sh:17` to `19`:** `server-stopped` is 600 after stop.
- **Slug validation at `start-server.sh:82`:** `..`, `../escape`, `a/b`, `/abs`, `.hidden`, `-x` and a slug containing a newline were each refused with exit 1, creating nothing. `a..b` is accepted and stays one segment, `docs/plans/a..b/`.
- **Absolute `--project-dir` at `start-server.sh:76`:** a missing directory is refused with exit 1.
- **Image guidance at `visual-companion.md:278`:** it no longer sends mockups to a third party host, which the global constraint requires.

**Cannot verify from the diff**

- **`scripts/check-all`.** Not run, because another writer is editing `references/`. The diff adds `run check-artifacts scripts/check-artifacts` at `scripts/check-all:30`. The controller should run it once the index is free and expect five `check-*` gates and exit 0.
- **Git older than 2.31.** Only git 2.43.0 is installed. `start-server.sh:161` depends on `--path-format=absolute`, and I could not run how an older git answers it. The re-check at `172` should fail closed there, but that is read, not run. `git rev-parse --git-common-dir` joined with `/info/exclude` resolves the same file on much older git, if older git matters.

## Strengths

- **RED before GREEN.** RED was captured for both probes before any script changed. The first GREEN run caught a real defect, `server-stopped` at 644, and it was fixed in code rather than in the assertion.
- **The split proves the no leak property.** Ruling T's split is complete, and the proof is the right one: `git status` in a scratch repository, not a reading of the script.
- **The exclude logic handles edge cases.** It resolves the shared exclude file from a linked worktree, and it keeps an unterminated last line whole.
- **Nothing to reuse.** The only precedent is prose, at `skills/fx-implement/SKILL.md:247` to `253`, so the new block duplicates no existing helper.
- **Disclosure without padding.** The implementer did not pad the gate count to six, and disclosed every departure from the task file.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

None. No ruling assigned to this review is violated.

### Minor (Nice to Have)

**M1. `visual-companion.md:39`, `65`, `74`, `81`, `90`, `98` with `start-server.sh:76`: the documented command, run as spelled, files mockups inside the plugin.**

- **What is wrong:** every example dropped the explicit `--project-dir`, so the project root now comes from the current directory. The examples call `scripts/start-server.sh`, a path that resolves only when the current directory is the skill directory.
- **Evidence (run):** from the copied skill directory, `scripts/start-server.sh --slug 2026-09-11-rev` put `screen_dir` at `plugin/skills/fx-brainstorm/docs/plans/2026-09-11-rev/companion/<id>/content`, and `.fx/` beside it.
- **Why it matters:** the mockups miss the user's plan, which is the behaviour this task exists for, and a plugin update drops them. Line 58 does say to run from the project root, which is why this is Minor.
- **Fix:** keep `--project-dir <project root>` in the examples, or refuse when the resolved project directory is the skill directory or sits under it.

**M2. `start-server.sh:159`: git missing from `PATH` fails open.**

- **What is wrong:** the whole guard is skipped when `git` cannot run, even when the project is a git repository.
- **Evidence (run):** `PATH` held node and coreutils but no git, in a repository with no ignore rule. The start exited 0, and a later `git status --porcelain -uall` listed `.last-token`, `.last-port`, `server.log`, `server.pid`, `server-info` and `server-instance-id` as untracked.
- **Why it matters:** this is Ruling T's guarantee, off in an environment that cannot see git. It is Minor because the same environment cannot commit either.
- **Fix:** refuse when `command -v git` fails and a `.git` entry exists at or above the project directory.

**M3. `start-server.sh:40` to `43`: `--slug` as the last argument hangs forever.**

- **What is wrong:** `shift 2` fails without shifting, so the loop sees `--slug` again.
- **Evidence (run):** `timeout 5 start-server.sh --slug` exited 124.
- **Why it matters:** an agent that drops the value blocks its tool call. The existing options at `36` to `55` already had this shape, and the new option copied it.
- **Fix:** check `[[ $# -ge 2 ]]` before `shift 2` and print a JSON error.

**M4. `start-server.sh:173`: the refusal message names one cause of two.**

- **What is wrong:** it always blames "a .gitignore rule re-includes it". The branch also fires when line 161 produced no exclude path, which the report attributes to git older than 2.31, and there the message sends the user looking for a rule that does not exist.
- **Evidence (run):** in the re-include case, the refusal also leaves the `.fx/` line it just appended (`diff` showed `> .fx/`). That is harmless, and correct to keep, but the message does not mention it.
- **Fix:** branch the message on whether `EXCLUDE_FILE` was empty.

## Assessment

**Task quality:** Approved

**Reasoning:** Every acceptance criterion as corrected by Rulings T and W was proven by running the scripts in scratch repositories.

- Mockups persist under `docs/plans/<slug>/companion/`.
- The key and state never appear in `git status`.
- The exclude append is announced, idempotent and leaves `.gitignore` alone, and the refusal fails closed.
- The deletion guard is byte identical apart from its marker.

The four Minor findings are edge paths: the doc's relative invocation, git missing from `PATH`, a trailing `--slug`, and the refusal wording. None of them breaks a ruling on the documented path.
