#!/usr/bin/env bash
# 13: the five user-invoked lanes are hidden from the model on this runtime.
#
# opencode: the plugin's config hook, run on a synthetic config, must deny each
# hidden lane in permission.skill and deny nothing else.
#
# Claude Code and Codex: GAP. No row checks this guarantee at runtime on those
# harnesses. At file level, tests/gates/user-invoked.test.js pins only the flag
# that hides the lane from the model: `disable-model-invocation: true` in
# SKILL.md (Claude Code) and `allow_implicit_invocation: false` in
# agents/openai.yaml (Codex). Repeating that here would claim a runtime check
# that never ran.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "13|audit lane not model-facing|free"; exit 0; }
: "${FX_REAL_HOME:?run rows through tests/conformance/run.sh, which isolates HOME}"
cd "$FX"
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
    echo "claude-code: no row checks this at runtime on this harness; only the file-level flag disable-model-invocation: true in SKILL.md is pinned, by tests/gates/user-invoked.test.js" >&2
    exit 77 ;;
  codex)
    echo "codex: no row checks this at runtime on this harness; only the file-level flag allow_implicit_invocation: false in agents/openai.yaml is pinned, by tests/gates/user-invoked.test.js" >&2
    exit 77 ;;
esac
