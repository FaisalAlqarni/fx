# 17: honour the user's explicit allow for a hidden lane on v2

**Status:** ready-for-agent
**Blocked by:** 16
**Phase:** Hardening

**What to build:** owner decision 2026-10-02: on OpenCode 2.x, when the user's own rule allows one of the five hidden lanes (`USER_INVOKED_LANES` in `lib/user-invoked-lanes.js`), fx honours it. fx blocks the model from picking a hidden lane only when the user said nothing. This removes the hidden-lane half of ADR-0037's "exception to ADR-0026". The read-only re-deny keeps its exception unchanged.

**Files:**
- Modify: `plugins/fx-opencode-v2.js` (the `hide lanes` transform and the skill branch of the `permission.evaluate` hook)
- Test: `tests/gates/opencode-v2-plugin.test.js` (today it asserts a user allow "does not survive the backstop"; that assertion flips)
- Modify: `docs/adr/0037-the-opencode-v2-guard-in-layers.md` (edit in place, pre-production), `references/harnesses/opencode-v2.md`, `INSTALL.md` and `README.md` wherever they describe the hidden-lane backstop

**Seam and the hard part:** the evaluate hook sees only the incoming effect (`ev.effect`, probe-findings "pre-effect"), not which rule produced it. Rules are last-match-wins, and the user's config rules land after fx's transform (ConfigAgentPlugin runs post). So:
- For an agent the `hide lanes` transform processed, fx's deny rule sits before the user's rules. An incoming `allow` there can only come from a user rule that beat fx's deny, or from a per-agent user rule the transform deliberately left alone. Honour it: return without denying.
- For an agent the transform never saw (an agent the user defines in config, probe Q11), an incoming `allow` is the runtime default, not a user answer. Keep denying.
- Implement by recording, in the transform, the agent ids it processed; the evaluate skill branch denies only when `ev.agent` is not in that set, or the incoming effect is not `allow`.

**Interfaces:**
- Consumes: `USER_INVOKED_LANES`, `hideRule(lane)`, the existing `deny(ev, message)`.
- Produces: no new exports.

## Acceptance criteria

- [ ] Gate: agent processed by the transform, incoming `allow` for `fx-setup` → effect stays `allow`.
- [ ] Gate: agent processed, incoming `deny` (fx's own rule won) → stays denied, with fx's message.
- [ ] Gate: agent never processed (user-defined), incoming `allow` → denied by the backstop.
- [ ] Gate: the transform-failed path (`hide lanes` throws) still denies for every agent: a missing record must never read as permission.
- [ ] Live, once, on opencode 2.0.18 through OpenRouter (`qwen/qwen3.8-27b`): scratch config with the user rule `{"action":"skill","resource":"fx-handoff","effect":"allow"}` on `build`; the model is told to load the `fx-handoff` skill; the CLI's events show the skill call succeeded. Without the rule, the same prompt is refused. Keep both logs under `/tmp/fxlogs-task17/`. A provider error makes the run inconclusive; re-run.
- [ ] ADR-0037, the v2 reference, INSTALL and README say: the hidden-lane backstop yields to the user's explicit allow on agents fx configured; agents the user defines stay blocked; the read-only exception is unchanged.

**Idempotency:** code and doc edits only; the live probe uses a scratch home.
