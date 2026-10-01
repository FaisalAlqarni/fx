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

# --- OpenRouter (FX_LIVE_PROVIDER=openrouter) -----------------------------------
# Opt-in, and only this file turns it on. The provider's own variables (base
# URL, model overrides) cross the jail through jail_provider_env, called below
# after jail.sh is sourced. The KEY never crosses as a variable: a --setenv
# value sits on the bwrap command line for the whole session. It goes into a
# 0600 file under its own temp dir, bound read-only into session calls only
# (install and export calls never see it), and lib/with-key.sh exports it
# inside the jail for the CLI. The credential copies below are skipped, so a
# session cannot run on the owner's subscription.
OPENROUTER=""
if [ "${FX_LIVE_PROVIDER:-}" = openrouter ]; then
  OPENROUTER=1
  OR_JS="$FX/tests/conformance/lib/openrouter.js"
  [ -n "${OPENROUTER_API_KEY:-}" ] || gap "not run: FX_LIVE_PROVIDER=openrouter needs OPENROUTER_API_KEY in the environment"
  if [ "$HARNESS" = claude-code ]; then
    OR_MODEL="$(node -p "require('$OR_JS').MODELS.claude")"
    # Claude Code only runs Haiku here; a pinned model would be dropped without a word.
    [ -z "${FX_LIVE_MODEL:-}" ] || [ "${FX_LIVE_MODEL#openrouter/}" = "$OR_MODEL" ] \
      || fail "FX_LIVE_MODEL=$FX_LIVE_MODEL is ignored for claude-code under openrouter, which runs only $OR_MODEL"
    OR_KEY_VAR=ANTHROPIC_AUTH_TOKEN    # the only variable Claude Code reads the key from
  else
    OR_MODEL="${FX_LIVE_MODEL:-}"; OR_MODEL="${OR_MODEL#openrouter/}"
    [ -n "$OR_MODEL" ] || OR_MODEL="$(node -p "require('$OR_JS').MODELS.primary")"
    OR_KEY_VAR=OPENROUTER_API_KEY
  fi
  OR_ENV_NAMES=""
  while IFS='=' read -r k v; do
    [ -n "$k" ] || continue
    export "$k=$v"; OR_ENV_NAMES="$OR_ENV_NAMES $k"
  done < <(node "$OR_JS" env "$HARNESS" "$OR_MODEL")
  KEYDIR="$(mktemp -d)" || fail "mktemp failed"
  OR_KEYFILE="$KEYDIR/key"
  # printf is a builtin: the value is on no command line. Then the variable
  # goes, so no later child of this row inherits it.
  ( umask 077; printf '%s' "$OPENROUTER_API_KEY" > "$OR_KEYFILE" ) || fail "cannot write the key file"
  unset OPENROUTER_API_KEY
  trap 'rm -rf -- "$KEYDIR"' EXIT
fi

# --- the jail -------------------------------------------------------------------
# Every CLI call, installs included, runs inside bwrap:
#   - the whole filesystem read-only;
#   - every top-level directory that is not system software hidden under an
#     empty tmpfs: /home (the real home, so a session cannot read the real
#     credential files, only the scratch copy made below), /root, /srv, and
#     any user data root such as /development, where other projects keep
#     their .env files. Only the tree under test ($FX, read-only), the scratch
#     dir and the CLIs are bound back. /mnt is hidden whole too (on WSL: the
#     Docker Desktop socket, the WSLg sockets, the Windows drives, and
#     /mnt/wslg/distro, a second mount of the root that reaches the real home;
#     only the resolver config it holds is bound back), and so is any other
#     mount of the home's filesystem that overlaps the home, and any other
#     mount whose source is a hidden top-level path, such as a bind of
#     /development/<project> onto a kept path;
#   - back into those empty directories, read-only, only the narrowest thing
#     that runs each CLI: a self-contained binary on its own, or, for a script,
#     the package directory its package.json marks. Nothing holding credentials
#     or config is rebound, and a package directory that is the real home or a
#     whole top-level directory of it is refused outright;
#   - a private pid namespace with its own /proc. With the host's /proc, a
#     session could reach /proc/<pid>/root of a host process and read the real
#     home through it; only an ambient ptrace_scope setting stood in the way;
#   - /tmp a private tmpfs, and the runner's scratch dir and the tree under
#     test ($FX, read-only) bound back on top of it;
#   - /run a private tmpfs, so the host's sockets under it (the D-Bus session
#     bus at /run/user/<uid>/bus, docker.sock through /var/run) are gone, and
#     a private IPC namespace;
#   - the environment cleared and rebuilt from an allowlist, so a parent
#     session's tokens do not leak in (lib/jail.sh names the list);
#   - the network left open: the providers need it, and opencode needs the
#     host's 127.0.0.1:8899. A shared network namespace also leaves abstract
#     unix sockets reachable; that is the price of the open network.
# tests/conformance/jail-probe.test.sh proves the sockets and the environment
# with bwrap directly, never with a model session.
# That is what lets a row hand the CLI its own skip-permissions flag: whatever
# the model runs, nothing outside the scratch dir can change.
#
# The runtimes' own sandboxes are off, and must be. Claude Code's needs socat,
# which fx cannot assume. Codex's workspace-write keeps .git read-only, so an
# unguarded `git branch -D` fails there anyway, and a guard row would pass with
# the guard deleted. The jail is the boundary; the guard under test is the only
# thing between the model and the command.
. "$FX/tests/conformance/lib/jail.sh"
. "$FX/tests/conformance/lib/scratch-home.sh"
# shellcheck disable=SC2086
[ -z "$OPENROUTER" ] || jail_provider_env $OR_ENV_NAMES

OPENCODE_MODEL="llamacpp/qwen3.8-27b"

# How each runtime dispatches a subagent, named in prompts so a row measures fx
# rather than whether the model guessed the tool.
case "$HARNESS" in
  claude-code) SUBAGENT_TOOL="the Agent tool" ;;
  codex)       SUBAGENT_TOOL="spawn_agent without forking your history (fork_turns \"none\" if that parameter exists, otherwise fork_context false), then wait for it" ;;
  opencode)    SUBAGENT_TOOL="the task tool" ;;
  opencode-v2) SUBAGENT_TOOL="the subagent tool" ;;
esac
OPENCODE_URL="http://127.0.0.1:8899/v1"

# --- credentials, copied in ---------------------------------------------------
# Under OpenRouter nothing is copied: the scratch home gets the provider's
# config instead, and never the owner's .credentials.json or auth.json.
if [ -n "$OPENROUTER" ]; then
  node "$OR_JS" setup "$HARNESS" "$OR_MODEL" "$HOME" || fail "could not write the OpenRouter config"
else
case "$HARNESS" in
  claude-code)
    scratch_home_claude "$CLAUDE_CONFIG_DIR"
    case $? in
      0) ;;
      1) gap "not run: no credential source at $FX_REAL_HOME/.claude/.credentials.json" ;;
      *) fail "credential copy failed" ;;
    esac ;;
  codex)
    src="$FX_REAL_HOME/.codex/auth.json"
    [ -f "$src" ] || gap "not run: no credential source at $src"
    install -m 600 "$src" "$CODEX_HOME/auth.json" || fail "credential copy failed" ;;
  opencode|opencode-v2)
    src="$FX_REAL_HOME/.config/opencode/opencode.json"
    [ -f "$src" ] || gap "not run: no credential source at $src"
    # Only the provider.llamacpp entry crosses over; it carries the local
    # server's key, which is never printed. The user's plugins, agents and MCP
    # servers stay behind, so the session measures fx alone.
    # This runs for every row, and the install below only for the first, so
    # it MERGES into the scratch config: rewriting it dropped the plugin-route
    # entry and the installer's subagent_depth from every row after the first
    # (task 23, PD1).
    node "$FX/tests/conformance/lib/merge-opencode-provider.js" "$src" "$XDG_CONFIG_HOME/opencode/opencode.json" "$OPENCODE_MODEL" "$HARNESS"
    case $? in 0) ;; 3) gap "not run: no provider.llamacpp entry in $src" ;; *) fail "provider copy failed" ;; esac
    code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$OPENCODE_URL/models")"
    [ "$code" != 000 ] || gap "not run: the local llama-server at $OPENCODE_URL is unreachable" ;;
  *) fail "unknown harness" ;;
esac
fi

# --- the binary must be the harness's major: a 2.x machine never measures v1
# while claiming it, and the reverse ----------------------------------------
case "$HARNESS" in
  opencode|opencode-v2)
    want=1; [ "$HARNESS" = opencode-v2 ] && want=2
    have="$(opencode --version 2>&1 | grep -oE '[0-9]+' | head -n1)"
    [ "$have" = "$want" ] \
      || fail "harness $HARNESS needs opencode $want.x, but \`opencode --version\` reports ${have:-no version}" ;;
esac

# --- fx, installed into the scratch home from the tree under test --------------
# Claude Code needs no install: --plugin-dir points each session at $FX.
LIVE_INSTALLED="$LIVE_SCRATCH/installed-$HARNESS"
if [ ! -e "$LIVE_INSTALLED" ]; then
  case "$HARNESS" in
    codex)
      out="$("${JAIL[@]}" codex plugin marketplace add "$FX" 2>&1 && "${JAIL[@]}" codex plugin add fx@fx 2>&1)" \
        || fail "fx did not install into the scratch CODEX_HOME: $out"
      # Codex reads roles only when a session starts, so plant them now, or
      # the first session of every row runs without them (amendment A4).
      out="$("${JAIL[@]}" bash "$FX/tests/conformance/lib/plant-codex-roles.sh" 2>&1)" \
        || fail "fx roles were not planted into the scratch CODEX_HOME: $out" ;;
    opencode|opencode-v2)
      OC_CFG="$XDG_CONFIG_HOME/opencode/opencode.json"
      OC_MAJOR=1; OC_PLUGIN=fx-opencode-v1.js
      [ "$HARNESS" = opencode-v2 ] && { OC_MAJOR=2; OC_PLUGIN=fx-opencode-v2.js; }
      case "${FX_OPENCODE_ROUTE:-installer}" in
        installer)
          out="$("${JAIL[@]}" python3 "$FX/scripts/fx-opencode-install" --major "$OC_MAJOR" --dest "$XDG_CONFIG_HOME/opencode" 2>&1)" \
            || fail "fx did not install into the scratch opencode config: $out" ;;
        plugin)
          # Design story 4: one config entry, no installer, no symlink. The
          # entry form is the one step 1 of task 21 read from the opencode
          # source (1.18.31): config/plugin.ts:50-51 keeps a file:// spec as
          # is, and plugin/shared.ts:171-172 treats it as a local path.
          # 2.x: a `plugins` config entry must be a package directory (a bare
          # .js file is refused), so the plugin is linked into plugins/, where
          # OpenCode discovers local plugins, and fx's skills path is added.
          # Nothing else: no permissions key, no command or agent files.
          if [ "$OC_MAJOR" = 2 ]; then
            mkdir -p "$XDG_CONFIG_HOME/opencode/plugins" && ln -s "$FX/plugins/$OC_PLUGIN" "$XDG_CONFIG_HOME/opencode/plugins/fx.js" \
              && CFG="$OC_CFG" node -e '
                const fs = require("fs");
                const c = JSON.parse(fs.readFileSync(process.env.CFG, "utf8"));
                c.skills = [...(c.skills || []), process.env.FX + "/skills"];
                fs.writeFileSync(process.env.CFG, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
              ' || fail "could not set up the plugin route in the scratch opencode config"
          else
          CFG="$OC_CFG" ENTRY="${FX_OPENCODE_PLUGIN_ENTRY:-file://$FX/plugins/$OC_PLUGIN}" node -e '
            const fs = require("fs");
            const c = JSON.parse(fs.readFileSync(process.env.CFG, "utf8"));
            c.plugin = [...(c.plugin || []), process.env.ENTRY];
            fs.writeFileSync(process.env.CFG, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
          ' || fail "could not add the plugin entry to the scratch opencode.json"
          fi ;;
        *) fail "unknown FX_OPENCODE_ROUTE: $FX_OPENCODE_ROUTE" ;;
      esac
      if [ "${FX_OPENCODE_MCP:-}" = 1 ]; then
        # One probe MCP server, written only into the scratch config.
        CFG="$OC_CFG" SERVER="$FX/tests/conformance/lib/mcp-probe-server.js" node -e '
          const fs = require("fs");
          const c = JSON.parse(fs.readFileSync(process.env.CFG, "utf8"));
          c.mcp = { ...(c.mcp || {}), fxprobe: { type: "local", command: ["node", process.env.SERVER], enabled: true } };
          fs.writeFileSync(process.env.CFG, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
        ' || fail "could not add the probe MCP server to the scratch opencode.json"
      fi ;;
  esac
  : > "$LIVE_INSTALLED"
fi

# --- a scratch working directory -----------------------------------------------
# Every session runs in a throwaway git repo under the scratch home, never the
# repository worktree. It is removed when the row exits.
live_workdir() {
  WORK="$(mktemp -d "$LIVE_SCRATCH/work.XXXXXX")" || fail "mktemp failed"
  case "$WORK" in "$LIVE_SCRATCH"/work.?*) ;; *) fail "unexpected workdir: $WORK" ;; esac
  # The log lives outside everything the jail binds, so a session can neither
  # find nor edit the output live_run judges (security re-check Minor 2).
  LOGDIR="$(mktemp -d)" || fail "mktemp failed"
  case "$LOGDIR/" in "$LIVE_SCRATCH"/*|"$FX"/*) fail "the log dir is inside the jail: $LOGDIR" ;; esac
  trap 'rm -rf -- "$WORK" "$LOGDIR" "$WORK.start" "$WORK.data" "$WORK.export" "${KEYDIR:-}"' EXIT
  LOG="$LOGDIR/log"
  git -C "$WORK" init -q -b main &&
    git -C "$WORK" config user.name fx-conformance &&
    git -C "$WORK" config user.email fx-conformance@example.invalid &&
    echo conformance > "$WORK/README.md" &&
    git -C "$WORK" add README.md && git -C "$WORK" commit -q -m init \
    || fail "could not create the scratch repo"
}

# live_regular <path>: true only for a regular file that is not a symlink.
# Every host-side read of a file the session could write goes through this
# first: the session can replace it with a symlink to the real home's
# credentials, or a FIFO that blocks the row (final review, security 1 and 5).
live_regular() { [ -f "$1" ] && [ ! -L "$1" ]; }

# --- one headless session ------------------------------------------------------
# Every runtime writes a machine-readable event stream to $LOG. Not everything
# is in that stream, so after the session the transcripts of every session it
# started are appended too: Claude Code's session files, Codex's rollout files,
# and opencode's exported sessions.
live_run() {
  local prompt="$1" rc
  # Until the session names its model, the result line says the config did.
  [ -z "$OPENROUTER" ] || [ -z "${FX_ROW_MODEL_FILE:-}" ] || echo "$OR_MODEL (config)" > "$FX_ROW_MODEL_FILE"
  local tmp="$LIVE_SCRATCH/tmp"; mkdir -p "$tmp"
  # Session calls only: the key file is bound in, and with-key.sh exports it
  # for the CLI. Install and export calls keep the plain $JAIL and never see it.
  local -a SJ=("${JAIL[@]}") KW=()
  if [ -n "$OPENROUTER" ]; then
    unset 'SJ[${#SJ[@]}-1]'
    SJ+=(--ro-bind "$OR_KEYFILE" "$OR_KEYFILE" --)
    KW=(sh "$FX/tests/conformance/lib/with-key.sh" "$OR_KEYFILE" "$OR_KEY_VAR" --)
  fi
  LIVE_RUN_N=$(( ${LIVE_RUN_N:-0} + 1 ))
  : > "$WORK.start"
  # stdout and stderr each reach their file through a pipe read on the host
  # side: the CLI holds only the pipes, never a file it could reopen, rewrite
  # or truncate through /proc/<pid>/fd. stderr is kept apart, so the quota
  # check below can read the CLI's own errors without any model text.
  local err="$LOGDIR/stderr" p1 p2
  mkfifo "$LOGDIR/out.pipe" "$LOGDIR/err.pipe" || fail "mkfifo failed"
  cat "$LOGDIR/out.pipe" >"$LOG" & p1=$!
  cat "$LOGDIR/err.pipe" >"$err" & p2=$!
  case "$HARNESS" in
    claude-code)
      # FX_LIVE_TIMEOUT and FX_LIVE_MAX_TURNS let a long row (the fixture build) raise both.
      # FX_LIVE_MODEL pins the model claude-code dispatches on (the review
      # bench measures fx's reviewer at the tier fx actually uses it on);
      # unset adds no flag, so every other row's command line is unchanged.
      local -a model_flag=()
      [ -n "${FX_LIVE_MODEL:-}" ] && [ -z "$OPENROUTER" ] && model_flag=(--model "$FX_LIVE_MODEL")
      ( cd "$WORK" && timeout "${FX_LIVE_TIMEOUT:-600}" "${SJ[@]}" "${KW[@]}" env TMPDIR="$tmp" claude -p "$prompt" --plugin-dir "$FX" \
          --dangerously-skip-permissions --max-turns "${FX_LIVE_MAX_TURNS:-30}" --output-format stream-json --verbose \
          "${model_flag[@]}" ) \
        </dev/null >"$LOGDIR/out.pipe" 2>"$LOGDIR/err.pipe" ;;
    codex)
      timeout 900 "${SJ[@]}" "${KW[@]}" env TMPDIR="$tmp" codex exec --json -C "$WORK" -s danger-full-access \
        -c 'approval_policy="never"' --dangerously-bypass-hook-trust "$prompt" </dev/null >"$LOGDIR/out.pipe" 2>"$LOGDIR/err.pipe" ;;
    opencode-v2)
      # --standalone: no managed service, so nothing shares a port with the
      # developer's OpenCode. </dev/null is required: an inherited stdin
      # blocks the run forever (probe-findings.md, change 1).
      # 2.0.18 has no --dir flag ("Unrecognized flag: --dir"): the session runs in the cwd.
      ( cd "$WORK" && timeout 1500 "${SJ[@]}" "${KW[@]}" env TMPDIR="$tmp" XDG_DATA_HOME="$WORK.data" \
        opencode run --standalone --format json "$prompt" ) </dev/null >"$LOGDIR/out.pipe" 2>"$LOGDIR/err.pipe" ;;
    opencode)
      # ponytail: one llama-server slot, so opencode rows only ever run serially.
      timeout 1500 "${SJ[@]}" "${KW[@]}" env TMPDIR="$tmp" XDG_DATA_HOME="$WORK.data" \
        opencode run --format json --dir "$WORK" "$prompt" </dev/null >"$LOGDIR/out.pipe" 2>"$LOGDIR/err.pipe" ;;
  esac
  rc=$?
  wait "$p1" "$p2"
  local out_empty=0; [ -s "$LOG" ] || out_empty=1
  rm -f -- "$LOGDIR/out.pipe" "$LOGDIR/err.pipe"
  # The CLI's own errors, as JSON: a top-level error event (Codex's error and
  # turn.failed, opencode's error) or Claude Code's result with is_error.
  # Assistant text and tool output are nested inside other event types, so
  # nothing a model says or a tool prints can appear here.
  local cli_errors
  cli_errors="$(F="$LOG" node -e '
    for (const l of require("fs").readFileSync(process.env.F, "utf8").split("\n")) {
      let j; try { j = JSON.parse(l); } catch { continue; }
      if (j && (j.type === "error" || j.type === "turn.failed" || (j.type === "result" && j.is_error))) console.log(l);
    }')"
  # stderr is appended for the reader, each line prefixed so events.js skips it.
  sed 's/^/stderr: /' "$err" >> "$LOG"
  # Under OpenRouter the log is scanned for the key before it is copied, for a
  # key-shaped string and for the key's own value. A hit fails the row and a
  # scan that cannot run fails it too: nothing is kept on a doubt. A row that
  # calls live_run again keeps each call's log under its own name.
  keep_log() {
    [ -n "${FX_CONFORMANCE_LOGS:-}" ] || return 0
    local dest="$FX_CONFORMANCE_LOGS/$(basename "$0" .sh)-$HARNESS"
    [ "$LIVE_RUN_N" -eq 1 ] || [ -z "$OPENROUTER" ] || dest="$dest.$LIVE_RUN_N"
    if [ -n "$OPENROUTER" ]; then
      node "$OR_JS" leaks "$LOG" "$OR_KEYFILE"
      case $? in
        0) ;;
        10) fail "the session log contains the OpenRouter key; it was not kept" ;;
        *) fail "the key scan of the session log could not run; the log was not kept" ;;
      esac
    fi
    cp "$LOG" "$dest.log"
  }
  keep_log
  # Quota or credit exhausted: the row did not run, and a row that did not run
  # is never a pass. Matched only on the CLI's own stderr and its own error
  # events above, never on the whole stream: with --verbose that carries
  # assistant text and tool output, and a session could say the words.
  # Claude Code says "hit your session limit" or "hit your limit"; Codex says
  # "hit your usage limit".
  # It also needs the CLI's own clean non-zero exit. A tool process the session
  # started shares the CLI's uid, so it can write a quota line into the CLI's
  # stderr or stdout through /proc/<pid>/fd; what it cannot do is make the CLI
  # stop the way a real quota does. Measured 2026-09-22: claude-code, codex and
  # opencode each exit 1 on an error they stop for (codex exec and opencode run
  # both exit 1 on a 401 from the provider). A timeout is 124, a signal 128+n,
  # and both of those are a crash, never a quota (security re-check Minor 1).
  local q='usage limit|hit your ([a-z]+ )?limit|credit balance is too low|insufficient_quota|quota exceeded'
  local hit
  if [ "$rc" -eq 1 ] && hit="$(printf '%s\n' "$cli_errors" | cat - "$err" | grep -oiE "$q" | head -1)" && [ -n "$hit" ]; then
    gap "not run: quota or credit exhausted ($hit)"
  fi
  # A provider error stops the row with 75, so run.sh can re-run it on the
  # fallback model. Same evidence rule as the quota check: the CLI's own exit,
  # its own error events and its own stderr, never the stream, and only an
  # upstream HTTP error shape (lib/openrouter.js). A timeout alone is not one:
  # a session that printed nothing and showed no upstream error is a product
  # hang, a FAIL, never a provider flake.
  if [ -n "$OPENROUTER" ] && { [ "$rc" -eq 1 ] || { [ "$rc" -eq 124 ] && [ "$out_empty" = 1 ]; }; }; then
    local hit2
    if hit2="$(E="$cli_errors" S="$(cat "$err")" node "$OR_JS" error)"; then
      echo "$HARNESS: provider error ($hit2)" >&2; exit 75
    fi
  fi
  [ "$rc" -eq 124 ] && [ -n "$OPENROUTER" ] && [ "$out_empty" = 1 ] && fail "no output before timeout"
  [ "$rc" -eq 124 ] && fail "session timed out"
  # A CLI that exited non-zero did not finish its session: a row that checks
  # for an absence (the branch still exists, no file was written) would read
  # that crash as a pass. The log is kept above for the reader.
  # Except one: Claude Code exits 1 when --max-turns runs out, and says so in
  # its own last result event, subtype error_max_turns. The session was cut
  # short, so the row cannot be judged either way: a GAP naming the cause. Any
  # other exit code (a kill is 128+signal) is a crash. Codex and opencode are
  # passed no turn cap.
  if [ "$rc" -eq 1 ] && [ "$HARNESS" = claude-code ] && F="$LOG" node -e '
      let last = null;
      for (const l of require("fs").readFileSync(process.env.F, "utf8").split("\n")) {
        try { const j = JSON.parse(l); if (j && j.type === "result") last = j; } catch {}
      }
      process.exit(last && last.subtype === "error_max_turns" ? 0 : 1);'; then
    gap "not judged: claude-code hit --max-turns before finishing (error_max_turns, exit $rc)"
  fi
  [ "$rc" -eq 0 ] || fail "the $HARNESS CLI exited $rc; the session did not complete"
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
    opencode-v2)
      # The same walk as 1.x, through `opencode session export` (v2 renamed
      # `opencode export`). A child id appears in the subagent tool's output.
      local seen_ids2="" id2 more2=1
      while [ "$more2" = 1 ]; do
        more2=0
        for id2 in $(grep -oE 'ses_[A-Za-z0-9]+' "$LOG" | sort -u); do
          case " $seen_ids2 " in *" $id2 "*) continue ;; esac
          seen_ids2="$seen_ids2 $id2"; more2=1
          "${JAIL[@]}" env TMPDIR="$tmp" XDG_DATA_HOME="$WORK.data" opencode session export "$id2" --standalone </dev/null >"$WORK.export" 2>/dev/null
          F="$WORK.export" ID="$id2" node -e 'const s=require("fs").readFileSync(process.env.F,"utf8");const i=s.indexOf("{");try{console.log(JSON.stringify({fx_export:JSON.parse(s.slice(i))}))}catch(e){console.log("export failed: "+process.env.ID+": "+e.message)}' >> "$LOG"
        done
      done ;;
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
          # To a file, not a pipe: into a pipe, opencode export exits before
          # its stdout drains and cuts the JSON at 64KB, which dropped a whole
          # child session from row 07 (task 21).
          "${JAIL[@]}" env TMPDIR="$tmp" XDG_DATA_HOME="$WORK.data" opencode export "$id" >"$WORK.export" 2>/dev/null
          F="$WORK.export" ID="$id" node -e 'const s=require("fs").readFileSync(process.env.F,"utf8");const i=s.indexOf("{");try{console.log(JSON.stringify({fx_export:JSON.parse(s.slice(i))}))}catch(e){console.log("export failed: "+process.env.ID+": "+e.message)}' >> "$LOG"
        done
      done ;;
  esac
  # A provider error anywhere in the session, in a child or a grandchild, makes
  # the run inconclusive whatever its assertions say: a pass may never have
  # exercised the rule (the subagent that should have broken it died), and a
  # fail may be the dead subagent's doing. Exit 75 so run.sh re-runs it. Read
  # after the rollouts are appended: a grandchild's error is only in its
  # parent's. A detector that cannot read the log is inconclusive too.
  if [ -n "$OPENROUTER" ]; then
    local cerr cerr_rc
    cerr="$(node "$OR_JS" child "$LOG" "$HARNESS" 2>&1)"; cerr_rc=$?
    case $cerr_rc in
      1) ;;
      0) keep_log; echo "$HARNESS: provider error in a subagent ($cerr)" >&2; exit 75 ;;
      *) keep_log; echo "$HARNESS: provider error detector could not read the session log ($cerr)" >&2; exit 75 ;;
    esac
  fi
  if [ -n "$OPENROUTER" ]; then
    local sm; sm="$(node "$OR_JS" model "$HARNESS" "$LOG")"
    [ -z "$sm" ] || { [ -z "${FX_ROW_MODEL_FILE:-}" ] || echo "$sm" > "$FX_ROW_MODEL_FILE"; }
    # OpenCode names its model only in the session export; a failed export
    # would leave the row labelled (config) with nothing checked.
    [ -n "$sm" ] || { case "$HARNESS" in opencode|opencode-v2) ! grep -q '^export failed: ' "$LOG" || fail "the session export failed, so the session's model is unverified" ;; esac; }
    [ -z "$sm" ] || [ "$sm" = "$OR_MODEL" ] || fail "the session reported model $sm, not the requested $OR_MODEL"
  fi
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
