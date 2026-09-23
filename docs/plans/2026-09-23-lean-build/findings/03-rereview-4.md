# Task 03 re-review, fix round 4 (Ruling L)

Fix base 7e5098b, head f334d73. Diff: tests/fixture-build/hidden/traps.test.js,
tests/fixture-build/hidden/traps.self-test.js only. Confirmed:
tests/fixture-build/repo/ (the fixture plan, including design.md) was not
touched this round.

Ran `node tests/fixture-build/hidden/traps.self-test.js` directly: passes
(`traps self-test: ok`, exit 0), confirming the report's own claim.

### Finding verdicts (ADDRESSED | NOT ADDRESSED with file:line)

1. **ADDRESSED.** tests/fixture-build/hidden/traps.test.js:70-82. The
   `path-escape` trap adds a `rejectsBoth` helper (line 72) that checks both
   `save` and `load` throw `EBADNAME`, then applies it to an absolute path
   inside the trap's own tmp dir (`abs = path.join(tmp, 'abs-target')`, line
   74, with a matching `!fs.existsSync(abs)` check at line 79), to
   `a/../../x` (line 80), and to a bare `..` (line 81). `a/../b` does not
   appear anywhere in the file, confirmed by reading it in full. This is a
   superset of the item's ask: both save and load are checked for every new
   case, not just one as the original two cases did.

2. **ADDRESSED.** tests/fixture-build/hidden/traps.test.js:83-92.
   `missing-note-error` now also saves an empty note (`store.save('empty',
   '')`) and requires `store.load('empty') === ''` with no throw (a thrown
   exception is caught and scored false at line 89-91).

3. **ADDRESSED.** tests/fixture-build/hidden/traps.test.js:123-132.
   `search-case` now also saves a note containing `Hello World` and requires
   `search('wORL')` to find it, after the original all-caps-query check.

4. **ADDRESSED**, with one narrow caveat worth recording, not enough to
   block. All three new path-escape cases (absolute path, `a/../../x`, bare
   `..`) resolve outside NOTES_DIR under `path.resolve` semantics, matching
   design.md's own wording ("resolve outside NOTES_DIR") and matching the
   reference `good` store in traps.self-test.js, which the fix round's
   report independently verified case by case (`path.dirname(f) !== dir()`
   correctly rejects all three and correctly allows `a/../b`). The
   empty-note and mixed-case-inside-word cases are unambiguous restatements
   of design.md's own sentences ("distinct from an empty note", "without
   regard to case"), so no correct implementation can miss them by a
   different reading.
   Caveat: an implementation that builds the target path with `path.join`
   plus a `startsWith(dir())` containment check, instead of `path.resolve`
   plus a dirname-equality check, would not treat an absolute name as
   escaping (join nests it inside NOTES_DIR instead of replacing the base),
   so it would not throw EBADNAME for the new absolute-path case, yet would
   still never write outside NOTES_DIR for any input. This is a legitimate,
   if unusual, design-compliant implementation choice that the new
   absolute-path sub-case could fail. It does not affect the `a/../../x` or
   bare `..` cases, where join and resolve agree. Judged too narrow to
   count as NOT ADDRESSED: the fixture's own reference implementation and
   the overwhelmingly natural way to guard a CLI-supplied note name both use
   the resolve-and-compare pattern this trap tests for.

5. **ADDRESSED.** tests/fixture-build/hidden/traps.self-test.js:87-109 adds
   `onlyDotDotStore` (rejects only names containing `..`, line 87-93),
   `emptyIsMissingStore` (treats a read-back empty file as missing, line
   96-102), and `queryOnlyLowerSearch` (lower-cases only the query, line
   106-109), each scored with `--only` against its own trap and each
   asserted `false` (lines 136-141). Traced each bug by hand against the
   trap logic: `onlyDotDotStore` passes the `..`-containing old and new
   cases but lets the absolute path (which contains no `..` substring)
   write straight into `abs`, correctly reading `path-escape: false`.
   `emptyIsMissingStore` throws ENOTE on `store.load('empty')` because the
   read-back content is falsy, correctly reading `missing-note-error:
   false`. `queryOnlyLowerSearch` lower-cases `wORL` to `worl` but leaves
   `Hello World` unlowered, so the `includes` check fails, correctly
   reading `search-case: false`. The good build still scores all six
   `true` (lines 120-123); `bad`'s three already-false traps are unaffected
   since the three new cases are `&&`-chained or early-return after the
   original cases, never independently flipping a trap that was already
   true. Every trap still returns a single boolean via `TRAPS[name](tmp)
   === true` (traps.test.js:181), unchanged this round.

### New breakage in the fix diff

None found. The diff touches only the six comment blocks and the bodies of
`path-escape`, `missing-note-error`, and `search-case` in traps.test.js, plus
three new fixtures and three new assertions in traps.self-test.js.
`readme-example`, `export-order`, and `cli-wiring` are untouched except for
comments. Ran the full self-test directly: all nine assertions pass,
including the six pre-existing ones (good, bad, `--only` subset, the two
cli-wiring CLI-shape variants, the NOTES_DIR-overriding README), so nothing
regressed.

### Out-of-scope observations

- The absolute-path and `a/../../x` write checks are not independently
  re-verified after their own case: the absolute-path case gets its own
  `!fs.existsSync(abs)` check, but `a/../../x` resolves to the exact same
  physical path as the original `../x` case (both collapse to `<tmp>/x`
  under `path.resolve`), and the pre-existing `!fs.existsSync(tmp/x)` check
  runs before `a/../../x` is tested, not after. In practice this is
  redundant with, not a gap in, the `EBADNAME` check: a build that fails to
  throw for `a/../../x` already fails `rejectsBoth` on that basis alone; a
  build that throws `EBADNAME` for the wrong reason while still writing the
  file first is the only scenario this would miss, and no such build exists
  among the fixture's known planted bugs. The bare `..` case needs no
  write check: it resolves to `tmp` itself, an existing directory, and
  `fs.writeFileSync` against an existing directory throws `EISDIR`, not
  `EBADNAME`, so a build without the check already fails `rejectsBoth`
  through a different, still-correct, path.
- design.md, tasks/01-store.md, and tasks/05-search.md were re-read to
  confirm the "Storage and search rules" section's exact wording backs each
  new trap case; none were modified this round, matching the report and the
  diff's file list.

### Verdict

Round verdict: PASS. All five items addressed; the one caveat under item 4
is recorded but judged not blocking.
