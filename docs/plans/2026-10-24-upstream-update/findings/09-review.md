### Spec Compliance

- ✅ Spec compliant. Read the diff only (context lines elided in places; no changed file read separately). Ran nothing.
- ⚠️ Cannot verify from diff: GREEN/RED claims and the check-generated and test-scope runs are taken from the report; the diff shows the built lib/*.js matches the src changes (glossary, fx-json, preamble, preamble.test, glossary.test). lib/types.js unchanged is correct for a type-only edit.

Checks made:
- src/lib/glossary.ts:8-10 order is GLOSSARY-MAP, GLOSSARY, CONTEXT-MAP, CONTEXT; legacy = startsWith('CONTEXT'). Reads only (existsSync, readFileSync); no write path.
- src/lib/glossary.ts:21-26 notice text equals the brief string exactly (concatenation checked piece by piece); null for none, non-legacy, declined.
- src/lib/fx-json.ts: glossary_rename accepts only "declined"; other values dropped with the exact problem object. types.ts adds the field.
- src/lib/preamble.ts: notice sits inside the `!subagent` block after the plans block, in its own try; repoRoot has a 2s git timeout and falls back to cwd; nothing can throw out of render.
- Callers of the changed FxJson contract: readRepoConfig (repo-config.ts:25) reads hooks/checks only, so the new optional key does not touch it.
- scripts/check-all gets `run glossary.test.js node lib/glossary.test.js` beside fx-json.test.js.
- fx's own checkout has no CONTEXT*.md or GLOSSARY*.md (ls), so the preamble budget counts do not move.

### Strengths

Small, read-only module; reuses parseFxJson and parseJson rather than re-parsing `.fx.json`; extra map-over-glossary ordering test; render test covers both session and subagent; the preamble test builds a real git repo so repoRoot is exercised.

### Issues

#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
- src/lib/preamble.test.ts glossary block: no render-level case for `"glossary_rename":"declined"` (only unit-tested in glossary.test.ts:46-49), so the wiring of the declined path through render is untested. Add one assertion.
- src/lib/glossary.test.ts: no case for a malformed `.fx.json` (invalid JSON) with CONTEXT.md, which should still yield the notice via the catch at glossary.ts:19. Add one assertion.

### Assessment

**Task quality:** Approved
**Reasoning:** Matches every listed interface, test and risk; read-only, never throws out of render, subagent excluded. Only coverage gaps remain.

## Ledger lines

Task 09: minor (deferred): no render-level test for the declined .fx.json path through render
Task 09: minor (deferred): no test for malformed .fx.json with CONTEXT.md still giving the notice
