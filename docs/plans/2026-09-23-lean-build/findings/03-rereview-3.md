# Task 03 re-review, fix round 3

Base 5fada95, head 602d43a. Ledger Ruling K.

### Finding verdicts (ADDRESSED | NOT ADDRESSED with file:line)

1. path-escape: ADDRESSED. `tasks/01-store.md:9` now reads only "Names come
   from the command line." The rule and `err.code === 'EBADNAME'` moved to
   `design.md:38` ("A name that would resolve outside `NOTES_DIR` is
   rejected: `err.code === 'EBADNAME'`."), under a new `## Storage and
   search rules` section between `## Decisions` and `## Global Constraints`.

2. missing-note-error: ADDRESSED. `tasks/01-store.md:9-10` now reads only
   "Callers must be able to tell a missing note from an empty one." The
   `err.code === 'ENOTE'` rule moved to `design.md:39`.

3. search-case: ADDRESSED. `tasks/05-search.md:9-10` no longer says queries
   come in any case; the sentence was removed with no replacement, as
   instructed. The rule moved to `design.md:40` ("Search matches a query
   against a note's text without regard to case.").

4. No leak elsewhere in the fixture plan: ADDRESSED. Grepped
   `tests/fixture-build/repo` for `EBADNAME`, `ENOTE`, and case-insensitivity
   phrasing (`any case|case-insensitiv|regardless of case|without regard to
   case`): each returns exactly one hit, all three in `design.md`'s new
   section, none in a Global Constraints line, an acceptance criterion, or
   an example test in any task file. Confirmed by reading `01-store.md`,
   `03-readme-usage.md`, `04-export.md`, `05-search.md`, `06-cli-export-
   search.md` directly: readme-example, export-order and cli-wiring task
   prose is byte-identical to the pre-fix state (not in the diff at all).
   `grep -ril trap tests/fixture-build/repo` returns nothing. The diff
   touches only `design.md`, `tasks/01-store.md`, `tasks/05-search.md`,
   `README.md`, `rows/01-fixture-build.sh` and `run.sh`; no hidden test file
   (`hidden/traps.test.js`, `hidden/traps.self-test.js`,
   `hidden/implementer-heads.js`, `hidden/implementer-heads.test.js`) is in
   the diff. Ran `node tests/fixture-build/hidden/traps.self-test.js`: still
   green, unchanged, as the report claims.

5. FX_FIXTURE_KEEP: ADDRESSED. `rows/01-fixture-build.sh` adds a block
   between the cost step (9) and the result write (10): when
   `FX_FIXTURE_KEEP` is set, it `mkdir -p`s
   `$FX_FIXTURE_KEEP/$FX_FIXTURE_LABEL-$FX_FIXTURE_RUN` and `cp -a`s
   `$CLAUDE_CONFIG_DIR/projects/$enc/.` into it, reusing the `enc` already
   computed at step 5 for the controller transcript lookup, so the copy
   carries the controller jsonl and any `subagents/` subtree under the same
   project directory. Both the `mkdir -p` and the `cp -a` are guarded with
   `|| fail "keep: ..."`, naming the keep step on failure, consistent with
   every other scorer step in the row. This runs well before the scratch
   home is removed: the row script's own process is what has `HOME` and
   `CLAUDE_CONFIG_DIR` pointed at scratch, and the outer
   `tests/conformance/run.sh` only removes `$SCRATCH` in its own `trap
   'rm -rf -- "$SCRATCH"' EXIT`, which fires after the row script (and this
   block) has already returned. `run.sh` (the fixture one) passes
   `FX_FIXTURE_KEEP="${FX_FIXTURE_KEEP:-}"` through to the conformance
   runner, same pattern as the existing `FX_FIXTURE_PARALLEL`. `README.md`
   documents it under "The one command": "Set `FX_FIXTURE_KEEP=<dir>` to
   keep each run's controller and subagent transcripts under
   `<dir>/<label>-<n>/` before the scratch home they ran in is removed."
   `bash -n` passes on both shell files.

### Hidden-test satisfiability judgment

Yes. `EBADNAME` and `ENOTE` are stated in `design.md`'s body (new
`## Storage and search rules` section), which is part of the plan an
implementer or a reviewer reads in full; only `fx-implement`'s copy-into-
dispatch mechanism is limited to Global Constraints, and the new section sits
outside that block on purpose. A build that follows the design as written
(not just the task prose in isolation) still satisfies `path-escape`,
`missing-note-error`, and `search-case`. This is the intended effect of
Ruling K: harder for an implementer to notice from task prose alone, still
fully specified for anyone who reads the design.

### New breakage in the fix diff

None found. `bash -n` clean on both shell files.
`node tests/fixture-build/hidden/traps.self-test.js` still passes, unchanged
from the pre-fix-round-3 state, matching the report's claim that it was
deliberately left untouched. The `${FX_FIXTURE_KEEP:-}` reference is safe
under the row's `set -uo pipefail`. No existing step's numbering, ordering,
or `fail` message conventions were disturbed by the insertion.

### Out-of-scope observations

- The report notes it did not edit the trap table in
  `docs/plans/2026-09-23-lean-build/tasks/03-seeded-fixture-build.md` itself,
  which still describes the three trap sentences as living in task prose.
  That is a known, flagged inconsistency between the historical task file
  and the ledger's Ruling K amendment, not a defect in this fix round's
  diff; the task file text under review here already carries the amended
  wording in its own "Tasks and traps" section note ("Ruling K, after the
  smoke run: ... keep only a weak hint in task prose").
- `tests/conformance/run.sh` does not scrub or allow-list environment
  variables at all (no `unset`/`env -i` pattern found), so there was nothing
  to allow-list for `FX_FIXTURE_KEEP`; this matches the same conclusion
  already reached for the other `FX_FIXTURE_*` variables and is unchanged by
  this round.

### Verdict

All 5 ledger items ADDRESSED. No new breakage. Hidden tests remain
satisfiable by a build that follows the design.
