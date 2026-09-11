# Task 09 review: README and SURFACE inventory counts

Base `9cb212e`, head `ab52534`. Files: `README.md`, `SURFACE.md`.

## Spec Compliance

- ✅ `README.md`'s lens table gains the `fx-lens-pipeline` row with its trigger
  set verbatim from `skills/fx-review/SKILL.md` section 2, and states it fires
  on branch reviews only (README.md:68, 76 to 77).
- ✅ `README.md`'s commands table gains the audit command with a one line
  description, as `/fx:fx-audit` per Ruling AD (README.md:149).
- ✅ `README.md`'s Layout block reports real counts: `skills/ 12`, `commands/
  5` (README.md:106, 108).
- ✅ `README.md`'s Layout block reports `agents/` as 6: 5 lenses plus the
  devil's advocate (README.md:107).
- ✅ `README.md`'s skills table gains no row; 12 rows before and after, `ls -d
  skills/*/` also lists 12.
- ✅ `SURFACE.md`'s Agents section reports 6 and lists the new lens with model
  tier (`opus`, top tier) and the reason (SURFACE.md:59, 68, 75 to 78).
- ✅ `SURFACE.md`'s Commands section reports 5 and lists `/fx:fx-audit`
  (SURFACE.md:163, 171).
- ✅ `README.md`'s Gates block lists six scripts, `check-artifacts` included
  beside the five already there (README.md:209 to 214).
- ✅ `README.md`'s Tests block names the lens fixture from task 05
  (README.md:199 to 202).
- ✅ Every count is checked against the filesystem with `ls`, shown in the
  report's RED and GREEN blocks, and I independently reran the same `ls`
  commands myself with matching results (see table below).
- ✅ `python3 scripts/check-prose README.md SURFACE.md` passes, rerun myself:
  exit 0, "no dashes, no stock vocabulary, parentheses balanced."
- ⚠️ Cannot verify `scripts/check-all` myself (explicitly disallowed for this
  review while a writer may be live). The report shows it run last, exit 0,
  ALL GREEN, five check gates plus four test suites. Taken as reported.

### Ledger rulings, checked individually

- **"Task 09's counts, checked on disk before its brief"** (state.md:2375):
  the controller's own pre-brief count block matches what the implementer
  later found and what I independently confirmed: 12 skill directories, 6
  agent files, 4 to 5 commands, 21 references markdown files, 7 `check-*`
  scripts. Held.
- **The "For task 09" paragraph in the task 04 section** (state.md:1697 to
  1704, corrected in place): "`README.md`'s gates block lists five, four of
  the gates `check-all` runs plus the manually run `check-collisions`, and no
  `check-artifacts`; after task 09 adds it, the block lists six while
  `check-all` runs five. Both numbers will be correct and describe different
  things." README.md:209 to 214 lists six (`check-manifest`, `check-paths`,
  `check-reference-leaves`, `check-prose`, `check-artifacts`,
  `check-collisions`), and `scripts/check-all` (read directly) runs exactly
  five (`check-manifest`, `check-paths`, `check-reference-leaves`,
  `check-prose`, `check-artifacts`), excluding `check-collisions` by design
  per its own header comment. README.md:204 to 205 states "`scripts/check-all`
  runs the first five, then the four suites above." True on both counts. Held.
- **"Ruling AD: documents state the command names that resolve; renaming is
  the user's call"** (state.md:2769): every command name a user types in both
  files now reads `/fx:fx-<name>` (`/fx:fx-setup`, `/fx:fx-critique`,
  `/fx:fx-grill`, `/fx:fx-handoff`, `/fx:fx-audit`), confirmed against
  `run-green-3.json`'s `slash_commands` array (`fx:fx-audit`, `fx:fx-critique`,
  `fx:fx-grill`, `fx:fx-handoff`, `fx:fx-setup` present; unprefixed forms
  absent) and `run-red.json` / `run-green-1.json`'s `"Unknown command:
  /fx:audit"`. No command file renamed. Held.

## Every number, checked

| Claim in diff | Command | My result | Match |
|---|---|---|---|
| skills/ 12 | `ls -d skills/*/ \| wc -l` | 12 | yes |
| agents/ 6 | `ls agents/*.md \| wc -l` | 6 | yes |
| commands/ 5 | `ls commands/*.md \| wc -l` | 5 | yes |
| references 22 files, 21 markdown + 1 TypeScript | `find references -type f \| wc -l`; `find references -type f -name '*.md' \| wc -l` | 22 total, 21 md | yes |
| references listing: 2 top, 6 stacks, 14 vocab (13 md + 1 ts) | `ls references/*.md`; `ls references/stacks/*.md`; `ls references/vocab/*` | 2, 6, 14 | yes |
| Gates: six `check-*` scripts besides `check-all` | `ls scripts/check-*` | 7 total incl. `check-all`, 6 besides | yes |
| `check-all` runs five | read `scripts/check-all` source | exactly 5 `run` calls before the test suites, `check-collisions` explicitly excluded | yes |
| lane suite: 7 lanes, 9 prompts | `ls tests/lane-triggering/prompts/*.txt` | 9 files, distinct lane stems: fx-architecture, fx-brainstorm, fx-debug, fx-design, fx-humanize, fx-review, fx-tdd = 7 | yes |
| SURFACE Agents count 6, ADR 0014 exists | `ls docs/adr/ \| grep 0014` | `0014-the-app-layer-gap-gets-its-own-lens.md` present | yes |
| `/fx:fx-audit` runs `fx-lens-pipeline` (README.md:77 claim) | `grep lens-pipeline commands/fx-audit.md` | Phase 3 runs it | yes |
| fx-lens-pipeline trigger text matches `skills/fx-review/SKILL.md` section 2 | `sed -n` on both files | identical wording | yes |

No mismatches found anywhere the diff states a number.

## Strengths

- Every count in the diff was independently reproducible from the filesystem;
  none of the ten pre-existing mismatches the report found were left
  unaddressed, and none of the corrected numbers were wrong.
- The Gates paragraph is the one place a wrong-sounding pair of numbers (six
  listed, five run) is easy to write inconsistently, and it reads true on
  both counts, confirmed by reading `scripts/check-all` directly rather than
  trusting the report's transcript.
- Command name discipline (Ruling AD) is applied uniformly across every typed
  occurrence in both files, and the three names that do not resolve to a real
  command (`/fx:help`, `/fx:stack`, `/fx:upgrade`) were correctly left
  unprefixed rather than invented into a name that would falsely imply
  resolution. This is consistent with the task's own scope (counts and
  tables) rather than a violation of the Risks section, which is about
  numeric counts, not every prose mention of a hypothetical command.
- The References section change is scoped exactly as ruled: count, listing
  and "Missing" line moved together, the "Leaves" paragraph directly below
  left untouched, and the new count states what it counts ("22 files, 21
  markdown plus one TypeScript example") instead of a bare, ambiguous number.
- The report's own "Concerns" section proactively discloses two judgment
  calls (the Agents table's "Lines" column semantics, and stale
  `performance`-tier prose left for a later sweep) rather than burying them,
  which made this review faster to check.

## Issues

### Critical

None.

### Important

None. Every ledger ruling assigned to this task held on inspection, every
stated count matched an independent filesystem check, and every command name
typed in both files resolves under Ruling AD or is correctly left unprefixed
because it names a command that does not exist.

### Minor

- The `fx-lens-pipeline` row's "Lines" column in `SURFACE.md`'s Agents table
  reads `n/a`, while the four sibling rows' numbers (100, 117, 149, 59) no
  longer match the current line counts of `agents/fx-lens-*.md` (121, 134,
  131, 120 today) or anything else in the repository; the report's own
  Concerns section flags this. `n/a` is defensible for the new row (it has no
  upstream source to count), but the column's actual meaning is undocumented
  and was already broken before this task, so this does not change the
  verdict. Left as the report recommends, for the wider stale-document sweep.

## Assessment

**Task quality:** Approved
**Reasoning:** Every acceptance criterion is met, every count in the diff
checks out against the filesystem exactly as the report claims, and all three
ledger rulings assigned to this task hold verbatim against the evidence.
