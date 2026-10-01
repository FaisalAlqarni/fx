### Finding verdicts

- **[13-review Important] general grant unconditional / guard reads 3 of 2.0.18's config sources**: ADDRESSED. Grant and `userHasSubagentRule` deleted from plugins/fx-opencode-v2.js (diff hunks at :55 and :189; remaining text is a two-line comment at :199-200). grep of the plugin finds no `userHasSubagentRule`, no `OPENCODE_CONFIG`, and the only `readFileSync` is the agent markdown load at :191. No config-source reading is left, so the incomplete-source defect cannot exist.
- **[13-lens-security 1 Important] narrow user subagent rule leaves fx's `*` allow**: ADDRESSED. fx adds no subagent allow, so there is nothing to fall through to. tests/gates/opencode-v2-plugin.test.js:100-107 asserts no agent ends with an fx subagent allow and general keeps the built-in deny.

### Checks

- Read-only lens deny: holds. Gate :107 asserts `fx-lens-security` is not `allow` on `subagent`; the evaluate-hook read-only deny (plugin :100) is untouched by the diff. Lenses get no subagent allow, and general's grant is gone.
- Scratch rule only for opencode-v2 and only in scratch configs: tests/conformance/lib/merge-opencode-provider.js writes `agents` inside the `harness === 'opencode-v2'` branch; tests/conformance/lib/openrouter.js adds it in the `opencode-v2` case of providerSetup. merge-opencode-provider.test.sh now fails if a 1.x copy gets `permissions` or `agents`. Both callers are tests/conformance/lib/live.sh and openrouter.js (scratch HOME). The installer writes no `agents` key (no match in install code), so real users get none.
- Docs rule shape: INSTALL.md and references/harnesses/opencode-v2.md give `{"agents":{"general":{"permissions":[{"action":"subagent","resource":"*","effect":"allow"}]}}}`. This is the 2.x `agents.<name>.permissions` array of action/resource/effect that round 1 already verified against 2.0.18 source (`permissions` array, `agents.general`). The report says live row 15 and 18 pass with it (not re-run, as ordered). Docs state the 1.x `task` grant is unchanged.
- Tests reported: covering list named with OK (plugin, policies, merge-opencode-provider, openrouter, install, others); not re-run.

### New breakage in the fix diff

None. Round 1's two Minors (FIFO read, ponytail comment) are void: the code is gone.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 13: fix round 2/5 (2 addressed, 0 open; commits 9ffccff..b06a3ef)
