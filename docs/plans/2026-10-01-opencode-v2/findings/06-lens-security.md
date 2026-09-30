Lens: security. 5 findings.

The main tripwire questions come back clean:

- **Top-level `permissions`:** never written. `merge_opencode_json` only touches `subagent_depth`, `experimental.subagent_depth` and `experimental.policies` (`scripts/fx-opencode-install:410-425`).
- **Crafted `opencode.json` content:** cannot steer any path. Its content only feeds a deep copy and a key merge. Paths come from `--dest` and constants.
- **The three plugin names:** `FX_PLUGIN_SOURCES` (`scripts/fx-opencode-install:240-241`) only widens which link at `plugins/fx.js` counts as fx's own. The existing target-equality check still applies, so a foreign link is still refused.

1. **[Important]** `scripts/fx-opencode-install:413-416`: a 1.x run deletes every `experimental.policies` entry equal to one of fx's guard policies. Equality is the only ownership test, so a deny rule the user wrote with the same content is removed too. The file is shared between majors, so the same thing happens when `opencode` on PATH is a 1.x binary but the user actually runs 2.x. Impact: user-level deny rules for `git push --force`, `git reset --hard` and the rest vanish silently. The 2.x run's dedupe at line 425 makes this worse: when the user's rule was there first, fx never adds its own copy, then a later 1.x run removes the user's.

2. **[Important]** `scripts/fx-opencode-install:357-361` with `:458` and `:473`: `detect_major` returns the first integer in the version output and never checks that it is 1 or 2. OpenCode 0.x prints 0, and a wrapper or update banner can print some other number. Any value other than 1 then takes the 2.x paths (lines 492, 417, 531) and points `plugins/fx.js` at `plugins/fx-opencode-v<N>.js`, which does not exist. If an fx link is already there, it gets replaced by the dangling one. The install still finishes and prints `OK`, because the probes at lines 543-547 only check references. Impact: the fx guard plugin silently stops loading, and the config gets 2.x-only keys. Running an untrusted binary is not the problem here: it is the same `opencode` on PATH the user runs anyway, and it is called with fixed arguments and no shell. The problem is trusting its output. There is also no `timeout`, so a hanging binary hangs the install (Minor).

3. **[Minor]** `scripts/fx-opencode-install:390-394` and `:434`: `opencode.json` is read and written through a symlink with no check. If it is a dangling link, `read_text` raises `FileNotFoundError`, the code treats that as an empty config, and `write_text` creates a file at whatever path the link names. If it links to another JSON object file, fx's keys get merged into that file. This contradicts the "every write stays inside --dest" promise in the help text (lines 439-445). Exploiting it needs write access to the config dir already, so the practical impact is low. Dotfile users who link this file on purpose rely on the follow behaviour.

4. **[Minor]** `scripts/fx-opencode-install:318-320` with `:371-377`: `check_directories` accepts a symlink to a directory for `agents/`, `commands/` and `plugins/`. `refuse_if_foreign_generated` and `remove_stale_commands` check only the leaf file, not its parent. So generated agents, the plugin link, and deletions of `commands/<name>.md` all land in whatever directory the link points to. Deletion is still limited to regular files that contain the generated header and carry one of fx's command names, so a file fx did not generate is not deleted. Impact: writes outside `--dest`, but only via a link someone deliberately placed in the config dir. A related robustness bug: if `commands` is a symlink, `commands_out.rmdir()` at line 377 raises after the earlier writes, leaving a half-finished install.

5. **[Minor]** `scripts/fx-opencode-install:371` (the same check as the existing `:215`): a file counts as fx-generated when the header appears anywhere in it, not at its fixed position. If a user's own command reuses one of fx's names and quotes the header (a copy they edited, for example), the 2.x path deletes it. This is by design going by the header's own wording, but the ownership test is weaker than "fx wrote this file".

Checked and fine:

- `subagent_depth` is only ever raised, never lowered.
- Deleting a top-level `subagent_depth: 2` on 2.x (line 419) removes a limit that 2.x ignores. It does not loosen anything.
- The `node` subprocesses take fixed arguments and run fx's own code.

Not security, left to the correctness lens: a JSON `null` for `experimental` crashes at line 422.

I read and searched only; nothing was run.
