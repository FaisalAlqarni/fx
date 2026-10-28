# Final review: unprimed devil's advocate (code mode, HEAD 85ab7b7)

10 findings, recorded by the controller.

1. Critical. sf-evidence.ts:36-37, sf-detect.ts:83-84, sf-stale.ts:104, skills/fx-docs/SKILL.md:75-86: system_flow.roots paths and the ../<id> default resolve against --root; fx-docs branch mode runs in <repo>/.worktrees/<slug>, so ../advantage-guide points nowhere; detect exits 1, build --only fails, stale skips silently. Fix: resolve from the main working tree when the host is a linked worktree; stale lists a missing root; fixture test from git worktree add.
2. Important. sf-build.ts:67-81: check --fragment filters by fragment only when there are no problems; another fragment's problems fail the caller and block parallel area agents. Fix: filter by only before the gate, load others leniently as warnings.
3. Important. sf-build.ts:199, :213: build --only never rewrites stores.md, coverage.md or index.md but rewrites coverage.json. Fix: rewrite stores.md on a store handle, always rewrite coverage.md and index docs; tests.
4. Important. sf-evidence.ts:29-30, :49, sf-detect.ts:95, planning.md:66-70: address() keeps userinfo of https://user:token@host remotes; detect prints it and the model commits it. Fix: strip userinfo in address(); check rejects a remote with credentials.
5. Important. sf-stale.ts:122-146, system-flow.ts:164: verify stamps HEAD without checking evidence. Fix: run verifyEvidence in build mode first, exit 1 and write nothing on failure.
6. Important. skills/fx-system-flow/SKILL.md:70-71, sf-corrections.ts:51-58: a full rebuild needs a corrections entry per replaced item. Needs a decision.
7. Important. sf-diagrams.ts:346-364, sf-build.ts:329: archify spawn has no timeout and drops stderr; reason names a receipt that may not exist.
8. Important. proof/results-b.md:103, :105-117: visual-check row only covered 390 overflow; the full check is future tense; the estimate predates defect 6.
9. Minor. skills/fx-docs/SKILL.md:80-85, sf-build.ts:173: fx-docs may pass removed handles to verify and build --only.
10. Minor. sf-theme.ts:178: Tailwind regex accepts 4 and 5 digit hex, lum gives NaN, rgba(NaN) reaches archify.
