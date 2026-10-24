# 11: Install suite on Node

**Status:** ready-for-agent
**Blocked by:** 10
**Phase:** Hardening

**What to build:** the install-shape suite runs as `node tests/install/run.js <opencode|opencode-v2|codex|claude-code>` and makes every check `tests/install/run.sh` makes, with the same `ok: <label>` and `FAIL: <label>` lines in the same order and the same exit codes; the home-untouched test runs as `node tests/install/home-untouched.test.js`. `check-all` runs both under their existing row names.

**Design:** Implementation Decisions > 2; Implementation Decisions > 4; Testing Decisions

**Files:**
- Create: `src/tests/install/run.ts` (built to `tests/install/run.js`), `src/tests/install/home-untouched.test.ts` (built to `tests/install/home-untouched.test.js`)
- Delete: `tests/install/run.sh`, `tests/install/home-untouched.test.sh`
- Modify: `src/scripts/check-all.ts` (rows `install-opencode`, `install-opencode-v2`, `install-codex`, `install-claude-code` run `node tests/install/run.js <harness>`; `install-home-untouched` runs the new test; every row name unchanged)
- Modify: `INSTALL.md`, `tests/conformance/README.md` and any other doc naming `tests/install/run.sh` (find with `git grep -n "tests/install/run.sh"` outside `docs/plans/`)

**Interfaces:**
- Produces: `tests/install/run.js <harness>`: usage `usage: tests/install/run.js <opencode|opencode-v2|codex|claude-code>` and exit 2 on a bad harness; each check prints `ok: <label>` or `FAIL: <label>` with the bash suite's labels verbatim; exit 0 when no check failed, else 1. Scratch directories removed on every exit.
- Produces: tree snapshot helper inside the suite: each path under a tree with its link target or sha256, sorted by code point (the bash `snapshot` function's output, used by the reinstall-is-a-no-op checks).
- Consumes: `run`, `runNode` (task 01); the installer by path (task 09).

**Seam:** the suite's own output, old against new, plus a seeded defect per harness.

**Tests:**
- For each of the four harnesses: `bash tests/install/run.sh <h>` at `old.rev` and `node tests/install/run.js <h>` print the same `ok:`/`FAIL:` label sequence and exit 0; the two outputs saved to the ledger and diffed (identical).
- Seeded defect, opencode: in a scratch copy of the repo with `skills/fx-tdd/SKILL.md` removed, old and new suites both exit 1 and print the same `FAIL:` labels.
- Seeded defect, codex: in a scratch copy with one `codex/agents/*.toml` removed, same `FAIL:` labels from both.
- Seeded defect, claude-code: in a scratch copy with one `agents/*.md` removed, same `FAIL:` labels from both.
- `home-untouched.test`: with `HOME` a scratch directory holding `.claude/sentinel`, and `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, `CODEX_HOME` removed from the environment, running the claude-code suite leaves the directory's listing (type, mode, path) and file hashes identical; prints `install home-untouched: passed`.
- Bad harness: `node tests/install/run.js nope` exits 2 and prints the usage line.

**Risks:** the bash suite's checks are `eval`ed strings; port each as a function with the same label, never as a string run through a shell. `cp -a` and `diff -r` become a recursive copy that keeps links and modes and a tree-snapshot comparison.

**Idempotency:** writes only scratch directories, removed on exit.

**Testing:** old against new output per harness; seeded defects; `check-all`.

## Acceptance criteria
- [ ] Four harness outputs identical old against new; seeded defects fail with the same labels.
- [ ] No file under `tests/install/` is bash.
- [ ] `git grep -nE "(bash|sh) [^ ]*tests/install/(run|home-untouched)"` outside `docs/plans/` prints nothing, `tests/conformance/README.md` and `INSTALL.md` included.
- [ ] `node scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; save each harness's bash suite output and each seeded-defect output to the ledger**
- [ ] **3. Write `home-untouched.test` and the bad-harness check: verify RED**

Run: `scripts/build && node tests/install/home-untouched.test.js`

- [ ] **4. Port the suite**
- [ ] **5. Verify GREEN**: each harness and each seeded defect, diffed against the ledger
- [ ] **6. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **7. Commit by path**

```
git rm tests/install/run.sh tests/install/home-untouched.test.sh
git add src/tests/install/run.ts src/tests/install/home-untouched.test.ts tests/install/run.js tests/install/home-untouched.test.js src/scripts/check-all.ts scripts/check-all INSTALL.md
git commit -m "test: install suite on Node"
```

Add any other doc the `git grep` found to the `git add`.
