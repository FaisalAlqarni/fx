#!/usr/bin/env bash
# 13: the five user-invoked lanes are hidden from the model on this runtime.
#
# opencode: the plugin's config hook, run on a synthetic config, must deny each
# hidden lane in permission.skill and deny nothing else.
#
# claude-code: a live session. The prompt echoes fx-audit's own description
# ("audit an existing system... ending in a design.md") without ever naming a
# lane, so a naive model would take the bait if the lane were visible. PASS
# needs the Skill tool never called with a hidden lane name, attempted or
# blocked, not merely never successfully loaded: events.js's skill_attempts
# kind (added by this task) records both, where the pre-existing skills kind
# only records a load that succeeded.
#
# docs.claude.com/en/headless.md's system/init event carries tools,
# mcp_servers and plugins, never a list of the skills a session can see, so
# there is no context field this row can also check the hidden names' absence
# against (read 2026-09-23); the guarantee it checks is that the tool is
# never called.
#
# codex: GAP. A live check is possible here in principle too, the same way as
# claude-code, but this task built only the claude-code one; deferred to task
# 22 part B.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "13|audit lane not model-facing|live"; exit 0; }
: "${FX_REAL_HOME:?run rows through tests/conformance/run.sh, which isolates HOME}"
cd "$FX"
HIDDEN="fx-audit fx-critique fx-grill fx-handoff fx-setup"
case "$HARNESS" in
  opencode)
    node --input-type=module -e '
      const fs = await import("node:fs");
      const HIDDEN = ["fx-audit", "fx-critique", "fx-grill", "fx-handoff", "fx-setup"];
      const { fx } = await import(process.cwd() + "/plugins/fx.js");
      const config = {};
      await (await fx({ directory: process.cwd() })).config(config);
      const rules = (config.permission || {}).skill || {};
      for (const n of HIDDEN) if (rules[n] !== "deny") {
        console.error("opencode: " + n + " is " + (rules[n] || "unset") + ", not deny"); process.exit(1); }
      for (const d of fs.readdirSync("skills")) if (!HIDDEN.includes(d) && rules[d] === "deny") {
        console.error("opencode: " + d + " is denied but is not a user-invoked lane"); process.exit(1); }
    ' ;;
  claude-code)
    . "$FX/tests/conformance/lib/live.sh"
    live_workdir
    PROMPT="This repository already exists and is in production. Audit it: review its architecture end to end, find every problem, and note what would need to change, before we plan any new work. Keep the investigation brief: read at most a few files, then give your top findings in under 200 words."
    for n in $HIDDEN; do
      grep -qF "$n" <<<"$PROMPT" && fail "the prompt names $n, so it proves nothing"
    done

    live_run "$PROMPT"

    attempted="$(events skill_attempts)"
    for n in $HIDDEN; do
      grep -qE "(^|[:\$/])$n\$" <<<"$attempted" \
        && fail "the Skill tool was called with hidden lane $n (skill_attempts: $(tr '\n' ' ' <<<"$attempted"))"
    done
    exit 0 ;;
  codex)
    echo "codex: a live check is possible here in principle, the same way as claude-code; deferred to task 22 part B, not attempted in this task" >&2
    exit 77 ;;
esac
