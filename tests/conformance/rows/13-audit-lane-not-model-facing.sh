#!/usr/bin/env bash
# 13: the five user-invoked lanes are hidden from the model on this runtime.
#
# opencode: the plugin's config hook, run on a synthetic config, must deny each
# hidden lane in permission.skill and deny nothing else.
#
# Claude Code and Codex have no free check here that reads what the runtime
# receives: their mechanism is frontmatter (`disable-model-invocation`,
# `allow_implicit_invocation`), which tests/gates/user-invoked.test.js already
# pins in check-all. Repeating that here would claim a runtime check that never
# ran, so they report a GAP. The live half, absence from the model-facing
# listing, is task 12's.
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
  *)
    echo "$HARNESS: no free runtime check; frontmatter is pinned by tests/gates/user-invoked.test.js, live half is task 12" >&2
    exit 77 ;;
esac
