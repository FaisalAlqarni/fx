# 22: Live matrix on Codex, the merge gate

**Status:** blocked-until 2026-10-21 (Codex quota reset)
**Blocked by:** 14, 16, 17, 19
**Phase:** Amendment

**What to build:** Evidence that fx works on Codex in real sessions, including
the hook-trust path a real user goes through. Codex parity is the point of
this whole plan, so the branch does not merge until this matrix passes. Then
the measured result goes into the documents that state it. Design amendment
A9.

Codex quota ran out during task 12 ("You've hit your usage limit", resets
2026-10-21). Rows 04 to 08, 12 and 15 to 17 were recorded as `GAP: not run`.
Row 12 never passed on Codex: in task 12's development run it FAILed, because
no role had been planted, so `spawn_agent` exposed no `agent_type`. Everything
else in the amendment is proven before this date.

What changed since then, and what this task relies on:
- task 14: Codex runs `fx-codex.js`, and a read-only agent cannot spawn or
  call MCP tools;
- task 16: `tests/conformance/lib/live.sh` plants the roles into the scratch
  `CODEX_HOME` before the first session, so row 12 sees them in the session
  that dispatches. Task 16 also added row 18 and ruled on row 15 for Codex;
- task 17: a Codex lens keeps the shell to read, and row 12 probes a shell
  write, which the hook must refuse;
- task 19: the heredoc guard.

**Prior art.** ponytail's README tells Codex users to run `codex`, open
`/hooks`, and "review and trust its two lifecycle hooks" before starting a new
thread (ponytail section 4 of `research/prior-art-multi-harness.md`). That is
the step the trust runs below prove for fx. Neither project proves it by
test, so the test itself has no prior art.

**Files:**
- Modify: `tests/conformance/lib/live.sh`  (the Codex trust knob only)
- Modify: `INSTALL.md`
- Modify: `SURFACE.md`
- Modify: `docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md`

**Interfaces:**
- Consumes: `bash tests/conformance/run.sh codex`, `tests/conformance/lib/live.sh`,
  and `FX_CONFORMANCE_ROWS`, the runner's hook for running a probe row
- Consumes: task 16's ruling on Codex row 15, from its report and from
  `references/harnesses/codex.md`
- Produces: `live.sh` reads `FX_CODEX_HOOK_TRUST`:
  - unset or `bypass`: today's behaviour, `--dangerously-bypass-hook-trust`;
  - `none`: no bypass flag and no trust entry;
  - `granted`: no bypass flag, and the trust entry step 1 found written into
    the scratch `CODEX_HOME` before the first session.
  It never touches `FX_REAL_HOME`.
- Produces: a matrix block in the report, for the controller to copy into the
  ledger

**Seam:** the conformance runner, live.

**Risks:**
- HIGH: plugin hooks run on Codex only after the user trusts them in
  `/hooks`, and a changed handler needs trusting again (`research/codex.md`,
  "Trust gate and feature flags"). `live.sh` passes
  `--dangerously-bypass-hook-trust`, so the matrix alone cannot prove the
  trust path. The two trust runs in step 5 do.
- HIGH: if a run shows Claude Code addressing (`fx:fx-tdd`) rather than
  `$fx-tdd`, `fx-codex.js` did not load: report that as a FAIL, not a GAP.
- MEDIUM: the stored trust entry may hash the normalized handler in a way a
  test cannot reproduce. Step 1 decides. If it cannot be reproduced, step 5
  becomes a manual step for the user, recorded as such.
- The safety rules from task 21 apply unchanged.

**Idempotency:** as task 21. The trust entry is written only into the scratch
`CODEX_HOME`, which the runner removes.

**Testing:** this task is the test.

## Acceptance criteria
- [ ] The run is dated 2026-10-21 or later, and the quota is available
- [ ] Step 1's finding on where Codex stores hook trust is in the report, with source file and line citations at `rust-v0.155.1`
- [ ] The session evidence shows Codex addressing (`$fx-tdd`), proving `fx-codex.js` loaded
- [ ] Rows 01, 02 and 16 PASS: the preamble arrives whole, with `additionalContextLimit: 0`
- [ ] Rows 06 to 08 PASS: the guard refuses through `fx-codex.js`
- [ ] Row 12 PASSes in the first session, with no restart: a read-only role dispatched with `agent_type` cannot patch, and its shell write is refused by the hook
- [ ] Row 18 PASSes, or GAPs through its control exactly as task 16's depth ruling predicts
- [ ] Row 15 PASSes, or is the GAP task 16 ruled, with the user-level key in its reason
- [ ] Row 17 PASSes: the lane check reaches `apply_patch`
- [ ] The sentinel probe PASSes: a Codex lens returned the sentinel it read from the diff file through the shell, and the sentinel was not in its dispatch prompt
- [ ] Untrusted run: row 01 with `FX_CODEX_HOOK_TRUST=none` shows the hooks did not run: no `$fx-tdd` in the session, and the preamble question unanswered. The report cites the log lines
- [ ] Trusted run: row 01 with trust granted the way `/hooks` grants it PASSes, either through `FX_CODEX_HOOK_TRUST=granted` or through the manual step, and the report says which
- [ ] Every row has exactly one result, with a reason for each GAP
- [ ] `INSTALL.md`, `SURFACE.md` and ADR 0019 state the measured Codex result, dated, with the Codex version, before merge

## Steps

- [ ] **1. Find where Codex stores hook trust**

Read the Codex source at tag `rust-v0.155.1`: `hook_trust_status` and the push
condition in `discovery.rs`, lines `L713-L733`, and whatever writes a trust
decision when the user trusts a hook in `/hooks`. Record the file, the key,
and how the hash over the normalized handler is computed. Decide whether a
test can write an entry Codex accepts. This step needs no quota and may run
before the reset.

- [ ] **2. Write the sentinel probe**

Create a private `mktemp -d` directory under `/tmp`, `$P`, and write this file
to `$P/90-lens-reads-the-diff-file.sh`. It is a one-off probe row, never
committed:

```bash
#!/usr/bin/env bash
# One-off live probe (amendment A5): a lens can READ the diff file it is
# handed. On Codex it has no read tool, only the shell, so a role with the
# shell off would be blind. This proves it is not.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "90|lens reads the diff file it is given|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
case "$HARNESS" in
  claude-code) LENS=fx:fx-lens-security ;;
  *)           LENS=fx-lens-security ;;
esac
SENTINEL="FXSENTINEL-$RANDOM$RANDOM"
printf 'diff --git a/app.rb b/app.rb\n+# %s\n' "$SENTINEL" > "$WORK/review.diff"

live_run "Dispatch one subagent ($SUBAGENT_TOOL) as agent type $LENS. Its task, word for word: \"Read the diff file $WORK/review.diff. It holds one added line that starts with a hash. Reply with the rest of that line exactly, and nothing else.\" Do not read the file yourself. Wait for it, then reply with exactly what it returned."

types="$(events sub_type)"
grep -qE "(^|:)${LENS#fx:}$" <<<"$types" || fail "no subagent was dispatched as $LENS (dispatched: $(tr '\n' ' ' <<<"$types"))"
events sub_input | grep -qF "$SENTINEL" && fail "the sentinel reached the dispatch prompt, so the lens's answer proves no read"
events sub_output | grep -qF "$SENTINEL" || fail "the lens never returned the sentinel from the diff file"
exit 0
```

- [ ] **3. Confirm the quota**

Run one Codex row alone, such as row 01. If it reports `GAP: not run` for
quota, stop and report BLOCKED with the reset time.

- [ ] **4. Run the Codex matrix and the sentinel probe**

Run: `HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" bash tests/conformance/run.sh codex`,
as a tracked background command, then end your turn. After it exits, run the
probe the same way with `FX_CONFORMANCE_ROWS="$P"` added. Remove `$P` by exact
path afterwards.

- [ ] **5. Prove the trust path**

Add the `FX_CODEX_HOOK_TRUST` knob to `live.sh` as the interface above says,
with `bypass` as the default so the matrix is unchanged. Then copy
`tests/conformance/rows/01-preamble-in-session.sh` into a fresh `mktemp -d`
probe directory, point `FX_CONFORMANCE_ROWS` at it, and run it twice:
- `FX_CODEX_HOOK_TRUST=none`. Expected: row 01 FAILs because the preamble
  never arrived, and the log has no `$fx-tdd`. That FAIL is the evidence the
  hooks did not run untrusted. A PASS here means trust is not enforced, which
  is a finding for the controller.
- `FX_CODEX_HOOK_TRUST=granted`, if step 1 found an entry a test can write.
  Expected: PASS.

If step 1 found no entry a test can write, record the trusted run as a manual
step for the user instead: install fx into a dedicated Codex home following
`INSTALL.md`, run `codex`, open `/hooks`, trust fx's hooks as ponytail's
README describes, start a new session, and ask row 01's question. The user
records the answer, and the report quotes it.

- [ ] **6. Re-run suspected flakes once, record both**

- [ ] **7. Report**

Write the matrix block, the sentinel result, both trust runs and the evidence
for every FAIL into the report file.

- [ ] **8. Write the measured result into the documents, before merge**

Update `INSTALL.md` (the Codex trust step, stated from the trust runs, and any
Codex GAP), `SURFACE.md` (Codex live verification is no longer pending), and
ADR 0019 (row 12 and row 18 on Codex, dated, with the Codex version). Then run
`scripts/check-prose`, `scripts/check-paths` and `scripts/check-reference-leaves`.

- [ ] **9. Commit**

```
git add tests/conformance/lib/live.sh INSTALL.md SURFACE.md docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md
git commit -m "docs: record the Codex live matrix and the hook-trust runs"
```

No attribution trailers. Then continue to the next task: never stop and wait.
