# 09: Docs and ADRs

**Status:** ready-for-agent
**Blocked by:** 05, 06, 08
**Phase:** Harness

**What to build:** a reader can install fx on OpenCode 2.x, knows exactly what the v2 guard catches, sees four harnesses everywhere fx lists runtimes, and finds the three decisions recorded.

**Files:**
- Modify: `INSTALL.md`, `README.md`, `SURFACE.md`
- Create: `docs/adr/0036-opencode-v2-is-a-separate-harness.md`, `docs/adr/0037-the-opencode-v2-guard-in-layers.md`, `docs/adr/0038-live-conformance-through-openrouter.md`

**Interfaces:**
- Consumes: `probe-findings.md`; tasks 04, 05 and 06's reports (which guard layers shipped, whether the plugin registers commands, the shared-config check on 1.18.25); task 08's smoke results.
- Produces: docs only.

**Seam:** the docs themselves, checked by the prose and path gates.

**Risks:** state only what was measured. The "What is verified" table is completed in task 15; here, add the `opencode-v2` and Codex rows as "measured in task 10" placeholders only if the table structure needs them, and correct the stale Claude Code row now: task 21 of the multi-harness plan passed 16 rows on 2026-09-22 and rows 13 and 14 were closed live in `78ff5b3` on 2026-09-23.

**Idempotency:** text edits; new ADRs written whole.

**Testing:** `scripts/check-prose`, `scripts/check-paths`, `node tests/gates/no-runtime-addressing.test.js`.

## Acceptance criteria
- [ ] `INSTALL.md` has an OpenCode v2 section: install (`--major`), verify, what the guard catches per layer and what it does not (the call-id lookup, its fail-closed cases, the policy list with its tight patterns), how the five lanes are hidden and reached on each route, what fx cannot observe on v2; the Claude Code row is corrected.
- [ ] ADR-0038 records that live runs require an OpenRouter account with purchased credits, the jail allowlist under OpenRouter, and that provider errors are matched only in the CLI's own error events and stderr.
- [ ] README and SURFACE list four harnesses and both OpenCode plugin files.
- [ ] ADR-0036 records the separate harness, the shared config directory and the version-aware installer; ADR-0037 the guard layers as shipped; ADR-0038 OpenRouter, the fallback rule, key handling and Claude Code on Haiku.
- [ ] The gates in **Testing** pass.

## Steps

- [ ] **1.** Invoke `fx-humanize` for the prose.
- [ ] **2.** Write the three ADRs in the house format (H1 stating the decision, then prose with `##` sections).
- [ ] **3.** Edit `INSTALL.md`, `README.md`, `SURFACE.md`.
- [ ] **4.** Run the gates.
- [ ] **5. Commit**

```
git add INSTALL.md README.md SURFACE.md docs/adr/0036-opencode-v2-is-a-separate-harness.md docs/adr/0037-the-opencode-v2-guard-in-layers.md docs/adr/0038-live-conformance-through-openrouter.md
git commit -m "docs(opencode-v2): install, guard coverage, four harnesses, ADRs"
```
