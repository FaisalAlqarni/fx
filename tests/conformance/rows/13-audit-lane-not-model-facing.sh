#!/usr/bin/env bash
# 13: the five user-invoked lanes are hidden from the model on this runtime.
#
# opencode: the plugin's config hook, run on a synthetic config, must deny each
# hidden lane in permission.skill and deny nothing else.
#
# opencode-v2: the real 2.x binary, no model call: the deny rules on every
# agent and the skill list the build agent is left with (see the branch).
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
# codex: the same live session. Codex has no skill tool, so an attempt is a
# shell command naming skills/<lane>/SKILL.md (events.js skill_attempts); the
# lanes carry allow_implicit_invocation: false in agents/openai.yaml.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { k=free; case "${HARNESS:-}" in claude-code|codex) k=live ;; esac; echo "13|audit lane not model-facing|$k"; exit 0; }
: "${FX_REAL_HOME:?run rows through tests/conformance/run.sh, which isolates HOME}"
cd "$FX"
HIDDEN="fx-audit fx-critique fx-grill fx-handoff fx-setup"
case "$HARNESS" in
  opencode)
    node --input-type=module -e '
      const fs = await import("node:fs");
      const HIDDEN = ["fx-audit", "fx-critique", "fx-grill", "fx-handoff", "fx-setup"];
      const { fx } = await import(process.cwd() + "/plugins/fx-opencode-v1.js");
      const config = {};
      await (await fx({ directory: process.cwd() })).config(config);
      const rules = (config.permission || {}).skill || {};
      for (const n of HIDDEN) if (rules[n] !== "deny") {
        console.error("opencode: " + n + " is " + (rules[n] || "unset") + ", not deny"); process.exit(1); }
      for (const d of fs.readdirSync("skills")) if (!HIDDEN.includes(d) && rules[d] === "deny") {
        console.error("opencode: " + d + " is denied but is not a user-invoked lane"); process.exit(1); }
    ' ;;
  opencode-v2)
    # The real 2.x binary. skill.list is unfiltered (probe 7), so hiding is
    # proved where v2 applies it: the skill rules on the agents. Two checks.
    # (1) Every agent `opencode debug agents` lists, the built-ins and fx's
    # own, carries a skill deny for each of the five lanes and for nothing
    # else. (2) The skill list the built-in `build` agent sees, meaning
    # skill.list minus what build's rules deny, holds none of the five. On the
    # plugin route skill.list holds all 17, so (2) has something to hide; on
    # the installer route the lanes are never linked and (2) holds trivially.
    # A user-defined agent in opencode.json is applied after plugin
    # transforms and gets no rule (probe 11, ADR-0026), so it is not checked.
    . "$FX/tests/conformance/lib/opencode-v2.sh"
    oc2_setup
    oc2_wait skill.list 'd.some((s) => s.name === "fx-tdd")'
    oc2_agents
    F="$OC2_LAST" AGENTS="$OC2_ROOT/agents.json" ROUTE="$OC2_ROUTE" node -e '
      const fs = require("fs");
      const HIDDEN = ["fx-audit", "fx-critique", "fx-grill", "fx-handoff", "fx-setup"];
      const effect = (rules, resource) => {
        let e = "unset";
        for (const r of rules || []) if (r.action === "skill" && (r.resource === resource || r.resource === "*")) e = r.effect;
        return e;
      };
      const agents = JSON.parse(fs.readFileSync(process.env.AGENTS, "utf8"));
      for (const a of agents) {
        for (const n of HIDDEN) if (effect(a.permissions, n) !== "deny") {
          console.error("opencode-v2: agent " + a.id + " does not deny skill " + n); process.exit(1); }
        for (const r of a.permissions) if (r.action === "skill" && !HIDDEN.includes(r.resource)) {
          console.error("opencode-v2: agent " + a.id + " has a skill rule for " + r.resource + ", which is not a user-invoked lane"); process.exit(1); }
      }
      const build = agents.find(a => a.id === "build");
      const listed = JSON.parse(fs.readFileSync(process.env.F, "utf8")).map(s => s.name);
      const seen = listed.filter(n => effect(build.permissions, n) !== "deny");
      for (const n of HIDDEN) if (seen.includes(n)) {
        console.error("opencode-v2: the build agent still sees " + n + " (" + process.env.ROUTE + " route)"); process.exit(1); }
      if (!seen.includes("fx-tdd")) {
        console.error("opencode-v2: the build agent lost fx-tdd; the rules hide more than the five lanes"); process.exit(1); }
      if (process.env.ROUTE === "plugin" && !HIDDEN.every(n => listed.includes(n))) {
        console.error("opencode-v2: on the plugin route skill.list should hold the five lanes, so the hiding has something to hide"); process.exit(1); }
      console.error("checked agents: " + agents.map(a => a.id).join(", "));
    ' ;;
  claude-code|codex)
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
esac
