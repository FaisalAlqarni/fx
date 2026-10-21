### Finding verdicts

- **Review Important 1 (cost signal read in §3 before §5 produces it)**: ADDRESSED. skills/fx-implement/SKILL.md §3 (line ~556) now runs `build-cost --task <NN> --since <dispatch time>` before the reviewer dispatch and passes a `fx-tdd 0/<i>` line to it; §5 (line 672) runs it again and ledgers the line, matching the controller's ruling. tests/gates/ledger-lines.test.js pins section order (s3 index of `fx-tdd 0/` after `build-cost --task`) and §5 ledgering. Section slice headings exist (lines 540, 655, 672, 704). I ran the gate: ledger-lines: OK.
- **Lens Important 1 (silent undercount: unreadable subagent file, unlistable subagents dir, no timestamps, exit-2 contradiction)**: ADDRESSED. scripts/build-cost:17 `fail` throws CliError; taskLine (~line 257) catches it and prints `Task NN: cost unavailable (<reason>)`, exit 0. :288 tolerates only ENOENT; :294 fails on a null subagent read; :279 fails on no timestamps (no more `-Infinity`/NaN). Whole-build path still exits 2 via the top-level catch (end of file). Tests in scripts/build-cost.test.js cover all four cases with exact output. Note: the invalid `--since` case now also prints an unavailable line and exits 0, consistent with the contract.
- **Lens Important 2 (stale transcript-path never cleared; reasons undistinguished)**: ADDRESSED. hooks/fx-context.js:25-34 clears the file on no `transcript_path`, git spawn error/timeout (status null), unexpected status, or write error; leaves it only for check-ignore exit 1, as the controller ruled; never creates `.fx/`. tests/gates/transcript-path.test.js covers missing transcript_path, git absent (PATH), and no `.fx/` creation. I ran the gate: transcript-path: OK. The two reasons ("no transcript recorded" vs "transcript not found: <path>") stay distinct; no further split of the four absence causes was required by the rulings.

### New breakage in the fix diff

- Minor: scripts/build-cost:~283 `Math.max(...stamps)` spreads every controller timestamp as arguments; a transcript with roughly 100k+ records would throw an uncaught RangeError (exit 1, stack trace) and break the one-line exit-0 contract. Present before the fix as well, but the fix claims to close that contract. Use a reduce.
- Minor: hooks/fx-context.js:29 the `typeof transcript !== 'string'` clear path and git-status-1 leave-alone path are covered by comment and ruling; the status-1 stale case has no test (ruled acceptable). No action.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 01: fix round 1/5 (3 addressed, 0 open: none; commits ffd5ce2..294c4cc)
Task 01: minor (deferred): build-cost --task spreads all controller timestamps into Math.max; a very large transcript throws RangeError, breaking the one-line exit-0 contract.
