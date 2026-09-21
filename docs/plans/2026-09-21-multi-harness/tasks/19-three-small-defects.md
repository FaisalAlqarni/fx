# 19: Three small defects the live rows found

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** Three independent fixes, batched because each is small and
none needs its own design. Design amendment A7.

1. **Dead guard tests.** In `lib/git-guard.test.js`, `process.exit` runs
   before the `DEBT #46` block, so its five assertions never run. They must
   run and count.
2. **The free gate writes into the real home.** `tests/install/run.sh`, in its
   `claude-code` branch, runs `claude plugin validate` and
   `claude --plugin-dir ... plugin details` under whatever `HOME` it inherits.
   Run under the real home, those commands create `.claude/` and
   `.claude.json` there. They must run under a scratch home.
3. **A git command fed to a shell as a heredoc body escapes the guard.**
   `stripHeredocs` in `lib/git-guard.js` treats every heredoc body as data. So
   `bash <<EOF` followed by `git branch -D x` is allowed. When the command that
   consumes the heredoc is a shell, the body is commands and must be inspected.
   When it is anything else, such as `cat > file <<EOF`, the body stays data,
   exactly as `lib/heredoc.test.js` requires today.

The global constraint freezing `lib/git-guard.js` is lifted for fix 3 only.

**Files:**
- Modify: `lib/git-guard.test.js`
- Modify: `tests/install/run.sh`
- Modify: `lib/git-guard.js`  (`stripHeredocs` only)
- Modify: `lib/heredoc.test.js`

**Interfaces:**
- Consumes: `inspect(command, cwd) -> { allow: boolean, reason?: string }` (unchanged)
- Produces: `stripHeredocs(command) -> string`, which keeps a heredoc's body
  when the command on the heredoc's line is a shell interpreter: `bash`,
  `sh`, `zsh`, `dash` or `ksh`. This includes an absolute path to one of them,
  and forms with flags such as `bash -s` or `sh -e`, optionally behind `sudo`
  or `env`. Every other heredoc body is still dropped.

**Seam:** `inspect` through the existing test files, run exactly as
`scripts/check-all` runs them: `node lib/git-guard.test.js <main> <worktree>`
and `node lib/heredoc.test.js <main> <worktree>`.

**Risks:**
- MEDIUM: a guard change can refuse commands users rely on. Every existing
  case in `lib/heredoc.test.js` must still pass unchanged.
- The four moved assertions may fail once they run. That is the finding. Fix
  the guard only if the assertion is right; if an assertion is wrong, say so
  and fix the assertion.

**Idempotency:** file edits and tests only. `tests/install/run.sh` removes only
the exact scratch directory it created.

**Testing:** the two guard test files, and a run of
`bash tests/install/run.sh claude-code` under a HOME whose tree is
fingerprinted before and after.

## Acceptance criteria
- [ ] The `DEBT #46` assertions run before the summary line and count in its totals
- [ ] `bash tests/install/run.sh claude-code`, run with `HOME` set to a fake directory, leaves that directory byte-identical, and still passes
- [ ] `bash <<EOF` with body `git branch -D x` is refused. So are `sh <<'EOF'` and `/bin/bash -s <<EOF` with the same body
- [ ] `cat > t.md <<EOF` with a git command in the body is still allowed, and every existing `lib/heredoc.test.js` case passes unchanged
- [ ] `scripts/check-all` passes

## Steps

- [ ] **1. Write the failing tests**

In `lib/git-guard.test.js`, move the five `DEBT #46` lines above the
`console.log` summary line, and leave the summary and `process.exit` as the
file's last two statements.

Append these cases to `lib/heredoc.test.js`, following its existing
`blocked`/`allowed` helpers and its `G` git path variable:

```js
// --- a heredoc fed to a SHELL is commands, not data: must be refused ---
blocked(`bash <<EOF\n${G} branch -D x\nEOF`, WT, 'bash reading a heredoc');
blocked(`sh <<'EOF'\n${G} branch -D x\nEOF`, WT, 'sh reading a quoted heredoc');
blocked(`/bin/bash -s <<EOF\n${G} branch -D x\nEOF`, WT, 'absolute bash -s');
blocked(`sudo bash <<EOF\n${G} push --force origin x\nEOF`, WT, 'sudo bash');
allowed(`cat > t.md <<EOF\n${G} branch -D x\nEOF`, WT, 'cat writing an example is still data');
allowed(`tee notes.md <<'EOF'\n${G} push origin main\nEOF`, MAIN, 'tee writing an example is still data');
```

Add a fingerprint check around the Claude Code branch of
`tests/install/run.sh`. Make it a new test file,
`tests/install/home-untouched.test.sh`:

```bash
#!/usr/bin/env bash
# Amendment A7: the install test must not write into the HOME it runs under.
set -euo pipefail
cd "$(dirname "$0")/../.."
FAKE="$(mktemp -d)"; trap 'rm -rf -- "$FAKE"' EXIT
mkdir -p "$FAKE/.claude" && echo sentinel > "$FAKE/.claude/sentinel"
fp() { (cd "$FAKE" && find . -printf '%y %m %p\n' | sort && find . -type f -exec sha256sum {} + | sort); }
before="$(fp)"
HOME="$FAKE" bash tests/install/run.sh claude-code
after="$(fp)"
[ "$before" = "$after" ] || { echo "tests/install/run.sh wrote into HOME:"; diff <(echo "$before") <(echo "$after"); exit 1; }
echo "install home-untouched: passed"
```

Register it in `scripts/check-all` beside `install-claude-code`:
```
run install-home-untouched bash tests/install/home-untouched.test.sh
```

- [ ] **2. Run them: verify RED**

Run:
```
B=$(mktemp -d); F=$(scripts/make-git-fixture "$B")
node lib/git-guard.test.js $F   # args as scripts/check-all passes them
node lib/heredoc.test.js $F
bash tests/install/home-untouched.test.sh
ls -d "$B" && rm -rf -- "$B"
```
Expected:
- `git-guard.test.js`: the DEBT #46 cases now run. Report whether they pass.
- `heredoc.test.js`: FAIL on "bash reading a heredoc".
- `home-untouched`: FAIL, listing `.claude.json` or other new files.

Read how `scripts/check-all` builds `$MAIN` and `$WT`, and pass the same
arguments.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it. For fix 2, give the Claude Code checks in
`tests/install/run.sh` a `mktemp -d` HOME and `CLAUDE_CONFIG_DIR`, removed by
exact path.

- [ ] **4. Run them: verify GREEN**

Run: the same commands. Expected: all pass, output pristine.

- [ ] **5. Run the full gate**

Run: `HOME="$(mktemp -d)" scripts/check-all`. Expected: `ALL GREEN`.

- [ ] **6. Commit**

```
git add lib/git-guard.js lib/git-guard.test.js lib/heredoc.test.js tests/install/run.sh tests/install/home-untouched.test.sh scripts/check-all
git commit -m "fix: run the dead guard tests, keep the install test out of HOME, and inspect heredocs fed to a shell"
```

No attribution trailers. Then continue to the next task: never stop and wait.
