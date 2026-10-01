#!/usr/bin/env bash
# 14: hiding a lane from the model does not hide it from the user.
#
# The counterpart to row 13. A lane hidden from both is not hidden, it is gone.
#   opencode:    the installer, run into a scratch config dir, generates a
#                command for each hidden lane, which is how a user types it.
#   opencode-v2: the real 2.x binary, no model call: `opencode api
#                command.list` lists the five commands the plugin registers,
#                on the installer route and on the plugin route.
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
#   codex:       the same live session, addressed as $fx:fx-handoff (the plugin-qualified name Codex lists).
set -uo pipefail
[ "${1:-}" = "--describe" ] && { k=free; case "${HARNESS:-}" in claude-code|codex) k=live ;; esac; echo "14|audit lane user-invocable|$k"; exit 0; }
: "${FX_REAL_HOME:?run rows through tests/conformance/run.sh, which isolates HOME}"
cd "$FX"
HIDDEN="fx-audit fx-critique fx-grill fx-handoff fx-setup"
case "$HARNESS" in
  opencode)
    # HOME is the runner's scratch home, so this destination is inside it.
    dest="$HOME/row14-opencode"
    python3 scripts/fx-opencode-install --major 1 --dest "$dest" > "$HOME/row14.out" 2>&1 || {
      cat "$HOME/row14.out" >&2; exit 1; }
    for n in $HIDDEN; do
      [ -f "$dest/commands/$n.md" ] || { echo "opencode: no command for $n, user route gone" >&2; exit 1; }
    done ;;
  opencode-v2)
    # The real 2.x binary. The plugin registers the five commands itself
    # (command.transform, no command files), so this waits for them in
    # `opencode api command.list` on the route FX_OPENCODE_ROUTE names.
    # Invoking one is `opencode api session.command`, which needs a model
    # (task 10); listing is what a user picks from.
    . "$FX/tests/conformance/lib/opencode-v2.sh"
    oc2_setup
    oc2_wait command.list '["fx-audit", "fx-critique", "fx-grill", "fx-handoff", "fx-setup"].every((x) => d.some((c) => c.name === x))'
    F="$OC2_LAST" node -e '
      const d = JSON.parse(require("fs").readFileSync(process.env.F, "utf8"));
      const audit = d.find(c => c.name === "fx-audit");
      if (!audit.description) { console.error("opencode-v2: fx-audit is listed with no description"); process.exit(1); }
    '
    # No generated command files: the plugin is the one route to them.
    if ls "$OC2_DEST"/commands/fx-*.md >/dev/null 2>&1; then
      echo "opencode-v2: command files exist beside the plugin's commands" >&2; exit 1; fi ;;
  claude-code|codex)
    . "$FX/tests/conformance/lib/live.sh"
    live_workdir
    addr='/fx:fx-handoff'; [ "$HARNESS" = codex ] && addr='$fx:fx-handoff'
    PROMPT="$addr continue this later, in a new session on this same machine, same repo. Reply with the handoff block only, then stop."

    live_run "$PROMPT"

    lane_loaded fx-handoff "the output is printed for copying, not saved to a file" \
      || fail "fx-handoff never loaded from its slash-command address (skills loaded: $(events skills | sort -u | tr '\n' ' '))"
    events answer | grep -qE '^# Handoff:' \
      || fail "fx-handoff loaded but never produced its handoff block (answer: $(events answer | tail -c 300))"
    exit 0 ;;
esac
