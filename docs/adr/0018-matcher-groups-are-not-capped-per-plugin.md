# Matcher groups are not capped per plugin

`hooks/fx-pretooluse.js` carries a measured limitation at its head: the harness
honours one `PreToolUse` group per plugin, so a second group with a different
matcher never fires. The whole file is shaped around it: matcher `*`, then
routing on `tool_name` in JavaScript, because the natural expression of the rule
was believed unavailable.

**The limit does not exist.** Measured 2026-09-21, Claude Code 2.1.278, via
`--plugin-dir` against a throwaway plugin declaring two `PreToolUse` groups that
both match `Bash`:

```
--- hook marks ---
      1 GROUP=A      (matcher "Bash")
      1 GROUP=B      (matcher "*")
```

Both fired, for one `Bash` call. The documented behaviour agrees: matching hooks
run in parallel, and the official example shows `"Bash"` and `"Edit|Write"`
groups side by side.

Codex is the same: hook groups from user config, project config and each plugin
are keyed separately and all run. Neither runtime needed the workaround.

## The second false belief, in the same comment

The original measurement was not two `Bash` groups. It was a `Write|Edit` group
that never fired, recorded as DEBT #30: "PreToolUse does not fire for Write or
Edit at all". Measured 2026-09-21, same probe method, a `Write|Edit` group and a
`*` group against one `Write` call:

```
GROUP=WE   tool=Write
GROUP=STAR tool=Write
```

**Both fired, and `PreToolUse` fires for `Write`.** DEBT #30 is stale.

This matters more than the cap, because fx's lane check lives behind it. The
check was written, wired, and then reasoned out of existence: the file routes
`Write`, `Edit`, `MultiEdit` and `NotebookEdit` to `laneCheck` today, under a
header stating that branch cannot be reached. Whether it has been running the
whole time, or stopped for some other reason, is now a question with a cheap
answer instead of a settled belief.

## Consequences

- **The in-file dispatcher is no longer load-bearing.** It may stay, because one
  entry point that reads `tool_name` is what lets the same script serve Claude
  Code and Codex. But it stays for portability, a reason that survives
  scrutiny, and not for a cap that was never there.
- **The comment goes.** A false limitation recorded as measured fact is worse
  than no comment: it is the artifact future work trusts instead of re-measuring.
- **The lane check gets a live test, not an assumption.** It is the one fx
  guarantee whose status nobody can currently state.
- Delete the belief, keep the design, restate the reason. Where a workaround
  outlives its cause, the risk is that someone later removes the workaround
  *and* the real benefit it accidentally provides.
- Two false beliefs sat in one comment, each written as a measurement. Re-read
  the comments around a workaround before trusting any of them.
