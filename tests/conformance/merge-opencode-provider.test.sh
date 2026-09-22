#!/usr/bin/env bash
# Task 23 review, carried into task 21. live.sh copies the user's llamacpp
# provider into the scratch opencode.json before EVERY row, but installs fx
# only before the first. So the copy must MERGE: a rewrite dropped the
# plugin-route entry and subagent_depth from every row after the first, and
# those rows ran without fx. This runs the merge free against a seeded config.
set -euo pipefail
cd "$(dirname "$0")/../.."
M=tests/conformance/lib/merge-opencode-provider.js
S="$(mktemp -d)" || exit 1
case "$S" in /tmp/?*) ;; *) echo refusing; exit 1;; esac
trap 'rm -rf -- "$S"' EXIT

echo '{"provider":{"llamacpp":{"options":{"baseURL":"http://x"}},"other":{}},"plugin":["mine"]}' > "$S/src.json"
echo '{"plugin":["file:///fx/plugins/fx.js"],"mcp":{"fxprobe":{"type":"local"}},"subagent_depth":2}' > "$S/dst.json"
node "$M" "$S/src.json" "$S/dst.json" llamacpp/m
S="$S" node -e '
  const assert = require("assert");
  const c = JSON.parse(require("fs").readFileSync(process.env.S + "/dst.json", "utf8"));
  assert.deepStrictEqual(c.plugin, ["file:///fx/plugins/fx.js"], "plugin entry lost or the user plugin leaked");
  assert.deepStrictEqual(c.mcp, { fxprobe: { type: "local" } }, "mcp lost");
  assert.strictEqual(c.subagent_depth, 2, "subagent_depth lost");
  assert.strictEqual(c.model, "llamacpp/m");
  assert.deepStrictEqual(c.provider, { llamacpp: { options: { baseURL: "http://x" } } }, "only llamacpp crosses over");
'
[ "$(stat -c %a "$S/dst.json")" = 600 ] || { echo "scratch config is not 0600"; exit 1; }

# No destination yet (the first row): created from scratch.
node "$M" "$S/src.json" "$S/new.json" llamacpp/m
grep -q '"llamacpp"' "$S/new.json" || { echo "no config written for a first row"; exit 1; }

# No llamacpp provider: exit 3, which live.sh turns into a GAP.
echo '{}' > "$S/none.json"
rc=0; node "$M" "$S/none.json" "$S/x.json" llamacpp/m || rc=$?
[ "$rc" = 3 ] || { echo "a source with no llamacpp provider exited $rc, want 3"; exit 1; }

grep -q 'merge-opencode-provider\.js' tests/conformance/lib/live.sh \
  || { echo "live.sh does not use merge-opencode-provider.js"; exit 1; }
echo "merge-opencode-provider: passed"
