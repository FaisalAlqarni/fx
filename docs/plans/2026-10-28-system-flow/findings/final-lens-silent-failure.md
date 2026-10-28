# Final review: silent-failure lens (branch mode, HEAD 85ab7b7)

13 findings, recorded verbatim in substance by the controller.

1. Critical. src/lib/sf-stale.ts:32 and :104: loadModelItems keeps only .roots from resolveRoots and drops its problems; staleItems skips a missing or git-less or HEAD-less root and still emits out[root.id] = []; `system-flow stale` prints an empty list and exits 0 for a root never checked. verify at sf-stale.ts:136-138 leaves an item whose only root has no HEAD out of verified silently, and lists a two-root item verified when one root was stamped.
2. Important. src/lib/sf-build.ts:91 with :352-354: a generated output that exists without the marker goes to collisions and is skipped, yet the build is ok, exits 0 and stamps fragments; nothing in skills/fx-system-flow reads collisions.
3. Important. src/lib/sf-diagrams.ts:358-359: archify runs with stdio ignore; --json output, stderr and the error event are dropped; sf-build.ts:290 records receiptOf even when the receipt is null, so the fallback reason at sf-build.ts:329 can point at a missing file.
4. Important. src/lib/sf-diagrams.ts:358: archify is spawned with no timeout; a hung finalize hangs build forever.
5. Important. src/lib/sf-diagrams.ts:336: a configured system_flow.diagrams.archify folder without bin/archify.mjs is skipped silently and reported as "archify not installed"; an explicit --archify path is never checked.
6. Important. src/lib/sf-corrections.ts:17: the catch fires only on a real git failure, then the HEAD model is empty and every changed fact passes without a corrections entry or warning.
7. Important. src/lib/sf-layout.ts:323 and :334: ELK exceptions are dropped; "ELK laid out no variant" has no cause; partial throws surface as "split it one level down".
8. Important. src/scripts/system-flow.ts:181: the top-level catch prints only the first line of the message for every error, TypeError included; the stack is lost.
9. Important. src/scripts/build-cost.ts:388: main reads the shared recordedTranscript slot with no check that it belongs to this session and never names the file read.
10. Important. src/lib/sf-evidence.ts:14, :48, :62, :81: git failures become null with stderr ignored; a refused root (safe.directory, unborn HEAD) shows as "file missing" for every entry; :67 a failed git status gives an empty dirty set so the uncommitted-changes error never fires.
11. Minor. src/lib/sf-model.ts:248-252, sf-stale.ts:144: stamps written file by file with no rollback; sf-build.ts:353 saveChoices runs after stampVerified, so a throw leaves fragments changed.
12. Minor. src/lib/sf-theme.ts:227-228, :215, :107: fallback to fx theme records no candidates seen or rejection reasons; unparsable brand JSON and CSS over 1 MB dropped silently.
13. Minor. src/lib/doc-index.ts:152: @root paths dropped in a mixed claim, verdict can be free; depends on whether hand-written docs carry @root evidence.
