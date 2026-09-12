# 07: The parked fixes

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Core

**What to build:** four small defects the final review parked stop biting. A
prose check you ask for on a named file is never skipped because its path
contains `.worktrees/`. The audit recreates a reference worktree that was deleted
by hand, and removes one that holds a stray file. Branch review removes its review
worktree even when a stray file was left inside. The companion's start script
describes `--slug` as the dated plan directory.

**Files:**
- Modify: `scripts/check-prose`
- Modify: `scripts/check-all`
- Modify: `skills/fx-audit/SKILL.md`
- Modify: `skills/fx-review/reviewer-prompt.md`
- Modify: `skills/fx-brainstorm/scripts/start-server.sh`
- Test: `tests/gates/check-prose-explicit-path.sh`

**Interfaces:**
- Produces: `scripts/check-prose [path ...]`: a path given on the command line is always read; the exemption list applies only to files found by walking a directory.
- Produces: the audit's Phase 2 worktree steps, in order: `git worktree prune`; then by what `git worktree list --porcelain` says of `.worktrees/audit-<name>-reference`: listed at that commit, reuse it; listed at another commit, `git worktree remove --force` it and add it; not listed and nothing on disk, add it; not listed and a directory there, stop and name it. The Phase 2 gate removes the worktree with `git worktree remove --force`.
- Produces: the review prompt's removal step: `git worktree remove --force <path>`; if that still fails, say what is left at the path and stop.

**Seam:** a gate test run by `check-all`, and the worktree commands run as the skill prints them in a scratch repository (design seams 1 and 6).

**Risks:**
- Letting the no-path walk start reading nested worktrees again. The test checks both halves.
- The test writes a file with an em dash under this repository's `.worktrees/`, which is git-ignored. It removes it on every exit.

**Idempotency:** text edits; the test creates and removes its own directory. The worktree check builds and removes its own scratch repository.

**Testing:** a shell test for `check-prose`, run by `check-all`; the worktree command sequences run in a scratch repository and recorded in the report.

## Acceptance criteria

- [ ] `tests/gates/check-prose-explicit-path.sh` passes, and `scripts/check-all` runs it.
- [ ] `python3 scripts/check-prose` with no path still skips `.worktrees/` and `.claude/worktrees/`.
- [ ] The audit's Phase 2 steps run `git worktree prune` before inspecting the worktree list, and its gate removes with `--force`.
- [ ] In a scratch repository, a reference worktree deleted by hand is recreated by the skill's steps, and one holding a stray untracked file is removed by the gate's step.
- [ ] The review prompt removes its worktree with `--force` and says what to do if that fails.
- [ ] `start-server.sh`'s usage lines and its no-slug message name the dated plan directory, such as `2026-09-12-my-feature`, instead of `<plan-slug>`.

## Steps

- [ ] **1. Write the failing test**

Create `tests/gates/check-prose-explicit-path.sh`:

```bash
#!/usr/bin/env bash
# check-prose reads a file named on its command line even under .worktrees/,
# and still leaves nested worktrees out of a whole-repository walk.
set -euo pipefail
cd "$(dirname "$0")/../.."
DIR=".worktrees/check-prose-test-$$"
trap 'rm -rf "$DIR"' EXIT
mkdir -p "$DIR"
printf 'A sentence with an em dash \342\200\224 in it.\n' > "$DIR/note.md"
fails=0
set +e
python3 scripts/check-prose "$DIR/note.md" > /dev/null 2>&1; named=$?
python3 scripts/check-prose > /dev/null 2>&1; walk=$?
set -e
if [ "$named" -ne 1 ]; then echo "FAIL: a file named explicitly under .worktrees/ was skipped (exit $named)"; fails=1; fi
if [ "$walk" -ne 0 ]; then echo "FAIL: the whole-repository walk read a nested worktree (exit $walk)"; fails=1; fi
if [ "$fails" -ne 0 ]; then exit 1; fi
echo "check-prose explicit path: all passed"
```

- [ ] **2. Run it: verify RED**

Run: `bash tests/gates/check-prose-explicit-path.sh`
Expected: `FAIL: a file named explicitly under .worktrees/ was skipped (exit 0)`.

- [ ] **3. Implement the minimum that passes**

In `scripts/check-prose`'s file selection, yield a path given as a file without applying the exemption list; keep applying it to files found by walking. `fx-tdd` drives it from the test.

- [ ] **4. Run it: verify GREEN**

Run: `bash tests/gates/check-prose-explicit-path.sh`
Expected: `check-prose explicit path: all passed`.

- [ ] **5. Correct the worktree steps**

Invoke `fx:fx-authoring` before editing the skill and the prompt. In `skills/fx-audit/SKILL.md`, Phase 2: run `git worktree prune` before reading `git worktree list --porcelain`, drop the separate "or as missing" case that prune now covers, and make the gate's removal `git worktree remove --force`. In `skills/fx-review/reviewer-prompt.md`, step 3 becomes `git worktree remove --force <path>`, and if that fails, say what is left at the path and stop.

- [ ] **6. Run the worktree steps in a scratch repository**

Run these exactly, in a scratch directory under the ephemeral workspace, never the OS temp directory, and paste the output into the report:

```bash
W=.fx/2026-09-12-fx-audit-followups/worktree-check; rm -rf "$W"; mkdir -p "$W"
git -C "$W" init -q repo && git -C "$W/repo" commit -q --allow-empty -m base
C="$(git -C "$W/repo" rev-parse HEAD)"
P=.worktrees/audit-probe-reference
# deleted by hand, then the skill's steps
git -C "$W/repo" worktree add -q --detach "$P" "$C"
rm -rf "$W/repo/$P"
git -C "$W/repo" worktree prune
git -C "$W/repo" worktree list --porcelain | grep -c "$P" || true
git -C "$W/repo" worktree add -q --detach "$P" "$C" && echo "recreated after hand deletion"
# a stray untracked file, then the gate's step
echo stray > "$W/repo/$P/stray.txt"
git -C "$W/repo" worktree remove --force "$P" && echo "removed with a stray file"
rm -rf "$W"
```

Expected: `0`, then `recreated after hand deletion`, then `removed with a stray file`.

- [ ] **7. Correct the start script's slug wording**

In `skills/fx-brainstorm/scripts/start-server.sh`, change `<plan-slug>` in the usage line, the `--slug` option description and the no-slug message to name the dated plan directory, for example `--slug 2026-09-12-my-feature`.

- [ ] **8. Register the test and run the gates**

In `scripts/check-all`, after `run check-prose`, add `run check-prose-explicit-path.sh bash tests/gates/check-prose-explicit-path.sh`.
Run: `bash -n skills/fx-brainstorm/scripts/start-server.sh && python3 scripts/check-prose skills/fx-audit/SKILL.md skills/fx-review/reviewer-prompt.md && scripts/check-all`
Expected: all pass, `ALL GREEN`.

- [ ] **9. Commit**

```
git add scripts/check-prose scripts/check-all skills/fx-audit/SKILL.md skills/fx-review/reviewer-prompt.md skills/fx-brainstorm/scripts/start-server.sh tests/gates/check-prose-explicit-path.sh
git commit -m "fix: read explicitly named files in check-prose, and harden worktree removal and recreation"
```

No attribution trailers. Then continue to the next task: never stop and wait.
