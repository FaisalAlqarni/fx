# Task 08 re-review, fix round 2 (7c254dc..77ac5fa)

Line numbers are at 77ac5fa (read with `git show 77ac5fa:<path>`).

### Finding verdicts (ADDRESSED | NOT ADDRESSED with file:line)

- **1. Re-review ledger count check needs counts the reply does not carry (open half of item 6)**: ADDRESSED. The re-review reply's `Fixed` field now carries the number: `count fixed; ledger <m>`, defined as one per out-of-scope observation plus one per Minor new-breakage item (re-review-prompt.md:168-170, returns summary at 191-194). The template's ledger paragraph tells the re-reviewer that the controller checks against 1 plus that number (re-review-prompt.md:158-159). The controller side matches in both places: SKILL.md:470-475 ("1 plus the ledger number in its `Fixed` field") and fix-loop.md:75-78. Re-walked the step: the controller reads the five lines, greps `## Ledger lines` into state.md, and compares the appended count with 1 + m, all without opening the findings file. A dropped line now shows as a mismatch, and the mismatch path (read the section with `sed`) is unchanged.
- **2. Lens findings routed by their own Critical, Important, Minor tags; lens Minors go to the ledger, not the loop (new breakage 1 of round 1)**: ADDRESSED. The false "no severity split" claim is gone from fix-loop.md and re-review-prompt.md. fix-loop.md:34-36 and re-review-prompt.md:34-37 open only a lens's `[Critical]` and `[Important]` lines and say its `[Minor]` lines are never open. SKILL.md:585-586 and 602-608 have the controller ledger each lens `[Minor]` as `Task <NN>: minor (deferred): <one-liner>` when it records the reply, since the reply is already in its context under Ruling R. All five lens agents tag findings this way (agents/fx-lens-database.md:100-102, fx-lens-a11y.md:112, fx-lens-pipeline.md:169-171, fx-lens-security.md:111, fx-lens-silent-failure.md:99). Re-walked the step: lens reply recorded by heredoc, Minors ledgered by the controller, Critical and Important passed to the fixer and re-reviewer as open, round 2 onward reads only the previous re-review's NOT ADDRESSED and Critical or Important breakage. That is consistent with "Minor findings never enter the loop" (fix-loop.md:12) and "Minor is never open" (re-review-prompt.md:42).

### New breakage in the fix diff

1. **Minor: fix-loop.md:35-36 says the controller ledgered lens Minors "below, when you recorded the reply", but nothing below in fix-loop.md does that.** The ledgering step lives in SKILL.md:602-607 (§3, lens dispatch), which the fix loop is entered from. A reader looking below in fix-loop.md finds only the re-review ledger copy. Fix: say "in SKILL.md §3, when you recorded the reply".
2. **Minor: SKILL.md:606-608 argues with text that no longer exists.** `"A lens has no severity split" is false` quotes a sentence this round deleted, so an agent reading the skill meets a rebuttal of a claim it never saw. Fix: drop the quoted sentence and keep the reason (every lens tags each finding; the reply is already in context).

### Out-of-scope observations

- Lens Minors that the controller ledgers itself have no count check, unlike reviewer and re-reviewer ledger copies (SKILL.md:470-475). The reply is short and in context, so the risk is low. Minor.
- SKILL.md:580-582 names four lenses for per-task dispatch and leaves out `fx-lens-pipeline`, which exists and tags severity the same way. Predates this round. Minor.

Checks run on a `git archive 77ac5fa` extract, not the working tree (task 11's implementer is writing there): `node tests/gates/return-contract.test.js` gave `return-contract: ok`; `node tests/review-bench/score.test.js` gave `score.test.js: ok`.

Ruling A holds: the diff's hunks start at re-review-prompt.md:34 and later, and line 15 still reads "You are re-reviewing one task's fix round." No other template changed. Ruling R holds: SKILL.md:588-600 still has lenses with no Write tool, replying in full, recorded by heredoc. Task 11's `### Parallel tasks` section (SKILL.md:387 onward, from 7c254dc) is untouched: the SKILL.md hunks are at 472, 585 and 602 only, and no changed line mentions parallel work.

### Verdict

**Fix round:** All addressed, no open items. Both round 1 open items are ADDRESSED. New breakage is Minor only (two wording issues), so it is ledgered and does not extend the loop.

## Ledger lines

Task 08: fix round 2/5 (2 addressed, 0 open; commits 7c254dc..77ac5fa)
Task 08: minor (deferred): fix-loop.md says lens Minors were ledgered below, but that step is in SKILL.md section 3
Task 08: minor (deferred): SKILL.md lens routing paragraph rebuts a deleted sentence, drop the quote and keep the reason
Task 08: minor (deferred): lens Minors ledgered by the controller have no count check
Task 08: minor (deferred): SKILL.md per-task lens dispatch list omits fx-lens-pipeline
