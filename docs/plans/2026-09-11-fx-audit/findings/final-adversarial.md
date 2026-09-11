# Final review: unprimed adversarial pass

Returned inline by `fx-devils-advocate` in code mode, whose definition forbids
writing files, and saved here by the controller with the agent's wording. It was
given one open-ended prompt, and the carried-findings file only so it would
recognize settled decisions. It reports that it checked every finding against
that file and none is on it, and that nothing was reproduced.

The agent ended with its own three-option question, which is meant for a human
reading `/fx:critique` output. In a branch review its findings go to the single
fix wave, so no reply was sent; the controller verifies each at the code first.

## Findings

1. **[High] The audit's approval gate promises a refusal `fx-plan` never makes.**
   `skills/fx-audit/SKILL.md:240` and `:264` leave a rejected design as
   `draft, not approved` and tell the user "`fx-plan` refuses a draft". But
   `skills/fx-plan/SKILL.md:15-17` only asks for a design that is "approved" and
   never reads a Status line; the only "draft" in that file is "Draft vertical
   slices" at `:68`. A fresh session, which is the case the audit's resume exists
   for, would plan straight from a target architecture the user rejected.
   (Integrity)

2. **[High] "Sound" can come from checks that never ran.**
   `skills/fx-audit/SKILL.md:231-237` calls the system sound when the pipeline
   lens "reported nothing Critical or Important" and the Phase 3 gate choice is
   `none`. A lens dispatch that failed, the exact case `:210` names, reports
   nothing, and an architecture subagent that produced no candidates leaves
   `none` as the only answer. The audit then writes "sound" and no `design.md`,
   and resume rule 1 repeats that verdict on every later run. (Integrity, silent
   failure)

3. **[High] The lens cannot read a whole-repository file set, and its output
   cannot say it did not.** `agents/fx-lens-pipeline.md:37-38` says to read every
   file in the set in full, and `skills/fx-audit/SKILL.md:195` hands it
   `git ls-files` of the whole scope in one dispatch, the whole repository at root
   scope. The output format at `agents/fx-lens-pipeline.md:106-129` has no place
   to list files it did not read, so "nothing adds work to a queue" looks the
   same as "ran out of context", and that one line then feeds finding 2.
   (Scalability, human debuggability)

4. **[Medium] Resume treats half-finished documents as finished.** `03-gaps.md` is
   written at step 4 (`skills/fx-audit/SKILL.md:207-211`), then its citations are
   checked and corrected at step 5 (`:212-217`) and it is reordered at step 6
   (`:218`). An interruption after step 4 leaves a report with unchecked
   citations in no order, and `:120` and `:125` treat it as finished and never
   rewrite it. `design.md` has the same problem: resume rule 3 (`:118`) offers
   whatever was written for approval, even if the defeater rewrite at step 3 never
   happened. (Integrity)

5. **[Medium] An interrupted Phase 2 cannot resume.** The reference worktree is
   created at `skills/fx-audit/SKILL.md:174` and removed only at the Phase 2 gate
   (`:183`). If Phase 2 stops before the gate, the next run starts Phase 2 again,
   and `git worktree add` fails because `.worktrees/audit-<name>-reference`
   already exists. Nothing in the skill says what to do then. (Integrity,
   unhandled failure)

6. **[Medium] The same scope can only be audited once.** Resume looks up the slug
   directory "whatever its date" (`skills/fx-audit/SKILL.md:90`), and ADR 0015
   says these documents get committed. A second audit of the same scope months
   later finds the committed first one and either repeats its verdict or points
   at `fx-plan`. The only way to start over (`:103-104`) is to move or delete
   committed audit history, so the date in the directory name does nothing.
   (Maintainability)

7. **[Medium] The architecture pass tries to dispatch a subagent from inside a
   subagent.** `skills/fx-audit/SKILL.md:201` runs `fx-architecture` inside a
   subagent, and `skills/fx-architecture/SKILL.md:59` tells it to "spawn a
   sub-agent to walk the codebase". If subagents cannot start their own
   subagents, that step would quietly become one inline walk over the whole file
   set, and nothing downstream could tell. This rests on that platform limit; the
   agent did not see it happen. (Correct pattern usage, scalability)

8. **[Low] The artifact gate checks less than ADR 0015 claims.**
   `scripts/check-artifacts:19-20` scans only `skills/`, `agents/` and
   `commands/`, and only for literal temp-directory names. It skips `references/`,
   which skills load as instructions, and `PREAMBLE.md`, and it misses `mktemp`,
   `tempfile.mkdtemp` and `/var/tmp`. No violation today, so a gate that could
   pass on a violation later, not a current bug. (Verification theater)

The agent left out stale-name and count nits, for example `/fx:audit` at
`references/audit-template.md:3`, as changing nothing.
