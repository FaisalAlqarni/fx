### Spec Compliance

- ✅ Spec compliant. INSTALL.md (ebd9491) states what the report measured and no more.
- ⚠️ Cannot verify from diff: the free-row counts (1.18.25 6/0, 2.0.18 5/1) and the install-test pass exist only in the report and ledger line; no log path is cited. I did not re-run the 70s-per-row free rows. Controller: task 11's check-all with 1.18.25 first on PATH re-covers the 1.18.25 free rows.
- Ran: `scripts/check-prose` on `git show ebd9491:INSTALL.md` in scratch: OK, rc 0. Not run: ci-pins, tests/install (no new code; report states they ran).

### Strengths

- INSTALL.md:5-10 names 1.18.25 only as the measured version and adds a sentence; 2.0.18 is not added to the list, matching AC3 (no live run happened).
- INSTALL.md:399 records the row 09 failure with row number and exact error string, "5 pass, 1 fail, 0 GAP", live rows "pending" with the cause (server down, `curl` 000, matches ledger line "curl 000, timeout" at dispatch).
- The 2.0.18 sentence is honest that it passes five of six, not "passes the free rows" as the task's template would have said.
- Report flags that row 09 does run the binary (contradicts the task's premise).

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- INSTALL.md:398: "Last live run: task 21, 2026-09-22, 18 pass" is now attributed to the 1.18.25 row. The pre-existing row did not name a version; state.md:1180 names opencode 1.18.25 for that build, so it holds, but the old log path was dropped.
- INSTALL.md:402-405 (paragraph under the table) still says "The opencode final-tree run waits for free memory", unchanged and now adjacent to rows that say "Last live run ... 18 pass"; a reader gets two stories.
- INSTALL.md:442-447 (Nightly checks): says a red `@latest` job means a new release broke plugin loading, but does not say the opencode `@latest` job is currently expected red on row 09 (2.0.18). Out of task 10's listed file edit scope but the claim is now incomplete.
- Free-row counts carry no log path (task's template had `<LOGS>/matrix.out`; free runs wrote none). Counts are unauditable later.

### Assessment

**Task quality:** Approved
**Reasoning:** Every claim in the INSTALL.md hunks matches the report and ledger: 2.0.18 row 09 failure named with its error, live rows pending with reason, line 5 not over-claimed. Remaining items are doc-consistency nits.

## Ledger lines
Task 10: minor (deferred): INSTALL.md:398 attributes task 21's live run to 1.18.25 by inference from state.md:1180 and drops its log path.
Task 10: minor (deferred): INSTALL.md paragraph under the verified table still says the opencode final-tree run "waits for free memory", beside rows now saying last live run 18 pass.
Task 10: minor (deferred): Nightly checks section does not note the opencode @latest job is expected red on row 09 with 2.0.18.
Task 10: minor (deferred): free-row counts for both versions cite no log path, so they cannot be re-audited.
