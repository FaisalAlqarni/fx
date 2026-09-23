# scratch_home_claude <dir> [real-home]: the claude-code credential copy,
# shared so the rule lives in one place. Reads
# <real-home>/.claude/.credentials.json (default: $FX_REAL_HOME, or $HOME if
# that is unset) and writes it into <dir>/.credentials.json at mode 0600,
# under <dir> at 0700. Nothing under the real home is ever written, moved or
# deleted.
#
# The real home is also accepted as an explicit second argument, so a caller
# that never wants it exported (a live claude session runs unjailed callers
# would leak it to) can pass a local variable instead of setting
# $FX_REAL_HOME in the environment.
#
#   . "$FX/tests/conformance/lib/scratch-home.sh"
#   scratch_home_claude "$CLAUDE_CONFIG_DIR"
#   scratch_home_claude "$CLAUDE_CONFIG_DIR" "$REAL_HOME"
#
# Return codes:
#   0  copied
#   1  no credential at the real home
#   2  the directory or the copy could not be made
scratch_home_claude() {
  local dir="$1" real_home="${2:-${FX_REAL_HOME:-$HOME}}"
  local src="$real_home/.claude/.credentials.json"
  [ -f "$src" ] || return 1
  mkdir -p "$dir" && chmod 700 "$dir" || return 2
  install -m 600 "$src" "$dir/.credentials.json" || return 2
}
