#!/usr/bin/env bash
# Amendment A4. Codex reads roles once, when a session starts, so a live row
# sees fx's roles in its FIRST session only if they were planted before it.
# live.sh does that through lib/plant-codex-roles.sh. This runs the helper
# free against a scratch CODEX_HOME, and checks live.sh calls it in the right
# place.
set -euo pipefail
cd "$(dirname "$0")/../.."
FX="$PWD"
S="$(mktemp -d)" || exit 1
case "$S" in /tmp/?*) ;; *) echo refusing; exit 1;; esac
trap 'rm -rf -- "$S"' EXIT

CODEX_HOME="$S/codex" HOME="$S" TMPDIR="$S" FX="$FX" bash tests/conformance/lib/plant-codex-roles.sh
want="$(cd codex/agents && ls -- *.toml | sort)"
got="$(cd "$S/codex/agents" && ls -- *.toml | sort)"
[ "$want" = "$got" ] || { echo "roles not planted: want [$want] got [$got]"; exit 1; }

# The payload is built as JSON, not by string interpolation: a tree whose
# path holds a quote still plants.
ln -s "$FX" "$S/fx\"q"
CODEX_HOME="$S/codex-q" HOME="$S" TMPDIR="$S" FX="$S/fx\"q" bash tests/conformance/lib/plant-codex-roles.sh
got="$(cd "$S/codex-q/agents" && ls -- *.toml | sort)"
[ "$want" = "$got" ] || { echo "roles not planted from a quoted path: want [$want] got [$got]"; exit 1; }

L=tests/conformance/lib/live.sh
add="$(grep -n 'codex plugin add fx@fx' "$L" | head -1 | cut -d: -f1 || true)"
plant="$(grep -n 'plant-codex-roles\.sh' "$L" | head -1 | cut -d: -f1 || true)"
mark="$(grep -n ': > "\$LIVE_INSTALLED"' "$L" | head -1 | cut -d: -f1 || true)"
if [ -z "$add" ] || [ -z "$plant" ] || [ -z "$mark" ] || [ "$add" -ge "$plant" ] || [ "$plant" -ge "$mark" ]; then
  echo "live.sh must plant Codex roles after installing fx and before the install marker (add=$add plant=$plant mark=$mark)"
  exit 1
fi
echo "plant-codex-roles: passed"
