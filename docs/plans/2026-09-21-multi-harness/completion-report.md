# Multi-harness build: completion report

**Date:** 2026-09-22
**Branch:** `multi-harness`, worktree `/development/fx/.worktrees/multi-harness`
**Base:** `main` at `f92c970`
**Size:** 252 commits, 191 files, +23,658 / -860
**Version:** 0.2.0 (was 0.1.7)
**Exit gate:** `HOME="$(mktemp -d)" scripts/check-all` at HEAD: ALL GREEN.

## What landed

fx runs on Claude Code, Codex and opencode from one source. Each harness gets
its own layer, and the skills stay harness-neutral.

- **Claude Code:** `hooks/hooks.json` with `fx-context.js`, plus the plugin
  manifest. Each user-invoked lane is registered once, not twice.
- **Codex:** the manifest's `hooks` key points at the root `hooks.json`, which
  runs `hooks/fx-codex.js`. Roles are planted into `CODEX_HOME`, and a
  PreToolUse guard keeps a read-only agent read-only: identity comes from
  `agent_id`, the shell is limited by a token and per-binary flag allowlist,
  and every non-Bash tool is refused.
- **opencode:** `plugins/fx.js` alone is enough. It injects the bootstrap,
  applies the permission model, and denies the user-invoked lanes. Both the
  plugin route and the script route are measured.
- **The bootstrap:** about 2.9KB, superpowers-shaped, with the routing moved
  into the skill descriptions (ADR 0021, amendment 2). The bootstrap alone is
  pinned under 3,000 characters and the worst case under 9,000.
  `bootstrap-no-loss-audit.md` maps all 140 rows of the old preamble to their
  new home; nothing was dropped.
- **Model routing** (task 28): the standard tier is the default, the most
  capable tier needs a stated reason, and the cheapest tier is barred from
  anything with side effects outside the worktree.
- **Test tooling:** a conformance runner with free and live rows on all three
  harnesses, every row in a scratch HOME, live rows inside a bwrap jail,
  a nightly CI workflow, and release and overlap gates.

## Measured evidence

**Frozen live matrix, 2026-09-22, at the final tree.** Logs in
`/tmp/tmp.wiU1YAo8Ky/logs/`, prefixes `final-` and `final2-`.

| Harness | Matrix | Route | Probes | Row 04 | Lanes |
|---|---|---|---|---|---|
| opencode | 18 pass | plugin 3 pass | 7 pass + dex 5 pass | 10/10 | 9/9 |
| Claude Code | 16 pass, 2 gap | n/a | 4 pass | 5/5 | 9/9 |

0 fail on both. The two Claude Code gaps are rows 13 and 14: nothing checks
user-invocability at that runtime, and the file-level flag is pinned by a
gate test instead.

**Codex, task 22 part A, local Qwen 3.8 27B.** Hooks load: PASS. The preamble
reaches the model input: PASS, seen in all 30 captured request bodies. The
guard refuses a Bash command: BLOCKED, because the Qwen chat template rejects
Codex's two system messages before any token. Mechanics only; not a merge pass.

## Deviations from the plan

- **Task 22 was split.** Part A is the local-model probe above. Part B, the
  full matrix on the real OpenAI model, is the merge gate and is blocked until
  the Codex quota resets on 2026-10-21.
- **Task 24's preamble trim was superseded** by the task 25 bootstrap
  redesign, after the trim regressed opencode row 04 from 9/10 to 2/10.
- **The runner isolates rather than restores.** An earlier restore trap
  deleted the real `~/.claude`. Task 11 was amended: every row runs in a
  scratch HOME, and credentials are copied in only.

## Security work after the final review

The final whole-branch review found 0 Critical, 9 Important and 16 Minor. All
9 Important and the agreed Minors were fixed and re-reviewed (APPROVED). Two
further security rounds followed, driven by the security lens:

- The bwrap jail reached the host Docker socket, the real home through
  `/mnt/wslg/distro`, `/mnt/c`, and the WSLg display sockets. The jail now
  hides every top-level directory that is not system software, and binds back
  only the tree under test, the scratch dir and the CLI paths.
- Other projects' `.env` files under `/development` were readable inside it.
  Closed by the same allowlist.
- The Codex hook failed open when a module failed to load, and on malformed
  input. It now refuses.
- The hook timeout failed open; it is removed, so Codex's 600s default applies.
- Live rows could be made to report a fake quota or max-turns GAP. Logs are now
  captured outside the jail, and a quota GAP needs the CLI's own clean
  non-zero exit.
- The last re-check is CLEAN at Critical and Important.

## Parked

- **Residual GAP forgery.** A tool process shares the CLI's uid and can still
  write to its output pipe, so it can mislabel a FAIL as a GAP. It can never
  produce a PASS. Full closure needs a separate uid for the CLI.
- **`live.sh` overwrites a caller's EXIT trap**, which leaked one probe
  process. Test tooling only.
- **Findings-final Minors 2 and 4**, deferred at triage.
- Per-task minors deferred during the build, each recorded in `state.md` at
  its task.

## Needs you

1. **Part B is the merge gate.** Codex on the real model, on or after
   2026-10-21. Hand off with `fx-handoff` to a fresh session.
2. **Nothing is pushed.** The branch is local only.
3. Optional: to take the Codex local-model probe further, restart llama-server
   with a chat template that merges system messages.
