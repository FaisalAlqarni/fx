# 12: No rm inside shell -c strings

**Status:** ready-for-agent
**Blocked by:** 11
**Phase:** Polish

**What to build:** fx never makes Claude Code stop an unattended run for a permission prompt over its own test commands. Claude Code cannot inspect a `bash -c '...'` string, so any such string that runs `rm` triggers "This shell -c script runs rm and could not be checked", even in bypass mode. fx's own `.fx.json` does this twice: `test_one` and `setup` both wrap a fixture in `bash -c '... trap "rm -rf $B" EXIT ...'`. Move each into a script file, so `.fx.json` names a script and holds no `bash -c`, `trap` or `rm`. Then add one rule to the preamble every session and subagent receives, so agents writing their own commands in any repo do the same. Owner request 2026-10-23, added after planning; see the ledger ruling.

**Design:** Implementation Decisions > 14

**Files:**
- Create: `scripts/test-one` (bash, executable): `scripts/test-one <src test file>` runs `scripts/check-generated`, makes a fixture with `scripts/make-git-fixture` under `mktemp -d` (honouring `TMPDIR`), runs `node "$(scripts/test-scope --built-path "$1")" $F` (unquoted `$F`: the fixture prints two paths), removes the fixture on exit from inside the script, and exits with node's status.
- Create: `scripts/setup` (bash, executable): `npm ci`, then one `scripts/make-git-fixture` smoke run under `mktemp -d`, removed on exit from inside the script.
- Modify: `.fx.json`: `"test_one": "scripts/test-one {file}"`, `"setup": "scripts/setup"`.
- Modify: `PREAMBLE.md`, section "Always, lane or no lane": one bullet, text in Interfaces.
- Modify: whatever `scripts/check-generated` regenerates from `PREAMBLE.md`, by running the generator, never by hand.
- Create: `src/tests/gates/no-rm-in-shell-c.test.ts` and its generated `tests/gates/no-rm-in-shell-c.test.js`.
- Modify: `scripts/check-all` (run the new gate).

**Interfaces:**
- Produces: the preamble bullet, verbatim: `- **No rm inside a shell -c string.** Never put rm (or a trap that runs it) inside a bash -c, sh -c or similar quoted script: Claude Code cannot inspect it and stops the run for a permission prompt, even in bypass mode. Put the cleanup in a script file, or leave scratch files for a later cleanup.`
- Produces: `scripts/test-one` and `scripts/setup` with the behaviour above; `.fx.json` keys unchanged in name and meaning.

**Seam:** `.fx.json` as data; the scripts as processes; the preamble text.

**Tests:**
- Gate: every string value in `.fx.json` that contains `-c ` with a quote after it does not contain `rm ` or `trap`; on today's `.fx.json` it fails naming `test_one` and `setup` (RED), after the change it passes.
- Gate: `PREAMBLE.md` contains the bullet verbatim.
- Process: `scripts/test-one src/lib/evidence.test.ts`, run with `TMPDIR` set to a fresh scratch directory, exits 0, and the scratch directory holds no fixture afterwards.
- Existing: `scripts/check-generated`, `scripts/check-prose PREAMBLE.md`: pass.

**Risks:** the preamble is injected into every session and subagent; keep the bullet one item and inside the existing section. `scripts/test-one` must keep `test_one`'s exact behaviour, including the unquoted fixture argument. No test may run a dangerous command string in a live shell, and every test run uses `HOME` and `TMPDIR` in scratch (standing ledger ruling).

**Idempotency:** re-running the scripts leaves no files behind.

**Testing:** the new gate, a process run of `scripts/test-one`, existing generation and prose gates, `scripts/check-all`.

## Acceptance criteria
- [ ] `.fx.json` holds no `bash -c`, `trap` or `rm`, and `test_one` and `setup` behave as before.
- [ ] No `.fx.json` value holds a `-c` quoted script that runs `rm` or `trap`, checked by `tests/gates/no-rm-in-shell-c.test.ts`. The gate reads text only: it does not observe Claude Code, and its pattern misses `-lc`, `--rm` and nested strings. Whether `test_one` raises no permission prompt is a one-time owner observation (coverage audit gap 11, reworded by task 13).
- [ ] The preamble carries the bullet verbatim, and generated copies match.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Write the gate; run it; verify RED on today's `.fx.json`**
- [ ] **3. Add the scripts, change `.fx.json`, add the preamble bullet, regenerate**
- [ ] **4. Run the gate, `scripts/test-one`, `scripts/check-generated`; verify GREEN**
- [ ] **5. Commit**
