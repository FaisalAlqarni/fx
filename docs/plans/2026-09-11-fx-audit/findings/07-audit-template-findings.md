# Task 07 review: `references/audit-template.md`

Base f581282, head 7d39c0b. One commit, one new file, 176 lines. Confirmed
myself: `wc -l references/audit-template.md` returns 176, and the diff adds
nothing else.

## Gates run myself (not taken from the report)

```
bash scripts/check-reference-leaves
OK: no reference links to another reference
EXIT:0
```

```
python3 scripts/check-prose references/audit-template.md
0 block(s) exempted by `prose-gate: quoting`
OK: no dashes, no stock vocabulary, parentheses balanced
EXIT:0
```

```
grep -n "design-template" references/audit-template.md
grep exit:1
```

Zero matches, confirmed independently. I did not run `scripts/check-all` or
`python3 scripts/check-paths` against the whole tree, per instruction, since
another implementer is writing in this checkout right now. `check-paths` only
scans `skills/`, `agents/`, `commands/`, so it does not even inspect this file;
I read the script (`scripts/check-paths`) to confirm that before treating it
as not applicable here.

I also independently confirmed no raw em or en dash characters
(`grep -nP '[\x{2013}\x{2014}]'`) in the file: zero matches, corroborating the
prose gate rather than trusting it alone.

## Spec Compliance

Walking the task's ten checklist items (the task text calls it nine informally
in places, the file literally has ten checkboxes):

1. **All four skeletons present with the headings listed.** Verified by
   heading grep (`references/audit-template.md`, `## ` and `# ` lines).
   `01-current.md` (line 23 onward): Domain model and glossary, End-to-end
   flow, Feature and business-rule inventory, Patterns and file structure,
   What the system does well, What the system does badly, Areas not covered:
   all seven, matching the task's list exactly. `02-reference.md` (line 72
   onward): same seven headings plus `Resolved from` / `Read at` metadata
   fields (lines 92-95). `03-gaps.md` (line 104 onward): verdict table with
   the four-value enum and a File:line column. Phase 4 section (line 128
   onward): Proposed folder tree, Core interface signatures, Lifecycle
   diagram, Per-module verdict, Add-a-new-provider walkthrough, Recommendation,
   Defeater: covers all six items the task names (Recommendation plus Defeater
   split one conceptual item into two headings). Spec compliant.

2. **`01-current.md` carries an Areas not covered section.** Line 58, with an
   explicit fallback sentence for the empty case ("None: every dispatched area
   returned findings.", line 61). Spec compliant, done well, see Strengths.

3. **`03-gaps.md` requires a file and line on every row, orders by impact.**
   Line 111-121: the table has a dedicated `File:line` column and the prose
   states "a verdict without one is an opinion, not a finding" (line 112-113),
   plus "Rows are ordered highest impact first" (line 113-114) and an `Impact`
   column with `high | medium | low`. ✅ Spec compliant.

4. **Phase 4 skeleton carries recommendation and the opposite-side statement.**
   Lines 166-171: `## Recommendation` and `## Defeater` are two separate
   headings, not one section with a buried sentence. Spec compliant, done
   well, see Strengths.

5. **Per-module verdict table has a row for every module.** Lines 151-159: the
   table has the prose instruction "none may go silently unaccounted for"
   (line 152) but no structural device that would make a partial table look
   incomplete. Cannot fully credit this one: the instruction sentence exists,
   satisfying a literal reading of the checkbox, but see Issues; this is the
   weakest of the four hard properties the review was asked to test.

6. **No occurrence of `design-template`, proven by grep.** Confirmed above,
   grep exit 1. Spec compliant.

7. **Table of contents if over 100 lines.** File is 176 lines; TOC present at
   lines 9-16, four links, all four resolve to real headings I can find at the
   line numbers cited above. Spec compliant.

8. **`bash scripts/check-reference-leaves` passes.** Confirmed above, exit 0.
   Spec compliant.

9. **`python3 scripts/check-paths` passes.** Cannot verify this criterion
   as applying to this file specifically: I read `scripts/check-paths` and it
   only walks `skills/`, `agents/`, `commands/`; it never reads anything
   under `references/`. The report's own gate output block (`OK: 53 reference
   citations...`) is the whole-repository count, unaffected by this file since
   this file cites nothing. The check passing is real but says nothing about
   this task specifically. The controller should note that this acceptance
   criterion is unfalsifiable for a `references/` file by construction and
   should not be read as evidence of this task's citation hygiene (there is
   none to check: this file makes no citations).

10. **`scripts/check-all` exits 0.** Cannot verify from this diff alone,
    and I was explicitly told not to run it because another implementer is
    concurrently editing `skills/fx-review/SKILL.md` and creating
    `tests/lens-pipeline/` and an agent file in this same checkout, which
    would make any whole-repo gate result unreliable and non-attributable to
    this task. The report's claimed `scripts/check-all` output (`ALL GREEN
    EXIT:0`) is plausible given the two sub-gates I ran clean, but the
    controller should re-run `scripts/check-all` once the concurrent work
    lands or is isolated, to get a result that is actually about this file.

## Strengths

- **Areas not covered (line 58-61)** is the one property in this file that
  gets a real structural device, not just a heading: it supplies the literal
  fallback text an agent writes when the section would otherwise be empty
  ("None: every dispatched area returned findings."). That is exactly the
  technique the task and the design ask for: a hole in the map becomes a
  stated item instead of something a reader has to notice by its absence.
- **Recommendation and Defeater (line 166-171)** are two separate top-level
  headings rather than one heading with an aside. An agent filling in
  Recommendation cannot skip Defeater by finishing the paragraph above it;
  it is its own required section with its own instruction ("A recommendation
  that cannot name one is a preference wearing a verdict.", line 171).
- The file never names `design-template.md`, the specific trap the task calls
  out, and does not lean on it implicitly either. I read `references/design-template.md`
  in full and the two files share no heading names, so there is no accidental
  duplication of the design document's own sections (Problem Statement,
  Solution, User Stories, Implementation Decisions, Testing Decisions, Global
  Constraints, Out of Scope, Open Questions, Further Notes; none of these
  appear in the audit template).
- Every prose fence in the file is tagged ```` ```markdown ```` rather than left
  bare, consistent with the fence-tagging convention the prose gate depends on.
- The escaped pipes inside the two example table rows (line 136, line 174) are
  correct GitHub-flavored-markdown table escaping for showing enum values
  inside a cell; they render as intended and are not a defect.

## Issues

### Important (Should Fix)

**1. The per-module verdict table has no structural device forcing full
coverage, only a sentence. `references/audit-template.md:151-159`.**

The section reads:

```markdown
## Per-module verdict

One row per module in the current system: none may go silently unaccounted
for. Four verdicts only.

| Module | Verdict | Reason |
|---|---|---|
| <name> | keep \| refactor \| rewrite \| delete | <one line, citing a file:line> |
```

An agent filling this table in for three modules out of a ten-module system
produces a table that is well-formed, has a header row, has example-shaped
data, and looks finished. Nothing about the table's shape signals that seven
modules are missing, because there is no count to check against and no
requirement to enumerate the source list first. This is the exact failure
mode the task asked me to test for and the exact contrast the task drew with
`fx-authoring`'s rule: a structural REQUIRED field or slot works, a prose
reminder near the template does not. Compare this to `Areas not covered`
(line 58-61) in the same file, which solves the identical problem
(something silently missing) with a real device: an explicit fallback string
for the empty case. The per-module table gets the weaker treatment for a
requirement the task's own acceptance criteria single out by name ("row for
every module, so nothing... is silently unaccounted for") and that the design
document repeats as its own user story (design.md line 98-99: "I want a
keep, refactor, rewrite or delete verdict per module, so that nothing in the
current system is silently unaccounted for").

Fix: add a reconciliation device that mirrors what `Areas not covered`
already does in this file, for example a required line above the table such
as "Total modules identified in `01-current.md`: N. Rows below: N." A
mismatch is then visible without cross-referencing two documents by eye.

**2. The template embeds a specific process detail that task 08 owns, not
task 07. `references/audit-template.md:59-61` versus
`docs/plans/2026-09-11-fx-audit/tasks/08-fx-audit-command.md:62`.**

The `Areas not covered` instruction reads: "Every area an explorer returned
nothing on, after one re-dispatch with more context." Task 08's own
acceptance criteria, for the command this template serves, states
independently: "An explorer returning nothing is re-dispatched once with more
context." This is the same operational fact (an unresponsive explorer gets
exactly one retry, with added context) stated in two places that the leaf
gate and the split between command and template are specifically designed to
keep apart. The task's own framing for this file is explicit: "the shape of
every document the audit writes, in one place, so the command stays process
and the artifact shape does not live inside it." A retry policy is process,
not shape. `design.md` itself never states this retry count anywhere I could
find (checked with `grep -n -i dispatch design.md`); it is invented here, and
it happens to already match what task 08 separately specifies, which is
coincidence rather than a shared source. If task 08 is built with a different
retry policy (or none, or a cap that varies by phase), or if that acceptance
criterion changes before task 08 ships, this file will contradict the command
it serves and nothing will catch the drift, because the two files are
deliberately never allowed to reference each other. This is exactly the kind
of duplication the leaf rule and the composition principle in the design
exist to prevent, even though the leaf gate itself (a grep for `.md` filename
mentions) cannot detect duplicated prose across unrelated files.

Fix: drop "after one re-dispatch with more context" from the template and
say only what the shape needs: "Every area an explorer returned nothing on,
after the command's retry policy has been applied." The retry count itself
belongs solely in task 08's command definition.

### Minor (Nice to Have)

**3. `Core interface signatures` (line 141-144) overlaps in scope with the
design template's `Implementation Decisions` section.** `references/design-template.md:38-49`
lists "The interfaces of those modules that will change" as one of the
things `Implementation Decisions` may include, with a narrow exception
allowing a trimmed code snippet when it "encodes a decision more precisely
than prose can." The audit template's `Core interface signatures` section
effectively promotes that narrow exception into a mandatory, always-present
section for the audit case. This is a defensible choice (Phase 4's target
architecture genuinely needs concrete signatures per design.md's own user
story 11), and it does not duplicate wording or contradict the design
template outright, but the two sections will sit side by side in the
composed `design.md` covering adjacent ground, and nothing in either template
tells the command how to keep "Implementation Decisions" from restating what
"Core interface signatures" already says. Worth a line in task 08 clarifying
that Implementation Decisions should not re-list interface signatures once
the audit-specific section exists, but not a defect in this file alone.

**4. No completeness device for `03-gaps.md`'s verdict table either, though
the task does not name this one explicitly.** The table (line 111-121)
requires file:line per row, which is a per-row completeness check a reader
can perform by scanning one column, but nothing requires that every
inventoried feature from `01-current.md`'s Feature and business-rule
inventory gets a row at all. This is the row-count version of Issue 1 and
shares its fix (a stated count to check against), but since the task's
acceptance criteria only call out per-module completeness by name, I am not
raising this to Important.

## Assessment

**Task quality:** Needs fixes.

**Reasoning:** The file is well-built where the task's own attention was
sharpest (Areas not covered, Recommendation/Defeater), which shows the author
understood the structural-versus-prose distinction the review was calibrated
against, but applied it unevenly: the per-module verdict table gets only a
sentence for a completeness requirement the design states three times, and
the template independently states a retry policy that belongs to task 08's
command, creating a duplicated fact across the process/shape boundary the
task was explicitly built to preserve. Neither issue fails a gate; both are
the kind of gap that only surfaces once an agent actually fills the template
in.
