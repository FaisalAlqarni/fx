# Task 09 fix round 1: findings

Scope: the recount owed by Ruling AF (commands/fx-audit.md moved to
skills/fx-audit/SKILL.md with disable-model-invocation: true). Fix base
0753dd1, head 8dd05fe, diff at
.fx/2026-09-11-fx-audit/review/0753dd1..8dd05fe.diff. Only the lines the
recount needed were checked for scope; nothing else in the two files was
re-reviewed beyond a search for stale numbers.

## Requirement verdict

ADDRESSED. Every element of the stated requirement is met, verified against
the filesystem and against both files as they stand on disk.

## Checks 1 to 4

### Check 1: every count in the diff against the filesystem

```
$ ls -d skills/*/ | wc -l
13
$ ls -d skills/*/
skills/fx-architecture/ skills/fx-audit/ skills/fx-authoring/
skills/fx-brainstorm/ skills/fx-debug/ skills/fx-design/ skills/fx-humanize/
skills/fx-implement/ skills/fx-plan/ skills/fx-review/ skills/fx-tdd/
skills/prototype/ skills/research/

$ ls commands/*.md | wc -l
4
$ ls commands/*.md
commands/fx-critique.md commands/fx-grill.md commands/fx-handoff.md
commands/fx-setup.md

$ ls agents/*.md | wc -l
6

$ ls commands/fx-audit.md
ls: cannot access 'commands/fx-audit.md': No such file or directory

$ head -6 skills/fx-audit/SKILL.md
---
name: fx-audit
description: >
  Audit an existing system in four gated phases, ending in a design.md for fx-plan
disable-model-invocation: true
---
```

README.md:106 claims `skills/ 13`, matches `ls -d skills/*/` = 13.
README.md:108 claims `commands/ 4`, matches `ls commands/*.md` = 4.
SURFACE.md:59 claims `User-invoked skills: 1`, matches the one skill on disk
carrying `disable-model-invocation: true`.
SURFACE.md:174 claims `Commands: 4`, matches disk.
Command table rows in both files: 4, counted directly from the tables
(README.md:145-150, SURFACE.md:176-181), matching `ls commands/*.md`.
Skill table rows in README.md (the model-selectable table, lines 126-139):
still 12, unchanged, matching the pre-fix count since no skill was added
to that table.

Verdict: PASS. Every count the diff touches matches the filesystem.

### Check 2: every mention of fx-audit in both files

```
README.md
77:  on branch reviews only, never per task; `/fx:fx-audit` also runs it.
106: skills/       13: 10 lanes, prototype and research, and fx-audit, which only you invoke
123: skill, `fx-audit`, is not model-selectable and is not in this table: you type it,
152: `/fx:fx-audit` is typed the same way but is a user-invoked skill, not a command:
153: `skills/fx-audit/`, with `disable-model-invocation: true`, so the model never
     selects it.

SURFACE.md
68: | `fx-audit` | `/fx:fx-audit` | Audits an existing system in four gated
    phases, ending in a `design.md` for `fx-plan` |
79: | `fx-lens-pipeline` | ... Branch review and `/fx:fx-audit` only, never
    per task |
89: the branch review and in `/fx:fx-audit`.
183: `/fx:fx-audit` is typed like a command but is a user-invoked skill,
     counted under "User-invoked skills" above, not here.
```

Every mention describes fx-audit as a user-invoked skill, never as a lane,
procedure or command. It is absent from README's commands table (4 rows,
all the real command files) and from SURFACE's Commands table (4 rows,
same). It is explicitly called out as not model-selectable at README.md:123
and SURFACE.md:61 ("the model never selects it"). It does not appear in the
lanes list (SURFACE.md:10-39) or the procedures list (SURFACE.md:41-49). The
two lens-table mentions (README.md:77, SURFACE.md:79, 89) describe it as
something that also runs the pipeline lens, not as a lane or command, and
both predate this fix round (untouched by the diff) and remain accurate
after the move.

Verdict: PASS. Consistent everywhere, correctly excluded from every
model-selectable and command total.

### Check 3: nothing else in the two files contradicts the new counts

```
$ grep -n "commands/fx-audit" README.md SURFACE.md
(no output, exit 1)

$ grep -n "eleven\|thirteen\|Eleven\|Thirteen" README.md SURFACE.md
README.md:122: `fx-plan` and `fx-implement` need an artifact to start from. The thirteenth

$ grep -n "\b13\b\|\b12\b" README.md SURFACE.md
README.md:106: skills/       13: 10 lanes, prototype and research, and fx-audit...
README.md:191: node lib/heredoc.test.js     $FIX      # 13
SURFACE.md:48: | `research` | 12 + 1 | ...
```

The two extra hits are unrelated to the skill/command recount: line 191 is
the heredoc test suite's assertion count, and SURFACE.md:48 is the line
count of the `research` procedure file. Neither is a stale skills or
commands total. No line anywhere still reads "skills/ 12" or "commands/ 5"
or the words "twelve" or "five" in a skills/commands-count context. The
one surviving "five" at README.md:211 ("first five, then the four suites")
refers to the five check-* gates run by check-all, a separate count
untouched by this ruling, and it is correct on disk (six check-* scripts
minus check-collisions = five run by check-all).

Verdict: PASS. No neighbouring sentence still states the old commands or
skills totals.

### Check 4: scope, only the lines the recount needed changed

Diff hunks, by file:

README.md:
- Layout block: the `skills/` line and `commands/` line changed; the
  `agents/` line is untouched context (agents count is unaffected by the
  move, correctly left alone).
- "The skills" section: one sentence appended after the existing
  standalone-skills sentence, naming fx-audit as the thirteenth skill,
  not model-selectable, not in the table.
- "The commands" section: the fx-audit row removed from the table (since
  it is no longer a command) and replaced with an explanatory paragraph
  that still tells the user to type `/fx:fx-audit`.

SURFACE.md:
- A new "## User-invoked skills: 1" section inserted between "Procedures"
  and "Agents", holding the reason and a one-row table.
- The "## Agents: 6" heading is untouched context; agents count did not
  change.
- "## Commands: 5" changed to "## Commands: 4"; the fx-audit row removed
  and replaced with a one-line pointer to the new section.

No other section of either file (Gates, Tests, References, the routing
table, the lens table, the git guard section, stack detection, etc.) was
touched. Ledger's own placement note confirms the SURFACE.md section was
caught mid-draft and moved to sit after the Procedures "Dropped"/"Removed
from inventory" lines rather than above them, before the commit; the
committed diff (read above) shows it at the correct position, after
SURFACE.md:58.

Verdict: PASS. The diff is scoped to exactly the lines the recount required.

## New breakage in the fix diff

None. `python3 scripts/check-prose README.md SURFACE.md` exits 0 with 0
blocks needing the quoting exemption:

```
0 block(s) exempted by `prose-gate: quoting`
OK: no dashes, no stock vocabulary, parentheses balanced
```

Commit `8dd05fe` carries no attribution trailer (`git log -1 --format=%B
8dd05fe | grep -c -i -E "co-authored|claude-session|generated with"`
prints 0).

## Out-of-scope observations

These were visible while reading but are not part of this recount and are
not being re-litigated:

- SURFACE.md's Agents table "Lines" column still does not match any fx
  file's real length (a pre-existing issue recorded in the task 09 review
  as deferred to the final review).
- SURFACE.md:83 still pins `performance` at mid-tier in prose, a lens that
  was cut; stale, and outside this recount.
- SURFACE.md:271-272 (the two-skills-directories table of machine-state
  counts) is unrelated to the plugin's own inventory and was not touched
  or checked here.
- README.md's Gates and Tests blocks, and SURFACE.md's References section,
  are unchanged by this diff and were not re-verified beyond confirming no
  stray old numbers appear in them (see Check 3).

## Verdict

**Fix round: All addressed, no new Critical/Important breakage.**
