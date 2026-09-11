# Final review: spec pass

**Question:** does the branch do what its specification asked, as amended by the
ledger's rulings, no more and no less?

**Range:** `8309b63..a19e515`, the shipped-paths diff at
`.fx/2026-09-11-fx-audit/review/final-shipped-8309b63..a19e515.diff`, read in
full.

**Read:** `design.md` in full; `plan.md`; task files 01 to 09; in `state.md`,
Rulings A to AH, the coverage audit's ruling at `state.md:2663-2731`, and the
task 08 review and fix entries; `findings/coverage-audit.md`;
`final-review-carried.md`. Line numbers below are file lines at `a19e515`, with
the diff line in brackets.

**Result:** (a) 2, (b) 1, (c) 2, plus one question about a change the ledger
recorded as a review fix rather than a ruling. All five findings are Minor. Nothing below
repeats an item in `final-review-carried.md`, and nothing contests a supersession
the ledger made.

## (a) Asked for, missing or partial

### A1. Two lines this branch wrote still name commands that do not resolve

**Requirement.** Ruling AD, `state.md:2769`: "documents state the command names
that resolve". Ruling AF, `state.md:3028`: "the audit becomes a user-invoked
skill". The evidence behind both, `state.md:2764`: "Typing `/fx:audit` returned
'Unknown command'".

**Where it fails.**

- `references/audit-template.md:3` [diff 789]: "Written by `/fx:audit` to the
  artifacts its phases produce". The name does not resolve, and after Ruling AF
  the writer is a skill typed as `/fx:fx-audit`.
- `skills/fx-brainstorm/visual-companion.md:60` [diff 2216]: "`.fx/<slug>/companion/`,
  which `/fx:setup` git-ignores". Task 04 wrote this line, before Ruling AD, and
  no later round revisited it.

Task 09 applied Ruling AD to `README.md` and `SURFACE.md`, and task 08 to its own
heading. These two added lines were never swept. `final-review-carried.md`
records Ruling AD only for `SURFACE.md:173,248,279` and the four commands'
headings, so neither line is already carried.

**Cost.** A reader following the template or the companion instructions types a
name that fails.

### A2. The architecture report is never described as untracked

**Requirement.** `design.md:285`: "Reports are therefore committed." Story 29,
`design.md:135-136`: "I want reports to survive a fresh clone".
`docs/adr/0015-artifacts-live-in-the-repository.md:38`: "Reports become committed
files." Coverage audit item 6 named two owners, task 03 for `fx-architecture` and
task 08 for the audit.

**Where it fails.** `skills/fx-architecture/SKILL.md:77-81` [diff 1414-1418]
moves the report into `docs/plans/<slug>/` and says nothing about it being
untracked or needing a commit. A search of `SKILL.md` and `HTML-REPORT.md` for
"commit", "tracked" and "untracked" returns nothing. The ledger's ruling on item 6,
`state.md:2679-2681`, amended only task 08, and the audit skill does carry it
(`skills/fx-audit/SKILL.md`, Phase 4 gate: "say they are untracked until the user
commits them"). The `fx-architecture` half has no ruling and is not in
`final-review-carried.md`.

**Cost.** A standalone architecture report in
`docs/plans/YYYY-MM-DD-architecture-review/` stays untracked, a fresh clone lacks
it, and ADR 0015 says the opposite.

## (b) Not asked for

### B1. `stop-server.sh` gained a `umask 077` no task or ruling requested

**Spec.** Task 04, `tasks/04-move-companion-session.md:54-56`: the deletion guard
stays "byte-identical apart from the added marker". Ruling T, `state.md:1575-1578`,
moves state files and leaves the guard alone. Neither asks for a new permission
setting in the stop script.

**In the diff.** `skills/fx-brainstorm/scripts/stop-server.sh:17-19`
[diff 2140-2142]: "The state directory sits beside the session key; keep what this
script writes owner-only", then `umask 077`. It came in `0517c81`, and task 04's
reviewer checked it and accepted it (`findings/04-companion-findings.md:75`).

**Judgement.** Benign and consistent with Ruling T's intent. Recorded so the
record is complete, not as a change to make.

Checked and found authorised, so not reported: the `check-prose` changes and the
`PREAMBLE.md` marker line (Rulings J, K, L, `state.md:308-322,392-410,594-632`);
`tests/lens-pipeline/KEY.md` (Rulings O and Q); the `fx-brainstorm/SKILL.md`
launch instruction (Ruling T and task 04 fix round finding 3,
`state.md:1941,1950-1953`); slug validation and the refusal paths in
`start-server.sh` (Rulings T and W, carried as coverage R2); removal of the
footer's link (`state.md:1706-1708`); the `SURFACE.md` "Missing" line
(`state.md:2404-2408`).

## (c) Implemented, but the implementation looks wrong

### C1. The skill defines document shape the template does not hold, against Ruling X's split

**Requirement.** Ruling X, `state.md:1896-1900`: "the template owns the shape of
every document, the command owns when and how it fills them. How one field's
lines are laid out and counted is shape. Deferring it to the command makes the
command a second definition of the template's format". Coverage audit item 2
named task 07 as the owner of "the shape of the sound-verdict record, on Ruling
X's split".

**Where it fails.** Three pieces of document shape live only in
`skills/fx-audit/SKILL.md`:

- `:152` [diff 1584-1585] adds `**Scope:**` and `**Against:**` header fields to
  `01-current.md`. The template's header at `references/audit-template.md:25-27`
  has Date, Phase and Sources only.
- `:226` [diff 1658] defines a `## Phase 3 gate choice` section of `03-gaps.md`.
- `:235` [diff 1667] defines a `## Phase 4 verdict: sound` section of
  `03-gaps.md`.

The template's `03-gaps.md` skeleton, `references/audit-template.md:103-144`,
names neither section. Resume depends on all three: rules 1 and 4 at
`SKILL.md:114,120` key on the two headings, and the scope check that refuses to
continue another audit reads the `Scope` field. The ledger amended item 2 into
task 08 only (`state.md:2677-2678`) and gave no ruling on the shape half.

**Cost.** An edit to the template cannot see fields the resume logic depends on.
That is the second definition Ruling X names.

### C2. ADR 0013's rule covers skill bodies, and its exception list names agent files only

**Requirement.** `design.md:253-254`: "A new ADR extends the rule to agent and
skill descriptions and bodies. It names the four existing lenses as a deliberate
exception". Story 27, `design.md:131-132`: "I want the four unmigrated lenses
named in that record, so that four counter-examples do not make the rule look
like dead letter."

**Where it looks wrong.** `docs/adr/0013-descriptions-name-categories-not-stacks.md:8-10`
[diff 599-601] binds "the description and the body of every agent and every
skill". The exceptions at `:17-24` [diff 608-617] name the four agent files.
`skills/fx-review/SKILL.md:91-94` [diff 2366-2369] is a skill body naming Devise,
Pundit, Sidekiq, ClickHouse and EF migrations. This branch rewrote those rows to
add the Mode column, and the ADR does not name that file.

**Confidence: low.** The ADR follows the design's wording exactly, and the rows
restate the four lenses' own triggers, so they may be meant as part of the
exception. If so, one clause in the ADR saying the trigger table in `fx-review`
shares the exception would close it. If not, a fifth counter-example ships in the
change that states the rule.

## Questions about the rulings

### Q1. Phase 1's explorers stopped being read-only through a review fix, not a ruling

`design.md:177-178`: "parallel read-only explorers, each writing its findings to a
file". Task 08's criterion repeats "read-only explorers". The design is
self-contradictory there, and task 08's review found the result, I3 at
`state.md:2929-2931`: two of three read-only explorers could not write.
`skills/fx-audit/SKILL.md:135-137` [diff 1567-1569] now requires "an agent type
that has a file-writing tool", and the only guard on the user's code is the brief
line at `:141`, "That file is its only write." The boundary at `:37`, "It edits
no code", therefore rests on an instruction rather than on a tool restriction,
the property the lenses keep by construction (`design.md:371`).

The fix looks right. The question is whether it should sit in the ledger as a
ruling beside Ruling AF, disclosed at the completion report as a design change,
since the design promised read-only and the phase no longer is. No evidence says
an explorer has written outside `.fx/`; the probe logs at `state.md:3122-3127`
show no stray write.

## Conforming, checked against the diff

Task 01 to 09 acceptance criteria, as amended, hold in the diff apart from the
items above. That covers the gate's scope, patterns, marker and exemption count; the
`fx-architecture` standalone path; Ruling T's split and Ruling W's exclude write;
the lens's frontmatter, file-set input, ceding rules, red flags and branch-only
Mode row under Rulings U and Z; ADR 0013's four exceptions and loading rules;
ADR 0014's quote, override reason, measurement, provisional status and the Ruling AA
cost; ADR 0008's supersession text after its fix round; the template's four
skeletons, Stated targets field under Rulings V, X and Y, and no mention of the
design template; the audit skill's arguments, Phase 2 resolution and removal,
never guessing a reference, ignore check, ten-line gates, resume, explorer
retry, uncovered areas, the Phase 3 dispatch set and bounded `fx-architecture`
invocation, opened citations, impact order, `design.md` with a draft Status
approved at the gate, defeater, sound outcome, a report that fetches nothing,
boundary, and `disable-model-invocation`; and the recounts in `README.md` and
`SURFACE.md` after Ruling AF.
