# Task 09 fix round 1: controller re-review

Fix diff d878184..6933924: 3 files, 10 insertions, 9 deletions, all Markdown (docs/adr/0037, INSTALL.md, README.md), every file already in task 09's diff; no test assertion touched. Qualifies under fix-loop.md's small-fix rule.

### Finding verdicts

1. ADR-0037 layer 3 described as "same predicate": ADDRESSED. It now says layer 3 carries no predicate and throws for every shell call when `permission.evaluate` failed to register, inactive otherwise; matches plugins/fx-opencode-v2.js as reported by the implementer at lines 94-99.
2. ADR-0037 `external_directory` rule inverted: ADDRESSED. ADR and INSTALL.md now say the hook allows `external_directory` only under fx's references and denies everything else for fx's read-only agents.

### New breakage in the fix diff

None. The added "read from the 2.0.18 source, not probed" qualifiers narrow claims, they do not widen them. README's hidden-lane sentence now distinguishes 1.x and 2.x, consistent with ADR-0025 and task 04.

## Ledger lines

Task 09: fix round 1/5: controller re-review (0 production lines, 19 doc lines): 2 addressed, 0 open
