# Codex lanes are addressed as `$fx:fx-<name>`, and the hook lane-checks a patch run through the shell

## Context

Two Codex behaviors surfaced while the live rows ran on Codex 0.155.1 for the `opencode-v2` branch. Neither is OpenCode work, and ADR-0020 had carried the first one as an in-place edit.

**Addressing.** The preamble named lanes as `$fx-tdd` on Codex. Live logs showed `$fx-handoff` and `$fx-tdd` produced no `<skill>` injection, while `$fx:fx-handoff` did. Codex expands a plugin skill only under its plugin-qualified name.

**Writes through the shell.** A model reached over chat completions has no `apply_patch` function tool. Live row 17 showed such a model writing the file with `apply_patch <<'PATCH' ...` in a shell call, which Codex runs as a patch. The hook lane-checked only the `apply_patch` tool, so a source file written through the shell skipped the check.

## Decision

- **Codex addresses a lane as `$fx:fx-<name>`.** `lib/preamble.js` renders that form for the `codex` harness, and `hooks/fx-codex.js` and its tests, the conformance rows, `INSTALL.md`, `README.md` and `SURFACE.md` use it. The bare `$fx-<name>` is wrong on Codex. ADR-0020 keeps the rule that the preamble is rendered per runtime and points here for the Codex form.
- **The Codex hook lane-checks a shell-run `apply_patch`.** For a `Bash` call, after the git guard allows the command, `SHELL_APPLY_PATCH` tests whether `apply_patch` starts a command: at the start, after a separator, a subshell, a group or a command substitution, inside `bash -c "`, or after `env`, `time`, `xargs` and their words. `grep apply_patch` and `echo apply_patch` are not edits. A match goes through the same `checkPatchPaths` as the tool call and refuses on the first path the lane check refuses.
- **An unreadable shell patch is allowed, and says so.** A patch read from a file or a variable has no paths in the command text. The hook allows the call and writes one stderr line, "the lane check could not read the paths of this apply_patch, so it did not check them". The lane check is advice, so it fails open, as on every runtime.

## Consequences

Row 17 passes on Codex through either path: the tool or the shell. A patch whose paths the hook cannot read is a known gap, stated in the stderr line rather than hidden. The `SHELL_APPLY_PATCH` pattern is a text match on a command line, so an unusual spelling of a command start can miss it; the miss fails open.

## Supersedes

The Codex form in ADR-0020, which named `$fx-tdd`.
