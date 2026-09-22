#!/usr/bin/env bash
# 14: hiding a lane from the model does not hide it from the user.
#
# The counterpart to row 13. A lane hidden from both is not hidden, it is gone.
#   opencode:    the installer, run into a scratch config dir, generates a
#                command for each hidden lane, which is how a user types it.
#   claude-code: a live session, addressing fx-handoff the way a user does: a
#                /fx:fx-<name> slash command in the print-mode prompt.
#                docs.claude.com/en/headless.md confirms user-invoked skills
#                and custom commands work in `-p` mode: "Include /skill-name
#                in the prompt string and Claude Code expands it before
#                running" (read 2026-09-23). fx-handoff is the cheapest hidden
#                lane to run to completion here: the scratch repo carries no
#                plan, ledger or design to summarise, so its one deliverable
#                (a single markdown block) is cheap to produce in full. PASS
#                needs both the load and the block, so a session that merely
#                mentions the lane's name without running it cannot pass.
#   codex:       GAP. A live check is possible here in principle too, the
#                same way as claude-code, but this task built only the
#                claude-code one; deferred to task 22 part B.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "14|audit lane user-invocable|live"; exit 0; }
: "${FX_REAL_HOME:?run rows through tests/conformance/run.sh, which isolates HOME}"
cd "$FX"
HIDDEN="fx-audit fx-critique fx-grill fx-handoff fx-setup"
case "$HARNESS" in
  opencode)
    # HOME is the runner's scratch home, so this destination is inside it.
    dest="$HOME/row14-opencode"
    python3 scripts/fx-opencode-install --dest "$dest" > "$HOME/row14.out" 2>&1 || {
      cat "$HOME/row14.out" >&2; exit 1; }
    for n in $HIDDEN; do
      [ -f "$dest/commands/$n.md" ] || { echo "opencode: no command for $n, user route gone" >&2; exit 1; }
    done ;;
  claude-code)
    . "$FX/tests/conformance/lib/live.sh"
    live_workdir
    PROMPT="/fx:fx-handoff continue this later, in a new session on this same machine, same repo. Reply with the handoff block only, then stop."

    live_run "$PROMPT"

    lane_loaded fx-handoff "the output is printed for copying, not saved to a file" \
      || fail "fx-handoff never loaded from its slash-command address (skills loaded: $(events skills | sort -u | tr '\n' ' '))"
    events answer | grep -qE '^# Handoff:' \
      || fail "fx-handoff loaded but never produced its handoff block (answer: $(events answer | tail -c 300))"
    exit 0 ;;
  codex)
    echo "codex: a live check is possible here in principle, the same way as claude-code; deferred to task 22 part B, not attempted in this task" >&2
    exit 77 ;;
esac
