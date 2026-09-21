# Task 12 review: the behavioural conformance rows (31d19e7..93c0df2)

Saved by the controller. Both reviewers' harnesses refused the file write, so
this is their returned findings, condensed and transcribed.

**Task reviewer verdict:** Needs fixes. 0 Critical, 1 Important, 7 Minor.

**Security lens verdict:** 1 Critical, 2 Important, 2 Minor.

## Task reviewer

**Spec compliance.** Every criterion holds except row 15 on Claude Code.

What the reviewer ran:
- the isolation test under a fake HOME;
- `--describe` on all seventeen rows;
- the three `live.sh` refusals, which were `FX_REAL_HOME` unset, HOME equal to
  `FX_REAL_HOME`, and HOME not a scratch home;
- a grep of the diff for literal keys, which found none.

The credential ruling, the local model ruling and both carried findings are
honoured. The ledger matrix matches the rows.

**Important 1.** Row 15 counts an attempted nested dispatch on Claude Code as a
completed one. `tests/conformance/lib/events.js:61` sets `max_depth = 2` on any
nested `Agent` or `Task` tool_use and never checks for a non-error
tool_result. The row never checks for `NESTED-OK` either. Fix: count depth 2
only when the nested call gets a non-error tool_result, and on every runtime
require `NESTED-OK` in the answer.

**Minor findings.**
- Rows 04 and 05 accept a plain `Read` of SKILL.md as a lane load, through
  the `seen` fallback at `lib/live.sh:185-187`.
- Row 08 counts refusal strings, so retries of one command satisfy "at least
  three refusals".
- The Codex marketplace install and `fx-opencode-install` run outside bwrap,
  and the bwrap check comes too late, at `lib/live.sh:117`.
- The jail leaves the real home readable and the network open. The security
  lens rates this Critical.
- Rotated OAuth tokens die in scratch, so the real copy may go stale.
- `runner-isolation.test.sh:63` breaks when the caller has `FX_REAL_HOME`
  exported.
- The "GAP needs a reason" check accepts any stderr.

## Security lens

**Critical 1.** At `tests/conformance/lib/live.sh:544-545`, the jail
`bwrap --ro-bind / /` mounts the whole host read-only at its real paths, with
no `--unshare-net`. The CLI inside runs with skip-permissions. A session can
read the real, unfiltered credential files under `$FX_REAL_HOME` and send them
off the machine. The copy-in narrowing is defeated for reads.

**Important 2.** No redaction step sits between a session's tool output and
the log. When `FX_CONFORMANCE_LOGS` is set, transcripts are copied outside
scratch (`keep_log`), so a credential a session read survives.

**Important 3.** A SIGKILL skips the EXIT trap and leaves the copied
credentials in /tmp. The ledger ruling and the README already accept this.

**Minor 4.** `--proc /proc` runs without `--unshare-pid`, so the session sees
the host's processes.

**Minor 5.** `run.sh` creates the scratch config dirs under the ambient umask,
before `live.sh` tightens them.
