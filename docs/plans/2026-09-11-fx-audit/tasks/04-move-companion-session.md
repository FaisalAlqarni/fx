# 04: Move the companion session directory, and cut the remote logo

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** MVP

**What to build:** the visual companion keeps its mockups by default instead of
deleting them, stops writing them under the name of a plugin that is no longer
installed, and stops making the browser fetch an image from a third-party host.
**This is the task that turns the artifact gate green.**

**Files:**
- Modify: `skills/fx-brainstorm/scripts/start-server.sh`
- Modify: `skills/fx-brainstorm/scripts/server.cjs`
- Modify: `skills/fx-brainstorm/scripts/stop-server.sh`
- Modify: `skills/fx-brainstorm/visual-companion.md`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: the `artifact-gate: ok` marker (from task 02).
- Produces: the session directory convention
  `docs/plans/<slug>/companion/<session-id>/`, holding `content/` and `state/`
  peers exactly as the temp layout did.

**Seam:** running `start-server.sh` and then `stop-server.sh`, and inspecting
the filesystem afterwards. This is the only executable change in the plan, so
reading it is not enough.

**Risks:** `stop-server.sh` deletes the session directory only when its path
begins with the temp prefix. **That guard is correct and must not be
changed**: once the default moves into the repository, the guard is what stops
the stop script deleting a user's mockups. It keeps its temp reference and
takes the marker.

The server binds a port and writes files containing a session key under a
`umask 077`. Verify against a scratch project directory, never against this
repository's own plan directory.

**Idempotency:** four text edits. Re-running finds the new defaults already in
place. The scripts themselves create their session directory with `mkdir -p`,
which is safe to repeat.

**Testing:** start the server with and without a project directory, check where
the session directory landed, stop it, and check what survived.

## Acceptance criteria

- [ ] `start-server.sh` defaults its session directory to
      `docs/plans/<slug>/companion/<session-id>/` and no longer defaults to a
      temp path.
- [ ] The port and token files move with it, keeping the restart-reuse
      behaviour they have today.
- [ ] `server.cjs` no longer defaults its session directory to a temp path.
- [ ] `stop-server.sh`'s deletion guard is **byte-identical** apart from the
      added marker, proven by diffing that line against the version before the
      edit.
- [ ] After a run stopped by `stop-server.sh`, the session directory and its
      `content/` still exist. This is the behaviour change that matters and it
      is asserted by listing the directory, not by reading the script.
- [ ] `visual-companion.md` no longer tells the user files go to a temp
      directory and get cleaned up, and no longer names `.superpowers/`.
- [ ] No occurrence of `.superpowers` remains anywhere under
      `skills/fx-brainstorm/`, proven by grep.
- [ ] The remote brand image is gone: `server.cjs` contains no URL pointing at
      a third-party host, proven by grep for `https://` in that file, and the
      page still renders its footer.
- [ ] `python3 scripts/check-artifacts` exits **0** and reports **6 exempted
      lines**: three quotations in the two COVERAGE files, and the three lines
      in `stop-server.sh` that describe and implement the deletion guard.
- [ ] **`check-artifacts` is added to `scripts/check-all`.** Task 02 left it out
      on purpose, because a red gate inside the combined command would have
      blocked tasks 03 and 04 from committing. It is green now, so nothing
      wires it in unless this task does, and an unwired gate is a gate that
      stops running the day after it is written.
- [ ] `scripts/check-all` exits 0 **with six gates**, not five.

## Steps

- [ ] **1. Write the failing test**

The test is a run, and it must fail before the change. In a scratch directory
outside this repository:

```bash
mkdir -p /var/tmp/fx-companion-probe && cd /var/tmp/fx-companion-probe
bash <fx>/skills/fx-brainstorm/scripts/start-server.sh --foreground &
sleep 2
find /var/tmp/fx-companion-probe -name content -type d
```

- [ ] **2. Run it: verify RED**

Expected before the change: `find` prints nothing, because the session
directory was created under the temp path instead of the working directory.
Record the temp path the script reported.

- [ ] **3. Implement the minimum that passes**

Change the two defaults and the documentation, and remove the remote image. No
code here: `fx-tdd` drives it.

- [ ] **4. Run it: verify GREEN**

Re-run the probe. Expected: `find` prints a `content` directory under the
scratch project directory.

- [ ] **5. Verify the stop script keeps the files**

Run `stop-server.sh` against the probe session, then list the session
directory. Expected: it still exists, with `content/` intact.

- [ ] **6. Verify the guard line is unchanged**

Diff the guard line against the pre-edit backup. Expected: identical apart from
the appended marker.

- [ ] **7. Prove nothing reaches a third party**

Run: `grep -n "https://" skills/fx-brainstorm/scripts/server.cjs`
Expected: no line pointing at an image or asset host. A link the user clicks is
not a fetch; an `img` source is.

- [ ] **8. Prove the old name is gone**

Run: `grep -rn "\.superpowers" skills/fx-brainstorm/`
Expected: no output.

- [ ] **9. Run the artifact gate**

Run: `python3 scripts/check-artifacts`
Expected: PASS, exit 0.

- [ ] **10. Wire the gate into the combined command**

Add `check-artifacts` to `scripts/check-all` beside the other five.

- [ ] **11. Run the combined gate**

Run: `scripts/check-all`
Expected: PASS, exit 0, and the output names six gates.

- [ ] **12. Clean up the probe**

Remove `/var/tmp/fx-companion-probe` and confirm no server process is still
listening.

- [ ] **13. Commit**

```
git add skills/fx-brainstorm/scripts/start-server.sh skills/fx-brainstorm/scripts/server.cjs skills/fx-brainstorm/scripts/stop-server.sh skills/fx-brainstorm/visual-companion.md scripts/check-all
git commit -m "fix(brainstorm): persist companion mockups in the plan directory"
```

No attribution trailers. Then continue to the next task: never stop and wait.
