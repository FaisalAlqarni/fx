# The five user-invoked lanes keep `disable-model-invocation`, and Codex's lint failure over it is cosmetic

`skills/fx-audit/SKILL.md`, `fx-critique`, `fx-grill`, `fx-handoff` and
`fx-setup` each carry `disable-model-invocation: true` in frontmatter. Codex's
bundled `validate_plugin.py` fails on it: `skill \`fx-audit\` frontmatter field
\`disable-model-invocation\` must be false`. The field stays true on all five
anyway, and the lint failure is accepted rather than fixed.

The reason is what the field does on each runtime, not what the lint wants.
On Claude Code, `disable-model-invocation: true` is what keeps the model from
auto-selecting these five lanes. On Codex, the equivalent property comes from
a different field entirely: each lane's `skills/<name>/agents/openai.yaml`
carries `policy.allow_implicit_invocation: false`, verified present in all
five files, unaffected by the lint that only complains about the Claude Code
field. `docs/plans/2026-09-21-multi-harness/state.md` records the ruling
directly: "the `disable-model-invocation` conflict is resolved by keeping
`true` on all five and accepting the Codex lint failure," because Codex
demands the field be false or absent while Claude Code demands true, and one
file cannot satisfy both runtimes' frontmatter at once. Setting it false to
please the lint would make Claude Code auto-select the audit lane, the exact
behaviour these five lanes exist to prevent. The same record calls the lint "a
scaffolding script, not the ingestion path the runtimes actually use": a live
`codex plugin marketplace add` plus `codex plugin add` into a throwaway
`CODEX_HOME` installed successfully and shipped all thirteen skills, `fx-audit`
included, despite the lint's complaint.

`tests/gates/user-invoked.test.js` pins the field at the file level: for each
of the five it asserts `disable-model-invocation: true` in the SKILL.md
frontmatter and `allow_implicit_invocation: false` in the sidecar
`openai.yaml`. On Claude Code, two live conformance rows carry the guarantee
further: row 13 (`tests/conformance/rows/13-audit-lane-not-model-facing.sh`)
runs a real session against a prompt that echoes fx-audit's own description
without ever naming a lane, and asserts the `Skill` tool is never called with
one of the five names; row 14
(`tests/conformance/rows/14-audit-lane-user-invocable.sh`) runs a real session
addressing `fx-handoff` by its slash command and asserts it still loads and
produces its output. Both rows were added as free, unmeasured gaps on
2026-09-21 and turned into live checks on 2026-09-23. Both stay GAP on Codex,
deferred to task 22 part B.

One thing neither row can assert, on any runtime: Claude Code's session start
event lists tools, MCP servers and plugins, never the skills a session can
see, so no row can prove the hidden five are absent from what the model's
context names. What row 13 actually proves is narrower and still load
bearing: the `Skill` tool is never called with one of the five, attempted or
blocked, while the slash command route in row 14 still works.

## Consequences

- `disable-model-invocation: true` and the Codex lint failure it causes both
  stay, permanently, on all five lanes. A future contributor who "fixes" the
  lint by flipping the field reopens the auto-select hole on Claude Code.
- The two fields, one per runtime, are the actual enforcement; the lint checks
  neither runtime's real ingestion path, so a clean lint run is not evidence
  either field is doing its job.
- Codex parity for rows 13 and 14 is an open task, not a silent gap: task 22
  part B is where it gets measured.
