# Standards pass, 649da01..31214e4

## Hard violations

1. `skills/fx-implement/SKILL.md`. Standard: `skills/fx-authoring/SKILL.md`, Hard limits, "SKILL.md body under 500 lines. Approaching it, split." The file was already over the limit at 765 lines before this diff; the diff adds the "Controller reading rules" section, the lens dispatch rules and the plan complete write up, taking it to 854 lines. The diff moves the file further past a documented hard limit instead of splitting it.

2. `skills/fx-implement/fix-loop.md`. Standard: `skills/fx-authoring/SKILL.md`, Hard limits, "Reference files over 100 lines get a table of contents, so a partial read still shows the full scope." The diff grows this reference file from 79 to 103 lines (the round by round fix rules, the confirmed warning handling, the ledger append instructions) and crosses the threshold with no table of contents added.

## Judgement calls (baseline smells)

3. Duplicated Code. The "### Ledger lines" block, heading text, the "two hash characters, not three" note, the plain text and no bullet and no backtick rule, and the "Task NN: ..." line shape, is added nearly verbatim in three separate prompt files: `skills/fx-implement/re-review-prompt.md`, `skills/fx-implement/task-reviewer-prompt.md`, and `skills/fx-review/reviewer-prompt.md`. Same paragraph, three copies, one wording change away from drifting apart. A single reference the three prompts point to would also satisfy the authoring guide's own pruning rule ("one source of truth per meaning").

4. Duplicated Code, small. In `scripts/build-cost`, `median()` and `p90()` each repeat `const s = [...nums].sort((a, b) => a - b);` before doing their own thing with the sorted array.

5. Duplicated Code, small. `hooks/fx-codex.js` and `hooks/fx-context.js` each add the identical inline expression `subagent: input.hook_event_name === 'SubagentStart'` at their `render()` call site, rather than computing it once and sharing it.

6. Duplicated Code, partial refactor. `tests/conformance/lib/live.sh` extracts the claude code credential copy into `scratch_home_claude()` (new file `tests/conformance/lib/scratch-home.sh`), but the codex and opencode branches right below it keep the same three line shape inline (check the source file exists or gap, then `install -m 600`). The refactor fixed one of three near identical blocks and left the other two as they were.

## Not flagged

Dash usage, stock vocabulary, parenthesis balance, path and tool naming, interpreter lines, and manifest and generated file checks are all gated by `scripts/check-all` and pass at HEAD, so they are skipped here per the review brief.
