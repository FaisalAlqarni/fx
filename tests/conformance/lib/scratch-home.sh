# scratch_home_claude <dir>: the claude-code credential copy, shared so the
# rule lives in one place. Reads $FX_REAL_HOME/.claude/.credentials.json (or
# $HOME's, if FX_REAL_HOME is unset) and writes it into <dir>/.credentials.json
# at mode 0600, under <dir> at 0700. Nothing under the real home is ever
# written, moved or deleted.
#
#   . "$FX/tests/conformance/lib/scratch-home.sh"
#   scratch_home_claude "$CLAUDE_CONFIG_DIR"
#
# Return codes:
#   0  copied
#   1  no credential at the real home
#   2  the directory or the copy could not be made
scratch_home_claude() {
  local dir="$1" real_home="${FX_REAL_HOME:-$HOME}"
  local src="$real_home/.claude/.credentials.json"
  [ -f "$src" ] || return 1
  mkdir -p "$dir" && chmod 700 "$dir" || return 2
  install -m 600 "$src" "$dir/.credentials.json" || return 2
}
