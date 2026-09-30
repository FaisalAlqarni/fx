### Spec Compliance

- ✅ Spec compliant. Files match the task list (lib/preamble.js, lib/preamble.test.js, ADR-0032). Default text matches design §5c verbatim with fx-humanize rendered via `addressing.lane` (lib/preamble.js:70-73). Placement after repo.md, before plans, sessions and subagents alike (lib/preamble.js:92-93). Override semantics (string replaces, "" off, missing/non-string/unparseable default) at lib/preamble.js:64-69. `alone` fixture uses `{"companions": ""}` with the ADR-0032 comment (lib/preamble.test.js:84-86); worst fixture has no .fx.json. Rulings: none in state.md name task 05; nothing inherited.
- Ran: `node lib/preamble.test.js` -> "companions line: passed", "preamble.test.js: OK" (focused doubt: confirm report; output pristine). `scripts/check-prose` on ADR-0032: OK. Did not re-run consumer gates (report claims pass; diff does not touch them).
- Named risk checked: JSON `null`/array/number in .fx.json. `null` makes the destructure throw, caught by the try, default returned. Never throws.

### Strengths

- Smallest possible diff: one 10-line function, reuses `fs`, `path`, `addressing.lane`; no new file or dependency.
- Test covers all 3 harnesses x session/subagent, all four override cases, and valid runtime RED.
- ADR records default text, override, outside-bootstrap reason, opencode render-once note.

### Issues

#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
- SURFACE.md:196-273 · documents `.fx.json` keys (stacks, test commands) but not `companions`; a repo owner cannot discover the override outside the ADR. Add one row.

### Assessment

**Task quality:** Approved
**Reasoning:** Matches §5c and every acceptance criterion; never-throw reading verified including `null` JSON; tests real and green.

## Ledger lines

Task 05: minor (deferred): SURFACE.md does not document the new `companions` .fx.json key.
