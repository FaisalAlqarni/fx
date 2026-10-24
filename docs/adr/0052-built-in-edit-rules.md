# Built-in edit rules

Status: accepted, 2026-10-24.

## Context

ADR 0047 left the edit tools unguarded beyond the lane check. ADR 0048 added edit rules: a few built-in checks in code, plus rules a repository could write in `.fx.json` `rules` for the judge to apply. The benchmark in `docs/plans/2026-10-24-judge-across-fx/benchmark.md` found that every bad edit refused in its offline corpus (11 of 11) came from the built-in code rules. ADR 0049 removed the judge and the repository rules with it, superseded 0047 and 0048, and kept the three built-in rules and the `hooks.edit_rules` switch in its "What stays" list. This ADR records their scope and behaviour in fx 0.5.0. The code is `src/lib/edit-rules.ts`.

## Decision

**Three rules, in code.** Before an edit lands, the lines it adds are checked against:

- `no-dashes`, on files matching `**/*.{md,mdx}`: the edit adds more em dash (U+2014) or en dash (U+2013) characters than it removes. A dash already on a line the edit changes is not a new one.
- `no-secrets`, on every file: the added lines hold a whole private key block (both its `BEGIN` and `END` lines) or a key with a known vendor prefix, from the `VENDOR_KEY` pattern in `src/lib/redact.ts` (`sk-`, `ghp_`, `github_pat_`, `AKIA`, `AIza`, `xoxb-` and others).
- `no-conflict-markers`, on every file: an added line starts with seven `<` or seven `>` followed by a space or the line's end. A setext `=======` underline never matches.

The first breach refuses the whole call with `[fx] rule <id>: <rule text> (<path>)` and writes a decision-log line with source `hard-rule`. There is no override other than the switch below.

**Added lines only.** What counts as added comes from a line diff (longest common subsequence, carriage returns ignored): a `Write` is compared with the file on disk, an `Edit` compares its old and new strings, a `MultiEdit` each pair, and a patch contributes the lines it adds. A notebook edit counts its whole new cell source as added. When the changed middle of a rewrite is larger than 4,000,000 line pairs, all of it counts as added.

**Edit tools only.** The rules run on:

- Claude Code: `Write`, `Edit`, `MultiEdit` and `NotebookEdit`, in `hooks/fx-pretooluse.js`.
- Codex: the `apply_patch` tool, and a shell call that runs `apply_patch`, in `hooks/fx-codex.js`.
- opencode 1.x: `write`, `edit` and `apply_patch`, in `plugins/fx-opencode-v1.js`.
- opencode 2.x: `write`, `edit` and `patch`, in `tool.execute.before` in `plugins/fx-opencode-v2.js`, refusing by a synchronous throw.

A file written by any other shell command is not checked. On Claude Code, Codex and opencode 1.x the fx-state refusal (ADR 0050) and the lane check run first. On opencode 2.x those two run in `permission.evaluate`, which comes after `tool.execute.before`, so the rules run first there.

**Files inside the repository.** A path is checked only when it lies under the git top level of the working directory, or under the working directory itself when there is no repository. A file outside it gets no rules.

**The switch.** `hooks.edit_rules: false` in the top-level `.fx.json` turns all three rules off, `no-secrets` included. It defaults to on, and a value that is not a boolean is ignored. A `.fx.json` in a subdirectory is never read. The git guard and the shell guard's hard rules have no switch.

**Repository rules are ignored.** fx reads no `rules` key. A `rules` entry left in `.fx.json` from before ADR 0049 is ignored silently: no refusal, no problem reported, no log line.

**The change notice.** An agent can write `.fx.json`, so a switch can change mid-session. fx allows that and says so: it hashes the raw `hooks` value of the top-level `.fx.json` (`src/lib/fx-json-watch.ts`), and when the hash differs from the session's last one it shows `[fx] notice: the hook switches in .fx.json changed during this session. An agent can edit that file; check the change.` and logs it with source `fx-json`. The first hash a session sees is its baseline and shows nothing. Where it appears:

- Claude Code: at session start, as context and as a `systemMessage`, and at the root session's Stop as a `systemMessage`.
- Codex: at session start, with a line that new hook events need trusting once in `/hooks`, and at the root session's Stop on stderr. Whether Codex shows a Stop hook's stderr to the user is not measured.
- opencode 1.x: at each new user message, on stderr and queued for the model. The baseline lives in the plugin's memory, so a restart takes a new one silently.
- opencode 2.x: no notice.

On Claude Code and Codex the baseline is the `fx-json-hooks` line in the session journal (ADR 0051).

**Failure.** The rules fail open. A load failure or a crash allows the edit, prints `[fx] edit rules off: <error>` on stderr, and writes a decision-log line with source `error`. A refusal the rules did make always stands.

## Consequences

- The offline corpus in the benchmark measured 11 of 11 bad edits refused and 2 of 14 benign ones refused, for about 10 ms per edit. The two false refusals are known and kept: a SpinKit class `sk-folding-cube-large`, which matches the `sk-` vendor key shape, and a document showing a conflict example inside a code fence. A document that quotes a whole private key block is refused the same way.
- To write any of these on purpose, the user sets `hooks.edit_rules: false` for the repository, which drops all three rules. There is no per-rule or per-file switch.
- A secret written through a shell redirect, a script, or any tool other than the edit tools above passes. An em dash in a `.txt` or `.rst` file passes. The rules are a check on the agent's usual edit path, not a secret scanner.
- The notice covers `hooks` only. A change to the repository's commands, which the shell guard runs silently (ADR 0050), shows no notice, and on opencode 2.x a change to the switches shows none either.
- A fourth built-in rule is an entry in `BUILTIN_RULES` and a case in `builtinBreach`, with tests for both a refusal and a benign edit.
