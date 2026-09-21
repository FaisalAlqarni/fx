# Shared by every live row. Source it AFTER the row's --describe guard, so a
# describe call never copies a credential or spends quota.
#
#   . "$FX/tests/conformance/lib/live.sh"
#   live_workdir            # a scratch git repo under the scratch home: $WORK
#   live_run "$PROMPT"      # one headless session in $WORK; the stream is $LOG
#   seen 'text'             # did the session's stream contain this text?
#
# CREDENTIALS ARE COPIED IN, NEVER OUT. The runner (run.sh) has already pointed
# HOME, CODEX_HOME, XDG_CONFIG_HOME and CLAUDE_CONFIG_DIR into one mktemp -d and
# exported the user's real home as FX_REAL_HOME. This file reads exactly one
# credential source per runtime from FX_REAL_HOME and writes it into the scratch
# home at 0600, under directories at 0700. Nothing under FX_REAL_HOME is ever
# written, moved or deleted. A missing source is a GAP with its reason; there is
# no fallback to the real home.
#
# A SIGKILL skips every EXIT trap, so a killed run leaves this credential copy
# in the scratch dir under /tmp until reboot. README.md says so.

gap()  { echo "$HARNESS: $*" >&2; exit 77; }
fail() { echo "$HARNESS: $*" >&2; exit 1; }

# Refuse to run anywhere but a runner scratch home. The runner is the only
# place that sets HOME; a row never re-points it.
[ -n "${FX_REAL_HOME:-}" ] || fail "run live rows through tests/conformance/run.sh, which isolates HOME"
[ "$HOME" != "$FX_REAL_HOME" ] || fail "HOME is the real home; refusing to run"
case "$HOME" in
  /tmp/?*/home|"${TMPDIR:-/tmp}"/?*/home) ;;
  *) fail "HOME is not a runner scratch home: $HOME" ;;
esac
LIVE_SCRATCH="$(dirname "$HOME")"
umask 077
chmod 700 "$LIVE_SCRATCH" "$HOME" "$CODEX_HOME" "$XDG_CONFIG_HOME" \
  "$XDG_CONFIG_HOME/opencode" "$CLAUDE_CONFIG_DIR" || fail "cannot restrict the scratch home"

# --- the jail -------------------------------------------------------------------
# Every CLI call, installs included, runs inside bwrap:
#   - the whole filesystem read-only;
#   - the real home hidden under an empty tmpfs, so a session cannot read the
#     real credential files, only the scratch copy made below;
#   - back into that empty home, read-only, only what the CLIs run from, when
#     it lives there: the node binary, the codex package, and the directory
#     each other binary sits in. Nothing holding credentials or config is
#     rebound;
#   - a private pid namespace with its own /proc. With the host's /proc, a
#     session could reach /proc/<pid>/root of a host process and read the real
#     home through it; only an ambient ptrace_scope setting stood in the way;
#   - /tmp a private tmpfs, and the runner's scratch dir and the tree under
#     test ($FX, read-only) bound back on top of it;
#   - the network left open: the providers need it, and opencode needs the
#     host's 127.0.0.1:8899.
# That is what lets a row hand the CLI its own skip-permissions flag: whatever
# the model runs, nothing outside the scratch dir can change.
#
# The runtimes' own sandboxes are off, and must be. Claude Code's needs socat,
# which fx cannot assume. Codex's workspace-write keeps .git read-only, so an
# unguarded `git branch -D` fails there anyway, and a guard row would pass with
# the guard deleted. The jail is the boundary; the guard under test is the only
# thing between the model and the command.
command -v bwrap >/dev/null || gap "not run: bwrap is not installed, and live rows never run a CLI unconfined"
case "$FX_REAL_HOME" in /|"") fail "FX_REAL_HOME is not a home: '$FX_REAL_HOME'" ;; esac
[ -d "$FX_REAL_HOME" ] || fail "FX_REAL_HOME is not a directory: $FX_REAL_HOME"
JAIL=(bwrap --ro-bind / / --tmpfs /tmp --tmpfs "$FX_REAL_HOME")
under_real_home() { case "$1" in "$FX_REAL_HOME"/*) return 0 ;; *) return 1 ;; esac; }
for c in node claude codex opencode; do
  p="$(command -v "$c")" || continue
  r="$(readlink -f "$p")"
  case "$c" in
    node)  d="$r" ;;                                 # the node binary alone
    codex) d="$(dirname "$(dirname "$r")")" ;;       # the @openai/codex package: bin/codex.js
    *)     d="$(dirname "$r")" ;;                    # the directory the binary lives in
  esac
  under_real_home "$d" && JAIL+=(--ro-bind "$d" "$d")
  # A PATH entry that is a symlink comes back as the same symlink, so the
  # command resolves by name and its target keeps its own path.
  if [ "$p" != "$r" ] && under_real_home "$p"; then JAIL+=(--symlink "$r" "$p"); fi
done
JAIL+=(--ro-bind "$FX" "$FX" --bind "$LIVE_SCRATCH" "$LIVE_SCRATCH" --dev /dev
       --tmpfs /dev/shm --unshare-pid --proc /proc --die-with-parent --)

OPENCODE_MODEL="llamacpp/qwen3.8-27b"

# How each runtime dispatches a subagent, named in prompts so a row measures fx
# rather than whether the model guessed the tool.
case "$HARNESS" in
  claude-code) SUBAGENT_TOOL="the Agent tool" ;;
  codex)       SUBAGENT_TOOL="spawn_agent with fork_turns set to \"none\", then wait for it" ;;
  opencode)    SUBAGENT_TOOL="the task tool" ;;
esac
OPENCODE_URL="http://127.0.0.1:8899/v1"

# --- credentials, copied in ---------------------------------------------------
case "$HARNESS" in
  claude-code)
    src="$FX_REAL_HOME/.claude/.credentials.json"
    [ -f "$src" ] || gap "not run: no credential source at $src"
    install -m 600 "$src" "$CLAUDE_CONFIG_DIR/.credentials.json" || fail "credential copy failed" ;;
  codex)
    src="$FX_REAL_HOME/.codex/auth.json"
    [ -f "$src" ] || gap "not run: no credential source at $src"
    install -m 600 "$src" "$CODEX_HOME/auth.json" || fail "credential copy failed" ;;
  opencode)
    src="$FX_REAL_HOME/.config/opencode/opencode.json"
    [ -f "$src" ] || gap "not run: no credential source at $src"
    # Only the provider.llamacpp entry crosses over; it carries the local
    # server's key, which is never printed. The user's plugins, agents and MCP
    # servers stay behind, so the session measures fx alone.
    SRC="$src" DST="$XDG_CONFIG_HOME/opencode/opencode.json" MODEL="$OPENCODE_MODEL" node -e '
      const fs = require("fs");
      let p;
      try { p = JSON.parse(fs.readFileSync(process.env.SRC, "utf8")).provider.llamacpp; } catch { p = null; }
      if (!p) process.exit(3);
      const cfg = { model: process.env.MODEL, autoupdate: false, share: "disabled",
                    provider: { llamacpp: p } };
      fs.writeFileSync(process.env.DST, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
    '
    case $? in 0) ;; 3) gap "not run: no provider.llamacpp entry in $src" ;; *) fail "provider copy failed" ;; esac
    code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$OPENCODE_URL/models")"
    [ "$code" != 000 ] || gap "not run: the local llama-server at $OPENCODE_URL is unreachable" ;;
  *) fail "unknown harness" ;;
esac

# --- fx, installed into the scratch home from the tree under test --------------
# Claude Code needs no install: --plugin-dir points each session at $FX.
LIVE_INSTALLED="$LIVE_SCRATCH/installed-$HARNESS"
if [ ! -e "$LIVE_INSTALLED" ]; then
  case "$HARNESS" in
    codex)
      out="$("${JAIL[@]}" codex plugin marketplace add "$FX" 2>&1 && "${JAIL[@]}" codex plugin add fx@fx 2>&1)" \
        || fail "fx did not install into the scratch CODEX_HOME: $out" ;;
    opencode)
      out="$("${JAIL[@]}" python3 "$FX/scripts/fx-opencode-install" --dest "$XDG_CONFIG_HOME/opencode" 2>&1)" \
        || fail "fx did not install into the scratch opencode config: $out" ;;
  esac
  : > "$LIVE_INSTALLED"
fi

# --- a scratch working directory -----------------------------------------------
# Every session runs in a throwaway git repo under the scratch home, never the
# repository worktree. It is removed when the row exits.
live_workdir() {
  WORK="$(mktemp -d "$LIVE_SCRATCH/work.XXXXXX")" || fail "mktemp failed"
  case "$WORK" in "$LIVE_SCRATCH"/work.?*) ;; *) fail "unexpected workdir: $WORK" ;; esac
  trap 'rm -rf -- "$WORK" "$WORK.log" "$WORK.start" "$WORK.data"' EXIT
  LOG="$WORK.log"
  git -C "$WORK" init -q -b main &&
    git -C "$WORK" config user.name fx-conformance &&
    git -C "$WORK" config user.email fx-conformance@example.invalid &&
    echo conformance > "$WORK/README.md" &&
    git -C "$WORK" add README.md && git -C "$WORK" commit -q -m init \
    || fail "could not create the scratch repo"
}

# --- one headless session ------------------------------------------------------
# Every runtime writes a machine-readable event stream to $LOG. Not everything
# is in that stream, so after the session the transcripts of every session it
# started are appended too: Claude Code's session files, Codex's rollout files,
# and opencode's exported sessions.
live_run() {
  local prompt="$1" rc
  local tmp="$LIVE_SCRATCH/tmp"; mkdir -p "$tmp"
  : > "$WORK.start"
  case "$HARNESS" in
    claude-code)
      ( cd "$WORK" && TMPDIR="$tmp" timeout 600 "${JAIL[@]}" claude -p "$prompt" --plugin-dir "$FX" \
          --dangerously-skip-permissions --max-turns 30 --output-format stream-json --verbose ) \
        </dev/null >"$LOG" 2>&1 ;;
    codex)
      TMPDIR="$tmp" timeout 900 "${JAIL[@]}" codex exec --json -C "$WORK" -s danger-full-access \
        -c 'approval_policy="never"' --dangerously-bypass-hook-trust "$prompt" </dev/null >"$LOG" 2>&1 ;;
    opencode)
      # ponytail: one llama-server slot, so opencode rows only ever run serially.
      TMPDIR="$tmp" XDG_DATA_HOME="$WORK.data" timeout 1500 "${JAIL[@]}" \
        opencode run --format json --dir "$WORK" "$prompt" </dev/null >"$LOG" 2>&1 ;;
  esac
  rc=$?
  keep_log() { [ -z "${FX_CONFORMANCE_LOGS:-}" ] || cp "$LOG" "$FX_CONFORMANCE_LOGS/$(basename "$0" .sh)-$HARNESS.log"; }
  keep_log
  # Quota or credit exhausted: the row did not run, and a row that did not run
  # is never a pass. Checked on the CLI's own output, before any transcript is
  # appended, so instructions quoted in a transcript cannot trip it.
  # Claude Code says "hit your session limit" or "hit your limit"; Codex says
  # "hit your usage limit".
  local q='usage limit|hit your ([a-z]+ )?limit|credit balance is too low|insufficient_quota|quota exceeded'
  if grep -qiE "$q" "$LOG"; then
    gap "not run: quota or credit exhausted ($(grep -oiE "$q" "$LOG" | head -1))"
  fi
  [ "$rc" -eq 124 ] && fail "session timed out"
  case "$HARNESS" in
    claude-code)
      # The session's own transcript, subagents included. A skill addressed as
      # /fx:fx-tdd is expanded into it and never appears in stream-json. Each
      # line is prefixed so events.js, which reads the stream, skips it; seen()
      # still finds text in it.
      find "$CLAUDE_CONFIG_DIR/projects" -type f -name '*.jsonl' -newer "$WORK.start" 2>/dev/null \
        | sort | while read -r f; do sed 's/^/transcript: /' "$f"; done >> "$LOG" ;;
    codex)
      # One rollout per thread, subagents included; each opens with session_meta.
      find "$CODEX_HOME/sessions" -type f -name 'rollout-*.jsonl' -newer "$WORK.start" 2>/dev/null \
        | sort | while read -r f; do cat "$f"; echo; done >> "$LOG" ;;
    opencode)
      # A dispatched subagent is a child session; its id appears in the task
      # tool's output. Export every session reachable from the run, compacted
      # to one line each.
      local seen_ids="" id more=1
      while [ "$more" = 1 ]; do
        more=0
        for id in $(grep -oE 'ses_[A-Za-z0-9]+' "$LOG" | sort -u); do
          case " $seen_ids " in *" $id "*) continue ;; esac
          seen_ids="$seen_ids $id"; more=1
          TMPDIR="$tmp" XDG_DATA_HOME="$WORK.data" "${JAIL[@]}" opencode export "$id" 2>/dev/null \
            | ID="$id" node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{const i=s.indexOf("{");try{console.log(JSON.stringify({fx_export:JSON.parse(s.slice(i))}))}catch(e){console.log("export failed: "+process.env.ID+": "+e.message)}})' >> "$LOG"
        done
      done ;;
  esac
  keep_log
  return 0
}

seen() { grep -qF -- "$1" "$LOG"; }

# A question only PREAMBLE.md answers, from both ends of it: the opening
# section records that one lane went uninvoked across 111 subagents, and the
# closing section that fx-humanize carries 35 patterns. Asking only the first
# once passed on Claude Code while all but the first 2KB of the preamble was
# held back as a file preview. Rows 01 and 02 ask it; preamble_known checks it.
PREAMBLE_QUESTION='Answer from the instructions already in your context, without using any tool or reading any file. (1) They describe a twelve-task build in which one lane was never invoked: across how many subagents? (2) They say one lane carries a full treatment of patterns with examples: how many patterns? Reply in exactly this form and nothing else: N=<number or UNKNOWN> P=<number or UNKNOWN>'
preamble_known() { grep -q 'N=111' <<<"$1" && grep -q 'P=35' <<<"$1"; }

# lane_loaded <lane> <phrase>: did the session load that lane? Either a skill
# load succeeded by name (events.js: Claude Code's Skill tool, opencode's skill
# tool, a Codex shell read whose output carries the skill's frontmatter), or a
# phrase found only in that lane's SKILL.md body reached the transcript, which
# is how Claude Code records a /fx:fx-tdd expansion. A failed attempt to load
# the lane never counts.
lane_loaded() {
  events skills | grep -qE "(^|[:\$/])$1\$" || seen "$2"
}

# events <kind>: one slice of the session's event stream, as plain text.
#   answer        what the top-level session said
#   tool_output   what any tool call returned, at any depth
#   sub_input     the prompt each dispatched subagent was given
#   sub_output    what each dispatched subagent returned to its parent
# The stream formats differ per runtime; this is the one place that knows them.
events() {
  KIND="$1" HARNESS="$HARNESS" node "$FX/tests/conformance/lib/events.js" "$LOG"
}
