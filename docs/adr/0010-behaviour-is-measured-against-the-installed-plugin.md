# Behaviour is measured against the installed plugin, never the working tree

`CLAUDE_PLUGIN_ROOT` resolves to
`~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. **The path contains
the version**, so the cache refreshes when the version changes and not when the
files do. A session editing fx is not running the fx it edits, and neither the
marketplace clone nor the working tree is what executes.

This produced three false conclusions in one hour, each stated with confidence:
that `PreToolUse` does not fire for `Agent` (twice, both measuring a stale
cache; the assumption had been true the whole time), and that the git guard was
not running (the probe used a shell-concatenated literal the guard never sees).

## How to measure

- **`tests/lane-triggering/` passes `--plugin-dir`**, which points the run at the
  working tree and sidesteps the cache entirely. This is how you test what you
  just wrote.
- Otherwise **bump the version**, or the cache is unchanged no matter what the
  files say.
- Before recording any gate as red, read its first line of output rather than
  only its exit code, and check how `README.md` says to invoke it. A test runner
  printing `usage:` did not run.

## The recurring shape this exists to prevent

**A measurement can be honest, thorough, and about a different thing than the
claim it is offered for.** "I ran every command" is true and does not mean "the
document works". An exit code read through a pipe belongs to `head`. A stable
wrong answer before and after a change reads exactly like confirmation.
