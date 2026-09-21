# Task 08 review findings

**Spec compliance: PASS** (21/21 criteria)
**Task quality: PASS** after one fix round
No findings at re-review.

## The defect this task existed to find

The shipped `plugins/fx.js` destructured `experimental.chat.system.transform`
as a **single argument**. The reviewer measured both `trigger()` call sites in
the shipped opencode 1.18.25 binary: both pass `(input, output)` with `system`
on the output object, and one never sets `sessionID` at all.

It then reverted the fix and got `TypeError: Cannot read properties of undefined
(reading 'push')`. **The preamble never reached an opencode session, and nothing
reported it.** That is the failure this plan was started for.

## Seven mutations, all genuinely red

Reverting the arity fix; swallowing the bash-refusal throw; swallowing the
lane-check refusal; making the fail-open catch propagate; filtering
`READ_ONLY_AGENTS` by `fx-lens-` prefix, which failed on exactly
`fx-devils-advocate`; hardcoding `subagent_depth = 2` instead of taking the
maximum; and reverting the implementer's fixture fix, which made the plan-state
criterion unwinnable again and so proved that task-supplied bug was real.

## The Important finding, and its fix

The test exercised only `edit`. No `write`, no `apply_patch`. The implementation
wired all three correctly, but two of three had no regression coverage: a typo
in a tool-name match or a broken `extractPatchPaths` would ship silently. The
brief had asked for exactly this, in one line: "a lane check wired to one of
three is not wired."

Fixed with refusal and passing cases for all three, including a multi-file patch
where **only a later path** is refused, asserting the error names that path.
Three mutations confirmed each new assertion can fail: removing `write` from the
tool match, returning only the first path, and returning no paths.

Fresh scratch directory per tool, because `lib/lane-check.js` writes a
fires-once marker and reusing one directory makes the second assertion pass for
the wrong reason.

## Minor, recorded

`extractPatchPaths` parses `*** Move to:`, but the shipped opencode binary
refuses any apply_patch containing a move. That branch cannot see live traffic
today. Commented rather than removed, for parity with Codex's identical header
vocabulary.
