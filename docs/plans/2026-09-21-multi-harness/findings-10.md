# Task 10 review findings

**Spec compliance: PASS** (11/11)
**Task quality: PASS**
One Minor finding, deferred to final-review triage.

## The no-write property, proven by mutation

`plantRoles` repairs; `auditRoles` reports. A reporter that silently fixes is
one nobody can trust the output of, so this was the property to prove.

The reviewer snapshotted three homes by sha256 across the whole tree, nonexistent,
mixed and fully planted, ran `auditRoles`, and confirmed byte-identical
snapshots with the nonexistent home still nonexistent. Then it mutated
`auditRoles` to repair, mirroring `plantRoles`, and got
`AssertionError: auditRoles must report, never repair`. Restored clean.

## Four independent mutations, all red

1. `auditRoles` made to repair -> red.
2. `present`/`missing` branches swapped -> `6 !== 0`.
3. `hooksTrusted` returning `false` instead of `null` -> `false !== null`.
4. The third-caller grep in `tests/install/run.sh` replaced with a decoy ->
   `FAIL: every caller routes through the planter`.

All reverted, tree clean, `ALL GREEN` afterwards.

## The Minor finding: a dead read that reads as a bug

`lib/plant-roles.js:144-150` reads `config.toml` and discards the result
unconditionally before returning `null`. The twenty-line comment above it
justifies thoroughly **why the function always returns `null`**, but says
nothing about why the file is still read. The `catch` comment covers only the
failure path.

The reviewer's judgement, which I accept: this reads as leftover exploration
code, not a deliberate gap. An earlier draft probably inspected the content for
a trust field and was stripped to always-`null` without removing the read. It is
the "dead code that implies a detector exists" pattern, which is how a future
reader concludes something is broken and fixes it wrongly.

Deferred rather than fixed: Minor findings do not enter the fix loop, and the
final review triages them before merge.

## The honest-unknown, upheld

`commands/fx-setup.md:220-224`, verbatim: "`null`: fx cannot tell from what it
can read on this machine. Say that plainly, never report a guessed state, and
name the fix regardless: **run `/hooks` inside Codex to review and trust fx's
hooks.** A planted-but-untrusted role is indistinguishable from a working one
until that step runs, which is exactly why this section exists."

Correct regardless of the true state: never guesses, always names the fix.

## Also confirmed

`skills/fx-setup/SKILL.md` regenerated rather than hand-edited, verified by
running the generator and diffing clean. A user with everything correct sees one
line: `fx roles: 6/6 planted, none stale.` The `tests/install/run.sh` edit is a
single-line extension of the existing pattern, correct and minimal.
`~/.codex/agents` absent before and after every check. No attribution trailer.
