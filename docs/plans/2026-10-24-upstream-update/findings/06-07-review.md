## Task 06 and 07 review (one batch)

### Spec Compliance

- ✅ Task 06 spec compliant: server.cts:251 uses a replacer function; server.cjs regenerated with the same change; test and built test JS both carry the new case.
- ✅ Task 07 spec compliant: waiting page opens with "Which one", pseudocode has timeout and description, no emoji, no dashes; .ts file deleted; SURFACE.md:236 updated; good-tests.md red-flag line and polling clause match the brief.
- ⚠️ Cannot verify from diff: I did not re-run the gates. The report claims check-reference-leaves, check-paths, check-prose, check-generated and test-scope passed; I checked by grep that good-tests.md is 8998 bytes (under the 9,000 gate) and that no file other than skills/fx-debug/COVERAGE.md names the deleted example (lines 60 and 137 area, owned by task 08).

### Strengths

- Task 06 has a valid runtime RED (the old string replacement expanded the sequences, assertion failed on the served body) and the test exercises the real server over HTTP, using the exact content string from the brief and asserting the frame header once.
- Test bumps mtime so the new screen is the newest; avoids a race with earlier screens.
- Task 07 kept both references as leaves (waiting page says "the testing reference", not a file name) and the rule is the same in both pages: inject at your own seam, wait on a condition only from outside.
- The implementer caught and fixed the 9,000 byte gate breach without dropping a rule.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- src/skills/fx-brainstorm/scripts/server.cts:402 · `html.replace('</body>', helperInjection + '\n</body>')` is the same string-replacement class as the fixed bug. helper.js has no `$&`, `$'` or `` $` `` today (checked by grep), so no live defect, but an edit to helper.js adding one would corrupt every page. Use a replacer function here too.
- references/vocab/good-tests.md (whole file) · 8998 of 9000 bytes; the next edit trips the leaf-size gate. The batch report and a standing ruling already cover this; noted so the next task there moves a section first.
- references/vocab/good-tests.md "What a good test looks like" · the trimmed line dropped "describe what, not how", and the removed `receive(:process)` example was the concrete illustration of the internal-collaborator rule the new red-flag clause now leans on. Rule is still stated elsewhere in the file; wording loss only.

### Assessment

**Task quality:** Approved
**Reasoning:** Both fixes are minimal, match their briefs file by file, and 06 has a real RED/GREEN over HTTP. Only a latent sibling replace call and byte-budget tightness are worth noting.

## Ledger lines

Task 06: minor (deferred): server.cts:402 uses string replace for the helper injection, the same class as the fixed bug; use a replacer function.
Task 07: minor (deferred): good-tests.md sits at 8998 of 9000 bytes; the next edit must move a whole section out first.
Task 07: minor (deferred): good-tests.md trim dropped "describe what, not how" and the receive(:process) example that illustrated the internal-collaborator rule.
