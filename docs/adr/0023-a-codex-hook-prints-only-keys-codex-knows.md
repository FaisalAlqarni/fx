# A Codex hook prints only the keys Codex knows, and anything else fails open

Codex rejects hook output carrying a key it does not recognise. The rejection
fails open: the run is marked failed and nothing is blocked, silently, with no
message anywhere a person would see it. `hooks/fx-codex.js` is the read only
guard and the git guard for Codex, so an unrecognised key in its output does
not just lose a feature, it turns the guard off.

`handlePreToolUse` and the context handler at the bottom of the file
(`hooks/fx-codex.js:249` to `256`) print only `hookSpecificOutput` with
`hookEventName` and `additionalContext`, plus a top level `systemMessage`,
and `systemMessage` is added only on `SessionStart`, only when `plantRoles()`
reports something written or repaired. The shape is taken from ponytail's
`writeHookOutput()`. Nothing else this file prints today, and nothing outside
the test's own allowed key set may be added later without the gate catching it
first: a debug field, a status field, any extra key a future contributor adds
to hand the model one more piece of context.

`tests/gates/codex-hook-output.test.js` pins this at the process boundary: it
spawns the real `hooks/fx-codex.js` for `SessionStart`, `SubagentStart` and
`PreToolUse`, both allowed and denied, and asserts every top level key against
`TOP`/`TOP_SESSION` and every `hookSpecificOutput` key against `INNER`
(`tests/gates/codex-hook-output.test.js:21` to `34`). A key outside those sets
fails the assertion immediately, not by asking Codex to reject it and hoping
the failure is noticed.

The obvious alternative, adding a field when a future task needs to hand the
model more information, is exactly what this test exists to block. A
contributor who adds one field to carry extra data disables the read only
guard on every subsequent PreToolUse call for that session, with no error in
Codex, no error in fx, and no evidence at all beyond a lens quietly being able
to write.

## Consequences

- Every new field `hooks/fx-codex.js` might ever print for Codex has to be
  added to `tests/gates/codex-hook-output.test.js`'s allowed sets first, or
  the gate catches it before Codex does.
- The allowed key set is read from Codex's own accepted shape
  (`research/codex.md`), never guessed, because a guessed key that happens to
  be accepted today is exactly the failure mode this ADR exists to name.
- A silent, unmessaged failure mode like this one gets a test at the process
  seam, not a comment promising the author will remember.
