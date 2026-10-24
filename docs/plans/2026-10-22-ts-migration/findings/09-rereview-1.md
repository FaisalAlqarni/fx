Controller re-review, task 09 fix round 1 (004b469..0b50f3d; 004b469 is task 10's gate commit, not part of this fix). Production change: two comment lines; the rest is a new test.

### Finding verdicts
- Important, nothing committed pins malformed-input behaviour: ADDRESSED. src/tests/conformance/tooling-malformed.test.ts runs the built scripts on 30 malformed inputs and asserts exit code and stdout recorded from the 779fa33 scripts; ran `node tests/conformance/tooling-malformed.test.js`: ok (30 cases), exit 0. Implementer reports RED by altering one recorded status.

### New breakage
None.

## Ledger lines
Task 09: fix round 1/5 (1 addressed, 0 open; commits 004b469..0b50f3d)
