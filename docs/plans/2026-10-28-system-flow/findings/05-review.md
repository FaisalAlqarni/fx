### Spec Compliance
- ✅ Spec compliant. Unfit figures become problems before any write or stamp (sf-build.ts, laid.unfit returns before writeGenerated and stampVerified). elkjs loads from references/vendor by path; no package.json change.
- ⚠️ Cannot verify from diff: K33_CAP = 2 and the parser-stages line were measured on the scratch copy of system-flow (report only); the fixture line is the original system-flow line, not fx output, and K33_CAP has a measured-line comment. Not re-measured here.
### Strengths
- Constants come from system-flow's own run, not from fx output. Mutation checks for the drop loop and the degree guard. Real RED.
### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
None.
#### Minor (Nice to Have)
- Figure-spec tests call layoutAll directly instead of the CLI seam (no figure output exists yet); acceptable until a later task emits specs.
- Label fallback placer (placeLabels0) not ported; unlabelled may exceed system-flow on crowded figures.
- Task 04's build test assertion changed to the three figure keys: correct and necessary, since layout is no longer empty.
### Assessment
**Task quality:** Approved
**Reasoning:** The caps fail the build before stamping, parity numbers are system-flow's own, and elkjs stays vendored. The task 04 assertion edit is the minimal needed change.

## Ledger lines
Task 05: minor (deferred): figure-spec tests call layoutAll directly, not through the CLI seam, until a later task emits specs.
Task 05: minor (deferred): label fallback placer not ported, so unlabelled may exceed system-flow on crowded figures.
Task 05: minor (deferred): task 04 build test assertion edited to the three figure keys, outside this task's file list.
