### Spec Compliance

- ✅ Spec compliant. All eleven questions have a section, evidence and a `Verdict: <proven|disproven>: <sentence>` line (probe-findings.md, 10 proven, Q11 disproven). Only file in range is probe-findings.md. `sk-or-` count in the diff and the committed file: 0. No production code.
- ⚠️ Cannot verify from diff: "scratch directories removed" (acceptance 3). Controller: `ls /tmp` for leftover `tmp.*` probe dirs.
- Ruling check: ledger `Ruling:` lines naming task 01 are the key-file path (sk-or- scan: clean) and the Q11 limit (findings state it: Changes 5, Q11 verdict). No violation.
- Source cross-checks (oc2/oc): depth-limit message at `core/src/tool/plugin/subagent.ts:132` matches Q9 quote; "Blocked by configuration policy" at `core/src/config/plugin/policy.ts:26` matches Q5; `subagent_depth` in `unsupportedTopLevel` at `core/src/config/normalize.ts:~46` matches Q9; `autoinvoke` in `schema/src/skill.ts:31` matches Q7 note.

### Strengths

- Verdicts quote raw logs (Q3 ids, `pre-effect=allow`, EXEC-AFTER status) so each yes/no is checkable.
- Q4 and Q3 record the `execute.after` asymmetry (fires on deny, not on throw): a real trap for task 05's map, stated with the fix rule.
- Q9 admits first attempt was invalid (general/explore deny `subagent`) and reran with a valid agent.
- Q11 disproof rests on two independent views (transform list lacks `probe-user`; model sees `fx-audit` for it, 19 vs 18 skills, arithmetic consistent with 17 fx + 2 built-ins).
- "Changes for later tasks" section puts surprises up front; Q7 verdict correctly refuses to let `skill.list` prove hiding.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- probe-findings.md Q3 bullet 1: "When the model issues parallel calls (question 4) every `before` still runs before any `evaluate`." Q4 evidence shows only sequential asks ("then `echo after-throw`") and no ordering excerpt for parallel calls. Uncited claim that task 05's layer 1 leans on. Cite the log lines or soften to "not measured under parallel calls".
- probe-findings.md Q3 bullet 3: "`resources` is only split on pipes and `;`-style separators" generalises from one pipeline and one heredoc. `&&`, `||`, `$(...)`, `&` not probed. Task 05 gate cases must not assume it; reword as "observed for `|` and heredoc".
- probe-findings.md Q11 verdict / Changes 5: Q7 showed a global `permissions` skill-deny rule hides `fx-audit` from the model with no per-agent copy, so it likely also covers config-defined agents. Q11 ran without the global rule, so the gap is untested against it. Design forbids writing top-level `permissions` (Global Constraints), so the limit stands, but say "not tested with a global rule" so task 04 and ADR-0026 do not record it as unfixable.
- probe-findings.md Q8 verdict: "A user reaches either only through the API or the TUI". TUI was not probed; only `run` and `api` were. Drop "or the TUI" or mark unverified.

## Ledger lines

Task 01: minor (deferred): Q3 "parallel calls: before precedes evaluate" claim has no cited evidence; cite or soften.
Task 01: minor (deferred): Q3 "resources split only on pipes and ;" generalises from one pipe and one heredoc sample; reword as observed.
Task 01: minor (deferred): Q11 gap not tested with a global permissions skill-deny rule (Q7 suggests it would hide for config agents); state untested.
Task 01: minor (deferred): Q8 verdict claims TUI reach; TUI not probed.

### Assessment

**Task quality:** Approved
**Reasoning:** Each verdict follows from quoted evidence, source cross-checks hold, no key leak. Four overreaches are wording-level Minor, none changes a verdict.
