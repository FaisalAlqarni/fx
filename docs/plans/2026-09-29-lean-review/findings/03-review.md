### Spec Compliance

- ✅ Spec compliant. All 14 listed files have hunks; every acceptance criterion maps to code or test in the diff.
- ⚠️ Cannot verify from diff: the live probe (three model ids) and the claim that `updatedInput` applies with `permissionDecision` omitted. Only the report and ADR-0031 lines 22-26 state it. Controller: confirm the commit body carries the ids, or re-run step 7 once. Design §5a says `permissionDecision: "allow"`; task and ADR consciously deviate (omit), recorded at ADR-0031 "Probe result".

### Strengths

- `lib/dispatch-route.js:15-22`: pure, non-mutating (`{...ti}`), fork/no-type, `fx:` and non-general types handled exactly per the Risks list.
- Hook branch `hooks/fx-pretooluse.js:~92-101` wraps route in try, exits 0, writes JSON only on rewrite; load failure falls back to `() => null`. Matcher in `hooks/hooks.json:30` is `*`, so Agent and Task both reach it.
- Test covers route() matrix, process-level hook for Agent and Task, and fail-open against throwing and non-loading module copies (valid runtime RED reported: module missing).
- Ran: `dispatch-route.test.js` OK, `return-contract`, `no-runtime-addressing`, `fix-loop-shape` OK, `scripts/check-prose` on 7 edited md files OK. No ledger `Ruling:` line names task 03 beyond the overlap-table rows (SKILL sections, fix-loop, placeholders, ADR stub), all satisfied.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- skills/fx-review/reviewer-prompt.md (model: placeholder, lines ~11-14): `]` now closes after `...standard tier.` and the sentence "The final whole-branch review is one of the named most-capable cases." sits outside the bracket as a stray, less-indented line inside the template. Move it inside the brackets, before `]`.
- lib/dispatch-route.js:19: only `model === 'opus'` is checked. The Agent tool's model enum also has `fable`; an explicit `fable` (or a full model id) on a general dispatch bypasses the reason-line rule. Fine if fable is out of scope; say so in ADR-0031 or extend the check.
- references/harnesses/claude-code.md (added paragraph): says "every `Agent` call" but the hook also routes `Task`; and the paragraph has a short orphan line break ("alone. It never refuses a call. Codex and opencode / have no equivalent yet"). Cosmetic.

### Assessment

**Task quality:** Approved
**Reasoning:** Routing logic, fail-open wiring and tests match the task's Risks and criteria exactly; gates I ran pass. Only template-formatting and edge-case polish remain.

## Ledger lines

Task 03: minor (deferred): fx-review/reviewer-prompt.md model placeholder leaves the "final whole-branch review" sentence outside the closing bracket.
Task 03: minor (deferred): route() checks only model === 'opus'; an explicit fable or full model id bypasses the reason-line rule, unstated in ADR-0031.
Task 03: minor (deferred): claude-code.md routing paragraph says Agent only (hook also routes Task) and has an awkward line break.
