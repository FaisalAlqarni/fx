# 11: Conformance runner and the free rows

**Status:** ready-for-agent
**Blocked by:** 03, 05, 06, 07, 08, 09, 10
**Phase:** Hardening

**What to build:** A runner that dispatches rows and reports three distinct
states, plus every row that spends nothing. The behavioural rows are task 12.

This is the split a reviewer would make anyway: the free rows belong in the
free gate and can be accepted on their own, while the behavioural rows spend
quota on three providers and need separate judgement.

**Files:**
- Create: `tests/conformance/run.sh`
- Create: `tests/conformance/rows/` (the free rows only; task 12 adds the rest)
- Create: `tests/conformance/README.md`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: every artifact produced by tasks 04 through 09
- Produces: `tests/conformance/run.sh <harness> [--free]`, printing one line
  per row as `PASS`, `FAIL` or `GAP`, and exiting non-zero if any row is `FAIL`
- Produces: the row contract. A row answers `--describe` with
  `<number>|<name>|<free|live>`, and otherwise runs, exiting `0` for pass,
  `77` for gap, anything else for fail

**Seam:** New, and the highest available. Everything below it is covered by
reading files, and reading files is exactly what cannot prove a live session
loads them.

**The seventeen rows.**

| # | Guarantee | How it is asserted |
|---|---|---|
| 1 | Preamble reaches a session | a sentinel string from `PREAMBLE.md` appears in the session |
| 2 | Preamble reaches a subagent | same sentinel, from inside a dispatched subagent |
| 3 | Lane name rendered, no placeholder | the runtime's own addressing appears; `{{` does not |
| 4 | A naive prompt auto-invokes a lane | one literal prompt, no lane named, the lane fires |
| 5 | Explicit invocation works | the runtime's own addressing resolves |
| 6 | Guard refuses in-session | `git branch -D fx-guard-probe` is refused |
| 7 | Guard refuses inside a subagent | same command, from a dispatched subagent |
| 8 | Guard survives quoting evasion | the same command inside a heredoc is still refused |
| 9 | Every skill is discovered | the count matches the repository |
| 10 | Reference paths resolve | a lane's `../../references/` citation opens |
| 11 | Lens roles are registered | all six are listed by the runtime |
| 12 | A lens physically cannot write | a lens is asked to write; the write is refused |
| 13 | The audit lane is not model-facing | it is absent from the model's skill listing |
| 14 | The audit lane is user-invocable | typing it loads it |
| 15 | A subagent can dispatch a subagent | two levels deep completes |
| 16 | Project note and plan state present | both appear in the injected context |
| 17 | The lane check reaches this runtime | an edit the check refuses is refused |

Row 17 exists because the design closes that asymmetry and nothing else would
notice its absence. On a runtime that cannot support it the row reports a gap
with its reason: **a guarantee absent on one runtime must be visible, not
missing.**

**Rules, and they are the point of the task.**

- **No mocks.** Every row runs against the real CLI. Eight assumptions about
  these runtimes were falsified during this plan's design, every one of them by
  running something.
- **A row that cannot pass is `GAP`, with its reason.** `GAP` is a visible
  state, distinct from `PASS` and from `FAIL`. **Omitting a row is forbidden**:
  a silently absent row is how fx came to claim opencode parity it did not
  have.
- **Never tune a row until it goes green.** Report what it says.

**Measured facts rows depend on.** Row 12 rests on `agent_type` reaching
`PreToolUse` on Codex, which is undocumented for that event. This row is the
reason ADR 0019 requires a test: if a release removes the field, enforcement
silently degrades to prose, and only this row will say so.

**Risks:** This spends real quota on three providers. Rows 4 and 12 need a
model good enough to behave. Run the free rows first; if quota or credit runs
out mid-matrix, record the rows that did not run as `GAP: not run` rather than
as passes.

**Idempotency:** Every row runs in a scratch directory and cleans up after
itself, including any hook or config it installed. A run must leave the user's
`~/.codex`, `~/.config/opencode` and `~/.claude` exactly as it found them.

**Testing:** The matrix is the test. Its own correctness is checked by running
it against a deliberately broken tree and confirming rows fail.

## Acceptance criteria
- [ ] The runner dispatches every row: a run with rows present never reports `0 pass, 0 fail, 0 gap`
- [ ] `--free` selects on each row's declared kind, not on a list inside the runner
- [ ] `HARNESS` and `FX` reach every row in its environment
- [ ] The three runtime homes are snapshotted and restored by a trap on exit, interrupt and failure
- [ ] Killing the runner mid-run leaves the three homes as they were
- [ ] A row that cannot answer `--describe` is a `FAIL`, never skipped
- [ ] Each row prints exactly one of `PASS`, `FAIL` or `GAP` with a reason
- [ ] A `GAP` never counts as a pass, and the summary line reports the three counts separately
- [ ] `--free` runs only the rows that spend nothing, and those rows are in `scripts/check-all`
- [ ] The behavioural rows are **not** in `scripts/check-all`
- [ ] Every free row passes on all three harnesses, or reports a gap with its reason
- [ ] `scripts/check-all` runs the free rows

## Steps

- [ ] **1. Write the failing test**

The runner is the test. Write it with every row reporting `GAP: not implemented`
first, so the shape is right before any row is real:

```bash
#!/usr/bin/env bash
# fx conformance: every guarantee, on every runtime, against the real CLI.
#
# A row is PASS, FAIL or GAP. A GAP is a visible state, not a pass, and a row
# is never omitted: a silently absent row is how a runtime comes to claim
# parity it does not have.
set -uo pipefail
cd "$(dirname "$0")/../.."

FX="$PWD"
HARNESS="${1:?usage: run.sh <claude-code|opencode|codex> [--free]}"
FREE=""
[ "${2:-}" = "--free" ] && FREE=1

# Rows may install a hook or a config into a runtime home. Snapshot the three
# homes and restore them on ANY exit, including failure and interrupt. Without
# this, "every row restores configuration" is a sentence with no mechanism.
SNAP="$(mktemp -d)"
for h in "$HOME/.codex" "$HOME/.config/opencode" "$HOME/.claude"; do
  [ -d "$h" ] && cp -a "$h" "$SNAP/$(echo "$h" | tr / _)" 2>/dev/null
done
restore() {
  for h in "$HOME/.codex" "$HOME/.config/opencode" "$HOME/.claude"; do
    src="$SNAP/$(echo "$h" | tr / _)"
    [ -d "$src" ] || continue
    rm -rf "$h" && cp -a "$src" "$h"
  done
  rm -rf "$SNAP"
}
trap restore EXIT INT TERM

pass=0; fail=0; gap=0
run_row() {
  local f="$1" desc n name kind rc
  desc="$(bash "$f" --describe)" || {
    printf 'FAIL  ??  %s (no --describe)\n' "$f"; fail=$((fail+1)); return; }
  IFS='|' read -r n name kind <<<"$desc"
  [ -n "$FREE" ] && [ "$kind" != free ] && return 0

  FX="$FX" HARNESS="$HARNESS" bash "$f"; rc=$?
  case "$rc" in
    0)  printf 'PASS  %2s  %s\n' "$n" "$name"; pass=$((pass+1)) ;;
    77) printf 'GAP   %2s  %s\n' "$n" "$name"; gap=$((gap+1)) ;;
    *)  printf 'FAIL  %2s  %s\n' "$n" "$name"; fail=$((fail+1)) ;;
  esac
}

shopt -s nullglob
for f in tests/conformance/rows/*.sh; do run_row "$f"; done

printf '\n%s: %d pass, %d fail, %d gap\n' "$HARNESS" "$pass" "$fail" "$gap"
[ "$fail" -eq 0 ]
```

- [ ] **2. Run it: verify RED**

Run: `bash tests/conformance/run.sh codex --free`
Expected: FAIL, because no row exists yet and the runner reports a missing
`rows/` directory rather than a clean `0 pass, 0 fail, 0 gap`. **A runner that
reports all-zero and exits 0 is the bug this step exists to catch**: it looks
exactly like success.

- [ ] **3. Implement the free rows**

No code here beyond the runner: each row is its own small script under
`tests/conformance/rows/`, named for its number and guarantee, answering
`--describe` with `<number>|<name>|free`.

Free rows are the ones that read files: 3 (no placeholder survives), 9 (skill
count), 10 (reference paths resolve), 11 (roles registered), 13 (audit lane not
model-facing) and 14 (audit lane invocable). Everything else is task 12.

- [ ] **4. Verify the runner dispatches**

Run: `bash tests/conformance/run.sh codex --free`
Expected: a line per free row, and a summary whose counts sum to the number of
free rows. If the summary says `0 pass, 0 fail, 0 gap`, the runner is not
calling the rows.

- [ ] **5. Verify the matrix catches real breakage**

Run:
```
cp PREAMBLE.md /tmp/fx-preamble.bak && : > PREAMBLE.md
bash tests/conformance/run.sh codex --free; echo "exit=$?"
cp /tmp/fx-preamble.bak PREAMBLE.md && rm -f /tmp/fx-preamble.bak
```
Expected: row 3 FAILs and the runner exits non-zero. A matrix that stays green
here proves nothing.

- [ ] **6. Verify the restore trap**

Run the runner and interrupt it mid-run. Then check that `~/.codex`,
`~/.config/opencode` and `~/.claude` are unchanged. The trap must fire on
`INT`, not only on a clean exit.

- [ ] **7. Run the free rows on all three**

Run:
```
for h in claude-code opencode codex; do bash tests/conformance/run.sh "$h" --free; done
```
Expected: every row PASS, or GAP with a stated reason. Zero FAIL.

- [ ] **8. Confirm nothing was left behind**

Run:
```
git status --porcelain
ls ~/.codex/hooks.json 2>&1 | tail -1
cat ~/.codex/config.toml
```
Expected: no stray hook file, no scratch trust entries, no unexpected working
tree changes.

- [ ] **9. Register the free rows**

Add to `scripts/check-all`, one line per harness:
```
run conformance-free-cc    bash tests/conformance/run.sh claude-code --free
run conformance-free-oc    bash tests/conformance/run.sh opencode --free
run conformance-free-cx    bash tests/conformance/run.sh codex --free
```
The behavioural rows stay out of the free gate.

- [ ] **10. Run the full gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **11. Commit**

```
git add tests/conformance scripts/check-all
git commit -m "test(conformance): add the runner and every free row"
```

No attribution trailers. Then continue to the next task: never stop and wait.
