### Spec Compliance
- Spec compliant. Read each G1 to G4 hunk against the brief; all present.
- Cannot verify from diff: test_scope stopped at shell-guard-codex (task 03's, out of scope). Release-version gate known failing until the bump.

### Strengths
- G1 input is only split into strings and passed as `named` to setupCatalog (lib/codex-catalog.js:121,125). Slugs are used as Map keys and JSON values (lines 53-68), never in a path, shell string or exec argument (execFileSync at line 92 has fixed args). The profile filename comes from the provider, not slugs. The env read sits after the root vetting. It carries slugs and nothing else.
- leftProfiles requires isRegular(f) === true (lstat, so symlinks are false) and ownsProfile (first line equals PROFILE_MARKER) before listing; sorted; ENOENT returns []; other errors rethrow. Only the skipped branch sets left.
- Tests: user-written unmarked fx-x.config.toml excluded, file unchanged, empty case. Root check runs the real command with a stub codex. G3 regexes are anchored to section 6 text.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
- src/lib/codex-catalog.test.ts:324 · no test for a symlinked fx-*.config.toml carrying the marker being excluded from left; the symlink exclusion is only covered through isRegular. Add one case.

### Assessment
**Task quality:** Approved
**Reasoning:** Matches the brief file by file; the new env input only supplies slugs, and the stale listing is gated by regular-file plus marker checks.

## Ledger lines
Task 07: minor (deferred): no test that a marker-carrying symlink fx-*.config.toml is excluded from left
