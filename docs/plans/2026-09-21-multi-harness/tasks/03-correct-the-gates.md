# 03: Correct the gates and the false comment

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** fx's own gate and hook stop encoding beliefs that were
measured false. `scripts/check-manifest` refuses a manifest declaring `agents`
or `hooks` on grounds that do not hold; `hooks/fx-pretooluse.js` carries a
header stating a harness limit that does not exist. Both are corrected, and the
one guarantee whose status nobody can currently state, the lane check, is
measured.

Also add the gate that protects delivery to a runtime which strips execute
bits.

**Files:**
- Modify: `scripts/check-manifest`
- Modify: `hooks/fx-pretooluse.js`
- Create: `scripts/check-interpreters`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: nothing
- Produces: `scripts/check-interpreters`, exit 0 clean, exit 1 with a list

**Seam:** `scripts/check-all`. Text gates reading files, matching
`scripts/check-paths`.

**`check-manifest` takes a path.** It reads a hardcoded
`ROOT/.claude-plugin/plugin.json` today, so neither of this task's manifest
criteria can be exercised without that. Give it an optional argument
defaulting to the repository root, so a fixture manifest can be checked.

**What changes in `check-manifest`.** Delete the rule forbidding `agents` and
`hooks`. Measured 2026-09-21 against Claude Code 2.1.278: a manifest declaring
both passes `claude plugin validate` with only an unrelated author warning. Per
ADR 0017 the real hazard is different, so replace the prohibition with it: if a
component key is declared, the default directory it would otherwise replace
must still be reachable through that declaration.

**What changes in `fx-pretooluse.js`.** Delete the `WHY ONE` header. Per ADR
0018, both claims in it were measured false: matcher groups are not capped, and
`PreToolUse` does fire for `Write`. Keep the single-dispatcher shape, and say
why it is kept: one entry point reading `tool_name` is what lets the same
script serve Claude Code and Codex. Keep the fail-closed and fail-open note
unchanged; that part is correct and load-bearing.

**Risks:** The lane check has been behind a false belief. It may be working, or
it may be broken for an unrelated reason. Step 5 finds out before task 08
ports it to opencode. Do not "fix" it in this task if it is broken: report it,
because a repair belongs in its own task with its own review.

**Idempotency:** Edits files in place, adds a gate. Re-running is safe.

**Testing:** Each gate is run against a fixture that must fail and then against
the repository, which must pass.

## Acceptance criteria
- [ ] `scripts/check-manifest <path>` accepts a plugin root argument
- [ ] `scripts/check-manifest` passes against a fixture manifest declaring `agents` and `hooks`
- [ ] `scripts/check-manifest` fails when a declared key orphans its default directory
- [ ] `scripts/check-manifest` still passes against `.claude-plugin/plugin.json`
- [ ] `hooks/fx-pretooluse.js` no longer claims a one-group-per-plugin limit
- [ ] `hooks/fx-pretooluse.js` still routes `Bash` to the guard and `Write`/`Edit`/`MultiEdit`/`NotebookEdit` to the lane check
- [ ] `scripts/check-interpreters` fails on a skill invoking a script with no interpreter
- [ ] `scripts/check-interpreters` passes against the repository
- [ ] `scripts/check-all` runs the new gate
- [ ] The lane check's live status is recorded in `docs/plans/2026-09-21-multi-harness/state.md`

## Steps

- [ ] **1. Write the failing gate**

```bash
#!/usr/bin/env bash
# Every script INVOCATION in a skill names its interpreter.
#
# At least one target runtime is reported to deliver plugin files without the
# execute bit. `bash scripts/x.sh` works either way; `scripts/x.sh` does not.
#
# A MENTION of a path is not an invocation. Only a script path sitting in
# command position counts, which means inside a fenced block or after "Run:".
# Flagging mentions sends someone to rewrite eight correct sentences.
set -uo pipefail
cd "$(dirname "$0")/.."

TARGETS=("${@:-skills references commands}")

fails=0
while IFS= read -r file; do
  while IFS= read -r hit; do
    [ -z "$hit" ] && continue
    echo "  $file: $hit"
    fails=$((fails+1))
  done < <(awk '
      /^[[:space:]]*```/ { fence = !fence; next }
      {
        line = $0
        inv = fence
        if (sub(/^[[:space:]]*Run:[[:space:]]*/, "", line)) inv = 1
        if (!inv) next
        sub(/^[[:space:]]*[$][[:space:]]*/, "", line)
        sub(/^[[:space:]]+/, "", line)
        split(line, tok, /[[:space:]]+/)
        if (tok[1] ~ /scripts\/[A-Za-z0-9_.-]+$/) print NR": "line
      }' "$file")
done < <(find "${TARGETS[@]}" -name '*.md' 2>/dev/null)

if [ "$fails" -gt 0 ]; then
  echo "FAIL: $fails invocation(s) do not name an interpreter."
  exit 1
fi
echo "check-interpreters: OK"
```

- [ ] **2. Run it: verify RED**

Run:
```
mkdir -p /tmp/fx-ci && \
printf 'Run: scripts/x.sh\n\n```\nscripts/y.sh --flag\nbash scripts/z.sh\n```\n\nSee `scripts/mention.py`.\n' > /tmp/fx-ci/a.md && \
chmod +x scripts/check-interpreters && scripts/check-interpreters /tmp/fx-ci
```
Expected: FAIL, exit 1, **exactly two** hits: `scripts/x.sh` and
`scripts/y.sh`. `bash scripts/z.sh` passes because it names its interpreter,
and `` `scripts/mention.py` `` passes because a mention is not an invocation.

- [ ] **3. Run it against the repository**

Run: `scripts/check-interpreters`
Expected: `check-interpreters: OK`, exit 0. This gate was executed against the
repository while this plan was written and the tree is already clean: the six
occurrences of `bash <skill-dir>/scripts/start-server.sh` name their
interpreter, and every other hit is a mention rather than an invocation.

If it reports anything, prefix that invocation with its interpreter. **Do not
rewrite a sentence that merely names a path.**

- [ ] **4. Verify GREEN**

Run: `scripts/check-interpreters && rm -rf /tmp/fx-ci`
Expected: `check-interpreters: OK`.

- [ ] **5. Measure the lane check**

This is a measurement, not a change. Build a throwaway plugin pointing at this
working tree and make a session write a file the lane check should refuse:

```
scripts/check-all >/dev/null 2>&1   # confirm the tree is green first
```
Then run a session with `--plugin-dir "$PWD"` against a scratch directory,
instruct it to use the Write tool, and record whether `laneCheck` fired.
Write the result to `docs/plans/2026-09-21-multi-harness/state.md` as one line:
`Lane check on Claude Code, measured <date>: <fires|does not fire>`.

Per ADR 0010, `--plugin-dir` is mandatory: without it the run loads a cached
copy keyed by version and measures a different thing than the claim.

- [ ] **6. Correct `check-manifest`**

Delete the `agents`/`hooks` prohibition. Add the orphaned-default-scan check
described above. Keep every other rule in the file.

- [ ] **7. Correct the hook header**

Delete the `WHY ONE` block from `hooks/fx-pretooluse.js`. Replace it with the
portability reason. Change no code in that file.

- [ ] **8. Register the gate and run everything**

Add to `scripts/check-all`:
```
run check-interpreters     scripts/check-interpreters
```
Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **9. Commit**

```
git add scripts/check-manifest scripts/check-interpreters scripts/check-all hooks/fx-pretooluse.js skills references commands docs/plans/2026-09-21-multi-harness/state.md
git commit -m "fix(gates): drop two false beliefs and gate script interpreters"
```

No attribution trailers. Then continue to the next task: never stop and wait.
