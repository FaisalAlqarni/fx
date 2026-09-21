#!/usr/bin/env bash
# Plant fx's read-only roles into $CODEX_HOME before the first Codex session.
#
# Codex reads roles once, when a session starts and before any hook runs
# (research/codex.md, "Follow-up: role visibility timing"). Roles the
# SessionStart hook plants are therefore visible from the NEXT session only,
# and a live row runs one session. This makes the same call
# tests/install/run.sh makes: hooks/fx-codex.js with a SessionStart payload,
# which calls plantRoles. No second implementation of the planting.
#
#   CODEX_HOME=<scratch> FX=<tree> bash tests/conformance/lib/plant-codex-roles.sh
set -euo pipefail
# plantRoles falls back to ~/.codex when CODEX_HOME is unset. Refuse instead.
[ -n "${CODEX_HOME:-}" ] || { echo "plant-codex-roles: CODEX_HOME is not set; refusing" >&2; exit 1; }
[ -n "${FX:-}" ] || { echo "plant-codex-roles: FX is not set" >&2; exit 1; }
node "$FX/hooks/fx-codex.js" <<<"{\"hook_event_name\":\"SessionStart\",\"cwd\":\"$FX\"}" > /dev/null
[ -d "$CODEX_HOME/agents" ] || { echo "plant-codex-roles: no roles under $CODEX_HOME/agents" >&2; exit 1; }
