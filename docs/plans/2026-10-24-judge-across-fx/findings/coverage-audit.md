# Coverage audit: judge across fx

Read-only audit of design.md (with its 2026-10-24 amendment notes), plan.md, tasks 01 to 13, the red-team resolutions, and every `Ruling:` line of state.md (task 14 dropped). Task 13 is judged by its task file only. Shipped values were read from `scores.md`, `src/lib/judge-features.ts` and `src/lib/judge-thresholds.ts` where a gap depends on them.

Result: 12 gaps. None is a missing working path in tasks 03 to 12; the code half of each story has an owner. The gaps are almost all on the writing half: rulings narrowed the design after the tasks were written, and task 13 (ADR 0048, README, INSTALL, its gate) does not yet carry the narrowing. Gap 3 would turn `scripts/check-all` red.

## Gaps

1. **Sizing is Claude Code only; the design and the plan still say otherwise.**
   Design: decision 4 "Only harnesses whose dispatch tool takes a model field are rewritten; the plan's first task records which do (Claude Code's Agent tool does; Codex and opencode are checked from their sources or installed binaries)", and story 6 with no harness limit. plan.md table row 06 says "on every harness whose dispatch takes a model" and Coverage row "Stories 6, 7" lists only task 06. Task 01 measured model fields on Codex 0.164.0 and opencode 2.1.4; the ruling that dropped task 14 left Codex and opencode 2.x unsized (no cheap-tier model recorded, Codex PreToolUse cannot rewrite input under ADR 0023, 2.x input rewrite unmeasured).
   Owner: task 13 (ADR 0048, README, INSTALL); design.md and plan.md need an amendment note.
   Fix: add a dated design note to decision 4 and story 6 (sizing acts on Claude Code only, with the three reasons), correct plan.md row 06, and add the same sentence and reasons to the ADR scope list, README and INSTALL.

2. **opencode 2.x gets no lane hint; no task states it where users read.**
   Design: story 17 "I want these features if the runtime waits for the judge, and a plain statement in the docs if it does not", decision 3 "Runs at the prompt boundary each harness already uses (... opencode `chat.message` and the 2.x prompt hook)". Ruling (task 05 concern 1): the 2.1.4 prompt event has no agent field, so 2.x gets no hint, "task 13's ADR 0048 lists it". Task 13's ADR list and tests never mention it, and its INSTALL line ("what runs on 2.x per task 04, 05 and 08") is checked by no assertion.
   Owner: task 13.
   Fix: add to task 13 an ADR bullet and an INSTALL sentence for 2.x (shell judge per fact 4, edit rules per 08, no lane hint, no sizing, no notice) and assert one fixed sentence in the `judge-adr` gate; amend design decision 3.

3. **Task 13's gate contradicts ruling C2 and would fail.**
   Task 13: "each row's gate equals `FEATURE_GATE[feature]`". `scores.md` prints the edit-rules aggregate row as `log-only` while `FEATURE_GATE['edit-rules']` is `enabled` (ruling C2: per-rule rows alone decide; two rules refuse). The copied row and the constant differ by design.
   Owner: task 13 (gate test and ADR table).
   Fix: change the gate to compare the `edit-rules` row against the per-rule rows (enabled iff some `| rule <id> |` row ends `refuses |`), and have the ADR note that the aggregate row reads log-only while the feature is enabled.

4. **Decision 1 and the Global Constraint were narrowed by C2 and C3; design text is stale.**
   Design: decision 1 "A feature ships enabled only if its question clears its bar; one that fails stays in code, logs what it would have done, and does nothing else", Global Constraints "A feature whose question has not cleared its bar logs only and acts on nothing." Shipped: edit-rules is enabled with an aggregate precision 97% against a 22% unsure-on-clean (ceiling 10%), because two rules cleared their own rows; built-ins act at any gate; `review-authored` (83% against 85%) is log-only, so story 14's judge half does nothing today and only lock files and marked files are dropped (code).
   Owner: task 13 (ADR) plus a design note.
   Fix: amend decision 1 and the constraint to "per rule for edit rules; built-ins act at any gate", and have the ADR say in one paragraph which parts of story 14 and story 10 act now.

5. **Refusal is keyed on rule id plus exact text (and glob); the design and ADR sentence say only "measured".**
   Design: decision 5 note "A confident breach refuses only for a rule measured on its own labelled set (decision 1)". Ruling (task 07 I2): "refusal power is keyed on the rule id plus the exact measured rule text from the catalogue; a repository rule that reuses a refusing id with other text or another glob only advises". Task 13's required ADR sentence is `... only for a rule measured on its own labelled items.` with nothing about text or glob.
   Owner: task 13 (ADR), task 09 (already pins catalogue to `MEASURED_RULES`).
   Fix: add a second ADR sentence (id, exact text and glob must match the measured entry; editing a catalogue sentence drops its refusal until re-measured) and the same warning to the README catalogue list (gap 6).

6. **The README catalogue list promised by ruling 236 is in no task.**
   Ruling: "task 13 adds the edit-rule catalogue list (id, rule text, glob, refuses or advises) to the README"; task 09's fx-setup text says "the README lists them" (ruling C13). Task 13's file list and tests touch only "### Hooks and the optional judge" and one `judge-review` sentence.
   Owner: task 13.
   Fix: add a README section generated from `RULE_CATALOGUE` and `REFUSING_RULES`, and a `judge-adr` gate assertion that every catalogue id appears once with the matching refuses or advises word.

7. **The accepted `.fx.json` gap is stated too thinly.**
   Design: decision 6 note "The health line and the Stop check print a one-line notice ..., and the new ADR records this as an accepted gap." Ruling (task 07 security 1): the agent can set `hooks.edit_rules` false, which also turns off the built-ins including no-secrets, and "task 13's ADR names this case explicitly". Task 13's verbatim sentence is generic. Also unstated: opencode 2.x shows no notice (GAP in its reference), opencode 1.x keeps its baseline in plugin memory so a reload re-baselines (ruling task 08 concern 1), and a notice appears only at the next Stop or resume.
   Owner: task 13.
   Fix: keep the verbatim sentence and add a second ADR paragraph naming the three cases (edit_rules false disables built-ins, 2.x no notice, 1.x baseline resets on reload), asserted by one substring.

8. **Failure-logging and skip rules created by rulings have no design text or ADR line.**
   Design: decision 10 "Every new decision appends one decision-log line"; decision 2 and Global Constraints say only "fails open"; Global Constraints "no judge means no network call". Rulings added: a lane-hint crash logs `judge-error` (task 03 lens 1); an unusable `judge.json` logs `judge-config` once per prompt, no `judge.json` logs nothing (lens 2); no session id means no judge call and a `no-session` line, so harnesses that omit session ids get no hint (lens 4, task 05 lens 1); opencode 2.x logs `judge-off` once per construction (task 04 lens 1); guard-error entries carry the error class (lens 2); sizing logs `judge-error` before any fallback (task 06); edit-rule failures log `judge-error`, an asked pair that throws is counted unchecked while other pairs still decide (task 07); a failed decision-log write is stderr-only. The acceptance criteria of tasks 03, 05, 06, 07 and 08 carry none of it, so the rulings are the only owner.
   Owner: task 13 (ADR, and INSTALL "Judge (optional)" troubleshooting), plus a design note on decision 10.
   Fix: add one ADR table of decision-log `source` values (`judge`, `judge-error`, `judge-config`, `no-session`, `judge-off`, `judge-down`) with when each is written, and a gate assertion that the ADR names each value the code can write.

9. **The labelled sets were written by the build agent; the ADR is not told to say so.**
   Design: decision 1 "scored on the owner's local judge", story 19. Ruling (task 02 concerns 2 and 3): "task 13's ADR states that the sets were written by the build agent, so their scores may overstate real use". Task 13's ADR contents list has no such item.
   Owner: task 13.
   Fix: add the sentence to the ADR next to the judge line and assert it in the gate; also record the owner's option to re-label.

10. **File-scope text cap: plan says 4,000, shipped value is 2,000.**
    Design: decision 5 note "a rule marked `scope: "file"` also receives the whole post-edit file, capped". plan.md ("Judged rules read the added lines ... capped at 4,000 characters"), the red-team resolution 1 and task 07's Risks say 4,000. Ruling (task 07 concern 2): requests send at most the 2,000 characters task 02 measured with; `EDIT_FILE_CHARS` is 2000 in `judge-thresholds.ts` while plan.md's constants row still lists 4000.
    Owner: task 13 (ADR, README), plan.md correction.
    Fix: state in the ADR that the file-scope cap is 2,000 until a re-measurement raises it, and fix the two plan.md mentions; add the number to the `judge-adr` gate via `EDIT_FILE_CHARS`.

11. **Story 1's amended promise (built-ins "add no measurable time") and the crash behaviour of built-ins have no criterion.**
    Design: story 1 note "the three built-in edit rules ... run with no judge; they send nothing and add no measurable time". Task 07's criteria test zero requests but nothing times the no-judge path. Ruling (task 07 security 3): "a throw inside the built-ins still allows the edit and logs judge-error ... failing closed on a crash is not in the design", so a crash in the redactor lets a secret through, logged only.
    Owner: task 07 (a timing assertion) or, if the owner declines, task 13 (state the crash behaviour).
    Fix: add one process test that a no-judge Markdown edit finishes inside a small bound, and put the fail-open-on-crash sentence in the ADR next to the accepted gap.

12. **Two review items are ledger-only with no task and no document.**
    Rulings: the fx-codex async stdin handler turning a synchronous throw into an unhandled rejection (so deny-on-crash holds only under Node's default) is "carried to the final branch review as a must-triage item"; the dotenv and key-file skip list exists twice (task 07 and task 11) "the final review triages merging them into one helper". Neither is in a task or in ADR 0048.
    Owner: the final branch review (not a numbered task).
    Fix: add both to the plan's exit-gate checklist, and one line each to the ADR (the rejection caveat for Codex users with `--unhandled-rejections=warn`; the skip lists, merged or not).

## Checked and cleared

- Stories 3, 4, 5, 18: task 03 (Claude Code, Codex incl. Codex fact 5 MEASURED, subagent skip via `agent_id`), 05 (opencode 1.x primary-agent check), switches in 03; the 1.x slash-command GAP is in task 05 and the reference, and only needs an ADR mention (covered in gap 2's ADR bullet).
- Stories 7, 8, 9, 10, 11: tasks 06, 07, 08, 09; both halves of the rules story (rule written in 09, read and enforced in 07 and 08) are owned, and task 09 tests tie the catalogue to `sets/edit-rules.json` and `REFUSING_RULES`, with the ruling that it matches `MEASURED_RULES` pinned by test.
- Stories 12, 13, 15: tasks 11 and 12 (tripwire adds only at `p >= 0.9`, named lenses always run, `unchecked` never clean); story 16 and the 13 family count: tasks 10 and 11 (ruling C10).
- Decisions 2, 7, 8, 9, 10: breaker split in 03, `createRunBreaker` in 03 and 11, splitter in 10, opencode 2.x fact in 01, 04, 08, event names in 01.
- Working paths versus refusals: every task with refusal criteria (04, 07, 08) also carries the allow, advise or enabled path; no task is all guards.
- Story 19: sets and scores in 02, benches in 13 as owner-run commands, with the review-bench no-regression sentence required and asserted.
- Story 2 for review helpers: `gateOf` in task 11, with `"log-only"` handled in task 12.
- Dropped task 14: no task or criterion still depends on it; plan.md row 06 and Coverage are stale (gap 1), nothing else.
