# The shell guard decides on code alone

Status: accepted, 2026-10-24.

## Context

ADR 0047 added the shell guard, beside the git guard, with an optional judge for the commands its code could not settle. ADR 0048 widened the judge. ADR 0049 removed the judge and superseded both, and its "What stays" list names the shell guard in two lines. The decisions behind the guard as fx 0.5.0 ships it (what it refuses, what it lets through silently, how each harness runs it, and what happens when it breaks) had no live ADR. This one records them. Every rule below is plain code in `src/lib/shell-rules.ts` and `src/lib/shell-guard.ts`, and it runs after the git guard (`src/lib/git-guard.ts`) has allowed the call.

## Decision

**Hard rules, no override.** A command that breaks a hard rule is refused with `[fx] refused: <reason> This rule has no override.` and one decision-log line with source `hard-rule`. The rules are: `rm -r` on a root, home or system directory; `find` deleting from one; `mkfs`, `dd of=/dev/...` or a redirect onto a block device; a fork bomb; recursive `chmod` or `chown` on a root or home directory; a download run as a shell script (piped into a shell or an interpreter reading stdin, fed through process substitution, `eval` or `iex`); `shutdown`, `reboot` and their `systemctl` and `init` forms; recursive deletion of a Windows drive root or home directory; and `fx-state`, below. The rules read the command through one quote-aware lexer, so a command inside `$(...)`, a shell's `-c` string, `eval`, a heredoc fed to a shell, or a wrapper such as `sudo`, `env`, `xargs` or `timeout` is checked as a command of its own, down to six levels of nesting. Strings handed to `powershell`, `pwsh` or `cmd` are read the way those shells read them. On Windows the top level is read both ways.

**fx's own directories.** Any shell command whose text names fx's state directory or config directory is refused by the `fx-state` rule, reads included. The match covers the resolved paths from `src/lib/fx-paths.ts` and the usual spellings of both directories: `~/.local/state/fx`, `$XDG_STATE_HOME/fx`, `~/.config/fx`, `$XDG_CONFIG_HOME/fx` and the Windows `LOCALAPPDATA` and `APPDATA` forms. A write through a harness edit tool to a path in either directory is refused with the same reason. The reason is that these directories hold the session journals and the decision log: a forged journal line would change what the Stop check and the nudges see (ADR 0051).

**Read-only allowlist.** A command runs silently and unlogged when it is one simple command with no operator, redirect, backtick or command substitution, names no secret-looking path (`.env`, SSH keys, `.pem`, `.aws/`, `.npmrc` and similar) and mentions no state directory, and is one of: `ls`, `pwd`, `cat`, `head`, `tail`, `wc`, `grep`, `stat`, `file`, `du`, `df`, `which`, `type`, `echo`, `date`, `whoami`, `uname` and their PowerShell equivalents; `rg` without `--pre`; `find` with no action that runs or writes; `tree` without `-o`; `node --version`; `npm ls`; or `git status`, `log`, `diff`, `show`, `blame`, `rev-parse`, `ls-files`, `remote -v` and a non-writing `git branch`. A git read is not read-only when the repository's own config (local or worktree scope) names a program it would run, such as a pager, a diff driver or an fsmonitor.

**The repository's own commands.** A command that runs `test_one`, `test_scope`, `test_all`, `lint` or `setup` from `.fx.json` runs silently and is logged with source `repo-command`, because an agent can write `.fx.json`. It counts only as written: one line, nothing chained or redirected after it, nothing added to a template with no placeholder, and a placeholder filled with no option and no path that leaves the repository.

**Everything else runs.** Any other command is allowed and leaves one decision-log line with source `grey` and the command normalized and redacted. Nothing asks the user about it.

**How each harness runs it.**

- Claude Code: `hooks/fx-pretooluse.js` on PreToolUse for `Bash`. A refusal exits 2 with the reason on stderr.
- Codex: `hooks/fx-codex.js` on PreToolUse for `Bash`, the same order and output. On Windows the command is read as PowerShell and as bash. A shell call that runs `apply_patch` also gets the fx-state refusal on the paths its patch names, and the edit rules (ADR 0052).
- opencode 1.x: `plugins/fx-opencode-v1.js` in `tool.execute.before` for `bash`; a refusal is a thrown error.
- opencode 2.x: `plugins/fx-opencode-v2.js`. `tool.execute.before` records the full command text by session, message and call id; `permission.evaluate` runs the git guard on that text and on each parsed piece, then the hard rules, and refuses by setting the effect to deny. A shell call whose text was not recorded is refused. If the evaluate hook fails to register, `tool.execute.before` refuses every shell call. The installer's `experimental.policies` deny rules (`src/lib/opencode-v2-policies.ts`) are a second layer for the git guard only.

**Failure.** The hard rules fail closed. If `shell-rules` fails to load, every shell command and every edit-tool write is refused on all four harnesses; a crash before the hard rules have decided refuses the call. Past the hard rules the rest of the guard fails open: a load failure or crash in `shell-guard` allows the command, prints `[fx] shell guard off: <error>` and writes a decision-log line with source `guard-error`, unless a hard rule already matched, which still refuses. On opencode 2.x the guard runs synchronously through `guardShellCodeOnly` and reports its own crash the same way.

**Hygiene, not a boundary.** The guard stops the common irreversible mistakes and leaves a trace of the rest. It is not a security boundary, and no fx document may describe it as one.

## Consequences

- An ordinary command never waits on a question. The benchmark in `docs/plans/2026-10-24-judge-across-fx/benchmark.md`, section "Re-run after the judge removal", measured 78 of 78 catastrophic commands refused and 0 of 79 ordinary ones, with no difference from the guard before the judge over 398 calls.
- `cat` or `ls` on fx's own state directory is refused too. To read the decision log, the user reads it outside the agent session.
- Known gaps: a command that builds a path at run time (a variable set by an earlier command, a `cd` into part of the path) is not seen by the text match; nesting past six levels is not checked; a script the agent writes and then runs is checked only by its command line; and on opencode 2.x an edit request whose resources are not a list skips the fx-state check.
- A command added to `.fx.json` runs silently. The `repo-command` log line is the only trace, and the `.fx.json` change notice (ADR 0052) covers the `hooks` key only, not the commands.
- A new hard rule needs an entry in `RULES` in `src/lib/shell-rules.ts`, a case in its tests, and a check that the ordinary set still passes.
