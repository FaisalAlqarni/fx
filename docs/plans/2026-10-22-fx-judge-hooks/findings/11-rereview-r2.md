### Finding verdicts

**1. Lens SEC I2, Windows half: ADDRESSED.**
- Windows console: `commands/fx-setup.md:334`, `skills/fx-setup/SKILL.md:337` and `INSTALL.md:332` all say to end typed input with Ctrl-Z then Enter, not Ctrl-D. That is correct for a Windows console.
- PowerShell redirect: the three files say PowerShell rejects `<` and give `Get-Content keyfile | node ... --api-key-stdin`. Both statements are correct. Piping adds no BOM, and the trailing newline is harmless because `src/lib/judge-cli.ts:70` takes the first line and trims it.
- PowerShell history: `$env:NAME = 'key'` is named as recorded, with PSReadLine's `ConsoleHost_history.txt`. Locations: `commands/fx-setup.md:341`, `skills/fx-setup/SKILL.md:344`, `INSTALL.md:339`.
- POSIX notes: all three files now say Enter then Ctrl-D, and that a single Ctrl-D after a line with no newline does nothing. They also say to delete the key file afterwards, and that a typed key may show on screen. The Windows key-file protection note ("user profile's access rules, not a mode") is in `INSTALL.md:340-341` only. That is fine for a reference doc.
- Agreement: `commands/fx-setup.md` and `skills/fx-setup/SKILL.md` carry the same text. The hunks are identical apart from line offsets, and the report says `check-generated` passed. `INSTALL.md` has the same content in a bullet layout, with no contradiction.
- The leftover-temp-file sentence is in all three files: `commands/fx-setup.md:345`, `skills/fx-setup/SKILL.md:348`, `INSTALL.md:341`.
- Not verified, and also unverified by the implementer: that `readFileSync(0)` reads a typed key on a live Windows console.

**2. Ruling: the catch removes only a temp file this process created: ADDRESSED.**
- `src/lib/judge-cli.ts:86-93`: `created` is set to true only after `writeFileSync(..., { flag: 'wx' })` returns (`:89`). The catch calls `rmSync` only when `created` is true (`:93`).
- An EEXIST from `wx` throws before `created` is set, so a foreign entry at the temp name is never deleted.
- The built `lib/judge-cli.js` has the same guard.
- The docs sentence about deleting a leftover `.judge.json.*.tmp` is present (see item 1).
- Limit: the EEXIST half has no test, because the temp name holds the pid and a millisecond timestamp. The report admits this, so that half rests on reading only.

### New breakage in the fix diff

No Critical and no Important.

1. **Minor, partial-write leak:** `created` is set only after `writeFileSync` returns. If the open succeeds and the write then fails (ENOSPC, EIO), the 0600 temp file stays behind with a partial or complete key. The catch skips it, so the guard is too strict in that direction. The docs only cover the "killed part-way" case. A tighter fix would track creation on a separate `openSync` with `wx`, or remove after any non-EEXIST error. It is the same risk class as the ruling, but small.
2. **Minor, unproven guard:** no test fails if the `if (created)` guard is dropped and `rmSync` runs unconditionally. The EEXIST branch is covered by reading only.
3. **Minor, the success-path assertion proves nothing about the catch:** the first `leftovers()` assertion passes with or without the catch removal. Only the rename-failure case bites.

### Tests evidence

- I ran nothing and had no shell. Everything below comes from the diff and the report's "Fix round 2" section, which is the implementer's claim.
- **RED claimed for the removal, with runtime output:** the report says the temp removal was taken out of the catch, and `node tests/gates/judge-cli.test.js` then failed at `tests/gates/judge-cli.test.js:156`. The actual value was `[ '.judge.json.1738488.1792779627816.tmp' ]` and the expected value was `[]`.
  - Reading agrees. The test puts a non-empty directory at the `judge.json` path, so `renameSync` fails after the temp file is created. The expected result is exit 1, a stderr starting `judge: could not write `, and no `.judge.json.*` entry left in the config directory.
  - Dropping the `rmSync` leaves the temp file, and the `deepStrictEqual` fails. The `leftovers` filter on `.judge.json.` does not match the `judge.json` directory itself.
  - Cleanup is `rmSync(judgeJson, { recursive: true, force: true })`.
- **GREEN claimed:** `judge-cli.test.js` exit 0, `fx-setup-judge` passed, `check-prose` OK, and test_scope ending `exit 0`. This time the `fx-setup-judge` gate is reported as re-run, which closes the round 1 evidence gap.
- The `.ts` and built `.js` test hunks are equivalent.

## Ledger lines
Task 11: fix round 2/5 (2 addressed, 0 open; commits 12c214f..d1c5227)
Task 11: minor (deferred): if the temp file opens but the write fails (ENOSPC, EIO), `created` stays false and a 0600 temp file with a partial or full key is left behind (judge-cli.ts:88-93).
Task 11: minor (deferred): no test would fail if the `if (created)` guard were dropped, so the never-delete-a-foreign-entry rule rests on reading only.
Task 11: minor (deferred): the success-path leftovers assertion passes without the catch, so only the rename-failure case covers the removal.
Fixed ledger number: 3
