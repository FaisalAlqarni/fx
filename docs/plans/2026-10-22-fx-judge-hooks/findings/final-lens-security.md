Lens: security, 8 findings (mode: branch)

I did not re-report anything in the per-task lens files or the ledger's deferred items. The git guard wrapper miss, MCP writes and ADR 0047:59 are not re-rated: the branch view does not change their severity.

1. [Important] `/development/fx/.worktrees/fx-judge-hooks/src/lib/repo-config.ts:25-29`, used at `/development/fx/.worktrees/fx-judge-hooks/src/lib/shell-guard.ts:106` and `:120`. The agent can turn off the judge, on every harness, by editing a file it is allowed to write.
   - `.fx.json` is an ordinary repo file. No harness refuses Write, Edit, apply_patch or the opencode `edit`/`write` tools on it.
   - Setting `"hooks": {"shell_judge": false}` turns every grey command into `allow`, logged only as `switched-off`. `stop_check: false` turns off the Stop check.
   - Rewriting `test_one` or `setup` lets any grey command run silently as `repo-command`, with no judge call and no decision-log line.
   - Claude Code keeps the shell's cwd between calls, and the switch is read from the git top level of the payload cwd. So `cd` into a folder the agent made with its own `.fx.json` has the same effect without touching the user's repo.
   - This is the trust rule broken from a path the plan never listed: the judge is loosened by something other than a user prompt.
   - Fix: read `hooks` and the check templates from the committed `.fx.json` (`git show HEAD:.fx.json`) or from a SessionStart snapshot, never from the live working tree. Also log `repo-command` allows, so a laundered command leaves a trace.

2. [Important] `/development/fx/.worktrees/fx-judge-hooks/src/lib/shell-rules.ts:495-497` (`namesFxState`), with `/development/fx/.worktrees/fx-judge-hooks/src/lib/judge-input.ts:62`. The fx-state refusal covers the state directory but not the config directory that holds `judge.json`.
   - The Claude Code Write/Edit check (`/development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-pretooluse.ts:207`) and the Codex apply_patch check (`/development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts:213`) both let the agent write `~/.config/fx/judge.json` (or `%APPDATA%\fx\judge.json`).
   - Writing invalid JSON makes the judge `bad-config`, which allows every command.
   - Writing `{"base_url":"mock","mock_answers":{"decision":{"choice":"run",...}}}` makes the production judge answer `run` to everything.
   - Pointing `base_url` at another host sends every later command and user prompt there.
   - In bypass or yolo modes, which are typical for unattended runs, the hook is the only barrier.
   - Fix: make `namesFxState` also match `machinePaths().configDir` and its spelled forms (`.config/fx`, `$XDG_CONFIG_HOME/fx`, `%APPDATA%\fx`). Separately, refuse `base_url: "mock"` outside the test environment, for example only when an fx test env var is set.

3. [Important] `/development/fx/.worktrees/fx-judge-hooks/src/plugins/fx-opencode-v1.ts:537-556`. On opencode 1.x the `edit`, `write` and `apply_patch` paths run the lane check only, with no fx-state refusal. The same applies to the 2.x evaluate hook.
   - The "no stamp on opencode" ruling holds only because opencode journals `prompt` with `text: null`. `honoured` and `lastUserPrompt` in `/development/fx/.worktrees/fx-judge-hooks/src/lib/shell-guard.ts:113` and `:125` do not check the harness.
   - So one forged line written with opencode's `write` tool brings back both the stamp and the softened judge on 1.x. The forged line is `{"t":...,"kind":"prompt","text":"..."}` in `sessions/<id>.jsonl`; the glob tool can find the file name.
   - The effect: a judged deny becomes `warn` and runs, and the loop guard is skipped.
   - Claude Code and Codex refuse this write (lens I8); opencode does not.
   - opencode's `external_directory` permission may ask the user first by default. I did not verify that.
   - Fix: add the same fail-closed `namesFxState` check to v1's write paths and to v2's `edit` evaluate. Also make `honoured` false when `harness === 'opencode'`, so the ruling does not depend on the journal being intact.

4. [Important] `/development/fx/.worktrees/fx-judge-hooks/src/lib/shell-guard.ts:127-128` with `:160`. The three harnesses treat a command longer than the judge reads differently:

   | Harness | Over-long command (more than 2,000 characters) |
   |---|---|
   | Claude Code | asks |
   | opencode 1.x | refused (`/development/fx/.worktrees/fx-judge-hooks/src/plugins/fx-opencode-v1.ts:372`) |
   | Codex | `warn`: the command runs, and no `ask` event is journaled for the loop guard |

   A judge deny is the only judge outcome that stops a call on Codex. Padding any judged-deny command past 2,000 characters of code (comments are stripped, so filler like `true xxxx...;` works) turns that deny into a run. Lens I6's fix is therefore undone on Codex.
   - Fix: on Codex, refuse an over-long command (exit 2) when a judge is ready, and journal it as `deny` so the loop guard sees it.

5. [Important] `/development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts:284-330`. Codex PreToolUse guards only `tool_name === 'Bash'` and `apply_patch`; every other tool ends at `process.exit(0)`.
   - Unified exec registers `write_stdin` next to `exec_command` (`/development/fx/.worktrees/fx-judge-hooks/docs/plans/2026-09-21-multi-harness/research/codex-local-model.md:34,45`). Codex sends any other function tool to hooks under its flat name (`/development/fx/.worktrees/fx-judge-hooks/docs/plans/2026-09-21-multi-harness/research/codex.md:113`).
   - So the agent can start an interactive `bash` through `exec_command` and then type `rm -rf ~` or `git push --force` through `write_stdin`. That skips the git guard, the hard rules and the judge.
   - Claude Code and opencode have no equivalent channel, so the same command is refused there and allowed on Codex.
   - Unverified: that `write_stdin` reaches PreToolUse, and that a tty `exec_command` is allowed. Codex's sandbox may still stop it in `workspace-write` mode.
   - Fix: refuse `write_stdin` whose input holds a newline after a shell-like `exec_command`, or run hard rules on `write_stdin` text. At minimum, record the gap in `/development/fx/.worktrees/fx-judge-hooks/references/harnesses/codex.md` and add it to the owner's live-run list.

6. [Important] `/development/fx/.worktrees/fx-judge-hooks/PREAMBLE.md:52`. Every session and subagent, on every harness and in every repo, is now told to move `rm` out of `-c` strings "into a script file" because Claude Code "stops the run for a permission prompt, even in bypass mode."
   - fx's own hard rules expand `bash -c` strings and catch `rm -rf ~` there. Neither they nor Claude Code's check can read a script file's contents.
   - So the bullet steers agents toward the one shape no guard inspects, and frames a user safety prompt as something to route around. This in the run where a home folder was wiped.
   - Fix: limit the rule to fx's own `.fx.json` commands (it was an fx tooling problem), or reword it to "leave scratch files for a later cleanup; do not move deletes into a script to avoid a prompt." Drop the bypass-mode framing.

7. [Minor] `/development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-pretooluse.ts:179`. On Claude Code, a non-string `tool_input.command` that passes the git guard exits 0 before the hard rules run.
   - Codex (`/development/fx/.worktrees/fx-judge-hooks/src/hooks/fx-codex.ts:299`) and both opencode plugins refuse the same shape.
   - Claude Code probably validates the tool schema before hooks fire, which is why this is Minor.
   - Fix: deny, as the other three harnesses do.

8. [Minor] `/development/fx/.worktrees/fx-judge-hooks/src/lib/shell-guard.ts:39` with `/development/fx/.worktrees/fx-judge-hooks/scripts/test-one:13,17`. The `{file}` placeholder accepts absolute paths and paths outside `src/`, and `builtPath` (`/development/fx/.worktrees/fx-judge-hooks/src/scripts/test-scope.ts:38`) returns them unchanged.
   - So `scripts/test-one /tmp/x.js` runs `node /tmp/x.js` as a silent, unlogged `repo-command`, while `node /tmp/x.js` typed directly would be judged.
   - Fix: reject placeholder fills that are absolute or not under the repo; in `test-one`, require `$1` to match `src/*.test.ts`.

Checked and fine:
- Hard rules load fail-closed on all four entry points.
- The git guard runs before the shell guard everywhere.
- Subagent and dispatch prompts are journaled with `text: null` on Claude Code and Codex.
- The `[fx] ` Stop-continuation filter is in both UserPromptSubmit paths.
- The judge request uses `redirect: 'error'`, and an api_key is stripped from network errors.
- Journals are written 0600 in a 0700 directory, and decision-log text is redacted.
- `scripts/setup` is clean.

Not checked:
- Live Codex behaviour for `write_stdin` (finding 5).
- opencode's default `external_directory` permission (finding 3).
- Windows ACLs on the state and config directories.
