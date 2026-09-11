#!/usr/bin/env bash
# Start the brainstorm server and output connection info
# Usage: start-server.sh [--slug <plan-slug>] [--project-dir <path>] [--host <bind-host>] [--url-host <display-host>] [--foreground] [--background]
#
# Starts server on a random high port, outputs JSON with URL.
# Each session gets its own directory to avoid conflicts.
#
# Options:
#   --slug <plan-slug>    The slug this brainstorm writes its design under. Mockups
#                         go to <project>/docs/plans/<slug>/companion/<session-id>/content
#                         and persist after the server stops. The session key, PID
#                         and log go to the git-ignored <project>/.fx/<slug>/companion/.
#                         Without it, <slug> is _companion-unfiled, which is not a plan.
#   --project-dir <path>  Project root (default: the current directory). Refused
#                         when it is this skill's directory or inside it.
#   --host <bind-host>    Host/interface to bind (default: 127.0.0.1).
#                         Use 0.0.0.0 in remote/containerized environments.
#   --url-host <host>     Hostname shown in returned URL JSON.
#   --idle-timeout-minutes <n>  Shut down after n minutes idle (default 240 = 4h).
#   --open                Auto-open the browser on the first screen (use only
#                         after the user approves the visual companion).
#   --foreground          Run server in the current terminal (no backgrounding).
#   --background          Force background mode (overrides Codex auto-foreground).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Parse arguments
PROJECT_DIR=""
SLUG=""
FOREGROUND="false"
FORCE_BACKGROUND="false"
BIND_HOST="127.0.0.1"
URL_HOST=""
IDLE_TIMEOUT_MINUTES=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-dir)
      PROJECT_DIR="$2"
      shift 2
      ;;
    --slug)
      SLUG="$2"
      shift 2
      ;;
    --host)
      BIND_HOST="$2"
      shift 2
      ;;
    --url-host)
      URL_HOST="$2"
      shift 2
      ;;
    --idle-timeout-minutes)
      IDLE_TIMEOUT_MINUTES="$2"
      shift 2
      ;;
    --open)
      export BRAINSTORM_OPEN=1
      shift
      ;;
    --foreground|--no-daemon)
      FOREGROUND="true"
      shift
      ;;
    --background|--daemon)
      FORCE_BACKGROUND="true"
      shift
      ;;
    *)
      echo "{\"error\": \"Unknown argument: $1\"}"
      exit 1
      ;;
  esac
done

# Absolute, because the server is launched after `cd "$SCRIPT_DIR"` below.
PROJECT_DIR="$(cd "${PROJECT_DIR:-.}" 2>/dev/null && pwd)" || {
  echo '{"error": "--project-dir is not a directory"}'
  exit 1
}

# Never the skill's own directory or anything inside it: the mockups would land
# inside the plugin, and a plugin update drops them. The repository holding the
# plugin is still a valid project.
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
PROJECT_PHYS="$(cd "$PROJECT_DIR" && pwd -P)"
if [[ "${PROJECT_PHYS}/" == "${SKILL_DIR}/"* ]]; then
  echo "{\"error\": \"the project directory ${PROJECT_PHYS} is inside the fx-brainstorm skill directory ${SKILL_DIR}. Pass --project-dir with the project root.\"}"
  exit 1
fi

# One path segment: the slug names a directory under docs/plans/ and .fx/.
if [[ -n "$SLUG" ]] && ! [[ "$SLUG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; then
  echo '{"error": "--slug must be one path segment of letters, digits, dots, dashes or underscores, starting with a letter or digit"}'
  exit 1
fi

if [[ -z "$URL_HOST" ]]; then
  if [[ "$BIND_HOST" == "127.0.0.1" || "$BIND_HOST" == "localhost" ]]; then
    URL_HOST="localhost"
  else
    URL_HOST="$BIND_HOST"
  fi
fi

if [[ -n "$IDLE_TIMEOUT_MINUTES" ]]; then
  if ! [[ "$IDLE_TIMEOUT_MINUTES" =~ ^[0-9]+$ ]] || [[ "$IDLE_TIMEOUT_MINUTES" -lt 1 ]]; then
    echo "{\"error\": \"--idle-timeout-minutes must be a positive integer\"}"
    exit 1
  fi
  export BRAINSTORM_IDLE_TIMEOUT_MS=$(( IDLE_TIMEOUT_MINUTES * 60 * 1000 ))
fi

is_windows_like_shell() {
  case "${OSTYPE:-}" in
    msys*|cygwin*|mingw*) return 0 ;;
  esac
  if [[ -n "${MSYSTEM:-}" ]]; then
    return 0
  fi
  local uname_s
  uname_s="$(uname -s 2>/dev/null || true)"
  case "$uname_s" in
    MSYS*|MINGW*|CYGWIN*) return 0 ;;
  esac
  return 1
}

# Some environments reap detached/background processes. Auto-foreground when detected.
if [[ -n "${CODEX_CI:-}" && "$FOREGROUND" != "true" && "$FORCE_BACKGROUND" != "true" ]]; then
  FOREGROUND="true"
fi

# Windows/Git Bash reaps nohup background processes. Auto-foreground when detected.
if [[ "$FOREGROUND" != "true" && "$FORCE_BACKGROUND" != "true" ]]; then
  if is_windows_like_shell; then
    FOREGROUND="true"
  fi
fi

# Session files (server.log, server-info, .last-token) embed the session key —
# keep everything this script and the server create owner-only.
umask 077

# Generate unique session directory
SESSION_ID="$$-$(date +%s)"

# Mockups a user returns to live with the plan. The session key, PID and log are
# regenerable and live in the git-ignored ephemeral workspace (ADR 0015).
#
# No slug: never guess one from docs/plans/, where every other directory is
# someone's plan. Use a name no --slug can take (a slug starts with a letter or
# digit) and say so, so the mockups get moved under the design's slug later.
PLAN_SLUG="${SLUG:-_companion-unfiled}"
if [[ -z "$SLUG" ]]; then
  echo "fx companion: no --slug given, so mockups go to docs/plans/${PLAN_SLUG}/companion/, which is not a plan. Pass --slug <plan-slug> to keep them with the design." >&2
fi

SESSION_DIR="${PROJECT_DIR}/docs/plans/${PLAN_SLUG}/companion/${SESSION_ID}"
WORK_DIR="${PROJECT_DIR}/.fx/${PLAN_SLUG}/companion"
# Persist the bound port and key per project and slug so a restart reuses them
# and an already-open browser tab reconnects to the same URL with a valid cookie.
export BRAINSTORM_PORT_FILE="${WORK_DIR}/.last-port"
export BRAINSTORM_TOKEN_FILE="${WORK_DIR}/.last-token"

# Decide whether the project is in a git repository before anything is written.
# Two answers are safe to act on: git says yes, or no .git entry exists at or
# above the project. A .git entry git will not answer for (git missing from
# PATH, or the repository refused for its ownership) is refused: nothing could
# confirm the session key stays out of a commit.
IN_GIT_REPO="false"
if GIT_ANSWER="$(git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree 2>&1)" && [[ "$GIT_ANSWER" == "true" ]]; then
  IN_GIT_REPO="true"
else
  dir="$PROJECT_PHYS"
  while :; do
    if [[ -e "${dir}/.git" ]]; then
      if ! command -v git >/dev/null 2>&1; then
        why="git is not on PATH"
      else
        why="git would not answer: ${GIT_ANSWER%%$'\n'*}"
        why="${why//[\"\\]/}"
      fi
      echo "{\"error\": \"${dir}/.git exists but ${why}, so nothing can confirm the session key stays out of a commit. Fix that and start again.\"}"
      exit 1
    fi
    [[ "$dir" == "/" ]] && break
    dir="$(dirname "$dir")"
  done
fi

STATE_DIR="${WORK_DIR}/${SESSION_ID}/state"
PID_FILE="${STATE_DIR}/server.pid"
LOG_FILE="${STATE_DIR}/server.log"
SERVER_ID_FILE="${STATE_DIR}/server-instance-id"

# The state directory exists before the ignore check, so the check sees what git
# will see: a directory-only rule applies only once the directory is there.
mkdir -p "$STATE_DIR"

# Every file carrying the session key, or written beside it, must be ignored.
session_files_ignored() {
  local f
  for f in "$BRAINSTORM_TOKEN_FILE" "$BRAINSTORM_PORT_FILE" "$PID_FILE" "$LOG_FILE" "${STATE_DIR}/server-info"; do
    git -C "$PROJECT_DIR" check-ignore -q "${f#"${PROJECT_DIR}"/}" || return 1
  done
}

# In a git repository that does not ignore them yet, add .fx/ to the local
# exclude file, never the project's .gitignore, as fx-implement does. --git-path
# resolves the shared exclude file from inside a linked worktree.
if [[ "$IN_GIT_REPO" == "true" ]] && ! session_files_ignored; then
  EXCLUDE_FILE="$(git -C "$PROJECT_DIR" rev-parse --path-format=absolute --git-path info/exclude 2>/dev/null)"
  if [[ -n "$EXCLUDE_FILE" ]] && ! grep -qxF '.fx/' "$EXCLUDE_FILE" 2>/dev/null; then
    mkdir -p "$(dirname "$EXCLUDE_FILE")"
    # Keep an unterminated last line whole.
    if [[ -s "$EXCLUDE_FILE" && -n "$(tail -c1 "$EXCLUDE_FILE")" ]]; then
      printf '\n' >> "$EXCLUDE_FILE"
    fi
    printf '.fx/\n' >> "$EXCLUDE_FILE"
    echo "fx companion: added .fx/ to ${EXCLUDE_FILE} so the session key is never committed." >&2
  fi
  # A .gitignore rule can re-include .fx/ over the exclude file. Fail closed,
  # before the server starts, so no key is written.
  if ! session_files_ignored; then
    echo '{"error": ".fx/ is still not git-ignored (a .gitignore rule re-includes it), so the session key would be committable. Remove that rule and start again."}'
    exit 1
  fi
fi

# Create the session's content directory
mkdir -p "${SESSION_DIR}/content"

SERVER_ID=""
if [[ -r /dev/urandom ]]; then
  SERVER_ID="$(od -An -N24 -tx1 /dev/urandom 2>/dev/null | tr -d ' \n' || true)"
fi
if ! [[ "$SERVER_ID" =~ ^[A-Za-z0-9_-]{32,64}$ ]]; then
  SERVER_ID="$(printf '%08x%08x%08x%08x' "$$" "$(date +%s)" "${RANDOM:-0}" "${RANDOM:-0}")"
fi
printf '%s\n' "$SERVER_ID" > "$SERVER_ID_FILE"
chmod 600 "$SERVER_ID_FILE" 2>/dev/null || true

# Kill any existing server
if [[ -f "$PID_FILE" ]]; then
  old_pid=$(cat "$PID_FILE")
  kill "$old_pid" 2>/dev/null
  rm -f "$PID_FILE"
fi

cd "$SCRIPT_DIR" || exit 1

# Resolve the harness PID (grandparent of this script).
# $PPID is the ephemeral shell the harness spawned to run us — it dies
# when this script exits. The harness itself is $PPID's parent.
OWNER_PID="$(ps -o ppid= -p "$PPID" 2>/dev/null | tr -d ' ')"
if [[ -z "$OWNER_PID" || "$OWNER_PID" == "1" ]]; then
  OWNER_PID="$PPID"
fi

# Windows/MSYS2: Node.js cannot see POSIX PIDs from the MSYS2 namespace.
# Passing a PID node cannot verify causes server to log owner-pid-invalid
# and self-terminate at the 60-second lifecycle check. Clear it so the
# watchdog is disabled and the idle timeout becomes the only shutdown trigger.
if is_windows_like_shell; then
  OWNER_PID=""
fi

# Foreground mode for environments that reap detached/background processes.
if [[ "$FOREGROUND" == "true" ]]; then
  env BRAINSTORM_DIR="$SESSION_DIR" BRAINSTORM_STATE_DIR="$STATE_DIR" BRAINSTORM_HOST="$BIND_HOST" BRAINSTORM_URL_HOST="$URL_HOST" BRAINSTORM_OWNER_PID="$OWNER_PID" node server.cjs "--brainstorm-server-id=$SERVER_ID" &
  SERVER_PID=$!
  echo "$SERVER_PID" > "$PID_FILE"
  wait "$SERVER_PID"
  exit $?
fi

# Start server, capturing output to log file
# Use nohup to survive shell exit; disown to remove from job table
nohup env BRAINSTORM_DIR="$SESSION_DIR" BRAINSTORM_STATE_DIR="$STATE_DIR" BRAINSTORM_HOST="$BIND_HOST" BRAINSTORM_URL_HOST="$URL_HOST" BRAINSTORM_OWNER_PID="$OWNER_PID" node server.cjs "--brainstorm-server-id=$SERVER_ID" > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
disown "$SERVER_PID" 2>/dev/null
echo "$SERVER_PID" > "$PID_FILE"

# Wait for server-started message (check log file)
for _ in {1..50}; do
  if grep -q "server-started" "$LOG_FILE" 2>/dev/null; then
    # Verify server is still alive after a short window (catches process reapers)
    alive="true"
    for _ in {1..20}; do
      if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        alive="false"
        break
      fi
      sleep 0.1
    done
    if [[ "$alive" != "true" ]]; then
      echo "{\"error\": \"Server started but was killed. Retry in a persistent terminal with: $SCRIPT_DIR/start-server.sh --project-dir $PROJECT_DIR${SLUG:+ --slug $SLUG} --host $BIND_HOST --url-host $URL_HOST --foreground\"}"
      exit 1
    fi
    grep "server-started" "$LOG_FILE" | head -1
    exit 0
  fi
  sleep 0.1
done

# Timeout - server didn't start
echo '{"error": "Server failed to start within 5 seconds"}'
exit 1
