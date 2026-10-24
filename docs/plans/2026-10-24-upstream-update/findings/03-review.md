### Spec Compliance

- ✅ Spec compliant. Pure move verified mechanically: every one of the 596 removed SKILL.md lines (d7083ab..35f5b22) reappears unchanged in exactly one of the sixteen new references/*.md files, except the four F27 rows (old SKILL.md 944 to 947, deleted as the brief orders) and the four brief-ordered path fixes (setup.md x2 and exit-gate.md `../../references/` to `../../../references/`; lens-dispatch.md:3 `../fx-review/` to `../../fx-review/`). No reference line exists that did not come from a removed line, other than those four path fixes.
- ✅ Run mapping (old SKILL.md line ranges, contiguous, original order): why-this-lane 22 to 39; setup 41 to 44 + 189 to 271; rulings 72 to 104; waiting 116 to 178 + 374 to 379; preflight 327 to 346; batching 362 to 367; reading-rules 410 to 424; handling-reports 489 to 527; cost 546 to 555 + 677 to 686; lens-dispatch 564 to 593; review-inputs 599 to 634; coverage-audit 714 to 748; final-review 752 to 783; exit-gate 787 to 852; completion 854 to 924; rationalizations 928 to 943 + 948. All match the brief's table (trailing blank lines aside).
- ✅ The only lines added to SKILL.md are the twenty pointer lines (plus one blank line), each `**<trigger>**: read [x.md](./references/x.md), every time.`; two-run files get one pointer per run.
- ✅ Section 4 (old 273 to 315: ledger, resume bullets, "After compaction, trust the ledger", standing rulings) and section 5 sit in no hunk; unchanged. New SKILL.md:79 to 121.
- ✅ Four reading-rule bullets intact at new SKILL.md:169 to 186; the three moved bullets replaced by one pointer bullet at SKILL.md:187.
- ✅ Rulings run applied as ruled: old 72 to 104 ("Name the checkpoint" through "Why: checks applied only...") is in references/rulings.md; SKILL.md keeps the Ruling template with "caught by <the checkpoint that would catch it, if one would>" (SKILL.md:47 to 48) and the pointer "Before you rule or ledger a claim" (SKILL.md:53) sits before "Four things stop you".
- ✅ Size: 17,817 bytes (wc -c on `git show 35f5b22:skills/fx-implement/SKILL.md`), under the 17,900 cap.
- ✅ Gate retargets read the same text as before, each from one file: fix-loop-shape (setup.md, handling-reports.md, exit-gate.md incl. the 1,800-char classify slice, final-review.md, pointer order exit-gate before completion); return-contract (coverage-audit.md from 0, whole lens-dispatch.md, review-inputs.md `confirmed ⚠️:`, needle split SKILL.md vs reading-rules.md, completion.md plan-complete section, ruled `Fixed` field on reading-rules.md); tripwire-table (whole lens-dispatch.md, startsWith check); ledger-lines (handling-reports.md, cost.md, SKILL.md s3 pointer to cost.md, ruled `pass \`unavailable\`` on cost.md); branch-pass (final-review.md for all three, cap sentence, negative dispatch check). No needle text changed.
- ✅ worktree-setup.md:74 "setup in place"; baseline row Reality cell now the ADR 0030 sentence (Excuse cell kept, reasonable for a two-column table). fx-review/SKILL.md:208 links lens-dispatch.md. PENDING drops fx-implement. no-stories lists every references/*.md.
- ⚠️ Cannot verify from diff: COVERAGE.md verdicts row by row. Totals are consistent (95 + 126 = 221 = 203 + 18) and Incident Rule lines name the right files, but e.g. row "3 to 8 | K | ... the three reasons" may cover text that moved to why-this-lane.md. The implementer says the old totals were not re-audited. Controller: leave to the final review or a COVERAGE pass.
- ⚠️ Gate outputs and check-paths / check-generated not re-run here (per template); report quotes OK lines for all.

### Strengths

- A genuine byte-for-byte move: zero reworded lines outside the four ordered path fixes, confirmed by line multiset and contiguous-run mapping.
- Pointer triggers name the step that needs each file, and the exit-gate pointer (SKILL.md:366) precedes completion (SKILL.md:368), with fix-loop-shape now asserting that order.
- The implementer surfaced the brief's internal contradiction on the rulings run instead of silently choosing, and the choice matches the later ruling.
- The two baseline negative checks were kept on both SKILL.md and setup.md instead of narrowed.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. src/tests/gates/fix-loop-shape.test.ts:21 and :39 · the negative checks "the old rationalization row is replaced" and "no vestigial baseline wording" now scan only rationalizations.md and exit-gate.md; before, they scanned all of SKILL.md. The banned text could return in SKILL.md undetected. The baseline checks at :15 and :17 were kept on both files, so this is inconsistent. Fix: `&& !impl.includes(...)` on both.
2. Positional words in moved text now point at another file (pure-move rule forbids rewording, so this is a note for a later task): references/setup.md:2 "everywhere below", setup.md:42 "the exit gate's classification (below)", waiting.md:61 "'Rulings, not stalls' above", lens-dispatch.md:11 "the fix loop below". Each referent now lives in SKILL.md or exit-gate.md. Low impact; a reader follows the pointers.
3. skills/fx-implement/SKILL.md:75 to 79 · with Setup subsections 1 to 3 moved, "## Setup" is followed directly by "### 4. The ledger", so the numbering starts at 4. Plan-mandated by the move table; cosmetic.

### Assessment

**Task quality:** Approved
**Reasoning:** The split is a verified pure move with only pointer lines added, section 4 and the four reading-rule bullets inline, the rulings ruling applied, and every retargeted assertion reading its original sentence from a single file. The Minor items are a slight narrowing of two negative checks and stale positional words the pure-move rule forbade fixing.

## Ledger lines

Task 03: minor (deferred): fix-loop-shape negative checks for the old rationalization row and baseline-0 wording no longer also scan SKILL.md
Task 03: minor (deferred): moved text keeps positional words (setup.md below x2, waiting.md above, lens-dispatch.md fix loop below) whose referents are now in another file
Task 03: minor (deferred): SKILL.md Setup numbering starts at ### 4. The ledger after subsections 1 to 3 moved
