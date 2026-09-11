# Final review: security lens

Returned inline by `fx-lens-security`, whose definition forbids writing files, and
saved here by the controller with the lens's wording. The lens reproduced findings
2 and 4 in a scratch directory, with a stub standing in for the server so nothing
listened on a port; finding 1 is not reproduced. Every finding is verified against
the code before the fix wave.

## Findings

Lens: security, 5 findings

1. **[Important]** `skills/fx-audit/SKILL.md:106-109`, `:153`, `:170-175`: the
   audit trusts the saved reference over what the user typed. An attacker can
   plant it in a committed file and get a command run on the victim's machine, or
   local files copied into a committable document.
   - **How the plant is found:** `01-current.md` lives in `docs/plans/`, so it can
     arrive through a clone, pull or pull request. Resume picks a slug directory
     by name, whatever its date (`:90-97`). A planted
     `docs/plans/<any-date>-audit-<repo-name>/01-current.md` with the victim's
     scope and no `02-reference.md` sends the next run straight into Phase 2
     (`:122-123`).
   - **Command run:** Phase 2 inserts the reference "exactly as given" into
     `git rev-parse --verify --quiet "<reference>^{commit}"` (`:172`). The quotes
     are double quotes, so `$(...)` or backticks in the value run.
   - **File copy:** a value that is an existing path, such as `~/.ssh`, is "read in
     place" (`:171`). Explorers then write claims with file and line about it into
     `02-reference.md` under `docs/plans/`.
   - **Conditions:** the victim runs `/fx:fx-audit` on that scope, and the agent
     types the value without neutralising it. Phase 2 has never been observed
     live, and the lens did not run it, so this is not reproduced.

2. **[Minor]** `skills/fx-brainstorm/scripts/start-server.sh:171-190`, `:212`: in a
   project with no `.git` yet, the session key is written under `.fx/` with nothing
   ignoring it. A later `git init && git add -A` stages it. Not in the carried
   list.
   - **Reproduced in scratch:** `git add -A` staged
     `.fx/demo/companion/.last-token` and `state/server-info`, plus `server.log`,
     `server.pid` and `server-instance-id`.
   - **Why it matters:** `.last-token` is reused on every restart of that slug
     (`server.cjs:133-139`), so a committed key stays the live key. Brainstorming
     before `git init` is the normal order for a new project.
   - **Impact:** small on the default loopback bind. With `--host 0.0.0.0`, which
     `visual-companion.md` documents, the key is the only gate.

3. **[Minor]** The recorded content-security-policy item is worse than recorded: it
   exposes the session key, not only the user's traffic.
   - `server.cjs:190` stores the key in `sessionStorage`, and `helper.js:27` reads
     it back. Any script a mockup loads can read it too.
   - The comment at `server.cjs:377-378` says HttpOnly keeps the key from page
     scripts; that holds for the cookie only.
   - Only the documentation forbids remote scripts; the policy at `server.cjs:352`
     sets `frame-ancestors 'none'` and nothing else.
   - **What a stolen key gives:** on loopback, little: the WebSocket Origin check
     (`server.cjs:358-364`) and CORS block a foreign page. On a non-loopback bind:
     every mockup, plus fake events the agent reads as the user's choices.
   - The `sessionStorage` code predates this branch.

4. **[Minor]** `skills/fx-brainstorm/scripts/start-server.sh:199`: `mkdir -p
   "$STATE_DIR"` runs before the ignore check and follows a committed `.fx`
   symlink. A repository can make the script create directories anywhere the user
   can write.
   - **Reproduced:** a tracked `.fx` symlink pointing outside the repository got
     `demo/companion/<id>/state` created at its target, and `.fx/` was appended to
     the exclude file, before the refusal.
   - No key is written. This goes past the carried "refused start leaves an empty
     state directory" item, because the directory lands outside the repository.
   - The refusal message blames a `.gitignore` rule; the real cause was a path
     beyond a symbolic link.

5. **[Minor]** `skills/fx-audit/SKILL.md:195`: Phase 3's file set uses
   `--others --exclude-standard`, so untracked files nobody ignored, such as a
   forgotten `.env`, go to the lens and the architecture subagent.
   - Their citations with file and line land in `03-gaps.md` and in an HTML report
     under `docs/plans/`.
   - That report loads CDN scripts (`:53-55`, parked Ruling AC), so a quoted secret
     could reach a third-party script or a commit.
   - Speculative: it needs such a file to exist and a finding to quote it.

## Checked and held

- The `--slug` pattern allows one path segment only, so no traversal.
- A planted, tracked `.last-token` is refused before any key is written
  (reproduced).
- A committed `.fx` symlink is also refused before any key is written
  (reproduced).
- The key is compared in constant time, and state files are owner-only, umask
  077 and mode 0600.
- The per-process `/tmp` fixture path in `scripts/check-all` is guessable; the
  `/tmp` sticky bit, `fs.protected_symlinks` and git's `safe.directory` block the
  obvious attack.
- `scripts/check-artifacts` has no security surface.
- The worktree is added only after `rev-parse --verify` resolves, and a ref name
  cannot start with a hyphen.

The lens's scratch directory is removed and no process from it is left.
