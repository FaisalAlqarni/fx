# Task 03 re-review, fix round 5 (Ruling M)

Fix base 5d4863c, head 2ab1c3f. Diff: tests/fixture-build/hidden/traps.self-test.js, tests/fixture-build/hidden/traps.test.js.

### Finding verdicts (ADDRESSED | NOT ADDRESSED with file:line)

1. Ruling M core ask (absolute-path case scores safety, not EBADNAME): ADDRESSED.
   tests/fixture-build/hidden/traps.test.js:84-96 replaces the old `rejectsBoth(abs)` requirement with a safety check: `saveSafe` (line 87) verifies the pre-existing file at `abs` is untouched after `store.save(abs, 'y')`, and `loadSafe` (line 89) verifies `store.load(abs)` does not return that file's original content. Both treat a thrown exception as safe.
   Self-test confirms both required cases: `joinStartsWithStore` (tests/fixture-build/hidden/traps.self-test.js:117-131, a path.join plus startsWith store that nests an absolute name inside NOTES_DIR instead of throwing) scores `path-escape: true` (self-test.js:164-165). `onlyDotDotStore` ("rejects only names containing `..`", self-test.js:87-93) still scores `path-escape: false` (self-test.js:158-159), unchanged from before this round.

2. `a/../../x` and bare `..` still require EBADNAME: ADDRESSED. traps.test.js:95-96 keep `rejectsBoth('a/../../x')` and `rejectsBoth('..')`, both still built on `throwsCode(..., 'EBADNAME')`. Not touched by this diff beyond an unrelated comment reflow.

3. Judge question, can a store that does leak (reads or writes outside NOTES_DIR for an absolute name) still score true through this relaxation: NOT ADDRESSED.
   Verified by running the scorer against a constructed store whose `file()` sends an absolute name to a *different* location outside NOTES_DIR (a scratch directory, not the pre-existing `abs-target` file, and not nested under NOTES_DIR), never throwing:
   ```
   node tests/fixture-build/hidden/traps.test.js <fixture-dir> --only path-escape
   -> {"path-escape":true}
   ```
   and the write actually landed outside NOTES_DIR (confirmed a file appeared at `<tmpdir>/leaky-store-out/abs-target` containing the saved text `y`).
   Root cause: `saveSafe` (traps.test.js:87) only checks that the one pre-existing file at `abs` was not overwritten; `loadSafe` (traps.test.js:89) only checks that the loaded value differs from that one file's original content. Neither checks that whatever `store.save`/`store.load` actually touched lives under NOTES_DIR (no `startsWith(dir())` or equivalent). A store can dodge both checks by writing to and reading from some third location outside NOTES_DIR, which is exactly the "reads or writes outside NOTES_DIR" case Ruling M's own rationale says must stay unsafe ("design.md's rule rejects a name that would resolve outside NOTES_DIR... Safe: save never writes at the real absolute target... load never returns that real target's content"). The check as written proves neither "nothing was written outside NOTES_DIR" nor "nothing was read from outside NOTES_DIR" in general, only that one specific file was not clobbered.

### New breakage in the fix diff

None. The diff does not weaken or remove the `..`, `../x`, `a/../../x` traversal checks (rejectsBoth still requires EBADNAME on all of them), and it does not touch missing-note-error, search-case, export-order, readme-example, or cli-wiring.

### Out-of-scope observations

- The self-test has no "leaking store" bad-fixture (a store that sends absolute names to a third location outside both NOTES_DIR and the pre-existing target). Without one, this exact hole has no regression guard. Not this task's decision to add scope five rounds in; flagging for the owner.
- Closing the hole properly likely needs a positive containment check (e.g., record NOTES_DIR's tree before and after, or require the trap to detect any file written outside NOTES_DIR during the absolute-name save), which is more than a one-line fix; adjudication, not another quick fix-round patch, seems right here.

### Verdict

Round 5 addresses everything the ledger asked it to fix (the two self-test assertions named in the ruling both pass) but the relaxation as implemented is broader than Ruling M's own stated intent: a store that genuinely leaks reads or writes to a third location outside NOTES_DIR still scores `path-escape: true`. This is a real, demonstrated gap, not a hypothetical one. Recommend adjudication rather than a sixth fix round, per the ledger's rule that task 03 has no rounds left.
