### Spec Compliance

- ✅ Spec compliant on the Resolved column, the 2-of-2 rule and unchanged assertions. No non-PASS row lacks a ruling; no expected-gaps entry needed (nothing unclosable).
- ⚠️ Cannot verify from diff: (a) whether a user's global `permissions` `subagent` rule outranks the plugin's per-agent allow on general (probe Q7: global rules are not copied into agent rule lists); (b) the Not-run rest of scripts/check-all is task 15's.

### Strengths
- Every prefix/export/question fix has a runtime RED then GREEN.
- Rows 06 to 08 on v2: assertion string `[fx] branch -D force-deletes a branch` is untouched and only the plugin emits it (06-e, 06-ds2, 07-d logs hold it; 07-d/08-d logs hold 0 "Blocked by configuration"). So `git -C . branch -D` still proves fx's guard refused with fx's reason. Heredoc/quote evasion of row 08 still exercised (only command 3's last line changed).
- Logs spot-checked in scratchpad logs13: 17 run.txt files (02-a/ds3/ds4, 04-a/ds3, 06-e/ds2, 07-d/e, 08-d/e, 15-ds1/ds2, 17-ds1/ds2, 18-ds2/ds3) all say PASS with the model the baseline claims; 15-ds1 log carries NESTED-OK. Claims match. Live rows not re-run.
- Row 18 control changed from build to general with same assertions (lens file absent, control file present, lens dispatched).

### Issues

#### Critical
none

#### Important
- plugins/fx-opencode-v2.js:204-209 · general grant is unconditional: it strips every `subagent` rule on general and pushes allow. ADR-0026 (docs/adr/0026-*) requires the grant only when the user set neither a `subagent` rule nor a `*` rule, and names the unconditional write as the exact regression to block ("written once and caught in review"). The report comment says "mirrors the 1.x grant" but v1 (plugins/fx-opencode-v1.js:172-175) has the two-part guard and this does not. Only a user-defined general entry is protected, and only by apply order (probe Q11), not by a check; a user rule already on the agent, or a `*` rule, is overwritten. The only test (opencode-v2-plugin.test.js, new asserts) covers the built-in deny, not a user rule. Fix: skip when `a.permissions` has a `subagent` rule that is not the built-in `* deny` is hard to tell apart, so at minimum skip when a rule with action `subagent` or `*` exists that is not exactly `{subagent,*,deny}`; add a test with a user `subagent * ask` and with a user `* * ask` rule that must survive. Else supersede ADR-0026 for v2 in ADR-0037 and say a user deny on built-in general is overridden.
- Scope of widening (checked): only the `subagent` action on general changes (test asserts edit still allow, lens still not allowed). Bounded by experimental.subagent_depth 2 on the installer route; on plugin-only route the default depth 1 makes the grant inert. explore stays read-only. No other agent touched.

#### Minor
- tests/conformance/lib/openrouter.js:70: the `question` deny is only on the OpenRouter path. The llamacpp (default) path for opencode-v2 has no deny, so a default-provider headless v2 run can still end "Session interrupted: shutdown" on rows 04, 15, 17. Stated in the report; row 04/15/17 on llamacpp unproven. Not a fx defect, but baseline Resolved text implies the runner is fixed without saying "OpenRouter only".
- tests/conformance/lib/events.js:54: `c.message` added to the shared `text()` used by all harnesses. Right for 2.0.18 `error:{type,message}`, but any object part on claude/codex with only `message` now yields text instead of ''. Unit tests green; the export shape (`state.content`, object `error`) is not recorded in probe-findings.md Q10 (Q10 says `error` is a string and output is `state.output`, which holds for `run --format json` only) nor in references/harnesses/opencode-v2.md. Add one line there.
- INSTALL.md (guard layer 2, ~line 390-396): says the policies' "message is generic" but does not say that a plain-spelling refusal shows only "Blocked by configuration policy" and never fx's reason, nor that live rows 06 to 08 use `git -C .` for that reason. references/harnesses/opencode-v2.md says it; INSTALL.md is what a user reads. Task 15 writes the table; add the sentence there. Plain spelling plugin refusal is covered only by the gate unit test, not live, on v2.
- baseline.md rows 06/07/08: "2 of 2" for 06 mixes qwen (06-e) and deepseek (06-ds2); task allows fallback only with both runs recorded, which is done. Informational.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** Row changes keep their assertions and logs back every claimed pass. The general grant violates ADR-0026's two-part check and needs the guard plus a test (or an explicit ADR supersession).

## Ledger lines

Task 13: minor (deferred): question deny is OpenRouter-only; llamacpp v2 headless runs are unprotected and baseline Resolved does not say so.
Task 13: minor (deferred): events.js text() gained `message` for all harnesses and the 2.0.18 export state shape is unrecorded in probe-findings Q10 and the v2 reference.
Task 13: minor (deferred): INSTALL.md guard layer 2 must state that plain-spelling refusals show only the generic policy text and that rows 06 to 08 use `git -C .` on v2.
Task 13: minor (deferred): row 06 2-of-2 mixes qwen and deepseek runs (recorded).
