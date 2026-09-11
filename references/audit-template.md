# Audit document template

Written by `/fx:audit` to the artifacts its phases produce inside
`docs/plans/YYYY-MM-DD-<slug>/`: `01-current.md`, `02-reference.md`,
`03-gaps.md`, and the audit-specific sections Phase 4 appends to `design.md`.
Use the project's domain vocabulary throughout, and give every claim that
names one a file and a line.

## Table of contents

- [`01-current.md`](#01-currentmd)
- [`02-reference.md`](#02-referencemd)
- [`03-gaps.md`](#03-gapsmd)
- [Sections Phase 4 appends to `design.md`](#sections-phase-4-appends-to-designmd)

---

## `01-current.md`

Phase 1's map of the system as it stands today.

```markdown
# Current system: <slug>

**Date:** YYYY-MM-DD
**Phase:** 1 of 4
**Sources:** one line per explorer dispatched: the area it covered and the
files it read.

## Domain model and glossary

The nouns and terms this system uses, in its own vocabulary rather than a
borrowed one. One line per term: what it means here, and where it is defined.

## End-to-end flow

The path one unit of work takes from entry to completion, named as steps a
reader can follow without opening a file.

## Feature and business-rule inventory

A flat list. Each feature or rule names the file and line that implements it,
so a later rewrite has something concrete to be checked against.

## Patterns and file structure

The structural conventions actually in use: layering, naming, and where a new
instance of a recurring shape gets added today.

## What the system does well

Named with evidence, not asserted. Each claim cites a file and line.

## What the system does badly

Same standard as above: a file and a line per claim.

## Areas not covered

Every area this phase found nothing on. Name the area and why it stayed
uncovered. Write this section even when it is empty, because an absent
section reads as a complete map rather than an honestly bounded one: "None:
every area returned findings."
```

## `02-reference.md`

Phase 2's map of the comparison system, only written when a reference was
named. Same headings as `01-current.md`, aimed at a different tree.

```markdown
# Reference system: <what was compared against>

**Date:** YYYY-MM-DD
**Phase:** 2 of 4
**Resolved from:** the filesystem path, branch, tag or revision exactly as it
was given.
**Read at:** the commit or revision actually read, not the name of the ref.

## Domain model and glossary

## End-to-end flow

## Feature and business-rule inventory

## Patterns and file structure

## What the system does well

## What the system does badly

## Areas not covered

Same six headings as `01-current.md`, same evidence standard: every claim
carries a file and line in the reference tree, not the current one.
```

## `03-gaps.md`

Phase 3's verdict against the current map, and against the reference map when
one exists.

```markdown
# Gap report: <slug>

**Date:** YYYY-MM-DD
**Phase:** 3 of 4
**Compared against:** the current system alone, or the current system against
the named reference.
**Stated targets:** every target named in the brief the audit was invoked
with, quoted verbatim, one per line, each line followed by where it came
from: the invocation text itself, or the path of a file the user pointed to.
Quoted, never paraphrased or summarized. A brief that named no targets still
gets this field, written as: "None: the brief named no targets."

## Verdict table

**Feature count:** <N> features and business rules listed in
`01-current.md`'s feature and business-rule inventory, plus `02-reference.md`'s
when a reference run exists. **Target count:** <N>, the number of target
lines recorded in this report's own **Stated targets** field above, not a
count composed for this table. **Row count:** <N> rows below. The row count
must equal feature count plus target count: a shortfall means one was
silently dropped from the table.

One row per feature and per stated target. Every row carries a file and a
line: a verdict without one is an opinion, not a finding. Rows are ordered
highest impact first, so a reader who stops partway down still has the rows
that matter.

| Feature / target | Verdict | File:line | Impact | Note |
|---|---|---|---|---|
| <name> | correct \| wrong \| missing \| over-engineered | <path:line> | high \| medium \| low | <one line> |

## Lens findings

Findings from the lenses dispatched in this phase, each carrying the same
file, line and verdict standard as the table above.
```

## Sections Phase 4 appends to `design.md`

Phase 4 writes the target architecture as `design.md`, using the standard
document sections for the parts that are the same shape as any other design,
and appending the sections below for the parts an audit adds on top: the
target shape of a system that already exists, not one yet to be built.

```markdown
## Proposed folder tree

The target layout, as a tree rather than prose. Every top-level entry gets one
line saying what moves into it.

## Core interface signatures

The signatures a builder needs, not a working implementation. Each signature
names the module it belongs to.

## Lifecycle diagram

A Mermaid diagram, fenced as `mermaid`, tracing one unit of work from entry to
completion through the target shape.

## Per-module verdict

**Module count:** <N> modules listed in `01-current.md`'s patterns and file
structure section. **Row count:** <N> rows below. The two numbers must
match: a lower row count means a module went silently unaccounted for. Four
verdicts only.

| Module | Verdict | Reason |
|---|---|---|
| <name> | keep \| refactor \| rewrite \| delete | <one line, citing a file:line> |

## Add-a-new-provider walkthrough

The exact modules a new provider would touch, in order, naming the interface
each one implements. A claim of extensibility is demonstrated here, not
asserted in prose elsewhere.

## Recommendation

Incremental refactor or rewrite, stated once, argued from the evidence already
written down in `03-gaps.md`'s verdict table.

## Defeater

What would have to be true for the opposite recommendation to win. Not a
hedge: a stated, checkable condition. A recommendation that cannot name one is
a preference wearing a verdict.
```
