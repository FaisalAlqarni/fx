# Final review: silent-failure lens

Returned inline by `fx-lens-silent-failure`, whose definition forbids writing
files, and saved here by the controller. Wording is the lens's own except that em
dashes are replaced with other punctuation so the file passes the prose gate.
The lens reports its reproduction attempts as desk checks, a read-only trace of
each path, with no server or fixture started.

**Controller's note before verification:** the lens cites `scripts/check-all:1040-1048`,
which cannot be a line of that script; it is most likely a line of the review
package. Every finding below is verified against the code before the fix wave.

## Findings

```markdown
Lens: silent-failure, 3 findings

1. [Important] skills/fx-brainstorm/scripts/start-server.sh:215,218,220: the
   exclude-file repair path (`mkdir -p "$(dirname "$EXCLUDE_FILE")"` and the two
   `printf ... >> "$EXCLUDE_FILE"` appends) never checks its own exit status;
   the script has no `set -e` anywhere. When one of these writes fails (a
   read-only `.git`, a permission error, a full disk), the script still fails
   closed correctly via `session_files_ignored` at line 225, but the message
   it prints is a single hardcoded cause: "a .gitignore rule re-includes it"
   (line 226). A human chasing a permissions or git-install problem is told
   to go remove a `.gitignore` rule that does not exist, and has no way from
   the message alone to learn the write itself silently never happened. Same
   applies if `git rev-parse --path-format=absolute --git-path info/exclude`
   (line 213) itself fails: `EXCLUDE_FILE` comes back empty, the whole repair
   block is skipped, and the same misleading message fires at line 226.

2. [Important] skills/fx-brainstorm/scripts/start-server.sh:181: this compounds
   the already-recorded issue at line 172 (git's stderr merged into
   `GIT_ANSWER`). When the fail-closed refusal fires, the reason shown to the
   caller is truncated to the first line of `GIT_ANSWER`
   (`${GIT_ANSWER%%$'\n'*}`). Line 172's merge makes a multi-line
   `GIT_ANSWER` more likely (advisory or hint text ahead of git's real fatal
   line), so the truncation at 181 silently drops the substantive part of
   git's own diagnostic from the JSON `error` the caller receives. The one
   piece of evidence that would tell a human what actually went wrong is cut
   before it reaches them. Worse than the recorded finding taken alone: the
   merge corrupts the signal, and the truncation then discards whatever of it
   survives.

3. [Minor] skills/fx-brainstorm/scripts/server.cjs:107-108: `SESSION_DIR` and
   `STATE_DIR` now default to `''` (previously `/tmp/brainstorm`), and the
   hard refusal added at the bottom of the file (`if (!process.env.BRAINSTORM_DIR
   || !process.env.BRAINSTORM_STATE_DIR) ... process.exit(1)`) only guards the
   `require.main === module` entry point. The module still exports its
   internals for reuse. Any future caller that requires this file directly
   without those two variables set gets a silent relative path instead of the
   loud refusal the direct-execution path has. No current caller in this tree
   requires the module that way, so this is a latent gap, not an active one.
```

## On the three items already recorded

The lens re-checked each against the current code and found none worse than
recorded:

- `scripts/check-prose`'s `files()` at lines 55-62: a nonexistent path yields
  nothing from `rglob`, and `main()` prints OK and returns 0, as recorded.
- `start-server.sh:172`, the stderr merge: present and unchanged in mechanism;
  finding 2 above is where it compounds.
- `scripts/check-all`: the `/tmp/fx-fixture-check-all-$$` fixture is built with
  no `trap` and no removal at any exit path, as recorded.

Files the lens read: the three companion scripts, the three gates, and the review
package.
