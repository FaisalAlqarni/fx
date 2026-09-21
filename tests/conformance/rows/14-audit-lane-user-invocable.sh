#!/usr/bin/env bash
# 14: hiding a lane from the model does not hide it from the user.
#
# The counterpart to row 13. A lane hidden from both is not hidden, it is gone.
#   opencode:    the installer, run into a scratch config dir, generates a
#                command for each hidden lane, which is how a user types it.
#   claude-code: GAP. No row checks this at runtime, and no test pins it.
#                `claude plugin details` lists a lane even when it carries
#                `user-invocable: false` (measured), so it proves the lane
#                loads, not that a user can invoke it.
#   codex:       GAP. No row checks this at runtime, and no test pins it.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "14|audit lane user-invocable|free"; exit 0; }
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
    echo "claude-code: no row checks user-invocability at runtime on this harness, and no test pins it (plugin details lists a lane even with user-invocable: false)" >&2
    exit 77 ;;
  codex)
    echo "codex: no row checks user-invocability at runtime on this harness, and no test pins it" >&2
    exit 77 ;;
esac
