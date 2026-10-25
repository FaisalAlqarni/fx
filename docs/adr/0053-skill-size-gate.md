# The skill size gate

Status: accepted, 2026-10-25.

## Context

Claude Code re-attaches a skill after compaction, and it cuts the text at 20,000 characters (superpowers 7.0.1 found this). Three fx skills were over that size: fx-implement at 49 KB, fx-humanize at 32 KB and fx-authoring at 20.8 KB. A compacted fx-implement controller lost the fix-loop cap, the final review and the exit gate, which sit late in the file.

## Decision

**A gate.** `tests/gates/skill-size.test.js` (source `src/tests/gates/skill-size.test.ts`) fails any `skills/*/SKILL.md` of 20,000 bytes or more and names the file and its size. `scripts/check-all` runs it. The `PENDING` list in the test names a skill that is still over the limit; the gate also fails when an entry outlives its fix, so the list cannot go stale. It is empty now.

**Splits move whole sections.** A split moves a section, unchanged in meaning, into a file beside the skill and leaves a pointer that says when to read it: at the step that needs it. The agent re-reads the file every time it reaches that step. Rules are not dropped or reworded beyond the pointer. The loop, the stop conditions and the ledger rules stay inline in fx-implement.

**References stay one level deep.** A skill-local reference does not point to a further reference. `scripts/check-reference-leaves` enforces this.

**Every pointer resolves.** `scripts/check-paths` fails a pointer to a file that does not exist.

**The limit is written down.** fx-authoring's hard limits state the number and the reason.

## Consequences

- A new section in a large skill goes behind a pointer or the build fails.
- A pointer is read only if the agent reaches the step; a rule that must hold at every step belongs inline.
- fx-humanize came under the limit by its rebase on humanizer 3.1.0, with examples and the reply pattern moved to files beside it.
- The limit is bytes, a safe stand-in for characters: multi-byte text reaches it sooner.
