### Finding verdicts

**1. Lens SEC I1 (no window where the key is readable, no symlink follow): ADDRESSED.**
- **The write path** is at `src/lib/judge-cli.ts:80-92`. The directory is created with mode 0700 (`:82`). The temp file is created with `flag: 'wx'` (O_CREAT plus O_EXCL) at mode 0600 (`:87`), then renamed onto `judge.json` (`:88`). On error, the temp file is removed and the command exits 1 (`:89-92`). The built `lib/judge-cli.js` matches this.
- **Existing 0644 file:** the key goes only into the new 0600 inode. `rename` swaps the directory entry, so the old readable inode never holds the key. No `chmod` window remains. Covered at `src/tests/gates/judge-cli.test.ts:117-125`.
- **Symlink at `judge.json`:** `rename` replaces the link itself and never opens the target. Covered at `:127-137`, which checks that the target's content and mode are unchanged and that the path is no longer a link.
- **Symlink or file at the temp path:** O_EXCL fails on any existing entry, links included. The command then exits 1. Nothing is written through the link.
- **Stale temp file from a crash:** the name is `.judge.json.<pid>.<ms>.tmp` (`:85`), so a leftover never collides with a later run. O_EXCL does not fail forever. The leftover itself stays behind, holding the key at 0600 (Minor 1 below).
- **Rename across filesystems:** cannot happen. The temp file is in `path.dirname(judgeConfig)`, the same directory as the target, so `EXDEV` is impossible.
- **Windows:** libuv's rename uses MoveFileEx with replace-existing, so replacing an existing file works. It can still fail with EPERM or EBUSY while another process holds `judge.json` open. The catch turns that into exit 1 and keeps the old file, so no data is lost (Minor 2 below). Mode bits have no effect on Windows. That gap was already deferred in lens minor 4.
- **Predictable temp name:** the pid and millisecond can be guessed. Because of O_EXCL, a planted entry can only make the command exit 1 (a denial of service). It cannot cause a redirect or a read. Planting one also needs write access to the user's own config directory, which already means full compromise.
- **Directory 0700 when created:** `mkdirSync({ recursive: true, mode: 0o700 })` applies the mode to every directory it creates. Covered at `:139-142`. A directory that already exists keeps its mode, which matches "when created".

**2. Lens SEC I2 (how to supply the key without shell history; narrower claim): NOT ADDRESSED for Windows.**
- **Narrower claim: done.** It now reads "the CLI never accepts the key as an argument" in `INSTALL.md:324-325`, `commands/fx-setup.md:327` and `skills/fx-setup/SKILL.md` (same text, about `:330`).
- **What history records: said for POSIX shells only.** The docs name `echo key | ...` and `export NAME=key` typed at the prompt (`INSTALL.md:328-329`, `commands/fx-setup.md:335-336`).
- **A safe way per OS shell: missing for Windows.** Both safe stdin methods are POSIX-only:
  - "end with Ctrl-D": on a Windows console, end of input is Ctrl-Z then Enter.
  - `... --api-key-stdin < keyfile`: PowerShell rejects `<` ("reserved for future use"), and "mode `0600`" means nothing on Windows.
  - The PowerShell history equivalent of `export NAME=key`, `$env:NAME = 'key'` saved to PSReadLine's `ConsoleHost_history.txt`, is never named. The lens finding named the PowerShell history file explicitly.
  - The only option left for a Windows user is the general "a variable your secrets manager exports".
- I did not verify that `fs.readFileSync(0)` reads a typed key correctly from an interactive Windows console.

**3. `write --base-url mock` does not crash: ADDRESSED.** `src/lib/judge-cli.ts:94` handles `mock` before `isLoopbackUrl`, so `new URL('mock')` at `:96` is never reached. The output is `judge: mock is a test backend; no request is made`. The test at `judge-cli.test.ts:112-115` asserts exit code 0, the exact stdout and empty stderr. The report records RED for this case: exit 1 with `TypeError: Invalid URL`.

**4. The `--api-key` refusal checks every argument, flag values included: ADDRESSED.** `src/lib/judge-cli.ts:57` runs `args.some(...)` before the parse loop, so the refusal wins over a flag value and over the usage error that an unknown flag would give. `--api-key-stdin` and `--api-key-env` still pass, because they are neither `--api-key` nor `--api-key=`. The test at `:105-110` covers `--model --api-key=X`, `--bogus --api-key k` and `--base-url --api-key=X`, and asserts exit 2, the exact stderr and no file. RED for the first case is recorded: actual exit 0, nothing on stderr.

**5. An existing looser `judge.json` ends at 0600: ADDRESSED.** The rename makes this structural. The test at `judge-cli.test.ts:117-125` creates a 0644 file, runs `write`, then asserts exit 0, the new content and mode 0600. The report says this test was not RED against the old code, which is expected because the old `chmodSync` also produced 0600. It now pins the rename path.

### New breakage in the fix diff

No Critical and no Important.

1. **Minor, leftover key file:** if the process is killed between `:87` and `:88`, `.judge.json.<pid>.<ms>.tmp` stays in the config directory with the key, at 0600. Nothing ever cleans it up, and every crash adds one more.
   - Related: when the open fails with EEXIST, the catch's `rmSync(tmp)` at `:90` deletes an entry this process did not create.
2. **Minor, Windows rename:** `renameSync` onto a `judge.json` that a running hook, an editor or antivirus holds open fails with EPERM or EBUSY. `write` then exits 1 with no retry. The old file is kept, but the user's new key is not saved. No test covers this.
3. **Minor, doc guidance quality:**
   - The recommended "type it at the prompt" path echoes the key on the terminal, which is the deferred lens minor 4 echo item. The docs now steer users toward it.
   - A single Ctrl-D after a line with no newline does not end input, so the command appears to hang until a second Ctrl-D or Enter.
   - The `< keyfile` option does not tell the user to delete the file afterwards.
4. **Minor, test gap:** no test checks that no `.judge.json.*.tmp` remains after a successful or failed write. The catch branch (`:89-92`) is never exercised, so dropping the `rmSync` or the error mapping keeps the suite green.

### Tests evidence

- **I ran nothing.** I had no shell. Every result below is the implementer's claim from the report's "Fix round 1" section.
- **RED claimed:**
  - item 4 (`--model --api-key=X`: actual exit 0, nothing on stderr)
  - item 3 (exit 1, `TypeError: Invalid URL`)
  - the item 1 symlink case (target overwritten with the JSON)
- **Never seen RED:**
  - the directory 0700 assertion (`:142`), which the report says was not reached
  - the 0644 test, explained above
  - the two later refusal cases, which run after the first one failed
- **GREEN claimed:** `node tests/gates/judge-cli.test.js` exit 0, `check-prose` OK, `check-generated` OK, and test_scope ending `exit 0`.
- **Evidence gap:** after that test_scope run, one doc sentence was reworded, and only `check-generated` and `check-prose` were re-run. The `fx-setup-judge` gate reads `commands/fx-setup.md` and was not reported as re-run. The risk is low, but it is not shown.
- **What I checked by reading:** the built `tests/gates/judge-cli.test.js` and `lib/judge-cli.js` hunks in the diff match the TypeScript source. The symlink and 0644 tests would fail against a plain `writeFileSync` to the target path.

## Ledger lines
Task 11: fix round 1/5 (4 addressed, 1 open: lens SEC I2 still gives no safe Windows or PowerShell way to supply the key, since Ctrl-D and `< keyfile` are POSIX-only and the PowerShell history file is not named; commits f1d76ef..67bbe70)
Task 11: minor (deferred): a crash between the temp write and the rename leaves a 0600 `.judge.json.<pid>.<ms>.tmp` holding the key that nothing removes, and on EEXIST the catch deletes an entry it did not create (judge-cli.ts:85-90).
Task 11: minor (deferred): on Windows, renaming onto a judge.json that another process holds open fails with EPERM or EBUSY and `write` exits 1 with no retry; untested.
Task 11: minor (deferred): the docs recommend typing the key at a prompt that echoes it, do not say a single Ctrl-D needs Enter first, and do not say to delete the `< keyfile` file afterwards.
Task 11: minor (deferred): no test asserts that no temp file remains after a write, and the write-failure catch branch is never exercised.
Fixed ledger number: 4

I skipped running any test or build (no shell). I did not check whether `readFileSync(0)` works on an interactive Windows console, and the fx-setup-judge gate was not shown re-run after the last doc reword.
