# One design checkpoint

## Context

The architectural path asked the owner for approval several times: the confidence check, then approaches, then each design section in chat, then the written document. The owner wanted one review of the whole design as a file. The skill also told agents to create a task-tool item per checklist step, and the user-story list asked for an "extremely extensive" list. fx-plan restated the requirements after every approved design, including after a compaction.

## Decision

The architectural path is eight steps. Step 4 sends one message with the confidence statement and the 2 to 3 approaches, then stops for an explicit go. After the go, brainstorm writes design.md section by section in the file, self-reviews it, and asks the owner for one review of the file, seams included. On approval it writes `**Approved:** YYYY-MM-DD` under the Status line. Only brainstorm writes that line, and only on the owner's approval.

fx-plan section 1 skips the restate when design.md carries that line and says so in one line; otherwise it restates and waits. The line lives in the file, so it survives compaction.

The checklist no longer tells agents to create a task per item. The user-story list asks for completeness for the feature's behaviour. The red-flag row forbidding approaches in the confidence message is removed. The spike and bounded paths are unchanged.

## Consequences

The owner answers the interview rounds, one message, and one file review. Supersedes ADR 0033 for the checklist order, the approaches rule and the red-flag row. `tests/gates/brainstorm-confidence.test.js` pins the new step list, the template line and the fx-plan rule.
