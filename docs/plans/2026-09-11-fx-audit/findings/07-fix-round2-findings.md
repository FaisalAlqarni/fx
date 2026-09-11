# Task 07 fix round 2: verification findings

Scope: the one open item from `07-fix-round-findings.md`, the gap-table
count's "stated targets" half, and the fix diff
`.fx/2026-09-11-fx-audit/review/ecf1312..323f02e.diff` (`ecf1312` to
`323f02e`, one commit, `references/audit-template.md` only). Nothing else
reviewed.

## Finding: gap table count draws both halves from outside the table

**Verdict: NOT ADDRESSED** (one half fixed, one half still open).

Current text, `references/audit-template.md:113-119`:

> **Feature count:** <N> features and business rules listed in
> `01-current.md`'s feature and business-rule inventory, plus
> `02-reference.md`'s when a reference run exists. **Target count:** <N>
> stated targets named in the brief the audit was run with; that brief lives
> outside this document, never inside the table. **Row count:** <N> rows
> below. The row count must equal feature count plus target count: a
> shortfall means one was silently dropped from the table.

**Feature half: closed.** `references/audit-template.md:113-115` points at
`01-current.md`'s feature and business-rule inventory
(`references/audit-template.md:40-43`), a section the same audit writes and
a reader of the finished audit already has open. That section is a flat
list with a file and line per entry, so a reader can count it the same way
the module table's anchor (`references/audit-template.md:161-162`, `01-current.md`'s
patterns and file structure section) already works. The `02-reference.md`
addendum names the mirror section in the second document
(`references/audit-template.md:88`) for when Phase 2 ran. Both are documents
the audit itself produces and a reader of the finished audit holds in hand.
This closes the feature half the same way the module count closed the
per-module table in fix round 1.

**Target half: still open.** `references/audit-template.md:115-117` names
"the brief the audit was run with" and states it "lives outside this
document, never inside the table." That sentence names a category of
source, but not a location. Nothing in the four documents this template
produces (`01-current.md`, `02-reference.md`, `03-gaps.md`, the Phase 4
sections of `design.md`) records what the brief was or where it can be
found. Checked directly:

- `01-current.md`'s skeleton (`references/audit-template.md:22-64`) has no
  field for the invocation's target argument.
- `02-reference.md`'s skeleton has a `Resolved from` field
  (`references/audit-template.md:76-77`) that records the `--against` value
  verbatim, and a `Read at` field for the resolved revision. There is no
  equivalent field anywhere for the plain `target` argument.
- `03-gaps.md`'s skeleton has `Compared against`
  (`references/audit-template.md:108-109`), which records whether Phase 2
  ran, not what the target text was.
- `commands/fx-audit.md` does not exist yet (task 08 is downstream of this
  one); task 08's own acceptance criteria
  (`docs/plans/2026-09-11-fx-audit/tasks/08-fx-audit-command.md:47`) describe
  "an optional target" only as a CLI argument, never as something written
  into a document.

So a reader of the finished audit, holding only `docs/plans/<slug>/`, has no
path, ticket reference, quoted text, or any other pointer to the brief the
line names. "Lives outside this document" is true, but it is not "lives at
a place I can go check": there is no place named. This is the exact gap the
task asked me to test for: the count's ground truth is still something only
the audit's author (the agent that read the original invocation) can verify,
because nothing durable records it. An author could write "Target count: 3"
next to three targets pulled from memory of a brief no later reader can
retrieve, and no one downstream can catch a shortfall, which is the same
unfalsifiable-by-construction failure the original finding named for the
whole line before this round.

**What would close it:** record the brief's actual content, not just its
existence, inside the audit's own output. The minimum fix is a field the
command writes once, at Phase 3 or earlier, holding the target argument
verbatim, the same way `Resolved from` already holds the `--against` value
verbatim (`references/audit-template.md:76-77`). A `03-gaps.md` field such as
`**Target brief:** <the target argument exactly as given, or "none">` would
let "Target count" point at text sitting in the same document tree, closing
the loop entirely inside the audit's own artifacts instead of pointing at an
unnamed, possibly unrecorded, external brief. That change belongs to task 08
(the command that receives the argument), with a one-line addition here to
name the field, but as of this commit neither exists.

Net: the gap table's count line still has one half, the more load-bearing
half given the task's framing, that is not visibly incomplete to a reader of
the finished audit. The finding is closed for features, open for targets.

## The sources line

`references/audit-template.md:27`: "**Sources:** one line per explorer
dispatched: the area it covered and the files it read." The implementer's
argument (report, "Fix round 2," item 2 of the mirror search) is that this
rests on the dispatching agent's own direct knowledge of a run it just
performed, not on a separately existing document it could misreport against.

That argument holds. Modules and targets are facts that exist independently
of the writing agent: a codebase's module count or a user's stated targets
are set before the agent starts writing and can be understated without
detection unless anchored to where they already live. Explorer dispatch is
different in kind: the same agent, in the same turn, decides how many
explorers to dispatch and then writes the Sources line moments later. There
is no separate pre-existing count for it to fall short of; the act of
dispatching and the act of recording are the same agent's memory of its own
immediately preceding actions, not a recall-and-transcribe step over
external material. A reader cannot independently recount explorers the way
they can recount modules in a codebase or line items in a written brief, but
that is because the true count was never externally recorded to begin with,
not because the template hid an available anchor. Nothing in this template
or in task 08's acceptance criteria treats explorer count as a checkable
total (contrast "an explorer returning nothing is re-dispatched once... and
if it returns nothing again the area is listed under Areas not covered,"
`docs/plans/2026-09-11-fx-audit/tasks/08-fx-audit-command.md:62-64`, which
is the actual completeness backstop for missed explorer coverage, and it is
a different, already-addressed mechanism).

I judge this case differs legitimately and does not need the same
external-anchor treatment. Not a finding.

## The mirror search

Re-ran independently: `grep -niE "every|each|one row per|one line per|all
[a-z]+|none may|no .* missing" references/audit-template.md` and a second
pass for `silently|count:`. Matches: lines 6, 27, 33, 42, 52, 60, 63, 94,
113-118, 121, 132, 146, 151, 161-163, 173. Every match maps onto one of the
implementer's 13 numbered items in the report's "Fix round 2" section, and
the two genuine completeness-against-an-external-count claims (per-module
verdict, gap verdict table) are the same two the implementer identified. No
missed instance.

## Leaf rule

`grep -n design-template references/audit-template.md` finds nothing, exit
1. `bash scripts/check-reference-leaves` reports `OK: no reference links to
another reference`, exit 0. The file still does not name the design
template.

## Tests run

- `bash scripts/check-reference-leaves`: OK, exit 0.
- `python3 scripts/check-prose references/audit-template.md`: OK, no dashes,
  no stock vocabulary, parentheses balanced, exit 0.
- `scripts/check-all` was not run, per instruction (another implementer is
  editing it in this checkout).

## New breakage in the fix diff

None. The diff (`ecf1312..323f02e`, `references/audit-template.md` only, 7
insertions/3 deletions) touches only the gap table's count-reconciliation
line, replacing one field with two and updating the reconciliation sentence
to sum them. Both gates pass on the current file. No other section moved,
and the table of contents needed no update since no heading changed.

## Out-of-scope observations

None.

## Verdict

**Fix round:** Finding remains open. The features half of the gap table's
count is now a real, in-audit anchor and closes cleanly. The targets half
names a category of source ("the brief the audit was run with") without
naming or requiring a recorded location for it, so a reader of the finished
audit still cannot check that half from the page. No new Critical or
Important breakage from the diff itself; the sources line does not need the
same fix.
