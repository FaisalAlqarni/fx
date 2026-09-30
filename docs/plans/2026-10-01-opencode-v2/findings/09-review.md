## Spec Compliance

- ❌ Issues found: two docs claims about the v2 guard contradict plugins/fx-opencode-v2.js at d878184 (Important 1 and 2 below). All acceptance items are otherwise present: INSTALL.md v2 section (install with --major, verify, layers, call-id lookup, fail-closed cases, policy list with tight patterns and allowed samples, lane hiding and routes, cannot-observe list, Claude Code row corrected); ADR-0036/0037/0038 cover the required content; README and SURFACE list four harnesses and both plugin files.
- ⚠️ Cannot verify from diff: (a) ADR-0038 and README/tests README state "no output before the timeout" is a provider error; task 08's open lens Critical (findings/08-lens-silent-failure.md) says a no-output timeout is always classed a provider error and a fix round is pending. Re-check the ADR sentence after that fix. (b) The global constraint "total_credits > 0 via GET /api/v1/credits before any live run" is not implemented anywhere (grep for api/v1/credits and total_credits in tests, scripts, lib: no hit). ADR-0038 only says credits are needed, so it claims nothing false; the check belongs to task 08/10.

## Strengths

- Layer 1 description (INSTALL.md "What the guard catches", ADR-0037) matches the code: key is session+message+call id (plugins/fx-opencode-v2.js:41-45), guard runs on full text then on each ev.resources piece (:118-127), every error path denies (:107-130), evaluate-registration failure makes execute.before throw for every shell call (:174), both failing is stated in the preamble (:222).
- Installer description matches scripts/fx-opencode-install: 10 s timeout, only 1 or 2, error names --major (:353-366); ownership record (:410-429); shape errors fire in plan_opencode_json in the checks phase (:566), so ADR-0036 "before any write" holds; stale generated commands removed on 2.x (:368-382); never a top-level permissions key.
- Stated limits all present: echo|sh gap (pre-existing, every runtime), zero-command shell calls, push-option free text, Q11 user-defined agent, SKILL.md direct read, unfiltered skill.list, session permissions, port 49374 two-minute wait, first-call empty answer, </dev/null, run has no command flag, same-name command precedence unprobed, file:// entry refused.
- ADR-0038 facts trace to lib/openrouter.js (models, fallback), live.sh (error-event-only matching, sk-or- scan in keep_log, no credential copy), report 08 (credcheck on all four). Claude Code row correction matches the task (16 pass, 2026-09-22; 13 and 14 closed in 78ff5b3, 2026-09-23).
- Gates: check-paths OK, no-runtime-addressing OK, check-prose reports only AGENTS.md dashes (pre-existing, ignored per instruction); none in the edited files.
- Did not run the install steps: they need a real install and the v2 section's commands are the installer already exercised in tasks 06 and 07. Read, not ran.

## Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. docs/adr/0037-the-opencode-v2-guard-in-layers.md, "Layer 3": says the throwing execute.before "has the same predicate and no call-id lookup". The code does not run the predicate there: when evaluate failed to register, execute.before throws for every shell call with no inspection (plugins/fx-opencode-v2.js:174), and does nothing otherwise. INSTALL.md says the right thing ("throws for every shell call"). A reader would believe layer 3 still blocks only forbidden commands. Fix: "Layer 3 refuses every shell call; it carries no predicate." The zero-command bullet ("Layer 3 does not see it if layer 1 registered") should say layer 3 is inactive whenever layer 1 registered.
2. docs/adr/0037 "Limits" last bullet: "denies `external_directory` under fx's references". Inverse of the code: for a read-only agent, external_directory is allowed only when every resource is under fx's references dir (or its realpath) and denied otherwise (plugins/fx-opencode-v2.js:103-108). INSTALL.md "the evaluate hook allows them only read, grep, glob and list" (and the same in ADR) omits that exception. Fix: "allows read, grep, glob, list, and external_directory only under fx's references; denies everything else".

#### Minor (Nice to Have)

1. INSTALL.md:347 and :365: the v2 section names only the source file `plugins/fx-opencode-v2.js`; the installed link is `plugins/fx.js` (scripts/fx-opencode-install:541, tests/conformance/lib/opencode-v2.sh:40). The manual route says "link ... into plugins/" without the link name. State `plugins/fx.js`.
2. INSTALL.md "What the guard does not catch" (zero-command) and ADR-0037: stated as fact but only read from v2 source by the task 05 lens (findings/05-lens-security.md:16, tool/plugin/shell.ts:134), never run; the ledger calls it unprobed. Same for "session-level permissions cannot widen read-only agents" (permission.ts:162 read, gate is a stub). Word as "read from the 2.0.18 source".
3. INSTALL.md What is verified, opencode 2.0.18 row still says 5 pass, 1 fail (row 09); the ledger records 6 pass, 0 fail after task 07. Stale; task 15 owns the table, but the row now contradicts the new section.
4. README.md:237-238: "on opencode by a deny in permission.skill plus a generated command" is the 1.x mechanism; on 2.x it is per-agent skill deny rules plus plugin-registered commands. Add "(1.x)" or a 2.x clause.

## Assessment

**Task quality:** Needs fixes
**Reasoning:** Coverage, installer description, limits and ADR-0038 are accurate, but ADR-0037 misdescribes layer 3 and the read-only external_directory rule against the shipped plugin; both are one-line edits.

## Ledger lines

Task 09: minor (deferred): INSTALL.md v2 section never names the installed link plugins/fx.js; manual route gives no link name.
Task 09: minor (deferred): zero-command and session-permission limits are source-read, not probed; word them so.
Task 09: minor (deferred): What is verified opencode 2.0.18 row stale (5 pass 1 fail vs 6 pass 0 fail after task 07); task 15.
Task 09: minor (deferred): README.md:237 hiding mechanism sentence is 1.x only; add the 2.x mechanism.
