Controller re-review, task 13 fix round 1 (7d70dbd..8924541, 18 production lines; every open item came from the task reviewer, none from a lens; no Critical; no test assertion removed).

### Finding verdicts

- I1 (ADR 0047 contradicted its calibration): ADDRESSED. docs/adr/0047-the-judge-is-optional-and-fails-open.md:42 now says the user's request did not soften the matched commands and an unrelated prompt softened two; :59 adds the Consequences bullet that a user prompt shifts answers whatever it says and that on Codex such a flip runs the command.
- I2 (long Codex exec_command never verifies): ADDRESSED as a documented limit. references/harnesses/codex.md states the yield-window behaviour, that the exit arrives through write_stdin, that fx classifies write_stdin as other, that this rests on reading and not a recording, and ties it to the owner item.
- Minor 1 (exit match scanned the whole response): ADDRESSED. src/lib/tool-events.ts matches only the header before the Output line; the report shows RED (actual ok, expected unknown) then GREEN.
- Minor 2 (ADR 0047:11 apply_patch wording): ADDRESSED in the same paragraph.
- Minor 3 (story 10 note): ADDRESSED, a dated amended-by-ruling note under story 10.

### New breakage in the fix diff

None found. The header split on a line that is exactly Output: leaves the old behaviour for responses without that line.

## Ledger lines
Task 13: fix round 1/5: controller re-review (18 lines): 5 addressed, 0 open
