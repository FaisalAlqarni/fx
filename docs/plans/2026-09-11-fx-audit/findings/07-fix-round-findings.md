# Task 07 fix round: verification findings

Scope: the two Important findings from the prior review of
`references/audit-template.md`, and the fix diff
`.fx/2026-09-11-fx-audit/review/task07-fix-scoped.diff` (7d39c0b to 4501684,
path scoped to `references/audit-template.md`). Nothing else was reviewed.

## Finding 1: per-module and gap tables lack a structural completeness device

**Verdict: NOT ADDRESSED.**

The fix adds a count-reconciliation line above each table:

- Per-module verdict, `references/audit-template.md:157-160`:
  > **Module count:** <N> modules listed in `01-current.md`'s patterns and
  > file structure section. **Row count:** <N> rows below. The two numbers
  > must match: a lower row count means a module went silently unaccounted
  > for. Four verdicts only.

- Gap verdict table, `references/audit-template.md:113-115`:
  > **Target count:** <N> features and stated targets identified. **Row
  > count:** <N> rows below. The two numbers must match: a lower row count
  > means a target was silently dropped from the table.

The module-table line passes the test the task asked me to apply. Its `N` is
named against an external, already-written document: "modules listed in
`01-current.md`'s patterns and file structure section." An agent filling the
table cannot get that number for free from the table it is filling; it has
to go count something in a separate, fixed file, and a reader can open that
file and check the claim independently. Writing a lower total and a matching
row count means going back and understating that separate document's count,
not just picking two equal numbers.

The gap-table line does not pass. "Features and stated targets identified"
names no document and no section. Nothing in `01-current.md` or
`02-reference.md` is cited as the source of that count, unlike the module
line's explicit pointer to "patterns and file structure." An agent can write
"Target count: 3" next to "Row count: 3" for a table that covers three of
ten stated targets, and the claim is true by construction: three were
"identified" because three were written down. That is exactly the device the
task warned against: one that is satisfied by a number matching whatever
rows exist, not by the number of targets in the system. A reader has no
in-document way to catch the shortfall, and no second file to open and
check against, the way they do for the module table.

The report frames both additions as "the same fix applied" and "phrased in
the gap report's own vocabulary." The wording changed to fit the section,
but the load-bearing part, an external anchor the count is drawn from, was
only carried into the module table. The natural anchor for the gap table
exists and was not used: `01-current.md`'s Feature and business-rule
inventory is already a flat list with a file and line per entry
(`references/audit-template.md:40-43`), the same kind of enumerable source
the module count points at. Citing it (and `02-reference.md`'s equivalent
section, when a reference run exists) would close this the same way the
module table is closed.

This is the pair the original review and the coordinator's note both called
out by name: fixing one half of a mirrored pair without the other is worse
than fixing neither, because the report can now claim the finding is closed
in full.

## Finding 2: retry policy duplicated from the command's criteria

**Verdict: ADDRESSED**, `references/audit-template.md:58-63`.

Before:
> Every area an explorer returned nothing on, after one re-dispatch with
> more context. Name the area and why it stayed uncovered. [...] "None:
> every dispatched area returned findings."

After:
> Every area this phase found nothing on. Name the area and why it stayed
> uncovered. Write this section even when it is empty, because an absent
> section reads as a complete map rather than an honestly bounded one:
> "None: every area returned findings."

The clause that stated *when* an area qualifies, "after one re-dispatch with
more context", is gone, along with the matching word "dispatched" in the
fallback string, which named the same retry mechanism from the other side.
`tasks/08-fx-audit-command.md:62` still carries that operational rule on its
own, as an acceptance criterion for the command, so the rule is not lost,
only no longer stated twice.

What remains in the template still tells a filler what belongs in the
section: an area's name, the reason it stayed uncovered, and the exact
fallback sentence for the empty case. The section's shape survived the cut;
only the timing rule left.

A scan of the rest of the file for `dispatch` found two unrelated uses
(`references/audit-template.md:27`, listing explorer sources, and
`:128`, describing lens findings), neither of which states a retry rule.

## Leaf rule

`grep -n design-template references/audit-template.md` finds nothing, exit
1. `bash scripts/check-reference-leaves` reports OK: no reference links to
another reference. The file still does not name the design template.

## Tests run

- `bash scripts/check-reference-leaves`: OK, exit 0.
- `python3 scripts/check-prose references/audit-template.md`: OK, no dashes,
  no stock vocabulary, parentheses balanced, exit 0.
- `scripts/check-all` was not run, per instruction (another implementer is
  editing `scripts/check-prose` in this checkout).

## New breakage in the fix diff

None. The diff touches only the "Areas not covered" section and the two
count-reconciliation lines. Both gates above pass on the current file, and a
grep for other "one row per X, none missing" style claims in the file
(feature inventory, lens findings, add-a-new-provider walkthrough) found no
further mirror needing the same device, matching the implementer's own
search.

## Out-of-scope observations

None.

## Fix round verdict

Findings remain open: finding 1 is not addressed for the gap-verdict table.
Finding 2 is addressed. No new Critical or Important breakage was
introduced by the diff itself.
