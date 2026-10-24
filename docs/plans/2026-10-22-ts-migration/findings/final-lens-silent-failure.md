Lens: silent-failure, branch pass. 6 findings.

1. [Important] scripts/check-generated line 49: the codex diff is wrapped with or-true, so a missing or unreadable codex/agents writes only to stderr, DIFF is empty, and the gate prints OK. Pre-existing line, retargeted by this branch.
2. [Important] scripts/check-generated line 25 and scripts/build line 41: find runs in unchecked process substitutions; a find failure builds nothing and exits 0; compare then walks an empty tree and passes; the compare is one-directional (a committed generated file with no built counterpart is never flagged); nothing asserts a nonzero count, unlike check-handwritten-js line 43.
3. [Important] scripts/check-ts-escapes line 45: the any detector misses later generic arguments (Record or Map with any), union any, assignment any and @ts-nocheck; tests/gates/ts-toolchain.test.sh lines 60 to 67 pin only three shapes.
4. [Minor] scripts/check-handwritten-js line 35: accepts any header naming an existing src/ path without checking it builds to this file (same as the security lens finding 3).
5. [Minor] src/hooks/fx-pretooluse.ts line 89: unparseable stdin exits 0 silently (as the old hook did); inconsistent with null-payload deny (line 92) and fx-codex.ts line 240.
6. [Minor] src/tests/review-bench/build-case.test.ts line 119: catch discards child output, so a failure names the case but not why (carried over from the old JS).

Not findings: fail-closed load catches in hooks and plugins; documented best-effort swallows (fx-context.ts lines 35 and 58, plant-roles.ts line 213, fx-opencode-v2.ts line 106, server.cts); index.ts v1 fallback; build-cost.ts stricter readRecords and documented toMs; test-scope.ts line 115 status fallback.
