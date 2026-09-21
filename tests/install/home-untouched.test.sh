#!/usr/bin/env bash
# Amendment A7: the install test must not write into the HOME it runs under.
set -euo pipefail
cd "$(dirname "$0")/../.."
FAKE="$(mktemp -d)"; trap 'rm -rf -- "$FAKE"' EXIT
mkdir -p "$FAKE/.claude" && echo sentinel > "$FAKE/.claude/sentinel"
fp() { (cd "$FAKE" && find . -printf '%y %m %p\n' | sort && find . -type f -exec sha256sum {} + | sort); }
before="$(fp)"
# Unset every variable that could point the CLI somewhere other than HOME, so
# a leak into the developer's real config cannot hide behind them.
env -u CLAUDE_CONFIG_DIR -u XDG_CONFIG_HOME -u CODEX_HOME HOME="$FAKE" bash tests/install/run.sh claude-code
after="$(fp)"
[ "$before" = "$after" ] || { echo "tests/install/run.sh wrote into HOME:"; diff <(echo "$before") <(echo "$after"); exit 1; }
echo "install home-untouched: passed"
