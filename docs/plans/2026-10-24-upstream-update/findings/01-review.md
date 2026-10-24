### Spec Compliance

- ✅ Spec compliant. Matches level 2 to 6 (compile-brief.ts section: `level(l) >= 2`), ends at next heading of same or higher level (`n > 0 && n <= lv`), returns null when absent so the exit 2 message path is unchanged. All five version fields are bumped (marketplace.json, both plugin.json, package.json, package-lock.json x2). The three named tests are present in .ts and the built .test.js; the generated compile-brief and test.js are in the diff.
- ⚠️ Cannot verify from diff: acceptance criterion 1 (real design.md compile of 02-size-gate.md) and the release-version/codex-manifest gates. I did not re-run them; the report states they passed. Elided diff context hid the unchanged test lines, so "existing assertions unchanged" rests on the diff showing only additions to the tests.

### Strengths

- Minimal change to one function; the single-source `level` helper serves both start and end detection.
- Callers checked: section() is called at compile-brief.ts:63 (Global Constraints), :80 (Design) and :93 (Stack). All pass `##` level headings today; a `##` section still ends at the next `#` or `##`, so behaviour is unchanged for them. Parent entries keep `###` children, as before.
- Tests assert external behaviour (brief text, exit code, exact stderr) and include the parent-keeps-children case and the not-found case.
- Report's RED is a valid runtime RED (build, run, fails with the missing-subsection message). No em or en dashes in the changed sources.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- compile-brief.ts:38-42 · `#`-prefixed lines inside fenced code blocks (for example a shell comment `# x` in a design excerpt) end any section, and now also end `###` subsections; nothing tracks fences. Pre-existing for `##` sections, not a regression. Fix by skipping fenced lines if a design ever needs it.

### Assessment

**Task quality:** Approved
**Reasoning:** The change is small, correct for all three callers, and tested through the built binary against the stated cases. Version bump is complete.

## Ledger lines

Task 01: minor (deferred): section() does not skip fenced code, so a `# ` line inside a fence ends the excerpt early
